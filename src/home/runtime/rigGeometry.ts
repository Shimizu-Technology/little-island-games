import { islanderAnchors, pipAnchors, crabAnchors, islanderPoint } from "../../islander/rig/anchors";
import { characterPose } from "../../islander/rig/character";
import { anchorsFor, species } from "../scene/species";
import type { SceneEntity } from "../scene/types";
export type Marker = "head" | "hand" | "mouth" | "hip" | "leftFoot" | "rightFoot";
export function renderAnchors(entity: SceneEntity, carry = false, tilt = 0, limbLag = 0) {
  const slot = entity.character!.slot,
    base = carry ? "carry" : entity.base;
  const action = carry ? (entity.children.length ? "hold" : null) : entity.action;
  if (!tilt && !limbLag) return anchorsFor(slot, base, entity.facing, action);
  const a = [islanderAnchors, pipAnchors, crabAnchors][slot](base, entity.facing === "left" ? "left" : "right", {
    action,
    tilt,
    limbLag,
  });
  const unit = species[slot].unit,
    point = (p: { x: number; y: number }) => ({ x: p.x * unit, y: p.y * unit });
  return {
    bounds: {
      left: a.bounds.left * unit,
      top: a.bounds.top * unit,
      width: a.bounds.width * unit,
      height: a.bounds.height * unit,
    },
    head: point(a.head),
    hand: point(a.hand),
    mouth: point(a.mouth),
  };
}
function markers(entity: SceneEntity, carry = false): Record<Marker, { x: number; y: number }> {
  const a = renderAnchors(entity, carry),
    b = a.bounds;
  if (entity.character!.slot === 0) {
    const base = carry ? "carry" : entity.base,
      pose = characterPose(base, carry ? (entity.children.length ? "hold" : null) : entity.action),
      unit = species[0].unit;
    const point = (p: readonly [number, number]) => {
      const v = islanderPoint(p, base, entity.facing === "left" ? "left" : "right");
      return { x: v.x * unit, y: v.y * unit };
    };
    return {
      ...a,
      hip: point(pose.joints.leftHip),
      leftFoot: point(pose.joints.leftFoot),
      rightFoot: point(pose.joints.rightFoot),
    };
  }
  return {
    ...a,
    hip: { x: b.left + b.width / 2, y: b.top + b.height * 0.65 },
    leftFoot: { x: b.left + b.width * 0.3, y: b.top + b.height },
    rightFoot: { x: b.left + b.width * 0.7, y: b.top + b.height },
  };
}
/** Retain the nearest anatomical feature across the upright pickup pose change. */
export function carryBinding(entity: SceneEntity, grip: { x: number; y: number }, marker?: Marker) {
  const from = markers(entity),
    to = markers(entity, true);
  const key =
    marker ??
    (Object.keys(from).filter((k) => k !== "bounds") as Marker[]).sort(
      (a, b) => Math.hypot(grip.x - from[a].x, grip.y - from[a].y) - Math.hypot(grip.x - from[b].x, grip.y - from[b].y)
    )[0];
  return { marker: key, x: from[key].x - to[key].x, y: from[key].y - to[key].y };
}
export function carrySample(sample: number) {
  return { tilt: sample === 0 ? 0 : sample < 0 ? 6 : -6, limbLag: Math.abs(sample) / 4 };
}
