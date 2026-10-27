# Island Arcade kit

## Scope and acceptance

27 October 2026; branch `feat/arcade-kit`, base `0fbd8af` on `origin/feat/island-arcade`. Sources: `ISLAND_ARCADE.md`, `PRD.md`, `LEARNING_GROWTH.md`, the W1 brief, current Store/validation/practice/learner engines. Private offline family play, primarily a seven-year-old and her family. No accounts, network gameplay, currency, pressure to return, or store publication. Preserve version-1 saves and recovery originals. Real-time rounds restart after termination; only validated earned progress is saved per active learner. Reading is untimed.

Acceptance for this slice: shared kit plus Reef Builder and Shell Song, each with three eight-level worlds, an eight-level learning world, endless/free play, visible star goals, teaching, Helper, cosmetics, optional visible-sticker chests and strict progress validation. A01/A03/A04/A05/A08 are executed by the implementation agent on isolated fixtures at 390×844 and 1024×768 web and one fresh iPad mini Release simulator. Native simulator measurements do not establish A12 hardware performance, audible comfort, VoiceOver, or Stassie's acceptance. Public release and the lead's integration build remain separate.

Experience: cream/teal island surroundings; coral reef garden and a moonlit shell stage. Large labelled controls, shape plus color, short visible directions and a demonstrated first move. A coral placement settles immediately, then a short fish release confirms a clear. A shell glows only for its note; decorative celebrations become still with Reduce Motion. No reading deadline. The map and results always offer a clear way back.

## Rendering experiment

The retained `/arcade?spike=1` harness compares 60 static vector fish moved with shared Reanimated transforms against React-state/SVG transforms. Two-second warmup, then twenty seconds of JS requestAnimationFrame intervals and publication cost. These measure scheduling/publishing, not compositor or physical GPU frame time. Re-run the harness on target hardware before physical acceptance.

