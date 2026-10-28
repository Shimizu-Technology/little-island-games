# Arcade feel v3: device-true smoothness, real Tetris controls, a runner that reads

28 October 2026. Leon played 1.9.0 (15) on his iPhone (an iPhone Pro with a ProMotion 120 Hz display). He found it better overall, with these problems:
- Flappy is laggy.
- The runner is still terrible; the character's arms and legs make no sense.
- Tetris is terrible: pulling down scrolls the screen, and tapping should rotate like the real game.
- "Audit it all."

Evidence:
- `little-island-games-artifacts/island-arcade/perf-audit/REPORT.md`: Release profiling and a Skia prototype.
- `little-island-games-artifacts/island-arcade/genre-audit/REPORT.md`: per-game genre, controls and art audit, with the art direction.

## Root causes

1. **The app is capped at 60 Hz on ProMotion iPhones.** `app.json` lacks `CADisableMinimumFrameDurationOnPhone`, so CADisplayLink (and therefore Reanimated frame callbacks and rAF) runs at 60 Hz while iOS itself runs at 120 Hz. Next to the rest of the phone, the game reads as laggy. Simulators are 60 Hz, which is why no recording showed it.
2. **No render interpolation.** Engines step at a fixed 1/60 s and poses are published from the latest step only. Any frame-timing jitter produces 0- or 2-step frames (judder), and at 120 Hz positions would update only every other frame. The fix is the standard "fix your timestep" interpolation between the previous and current step, with a snap guard for teleports and recycles.
3. **Input through JS.** Flight's sky tap and Run's swipes go native → JS → mailbox → frame: 18–37 ms measured on the simulator, and longer when JS is busy. Gameplay input should be gesture-handler worklets writing the UI-thread mailbox directly.
4. **Per-frame native work.** Flight mounts 22 animated sprite wrappers, Run 59 and Palm 68, all re-evaluated every frame from one freshly allocated pose array, including hidden slots. Also, whole state is sent to React about 11 times a second. Measured main-thread time per frame was 2.9–4.9 ms on an M1, which a phone multiplies. Fix: keep hidden or unchanged slots constant, and send compact changed-value HUD/event payloads.
5. **Skia is not the answer right now.** The prototype showed no frame-rate advantage on the simulator, more main-thread waiting, and +13 MB. Revisit only if physical profiling still fails after 1–4.
6. **Canoe Cargo and Reef Builder render inside the game screen's ScrollView** (no `fullBleed`), so vertical drags scroll the page and safe areas clip the controls.
7. **Canoe Cargo is not Tetris-like to touch.** A drag moves one column and stops, a tap doesn't rotate, any downward drag hard-drops, Hold is hidden, and rotation has no stable pivots or kicks.
8. **The Lagoon Run character rig is broken.** It's four limb drawings rotating around their own centres with no shoulder or hip joints, at 8 cycles per second. Duck reads as falling over, jump has no pose, the scenery is static so there's no sense of speed, and shells are awarded in bulk.
9. Other art and feedback gaps per the genre audit:
   - the bat's wings aren't attached at the shoulders;
   - Rail's heading is ambiguous;
   - Crab homes are never occupied;
   - Reef pieces change colour after placement;
   - Song shells lose their identity colour when lit;
   - Beach walls and goals aren't drawn where physics puts them;
   - Coco never throws;
   - worlds 4–6 are missing palettes.

## Plan

- **Kit v3** (shared, first):
  - opt in to 120 Hz in `app.json` (`ios.infoPlist.CADisableMinimumFrameDurationOnPhone: true`);
  - generic pose interpolation in the UI and JS loops (interpolation factor = remainder / step, with a snap threshold);
  - gesture-handler worklet tap, hold and swipe that write the UI mailbox for Flight and Run;
  - compact HUD/event publication;
  - constant hidden slots and fewer per-frame allocations;
  - a non-scrolling, safe-area measured arena for every game while playing;
  - an exhaustive WorldId palette map.
- **Puzzle v3** (parallel with kit):
  - Canoe Cargo gets the real mobile Tetris touch scheme: a tap rotates; a horizontal drag follows the finger column by column while held; a slow downward drag soft-drops until release; a fast flick down hard-drops once; a visible Hold slot (one swap per piece); stable piece pivots with wall and floor kick tables; square cell plates on a quiet grid with one outline per active piece.
  - Reef Builder: pieces keep their colour, cell plates, and a measured non-scrolling arena.
- **Art v3** (parallel with kit): Rail directional heads; Crab occupied homes, hop poses and mirrored vehicles; Palm wave pips and Coco's throw; Beach rails, goal mouths, wall feedback and ball outline; Song shells keep their colour and use a compact layout.
- **Scroll v3** (after kit):
  - Lagoon Run: a new rear-view runner (3–3.5 heads tall, pelvis-rooted rig or an authored 8-pose run cycle at 14–18 poses/s), jump and roll poses anchored to the shadow, side scenery streaming past from the shared camera in near, mid and far bands, per-shell pickups, obstacles that travel past the player, and tablet controls next to the course.
  - Fruit Bat Flight: a side or three-quarter bat rig with wings rooted at the shoulders, a collision hull matched to the body, a parallax canopy and a ground edge.
