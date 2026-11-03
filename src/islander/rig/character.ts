import type { ReactNode } from 'react';
import { resolvePose, solve, type Expression, type Joint, type Point, type Pose } from './poses';

/** Structural match for the CORE scene contract; no runtime/model dependency. */
export type CharacterBase = 'stand' | 'sit' | 'lie' | 'bathe' | 'carry';
export type CharacterAction = 'eat' | 'drink' | 'hold' | null;
export type CharacterFace = 'neutral' | 'anticipate' | 'chew' | 'happy' | 'sleepy' | 'surprised';
export type Facing = 'left' | 'right';
export type CharacterRenderInput = Readonly<{
  slot: 0 | 1 | 2;
  base: CharacterBase;
  action: CharacterAction;
  face: CharacterFace | null;
  facing: Facing;
  size: number;
  held?: ReactNode;
  tilt?: number;
  limbLag?: number;
  reduced?: boolean;
}>;
export type RigLife = Readonly<{
  /** Milliseconds from a caller-owned monotonic clock. Omit for a still frame. */
  clock?: number;
  seed?: number;
  blink?: boolean;
  breath?: number;
  /** Persistent child-chosen expression. Temporary face=null reveals this again. */
  mood?: Expression;
}>;
export const rigBases: readonly CharacterBase[] = ['stand', 'sit', 'lie', 'bathe', 'carry'];
export const rigFaces: readonly CharacterFace[] = ['neutral', 'anticipate', 'chew', 'happy', 'sleepy', 'surprised'];
export const rigActions: readonly CharacterAction[] = [null, 'hold', 'eat', 'drink'];
export const clampRig = (value: number | undefined, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(value) ? value! : 0));
export function rotatePoint(p: Point, origin: Point, degrees: number): Point {
  const a = degrees * Math.PI / 180, x = p[0] - origin[0], y = p[1] - origin[1];
  return [origin[0] + x * Math.cos(a) - y * Math.sin(a), origin[1] + x * Math.sin(a) + y * Math.cos(a)];
}

const baseIds: Record<CharacterBase, string> = { stand: 'idle', sit: 'sit-relaxed', lie: 'lie', bathe: 'bathe', carry: 'carry' };
/** Action alters only one arm; the base ID, pelvis, head and lower body survive. */
export function characterPose(base: CharacterBase, action: CharacterAction = null, limbLag = 0, tilt = 0): Pose {
  const pose = resolvePose('front', baseIds[base]);
  const joints = { ...pose.joints } as Record<Joint, Point>;
  if (base === 'carry') {
    const lag = -clampRig(limbLag, 0, 1) * clampRig(tilt, -6, 6) / 6 * 10;
    for (const side of ['left', 'right'] as const) {
      for (const [root, tips] of [[`${side}Shoulder`, [`${side}Elbow`, `${side}Hand`]], [`${side}Hip`, [`${side}Knee`, `${side}Foot`]]] as [Joint, Joint[]][]) {
        for (const tip of tips) joints[tip] = rotatePoint(joints[tip], joints[root], lag);
      }
    }
  }
  if (action) {
    const target: Point = action === 'hold' ? [61, 88] : action === 'drink' ? [36, 69] : [45, 58];
    [joints.rightElbow, joints.rightHand] = solve(joints.rightShoulder, target, [72, 76], 16);
  }
  return { ...pose, joints };
}

/** An 18s repeating schedule: 3–6s intervals, 100–160ms blinks. No timers. */
export function rigIdle(clock = 0, seed = 0, reduced = false) {
  if (reduced) return { blink: false, breath: 0 };
  const time = Math.max(0, Number.isFinite(clock) ? clock : 0);
  const offset = Math.abs(Math.trunc(Number.isFinite(seed) ? seed : 0)) % 18000;
  const phase = (time + offset) % 18000;
  const blink = [[3100, 120], [7900, 150], [13700, 110], [17800, 140]].some(([at, duration]) => phase >= at && phase < at + duration);
  // Scale displacement is bounded to 0.4% of height (3.6 second period).
  return { blink, breath: (1 - Math.cos(time * Math.PI * 2 / 3600)) / 2 };
}
export function rigFace(face: CharacterFace | null | undefined, mood: Expression = 'neutral', action: CharacterAction = null): Expression {
  return face ?? (action === 'eat' || action === 'drink' ? 'anticipate' : mood);
}
