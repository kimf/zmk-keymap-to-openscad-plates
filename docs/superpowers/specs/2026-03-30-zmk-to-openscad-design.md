# ZMK to OpenSCAD Key Cap Generator — Design Spec

**Date:** 2026-03-30
**Status:** Approved

## Overview

A two-stage Node.js pipeline that reads a ZMK keymap file and generates an OpenSCAD file containing a full plate of key caps, ready for 3D printing with the filament colour-layering technique.

---

## Architecture

### Pipeline

```
olik.keymap  →  parse.js  →  keymap.json  →  generate.js  →  output.scad
                                  ↑
                             config.json
```

Two independent stages with a JSON contract between them. This makes it straightforward to add a web frontend later that reads/edits `keymap.json` and calls the generator directly.

### File Structure

```
zmk-to-openscad/
├── olik.keymap              ← input (ZMK Device Tree)
├── config.json              ← user-editable settings
├── keymap.json              ← generated intermediate (add to .gitignore)
├── output.scad              ← generated output (add to .gitignore)
└── src/
    ├── parse.js             ← stage 1: .keymap → keymap.json
    ├── generate.js          ← stage 2: keymap.json → output.scad
    ├── sv-keys.js           ← Swedish locale key → display symbol map
    └── zmk-bindings.js      ← ZMK binding resolver (&kp, &lt, &mt, &trans…)
```

---

## Stage 1 — parse.js

Reads the `.keymap` file and writes `keymap.json`.

### Responsibilities

- Extract layer names (`display-name`) and their binding arrays.
- Resolve each binding to a human-readable label using `zmk-bindings.js`.
- Map Swedish locale key names (`SV_*`) to display symbols using `sv-keys.js`.
- Assign grid positions (row, col) to each key according to the zone layout.
- Write the intermediate `keymap.json`.

### Binding Resolution Rules

| Binding | Resolution |
|---|---|
| `&kp KEY` | Display label for `KEY` |
| `&mt MOD TAP` | Label for `TAP` (tap action shown; hold action ignored for display) |
| `&lt LAYER TAP` | Label for `TAP` with a small layer indicator |
| `&trans` | Empty string — inherit from layer below or leave blank |
| `&none` | Empty string |
| `&sk KEY` | Label for `KEY` (sticky key, treated same as kp for display) |
| Tap-dance / macro | Resolved to the first binding's label |

### keymap.json Schema

```json
{
  "layerNames": ["Base", "Symbols", "Numbers", "Media"],
  "grid": { "rows": 5, "cols": 12 },
  "keys": [
    {
      "row": 0,
      "col": 0,
      "empty": false,
      "layers": {
        "Base": "ESC",
        "Symbols": "",
        "Numbers": "",
        "Media": ""
      }
    }
  ]
}
```

`empty: true` marks cells in the grid that have no physical key (blank cells).

### Grid Layout (Zone B)

Five rows total, 12 columns wide (6 per half with a logical gap):

| Row | Zone | Contents |
|---|---|---|
| 0 | Alpha | ESC … BSPC (12 keys) |
| 1 | Alpha | TAB … Ä (12 keys) |
| 2 | Alpha | (blank) Z … - (11 keys, col 0 left is empty) |
| 3 | Bottom | SHF CTL ' … ← ↓ → (6 keys, remaining cols empty) |
| 4 | Thumb | (blanks) ALT CMD SPC … SPC ENT CTL (blanks) |

---

## Stage 2 — generate.js

Reads `keymap.json` and `config.json`, writes `output.scad`.

### Responsibilities

- Emit OpenSCAD parameters from `config.json` at the top of the file.
- Emit reusable modules: `rounded_rect()`, `key_legend()`, `key_cap()`.
- Iterate over `keymap.json` keys and emit one `key_cap()` call per non-empty key, translated to its grid position.
- Emit a `// Filament swap at: Xmm` comment to guide the colour change.

### OpenSCAD Structure

```openscad
// === Parameters ===
key_w = 16;
key_h = 16;
key_radius = 2;
plate_h = 0.40;
layer_h = 0.08;
primary_layers = 4;   // primary legend height = primary_layers * layer_h
secondary_layers = 1; // secondary legend height = secondary_layers * layer_h
key_gap = 1;
primary_font_size = 6;
secondary_font_size = 2.5;
font = "Liberation Sans:style=Bold";

// Filament swap at: 0.44mm (plateHeight + secondaryHeight / 2)

// === Modules ===
module rounded_rect(w, h, r, height) { ... }
module key_legend(label, size, z_height) { ... }
module key_cap(primary, top_left, top_right, bottom_right) { ... }

// === Plate ===
key_cap("A", "sym", "num", "", ...);
// ... one per key
```

