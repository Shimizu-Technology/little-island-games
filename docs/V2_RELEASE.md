# Little Island V2 release contract

Approved scope: Leon, 2026-10-19. Source baseline e4ba26a (main), TestFlight 1.0.0 (5). Implementation authorized through review, merge to main and next internal TestFlight build. Family-first native iPhone/iPad plus shared web; no public store publication or live-AI backend. Preserve six existing games, local saves and backups. Exact family iPad model/OS remains unknown.

## Complete scope

- Hangman: new rounds default Challenge; six wrong unique letters lose, every occurrence of a correct letter reveals, repeat/invalid/after-terminal inputs do nothing. Familiar six-part stick figure. One optional reveal of one missing distinct letter (all occurrences), result assisted. Practice unlimited. Clue before completion, answer narration after win/loss. Loss reveals answer without changing guessed letters or becoming a win. Persist outcome and local records once, with unassisted records separate. Legacy rounds stay Practice with identity/guesses intact. Packs and private family word supported.
- Go Fish and original Crazy Eights: complete pure rules and honest bounded local opponents, clear fixed house rules, hidden-hand same-device family play, guided instructions and terminal results. CPU sees only its own hand/public history. Pause/background conceals private information. Save/resume and replay.
- Secret-word Imposter: offline pass-one-device game for 3–8 family players, reviewed word/picture packs, conceal/pass/reveal, clues, votes/ties, reveal and team result. No network or generative AI needed.
- Obstacle race: original island identity, playable training plus three distinct authored courses, responsive run/jump, grounded collision/checkpoints, moving obstacles, CPU opponents, race and practice modes, meaningful finish/placement and local bests. Use an appropriate fixed-step simulation/renderer; prove feel and timing in installed Release builds. Pause/background stops simulation; resume semantics explicit. Do not call decorative characters multiplayer or claim physical-device performance from a simulator.
- Character Imposter: separate original family mystery with controllable exploration, tasks, sabotage, discussion/voting and crew/mischief win conditions. Solo practice with scripted computer players plus parent-created nearby-family rooms. Real authoritative state, concealed roles, approved joins, sequence/version checks and interruption/rejoin behavior; no public matchmaking or cloud service.
- Explore: 50 reviewed topics across Space, Oceans, Animals, Weather, Guam & Our World. Illustrated offline map, topic search/related internal destinations, favorites, locally available narration/transcripts, one substantive interactive per world. Every topic has short explanation, deeper fact, useful question/activity, original or licensed art and recorded sources/review. No unrestricted browser/Wikipedia dump; core bundled, no required download.
- TraceBuddy remains separate. Parent-only optional handoff may be provided after confirming URL scheme. No automatic art/photo/camera sharing or whole-app merge.

## Engineering and ownership

Integration branch feat/little-island-v2, isolated root worktree /Users/leonshimizu/Desktop/ShimizuTechnology/little-island-v2. Parent owns common Store, validation, app routes, shared game registry/types, package/config, release docs and integration. Independent writers own separate worktrees. Engines and UI modules should export explicit contracts; integrate through shared shell/save validation. Expo SDK57/RN0.86; read matching current documentation before API changes. No generated ios/android hand edits.

Rules must drive UI, CPU, hints and validation. Saved sessions are bounded and validated; use intentional migrations or backward-compatible fields, preserve originals on unsupported/corrupt imports. Share/export must include new game progress and Explore favorites. Keep archived QA history; add V2 ledger with exact source/build/environment and passed/failed/blocked/not-run cases.

## Required source integration acceptance

Agent executes automated tests and actual native/browser journeys. Physical family checks are the purpose of the authorized internal beta and remain explicitly unpassed until Leon/operator executes them. Public release remains held for physical acceptance, rights/privacy/store review.

- V01 Existing six games: resume, moves/hints/undo, terminal/replay, settings/backup recovery preserved.
- V02 Hangman win, sixth-miss loss, repeated letters, duplicate/rapid taps, final reveal consistency, one hint, Practice, old saves, records counted once across restart.
- V03 Cards: valid full rounds, CPU information fairness, empty decks/hands/ties, wild-card rules, private handoff/background, exact resume/replay.
- V04 Word Imposter: 3+ players reveal/clue/vote/tie/result, secret concealment, pause/resume, reviewed packs.
- V05 Racer: training and all three courses traversable, every obstacle family, actual CPU placement/finish, pause/background/resume, defeat/retry, checkpoint/best record, portrait/landscape controls.
- V06 Character Imposter: tasks/sabotage/meetings/votes/terminal outcomes, solo roles, private family lobby/join, state/role validation, disconnect/rejoin/host loss. Native two-device transport proof, not mocked-only acceptance.
- V07 Explore: all50 topics reachable, maps/internal related links/search/favorites, all5 interactives operable and recoverable, narration/transcript/stop, no unintended external navigation.
- V08 Installed Release offline cold-launch with all game/content/audio resources bundled. Browser cold-offline with latest service worker; record tool limitations separately.
- V09 iPhone and iPad portrait/landscape, large text, labels/focus/reduced motion, permission refusal, navigation and saved state. Real VoiceOver hearing/physical touch remains operator acceptance.
- V10 Update from build5 preserves saves/settings; new backup round-trip and corrupt/unsupported recovery preserve originals.
- V11 Full engineering gate and Doctor, native Release compilation, independent final changed-code review, required CI and no unresolved material findings.
- V12 Exact committed build number, signed IPA identity/source/hash, successful submission, Apple processing and existing Leon internal-group availability. No public distribution.

## Family/public acceptance still requiring operator

Stassie completes representative games including a Hangman loss, whole obstacle course, secret-role family game and map discovery without persistent confusion. Verify actual oldest supported hardware performance, airplane-mode launch/audio, VoiceOver, touch controls and sustained battery/thermal behavior. Obtain actual model/OS before claiming compatibility beyond documented minimum. No source merge, screenshot or automated test substitutes for this evidence.

## Delivery order

1. Contract, isolated ownership, early racer/local transport feasibility.
2. Hangman/cards/party game and offline content production in independent slices.
3. Integrate Explore, full race courses and character mystery/nearby family rooms.
4. Combined native/browser/backup/offline acceptance and independent review; fix material issues.
5. Merge ready reviewed source; versioned internal TestFlight delivery and exact cleanup.

Technical proof failures must lead to an explicit evidence-backed scope decision; do not silently replace a planned game with a placeholder or claim partial work complete.
