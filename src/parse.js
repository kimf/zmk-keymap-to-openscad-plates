const fs   = require('fs');
const path = require('path');
const { resolveBinding } = require('./zmk-bindings');
const { ROWS, COLS, BINDINGS_PER_ROW, getRowZones } = require('./layout-map');

/**
 * Extract the inner content of the keymap { ... } block from a .keymap file.
 * Skips // line comments so brace characters in comments don't skew depth.
 * Returns only the content between the outer braces (not the 'keymap { }' wrapper).
 */
function extractKeymapBlock(src) {
  const start = src.indexOf('keymap {');
  if (start === -1) throw new Error('No keymap { block found');
  let depth = 0, i = start;
  let blockStart = -1;
  while (i < src.length) {
    // Skip // line comments
    if (src[i] === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (src[i] === '{') {
      depth++;
      if (depth === 1) blockStart = i + 1; // content starts after the opening brace
    } else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(blockStart, i); // return inner content only
    }
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
  // Extract the behaviors { } block using brace depth (same approach as extractKeymapBlock)
  const start = src.indexOf('behaviors {');
  if (start === -1) return behaviors;
  let depth = 0, i = start;
  let inLineComment = false;
  while (i < src.length) {
    if (!inLineComment && src[i] === '/' && src[i + 1] === '/') { inLineComment = true; i++; continue; }
    if (inLineComment && src[i] === '\n') { inLineComment = false; i++; continue; }
    if (!inLineComment) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (depth === 0) break; }
    }
    i++;
  }
  const block = src.slice(start, i + 1);

  // Each behavior sub-block: name: alias { ... } — constrained to one brace level ([^{}]*)
  const tdRe = /(\w+):\s*\w+\s*\{[^{}]*?compatible\s*=\s*"zmk,behavior-tap-dance"[^{}]*?bindings\s*=\s*<([\s\S]*?)>;/g;
  let m;
  while ((m = tdRe.exec(block))) {
    behaviors[m[1]] = {
      type: 'tap-dance',
      bindings: m[2].replace(/\n/g, ' ').trim()
        .split(/[>,]\s*<?\s*/)          // split on ">, <" or "," separators
        .map(s => s.replace(/^[<\s]+|[>\s]+$/g, '').trim())  // strip < > and whitespace
        .filter(Boolean),
    };
  }

  const mmRe = /(\w+):\s*\w+\s*\{[^{}]*?compatible\s*=\s*"zmk,behavior-mod-morph"[^{}]*?bindings\s*=\s*<([\s\S]*?)>;/g;
  while ((m = mmRe.exec(block))) {
    behaviors[m[1]] = {
      type: 'mod-morph',
      bindings: m[2].replace(/\n/g, ' ').trim()
        .split(/[>,]\s*<?\s*/)
        .map(s => s.replace(/^[<\s]+|[>\s]+$/g, '').trim())
        .filter(Boolean),
    };
  }

  return behaviors;
}

/**
 * Extract macros and their output labels from their comment (/* Outputs: "…" *\/)
 * In olik.keymap the Outputs comment appears BEFORE `compatible` inside the block.
 * Capture order: node name first, then the Outputs comment, then compatible.
 * Returns { macroName: label }
 */
function extractMacros(src) {
  const macros = {};
  // In olik.keymap the Outputs comment appears BEFORE compatible inside the block.
  // Pattern: nodeName: alias { /* Outputs: "..." */ ... compatible = "zmk,behavior-macro" ... }
  const re = /(\w+):\s*\w+\s*\{[^{}]*?\/\*\s*Outputs:\s*"([^"]+)"\s*\*\/[^{}]*?compatible\s*=\s*"zmk,behavior-macro"/g;
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
  // extractNamedBlocks only captures name { } blocks — the compatible property line is not a block
  const layerEntries = Object.entries(layerBlocks);

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
