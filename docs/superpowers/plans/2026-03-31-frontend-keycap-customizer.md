# Frontend Key Cap Customizer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static React + Vite web app that loads a ZMK `.keymap` file, lets the user customize each key cap's slots (text/icon, 7 positions), shows a live Three.js 3D preview, and exports a multicolor `.3mf` file for MMU 3D printing — all in the browser, no server.

**Architecture:** Browser-compatible ES module rewrites of the existing `src/parse.js` and `src/generate.js` live in `web/src/lib/`. A Zustand store holds parsed keymap data plus per-key slot overrides, persisted to `localStorage`. The UI is a side-by-side layout: left panel = key grid or key editor, right panel = R3F Three.js scene. A custom `export3mf.js` generates a valid multicolor 3MF using `fflate` for ZIP creation.

**Tech Stack:** React 18, Vite 5, Zustand 4, three.js r172, @react-three/fiber 8, @react-three/drei 9, fflate 0.8, vitest 2, @testing-library/react

**Spec:** `docs/superpowers/specs/2026-03-31-frontend-keycap-customizer-design.md`

---

## File Map

```
web/
├── index.html
├── vite.config.js              — Vite + vitest config
├── package.json
├── public/
│   └── fonts/
│       └── HackNerdFontMono-Regular.woff2   ← must be provided (see Task 11)
└── src/
    ├── main.jsx                — React root mount
    ├── App.jsx                 — font-load gate, layout shell
    ├── store.js                — Zustand store (keymapData, keyOverrides, config, UI state)
    ├── lib/
    │   ├── layout-map.js       — ES module copy of src/layout-map.js
    │   ├── sv-keys.js          — ES module copy of src/sv-keys.js
    │   ├── zmk-bindings.js     — ES module copy of src/zmk-bindings.js
    │   ├── parse.js            — browser rewrite: parseKeymapText(text, config)
    │   ├── generate.js         — ES module copy of src/generate.js
    │   ├── defaultConfig.js    — config.json as ES export
    │   ├── slotDefaults.js     — applySlotDefaults(keymapData, config) → keyOverrides
    │   └── export3mf.js        — export3mf(scene) → Blob (custom 3MF writer)
    ├── components/
    │   ├── TopBar/
    │   │   └── index.jsx       — load, font picker, export buttons, start over
    │   ├── KeyGrid/
    │   │   ├── index.jsx       — grid of KeyCell components
    │   │   └── KeyCell.jsx     — single key tile, clickable
    │   ├── KeyEditor/
    │   │   ├── index.jsx       — editor shell, EditorHeader
    │   │   ├── SlotDiagram.jsx — 3×3 visual slot map
    │   │   ├── SlotTabs.jsx    — tab strip for active slots
    │   │   └── SlotEditor/
    │   │       ├── index.jsx       — type toggle + active toggle
    │   │       ├── TextInput.jsx   — plain text entry
    │   │       └── IconPicker.jsx  — grid of config.icons entries
    │   └── KeyboardScene/
    │       ├── index.jsx           — R3F Canvas wrapper + font-ready guard
    │       ├── ExportOrchestrator.jsx  — watches pendingExport, runs export inside Canvas
    │       ├── CameraRig.jsx           — OrbitControls + reset
    │       └── KeyCapMesh.jsx          — per-key geometry + useCanvasTexture
    └── styles/
        └── global.css
```

---

## Task 1: Scaffold Vite + React project

**Files:**
- Create: `web/package.json`
- Create: `web/vite.config.js`
- Create: `web/index.html`
- Create: `web/src/main.jsx`
- Create: `web/src/App.jsx`
- Create: `web/src/styles/global.css`

- [ ] **Step 1: Create `web/package.json`**

```json
{
  "name": "keebs-web",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev":   "vite",
    "build": "vite build",
    "test":  "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@react-three/drei":  "^9.115.0",
    "@react-three/fiber": "^8.17.0",
    "@fontsource/fira-code":   "^5.0.0",
    "@fontsource/staatliches": "^5.0.0",
    "fflate":    "^0.8.2",
    "react":     "^18.3.1",
    "react-dom": "^18.3.1",
    "three":     "^0.172.0",
    "zustand":   "^4.5.5"
  },
  "devDependencies": {
    "@testing-library/jest-dom":  "^6.6.3",
    "@testing-library/react":     "^16.0.0",
    "@types/three":               "^0.172.0",
    "@vitejs/plugin-react":       "^4.3.4",
    "jsdom":    "^25.0.1",
    "vite":     "^5.4.11",
    "vitest":   "^2.1.8"
  }
}
```

- [ ] **Step 2: Create `web/vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
  },
})
```

- [ ] **Step 3: Create `web/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Keebs — Key Cap Customizer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `web/src/main.jsx`**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/global.css'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 5: Create `web/src/App.jsx`** (skeleton — expanded in later tasks)

```jsx
export default function App() {
  return <div className="app-shell">Keebs</div>
}
```

- [ ] **Step 6: Create `web/src/styles/global.css`**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: #0a0a0f;
  color: #e0e0e0;
  font-family: 'Fira Code', monospace;
  height: 100vh;
  overflow: hidden;
}

.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.main-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.left-panel {
  width: 320px;
  min-width: 320px;
  border-right: 1px solid #2a2a3e;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.right-panel {
  flex: 1;
  position: relative;
}
```

- [ ] **Step 7: Create test setup file `web/src/__tests__/setup.js`**

```js
import '@testing-library/jest-dom'
```

- [ ] **Step 8: Install dependencies**

```bash
cd web && npm install
```

- [ ] **Step 9: Verify dev server starts**

```bash
cd web && npm run dev
```

Expected: Vite dev server running at `http://localhost:5173`, page shows "Keebs".

- [ ] **Step 10: Commit**

```bash
git add web/
git commit -m "feat: scaffold Vite + React web app"
```

---

## Task 2: Port shared lib modules to ES modules

The existing `src/*.js` files use CommonJS. We copy them to `web/src/lib/` and convert to ES module syntax. The CLI `src/` files are **not modified** — they stay CommonJS.

**Files:**
- Create: `web/src/lib/layout-map.js`
- Create: `web/src/lib/sv-keys.js`
- Create: `web/src/lib/zmk-bindings.js`
- Create: `web/src/lib/generate.js`
- Create: `web/src/lib/defaultConfig.js`

### 2a: layout-map.js

- [ ] **Step 1: Copy and convert `src/layout-map.js` → `web/src/lib/layout-map.js`**

Same content as `src/layout-map.js` but replace `module.exports = { ... }` with named `export` statements:

```js
// at the bottom, replace:
//   module.exports = { ROWS, COLS, BINDINGS_PER_ROW, getRowZones };
// with:
export { ROWS, COLS, BINDINGS_PER_ROW, getRowZones };
```

All `const` declarations at the top level stay as-is. No `require()` calls to change (layout-map has none).

### 2b: sv-keys.js

- [ ] **Step 2: Copy and convert `src/sv-keys.js` → `web/src/lib/sv-keys.js`**

Replace:
```js
module.exports = { ... }
```
With:
```js
export default { ... }
```

### 2c: zmk-bindings.js

- [ ] **Step 3: Copy and convert `src/zmk-bindings.js` → `web/src/lib/zmk-bindings.js`**

Note: `zmk-bindings.js` accesses sv-keys via `svKeys[name]` (bracket notation on the imported object), which is fully compatible with `import svKeys from './sv-keys.js'` (default export is the flat object).

Changes:
- Remove `const svKeys = require('./sv-keys')` → `import svKeys from './sv-keys.js'`
- Replace `module.exports = { resolveBinding }` → `export { resolveBinding }`

### 2d: generate.js

- [ ] **Step 4: Copy and convert `src/generate.js` → `web/src/lib/generate.js`**

Changes:
- Remove the two top-level lines: `const fs = require('fs')` and `const path = require('path')`
- Remove the entire `if (require.main === module) { ... }` block at the bottom (lines ~180–195)
- Replace `module.exports = { buildScad, scadArg }` → `export { buildScad, scadArg }`

Note: `fs` and `path` are only used inside the `require.main` CLI block, not inside `buildScad` or `scadArg`. Removing those two require lines plus the CLI block is sufficient.

### 2e: defaultConfig.js

- [ ] **Step 5: Create `web/src/lib/defaultConfig.js`**

