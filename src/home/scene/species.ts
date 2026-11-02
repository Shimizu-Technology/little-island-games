import { islanderAnchors, pipAnchors, crabAnchors, type RigAnchors } from "../../islander/rig/anchors";
import type { Bounds, CharacterAction, CharacterBase, Facing } from "./types";
export type PoseAnchors = {
  bounds: Bounds;
  hand: { x: number; y: number };
  mouth: { x: number; y: number };
  head: { x: number; y: number };
};
export type SpeciesMeta = {
  slot: 0 | 1 | 2;
  name: string;
  standingHeight: number;
  unit: number;
  supportedSockets: readonly ("sit" | "lie" | "bathe")[];
  poses: Record<CharacterBase, Record<Facing, PoseAnchors>>;
};
const bases = ["stand", "sit", "lie", "bathe", "carry"] as const;
const facings = ["front", "left", "right"] as const;
const makers = [islanderAnchors, pipAnchors, crabAnchors];
const units = [224 / 132, 170 / 160, 98 / 120];
function scale(a: RigAnchors, unit: number): PoseAnchors {
  const point = (p: { x: number; y: number }) => ({ x: p.x * unit, y: p.y * unit });
  return {
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
              scale(make(base, facing === "left" ? "left" : "right", { action }), units[slot]),
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
