# Arcade games

## Rail Parade

Orientation: 27 October 2026, branch `feat/arcade-grid`, base `7d7ac79` from `origin/feat/island-arcade`. Sources: `ISLAND_ARCADE.md`, `ARCADE_KIT.md`, `PRD.md`, `LEARNING_GROWTH.md`, and the W4 brief. The local Brain Dump search returned no additional Little Island project note. This is private offline play for Stassie and family; the lead owns integration, complete narration banks, native builds and release acceptance.

Rilla the Guam rail leads a growing parade of chicks through a ten-by-ten island garden. Swipe, arrow buttons and web keys share the same reducer. A two-turn queue rejects reversals against the last buffered turn. The tail vacates its square on the same step; walls, hedges, the parade and a readable back-and-forth brown tree snake can cause a bump. Each chick gives 40 points. Completing the target earns one star, at most two bumps earns two, and no bumps earns three. Helper slows the tick by 50%; a bump costs one chick instead of ending the parade. The last chick is never taken away. Replaying is immediate; earned stars remain safe.

Garden Parade, Fern Valley and Firefly Grove each contain eight levels. Ticks start at 620 ms before Helper and get gradually quicker; later gardens add hedge corners and longer snake patrols. Clever Chicks has eight untimed step levels: counting, counting by twos/fives, and four pictured short words using tiles from the existing curated reading bank. The parade moves only when the player acts. Wrong tiles give a visible hint and another try. Learning results record counting or the actual word skill through the existing learner/practice APIs. Free play opens after all eight first-world levels and supports voluntary finish and named local bests.

Art: original outlined, highlighted rail and chick vectors; four kit outfits; green garden, fern valley, purple firefly grove and a pastel learning garden. The scene scales to available phone/tablet space, with side controls in landscape. The winding illustrated map uses numbered stepping stones, padlock art and a bouncing Next node. Tone/haptic feedback, score bursts, squash, bump wobble/shake, sequential star sounds and a visible-sticker treasure chest confirm actions. Decorative motion stops under Reduce Motion; the rules still move normally. Reading has no timer.

Acceptance: agent-executed affected journeys on the offline web export at 390×844 and 1024×768, plus 768×1024 and 844×390 layout/play. Required scenarios: grown-up unlock → first level of every world to a result; Helper on/off; failure/retry; learning completion/chest/sticker/notes; pause, teaching sheet, simulated browser background, reload with saved stars; busiest-level kit budget overlay. Native, physical touch/VoiceOver, actual audio comfort and Stassie's choices remain separate family acceptance. No simulators are authorized for this worker.

QA ledger: the final web matrix passed at 390×844 and 1024×768: every world reached through grown-up unlock, each first level completed with saved stars, counting and pictured-word learning completed, wrong/helped chest saved its sticker and notes, Helper on/off, failure/retry, pause/teaching sheet, simulated browser visibility and reload recovery. Supplemental 768×1024 and 844×390 learning results, real touch swipe, keyboard steps, outfit persistence, learner isolation and a scored free-play finish passed. Evidence root: `/Users/leonshimizu/Desktop/ShimizuTechnology/little-island-games-artifacts/island-arcade/arcade-grid/`. Tested application source `1181fd80f2dd7e1fae25a3e230d697770db41f33`; detailed shared receipts follow below.

## Crab Crossing

Same orientation, scope and acceptance boundaries as Rail Parade. Kiko the land crab hops from the garden verge, across slow pickups, buses and bikes, then rides logs, turtles and canoes to a seaside burrow. Each input is one hop. Platforms carry the crab continuously; the pure rules use the same visible lane objects for support and traffic collisions. A crossing gives 100 points. Sunny Coast, Canoe Lagoon and Moonlit Tide each have eight levels, adding road/water lanes, speed and alternating patterns. Later levels ask for two crossings. Stars follow the same completion/two-bump/no-bump goals shown before play.

Helper slows lanes to 60%, supplies an extra safe island in the later lagoons and returns a bumped crab to the nearest safe bank. Stars retain their normal thresholds. Number Lagoon has eight untimed levels covering count on, count back and skip counts by twos/fives. Hop toward the next numbered stone; sideways hops align the crab. Wrong forward hops keep the player safe and show the next number. River time advances only after a successful hop, with no reading deadline. Learning records use `num.number-line`. Free play opens after world one and has voluntary finish plus named local bests.

