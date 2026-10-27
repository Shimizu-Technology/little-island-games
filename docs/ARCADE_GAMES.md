# Arcade games

## Canoe Cargo

27 October 2026. Worker branch `feat/arcade-cargo`, based on integration commit `7d7ac79`. Sources: `ISLAND_ARCADE.md`, `ARCADE_KIT.md`, `PRD.md`, `LEARNING_GROWTH.md` and the W7 brief. Private, offline family play for a seven-year-old and her family. The shared kit supplies per-learner progress, outfits, chests and pause/background ownership. No real-time round is persisted. Public release, audio generation and native family acceptance belong to the lead.

Rules: pack a **9×14** hold with seeded two-, three- and four-parcel bundles. Full rows sail away. Rotation uses bounded horizontal wall kicks; cargo cannot pass through other cargo. Drop places the bundle immediately; overflow ends the round without losing earlier stars. Multi-row clears and consecutive clear combos add points. Free play opens after all eight first-world levels, supports voluntary docking, and records a local named best. Stars reward finishing, then finishing within the two visible load thresholds. Helper has the same thresholds.

Worlds: Picnic Harbor (eight slow introductory deliveries), Trade Wind Bay (eight faster canoe, score and stuck-crate goals), Moon Tide (eight faster goals with rising rows at load boundaries), and Number Voyage (eight number levels with targets 9, 12, 15, 18 and 21). Initial boards leave a clear channel. Only each world’s first lesson and the sum demonstrations script their opening bundles; every later normal level starts with mixed, deterministic seeded shapes. Load-based star goals allow for the extra packing decisions. World 1 starts at 2.4 seconds per fall, increasing gradually; Moon Tide reaches 0.505 seconds. Garbage has a three-parcel gap and comes less often with Helper.

Learning: all parcels carry visible values 1–3. Every full row sails; a matching sum earns a second canoe and 100 bonus points. The target remains large in the HUD. Helper removes automatic falling in Number Voyage: count, move, rotate, then drop. Instructions and star goals are shown before play. The pending English narration source adds four cargo keys, with text and tones available without clips. Practice uses the existing addition skill IDs according to the sum range.

Helper: 1.8× fall interval, two upcoming bundles, and a single hold per level/round. Hold sets a bundle aside and takes the next. After that replacement load is packed, the stored bundle returns automatically, preserving every bundle and the queue order. It cannot be repeatedly cycled. Switching Helper off/on does not refill it. The pause sheet contains the in-round toggle. Teaching demonstrates a three-parcel delivery, with a still final example under Reduce Motion.

Art: original outlined crates, coconut bundles, fish baskets and taro sacks; dusk, harbor and number-voyage scenery; wooden hold and glossy gold controls. Poko the pelican captain has island, sunhat, explorer and starlight outfits, idle bobbing and delivery/bump reactions. Shared transforms move falling parcels; settled SVG cargo is memoized. Clears show a sailing canoe, particles and score/combo text; Reduce Motion makes decorative responses still. Kit tones and optional haptics accompany inputs and clears. The frame/map/results/chest visual overhaul is a separate worker's slice.

Island edits are additive: a stable nine-game shelf order retains newly registered games; the sticker atlas includes all sixteen existing stickers exactly once across nine named chapters. Rewards remain shared across games. No save schema change or audio-bank edit.

Acceptance: agent-executed comprehensive Cargo flows in isolated touch-enabled Chromium contexts at 390×844 and 1024×768; orientation checks at 768×1024 and 844×390. Required cases: every world reachable via grown-up unlock and first level played to a result; failure/retry; learning bonus and chest; Helper on/off and one-use hold; pause, sheets, simulated browser background, reload; saved stars/stickers/notes/bests; offline reload; busiest-level scheduling. Native, VoiceOver, real haptics/audio comfort and physical A12/child acceptance are not run: no simulators are authorized.

### QA ledger

Execution receipts, gate logs and screenshots: `/Users/leonshimizu/Desktop/ShimizuTechnology/little-island-games-artifacts/island-arcade/arcade-cargo/`. Final gameplay source: `dd1a630c08f854a04f694ce02fc3f527ce68cfcd`; cache `070356563bd6`. The following receipt commit changes documentation only.

