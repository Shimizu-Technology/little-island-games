# Acceptance ledger

The learning-growth/build13 implementation and its remaining device/audio acceptance are recorded in [LEARNING_GROWTH.md](LEARNING_GROWTH.md). This is the historical first-release ledger. Current V2 source/build evidence, remaining integration gates and physical family checks are recorded in [V2_QA.md](V2_QA.md). Leon has explicitly authorized reviewed source integration and an internal beta; physical/child and public-release acceptance remain separate.

Executor: agent for automated/browser/simulator checks; Leon/Stassie for physical-device usability. Comprehensive first-release scope. Record exact source/build and evidence before calling a scenario passed. Case status includes every required device dimension; browser-only coverage remains partial until native acceptance is recorded.

| ID  | Required journey                              | Expected outcome                                                  | Status                                                           |
| --- | --------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| A01 | Home, game choice, help, return and new round | Every game reachable; clear controls and preserved progress       | PARTIAL — recorded browser/native passes; remaining matrix below |
| A02 | Tic-tac-toe solo/together                     | Legal moves, win/draw, difficulty, hint, complete decision undo   | PARTIAL — recorded browser/native passes; remaining matrix below |
| A03 | Word Rescue pack/parent word                  | Valid secret handling, hints, reveal/audio, replay                | PARTIAL — recorded browser/native passes; remaining matrix below |
| A04 | Memory solo/cooperative/together              | Matching/scoring/turns, interrupted mismatch recovery             | PARTIAL — recorded browser/native passes; remaining matrix below |
| A05 | Checkers tutorial/solo/together               | Correct captures/chains/kings/win/draw; responsive opponent; undo | PARTIAL — recorded browser/native passes; remaining matrix below |
| A06 | Maze explore/undo/hint                        | Every maze solvable; wall rejection; visible finish               | PARTIAL — recorded browser/native passes; remaining matrix below |
| A07 | Number Island roll/select/close               | Dice targets, legal sums, counting/addition, clear completion     | PARTIAL — recorded browser/native passes; remaining matrix below |
| A08 | Force-close/resume, including AI turn         | Exact valid game resumes without duplicate moves                  | PARTIAL — recorded browser/native passes; remaining matrix below |
| A09 | Native release app cold launch without server | All games/content/audio work offline                              | PARTIAL — native cold launch; physical airplane/audio pending    |
| A10 | Update installed app with saves               | Existing progress/settings preserved                              | PASSED — iPad 1→2 and iPhone 2→3; exact saved data               |
| A11 | Parent backup/restore and bad/older saves     | Validated restore; errors recoverable without losing original     | PARTIAL — recorded browser/native passes; remaining matrix below |
| A12 | iPhone/iPad portrait/landscape                | Reachable touch controls, legible boards, no clipped content      | PARTIAL — recorded browser/native passes; remaining matrix below |
| A13 | Sound off, larger text, screen-reader labels  | Essential instructions remain understandable                      | PARTIAL — recorded browser/native passes; remaining matrix below |
| A14 | Stassie physical iPad observation             | Independently choose/move/help/resume/replay                      | BLOCKED — physical device unavailable                            |
| A15 | Signed family install                         | TestFlight artifact installs on a family device                   | PARTIAL — Leon reports phone installation/use; iPad unverified   |

Simulator/browser checks do not establish physical-device or child usability acceptance. Do not conflate automated checks, review, merged source, build success, and family installation.

## Agent run — 2026-10-19

Source 8383e007eed5b8145dd44610f5fb1315667e6a70, Expo 58 browser export 337654db8081. Native toolchain is being aligned to the proven Expo 57/RN 0.86.3 reference after an upstream artifact download connection reset; integration acceptance will be refreshed after that change.

