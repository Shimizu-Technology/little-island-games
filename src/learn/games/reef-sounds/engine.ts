import { levelOf } from "../../levelOptions";
import type { LearnEngine } from "../../types";
import { exactKeys, plain, uint } from "../../../state/saveBits";

export type AnimalId =
  | "turtle"
  | "crab"
  | "whale"
  | "frog"
  | "duck"
  | "rooster"
  | "cat"
  | "dog"
  | "bird";

export type Habitat = "water" | "land";

export type AnimalDef = {
  id: AnimalId;
  name: string;
  habitat: Habitat;
  soundWords: string;
  actionPrompt: string;
  riddle: string;
  clue: string;
  surface: string;
};

export const ANIMALS: readonly AnimalDef[] = [
  {
    id: "turtle",
    name: "Sea Turtle",
    habitat: "water",
    soundWords: "splash, splash",
    actionPrompt: "Tap the swimming sea turtle!",
    riddle: "I have a green shell and swim slowly through the ocean! Who am I?",
    clue: "Look for the friendly green shell and flippers!",
    surface: "#E2F4EA",
  },
  {
    id: "crab",
    name: "Beach Crab",
    habitat: "water",
    soundWords: "click, clack",
    actionPrompt: "Who goes click, clack on the shore? Tap the beach crab!",
    riddle: "I walk sideways with two pinchers near the water! Who am I?",
    clue: "Look for the bright coral shell and two pinchers!",
    surface: "#FFE8DF",
  },
  {
    id: "whale",
    name: "Blue Whale",
    habitat: "water",
    soundWords: "whoooosh",
    actionPrompt: "Who splashes a big spout? Tap the blue whale!",
    riddle: "I am giant and blue, and I spray a tall water spout! Who am I?",
    clue: "Look for the big blue ocean friend with a water spout!",
    surface: "#DFF1FA",
  },
  {
    id: "frog",
    name: "Green Frog",
    habitat: "water",
    soundWords: "ribbit, ribbit",
    actionPrompt: "Who says ribbit, ribbit? Tap the green frog!",
    riddle: "I hop near the pond and sing ribbit, ribbit! Who am I?",
    clue: "Look for the bouncy green friend with big round eyes!",
    surface: "#E5F5DF",
  },
  {
    id: "duck",
    name: "Sunny Duck",
    habitat: "water",
    soundWords: "quack, quack",
    actionPrompt: "Who says quack, quack? Tap the duck!",
    riddle: "I paddle in the pond with a bright orange beak and say quack, quack! Who am I?",
    clue: "Look for the sunny yellow bird with an orange beak!",
    surface: "#FFF4CE",
  },
  {
    id: "rooster",
    name: "Island Rooster",
    habitat: "land",
    soundWords: "cock-a-doodle-doo",
    actionPrompt: "Who wakes up the island? Tap the rooster!",
    riddle: "I live on land and wake up the island with cock-a-doodle-doo! Who am I?",
    clue: "Look for the feathery friend with a bright red comb on top!",
    surface: "#FDEBD6",
  },
  {
    id: "cat",
    name: "Cozy Cat",
    habitat: "land",
    soundWords: "meow, meow",
    actionPrompt: "Who says meow, meow? Tap the cozy cat!",
    riddle: "I have pointy ears, whiskers, and purr meow, meow on land! Who am I?",
    clue: "Look for the soft ears and little whiskers!",
    surface: "#F3E8FA",
  },
  {
    id: "dog",
    name: "Happy Dog",
    habitat: "land",
    soundWords: "woof, woof",
    actionPrompt: "Who says woof, woof? Tap the happy dog!",
    riddle: "I wag my tail on land and say woof, woof! Who am I?",
    clue: "Look for the floppy ears and friendly nose!",
    surface: "#F6EAD7",
  },
  {
    id: "bird",
    name: "Tropical Bird",
    habitat: "land",
    soundWords: "tweet, tweet",
    actionPrompt: "Who says tweet, tweet in the palms? Tap the bird!",
    riddle: "I perch in the island palm trees and sing tweet, tweet! Who am I?",
    clue: "Look for the colorful wings and singing beak!",
    surface: "#E3F2F8",
  },
];

