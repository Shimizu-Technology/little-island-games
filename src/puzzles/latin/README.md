# Latin family (G3)

Sudoku, Cage Math, Greater-Than Grid, Skyline and Cage Sudoku share one rules core.

- `core.ts`: puzzle shape, validation, public-rule conflicts and the compact pack tuple (cage puzzles store one cage letter per cell plus a totals string).
- `solver.ts`: the simplest-first grader over named human techniques (`techniques`), fast propagation, the solution counter, and `planHint`. A hint reasons only from the givens and numbers on the board; it clears a visible clash first, then an entry the givens' logic cannot keep.
- `independent.ts`: a second counter written apart from the grader, for certification.
- `adapter.ts`: the puzzle-kit binding and semantic keys (rule-keeping symmetries and digit renaming for Sudoku; mirrors and turns for the rest).
- `registration.tsx`: `defineLatinGame`, a Cove registration over packed banks with an exact checkpoint codec (packed board, notes, selection, bounded undo; help and reset audit). It fills the same `PackedChallenge` seam as Slip Tide.
- `LatinBoard.tsx`, `clues.tsx`, `teach.ts`: the board on the shared grid shell, clue layers, and hint wording.
- `rungs.ts`: the ladder each game presents. One rung is one packed bank.

Banks are baked with `node --import ./scripts/puzzles/register.mjs scripts/puzzles/latin/bake.ts <family>`, which certifies a pool, arranges each rung gentle to hard in the exact order the kit's `bakeFamily` will publish it, and publishes into G3's reserved slots (40–59: Sudoku 40–47, Cage Math 48–52, Greater-Than 53–55, Skyline 56–57, Cage Sudoku 58–59; Cross Sums has none). Then run `scripts/puzzles/latin/facts.ts`, `scripts/puzzles/latin/save-catalog.ts` and `npm run registry:generate`. `scripts/puzzles/latin/reference-grader.ts` is the independent Sudoku grader used for the frozen corpus in `tests/fixtures/latin-sudoku-corpus.json`.

Rules the banks keep, all tested on the decoded packs (`tests/latin-banks.test.ts`):
- **Technique ceilings by tier** (`rungs.ts`): tiers 1–3 need only one number left, only one place and the game's own clue rule; tier 4 may also need pointing and claiming; tier 5 pairs and triples; tier 6 anything. Every row finishes under its rung's ceiling.
- **Order inside a rung:** no puzzle is easier than the hardest before it by more than 5% of the rung's workload span or half a workload point, whichever is larger (`STEP_BACK`, `STEP_SLACK` in `bake.ts`). There are no rest beats.
- **Order across rungs:** tiers rise; on the same board size the window and the median workload never go back; a bigger board may restart at the simplest ideas, and its summary says so.
- **Distinct supply:** the Sudoku semantic key covers the whole rule-keeping class (band, stack, row-in-band and column-in-stack orders, transposition, digit renaming).

Packs are immutable once a published ref (`origin/program/4.0` or `origin/main`) holds them. Until then a slice branch may re-bake its own families in place: `scripts/puzzles/latin/unpublish.ts <family…>` removes them from the working catalog (and refuses a published family), and `scripts/puzzles/history.ts` checks only generations a published ref contains. Changing grader output or the pack tuple breaks verification of shipped packs.
