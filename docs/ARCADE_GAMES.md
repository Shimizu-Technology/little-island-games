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

Feel v2 worker, 28 October 2026, `feat/feel-grid`, integration base `c872d1b`. Sources: `ARCADE_FEEL.md`, `ARCADE_KIT.md`, the G3 brief and `feel-audit/REPORT.md`. Private offline play for Stassie and family; the lead owns integration, native builds and physical acceptance. The earlier grid receipt below records the superseded v1 behavior.

Rilla leads chicks through a 10×10 garden. Touch-down arrows and 16 px mid-move swipes share the same two-turn buffer. Reversals are rejected against the last queued direction. An in-flight move finishes before a buffered turn begins. Every body sprite interpolates in cell space; corners lean while grid collisions remain deterministic. Chicks appear with their pickup event, and each is worth 40 points. Short local score particles replace board-covering warnings.

| Normal mode | W1-1 | W3-8 | W6-8 |
| --- | ---: | ---: | ---: |
| Chicks | 6 | 15 | 24 |
| Initial cell interval | 240 ms | 124 ms | 113 ms |
| Final cell interval | 208.8 ms | 107.88 ms | 98.31 ms |
| Patrol length | 3 | 5 | 6 |
| Three-star step par | 65 | 165 | 300 |

Helper multiplies the cell interval by 1.2, without changing goals or pars. Each normal level accelerates by 13% as chicks join. Six eight-level gardens introduce the moving patrol, fern hedges, extended patrol/corner hedges, bamboo corridors, mango groves and curling two-turn paths. The outer ring and bottom respawn runway stay open. Free play accelerates from 170 ms toward a 105 ms floor, and supports voluntary Finish with a local best.

Three hearts normally, five with Helper. A wall, hedge, patrol or self-hit spends a heart, clears the turn queue and regroups a three-bird train after 300 ms in a searched, clear runway. The hit point gets a local burst; the parade blinks for 1.2 seconds. Protected collisions still resolve to a safe position. Zero hearts ends the round through the shared Game over / score / best / Try again / Map flow. Helper changes preserve damage. Previously earned progress stays intact.

One star for finishing; two for at most one bump within the shown three-star par plus five extra steps per target chick; three for no bumps within the shown par. Pars come from seed-120 legal-route fixtures with 8% route-choice margin, rounded up to five steps. They require both survival and route planning. Clever Chicks retains eight untimed counting/spelling levels from the reviewed reading bank. It moves only on an action, animates that step for 120 ms, and keeps unlimited recoverable learning attempts. Learning animation time does not advance the garden rules.

## Crab Crossing

Kiko crosses a 9×11 coast. Arrows hop on touch-down and repeat while held after 170 ms, every 120 ms. A swipe commits at 16 px during movement. A hop takes 120 ms and two pending directions are buffered. Up/down preserve fractional x; horizontal hops add exactly one cell. The same cell transform positions the hero, traffic, decks, debug footprint and local splat/splash. Vehicles are drawn at their actual lane widths. A crab body must fit on the visible deck; claws are decorative. Traffic checks the moving body's visible footprint during a hop, and water support is checked on landing.

| Normal mode | W1-1 | W3-8 | W6-8 |
| --- | ---: | ---: | ---: |
| Burrows | 2 | 3 | 5 |
| Pickup speed, cells/s | 1.000 | 2.115 | 2.815 |
| First log speed magnitude, cells/s | 0.600 | 1.102 | 1.417 |
| Pickup spacing, cells | 4.50 | 4.34 | 4.10 |
| Three-star hop par | 30 | 42 | 73 |

All moving lanes accelerate by up to 15% through each level. Travel is integrated, so speed changes alter velocity without teleporting objects. Helper uses 80% speed and five hearts; normal has three. No countdown or waiting timer exists. Hits leave a 450 ms splat or splash at the impact point, then reset to the current zone's safe sand (row 10 for the road, row 5 for the lagoon), with 300 ms recovery and 1.2 seconds of protection. Zero hearts uses the shared Game over flow; retry restores the same level with fresh hearts. Free play preserves a voluntary Finish and named local best.

Six eight-level worlds add the basic road/log crossing, bikes and a canoe channel, water up to the shore, reversed currents, a mixed-traffic approach lane, then fixed sandbar islands between moving decks. Lane topology remains visible with Helper. Number Lagoon keeps eight untimed counting/skip-counting paths and unlimited learning attempts; its animation clock runs independently of the frozen traffic rules.

