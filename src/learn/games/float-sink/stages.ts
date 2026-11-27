import type { CreateContext, LearnOptions, Outcome } from "../../types";
import { pickItems } from "../../skills";
import { exact, integer, prediction } from "../../kit/science";
import type { Shape } from "./engine";

/**
 * Float or Sink Dock native Levels 4 & 5: interactive buoyancy, material, shape, and cargo-load
 * experiments played right inside the live water tank.
 * Pure engine with strict validation and opt-in Help that never leaks the answer.
 */
export const FLOAT_LAB_ROUND = 5;
export const FLOAT_LAB_VERSUS_ROUND = 6;
export const floatLabRoundSize = (o: Pick<LearnOptions, "mode">): number =>
  o.mode === "versus" ? FLOAT_LAB_VERSUS_ROUND : FLOAT_LAB_ROUND;
export type FloatLabLevel = 4 | 5;

export type FloatExperimentKind = "compare" | "cargo" | "fair-test";

export type FloatExperiment = {
  id: string;
  level: FloatLabLevel;
  kind: FloatExperimentKind;
  skill: string;
  title: string;
  question: string;
  /** Visual object IDs shown in the tank (2 items for compare, 1 focus object for fair-test). */
  objects: readonly string[];
  /** Selectable options for 'compare' (2 items) or 'fair-test' (3 items). Empty for 'cargo'. */
  options: readonly string[];
  /** Index of the right option (for compare / fair-test), or 0 for cargo. */
  correctIndex: number;
  /** For 'cargo' trials: exact safe pebble load to deliver across the lagoon. */
  targetCargo?: number;
  /** For 'cargo' trials: hull capacities available in this trial. */
  hullCapacities?: Readonly<Record<Shape, number>>;
  /** Opt-in variable clue (never names the winning option). */
  hint: string;
  /** Scientific takeaway shown after testing. */
  why: string;
};

