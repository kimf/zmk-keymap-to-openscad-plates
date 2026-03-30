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
