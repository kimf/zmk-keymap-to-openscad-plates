# zmk-to-openscad

Generate a 3D-printable key cap plate directly from your ZMK keymap file.

Reads a `.keymap` file (ZMK Device Tree format), resolves every binding to a human-readable label, and outputs an OpenSCAD file containing a full plate of key caps — one per physical key, all legends included — ready for printing with the **filament colour-change technique**.

---

## What it produces

A single flat plate of key caps. Each cap is 16×16 mm with:

- **Center** — the base layer label, large and bold
- **Top-left corner** — Symbols layer label (small)
- **Top-right corner** — Numbers layer label (small)
- **Bottom-right corner** — Media layer label (small)

The legends use different heights so a single mid-print filament swap makes the primary label pop in the contrast colour while corner labels appear faded — no painting required.

```
┌─────────────┐
│ sym     num │
│             │
│      A      │
│         med │
└─────────────┘
```

---

## How the colour layering works

All legends start printing at the same height (`plate_h = 0.40 mm`). Their extrusion heights differ:

| Legend | Height | Effect after swap |
|---|---|---|
| Corner labels | `1 × 0.08 mm = 0.08 mm` | ~50% printed before swap → faded (mix of both colours) |
| Primary label | `4 × 0.08 mm = 0.32 mm` | ~13% printed before swap → predominantly contrast colour → bright |

The generated file prints the recommended swap height as a comment at the top:

```
// Filament swap at: 0.44mm  (plate_h + secondary_layers * layer_h / 2)
```

Set a **"pause at layer"** (or "colour change") event at that height in your slicer. Swap to your contrast filament, resume — done.

---

## Pipeline

```
olik.keymap  →  parse.js  →  keymap.json  →  generate.js  →  output.scad
                                                  ↑
                                             config.json
```

Two independent stages with a JSON contract between them, making it straightforward to add a web frontend later that edits `keymap.json` and calls the generator directly.

---

## Usage

```bash
# Stage 1: parse the keymap
node src/parse.js olik.keymap        # → keymap.json

# Stage 2: generate OpenSCAD
node src/generate.js                 # → output.scad  (reads keymap.json + config.json)

# Or chain them
node src/parse.js olik.keymap && node src/generate.js
```

Then open `output.scad` in [OpenSCAD](https://openscad.org), press **F6** to render, and export as STL.

---

## Configuration

Edit `config.json` to tune the output:

```jsonc
{
  "print": {
    "layerHeight": 0.08        // your printer's layer height in mm
  },
  "key": {
    "width": 16,               // key cap width in mm
    "height": 16,              // key cap height in mm
    "radius": 2,               // corner radius in mm
    "plateHeight": 0.40,       // base plate thickness in mm
    "gap": 1                   // gap between caps in mm
  },
  "legends": {
    "primaryLayers": 4,        // base label height = primaryLayers × layerHeight
    "secondaryLayers": 1,      // corner label height = secondaryLayers × layerHeight
    "primaryFontSize": 6,      // pt
    "secondaryFontSize": 2.5,  // pt
    "font": "Liberation Sans:style=Bold"
  },
  "labelOverrides": {
    // Map any ZMK key name to a custom display string
    "LEFT_ALT": "ALT",
    "LEFT_GUI": "CMD",
    "BACKSPACE": "⌫",
    "UP": "↑"
    // ...
  }
}
```

`primaryLayers` and `secondaryLayers` are in layer counts, not mm — adjusting them automatically recalculates the swap height.

---

## Binding resolution

The parser understands the full range of ZMK binding types:

| Binding | Label shown |
|---|---|
| `&kp KEY` | Key label (via `sv-keys.js`, `labelOverrides`, or lowercased key name) |
| `&kp LS(KEY)` / `&kp LA(KEY)` | Inner key label (modifier wrappers stripped) |
| `&mt MOD TAP` | Tap action label |
| `&lt LAYER TAP` | Tap action label |
| `&sk KEY` | Key label (sticky key) |
| `&trans` / `&none` | *(blank)* |
| `&caps_word` | `CAPS` |
| `&bt BT_SEL N` | `BT0`–`BT4` |
| `&bt BT_CLR` | `BT-CLR` |
| `&bt BT_PRV` / `BT_NXT` | `BT◀` / `BT▶` |
| Named tap-dance | First binding's label |
| Named mod-morph | First (unshifted) binding's label |
| Named macro | From `/* Outputs: "..." */` comment, or node name |
| `&msc` / `&inc_dec_kp` | *(blank — encoder only)* |

Swedish locale constants (`SV_*` from `keys_sv.h`) are mapped to their display symbols in `src/sv-keys.js`.

---

## Grid layout

The parser uses a hardcoded layout map for a split ortholinear keyboard (5 rows, 12 columns):

| Row | Contents |
|---|---|
| 0 | ESC + 10 alpha keys + ⌫ |
| 1 | TAB + 10 alpha keys + Ö/Ä |
| 2 | *(gap)* + Z–B + N–- |
| 3 | Shift/Ctrl/' + *(gap)* + ←↓→ |
| 4 | *(gap)* + Alt/Cmd/Spc + *(gap)* + Spc/Ent/Ctrl + *(gap)* |

Empty cells are preserved in `keymap.json` (`"empty": true`) so the grid stays rectangular, but the generator skips them.

---

## File structure

```
zmk-to-openscad/
├── olik.keymap          ← ZMK keymap input
├── config.json          ← user settings
├── keymap.json          ← generated intermediate (gitignored)
├── output.scad          ← generated output (gitignored)
└── src/
    ├── parse.js         ← stage 1: .keymap → keymap.json
    ├── generate.js      ← stage 2: keymap.json → output.scad
    ├── layout-map.js    ← grid layout definition
    ├── sv-keys.js       ← Swedish locale key → display symbol map
    └── zmk-bindings.js  ← ZMK binding resolver
```

---

## Requirements

- [Node.js](https://nodejs.org) v18+ (uses built-in `node:test`, no external dependencies)
- [OpenSCAD](https://openscad.org) to render and export the generated file

---

## Running tests

```bash
npm test
```

63 tests covering binding resolution, layout mapping, parsing, and SCAD generation.

---

## Deferred / future

- **SVG icon overrides** — `labelOverrides` will accept `.svg` file paths; the generator will use `import()` + `linear_extrude()` instead of `text()`
- **Web frontend** — edit `keymap.json` visually and call `generate.js` via a small dev server
