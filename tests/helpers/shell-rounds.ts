import { solveActs } from "../../src/math/kit";
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
/** Finish whichever shape a Shell Math, Number Hop or Quick Practice round has, with perfect unhelped play. */
export function finishMathRound<T>(state: T, game: "shell-math" | "number-hop" | "quick-practice" = "shell-math"): T {
  if (isShellV2(state)) return finishShell(state) as unknown as T;
  let s = state as unknown as MathRound;
  while (s.index < s.questions.length) {
    while (s.steps < questionOf(s).b) s = mathMove(s, game, { type: "step" });
    s = mathMove(s, game, { type: "answer", answer: mathAnswer(questionOf(s)) });
    s = mathMove(s, game, { type: "next" });
  }
  return s as unknown as T;
}
