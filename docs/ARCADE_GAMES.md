# Arcade games

## Shell Song

Feel v2 worker, 28 October 2026, branch `feat/feel-song`, based on `c872d1b`. Sources: `ARCADE_FEEL.md`, `ARCADE_KIT.md`, the feel audit and `full-feel-g5.md`. Shell Song is offline musical memory for Stassie and family. The repeat turn is untimed. The shared kit owns learner progress, earned stars, Helper migration, pause, game over and retry; active songs are not saved.

Normal play has three hearts; Helper adds two hearts and 120 ms to each note without showing answers. Each wrong note costs a heart and replays the same phrase, with a short shell shake/dim and the shared hit reaction. Zero hearts shows Game over, score/best and instant Try again. Earned progress survives a loss. Stars: one for completion, two for at most one slip, three for zero slips. Optional replay is free. Learning retains its slow 3,200 ms cadence, unlimited mistakes, phoneme narration, explicit help and untimed picture choice.

There are 56 authored levels. W1 grows a three-shell tune; W2 adds a fourth voice; W3 expands to five/six voices; W4 replaces each completed call with a fresh, longer response phrase; W5 plays twin-note echoes that must each be tapped twice; W6 starts with longer songs and adds two notes per round. The final levels of each world have four rounds. Cadence accelerates after each successful round; mistakes/replays keep that round's cadence and melody. Changing Helper restarts the same phrase at its new tempo without adding slips or refilling damage. W5 uses paired echoes rather than simultaneous harmony because the shared effect player is monophonic.

| Constant, Helper off | W1-1 | W3-8 | W6-8 |
| --- | --- | --- | --- |
| Shells | 3 | 6 | 6 |
| Phrase lengths | 2 → 3 → 4 | 6 → 7 → 8 → 9 | 9 → 11 → 13 → 15 |
| Note onset intervals, ms | 650 → 600 → 550 | 418 → 398 → 378 → 358 | 318 → 298 → 278 → 258 |
| First glow / first repeat turn, s | .45 / 1.75 | .45 / 2.958 | .45 / 3.312 |
| Perfect score | 90 | 300 | 480 |

Automatic onset IDs advance in the pure 60 Hz engine. The loop's event frame calls audio and publishes the glow snapshot together; the note counter retriggers identical consecutive shells. Recall input uses shared `PressControl` on touch-down with a 220 ms manual glow, synchronous rule dispatch and a fresh animation cue on every tap. JS is appropriate here: the shortest finite cadence is 258 ms, the loop carries at most six fixed steps per frame, and there are only six stationary targets. This is event timing, not sample-accurate audio or native latency acceptance. Static shell art is memoized; decorative bounce and note particles use shared animations and honor Reduce Motion.

Feedback lasts 450 ms beside the phase label. The shared measured full-height arena replaces the scrolling Song board. Shell size uses available height, with a 148 px two-row tablet cap and a single row in short landscape layouts. No audio-bank, save-schema, native-directory or release-version changes. No new spoken keys; existing introduction/phoneme/word clips and tones remain the speech path. New twist labels are visible text. Learning pictures appear after the last 220 ms note envelope so the releasing shell touch cannot select a picture beneath it. The untimed picture phase hides its progress row on short landscape screens to keep replay and help fully visible.

Engineering and runtime receipts are in `/Users/leonshimizu/Desktop/ShimizuTechnology/little-island-games-artifacts/island-arcade/feel-song/`. Final QA results and source SHA are recorded there in `REPORT.md`. Native simulators, physical audio/haptics, VoiceOver, A12 performance and family acceptance are not run under the worker brief; the lead owns those checks and integration review.


## Canoe Cargo

Feel v2, 28 October 2026; worker `feat/feel-puzzle`, base `c872d1b`. `ARCADE_FEEL.md` and the supplied feel audit supersede the original slow introductory game. Private offline family play remains the scope. Shared progress, map, Helper default/migration, pause, results and retry come from the kit; runtime rounds are never saved.