Art: original glossy coral crab, four outfits, island traffic and wood/canoe/turtle vectors. Deep lagoon gradients, sandy safe banks, road markings and three world palettes put the playfield first. Shared map, chest, star reveal, haptics, sounds, reaction motion and reduced-motion behavior match Rail Parade. Only earned kit progress is saved per learner; real-time positions are deliberately restarted after reload/termination. Version-1 save format and recovery originals are unchanged.

QA ledger: the same phone/tablet matrix passed for Crab Crossing, including first levels of all four worlds, count-on/count-back/skip-count learning, helped chest reward and notes, Helper on/off, actual collision/retry, pause/teaching sheet, simulated visibility return and reload with saved stars. Supplemental orientations, touch swipe, keyboard and a scored named free-play finish passed under the same evidence root. Web results do not establish native or physical A12 performance. The lead retains combined final-code review, complete speech generation, native QA and release gates.


## Grid games verification receipt

Full matrix and supplementary source `1181fd80f2dd7e1fae25a3e230d697770db41f33`; final application source `02c2ad4127c7fcda85471cc0871e525b2216fb6c` adds safe-area sizing. Zero-inset web geometry is unchanged. Node 22.22.3; Chromium export on the Mac host, using the brief’s Chromium executable and isolated touch-enabled contexts. Agent-executed QA; no simulators, Metro server, native builds or public publication. `tested-build.json` binds the source to the exported bundle SHA256.

`qa.cjs` / `qa-ledger.json` contain 36 passed records, including two fixture preflights; `extra.cjs` / `extra-ledger.json` contain ten passed supplementary cases. All moves and questions went through actual UI input. The main matrix uses a controlled clock and a fixed RNG seed for repeatability, including React Native’s delayed quick-tap dispatch. Performance samples use the normal browser clock. Phone QA enables Reduce Motion; tablet QA uses normal motion. Sound was turned off through the grown-up UI; all goals and feedback stayed visible.

| Required flow, both games | 390×844 web | 1024×768 web | Native / physical |
| --- | --- | --- | --- |
| Home → Arcade → map → teaching → play → result → chest → saved sticker/notes | Passed | Passed from Arcade lobby | Not run; worker brief excludes simulators |
| Grown-up unlock; first level in every world to saved three-star result | Passed | Passed | Not run |
| Rail counting and pictured-word learning; Crab count on, count back and skip count | Passed | Passed | Not run |
| Helper on/off, actual collision failure and fresh retry | Passed | Passed | Not run |
| Pause, teaching sheet, simulated visibility return latches pause, reload restarts round with earned stars retained | Passed | Passed | Native interruption / termination not run |
| Portrait 768×1024 / landscape 844×390 actual learning results, both games | Passed supplemental | Passed supplemental | Native rotation / large text not run |
| Touch swipe and keyboard each move one square; untimed scene stays still | Passed supplemental | Not separately repeated | Physical touch / VoiceOver not run |
| Outfit save, new learner isolation, scored named free-play finishes | Passed supplemental | Not separately repeated | Not run |

The initial QA harness attempts are retained: a continuously bouncing node required an explicit touch target; the chest helper read the visible word/equation instead of relying on unsupported selected-state attributes; sheet closing and quick taps needed their real dispatch delay under the controlled clock; the outfit fixture first needed twelve earned stars. A duplicate SVG gradient ID found during visual QA was fixed before the final run. No product failure remains in the final ledgers. Screenshots and profile video retain the motion evidence.

Engineering: `npm run check` passes typecheck and lint, then reports **767 passed / 2 failed across 51 files**. Both failures are inherited `tests/neural-audio.test.ts` bank-completeness failures: the base commit includes 94 Board Classics manifest keys, while the existing complete-bank receipt still covers 2,766 keys per voice rather than 2,860. The base’s `scripts/learn/board-classics.json` is byte-identical, and this branch does not change the live manifest or audio assets. The worker brief reserves generation for the lead; no test was weakened or skipped. `npm run export:web` passes separately because the full check stops at the inherited failures. `npm run doctor`: **21/21 passed**. Final Impeccable 4.6.0 scan: `[]`.

