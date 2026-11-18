import type { LearnEngine } from "../../types";
import { mathEngine } from "../shell-math/engine";
import type { MathRound } from "../shell-math/round";
import { ROUND } from "./items";
import { createQuick, validQuick, type QuickRound } from "./round2";
export { mathMove, mathConfig, questionOf, type MathRound, type MathAction } from "../shell-math/round";

const text = {
  name: "Quick Practice", tagline: "Three questions. Take your time.",
  description: "Three number questions at a time. Find the answer or the missing number, to 10, to 20, to 100 and past it, with number stories and two-step sums. No clock.",
  help: "Read the question and find the number that belongs in the gap. Sometimes the missing number comes first. From Level 3, type your answer on the number pad. Help gives a clue, then the working, then fills it in. Show choices gives you three numbers. If an answer is not right, you see how it works, and a new question takes its place. There is no clock.",
};
/** A saved version-1 round keeps its own engine and board; fresh rounds are version 2 at every level. */
const legacy = mathEngine("quick-practice", {
  ...text,
  description: "Choose the number that fills the gap. Try addition, subtraction and a missing number. Show me is always here to help.",
  help: "Look at the equation and choose the number that belongs in the gap. Sometimes the missing number is in the middle. Show me uses shells to show what joins or leaves the group and fills in the equation. You can try again as often as you like. After three questions, your round is done. There is no clock.",
});
export const isQuickRound = (v: unknown): v is QuickRound => !!v && typeof v === "object" && (v as { version?: unknown }).version === 2;
export type QuickState = MathRound | QuickRound;

const skillNames: Record<string, string> = {
  "num.find-to-10": "Finding numbers within 10",
  "num.find-to-20": "Finding numbers across ten",
  "num.missing-first": "Missing numbers, first number too",
  "num.missing-to-100": "Missing numbers and equal sides to 100",
  "num.two-step": "Two-step sums past 100",
};
export const engine: LearnEngine<QuickState> = {
  ...(legacy as LearnEngine<QuickState>),
  ...text,
  helpAudio: "quick-practice-help-v2",
  paceLabels: { easy: "To 10", medium: "To 20", hard: "Missing first" },
  paceHelp: undefined,
  nativeStages: true,
  skills: { ...legacy.skills, ...skillNames },
  levelNames: [
    { name: "Find numbers to 10", description: "Find the answer, then a missing number, within 10. Three choices each time." },
    { name: "Across ten", description: "Cross ten within 20, then find a missing number. Three choices each time." },
    { name: "Missing number first", description: "Every question hides a number, sometimes the first one. Type your answers." },
    { name: "Missing parts to 100", description: "Find missing parts to 100, make both sides equal, and solve a number story." },
    { name: "Two steps and past 100", description: "Find missing hundreds, work two steps in order, and solve two-step stories." },
  ],
  create: (o, c) => createQuick(o, c.rng),
  validate: (v, o): v is QuickState => (isQuickRound(v) ? validQuick(v, o) : !o.stage && legacy.validate(v, o)),
  outcome: (s, o) => (isQuickRound(s) ? (s.index === ROUND ? "done" : null) : legacy.outcome(s, o)),
};
