import { isLying, poseBox, resolvePose } from "../../islander/rig/poses";
import type { Bounds, CharacterBase, Facing } from "./types";

/** Same shape as the RIG slice's islanderAnchors(base, facing), in rig units. */
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
  /** Multiply rig-unit anchors by this value to obtain room units. */
  unit: number;
  supportedSockets: readonly ("sit" | "lie" | "bathe")[];
  poses: Record<CharacterBase, Record<Facing, PoseAnchors>>;
};
function provisionalPoses(width: number, height: number): SpeciesMeta["poses"] {
  const poses = {} as SpeciesMeta["poses"];
  for (const base of ["stand", "sit", "lie", "bathe", "carry"] as const) {
    poses[base] = {} as Record<Facing, PoseAnchors>;
    for (const facing of ["front", "left", "right"] as const) {
      // Provisional; the RIG slice replaces these from src/islander/rig/anchors.ts.
      poses[base][facing] = {
        bounds: { left: -width / 2, top: -height, width, height },
        hand: { x: facing === "left" ? -42 : 42, y: -84 },
        mouth: { x: 0, y: -160 },
        head: { x: 0, y: -height + 32 },
      };
    }
  }
  return poses;
}
/** Provisional friendBounds, hand +42/-84, mouth -160 and 224-unit Islander.
 * The RIG slice replaces these from src/islander/rig/anchors.ts. */
export const species: Record<0 | 1 | 2, SpeciesMeta> = {
  0: {
    slot: 0,
    name: "Islander",
    standingHeight: 224,
    unit: 1,
    supportedSockets: ["sit", "lie", "bathe"],
    poses: provisionalPoses(136, 224),
  },
  1: {
    slot: 1,
    name: "Pip",
    standingHeight: 170,
    unit: 1,
    supportedSockets: ["sit", "lie", "bathe"],
    poses: provisionalPoses(170, 170),
  },
  2: {
    slot: 2,
    name: "Crab",
    standingHeight: 90,
    unit: 1,
    supportedSockets: ["sit", "lie"],
    poses: provisionalPoses(98, 90),
  },
};
// Provisional; the RIG slice replaces these from src/islander/rig/anchors.ts.
// Preserve today's complete Islander pose envelope and joint positions meanwhile.
for (const base of ["stand", "sit", "lie", "bathe", "carry"] as const) {
  const pose = resolvePose(
    "front",
    base === "stand" ? "idle" : base === "sit" ? "sit-front" : base === "carry" ? "hold" : base
  );
  const box = poseBox(pose);
  for (const facing of ["front", "left", "right"] as const) {
    const mirrored = facing === "left";
    const point = (x: number, y: number) => {
      if (isLying(pose)) {
        const old = x;
        x = 6 + y;
        y = 86 - old;
      }
      return {
        x: (mirrored ? box.width - x : x) - (mirrored ? box.width - box.anchor[0] : box.anchor[0]),
        y: y - box.anchor[1],
      };
    };
    species[0].poses[base][facing] = {
      bounds: {
        left: -(mirrored ? box.width - box.anchor[0] : box.anchor[0]),
        top: -box.anchor[1],
        width: box.width,
        height: box.height,
      },
      hand: point(...pose.joints.rightHand),
      mouth: point(pose.joints.head[0], pose.joints.head[1] + 13),
      head: point(...pose.joints.head),
    };
  }
}
species[0].unit = 224 / 132;
for (const poses of Object.values(species[2].poses)) {
  for (const anchors of Object.values(poses)) {
    // Provisional; match today's crab art frame until RIG supplies species silhouettes.
    anchors.bounds = { left: -49, top: (-98 * 96) / 120, width: 98, height: (98 * 110) / 120 };
  }
}

export function anchorsFor(slot: 0 | 1 | 2, base: CharacterBase, facing: Facing): PoseAnchors {
  "worklet";
  const meta = species[slot];
  const anchors = meta.poses[base][facing];
  const unit = meta.unit;
  return {
    bounds: {
      left: anchors.bounds.left * unit,
      top: anchors.bounds.top * unit,
      width: anchors.bounds.width * unit,
      height: anchors.bounds.height * unit,
    },
    hand: { x: anchors.hand.x * unit, y: anchors.hand.y * unit },
    mouth: { x: anchors.mouth.x * unit, y: anchors.mouth.y * unit },
    head: { x: anchors.head.x * unit, y: anchors.head.y * unit },
  };
}
