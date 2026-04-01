// === Parameters ===
key_w               = 16;
key_h               = 16;
key_radius          = 2;
plate_h             = 0.8;
font                = "Staatliches:style=Regular";
small_font          = "Hack Nerd Font Mono";

primary_depth       = 0.4;
secondary_depth     = 0.2;
third_depth         = 0.1;

primary_font_size   = 5.2;
secondary_font_size = 3.1;
third_font_size     = 2;

p_y_offset          = 0;

// --- Icon variables ---
ic_bt      = "";
ic_mute    = "";
ic_v_dn    = "";
ic_v_up    = "";
ic_play    = "";
ic_prev    = "";
ic_next    = "";
ic_back    = "←";
ic_del     = "←";
ic_ent     = "↵";
ic_tab     = "⇥";
ic_shf     = "⇧";
ic_cmd     = "⌘";
ic_opt     = "⌥";
ic_ctl     = "⌃";
ic_spc     = "―";
ic_pgu     = "⇞";
ic_pgd     = "⇟";
ic_home    = "↖";
ic_end     = "↘";

// === MMU export ===
// Two materials: base plate (black) + legend inserts (white/gray).
// Export as colored 3MF:
//   openscad --export-format 3mf -o output.3mf output.scad
// Open in PrusaSlicer / BambuStudio / OrcaSlicer and assign extruders by color.

// === Modules ===

module rounded_rect(w, h, r, height) {
    translate([-w/2, -h/2, 0])
    hull() {
        translate([r,   r,   0]) cylinder(h=height, r=r, $fn=32);
        translate([w-r, r,   0]) cylinder(h=height, r=r, $fn=32);
        translate([r,   h-r, 0]) cylinder(h=height, r=r, $fn=32);
        translate([w-r, h-r, 0]) cylinder(h=height, r=r, $fn=32);
    }
}

module key_cap (p, tl, tr, bottom) {
    offset_val = 1.5;

    // 1. The Plate (black)
    color("black") difference() {
        rounded_rect(key_w, key_h, key_radius, plate_h);
        translate([0, 0, -0.01]) {
            // Primary Cutout (with Y-offset)
            if (p != "") translate([0, p_y_offset, 0])
                linear_extrude(primary_depth + 0.01)
                    text(p, size=primary_font_size, font=font, halign="center", valign="center");
            // Secondary Cutout
            linear_extrude(secondary_depth + 0.01) {
                if (tl != "") translate([-(key_w/2-offset_val), key_h/2-offset_val, 0]) text(tl, size=secondary_font_size, font=font, halign="left",  valign="top");
                if (tr != "") translate([ key_w/2-offset_val,  key_h/2-offset_val, 0]) text(tr, size=secondary_font_size, font=font, halign="right", valign="top");
            }
            // Third depth Cutout
            if (bottom != "") translate([0, -(key_h/2 - offset_val), 0])
                linear_extrude(third_depth + 0.01)
                    text(bottom, size=third_font_size, font=small_font, halign="center", valign="bottom");
        }
    }

    // 2. The Legends (white & gray)
    color("white") {
        if (p != "") translate([0, p_y_offset, 0])
            linear_extrude(primary_depth)
                text(p, size=primary_font_size, font=font, halign="center", valign="center");
        // Secondary Inserts
        linear_extrude(secondary_depth) {
            if (tl != "") translate([-(key_w/2-offset_val), key_h/2-offset_val, 0]) text(tl, size=secondary_font_size, font=font, halign="left",  valign="top");
            if (tr != "") translate([ key_w/2-offset_val,  key_h/2-offset_val, 0]) text(tr, size=secondary_font_size, font=font, halign="right", valign="top");
        }
    }

    // Third depth Insert (gray)
    color("gray") {
        if (bottom != "") translate([0, -(key_h/2 - offset_val+0.5), 0])
            linear_extrude(third_depth)
                text(bottom, size=third_font_size, font=small_font, halign="center", valign="bottom");
    }
}