- Engineering: typecheck, lint, 44 regression tests and web export passed; Expo Doctor 20/20; advisory Impeccable scan returned[] (not usability acceptance).
- Browser at iPad-mini768×1024 and compact-phone375×667: six home choices and no horizontal overflow. Completed two-player Tic win (5moves), reloaded exact board, undid to4moves. Word-pack BLUE completed with hints; clue/word audio loaded without console errors. Family secret STAR typed securely, one letter persisted across reload.
- Memory: a mismatch survived reload, explicit turn-over changed player, six matching pairs completed; final scores0–6 remained visible.
- Checkers: full solo human/computer decision, all four playable lessons including forced multi-jump and crowning, then exact original full-round position/history restored. Undo returned to original player decision.
- Maze: followed actual UI route through a generated5×5 maze in19cells, completion visible, undo resumed exploration.
- Number Island: rolled, selected valid combination, closed numbers, reached a no-combination end state, then undo restored prior dice/open numbers.
- Backups: UI export produced JSON download; UI import/confirmation restored all six sessions and sound settings. Bad startup JSON fixture displayed recovery; explicit fresh start preserved corrupt original before replacement; valid backup restored all six sessions.
- Offline: stopped owned static server PID42108, verified no listener on 43821. All six routes cold-reloaded from service-worker cache (158entries), instructions audio loaded with no console error, Number Island hint/close updated its persisted turn. This establishes browser offline behavior, not native airplane-mode proof.
- Browser screenshots: browser-screenshot-127-0-0-1-mvf2lq7r-36d7e006.png (tablet), browser-screenshot-127-0-0-1-mvf2lqa3-ceba0c5c.png (phone), under local T3 browser-artifacts.
- Remaining: native installed release build, force-close/AI interruption, native keyboard/rotation/larger text, update preservation, signed family installation, and physical Stassie playtest. Do not mark these passed from browser results.

Review: independent engine reviewer found/fixed oversized checkers saves, stale restore snapshots, invalid imported states, and recovery-key collision. Independent UI reviewer found/fixed tutorial replacing full round and hidden final memory scores. Final engine/save recheck and UI/config review passed after Expo 57 alignment; no remaining material source objections. Native artifact acceptance remains separate.

## SDK 57 integration refresh — 2026-10-19

Source 8383e00 plus the committed dependency/tooling alignment (see Git history). Expo 57/RN 0.86.3 export fingerprint 9d450c5136ee. Engineering gate passed again: typecheck, lint,44 tests, web export, Expo Doctor 21/21.

At768×1024, completed/reloaded a two-player Tic win and verified the exact five-move saved board. Started all other five games through their setup UI. At375×667, Number Island roll/hint/close updated persisted progress with no horizontal overflow. Stopped and released owned static server PID87902; all six saved game routes cold-reloaded with no console errors from cache 9d450c5136ee (153 entries after route visits). A further Number Island roll/hint/close saved turn 2 with the server stopped. Closed the owned browser tab.

Native dependencies installed using React Native's supported local-tarball environment overrides with matching 0.86.3 and Hermes 250829098.0.17 archives already present on this machine. These environment values and absolute paths are local QA inputs, not committed app configuration. Native Release compilation and acceptance results follow below when available.

Dependency audit residuals are tracked in [DEPENDENCIES.md](DEPENDENCIES.md); the report is not clean and public release requires review of the remaining upstream advisories. Final tooling/docs integration review also found no actionable material issues. CodeRabbit has not supplied a review on the new private repository at the initial PR inspection; independent engine/save and UI/config reviewers are the completed source-review fallback, not a claim of CodeRabbit approval.

Signed native device Release 1.0.0/build 1 succeeded on Xcode 26.6/iphoneos26.5; `codesign --verify --deep --strict` returned 0. The local development profile contains one registered device and expires 2027-02-19. This does not establish Stassie's iPad eligibility or installation. The 13.99 MB local IPA and a SHA256/source manifest are under the sibling `little-island-games-artifacts` directory, outside Git because provisioning metadata belongs locally. No family device was connected at verification.

The first generic/universal simulator compile failed importing ExpoModulesJSI from ExpoModulesCore during ExpoSymbols compilation. A serialized simulator-only build for the owned iPad mini architecture is being verified; do not treat the successful device compile as a simulator acceptance pass.

The serialized, six-worker arm64 simulator Release build succeeded (log: /tmp/little-island-sim-final.log). The successful device Release and simulator Release both embed JavaScript/assets; no task Metro server was started. Installed simulator journeys and build1→build2 preservation are being recorded next.

Native large-text recovery exposed clipped lower buttons in landscape because Recovery used a non-scrolling View. Changed it to a ScrollView within the existing SafeAreaView; regression acceptance is recorded against build3 below. Original screenshot: docs/evidence/recovery-large-before-native.png.

## Final installed native and web verification — 2026-10-19

