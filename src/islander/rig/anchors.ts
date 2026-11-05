import { characterPose, clampRig, rotatePoint, type CharacterAction, type CharacterBase, type Facing } from './character';
import { isLying, poseBox, type Point } from './poses';
export type RigPoint = Readonly<{ x: number; y: number }>;
export type RigAnchors = Readonly<{
  bounds: Readonly<{ left: number; top: number; width: number; height: number }>;
  hand: RigPoint;
  mouth: RigPoint;
  head: RigPoint;
}>;
export type AnchorOptions = Readonly<{ action?: CharacterAction; tilt?: number; limbLag?: number; breath?: number; reduced?: boolean }>;
const xy = (p: Point): RigPoint => ({ x: p[0], y: p[1] });
export const islanderOrigin = (base: CharacterBase) => poseBox(characterPose(base)).anchor;
/** Same transform stack as IslanderShape, then anchor-relative life and facing. */
export function islanderPoint(point: Point, base: CharacterBase, facing: Facing = 'right', options: AnchorOptions = {}): RigPoint {
  const origin = islanderOrigin(base);
  const p: Point = isLying(characterPose(base)) ? [point[1] + 6, 86 - point[0]] : point;
  return rigPoint([p[0] - origin[0], p[1] - origin[1]], facing, options);
}
export function rigPoint(point: Point, facing: Facing, options: AnchorOptions = {}): RigPoint {
  const breath = options.reduced ? 0 : clampRig(options.breath, 0, 1) * .004;
  const p = rotatePoint([point[0] * (facing === 'left' ? -1 : 1), point[1] * (1 + breath)], [0, 0], options.reduced ? 0 : clampRig(options.tilt, -6, 6));
  return xy(p);
}
export function rigTransform(facing: Facing, options: AnchorOptions = {}) {
  return `rotate(${options.reduced ? 0 : clampRig(options.tilt, -6, 6)}) scale(${facing === 'left' ? -1 : 1} 1) scale(1 ${1 + (options.reduced ? 0 : clampRig(options.breath, 0, 1) * .004)})`;
}
function bounds(points: RigPoint[]) {
  const left = Math.min(...points.map(p => p.x)), top = Math.min(...points.map(p => p.y));
  return { left, top, width: Math.max(...points.map(p => p.x)) - left, height: Math.max(...points.map(p => p.y)) - top };
}
/** Wardrobe control hull: x −2..82, y −4..136. Includes pigtails/puffs,
 * top-knot, 1.13× woven brim, headset, skirt/coat hems, boots and stroke.
 * Carry adds 7 units for the authored ≤10° loose-limb sweep. Held objects
 * have separate bounds in CORE; arbitrary ReactNode props are not wardrobe. */
export function islanderAnchors(base: CharacterBase, facing: Facing = 'right', options: AnchorOptions = {}): RigAnchors {
  const pose = characterPose(base, options.action, options.reduced ? 0 : options.limbLag, (options.tilt ?? 0) * (facing === 'left' ? -1 : 1));
  const pad = base === 'carry' ? 7 : 0;
  const corners: Point[] = [[-2-pad, -4], [82+pad, -4], [-2-pad, 136+pad], [82+pad, 136+pad]];
  return {
    bounds: bounds(corners.map(p => islanderPoint(p, base, facing, options))),
    hand: islanderPoint(pose.joints.rightHand, base, facing, options),
    mouth: islanderPoint([40, 58], base, facing, options),
    head: islanderPoint(pose.joints.head, base, facing, options),
  };
}
/** Measured art reaches 5.3 units past the layout box, stroke included. tests/islander-surface.test.tsx holds this. */
const SURFACE_PAD = 6;
/** The drawing surface includes the whole wardrobe; native SVG crops at its own box. Negative margins keep the layout box, scale and every anchor where they were. */
export function islanderSurface(box: Readonly<{ left?: number; top?: number; width: number; height: number }>, scale: number) {
  return {
    width: (box.width + SURFACE_PAD * 2) * scale,
    height: (box.height + SURFACE_PAD * 2) * scale,
    viewBox: `${(box.left ?? 0) - SURFACE_PAD} ${(box.top ?? 0) - SURFACE_PAD} ${box.width + SURFACE_PAD * 2} ${box.height + SURFACE_PAD * 2}`,
    style: { margin: -SURFACE_PAD * scale },
  };
}

export const crabOrigin = (base: CharacterBase): Point => base === 'carry' ? [60, 54] : base === 'lie' ? [60, 72] : base === 'bathe' ? [60, 73] : base === 'sit' ? [60, 96] : [60, 100];
export const pipOrigin = (base: CharacterBase): Point => base === 'carry' ? [75, 57] : base === 'lie' ? [42, 85] : base === 'sit' || base === 'bathe' ? [75, 111] : [75, 117];
/** Pose-local companion contacts shared with the art, in source SVG units. */
export function companionContacts(species: 'crab' | 'pip', base: CharacterBase, action: CharacterAction = null) {
  if (species === 'crab') {
    const hand: Point = action === 'eat' ? [64, 73] : action === 'drink' ? [56, 84] : base === 'carry' ? [100, 70] : [97, 53];
    return { hand, mouth: [60, 73] as Point, head: [60, 42] as Point };
  }
  const hand: Point = action === 'eat' ? [38, 94] : action === 'drink' ? [30, 105] : [65, 103];
  return { hand, mouth: [34, 94] as Point, head: [48, 78] as Point };
}
export function companionPoint(species: 'crab' | 'pip', p: Point, base: CharacterBase, facing: Facing, options: AnchorOptions = {}) {
  const origin = species === 'crab' ? crabOrigin(base) : pipOrigin(base);
  // Pip's resting curl is a gentle whole-body rotation; crab rests upright.
  const posed = species === 'pip' && base === 'lie' ? rotatePoint(p, origin, -18) : p;
  return rigPoint([posed[0] - origin[0], posed[1] - origin[1]], facing, options);
}
function companionAnchors(species: 'crab' | 'pip', base: CharacterBase, facing: Facing, options: AnchorOptions): RigAnchors {
  const c = companionContacts(species, base, options.action);
  const hull: Point[] = species === 'crab' ? [[-4, 26], [124, 26], [-4, 112], [124, 112]] : [[20, 41], [base === 'carry' ? 166 : 158, 41], [20, 130], [base === 'carry' ? 166 : 158, 130]];
  return { bounds: bounds(hull.map(p => companionPoint(species, p, base, facing, options))), hand: companionPoint(species, c.hand, base, facing, options), mouth: companionPoint(species, c.mouth, base, facing, options), head: companionPoint(species, c.head, base, facing, options) };
}
export const crabAnchors = (base: CharacterBase, facing: Facing = 'right', options: AnchorOptions = {}) => companionAnchors('crab', base, facing, options);
export const pipAnchors = (base: CharacterBase, facing: Facing = 'right', options: AnchorOptions = {}) => companionAnchors('pip', base, facing, options);
/** Pip floats on the floor plane and supports bowls/baths, seats and beds.
 * Runtime may call its stand pose "float"; the shared CORE base stays stand. */
export const pipSupportedSockets = ['sit', 'lie', 'bathe'] as const;