### Key Cap Rendering

Each key cap consists of:

1. **Base plate** — `rounded_rect` extruded to `plate_h`, 16×16mm with 2mm corner radius.
2. **Primary legend** — `text()` centered on the plate, extruded to `primary_layers * layer_h` above the plate top.
3. **Corner legends** — up to 3 labels (top-left, top-right, bottom-right), smaller font, extruded to `secondary_layers * layer_h` above the plate top.

Corner legend positions:
- **top-left** → Layer 1 (Symbols)
- **top-right** → Layer 2 (Numbers)
- **bottom-right** → Layer 3 (Media)

Empty labels are skipped (no geometry emitted).

### Colour Layering Technique

Print everything in the base colour. The SCAD file emits a comment:

```
// Filament swap at: Xmm
// X = plateHeight + (secondaryLayers * layerHeight) / 2
```

At that height:
- Secondary (corner) legends are already partially printed → appear faded.
- Primary legends have not yet started → will be fully in the contrast colour → appear bright.

---

## config.json

```json
{
  "print": {
    "layerHeight": 0.08
  },
  "key": {
    "width": 16,
    "height": 16,
    "radius": 2,
    "plateHeight": 0.40,
    "gap": 1
  },
  "legends": {
    "primaryLayers": 4,
    "secondaryLayers": 1,
    "primaryFontSize": 6,
    "secondaryFontSize": 2.5,
    "font": "Liberation Sans:style=Bold"
  },
  "labelOverrides": {
    "LEFT_ALT": "ALT",
    "LEFT_GUI": "CMD",
    "LEFT_CTRL": "CTL",
    "LCTRL": "CTL",
    "LSHIFT": "SHF",
    "BACKSPACE": "⌫",
    "ESCAPE": "ESC",
    "ENTER": "ENT",
    "DELETE": "DEL",
    "TAB": "TAB",
    "SPACE": "SPC",
    "PAGE_UP": "PGU",
    "PAGE_DOWN": "PGD",
    "C_PLAY_PAUSE": "▶⏸",
    "C_VOL_UP": "VOL+",
    "C_VOL_DN": "VOL-",
    "C_MUTE": "MUTE",
    "C_PREV": "⏮",
    "C_NEXT": "⏭"
  }
}
```

`labelOverrides` maps ZMK key names to the string displayed on the key cap. SVG file paths will be added here in a future iteration.

---

## sv-keys.js — Swedish Key Map

Maps `SV_*` constants from `keys_sv.h` to display symbols, e.g.:

| Constant | Symbol |
|---|---|
| `SV_A_UMLAUT` | `Ä` |
| `SV_O_UMLAUT` | `Ö` |
| `SV_A_RING` | `Å` |
| `SV_AT` | `@` |
| `SV_EXCL` | `!` |
| `SV_AMPS` | `&` |
| `SV_DLLR` | `$` |
| `SV_SLASH` | `/` |
| `SV_MINUS` | `-` |
| `SV_PLUS` | `+` |
| `SV_STAR` | `*` |
| `SV_HASH` | `#` |
| `SV_QMARK` | `?` |
| `SV_PRCNT` | `%` |
| `SV_EQUAL` | `=` |
| `SV_LPAR` | `(` |
| `SV_RPAR` | `)` |
| `SV_LT` | `<` |
| `SV_GT` | `>` |
| `SV_ACUTE` | `´` |
| `SV_GRAVE` | `` ` `` |
| `SV_TILDE` | `~` |
| `SV_CARET` | `^` |
| `SV_SECT` | `§` |
| `SV_SINGLE_QUOTE` | `'` |
| `SV_DQT` | `"` |
| `SV_FSLH` | `/` |
| `SV_N0`–`SV_N9` | `0`–`9` |

---

## Deferred

- **SVG icon overrides** — `labelOverrides` will accept SVG file paths in a future iteration. The generator will detect path values (ending in `.svg`) and use `import()` + `linear_extrude()` instead of `text()`.
- **Web frontend** — reads/edits `keymap.json` and calls `generate.js` via a small Express or Vite dev server.

---

## Usage

```bash
node src/parse.js olik.keymap        # → keymap.json
node src/generate.js                 # → output.scad  (reads keymap.json + config.json)
```

Or chain them:

```bash
node src/parse.js olik.keymap && node src/generate.js
```
