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
