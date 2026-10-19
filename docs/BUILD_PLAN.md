# Build plan

The checklist below records the first release. The approved expansion is [V2_RELEASE.md](V2_RELEASE.md), with current engineering/runtime acceptance in [V2_QA.md](V2_QA.md). V2 source integration and TestFlight delivery remain open until that ledger's required gates pass.

- [x] Shared shell, visual language, navigation, bundled audio and offline storage.
- [x] Tic-tac-toe vertical slice: solo/together, difficulty, hints, undo, save/resume.
- [x] Word Rescue: reviewed packs, hints, completed-word audio, private parent word.
- [x] Memory: pairs, solo/cooperative/two-player, difficulty, persisted reveal recovery.
- [x] Checkers: standard rules, forced jumps, tutorial, bounded opponent, complete-turn undo.
- [x] Mazes: solvable generated boards, directions, undo, route hints, difficulty.
- [x] Number Island: dice/counting/addition, legal subset selection, clear end state.
- [x] Parent settings, progress backup/restore, privacy and storage recovery.
- [x] Rule/save tests, full gate, independent review and material fixes.
- [ ] Browser and native installed release-build acceptance with exact evidence.
- [x] Private repository/PR delivery; build/signing status and physical-device limits documented.

Future ideas: Four in a Row, tangrams, Dots and Boxes, word search, reviewed CHamoru content. Private nearby-family Picnic Mystery is V2 scope. Cloud sync, public matchmaking and live-AI conversations remain deferred.

Current acceptance: browser journeys and source review have passed their recorded dimensions. Native installed release journeys and update preservation are recorded. The remaining mode/device matrix, signed family installation and Stassie’s physical-device observation remain separate required gates in docs/QA.md.

Internal TestFlight 1.0.0 (4) is available to Leon; see docs/TESTFLIGHT.md. This delivery provides the physical testing route and does not mark the remaining acceptance checkbox complete.
