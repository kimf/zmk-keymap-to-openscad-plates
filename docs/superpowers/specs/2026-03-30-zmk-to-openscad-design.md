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

- Extract layer names (`display-name`) and their binding arrays. If a layer has no `display-name`, fall back to the DTS node name (e.g., `media`).
- Resolve each binding to a human-readable label using `zmk-bindings.js`.
- Map Swedish locale key names (`SV_*`) to display symbols using `sv-keys.js`.
- Assign grid positions (row, col) to each key according to the hardcoded layout map described below.
- Write the intermediate `keymap.json`.

### Binding Resolution Rules

| Binding | Resolution |
|---|---|
| `&kp KEY` | Display label for `KEY` (looked up in `sv-keys.js`, then `labelOverrides`, then lowercased key name) |
| `&kp LS(KEY)` / `&kp LA(KEY)` / `&kp LS(LA(KEY))` | Display label for the inner `KEY` (modifier wrappers stripped) |
| `&mt MOD TAP` | Label for `TAP` (tap action; hold action ignored for display) |
| `&lt LAYER TAP` | Label for `TAP` |
| `&trans` | Empty string — shown as blank on the key cap |
| `&none` | Empty string |
| `&sk KEY` | Label for `KEY` (sticky key, same as `&kp`) |
| `&caps_word` | `"CAPS"` |
| Named tap-dance (e.g. `&shift_td`, `&at_gmail_td`) | Resolved to the first `bindings` entry's label |
| Named mod-morph (e.g. `&quote_morph`) | Resolved to the first `bindings` entry's label (unshifted form) |
| Named macro (e.g. `&macro_gmail`) | Resolved from the macro's comment if present (e.g. `/* Outputs: "@gmail.com". */`), otherwise the macro node name |
| `&bt BT_SEL N` | `BT0`–`BT4` |
| `&bt BT_CLR` | `BT-CLR` |
| `&bt BT_CLR_ALL` | `BT-ALL` |
| `&bt BT_PRV` | `BT◀` |
| `&bt BT_NXT` | `BT▶` |
| `&msc MOVE_UP` / `&msc MOVE_DOWN` | Empty string (encoder-only, not a physical key) |
| `&inc_dec_kp` | Empty string (encoder binding, not a physical key) |

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

`empty: true` marks cells in the grid that have no physical key (blank cells). Empty cells are written to `keymap.json` so the grid is always fully rectangular, but the generator skips them.

### Grid Layout (Zone B)

The parser uses a **hardcoded layout map** to assign column positions. The keymap binding arrays do not include placeholder bindings for empty columns — the column offsets below are built into the parser, not derived from the file.

Five rows total, 12 columns wide:

| Row | Zone | Left keys (cols) | Right keys (cols) | Empty cols |
|---|---|---|---|---|
| 0 | Alpha | ESC Q W E R T (0–5) | Y U I O P BSPC (6–11) | none |
| 1 | Alpha | TAB A S D F G (0–5) | H J K L Ö Ä (6–11) | none |
| 2 | Alpha | Z X C V B (1–5) | N M , . ↑ - (6–11) | col 0 |
| 3 | Bottom | SHF CTL ' (0–2) | ← ↓ → (9–11) | cols 3–8 |
| 4 | Thumb | ALT CMD SPC (2–4) | SPC ENT CTL (6–8) | cols 0–1, 5, 9–11 |

The gap between left and right halves is visual only — both halves share the same 0–11 column space with no physical gap column in the JSON.

---

## Stage 2 — generate.js

Reads `keymap.json` and `config.json`, writes `output.scad`.

### Responsibilities

- Emit OpenSCAD parameters from `config.json` at the top of the file.
- Emit reusable modules: `rounded_rect()`, `key_legend()`, `key_cap()`.
- Iterate over `keymap.json` keys and emit one `translate([x, y, 0]) key_cap(...)` call per non-empty key, with `x` and `y` derived from `(col * (key_w + key_gap))` and `(-row * (key_h + key_gap))`.
- Emit a `// Filament swap at: Xmm` comment to guide the colour change.

