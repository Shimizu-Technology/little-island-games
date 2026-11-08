# L1 independent-review fixes

Branch `p4/l1-lagoon`, continued from reviewed `1d0cf719` on the private origin. Runtime/tested source: `bde98746984094d1110514946d0f30de893aa6b5`. The final documentation/push commit is recorded in `fix/data/push.json`. No delegation, PR, integration merge, public release, Apple/EAS action, family identifier/version change, save migration or difficulty edit. No speech lines added.

## Findings addressed

| Review | Result |
|---|---|
| P0-1 repeated swipe commands | Direction latch; continuing motion rebases without repeating. Deliberate changed-direction segments require 32 pt and axis dominance 1.8. A new touch/finalize resets. Real 120 pt pans now produce lane 2, edge 0, jump 1, roll 1 for left/right/jump/roll, versus reference lane 3, edge 5, jump 1, roll 2. Raw events, not summary counts alone, inspected. |
| P1-1 canoe streaks | Entire distant bitmap uses a bow-anchored similarity transform; near contact keeps the collision-quad mapping. Whole-crop positive-denominator and bounded-extents regression spans all lanes/depths and the actual authored CANOE_DEPTH. No cargo, outrigger or wake omitted. |
| P1-2 causal event meter | Stable callback; tags/tick attach to the following gap. Schema2 retains the next 3 gaps, their maximum and completeness. Terminal events retain their causal tail. Pickup hitch investigated and remeasured below; it remains unresolved and is not a performance pass. |
| P1-3 ramp completeness | Full-height flared skirts and ground shadows on every incline section. Two affine triangle masks cover concave skirts without a projective pole. Deck tops/supports remain. One shared pose snapshot computes transforms for all six faces per segment. |
| P2-1 learning feedback | Wrong learning bump emits shell-0 independently of physical hit; right-answer clear remains. Regression checks unchanged state is silent. Native audible comfort remains operator acceptance. |
| P2-2 measurement isolation | Replay and receipt writes require strict resolved dev marker `extra.lagoonMeasurement === true`. Family debug URLs cannot enable either. |
| P2-3 guarded build | `npm run ios:dev` enforces dev ID/scheme/marker, refuses existing family native identifiers, generates through Expo and rechecks before building. `--prepare` stops after generation. Config/refusal tests retained; no signing/account action. |
| P2-4 contact evidence | Dev-only legal W1-8/771 fixed-tick capture: far canoe 51, duck contact 212, canoe contact 308, ramp 391, deck 404. Before/after frames and replay clips retained. Fixtures also record immediately-before crossings 211/307. Rules and collision thresholds are unchanged. |

P3-1 callback stability fixed. P3-2 restores the nonmoving Reduced Motion opacity dip and last-heart tip-over. P3-3 warning-tone removal is intentional: the visible teaching cue remains, while continuous warnings no longer compete with action/pickup notes; protocol records this for family judgment. P3-4 splash droplets and gold near-miss sparkles have separate complete 300 ms fades. Vacant slots 37–42 carry sparkles; camera remains last.

P3-5 absent-app.config exported trees skip only the config-specific test; other meter tests run. Scratch absent-config run: 4 passed, 1 skipped. P3-6 dev config/package omit family-room Bonjour and usage keys. P3-7 protocol explicitly calls 120 ms premount time, not proof of bitmap decoding; physical-iPad decode and measured GPU/memory checks remain. P3-8 removes dead Feedback stub and texture references, records model/Low Power metadata (or unrecorded), retains the worker cap only under the shared-host flag. Extra cosmetic glints remain omitted because the existing per-pickup +1 burst remains and another layer adds work before device acceptance. No false baked-glint comment remains.

## Regression and native evidence

Failing-before logs retained in `fix/`: `regressions-before.log` (4 realistic-swipe failures plus following-gap failure), `geometry-before.log`, `learning-before.log`, `family-before.log`, `baked-mounted-before.log`, `concave-skirt-before.log`, and `deck-snapshot-before.log`. The last two caught defects introduced/discovered while restoring the full ramp. Guard refusal and complete/incomplete event-window tests were added where an old callable implementation did not exist. All 3,584 legal three-star control/collision witnesses are recertified in the full suite.

Final native package is the existing SDK57/RN0.86.3 audit shell with current Hermes/assets, resolved dev Constants, separate dev bundle/schemes and local ad-hoc signature. Hermes SHA: `7632f2cb5f6ececcd8159aff709784e74136548ebb381aeb9f0d11ebd11dcf99`; JS SHA: `fc4bba802ab6d53231ba497ddf07ffac9e107da4cef497a40ec6024390d2e97e`. `fix/data/native-builds.json` records identity. Informal Expo revision text can cache an old label, so installed HBC hashes identify receipts. This is not a new signed family-device build.

