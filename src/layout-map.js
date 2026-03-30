const ROWS = 5;
const COLS = 12;

/**
 * Number of bindings emitted per row in the flat binding array of each layer.
 * Row 1 has 13 because the encoder occupies an extra slot (index 6) between
 * the left and right halves.
 *
 * parse.js uses this to split the flat per-layer binding array into row slices
 * before applying per-row bindingIndex values.
 */
const BINDINGS_PER_ROW = [12, 13, 11, 6, 6];

/**
 * Returns an array of 5 rows, each an array of 12 cell descriptors:
 *   { col, row, empty, bindingIndex }
 *
 * bindingIndex is the 0-based index into that row's own binding slice.
 * empty: true means no physical key at this grid cell.
 *
 * Layout reference (Zone B):
 *   Row 0: ESC Q W E R T  |  Y U I O P BSPC    (12 bindings, cols 0-11)
 *   Row 1: TAB A S D F G  [encoder]  H J K L Ö Ä  (13 bindings; encoder at index 6 is skipped)
 *   Row 2: _ Z X C V B    |  N M , . ↑ -        (11 bindings, col 0 empty)
 *   Row 3: SHF CTL '  _ _ _ _ _ _  ← ↓ →       (6 bindings, cols 0-2 + 9-11)
 *   Row 4: _ _ ALT CMD SPC  _  SPC ENT CTL _ _  (6 bindings, cols 2-4 + 6-8)
 */
function getRowZones() {
  const rows = [];

  // ── Row 0: 12 keys, cols 0–11, binding indices 0–11
  rows.push(Array.from({ length: 12 }, (_, i) => ({
    row: 0, col: i, empty: false, bindingIndex: i,
  })));

  // ── Row 1: 13 bindings in the flat array. Index 6 is the encoder — skip it.
  //           Left half: cols 0-5 → indices 0-5; right half: cols 6-11 → indices 7-12.
  {
    const row = [];
    for (let c = 0; c < 6; c++)  row.push({ row: 1, col: c, empty: false, bindingIndex: c });
    for (let c = 6; c < 12; c++) row.push({ row: 1, col: c, empty: false, bindingIndex: c + 1 }); // +1 skips encoder slot
    rows.push(row);
  }

  // ── Row 2: col 0 empty; 11 bindings fill cols 1–11 (indices 0–10)
  {
    const row = [{ row: 2, col: 0, empty: true, bindingIndex: null }];
    for (let i = 0; i < 11; i++) {
      row.push({ row: 2, col: i + 1, empty: false, bindingIndex: i });
    }
    rows.push(row);
  }

  // ── Row 3: 6 bindings → cols 0-2 (indices 0-2) and cols 9-11 (indices 3-5)
  //           cols 3-8 are empty
  {
    const row = [];
    for (let c = 0; c < 12; c++) {
      if (c <= 2)      row.push({ row: 3, col: c, empty: false, bindingIndex: c });
      else if (c <= 8) row.push({ row: 3, col: c, empty: true,  bindingIndex: null });
      else             row.push({ row: 3, col: c, empty: false, bindingIndex: c - 6 });
    }
    rows.push(row);
  }

  // ── Row 4: 6 bindings → cols 2-4 (indices 0-2) and cols 6-8 (indices 3-5)
  //           cols 0-1, 5, 9-11 are empty
  {
    const OCCUPIED = new Map([[2,0],[3,1],[4,2],[6,3],[7,4],[8,5]]);
    const row = Array.from({ length: 12 }, (_, c) => {
      const bi = OCCUPIED.get(c);
      return { row: 4, col: c, empty: bi === undefined, bindingIndex: bi ?? null };
    });
    rows.push(row);
  }

  return rows;
}

module.exports = { ROWS, COLS, BINDINGS_PER_ROW, getRowZones };