SDK 57 setup checked before implementation: [Expo Reanimated](https://docs.expo.dev/versions/v57.0.0/sdk/reanimated/), [Expo Skia](https://docs.expo.dev/versions/v57.0.0/sdk/skia/), [Expo Audio](https://docs.expo.dev/versions/v57.0.0/sdk/audio/), [Expo Haptics](https://docs.expo.dev/versions/v57.0.0/sdk/haptics/). Installed Reanimated + Worklets only through `npx expo install`; babel-preset-expo configures its plugin. Skia's web CanvasKit loader would need a same-origin wasm asset copied into dist before the existing recursive offline cache runs; a CDN default cannot satisfy offline use. No Skia dependency or wasm is currently added.


### Measured decision

Choose **Reanimated-driven views with static SVG sprites**. Use JS pure fixed-step rules and publish the small pose array to shared values; `ArcadeSprite` owns only transform/opacity. HUD snapshots are limited to 10 Hz. Turn-based boards render only on actions. Do not copy the stress harness's React-state baseline into a real-time game.

The desktop comparison showed no meaningful scheduling advantage; both candidates met the scheduling target. The chosen pipeline lets later games animate without reconciling their art tree every frame and adds no wasm loader/cache lifecycle. Skia was evaluated from its SDK/web setup, not installed or benchmarked. Reconsider it if real hardware profiling identifies a drawing bottleneck.

| Target / 60 sprites / 20 seconds after warmup | Pipeline | Frames | Mean fps | p95 interval | >25 ms | Max | p95 publication |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Chromium export, 1024×768 touch context, Mac host | shared transforms | 2400 | 119.93 | 9.30 ms | 1 | 57.40 ms | 0.10 ms |
| Same | React SVG | 2404 | 120.20 | 9.30 ms | 0 | 10.70 ms | 0.10 ms |
| iPad mini 5 simulator, iOS 18.5, embedded Release | shared transforms | 1202 | 60.0004 | 17.74 ms | 3 | 26.20 ms | 0.110 ms |
| Same | React SVG | 1201 | 60.0002 | 17.00 ms | 2 | 29.80 ms | 0.067 ms |

These are JS frame scheduling and publication measurements, not GPU/presented-frame measurements. The host can exceed 60 Hz in web Chromium. The simulator models an iPad mini display and OS but runs on Mac silicon; **A12 physical smoothness remains unverified**. No claim of physical-device acceptance follows from these numbers. The five native build warnings include the host's unavailable Metal toolchain search path; the Release build succeeded with zero errors.

Receipts outside Git: `little-island-games-artifacts/island-arcade/arcade-kit/spike-web.json`, `spike-web-shared.png`, `spike-web-react.png`, `native-current.png` (native shared), `spike-native-react.txt`, `spike-native-build.log`, `pods.log`. Fresh simulator UDID `3C603F34-F066-4801-91FC-1E4F88E20C6E`; delete only this task-created device after final QA.

## Kit API

`src/arcade/index.ts` exports only pure types, registry and progress functions. Save validation can import it without loading React Native. UI, audio, loop and renderer modules have direct paths.

- `types.ts`: reserved IDs for all nine arcade games; `ArcadeEngine<State, Input, Level>` has `create`, action `reduce`, optional fixed-step `step`, `result`, and development-state `validate`. Level IDs are `w1-1`…`w3-8`, `learn-1`…`learn-8`. Every level has three visible goals. Add further levels by updating the bounded ID validator and corresponding tests together.
- `registry.ts`: finished game descriptors, color/surface, hero, learning subject, two-player capability and four worlds. Unbuilt games have reserved IDs but no visible cards.
- `clock.ts`: `advanceClock` takes elapsed seconds and returns an integer step count with `FIXED_DT = 1/60`; clamps a frame to 100 ms (at most six steps). Invalid elapsed time does nothing. `snapDrop` converts a first-cell-center pointer into a cell; `swipeDirection` returns four directions after a distance threshold. Use the same reducer for taps and snapped drops.
- `loop.tsx`: `useArcadeForeground` combines Router focus, AppState and browser visibility. `useArcadeLoop` keeps deterministic simulation in a ref, calls an optional `onFrame(state)` to publish shared poses, emits 10 Hz HUD snapshots, and reports fps/p95/max/clamped time. Passing `active=false` for pause/sheets cancels its frame and discards the clock remainder. `useArcadeReducer` gives turn-based games synchronous ownership of queued taps. Never save a real-time state. Navigation/termination restarts its round.
- `Sprite.tsx`: `ArcadeSprite` consumes one `SharedValue<SpritePose[]>` and an index. Keep children static SVG; set only x/y/angle/scale/opacity. Gameplay movement remains with Reduce Motion; decorative demonstrations/celebrations honor the existing preference.
- `ArcadeScreen.tsx`: shared lobby/frame, level start/goals, pause, Helper, teaching sheet, results, next/replay/map, collections, settings and a reminder between results. The game view receives `active`, Helper and a result callback. Own the round by epoch/learner/round, and call the result callback once.
- `progress.ts`: `arcadeTransition`, `validArcade`, learner/game selectors and derived gates. World 2 opens at 12 game stars; World 3 at 30; learning starts open. Later levels require the preceding star, unless grown-up unlock-all is set. Clear all eight World 1 levels for free play. Outfits open at 0/12/30/60 stars; Helper never changes thresholds. Best scores are local, five remembered names per game. No currency or time-based unlocking.
- `saveAction.ts` / Store: `store.arcade(action, {epoch, learner})` returns whether the action was accepted. It checks current learner and restore epoch, uses the existing recovery/persistence queue, and atomically consumes a chest with its sticker and existing practice/learner notes. Round tokens prevent duplicate result/reward credit. New `save.arcade` is optional, versioned and bounded; the outer save version stays 1. Unknown fields/IDs, inconsistent world/outfit totals, invalid scores and orphan owners reject at the existing parse/recovery boundary. Original corrupt data is preserved by the unchanged recovery path.
- `Chest.tsx`: one question from `createPracticeRound`, answered through `practiceTransition`. `PracticePanel` has a fixed three-question contract, so this adapter reuses its engine and math/reading pictures rather than silently changing it. Wrong answers offer a hint and retry, Help marks assisted, Skip costs nothing. The offered sticker is visible before solving; collection and practice notes are one accepted write. The active learner's enabled practice settings win; otherwise the game's natural subject is used.
- `Collection.tsx`: 16 original island stickers and four hero outfits. `Art.tsx` contains original vector art; color always has shape/text companions.
- `audio.ts`: short original synthesized tones and two quiet eight-second loops in `assets/arcade`, about 1 MB total, generated by `scripts/synthesize-arcade.py`. All are literal `require` assets, picked up by the existing recursive offline web cache. Music defaults off, respects global sound and pauses behind sheets/background. Haptics use the existing optional-feedback adapter.

### Narration integration

Workers must not generate speech or modify the existing voice banks. Registered English lines live in `scripts/arcade-speech.json`; run `python3 scripts/export-arcade-audio.py` immediately before the lead's combined narration generation. This stages `scripts/learn/arcade.json` for the existing manifest collector. Commit that staged manifest with the generated, decoded, complete warm/calm banks. Leaving an incomplete live manifest would break the existing bank-completeness gate, so it is deliberately not staged by this worker.

The 20 keys cover six instructions and fourteen `arcade-phoneme-*` cues. Phoneme cue text uses an explicit English anchor word; the lead should audition the generated cues and tune isolated phonetic audio before family acceptance. No new clip is required for gameplay: letters, prompts, shapes and tones remain available. Existing curated `wordAudio` keys and original reading pictures supply blended words. Words with a two-sound `x` are excluded from the three-sound learning levels. Reading responses and picture choice have no timer.

## Add a new arcade game

1. Use the reserved ID in `types.ts`. Build a pure engine under `games/<id>/engine.ts`. Put all randomness in the seed, input in serializable actions, time in fixed `dt`. Implement `create`, `reduce`, optional `step`, `result` and `validate`. Rules and hints must call the same functions. Return a terminal result once; do not persist a real-time board, clock or pattern.
2. Supply 8+ levels in each of three normal worlds and a learning world. Match the bounded IDs, world gates and explicit 1/2/3-star goals. Keep World 1 forgiving and tune each world's mechanics/tempo. Add deterministic content tests and finish every learning level through actual engine actions.
3. Add the finished descriptor to `registry.ts`, including subject, hero, colors, worlds and actual two-player support. The Home shelf derives its cards additively from this registry. Add a view branch in `ArcadeScreen` that receives shared active/Helper/result callbacks; keep app navigation in the existing `/arcade` route.
4. Draw original vector art in the game folder or `Art.tsx`; use static sprite children and shared transforms for movement. Add a four-outfit set tied to the kit thresholds. Do not introduce money, energy, ads, external links, paid-style random rewards, imported franchise art, or new CHamoru terms.
5. Implement show-me teaching on first play, clear instructions with sound off, Helper without star penalties, deliberate failure/retry and free play. Reading stays untimed. Game-frame sheets and background must pass `active=false` to the loop/input boundary; returning from background shows Pause rather than silently resuming.
6. Use the shared chest, collection and `store.arcade` actions. Capture `{epoch, learner}` when a round starts. Preserve other learners and legacy saves. Add any speech to the pending source and export it only with complete generated banks. Reuse existing speech/pictures where possible.
7. Add tests for deterministic rules, level goals, simultaneous events, malformed input/state, all learning levels, Helper, failure/retry and scoring. Extend the progress validator/tests for any additive save shape; do not loosen it to arbitrary records.
8. Run `npm run check`, `npm run doctor`, and the advisory design scan. Play A01/A03/A04/A08 through real UI at phone/tablet sizes and record persisted outcomes. For real-time games run the stress harness/dev budget overlay and compare physical A12-class performance. Verify offline cold reload with the server stopped, sound-off text, Reduce Motion, background and sheet pause, kill/restart, portrait and landscape, and free-play scores. Record blocked/not-run dimensions honestly. Clean only owned runtime resources.

Checklist: engine + validator; three normal worlds + learning world; star goals + Helper; free play; original art + outfits; first-play teaching; active/focus/background/sheet handling; chest + learner notes; strict legacy-compatible saves; tests + full gate; phone/tablet/offline QA; performance evidence; resource cleanup. New integrations need the lead's final combined-code review and family device acceptance.

### Break clock and stale actions

`breakClock.ts` adds active play segments across games in memory. Pause, background, navigation and sheets stop the segment. A reminder is checked only in the terminal-result callback and is never rendered over gameplay; acknowledging it clears the accumulated time. It defaults off and no clock is persisted. Returning to a previously visited arcade game still clears the normal-game Continue marker. Store actions bind to the current learner and restore epoch; direct dictionary reads use own properties so imported learner IDs cannot inherit a prototype member.

## W1 verification receipt

Implementation source `366cf4d122ed6811db8c16c2466f4b5236b9ecfe`; the subsequent receipt commit changes documentation only. Agent-executed, isolated local fixtures on 27 October 2026. Web uses the brief's Chromium executable with touch-enabled 390×844 and 1024×768 contexts; primary QA fixes `Math.random` to a reproducible seed. All moves, questions, settings, backups and confirmations are performed through UI. Seeded engines choose legal test moves; they do not set outcomes. Portrait 768×1024 and landscape 844×390 also exercise actual Reef placement/results.

| Scope | Web 390×844 | Web 1024×768 | Native iPad mini 5 / iOS 18.5 Release |
| --- | --- | --- | --- |
| A01, both games: Home/island → map → teaching → play → stars → chest → saved sticker → book/back | Passed | Passed | Passed, first normal level of each game, both chest paths and shared book |
| A02, first level in each of 3 normal worlds + learning world | Passed for both games | Passed for both games | Not run beyond World 1 |
| A03, wrong/helped, independent, free skip; persisted notes/stickers | Passed | Passed | Reef wrong/help/sticker and Shell independent/sticker passed; skip not run native |
| A03, separate learner ownership | Passed, grown-up-created learner; learning result isolated | Covered by pure save tests, not separately repeated | Not run |
| A04, pause/sheet/reload, earned progress retained; sound-off text | Passed, Reduce Motion enabled | Passed, normal motion | Background via Safari/return latched Pause; resume; termination/cold launch restarted at map with stars retained |
| A04, actual Helper-off failure/retry | Passed for both games | Not separately repeated | Not run |
| A05, 60-sprite renderer scheduling | 1024×768 stress receipt above | Passed scheduling sample above | Passed Release scheduling sample above; physical GPU/A12 acceptance remains not run |
| A08, backup export, picker import and confirmation, exact arcade round trip | Passed | Passed | Not run native |
| A08, malformed optional field at cold startup, byte-exact preserved original, restore after fresh start | Passed | Not separately repeated | Strict validation unit tests only |
| Free play/name/high score | Actual note, named 10-point record and voluntary finish passed | Not separately repeated | Not run |
| Offline cold reload and actual play/results with preview stopped | Final receipt below | Final receipt below | Embedded Release plays without Metro; physical airplane mode not run |

Engineering on the implementation source: `npm run check` passed typecheck, lint, **630 tests / 47 files** and web export; `npm run doctor` passed **21/21**. Advisory Impeccable 4.6.0 scan of changed UI returned `[]`; it is not family usability acceptance. New tests cover both engines, all 32 Shell Song levels, all level openings, simultaneous Reef clears, make-ten rules, deterministic RNG, fixed clocks/input, Helper/failure/retry, progress gates, round ownership, hostile/malformed saves, old-save compatibility, independent/helped notes, and duplicate credit.

Final native Release was built from `366cf4d` with zero errors and one host toolchain warning. `build-manifest.json` records the embedded JS digest; app version/build configuration was not changed. No Metro server was started. Native screenshots and SQLite receipts verify earned stars/stickers and practice notes. The fresh task-only simulator `3C603F34-F066-4801-91FC-1E4F88E20C6E` was shut down and deleted after QA; no other simulator was claimed or changed.

Evidence root (outside Git): `/Users/leonshimizu/Desktop/ShimizuTechnology/little-island-games-artifacts/island-arcade/arcade-kit/`. `qa.cjs`, `qa-ledger.json`, `qa-final-run.log` and the phone/tablet screenshots record the primary matrix. `extra-ledger.json` / `extra.cjs` cover failure/retry, simulated web visibility, learner isolation and free play. `recovery.cjs`, `recovery-ledger.json`, `corrupt-recovery.png` and the 768×1024 / 844×390 images record cold recovery/orientation. `native-qa.py`, `native-interrupt.py`, `native-collection.py`, `native-qa-receipt.json`, native screenshots and `native-final-*-save.json` record final installed behavior. Native driver `press home` was unsupported; the successful background check used its documented app-opening operation to switch to Safari and back.

Retest history: an initial web reload raced a concurrent export and received a transient static 404; the export was allowed to finish and the complete matrix reran without overlapping exports. The first native build exposed a chest that saved the reward but unmounted its confirmation; the offer is now retained locally through atomic consumption, and both web sizes plus the final native build passed the correction. Earlier native evidence and failed harness attempts remain in the artifacts; the final-head receipts supersede them. A malformed-save injection into a live page was replaced by a controlled cold-start fixture so queued valid writes could not overwrite the intended test data.

Remaining integration/family gates: the lead's independent final-code review, combined voice-bank export/generation/decoding and phoneme audition, seven later arcade games, Android, native Files/VoiceOver/large-text/rotation coverage beyond this slice, physical A12/iPhone/iPad performance and audio comfort, and Stassie's acceptance. No PR, merge, store publication or version/build increment is part of this branch.

Additional final-source checks: the grown-up gate enabled music and the 15-minute reminder; a controlled clock advance during Reef play did not show a reminder until the cleared-level result. Acknowledgement dismissed it. The outfit closet/base selection and Home → favorite Reef Builder routing passed. See `comfort.cjs`, `comfort-receipt.json` and `between-level-break.png`. All eleven new WAV files decoded at 22,050 Hz with bounded peaks (`audio-receipt.json`); audible comfort still needs real hardware.

### Final offline and cleanup result

Final web cache `little-island-0e8cb6f518ab` contains the complete export and all eleven new Arcade WAV assets. The owned preview listener was stopped with SIGTERM before testing cold navigation. Reef Builder at 390×844 and Shell Song at 1024×768 each cold-reloaded, reached an actual three-star result, retained earned progress, and opened the shared sticker book from service-worker cache, with no page errors. Receipts: `offline.cjs`, `offline-cache.json`, `offline-receipt.json`, `offline-reef-builder.png`, `offline-shell-song.png`, and both `offline-book-*.png` images.

The complete primary phone/tablet matrix was rerun against implementation commit `366cf4d` after the last export finished; all 22 dimension-specific ledger entries passed. This is scoped two-game coverage, not acceptance of the seven later arcade games or the complete product ledger. The final native receipt also includes independent Shell chest completion and the shared sticker book.

Lifecycle session `01a17ca4-9439-7793-8a31-22053fed0d9d`: preview stopped, owned T3 tab closed, all Playwright browsers closed, fresh simulator shut down and **deleted**, no Metro started, no owned running resources or intentional resource handoffs. Borrowed resources were not claimed or stopped. See `lifecycle-final.txt`. The branch/worktree and ignored generated iOS build files remain available for lead integration; no PR or merge was created.
