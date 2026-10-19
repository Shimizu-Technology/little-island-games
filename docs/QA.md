# Acceptance ledger

Executor: agent for automated/browser/simulator checks; Leon/Stassie for physical-device usability. Comprehensive first-release scope. Record exact source/build and evidence before calling a scenario passed. Case status includes every required device dimension; browser-only coverage remains partial until native acceptance is recorded.

| ID  | Required journey                              | Expected outcome                                                  | Status                                   |
| --- | --------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------- |
| A01 | Home, game choice, help, return and new round | Every game reachable; clear controls and preserved progress       | PARTIAL — browser passed; native pending |
| A02 | Tic-tac-toe solo/together                     | Legal moves, win/draw, difficulty, hint, complete decision undo   | PARTIAL — browser passed; native pending |
| A03 | Word Rescue pack/parent word                  | Valid secret handling, hints, reveal/audio, replay                | PARTIAL — browser passed; native pending |
| A04 | Memory solo/cooperative/together              | Matching/scoring/turns, interrupted mismatch recovery             | PARTIAL — browser passed; native pending |
| A05 | Checkers tutorial/solo/together               | Correct captures/chains/kings/win/draw; responsive opponent; undo | PARTIAL — browser passed; native pending |
| A06 | Maze explore/undo/hint                        | Every maze solvable; wall rejection; visible finish               | PARTIAL — browser passed; native pending |
| A07 | Number Island roll/select/close               | Dice targets, legal sums, counting/addition, clear completion     | PARTIAL — browser passed; native pending |
| A08 | Force-close/resume, including AI turn         | Exact valid game resumes without duplicate moves                  | PARTIAL — browser passed; native pending |
| A09 | Native release app cold launch without server | All games/content/audio work offline                              | NOT RUN                                  |
| A10 | Update installed app with saves               | Existing progress/settings preserved                              | NOT RUN                                  |
| A11 | Parent backup/restore and bad/older saves     | Validated restore; errors recoverable without losing original     | PARTIAL — browser passed; native pending |
| A12 | iPhone/iPad portrait/landscape                | Reachable touch controls, legible boards, no clipped content      | PARTIAL — browser passed; native pending |
| A13 | Sound off, larger text, screen-reader labels  | Essential instructions remain understandable                      | PARTIAL — browser passed; native pending |
| A14 | Stassie physical iPad observation             | Independently choose/move/help/resume/replay                      | BLOCKED — physical device unavailable    |
| A15 | Signed family install                         | Registered-device artifact installable on target device           | BLOCKED — physical device unavailable    |

Simulator/browser checks do not establish physical-device or child usability acceptance. Do not conflate automated checks, review, merged source, build success, and family installation.

## Agent run — 2026-10-19

Source 8383e007eed5b8145dd44610f5fb1315667e6a70, Expo58 browser export 337654db8081. Native toolchain is being aligned to the proven Expo57/RN0.86.3 reference after an upstream artifact download connection reset; integration acceptance will be refreshed after that change.

- Engineering: typecheck, lint, 44 regression tests and web export passed; Expo Doctor20/20; advisory Impeccable scan returned[] (not usability acceptance).
- Browser at iPad-mini768×1024 and compact-phone375×667: six home choices and no horizontal overflow. Completed two-player Tic win (5moves), reloaded exact board, undid to4moves. Word-pack BLUE completed with hints; clue/word audio loaded without console errors. Family secret STAR typed securely, one letter persisted across reload.
- Memory: a mismatch survived reload, explicit turn-over changed player, six matching pairs completed; final scores0–6 remained visible.
- Checkers: full solo human/computer decision, all four playable lessons including forced multi-jump and crowning, then exact original full-round position/history restored. Undo returned to original player decision.
- Maze: followed actual UI route through a generated5×5 maze in19cells, completion visible, undo resumed exploration.
- Number Island: rolled, selected valid combination, closed numbers, reached a no-combination end state, then undo restored prior dice/open numbers.
- Backups: UI export produced JSON download; UI import/confirmation restored all six sessions and sound settings. Bad startup JSON fixture displayed recovery; explicit fresh start preserved corrupt original before replacement; valid backup restored all six sessions.
- Offline: stopped owned static server PID42108, verified no listener on43821. All six routes cold-reloaded from service-worker cache (158entries), instructions audio loaded with no console error, Number Island hint/close updated its persisted turn. This establishes browser offline behavior, not native airplane-mode proof.
- Browser screenshots: browser-screenshot-127-0-0-1-mvf2lq7r-36d7e006.png (tablet), browser-screenshot-127-0-0-1-mvf2lqa3-ceba0c5c.png (phone), under local T3 browser-artifacts.
- Remaining: native installed release build, force-close/AI interruption, native keyboard/rotation/larger text, update preservation, signed family installation, and physical Stassie playtest. Do not mark these passed from browser results.

Review: independent engine reviewer found/fixed oversized checkers saves, stale restore snapshots, invalid imported states, and recovery-key collision. Independent UI reviewer found/fixed tutorial replacing full round and hidden final memory scores. Final engine/save recheck and UI/config review passed after Expo57 alignment; no remaining material source objections. Native artifact acceptance remains separate.

## SDK57 integration refresh — 2026-10-19

Source 8383e00 plus the committed dependency/tooling alignment (see Git history). Expo57/RN0.86.3 export fingerprint9d450c5136ee. Engineering gate passed again: typecheck, lint,44 tests, web export, Expo Doctor21/21.

At768×1024, completed/reloaded a two-player Tic win and verified the exact five-move saved board. Started all other five games through their setup UI. At375×667, Number Island roll/hint/close updated persisted progress with no horizontal overflow. Stopped and released owned static server PID87902; all six saved game routes cold-reloaded with no console errors from cache9d450c5136ee (153entries after route visits). A further Number Island roll/hint/close saved turn2 with the server stopped. Closed the owned browser tab.

Native dependencies installed using React Native's supported local-tarball environment overrides with matching0.86.3 and Hermes250829098.0.17 archives already present on this machine. These environment values and absolute paths are local QA inputs, not committed app configuration. Native Release compilation and acceptance results follow below when available.