- **Passed: 24 scoped web cases.** `qa-ledger.json`: at both 390×844 and 1024×768, actual Home/shelf/map/teaching/play/results/chests, all four world openings, Helper on/off, overflow/retry, make-nine/make-twelve bonuses, one-use reserve, sound-off text, Reduce Motion/normal motion, pause/teaching-sheet/simulated browser background, reload with earned progress, sticker atlas and named free-play best. Saved outcomes are in `phone-save.json` and `tablet-save.json`; primary motion is retained under `video/`.
- `extra-ledger.json`: 768×1024 and 844×390 controls fit without scrolling; actual piece-tap rotation, drag past a wall and back, horizontal dragging and swipe-to-drop finish the level. A seeded mixed-shape score level completed in seven loads using normal rotate/move/drop controls (`mixed-level-actions.json`). The owned preview was stopped, then cold reload and a full sum level passed from cache (`offline-result.png`, `offline-cache.json`, `offline-save.json`).
- `backup-ledger.json`: actual backup download, file picker and confirmed restore at both main viewports preserved the exact Cargo-inclusive arcade data and practice notes. A malformed negative Cargo best was rejected at cold startup; recovery preserved the byte-exact original, then a valid backup restored all earned progress (`cargo-corrupt-recovery.png`).
- **Web scheduling:** busiest level `w3-8`, 1024×768, 20 seconds after warmup: 2,410 intervals, mean **120.00 fps**, p95 **9.10 ms**, max **11.50 ms**, **0** intervals over 25 ms; kit clamp **0.000 s**. `performance.json` retains all one-second kit samples. These measure JS scheduling on the Mac host, not presented GPU frames or physical A12 smoothness.
- **Engineering:** typecheck and lint passed; Cargo’s **20** tests passed. Full `npm run check` reports **711 passed, 2 failed / 713**; both failures are the pre-existing neural-bank completeness tests. An untouched archive of base `7d7ac79` confirms its manifest already has 2,860 keys against 2,766 bundled per voice (`baseline-audio-mismatch.json`). The worker did not alter that manifest or generate audio. Separate production web export passed (5,568 resources), Doctor **21/21** passed, and the advisory Impeccable scan returned `[]`. The full gate remains **blocked**, not passed, until the lead reconciles the narration banks.
- **Retest history:** retained first harness failure (switch state read through the wrong ARIA attribute), the tablet layout correction, and the real drag-release defect. Final runs use actual touch taps and confirm the corrected controls; earlier receipts are retained as `qa-attempt1*`, `qa-before-layout-fix.json`, `extra-attempt1*` and `gesture-debug*`.
- **Not run:** native/Android, VoiceOver, OS font scaling, physical audio/haptics, real A12 performance and family acceptance. No simulators were authorized or started. Independent final-code review, combined narration generation and shared frame/map/results/chest polish remain lead integration work.
- **Resources:** both exact owned preview processes and every owned browser/context/QA runner stopped. Lifecycle session `01a17ce3-6e28-7b31-892f-0fc8af169b08` has no active owned resources. No shared services, simulators or containers were changed.

Integration notes: additive shared edits are confined to `registry.ts` (Cargo/world registration and shelf order), `ArcadeScreen.tsx` (Cargo engine/view/level/learning/narration wiring plus Cargo-only sizing and pause Helper), `Art.tsx` (Poko renderer dispatch), `Teaching.tsx` (Cargo teaching dispatch), `Collection.tsx` (all-sticker atlas; outfit closet unchanged), and `scripts/arcade-speech.json`. Pending keys: `arcade-cargo-intro`, `arcade-cargo-sum`, `arcade-cargo-goal`, `arcade-cargo-sum-goal`. Preserve the other worker’s shared visual pass when merging these small integration hunks. No PR, merge, version bump, audio generation or store publication was performed. Automated checks do not establish physical family acceptance.


## Fruit Bat Flight

Implementation worker, 27 October 2026; base `7d7ac79` on `feat/island-arcade`. Contract sources: `ISLAND_ARCADE.md`, `ARCADE_KIT.md`, `PRD.md`, `LEARNING_GROWTH.md` and the W6 brief. Intended for Stassie (7) and family, offline on phone/tablet. Public release, final integrated code review, voice-bank generation and native/family acceptance belong to the lead.

Tap anywhere in the sky or the Flap button to lift Tavi; let go to glide. Space/arrow keys also flap on web. Pass the palms to finish, collecting glowing fruit for extra stars: one star for the pass target, two for half as many fruit, three for the full fruit target. All thresholds appear before play. Bumps with Helper stop the scrolling for a moment, return Tavi to the opening and cost one collected fruit. Without Helper, a bump ends the run; retry is immediate and earlier stars are safe. World 1 starts with broad openings, low gravity and long approaches even with Helper off.