Executor: agent with isolated fixtures. Native targets were an iPad mini (6th generation) and iPhone 16 Pro, both on iOS 18.5. These were task-owned simulators, not family hardware. Source 85aaf18 produced build 2; source 2643aa6 produced build 3 with the Recovery scrolling fix. Device and simulator Release builds succeeded for build 3; device signature verification returned 0. No task Metro server was started.

- iPad: reached and started all six games through home/setup. Tic together moves 1,4,2,5,3 showed X's win. Force termination/reopen restored the exact five-move board from SQLite; undo returned to four moves.
- Word Rescue: native pack SUN completed with three reveal actions; clue and word playback controls invoked without an error. Family word STAR stayed masked in the keyboard, started correctly and saved a found letter. Physical audible quality and airplane-mode playback remain operator checks.
- Memory: boat/kite mismatch survived force termination and home Continue. Explicit turnover changed player. Six actual matching pairs completed in seven turns; final scores 0–6 stayed visible.
- Checkers: solo B6–A5 received a computer response. All four lessons exercised a step, compulsory capture, two-jump chain and crowning. SQLite comparison verified exact original position/history restoration afterward. Complete-decision undo returned from four plies to two. A termination attempt found the computer had already replied; it proves completed-turn recovery, not interruption during an in-flight search.
- Maze: a blocked up move left path [0]. Hint and ten actual cell moves completed a generated 5×5 maze; undo reopened exploration.
- Number Island: roll 2, combination hint and close persisted turn 1 with number 2 closed. At accessibility-large in landscape, scrolled to controls and undid to the prior die/open numbers.
- Native backup: export created valid JSON with six sessions and opened the iOS share sheet. Save to Files dismissed the sheet without a confirmed destination; destination persistence is NOT PASSED. Copied that exported fixture into the owned simulator's local Files provider, selected it through the actual import picker, confirmed replacement, and verified six sessions/sound-off restored plus a recovery copy of the preceding save.
- Corrupt-save recovery: while terminated, replaced only the owned fixture's save with unreadable JSON. Cold launch displayed recovery. Build 3 at accessibility-large in iPad landscape scrolled to both fresh-start controls, preserved the exact corrupt original before creating a fresh save, then restored all six sessions through the Files picker. Recovery data remained present after restoration. Screenshots record the clipping before the fix and the reachable controls afterward.
- Update preservation: installed iPad build 2 over build 1 without uninstalling; all six sessions and settings were exactly equal. Installed iPhone build 3 over build 2; all three phone sessions were exactly equal. Verified installed CFBundleVersion after each update.
- iPhone: native solo Tic human/computer turn, hint and full undo; secure STAR keyboard entry, Return dismissal, start and letter guess; Checkers B6–A5 and computer response. Safe-area controls and scrolling were reachable. Phone screenshot records the keyboard. Phone landscape and its remaining three game boards were not run.
- iPad portrait/landscape and larger text were exercised. Actual VoiceOver speech/focus, minimum-iOS hardware performance, real touch accuracy and Stassie's independent usability remain unverified.

Final web regression on source 2643aa6: at 375×375, Recovery's scroll container had clientHeight 375 and scrollHeight 521; an actual container scroll reached scrollTop 146. Fresh-start confirmation preserved the malformed original. At 375×667, Tic moves 1,2,3,5,4,6,8,7,9 showed “A good draw!”; undo persisted eight moves. This refresh covers the shared Recovery source change.

Engineering on source 2643aa6: typecheck, lint, 44 regression tests, production web export and Expo Doctor 21/21 passed again. Recovery's advisory design scan returned []. Independent UI review approved the final scrolling change and unchanged recovery/save handlers. CodeRabbit reported “Review limit reached”; its walkthrough is not a completed review. Completed independent engine/save and UI/config reviews provide the repository's advisory fallback.

### Remaining required acceptance

A10 update preservation passed on both owned simulators. Other rows remain partial where the full mode/device matrix, actual audio/VoiceOver, native Files destination, or in-flight AI interruption is unverified. A14/A15 are blocked because no family iPad/iPhone is connected and the iPad's exact model/OS/profile eligibility is unknown. The PR stays held. Passing engineering/source review and extensive simulator journeys do not finish family release acceptance. Execute each remaining matrix before marking its whole case passed.

The development-signed build 3 IPA and SHA256/source manifest are local in the sibling little-island-games-artifacts directory. This is not an App Store/TestFlight release. The one-device profile does not establish Stassie's iPad eligibility. Public distribution also retains the content-rights and dependency gates documented elsewhere.

