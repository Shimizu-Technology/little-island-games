import { levelOf } from "../../levelOptions";
import type { LearnEngine } from "../../types";
import { exactKeys, plain, uint } from "../../../state/saveBits";

export type ColorId = "red" | "yellow" | "blue" | "green" | "coral" | "purple";
export type ShapeId = "circle" | "star" | "square" | "triangle" | "heart";
export type ColorObjectId =
  | "red-hibiscus"
  | "yellow-sun"
  | "blue-wave"
  | "green-turtle"
  | "coral-shell"
  | "purple-starfish";

export type ColorCard =
  | { kind: "object"; id: ColorObjectId; color: ColorId; label: string; clue: string }
  | { kind: "shape"; shape: ShapeId; color: ColorId; label: string; clue: string };

export type ColorTaskKind = "color" | "shape" | "combo" | "match";

export type ColorTask = {
  kind: ColorTaskKind;
  prompt: string;
  voicePrompt: string;
  targetIndex: number;
  sample?: ColorCard;
  choices: ColorCard[];
  skill: "think.colors" | "think.shapes" | "think.color-shapes" | "think.matching";
};

export type IslandColorsState = {
  version: 1;
  level: number;
  seed: number;
  index: number;
  total: 4;
  helped: boolean;
  /** 0 = no help, 1 = sensory clue + dim one distractor (when 3+ choices), 2 = golden highlight ring. */
  hintLevel: 0 | 1 | 2;
};

export const COLOR_PALETTE: Record<ColorId, { fill: string; light: string; stroke: string; name: string; clue: string }> = {
  red: { fill: "#E54B4B", light: "#FFE5E2", stroke: "#9B2A2A", name: "red", clue: "Look for bright hibiscus red!" },
  yellow: { fill: "#F6C344", light: "#FFF5CE", stroke: "#9E6D12", name: "yellow", clue: "Look for sunny golden yellow!" },
  blue: { fill: "#3B92C4", light: "#DFF2FA", stroke: "#1E5C82", name: "blue", clue: "Look for bright ocean blue!" },
  green: { fill: "#4E9F68", light: "#E2F4E6", stroke: "#28663E", name: "green", clue: "Look for leafy island green!" },
  coral: { fill: "#FF7A5C", light: "#FFE8DF", stroke: "#B54128", name: "coral", clue: "Look for warm sunset coral!" },
  purple: { fill: "#8E64B8", light: "#EFE6FA", stroke: "#543578", name: "purple", clue: "Look for cozy reef purple!" },
};

export const COLOR_OBJECTS: readonly Extract<ColorCard, { kind: "object" }>[] = [
  { kind: "object", id: "red-hibiscus", color: "red", label: "Red hibiscus", clue: "Look for the bright red island flower!" },
  { kind: "object", id: "yellow-sun", color: "yellow", label: "Golden sun", clue: "Look for the shiny golden sun!" },
  { kind: "object", id: "blue-wave", color: "blue", label: "Blue wave", clue: "Look for the splashing blue ocean wave!" },
  { kind: "object", id: "green-turtle", color: "green", label: "Green turtle", clue: "Look for the friendly green sea turtle!" },
  { kind: "object", id: "coral-shell", color: "coral", label: "Coral shell", clue: "Look for the warm coral beach shell!" },
  { kind: "object", id: "purple-starfish", color: "purple", label: "Purple starfish", clue: "Look for the purple five-arm starfish!" },
];

export const SHAPE_DEFS: readonly { shape: ShapeId; label: string; clue: string }[] = [
  { shape: "circle", label: "circle", clue: "A circle is round all the way around with no corners!" },
  { shape: "star", label: "star", clue: "A star has five pointy tips!" },
  { shape: "square", label: "square", clue: "A square has four equal straight sides!" },
  { shape: "triangle", label: "triangle", clue: "A triangle has three straight sides and three points!" },
  { shape: "heart", label: "heart", clue: "A heart has two round tops and a point at the bottom!" },
];

const COLORS: readonly ColorId[] = ["red", "yellow", "blue", "green", "coral", "purple"];