Pack the original **9×14** hold with seven four-parcel shapes drawn without replacement from a seeded Fisher–Yates 7-bag. Two upcoming bundles and a dashed rope landing outline are visible. Left/right fire on touch-down, with **170 ms DAS / 50 ms ARR**. Hold soft drop for **20×** current gravity; hard drop locks immediately with a **140 ms** trail. Ground contact allows **500 ms** to move or turn, with **15** successful grounded resets; failed wall moves and failed down inputs cannot extend it. Board swipes act during movement (20 px threshold): left/right slide, up rotates, down hard-drops. The settled board, queue, score and spawn metadata publish together at the lock event, through the shared immediate-event snapshot path. A **160 ms** row flash never delays the next piece. Score pops last **450 ms** beside the cleared row.

| Normal tuning | W1-1 | W3-8 | W6-8 |
| --- | ---: | ---: | ---: |
| Initial seconds per row | 0.800 | 0.300 | 0.101 |
| Final seconds per row (15% ramp) | 0.680 | 0.255 | 0.08585 |
| Canoes to finish | 4 | 11 | 17 |
| Initial partial rows | 0 | 2 | 5 |
| Base tide interval, loads | none | 8 | 6 |
| Three-star load par, seed-42 fixture | 10 | 22 | 33 |
| Two-star load ceiling | 14 | 26 | 37 |

Six eight-level worlds: W1 packs an empty hold; W2 adds precious stuck-crate openings; W3 adds rising wide-gap tide rows; W4 narrows the tide channel to two cells; W5 alternates tide channels and offsets the opening stacks; W6 combines narrow tide rows with a crowded alternating opening. Targets and speed ramp across each world; gravity rises 15% with goal progress and tide cadence tightens halfway through a level. Tide overflow or an obstructed spawn is **Game over**, with the kit's score/best, immediate same-level Try again and Map. Helper multiplies fall time by **1.25**, adds two loads between tides, and permits one reserve per run. That reserve returns after the replacement load; toggling Helper cannot refill it. Neither setting prevents top-out. Puzzle games use their native loss rules rather than hearts.

Number Voyage has eight **untimed** levels, regardless of Helper. Values 1–3 remain visible. Every full row sails; an exact target sum sails twice and adds 100 points. A missed target marks later learning credit as helped. The supplied-gap example now lives only in a **five-second teaching demo**, with a four-cell bundle; it awards nothing and precedes a real four-canoe W1-1. Reading and the Ready button are never timed.

Stars: one for clearing; two within `par + 4` loads; three within `par`. The 56 deterministic packing receipts in `tests/fixtures/puzzle-feel.json` clear through the normal reducer, with exact score/line/load assertions. Pars are reproducible packing benchmarks, not a claim of optimality or that every seed has an identical optimum. Scores are 5 per load, 100 per row, 100 per exact sum, 40 per row on multi-clears, and 40 per consecutive-clear combo step after the first. Losses preserve all previously earned stars and update local bests through the kit.

Rendering retains memoized static SVG cargo and per-frame shared poses. Cargo uses the kit's JS fixed-step path: this is a 126-cell discrete puzzle, not one of the four fast continuous-physics games. Computed step timings and web scheduling are recorded in the external receipt; native A12 performance remains a lead acceptance gate. Decorative trails/travel honor Reduce Motion; essential piece movement and the landing outline remain. No audio assets, voice-bank files, speech keys or save schema were changed.

## Reef Builder

Feel v2 shares the same worker/base and product sources. Fill rows or columns on an **8×8** reef with three offered original coral pieces. W1-1 asks for **three lines**, starts with only three occupied cells in one row, and offers a line, square and corner. No opening move can finish the level. A tray refills only after all three pieces are used, so preserving room matters.

A dragged piece lifts **72 px** above the finger at **board cell scale**. Gesture-handler and Reanimated shared values track it on the UI thread; React receives hover updates only when the snapped cell changes. The occupied cell grabbed, including the fraction within it, remains the anchor. The same pure `reefDrag` transform determines art, preview and drop. Board measurement excludes decorative borders; phone/tablet cells stay square. Tap a piece then tap a board cell remains the labelled, touch-down alternative.

