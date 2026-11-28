export type PhysicsMode = "seesaw" | "ramp";
export type WeightObjectId = "coconut" | "pineapple" | "turtle" | "latte";
export type RampHeightId = "low" | "medium" | "high";
export type RampSurfaceId = "ice" | "wood" | "sand";
export type RampRacerId = "car" | "coconut";

export interface WeightObjectMeta {
  id: WeightObjectId;
  label: string;
  weight: number;
  color: string;
}

export const WEIGHT_OBJECTS: readonly WeightObjectMeta[] = [
  { id: "coconut", label: "Coconut", weight: 1, color: "#7D5236" },
  { id: "pineapple", label: "Pineapple", weight: 2, color: "#E09B2D" },
  { id: "turtle", label: "Sea Turtle", weight: 3, color: "#4D8A65" },
  { id: "latte", label: "Latte Stone", weight: 4, color: "#8C8378" },
];

export const WEIGHT_BY_ID: Readonly<Record<WeightObjectId, WeightObjectMeta>> = {
  coconut: WEIGHT_OBJECTS[0],
  pineapple: WEIGHT_OBJECTS[1],
  turtle: WEIGHT_OBJECTS[2],
  latte: WEIGHT_OBJECTS[3],
};

export interface RampSurfaceMeta {
  id: RampSurfaceId;
  label: string;
  friction: number;
  trackColor: string;
  accentColor: string;
  explain: string;
}

export const RAMP_SURFACES: readonly RampSurfaceMeta[] = [
  {
    id: "ice",
    label: "Slippery Ice",
    friction: 0.08,
    trackColor: "#CBEAF5",
    accentColor: "#2C7E9E",
    explain: "Smooth ice has tiny friction, so the racer glides super far!",
  },
  {
    id: "wood",
    label: "Smooth Wood",
    friction: 0.24,
    trackColor: "#E6C79C",
    accentColor: "#94652E",
    explain: "Smooth wood has gentle friction for a steady, medium roll!",
  },
  {
    id: "sand",
    label: "Beach Sand",
    friction: 0.62,
    trackColor: "#F2DCA6",
    accentColor: "#B3802E",
    explain: "Soft beach sand pushes back with high friction, slowing the racer fast!",
  },
];

export const RAMP_HEIGHTS: readonly { id: RampHeightId; label: string; heightMeters: number; rampTopY: number }[] = [
  { id: "low", label: "Low Ramp", heightMeters: 1.0, rampTopY: 96 },
  { id: "medium", label: "Medium Ramp", heightMeters: 2.0, rampTopY: 66 },
  { id: "high", label: "High Ramp", heightMeters: 3.2, rampTopY: 36 },
];

export interface SeesawSlot {
  side: "left" | "right";
  distance: 1 | 2 | 3 | 4;
  objectId: WeightObjectId;
}

export interface RampRunResult {
  height: RampHeightId;
  surface: RampSurfaceId;
  racer: RampRacerId;
  distanceMeters: number;
  speedRating: string;
  normalizedRoll: number; // 0..1 along flat track
  discovery: string;
}

export interface RampBalanceState {
  mode: PhysicsMode;
  selectedObject: WeightObjectId;
  slots: SeesawSlot[];
  rampHeight: RampHeightId;
  rampSurface: RampSurfaceId;
  racer: RampRacerId;
  lastRun: RampRunResult | null;
  runHistory: RampRunResult[];
  runCount: number;
  challengeIndex: number;
}

export function createRampBalanceState(): RampBalanceState {
  return {
    mode: "seesaw",
    selectedObject: "coconut",
    slots: [
      { side: "left", distance: 2, objectId: "pineapple" },
    ],
    rampHeight: "medium",
    rampSurface: "wood",
    racer: "car",
    lastRun: null,
    runHistory: [],
    runCount: 0,
    challengeIndex: 0,
  };
}

export interface SeesawPhysics {
  leftTorque: number;
  rightTorque: number;
  netTorque: number;
  tiltDegrees: number;
  isBalanced: boolean;
  hasWeights: boolean;
  discovery: string;
}

export function computeSeesawPhysics(slots: readonly SeesawSlot[]): SeesawPhysics {
  let leftTorque = 0;
  let rightTorque = 0;
  for (const slot of slots) {
    const torque = WEIGHT_BY_ID[slot.objectId].weight * slot.distance;
    if (slot.side === "left") leftTorque += torque;
    else rightTorque += torque;
  }
  const hasWeights = slots.length > 0;
  const netTorque = rightTorque - leftTorque;
  const tiltDegrees = Math.max(-18, Math.min(18, netTorque * 2.2));
  const isBalanced = hasWeights && leftTorque > 0 && rightTorque > 0 && leftTorque === rightTorque;

  let discovery: string;
  if (!hasWeights) {
    discovery = "Pick an island treasure below and tap a numbered notch on the seesaw!";
  } else if (isBalanced) {
    discovery = `Perfect Balance! Both sides pull with a torque of ${leftTorque} (weight × distance)!`;
  } else if (leftTorque > rightTorque) {
    discovery = `Left side pulls harder (${leftTorque} vs ${rightTorque}). Try adding weight on the right or moving farther from the center!`;
  } else {
    discovery = `Right side pulls harder (${rightTorque} vs ${leftTorque}). Try balancing it from the left side!`;
  }

  return { leftTorque, rightTorque, netTorque, tiltDegrees, isBalanced, hasWeights, discovery };
}

