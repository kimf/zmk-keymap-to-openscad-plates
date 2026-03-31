# Frontend Key Cap Customizer — Design Spec

**Date:** 2026-03-31
**Project:** zmk-to-openscad
**Scope:** Browser-based UI for visually customizing ZMK key caps and exporting multicolor 3MF files

---

## Overview

A fully static single-page React application. The user loads a `.keymap` file, customizes each key cap (slot content, fonts, icons), sees a live 3D preview, and downloads a multicolor `.3mf` file ready for MMU printing — all without a server. The existing `parse.js` and `generate.js` modules are rewritten as browser-compatible ES modules and bundled by Vite.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | React 18 + Vite |
| 3D rendering | `@react-three/fiber` + `@react-three/drei` |
| 3D export | Custom `export3mf.js` — lightweight 3MF writer using `fflate` (bundled with three.js) |
| State | Zustand with `localStorage` persistence (`partialize` excludes transient UI state) |
| Fonts | `@fontsource/*` for web fonts; Nerd Font loaded via `FontFace` API from a bundled woff2 |
| Parser/generator | Browser-compatible rewrites of `src/parse.js` and `src/generate.js` in `web/src/lib/` |
| Styling | Plain CSS modules |

---

## Architecture

Three logical layers:

1. **Parse layer** — A browser-compatible `parseKeymapText(text, config)` function (derived from `parse.js`) that takes the `.keymap` file contents as a string and a config object, and returns `keymapData`. All `fs`/`path`/`require` calls are removed; the layout map and ZMK bindings modules are imported as ES module siblings.

2. **State layer** — Zustand store (`useKeyboardStore`). Holds `keymapData`, per-key slot overrides, global config, and transient UI state (selected key). Persistent fields written to `localStorage` via `persist` middleware with `partialize: (s) => ({ keymapData: s.keymapData, keyOverrides: s.keyOverrides, config: s.config })`. "Start Over" clears storage and resets state.

3. **Render layer** — Two-panel layout:
   - **Left panel**: `KeyGrid` (all keys) or `KeyEditor` (single key, replaces grid on selection)
   - **Right panel**: R3F `Canvas` with `KeyboardScene` — live 3D preview, updates reactively

---

## Browser Module Porting

The three shared source files need these changes to run in the browser:

### `parse.js` → `web/src/lib/parse.js`
- Remove `const fs = require('fs')` and `const path = require('path')`
- Remove `const config = JSON.parse(fs.readFileSync(...))` — config is passed as a parameter
- Remove `const { parseKeymap } = require('./layout-map')` style requires — replaced with ES `import`
- Exported function signature: `export function parseKeymapText(text, config)` — takes the file contents string directly
- `layout-map.js`, `zmk-bindings.js`, and `sv-keys.js` are all copied to `web/src/lib/` and converted to `export`/`import` syntax

### `generate.js` → `web/src/lib/generate.js`
- Remove `module.exports` → `export { buildScad, scadArg }`
- No other changes needed (no Node built-in imports)

### `web/src/lib/` file list
```
parse.js          — browser rewrite of src/parse.js
zmk-bindings.js   — ES module copy of src/zmk-bindings.js
sv-keys.js        — ES module copy of src/sv-keys.js
layout-map.js     — ES module copy of src/layout-map.js
generate.js       — ES module copy of src/generate.js
slotDefaults.js   — layer-count → slot mapping table (new)
export3mf.js      — wraps THREE.3MFExporter (new)
defaultConfig.js  — bundled default config.json as an ES export (new)
```

The original `src/*.js` files remain CommonJS for the CLI. The `web/src/lib/` copies are maintained separately. If a shared fix is needed, it is applied in both places. (A future task could unify them under a monorepo workspace.)

---

## Data Model

### `keymapData` (from parser, immutable after load)

```ts
{
  layerNames: string[],
  grid: { rows: number, cols: number },
  keys: Array<{
    row: number,
    col: number,
    empty: boolean,
    layers: Record<string, string>   // layerName → resolved label
  }>
}
```

### `SlotId`

```ts
type SlotId =
  | 'topLeft' | 'topCenter' | 'topRight'
  | 'center'
  | 'botLeft' | 'botCenter' | 'botRight'
```

