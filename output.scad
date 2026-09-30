// === Parameters ===
key_w               = 14.7;
key_h               = 14.7;
key_radius          = 2;
plate_h             = 0.4;
primary_font        = "Staatliches:style=Regular";
font                = "Hack Nerd Font Mono:style=Bold";
small_font          = "Hack Nerd Font";

primary_depth       = 0.4;
secondary_depth     = 0.2;
third_depth         = 0.1;

primary_font_size   = 5.5;
secondary_font_size = 3.5;
third_font_size     = 2.3;

p_y_offset          = 0;

alt_shift_key_w               = 16;
alt_shift_key_h               = 21.8;

// --- Icon variables ---
ic_bt      = ""; // nf-fa-bluetooth_b — simple B shape
ic_mute    = ""; // nf-fa-volume_off
ic_v_dn    = ""; // nf-fa-volume_down
ic_v_up    = ""; // nf-fa-volume_up
ic_play    = ""; // nf-fa-play
ic_prev    = ""; // nf-fa-step_backward
ic_next    = ""; // nf-fa-step_forward
ic_back    = "󰁮"; // nf-md-backspace
ic_del     = "󰹾"; // nf-md-backspace_reverse (forward delete)
ic_ent     = "󰌑"; // nf-md-keyboard_return
ic_tab     = "󰌒"; // nf-md-keyboard_tab
ic_shf     = "󰘶"; // nf-md-apple_keyboard_shift
ic_cmd     = "󰘳"; // nf-md-apple_keyboard_command
ic_opt     = "󰘵"; // nf-md-apple_keyboard_option
ic_ctl     = "󰘴"; // nf-md-apple_keyboard_control
ic_spc     = "―"; // horizontal bar
ic_pgu     = "⇑"; // ⇑ upwards double arrow
ic_pgd     = "⇓"; // ⇓ downwards double arrow
ic_home    = "↖"; // ↖
ic_end     = "↘"; // ↘
ic_raise   = "󰹍"; // nf-md-layers_plus
ic_lower   = "󰹌"; // nf-md-layers_minus

// === MMU export ===
// Two materials: base plate (black) + legend inserts (white/gray).
// Export as colored 3MF:
//   openscad --export-format 3mf -o output.3mf output.scad
// Open in PrusaSlicer / BambuStudio / OrcaSlicer and assign extruders by color.

// === Modules ===

module rounded_rect(w, h, r, height) {
    c_bot = 0.4;  // Bottom chamfer
    c_top = 0.1;  // Top chamfer

    // We use hull to connect four layers of corner cylinders
    translate([-w/2, -h/2, 0])
    hull() {
        // LAYER 1: The very bottom face (shrunk by c_bot)
        corners(0, r - c_bot, w, h, r);
        
        // LAYER 2: The end of the bottom chamfer (full radius r)
        corners(c_bot, r, w, h, r);
        
        // LAYER 3: The start of the top chamfer (full radius r)
        corners(height - c_top, r, w, h, r);
        
        // LAYER 4: The very top face (shrunk by c_top)
        corners(height, r - c_top, w, h, r);
    }
}

// Helper module to keep the code clean and avoid repeating the 4 translates
module corners(z, current_r, w, h, base_r) {
    // We stay centered on the original radius centers to keep the sides vertical
    // but we change the radius of the cylinders to create the chamfer slope.
    translate([base_r, base_r, z]) cylinder(h=0.01, r=current_r, $fn=32);
    translate([w-base_r, base_r, z]) cylinder(h=0.01, r=current_r, $fn=32);
    translate([base_r, h-base_r, z]) cylinder(h=0.01, r=current_r, $fn=32);
    translate([w-base_r, h-base_r, z]) cylinder(h=0.01, r=current_r, $fn=32);
}

// p_font defaults to primary_font (Staatliches); pass font for icon/arrow primaries.
// use_large: renders with alt_shift_key_w/h; shifts primary down so top margin
//            matches a standard key (extra half-height pushed to bottom).
module key_cap (p, tl, tc, tr, bottom, p_font=primary_font, use_large=false, p_extra_y=0, p_depth=primary_depth) {
    offset_val = 1.5;
    eff_w      = use_large ? alt_shift_key_w : key_w;
    eff_h      = use_large ? alt_shift_key_h : key_h;
    p_y_adj    = p_y_offset + p_extra_y;

    // 1. The Plate (black)
    color("black") difference() {
        rounded_rect(eff_w, eff_h, key_radius, plate_h);
        translate([0, 0, -0.01]) {
            // Primary Cutout
            if (p != "") translate([0, p_y_adj, 0])
                linear_extrude(p_depth + 0.01)
                    text(p, size=primary_font_size, font=p_font, halign="center", valign="center");
            // Secondary Cutout (tl, tc, tr share same depth)
            linear_extrude(secondary_depth + 0.01) {
                if (tl != "") translate([-(eff_w/2-offset_val), eff_h/2-offset_val, 0]) text(tl, size=secondary_font_size, font=font, halign="left",   valign="top");
                if (tc != "") translate([0,                      eff_h/2-offset_val, 0]) text(tc, size=secondary_font_size, font=font, halign="center", valign="top");
                if (tr != "") translate([ eff_w/2-offset_val,   eff_h/2-offset_val, 0]) text(tr, size=secondary_font_size, font=font, halign="right",  valign="top");
            }
            // Bottom label Cutout
   
        }
    }

