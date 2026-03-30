# ZMK to OpenSCAD Key Cap Generator — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-stage Node.js pipeline that parses a ZMK keyboard firmware `.keymap` file and generates a 3D-printable OpenSCAD plate of key caps with multi-layer legends for filament colour-switching.

**Architecture:** `parse.js` reads the `.keymap` and writes a `keymap.json` intermediate using a hardcoded layout map and a ZMK binding resolver. `generate.js` reads `keymap.json` + `config.json` and emits `output.scad` with parametric modules for key cap geometry and colour-layering-aware legend heights.

**Tech Stack:** Node.js (CommonJS, no build step), built-in `fs`/`path` modules only — no external dependencies.

---

## File Map

| File | Role |
|---|---|
| `src/sv-keys.js` | Map of `SV_*` ZMK Swedish locale constants → display symbols |
| `src/zmk-bindings.js` | Resolve a single ZMK binding string (e.g. `&kp SV_AT`) → display label |
| `src/layout-map.js` | Hardcoded grid layout: per-row binding counts, column occupancy, and per-row binding indices |
| `src/parse.js` | Entry point for stage 1: reads `.keymap`, produces `keymap.json` |
| `src/generate.js` | Entry point for stage 2: reads `keymap.json` + `config.json`, produces `output.scad` |
| `config.json` | User-editable settings (dimensions, layer heights, label overrides) |
| `tests/sv-keys.test.js` | Unit tests for the Swedish key map |
| `tests/zmk-bindings.test.js` | Unit tests for the binding resolver |
| `tests/layout-map.test.js` | Unit tests for the layout map |
| `tests/parse.test.js` | Integration test for parse.js against `olik.keymap` |
| `tests/generate.test.js` | Unit tests for SCAD output snippets |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `config.json`
- Create: `.gitignore`

- [ ] **Step 1: Initialise the project**

```bash
cd /Users/kimf/projects/keebs/zmk-to-openscad
npm init -y
npm pkg set type=commonjs
npm pkg set scripts.test="node --test tests/*.test.js"
```

- [ ] **Step 2: Create `config.json`**

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

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
keymap.json
output.scad
.superpowers/
```

- [ ] **Step 4: Create `src/` and `tests/` directories**

```bash
mkdir -p src tests
```

- [ ] **Step 5: Commit scaffold**

```bash
git add package.json config.json .gitignore
git commit -m "feat: project scaffold with config"
```

---

## Task 2: Swedish Key Map (`sv-keys.js`)

**Files:**
- Create: `src/sv-keys.js`
- Create: `tests/sv-keys.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/sv-keys.test.js`:

```js
const { strict: assert } = require('assert');
const { test } = require('node:test');
const svKeys = require('../src/sv-keys');

test('maps SV_A_UMLAUT to Ä', () => assert.equal(svKeys['SV_A_UMLAUT'], 'Ä'));
test('maps SV_O_UMLAUT to Ö', () => assert.equal(svKeys['SV_O_UMLAUT'], 'Ö'));
test('maps SV_A_RING to Å',   () => assert.equal(svKeys['SV_A_RING'],   'Å'));
test('maps SV_AT to @',        () => assert.equal(svKeys['SV_AT'],       '@'));
test('maps SV_N5 to 5',        () => assert.equal(svKeys['SV_N5'],       '5'));
test('maps SV_P to P',         () => assert.equal(svKeys['SV_P'],        'P'));
test('does not contain SV_GRAVE', () => assert.equal(svKeys['SV_GRAVE'], undefined));
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
node --test tests/sv-keys.test.js
```
Expected: `Cannot find module '../src/sv-keys'`

- [ ] **Step 3: Implement `src/sv-keys.js`**

```js
// Maps ZMK Swedish locale key constants (from keys_sv.h) to display symbols.
module.exports = {
  SV_A_UMLAUT:    'Ä',
  SV_O_UMLAUT:    'Ö',
  SV_A_RING:      'Å',
  SV_P:           'P',
  SV_AT:          '@',
  SV_EXCL:        '!',
  SV_AMPS:        '&',
  SV_DLLR:        '$',
  SV_SLASH:       '/',
  SV_FSLH:        '/',
  SV_MINUS:       '-',
  SV_PLUS:        '+',
  SV_STAR:        '*',
  SV_HASH:        '#',
  SV_QMARK:       '?',
  SV_PRCNT:       '%',
  SV_EQUAL:       '=',
  SV_LPAR:        '(',
  SV_RPAR:        ')',
  SV_LT:          '<',
  SV_GT:          '>',
  SV_ACUTE:       '´',
  SV_TILDE:       '~',
  SV_CARET:       '^',
  SV_SECT:        '§',
  SV_SINGLE_QUOTE:"'",
  SV_DQT:         '"',
  SV_N0: '0', SV_N1: '1', SV_N2: '2', SV_N3: '3', SV_N4: '4',
  SV_N5: '5', SV_N6: '6', SV_N7: '7', SV_N8: '8', SV_N9: '9',
};
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
node --test tests/sv-keys.test.js
```
Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/sv-keys.js tests/sv-keys.test.js
git commit -m "feat: Swedish locale key map"
```

