# F2 Challenge core

Implementation branch: `p4/f2-challenge`.
Implementation head: `5a893fdf52d363cd6c782e06f115b0cb263bdfc6`.
Base: `origin/program/4.0` at `d3e713d14ea3b0d82cebb817881d5a3fc9acc03f` (F1 merged). Remote verified as the private `Shimizu-Technology/little-island-games` repository. The lead integrates; no PR, merge, release, version/build change or Apple/EAS action was performed.

## Context and scope

Read BRIEF.md and COMMON.md in full, PLAN sections 4/5/9/10/15/16 and precedence table, the thirteen assigned ledger rows, Play Part 2, the School shared-board/offer evidence, repository AGENTS.md, PRD.md, QA.md and SAVE_CONTRACT.md revision 2. Canonical project-context, Brain Dump, application-QA, lifecycle and writing guidance were read. Expo SDK 57 and current Router parameter documentation were checked before UI/navigation work.

This is an offline core for a seven-year-old's existing School journeys and later registered Challenge games. Existing saves, paused boards, five School levels and stars must remain valid. The committed catalog still contains 28 School games and zero Challenge adapters. Six future originals appear only after their complete registrations land. No placeholder or empty Challenge tab is exposed.

## Ledger disposition

| Row | Implementation and evidence |
| --- | --- |
| FND-06 | Generated mapped Registry, typed replay closure, immutable bank/source references and nine dare evidence types. Every type replays through the actual Maze engine in tests. Removing a committed registration fails generation/check. |
| K1 | Separate Challenge route/frame with explicit Start, Deep Water/Endless, marks, Help, Easier, Another puzzle, separate paused slot and explicit replacement. Result invitations/face, per-learner grown-up switches and opening level. Bounded signals; no speed/day inference. Framework UI is tested with an isolated adapter, not registered shipping content. |
| K8 | Saved-state dispatch throughout the frame and School evidence. `nativeStages` permits later replacements without flipping `ownLevels`. Both Levels 4 and 5 replay for all twelve shared-board games. |
| FND-11 | Six classic views extracted into separate files; shared geometry/components extracted; existing GameBoards exports preserved. Engine and save behavior retained. |
| FND-12 | Registration-driven IDs, engines, views, original-game art and Thinking groups. Temporary fixture grows from existing IDs to all six originals; removal fails. Profile-separation test now names the registered count. |
| FND-13 | Shared destinations and failing reachability checks for missing route, missing shelf, missing file and >3 taps. Arcade shelf destinations corrected to `/arcade`. |
| FND-14 | Code Lab keeps ages 9–14 with an older-learner/grown-up top-end line. Registration rejects Beep Deep Water; Level 5 bridge offers Crab. |
| R6 | Written precedence/evidence table in docs/CHALLENGE_CORE.md, with per-type replay tests. F1 durable formats remain unchanged. |
| MP-D1 | Challenge stays separate from Levels 1–5; no Level 6 cast or remapped legacy `deep`. |
| MP-D3 | Shared boards remain readable for paused rounds; later game slices can replace fresh rounds. Archived questions remain intact. |
| MP-D4 | Marks only; monotonic F1 permanent facts. No mark-based badge, currency or identity unlock added. |
| MP-D16 | Only bounded completed-round signals and explicit ratings. Family/Together and leaving/backgrounding provide no personal readiness inference. |
| SC-28 | Dismissible Beep→Crab and Letter→Sound Boat bridges. Thinking→Cove bridge is wired behind generated readiness, waiting for G1/CV-02's actual route and registration. No dangling link is shown. |

D1 is implemented for all nine Arcade games: every valid level and Endless opens at zero stars. Historical star/unlock metadata stays valid. Malformed terminal results, invalid level IDs, stale learner/epoch/round callbacks and duplicate credit remain rejected.

## Save and integration details

Envelope/profile/session/progress versions and F1 completion/award formats are unchanged. The catalog adds registered School signal contexts only. Optional, strictly validated `settings.learningComfort` stores the requested per-learner offer/young-child/opening policy; learner removal cleans only that learner's policy. This is additive Settings data, not a new Challenge/session/profile format.

