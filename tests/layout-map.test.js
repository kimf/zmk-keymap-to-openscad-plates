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