export function computeRampRun(height: RampHeightId, surface: RampSurfaceId, racer: RampRacerId): RampRunResult {
  const h = RAMP_HEIGHTS.find((entry) => entry.id === height) ?? RAMP_HEIGHTS[1];
  const s = RAMP_SURFACES.find((entry) => entry.id === surface) ?? RAMP_SURFACES[1];
  const racerFactor = racer === "car" ? 1.08 : 0.94;
  // Energy-conservation glide model: distance ~ height / friction_effective
  const rawMeters = ((h.heightMeters * 2.15) / (s.friction + 0.14)) * racerFactor;
  const distanceMeters = Math.round(rawMeters * 10) / 10;
  const maxReferenceMeters = ((3.2 * 2.15) / (0.08 + 0.14)) * 1.08;
  const normalizedRoll = Math.max(0.12, Math.min(1, distanceMeters / maxReferenceMeters));
  const speedRating =
    distanceMeters >= 18 ? "Super Fast Glide!" : distanceMeters >= 9 ? "Smooth Cruise" : "Slow & Bumpy";
  const racerLabel = racer === "car" ? "Toy Car" : "Rolling Coconut";
  const discovery = `${racerLabel} rolled ${distanceMeters} m on ${s.label} from a ${h.label}! ${s.explain}`;
  return { height, surface, racer, distanceMeters, speedRating, normalizedRoll, discovery };
}

export interface PhysicsChallenge {
  id: string;
  mode: PhysicsMode;
  prompt: string;
  hint: string;
  check: (state: RampBalanceState) => boolean;
}

export const PHYSICS_CHALLENGES: readonly PhysicsChallenge[] = [
  {
    id: "perfect-balance",
    mode: "seesaw",
    prompt: "Achieve Perfect Balance on the seesaw!",
    hint: "Make Left (weight × notch) equal Right (weight × notch)!",
    check: (state) => computeSeesawPhysics(state.slots).isBalanced,
  },
  {
    id: "clever-lever",
    mode: "seesaw",
    prompt: "Balance a heavy Latte Stone (4) using lighter pieces farther out!",
    hint: "Place a Latte Stone on notch 1, and a Coconut (1) on notch 4 — or a Pineapple (2) on notch 2!",
    check: (state) => {
      const physics = computeSeesawPhysics(state.slots);
      const hasLatte = state.slots.some((slot) => slot.objectId === "latte");
      const hasLighter = state.slots.some((slot) => slot.objectId !== "latte");
      return physics.isBalanced && hasLatte && hasLighter;
    },
  },
  {
    id: "ice-vs-sand",
    mode: "ramp",
    prompt: "Switch to Friction Ramp Race and test both Slippery Ice and Beach Sand!",
    hint: "Roll once on Slippery Ice, then switch to Beach Sand and tap Roll! again.",
    check: (state) =>
      state.runHistory.some((r) => r.surface === "ice") && state.runHistory.some((r) => r.surface === "sand"),
  },
];

export type RampBalanceAction =
  | { type: "set-mode"; mode: PhysicsMode }
  | { type: "select-object"; objectId: WeightObjectId }
  | { type: "toggle-slot"; side: "left" | "right"; distance: 1 | 2 | 3 | 4 }
  | { type: "clear-seesaw" }
  | { type: "set-height"; height: RampHeightId }
  | { type: "set-surface"; surface: RampSurfaceId }
  | { type: "set-racer"; racer: RampRacerId }
  | { type: "roll" }
  | { type: "next-challenge" }
  | { type: "reset" };

export function reduceRampBalance(state: RampBalanceState, action: RampBalanceAction): RampBalanceState {
  switch (action.type) {
    case "set-mode":
      return { ...state, mode: action.mode };
    case "select-object":
      return { ...state, selectedObject: action.objectId };
    case "toggle-slot": {
      const existing = state.slots.find((s) => s.side === action.side && s.distance === action.distance);
      if (existing) {
        return {
          ...state,
          slots: state.slots.filter((s) => !(s.side === action.side && s.distance === action.distance)),
        };
      }
      return {
        ...state,
        slots: [...state.slots, { side: action.side, distance: action.distance, objectId: state.selectedObject }],
      };
    }
    case "clear-seesaw":
      return { ...state, slots: [] };
    case "set-height":
      return { ...state, rampHeight: action.height };
    case "set-surface":
      return { ...state, rampSurface: action.surface };
    case "set-racer":
      return { ...state, racer: action.racer };
    case "roll": {
      const result = computeRampRun(state.rampHeight, state.rampSurface, state.racer);
      return {
        ...state,
        lastRun: result,
        runHistory: [result, ...state.runHistory].slice(0, 3),
        runCount: state.runCount + 1,
      };
    }
    case "next-challenge":
      return { ...state, challengeIndex: (state.challengeIndex + 1) % PHYSICS_CHALLENGES.length };
    case "reset":
      return createRampBalanceState();
  }
}