The **76 new engine/progress tests** prove every normal level can finish with Helper off (deterministic reachability seed 120), every learning level finishes through real moves, deterministic seeds, turn buffering/reversal rejection, the vacating tail, snake/hedge/body/edge collisions, platform carry and traffic/water collisions, Helper behavior, scores/stars, terminal input, canonical level validation, hostile/malformed states, and strict kit save round trips.

Four English lines are pending in `scripts/arcade-speech.json`: `arcade-rail-intro`, `arcade-rail-learn`, `arcade-crab-intro`, `arcade-crab-learn`. No generator was run. Existing text and kit tones work with missing clips. Minimal shared edits: `src/arcade/registry.ts` adds the two descriptors/world lists; `src/arcade/ArcadeScreen.tsx` dispatches only these two IDs to the dedicated scene frame; `src/arcade/Art.tsx` dispatches their hero art; the pending speech source adds only these four keys. Store, validation, Home, native directories, version/build configuration and voice banks are unchanged.

Remaining gates: combined final-code review by the lead; complete combined voice banks and decode checks; native/physical A12 performance, real iPhone/iPad touch/VoiceOver/large text, audio/haptic comfort and family acceptance. No PR or merge is authorized for this worker.


Final safe-area check: `insets.cjs` / `insets-ledger.json` passed four actual learning journeys on final source, with Chromium CDP overrides of top/bottom 47/34 at 390×844 and left/right/bottom 44/44/21 at 844×390. CSS environment values were independently checked. Maps have no horizontal overflow; playfields and arrow controls stay inside the inset bounds. This verifies the web inset path and sizing arithmetic, not native or physical-device acceptance.

### Web frame-budget receipt

Final application source `02c2ad4`, busiest normal level (`w3-8`) in each game, normal motion and normal browser clock. Each sample follows 2.5 seconds of scene/input warmup and captures 20 seconds. Rail uses keyboard turns around the lower garden with Helper on; Crab uses Helper off with all seven lanes moving while the crab waits on the starting bank. Kit overlay and an independent requestAnimationFrame interval sampler agree. These are Mac-host scheduling measurements, not GPU or physical A12 frame presentation.

| Game / touch viewport | Frames | Mean fps | p95 interval | Max interval | >25 ms | Kit clamped time |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Rail / 390×844 | 2,400 | 120.00 | 9.1 ms | 9.4 ms | 0 | 0.00 s |
| Crab / 390×844 | 2,400 | 120.00 | 9.2 ms | 9.4 ms | 0 | 0.00 s |
| Rail / 1024×768 | 2,400 | 120.00 | 9.1 ms | 9.4 ms | 0 | 0.00 s |
| Crab / 1024×768 | 2,400 | 120.00 | 9.1 ms | 9.4 ms | 0 | 0.00 s |

Evidence: `profile.json`, `profile-run.log`, four `profile-*.png` overlay captures, and `profile-video/`. The earlier pre-HUD phone Rail sample had one 275.1 ms interval and 0.18 s clamped while starting keyboard input. It is retained in `before-hud-profile.json`; an input-warmed repeat had no interval over 25 ms, and all four final samples above were clean. This does not establish physical-device smoothness or audio comfort.

Offline on final source: `offline.cjs` / `offline-ledger.json` verified the installed service-worker cache, stopped exact owned preview PID 86607, then cold-navigated each game, played its learning level through touch input, verified saved three-star results and reloaded again with the server still stopped. `offline-cache.json`, `offline-final-save.json`, `offline-rail.png` and `offline-crab.png` are the receipts. This is offline Chromium web acceptance; native airplane mode remains not run.

Cleanup completed for lifecycle session `01a17ce3-38ed-7d52-adad-f40b40e97c03`: every owned headless browser/context closed, preview port 43861 stopped, and `dev-lifecycle cleanup --execute` / `status` reported no active owned resources. No Metro or simulator was started. Other workers' resources were left unchanged. The implementation branch/worktree remains for the lead's integration; no PR, merge, store action, live manifest staging or speech generation occurred.
