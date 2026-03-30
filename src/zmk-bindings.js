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
  if (svKeys[name] !== undefined)    return svKeys[name];
  if (overrides[name] !== undefined) return overrides[name];
  // Single letters stay as-is; multi-word names are returned verbatim
  return name;
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
    const raw   = parts[1];                 // only the key token, not any trailing macro refs
    const inner = stripModifiers(raw);
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
    return '';  // unknown BT sub-command — show nothing
  }

  // Named behavior reference (e.g. &shift_td, &quote_morph)
  const behaviorName = head.slice(1); // strip leading &
  if (behaviors[behaviorName]) {
    const b = behaviors[behaviorName];
    return resolveBinding(b.bindings[0], ctx);
  }

  // Named macro reference (e.g. &macro_gmail) — macros don't need a key cap label
  const macroName = head.slice(1);
  if (macros[macroName] !== undefined) return '';

  return '';
}

module.exports = { resolveBinding, resolveKey, stripModifiers };
