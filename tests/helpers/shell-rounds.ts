import { solveActs, solveHop } from "../../src/math/kit";
import { answerOf } from "../../src/learn/games/quick-practice/items";
import { quickMove, quickProgress, type QuickRound } from "../../src/learn/games/quick-practice/round2";
import { hopOf, planOf } from "../../src/learn/games/number-hop/items";
import { hopMove, hopProgress, type HopRound } from "../../src/learn/games/number-hop/round2";
import { mathMove, questionOf, type MathRound } from "../../src/learn/games/shell-math/round";
import { mathAnswer } from "../../src/math/questions";
import { progress, shellMove, type ShellRound } from "../../src/learn/games/shell-math/round2";

/** True for the version-2 Shell Math round (fresh rounds); version-1 rounds are the older shape. */
export const isShellV2 = (s: unknown): s is ShellRound => !!s && typeof s === "object" && (s as { version?: number }).version === 2;

/** Play a version-2 round to its end with perfect, unhelped play. */
export function finishShell(start: ShellRound): ShellRound {
  let s = start;
  while (s.index < s.items.length) {
    const p = progress(s)!;
    for (const a of solveActs(p.plan!)) s = shellMove(s, a);
    s = shellMove(s, ["x"]);
  }
  return s;
}
/** Play a version-2 Quick Practice round to its end with perfect, unhelped play. */
export function finishQuick(start: QuickRound): QuickRound {
  let s = start;
  while (s.index < 3) {
    s = quickMove(s, ["n", answerOf(s.items[quickProgress(s)!.cur])], "mixed");
    s = quickMove(s, ["x"], "mixed");
  }
  return s;
}
/** Play a version-2 Number Hop round to its end in the fewest jumps, unhelped. */
export function finishHop(start: HopRound): HopRound {
  let s = start;
  while (s.index < s.items.length) {
    const i = s.items[s.index];
    for (const a of i[0] === 1 ? solveHop(hopOf(i, s.level)) : solveActs(planOf(i)!)) s = hopMove(s, a);
    s = hopMove(s, ["x"]);
  }
  return s;
}
/** Finish whichever shape a Shell Math, Number Hop or Quick Practice round has, with perfect unhelped play. */
export function finishMathRound<T>(state: T, game: "shell-math" | "number-hop" | "quick-practice" = "shell-math"): T {
  if (isShellV2(state)) {
    if (game === "quick-practice") return finishQuick(state as unknown as QuickRound) as unknown as T;
    if (game === "number-hop") return finishHop(state as unknown as HopRound) as unknown as T;
    return finishShell(state) as unknown as T;
  }
  let s = state as unknown as MathRound;
  while (s.index < s.questions.length) {
    while (s.steps < questionOf(s).b) s = mathMove(s, game, { type: "step" });
    s = mathMove(s, game, { type: "answer", answer: mathAnswer(questionOf(s)) });
    s = mathMove(s, game, { type: "next" });
  }
  return s as unknown as T;
}