Copy the contents of `config.json` from the project root into an ES export:

```js
const defaultConfig = {
  key: { width: 16, height: 16, radius: 2, plateHeight: 0.8, gap: 1, halveGap: 20 },
  legends: {
    primaryDepth: 0.4, secondaryDepth: 0.2, thirdDepth: 0.1,
    primaryFontSize: 5.2, secondaryFontSize: 3.1, thirdFontSize: 2.0,
    font: 'Hack Nerd Font Mono:style=Bold', smallFont: 'Hack Nerd Font', pYOffset: 0,
  },
  colors: { base: 'black', legend: 'white', accent: 'gray' },
  icons: {
    ic_bt:   '\uf293', ic_mute: '\uf026', ic_v_dn: '\uf027', ic_v_up: '\uf028',
    ic_play: '\uf04b', ic_prev: '\uf048', ic_next: '\uf051',
    ic_back: '\u2190', ic_del:  '\u2190', ic_ent:  '\u21b5',
    ic_tab:  '\u21e5', ic_shf:  '\u21e7', ic_cmd:  '\u2318',
    ic_opt:  '\u2325', ic_ctl:  '\u2303', ic_spc:  '\u2015',
    ic_pgu:  '\u21de', ic_pgd:  '\u21df', ic_home: '\u2196', ic_end:  '\u2198',
  },
  labelOverrides: {
    LEFT_ALT: 'ALT', LEFT_GUI: 'CMD', LEFT_CTRL: 'CTL', LCTRL: 'CTL',
    LSHIFT: '$ic_shf', BACKSPACE: '$ic_back', DELETE: '$ic_del',
    ESCAPE: 'ESC', ENTER: '$ic_ent', TAB: '$ic_tab', SPACE: '$ic_spc',
    PAGE_UP: '$ic_pgu', PAGE_DOWN: '$ic_pgd', HOME: '$ic_home', END: '$ic_end',
    UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→',
    COMMA: ',', DOT: '.', GRAVE: '`', CAPS: 'caps',
    C_PLAY_PAUSE: '$ic_play', C_PLAY: '$ic_play',
    C_VOL_UP: '$ic_v_up', C_VOL_DN: '$ic_v_dn', C_MUTE: '$ic_mute',
    C_PREV: '$ic_prev', C_NEXT: '$ic_next',
  },
}

export default defaultConfig
```

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/
git commit -m "feat: port shared lib modules to ES modules"
```

---

## Task 3: Browser-compatible parse.js

`src/parse.js` uses `fs.readFileSync` to load both the keymap file and `config.json`. The browser version receives the file text as a string and config as a plain object.

**Files:**
- Create: `web/src/lib/parse.js`
- Create: `web/src/__tests__/parse.test.js`

- [ ] **Step 1: Write the failing test**

`web/src/__tests__/parse.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { parseKeymapText } from '../lib/parse.js'
import defaultConfig from '../lib/defaultConfig.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Use the real keymap fixture from the project root
const keymapText = fs.readFileSync(
  path.resolve(__dirname, '../../../../olik.keymap'), 'utf8'
)

describe('parseKeymapText', () => {
  it('returns layerNames, grid, keys', () => {
    const result = parseKeymapText(keymapText, defaultConfig)
    expect(result).toHaveProperty('layerNames')
    expect(result).toHaveProperty('grid')
    expect(result).toHaveProperty('keys')
    expect(Array.isArray(result.keys)).toBe(true)
    expect(result.keys.length).toBeGreaterThan(0)
  })

  it('grid matches layout (5 rows, 12 cols)', () => {
    const result = parseKeymapText(keymapText, defaultConfig)
    expect(result.grid.rows).toBe(5)
    expect(result.grid.cols).toBe(12)
  })

  it('key at row=0 col=0 has a Base layer label', () => {
    const result = parseKeymapText(keymapText, defaultConfig)
    const key = result.keys.find(k => k.row === 0 && k.col === 0)
    expect(key).toBeDefined()
    expect(key.layers['Base']).toBeTruthy()
  })

  it('empty keys have empty string labels', () => {
    const result = parseKeymapText(keymapText, defaultConfig)
    const emptyKey = result.keys.find(k => k.empty)
    if (emptyKey) {
      for (const label of Object.values(emptyKey.layers)) {
        expect(label).toBe('')
      }
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd web && npm test -- parse
```

Expected: FAIL — `parseKeymapText` is not defined.

- [ ] **Step 3: Create `web/src/lib/parse.js`**

Copy `src/parse.js` and make these changes:

1. Remove the top two lines (`const fs = require('fs')` and `const path = require('path')`)
2. Replace the `require` calls with ES imports:
   ```js
   import { resolveBinding } from './zmk-bindings.js'
   import { ROWS, COLS, BINDINGS_PER_ROW, getRowZones } from './layout-map.js'
   ```
3. Replace `parseKeymap(keymapPath)` with `parseKeymapText(text, config)`:
   ```js
   export function parseKeymapText(text, config) {
     const overrides = config.labelOverrides || {}
     const src       = text
     // ... rest of the function body unchanged
   }
   ```
   Delete the two `fs.readFileSync` lines inside the function and the `configPath` line.
4. Remove the entire `if (require.main === module) { ... }` block.
5. Remove the `module.exports` line (replaced by `export function` above).

- [ ] **Step 4: Run test to verify it passes**

```bash
cd web && npm test -- parse
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/parse.js web/src/__tests__/parse.test.js
git commit -m "feat: browser-compatible parseKeymapText"
```

---

## Task 4: slotDefaults.js

Pure function that takes `keymapData` and returns the initial `keyOverrides` record by mapping each key's parsed layer labels to the correct slot positions.

**Files:**
- Create: `web/src/lib/slotDefaults.js`
- Create: `web/src/__tests__/slotDefaults.test.js`

- [ ] **Step 1: Write failing tests**

`web/src/__tests__/slotDefaults.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { applySlotDefaults, SLOT_ORDER } from '../lib/slotDefaults.js'

function makeKeymap(layerNames, keyLayers) {
  return {
    layerNames,
    grid: { rows: 1, cols: 1 },
    keys: [{ row: 0, col: 0, empty: false, layers: keyLayers }],
  }
}

describe('SLOT_ORDER', () => {
  it('has 7 entries for 7 layers', () => {
    expect(SLOT_ORDER[7].length).toBe(7)
  })
  it('1-layer keymap maps to center', () => {
    expect(SLOT_ORDER[1][0]).toBe('center')
  })
  it('4-layer keymap maps 0→center, 1→topLeft, 2→topRight, 3→botCenter', () => {
    const [s0, s1, s2, s3] = SLOT_ORDER[4]
    expect(s0).toBe('center')
    expect(s1).toBe('topLeft')
    expect(s2).toBe('topRight')
    expect(s3).toBe('botCenter')
  })
})

describe('applySlotDefaults', () => {
  it('populates center slot from Base layer', () => {
    const km = makeKeymap(['Base'], { Base: 'Q' })
    const overrides = applySlotDefaults(km)
    expect(overrides['0,0'].slots.center.value).toBe('Q')
    expect(overrides['0,0'].slots.center.active).toBe(true)
    expect(overrides['0,0'].slots.center.type).toBe('text')
  })

  it('populates topLeft and topRight for 3-layer keymap', () => {
    const km = makeKeymap(['Base', 'Sym', 'Nav'], { Base: 'A', Sym: '!', Nav: '←' })
    const overrides = applySlotDefaults(km)
    const slots = overrides['0,0'].slots
    expect(slots.topLeft.value).toBe('!')
    expect(slots.topRight.value).toBe('←')
    expect(slots.botCenter.active).toBe(false)
  })

  it('empty labels become inactive slots', () => {
    const km = makeKeymap(['Base', 'Sym'], { Base: 'Q', Sym: '' })
    const overrides = applySlotDefaults(km)
    expect(overrides['0,0'].slots.botCenter.active).toBe(false)
    expect(overrides['0,0'].slots.botCenter.value).toBe('')
  })

  it('empty keys get all-inactive slots', () => {
    const km = {
      layerNames: ['Base'],
      grid: { rows: 1, cols: 1 },
      keys: [{ row: 0, col: 0, empty: true, layers: { Base: '' } }],
    }
    const overrides = applySlotDefaults(km)
    expect(overrides['0,0'].slots.center.active).toBe(false)
  })

  it('icon labels ($ic_bt) set type=icon and value=ic_bt', () => {
    const km = makeKeymap(['Base'], { Base: '$ic_bt' })
    const overrides = applySlotDefaults(km)
    const slot = overrides['0,0'].slots.center
    expect(slot.type).toBe('icon')
    expect(slot.value).toBe('ic_bt')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd web && npm test -- slotDefaults
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `web/src/lib/slotDefaults.js`**

```js
// Maps layer count to ordered slot IDs
export const SLOT_ORDER = {
  1: ['center'],
  2: ['center', 'botCenter'],
  3: ['center', 'topLeft', 'topRight'],
  4: ['center', 'topLeft', 'topRight', 'botCenter'],
  5: ['center', 'topLeft', 'topRight', 'botLeft', 'botRight'],
  6: ['center', 'topLeft', 'topCenter', 'topRight', 'botLeft', 'botRight'],
  7: ['center', 'topLeft', 'topCenter', 'topRight', 'botLeft', 'botCenter', 'botRight'],
}

