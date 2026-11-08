# Whole answers, hints and puzzle endings

F4 shared kit for School, originals and Puzzle Cove. Game owners adopt these components in their own boards; the kit does not change legacy beginner engines or add games to a shelf. The public Challenge frame uses the shared ending now. Challenge boards receive optional `sessionKey` and `commit(action, expectedKey)` props; commit returns the durably accepted key and replayed state, or null. Map those to the help snapshot and callback with an explicitly redacted public view. There is no placement, clock input or automatic difficulty change.

## Whole answers

`src/puzzles/wholeAnswer.ts` keeps an editable neutral draft. Supply the real engine's `AnswerRules`: initial draft, validity, edit, completeness and acceptance. `accepts` must recognize every legitimate answer, including alternate arrangements. It must not compare only with a bank's stored witness. Edits never call `accepts`.

Render a Challenge board with `cellFeedback('whole', judge)`, which returns null without calling the judge. Beginner boards keep `cellFeedback('beginner', judge)` and their existing per-cell teaching. Technique grades still come from the engine/bank; whole-answer mode does not invent a grade.

Use `canCheckAnswer` for the Check button and call `answerCheck` only from an explicit Check action. An incomplete or repeated unchanged Check is a no-op. A miss retains every entry and records one check and miss. `last.draft` preserves the submitted draft. Editing after a miss does not reveal which cells are wrong. `WholeAnswerControls` supplies Check and neutral feedback; a game can also use its own character line.

Pass `'choice'` to `answerCheck` for option questions. A miss retires those options: edits and more Checks are blocked until `answerVariant` receives a different immutable puzzle ID on the same skill. Keep the missed draft visible until the child taps Try another. Fetch the reviewed sibling before replacing anything. Do not remove a rejected option and let the child scan the remainder. A missing sibling keeps the original draft, with undo/help/exit available.

These are derived states, not a new save format. Put actions in the game's existing validated, versioned replay codec. Reject no-op edits/Checks in `ReplayEngine.step`; emit `check` with `correct` only for a new complete submission and `help` before revealing assistance. Use the existing terminal transaction to count helped finishes and preserve marks. A reset must not erase prior help/misses from the attempt's replay evidence. `tests/puzzle-whole-replay.test.tsx` shows integration with `defineReplayGame`, exact pause serialization, alternate answers and forged-result rejection.

## Four-step help

`PublicHintRules<V,A>` in `src/puzzles/hints.ts` receives **only visible facts**: visible clues/rules and the actual current draft. Construct `V` explicitly; do not pass an unredacted bank descriptor, hidden target, solution array or stored route. Look points attention; Think names an idea. Neither calls the solver nor returns an action. Their text/focus IDs must not reveal an answer. Keep content backed by the game's reviewed rules.

For One step and Show me, `problem(view)` supplies the same pure move/goal rules used by gameplay. The shared search always starts at the supplied current draft, including valid alternatives off the original route. `preserves(before, after)` must reject overwriting an already valid alternative entry; path games may allow an engine-legal undo/retrace. It is applied during search and replay verification. A dead end or exhausted budget preserves work and reports unavailable. The kit never silently resets or substitutes the stored solution.

Search runs outside rendering/frame callbacks. It yields after 64 expansions or 8 ms, whichever comes first. One engine expansion must itself be bounded. The caller can abort between slices. The 8 ms bound excludes one atomic engine expansion and is not a physical-device performance claim.

`PuzzleHelp` keeps Help reachable from the start for every kind. Grids show the invitation immediately; build-and-run games additionally offer it after three failed runs. Each tap asks for the next rung: Look, Think, One step, Show me. One step applies exactly one action and stops. Show me presents the rest one move per **Next step** tap; this deliberate pacing keeps reading untimed and lets a child stop. After the demonstration it offers a fresh puzzle. No moves run from a render or timer.

Supply:

- `snapshot: {key, view}` with key containing owner, epoch, puzzle and accepted revision.
- `commit(event, expectedKey)` that checks ownership/revision, atomically records help and normal engine actions, and returns the accepted snapshot only after successful saving. Return null on rejection/I/O failure. Do not disclose a cue before that help record is accepted.
- For a `step`, apply the action through the real engine. `last` identifies the final Show me action; finish a whole-answer demonstration through the same Check/result transaction so a helped finish counts. One step can also finish a puzzle and must count normally. A `finish` event asks the same engine to Check an already filled demonstration with no moves left.
- `onCue` to highlight the returned public focus IDs, and clear highlighting when null.
- `onFresh` to offer/deal a genuinely fresh puzzle of the same kind after Show me. Do not replay an answered choice question under a new session ID.
- `active=false` during blur, backgrounding, owner/epoch changes or boundary saves. Mount with a puzzle identity key. External edits invalidate pending hints and demonstrations; Help remains available to derive a fresh one.

The component uses the game's commit callback for every effect. It catches unavailable/error states and keeps the draft. It cannot make an unsafe host callback safe: hosts must enforce the expected key and use the existing validated save path. Tests exercise rejected saves, rapid taps, owner switches, stale results and normal revision updates.

## First open and quiet endings

`PickYourTide` takes three real small puzzle samples, labeled Shallow, Middle and Deep by the host. A tap selects that sample without recording placement. Persist only the ordinary explicit choice if needed, never an inferred ability. School keeps its existing beginner opening; use this first-open chooser for new original/Cove games.

`PuzzleEnding` gives Easier, Same and Harder the same size and weight. Try another invokes its callback once with one tap. `adjacentTide` chooses the nearest available band only after an explicit direction, within the host's selected path. At a band boundary, open the full chooser; do not auto-move the player. The Challenge frame starts its replay through normal save guards and clears the previous puzzle's dare selection.

Supply specific praise from the real outcome, such as “You used both clues to seat the friends.” Replay registrations can provide `completionText(ref)`. Failure lines come from the character through `PuzzleFeedback`; the board uses `PuzzleFailure.focus` to highlight the failing step. Do not use that highlight to reveal per-cell correctness in whole-answer mode.

Original-game hosts call `finishOriginalPuzzle` once per distinct completed attempt and use `originalRoundDone` to stop after four. Use an attempt ID, since revisiting the same bank puzzle is still a separate attempt. Skipping records no finish. A helped solve counts. Pass `roundDone` to the ending; a new round requires a new explicit action. Save this round state through the game's validated session codec, with original data preserved on recovery.

## Verification fixture

`tests/native/puzzle-kit.tsx` is a standalone Expo entry for native QA, absent from app routes/registries. It exercises real shared controls with a visible “make five” puzzle and multiple accepted answers. It has memory-only fixture state, so it is not persistence acceptance. The F2 replay tests cover serialization and result validation separately. Build it with `expo export:embed --entry-file tests/native/puzzle-kit.tsx` into an isolated simulator app, never a family artifact.

Full game-specific native journeys, real-device search timings, VoiceOver operation, family acceptance and each future adapter's public-information audit remain their track/lead gates.