Three eight-level worlds: Sunset Forest, Moonlit Palms and Firefly Grove. Speed rises and openings narrow gradually. The last four Firefly levels add rain and deterministic gusts, keeping the kit's three-normal-world ID contract. Number Canopy adds eight slow math levels: fly through one of three shape-marked number gates to answer the visible fact. Early facts add within 10, later facts add within 20 or subtract. Wrong choices pause the approach and bring the same fact back; they never end the learning run. Math is the only timed learning content. Optional chests use the kit practice settings and always allow help/skip. Completing World 1 opens voluntary endless Free Flight with local named personal bests.

Art: original outlined, highlighted fruit bat, palms, glowing mangoes, fireflies and world gradients. Tavi wears the kit's four star-earned outfits. The scene fills the available safe area, with icon-pill progress/stars and Pause. Helper lives on the start card and Pause sheet. Illustrated winding paths use stone/padlock nodes, stars underneath and a bouncing Next node; the chest shows its sticker, wiggles and opens with a burst. Safe rehearsal uses the actual flight rules. Decorative motion, particles, background bump shake and hero wobble stop under Reduce Motion; flight physics remain. Collection milestones show combo cheers; star reveals arrive one at a time with tones. Sound effects/music and optional native haptics reuse the kit; text remains visible without speech clips.

Rendering: pure 60 Hz rules, four recycled gate slots, static SVG art and shared transform/opacity poses. React receives only the kit's 10 Hz HUD snapshots. Ambient fireflies and six pooled particles are bounded. Active runs are never saved. The kit owns learner/epoch-bound results, chests, stickers, outfits, scores and strict version-1 progress validation. Focus/background, Pause, sheets and navigation stop simulation/input; background return requires Resume. Reload returns to the map with earned progress intact.

QA receipts and final status follow below. Evidence root: `/Users/leonshimizu/Desktop/ShimizuTechnology/little-island-games-artifacts/island-arcade/arcade-flight/`.

## Lagoon Run

Same W6 contract, base and private family scope as Fruit Bat Flight above. Kai runs behind the camera along a three-lane beach, festival boardwalk and sunset lagoon. Swipe left/right or tap a lane to steer, up to jump coconuts/crabs, down to duck fronds/fishing lines. Large arrow controls and web arrow/WASD keys use the same pure actions. Pass the trail-marker target for one star, collect half the target in shells for two, the full target for three. Shells are star goals, never currency. Helper slows the run and turns a stumble into a short scrolling pause; without Helper, collisions end the run. The first world introduces one obstacle family at a time and visibly previews the relevant jump/duck cue.

Morning Beach, Village Festival and Sunset Lagoon each have eight levels. Sunset levels 5–8 add typhoon-season rain/wind scenery. Number Boardwalk has eight slow math levels: choose the lane whose shape-marked number answers the visible sum. Wrong answers return the same row for another approach without ending the run. Optional chests, outfits, per-learner progress, local named Free Run after World 1, pause/reload and saved-outcome rules use the same kit paths as Flight.

A behind-the-runner pseudo-3D view was retained: a fixed perspective track, bounded depth projection, shared position/scale transforms and static vector sprites stay within the kit pipeline. It needs no canvas/wasm/dependency or per-frame React reconciliation. Five recycled obstacle/shell rows, fifteen bounded learning portals, six particles and six ambient wave sprites cap scene population. Collision depth is explicit in the engine; lane, jump and duck actions are independent of decorative motion. The outlined, glossy runner, smiling crabs, coconuts, palm arches, festival bunting and boardwalk planks are original. All four kit outfits render on Kai. Optional rehearsal shows jump/duck with trajectories derived from the run engine; Reduce Motion keeps a still pose and visible direction.

QA receipts and final status follow below. Evidence shares the Flight worker folder.

### W6 web QA receipt (both games)

Agent executed on isolated Chromium touch contexts, 27 October 2026. Primary mechanics matrix: `ac1c1da`; rear-view character/orientation checks: `de267ee`; final scene feedback and profiling: `71f31c5`. `build-manifest.json` in the evidence folder records the final web bundle hash. Functional runs use a controlled clock that executes every animation frame; frame measurements use the real clock. Pure engines choose legal inputs in Flight, while Lagoon follows visible shells and math portals through touch input. No result or saved star is injected. The primary save receipts contain three earned stars for the first level of every world in both games.