One star for finishing; two for at most one bump within the displayed three-star par plus ten hops per target burrow; three for no bumps within the displayed par. Hop pars come from deterministic seed-120 moving-lane routes with a 10% route-choice margin. Waiting for a safe gap costs no hops and never loses a star. All 112 level fixtures exercise the pure engines; malformed motion/lives and invented level configurations are rejected. Real-time states remain unsaved; existing versioned progress/migration APIs are unchanged.

Both grid games retain the shared JS fixed-step loop, publish shared poses each frame, and memoize the moving art independently of HUD snapshots. Immediate event counters cover pickups, hops, hits and clears. These are bounded grid games; the contract's mandatory UI-thread/native-proof condition names Flight, Run, Palm and Beach. Web scheduling measurements and their limits are recorded in the feel-grid artifact report. Native and physical smoothness still require lead testing.

## Grid games v1 verification receipt (historical)

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


## Palm Patrol

W5 action slice, 27 October 2026, based on `7d7ac79`. Coco the coconut keeper slides along the grove and tosses husks at friendly rhinoceros beetles. A bonk catches a beetle in a net; it wobbles and flies away. There are no weapons, deaths, energy meters or purchases. Three frond shields each absorb three bumps by bouncing a beetle upward. A beetle reaching the grove costs one of four happy palms and returns to the formation. Catch the entire formation to clear; four grove bumps end the round with a fresh retry.

Coconut Cove, Breezy Palms and Moonlit Grove each have eight levels. Cove teaches aiming against three slow visitors, then introduces more beetles and divers. Breeze adds swooping formations and two waves. Moonlit Grove combines larger formations and three waves. Each world's eighth level finishes with a big, slow, five-bonk beetle wearing a crown. Star goals are displayed before play: clear, keep two palms, keep all four. Helper slows descent to 55% and tosses automatically; it earns the same stars. Clearing the first eight levels opens continuous, gradually stronger formations in free play; Finish saves the local named best.

Number Grove has eight math levels, three to five facts each: little additions, making five/ten, subtraction, doubles and sums through twenty. Each slow three-beetle formation carries one correct answer and two distinct distractors. Only the answer matching the fact can be caught. A wrong answer bounces the husk back, with visible feedback; choices loop without losing palms or expiring. There is no timed reading. Cleared facts record a math practice note with Helper marked as assistance; optional chests use the active learner's configured practice engine.

Art: original glossy coconut keeper, outlined brown beetles with friendly faces, purple crowned boss, fibrous husks, woven catching nets, layered sea/sky gradients, palm silhouettes and daytime/night worlds. Stars progressively reveal with tones; net catches create particles, score pop-ups and a dizzy wobble. Grove bumps give a two-pixel scenery shake. Reduce Motion removes ornamental bob, shake, wobble and particles while preserving gameplay. Coco has Island, Sun hat, Ocean explorer and Starlight outfits through the kit's star thresholds. Music, effects and haptics use the kit, with visible feedback when muted. Five new pending English cues across the two games are registered in `scripts/arcade-speech.json`; no banks were generated.

The pure fixed-step engine and runtime validator live in `src/arcade/games/palm-patrol/engine.ts`; UI lives in `src/arcade/action/`. Real-time sessions are not saved. Progress, chests, stickers, outfit gates, learner ownership, stale-round protection and recovery use the existing kit without a new save field. The screen latches Pause after background/focus loss and stops the loop/input while a sheet is open.

QA ledger (agent executed; Chromium export with touch contexts; native and physical family acceptance not run by the explicit no-simulator brief): final receipts below. Evidence directory: `/Users/leonshimizu/Desktop/ShimizuTechnology/little-island-games-artifacts/island-arcade/arcade-action/`. Engine coverage includes every level with and without Helper via actual aim/toss/step actions, all learning facts, wrong-number bounce, non-expiring questions, frond wear, failure/retry, deterministic RNG, scoring, terminal/input guards, immutable snapshots and malformed-state/save rejection.

## Beach Ball

W5 action slice, 27 October 2026, based on `7d7ac79`. Drag the bottom paddle to return Bibi the beach ball; paddle-edge contact changes the rebound angle. Choose Gentle, Steady or Zippy Bibi, or two players sitting at opposite ends of one iPad. Each active touch stays assigned to its starting half, so both paddles move at once and crossing the centre does not swap players. ● and ◆ distinguish seats; the upper player's score is rotated in family mode. Web keyboard supports bottom arrows and top A/D. Names use the existing family-match engine (`src/games/match.ts`), remembered names and a running match tally. The tally lasts while this game screen is open; real-time rounds restart after reload, and only kit-earned progress persists.