Viewed same-tick PNG pairs live in `fix/frames/before-*` and `after-*`; `fix/video/before-seed771.mp4`, `after-seed771.mp4`, `before-controls.mp4`, `after-controls.mp4` retain comparisons. Final canoe contact has score 120/shell 9/markers 3 in both versions, with the old streak absent. Final ramp has all flanks. First failed concave-skirt frames/clip remain in `fix/attempt1/` and are not acceptance evidence. Final controls raw receipt and indexed events: `fix/data/after-controls.json` and `after-controls-analysis.json`.

Pause/resume iOS26.5: paused score 120/shell 9 stayed stable, resumed to score 200/shell 15; confirmed leaving to map wrote a receipt and returned without awarding replay progress. `paused26.txt`, `left-map26.txt`, `pause-leave26.json` retain evidence. Concurrent gate load produced max 258.89 ms, below the multi-second pause; this run only proves suspension omission and recovery, not cadence.

iOS18.5 smoke is **blocked**: app installed, but agent-device open and its one advised debug retry both failed with `xcrun timed out after 15000ms` during terminate. The tool rule required stopping device work. Device screenshot showed Home Screen, so no iOS18 app journey is claimed. Diagnostics retained in `fix/data/ios18-launch-failure.ndjson`; exact temporary fixture shut down and deleted.

## Pickup investigation and acceptance limits

Reanalysis of old receipts gives 34/118 and28/96 pickup windows over33.4ms. With the corrected full ramp, quiet controls retained 38/117; no HUD 39/117, no HUD plus Sound off 39/117. Cached +1, isolated scene subscriptions, cached +10 and coalesced course publication also retained 38–39/117. Those ineffective art/publication changes were removed. Eight-second main-thread sample retains native commit/mount/Culling work. A new `hazard-front` tag marks rows crossing z=1; all 39 final windows exceed 33.4 ms. The association is exact in this replay, but does not establish that native painter reordering causes it. Do not call the hitch fixed.

Final quiet 60 s full-scene iOS26.5 run: 58.7327 callback fps (steady 58.7227), steady p95 16.667 ms, p99 36.126 ms, max 57.532 ms. All 117 pickup windows complete; 39 exceed 33.4 ms. Main CPU 18.29 s over 50.0097 s wholly inside gameplay gives 6.2270 ms/callback-frame. FPS clears 58; CPU misses 6 and the pickup requirement is not met. Raw receipt/identity, CPU script and raw thread samples are retained as `shared-quiet.json`, `.identity.json`, `shared-cpu-window.json`, `shared-analysis.json`, and `fix/tools/cpu-window.py`. This is callback scheduling and a simulator CPU estimate, not presented frames, GPU time or finger latency.

QA-07's config/runtime separation and LG-S0's corrected meter are implemented; signed physical installation remains lead work. LG-S1/R11 rendering/contact fixes and LG-S2 controls have simulator/automated evidence, but full row acceptance remains pending the unresolved performance target, lead visual judgment, real iPhone15/iPad mini, Low Power, thermal/memory/decode, audible comfort and finger-latency checks. No family approval is fabricated. No independent final-code review was delegated in this implementation turn; integration review remains with the lead. Raster payload 1,554,068 bytes; decoded full-density pixel upper bound 73,130,328 bytes, calculated rather than measured.

## Final gates and cleanup

Both exact COMMON gates passed on runtime source bde98746984094d1110514946d0f30de893aa6b5. The final commit adds documentation only.

- Default: `LITTLE_ISLAND_SLOW_QA=1 LITTLE_ISLAND_SLOW_HOST=1 npm run check` — exit 0, 202 files / 2,403 tests, typecheck/lint pass (41 existing warnings, 0 errors), offline shell a96cc9d4e031 / 6,507 resources, 438.01s.
- Preview: `EXPO_PUBLIC_LIBRARY_PREVIEW=1 LITTLE_ISLAND_SLOW_QA=1 LITTLE_ISLAND_SLOW_HOST=1 npm run check` — exit 0, same 202 files / 2,403 tests and static checks, offline shell 7b34b7e914c4 / 11,064 resources, 523.17s.
- Default-PATH `npm run doctor` — exit 0, 21/21 checks, 4.32s.

Logs: `fix/gate-default.log`, `gate-preview.log`, `gate-doctor.log`; machine results: `fix/data/gates.json`. All four generated Library files restored to committed default mode. `git diff --check` passes. Earlier failed/stopped attempts remain available and are superseded by these final runs.

Cleanup verified: lifecycle session 01a1bb50-d97a-7c00-adaf-019dddc88f36 has no active owned resources. The task dev app was uninstalled from li3-lead-v3; that simulator is shut down. Temporary iOS18.5 fixture 37E52C27-FD05-4E71-A73D-BCEB99EBB81A was uninstalled, shut down and deleted. Task build/app copies and reference scratch removed (18 directories), evidence retained. No server, browser tab, simulator or build process remains running for this task; no runtime handoff. Borrowed iPhone16/iPhone17Pro and the family app/protected shared services remain untouched. The clean branch/worktree is retained for lead integration. Push destination is only origin/p4/l1-lagoon; exact pushed head and remote verification live in `fix/data/push.json`.
