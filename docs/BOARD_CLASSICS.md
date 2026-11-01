# Board classics

Implementation worker: Codex, 27 October 2026. Base `0fbd8af` on `origin/feat/island-arcade`; branch `feat/board-classics`.

## Product and acceptance

Little Island is a private offline family game collection for Stassie (7) and family. The relevant sources are `docs/PRD.md`, `docs/ISLAND_ARCADE.md`, `docs/LEARNING_GROWTH.md`, `docs/QA.md`, and the worker brief `full-w3.md`. There are no accounts, ads, purchases or online opponents. The five additions belong to the Classic games island and use the existing remembered family names and match tally. Public distribution and physical family acceptance remain separate gates.

Acceptance A06: reach each board from Home → Classic games, play computer strengths Gentle/Growing/Challenge and a two-player family round to a result, verify the score and exact mid-round reload. Reef Sweep is solo and uses three board sizes. Also verify hints, complete-decision undo where available, first-play demonstration, named starters/alternation, private chart concealment on handoff/reload/interruption, favorites/Continue, phone/tablet/landscape, and corrupt-save recovery. Execution is agent-owned browser QA; no simulators are authorized. Native touch, audio comfort, VoiceOver and child usability remain operator acceptance.

## Rules

- **Coconut Drop:** 7 columns × 6 rows. A piece drops to the bottom open space. Four matching shapes across, vertically or diagonally wins. A full board without a line is a draw. Circle and pointed leaf coconuts distinguish seats without relying on color.
- **Fishing Nets:** 3×3, 4×4 or 5×5 boxes. Select two adjacent dots to tie a rope. The fourth side claims a box and gives another turn; one rope can close two boxes. Most boxes wins when all edges are tied. Circle/square marks identify box owners.
- **Hidden Canoes:** two 6×6 lagoons, each with straight canoes of lengths 3, 2 and 2, without overlap. Charts are arranged deterministically for each round; manual fleet placement is not part of this implementation. Search by column A–F and row 1–6. Turns alternate even after a find. Find all seven canoe spaces first. A find shows a canoe; open water shows a ripple. Private chart access is available during one's own revealed turn.
- **Shell Pits:** Kalah, six pits per seat and four shells per pit. Circle pits run left to right below; square pits run right to left above. Sow counterclockwise, including your own store and skipping the other store. End in your store for another turn. End in an empty pit on your side, opposite a nonempty pit, to capture that shell and the opposite shells. When either side empties, each seat collects its remaining shells into its own store. Highest store wins, with a draw at 24–24. Preview the path and gold last-landing ring before confirming. Count-aloud uses registered English number clips when available; the count stays visible without audio.
- **Reef Sweep:** 5×5/3 urchins, 6×6/5, or 7×7/8. Open all non-urchin spaces to find the pearls. First opening and all adjacent spaces are guaranteed safe. Numbers count touching urchins, including diagonals. Zero spaces spread automatically, stopping at flags. Flag mode marks suspected urchins; flags are reminders and do not establish a win. Some boards require a guess. After 400 recorded actions the engine permits opening spaces and removing existing flags, preventing an unbounded save log while preserving completion. Undo can recover from an urchin.

## Engines, opponents and storage

Each `src/board/<game>/engine.ts` is pure TypeScript, with legal moves, transition, terminal truth, deterministic initialization/choice and a replay validator. No engine imports React Native. Coconut Drop uses alpha-beta at depths 1/3/5; Shell Pits uses depths 1/3/6. Both have a 9,000-node search budget. Fishing Nets takes boxes, avoids third sides, and at Challenge measures complete capture chains to favor long captures and short sacrifices. Hidden Canoes Gentle samples deterministically; Growing targets adjacent finds; Challenge favors aligned finds and uses a checkerboard hunt. All canoe choices use only search marks, never secret chart contents. Reef hints use only revealed numbers and flag deductions, and say when no certain step is available.

Saves add optional `board` and `recentBoard` fields without changing version 1. There is one session per board. Every engine state is reconstructed from its seed, size, starter and bounded move log; stored boards, marks, scores, turns and outcomes must match that replay exactly. Unknown session/state keys are rejected. Invalid imported board data takes the existing recovery path. Compare-and-swap identity and restore epochs reject stale screen/AI writes. Family scores include the current result live; Play again settles it once, then alternates the starter if selected. Starting from setup explicitly resets the family match. Solo undo returns to the preceding human decision; private canoe turns and together rounds have no undo. The existing `useRoundPractice` hook gates new starts and Play again when grown-up practice is enabled. Cancellation leaves the previous round intact; saved Continue never requests practice.

Concealment is deliberately not serialized. A canoe visibility token is scoped to the round, move count, turn and restore epoch. Handoff, route blur, app background, browser blur/visibility change, help, setup and reload cover the chart. Teaching uses separate engine-created positions and never overwrites the saved game. Original SVG board art and pieces use the existing palette and feedback system; the existing celebration and press components honor Reduce Motion. Missing speech is silent with visible text. No audio assets were generated by this worker.

## Shared integration edits

