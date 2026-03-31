const { strict: assert } = require('assert');
const { test } = require('node:test');
const { buildScad, scadArg } = require('../src/generate');

const config = {
  key:     { width: 16, height: 16, radius: 2, plateHeight: 0.8, gap: 1 },
  legends: {
    primaryDepth: 0.4, secondaryDepth: 0.2, thirdDepth: 0.1,
    primaryFontSize: 5.2, secondaryFontSize: 3.1, thirdFontSize: 2.0,
    font: 'Hack Nerd Font Mono:style=Bold', smallFont: 'Hack Nerd Font',
    pYOffset: 0,
  },
  colors:  { base: 'black', legend: 'white', accent: 'gray' },
  icons:   {},
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
  assert.ok(/key_w\s*=\s*16/.test(scad), 'should set key_w = 16');
});

test('output contains MMU export comment', () => {
  scad = scad || buildScad(keymapData, config);
  assert.ok(scad.includes('MMU export'), 'should include MMU export section');
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
  assert.ok(!scad.includes('module key_legend'), 'key_legend should not appear');
});

test('key_cap module uses difference() for plate cutouts', () => {
  scad = scad || buildScad(keymapData, config);
  assert.ok(scad.includes('difference()'), 'plate should use difference() to carve legends');
});

test('layout is wrapped in mirror([1, 0, 0])', () => {
  scad = scad || buildScad(keymapData, config);
  assert.ok(scad.includes('mirror([1, 0, 0])'), 'layout must be mirrored for face-down printing');
});

test('output contains translate for key at col=0', () => {
  scad = scad || buildScad(keymapData, config);
  assert.ok(scad.includes('translate([0,'), 'col 0 translate at x=0');
});

test('output contains translate for key at col=1 (x = key_w + gap = 17)', () => {
  scad = scad || buildScad(keymapData, config);
  assert.ok(scad.includes('translate([17,'), 'col 1 translate at x=17');
});

test('right-half key (col >= 6) is offset by halveGap', () => {
  const data = {
    layerNames: ['Base'],
    grid: { rows: 1, cols: 12 },
    keys: [
      { row: 0, col: 5, empty: false, layers: { Base: 'L' } },
      { row: 0, col: 6, empty: false, layers: { Base: 'R' } },
    ],
  };
  const cfg = { ...config, key: { ...config.key, halveGap: 20 } };
  const s = buildScad(data, cfg);
  assert.ok(s.includes('translate([85,'),  'left half col 5 at x=85');
  assert.ok(s.includes('translate([122,'), 'right half col 6 at x = 6*17 + 20 = 122');
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

test('missing layer keys render as empty strings', () => {
  const data = {
    layerNames: ['Base', 'Shift', 'Alt', 'Ctrl'],
    grid: { rows: 1, cols: 1 },
    keys: [{ row: 0, col: 0, empty: false, layers: { Base: 'Q' } }],
  };
  const s = buildScad(data, config);
  assert.ok(s.includes('key_cap("Q", "", "", "")'), 'missing layers should render as empty strings');
});

// ── scadArg unit tests
test('scadArg: empty string → ""', () => assert.equal(scadArg(''), '""'));
test('scadArg: plain text → quoted string', () => assert.equal(scadArg('A'), '"A"'));
test('scadArg: $ symbol (not a varref) → quoted string', () => assert.equal(scadArg('$'), '"$"'));
test('scadArg: $varname → unquoted variable ref', () => assert.equal(scadArg('$ic_shf'), 'ic_shf'));
test('scadArg: BT0 → str(ic_bt,"")', () => assert.equal(scadArg('BT0'), 'str(ic_bt,"")'));
test('scadArg: BT3 → str with number', () => assert.equal(scadArg('BT3'), 'str(ic_bt," 3")'));
test('scadArg: BT-CLR → str clr expr', () => assert.equal(scadArg('BT-CLR'), 'str(ic_bt," clr")'));
test('scadArg: BT◀ → str prv expr', () => assert.equal(scadArg('BT\u25c0'), 'str(ic_bt," prv")'));