export const FLOAT_EXPERIMENTS: readonly FloatExperiment[] = [
  // ---- Level 4: Material, trapped air, shape pairs & cargo capacity (12 experiments) ----
  {
    id: "fl4-cmp-clay",
    level: 4,
    kind: "compare",
    skill: "sci.shape-buoyancy",
    title: "Same clay, two shapes",
    question: "Both pieces use the exact same lump of clay. Which shape floats in the tank?",
    objects: ["clay", "clay-boat"],
    options: ["Solid clay ball", "Hollow clay bowl"],
    correctIndex: 1,
    hint: "Compare how much air each shape can hold inside while pushing water aside.",
    why: "A hollow bowl holds air and pushes more water aside, so the same clay floats instead of sinking.",
  },
  {
    id: "fl4-cmp-bottle",
    level: 4,
    kind: "compare",
    skill: "sci.cause-effect",
    title: "Sealed air vs water",
    question: "Both bottles are the same plastic size. Which bottle floats higher?",
    objects: ["empty-bottle", "full-bottle"],
    options: ["Sealed empty bottle", "Water-filled bottle"],
    correctIndex: 0,
    hint: "Compare what fills the inside of each bottle: light air or heavy water.",
    why: "Air is much lighter than water for the same size, so the sealed air-filled bottle floats.",
  },
  {
    id: "fl4-cmp-wood-metal",
    level: 4,
    kind: "compare",
    skill: "sci.float-sink",
    title: "Big wood vs tiny metal",
    question: "A log is huge and a coin is tiny. Which one floats in the lagoon?",
    objects: ["log", "coin"],
    options: ["Big wooden log", "Tiny metal coin"],
    correctIndex: 0,
    hint: "Think about the material itself, not just which object is bigger!",
    why: "Floating depends on how heavy a material is for its size, not total size. Wood is lighter than water; metal is heavier.",
  },
  {
    id: "fl4-cmp-cork-sponge",
    level: 4,
    kind: "compare",
    skill: "sci.cause-effect",
    title: "Trapped air vs soaked pores",
    question: "Both have tiny holes inside, but the sponge is soaked with water. Which floats?",
    objects: ["cork", "sponge"],
    options: ["Dry cork stopper", "Water-soaked sponge"],
    correctIndex: 0,
    hint: "Check which object still has air inside its tiny pockets instead of water.",
    why: "Cork keeps air sealed in tiny pockets, while water filling a sponge's holes makes it sink.",
  },
  {
    id: "fl4-cmp-coconut-rock",
    level: 4,
    kind: "compare",
    skill: "sci.float-sink",
    title: "Island seed vs reef rock",
    question: "Both are about the same size on the beach. Which one can drift across the ocean?",
    objects: ["coconut", "rock"],
    options: ["Whole coconut with fibrous husk", "Solid reef rock"],
    correctIndex: 0,
    hint: "Look inside: one has a fibrous air-filled husk and hollow center; the other is solid stone.",
    why: "Coconuts trap air in their fibrous husks and hollow shell, letting them drift to new islands.",
  },
  {
    id: "fl4-cmp-boat-spoon",
    level: 4,
    kind: "compare",
    skill: "sci.shape-buoyancy",
    title: "Hollow hull vs flat metal",
    question: "Which object keeps water out so it stays at the surface?",
    objects: ["toy-boat", "spoon"],
    options: ["Hollow toy boat", "Metal spoon"],
    correctIndex: 0,
    hint: "Check which shape has tall sides that hold a pocket of air above the waterline.",
    why: "The hollow hull traps air and stays upright, while a flat metal spoon lets water spill over and sinks.",
  },
  {
    id: "fl4-cargo-4",
    level: 4,
    kind: "cargo",
    skill: "sci.shape-buoyancy",
    title: "Lagoon pebble ferry",
    question: "Pick a hull and safely load 4 pebbles across the tank without sinking!",
    objects: ["wide"],
    options: [],
    correctIndex: 0,
    targetCargo: 4,
    hullCapacities: { ball: 0, bowl: 3, foil: 5, wide: 6 },
    hint: "A wider hull pushes away more water — test which boat stays afloat at 4 pebbles!",
    why: "Wider hollow hulls displace more water, supporting heavier pebble loads before water spills in.",
  },
  {
    id: "fl4-cargo-5",
    level: 4,
    kind: "cargo",
    skill: "sci.shape-buoyancy",
    title: "Five-pebble cargo test",
    question: "Choose a boat that can carry 5 pebbles without sinking, then load all 5!",
    objects: ["foil"],
    options: [],
    correctIndex: 0,
    targetCargo: 5,
    hullCapacities: { ball: 0, bowl: 3, foil: 5, wide: 6 },
    hint: "The small clay bowl only holds 3 pebbles — try a boat with wider sides.",
    why: "Both the foil boat and wide boat hold 5 pebbles because their larger hollow volume traps more air.",
  },
  {
    id: "fl4-cargo-6",
    level: 4,
    kind: "cargo",
    skill: "sci.shape-buoyancy",
    title: "Heavy reef barge",
    question: "Deliver 6 pebbles safely! Pick the strongest hull and load all 6 pebbles.",
    objects: ["wide"],
    options: [],
    correctIndex: 0,
    targetCargo: 6,
    hullCapacities: { ball: 0, bowl: 3, foil: 4, wide: 6 },
    hint: "Only the widest flat-bottomed barge displaces enough water to carry 6 pebbles!",
    why: "A wide barge displaces the most water, letting it carry 6 pebbles before its rim dips under.",
  },
  {
    id: "fl4-ft-clay",
    level: 4,
    kind: "fair-test",
    skill: "sci.shape-buoyancy",
    title: "Rescue the sinking clay",
    question: "Your clay ball sinks right away. What single change makes the SAME clay float?",
    objects: ["clay"],
    options: [
      "Press it into a wide hollow bowl",
      "Paint the clay ball bright blue",
      "Drop it from higher above the water",
    ],
    correctIndex: 0,
    hint: "Think about changing shape to trap air — color and drop height do not change buoyancy.",
    why: "Reshaping clay into a hollow bowl increases the volume of water it pushes aside so it floats.",
  },
  {
    id: "fl4-ft-sponge",
    level: 4,
    kind: "fair-test",
    skill: "sci.cause-effect",
    title: "Why did the sponge sink?",
    question: "A dry sponge floated, then later sank. What changed inside the sponge?",
    objects: ["sponge"],
    options: [
      "Water replaced the air inside its tiny spaces",
      "The water in the tank turned colder",
      "The sponge became smaller than a pebble",
    ],
    correctIndex: 0,
    hint: "Watch what happens to air pockets when water soaks into a sponge.",
    why: "When water fills the sponge's air pockets, the soaked sponge becomes denser than water and sinks.",
  },
  {
    id: "fl4-ft-bottle",
    level: 4,
    kind: "fair-test",
    skill: "sci.cause-effect",
    title: "Submarine bottle trick",
    question: "How can you make a floating plastic bottle sink to the bottom, then float again?",
    objects: ["empty-bottle"],
    options: [
      "Fill it with water to sink, then empty and seal air inside to float",
      "Scratch the outside label off the bottle",
      "Spin the bottle sideways on the surface",
    ],
    correctIndex: 0,
    hint: "Real submarines trade air and water inside tanks to dive and rise!",
    why: "Swapping trapped air for water increases average density so the bottle sinks; replacing water with air makes it float again.",
  },

  // ---- Level 5: Fair-test variable control, cargo limits & engineering trade-offs (12 experiments) ----
  {
    id: "fl5-ft-control",
    level: 5,
    kind: "fair-test",
    skill: "sci.predict",
    title: "Fair test of boat shape",
    question: "You want a fair test of whether a wide bowl holds more pebbles than a tall cup. What must stay the SAME?",
    objects: ["bowl", "wide"],
    options: [
      "Use the same amount of clay and identical pebbles for both boats",
      "Give the wide boat twice as much clay",
      "Use heavy rocks in one boat and dry leaves in the other",
    ],
    correctIndex: 0,
    hint: "In a fair test, only ONE variable changes (boat shape); everything else stays equal.",
    why: "Keeping the clay mass and pebble size identical proves that hull shape alone caused the difference.",
  },
  {
    id: "fl5-ft-walls",
    level: 5,
    kind: "fair-test",
    skill: "sci.shape-buoyancy",
    title: "Stop the waves spilling in",
    question: "A wide foil tray floats flat, but sinks on pebble 3 when water pours over the edge. What design fix helps most?",
    objects: ["foil"],
    options: [
      "Fold higher walls around the rim to keep water out",
      "Poke small drain holes in the bottom of the foil",
      "Crumple the foil into a tight heavy marble",
    ],
    correctIndex: 0,
    hint: "Look at WHY it sank: water spilled over the low edge before the hull was full.",
    why: "Raising the hull walls keeps water out as the boat rides deeper under cargo, increasing capacity.",
  },
  {
    id: "fl5-ft-balance",
    level: 5,
    kind: "fair-test",
    skill: "sci.cause-effect",
    title: "Balanced cargo loading",
    question: "A boat holds 6 pebbles when centered, but sinks at 3 pebbles stacked on one corner. Why?",
    objects: ["wide"],
    options: [
      "Uneven weight tilts one rim under the waterline so water floods in",
      "Pebbles become twice as heavy on the left side",
      "Water only pushes upward in the center of the tank",
    ],
    correctIndex: 0,
    hint: "Watch what happens to the boat's tilt when all cargo sits on one edge.",
    why: "Centering cargo keeps the hull level so water cannot spill over a dipped side.",
  },
  {
    id: "fl5-ft-metal-ship",
    level: 5,
    kind: "fair-test",
    skill: "sci.shape-buoyancy",
    title: "How steel ships float",
    question: "A solid steel key sinks, yet a huge steel cargo ship floats into Apra Harbor. Why?",
    objects: ["key", "toy-boat"],
    options: [
      "The ship's hollow hull encloses huge air spaces, making its average density less than water",
      "Harbor water is too shallow for a ship to sink",
      "Steel only sinks when it is smaller than a hand",
    ],
    correctIndex: 0,
    hint: "Compare the average heaviness of solid metal versus a hollow metal shell filled mostly with air.",
    why: "Because a ship's hollow hull is mostly air, its overall mass per volume is less than the seawater it displaces.",
  },
  {
    id: "fl5-ft-material-fair",
    level: 5,
    kind: "fair-test",
    skill: "sci.predict",
    title: "Fair test of material",
    question: "To test whether wood or metal floats better by material alone, which pair is the fairest test?",
    objects: ["log", "coin"],
    options: [
      "A solid wooden cube and an equal-sized solid metal cube",
      "A hollow metal canoe and a tiny wood splinter",
      "A soaked paper ball and a sealed plastic bottle",
    ],
    correctIndex: 0,
    hint: "To test material alone, keep both shape and size identical!",
    why: "Matching shape and size isolates material density so hollow shapes do not confuse the comparison.",
  },
  {
    id: "fl5-ft-waterline",
    level: 5,
    kind: "fair-test",
    skill: "sci.cause-effect",
    title: "Reading the waterline",
    question: "As you add pebbles one by one to a floating boat, what happens to the boat before it sinks?",
    objects: ["bowl"],
    options: [
      "It sits deeper in the water to push away more water matching the added weight",
      "It rises higher above the waves with every pebble",
      "It stays at the exact same height until the final pebble",
    ],
    correctIndex: 0,
    hint: "Notice how the boat's height changes in the tank each time you load a pebble!",
    why: "Each pebble adds weight, so the boat rides lower until it displaces enough water to balance that weight.",
  },
  {
    id: "fl5-cmp-shell-coconut",
    level: 5,
    kind: "compare",
    skill: "sci.float-sink",
    title: "Open shell vs sealed husk",
    question: "An open snail shell fills with water quickly. Which beach find stays floating longer?",
    objects: ["coconut", "shell"],
    options: ["Air-trapping coconut", "Open sea shell"],
    correctIndex: 0,
    hint: "Check which object keeps seawater from flooding its hollow space.",
    why: "An open shell floods and sinks because calcium carbonate is denser than water, while a sealed coconut traps air.",
  },
  {
    id: "fl5-cmp-apple-key",
    level: 5,
    kind: "compare",
    skill: "sci.float-sink",
    title: "Hidden air pockets",
    question: "An apple feels heavier in your hand than a small key, yet one floats and one sinks. Which floats?",
    objects: ["apple", "key"],
    options: ["Whole apple", "Small metal key"],
    correctIndex: 0,
    hint: "Roughly a quarter of an apple's volume is tiny air spaces inside its flesh!",
    why: "Even though the apple weighs more overall, its air-filled flesh is less dense than water while dense metal sinks.",
  },
  {
    id: "fl5-cmp-wide-bowl",
    level: 5,
    kind: "compare",
    skill: "sci.shape-buoyancy",
    title: "More displaced water",
    question: "Both clay boats use the same clay mass. Which shape carries more cargo before water reaches its rim?",
    objects: ["bowl", "wide"],
    options: ["Small deep bowl", "Wide flat-bottom barge"],
    correctIndex: 1,
    hint: "Compare which hull encloses a bigger volume of air.",
    why: "The wider hull encloses more air volume and displaces more water, supporting extra pebbles.",
  },
  {
    id: "fl5-cargo-4-tight",
    level: 5,
    kind: "cargo",
    skill: "sci.shape-buoyancy",
    title: "Tight reef limit (4 pebbles)",
    question: "Smaller Level 5 hulls! Pick a boat that holds 4 pebbles safely and load all 4.",
    objects: ["wide"],
    options: [],
    correctIndex: 0,
    targetCargo: 4,
    hullCapacities: { ball: 0, bowl: 2, foil: 3, wide: 4 },
    hint: "At Level 5 the bowl holds 2 and the foil boat holds 3 — test the widest hull!",
    why: "Knowing each hull's safe load limit lets engineers choose the right vessel for the cargo.",
  },
  {
    id: "fl5-cargo-5-barge",
    level: 5,
    kind: "cargo",
    skill: "sci.shape-buoyancy",
    title: "Harbor supply run (5 pebbles)",
    question: "Deliver 5 supply pebbles without flooding! Pick the boat with enough volume and load 5.",
    objects: ["wide"],
    options: [],
    correctIndex: 0,
    targetCargo: 5,
    hullCapacities: { ball: 0, bowl: 2, foil: 4, wide: 5 },
    hint: "Check which hull can push away enough water to stay above the waterline at 5 pebbles.",
    why: "The wide barge reaches 5 pebbles right at its safe margin without tipping under.",
  },
  {
    id: "fl5-cargo-3-foil",
    level: 5,
    kind: "cargo",
    skill: "sci.shape-buoyancy",
    title: "Three-pebble reef crossing",
    question: "Load 3 pebbles safely! Avoid the solid clay ball and test a hollow boat.",
    objects: ["foil"],
    options: [],
    correctIndex: 0,
    targetCargo: 3,
    hullCapacities: { ball: 0, bowl: 2, foil: 3, wide: 4 },
    hint: "The solid ball sinks at 0 and the small bowl sinks at 3 — pick a larger hollow hull!",
    why: "Matching cargo weight to hull displacement keeps the boat safely afloat across the reef.",
  },
];