| Normal tuning | W1-1 | W3-8 | W6-8 |
| --- | ---: | ---: | ---: |
| Lines to clear | 3 | 9 | 15 |
| Starting occupied coral cells | 3 | 3 | 3 |
| Permanent rocks | 0 | 0 | 6 |
| Initial shape-pool size | 7 | 10 | 11 |
| Three-star moves, seed-42 fixture | 10 | 21 | 37 |
| Two-star moves | 14 | 25 | 41 |

W1 offers varied short pieces; W2 expands the corner/long-piece pool; W3 adds the large rectangle and cross-planning; W4 adds two rocks; W5 uses four rocks to make winding channels; W6 scatters six rocks while preserving six open columns. Rocks occupy cells and block clears along their own rows/columns; they cannot disappear in a clear. The shape pool grows after each three trays within a level, bounded by the eleven original shapes. Targets ramp within each world.

**No offered piece fits = Game over**, including with Helper, even if empty cells remain. Helper's **Show a fit** selects a legal placement and preview; it never replaces pieces, clears cells, revives a loss or changes star thresholds. Free play Finish is a voluntary stopped result. A **160 ms** flash retains cleared-cell positions, fish launch from the actual rescued cells, and the local score pop fades by **450 ms**. Input continues during effects. Reduce Motion keeps a still flash and suppresses travel.

Stars: one for clearing, two within `goodMoves`, three within `greatMoves`. All 56 pars come from replayable deterministic fixtures in `tests/fixtures/puzzle-feel.json`; the fixtures assert the saved score/line/move outcome and Helper parity. These are feasible planning benchmarks, not optimality proofs. Number reefs remain turn-based and clear when rows/columns total ten, with wrong sums marking helped learning credit. Both games retain the shared validated per-learner earned-progress format; no in-progress runtime state is persisted.

### Feel puzzle verification

Agent-executed web QA, gate logs, recordings, frame sequences and `metrics.json` live outside Git at `little-island-games-artifacts/island-arcade/feel-puzzle/`. The final external report records the tested source, scenario statuses and limitations. Native simulators were prohibited; native touch, physical A12 performance, VoiceOver, audible/haptic comfort and family acceptance are **not run**. No PR, merge, version bump, audio generation or public release is part of this worker task.

## Fruit Bat Flight

Feel v2 · 28 October 2026 · `feat/feel-scroll`, based on `c872d1b`. Sources: `ARCADE_FEEL.md`, the feel audit, shared `ARCADE_KIT.md`, and the full-feel-g1 brief. Private offline family play; native builds and family acceptance remain with the lead. This section supersedes the earlier scrolling-game rules and receipt below.

Touch anywhere in the sky or Flap on **touch-down**. Each down sets upward velocity to −0.65 arena heights/s; gravity is 1.9 heights/s² and falling is capped at 1.2 heights/s. The bat tilts from −25° to +65°, articulates its wings for 120 ms, tumbles on a hit, and celebrates a clear. Helper uses 1.75 gravity, a 4% gentler flap, 12% slower scroll and an extra .06 height of opening. Four recycled palm slots and a uniformly scaled **390×660** arena keep collision geometry and art consistent on phone/tablet, with letterboxing as needed.

| Constant, Helper off | W1-1 | W3-8 | W6-8 |
| --- | ---: | ---: | ---: |
| Successful gaps to clear | 12 | 32 | 60 |
| Starting scroll, arena widths/s | .360 | .442 | .544 |
| Gap spacing, arena widths | .50 | .48 | .45 |
| Opening cadence, seconds | 1.389 | 1.086 | .827 |
| Base gap, arena heights | .360 | .3035 | .2345 |
| First trunk contact, seconds | 1.439 | 1.172 | .952 |

There are **56 levels**: six eight-level arcade worlds and eight math levels. W1 starts at 12 gaps and reaches 20. W2 adds staggered high/low palms; W3 moving gaps; W4 vertical gusts; W5 breathing openings and quicker moving gaps; W6 pulsed scroll alongside the tightest openings. Level speed rises 12% as successful gaps accumulate. W5–W6 openings breathe ±.01 height; W6 scroll pulses ±3.5%, so the table gives t=0 opening values. Wind and centre motion are seeded/clocked, never random frame-to-frame jumps. The next centre is bounded against the previous palm.