    // 2. The Legends (white / silver when faded)
    color(p_depth < primary_depth ? "silver" : "white") {
        if (p != "") translate([0, p_y_adj, 0])
            linear_extrude(p_depth)
                text(p, size=primary_font_size, font=p_font, halign="center", valign="center");
        linear_extrude(secondary_depth) {
            if (tl != "") translate([-(eff_w/2-offset_val), eff_h/2-offset_val, 0]) text(tl, size=secondary_font_size, font=font, halign="left",   valign="top");
            if (tc != "") translate([0,                      eff_h/2-offset_val, 0]) text(tc, size=secondary_font_size, font=font, halign="center", valign="top");
            if (tr != "") translate([ eff_w/2-offset_val,   eff_h/2-offset_val, 0]) text(tr, size=secondary_font_size, font=font, halign="right",  valign="top");
        }
    }

 
}

// === Layout ===
mirror([1, 0, 0]) {
    // Row 0
    translate([0,   0, 0]) key_cap("ESC",   "",    "",      "",   "");
    translate([17,  0, 0]) key_cap("Q",     "",    "",      "",   str(ic_bt,""));
    translate([34,  0, 0]) key_cap("W",     "",    "",      "",   str(ic_bt,""));
    translate([51,  0, 0]) key_cap("E",     "",    "",      "1",  str(ic_bt,""));
    translate([68,  0, 0]) key_cap("R",     "\"",  "",      "2",  str(ic_bt,""));
    translate([85,  0, 0]) key_cap("T",     "'",   "",      "3",  str(ic_bt,""));
    translate([122, 0, 0]) key_cap("Y",     "!",   "",      "",   ic_prev);
    translate([139, 0, 0]) key_cap("U",     "&",   "",      "",   ic_play);
    translate([156, 0, 0]) key_cap("I",     "$",   "",      "€",  ic_next);
    translate([173, 0, 0]) key_cap("O",     "/",   "",      "\\", ic_mute);
    translate([190, 0, 0]) key_cap("P",     "|",   "",      "°",  ic_v_dn);
    translate([207, 0, 0]) key_cap(ic_back, ic_del,"",      "",   ic_v_up, font);
    // Row -17
    translate([0,   -19.7, 0]) key_cap(ic_tab, "",  "",      "",   "",                    font, true);
    translate([17,  -17, 0]) key_cap("A",    "<",  "",      "",   "");
    translate([34,  -17, 0]) key_cap("S",    ">",  "",      "",   "");
    translate([51,  -17, 0]) key_cap("D",    "}",  "",      "4",  "");
    translate([68,  -17, 0]) key_cap("F",    "]",  "",      "5",  "");
    translate([85,  -17, 0]) key_cap("G",    ")",  "",      "6",  "");
    translate([122, -17, 0]) key_cap("H",    "(",  "",      "",   "");
    translate([139, -17, 0]) key_cap("J",    "[",  "",      "",   "");
    translate([156, -17, 0]) key_cap("K",    "{",  "",      "*",  "");
    translate([173, -17, 0]) key_cap("L",    "+",  "",      "",   "");
    translate([190, -17, 0]) key_cap("Ö",    "#",  "",      "",   "");
    translate([207, -17, 0]) key_cap("Ä",    "?",  "",      "",   "");
    // Row -34
    translate([17,  -34, 0]) key_cap("Z",   "",    "",      "",   "");
    translate([34,  -34, 0]) key_cap("X",   "",    "",      "0",  "");
    translate([51,  -34, 0]) key_cap("C",   "´",   "",      "7",  "");
    translate([68,  -34, 0]) key_cap("V",   "^",   "",      "8",  "");
    translate([85,  -34, 0]) key_cap("B",   "@",   "",      "9",  "caps");
    translate([122, -34, 0]) key_cap("N",   "~",   "",      "%",  "space");
    translate([139, -34, 0]) key_cap("M",   "=",   "",      "",   "");
    translate([156, -34, 0]) key_cap(",",   "",    ";",     "",   "",   primary_font, false, -1);
    translate([173, -34, 0]) key_cap(".",   "",    ":",     "",   "",   primary_font, false, -1);
    translate([190, -34, 0]) key_cap("↑",   ic_pgu,"",      "",   "",   font);
    translate([207, -34, 0]) key_cap("-",   "–",   "_",     "—",  "",   primary_font, false, -1);
    // Row -51
    translate([0,   -51, 0]) key_cap(ic_shf,"",    "",      "",   "",                    font, true);
    translate([17,  -51, 0]) key_cap(ic_ctl,    "",    "",   "",   str(ic_bt," clr"),   font);
    translate([34,  -51, 0]) key_cap("§",   "",    "°",     "",   str(ic_bt," c all"), primary_font, false, -1);
    translate([173, -51, 0]) key_cap("←",   ic_home,"",     "",   str(ic_bt," prv"),     font);
    translate([190, -51, 0]) key_cap("↓",   ic_pgd,"",      "",   "",                    font);
    translate([207, -51, 0]) key_cap("→",   ic_end, "",     "",   str(ic_bt," nxt"),     font);
    // Row -68
    translate([34,  -68, 0]) key_cap(ic_opt,   "",    "",   "",   "",                  font);
    translate([51,  -68, 0]) key_cap(ic_cmd,   "",    "",   "",   "",                  font);
    translate([68,  -68, 0]) key_cap(ic_lower, "", "",   "",   "",                    font, false, 0, secondary_depth);
    translate([122, -68, 0]) key_cap(ic_raise, "", "",   "",   "",                    font, false, 0, secondary_depth);
    translate([139, -68, 0]) key_cap(ic_ent,"",    "",      "",   "",                    font);
    translate([156, -68, 0]) key_cap(ic_ctl,    "",    "",   "",   "",                  font);
}
