# Starter Crosswords

Crossword is an offline puzzle for one solver or two readers sharing a device. The starter set has twelve boards at each difficulty, with 5×5 Easy, 7×7 Medium, 9×9 Hard, and 11×11 Expert grids. Every open square belongs to two real answers. Clue numbers follow the usual row-by-row convention, with one number for a square that starts both directions. The shipped fills were checked against the public picture allowlist where applicable and the remaining answers were reviewed with both clue readings.

## Register the family

Use `src/puzzles/crossword/index.ts` as the wiring entry point. The host selects a stable puzzle ID from `STARTER_CROSSWORDS[tier]` and renders `CrosswordBoard` with a controlled state and action dispatcher. Mount a new board with `key={puzzle.id}` when switching puzzles.

1. Load the exact puzzle and pass its saved payload to `decodeCrosswordSave(puzzle, payload)`. Use `createCrossword(puzzle, { playTogether: mode === 'together' })` for a new round. A decode failure is a recovery case. Keep the original payload available in the host's normal recovery flow.
2. Compute the next state with `crosswordReducer(puzzle, previousState, action)`. Commit the entire returned state together. Use `encodeCrosswordSave(puzzle, nextState)` for the session payload and `isCrosswordComplete(puzzle, nextState)` for completion. Read `nextState.helpUsed` for completion credit before reporting a finish. Undo can remove revealed letters, so finish and award policy belongs to the host.
3. Wire the family to the existing Cove start sheet, challenge owner, save catalog, and content registry. Pass the width and height inside the frame's safe areas if the board is constrained. The board supplies its own Undo, Check, Hint, More, clue bar, and letter pad.

The versioned payload binds cursor, board, options, assistance, and the last 256 undo moves to the exact solution. A word reveal is a single Undo. Assistance stays recorded after it is undone. Check is available at any time and counts wrong letters. Friendly also underlines individual conflicts during play. Play together switches clue readings without changing letters or the selected clue.

The base branch predates the shared Clean UI kit. The board uses the Clean color roles and the existing rounded app icons. Once the kit is available, the integration can use its palette and icon adapter.

## Verification

The two crossword test files cover every starter grid, keyboard and clue navigation, large-text render props, co-play, explicit and Friendly checking, hint credit, Undo, and recovery through the maximum-size codec. Device layout and gestures can be checked once the host route is wired.
