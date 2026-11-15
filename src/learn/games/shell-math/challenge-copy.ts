import { placeValue, tensOnesText, type Step } from "../../../math/kit";
import type { Descriptor } from "./challenge-task";

type Deep = Exclude<Descriptor, { t: "fact" }>;
const minus = "−";

/** The line above a Deep Water puzzle: what is being asked, before any step. */
export function deepTitle(d: Deep): string {
  switch (d.t) {
    case "regroup": return `${tensOnesText(d.tens, d.ones)}. What number is that?`;
    case "missing": return d.first ? `? + ${d.known} = ${d.total}` : `${d.known} + ? = ${d.total}`;
    case "equalize": return `Two piles: ${d.x} shells and ${d.y} shells. Make them equal.`;
    case "pairs": return `Find the numbers that make ten, then add them all.`;
  }
}
export function deepSpoken(d: Deep): string {
  switch (d.t) {
    case "regroup": return tensOnesText(d.tens, d.ones);
    case "missing": return d.first ? `Missing number plus ${d.known} equals ${d.total}` : `${d.known} plus the missing number equals ${d.total}`;
    case "equalize": return `Piles of ${d.x} and ${d.y} shells`;
    case "pairs": return `The numbers ${d.nums.join(", ")}`;
  }
}
export function deepPrompt(d: Deep, plan: readonly Step[], at: number): string {
  const s = plan[at];
  switch (d.t) {
    case "regroup": return s.kind === "trade" ? "Ten ones can swap for one ten. Tap the cubes to make a ten." : `Now count it up. What number is ${tensOnesText(d.tens, d.ones)}?`;
    case "missing": {
      const ten = d.known + (10 - (d.known % 10));
      if (s.kind !== "number") return "";
      return s.role === "to-ten" ? `Climb from ${d.known} to ${ten}. How many?` : s.role === "rest" ? `Now climb from ${ten} to ${d.total}. How many?` : `Put the two climbs together. What is the missing number?`;
    }
    case "equalize": {
      if (s.kind !== "number") return "";
      return s.role === "gap" ? `How many more shells are in the big pile than the small one?` : `Sharing them out equally: how many shells move from the big pile to the small one?`;
    }
    case "pairs": return s.kind === "pair" ? "Touch two numbers that make ten." : `Now add every number together. What is the total?`;
  }
}
export function deepCue(d: Deep, plan: readonly Step[], at: number): string {
  const s = plan[at];
  if (d.t === "regroup") return s.kind === "trade" ? "Look at the loose cubes. Ten of them are one ten." : "Count the tens, then the ones.";
  if (d.t === "missing") return "Use the number line. Hop to the next ten first.";
  if (d.t === "equalize") return s.kind === "number" && s.role === "gap" ? "Count how far apart the piles are." : "The gap is shared between the two piles.";
  return s.kind === "pair" ? "Look for numbers that fit together to make ten." : "Add the pairs of ten.";
}
export function deepHint(d: Deep, plan: readonly Step[], at: number, stage: number): string | null {
  if (stage === 0) return null;
  if (stage === 1) return deepCue(d, plan, at);
  const s = plan[at];
  if (s.kind === "number") return stage === 2 ? `The number is ${s.value}.` : `I filled in ${s.value}. Tap Go when you are ready.`;
  if (s.kind === "trade") return "Tap the cubes to make a ten.";
  return "Try the first pair that fits.";
}
export const deepEquationA11y = (d: Deep) => deepSpoken(d);
export const valueText = (n: number) => { const v = placeValue(n); return tensOnesText(v.tens, v.ones); };
export const gapText = (a: number, b: number) => `${a} ${minus} ${b}`;