export const floatExperimentById = (id: unknown): FloatExperiment | undefined =>
  typeof id === "string" ? FLOAT_EXPERIMENTS.find((e) => e.id === id) : undefined;

export type FloatLabState = {
  kind: "float-lab";
  level: FloatLabLevel;
  starter: 0 | 1;
  ids: string[];
  index: number;
  /** Option index picked for compare/fair-test, or null. */
  picked: number | null;
  /** For cargo trials: selected hull shape, or null before choosing. */
  shape: Shape | null;
  /** For cargo trials: pebbles currently loaded in the hull. */
  pebbles: number;
  /** True when a cargo hull sank before reaching targetCargo (lets player pick another hull). */
  sank: boolean;
  /** True once a wrong option or sinking hull happened on this trial (does NOT auto-reveal Help). */
  missed: boolean;
  /** True once the child explicitly tapped opt-in "Lab clue" Help on this trial. */
  helped: boolean;
  /** True once this experiment has been tested/completed and ready for Next. */
  solved: boolean;
  /** One entry per completed trial: true iff right on first try without Help. */
  clean: boolean[];
};

export const isFloatLab = (s: unknown): s is FloatLabState =>
  !!s && typeof s === "object" && (s as { kind?: unknown }).kind === "float-lab";

export const floatLabDone = (s: FloatLabState) => s.index >= s.ids.length;