Visual layout on a key cap face:
```
topLeft  | topCenter | topRight
         |  center   |
botLeft  | botCenter | botRight
```

### `SlotOverride`

```ts
{
  active: boolean,
  type: 'text' | 'icon',   // svg is out of scope for v1
  value: string,            // text: the label string; icon: key into config.icons (e.g. "ic_bt")
  font: string | null       // null = inherit key-level font
}
```

### `KeyOverride`

```ts
{
  slots: Record<SlotId, SlotOverride>,
  font: string | null   // null = use global config font
}
```

### `keyOverrides`

```ts
Record<string, KeyOverride>   // key: `${row},${col}`
```

### Default layer → slot mapping

`loadKeymap()` pre-populates `keyOverrides` using the parsed layer labels and this table. The user can then modify per key.

| Layer count | Slot assignments (by layer index) |
|---|---|
| 1 | 0 → center |
| 2 | 0 → center, 1 → botCenter |
| 3 | 0 → center, 1 → topLeft, 2 → topRight |
| 4 | 0 → center, 1 → topLeft, 2 → topRight, 3 → botCenter |
| 5 | 0 → center, 1 → topLeft, 2 → topRight, 3 → botLeft, 4 → botRight |
| 6 | 0 → center, 1 → topLeft, 2 → topCenter, 3 → topRight, 4 → botLeft, 5 → botRight |
| 7 | 0 → center, 1 → topLeft, 2 → topCenter, 3 → topRight, 4 → botLeft, 5 → botCenter, 6 → botRight |

Note: `botCenter` appears for 2-layer keymaps (a common single-symbol layer case) and then re-appears at 7 layers. The 3–6 layer progressions fill the top row first, then the bottom corners.

### `Config`

The config object corresponds to `config.json` in the CLI. In the browser, `defaultConfig.js` exports it as an ES module constant. It includes `key`, `legends`, `colors`, `icons`, and `labelOverrides`. Users cannot edit it in v1; it is used as-is for parsing and SCAD generation.

```ts
{
  key:      { width, height, radius, plateHeight, gap, halveGap },
  legends:  { primaryDepth, secondaryDepth, thirdDepth, primaryFontSize,
              secondaryFontSize, thirdFontSize, font, smallFont, pYOffset },
  colors:   { base, legend, accent },
  icons:    Record<string, string>,   // e.g. { ic_bt: "\uf293", ... }
  labelOverrides: Record<string, string>
}
```

---

## Zustand Store

```ts
interface KeyboardStore {
  // Persistent
  keymapData: KeymapData | null
  keyOverrides: Record<string, KeyOverride>
  config: Config

  // Transient — excluded from persistence via partialize
  selectedKey: { row: number, col: number } | null
  pendingExport: '3mf' | 'scad' | null   // signals KeyboardScene to trigger export

  // Actions
  loadKeymap(text: string): void        // parse + apply default slot mapping
  setSlotOverride(row, col, slotId, override): void
  setKeyFont(row, col, font): void
  selectKey(row, col): void
  clearSelection(): void
  triggerExport(format: '3mf' | 'scad'): void   // sets pendingExport
  clearPendingExport(): void
  reset(): void
}
```

**Export trigger pattern**: `TopBar` export buttons call `triggerExport('3mf')`. `KeyboardScene` (inside the R3F Canvas) watches `pendingExport` via a `useEffect`. When it sees a pending export, it runs the export using `useThree()` (available inside Canvas), downloads the file, then calls `clearPendingExport()`. This avoids calling `useThree()` outside the Canvas.

---

## Components

