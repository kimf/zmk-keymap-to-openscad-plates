const fs   = require('fs');
const path = require('path');

/**
 * Escape a string for use inside an OpenSCAD string literal.
 */
function scadStr(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r');
}

/**
 * Convert a resolved label to a SCAD argument expression.
 *   "$ic_shf"  → ic_shf          (unquoted variable reference)
 *   "BT0"      → str(ic_bt,"")   (bluetooth icon + empty)
 *   "BT3"      → str(ic_bt," 3") (bluetooth icon + number)
 *   "BT-CLR"   → str(ic_bt," clr")
 *   "hello"    → "hello"          (quoted string literal)
 */
function scadArg(label) {
  if (!label) return '""';
  if (/^\$[a-z_]/i.test(label)) return label.slice(1);
  const btSel = label.match(/^BT(\d)$/);
  if (btSel) {
    const n = btSel[1];
    return n === '0' ? 'str(ic_bt,"")' : `str(ic_bt," ${n}")`;
  }
  if (label === 'BT-CLR') return 'str(ic_bt," clr")';
  if (label === 'BT-ALL') return 'str(ic_bt," clr all")';
  if (label === 'BT\u25c0') return 'str(ic_bt," prv")';
  if (label === 'BT\u25b6') return 'str(ic_bt," nxt")';
  return `"${scadStr(label)}"`;
}

/**
 * Build the full OpenSCAD source string from keymap data and config.
 */