export const floatLabExperiment = (s: FloatLabState): FloatExperiment | undefined =>
  floatExperimentById(s.ids[s.index]);

export const floatLabTurn = (s: FloatLabState): 0 | 1 =>
  ((s.starter + Math.min(s.index, Math.max(0, s.ids.length - 1))) % 2) as 0 | 1;

export function createFloatLab(
  level: FloatLabLevel,
  o: Pick<LearnOptions, "mode">,
  c: CreateContext<unknown>,
): FloatLabState {
  const roundSize = floatLabRoundSize(o);
  const prev = isFloatLab(c.previous) ? new Set(c.previous.ids) : new Set<string>();
  const pool = FLOAT_EXPERIMENTS.filter((e) => e.level === level);
  const fresh = pool.filter((e) => !prev.has(e.id));
  const list = fresh.length >= roundSize ? fresh : pool;
  // Always include at least 1 cargo-load tank trial + compare + fair-test trials!
  const cargo = pickItems(list.filter((e) => e.kind === "cargo"), c.skills, 1, c.rng, c.today);
  const others = pickItems(list.filter((e) => e.kind !== "cargo"), c.skills, roundSize - cargo.length, c.rng, c.today);
  const chosen = [...others.slice(0, 2), ...cargo, ...others.slice(2)];
  return {
    kind: "float-lab",
    level,
    starter: c.starter,
    ids: chosen.map((e) => e.id),
    index: 0,
    picked: null,
    shape: null,
    pebbles: 0,
    sank: false,
    missed: false,
    helped: false,
    solved: false,
    clean: [],
  };
}