The bat hovers ("Tap to fly") at the start of a level and after each lost heart; the world and the protection timer wait for the next tap. Arcade levels start with **3 hearts**, or **5 with Helper**. A trunk, ceiling or ground hit spends one heart, gives 1.2 s of protection, tumbles briefly and respawns near the upcoming opening; the world keeps scrolling and the hit awards no progress. At zero hearts the shared Game over screen offers score/best, immediate Try again and Map. **Free Flight is one hit even with Helper**, scoring **+1 per successful gap**. Voluntary Finish remains available. Old saved bests retain their original numeric values; this worker does not rewrite historical scores or earned progress.

Stars: one for clearing; two for clearing with at most one hit; three for **zero hits and at least ceil(.85 × target) fruit**. Each centered successful gap collects one fruit. These goals are shown before play and exercised by deterministic legal-input fixtures. Stars are performance rewards, never currency. No round positions enter saves.

Number Canopy keeps slow three-choice arithmetic, same-fact retries, unlimited attempts and helped-credit tracking after a wrong answer. No reading is timed. Controls, rules, safe rehearsal and live play use the same pure engine. Shared tone/haptic and hit feedback apply; Reduce Motion removes wing/tilt/tumble decoration and particles while preserving necessary gameplay movement. Score pops sit above/right of the bat and expire within 450 ms; no instruction banner covers play.

Both scrolling games run fixed 60 Hz pure steps on **`useArcadeUiLoop`**, using worklet-safe transitive functions. A bounded serial command mailbox consumes fast downs once in order. Shared-value poses update every rendered frame; HUD/event snapshots use the shared immediate-event path. Memoized static art layers and articulated rigs do not receive clock snapshots. No dependency, native project, audio bank or save-schema changes.

## Lagoon Run

Same feel-v2 scope and source as Flight. **One pinhole camera** projects the road edges, lane lines, moving stripes, hero contact point, shadows, shell trails and every obstacle. Horizon y=.32H; contact y=.84H; road half-width=.46W; lanes are ±⅔ of that half-width. Perspective factor is `z / (2 − z)`; z=0 is the common horizon and z=1 the collision plane. Every sprite uses a compensated bottom-centre anchor. Objects are clipped before the horizon, appear within the road, and grow along its lane lines. The uniform 390×660 arena preserves these relationships on phone/tablet in either orientation.

| Constant, Helper off | W1-1 | W3-8 | W6-8 |
| --- | ---: | ---: | ---: |
| Successful rows to clear | 14 | 31 | 46 |
| Starting depth speed/s | .420 | .517 | .631 |
| Row spacing, depth | .640 | .596 | .530 |
| Opening cadence, seconds | 1.524 | 1.153 | .840 |
| First contact, seconds | 2.000 | 1.625 | 1.331 |
| Contact motion, arena widths/s | .739 | .910 | 1.111 |

W1 introduces coconuts and two-lane blocks after the first three rows. W2 adds high fronds/lines; W3 moving crabs; W4 mixed low/high two-lane patterns; W5 crabs sweep between adjacent blocked lanes; W6 occasionally adds a low obstacle in the shell lane, requiring a timed jump. A safe collectible lane remains available in earlier worlds. Crossing crabs cannot sweep through the unblocked shell lane. Speed rises **18% within each finite arcade level**; Helper slows it by 12%. The 56 authored levels include eight slow, unlimited-retry arithmetic levels.

Swipes trigger while the finger crosses **20 physical pixels**, without waiting for release. Arrow controls fire on down. Lane changes ease out over **120 ms**, with lean and interruption from the current visible pose. Jump is **.55 s**, with a sine arc and 130 ms landing squash; slide is **.60 s**, with a folded-limb crouch. The runner has an alternating ~8 Hz run cycle, stumble, hit flash and raised-arm clear pose. Collision checks use the interpolated visible lane and actual jump height (above .42 of the arc), rather than granting immediate immunity at jump start. Shell trails contain three shells: a successful row gives 10 points plus 30 for following the trail. Local +10/+40 pops reflect the actual award and fade by 450 ms. The only initial demonstration is a small, fading gesture cue; there are no repeated instruction banners.

