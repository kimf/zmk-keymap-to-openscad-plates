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
