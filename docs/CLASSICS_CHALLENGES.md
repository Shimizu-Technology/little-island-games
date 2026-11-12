# Classics: fork, capture and Memory dares

P3a adds separate Challenge entries from Tic-tac-toe, Checkers and Memory setup and from their saved rounds. Every puzzle is open. Free-play rounds are preserved. These tasks award permanent completion/dare marks only; they do not change School stars or the normal game AI.

Tic hard is labelled **Try to draw**. The policy is unchanged. Eight fork tasks replay a legal move history, then ask for one square. An answer must create two distinct immediate winning squares and leave the opponent no immediate winning move. Every legal opponent reply then leaves a winning move. Alternate correct fork squares are accepted. A missed Check retains the selected square; reset cannot erase the miss.

Twelve Checkers tasks use composed legal endgames under Classic rules. They move from single captures through full jump chains and crowning to choosing among starting kings and routes. The exact engine enumerates every legal complete chain. A correct chain leaves the opponent no legal move. This is a one-turn task in a composed position, not a finish-in-N target for a full match. Normal timed Checkers search is unchanged.

Memory has eighteen frozen deals: six/eight/twelve pairs in picture, picture↔English word and picture↔CHamoru word packs, each with preview/no-preview choices. CHamoru IDs, spelling, pictures and citations come from the existing source-backed vocabulary. There is no new CHamoru text or pronunciation audio. Reading previews have no deadline.

The suggested targets are 9/12/18 matching turns after a voluntary preview and 14/19/28 without preview. These are suggestions, not proved optimal pars. Skipping the preview still allows completion but cannot earn the preview-linked mark. Every two card reveals count one turn (rounded up), including first-card reveals later undone or reset. Undo, reset and reload retain all spent turns; a later attempt cannot launder an earlier budget. Help suggests only pairs whose faces have already been exposed. Finishing past the target still counts as completion.

## Saves and slots

Banks: 480 (Tic, 8), 481 (Checkers, 12), 482 (Memory, 18). Dare slots: 3000–3007, 3010–3021 and 3040–3057, respectively. Ordinals, hashes and meanings are append-only. Generate with `npm run registry:generate` and `node --import ./scripts/puzzles/register.mjs scripts/boards/classics-catalog.ts`; use their `--check` modes to verify. Existing catalog entries must remain unchanged.

Number Island Growing and Challenge ask for the lowest total left and explain that clearing everything is very rare, without claiming a rate for the seeded roll stream. Gentle keeps its rerolls. A terminal round records its actual remaining total. `numberRecords: { version: 1, bestRemaining: { [boardSize]: total } }` belongs to one canonical learner profile, separately for boards 1–6, 1–9 and 1–12. Zero is retained and higher totals cannot replace a lower best.

This optional, validated field extends the existing unreleased F1 envelope 3/profile 2. Migration enriches only finished, known-owner rounds and never changes an input or an old session. Unassigned earlier rounds stay unassigned; no family-wide score is copied to children. Encoding stores the records in `profiles.people` once, projects only the active learner and preserves them through replay, learner changes, backup and restore. Old session `bestRemaining` is retained as legacy round data; it is not used as another learner's personal record.

Four narration lines are staged in `scripts/learn/p3a-classics.json`. Audio generation remains lead-owned. Number Island's old spoken instruction says clearing everything is the goal; its Listen button is replaced by the new source key and appears only after that bundled source is available.
