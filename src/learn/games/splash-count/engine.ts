import { levelOf } from "../../levelOptions";
import type { LearnEngine } from "../../types";
import { exactKeys, plain, uint } from "../../../state/saveBits";

export type SplashItemKind = "shell" | "starfish" | "coconut";

export const NUMBER_WORDS: readonly string[] = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
];

export type SplashTask = {
  kind: "tap-count" | "choose-count" | "one-more-less";
  item: SplashItemKind;
  /** Number of tropical items displayed on the sandy tray. */
  shownCount: number;
  /** Target answer (equals shownCount for tap-count / choose-count; shownCount ± 1 for one-more-less). */
  answer: number;
  delta: 0 | 1 | -1;
  /** Empty for L1–L2 tap-count; 3 distinct numeral+dot choices for L3–L5. */
  choices: number[];
  prompt: string;
  voicePrompt: string;
  skill: "num.tap-count" | "num.subitize" | "num.count-to-10" | "num.one-more-less";
};

export type SplashCountState = {
  version: 1;
  level: number;
  seed: number;
  index: number;
  total: 4;
  /** Indices of items the child has tapped so far on the current task (in tap order, unique). */
  tapped: number[];
  helped: boolean;
  hintLevel: 0 | 1 | 2;
};

const ITEMS: readonly SplashItemKind[] = ["shell", "starfish", "coconut"];

export function itemWord(kind: SplashItemKind, count: number): string {
  if (kind === "starfish") return "starfish";
  if (kind === "shell") return count === 1 ? "shell" : "shells";
  return count === 1 ? "coconut" : "coconuts";
}

function seededRng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const mix = (a: number, b: number) => (Math.imul(a ^ 0x9e3779b9, 1664525) + Math.imul(b + 1, 1013904223)) >>> 0;

function buildChoices(answer: number, min: number, max: number, rng: () => number): number[] {
  const candidates = new Set<number>([answer]);
  const offsets = [-2, -1, 1, 2, 3, -3];
  for (let i = offsets.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [offsets[i], offsets[j]] = [offsets[j], offsets[i]];
  }
  for (const d of offsets) {
    if (candidates.size >= 3) break;
    const val = answer + d;
    if (val >= min && val <= max) candidates.add(val);
  }
  for (let val = min; val <= max && candidates.size < 3; val++) {
    candidates.add(val);
  }
  return [...candidates].sort((a, b) => a - b);
}

/** Deterministic counting task generator across Levels 1–5. */
export function taskAt(s: SplashCountState): SplashTask {
  const idx = Math.min(s.index, s.total - 1);
  const rng = seededRng(mix(mix(s.seed, s.level * 257), idx * 5471 + 29));
  const item = ITEMS[(s.seed + idx) % ITEMS.length];

  if (s.level === 1) {
    // Tap to count 1–3 (cycle cleanly across 1, 2, 3, 2 or 3)
    const seq = [1, 2, 3, 2 + ((s.seed + idx) % 2)];
    const shownCount = seq[idx];
    const word = itemWord(item, shownCount);
    return {
      kind: "tap-count",
      item,
      shownCount,
      answer: shownCount,
      delta: 0,
      choices: [],
      prompt: `Tap each ${itemWord(item, 1)} to count to ${shownCount}!`,
      voicePrompt: `Let's count the ${word}! Tap each ${itemWord(item, 1)}!`,
      skill: "num.tap-count",
    };
  }

  if (s.level === 2) {
    // Tap to count 1–5 (cover 2, 3, 4, 5)
    const counts = [2, 3, 4, 5];
    const shownCount = counts[(idx + (s.seed % 4)) % 4];
    const word = itemWord(item, shownCount);
    return {
      kind: "tap-count",
      item,
      shownCount,
      answer: shownCount,
      delta: 0,
      choices: [],
      prompt: `Tap every ${itemWord(item, 1)} to count all ${shownCount}!`,
      voicePrompt: `Let's count the ${word}! Tap every ${itemWord(item, 1)}!`,
      skill: "num.tap-count",
    };
  }

  if (s.level === 3) {
    // How many? (1–5) with tappable items + 3 giant dot+numeral cards
    const pool = [1, 2, 3, 4, 5];
    const shownCount = pool[(idx + (s.seed % pool.length)) % pool.length];
    const choices = buildChoices(shownCount, 1, 5, rng);
    const word = itemWord(item, 2);
    return {
      kind: "choose-count",
      item,
      shownCount,
      answer: shownCount,
      delta: 0,
      choices,
      prompt: `How many ${word}?`,
      voicePrompt: `How many ${word} are on the beach? Tap them to count, then tap the number!`,
      skill: "num.subitize",
    };
  }

  if (s.level === 4) {
    // Count up to 10 (6–10 items)
    const pool = [6, 7, 8, 9, 10];
    const shownCount = pool[(idx + (s.seed % pool.length)) % pool.length];
    const choices = buildChoices(shownCount, 5, 10, rng);
    const word = itemWord(item, 2);
    return {
      kind: "choose-count",
      item,
      shownCount,
      answer: shownCount,
      delta: 0,
      choices,
      prompt: `Count the ${word}! How many?`,
      voicePrompt: `Tap the ${word} to count them, then tap how many there are!`,
      skill: "num.count-to-10",
    };
  }

  // Level 5: One more / one less (1–10)
  const delta: 1 | -1 = (s.seed + idx) % 2 === 0 ? 1 : -1;
  const shownCount = delta === 1 ? 2 + ((s.seed + idx * 2) % 8) : 2 + ((s.seed + idx * 2) % 9); // answer always in 1..10
  const answer = shownCount + delta;
  const choices = buildChoices(answer, 1, 10, rng);
  const word = itemWord(item, shownCount);
  const moreOrLess = delta === 1 ? "one more" : "one less";
  return {
    kind: "one-more-less",
    item,
    shownCount,
    answer,
    delta,
    choices,
    prompt: `${shownCount} ${word} — what is ${moreOrLess}?`,
    voicePrompt: `There are ${shownCount} ${word}. What is ${moreOrLess}?`,
    skill: "num.one-more-less",
  };
}