export type ReefSoundsTask = {
  prompt: string;
  voicePrompt: string;
  targetIndex: number;
  choices: AnimalDef[];
  skill: "sci.animals" | "sci.animal-sounds" | "sci.habitats" | "sci.riddles";
};

export type ReefSoundsState = {
  version: 1;
  level: number;
  seed: number;
  index: number;
  total: 4;
  helped: boolean;
  hintLevel: 0 | 1 | 2;
};

function seededRng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const mix = (a: number, b: number) => (Math.imul(a ^ 0x9e3779b9, 1664525) + Math.imul(b + 1, 1013904223)) >>> 0;

function pickDistinct<T>(pool: readonly T[], count: number, rng: () => number, first?: T): T[] {
  const rest = first ? pool.filter((x) => x !== first) : [...pool];
  const out: T[] = first ? [first] : [];
  while (out.length < count && rest.length > 0) {
    const idx = Math.floor(rng() * rest.length);
    out.push(rest.splice(idx, 1)[0]);
  }
  return out;
}

function shuffleTarget<T>(items: T[], rng: () => number): { choices: T[]; targetIndex: number } {
  const tagged = items.map((item, i) => ({ item, target: i === 0 }));
  for (let i = tagged.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [tagged[i], tagged[j]] = [tagged[j], tagged[i]];
  }
  return {
    choices: tagged.map((t) => t.item),
    targetIndex: tagged.findIndex((t) => t.target),
  };
}

export function taskAt(s: ReefSoundsState): ReefSoundsTask {
  const idx = Math.min(s.index, s.total - 1);
  const rng = seededRng(mix(mix(s.seed, s.level * 193), idx * 6311 + 19));

  if (s.level === 4) {
    // Habitat sorting: 1 target from asked habitat + 2 distractors from opposite habitat
    const askHabitat: Habitat = (s.seed + idx) % 2 === 0 ? "water" : "land";
    const matching = ANIMALS.filter((a) => a.habitat === askHabitat);
    const others = ANIMALS.filter((a) => a.habitat !== askHabitat);
    const target = matching[(s.seed + idx) % matching.length];
    const distractors = pickDistinct(others, 2, rng);
    const { choices, targetIndex } = shuffleTarget([target, ...distractors], rng);
    const prompt = askHabitat === "water" ? "Who loves the water?" : "Who lives on land?";
    const voicePrompt =
      askHabitat === "water"
        ? "Which animal loves swimming in the water?"
        : "Which animal lives on land?";
    return { prompt, voicePrompt, targetIndex, choices, skill: "sci.habitats" };
  }

  const target = ANIMALS[(Math.floor(s.seed % ANIMALS.length) + idx * 2) % ANIMALS.length];
  const choiceCount = s.level === 1 ? 2 : s.level === 2 ? 3 : 4;
  const picked = pickDistinct(ANIMALS, choiceCount, rng, target);
  const { choices, targetIndex } = shuffleTarget(picked, rng);

  if (s.level === 1) {
    return {
      prompt: target.actionPrompt,
      voicePrompt: target.actionPrompt,
      targetIndex,
      choices,
      skill: "sci.animals",
    };
  }
  if (s.level === 2) {
    const prompt = `Who says "${target.soundWords}"?`;
    return {
      prompt,
      voicePrompt: `Listen! Who says ${target.soundWords}?`,
      targetIndex,
      choices,
      skill: "sci.animal-sounds",
    };
  }
  if (s.level === 3) {
    const prompt = `Find the friend who says "${target.soundWords}"!`;
    return {
      prompt,
      voicePrompt: `Who goes ${target.soundWords}? Tap the animal friend!`,
      targetIndex,
      choices,
      skill: "sci.animal-sounds",
    };
  }
  // Level 5: Sound & habitat riddles
  return {
    prompt: target.riddle,
    voicePrompt: target.riddle,
    targetIndex,
    choices,
    skill: "sci.riddles",
  };
}

