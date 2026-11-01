# Island Home 3.0 rig contract

Source baseline: private `little-island-games`, main `1700d54` (2 Nov 2026).
Sources: `docs/PRD.md`, `docs/QA.md`, V3 COMMON/RIG brief, Toca SPEC
13–18 and 36–44, home audit H07/H16/H20, and the supplied reference frames.
Little Island is an offline family app. Children author placement and mood;
this rig never moves a character or writes a save. Native and family-device
acceptance belong to the lead, outside this web-only slice.

## Rendering and placement

`CharacterRenderInput` in `src/islander/rig/character.ts` matches the CORE
base and face unions. `action` also accepts `hold`; CORE may represent hold
as `action:null` with a held child instead. `HomeCharacter` accepts that
object plus a look and optional caller-owned life inputs.

- Bases: stand, sit, lie, bathe, carry. Pip's stand is a float; sit/bathe tuck
  its fins for a bowl or cup-like socket; lie curls into rest. Pip supports
  sit, lie and bathe sockets. Furniture fronts stay the runtime's job.
- Actions: null, hold, eat, drink. These preserve the base skeleton, anchor,
  head and pelvis. Eat/drink move the right arm/claw/fin to the mouth.
- Faces: neutral, anticipate, chew, happy, sleepy, surprised. The runtime
  sequences anticipate → chew → cleared face. `face:null` reveals `mood`
  again. Neither temporary face nor idle changes a saved emotion.
- Facing: right is the authored art; left mirrors around the pose anchor.
  Held prop content is counter-reflected so labels remain readable.
- Carry is upright from every previous pose. Its origin is the upper-back
  grip, not the feet. A runtime must use carry during drag, then restore the
  destination base. The old screen intentionally retains its drag system.

`anchors.ts` provides `islanderAnchors`, `crabAnchors`, `pipAnchors` in source
rig units relative to the pose origin. Optional action/tilt/limbLag/breath/
reduced arguments return the currently drawn contacts. Always pass the
same options as rendering when hit-testing a moving hand or mouth.

Scale: Islander `size/132`, crab `size/120`, Pip `size/160`. Place the SVG at
`sceneAnchor + bounds.left/top * scale`; its viewport is exactly `bounds`.
Do not apply a second mirror to `HomeCharacter`.

Bounds conservatively enclose wardrobe, strokes and secondary limb travel.
They exclude held objects (separate scene entities). The Islander hull
includes top-knot, pigtails, puffs, largest woven hat, headset, long garments
and boots. Resting body bounds can overlap furniture: the runtime must
apply the socket's front occlusion and matching hit mask.

## Life and animation ownership

No rig component starts timers, worklets, audio or effects. `rigIdle(clock,
seed,reduced)` derives 100–160ms blinks at varied 3–6s intervals from a caller
clock. Breathing is a 3.6s cycle with maximum 0.4% scale displacement.
`blink` and `breath` can also be supplied explicitly. Reduced Motion ignores
idle, tilt and limb lag while retaining semantic expressions (sleepy eyes).

`tilt` clamps to ±6 degrees around the pose origin. `limbLag` clamps to 0–1;
carry arms and legs rotate up to 10 degrees opposite the motion. The hand,
held prop and wrist details use the resulting joints. No independent prop
lag is introduced. The crab has loose claw/leg transforms; Pip's tail trails.

For RUNTIME: drive a shared outer SVG G transform with an animated G and
`useAnimatedProps` (SVG transform adapter where required). This supports
whole-body tilt/breath without a React render. Individual Islander limbs
are SVG path `d` values derived from joints, not native joint objects. To
animate those on the UI thread, port the pure path construction into a
worklet and animate both path `d` and hand/prop transforms from the same
joint values. This slice does not claim that is already wired. A bounded
15–24Hz React update of the small rig is a fallback for secondary limbs;
never throttle the runtime's primary dragged position. Blink/face changes
need only discrete renders. Verify native SVG animation on SDK 57 before
choosing the path. Docs checked: Expo SDK 57 SVG/Router and Reanimated 4.x
`useAnimatedProps`.

## Compatibility boundary

`HomeScreen.renderCharacter` takes one `CharacterRenderInput`.
`homeRenderInput` converts old transient reaction names. Explicit
`adaptLegacyCharacterRenderer` supports six-argument embedders. The current
island-home route keeps its original viewport and furniture layout via
`homeCharacterRigPose`; its action geometry and hand targets now preserve
base poses. New runtime code should use `HomeCharacter` and the anchors.

H07's current Islander pose override is repaired. H16's species art/metadata
are supplied; switching all current screen placement and fallback renderers
is RUNTIME/CORE work. H20's clock/motion policy is supplied; removing the old
screen's sleep timer and duplicate sleep marks remains RUNTIME work.

## Acceptance and QA scope

Required web cases: every base × action × face × facing, three diverse looks;
companion equivalents; carry from bed; seated and lying feeding; Reduced
Motion; deterministic idle; anchor containment and mirrored contacts.
`/rig-gallery` provides 720 Islander and 480 companion frames, 3× zoom and a
seven-step controlled storyboard. No gallery control modifies saved data.

Unit tests cover base retention, anchor origins/hulls, contact transforms,
carry lag, idle timing, mood restoration, Reduced Motion and all render
combinations. Gallery evidence and execution results are in the external
`v3/rig/REPORT.md`. Browser coverage does not establish native gesture,
performance, furniture occlusion or family-device acceptance.

Rendered verification used SVG `getBBox()` for every primitive and its full
transform into the root SVG coordinate system: 1,781 exported proof frames
(720 Islander, 480 companion, 560 wardrobe, 21 storyboard). The first sweep
found Pip tail escapes in seated/carry frames; its envelope was corrected.
The final sweep had zero escapes. Strokes are covered by the reasoned hull
padding; the browser sweep measures geometry. The old drop-world contact
adapter now resolves the same action arm as `characterHand`, and uses the
rig mouth's head+20 coordinate instead of the old head+13 approximation.
