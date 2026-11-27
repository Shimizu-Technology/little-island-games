import type { ShellTuple } from "./rules";

/**
 * Phase 4A certified Shell Scale expansion puzzles spanning Levels 1–5.
 * Combined with the 26 catalog-pinned rows in sets.generated.json, this gives
 * 46 distinct certified School puzzles (L1: 6, L2: 8, L3: 10, L4: 10, L5: 12)
 * without mutating the immutable published save-catalog banks (362–365).
 *
 * Every tuple is structurally valid under `tuplePuzzle` / `validPuzzle` and solvable
 * within its level's exact minimax `provenPar` (L1: 1, L2: 3, L3: 5, L4: 2, L5: 7).
 */
export const EXTRA_SHELL_TUPLES: Readonly<Record<number, readonly ShellTuple[]>> = {
  // Level 1: 2 shells (par 1) — +2 tuples -> 6 total
  1: [
    ["s", 2, "03", "10"],
    ["s", 2, "25", "01"],
  ],
  // Level 2: 3 shells (par 3) — +4 tuples covering all remaining 3-shell weight orders -> 8 total
  2: [
    ["s", 3, "024", "102"],
    ["s", 3, "135", "120"],
    ["s", 3, "045", "210"],
    ["s", 3, "015", "012"],
  ],
  // Level 3: 4 shells (par 5) — +4 distinct weight orders & casts -> 10 total
  3: [
    ["s", 4, "0124", "2031"],
    ["s", 4, "1245", "3012"],
    ["s", 4, "0235", "0312"],
    ["s", 4, "0145", "1032"],
  ],
  // Level 4: 9 pearls, 1 heavier (par 2) — +4 distinct heavy positions (2, 3, 8) & themes -> 10 total
  4: [
    ["h", 9, 0, 2],
    ["h", 9, 1, 3],
    ["h", 9, 2, 8],
    ["h", 9, 4, 2],
  ],
  // Level 5: 5 shells (par 7) — +6 distinct weight orders & casts -> 12 total
  5: [
    ["s", 5, "02345", "41302"],
    ["s", 5, "12345", "04231"],
    ["s", 5, "01235", "30412"],
    ["s", 5, "01245", "14023"],
    ["s", 5, "01345", "43120"],
    ["s", 5, "02341", "10432"],
  ],
};

export const EXTRA_SHELL_TOTAL = Object.values(EXTRA_SHELL_TUPLES).reduce((n, list) => n + list.length, 0);