export function floatLabPickOption(s: FloatLabState, optionIndex: number): FloatLabState {
  const exp = floatLabExperiment(s);
  if (!exp || exp.kind === "cargo" || s.solved || !integer(optionIndex, 0, exp.options.length - 1)) return s;
  if (optionIndex === exp.correctIndex) {
    return { ...s, picked: optionIndex, solved: true };
  }
  return { ...s, picked: optionIndex, missed: true };
}

export function floatLabChooseHull(s: FloatLabState, shape: Shape): FloatLabState {
  const exp = floatLabExperiment(s);
  if (!exp || exp.kind !== "cargo" || s.solved) return s;
  const cap = exp.hullCapacities?.[shape] ?? 0;
  if (shape === "ball" || cap === 0) {
    return { ...s, shape, pebbles: 0, sank: true, missed: true };
  }
  return { ...s, shape, pebbles: 0, sank: false };
}

export function floatLabAddPebble(s: FloatLabState): FloatLabState {
  const exp = floatLabExperiment(s);
  if (!exp || exp.kind !== "cargo" || s.solved || !s.shape || s.sank) return s;
  const cap = exp.hullCapacities?.[s.shape] ?? 0;
  const nextPebbles = s.pebbles + 1;
  if (nextPebbles > cap) {
    return { ...s, pebbles: nextPebbles, sank: true, missed: true };
  }
  const target = exp.targetCargo ?? 4;
  return {
    ...s,
    pebbles: nextPebbles,
    solved: nextPebbles >= target,
  };
}

