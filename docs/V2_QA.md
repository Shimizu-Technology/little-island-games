# V2 integration acceptance

Agent-executed comprehensive acceptance against `docs/V2_RELEASE.md`. This ledger records integration evidence separately from physical family acceptance. Baseline main `e4ba26a`, installed preview 1.0.0 (5). Current target 1.1.0 (6), iOS/iPadOS minimum 16.4.

## Engineering and review evidence

- Source `8d4f52e`: full `npm run check` passed (131 tests, TypeScript, ESLint, web export and 201-resource offline shell). `npm run doctor`: 21/21 passed. Impeccable 4.6.0 advisory scan: `[]`.
- Independent reviews covered Hangman, cards, racer, Explore, party, native bridge, mystery rules/protocol and shared integration. Material findings fixed: unsupported web blur event; airborne finish saves; outdated spoken Hangman rules; inaccurate animal pictures; native peer UTF-8 bounds and retry expiration; clock reset on save renders; recovery entry guard. Mystery controller concurrency fix and its regression suite require final delta review.
- CodeRabbit reports Free plan summaries and skipped draft review; no CodeRabbit code approval is claimed. Repository policy permits completed independent final-code review for unavailable advisory review. GitHub validation passed at `8d4f52e`; later heads must be rechecked.
- Installed simulator Release compiled successfully using SDK26.5 with native `IslandNearby`. Initial tested JS bundle SHA256 `046fc8a970afe327d7965bffc369e4e1fb6a7f48a550edaf9b3cc55081b260df` from clean source `8d4f52e`. Later controller/UI changes require refreshed artifact and affected journeys.

## Runtime ledger (in progress)

| Case | Evidence and current status |
| --- | --- |
| V01 Existing six | Native regression underway. All six original sessions and settings were retained on update. |
| V02 Hangman | Native Challenge/Practice, rapid taps and records acceptance underway. |
| V03 Cards | Native Go Fish request and CPU response work. Solo repeated handoff friction identified and fixed; refreshed native acceptance pending. Full round/edge/private-handoff acceptance pending. |
| V04 Word Imposter | Browser Home→Secret Word setup reached; complete native family round pending. |
| V05 Racer | Installed training/course selection and starting controls reached; active movement, collisions, finish and suspension acceptance pending. |
| V06 Character Imposter | Native solo QA underway; real discovery, approval, three-device round and interruption/rejoin acceptance pending. |
| V07 Explore | Installed mini map and 50 topics, turtle search and visible transcript verified; remaining labs/favorites/narration acceptance underway. |
| V08 Offline | Installed Release cold-launched with no Metro server. Full feature/audio and browser service-worker acceptance pending. |
| V09 Responsive/accessibility | Installed phone402×874 and mini layouts under examination; orientation/large text/permission refusal pending. Physical touch, performance and heard VoiceOver remain operator checks. |
| V10 Update/backup/recovery | Phone build5→6 retained exact saved bytes: SHA256 `3b65b80104bad09bbc37f912f1940f63fe41c944f89578b28334a276ecd89bbf`; all six sessions, soundOff/helpOn. New envelope round-trip/invalid import/restore generations covered by tests; actual parent backup and direct recovery entry checks pending. |
| V11 Gates/review | Initial full gate and native compile passed. Later changed-code gate, final review and required CI pending. |
| V12 Delivery | Draft PR#2 linked; not merged. Signed IPA, submission, processing and internal tester availability pending. |

Browser automation limitation: both agents encountered consecutive T3 snapshot disconnection/15-second timeout failures. CUA Chrome creation also timed out30 seconds and reset/unavailable surfaces. Own tabs were closed/released. These are tool failures, not application passes. Native QA continues; no completed browser card/party/racer/Explore journey is claimed from these attempts.

Physical family/public acceptance is still unpassed: exact Stassie iPad model/OS, real-device airplane/audio, sustained performance/battery, physical controls/VoiceOver and observed child usability. The authorized internal build is for that testing; public distribution remains held.