Sunny Sands, Turtle Breeze and Sunset Splash each have eight levels. Sunny Sands starts slowly, with two-point matches, then three-point matches. Turtle Breeze adds a gentle crosswind; later levels add a sleeping turtle that rebounds the ball. Sunset Splash combines wind, turtle and two independently simulated balls. Both balls resolve before a winning score is checked, so simultaneous tying points continue play fairly. Stars reward a win, at most one opponent point, and a clean sheet. Family mode awards the winning seat a match win, and either seat can clear the level. Helper widens the player’s paddle (both paddles in family mode), softens the solo computer’s movement, and slows the ball to 68%, including when toggled during Pause; stars are unchanged. World-one completion opens free play. Solo free play continues until Finish; a together free-play match goes to five points.

Counting Coast is an eight-level learning world: four levels count points by twos and four by fives. Every point visibly adds 2 or 5; the centre shows the sequence. The paddle game continues as math exposure, without treating shared score watching as an independently answered fact. The optional chest between matches records the actual answered practice question through the shared engine; helped answers and free skips remain available.

Art: original glossy volleyball stripes, chunky turquoise/coral paddles with shape markers, cream court markings across island sand, sea foam, sun/moon, palms and a sleepy turtle. Rebounds squash the ball, successful points create a burst and a score pop-up, and Bibi has four kit outfits. Reduce Motion keeps necessary ball/paddle travel while removing decorative scaling, sparks, map bob and chest wiggle. The playfield uses all available phone/tablet space; pause and map stay reachable above it. The start card shows the one-line spoken/visible goal, star goals, Helper and opponent choices; it leaves the screen during play.

The pure fixed-step engine and runtime validator live in `src/arcade/games/beach-ball/engine.ts`; the shared action screen uses kit progress, chest, music, feedback, active/epoch ownership and frame budget. No Store/validation/home/Settings/save-shape changes were needed. Engine tests cover every level through paddle input, all collisions, contact angles, two-ball final-point ties, both paddle inputs in one step, three distinct computer strengths, Helper, failure/retry, score units, deterministic RNG and malformed state/saves.

QA ledger (agent executed; Chromium export with touch contexts; native and physical family acceptance not run): final receipts below, in the same external evidence directory as Palm Patrol. The lead still owns combined-code review, voice generation and family release acceptance.

### W5 engineering receipt and shared integration

Final implementation source: `db14b27` (the following receipt commit changes documentation only). Node 22.22.3, Expo 57.0.31 / React Native 0.86.3. `npm run check` passed typecheck and lint, then reported **705 passing tests and two failing inherited neural-audio checks**. The existing live manifest has 2,860 lines, while the unchanged receipt/banks cover 2,766; all 94 additional lines are in the base's `scripts/learn/board-classics.json`. The worker's five Arcade lines remain in the pending source and do not affect this mismatch. No audio assets, manifests in `scripts/learn`, neural source maps, receipts or tests were changed to hide the failure. Combined bank generation remains the lead's integration gate. `npm run export:web` passed separately; final offline fingerprint `0ea26a624130`, 5,568 bundled resources. `npm run doctor` passed **21/21**. The final advisory Impeccable 4.6.0 UI scan returned `[]`.

Shared edits are limited to `src/arcade/registry.ts` (two descriptors/four worlds each), `src/arcade/Art.tsx` (new hero dispatch), `src/arcade/ArcadeScreen.tsx` (action-game wrapper; original two views retained) and `scripts/arcade-speech.json` (pending English cues). No Store, save validator, Home, Settings, native directories, package versions or release numbers changed. New game logic, art, maps and screens live in the two owned game folders and `src/arcade/action/`. The lead owns independent final-code review, combined integration, voice banks and native/family release acceptance; this worker neither opened a PR nor merged.

New speech keys: `arcade-palm-intro`, `arcade-palm-math`, `arcade-beach-intro`, `arcade-beach-together`, `arcade-beach-count`. Existing tone/music assets supply feedback while speech is unavailable. Family names and kit-earned progress persist; Beach Ball's running match tally is intentionally limited to the current game-screen session, in keeping with the unsaved real-time round contract.