export function floatLabResetHull(s: FloatLabState): FloatLabState {
  const exp = floatLabExperiment(s);
  if (!exp || exp.kind !== "cargo" || s.solved) return s;
  return { ...s, shape: null, pebbles: 0, sank: false };
}

export function floatLabHelp(s: FloatLabState): FloatLabState {
  if (floatLabDone(s) || s.solved || s.helped) return s;
  return { ...s, helped: true };
}

export function floatLabNext(s: FloatLabState): FloatLabState {
  if (floatLabDone(s) || !s.solved) return s;
  return {
    ...s,
    index: s.index + 1,
    picked: null,
    shape: null,
    pebbles: 0,
    sank: false,
    missed: false,
    helped: false,
    solved: false,
    clean: [...s.clean, !s.missed && !s.helped],
  };
}

const VALID_SHAPES: readonly Shape[] = ["ball", "bowl", "wide", "foil"];

export function validFloatLab(
  v: unknown,
  level: FloatLabLevel,
  o: Pick<LearnOptions, "mode"> = { mode: "solo" },
): v is FloatLabState {
  if (
    !exact(v, [
      "kind",
      "level",
      "starter",
      "ids",
      "index",
      "picked",
      "shape",
      "pebbles",
      "sank",
      "missed",
      "helped",
      "solved",
      "clean",
    ])
  ) {
    return false;
  }
  const s = v as unknown as FloatLabState;
  const roundSize = floatLabRoundSize(o);
  if (
    s.kind !== "float-lab" ||
    s.level !== level ||
    !prediction(s.starter) ||
    !Array.isArray(s.ids) ||
    s.ids.length !== roundSize ||
    new Set(s.ids).size !== roundSize ||
    !s.ids.every((id) => floatExperimentById(id)?.level === level) ||
    !integer(s.index, 0, roundSize) ||
    !integer(s.pebbles, 0, 10) ||
    typeof s.sank !== "boolean" ||
    typeof s.missed !== "boolean" ||
    typeof s.helped !== "boolean" ||
    typeof s.solved !== "boolean" ||
    !Array.isArray(s.clean) ||
    s.clean.length !== s.index ||
    !s.clean.every((b) => typeof b === "boolean")
  ) {
    return false;
  }
  if (s.index === roundSize) {
    return s.picked === null && s.shape === null && s.pebbles === 0 && !s.sank && !s.missed && !s.helped && !s.solved;
  }
  const exp = floatLabExperiment(s)!;
  if (exp.kind === "cargo") {
    if (s.picked !== null) return false;
    if (s.shape === null) {
      return s.pebbles === 0 && !s.sank && !s.solved;
    }
    if (!VALID_SHAPES.includes(s.shape)) return false;
    const cap = exp.hullCapacities?.[s.shape] ?? 0;
    const target = exp.targetCargo ?? 4;
    if (s.shape === "ball" || cap === 0) {
      return s.pebbles === 0 && s.sank && s.missed && !s.solved;
    }
    if (s.sank) {
      return cap < target && s.pebbles === cap + 1 && s.missed && !s.solved;
    }
    if (s.solved) {
      return cap >= target && s.pebbles === target;
    }
    return s.pebbles >= 0 && s.pebbles <= cap && s.pebbles < target;
  }
  if (s.shape !== null || s.pebbles !== 0 || s.sank) return false;
  if (s.picked !== null && !integer(s.picked, 0, exp.options.length - 1)) return false;
  if (s.solved) return s.picked === exp.correctIndex;
  if (s.picked !== null && (s.picked === exp.correctIndex || !s.missed)) return false;
  return true;
}

export function floatLabOutcome(s: FloatLabState, o: LearnOptions): Outcome {
  if (!floatLabDone(s)) return null;
  if (o.mode !== "versus") return "done";
  const scores: [number, number] = [0, 0];
  s.clean.forEach((ok, i) => {
    if (ok) scores[(s.starter + i) % 2]++;
  });
  return scores[0] === scores[1] ? "draw" : scores[0] > scores[1] ? 0 : 1;
}