Shared hearts and failure rules match Flight levels: 3/5 hearts, 1.2 s protection, no paused world motion on impact, terminal Game over/score/best/Try again/Map, and monotone earned progress. Stars: one for clearing; two for at most one hit; three for **zero hits and ceil(.85 × 3 × target) shells**. W6 requires both lane planning and jump timing for three stars. Free Run permits voluntary Finish and shared local bests. Learning rows repeat the same fact after errors, spend no hearts and mark the round helped.

Current feel-v2 verification is recorded in the worker report and `island-arcade/feel-scroll/` evidence folder. Native/simulator, physical A12 performance, VoiceOver, audio/haptic comfort and child acceptance are separate lead/operator gates.

### Feel-v2 verification receipt (both games)

Agent-executed touch Chromium on runtime code `24203f3`: **16/16 required game/scenario/viewport entries passed** at 390×844 and 1024×768. Both games cleared W1-1, W4-1 and learning level 1, saved stars and returned to the map after reload; deliberate game overs retained earlier stars and Try again restored full hearts. **10/10 supplemental entries passed**: touch-down flap and mid-move swipe while the finger remained down, jump/duck poses, pause freezing, persisted five-heart Helper, mid-round reload, full-size controls at 768×1024 and 844×390, Reduce Motion, and one-hit Helper Free Flight with a positive saved best/family score and one-heart retry. The two offline clears passed after explicit service-worker readiness/reload, with the exact owned server stopped and browser networking disabled (5,850 cached entries).

Frame inspection found a fatal Flight hit respawning before its tumble. Final runtime `e9271a1` keeps the impact position; **4/4 focused final-code phone/tablet level/free-play death retests passed**, including a measured zero jump at the terminal pose and correct retry hearts/bests. Use `videos-impact/` for the final fatal reactions; the earlier loss videos retain the superseded reaction. Clears, camera, inputs and offline paths are unchanged by that fix. Deterministic legal inputs earn three stars on **all 112 authored levels** (`fixtures.json` and the regression suite).

Final runtime full gate: `npm run check` passed typecheck, lint, **918 tests / 60 files**, and production export. Doctor **21/21**; advisory Impeccable 4.6.0 `[]`. The required matrix measured Mac web rAF scheduling p95 **9.0–9.3 ms**, maximum **108.4 ms**, with **one >25 ms interval** while recording/screenshooting. This is scheduling evidence, not GPU presentation or native performance proof. Both production engines use the shared UI-thread option; the dev overlay samples UI frame scheduling.

Evidence: `/Users/leonshimizu/Desktop/ShimizuTechnology/little-island-games-artifacts/island-arcade/feel-scroll/` contains the ledgers, scripts, 22 videos, frame sequences, pacing metrics, deterministic fixtures, gate logs and final report. Initial export-overlap/harness failures and the first offline-readiness failure remain under `attempts/`; corrected retests passed. Native Release, physical A12/family feel, VoiceOver, audible/haptic comfort and independent final-code review remain with the lead. No simulator, dependency, voice-bank, global Store/validation or app-version changes; no new speech keys. Owned browsers and previews are stopped; no runtime resource is handed off. The branch/worktree is retained for integration; no PR or merge.

Lead integration notes outside this slice: old Flight bests keep their original numeric units while new runs score one point per gap. Shared `registry.ts` still calls W6 Flight “paired palms”, and `plays.tsx` learning copy says flight/run waits while choosing, although these math worlds move slowly with unlimited retries. Align that shared copy and choose any historical-best migration centrally; this worker preserves the original saved data and edits only its owned paths.

### Historical pre-feel-v2 receipt (superseded rules)

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

