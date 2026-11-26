# Starter Crosswords

Crossword is an offline puzzle for one solver or two readers sharing a device. The draft bank in `tests/fixtures/crossword-starter/` has twelve boards per tier, from 5×5 Easy to 11×11 Expert. Every open square belongs to an Across and a Down answer. Clues are numbered from top left to bottom right, with one number for a square that starts both directions.

## W1 admission before registration

1. Submit the answers, both clue readings and shipped surfaces through the W1 pipeline in [scripts/words/README.md](../../../scripts/words/README.md). Each shipped word needs two independent blind reviews from different models, lead reconciliation and a W1 receipt. Leon supplies the `familySample`.
2. The lead runs the locked `w-guard` scan on the final content and surfaces, bakes the reviewed bank and retains its detached receipts. Admit the baked JSON through `content/words/banks.manifest.json` and the word registry. Verify the admitted bytes with `npm run check:words:export`.
3. Once content admission passes, wire the admitted puzzles into the challenge catalog, `src/state/save-catalog.json` and Cove. The draft fixture stays outside the app import graph.

## Board and saves

Mount a controlled `CrosswordBoard` keyed by the puzzle ID. Use `createCrossword` for a new attempt and `decodeCrosswordSave` for an existing one. Pass the frame's available width and height and set `active={false}` while the host cannot accept actions.

Use `crosswordReducer` to apply actions. Commit the entire returned state before showing solution feedback or awarding a finish. Use `isCrosswordComplete` for terminal truth and keep `helpUsed`, `checks`, `failedChecks` and `edits` monotonic across successive accepted checkpoints. Undo operates on letters and selection. Friendly, Rewind and any hint that consults the solution record help. Check on an incomplete grid reports the blank count. A new full Check records its outcome, and repeating it on the same draft revision preserves the counts.

The version 2 payload binds the puzzle fingerprint, cursor, board, settings, audit and last 256 undo deltas with a 3,200-byte cap. A word reveal is one undo step. Rewind restores the most recent error-free draft available in the undo ring. If it finds none, it preserves the draft and reports that the required history is unavailable. Version 1 was draft-only and lacked audit evidence. Treat a version 1 payload as unreadable and preserve its original bytes for recovery.

The focused engine and board tests cover draft structure, clue leaks, input, text caps, puzzle help and checkpoint recovery. Device layout, native gestures and VoiceOver speech remain part of integration acceptance.