- **Lead:**
  - native Release recordings;
  - a 120 Hz check: confirm the Info.plist key is in the built app, and that the frame callback reports a refresh rate above 60 on supported hardware;
  - review, then 1.9.1 (16).
- **Ask Leon** for an iPhone screen recording of Flight and Run after the update. That's the only real-device evidence we have.

## Puzzle v3 implementation receipt

`feat/feel3-puzzle`, based on `7e696e0`: Cargo has tap-to-turn, continuous grabbed-offset horizontal drag, held slow-pull soft drop, velocity/displacement-qualified one-shot flick drop, visible per-piece Hold and stable pivots with ordered I/other-piece wall/floor kicks. Cell art is square and consistent, with an active bundle boundary and quieter landing ghost. Reef retains each tray piece's appearance per cell in a validated version-2 runtime state, with a non-mutating strict legacy migration. Both play entries use `fullBleed: true` and pass measured arena dimensions into layouts; the shared loops/input files and other game slices are untouched.

The existing 112 fixture actions, scores, lines and three-star pars are unchanged. Engine/unit and recorded browser acceptance, build hashes, inspected frame sequences, gate logs, limits and resource cleanup are recorded in `little-island-games-artifacts/island-arcade/feel3-puzzle/REPORT.md`. Native/physical touch and family acceptance remain with the lead; this worker does not publish or create a PR.

## Kit, puzzle and art integration receipt

`feat/feel3-merge` merges kit `822456f` into integration base `9c7fb21`; application merge commit `27fb1af`. The kit's ProMotion opt-in, UI mailbox, interpolation, compact publication and measured arena remain intact. Cargo keeps the puzzle worker's touch controls, Hold, kicks and layout; its interpolated builder now matches the renderer's four tiles, active boundary and snapped landing outline. Reef keeps migration, appearance IDs and measured sizing unchanged.

Palm's worklet-only pose builder retains march and throw frames, with a wave/relay/fact identity for group entrances and attachments. Discrete authored frames copy from the current fixed step while continuous fields interpolate; this also preserves Crab's auto-merged hop frames. Palm's compact HUD includes wave/group pip counts. Beach retains72 slots, two-finger input, wall sparks and trails. Sparks snap; serve/trail identities prevent interpolation across points. Wall audio observes a UI-owned serial outside the builder.

The combined source passes `npm run check` (typecheck, lint,1,141 tests/68 files, web export) and Doctor21/21. Advisory Impeccable returned `[]`. Recorded agent-executed Chromium touch QA passes Cargo/Reef controls, appearance, clears, recovery, rotation and layout cases; Palm/Beach motion, two-finger input and saved clears; and smoke interaction/pause-resume for Flight, Run, Rail, Crab and Song at390×844 (CSS safe areas47/34) and1024×768. Selected decoded recording sequences were inspected. Scripts, ledgers, build hashes, recordings, frame inspections and the final report are outside Git in `little-island-games-artifacts/island-arcade/feel3-merge/`.

No further delegation, PR, integration-branch push, simulator or release build belongs to this worker. Self-review is recorded; independent lead review, physical ProMotion/A12 timing, native gestures, listening comfort, accessibility and family acceptance remain separate.

## Acceptance record (1.9.1 (16))

| Check | Result |
|---|---|
| Kit v3, puzzle v3, art v3, scroll v3 and the integration merge | Done; worker evidence in `little-island-games-artifacts/island-arcade/feel3-*` |
| 120 Hz opt-in | `CADisableMinimumFrameDurationOnPhone` = true in the prebuilt Info.plist |
| Native Release (iOS 18.5 iPhone 16 Pro simulator) | Canoe Cargo: still taps rotate (verified after the Tap/Pan race fix), drags slide, flicks drop, no scrolling. Lagoon Run: streaming side scenery, jointed rear-view runner, hint fades after the first seconds. Fruit Bat Flight: new bat, Tap to fly, Game over. Evidence: `island-arcade/native-1.9.1/` |
| Independent review | One material finding (iOS Pan never activates for a motionless tap, so Cargo rotation could miss), fixed in 4a952db and verified natively. One minor finding (Run's teaching glyph repeats for about 4 s every round), accepted for this beta |
| Full gate | `npm run check` 1,148 tests, typecheck, lint, offline export; Doctor 21/21 |
| Not verified | Physical 120 Hz smoothness, real-glass gestures, A12 iPad performance, audio/haptic comfort, VoiceOver, family acceptance |