Helper multiplies the cell interval by 1.2, without changing goals or pars. Each normal level shortens its cell interval by 13% as chicks join (about 14.9% faster movement). Six eight-level gardens introduce the moving patrol, fern hedges, extended patrol/corner hedges, bamboo corridors, mango groves and curling two-turn paths. The outer ring and bottom respawn runway stay open. Free play accelerates from 170 ms toward a 105 ms floor, and supports voluntary Finish with a local best.

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

### Feel v2 grid verification · 28 October 2026

Final gameplay source `e7c1388`, cache `little-island-e4e1b7e06ca5`, Node 22.22.3. `npm run check` passed typecheck, lint, **918 tests / 60 files** and production web export (5,848 bundled resources). Doctor passed **21/21**; the advisory Impeccable 4.6.0 scan returned `[]`. The final receipt commit changes documentation only.

**42 scoped web dimension/fixture entries passed**, executed by the agent in isolated touch Chromium contexts. The 16 required recordings cover both games at 390×844 and 1024×768: W1-1 clear with three saved stars, actual zero-heart game over and same-level retry, W4-1 play, and learning level 1 clear with saved progress. The 20 additional entries cover 768×1024 / 844×390 controls, portrait Free play Finish, down-before-release and mid-move swipe input, Helper choice/reload/five-heart HUD, a held winning touch through release, saved-star map/reload, and scheduling. Four separate real-time pause cases verify unchanged sprite transforms while paused and renewed movement after Resume. Two final Rail learning checks verify 16–17 intermediate positions on the winning 120 ms step and its exact final tile while the finger stays down. General journeys were recorded on `52271f4`; affected Rail learning clears and held-win checks were retested on `e7c1388`, with per-entry source IDs in the ledgers. W4 video is a short played sample, not a browser clear of every late level; all 112 levels clear through deterministic engine fixtures.

Each recording has twelve extracted native-size 25 fps frames and a contact sheet, all inspected by the worker. They show intermediate cell/hop positions, Rail corners and continuous lane movement, plus local hit effects and blinking protection. Result screenshots and save receipts establish the clears and losses separately from motion samples. Evidence is outside Git in `/Users/leonshimizu/Desktop/ShimizuTechnology/little-island-games-artifacts/island-arcade/feel-grid/`: `qa.json`, `extra-qa.json`, `pause-qa.json`, `video/`, `frames/`, `frames.json`, `frame-review.json`, `metrics.json`, gate logs and the capture scripts.

Mac Chromium scheduling after warmup: Rail W1-1 played clear, **1,408 intervals, 119.41 fps, p95 9.1 ms, max 66.2 ms, one >25 ms**; Crab W6-8 moving lanes, **2,392 intervals, 119.65 fps, p95 9.0 ms, max 58.1 ms, one >25 ms**. The longer intervals remain in the receipt. These are JS rAF scheduling measurements, not GPU presentation, native UI-runtime isolation or physical-device acceptance.

QA caught and fixed a winning touch reaching the newly mounted result menu, a portrait-tablet HUD overlapping the header, and the last learning move retaining its previous pose. The final learning step now has an independent 120 ms visual clock before celebration, and its completed distractor is removed rather than displaying an expired number. Clears now retain the control until finger-up and then show a 300 ms celebration; measured-height caps keep the HUD and Finish reachable. Earlier capture faults (remote video retrieval, route-model catchup and compressed scheduled input) and failed attempts remain beside their final retests. The final required and extra ledgers contain no failed or unrun entries.

No new speech keys, voice assets, packages, save schema or protected integration files changed. Shared grid edits are `grid/Art.tsx` (memoized backdrop and exact-width lane art), `grid/Controls.tsx` (repeat/keyboard and touch-release tracking), and new `grid/Feedback.tsx` (450 ms local effects). Native/simulator/Android, VoiceOver, physical sound/haptics and family acceptance were not run; the brief forbids simulators. Independent final-code review, combined native acceptance and release remain with the lead. No PR, merge, release or public publication was performed. Owned browser contexts/processes and preview are cleaned; no Metro, simulator, emulator or container was started, and no runtime resource is handed off. The branch/worktree is retained for integration.

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

