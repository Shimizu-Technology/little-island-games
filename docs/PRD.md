# Little Island product brief

Established 2026-10-19 from Leon's family-first approval and request to implement the full plan.

## People and purpose

A seven-year-old chooses short, enjoyable games independently or plays alongside a parent on one device. Practice opportunities include familiar spelling, numbers, planning, and spatial exploration. No claims of measured educational improvement.

Local reference source checked: TraceBuddy edf4696 (local saves/family activities), Party Games Hub a9d1524 (shared-device patterns), Håfa Recipes 067ca9b (Expo releases), HåfaGPT 609a8eb (reviewed language-content practices). These are local source observations, not fresh production audits. Private family notes informed short, encouraging activities; no sensitive family context belongs in this repository.

## Scope

Universal Expo/React Native iOS app and shared web build. All six games, essential audio, and content bundled. No accounts, advertising, analytics, backend, live AI, purchases, or remote multiplayer. Local saves do not sync between devices and uninstalling can remove them. Parent backup export/import supports recovery and future transfer.

Games: Tic-tac-toe (local opponent/two players), Word Rescue (curated word packs/parent secret word), Memory Pairs (solo/cooperative/two players), English/American Checkers (local opponent/two players/tutorial), Maze Explorer (generated solvable mazes/hints), Number Island (Shut the Box style counting/addition).

Difficulty is explicit and reversible through a new-round setup. Assistance is free. No timers, streak penalties, lost lives, required wins, or locked games. Stop after a round or return home at any point. Child-facing language is concrete and brief.

## Design

Working name: Little Island. Warm cream, deep teal, coral, lagoon blue and mustard; original vector illustrations rather than emoji. Large tap targets, readable text, clear focus/selected states, color plus shape for pieces, portrait and landscape, phone and tablet. Motion limited to immediate pressed-state feedback; system reduced motion remains respected.

Journey: choose game → start/resume → understand first action → play/request help/undo → finish → replay or return. Returning home and interrupting a computer turn must preserve a valid resumable state.

## Architecture

Pure TypeScript rule engines and serializable game sessions; shared rules for moves, AI, hints, and validation. Bounded local opponents. Versioned local saves with ordered writes and validation; native SQLite transactional key/value storage, web localStorage adapter. Preserve incompatible/corrupt saves and show recovery rather than silently replacing them. Settings separate from game progress. No outbound network dependency in core play.

## Checkers contract

8×8, 12 pieces/side, red starts and moves down rows. Men move/capture forward. Captures compulsory; no maximum-capture requirement. Continue chains with the same piece. Crowning ends the turn. Kings move one square/jump adjacent enemies diagonally either way. No legal move loses. Automatic threefold repetition and 80 quiet plies are explicit casual-app adaptations of claim-based draw provisions. A man move or capture resets quiet count. Undo restores a complete player decision, including a computer response in solo play. Source: https://wcdf.net/rules/rules_of_checkers_english.pdf

## Release and unknowns

Family installation via signed registered-device build; adult TestFlight only (Apple excludes under 13). Public App Store release needs separate child-facing privacy/metadata/review acceptance. Device models and OS versions awaiting Leon; SDK selected from current stable compatibility, documented minimum iOS 16.4. No public release or child usability claim without real-device/family evidence.