Retest history is retained in the external evidence folder. The early harness attempted clicks before a controlled-clock sheet update settled; isolated actual pause/toggle/resume checks passed, and the harness now waits for updates. Its original interruption assertion also included the teaching card's decorative ball; final assertions scope the real court. Visual review fixed duplicate SVG gradient IDs that caused web scenes to share palettes. Tablet play exposed a material Helper issue: widening the solo computer's paddle while slowing the ball made rallies harder. Final code widens only the human paddle in solo mode, softens computer movement, preserves wider paddles for both family seats, and has a focused regression assertion. Beach acceptance was rerun after that fix.

### W5 functional QA receipts

Agent-executed, isolated touch-enabled Chromium contexts. Palm Patrol's four-world/failure matrix is from `8bac6f9`; the later `db14b27` change is confined to Beach Ball's Helper widths/policy and its renderer. The final combined export is additionally exercised by the orientation, interruption, profile and offline checks. The main journey harness uses a controlled browser clock to shorten waits, and actual touch/keyboard input; its frame readings are not performance evidence. Real-clock profiles are separate. Every recorded result was verified in localStorage; no engine state, score, win or sticker was injected to finish a journey.

| Palm Patrol scenario | 390×844 touch, Reduce Motion | 1024×768 touch, normal motion | Evidence |
| --- | --- | --- | --- |
| Home → Arcade → map → teaching → play → stars → chest | Passed | Passed | `phone/tablet-palm-w1-result.png`, `*-palm-first-claimed.png` |
| Grown-up unlock; first level of all three normal worlds and Number Grove to a saved clear | Passed | Passed | `*-palm-w2-1-result.png`, `*-palm-w3-1-result.png`, `*-palm-learn-1-result.png` |
| Learning chest: wrong answer → Help → answer → saved sticker and helped practice note | Passed | Passed | `*-palm-learning-claimed.png`, `qa-ledger.json` |
| Helper on/off; deliberate failure and fresh retry to clear | Passed | Passed | `*-palm-failure.png`, `*-palm-retry-result.png` |
| Pause/toggle/resume | Passed in isolated explicit interaction | Covered by shared action frame and extra receipt | `pause.cjs`, `pause-failure.cjs`, `pause-debug.png`; extra ledger |
| Free play: actual input → Finish → named positive best → reload | Not repeated | Passed, 1,000-point named result | `palm-patrol-freeplay-result.png`, `strengths-ledger.json` |

| Beach Ball scenario | 390×844 touch, Reduce Motion | 1024×768 touch, normal motion | Evidence |
| --- | --- | --- | --- |
| Home/island → map → teaching → play → result | Passed | Passed | `*-beach-map.png`, `*-beach-w1-1-result.png` |
| First level of all four worlds to a saved win; Helper on/off | Passed | Passed | `*-beach-w1-1/w2-1/w3-1/learn-1-result.png` |
| Learning chest: wrong/Help/retry → sticker and practice note; normal chest Skip | Passed | Passed | `*-beach-learning-claimed.png`, `qa-ledger.json` |
| Actual Zippy loss → Play again → fresh retry; Gentle + Helper result | Passed | Passed | `*-beach-retry-result.png`, `qa-beach-final-run2.log` |
| Both paddles at once, named family result and tally; remembered names | Passed | Passed | `*-both-paddles.png`, `*-multitouch.json`, `*-family-result.png` |
| Pause and teaching sheet freeze actual ball positions; background visibility latches Pause; resume/reload retains stars | Passed | Passed | `qa-ledger.json`, `phone/tablet-save.json` |
| Steady and Zippy selected through setup and played to finished solo rounds | Not repeated | Passed (losses); Gentle wins covered above | `beach-steady/zippy-finished.png`, `strengths-ledger.json` |
| Free play: actual paddle input → Finish → named best → exact reload | Not repeated | Passed, 410-point named result | `beach-ball-freeplay-result.png`, `strengths-ledger.json` |

`qa-ledger.json` records 24 passed device-specific primary cases; `strengths-ledger.json` records four additional passed cases. Scripts and failed harness attempts remain outside Git. The final Beach run is `qa-beach-final.cjs` / `qa-beach-final-run2.log`; Palm's retained matrix is in `qa.cjs` / `qa-tablet.cjs` and their logs. These scripts use independent local fixtures, not the family's browser storage. Sound-off visible goals/feedback were exercised in both required sizes. Reading tasks are only on paused/start cards or untimed chests; Palm's numeric choices do not expire.

Native/physical iPhone/iPad, VoiceOver, native keyboard/rotation, audio comfort and A12 GPU/presented-frame performance are **not run** under the no-simulator worker brief. Physical family acceptance, complete independent chest/learner-isolation/backup-restore journeys and combined release/voice-bank work remain with the lead; this receipt does not claim the full application-wide acceptance plan passed.

