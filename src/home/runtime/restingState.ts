import type { PointerCapture } from "../scene/controller";
import type { SceneEntity } from "../scene/types";
import { pickupTransform } from "./handFeel";
import { hintWiggle } from "./quietHints";
import { cueMotion, noticesFor, type Cue, type Notice, type Watcher } from "./delight";
import type { DragSlot } from "./useInteraction";

/**
 * HM-13: everything painted at rest reads one shared value that changes only when its
 * contents change (pickup readiness, a press, a new proposal target, a socket front).
 * The per-frame channel below is empty except while art follows a finger before its
 * overlay is ready, or while something wobbles. Idle frames and ordinary drag frames
 * therefore wake none of the resting mappers.
 */
export type RestingRest = { owner: string; hide: boolean; gx: number; gy: number };
export type RestingFlags = {
  key: string;
  /** In slot order: the first slot whose owner is in an entity's ancestry decides. */
  rest: RestingRest[];
  pressed: string[];
  /** Targets of proposals that are still being dragged: landing lifts and cues. */
  dragTargets: string[];
  /** Targets of any live proposal: the friend's anticipating face. */
  targets: string[];
  /** Socket furniture whose front piece the overlay is drawing. */
  fronts: string[];
  /** HD-06: friends at rest who notice food or a friend carried near them, and which way to lean. */
  notice: Notice[];
};
export type RestingFollow = { owner: string; dx: number; dy: number; tilt: number; sx: number; sy: number };
export type RestingMotion = { key: string; follow: RestingFollow[]; wobble: Record<string, number>;
  /** H4 cues: a small rise and vertical squash beside the wobble, about the contact. */
  bob: Record<string, { dy: number; sy: number }> };
export const emptyRestingFlags = (): RestingFlags => {
  "worklet";
  return { key: "", rest: [], pressed: [], dragTargets: [], targets: [], fronts: [], notice: [] };
};
export const emptyRestingMotion = (): RestingMotion => {
  "worklet";
  return { key: "", follow: [], wobble: {}, bob: {} };
};
export function restingFlagsOf(slots: readonly DragSlot[], pointers: readonly PointerCapture[], watchers: readonly Watcher[] = []): RestingFlags {
  "worklet";
  const flags = emptyRestingFlags();
  let key = "";
  for (const s of slots) {
    if (!s.id) continue;
    const subject = s.subject;
    if (watchers.length && subject && s.phase === "dragging" && s.ready && (subject.character || subject.body?.edible)) {
      const b = subject.bounds, visual = subject.visual;
      const point = visual ? { x: s.x + visual.x, y: s.y + visual.y } : { x: s.x + b.left + b.width / 2, y: s.y + b.top + b.height / 2 };
      const seen = noticesFor(point, !subject.character, watchers, [s.id, s.restId ?? s.id]);
      for (const n of seen) { flags.notice.push(n); key += `n${n.id}:${n.dir}:${n.food ? 1 : 0};`; }
    }
    const hide = !s.revealFrame && s.ready && s.painted !== false && (s.phase !== "pending" || s.committed || s.pausedElapsed > 0);
    const owner = s.restId ?? s.id;
    flags.rest.push({ owner, hide, gx: s.gripX, gy: s.gripY });
    key += `r${owner}:${hide ? 1 : 0}:${s.gripX}:${s.gripY};`;
    const target = s.proposal?.target;
    if (target) {
      flags.targets.push(target);
      key += `t${target};`;
      if (s.phase === "dragging") { flags.dragTargets.push(target); key += `d${target};`; }
    }
    const attachment = s.proposal?.attachment ?? s.subject?.attachment;
    if (s.ready && (s.settleAt > 0 || s.pausedElapsed > 0) && attachment?.kind === "socket") {
      flags.fronts.push(attachment.item);
      key += `f${attachment.item};`;
    }
  }
  for (const p of pointers) if (p.phase === "pending" && p.entity) { flags.pressed.push(p.entity); key += `p${p.entity};`; }
  flags.key = key;
  return flags;
}
export function restingMotionOf(
  slots: readonly DragSlot[],
  renderedRevision: string,
  scale: number,
  now: number,
  reduced: boolean,
  nudges: Record<string, number>,
  hint: { id: string; at: number } | null,
  cues: Record<string, Cue> = {}
): RestingMotion {
  "worklet";
  const motion = emptyRestingMotion();
  let key = "";
  for (const slot of slots) {
    if (!slot.id || !slot.subject) continue;
    const moving = !(slot.committed && slot.revision === renderedRevision) && slot.phase !== "pending" && !(slot.ready && slot.painted !== false);
    // A friend carried out of the drawer leaves its resting art where it is until the overlay is up.
    if (!moving || slot.drawer) continue;
    const t = pickupTransform(slot, slot.subject as SceneEntity, scale, now, reduced);
    const follow = { owner: slot.restId ?? slot.id, dx: slot.x - slot.sourceX, dy: slot.y - slot.sourceY - t.lift, tilt: t.tilt, sx: t.scaleX, sy: t.scaleY };
    motion.follow.push(follow);
    key += `${follow.owner}:${follow.dx}:${follow.dy}:${follow.tilt}:${follow.sx}:${follow.sy};`;
  }
  if (!reduced) {
    for (const id in nudges) {
      const elapsed = now - nudges[id];
      if (elapsed < 0 || elapsed >= 220) continue;
      const degrees = Math.sin((elapsed / 220) * Math.PI * 4) * 1.5 * (1 - elapsed / 220);
      motion.wobble[id] = degrees;
      key += `w${id}:${degrees};`;
    }
    if (hint) {
      const degrees = hintWiggle(now - hint.at);
      if (degrees !== 0) { motion.wobble[hint.id] = (motion.wobble[hint.id] ?? 0) + degrees; key += `h${hint.id}:${degrees};`; }
    }
    for (const id in cues) {
      const m = cueMotion(cues[id], now);
      if (!m) continue;
      motion.wobble[id] = (motion.wobble[id] ?? 0) + m.deg;
      if (m.dy !== 0 || m.sy !== 1) motion.bob[id] = { dy: m.dy, sy: m.sy };
      key += `c${id}:${m.deg}:${m.dy}:${m.sy};`;
    }
  }
  motion.key = key;
  return motion;
}
export function firstRest(flags: RestingFlags, owners: readonly string[]): RestingRest | undefined {
  "worklet";
  for (const rest of flags.rest) if (owners.includes(rest.owner)) return rest;
  return undefined;
}
export function firstFollow(motion: RestingMotion, owners: readonly string[]): RestingFollow | undefined {
  "worklet";
  for (const follow of motion.follow) if (owners.includes(follow.owner)) return follow;
  return undefined;
}
export function anyIn(values: readonly string[], within: readonly string[]): boolean {
  "worklet";
  for (const v of values) if (within.includes(v)) return true;
  return false;
}