/** Tap one beach item to count aloud. On L1–L2, tapping the last item completes the task! */
export function tapBeachItem(
  s: SplashCountState,
  itemIndex: number,
): { next: SplashCountState; countSpoken: number | null; completedTask: boolean } {
  if (s.index >= s.total) return { next: s, countSpoken: null, completedTask: false };
  const task = taskAt(s);
  if (!Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex >= task.shownCount) {
    return { next: s, countSpoken: null, completedTask: false };
  }
  if (s.tapped.includes(itemIndex)) {
    const order = s.tapped.indexOf(itemIndex) + 1;
    return { next: s, countSpoken: order, completedTask: false };
  }
  const nextTapped = [...s.tapped, itemIndex];
  const countSpoken = nextTapped.length;
  if (task.kind === "tap-count" && countSpoken >= task.shownCount) {
    return {
      next: { ...s, index: s.index + 1, tapped: [], hintLevel: 0 },
      countSpoken,
      completedTask: true,
    };
  }
  return {
    next: { ...s, tapped: nextTapped },
    countSpoken,
    completedTask: false,
  };
}

/** Choose a dot+numeral card on Levels 3–5. */
export function chooseNumber(s: SplashCountState, value: number): { next: SplashCountState; correct: boolean } {
  if (s.index >= s.total) return { next: s, correct: false };
  const task = taskAt(s);
  if (task.kind === "tap-count" || !task.choices.includes(value)) {
    return { next: s, correct: false };
  }
  if (value === task.answer) {
    return {
      next: { ...s, index: s.index + 1, tapped: [], hintLevel: 0 },
      correct: true,
    };
  }
  return {
    next: { ...s, helped: true },
    correct: false,
  };
}

export function applyHelp(s: SplashCountState): SplashCountState {
  if (s.index >= s.total) return s;
  return { ...s, helped: true, hintLevel: (s.hintLevel === 0 ? 1 : 2) as 1 | 2 };
}