---

## Task 3: ZMK Binding Resolver (`zmk-bindings.js`)

**Files:**
- Create: `src/zmk-bindings.js`
- Create: `tests/zmk-bindings.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/zmk-bindings.test.js`:

```js
const { strict: assert } = require('assert');
const { test } = require('node:test');
const { resolveBinding } = require('../src/zmk-bindings');

const overrides = {
  BACKSPACE: '⌫', ESCAPE: 'ESC', ENTER: 'ENT', LEFT_ALT: 'ALT',
  LEFT_GUI: 'CMD', LEFT_CTRL: 'CTL', LCTRL: 'CTL', LSHIFT: 'SHF',
  SPACE: 'SPC', UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→',
  COMMA: ',', DOT: '.', GRAVE: '`',
};

// Named behaviors (tap-dance, mod-morph) resolved from the behaviors map
const behaviors = {
  shift_td:    { type: 'tap-dance', bindings: ['&kp LSHIFT', '&sk LSHIFT', '&caps_word'] },
  quote_morph: { type: 'mod-morph', bindings: ['&kp SV_SINGLE_QUOTE', '&kp SV_DQT'] },
  at_gmail_td: { type: 'tap-dance', bindings: ['&kp SV_AT', '&macro_gmail'] },
};
const macros = {
  macro_gmail: '@gmail.com',
};

const ctx = { overrides, behaviors, macros };

test('&kp Q → Q',                         () => assert.equal(resolveBinding('&kp Q', ctx),              'Q'));
test('&kp SV_O_UMLAUT → Ö',              () => assert.equal(resolveBinding('&kp SV_O_UMLAUT', ctx),    'Ö'));
test('&kp BACKSPACE → ⌫',               () => assert.equal(resolveBinding('&kp BACKSPACE', ctx),       '⌫'));
test('&mt LCTRL ESCAPE → ESC',           () => assert.equal(resolveBinding('&mt LCTRL ESCAPE', ctx),   'ESC'));
test('&lt 1 SPACE → SPC',               () => assert.equal(resolveBinding('&lt 1 SPACE', ctx),         'SPC'));
test('&trans → empty string',            () => assert.equal(resolveBinding('&trans', ctx),              ''));
test('&none → empty string',             () => assert.equal(resolveBinding('&none', ctx),               ''));
test('&sk LSHIFT → SHF',                () => assert.equal(resolveBinding('&sk LSHIFT', ctx),          'SHF'));
test('&caps_word → CAPS',               () => assert.equal(resolveBinding('&caps_word', ctx),          'CAPS'));
test('&kp LS(LA(SV_N8)) → 8',           () => assert.equal(resolveBinding('&kp LS(LA(SV_N8))', ctx),  '8'));
test('&kp LA(SV_N7) → 7',               () => assert.equal(resolveBinding('&kp LA(SV_N7)', ctx),      '7'));
test('&bt BT_SEL 0 → BT0',              () => assert.equal(resolveBinding('&bt BT_SEL 0', ctx),        'BT0'));
test('&bt BT_SEL 4 → BT4',              () => assert.equal(resolveBinding('&bt BT_SEL 4', ctx),        'BT4'));
test('&bt BT_CLR → BT-CLR',             () => assert.equal(resolveBinding('&bt BT_CLR', ctx),          'BT-CLR'));
test('&bt BT_CLR_ALL → BT-ALL',         () => assert.equal(resolveBinding('&bt BT_CLR_ALL', ctx),      'BT-ALL'));
test('&bt BT_PRV → BT◀',               () => assert.equal(resolveBinding('&bt BT_PRV', ctx),          'BT◀'));
test('&bt BT_NXT → BT▶',               () => assert.equal(resolveBinding('&bt BT_NXT', ctx),          'BT▶'));
test('&shift_td → SHF (first binding)', () => assert.equal(resolveBinding('&shift_td', ctx),           'SHF'));
test('&quote_morph → \' (first binding)', () => assert.equal(resolveBinding('&quote_morph', ctx),      "'"));
test('&at_gmail_td → @ (first binding)', () => assert.equal(resolveBinding('&at_gmail_td', ctx),       '@'));
test('&macro_gmail → @gmail.com',        () => assert.equal(resolveBinding('&macro_gmail', ctx),       '@gmail.com'));
test('&msc MOVE_UP → empty',             () => assert.equal(resolveBinding('&msc MOVE_UP', ctx),       ''));
test('&inc_dec_kp A B → empty',          () => assert.equal(resolveBinding('&inc_dec_kp A B', ctx),    ''));
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
node --test tests/zmk-bindings.test.js
```
Expected: `Cannot find module '../src/zmk-bindings'`

- [ ] **Step 3: Implement `src/zmk-bindings.js`**

```js
const svKeys = require('./sv-keys');