Feel v2, 28 October 2026, integration base `c872d1b`. Coco aims and holds to toss friendly beetles into nets. One centred 360×600 arena drives sprites, hitboxes, shields and touch conversion, with uniform scaling and letterboxing on wide tablets. Gesture-handler writes shared input; the shared `useArcadeUiLoop` runs pure worklet rules at fixed 60 Hz and publishes sprite poses every frame. The memoized art layer stays separate from the event/HUD snapshots. Web uses the browser thread; native UI-runtime and physical A12 acceptance remain with the lead.

W1-1 starts with a marching 2×5 group. Each wave brings four consecutive groups in Worlds 1–2 and three larger groups later, without artificial waits between groups. Catching a group immediately brings reinforcements. Marching accelerates by `1 + .8 × (1 − alive/initial)` and another 20% through the wave. Each edge reversal descends 16–21 units. Hold anywhere to aim and fire every .22 seconds; release/cancel/pause stops firing. Short taps are buffered across frames. Husks travel at 560 units/s. A .65-second pause separates completed waves.

Coconut Cove introduces marching; Breezy Palms adds timed dives; Moonlit Grove adds marked two-bonk armour and a third row; Breadfruit Ridge aims diagonal dives at Coco’s position at launch; Rain Garden removes one frond shield; Sunrise Palms combines faster mixed groups and four waves. Every world's level 8 has a five-bonk crown in its final group. Sunrise Palms adds escorts around that crown; earlier crowns march alone. The formation is bounded to 15 beetles. World 1 opens voluntary free play, which progresses through all six world configurations.

There are 3 hearts, or 5 with Helper. A beetle reaching the palms spends one heart and returns to the formation, with 1.2 seconds of grace. Several simultaneous arrivals spend only one heart. Three frond shields each absorb three beetles; Rain Garden onward has one missing shield. Leaf saves, armour bonks, net captures and heart hits have distinct cues. The shared hearts HUD, hit reaction and Game over / score / best / Try again / Map flow own the presentation. Helper slows marching/diving to 82%; it never auto-fires or prevents loss. Switching Helper preserves damage. Loss never removes earned progress.

Stars: one for clearing all waves; two for at most one heart lost; three for no hearts lost, the authored accuracy target, and the level par. Accuracy is landed husks divided by fired husks, including shots that fail to find a target. Deterministic lead-aim fixtures establish reachable pars; aiming directly at the current position and spraying does not guarantee three stars. All thresholds appear on the start card.

| Normal constants | W1-1 | W3-8 | W6-8 |
| --- | ---: | ---: | ---: |
| Group size / groups per wave / waves | 10 / 4 / 2 | 15 / 3 / 3 | 15 / 3 / 4 |
| Starting march units/s | 40 | 59.7 | 77.7 |
| Edge descent units | 16 | 18 | 21 |
| Dive interval / speed | none | 3 s / 171 | 1.8 s / 231 |
| Top-star accuracy / par | 55% / 45 s | 60% / 90 s | 67.5% / 144 s |
| Seed-42 lead-aim clear | 33.53 s | 53.88 s | 74.83 s |

Number Grove retains eight untimed math levels, three to five facts each. Three stationary choices carry a correct answer and distinct distractors; wrong answers bounce back, mark assistance and never cost hearts or expire. One star finishes, two allow one wrong answer, three require every answer right first time. Shared practice/learner credit remains unchanged.

Original vector art retains Coco's four outfits, friendly beetles, woven nets and frond shields. Coco recoils on firing, tilts while active, flashes/knocks back on a hit and celebrates through the shared result. Local pops last .45 seconds; net motion and impact particles use the simulation clock. Reduce Motion removes decoration while preserving necessary gameplay motion. Existing speech keys and tone/music banks remain; no audio generation or save-shape change.

Feel v2 evidence is outside Git at `little-island-games-artifacts/island-arcade/feel-action/`: `PLAN.md`, engine fixtures, pacing metrics, web recordings, inspected frame sequences and the final QA ledger/report. Historical action-slice receipts below describe the previous tuning and are retained as history. Native/simulator work is explicitly excluded from this worker.

