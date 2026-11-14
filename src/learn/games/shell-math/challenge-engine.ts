import type { ReplayEngine, ReplayPayload } from "../../../challenge/types";
import { sha256Hex } from "../../../puzzles/sha256";
import { exactKeys, plain } from "../../../state/saveBits";
import { advance, initialWork, judge, planKey, validAct, type Act, type Work } from "../../../math/kit";
import { waysOf, type Descriptor } from "./challenge-task";
export type { Descriptor } from "./challenge-task";

/** A way chosen (`r`), a start-over (`z`), or any step action of the kit. */
export type Action = Act | readonly ["r", number] | readonly ["z"];
export type Initial = { version: 1 };
export type Payload = ReplayPayload<Initial, Action>;
/** `way` is the chosen route, or null while the board is still asking. */
export type State = { d: Descriptor; way: number | null; work: Work };

const whole = (v: unknown, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
export const isAction = (v: unknown): v is Action =>
  validAct(v) || (Array.isArray(v) && Object.keys(v).length === v.length && ((v.length === 1 && v[0] === "z") || (v.length === 2 && v[0] === "r" && whole(v[1], 3))));
export const fresh = (d: Descriptor): State => ({ d, way: waysOf(d).length === 1 ? 0 : null, work: initialWork() });

/** Stage of the puzzle a move belongs to: the last number of a plan is the one "check". */
export const challengeEngine: ReplayEngine<Descriptor, Initial, Action, State> = {
  initial: () => ({ version: 1 }),
  validInitial: (v): v is Initial => plain(v) && exactKeys(v, ["version"]) && v.version === 1,
  create: (d) => fresh(d),
  validAction: isAction,
  step: (s, a, d) => {
    const ways = waysOf(d);
    if (a[0] === "z") {
      const start = fresh(d);
      return s.way === start.way && s.work.moves === 0 && s.work.hint === 0 && !s.work.choices ? null : { state: start, event: "reset" };
    }
    if (s.way === null) {
      if (a[0] !== "r" || (a[1] as number) >= ways.length) return null;
      return { state: { ...s, way: a[1] as number }, event: "edit" };
    }
    if (a[0] === "r") return null;
    const plan = ways[s.way].plan, verdict = judge(plan, s.work, a);
    if (verdict === "ignored") return null;
    const work = advance(plan, s.work, a);
    if (verdict === "help") return { state: { ...s, work }, event: "help" };
    const step = plan[s.work.at], last = s.work.at === plan.length - 1;
    if (step.kind === "count" || step.kind === "trade") return { state: { ...s, work }, event: "edit" };
    return { state: { ...s, work }, event: step.kind === "number" && last ? "check" : "run", correct: verdict === "ok" };
  },
  inspect: (s, d) => {
    const ways = waysOf(d), solved = s.work.solved && s.way !== null;
    return {
      solved, metrics: { steps: s.work.moves }, edits: s.work.moves,
      solution: solved ? sha256Hex(`shell-math|${planKey(ways[s.way!].plan)}`) : null,
      objectives: [],
    };
  },
};