Final source web cache fingerprint: 82820aa3c993. Stopped owned static server PID 69995 and verified no listener on 43821. All six routes cold-reloaded again from this cache without console errors. Task-owned native simulators were shut down by exact UDID after closing their Device panels; borrowed simulators/services were left running.

## Internal TestFlight delivery, October 19, 2026

Leon requested TestFlight for his own testing after the family preview. Source `567b5174146123dc630e13cd09d69e99f7e7d2c8` produced a local Xcode 26.6 Release archive and App Store distribution export, version 1.0.0 (4). The runtime game code is unchanged from the recorded build 3 tests. The source configuration gate passed typecheck, lint, 44 tests, web export and Expo Doctor 21/21; CI passed the release configuration, and an independent reviewer approved it. Strict signature, exact bundle/version, both device families, minimum OS16.4 and App Store profile entitlements passed. The temporary signing credentials/keychain/profile were cleaned.

EAS cloud build creation was rejected because the free monthly iOS allowance was exhausted; no upgrade was purchased. The local artifact was submitted instead. Submission `6e2572ae-676d-4c08-8b2f-9113efdf16cc` finished. App Store Connect app `6824481437` processed Apple build `25e90130-e46b-46b0-a271-f3dc0ea3e38d`. Agent-executed UI verification confirmed the Leon internal group has one tester and one build, **1.0.0 (4) — Testing**, with the existing tester account **Invited**. Automatic distribution is off; no public link was created. The final API check timed out, so the final availability evidence comes from the actual group/tester views. See [release details](TESTFLIGHT.md) and [structured evidence](evidence/testflight-build4.json).

This passes beta delivery to the invited account. It does not pass physical installation or the remaining acceptance matrix above. TestFlight no longer requires registering the iPad’s device ID for this route. Its actual model/iPadOS, offline audio and cold launch, Files export/import round trip, VoiceOver, remaining modes/devices and family usability still need verification before overall release acceptance and merge.

## Family feedback integration, October 19, 2026

Leon explicitly requested review, fixes and merge of PR1 after testing TestFlight build4 on his phone. His screenshots establish adult phone installation, home/Tic/checkers/word play and the reported defects. They do not establish Stassie/iPad/offline/audio/VoiceOver acceptance. TestFlight installation supersedes device-registration requirements for A15. Earlier blanket PR holds above describe the previous agent's release workflow; the current source-integration gates and execution ledger are in [POLISH_REVIEW.md](POLISH_REVIEW.md). Public release and the unfinished family acceptance matrix remain separate and unpassed.


## Math practice and optional practice before play — 26 October 2026

Application source `aba07b2`, private TestFlight 1.6.0 (12). The scoped scenario ledger, browser receipt, final code-review status and native host limits are in [MATH_PRACTICE.md](MATH_PRACTICE.md). Full check: 520 tests/40 files and Doctor 21/21 passed; browser practice, cancellation, saved-state and offline journeys passed. Native math interaction did not run because the simulator host/runner failed before interaction. This remains an acceptance gap; it is not superseded by archive/signature checks. Leon explicitly authorized the private beta for real-device testing. Delivery is verified in [testflight-build12.json](evidence/testflight-build12.json). No public release or merge. Owned runtime resources were cleaned.


## Learning growth and warmer voices — 26 October 2026

Private TestFlight1.7.0(13), source `70ed873c8dc3d4b6ae648e7e39b4b020f54fe0e3`, was verified VALID/IN_BETA_TESTING in the existing Leon internal group. The full source gate and CI passed574 tests across45 files, typecheck, lint, web export and Doctor21/21. Both complete offline voice banks contain2766 scripts; all5535 referenced files decoded and match the signed IPA bytes. Both stages across all12 learning games passed actual browser interaction, with original activities/saves, learners, warmups, backups, layouts and final-bank offline checks recorded in [LEARNING_GROWTH.md](LEARNING_GROWTH.md).

Native automation remained blocked by the device daemon timeout. Physical installation/update, audible comfort, native background/rotation/VoiceOver, Files and child usability remain operator acceptance. The held PR13/14/15 stack is not merged and public release is not authorized. [Build13 delivery evidence](evidence/testflight-build13.json) separates beta availability from these unpassed cases. Task-owned runtime resources were cleaned.