```
App
├── TopBar
│   ├── LoadButton          — file input for .keymap, triggers loadKeymap()
│   ├── FontPicker          — global font selector; also writes config.legends.font
│   │                         so SCAD export picks it up
│   ├── ExportButton(3MF)   — calls triggerExport('3mf')
│   ├── ExportButton(scad)  — calls triggerExport('scad')
│   └── StartOverButton     — calls store.reset() + localStorage.removeItem('keebs-state')
├── MainLayout              — flex row, fills viewport height
│   ├── LeftPanel           — fixed width (~320px)
│   │   ├── KeyGrid         — shown when selectedKey is null
│   │   │   └── KeyCell     — one per non-empty key; shows primary label;
│   │   │                     colored by base color; click → selectKey()
│   │   └── KeyEditor       — shown when selectedKey is set
│   │       ├── EditorHeader    — "← Back" button, key identifier
│   │       ├── SlotDiagram     — 3×3 grid showing all 7 slots;
│   │       │                     active slots highlighted; click → focus slot
│   │       ├── SlotTabs        — tab per active slot, + button to activate more
│   │       └── SlotEditor      — editor for the focused slot
│   │           ├── ActiveToggle    — enable/disable this slot
│   │           ├── TypeToggle      — Text / Icon
│   │           ├── TextInput       — plain text, shown when type=text
│   │           └── IconPicker      — grid of icons from config.icons,
│   │                               shown when type=icon
│   └── RightPanel          — flex 1, contains R3F Canvas
│       └── KeyboardScene
│           ├── ExportOrchestrator  — useEffect watches pendingExport, runs export
│           ├── CameraRig           — OrbitControls, isometric default,
│           │                         "Reset" button snaps back
│           └── KeyCapMesh×N        — one per non-empty key
│               ├── BaseMesh            — box 16×16×0.8, color=black material
│               ├── LegendOverlays      — thin boxes for center/top* slots, color=white
│               ├── AccentOverlays      — thin boxes for bot* slots, color=gray
│               └── TopFaceTexture      — canvas texture with text labels, applied
│                                         to top face UV of BaseMesh
```

---

## 3D Preview

**Geometry** (built once per key on initial render):

Each `KeyCapMesh` renders three sets of flat box meshes:
- **Base**: `BoxGeometry(16, 0.8, 16)`, `MeshStandardMaterial({ color: '#1a1a1a' })`
- **LegendOverlays** (slots `center`, `topLeft`, `topCenter`, `topRight`): `BoxGeometry(slotW, 0.4, slotH)` positioned above the base, `MeshStandardMaterial({ color: '#e0e0e0' })`
- **AccentOverlays** (slots `botLeft`, `botCenter`, `botRight`): same geometry, `MeshStandardMaterial({ color: '#888888' })`

The legend/accent overlays are purely visual (they show the material color zones). Text is drawn on the `TopFaceTexture`, not on the overlay boxes, so there is no Z-fighting.

**TopFaceTexture**:

A `useEffect` hook maintains a 256×256 offscreen `<canvas>` and an associated `THREE.CanvasTexture`. When a key's overrides change, the effect redraws the canvas (clears it, then draws each active slot's label at the appropriate XY position for its `SlotId`) and calls `texture.needsUpdate = true`. The texture is applied only to the top face of `BaseMesh` via a custom UV map (the box's 6 faces each get their own material in a `materials` array).

**Slot label rendering in canvas:**
- `type: 'text'` — `ctx.fillText(value, x, y)` using the slot's font
- `type: 'icon'` — look up `config.icons[value]` to get the Unicode character, then `ctx.fillText(char, x, y)` using Hack Nerd Font (loaded via `FontFace` API before first render)

**Font loading**: Before the first `KeyboardScene` render, `App` loads the Nerd Font woff2 via:
```js
const font = new FontFace('Hack Nerd Font Mono', 'url(/fonts/HackNerdFontMono-Regular.woff2)')
await font.load()
document.fonts.add(font)
```
The font file is placed in `web/public/fonts/`. Once loaded, `setState({ fontsReady: true })` triggers the scene render.

**Camera**:
- Default: `position={[40, 60, 40]}`, looking at board center
- `OrbitControls` for free orbit/zoom
- "Reset camera" button in `RightPanel` header

---

## Export

### 3MF Export

`three/examples/jsm/exporters/3MFExporter.js` does not ship with three.js. Instead, `web/src/lib/export3mf.js` is a custom lightweight 3MF writer (~150 lines). The 3MF format is a ZIP of XML files; `fflate` (bundled as a three.js dependency) handles the ZIP.

The exporter groups scene meshes by material color hex string, producing one `<object>` element per color group. A `<m:colorgroup>` resource (Materials and Properties extension, namespace `http://schemas.microsoft.com/3dmanufacturing/material/2015/02`) defines the three material colors. Each object's `<triangles>` references the colorgroup via `pid` and `p1` attributes. PrusaSlicer and Bambu Studio read these color assignments on import and prompt the user to assign them to extruders.

```
export3mf(scene: THREE.Scene): Blob
  1. Walk scene, collect meshes with MeshStandardMaterial
     → group by material.color.getHexString() → 3 buckets
  2. For each bucket, merge geometry into a single flat vertex/index list
  3. Build 3dmodel.model XML:

     <model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"
            xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02"
            unit="millimeter">
       <resources>
         <m:colorgroup id="1">
           <m:color color="#1a1a1a"/>   <!-- base black,   index 0 -->
           <m:color color="#e0e0e0"/>   <!-- legend white, index 1 -->
           <m:color color="#888888"/>   <!-- accent gray,  index 2 -->
         </m:colorgroup>
         <object id="2" type="model" pid="1" pindex="0">  <!-- black object -->
           <mesh><vertices>...</vertices>
             <triangles>
               <triangle v1="0" v2="1" v3="2"/>  <!-- inherits pindex=0 from object -->
             </triangles>
           </mesh>
         </object>
         <object id="3" type="model" pid="1" pindex="1">  <!-- white object -->
           ...
         </object>
         <object id="4" type="model" pid="1" pindex="2">  <!-- gray object -->
           ...
         </object>
       </resources>
       <build>
         <item objectid="2"/><item objectid="3"/><item objectid="4"/>
       </build>
     </model>

  4. fflate.zipSync({
       '3D/3dmodel.model': modelXmlBytes,
       '[Content_Types].xml': contentTypesBytes,
       '_rels/.rels': relsBytes
     })
  5. Return Blob(zipped, { type: 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml' })
```

`ExportOrchestrator` (inside Canvas) calls this:

```js
const { scene } = useThree()
const blob = export3mf(scene)
downloadBlob(blob, 'keycaps.3mf')
store.clearPendingExport()
```

### SCAD Export

`ExportOrchestrator` detects `pendingExport === 'scad'` and runs:

```js
const { keymapData, keyOverrides, config } = store.getState()
const exportData = buildExportKeymapData(keymapData, keyOverrides)
const scad = buildScad(exportData, config)
downloadBlob(new Blob([scad], { type: 'text/plain' }), 'output.scad')
store.clearPendingExport()
```

**`buildExportKeymapData(keymapData, keyOverrides)`** translates the 7-slot model back to the 4-arg SCAD format.

The SCAD `key_cap(primary, topLeft, topRight, bottom)` maps as:
- `primary` ← `center` slot value (or `''`)
- `topLeft` ← `topLeft` slot value (or `''`)
- `topRight` ← `topRight` slot value (or `''`)
- `bottom` ← `botCenter` slot value (or `''`)

Slots `topCenter`, `botLeft`, `botRight` have no SCAD equivalent and are silently dropped (they still appear in the 3MF). The function returns a `keymapData`-shaped object where each key's `layers` record uses synthetic names that map to the 4 SCAD positions:

**Icon value resolution**: when a slot has `type: 'icon'`, `value` is the `config.icons` key (e.g. `'ic_bt'`). `buildExportKeymapData` converts this to the `$varname` convention (`'$ic_bt'`) so that `scadArg('$ic_bt')` emits the unquoted SCAD variable reference `ic_bt`. Text slots pass `value` through unchanged.

```js
function resolveSlotForScad(slot) {
  if (!slot.active) return ''
  if (slot.type === 'icon') return `$${slot.value}`  // 'ic_bt' → '$ic_bt'
  return slot.value  // text passes through
}

// Input (from store):
keyOverrides['0,2'].slots.center    = { active: true,  type: 'text', value: 'E' }
keyOverrides['0,2'].slots.topLeft   = { active: true,  type: 'text', value: '1' }
keyOverrides['0,2'].slots.topRight  = { active: false, type: 'text', value: '' }
keyOverrides['0,2'].slots.botCenter = { active: true,  type: 'icon', value: 'ic_bt' }

// Output object returned by buildExportKeymapData:
{
  layerNames: ['_p', '_tl', '_tr', '_bt'],
  grid: { ...keymapData.grid },
  keys: [
    ...
    { row: 0, col: 2, empty: false,
      layers: { _p: 'E', _tl: '1', _tr: '', _bt: '$ic_bt' } },
    ...
  ]
}
```

`buildScad` receives `layerNames: ['_p', '_tl', '_tr', '_bt']` and maps them to the 4 positional `key_cap` args. `scadArg('$ic_bt')` → `ic_bt` (the SCAD variable holding the Bluetooth icon glyph).

---

## Fonts

Available fonts (loaded via `@fontsource/*` packages, applied to `KeyCell` labels and `CanvasTexture`):

| Display name | CSS / FontFace family | Used in CanvasTexture |
|---|---|---|
| Hack Nerd Font Mono (default) | `'Hack Nerd Font Mono'` | Yes — required for icon glyphs |
| Staatliches | `'Staatliches'` | Yes |
| Fira Code | `'Fira Code'` | Yes |
| Pixel Cyr | `'Pixel Cyr'` | Yes |
| Pixel Ex | `'Pixel Ex'` | Yes |

Changing the global font in `FontPicker` updates `config.legends.font` in the store (the CSS font name is mapped to the SCAD font name string), so the SCAD export reflects the chosen font.

---

## State Persistence

```js
persist(storeDefinition, {
  name: 'keebs-state',
  partialize: (state) => ({
    keymapData: state.keymapData,
    keyOverrides: state.keyOverrides,
    config: state.config,
  }),
})
```

`selectedKey` and `pendingExport` are excluded — they are always `null` on load.

"Start Over": `localStorage.removeItem('keebs-state')` then `store.reset()`.

---

## File Structure

```
web/
├── index.html
├── vite.config.js
├── package.json
├── public/
│   └── fonts/
│       └── HackNerdFontMono-Regular.woff2
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── store.js
    ├── lib/
    │   ├── parse.js          — browser rewrite (no fs/path/require)
    │   ├── zmk-bindings.js   — ES module copy
    │   ├── sv-keys.js        — ES module copy
    │   ├── layout-map.js     — ES module copy
    │   ├── generate.js       — ES module copy
    │   ├── defaultConfig.js  — config.json exported as ES const
    │   ├── slotDefaults.js   — layer-count → slot mapping
    │   └── export3mf.js      — custom lightweight 3MF writer using fflate
    ├── components/
    │   ├── TopBar/
    │   ├── KeyGrid/
    │   │   └── KeyCell.jsx
    │   ├── KeyEditor/
    │   │   ├── SlotDiagram.jsx
    │   │   ├── SlotTabs.jsx
    │   │   └── SlotEditor/
    │   │       ├── TypeToggle.jsx
    │   │       ├── TextInput.jsx
    │   │       └── IconPicker.jsx
    │   └── KeyboardScene/
    │       ├── index.jsx           — R3F Canvas + font-ready gate
    │       ├── ExportOrchestrator.jsx
    │       ├── CameraRig.jsx
    │       ├── KeyCapMesh.jsx
    │       └── useCanvasTexture.js
    └── styles/
        └── global.css
```

---

## Error Handling

- **Failed .keymap parse**: show an error banner in the left panel, leave previous state intact
- **No keymap loaded**: left panel shows a drop-zone/load prompt; 3D panel shows placeholder message
- **Font not loaded**: `CanvasTexture` draw deferred until `fontsReady` flag is set; fallback to monospace if load fails
- **3MF export failure**: inline error toast + console log
- **Icon key not found in config.icons**: render `?` glyph in that slot

---

## Testing

- Unit tests for `slotDefaults.js` — all 7 layer counts produce correct slot assignments
- Unit tests for `buildExportKeymapData()` — 7-slot → 4-arg SCAD mapping, including dropped slots
- Unit tests for the browser `parse.js` (`parseKeymapText`) — same test cases as existing `tests/parse.test.js`
- Existing `tests/generate.test.js` continues to cover the CLI `src/generate.js`
- Manual smoke test: load `olik.keymap`, verify all keys render, edit one slot, export `.3mf`, import to PrusaSlicer

---

## Out of Scope (v1)

- Mobile layout
- Key size variants (all keys are 16×16)
- SVG slot type (text and icon only)
- Custom font upload
- Layer visibility toggle in 3D view
- Undo/redo
- Editing `config.json` settings (key dimensions, depths) in the UI
