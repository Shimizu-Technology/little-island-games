import type { LearnEngine } from "../../types";
import { mathEngine } from "../shell-math/engine";
import type { MathRound } from "../shell-math/round";
import { ROUND_LENGTH } from "./items";
import { createHop, validHop2, type HopRound } from "./round2";
export { mathMove, mathConfig, questionOf, type MathRound, type MathAction } from "../shell-math/round";

const text = {
  name: "Number Hop", tagline: "Hop forward. Hop back. Choose your jumps.",
  description: "Hop along a number line. First by ones, then you choose the jumps: ones and twos, then twos, fives and tens to 100, then going past and back. Five puzzles, no clock.",
  help: "At the first levels, tap Hop forward one or Hop back one, then choose where you landed. From Level 3, choose your own jumps to reach the flag. Try to get there in the fewest jumps. Help shows a good next jump. Undo takes a jump back, and Start again starts the puzzle over. At the top level, work out where the frog started. There is no clock.",
};
/** A saved version-1 round keeps its own engine and board; fresh rounds are version 2 at every level. */
const legacy = mathEngine("number-hop", {
  ...text,
  description: "Start on a number and tap to hop. Forward adds; backward takes away. Five questions, at your own pace.",
  help: "Start at the circled number. For addition, tap Hop forward one. For subtraction, tap Hop back one. Each arrow is one hop. The number line follows you. When all the hops are made, choose the number where you landed. Show me draws the hops and fills in the equation. Tap Next when you are ready. There is no clock.",
});
export const isHopRound = (v: unknown): v is HopRound => !!v && typeof v === "object" && (v as { version?: unknown }).version === 2;
export type HopState = MathRound | HopRound;

const skillNames: Record<string, string> = {
  "num.hop-ones": "Hopping on by ones",
  "num.hop-ten": "Hopping across ten",
  "num.hop-choose": "Choosing jumps of 1 and 2",
  "num.hop-skip": "Jumps of 2, 5 and 10",
  "num.hop-back": "Going past and back, and unknown starts",
};
export const engine: LearnEngine<HopState> = {
  ...(legacy as LearnEngine<HopState>),
  ...text,
  helpAudio: "number-hop-help-v2",
  paceLabels: { easy: "Hop by ones", medium: "Across ten", hard: "Choose jumps" },
  nativeStages: true,
  skills: { ...legacy.skills, ...skillNames },
  levelNames: [
    { name: "Hop by ones", description: "Hop forward or back one at a time within 10, then say where you landed." },
    { name: "Hop across ten", description: "Every hop question crosses ten, within 20." },
    { name: "Choose your jumps", description: "Reach the flag with jumps of 1 and 2, in as few jumps as you can." },
    { name: "Twos, fives and tens", description: "Jump to 100 with 2, 5 and 10. The biggest jump is not always the best." },
    { name: "Past and back", description: "Jump past the flag and come back, and work out where the frog started." },
  ],
  create: (o, c) => createHop(o, c.rng),
  validate: (v, o): v is HopState => (isHopRound(v) ? validHop2(v, o) : !o.stage && legacy.validate(v, o)),
  outcome: (s, o) => (isHopRound(s) ? (s.index === ROUND_LENGTH ? "done" : null) : legacy.outcome(s, o)),
};
