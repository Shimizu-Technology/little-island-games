import { islanderAnchors, pipAnchors, crabAnchors, islanderPoint, companionPoint, companionContacts, type RigAnchors } from "../../islander/rig/anchors";
import { characterPose } from "../../islander/rig/character";
import type { Bounds, CharacterAction, CharacterBase, Facing, HitShape } from "./types";
export type PoseAnchors = {
  bounds: Bounds;
  hand: { x: number; y: number };
  mouth: { x: number; y: number };
  head: { x: number; y: number };
  /** Head circle, body and limbs as painted, relative to contact. */
  shapes: HitShape[];
};
export type SpeciesMeta = {
  slot: 0 | 1 | 2;
  name: string;
  standingHeight: number;
  unit: number;
  /** Half of the visible head, in room units. Hair and hats reach this far from the head anchor. */
  headRadius: number;
  supportedSockets: readonly ("sit" | "lie" | "bathe")[];
  poses: Record<CharacterBase, Record<Facing, PoseAnchors>>;
};
const bases = ["stand", "sit", "lie", "bathe", "carry"] as const;
const facings = ["front", "left", "right"] as const;
const makers = [islanderAnchors, pipAnchors, crabAnchors];
const units = [224 / 132, 170 / 160, 98 / 120];
const round = (center: { x: number; y: number }, r: number): HitShape => ({ kind: "ellipse", x: center.x, y: center.y, rx: r, ry: r });
const bar = (a: { x: number; y: number }, b: { x: number; y: number }, r: number): HitShape => ({ kind: "capsule", ax: a.x, ay: a.y, bx: b.x, by: b.y, r });
/** Authored from the rig joints, so a touch beside a leg goes through to whatever is behind it. */
function shapesFor(slot: number, base: CharacterBase, facing: "left" | "right", action: CharacterAction): HitShape[] {
  const unit = units[slot];
  if (slot === 0) {
    const j = characterPose(base, action).joints;
    const p = (point: readonly [number, number]) => { const v = islanderPoint(point, base, facing); return { x: v.x * unit, y: v.y * unit }; };
    const hip: readonly [number, number] = [(j.leftHip[0] + j.rightHip[0]) / 2, (j.leftHip[1] + j.rightHip[1]) / 2];
    return [
      round(p(j.head), 34 * unit), bar(p(j.neck), p(hip), 17 * unit),
      // The ponytail hangs past the head circle on her far side.
      bar(p([j.head[0] + 31, j.head[1] + 8]), p([j.head[0] + 35, j.head[1] + 58]), 9 * unit),
      bar(p(j.leftShoulder), p(j.leftElbow), 7 * unit), bar(p(j.leftElbow), p(j.leftHand), 7 * unit),
      bar(p(j.rightShoulder), p(j.rightElbow), 7 * unit), bar(p(j.rightElbow), p(j.rightHand), 7 * unit),
      bar(p(j.leftHip), p(j.leftKnee), 9 * unit), bar(p(j.leftKnee), p(j.leftFoot), 9 * unit),
      bar(p(j.rightHip), p(j.rightKnee), 9 * unit), bar(p(j.rightKnee), p(j.rightFoot), 9 * unit),
    ];
  }
  const species = slot === 1 ? "pip" : "crab";
  const c = companionContacts(species, base, action);
  const p = (x: number, y: number) => { const v = companionPoint(species, [x, y], base, facing); return { x: v.x * unit, y: v.y * unit }; };
  if (slot === 1)
    return [bar(p(45, 85), p(105, 85), 31 * unit), bar(p(112, 82), p(146, 78), 20 * unit), bar(p(73, 91), p(c.hand[0], c.hand[1]), 8 * unit)];
  return [
    bar(p(40, 73), p(80, 73), 24 * unit), bar(p(45, 55), p(45, 40), 10 * unit), bar(p(75, 55), p(75, 40), 10 * unit),
    bar(p(35, 66), p(21, 47), 13 * unit), bar(p(85, 66), p(c.hand[0], c.hand[1]), 7 * unit), round(p(c.hand[0], c.hand[1] - 8), 13 * unit),
    bar(p(37, 76), p(19, 92), 4 * unit), bar(p(83, 76), p(101, 92), 4 * unit),
  ];
}
function scale(a: RigAnchors, unit: number, shapes: HitShape[]): PoseAnchors {
  const point = (p: { x: number; y: number }) => ({ x: p.x * unit, y: p.y * unit });
  return {
    shapes,
    bounds: {
      left: a.bounds.left * unit,
      top: a.bounds.top * unit,
      width: a.bounds.width * unit,
      height: a.bounds.height * unit,
    },
    hand: point(a.hand),
    mouth: point(a.mouth),
    head: point(a.head),
  };
}
/** Plain immutable room-unit caches. No RIG function runs in a worklet. */
const cache = makers.map((make, slot) =>
  Object.fromEntries(
    bases.map((base) => [
      base,
      Object.fromEntries(
        facings.map((facing) => [
          facing,
          Object.fromEntries(
            ([null, "hold", "eat", "drink"] as const).map((action) => [
              action ?? "none",
              scale(make(base, facing === "left" ? "left" : "right", { action }), units[slot],
                shapesFor(slot, base, facing === "left" ? "left" : "right", action)),
            ])
          ),
        ])
      ),
    ])
  )
);
export const species: Record<0 | 1 | 2, SpeciesMeta> = Object.fromEntries(
  makers.map((_, slot) => [
    slot,
    {
      slot,
      name: ["Islander", "Pip", "Crab"][slot],
      standingHeight: [224, 170, 98][slot],
      unit: units[slot],
      headRadius: [34, 30, 28][slot] * units[slot],
      supportedSockets: slot === 2 ? ["sit", "lie"] : ["sit", "lie", "bathe"],
      poses: Object.fromEntries(
        bases.map((base) => [
          base,
          Object.fromEntries(facings.map((facing) => [facing, cache[slot][base][facing].none])),
        ])
      ),
    },
  ])
) as unknown as Record<0 | 1 | 2, SpeciesMeta>;
export function anchorsFor(
  slot: 0 | 1 | 2,
  base: CharacterBase,
  facing: Facing,
  action: CharacterAction = null
): PoseAnchors {
  "worklet";
  return cache[slot][base][facing][action ?? "none"];
}
