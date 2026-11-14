import type { ReplayEngine, ReplayPayload } from "../../../challenge/types";
import { exactKeys, plain } from "../../../state/saveBits";
import { sha256Hex } from "../../../puzzles/sha256";
import { answerCheck, answerEdit, type AnswerState } from "../../../puzzles/wholeAnswer";
import { buildRules, draftTexts, type BuildEdit, type BuildTask } from "../../reading/build";

/**
 * The Sound Boat Challenge replay: one word, built from pieces and settled with Check. A Challenge never shows a
 * piece as right or wrong before Check. Hearing the word again is recorded as a read-aloud, which is exactly what the
 * "own read" dare forbids; Help is recorded as Help. Nothing here is timed, and a Check counts once.
 */
export type Descriptor = BuildTask;
export type Initial = { version: 1 };
export type Action = ["a", number] | ["x", number] | ["k"] | ["h"] | ["r"] | ["z"];
export type Payload = ReplayPayload<Initial, Action>;
export type State = { task: BuildTask; answer: AnswerState<number[]>; heard: boolean };
const MAX_TRAY = 8;
const fresh = (): AnswerState<number[]> => ({
  draft: [], revision: 0, checkedRevision: null, checks: 0, misses: 0, solved: false, helped: false, needsVariant: false, last: null,
});
const toEdit = (a: Action): BuildEdit => a as BuildEdit;
export const challengeEngine: ReplayEngine<Descriptor, Initial, Action, State> = {
  initial: () => ({ version: 1 }),
  validInitial: (v): v is Initial => plain(v) && exactKeys(v, ["version"]) && v.version === 1,
  create: (task) => ({ task, answer: fresh(), heard: false }),
  validAction: (v): v is Action =>
    Array.isArray(v) && Object.keys(v).length === v.length &&
    (v.length === 1 ? ["k", "h", "r", "z"].includes(v[0] as string) : v.length === 2 && (v[0] === "a" || v[0] === "x") && Number.isInteger(v[1]) && (v[1] as number) >= 0 && (v[1] as number) < MAX_TRAY),
  step: (s, a) => {
    if (s.answer.solved) return null;
    switch (a[0]) {
      case "h":
        return { state: { ...s, answer: { ...s.answer, helped: true } }, event: "help" };
      case "r":
        return s.heard ? null : { state: { ...s, heard: true }, event: "read-aloud" };
      case "z":
        // Start over clears the word but never what Check and Help already counted.
        return s.answer.draft.length ? { state: { ...s, answer: { ...s.answer, draft: [], revision: 0, checkedRevision: null, last: null } }, event: "reset" } : null;
      case "k": {
        const answer = answerCheck(buildRules, s.task, s.answer, "board");
        return answer === s.answer ? null : { state: { ...s, answer }, event: "check", correct: answer.solved };
      }
      default: {
        const answer = answerEdit(buildRules, s.task, s.answer, toEdit(a));
        if (answer === s.answer) return null;
        return { state: { ...s, answer: answer.revision > 200 ? { ...answer, revision: 0, checkedRevision: null } : answer }, event: "edit" };
      }
    }
  },
  inspect: (s) => ({
    solved: s.answer.solved,
    metrics: {},
    edits: s.answer.revision,
    solution: s.answer.solved ? sha256Hex(draftTexts(s.task, s.answer.draft).join("|")) : null,
    objectives: [],
  }),
};