### OpenSCAD Structure

```openscad
// === Parameters ===
key_w = 16;
key_h = 16;
key_radius = 2;
plate_h = 0.40;
layer_h = 0.08;
primary_layers = 4;   // primary legend height = primary_layers * layer_h = 0.32mm
secondary_layers = 1; // secondary legend height = secondary_layers * layer_h = 0.08mm
key_gap = 1;
primary_font_size = 6;
secondary_font_size = 2.5;
font = "Liberation Sans:style=Bold";

// === Colour layering guide ===
// Filament swap at: 0.44mm  (plate_h + secondary_layers * layer_h / 2)
// At this height:
//   - Secondary (corner) legends are ~50% printed → faded appearance
//   - Primary legends are ~12.5% started → predominantly contrast colour → bright appearance
// Adjust primary_layers / secondary_layers in config.json to tune the effect.

// === Modules ===
module rounded_rect(w, h, r, height) { ... }
module key_legend(label, size, z_height) { ... }
module key_cap(primary, top_left, top_right, bottom_right) { ... }

// === Plate ===
translate([col * (key_w + key_gap), -row * (key_h + key_gap), 0])
  key_cap("A", "sym", "num", "");
// ... one translate + key_cap per non-empty key
```

### Key Cap Rendering

Each key cap consists of:

1. **Base plate** — `rounded_rect` extruded to `plate_h`, 16×16mm with 2mm corner radius.
2. **Primary legend** — `text()` centered on the plate, extruded to `primary_layers * layer_h`, starting at `z = plate_h`.
3. **Corner legends** — up to 3 labels (top-left, top-right, bottom-right), smaller font, extruded to `secondary_layers * layer_h`, starting at `z = plate_h`.

Corner legend positions:
- **top-left** → Layer 1 (Symbols)
- **top-right** → Layer 2 (Numbers)
- **bottom-right** → Layer 3 (Media)

Empty labels are skipped (no geometry emitted).

### Colour Layering Technique

Both primary and secondary legends start printing at `z = plate_h`. Their heights differ:

- **Secondary legends**: `secondary_layers * layer_h` tall (e.g. 0.08mm) — printed mostly before the filament swap → appear faded (mix of base + contrast colour).
- **Primary legends**: `primary_layers * layer_h` tall (e.g. 0.32mm) — only ~12.5% printed before the swap → predominantly contrast colour → appear bright.

The recommended swap height is:

```
swap_height = plate_h + (secondary_layers * layer_h) / 2
```

This swap point is emitted as a comment in the generated SCAD file. The user performs the filament swap at this height in their slicer's "pause at layer" feature.

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
    "HOME": "HOM",
    "END": "END",
    "UP": "↑",
    "DOWN": "↓",
    "LEFT": "←",
    "RIGHT": "→",
    "COMMA": ",",
    "DOT": ".",
    "GRAVE": "`",
    "CAPS": "CAPS",
    "C_PLAY_PAUSE": "▶⏸",
    "C_PLAY": "▶",
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

Maps `SV_*` constants from `keys_sv.h` to display symbols:

| Constant | Symbol |
|---|---|
| `SV_A_UMLAUT` | `Ä` |
| `SV_O_UMLAUT` | `Ö` |
| `SV_A_RING` | `Å` |
| `SV_P` | `P` |
| `SV_AT` | `@` |
| `SV_EXCL` | `!` |
| `SV_AMPS` | `&` |
| `SV_DLLR` | `$` |
| `SV_SLASH` | `/` |
| `SV_FSLH` | `/` |
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
| `SV_TILDE` | `~` |
| `SV_CARET` | `^` |
| `SV_SECT` | `§` |
| `SV_SINGLE_QUOTE` | `'` |
| `SV_DQT` | `"` |
| `SV_N0`–`SV_N9` | `0`–`9` |

Note: `GRAVE` (bare ZMK HID keycode, used in the sym layer as `` &kp GRAVE ``) is handled via `labelOverrides`, not `sv-keys.js`.

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