/** Shared pure hint helper; never leaks on hintLevel 0. */
export function countHint(s: SplashCountState): {
  text: string;
  glowItemIndex: number | null;
  dimmedChoice: number | null;
  highlightChoice: number | null;
} {
  if (s.hintLevel === 0) {
    return { text: "", glowItemIndex: null, dimmedChoice: null, highlightChoice: null };
  }
  const task = taskAt(s);
  const nextUntapped = Array.from({ length: task.shownCount }, (_, i) => i).find((i) => !s.tapped.includes(i)) ?? null;
  if (task.kind === "tap-count") {
    return {
      text: `Tap the glowing ${itemWord(task.item, 1)} to count ${NUMBER_WORDS[s.tapped.length + 1] ?? s.tapped.length + 1}!`,
      glowItemIndex: nextUntapped,
      dimmedChoice: null,
      highlightChoice: null,
    };
  }
  const dimmedChoice = task.choices.find((c) => c !== task.answer) ?? null;
  if (s.hintLevel === 1) {
    if (task.kind === "one-more-less") {
      return {
        text:
          task.delta === 1
            ? `Count all ${task.shownCount} ${itemWord(task.item, task.shownCount)}, then count up one more!`
            : `Count all ${task.shownCount} ${itemWord(task.item, task.shownCount)}, then take one away!`,
        glowItemIndex: nextUntapped,
        dimmedChoice,
        highlightChoice: null,
      };
    }
    return {
      text: `Tap each ${itemWord(task.item, 1)} to count them together, then match the dots!`,
      glowItemIndex: nextUntapped,
      dimmedChoice,
      highlightChoice: null,
    };
  }
  return {
    text: `Tap the glowing ${task.answer} card!`,
    glowItemIndex: null,
    dimmedChoice,
    highlightChoice: task.answer,
  };
}

export const engine: LearnEngine<SplashCountState> = {
  id: "splash-count",
  name: "Splash Count",
  island: "numbers",
  ages: [2, 4],
  ownLevels: true,
  tagline: "Tap shells and count aloud 1 to 10!",
  description: "Tap tropical shells, starfish, and coconuts to hear every number counted aloud, then match dots and numbers up to 10.",
  help: "Tap each shell, starfish, or coconut on the beach to count aloud. When number cards appear below, tap the card with the matching dots and number. Tap Help for a gentle clue.",
  spokenIntro: "Let's splash and count together!",
  spokenHelp: "Tap each shell, starfish, or coconut on the beach to hear it count aloud. Then tap the matching number card below!",
  color: "#A36614",
  surface: "#FFF0D2",
  modes: ["solo", "together"],
  levelNames: [
    { name: "Tap & count 1–3", description: "Tap 1, 2, or 3 big beach treasures and hear each number counted aloud." },
    { name: "Tap & count 1–5", description: "Tap every shell, starfish, and coconut up to 5 with joyful voice counting." },
    { name: "How many shells?", description: "Count 1 to 5 beach treasures and tap the matching dot and number card." },
    { name: "Count to 10", description: "Tap and count bigger groups of 6 to 10 beach treasures." },
    { name: "One more, one less", description: "Count the beach group and find one more or one less within 1 to 10." },
  ],
  skills: {
    "num.tap-count": "One-to-one touch counting",
    "num.subitize": "Counting and matching 1–5",
    "num.count-to-10": "Counting groups to 10",
    "num.one-more-less": "Finding one more and one less",
  },
  create: (o, ctx): SplashCountState => ({
    version: 1,
    level: levelOf(o),
    seed: Math.floor(ctx.rng() * 0xffffffff) >>> 0,
    index: 0,
    total: 4,
    tapped: [],
    helped: false,
    hintLevel: 0,
  }),
  validate: (v, o): v is SplashCountState => {
    if (!plain(v)) return false;
    if (!exactKeys(v, ["helped", "hintLevel", "index", "level", "seed", "tapped", "total", "version"])) return false;
    const s = v as SplashCountState;
    if (
      s.version !== 1 ||
      s.level !== levelOf(o) ||
      s.total !== 4 ||
      !uint(s.seed, 0xffffffff) ||
      !uint(s.index, 4) ||
      typeof s.helped !== "boolean" ||
      !(s.hintLevel === 0 || s.hintLevel === 1 || s.hintLevel === 2) ||
      (s.hintLevel > 0 && !s.helped) ||
      !Array.isArray(s.tapped)
    ) {
      return false;
    }
    if (s.index === 4) return s.tapped.length === 0 && s.hintLevel === 0;
    const task = taskAt(s);
    if (s.tapped.length > task.shownCount || new Set(s.tapped).size !== s.tapped.length) return false;
    if (!s.tapped.every((i) => Number.isInteger(i) && i >= 0 && i < task.shownCount)) return false;
    if (task.kind === "tap-count" && s.tapped.length >= task.shownCount) return false;
    return true;
  },
  outcome: (s) => (s.index === 4 ? "done" : null),
  helpedWork: (s) => s.helped,
};