/**
 * Strip modifier wrappers like LS(...), LA(...), LS(LA(...)) from a key token
 * and return the innermost key name.
 */
function stripModifiers(token) {
  // Repeatedly unwrap until no more modifier wrappers
  let t = token;
  const modRe = /^(?:LS|LA|LC|RS|RA|RC)\((.+)\)$/;
  let m;
  while ((m = modRe.exec(t))) t = m[1];
  return t;
}

/**
 * Resolve a key name to its display label.
 * Checks sv-keys first, then labelOverrides, then returns the name as-is (lowercased).
 */
function resolveKey(name, overrides) {
  if (svKeys[name] !== undefined)   return svKeys[name];
  if (overrides[name] !== undefined) return overrides[name];
  // Single letters stay as-is; multi-word names are returned verbatim
  return name.length === 1 ? name : name;
}

/**
 * Resolve a single ZMK binding string to a display label.
 * @param {string} binding  e.g. "&kp SV_AT" or "&mt LCTRL ESCAPE"
 * @param {object} ctx      { overrides, behaviors, macros }
 * @returns {string}        display label, or '' if nothing to show
 */
function resolveBinding(binding, ctx) {
  const { overrides = {}, behaviors = {}, macros = {} } = ctx;
  const parts = binding.trim().split(/\s+/);
  const head  = parts[0];

  if (head === '&trans' || head === '&none') return '';
  if (head === '&caps_word')                 return 'CAPS';
  if (head === '&msc' || head === '&inc_dec_kp') return '';

  if (head === '&kp' || head === '&sk') {
    const raw    = parts.slice(1).join(' ');
    const inner  = stripModifiers(raw);
    return resolveKey(inner, overrides);
  }

  if (head === '&mt') {
    // &mt MOD TAP — show tap action (last token)
    const tap = stripModifiers(parts[parts.length - 1]);
    return resolveKey(tap, overrides);
  }

  if (head === '&lt') {
    // &lt LAYER TAP — show tap action (last token)
    const tap = stripModifiers(parts[parts.length - 1]);
    return resolveKey(tap, overrides);
  }

  if (head === '&bt') {
    const sub = parts[1];
    if (sub === 'BT_SEL')     return 'BT' + parts[2];
    if (sub === 'BT_CLR')     return 'BT-CLR';
    if (sub === 'BT_CLR_ALL') return 'BT-ALL';
    if (sub === 'BT_PRV')     return 'BT◀';
    if (sub === 'BT_NXT')     return 'BT▶';
    return 'BT';
  }

  // Named behavior reference (e.g. &shift_td, &quote_morph)
  const behaviorName = head.slice(1); // strip leading &
  if (behaviors[behaviorName]) {
    const b = behaviors[behaviorName];
    return resolveBinding(b.bindings[0], ctx);
  }

  // Named macro reference (e.g. &macro_gmail)
  const macroName = head.slice(1);
  if (macros[macroName] !== undefined) return macros[macroName];

  return '';
}

module.exports = { resolveBinding, resolveKey, stripModifiers };
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
node --test tests/zmk-bindings.test.js
```
Expected: all 23 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/zmk-bindings.js src/sv-keys.js tests/zmk-bindings.test.js
git commit -m "feat: ZMK binding resolver"
```

---

## Task 4: Grid Layout Map (`layout-map.js`)

**Files:**
- Create: `src/layout-map.js`
- Create: `tests/layout-map.test.js`

The layout map encodes which column each binding-array index maps to, for each row zone. This is hardcoded because the `.keymap` file has no placeholder bindings for empty columns.

- [ ] **Step 1: Write the failing tests**

Create `tests/layout-map.test.js`:

```js
const { strict: assert } = require('assert');
const { test } = require('node:test');
const { ROWS, COLS, getRowZones } = require('../src/layout-map');

test('grid is 5 rows × 12 cols', () => {
  assert.equal(ROWS, 5);
  assert.equal(COLS, 12);
});

test('BINDINGS_PER_ROW sums to 48', () => {
  const { BINDINGS_PER_ROW } = require('../src/layout-map');
  assert.equal(BINDINGS_PER_ROW.reduce((a, b) => a + b, 0), 48);
});

test('BINDINGS_PER_ROW row 1 is 13 (encoder slot)', () => {
  const { BINDINGS_PER_ROW } = require('../src/layout-map');
  assert.equal(BINDINGS_PER_ROW[1], 13);
});

const zones = getRowZones();

test('row 0 has 12 entries, all non-empty', () => {
  assert.equal(zones[0].length, 12);
  assert.ok(zones[0].every(e => !e.empty));
});

test('row 2 col 0 is empty', () => {
  const col0 = zones[2].find(e => e.col === 0);
  assert.ok(col0.empty);
});

test('row 2 has binding index 0 at col 1', () => {
  const col1 = zones[2].find(e => e.col === 1);
  assert.equal(col1.bindingIndex, 0);
  assert.equal(col1.empty, false);
});

test('row 3 cols 3-8 are empty', () => {
  for (let c = 3; c <= 8; c++) {
    const entry = zones[3].find(e => e.col === c);
    assert.ok(entry.empty, `col ${c} should be empty`);
  }
});

test('row 3 LEFT is at col 9', () => {
  // LEFT is the 4th binding (index 3) in the right-side group
  const col9 = zones[3].find(e => e.col === 9);
  assert.equal(col9.bindingIndex, 3);
  assert.equal(col9.empty, false);
});

test('row 4 ALT is at col 2', () => {
  const col2 = zones[4].find(e => e.col === 2);
  assert.equal(col2.bindingIndex, 0);
  assert.equal(col2.empty, false);
});

test('row 4 cols 0-1 are empty', () => {
  for (let c = 0; c <= 1; c++) {
    const entry = zones[4].find(e => e.col === c);
    assert.ok(entry.empty);
  }
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
node --test tests/layout-map.test.js
```
Expected: `Cannot find module '../src/layout-map'`

