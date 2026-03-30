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

test('row=3 col=0 (shift_td) has Base label SHF', () => {
  result = result || parseKeymap(KEYMAP);
  const key = result.keys.find(k => k.row === 3 && k.col === 0);
  assert.equal(key.layers['Base'], 'SHF');
});

test('row=3 col=2 (quote_morph) has Base label \'', () => {
  result = result || parseKeymap(KEYMAP);
  const key = result.keys.find(k => k.row === 3 && k.col === 2);
  assert.equal(key.layers['Base'], "'");
});
