# Islander art foundation

The shared renderer lives in `src/islander`. It is an original, static SVG paper doll for later learning, home, Locker and Lagoon Run integration. No existing game renderer or save schema is changed. The temporary `littleisland:///islander-gallery` route is deliberately absent from normal navigation; remove it before release.

```tsx
import { Islander, IslanderDesk, defaultLook } from '../islander';
<Islander view="front" pose="wave" look={defaultLook} size={120} />
<Islander view="back" pose={12} look={defaultLook} size={120} />
```

Omitting `pose` chooses front idle or rear frame 0.

`size` is the SVG height in logical pixels; width is `size * 80 / 132`. Every frame shares the `0 0 80 132` viewBox. The standing character is about 2.8 heads tall (46-unit head diameter). Each limb uses one continuous tapered contour through its joints, with no elbow/knee discs; upper/lower arms are 16 units and thighs/shins are 18 units. Front poses use forward kinematics; rear poses solve the same bone lengths against authored Run contact targets. Compact roll poses project the torso forward and retain fixed limb lengths. Rear crowns stop above the nape and expose both ears and the neck. Long rear styles hang from the crown or over the shoulders; the ponytail swings with the run cycle. Planted running feet stay under their hips; lifted shoes fold outward on their own side to keep fixed-length knees from crossing the midline. Light sole faces, opposite arm swing, hidden forward hands and the existing contact bob distinguish the running phases. Arms and legs use broader, gently tapered contours in both views. Shoes contact y=128; SVG silhouette is not a collision hull.

The `IslanderLook` module is platform-independent. It exports stable enumerated choices, strict `isValidLook` and field-wise `normalizeLook`. Normalization creates a fresh safe look; storage/recovery code must preserve the original before normalizing imported data. There is no persistence/versioned save namespace in this phase.

`wardrobe` declares each item's slot, front/back support, layers, anchors and occlusion. `anchorsFor` resolves head top, face, neck, torso, hips, feet, hand and individual joints for a pose. Item silhouettes attach to those same joints; sleeves and shorts bend with the limbs. The skirt covers both upper legs. The compact head paints above the folded torso so the shirt cannot hide it. Rear views omit the face and front-only outfit details. Backpacks appear behind the front-facing body and over the rear-facing torso. During a roll, the pack shifts onto the folded torso and paints below the head; its handle remains attached to the smaller bag.

Hair lives in `rig/hairArt.ts`. Each style has its own hairline and silhouette in head-local units (head x ±28, y ±28; art stays within x ±39, and only the bun and top tufts reach above y −38). A style is a few compound paths per tone, so detail costs no extra SVG nodes. Shadow, under, shine and outline tones are derived from the hair colour by `hairTones`; dark hair gets a cool sheen so it keeps its form. Hair sits in real layers: rear hair behind the body, front hair in front of the shoulders, and a separate back drawing. Tails, braids and long lengths swing only while running, about their own root. Under a covering hat, `hairFor` packs the crown below the brim and drops the bun; styles that need it have their own hat shapes. Roll frames bake a 12/28 scale into the paths.

Garments are one table in `rig/Clothes.tsx` (`garmentFor`), so limbs and torso always agree. `buildShape` sets visibly different boy, neutral and girl shoulders, waist, hips and limbs. Skirts follow the knees when seated and sway when running. The Locker and Creator sort hair, outfits, bottoms and hats with `audienceFor` into Girls, Boys and Everyone. These are labels only: nothing is hidden or locked by them, the child's own section comes first, and "Me" leads with Everyone.

Paint groups: rear accessory, rear hair, rear limbs, body/head, clothing, front limbs, hands, front hair, face, hat, foreground accessory. Both legs paint beneath the skirt. Hair crowns flatten beneath caps and sun hats; long tails/braids and curl volume tuck into a compact roll silhouette. Hats have shallow roll variants to preserve clearance. Flower crowns intentionally retain exposed curls.

Front pose IDs: `idle`, `idle-breathe`, `wave`, `cheer`, `clap`, `think`, `try-again`, `desk-write`, `sit-relaxed`, `dance-0` through `dance-3`. The writing desk is a separate foreground SVG; overlay `IslanderDesk` in the same box for `desk-write`. The gallery demonstrates the composition. Expressions are happy, focused, thinking, surprised and proud.

Rear indices match `RunnerFrameArt` and `runnerFrame`: 0–7 run keys; 8 takeoff; 9 apex; 10 landing; 11 roll entry; 12 tucked roll; 13 recovery; 14 stumble; 15 celebrate; 16–23 run in-betweens. `runCycleFrames` provides chronological order `[0,16,1,17,...,7,23]`. No game frame selector, duck timing, collision geometry or score changes belong in this phase. The new art has its own wardrobe-aware duck-clearance regression using the existing Run safety state and beam geometry. Game integration must still recheck actual sprite scale/depth order, timing, interpolation and physical device performance.

`Islander` is memoized and has no timers, animation hooks or worklets. Pre-render the small frame set and swap visibility using the existing sprite pattern. Do not update pose joints on every animation frame. Reduce Motion callers should use `idle` and suppress decorative dance/breathe frame changes; all gallery frames remain still. Do not mount the entire gallery in gameplay.

The gallery's four sheets cover poses × four looks, every hat × hairstyle (front idle/wave, back running/tucked), every outfit × all poses, and all skin/hair colors. Its selectors reset sheet scroll without saving anything. Native contact sheets paginate 12 characters at a time to keep mounting and accessibility traversal bounded; web retains full sheets for capture. Full gallery art inspection is development QA, not Stassie's acceptance or public distribution approval.
