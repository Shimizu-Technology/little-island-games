import type { LearnEngine } from "../../types";
import { createRound, type MathGame, type MathRound, validRound } from "./round";
import { createShell, validShell, type ShellRound } from "./round2";
export { mathMove, mathConfig, questionOf, type MathRound, type MathAction } from "./round";

const skills = Object.fromEntries(([10, 20] as const).flatMap(limit => [
  [`num.add-within-${limit}`, `Adding within ${limit}`],
  [`num.subtract-within-${limit}`, `Taking away within ${limit}`],
  [`num.missing-within-${limit}`, `Missing numbers within ${limit}`],
]));
export function mathEngine(game: MathGame, text: Pick<LearnEngine<MathRound>, "name" | "tagline" | "description" | "help">): LearnEngine<MathRound> {
  return {
    id: game, ...text, island: "numbers", color: "#246858", surface: "#E5EFE5",
    modes: ["solo", "together"], paces: ["easy", "medium", "hard"], mathControls: true,
    paceLabels: { easy: "Within 10", medium: "Within 20" },
    paceHelp: game === "quick-practice" ? { easy: "Three questions, including a missing number.", medium: "Three questions, including a missing number." } : undefined,
    introAudio: `${game}-intro`, helpAudio: `${game}-help`, skills,
    create: (o, c) => createRound(o, game, c.rng),
    validate: (v, o): v is MathRound => validRound(v, o, game),
    outcome: s => s.index === s.questions.length ? "done" : null,
  };
}
const shellText = {
  name: "Shell Math", tagline: "Count on. Make a ten. Open a ten.",
  description: "Five little strategies with shells, ten-frames and blocks: count on, ten and ones, bridge a ten, make a ten and open a ten. No clock.",
  help: "Read the equation, then follow the picture one step at a time. Count on by tapping shells. Fill a ten-frame to make ten. At the top levels, type each number with the number pad. Help gives a clue, then the number, then fills it in. Choices gives you three numbers to pick from. You can always try again.",
};
const legacy = mathEngine("shell-math", shellText);
const skillNames: Record<string, string> = {
  "num.count-on": "Counting on within 10",
  "num.ten-and-ones": "Ten and ones",
  "num.bridge-ten": "Bridging a ten",
  "num.make-ten": "Making a ten",
  "num.regroup": "Opening and making a ten",
};
/** Which saved shape a round has. Version 1 rounds keep their own rules; fresh rounds are version 2. */
export const isShellRound = (v: unknown): v is ShellRound => !!v && typeof v === "object" && (v as { version?: unknown }).version === 2;
export type ShellState = MathRound | ShellRound;

export const engine: LearnEngine<ShellState> = {
  ...(legacy as LearnEngine<ShellState>),
  ...shellText,
  helpAudio: "shell-math-help-v2",
  paceLabels: { easy: "Count on", medium: "Ten and ones", hard: "Bridge a ten" },
  nativeStages: true,
  skills: { ...legacy.skills, ...skillNames },
  levelNames: [
    { name: "Count on", description: "Start with the bigger number and count on or back, up to 10." },
    { name: "Ten and ones", description: "See a teen as a ten and some ones, and work with each part." },
    { name: "Bridge a ten", description: "Cross ten within 20 with a bridge: make the ten, then add the rest." },
    { name: "Make a ten", description: "Choose which shells to move to make a ten. Missing numbers too." },
    { name: "Open a ten", description: "Trade a ten for ten ones, or ten ones for a ten, up to 99." },
  ],
  create: (o, c) => createShell(o, c.rng),
  validate: (v, o): v is ShellState => (isShellRound(v) ? validShell(v, o) : !o.stage && legacy.validate(v, o)),
  outcome: (s, o) => (isShellRound(s) ? (s.index === s.items.length ? "done" : null) : legacy.outcome(s, o)),
};
