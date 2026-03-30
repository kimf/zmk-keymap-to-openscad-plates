const fs   = require('fs');
const path = require('path');

/**
 * Escape a string for use inside an OpenSCAD string literal.
 */
function scadStr(s) {
  return s
    .replace(/\\/g, '\\\\')   // backslash first
    .replace(/"/g, '\\"')      // double quote
    .replace(/\n/g, '\\n')     // newline
    .replace(/\t/g, '\\t')     // tab
    .replace(/\r/g, '\\r');    // carriage return
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
  // Legends start at z=0 (key face on print bed). Swap before secondary legends finish.
  const swapH      = +(secondaryH / 2).toFixed(4);

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
  lines.push(`// Print FACE DOWN (key face on print bed). Start with contrast filament, swap to base colour at:`);
  lines.push(`// Filament swap at: ${swapH}mm  (secondary_layers * layer_h / 2)`);
  lines.push('// At this height:');
  lines.push(`//   Secondary (corner) legends are ~50% printed → faded`);
  lines.push(`//   Primary legends are ~${Math.round((secondaryH / 2 / primaryH) * 100)}% started → predominantly contrast colour`);
  lines.push('// Use your slicer\'s "pause at layer" / "colour change" feature at the swap height above.');
  lines.push('');

  // ── Modules
  lines.push('// === Modules ===');
  lines.push('');
  lines.push('module rounded_rect(w, h, r, height) {');
  lines.push('  translate([-w/2, -h/2, 0])');
  lines.push('  hull() {');
  lines.push('    translate([r,   r,   0]) cylinder(h=height, r=r, $fn=32);');
  lines.push('    translate([w-r, r,   0]) cylinder(h=height, r=r, $fn=32);');
  lines.push('    translate([r,   h-r, 0]) cylinder(h=height, r=r, $fn=32);');
  lines.push('    translate([w-r, h-r, 0]) cylinder(h=height, r=r, $fn=32);');
  lines.push('  }');
  lines.push('}');
  lines.push('');
  lines.push('module key_cap (primary, top_left, top_right, bottom_right) {');
  lines.push('  // Base plate — printed face down; legends start at z=0 (key face on print bed)');
  lines.push('  rounded_rect(key_w, key_h, key_radius, plate_h);');
  lines.push('  // Primary legend — centered, tall (contrast colour, at key face)');
  lines.push('  linear_extrude(primary_layers * layer_h)');
  lines.push('    text(primary, size=primary_font_size, font=font, halign="center", valign="center");');
  lines.push('  // Corner legends — small, short (faded, at key face)');
  lines.push('  translate([-(key_w/2 - 2), key_h/2 - 3, 0])');
  lines.push('    linear_extrude(secondary_layers * layer_h)');
  lines.push('      text(top_left, size=secondary_font_size, font=font, halign="left", valign="top");');
  lines.push('  translate([key_w/2 - 2, key_h/2 - 3, 0])');
  lines.push('    linear_extrude(secondary_layers * layer_h)');
  lines.push('      text(top_right, size=secondary_font_size, font=font, halign="right", valign="top");');
  lines.push('  translate([key_w/2 - 2, -(key_h/2 - 3), 0])');
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
  try {
    const config      = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const keymapData  = JSON.parse(fs.readFileSync(keymapPath, 'utf8'));
    const scad        = buildScad(keymapData, config);
    fs.writeFileSync(outputPath, scad);
    console.log(`Written to ${outputPath}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { buildScad };