function buildScad(keymapData, config) {
  const { key, legends, colors = {}, icons = {} } = config;
  const kw       = key.width;
  const kh       = key.height;
  const r        = key.radius;
  const ph       = key.plateHeight;
  const gap      = key.gap;
  const halveGap = key.halveGap || 0;

  const {
    primaryDepth, secondaryDepth, thirdDepth,
    primaryFontSize, secondaryFontSize, thirdFontSize,
    font, smallFont, pYOffset = 0,
  } = legends;

  const baseColor   = colors.base   || 'black';
  const legendColor = colors.legend || 'white';
  const accentColor = colors.accent || 'gray';

  const lines = [];

  // ── Parameters
  lines.push('// === Parameters ===');
  lines.push(`key_w               = ${kw};`);
  lines.push(`key_h               = ${kh};`);
  lines.push(`key_radius          = ${r};`);
  lines.push(`plate_h             = ${ph};`);
  lines.push(`font                = "${scadStr(font)}";`);
  lines.push(`small_font          = "${scadStr(smallFont)}";`);
  lines.push('');
  lines.push(`primary_depth       = ${primaryDepth};`);
  lines.push(`secondary_depth     = ${secondaryDepth};`);
  lines.push(`third_depth         = ${thirdDepth};`);
  lines.push('');
  lines.push(`primary_font_size   = ${primaryFontSize};`);
  lines.push(`secondary_font_size = ${secondaryFontSize};`);
  lines.push(`third_font_size     = ${thirdFontSize};`);
  lines.push('');
  lines.push(`p_y_offset          = ${pYOffset};`);
  lines.push('');

  // ── Icon variables
  if (Object.keys(icons).length > 0) {
    lines.push('// --- Icon variables ---');
    for (const [name, value] of Object.entries(icons)) {
      lines.push(`${name.padEnd(10)} = "${scadStr(value)}";`);
    }
    lines.push('');
  }

  // ── MMU export guide
  lines.push('// === MMU export ===');
  lines.push('// Two materials: base plate (black) + legend inserts (white/gray).');
  lines.push('// Export as colored 3MF:');
  lines.push('//   openscad --export-format 3mf -o output.3mf output.scad');
  lines.push('// Open in PrusaSlicer / BambuStudio / OrcaSlicer and assign extruders by color.');
  lines.push('');

  // ── Modules
  lines.push('// === Modules ===');
  lines.push('');
  lines.push('module rounded_rect(w, h, r, height) {');
  lines.push('    translate([-w/2, -h/2, 0])');
  lines.push('    hull() {');
  lines.push('        translate([r,   r,   0]) cylinder(h=height, r=r, $fn=32);');
  lines.push('        translate([w-r, r,   0]) cylinder(h=height, r=r, $fn=32);');
  lines.push('        translate([r,   h-r, 0]) cylinder(h=height, r=r, $fn=32);');
  lines.push('        translate([w-r, h-r, 0]) cylinder(h=height, r=r, $fn=32);');
  lines.push('    }');
  lines.push('}');
  lines.push('');
  lines.push('module key_cap (p, tl, tr, bottom) {');
  lines.push('    offset_val = 1.5;');
  lines.push('');
  lines.push(`    // 1. The Plate (${baseColor})`);
  lines.push(`    color("${baseColor}") difference() {`);
  lines.push('        rounded_rect(key_w, key_h, key_radius, plate_h);');
  lines.push('        translate([0, 0, -0.01]) {');
  lines.push('            // Primary Cutout (with Y-offset)');
  lines.push('            if (p != "") translate([0, p_y_offset, 0])');
  lines.push('                linear_extrude(primary_depth + 0.01)');
  lines.push('                    text(p, size=primary_font_size, font=font, halign="center", valign="center");');
  lines.push('            // Secondary Cutout');
  lines.push('            linear_extrude(secondary_depth + 0.01) {');
  lines.push('                if (tl != "") translate([-(key_w/2-offset_val), key_h/2-offset_val, 0]) text(tl, size=secondary_font_size, font=font, halign="left",  valign="top");');
  lines.push('                if (tr != "") translate([ key_w/2-offset_val,  key_h/2-offset_val, 0]) text(tr, size=secondary_font_size, font=font, halign="right", valign="top");');
  lines.push('            }');
  lines.push('            // Third depth Cutout');
  lines.push('            if (bottom != "") translate([0, -(key_h/2 - offset_val), 0])');
  lines.push('                linear_extrude(third_depth + 0.01)');
  lines.push('                    text(bottom, size=third_font_size, font=small_font, halign="center", valign="bottom");');
  lines.push('        }');
  lines.push('    }');
  lines.push('');
  lines.push(`    // 2. The Legends (${legendColor} & ${accentColor})`);
  lines.push(`    color("${legendColor}") {`);
  lines.push('        if (p != "") translate([0, p_y_offset, 0])');
  lines.push('            linear_extrude(primary_depth)');
  lines.push('                text(p, size=primary_font_size, font=font, halign="center", valign="center");');
  lines.push('        // Secondary Inserts');
  lines.push('        linear_extrude(secondary_depth) {');
  lines.push('            if (tl != "") translate([-(key_w/2-offset_val), key_h/2-offset_val, 0]) text(tl, size=secondary_font_size, font=font, halign="left",  valign="top");');
  lines.push('            if (tr != "") translate([ key_w/2-offset_val,  key_h/2-offset_val, 0]) text(tr, size=secondary_font_size, font=font, halign="right", valign="top");');
  lines.push('        }');
  lines.push('    }');
  lines.push('');
  lines.push(`    // Third depth Insert (${accentColor})`);
  lines.push(`    color("${accentColor}") {`);
  lines.push('        if (bottom != "") translate([0, -(key_h/2 - offset_val+0.5), 0])');
  lines.push('            linear_extrude(third_depth)');
  lines.push('                text(bottom, size=third_font_size, font=small_font, halign="center", valign="bottom");');
  lines.push('    }');
  lines.push('}');
  lines.push('');

  // ── Plate
  lines.push('// === Layout ===');
  lines.push('mirror([1, 0, 0]) {');

  const { layerNames, keys } = keymapData;
  const [l0, l1, l2, l3] = layerNames;

  for (const k of keys) {
    if (k.empty) continue;
    const x      = k.col * (kw + gap) + (k.col >= 6 ? halveGap : 0);
    const y      = -(k.row * (kh + gap));
    const p      = scadArg(k.layers[l0] || '');
    const tl     = scadArg(k.layers[l1] || '');
    const tr     = scadArg(k.layers[l2] || '');
    const bottom = scadArg(k.layers[l3] || '');
    lines.push(`    translate([${x}, ${y}, 0]) key_cap(${p}, ${tl}, ${tr}, ${bottom});`);
  }

  lines.push('}');
  return lines.join('\n') + '\n';
}

// CLI entry point
if (require.main === module) {
  const configPath  = path.resolve('config.json');
  const keymapPath  = path.resolve('keymap.json');
  const outputPath  = path.resolve('output.scad');
  try {
    const config     = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const keymapData = JSON.parse(fs.readFileSync(keymapPath, 'utf8'));
    const scad       = buildScad(keymapData, config);
    fs.writeFileSync(outputPath, scad);
    console.log(`Written to ${outputPath}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { buildScad, scadArg };