// === Layout ===
mirror([1, 0, 0]) {
    translate([0, 0, 0]) key_cap("ESC", "", "", "");
    translate([17, 0, 0]) key_cap("Q", "", "", str(ic_bt,""));
    translate([34, 0, 0]) key_cap("W", "", "", str(ic_bt,"1"));
    translate([51, 0, 0]) key_cap("E", "", "1", str(ic_bt,"2"));
    translate([68, 0, 0]) key_cap("R", "", "2", str(ic_bt,"3"));
    translate([85, 0, 0]) key_cap("T", "'", "3", str(ic_bt,"4"));
    translate([122, 0, 0]) key_cap("Y", "!", "", ic_prev);
    translate([139, 0, 0]) key_cap("U", "&", "", ic_play);
    translate([156, 0, 0]) key_cap("I", "$", "", ic_next);
    translate([173, 0, 0]) key_cap("O", "/", "|", ic_mute);
    translate([190, 0, 0]) key_cap("P", "`", "", ic_v_dn);
    translate([207, 0, 0]) key_cap(ic_back, ic_del, ic_del, ic_v_up);
    translate([0, -17, 0]) key_cap(ic_tab, "", "", "");
    translate([17, -17, 0]) key_cap("A", "<", "<", "");
    translate([34, -17, 0]) key_cap("S", ">", ">", "");
    translate([51, -17, 0]) key_cap("D", "}", "4", "");
    translate([68, -17, 0]) key_cap("F", "]", "5", "");
    translate([85, -17, 0]) key_cap("G", ")", "6", "");
    translate([122, -17, 0]) key_cap("H", "(", "", "");
    translate([139, -17, 0]) key_cap("J", "[", "", "");
    translate([156, -17, 0]) key_cap("K", "{", "*", "");
    translate([173, -17, 0]) key_cap("L", "+", "+", "");
    translate([190, -17, 0]) key_cap("Ö", "#", "#", "");
    translate([207, -17, 0]) key_cap("Ä", "?", "?", "");
    translate([17, -34, 0]) key_cap("Z", "", "", "");
    translate([34, -34, 0]) key_cap("X", "", "0", "");
    translate([51, -34, 0]) key_cap("C", "´", "7", "");
    translate([68, -34, 0]) key_cap("V", "^", "8", "");
    translate([85, -34, 0]) key_cap("B", "@", "9", "caps");
    translate([122, -34, 0]) key_cap("N", "~", "%", ic_spc);
    translate([139, -34, 0]) key_cap("M", "=", "=", "");
    translate([156, -34, 0]) key_cap(",", "", "", "");
    translate([173, -34, 0]) key_cap(".", "", "", "");
    translate([190, -34, 0]) key_cap("↑", ic_pgu, "", "");
    translate([207, -34, 0]) key_cap("-", "", "", "");
    translate([0, -51, 0]) key_cap(ic_shf, "", "", "");
    translate([17, -51, 0]) key_cap("CTL", "", "", str(ic_bt," clr"));
    translate([34, -51, 0]) key_cap("'", "$", "§", str(ic_bt," clr all"));
    translate([173, -51, 0]) key_cap("←", ic_home, "", str(ic_bt," prv"));
    translate([190, -51, 0]) key_cap("↓", ic_pgd, "", "");
    translate([207, -51, 0]) key_cap("→", ic_end, "", str(ic_bt," nxt"));
    translate([34, -68, 0]) key_cap("ALT", "", "", "");
    translate([51, -68, 0]) key_cap("CMD", "", "", "");
    translate([68, -68, 0]) key_cap(ic_spc, "", ic_spc, "");
    translate([122, -68, 0]) key_cap(ic_spc, ic_spc, "", "");
    translate([139, -68, 0]) key_cap(ic_ent, "", "", "");
    translate([156, -68, 0]) key_cap("CTL", "", "", "");
}