Invitation updates require the current owner, epoch, game, round and revision. They replace one signal context, preserving concurrent contexts. Replaying the same immutable Challenge puzzle retains dismissal. Draft moves can continue during write-behind I/O; terminal/start boundaries are awaited. No paused School round is replaced by Challenge.

Integration instructions and the precedence table are in `docs/CHALLENGE_CORE.md`. G1 should provide `src/cove/registration.json` plus `src/app/cove.tsx` and regenerate readiness to activate the Cove bridge. F3/F4 and game slices supply actual immutable banks, checkpoint codecs, neutral whole-answer/hint UI and shipping registrations.

## Verification

Executor: agent. Node 22.22.3; default PATH. Automated checks and actual headless Chromium web QA are distinct from native/family acceptance.

- Pre-fix evidence against the original F1 base: twelve handover regressions failed; the D1 World 6 zero-star regression failed. Evidence: `evidence/f2-handover-before.log`, `evidence/f2-arcade-before.log`.
- New tests cover all nine dare types, forged/illegal/oversized/sparse payloads, assistance across reset/reload, fixed launch options, two-ways hashes, Together restrictions, atomic F1 credit, monotonic marks, all twelve board games, bounded offers/dismissal, readiness, six-game registry growth, learner policy removal and overlapping draft I/O.
- Preview gate: `EXPO_PUBLIC_LIBRARY_PREVIEW=1 LITTLE_ISLAND_SLOW_QA=1 LITTLE_ISLAND_SLOW_HOST=1 npm run check` passed, 206 files / 2,497 tests, export shell `6467f4bcbdf3`. The final round/context/dismissal tightening was then verified with focused suites; final committed-source default gate follows below.
- Final default gate on implementation head: `LITTLE_ISLAND_SLOW_QA=1 LITTLE_ISLAND_SLOW_HOST=1 npm run check` passed, 206 files / 2,497 tests, export shell `f4795783d70c` (6,480 bundled resources). The final four Challenge suites also passed under `EXPO_PUBLIC_LIBRARY_PREVIEW=1`: 40/40 tests.
- `npm run doctor`: passed 21/21 with the default PATH.
- Lint: no errors; 38 existing repository warnings. New Challenge code has no lint errors.
- Default generated Library files restored after preview mode. `git diff --check` passes.

Actual web QA completed at 320×667 and 1024×768: grouped Thinking shelf; no unfinished originals/empty Challenge; three clean Quick Practice rounds; second-round offer; persisted dismissal after reload; third-round optional face; existing grown-up gate and saved young-child choice; zero-star World 6 level 8 selection. No page errors. Saved result: three independent completions, two School stars, one day, `ccc` signal and saved dismissal. The final committed-source browser run passed **11/11 web cases**, including actual interaction in all six extracted classic views: Tic win/reload/undo, Word Rescue completion, Memory flip/reload, Checkers human/computer moves, Maze move, and Number Island roll/select/close. Frames were viewed at phone and tablet widths. Evidence: `evidence/web-qa.json`, saved outcome JSON, screenshots, and the executable local QA script. These are web results; native dimensions remain not run.

## Remaining acceptance

No simulator is named in this worker brief. Existing booted devices were borrowed and left untouched. Native iOS 18.5/26.5, real iPhone/iPad interaction/performance, family acceptance and independent integration review remain with the lead. Framework tests use a private test adapter; they do not certify future game banks or a shipping Challenge game. The Cove bridge remains inactive until its dependency lands.

Speech lines added: **0**. No audio regeneration or audio assets changed. New controls have text/accessibility labels; narration integration belongs to F5.

## Cleanup and delivery

The owned Chromium contexts were closed and QA server PIDs 42057 and 79831 were terminated. All export processes exited; lifecycle status reports no active owned resources. Task-installed node_modules and exported dist are removed after verification. No borrowed server, simulator, protected service or other session's resource was stopped. The branch/worktree remains for the lead; no integration was performed. REPORT.md and the evidence are also committed under docs/program/f2-challenge so the lead receives them with the branch. Only p4/f2-challenge is pushed.
