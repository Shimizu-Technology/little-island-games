# Home expressions and moves — Track 4

2026-11-27. Family feedback from Build 8: a doll stared awake in bed, and moving dolls or changing places felt delayed. This source change is for the private Build 9 integration; it does not publish a build or pass real-device family acceptance.

## Context and acceptance

Little Island is an offline family game collection, used independently by a child and together with adults. Home is a shared dollhouse with six family characters, furniture sockets and Guam places. Sources: `docs/PRD.md`, `docs/QA.md`, `src/home/world.ts`, `src/home/art/sockets.ts`, and the task's quoted iPhone feedback. The Brain Dump portfolio audit dated 2026-11-26 supplies historical product context, not current deployment evidence.

Implementation started at PR #135's approved head `63092e97083433f35a1c91c408e727d509c31601`. After #135 merged, this branch was rebased onto its integration commit `646bb30a` on `program/4.0`.

Agent-executed affected-flow acceptance:

1. Every family character closes their eyes on the first resting/landing bed frame. No sleep timer, awake interval, anticipation layer or blink copy appears over sleep.
2. Pickup uses cheerful awake carry art; returning to bed immediately resumes sleep. Tapping a sleeper keeps the HD-09 stir, zzz and rustle.
3. Bathing, sitting and holding an item use warm expressions; meal art retains bite/chew/sip and after-meal expressions.
4. Moving one doll preserves untouched entity drawings, including generated shells/food, while its furniture occupancy updates. Native revision, layout and pose acknowledgements still protect handoff and re-grab.
5. My room/Kitchen/Guam place changes schedule camera motion before synchronous durable admission. Room selection still passes through Home's Store transaction and survives parsing the saved envelope.

## Implementation notes

`activityFaceOf` is pure and supplies both SceneView's first resting frame and EntityArt's pre-mounted landing/carry art. Sleep is derived from scene activity and captured groups; no timer publishes a second sleep state. Human Face already supports closed peaceful eyes. Pip and Crab's shared PetEyes likewise use closed arcs. Home's decorative Crab drawing did not forward expressions, so explicit faces now use its expressive rig.

The scene builder reuses unchanged entities inside an edited room; a per-Home portion builder preserves generated shell/food identity. Resting shadow props use value signatures and held props retain stable pivots. The Home history's admission and persistence share the same cached entries array. Undo bounds, admission/refusal messages and the global Store validation/recovery paths remain in place.

Interaction audit: pointer travel, settle and replay run on the existing UI worklet path. Queued input waits for the committed revision rather than an arbitrary post-drop timer. The native layout/pose gates and the synthetic accessibility move's three presented-tick opacity handoff are retained; removing these would risk disappearing or stale art. The existing runtime wiring tests exercise pending commits, cross-room re-grabs, cancellation and reused pointer IDs. This change does not claim physical iPhone frame-time certification.

The old idle tests and one non-protected visibility regression assumed an eight-second awake interval. They now assert immediate sleep, no clock/publication timer, and a continuously visible idle layer. No protected tests or protected source areas were changed.

## Validation record

Tested runtime source: `19b2beef4370f20190d11b95b909a70968db209e` (rebase onto `program/4.0` is included). The subsequent evidence commit changes documentation only.

- Passed: requested Home/Save command, 1,065 tests; 2 existing conditional hull raster cases skipped because no raster-output fixture was supplied (87 files passed, 1 skipped). The five protected test files are unchanged. Typecheck and Expo lint with zero warnings passed. Doctor passed 21/21. Advisory Impeccable scan returned `[]`.
- Passed: `npm run export:web` with the lab flag for local evidence; offline fingerprint `8703b7334165`, 7,537 bundled resources. The normal `/island-home` route was tested with a validated, isolated family save, rather than relying on a lab-only persistence shortcut.
- Passed in Chromium at 390×844 with touch input: first-visible closed sleeping eyes; gentle sleeping tap; bed → floor drag with a happy awake face; saved floor position after cold page reload; Kitchen → My room → Tumon Beach → Chamorro Village → My room, with each selection durable. No page errors. Places observations include automation/React work (61–467 ms); they are not touch-to-first-camera-frame timings.
- Render tests: all six family members close their actual rig eyes at t=0; carry wakes them; bath/lounge/toy faces smile; lying actors mount no blink/anticipation overlay; untouched character/room/portion drawings keep their render counts; an acknowledged handoff permits re-grab. Room camera work is queued before Store admission. Existing HD-09 and meal/Save/recovery/profile tests pass.
- Profile: 20 pure Home apply + admission + scene rebuilds measured 2.10 ms median, 3.43 ms p95, 4.56 ms maximum on this MacBook. Full-envelope Store validation, native layout and native presented frames are excluded. The instrumented browser move window sampled 97 frames, maximum 33.3 ms, with none above 33.5 ms. Screenshot and browser instrumentation overhead is included; these are observations on this computer, not iPhone performance certification.

Evidence directory: `/Users/leonshimizu/Desktop/ShimizuTechnology/little-island-games-artifacts/v4/post-b8-polish/home-expressions/`. It contains the two requested phone PNGs, `browser-receipt.json`, `hot-path-profile.json`, and engineering logs. The shared preview browser timed out twice; final browser evidence uses task-owned headless Playwright, which was closed after the run.

Not run: native simulator/release builds, physical iPhone/iPad frames, and family playtest acceptance. Public release and Build 9 distribution remain separate gates. Independent final-code review and CI belong to the integrating lead; this implementation worker opens a draft and does not merge or watch it.
