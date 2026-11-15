# Edge family (G5): Bridges, and the shared board plumbing

Bridges, Loop and Pearl Loop share one saved-board model and one packed Cove registration.

- `core.ts`: Bridges rules. Islands, the links between islands that see each other, which links cross, and the solved check (every number met, no crossing, one connected map). Pack tuple: `[width, height, clues]`, one character per cell.
- `solver.ts`: the simplest-first Bridges grader over named techniques (`full`, `must-reach`, `isolation`, `way-out`, `what-if`, `chain`; `tidy` is bookkeeping and never sets a rung), the bound-propagating search that counts answers, and `planHint`. A hint fixes a visible rule break first, then a bridge the answer cannot keep, then gives the next certain bridge and the idea that proves it.
- `independent.ts`: a second counter written apart from the grader (islands in reading order, exact numbers, water-cell crossing flags, connection at the end).
- `adapter.ts`: the puzzle-kit binding and semantic keys (turns, mirrors, and portrait/landscape forms of one map are one puzzle).
- `marks.ts`: the saved board for all three games. One mark per place, whole-stroke undo and redo inside a byte budget (the board is never trimmed), a help/reset audit. `stepMarks` is the one reducer the board, the engine and Show me all use.
- `registration.tsx`: `defineEdgeGame`, a Cove registration over packed banks with an exact checkpoint codec. It fills the same `PackedChallenge` seam as the Latin family and adds `describe` for the band browser.
- `BridgesBoard.tsx`, `teach.ts`: the board (drag from an island toward a neighbour, tap the water between two islands, or tap two islands; 0 → 1 → 2 → 0; a bridge that would cross another is refused, shown in red and named) and the hint words.
- `rungs.ts`: the Bridges ladder. One rung is one packed bank.

Banks: `node --import ./scripts/puzzles/register.mjs scripts/puzzles/edges/bake.ts <bridges|loop|pearl-loop>`, each claiming its own run from its base (`--range first-last` claims a free tail such as 77–79; see `docs/PUZZLE_BANKS.md` "Slot allocation"). Then `scripts/puzzles/edges/facts.ts`, `scripts/puzzles/edges/save-catalog.ts` and `npm run registry:generate`. G5 owns banks 60–79; no dares.

Packs are immutable once published: changing grader output or a pack tuple breaks verification of shipped packs.