## Beach Ball

Feel v2, 28 October 2026. Bibi and both paddles use the same uniform, centred 360×600 camera as Palm Patrol. Paddle width/thickness, ball radius, turtle and touch conversion all share logical units. Swept circle/capsule contact follows the drawn rounded paddle, including its curved ends; it does not add a stretched invisible hit strip on iPad. The ball radius is 12, paddle thickness 20, and paddle centres are y=65/535. The shared UI-thread loop steps physics at 60 Hz; gesture-handler shared values track two independent fingers without per-move React updates. One finger owns each seat from its initial half, retains it across the centre and releases independently; extra fingers cannot steal an occupied paddle. Static sprite art is memoized separately from the HUD.

A normal opening serve travels at 250 units/s, each paddle hit adds 4%, and the total speed cap is 450 units/s, including wind/spin and Helper changes. Contact offset determines the outgoing angle. A marked centre serve follows a .65-second pause; two-ball courts use alternating lanes and stagger the second ball by .45 seconds. Starting speed rises through a match. Impact squash lasts .18 seconds; .2-second sparks originate at the actual contact, and .45-second point pops sit beside the scorer. Concurrent two-ball effects are retained independently. No large central feedback covers the ball.

Sunny Sands plays first to five; Turtle Breeze adds wind and the sleeping turtle; Sunset Splash adds the second ball; Sandbar Spin adds edge-return spin and seven-point matches; Monsoon Match adds reversing gusts; Starfish Finals moves the turtle with the tide. Every world has eight progressively faster levels. Count Coast keeps eight levels counting by twos/fives at a gentler speed. Watching shared scores is exposure, not independently answered math credit; optional chests record actual practice. Reading remains untimed.

| Normal constants | W1-1 | W3-8 | W6-8 |
| --- | ---: | ---: | ---: |
| Points to win / balls | 5 / 1 | 5 / 2 | 7 / 2 |
| Starting speed, units/s | 250 | 297 | 336 |
| In-match starting-speed ramp | 10% | 13% | 17.5% |
| Wind acceleration, units/s² | 0 | 22 | 28 |
| Spin acceleration at paddle edge | 0 | 0 | 48 |
| Turtle / reversing gust / moving turtle | no / no / no | yes / no / no | yes / yes / yes |

Computer strengths have explicit reach, aim error and reaction intervals. Gentle starts at 80 units/s, 50 units error and 160 ms; Steady at 150 / 35 / 110 ms; Zippy at 230 / 32 / 70 ms. Stronger computers predict wall-reflected arrival and intentionally angle returns. Errors exceed the audit's proposed starting values after measured overlong rallies demonstrated that accurate centre returns could become indefinite. Deterministic simulated-opponent win rates, fixture policy, seeds and match durations are recorded in `feel-action/metrics.json`; these measure the policy fixture, not family win rates. Native/physical feel remains lead/operator acceptance.

Beach Ball keeps its point/match loss, as explicitly accepted by the lead, with no unrelated hearts. Solo loses when the computer reaches the point target; either family seat may win. Simultaneous final points tie and play continues. One star wins, two concede at most one point, three concede none. Five/seven-point matches make those thresholds substantive. Helper widens the human paddle to 116 (both family seats), slows serves to 84%, reduces AI reach and increases its error; it never removes point loss. Free play uses all six-world mechanics; together free play goes to seven, solo continues until Finish. Names, match tally, remembered names, monotone earned progress and reload-to-map behavior continue through the shared frame/Store.

Original glossy ball, shape-marked teal/coral paddles, turtle, island court and four kit outfits are preserved. Reduce Motion suppresses decorative squash/particles while retaining ball/paddle travel. No new spoken lines, audio banks, dependency, Store, validation boundary, Home, Settings or save-schema edits. Web recordings, inspected frames, saved outcomes, strength measurements and QA results live in the external `island-arcade/feel-action/` folder. The receipts below are historical W5 evidence and describe the older rules; current feel v2 acceptance is recorded separately there. No simulator was started by this worker.

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