- [ ] **Step 3: Implement `src/layout-map.js`**

```js
const ROWS = 5;
const COLS = 12;

/**
 * Number of bindings emitted per row in the flat binding array of each layer.
 * Row 1 has 13 because the encoder occupies an extra slot (index 6) between
 * the left and right halves.
 *
 * parse.js uses this to split the flat per-layer binding array into row slices
 * before applying per-row bindingIndex values.
 */
const BINDINGS_PER_ROW = [12, 13, 11, 6, 6];

/**
 * Returns an array of 5 rows, each an array of 12 cell descriptors:
 *   { col, row, empty, bindingIndex }
 *
 * bindingIndex is the 0-based index into that row's own binding slice.
 * empty: true means no physical key at this grid cell.
 *
 * Layout reference (Zone B):
 *   Row 0: ESC Q W E R T  |  Y U I O P BSPC    (12 bindings, cols 0-11)
 *   Row 1: TAB A S D F G  [encoder]  H J K L Ö Ä  (13 bindings; encoder at index 6 is skipped)
 *   Row 2: _ Z X C V B    |  N M , . ↑ -        (11 bindings, col 0 empty)
 *   Row 3: SHF CTL '  _ _ _ _ _ _  ← ↓ →       (6 bindings, cols 0-2 + 9-11)
 *   Row 4: _ _ ALT CMD SPC  _  SPC ENT CTL _ _  (6 bindings, cols 2-4 + 6-8)
 */
function getRowZones() {
  const rows = [];

  // ── Row 0: 12 keys, cols 0–11, binding indices 0–11
  rows.push(Array.from({ length: 12 }, (_, i) => ({
    row: 0, col: i, empty: false, bindingIndex: i,
  })));

  // ── Row 1: 13 bindings in the flat array. Index 6 is the encoder — skip it.
  //           Left half: cols 0-5 → indices 0-5; right half: cols 6-11 → indices 7-12.
  {
    const row = [];
    for (let c = 0; c < 6; c++)  row.push({ row: 1, col: c, empty: false, bindingIndex: c });
    for (let c = 6; c < 12; c++) row.push({ row: 1, col: c, empty: false, bindingIndex: c + 1 }); // +1 skips encoder slot
    rows.push(row);
  }

  // ── Row 2: col 0 empty; 11 bindings fill cols 1–11 (indices 0–10)
  {
    const row = [{ row: 2, col: 0, empty: true, bindingIndex: null }];
    for (let i = 0; i < 11; i++) {
      row.push({ row: 2, col: i + 1, empty: false, bindingIndex: i });
    }
    rows.push(row);
  }

  // ── Row 3: 6 bindings → cols 0-2 (indices 0-2) and cols 9-11 (indices 3-5)
  //           cols 3-8 are empty
  {
    const row = [];
    for (let c = 0; c < 12; c++) {
      if (c <= 2)      row.push({ row: 3, col: c, empty: false, bindingIndex: c });
      else if (c <= 8) row.push({ row: 3, col: c, empty: true,  bindingIndex: null });
      else             row.push({ row: 3, col: c, empty: false, bindingIndex: c - 6 });
    }
    rows.push(row);
  }

  // ── Row 4: 6 bindings → cols 2-4 (indices 0-2) and cols 6-8 (indices 3-5)
  //           cols 0-1, 5, 9-11 are empty
  {
    const OCCUPIED = new Map([[2,0],[3,1],[4,2],[6,3],[7,4],[8,5]]);
    const row = Array.from({ length: 12 }, (_, c) => {
      const bi = OCCUPIED.get(c);
      return { row: 4, col: c, empty: bi === undefined, bindingIndex: bi ?? null };
    });
    rows.push(row);
  }

  return rows;
}

module.exports = { ROWS, COLS, BINDINGS_PER_ROW, getRowZones };
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
node --test tests/layout-map.test.js
```
Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/layout-map.js tests/layout-map.test.js
git commit -m "feat: hardcoded ortholinear grid layout map"
```

---

## Task 5: Keymap Parser (`parse.js`)

**Files:**
- Create: `src/parse.js`
- Create: `tests/parse.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/parse.test.js`:

```js
const { strict: assert } = require('assert');
const { test } = require('node:test');
const path = require('path');
const { parseKeymap } = require('../src/parse');