- `src/state/validation.ts`: optional board fields and board favorite IDs, with strict validators.
- `src/state/Store.tsx`: guarded board writes; clear the board Continue marker when another game accepts a write; allow board favorites.
- `src/learn/home.ts`: five additive Classic entries, favorites and Continue support.
- `src/components/GameShelf.tsx`: necessary extra integration outside the brief's listed shared files: select `/board` and original board thumbnail art for board IDs. Existing route/art behavior is preserved.
- `scripts/learn/board-classics.json`: necessary narration registration outside the listed files. The existing generator automatically reads this manifest. 94 keys: five `board-rules-*`, five `board-teach-*`, `board-count-1` through `board-count-48`, and 36 `board-coordinate-a1` through `board-coordinate-f6` keys. The lead must generate both banks at integration.

## QA ledger

Evidence root (outside Git): `/Users/leonshimizu/Desktop/ShimizuTechnology/little-island-games-artifacts/island-arcade/board-classics/`.

| Scenario | Status | Evidence / limits |
| --- | --- | --- |
| Pure rules, AI, validation, malformed saves, family tally, undo, favorites and restore ownership | Passed | `board-tests.log`: 43 tests across the two new files. Includes safe first neighborhoods, flag budget recovery, legal flagged-opening hints, immutable moves and all sizes/strengths to terminal outcomes. |
| Full `npm run check` | Blocked at integration tests | Typecheck and lint pass. 617 tests: 614 pass; 3 fail in two existing files. `tests/learn-home.test.ts` hard-codes 11 Classic games; now 16. Both `tests/neural-audio.test.ts` checks require the 94 new scripts in generated banks/receipt; generation is lead-owned and forbidden to the worker. Existing tests and audio assets were deliberately left unchanged. `check.log`. |
| Production web export | Passed separately after the test-stage blocker | `export.log`; final offline shell `62b0c1163cfb`, 5,557 bundled resources. Export success does not establish new speech availability. |
| Expo Doctor | Passed | `doctor.log`: 21/21 |
| Advisory design scan | Passed, no findings | `design-scan.json`: `[]`; not usability acceptance |
| Browser A06 full games, reload and replay | Passed on web | `browser-receipt.json`: 38 finished-game scenarios at touch-enabled 390×844 and 1024×768. Each competitive game at all three computer strengths and two-player; Reef at all three sizes. Exact nonterminal reloads, family result tally, replay tally and alternate starter verified. No page errors. Source `d9c31490ecdf99025e6c14bbde3e13b03d1252a8`. |
| Portrait/landscape features and recovery | Passed on web | `browser-supplement-receipt.json`: 14 scenarios at 768×1024 and 844×390 with Reduce Motion. Complete 5×5/4×4 nets, canoe private charts/blur/help/handoff/reload concealment, count-to-four shell preview and undo, Reef flags/loss/undo, actual back controls, Continue, favorites, no document overflow, and malformed-board recovery preserving the exact original. Same `d9c3149` source. |
| Optional grown-up practice | Passed on web | `browser-practice-receipt.json`: five game scenarios at 390×844. All new starts respect enabled practice; three helped answers and notes, cancellation, grown-up bypass, replay cancellation/bypass and no repeated practice on Continue/reload. Same `d9c3149` source. |
| Final Reef hint fix and adjacent flows | Passed on web | `browser-reef-final-receipt.json`: ten scenarios at 390×844/1024×768 on application source `49ad993`. Flag center before first opening, all tiles flagged then recovery, exact reload, and all three Reef sizes to completion/replay. This is the only application change after the full `d9c3149` matrix: first-opening hints now skip flags, with matching visible help text. |
| Native / physical family acceptance | Not run | No simulators authorized; native release and real devices belong to the lead/family. Browser emulated touch is not hardware performance, VoiceOver, actual audio comfort or child acceptance. |
| Independent final-code review | Not run by worker | Further delegation is prohibited; parent owns review/integration. |

The browser scripts and screenshots are stored alongside the receipts. Reef completion paths use the generated board as a QA oracle; moves still go through the actual controls. Competitive computer choices use their public-information engines. Earlier harness-only failures are retained in `browser-receipt-initial-sheet-wait.json`, `browser-supplement-initial-navigation.json` and `browser-supplement-recovery-fixture-race.json`: wait for the teaching sheet to finish exiting, expect Continue to return directly to Home, and inject malformed data before hydration rather than race an active save queue. The corrected runs pass; these were harness assumptions, not product defects.

## Parent integration handoff

Implementation source is `49ad993`; the final branch head also contains this documentation. Recheck the exact head with `git log -1`. The task worktree is `/Users/leonshimizu/.t3/worktrees/little-island-games/t3-91ed2a41`. No PR, merge, native build, audio generation or release is performed by this worker. The branch is pushed only as `feat/board-classics`.

Next: review the final code, integrate the branch, update the existing Classic-count expectation to include the five board IDs, and generate both complete voice banks/receipt from the merged manifest. Rerun the full gate after those integration steps, then perform lead-owned native/family acceptance. There are no known unresolved game defects from the recorded browser scenarios. Generated canoe charts (without a manual placement editor) and the bounded Reef action-log policy are explicit implementation choices, described above.

The preview on assigned port 43851 and every owned headless Chromium/QA worker are cleaned before delivery. No Metro server, simulator, emulator or container was started. No runtime resource is handed off; the branch and worktree are preserved for the parent. See the external `HANDOFF.md` and lifecycle receipt for exact final commit and cleanup status.
