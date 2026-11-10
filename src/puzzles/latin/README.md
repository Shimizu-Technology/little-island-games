# Latin family (G3)

Sudoku, Cage Math, Greater-Than Grid, Skyline and Cage Sudoku share one rules core.

- `core.ts`: puzzle shape, validation, public-rule conflicts and the compact pack tuple (cage puzzles store one cage letter per cell plus a totals string).
- `solver.ts`: the simplest-first grader over named human techniques (`techniques`), fast propagation, the solution counter, and `planHint`. A hint reasons only from the givens and numbers on the board; it clears a visible clash first, then an entry the givens' logic cannot keep.
- `independent.ts`: a second counter written apart from the grader, for certification.
- `adapter.ts`: the puzzle-kit binding and semantic keys (rule-keeping symmetries and digit renaming for Sudoku; mirrors and turns for the rest).
- `registration.tsx`: `defineLatinGame`, a Cove registration over packed banks with an exact checkpoint codec (packed board, notes, selection, bounded undo; help and reset audit). It fills the same `PackedChallenge` seam as Slip Tide.
- `LatinBoard.tsx`, `clues.tsx`, `teach.ts`: the board on the shared grid shell, clue layers, and hint wording.
- `rungs.ts`: the ladder each game presents. One rung is one packed bank.

Banks are baked with `node --import ./scripts/puzzles/register.mjs scripts/puzzles/latin/bake.ts <family>`, which certifies a pool, spreads each rung from gentle to hard and publishes through the kit's `bakeFamily` into G3's reserved slots (40–59). Then run `scripts/puzzles/latin/facts.ts`, `scripts/puzzles/latin/save-catalog.ts` and `npm run registry:generate`. `scripts/puzzles/latin/reference-grader.ts` is the independent Sudoku grader used for the frozen corpus in `tests/fixtures/latin-sudoku-corpus.json`.

Packs are immutable once published. Changing grader output or the pack tuple breaks verification of shipped packs.