const KEYMAP = path.resolve(__dirname, '../olik.keymap');

let result;
test('parseKeymap returns object with layerNames and keys', () => {
  result = parseKeymap(KEYMAP);
  assert.ok(result.layerNames, 'has layerNames');
  assert.ok(Array.isArray(result.keys), 'has keys array');
  assert.ok(result.grid, 'has grid');
});

test('layerNames contains Base, Symbols, Numbers, Media', () => {
  result = result || parseKeymap(KEYMAP);
  assert.deepEqual(result.layerNames, ['Base', 'Symbols', 'Numbers', 'Media']);
});

test('grid is 5 rows × 12 cols', () => {
  result = result || parseKeymap(KEYMAP);
  assert.equal(result.grid.rows, 5);
  assert.equal(result.grid.cols, 12);
});

test('total key entries is 60 (5 rows × 12 cols)', () => {
  result = result || parseKeymap(KEYMAP);
  assert.equal(result.keys.length, 60);
});

test('key at row=0 col=1 has Base label Q', () => {
  result = result || parseKeymap(KEYMAP);
  const key = result.keys.find(k => k.row === 0 && k.col === 1);
  assert.equal(key.layers['Base'], 'Q');
});

test('key at row=1 col=11 has Base label Ä', () => {
  result = result || parseKeymap(KEYMAP);
  const key = result.keys.find(k => k.row === 1 && k.col === 11);
  assert.equal(key.layers['Base'], 'Ä');
});

test('row=2 col=0 is empty', () => {
  result = result || parseKeymap(KEYMAP);
  const key = result.keys.find(k => k.row === 2 && k.col === 0);
  assert.equal(key.empty, true);
});

test('row=0 col=0 (ESC/MT) has Base label ESC', () => {
  result = result || parseKeymap(KEYMAP);
  const key = result.keys.find(k => k.row === 0 && k.col === 0);
  assert.equal(key.layers['Base'], 'ESC');
});

test('row=4 col=2 (ALT thumb) has Base label ALT', () => {
  result = result || parseKeymap(KEYMAP);
  const key = result.keys.find(k => k.row === 4 && k.col === 2);
  assert.equal(key.layers['Base'], 'ALT');
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
node --test tests/parse.test.js
```
Expected: `Cannot find module '../src/parse'`

- [ ] **Step 3: Implement `src/parse.js`**

```js
const fs   = require('fs');
const path = require('path');
const { resolveBinding } = require('./zmk-bindings');
const { ROWS, COLS, BINDINGS_PER_ROW, getRowZones } = require('./layout-map');

/**
 * Extract the content of the keymap { ... } block from a .keymap file.
 */
function extractKeymapBlock(src) {
  const start = src.indexOf('keymap {');
  if (start === -1) throw new Error('No keymap { block found');
  let depth = 0, i = start;
  while (i < src.length) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
    i++;
  }
  throw new Error('Unterminated keymap block');
}

/**
 * Extract named DTS blocks: { name: content }
 */
function extractNamedBlocks(src) {
  const blocks = {};
  const re = /(\w+)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  let m;
  while ((m = re.exec(src))) blocks[m[1]] = m[2];
  return blocks;
}

/**
 * Extract display-name from a layer block, falling back to the node name.
 */
function extractDisplayName(blockContent, nodeName) {
  const m = blockContent.match(/display-name\s*=\s*"([^"]+)"/);
  return m ? m[1] : nodeName;
}

/**
 * Extract the flat bindings array from a layer block's `bindings = <...>;`
 * Uses a word-boundary anchor to avoid matching `sensor-bindings`.
 * Returns an array of raw binding strings e.g. ["&kp Q", "&trans", ...]
 */
function extractBindings(blockContent) {
  // Match `bindings` only when not preceded by a word character (avoids sensor-bindings)
  const m = blockContent.match(/(?<!\w)bindings\s*=\s*<([\s\S]*?)>;/);
  if (!m) return [];
  return m[1]
    .replace(/\n/g, ' ')
    .trim()
    .split(/(?=&)/)          // split before each &
    .map(s => s.replace(/,/g, '').trim())
    .filter(Boolean);
}

/**
 * Split a flat per-layer binding array into per-row slices using BINDINGS_PER_ROW.
 * Returns an array of arrays: rowSlices[rowIndex][bindingIndex].
 */
function sliceBindingsByRow(flatBindings, bindingsPerRow) {
  const slices = [];
  let offset = 0;
  for (const count of bindingsPerRow) {
    slices.push(flatBindings.slice(offset, offset + count));
    offset += count;
  }
  return slices;
}

/**
 * Extract named behaviors (tap-dance, mod-morph) from the behaviors block.
 * Returns { name: { type, bindings: [rawBinding, ...] } }
 */