### W5 orientation, offline and frame-budget receipt

Final `db14b27` export, agent-executed Chromium touch context on the Mac host. `extra-ledger.json` records eight additional passed cases: two real-clock profiles, both games at 768×1024 and 844×390, Palm's navigation/background/restart check, and offline operation. Both orientation checks observed a full-width playfield, actual touch response, pause/resume and no horizontal overflow. The extra Palm restart compared an unchanged saved snapshot on a fresh fixture; the offline phase subsequently earned and verified saved Palm stars.

| Actual busy playfield, 1024×768, 2.2-second warmup + 20-second sample | Frames | Mean fps | p95 interval | Max | >25 ms | Kit clamped time |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Palm Patrol, Moonlit Grove level 7, maximum formation/wave configuration | 2,400 | 120.00 | 9.20 ms | 11.40 ms | 0 | 0.000 s |
| Beach Ball, two-ball free play with wind and turtle | 2,402 | 120.07 | 9.20 ms | 11.80 ms | 0 | 0.000 s |

The in-game kit overlay was visible in both profile screenshots and recorded approximately 120 fps / 9.1–9.2 ms p95, without clamped time. `palm-patrol-performance.json`, `beach-ball-performance.json` and `*-profile.png` hold the numbers and visual evidence. These are JavaScript requestAnimationFrame scheduling measurements on a high-refresh Mac Chromium host, not GPU/presented frames or evidence of A12 physical performance. No controlled clock was used for profiling.

Offline: the complete cache was verified, browser transport was disabled, and Beach Ball cold-reloaded and accepted touch input. After the owned preview process was stopped through validated lifecycle cleanup, another cached reload started Beach Ball, and Palm Patrol cold-loaded, cleared its first level through real touches, and saved stars with no server. Evidence: `beach-offline.png`, `beach-server-stopped.png`, `palm-server-stopped-result.png`, `extra-run.log`, `extra-storage.json` and `extra-ledger.json`.

Final runtime disposition: all owned headless browsers and preview roots were stopped. Lifecycle session `01a17ce3-4932-7890-b1d9-8bc07b5fd2f9` reports no active owned resources; no simulators, Metro server, Docker services or user browser tabs were started. Baseline/shared resources were left unchanged. The clean feature worktree/branch is retained for the lead; no PR or merge was performed.


## Unified arcade verification · 27 October 2026

Implementation `3dc0ddb`, based on integration `89ff4bf`, routes every registered game through `ArcadeGameScreen` and `plays.tsx`. One shared `LevelMap` retains world gates, NEXT, padlocks, stars, waiting chests, free play and the scrolling storm note. Game scenery also frames start/results. Beach Ball retains strengths, two names, simultaneous paddles and its local family tally. Learning skill/config ranges are unchanged; shared counting does not produce individual math credit. Engines, level data and save formats are unchanged.

Agent-executed web acceptance passed **72/72 required game/viewport cases** at touch Chromium 390×844 and 1024×768: W1 wins/stars, learning first-level wins and wrong/help/correct chests with saved stickers/notes, Helper-off failures/retries, pause/teaching/resume, leave cancellation/confirmation, and reload to map with stars kept. Reef failure used unlocked W3-8. All nine also passed simulated visibility pause, 844×390 landscape and 768×1024 portrait input/layout checks. Beach Ball's two simultaneous contacts, remembered names, strengths and retained family score passed at both required sizes. Reduce Motion and sound-off text were exercised.

Final export `little-island-b62e901d86bc` contains 5,848 cached resources. After stopping the exact owned preview listener, all nine cold-loaded and accepted input at both required sizes with earned stars intact. `npm run check` passed 823 tests across 55 files, typecheck, lint and web export; Doctor passed 21/21; advisory Impeccable 4.6.0 returned `[]`.

Evidence: `/Users/leonshimizu/Desktop/ShimizuTechnology/little-island-games-artifacts/island-arcade/arcade-unify/` — `report.md`, `final-ledger.json`, final gate/runtime logs, per-game `before/` and `after/` screenshots, phone/iPad galleries, offline cache/save receipts. Earlier harness failures remain in the raw logs and are superseded by completed retests. Native/simulator/physical audio, VoiceOver, A12 performance and family acceptance were not run; controlled-clock browser results do not establish those outcomes. The lead owns independent review, integration and release. No PR, merge or new speech keys. All owned runtime resources were stopped; the implementation branch/worktree is retained.