| Per-game scenario | 390×844 touch / Reduce Motion | 1024×768 touch / normal motion | 768×1024 and 844×390 touch |
| --- | --- | --- | --- |
| Map → start/teaching → play → result → saved stars | Passed | Passed | Passed; final character art and rehearsal |
| Every world reachable through grown-up unlock; first level of all four worlds cleared | Passed | Passed | First normal level repeated |
| Learning world + wrong/help/correct optional chest; sticker and practice note saved | Passed | Passed | Chest skip retained rewards |
| Helper on; Helper-off deliberate failure and retry to a saved clear | Passed | Passed | Helper-on completion repeated |
| Pause/settings; browser visibility loss latches Resume; reload starts at map with progress retained | Passed | Passed | Not separately repeated |
| Touch sky flap / four-direction runner swipes; keyboard; outfit closet | Arrow controls in primary matrix | Arrow controls in primary matrix | Passed; saved Sun hat and visible pose responses |
| Free play: positive score, local player name, voluntary finish, saved family board | Kit gates covered by pure tests | Kit gates covered by pure tests | Passed for both games in both orientations |

Primary ledger: **26/26 cases passed** (`qa-ledger.json`). Orientation/input/closet/skip/free-play ledger: **20/20 passed** (`extra-ledger.json`). Browser visibility was simulated through the browser event boundary; this does not establish native AppState behavior. Native, physical family touch/VoiceOver, audio comfort, and A12 GPU/presented-frame acceptance are **not run**, per the worker's explicit no-simulator scope. The lead still owns independent final-code review and integrated/native acceptance.

Final web export, Mac Chromium, 1024×768 touch; two-second warmup and twenty-second sample per scene. Helper on. The math samples stress the maximal portal pool and retries; they are not claims of clearing level 8. These measure JS requestAnimationFrame scheduling, accompanied by the kit overlay, rather than GPU presentation.

| Game | Scene | Frames | Mean fps | p95 interval | Maximum | >25 ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| fruit-bat-flight | w3-8 | 2394 | 119.70 | 9.20 ms | 58.90 ms | 1 |
| lagoon-run | w3-8 | 2400 | 120.00 | 9.00 ms | 9.40 ms | 0 |
| fruit-bat-flight | learn-8 | 2394 | 119.70 | 8.90 ms | 58.60 ms | 1 |
| lagoon-run | learn-8 | 2400 | 120.00 | 9.00 ms | 10.70 ms | 0 |

The two isolated Flight intervals around 59 ms remain in the receipt; p95 meets the kit's 16.7 ms scheduling budget. No physical-device smoothness claim follows from this Mac result. Final sprites remain bounded, with decorative camera movement off under Reduce Motion. `profile.json`, `profile-learning.json` and the corresponding PNGs preserve the overlay and measurements.

Engineering: final typecheck and lint pass; **708/710 full-suite tests pass**, including **17 new engine/content/validation tests** and legal completion of all 64 authored levels. The two failures are unchanged base voice-bank completeness tests: the live base manifest contains 2,860 lines per voice, while the protected generated bank/receipt contains 2,766. The difference is the base's 94 board-classics lines; the worker changed none of those inputs and did not stage its four pending arcade lines into the live manifest. `audio-baseline.json` records that comparison. `npm run check` therefore **fails** at those two tests; web export passes separately. Doctor passes **21/21**. Advisory Impeccable 4.6.0 scan returns `[]`. This branch does not claim a passing full gate or completed independent review.

Retest history: initial QA navigation overlapped an export and received a transient 404; the completed export was then used exclusively. The harness originally read a nonexistent switch attribute instead of its checked property, then a mirrored runner controller attempted moves after its model had finished; both harness faults were corrected. The final controller follows visible shell/answer positions using real touch input and all primary cases passed. Original failure receipts remain beside the final ledgers. Live left/right buttons and lane taps were independently verified in `input-probe.log`; no app input defect was found.

Speech remains pending in `scripts/arcade-speech.json`: `arcade-flight-intro`, `arcade-flight-math`, `arcade-run-intro`, `arcade-run-math`. No speech or other audio assets were generated or edited. Missing clips keep the visible instructions and kit tones/silence.

Final-source offline receipt (`71f31c5`, export cache `little-island-4097a05037a0`): **4/4 passed**. Separate 390×844 and 1024×768 touch contexts each cached 5,570 entries; the exact owned preview process was terminated with SIGTERM, then browser networking was disabled. Both games cold-loaded, played the first normal level to a visible clear and saved a new distinct round. `offline-ledger.json`, `offline.log` and four `offline-*.png` files preserve the outcome. This also retests final foreground input/result flow after the last decorative feedback change.

Resource disposition: no Metro or simulators were started. Preview PID 77506 was stopped before offline checks. All scoped Playwright browsers/contexts were closed, and the owned T3 preview tab was closed and released. The worker's clean branch/worktree is retained for lead integration; no PR, merge, native release, or public publication was performed. No runtime resource is handed off.

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