function extractBehaviors(src) {
  const behaviors = {};
  const behaviorBlock = src.match(/behaviors\s*\{([\s\S]*?)\n\t\};/);
  if (!behaviorBlock) return behaviors;

  const tdRe = /(\w+):\s*\w+\s*\{[\s\S]*?compatible\s*=\s*"zmk,behavior-tap-dance"[\s\S]*?bindings\s*=\s*<([\s\S]*?)>;/g;
  let m;
  while ((m = tdRe.exec(behaviorBlock[1]))) {
    behaviors[m[1]] = {
      type: 'tap-dance',
      bindings: m[2].replace(/\n/g, ' ').trim().split(/,\s*/).map(s => s.trim()).filter(Boolean),
    };
  }

  const mmRe = /(\w+):\s*\w+\s*\{[\s\S]*?compatible\s*=\s*"zmk,behavior-mod-morph"[\s\S]*?bindings\s*=\s*<([\s\S]*?)>;/g;
  while ((m = mmRe.exec(behaviorBlock[1]))) {
    behaviors[m[1]] = {
      type: 'mod-morph',
      bindings: m[2].replace(/\n/g, ' ').trim().split(/,\s*/).map(s => s.trim()).filter(Boolean),
    };
  }

  return behaviors;
}

/**
 * Extract macros and their output labels from their comment (/* Outputs: "…" *\/)
 * In the keymap file the comment appears INSIDE the macro block, after `compatible`.
 * Capture order: node name first, then the Outputs comment inside the block.
 * Returns { macroName: label }
 */
function extractMacros(src) {
  const macros = {};
  // Match: nodeName: alias { ... compatible = "zmk,behavior-macro" ... /* Outputs: "..." */ ... }
  const re = /(\w+):\s*\w+\s*\{[^{}]*?compatible\s*=\s*"zmk,behavior-macro"[^{}]*?\/\*\s*Outputs:\s*"([^"]+)"\s*\*\//g;
  let m;
  while ((m = re.exec(src))) macros[m[1]] = m[2];
  return macros;
}

/**
 * Parse a .keymap file and return the keymap.json data structure.
 */
function parseKeymap(keymapPath) {
  const configPath = path.resolve(path.dirname(keymapPath), 'config.json');
  const config     = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const overrides  = config.labelOverrides || {};

  const src       = fs.readFileSync(keymapPath, 'utf8');
  const behaviors = extractBehaviors(src);
  const macros    = extractMacros(src);
  const ctx       = { overrides, behaviors, macros };

  const keymapBlock  = extractKeymapBlock(src);
  const layerBlocks  = extractNamedBlocks(keymapBlock);
  // The first key is always 'compatible' — skip it; remaining are layer nodes
  const layerEntries = Object.entries(layerBlocks).filter(([k]) => k !== 'compatible');

  const layerNames    = layerEntries.map(([nodeName, content]) => extractDisplayName(content, nodeName));
  // Split each layer's flat binding array into per-row slices so that
  // per-row bindingIndex values (from layout-map.js) index correctly.
  const layerRowSlices = layerEntries.map(([, content]) =>
    sliceBindingsByRow(extractBindings(content), BINDINGS_PER_ROW)
  );

  const zones = getRowZones();
  const keys  = [];

  for (const rowZone of zones) {
    for (const cell of rowZone) {
      const keyEntry = {
        row: cell.row,
        col: cell.col,
        empty: cell.empty,
        layers: {},
      };
      for (let li = 0; li < layerNames.length; li++) {
        if (cell.empty || cell.bindingIndex === null) {
          keyEntry.layers[layerNames[li]] = '';
        } else {
          const rowSlice = layerRowSlices[li][cell.row] || [];
          const raw = rowSlice[cell.bindingIndex] || '&trans';
          keyEntry.layers[layerNames[li]] = resolveBinding(raw, ctx);
        }
      }
      keys.push(keyEntry);
    }
  }

  return { layerNames, grid: { rows: ROWS, cols: COLS }, keys };
}

// CLI entry point
if (require.main === module) {
  const [,, keymapFile] = process.argv;
  if (!keymapFile) { console.error('Usage: node src/parse.js <keymap-file>'); process.exit(1); }
  const result = parseKeymap(path.resolve(keymapFile));
  const out    = path.resolve(path.dirname(keymapFile), 'keymap.json');
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(`Written to ${out}`);
}

module.exports = { parseKeymap };
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
node --test tests/parse.test.js
```
Expected: all 9 tests pass.

- [ ] **Step 5: Smoke-test against the real keymap**

```bash
node src/parse.js olik.keymap
cat keymap.json | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log('Keys:', d.keys.length, '| Layers:', d.layerNames);"
```
Expected output:
```
Written to .../keymap.json
Keys: 60 | Layers: [ 'Base', 'Symbols', 'Numbers', 'Media' ]
```

- [ ] **Step 6: Commit**

```bash
git add src/parse.js tests/parse.test.js
git commit -m "feat: ZMK keymap parser (stage 1)"
```

---

## Task 6: OpenSCAD Generator (`generate.js`)

**Files:**
- Create: `src/generate.js`
- Create: `tests/generate.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/generate.test.js`:

```js
const { strict: assert } = require('assert');
const { test } = require('node:test');
const { buildScad } = require('../src/generate');

const config = {
  print:   { layerHeight: 0.08 },
  key:     { width: 16, height: 16, radius: 2, plateHeight: 0.40, gap: 1 },
  legends: { primaryLayers: 4, secondaryLayers: 1, primaryFontSize: 6, secondaryFontSize: 2.5, font: 'Liberation Sans:style=Bold' },
  labelOverrides: {},
};

const keymapData = {
  layerNames: ['Base', 'Sym'],
  grid: { rows: 1, cols: 2 },
  keys: [
    { row: 0, col: 0, empty: false, layers: { Base: 'A', Sym: '!' } },
    { row: 0, col: 1, empty: false, layers: { Base: 'B', Sym: '@' } },
  ],
};

let scad;
test('buildScad returns a string', () => {
  scad = buildScad(keymapData, config);
  assert.equal(typeof scad, 'string');
});

test('output contains key_w parameter', () => {
  scad = scad || buildScad(keymapData, config);
  // Generator may pad the assignment for alignment — match the value, not exact spacing
  assert.ok(/key_w\s*=\s*16/.test(scad), 'should set key_w = 16');
});

test('output contains filament swap comment', () => {
  scad = scad || buildScad(keymapData, config);
  // swap = 0.40 + (1 * 0.08) / 2 = 0.44
  assert.ok(scad.includes('0.44'), 'should include swap height 0.44mm');
});

test('output contains rounded_rect module', () => {
  scad = scad || buildScad(keymapData, config);
  assert.ok(scad.includes('module rounded_rect'));
});

test('output contains key_cap module', () => {
  scad = scad || buildScad(keymapData, config);
  assert.ok(scad.includes('module key_cap'));
});

test('output does not contain dead key_legend module', () => {
  scad = scad || buildScad(keymapData, config);
  assert.ok(!scad.includes('module key_legend'), 'key_legend should not appear — it was removed as dead code');
});

test('output contains translate for key at col=0', () => {
  scad = scad || buildScad(keymapData, config);
  assert.ok(scad.includes('translate([0,'), 'col 0 translate at x=0');
});

test('output contains translate for key at col=1 (x = key_w + gap = 17)', () => {
  scad = scad || buildScad(keymapData, config);
  assert.ok(scad.includes('translate([17,'), 'col 1 translate at x=17');
});

test('empty keys are not rendered', () => {
  const data = {
    layerNames: ['Base'],
    grid: { rows: 1, cols: 2 },
    keys: [
      { row: 0, col: 0, empty: true,  layers: { Base: '' } },
      { row: 0, col: 1, empty: false, layers: { Base: 'Q' } },
    ],
  };
  const s = buildScad(data, config);
  // Only one key_cap call
  assert.equal((s.match(/key_cap\(/g) || []).length, 1);
});

test('primary label is passed as first arg to key_cap', () => {
  scad = scad || buildScad(keymapData, config);
  assert.ok(scad.includes('"A"'), 'primary label A present');
});

test('corner label from layer 1 is second arg', () => {
  scad = scad || buildScad(keymapData, config);
  assert.ok(scad.includes('"!"'), 'corner label ! present');
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
node --test tests/generate.test.js
```
Expected: `Cannot find module '../src/generate'`

- [ ] **Step 3: Implement `src/generate.js`**

```js
const fs   = require('fs');
const path = require('path');

/**
 * Escape a string for use inside an OpenSCAD string literal.
 */
function scadStr(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Build the full OpenSCAD source string from keymap data and config.
 */
function buildScad(keymapData, config) {
  const { print, key, legends } = config;
  const lh  = print.layerHeight;
  const ph  = key.plateHeight;
  const gap = key.gap;
  const kw  = key.width;
  const kh  = key.height;

  const primaryH   = legends.primaryLayers   * lh;
  const secondaryH = legends.secondaryLayers * lh;
  const swapH      = +(ph + secondaryH / 2).toFixed(4);

  const lines = [];

  // ── Parameters
  lines.push('// === Parameters ===');
  lines.push(`key_w              = ${kw};`);
  lines.push(`key_h              = ${kh};`);
  lines.push(`key_radius         = ${key.radius};`);
  lines.push(`plate_h            = ${ph};`);
  lines.push(`layer_h            = ${lh};`);
  lines.push(`primary_layers     = ${legends.primaryLayers};   // × layer_h = ${primaryH}mm`);
  lines.push(`secondary_layers   = ${legends.secondaryLayers}; // × layer_h = ${secondaryH}mm`);
  lines.push(`key_gap            = ${gap};`);
  lines.push(`primary_font_size  = ${legends.primaryFontSize};`);
  lines.push(`secondary_font_size= ${legends.secondaryFontSize};`);
  lines.push(`font               = "${legends.font}";`);
  lines.push('');

  // ── Colour layering guide
  lines.push('// === Colour layering guide ===');
  lines.push(`// Filament swap at: ${swapH}mm  (plate_h + secondary_layers * layer_h / 2)`);
  lines.push('// At this height:');
  lines.push(`//   Secondary (corner) legends are ~50% printed → faded`);
  lines.push(`//   Primary legends are ~${Math.round((secondaryH / 2 / primaryH) * 100)}% started → predominantly contrast colour`);
  lines.push('// Use your slicer\'s "pause at layer" feature at the swap height above.');
  lines.push('');

  // ── Modules
  lines.push('// === Modules ===');
  lines.push('');
  lines.push('module rounded_rect(w, h, r, height) {');
  lines.push('  linear_extrude(height)');
  lines.push('    offset(r) offset(-r) square([w - 2*r, h - 2*r], center=true);');
  lines.push('}');
  lines.push('');
  lines.push('module key_cap(primary, top_left, top_right, bottom_right) {');
  lines.push('  // Base plate');
  lines.push('  rounded_rect(key_w, key_h, key_radius, plate_h);');
  lines.push('  // Primary legend — centered, tall (contrast colour)');
  lines.push('  translate([0, 0, plate_h])');
  lines.push('    linear_extrude(primary_layers * layer_h)');
  lines.push('      text(primary, size=primary_font_size, font=font, halign="center", valign="center");');
  lines.push('  // Corner legends — small, short (faded)');
  lines.push('  translate([-(key_w/2 - 2), key_h/2 - 3, plate_h])');
  lines.push('    linear_extrude(secondary_layers * layer_h)');
  lines.push('      text(top_left, size=secondary_font_size, font=font, halign="left", valign="top");');
  lines.push('  translate([key_w/2 - 2, key_h/2 - 3, plate_h])');
  lines.push('    linear_extrude(secondary_layers * layer_h)');
  lines.push('      text(top_right, size=secondary_font_size, font=font, halign="right", valign="top");');
  lines.push('  translate([key_w/2 - 2, -(key_h/2 - 3), plate_h])');
  lines.push('    linear_extrude(secondary_layers * layer_h)');
  lines.push('      text(bottom_right, size=secondary_font_size, font=font, halign="right", valign="bottom");');
  lines.push('}');
  lines.push('');

  // ── Plate
  lines.push('// === Plate ===');
  const { layerNames, keys } = keymapData;
  // Layer indices: 0=base, 1=top-left, 2=top-right, 3=bottom-right
  const [l0, l1, l2, l3] = layerNames;

  for (const key of keys) {
    if (key.empty) continue;
    const x = key.col * (kw + gap);
    const y = -(key.row * (kh + gap));
    const primary     = scadStr(key.layers[l0] || '');
    const topLeft     = scadStr(key.layers[l1] || '');
    const topRight    = scadStr(key.layers[l2] || '');
    const bottomRight = scadStr(key.layers[l3] || '');
    lines.push(`translate([${x}, ${y}, 0]) key_cap("${primary}", "${topLeft}", "${topRight}", "${bottomRight}");`);
  }

  return lines.join('\n') + '\n';
}

// CLI entry point
if (require.main === module) {
  const configPath  = path.resolve('config.json');
  const keymapPath  = path.resolve('keymap.json');
  const outputPath  = path.resolve('output.scad');
  const config      = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const keymapData  = JSON.parse(fs.readFileSync(keymapPath, 'utf8'));
  const scad        = buildScad(keymapData, config);
  fs.writeFileSync(outputPath, scad);
  console.log(`Written to ${outputPath}`);
}

module.exports = { buildScad };
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
node --test tests/generate.test.js
```
Expected: all 11 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/generate.js tests/generate.test.js
git commit -m "feat: OpenSCAD generator (stage 2)"
```

---

## Task 7: End-to-End Smoke Test

**Files:**
- No new files — runs the full pipeline against `olik.keymap`

- [ ] **Step 1: Run the full pipeline**

```bash
node src/parse.js olik.keymap && node src/generate.js
```
Expected:
```
Written to .../keymap.json
Written to .../output.scad
```

- [ ] **Step 2: Verify output.scad is valid by inspecting key stats**

```bash
grep -c "key_cap(" output.scad
```
Expected: a number between 40 and 55 (non-empty keys). Exact count depends on how many `&trans`/`&none` cells are omitted.

- [ ] **Step 3: Verify the filament swap comment is present**

```bash
grep "Filament swap" output.scad
```
Expected:
```
// Filament swap at: 0.44mm  (plate_h + secondary_layers * layer_h / 2)
```

- [ ] **Step 4: Open `output.scad` in OpenSCAD and confirm it renders without errors**

Open OpenSCAD, File → Open → `output.scad`. Press F6 (render).
Expected: a grid of key caps renders with no error messages in the console.

- [ ] **Step 5: Run the full test suite one final time**

```bash
node --test tests/*.test.js
```
Expected: all tests pass.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: end-to-end pipeline complete — parse + generate"
```
