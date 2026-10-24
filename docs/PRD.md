# Little Island product brief

Updated 2026-10-25. Learning games (reading, numbers, science, thinking, CHamoru words) with islands on Home are recorded in [LEARNING_WAVE1.md](LEARNING_WAVE1.md) for 1.4.0 (10). The shipped quality-release evidence is in [QUALITY_QA.md](QUALITY_QA.md). Family-ease improvements ([FAMILY_EASE.md](FAMILY_EASE.md)) shipped in TestFlight 1.2.0 (8). The 24 October design and family-play polish (family matches with names and scores, reachable controls, motion/haptics, Hangman word ranges) is recorded in [AUDIT_POLISH.md](AUDIT_POLISH.md) and shipped to internal TestFlight as 1.3.0 (9).

## People and purpose

A seven-year-old chooses enjoyable games and discoveries independently or plays with family. Activities practice spelling, numbers, planning, observation and spatial exploration. There is no claim of measured educational improvement.

Local reference sources checked during orientation: TraceBuddy edf4696 (local saves/family activities), Party Games Hub a9d1524 (shared-device patterns), Håfa Recipes 067ca9b (Expo releases), HåfaGPT 609a8eb (reviewed content practices). These are local source observations, not current production audits. TraceBuddy remains a separate app; live conversational AI is deferred.

## Scope

Universal Expo/React Native iPhone/iPad app and shared offline web build. Eleven games: Tic-tac-toe, Hangman, Memory Pairs, Checkers, Maze Explorer, Number Island, Go Fish, original Crazy Eights, Secret Word, Island Dash and Picnic Mystery. All games have offline solo or shared-device modes; Secret Word requires at least three people sharing one device. Picnic Mystery adds parent-approved private nearby iPhone/iPad rooms for three to eight players. There are no accounts, ads, analytics, purchases, cloud sync, public matchmaking or live-AI backend.

Explore bundles fifty reviewed topics across Space, Oceans, Animals, Weather and Guam & Our World. Each has an original explanation, deeper fact, question/activity, illustration, transcript, narration and source/review metadata. Five interactive lessons accompany the map, search, favorites and internal related topics. Reference URLs do not open an unrestricted browser.

Two-player Tic-tac-toe, Memory, Checkers, Go Fish and Crazy Eights keep a family match: optional names, who starts or alternate, and a running score stored with the round. Hangman levels are word-length ranges (3–4, 5, 6+). Hangman defaults to Challenge: six distinct misses end the round, one reveal marks an assisted result, and both wins and losses are recorded locally once. Practice and legacy rounds remain unlimited. Island Dash has training, three obstacle courses, computer racers, checkpoints, race/practice modes and local records. The three-minute course limit and interruption behavior are explained in the game. Other games keep their explicit, reversible difficulty and mode choices. No streak penalties, purchases, required daily play or locked games.

## Design and journeys

Warm cream, deep teal, coral, lagoon blue and mustard; original vector art, large touch targets and explicit focus/selected states. Color and shape distinguish pieces. Support phone/tablet, portrait/landscape and larger text. Motion has a purpose; gameplay movement remains necessary and decorative motion is limited.

Choose a game → start/resume → understand the first action → play/help → finish → replay or return. Secret hands/roles conceal on interruption and handoff. Explore preserves topic/search context while following related discoveries. Parent settings provide sound, backups and recovery. Local saves do not sync automatically; deleting the app can remove them.

Home puts familiar games first, supports local game favorites and alone/together browsing. Original games offer quick replay with the previous choices; private family words require fresh entry. Explore offers direct entries to five hands-on activities. Solo crew practice can show a dismissible first Garden job guide. Failed saves have an explicit retry, and grown-ups can inspect/export preserved copies and confirm a restore while keeping the replaced data.

## Architecture and domain rules

Pure TypeScript engines drive moves, computer choices, terminal outcomes and validation. Local opponents have bounded policies; card and mystery bots use their own knowledge. Serializable sessions use bounded validated saves, ordered writes and native SQLite transactions; web uses localStorage. Preserve incompatible/corrupt originals and show recovery. Backup replacement blocks ordinary writes and invalidates stale callbacks. Nearby authority, peer binding, recipient redaction, sequence checks and lifecycle rules are documented in V2_MYSTERY.md.

Checkers: 8×8, twelve pieces per side, red starts and moves down rows. Men move/jump forward; kings move/jump either way. Friendly rules default to optional captures; Classic requires a capture whenever available. Both finish a started jump chain with the same piece; crowning ends that turn. No legal move loses. Threefold repetition and eighty quiet plies are explicit casual-app adaptations; a man move or capture resets quiet count. Undo restores a complete player decision including a solo computer response. Reference: https://wcdf.net/rules/rules_of_checkers_english.pdf

## Release and unknowns

Latest recorded internal TestFlight delivery is 1.4.0 (10) for Leon's existing adult tester group; see [TESTFLIGHT.md](TESTFLIGHT.md) for source and delivery evidence. Subsequent source changes require a separate build/upload before they appear there. Public distribution also requires speech rights, child-facing privacy/metadata review and physical family acceptance.

Leon reports an iPad mini purchased around 2020/21; exact model/OS remain unknown. Deployment minimum is iOS/iPadOS16.4. Simulator success does not establish physical performance, touch/VoiceOver behavior, audio, battery/thermal behavior or Stassie's independent usability. Those remain operator checks on the family hardware.