const ALL_SLOTS = ['topLeft', 'topCenter', 'topRight', 'center', 'botLeft', 'botCenter', 'botRight']

function makeSlot(value = '', active = false) {
  const isIcon = typeof value === 'string' && /^\$[a-z_]/i.test(value)
  return {
    active: active && value !== '',
    type: isIcon ? 'icon' : 'text',
    value: isIcon ? value.slice(1) : value,  // '$ic_bt' → 'ic_bt'
    font: null,
  }
}

/**
 * Build the initial keyOverrides from parsed keymapData.
 * Returns Record<"row,col", KeyOverride>.
 */
export function applySlotDefaults(keymapData) {
  const { layerNames, keys } = keymapData
  const count = Math.min(layerNames.length, 7)
  const order = SLOT_ORDER[count] || SLOT_ORDER[7]

  const overrides = {}

  for (const key of keys) {
    const k = `${key.row},${key.col}`
    const slots = {}

    // Initialize all slots as inactive
    for (const slotId of ALL_SLOTS) {
      slots[slotId] = makeSlot('', false)
    }

    if (!key.empty) {
      // Map each layer to its default slot
      for (let i = 0; i < order.length; i++) {
        const slotId = order[i]
        const layerName = layerNames[i]
        const value = (key.layers[layerName] || '').trim()
        slots[slotId] = makeSlot(value, value !== '')
      }
    }

    overrides[k] = { slots, font: null }
  }

  return overrides
}
```

- [ ] **Step 4: Run tests**

```bash
cd web && npm test -- slotDefaults
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/slotDefaults.js web/src/__tests__/slotDefaults.test.js
git commit -m "feat: slotDefaults — map layer labels to key cap slots"
```

---

## Task 5: Zustand store

**Files:**
- Create: `web/src/store.js`
- Create: `web/src/__tests__/store.test.js`

- [ ] **Step 1: Write failing tests**

`web/src/__tests__/store.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { createStore } from '../store.js'