/** Shared pure hint helper; never leaks on hintLevel 0. */
export function animalHint(s: ReefSoundsState): {
  text: string;
  dimmedIndex: number | null;
  highlightIndex: number | null;
} {
  if (s.hintLevel === 0) return { text: "", dimmedIndex: null, highlightIndex: null };
  const task = taskAt(s);
  const target = task.choices[task.targetIndex];
  const dimmedIndex = task.choices.length >= 3 ? task.choices.findIndex((_, i) => i !== task.targetIndex) : null;
  if (s.hintLevel === 1) {
    return { text: target.clue, dimmedIndex, highlightIndex: null };
  }
  return {
    text: `Tap the glowing friend — ${target.name}!`,
    dimmedIndex,
    highlightIndex: task.targetIndex,
  };
}

export function chooseAnimal(s: ReefSoundsState, choiceIndex: number): { next: ReefSoundsState; correct: boolean } {
  if (s.index >= s.total) return { next: s, correct: false };
  const task = taskAt(s);
  if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex >= task.choices.length) {
    return { next: s, correct: false };
  }
  if (choiceIndex === task.targetIndex) {
    return { next: { ...s, index: s.index + 1, hintLevel: 0 }, correct: true };
  }
  return { next: { ...s, helped: true }, correct: false };
}

export function applyHelp(s: ReefSoundsState): ReefSoundsState {
  if (s.index >= s.total) return s;
  return { ...s, helped: true, hintLevel: (s.hintLevel === 0 ? 1 : 2) as 1 | 2 };
}

export const engine: LearnEngine<ReefSoundsState> = {
  id: "reef-sounds",
  name: "Animal Friends",
  island: "science",
  ages: [2, 4],
  ownLevels: true,
  tagline: "Meet island animals and their sounds!",
  description: "Listen to playful animal sounds and clues, then tap the matching island or friendly animal. Zero reading needed!",
  help: "Listen to the animal sound or clue, then tap the animal card that matches. Tap Hear it to listen again, or Help for a gentle clue.",
  spokenIntro: "Let's meet our animal friends!",
  spokenHelp: "Listen to the animal sound or clue, then tap the matching animal picture. Tap Hear it anytime to listen again, or Help for a clue.",
  color: "#1E6B66",
  surface: "#E2F4EA",
  modes: ["solo", "together"],
  levelNames: [
    { name: "Hello animals", description: "Choose between two giant illustrated island and familiar animals." },
    { name: "Animal sounds", description: "Match playful animal sounds like quack, meow, and ribbit from three cards." },
    { name: "Island friends", description: "Listen to sound clues and spot the right friend from four cards." },
    { name: "Water or land?", description: "Discover which animals love the water and which live on land." },
    { name: "Animal riddles", description: "Use both sound and habitat clues to solve playful animal riddles." },
  ],
  skills: {
    "sci.animals": "Recognizing island and familiar animals",
    "sci.animal-sounds": "Matching animals to their sounds",
    "sci.habitats": "Sorting water and land habitats",
    "sci.riddles": "Using sound and habitat clues",
  },
  create: (o, ctx): ReefSoundsState => ({
    version: 1,
    level: levelOf(o),
    seed: Math.floor(ctx.rng() * 0xffffffff) >>> 0,
    index: 0,
    total: 4,
    helped: false,
    hintLevel: 0,
  }),
  validate: (v, o): v is ReefSoundsState => {
    if (!plain(v)) return false;
    if (!exactKeys(v, ["helped", "hintLevel", "index", "level", "seed", "total", "version"])) return false;
    const s = v as ReefSoundsState;
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