function seededRng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pickDistinct<T>(items: readonly T[], count: number, rng: () => number, firstIndex?: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  if (firstIndex !== undefined && firstIndex >= 0 && firstIndex < pool.length) {
    out.push(pool.splice(firstIndex, 1)[0]);
  }
  while (out.length < count && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function shuffleWithTarget<T>(items: T[], rng: () => number): { choices: T[]; targetIndex: number } {
  const indexed = items.map((item, i) => ({ item, isTarget: i === 0 }));
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  return {
    choices: indexed.map((entry) => entry.item),
    targetIndex: indexed.findIndex((entry) => entry.isTarget),
  };
}

const mix = (a: number, b: number) => (Math.imul(a ^ 0x9e3779b9, 1664525) + Math.imul(b + 1, 1013904223)) >>> 0;

/** Build one deterministic toddler-friendly color or shape task for any level 1–5. */
export function taskAt(s: IslandColorsState): ColorTask {
  const idx = Math.min(s.index, s.total - 1);
  const rng = seededRng(mix(mix(s.seed, s.level * 131), idx * 7919 + 37));

  if (s.level === 1 || s.level === 2) {
    const choiceCount = s.level === 1 ? 2 : 3;
    const targetObjIndex = (Math.floor(s.seed % COLOR_OBJECTS.length) + idx) % COLOR_OBJECTS.length;
    const picked = pickDistinct(COLOR_OBJECTS, choiceCount, rng, targetObjIndex);
    const { choices, targetIndex } = shuffleWithTarget(picked, rng);
    const target = choices[targetIndex];
    const prompt = s.level === 1 ? `Tap the ${target.label.toLowerCase()}!` : `Find the ${target.label.toLowerCase()}!`;
    return {
      kind: "color",
      prompt,
      voicePrompt: prompt,
      targetIndex,
      choices,
      skill: "think.colors",
    };
  }

  if (s.level === 3) {
    const shapeIdx = (Math.floor(s.seed % SHAPE_DEFS.length) + idx) % SHAPE_DEFS.length;
    const unifiedColor = COLORS[(s.seed + idx) % COLORS.length];
    const pickedShapes = pickDistinct(SHAPE_DEFS, 3, rng, shapeIdx);
    const cards: ColorCard[] = pickedShapes.map((def) => ({
      kind: "shape",
      shape: def.shape,
      color: unifiedColor,
      label: def.label[0].toUpperCase() + def.label.slice(1),
      clue: def.clue,
    }));
    const { choices, targetIndex } = shuffleWithTarget(cards, rng);
    const target = choices[targetIndex];
    const prompt = `Tap the ${target.label.toLowerCase()}!`;
    return {
      kind: "shape",
      prompt,
      voicePrompt: prompt,
      targetIndex,
      choices,
      skill: "think.shapes",
    };
  }

  // Levels 4 and 5: Color + Shape combos (4 choices, never duplicate color+shape pair)
  const targetColor = COLORS[(s.seed + idx) % COLORS.length];
  const targetShapeDef = SHAPE_DEFS[(Math.floor(s.seed / 3) + idx) % SHAPE_DEFS.length];
  const otherColors = COLORS.filter((c) => c !== targetColor);
  const otherShapes = SHAPE_DEFS.filter((sh) => sh.shape !== targetShapeDef.shape);
  const altColor1 = otherColors[Math.floor(rng() * otherColors.length)];
  const altColor2 = otherColors.filter((c) => c !== altColor1)[Math.floor(rng() * (otherColors.length - 1))];
  const altShape1 = otherShapes[Math.floor(rng() * otherShapes.length)];
  const altShape2 = otherShapes.filter((sh) => sh.shape !== altShape1.shape)[Math.floor(rng() * (otherShapes.length - 1))];

  const makeCombo = (color: ColorId, def: (typeof SHAPE_DEFS)[number]): ColorCard => ({
    kind: "shape",
    shape: def.shape,
    color,
    label: `${COLOR_PALETTE[color].name[0].toUpperCase()}${COLOR_PALETTE[color].name.slice(1)} ${def.label}`,
    clue: `${COLOR_PALETTE[color].clue} ${def.clue}`,
  });

  const targetCard = makeCombo(targetColor, targetShapeDef);
  const distractors: ColorCard[] = [
    makeCombo(altColor1, targetShapeDef), // same shape, different color
    makeCombo(targetColor, altShape1), // same color, different shape
    makeCombo(altColor2, altShape2), // different color and shape
  ];
  const { choices, targetIndex } = shuffleWithTarget([targetCard, ...distractors], rng);

  if (s.level === 4) {
    const prompt = `Find the ${targetCard.label.toLowerCase()}!`;
    return {
      kind: "combo",
      prompt,
      voicePrompt: prompt,
      targetIndex,
      choices,
      skill: "think.color-shapes",
    };
  }

  const prompt = `Match the ${targetCard.label.toLowerCase()}!`;
  return {
    kind: "match",
    prompt,
    voicePrompt: `Find the card that matches the ${targetCard.label.toLowerCase()}!`,
    targetIndex,
    sample: targetCard,
    choices,
    skill: "think.matching",
  };
}

/** Pure hint generator shared by UI and tests. Never leaks on hintLevel 0. */
export function colorHint(s: IslandColorsState): {
  text: string;
  dimmedIndex: number | null;
  highlightIndex: number | null;
} {
  if (s.hintLevel === 0) return { text: "", dimmedIndex: null, highlightIndex: null };
  const task = taskAt(s);
  const target = task.choices[task.targetIndex];
  if (s.hintLevel === 1) {
    // Dim one distractor on 3–4 choice levels while keeping at least 2 choices active.
    const dimmedIndex = task.choices.length >= 3
      ? task.choices.findIndex((_, i) => i !== task.targetIndex)
      : null;
    return { text: target.clue, dimmedIndex, highlightIndex: null };
  }
  return {
    text: `Tap the glowing card — ${target.label.toLowerCase()}!`,
    dimmedIndex: task.choices.length >= 3 ? task.choices.findIndex((_, i) => i !== task.targetIndex) : null,
    highlightIndex: task.targetIndex,
  };
}

export function chooseCard(s: IslandColorsState, choiceIndex: number): { next: IslandColorsState; correct: boolean } {
  if (s.index >= s.total) return { next: s, correct: false };
  const task = taskAt(s);
  if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex >= task.choices.length) {
    return { next: s, correct: false };
  }
  if (choiceIndex === task.targetIndex) {
    return {
      next: { ...s, index: s.index + 1, hintLevel: 0 },
      correct: true,
    };
  }
  return {
    next: { ...s, helped: true },
    correct: false,
  };
}

export function applyHelp(s: IslandColorsState): IslandColorsState {
  if (s.index >= s.total) return s;
  const nextHint = s.hintLevel === 0 ? 1 : 2;
  return { ...s, helped: true, hintLevel: nextHint as 1 | 2 };
}

export const engine: LearnEngine<IslandColorsState> = {
  id: "island-colors",
  name: "Island Colors & Shapes",
  island: "thinking",
  ages: [2, 4],
  ownLevels: true,
  tagline: "Tap sunny colors and island shapes!",
  description: "Listen to the voice and tap bright island colors, friendly shapes, and matching cards. Zero reading needed!",
  help: "Listen to the island voice, then tap the matching color or shape picture. Tap Hear it anytime to listen again. Tap Help for a gentle clue.",
  spokenIntro: "Let's find island colors and shapes!",
  spokenHelp: "Listen to the voice and tap the matching island picture. Tap Hear it anytime to listen again, or tap Help for a gentle clue.",
  color: "#C4573A",
  surface: "#FFE8DF",
  modes: ["solo", "together"],
  levelNames: [
    { name: "Sunny colors", description: "Choose between two big island color pictures with voice clues." },
    { name: "Rainbow beach", description: "Find red, yellow, blue, green, coral, and purple pictures from three cards." },
    { name: "Island shapes", description: "Spot circles, stars, squares, triangles, and hearts by shape." },
    { name: "Color & shape", description: "Combine both color and shape clues to pick the right card." },
    { name: "Match the pair", description: "Look closely at the top picture and find its exact match below." },
  ],
  skills: {
    "think.colors": "Naming and finding colors",
    "think.shapes": "Recognizing basic shapes",
    "think.color-shapes": "Matching color and shape together",
    "think.matching": "Finding matching pairs",
  },
  create: (o, ctx): IslandColorsState => ({
    version: 1,
    level: levelOf(o),
    seed: Math.floor(ctx.rng() * 0xffffffff) >>> 0,
    index: 0,
    total: 4,
    helped: false,
    hintLevel: 0,
  }),
  validate: (v, o): v is IslandColorsState => {
    if (!plain(v)) return false;
    if (!exactKeys(v, ["helped", "hintLevel", "index", "level", "seed", "total", "version"])) return false;
    const s = v as IslandColorsState;
    return (
      s.version === 1 &&
      s.level === levelOf(o) &&
      s.total === 4 &&
      uint(s.seed, 0xffffffff) &&
      uint(s.index, 4) &&
      typeof s.helped === "boolean" &&
      (s.hintLevel === 0 || s.hintLevel === 1 || s.hintLevel === 2) &&
      (s.index < 4 || s.hintLevel === 0)
    );
  },
  outcome: (s) => (s.index === 4 ? "done" : null),
  helpedWork: (s) => s.helped,
};