// createStore() returns a vanilla Zustand store (not a hook) — easier to test
describe('keyboard store', () => {
  let store

  beforeEach(() => {
    store = createStore()
  })

  it('starts with null keymapData and empty overrides', () => {
    const state = store.getState()
    expect(state.keymapData).toBeNull()
    expect(state.keyOverrides).toEqual({})
    expect(state.selectedKey).toBeNull()
  })

  it('loadKeymap sets keymapData and populates keyOverrides', () => {
    const fakeKeymapText = `
      / {
        keymap {
          compatible = "zmk,keymap";
          base_layer { label = "Base"; bindings = < &kp A &kp B >; };
        };
      };
    `
    // Use a minimal 1×2 keymap via the real parser would need more setup —
    // so we test loadKeymap's state transition by directly passing a keymapData stub
    store.getState().loadKeymapData({
      layerNames: ['Base'],
      grid: { rows: 1, cols: 2 },
      keys: [
        { row: 0, col: 0, empty: false, layers: { Base: 'A' } },
        { row: 0, col: 1, empty: false, layers: { Base: 'B' } },
      ],
    })
    const state = store.getState()
    expect(state.keymapData).not.toBeNull()
    expect(state.keyOverrides['0,0'].slots.center.value).toBe('A')
    expect(state.keyOverrides['0,1'].slots.center.value).toBe('B')
  })

  it('setSlotOverride updates a slot', () => {
    store.getState().loadKeymapData({
      layerNames: ['Base'],
      grid: { rows: 1, cols: 1 },
      keys: [{ row: 0, col: 0, empty: false, layers: { Base: 'Q' } }],
    })
    store.getState().setSlotOverride(0, 0, 'center', { active: true, type: 'text', value: 'Z', font: null })
    expect(store.getState().keyOverrides['0,0'].slots.center.value).toBe('Z')
  })

  it('selectKey and clearSelection work', () => {
    store.getState().selectKey(1, 3)
    expect(store.getState().selectedKey).toEqual({ row: 1, col: 3 })
    store.getState().clearSelection()
    expect(store.getState().selectedKey).toBeNull()
  })

  it('reset clears keymapData and overrides', () => {
    store.getState().loadKeymapData({
      layerNames: ['Base'],
      grid: { rows: 1, cols: 1 },
      keys: [{ row: 0, col: 0, empty: false, layers: { Base: 'Q' } }],
    })
    store.getState().reset()
    const state = store.getState()
    expect(state.keymapData).toBeNull()
    expect(state.keyOverrides).toEqual({})
  })

  it('triggerExport sets pendingExport', () => {
    store.getState().triggerExport('3mf')
    expect(store.getState().pendingExport).toBe('3mf')
    store.getState().clearPendingExport()
    expect(store.getState().pendingExport).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd web && npm test -- store
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `web/src/store.js`**

```js
import { createStore as createZustandStore } from 'zustand/vanilla'
import { persist, createJSONStorage } from 'zustand/middleware'
import defaultConfig from './lib/defaultConfig.js'
import { applySlotDefaults } from './lib/slotDefaults.js'

const initialState = {
  keymapData:   null,
  keyOverrides: {},
  config:       defaultConfig,
  // transient — excluded from persistence
  selectedKey:   null,
  pendingExport: null,
}

function storeDefinition(set) {
  return {
    ...initialState,

    loadKeymapData(keymapData) {
      const keyOverrides = applySlotDefaults(keymapData)
      set({ keymapData, keyOverrides, selectedKey: null })
    },

    setSlotOverride(row, col, slotId, slotOverride) {
      set(state => {
        const k = `${row},${col}`
        const existing = state.keyOverrides[k] || { slots: {}, font: null }
        return {
          keyOverrides: {
            ...state.keyOverrides,
            [k]: {
              ...existing,
              slots: { ...existing.slots, [slotId]: slotOverride },
            },
          },
        }
      })
    },

    setKeyFont(row, col, font) {
      set(state => {
        const k = `${row},${col}`
        const existing = state.keyOverrides[k] || { slots: {}, font: null }
        return {
          keyOverrides: {
            ...state.keyOverrides,
            [k]: { ...existing, font },
          },
        }
      })
    },

    selectKey(row, col) { set({ selectedKey: { row, col } }) },
    clearSelection()    { set({ selectedKey: null }) },
    triggerExport(fmt)  { set({ pendingExport: fmt }) },
    clearPendingExport(){ set({ pendingExport: null }) },

    updateConfig(patch) {
      set(state => ({ config: { ...state.config, ...patch } }))
    },

    reset() {
      set({ ...initialState, config: defaultConfig })
    },
  }
}

// Vanilla store for tests (no React hook)
export function createStore() {
  return createZustandStore(storeDefinition)
}

// Persisted React hook for the app
import { create } from 'zustand'

export const useKeyboardStore = create(
  persist(storeDefinition, {
    name: 'keebs-state',
    storage: createJSONStorage(() => localStorage),
    partialize: state => ({
      keymapData:   state.keymapData,
      keyOverrides: state.keyOverrides,
      config:       state.config,
    }),
  })
)
```

- [ ] **Step 4: Run tests**

```bash
cd web && npm test -- store
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/store.js web/src/__tests__/store.test.js
git commit -m "feat: Zustand store with persistence and slot overrides"
```

---

## Task 6: KeyGrid component

**Files:**
- Create: `web/src/components/KeyGrid/KeyCell.jsx`
- Create: `web/src/components/KeyGrid/index.jsx`
- Create: `web/src/components/KeyGrid/KeyGrid.module.css`

- [ ] **Step 1: Create `web/src/components/KeyGrid/KeyCell.jsx`**

```jsx
import styles from './KeyGrid.module.css'

export default function KeyCell({ keyEntry, isSelected, onClick }) {
  if (keyEntry.empty) return <div className={styles.cellEmpty} />

  const primaryLabel = Object.values(keyEntry.layers)[0] || ''

  return (
    <div
      className={`${styles.cell} ${isSelected ? styles.cellSelected : ''}`}
      onClick={onClick}
      title={`row ${keyEntry.row}, col ${keyEntry.col}`}
    >
      <span className={styles.cellLabel}>{primaryLabel}</span>
    </div>
  )
}
```

- [ ] **Step 2: Create `web/src/components/KeyGrid/KeyGrid.module.css`**

```css
.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 3px;
  padding: 12px;
}

.cell {
  background: #1a1a2e;
  border: 1px solid #2a3a5a;
  border-radius: 4px;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.1s, background 0.1s;
  font-size: 10px;
  overflow: hidden;
}

.cell:hover {
  border-color: #4a9eff;
  background: #1a2a4e;
}

.cellSelected {
  border-color: #4a9eff !important;
  background: #1e2a5e !important;
  box-shadow: 0 0 0 1px #4a9eff44;
}

.cellEmpty {
  aspect-ratio: 1;
}

.cellLabel {
  font-size: 9px;
  color: #ccc;
  user-select: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 2px;
}
```

- [ ] **Step 3: Create `web/src/components/KeyGrid/index.jsx`**

```jsx
import { useKeyboardStore } from '../../store.js'
import KeyCell from './KeyCell.jsx'
import styles from './KeyGrid.module.css'

export default function KeyGrid() {
  const keymapData = useKeyboardStore(s => s.keymapData)
  const selectedKey = useKeyboardStore(s => s.selectedKey)
  const selectKey = useKeyboardStore(s => s.selectKey)

  if (!keymapData) return null

  const { grid, keys } = keymapData

  // Build a sparse 2D lookup for display ordering
  const byPosition = {}
  for (const key of keys) {
    byPosition[`${key.row},${key.col}`] = key
  }

  const cells = []
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const key = byPosition[`${row},${col}`]
      if (!key) {
        cells.push(<div key={`${row},${col}`} className={styles.cellEmpty} />)
        continue
      }
      const isSelected = selectedKey?.row === row && selectedKey?.col === col
      cells.push(
        <KeyCell
          key={`${row},${col}`}
          keyEntry={key}
          isSelected={isSelected}
          onClick={() => !key.empty && selectKey(row, col)}
        />
      )
    }
  }

  return <div className={styles.grid}>{cells}</div>
}
```

- [ ] **Step 4: Wire KeyGrid into App.jsx**

Update `web/src/App.jsx`:

```jsx
import { useKeyboardStore } from './store.js'
import KeyGrid from './components/KeyGrid/index.jsx'

export default function App() {
  const keymapData = useKeyboardStore(s => s.keymapData)

  return (
    <div className="app-shell">
      <div className="main-layout">
        <div className="left-panel">
          {keymapData
            ? <KeyGrid />
            : <p style={{ padding: '20px', color: '#555' }}>Load a .keymap file to begin</p>
          }
        </div>
        <div className="right-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
          3D preview
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify in browser** — `npm run dev`, you'll see the left panel placeholder for now.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/KeyGrid/ web/src/App.jsx
git commit -m "feat: KeyGrid component with selection"
```

---

## Task 7: TopBar with file loading

**Files:**
- Create: `web/src/components/TopBar/index.jsx`
- Create: `web/src/components/TopBar/TopBar.module.css`

- [ ] **Step 1: Create `web/src/components/TopBar/TopBar.module.css`**

```css
.topbar {
  height: 48px;
  background: #0f0f1a;
  border-bottom: 1px solid #2a2a3e;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  flex-shrink: 0;
}

.title {
  font-size: 14px;
  font-weight: bold;
  color: #4a9eff;
  margin-right: 8px;
}

.btn {
  background: #1e2640;
  border: 1px solid #3a4a7a;
  color: #ccc;
  border-radius: 5px;
  padding: 5px 12px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.1s, background 0.1s;
}

.btn:hover {
  border-color: #4a9eff;
  background: #1a2a4e;
  color: #fff;
}

.btnDanger {
  border-color: #5a2a2a;
  color: #aa6666;
}

.btnDanger:hover {
  border-color: #aa4444;
  background: #2a1a1a;
  color: #ffaaaa;
}

.spacer { flex: 1; }

.fileInput { display: none; }
```

- [ ] **Step 2: Create `web/src/components/TopBar/index.jsx`**

```jsx
import { useRef } from 'react'
import { useKeyboardStore } from '../../store.js'
import { parseKeymapText } from '../../lib/parse.js'
import styles from './TopBar.module.css'

const FONTS = [
  { label: 'Hack Nerd Font',  value: 'Hack Nerd Font Mono:style=Bold' },
  { label: 'Staatliches',     value: 'Staatliches' },
  { label: 'Fira Code',       value: 'Fira Code' },
  { label: 'Pixel Cyr',       value: 'Pixel Cyr' },
  { label: 'Pixel Ex',        value: 'Pixel Ex' },
]

export default function TopBar() {
  const fileRef = useRef(null)
  const config          = useKeyboardStore(s => s.config)
  const loadKeymapData  = useKeyboardStore(s => s.loadKeymapData)
  const triggerExport   = useKeyboardStore(s => s.triggerExport)
  const updateConfig    = useKeyboardStore(s => s.updateConfig)
  const reset           = useKeyboardStore(s => s.reset)
  const keymapData      = useKeyboardStore(s => s.keymapData)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = parseKeymapText(ev.target.result, config)
        loadKeymapData(data)
      } catch (err) {
        alert(`Failed to parse keymap: ${err.message}`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''  // allow re-loading same file
  }

  function handleReset() {
    if (!confirm('Start over? All customizations will be lost.')) return
    localStorage.removeItem('keebs-state')
    reset()
  }

  return (
    <div className={styles.topbar}>
      <span className={styles.title}>⌨ Keebs</span>

      <input
        type="file"
        accept=".keymap"
        ref={fileRef}
        className={styles.fileInput}
        onChange={handleFile}
      />
      <button className={styles.btn} onClick={() => fileRef.current.click()}>
        Load .keymap
      </button>

      {/* FontPicker — updates config.legends.font so SCAD export uses chosen font */}
      <select
        className={styles.btn}
        value={config.legends.font}
        onChange={e => updateConfig({ legends: { ...config.legends, font: e.target.value } })}
        title="Global font"
      >
        {FONTS.map(f => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      {keymapData && (
        <>
          <div className={styles.spacer} />

          <button className={styles.btn} onClick={() => triggerExport('3mf')}>
            ↓ 3MF
          </button>
          <button className={styles.btn} onClick={() => triggerExport('scad')}>
            ↓ SCAD
          </button>
          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleReset}>
            Start Over
          </button>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add TopBar to App.jsx**

```jsx
import TopBar from './components/TopBar/index.jsx'
// add <TopBar /> above <div className="main-layout">
```

- [ ] **Step 4: Verify in browser** — load `olik.keymap`, key grid should populate.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/TopBar/
git commit -m "feat: TopBar with file loading and export buttons"
```

---

## Task 8: KeyEditor

**Files:**
- Create: `web/src/components/KeyEditor/index.jsx`
- Create: `web/src/components/KeyEditor/SlotDiagram.jsx`
- Create: `web/src/components/KeyEditor/SlotTabs.jsx`
- Create: `web/src/components/KeyEditor/SlotEditor/index.jsx`
- Create: `web/src/components/KeyEditor/SlotEditor/TextInput.jsx`
- Create: `web/src/components/KeyEditor/SlotEditor/IconPicker.jsx`
- Create: `web/src/components/KeyEditor/KeyEditor.module.css`

- [ ] **Step 1: Create `web/src/components/KeyEditor/KeyEditor.module.css`**

```css
.editor { display: flex; flex-direction: column; height: 100%; padding: 12px; gap: 10px; }

.header { display: flex; align-items: center; gap: 8px; }
.backBtn { background: none; border: none; color: #4a9eff; cursor: pointer; font-size: 16px; padding: 2px 6px; }
.keyLabel { font-size: 13px; font-weight: bold; color: #fff; }
.rowCol { font-size: 10px; color: #666; }

/* Slot diagram — 3×3 grid */
.diagram { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
.diagCell {
  background: #1a1a2e; border: 1px solid #2a3a5a; border-radius: 4px;
  aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 9px; color: #666; transition: all 0.1s;
}
.diagCell:hover { border-color: #4a9eff; }
.diagCellActive { background: #1e2a4e; border-color: #3a6aaa; color: #ccc; }
.diagCellFocused { border-color: #4a9eff !important; background: #1a3a6e !important; color: #fff !important; }
.diagCenterCell { font-size: 14px; }

/* Slot tabs */
.tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.tab {
  background: #1a1a2e; border: 1px solid #2a3a5a; border-radius: 4px;
  padding: 4px 10px; font-size: 11px; color: #888; cursor: pointer;
}
.tabActive { border-color: #4a9eff; background: #1a2a4e; color: #fff; }

/* Slot editor */
.slotEditor { display: flex; flex-direction: column; gap: 8px; flex: 1; }
.row { display: flex; gap: 6px; align-items: center; }
.label { font-size: 10px; color: #666; min-width: 60px; }
.typeToggle { display: flex; gap: 4px; }
.typeBtn {
  background: #1a1a2e; border: 1px solid #2a3a5a; border-radius: 3px;
  padding: 3px 8px; font-size: 10px; color: #888; cursor: pointer;
}
.typeBtnActive { border-color: #4a9eff; background: #1a2a4e; color: #fff; }

.textInput {
  width: 100%; background: #0f1525; border: 1px solid #3a4a7a;
  border-radius: 4px; padding: 6px 8px; color: #fff; font-size: 13px;
  font-family: 'Hack Nerd Font Mono', monospace; outline: none;
}
.textInput:focus { border-color: #4a9eff; }

.iconGrid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; }
.iconCell {
  background: #1a1a2e; border: 1px solid #2a3a5a; border-radius: 3px;
  aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 14px; font-family: 'Hack Nerd Font Mono', monospace;
}
.iconCell:hover, .iconCellSelected { border-color: #4a9eff; background: #1a2a4e; }

.activeToggle { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #888; }
.activeToggle input { cursor: pointer; }
```

- [ ] **Step 2: Create `web/src/components/KeyEditor/SlotEditor/TextInput.jsx`**

```jsx
export default function TextInput({ value, onChange, styles }) {
  return (
    <input
      className={styles.textInput}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Label text..."
      spellCheck={false}
    />
  )
}
```

- [ ] **Step 3: Create `web/src/components/KeyEditor/SlotEditor/IconPicker.jsx`**

```jsx
export default function IconPicker({ icons, value, onChange, styles }) {
  const entries = Object.entries(icons)
  return (
    <div className={styles.iconGrid}>
      {entries.map(([key, char]) => (
        <div
          key={key}
          className={`${styles.iconCell} ${value === key ? styles.iconCellSelected : ''}`}
          title={key}
          onClick={() => onChange(key)}
        >
          {char}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create `web/src/components/KeyEditor/SlotEditor/index.jsx`**

```jsx
import { useKeyboardStore } from '../../../store.js'
import TextInput from './TextInput.jsx'
import IconPicker from './IconPicker.jsx'
import styles from '../KeyEditor.module.css'

export default function SlotEditor({ row, col, slotId }) {
  const slot   = useKeyboardStore(s => s.keyOverrides[`${row},${col}`]?.slots[slotId])
  const config = useKeyboardStore(s => s.config)
  const setSlotOverride = useKeyboardStore(s => s.setSlotOverride)

  if (!slot) return null

  function update(patch) {
    setSlotOverride(row, col, slotId, { ...slot, ...patch })
  }

  return (
    <div className={styles.slotEditor}>
      <div className={styles.row}>
        <span className={styles.label}>Active</span>
        <label className={styles.activeToggle}>
          <input
            type="checkbox"
            checked={slot.active}
            onChange={e => update({ active: e.target.checked })}
          />
          {slot.active ? 'On' : 'Off'}
        </label>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Type</span>
        <div className={styles.typeToggle}>
          {['text', 'icon'].map(t => (
            <button
              key={t}
              className={`${styles.typeBtn} ${slot.type === t ? styles.typeBtnActive : ''}`}
              onClick={() => update({ type: t, value: '' })}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {slot.type === 'text' && (
        <TextInput
          value={slot.value}
          onChange={val => update({ value: val, active: val !== '' })}
          styles={styles}
        />
      )}

      {slot.type === 'icon' && (
        <IconPicker
          icons={config.icons}
          value={slot.value}
          onChange={key => update({ value: key, active: true })}
          styles={styles}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create `web/src/components/KeyEditor/SlotDiagram.jsx`**

```jsx
import styles from './KeyEditor.module.css'

const DIAGRAM_LAYOUT = [
  ['topLeft', 'topCenter', 'topRight'],
  [null,      'center',    null      ],
  ['botLeft', 'botCenter', 'botRight'],
]

const SLOT_LABELS = {
  topLeft: 'TL', topCenter: 'TC', topRight: 'TR',
  center: '●',
  botLeft: 'BL', botCenter: 'BC', botRight: 'BR',
}

export default function SlotDiagram({ slots, focusedSlot, onFocus }) {
  return (
    <div className={styles.diagram}>
      {DIAGRAM_LAYOUT.flat().map((slotId, i) => {
        if (!slotId) return <div key={i} />
        const slot = slots?.[slotId]
        const isActive = slot?.active
        const isFocused = focusedSlot === slotId
        const isCenter = slotId === 'center'
        return (
          <div
            key={slotId}
            className={[
              styles.diagCell,
              isActive  ? styles.diagCellActive  : '',
              isFocused ? styles.diagCellFocused : '',
              isCenter  ? styles.diagCenterCell  : '',
            ].join(' ')}
            onClick={() => onFocus(slotId)}
            title={slotId}
          >
            {slot?.type === 'icon' && slot?.value
              ? '★'
              : (slot?.value || SLOT_LABELS[slotId])}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 6: Create `web/src/components/KeyEditor/SlotTabs.jsx`**

```jsx
import styles from './KeyEditor.module.css'

const ALL_SLOTS = ['topLeft', 'topCenter', 'topRight', 'center', 'botLeft', 'botCenter', 'botRight']

export default function SlotTabs({ slots, focusedSlot, onFocus }) {
  const activeSlots = ALL_SLOTS.filter(s => slots?.[s]?.active || s === 'center')
  const inactiveSlots = ALL_SLOTS.filter(s => !slots?.[s]?.active && s !== 'center')

  return (
    <div className={styles.tabs}>
      {activeSlots.map(slotId => (
        <div
          key={slotId}
          className={`${styles.tab} ${focusedSlot === slotId ? styles.tabActive : ''}`}
          onClick={() => onFocus(slotId)}
        >
          {slotId}
        </div>
      ))}
      {inactiveSlots.length > 0 && (
        <div
          className={styles.tab}
          onClick={() => onFocus(inactiveSlots[0])}
          title="Add slot"
        >
          +
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Create `web/src/components/KeyEditor/index.jsx`**

```jsx
import { useState } from 'react'
import { useKeyboardStore } from '../../store.js'
import SlotDiagram from './SlotDiagram.jsx'
import SlotTabs from './SlotTabs.jsx'
import SlotEditor from './SlotEditor/index.jsx'
import styles from './KeyEditor.module.css'

export default function KeyEditor() {
  const selectedKey    = useKeyboardStore(s => s.selectedKey)
  const keymapData     = useKeyboardStore(s => s.keymapData)
  const keyOverrides   = useKeyboardStore(s => s.keyOverrides)
  const clearSelection = useKeyboardStore(s => s.clearSelection)

  const [focusedSlot, setFocusedSlot] = useState('center')

  if (!selectedKey || !keymapData) return null

  const { row, col } = selectedKey
  const key = keymapData.keys.find(k => k.row === row && k.col === col)
  if (!key) return null

  const override = keyOverrides[`${row},${col}`]
  const primaryLabel = override?.slots?.center?.value || key.layers[keymapData.layerNames[0]] || ''

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={clearSelection}>←</button>
        <span className={styles.keyLabel}>{primaryLabel || `Key`}</span>
        <span className={styles.rowCol}>r{row} c{col}</span>
      </div>

      <SlotDiagram
        slots={override?.slots}
        focusedSlot={focusedSlot}
        onFocus={setFocusedSlot}
      />

      <SlotTabs
        slots={override?.slots}
        focusedSlot={focusedSlot}
        onFocus={setFocusedSlot}
      />

      <SlotEditor row={row} col={col} slotId={focusedSlot} />
    </div>
  )
}
```

- [ ] **Step 8: Wire KeyEditor into App.jsx**

Update the left panel in `App.jsx`:

```jsx
import KeyEditor from './components/KeyEditor/index.jsx'
// ...
const selectedKey = useKeyboardStore(s => s.selectedKey)
// In left panel:
{keymapData
  ? (selectedKey ? <KeyEditor /> : <KeyGrid />)
  : <p ...>Load a .keymap file...</p>
}
```

- [ ] **Step 9: Verify in browser** — click a key → editor appears. Edit center text → grid updates.

- [ ] **Step 10: Commit**

```bash
git add web/src/components/KeyEditor/
git commit -m "feat: KeyEditor with slot diagram, tabs, and text/icon input"
```

---

## Task 9: export3mf.js

Custom 3MF writer. Produces a ZIP-based 3MF file with multi-material support using the Materials and Properties extension.

**Files:**
- Create: `web/src/lib/export3mf.js`
- Create: `web/src/__tests__/export3mf.test.js`

- [ ] **Step 1: Write failing tests**

`web/src/__tests__/export3mf.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { buildModelXml, COLOR_MAP } from '../lib/export3mf.js'
import * as THREE from 'three'

describe('buildModelXml', () => {
  it('returns a string containing the 3MF core namespace', () => {
    const xml = buildModelXml([])
    expect(xml).toContain('http://schemas.microsoft.com/3dmanufacturing/core/2015/02')
  })

  it('contains the materials namespace', () => {
    const xml = buildModelXml([])
    expect(xml).toContain('http://schemas.microsoft.com/3dmanufacturing/material/2015/02')
  })

  it('contains a colorgroup with 3 colors', () => {
    const xml = buildModelXml([])
    expect(xml.match(/<m:color/g)?.length).toBe(3)
  })

  it('serializes a box mesh as vertices and triangles', () => {
    const geo = new THREE.BoxGeometry(1, 1, 1)
    const mat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.updateMatrixWorld()
    const xml = buildModelXml([mesh])
    expect(xml).toContain('<vertices>')
    expect(xml).toContain('<triangle ')
  })

  it('assigns correct pindex for white material', () => {
    const geo = new THREE.BoxGeometry(1, 1, 1)
    // White is color index 1 in COLOR_MAP
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(COLOR_MAP[1]) })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.updateMatrixWorld()
    const xml = buildModelXml([mesh])
    expect(xml).toContain('pindex="1"')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd web && npm test -- export3mf
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `web/src/lib/export3mf.js`**

```js
import { zipSync, strToU8 } from 'fflate'
import * as THREE from 'three'

// The three material colors in order (indices 0, 1, 2)
export const COLOR_MAP = ['#1a1a1a', '#e0e0e0', '#888888']

const CORE_NS     = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'
const MATERIAL_NS = 'http://schemas.microsoft.com/3dmanufacturing/material/2015/02'

/**
 * Find the closest COLOR_MAP index for a material's hex color.
 */
function colorIndex(material) {
  if (!material?.color) return 0
  const hex = '#' + material.color.getHexString()
  // Find nearest by euclidean distance in hex space
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < COLOR_MAP.length; i++) {
    const ref = new THREE.Color(COLOR_MAP[i])
    const d = material.color.distanceTo(ref)
    if (d < bestDist) { bestDist = d; best = i }
  }
  return best
}

/**
 * Serialize a THREE.Mesh's geometry (after applying matrix world) to
 * 3MF <vertices> and <triangles> XML strings.
 */
function meshToXml(mesh, objectId, pindex) {
  // Work on a clone so we don't mutate the original
  const geo = mesh.geometry.clone()
  geo.applyMatrix4(mesh.matrixWorld)
  // BoxGeometry and all generated geometries are indexed; non-indexed geometries
  // are handled by the fallback triangle loop in meshToXml_indexed.
  return meshToXml_indexed(geo, objectId, pindex)
}

function meshToXml_indexed(geo, objectId, pindex) {
  const pos = geo.attributes.position
  const idx = geo.index?.array

  let verts = ''
  for (let i = 0; i < pos.count; i++) {
    verts += `<vertex x="${pos.getX(i).toFixed(4)}" y="${pos.getY(i).toFixed(4)}" z="${pos.getZ(i).toFixed(4)}"/>`
  }

  let tris = ''
  if (idx) {
    for (let i = 0; i < idx.length; i += 3) {
      tris += `<triangle v1="${idx[i]}" v2="${idx[i+1]}" v3="${idx[i+2]}"/>`
    }
  } else {
    const n = pos.count
    for (let i = 0; i < n; i += 3) {
      tris += `<triangle v1="${i}" v2="${i+1}" v3="${i+2}"/>`
    }
  }

  return `<object id="${objectId}" type="model" pid="1" pindex="${pindex}">` +
    `<mesh><vertices>${verts}</vertices><triangles>${tris}</triangles></mesh>` +
    `</object>`
}

/**
 * Build the 3dmodel.model XML string from an array of THREE.Mesh objects.
 */
export function buildModelXml(meshes) {
  const colorGroup = `<m:colorgroup id="1">` +
    COLOR_MAP.map(c => `<m:color color="${c}"/>`).join('') +
    `</m:colorgroup>`

  let objectsXml = ''
  let buildXml   = ''
  let id = 2

  for (const mesh of meshes) {
    if (!mesh.geometry || !mesh.visible) continue
    const pidx = colorIndex(mesh.material)
    objectsXml += meshToXml(mesh, id, pidx)
    buildXml   += `<item objectid="${id}"/>`
    id++
  }

  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<model xmlns="${CORE_NS}" xmlns:m="${MATERIAL_NS}" unit="millimeter">` +
    `<resources>${colorGroup}${objectsXml}</resources>` +
    `<build>${buildXml}</build>` +
    `</model>`
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>` +
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>` +
  `</Types>`

const RELS = `<?xml version="1.0" encoding="UTF-8"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Target="/3D/3dmodel.model" Id="rel0" ` +
  `Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>` +
  `</Relationships>`

/**
 * Collect all meshes from a Three.js scene, build the 3MF, and return a Blob.
 */
export function export3mf(scene) {
  const meshes = []
  scene.traverse(obj => {
    if (obj.isMesh) meshes.push(obj)
  })

  const modelXml = buildModelXml(meshes)

  const zipped = zipSync({
    '[Content_Types].xml':  strToU8(CONTENT_TYPES),
    '_rels/.rels':          strToU8(RELS),
    '3D/3dmodel.model':     strToU8(modelXml),
  })

  return new Blob([zipped], {
    type: 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
  })
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 4: Run tests**

```bash
cd web && npm test -- export3mf
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/export3mf.js web/src/__tests__/export3mf.test.js
git commit -m "feat: custom 3MF exporter with fflate and Materials extension"
```

---

## Task 10: buildExportKeymapData + SCAD export

**Files:**
- Create: `web/src/lib/buildExportKeymapData.js`
- Create: `web/src/__tests__/buildExportKeymapData.test.js`

- [ ] **Step 1: Write failing tests**

`web/src/__tests__/buildExportKeymapData.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { buildExportKeymapData } from '../lib/buildExportKeymapData.js'

const km = {
  layerNames: ['Base', 'Sym', 'Nav', 'Fn'],
  grid: { rows: 1, cols: 1 },
  keys: [{ row: 0, col: 0, empty: false, layers: { Base:'Q', Sym:'!', Nav:'↑', Fn:'' } }],
}

function makeOverride(slots) {
  const allSlots = ['topLeft','topCenter','topRight','center','botLeft','botCenter','botRight']
  const full = {}
  for (const s of allSlots) full[s] = { active: false, type: 'text', value: '', font: null }
  return { slots: { ...full, ...slots }, font: null }
}

describe('buildExportKeymapData', () => {
  it('returns layerNames as [_p, _tl, _tr, _bt]', () => {
    const result = buildExportKeymapData(km, {})
    expect(result.layerNames).toEqual(['_p', '_tl', '_tr', '_bt'])
  })

  it('maps center slot to _p', () => {
    const overrides = {
      '0,0': makeOverride({ center: { active: true, type: 'text', value: 'Z', font: null } }),
    }
    const result = buildExportKeymapData(km, overrides)
    expect(result.keys[0].layers._p).toBe('Z')
  })

  it('maps icon slot to $varname', () => {
    const overrides = {
      '0,0': makeOverride({
        center:    { active: true,  type: 'text', value: 'Q',     font: null },
        botCenter: { active: true,  type: 'icon', value: 'ic_bt', font: null },
      }),
    }
    const result = buildExportKeymapData(km, overrides)
    expect(result.keys[0].layers._bt).toBe('$ic_bt')
  })

  it('inactive slot produces empty string', () => {
    const overrides = {
      '0,0': makeOverride({
        center:   { active: true,  type: 'text', value: 'Q', font: null },
        topLeft:  { active: false, type: 'text', value: 'X', font: null },
      }),
    }
    const result = buildExportKeymapData(km, overrides)
    expect(result.keys[0].layers._tl).toBe('')
  })

  it('empty keys produce all-empty layers', () => {
    const emptyKm = {
      layerNames: ['Base'],
      grid: { rows: 1, cols: 1 },
      keys: [{ row: 0, col: 0, empty: true, layers: { Base: '' } }],
    }
    const result = buildExportKeymapData(emptyKm, {})
    const layers = result.keys[0].layers
    expect(Object.values(layers).every(v => v === '')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd web && npm test -- buildExportKeymapData
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `web/src/lib/buildExportKeymapData.js`**

```js
const LAYER_NAMES = ['_p', '_tl', '_tr', '_bt']
const SLOT_TO_LAYER = { center: '_p', topLeft: '_tl', topRight: '_tr', botCenter: '_bt' }

function resolveSlotForScad(slot) {
  if (!slot || !slot.active) return ''
  if (slot.type === 'icon' && slot.value) return `$${slot.value}`
  return slot.value || ''
}

/**
 * Translate 7-slot keyOverrides back to a keymapData-shaped object
 * with 4 synthetic layer names compatible with buildScad().
 */
export function buildExportKeymapData(keymapData, keyOverrides) {
  const keys = keymapData.keys.map(key => {
    const k = `${key.row},${key.col}`
    const override = keyOverrides[k]

    const layers = {}
    for (const layerName of LAYER_NAMES) {
      if (key.empty || !override) {
        layers[layerName] = ''
      } else {
        const slotId = Object.keys(SLOT_TO_LAYER).find(s => SLOT_TO_LAYER[s] === layerName)
        layers[layerName] = resolveSlotForScad(override.slots[slotId])
      }
    }

    return { row: key.row, col: key.col, empty: key.empty, layers }
  })

  return {
    layerNames: LAYER_NAMES,
    grid: keymapData.grid,
    keys,
  }
}
```

- [ ] **Step 4: Run tests**

```bash
cd web && npm test -- buildExportKeymapData
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/buildExportKeymapData.js web/src/__tests__/buildExportKeymapData.test.js
git commit -m "feat: buildExportKeymapData — translate 7-slot model to SCAD 4-arg format"
```

---

## Task 11: Three.js KeyboardScene + KeyCapMesh

The 3D preview. Uses `@react-three/fiber`.

**Files:**
- Create: `web/src/components/KeyboardScene/CameraRig.jsx`
- Create: `web/src/components/KeyboardScene/KeyCapMesh.jsx`
- Create: `web/src/components/KeyboardScene/useCanvasTexture.js`
- Create: `web/src/components/KeyboardScene/ExportOrchestrator.jsx`
- Create: `web/src/components/KeyboardScene/index.jsx`

- [ ] **Step 1: Obtain Hack Nerd Font woff2**

Download `HackNerdFontMono-Regular.woff2` from https://github.com/ryanoasis/nerd-fonts/releases and place it at:

```
web/public/fonts/HackNerdFontMono-Regular.woff2
```

This file is required for icon glyphs in the texture. Add it to `.gitignore` if it's large (4–6MB is typical), or commit if acceptable.

- [ ] **Step 2: Add font-loading gate to App.jsx**

```jsx
import { useState, useEffect } from 'react'
import '@fontsource/fira-code'
import '@fontsource/staatliches'

export default function App() {
  const [fontsReady, setFontsReady] = useState(false)

  useEffect(() => {
    const nerdFont = new FontFace(
      'Hack Nerd Font Mono',
      'url(/fonts/HackNerdFontMono-Regular.woff2)'
    )
    nerdFont.load()
      .then(f => { document.fonts.add(f); setFontsReady(true) })
      .catch(() => setFontsReady(true))  // degrade gracefully
  }, [])

  // ... rest of App, pass fontsReady to KeyboardScene
}
```

- [ ] **Step 3: Create `web/src/components/KeyboardScene/CameraRig.jsx`**

```jsx
import { useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

const DEFAULT_POS = [60, 90, 60]

export default function CameraRig() {
  const controlsRef = useRef()
  const { camera } = useThree()

  function resetCamera() {
    camera.position.set(...DEFAULT_POS)
    camera.lookAt(0, 0, 0)
    controlsRef.current?.reset()
  }

  return (
    <>
      <OrbitControls ref={controlsRef} makeDefault />
      {/* Reset button is rendered as HTML overlay via a portal — see KeyboardScene/index.jsx */}
    </>
  )
}

export { DEFAULT_POS }
```

- [ ] **Step 4: Create `web/src/components/KeyboardScene/useCanvasTexture.js`**

```js
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const SIZE = 256

// Slot positions on the texture canvas (0-256 space)
const SLOT_POS = {
  topLeft:   { x: 30,  y: 30,  fontSize: 22, align: 'left'   },
  topCenter: { x: 128, y: 30,  fontSize: 22, align: 'center' },
  topRight:  { x: 226, y: 30,  fontSize: 22, align: 'right'  },
  center:    { x: 128, y: 148, fontSize: 40, align: 'center' },
  botLeft:   { x: 30,  y: 228, fontSize: 22, align: 'left'   },
  botCenter: { x: 128, y: 228, fontSize: 22, align: 'center' },
  botRight:  { x: 226, y: 228, fontSize: 22, align: 'right'  },
}

/**
 * Returns a THREE.CanvasTexture that redraws whenever `slots` or `icons` change.
 */
export function useCanvasTexture(slots, icons, font) {
  const canvasRef = useRef(document.createElement('canvas'))
  const textureRef = useRef(null)

  if (!textureRef.current) {
    canvasRef.current.width  = SIZE
    canvasRef.current.height = SIZE
    textureRef.current = new THREE.CanvasTexture(canvasRef.current)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const texture = textureRef.current

    ctx.clearRect(0, 0, SIZE, SIZE)

    for (const [slotId, pos] of Object.entries(SLOT_POS)) {
      const slot = slots?.[slotId]
      if (!slot?.active || !slot.value) continue

      let label = slot.value
      if (slot.type === 'icon') {
        label = icons?.[slot.value] || '?'
      }

      const family = font || 'Hack Nerd Font Mono'
      ctx.font      = `${pos.fontSize}px "${family}"`
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = pos.align
      ctx.textBaseline = 'middle'
      ctx.fillText(label, pos.x, pos.y)
    }

    texture.needsUpdate = true
  }, [slots, icons, font])

  return textureRef.current
}
```

- [ ] **Step 5: Create `web/src/components/KeyboardScene/KeyCapMesh.jsx`**

```jsx
import { useMemo } from 'react'
import * as THREE from 'three'
import { useCanvasTexture } from './useCanvasTexture.js'
import { useKeyboardStore } from '../../store.js'

const KEY_W = 16
const KEY_H = 16
const PLATE_H = 0.8
const GAP = 1
const HALVE_GAP = 20
const LEGEND_H = 0.42   // sits just above base top face
const LEGEND_DEPTH = 0.02

// Which slots use "legend" (white) material vs "accent" (gray)
const LEGEND_SLOTS  = new Set(['center', 'topLeft', 'topCenter', 'topRight'])
const ACCENT_SLOTS  = new Set(['botLeft', 'botCenter', 'botRight'])

const SLOT_OFFSET = {
  topLeft:   { x: -4.5, z: -4.5, w: 5, h: 5 },
  topCenter: { x:    0, z: -4.5, w: 5, h: 5 },
  topRight:  { x:  4.5, z: -4.5, w: 5, h: 5 },
  center:    { x:    0, z:    0, w: 9, h: 9 },
  botLeft:   { x: -4.5, z:  4.5, w: 5, h: 5 },
  botCenter: { x:    0, z:  4.5, w: 5, h: 5 },
  botRight:  { x:  4.5, z:  4.5, w: 5, h: 5 },
}

function keyX(col) {
  const x = col * (KEY_W + GAP)
  return col >= 6 ? x + HALVE_GAP : x
}

function keyZ(row) {
  return row * (KEY_H + GAP)
}

export default function KeyCapMesh({ keyEntry }) {
  const keyOverrides = useKeyboardStore(s => s.keyOverrides)
  const config       = useKeyboardStore(s => s.config)

  const k        = `${keyEntry.row},${keyEntry.col}`
  const override = keyOverrides[k]
  const slots    = override?.slots
  const font     = override?.font || null

  const texture = useCanvasTexture(slots, config.icons, font)

  // Build materials for the base box: 6 faces, top face gets the texture
  const baseMaterials = useMemo(() => [
    new THREE.MeshStandardMaterial({ color: '#1a1a1a' }),  // +x
    new THREE.MeshStandardMaterial({ color: '#1a1a1a' }),  // -x
    new THREE.MeshStandardMaterial({ color: '#1a1a1a', map: texture }),  // +y (top)
    new THREE.MeshStandardMaterial({ color: '#1a1a1a' }),  // -y
    new THREE.MeshStandardMaterial({ color: '#1a1a1a' }),  // +z
    new THREE.MeshStandardMaterial({ color: '#1a1a1a' }),  // -z
  ], [texture])

  const x = keyX(keyEntry.col)
  const z = keyZ(keyEntry.row)

  const activeSlots = Object.entries(SLOT_OFFSET).filter(([sid]) => slots?.[sid]?.active)

  return (
    <group position={[x, 0, z]}>
      {/* Base plate */}
      <mesh material={baseMaterials}>
        <boxGeometry args={[KEY_W, PLATE_H, KEY_H]} />
      </mesh>

      {/* Legend overlays (white — top/center) */}
      {activeSlots
        .filter(([sid]) => LEGEND_SLOTS.has(sid))
        .map(([sid]) => {
          const off = SLOT_OFFSET[sid]
          return (
            <mesh
              key={sid}
              position={[off.x, LEGEND_H, off.z]}
              material={new THREE.MeshStandardMaterial({ color: '#e0e0e0' })}
            >
              <boxGeometry args={[off.w, LEGEND_DEPTH, off.h]} />
            </mesh>
          )
        })
      }

      {/* Accent overlays (gray — bottom) */}
      {activeSlots
        .filter(([sid]) => ACCENT_SLOTS.has(sid))
        .map(([sid]) => {
          const off = SLOT_OFFSET[sid]
          return (
            <mesh
              key={sid}
              position={[off.x, LEGEND_H, off.z]}
              material={new THREE.MeshStandardMaterial({ color: '#888888' })}
            >
              <boxGeometry args={[off.w, LEGEND_DEPTH, off.h]} />
            </mesh>
          )
        })
      }
    </group>
  )
}
```

- [ ] **Step 6: Create `web/src/components/KeyboardScene/ExportOrchestrator.jsx`**

```jsx
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useKeyboardStore } from '../../store.js'
import { export3mf, downloadBlob } from '../../lib/export3mf.js'
import { buildExportKeymapData } from '../../lib/buildExportKeymapData.js'
import { buildScad } from '../../lib/generate.js'

export default function ExportOrchestrator() {
  const { scene }         = useThree()
  const pendingExport     = useKeyboardStore(s => s.pendingExport)
  const clearPendingExport = useKeyboardStore(s => s.clearPendingExport)
  const keymapData        = useKeyboardStore(s => s.keymapData)
  const keyOverrides      = useKeyboardStore(s => s.keyOverrides)
  const config            = useKeyboardStore(s => s.config)

  useEffect(() => {
    if (!pendingExport) return

    try {
      if (pendingExport === '3mf') {
        const blob = export3mf(scene)
        downloadBlob(blob, 'keycaps.3mf')
      } else if (pendingExport === 'scad') {
        const exportData = buildExportKeymapData(keymapData, keyOverrides)
        const scad = buildScad(exportData, config)
        downloadBlob(
          new Blob([scad], { type: 'text/plain' }),
          'output.scad'
        )
      }
    } catch (err) {
      console.error('Export failed:', err)
      alert(`Export failed: ${err.message}`)
    }

    clearPendingExport()
  }, [pendingExport])

  return null
}
```

- [ ] **Step 7: Create `web/src/components/KeyboardScene/index.jsx`**

```jsx
import { Canvas } from '@react-three/fiber'
import { useKeyboardStore } from '../../store.js'
import CameraRig from './CameraRig.jsx'
import KeyCapMesh from './KeyCapMesh.jsx'
import ExportOrchestrator from './ExportOrchestrator.jsx'

export default function KeyboardScene({ fontsReady }) {
  const keymapData = useKeyboardStore(s => s.keymapData)

  if (!fontsReady) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#444' }}>Loading fonts…</div>
  }

  return (
    <Canvas
      camera={{ position: [60, 90, 60], fov: 50 }}
      style={{ background: '#080810' }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[20, 40, 20]} intensity={1.2} />

      <CameraRig />
      <ExportOrchestrator />

      {keymapData?.keys
        .filter(k => !k.empty)
        .map(k => (
          <KeyCapMesh key={`${k.row},${k.col}`} keyEntry={k} />
        ))
      }
    </Canvas>
  )
}
```

- [ ] **Step 8: Update App.jsx to include KeyboardScene**

```jsx
import KeyboardScene from './components/KeyboardScene/index.jsx'

// In right panel:
<div className="right-panel">
  <KeyboardScene fontsReady={fontsReady} />
</div>
```

- [ ] **Step 9: Verify in browser**
  - Load `olik.keymap`
  - Keys should appear as 3D boxes in the right panel
  - Orbit with mouse drag
  - Click a key → edit its center text → texture on top face updates live
  - Click "↓ 3MF" → file downloads

- [ ] **Step 10: Commit**

```bash
git add web/src/components/KeyboardScene/ web/src/App.jsx
git commit -m "feat: Three.js KeyboardScene with live canvas texture and export"
```

---

## Task 12: Run all tests + final smoke test

- [ ] **Step 1: Run the full test suite**

```bash
cd web && npm test
```

Expected: all tests PASS (slotDefaults, store, parse, export3mf, buildExportKeymapData).

- [ ] **Step 2: Run the existing CLI tests** (must not have regressed)

```bash
cd /path/to/zmk-to-openscad && npm test
```

Expected: all passing (they test `src/`, not `web/src/lib/`).

- [ ] **Step 3: Manual smoke test**

1. `npm run dev` in `web/`
2. Load `olik.keymap` → grid populates
3. Click any key → editor opens, slot diagram shows
4. Edit center text → 3D texture updates live
5. Change a slot to icon type → pick bluetooth icon → texture updates
6. Click "↓ 3MF" → `keycaps.3mf` downloads
7. Import `.3mf` into PrusaSlicer → 3 color groups visible
8. Click "↓ SCAD" → `output.scad` downloads, opens in OpenSCAD
9. Click "Start Over" → confirm → grid clears
10. Reload page → state persists from localStorage (if not cleared)

- [ ] **Step 4: Build for production**

```bash
cd web && npm run build
```

Expected: `web/dist/` created with no build errors.

- [ ] **Step 5: Final commit**

```bash
git add web/
git commit -m "feat: complete frontend keycap customizer

- Vite + React + R3F + Zustand
- Browser parse, 7-slot editor, live 3D preview
- Custom 3MF exporter (fflate, Materials extension)
- SCAD export
- localStorage persistence"
```
