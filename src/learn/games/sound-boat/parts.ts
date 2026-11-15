import type { CreateContext } from "../../types";
import { pickItems } from "../../skills";
import { answerCheck, answerEdit, answerHelp, type AnswerState } from "../../../puzzles/wholeAnswer";
import { buildRules, type BuildEdit, type BuildTask } from "../../reading/build";
import { admittedTask, partsTaskById, partsTasksAt, type MintedTask } from "../../reading/tasks";
import { exact, familyResult, integer, seat } from "../../kit/reading";

/**
 * Sound Boat Levels 4 and 5: build a whole word from pieces on the boat, then tap Check. Nothing is marked right or
 * wrong until Check. A miss keeps the word where it was, so there is nothing to lose by trying again.
 * A round keeps only word ids. Each word is minted again from the admitted registry when it is shown or checked, and a
 * round whose ids are not admitted is not a valid save.
 */
export const PARTS_PER_ROUND = 6;
/** Fewest words a level needs before this board replaces the older quiz. A playability floor, not the content target. */
export const PLAYABLE_FLOOR = 12;
export type PartsLevel = 4 | 5;
export type PartsState = {
  kind: "parts";
  level: PartsLevel;
  ids: string[];
  starter: 0 | 1;
  /** Word 0-5; 6 when the boat has reached the island. */
  index: number;
  answer: AnswerState<number[]>;
  /** One entry per finished word: built on the first Check with no Help. */
  clean: boolean[];
  /** She asked to hear the word again while building this one. Hearing the word is part of the task, so it marks nothing. */
  heard: boolean;
};
export type PartsAction =
  | { type: "edit"; edit: BuildEdit }
  | { type: "check" }
  | { type: "help" }
  | { type: "hear" }
  | { type: "reset" }
  | { type: "next" };
export const isParts = (s: unknown): s is PartsState => !!s && typeof s === "object" && (s as { kind?: unknown }).kind === "parts";

export const playable = () => ([4, 5] as const).every((l) => partsTasksAt(l).length >= PLAYABLE_FLOOR);
/** The word on the boat now, minted from the admitted registry by its id, or null when that id is not admitted. */
export const partsTask = (s: PartsState): MintedTask | null => partsTaskById(s.ids[Math.min(s.index, PARTS_PER_ROUND - 1)]);
export const partsDone = (s: PartsState) => s.index >= PARTS_PER_ROUND;

const startOfWord = (): AnswerState<number[]> => ({
  draft: [], revision: 0, checkedRevision: null, checks: 0, misses: 0, solved: false, helped: false, needsVariant: false, last: null,
});

/** Easier words first (fewer, shorter pieces). At Level 5, words from one base word sit side by side. */
function order(tasks: MintedTask[], level: PartsLevel): MintedTask[] {
  const easy = [...tasks].sort((a, b) => a.tiles.length - b.tiles.length || a.word.length - b.word.length || a.id.localeCompare(b.id));
  if (level === 4) return easy;
  const family = (t: BuildTask) => t.cue?.base ?? t.word;
  const seen: string[] = [];
  for (const t of easy) if (!seen.includes(family(t))) seen.push(family(t));
  return seen.flatMap((f) => easy.filter((t) => family(t) === f));
}
export function createParts(level: PartsLevel, c: CreateContext<unknown>): PartsState {
  const picked = pickItems(partsTasksAt(level), c.skills, PARTS_PER_ROUND, c.rng, c.today);
  return {
    kind: "parts",
    level,
    ids: order(picked, level).map((t) => t.id),
    starter: c.starter,
    index: 0,
    answer: startOfWord(),
    clean: [],
    heard: false,
  };
}

const MAX_REVISION = 200;
/**
 * Checks and misses saturate here instead of growing without end, so every legal sequence of Checks stays a saveable
 * state. "Ever missed" (misses above 0) and first-try truth (a clean word has no miss) are unchanged by saturation.
 */
export const MAX_COUNT = 500;
const saturated = (a: AnswerState<number[]>): AnswerState<number[]> =>
  a.checks > MAX_COUNT || a.misses > MAX_COUNT ? { ...a, checks: Math.min(a.checks, MAX_COUNT), misses: Math.min(a.misses, MAX_COUNT) } : a;
/** Edits bump a revision so a Check can tell whether the word changed since. Wrap it so it stays small; meaning is unchanged. */
function bounded(a: AnswerState<number[]>): AnswerState<number[]> {
  return a.revision > MAX_REVISION ? { ...a, revision: 0, checkedRevision: null } : a;
}
export function partsMove(s: PartsState, a: PartsAction): PartsState {
  if (partsDone(s)) return s;
  const task = partsTask(s);
  if (!admittedTask(task, "Sound Boat round")) return s;
  if (a.type === "next") {
    if (!s.answer.solved) return s;
    return { ...s, index: s.index + 1, answer: startOfWord(), clean: [...s.clean, s.answer.misses === 0 && !s.answer.helped], heard: false };
  }
  if (s.answer.solved) return s;
  if (a.type === "hear") return s.heard ? s : { ...s, heard: true };
  if (a.type === "help") {
    const answer = answerHelp(s.answer);
    return answer === s.answer ? s : { ...s, answer };
  }
  if (a.type === "reset") {
    if (!s.answer.draft.length) return s;
    return { ...s, answer: { ...s.answer, draft: [], revision: 0, checkedRevision: null, last: null } };
  }
  if (a.type === "check") {
    const answer = answerCheck(buildRules, task, s.answer, "board");
    return answer === s.answer ? s : { ...s, answer: saturated(answer) };
  }
  const answer = answerEdit(buildRules, task, s.answer, a.edit);
  return answer === s.answer ? s : { ...s, answer: bounded(answer) };
}
export const partsAssisted = (s: PartsState) => s.answer.helped || s.answer.misses > 0;

const answerKeys = ["draft", "revision", "checkedRevision", "checks", "misses", "solved", "helped", "needsVariant", "last"];
function validAnswer(v: unknown, task: BuildTask): v is AnswerState<number[]> {
  if (!exact(v, answerKeys)) return false;
  const a = v as unknown as AnswerState<number[]>;
  if (!buildRules.valid(a.draft, task) || !integer(a.revision, MAX_REVISION + 1) || !integer(a.checks, MAX_COUNT) || !integer(a.misses, MAX_COUNT) || a.misses > a.checks) return false;
  if (typeof a.solved !== "boolean" || typeof a.helped !== "boolean" || a.needsVariant !== false) return false;
  if (a.checkedRevision !== null && (!integer(a.checkedRevision, MAX_REVISION + 1) || a.checkedRevision > a.revision)) return false;
  if (a.last !== null) {
    if (!exact(a.last, ["draft", "correct"]) || !buildRules.valid(a.last.draft, task) || typeof a.last.correct !== "boolean") return false;
    if (a.checks === 0) return false;
  } else if (a.checkedRevision !== null) return false;
  // A solved word has one more Check than misses, until both saturate together at the cap.
  const counted = a.checks === a.misses + 1 || (a.checks === MAX_COUNT && a.misses === MAX_COUNT);
  if (a.solved) return counted && buildRules.complete(a.draft, task) && buildRules.accepts(a.draft, task) && a.last?.correct === true;
  return a.checks === a.misses && (a.last === null || a.last.correct === false);
}
const fresh = (a: AnswerState<number[]>) =>
  !a.draft.length && a.revision === 0 && a.checkedRevision === null && !a.checks && !a.misses && !a.solved && !a.helped && !a.last;
export function validParts(v: unknown, level: PartsLevel): v is PartsState {
  if (!exact(v, ["kind", "level", "ids", "starter", "index", "answer", "clean", "heard"])) return false;
  const s = v as unknown as PartsState;
  if (s.kind !== "parts" || s.level !== level || !seat(s.starter) || typeof s.heard !== "boolean" || !integer(s.index, PARTS_PER_ROUND)) return false;
  if (!Array.isArray(s.ids) || s.ids.length !== PARTS_PER_ROUND || new Set(s.ids).size !== PARTS_PER_ROUND) return false;
  if (!s.ids.every((id) => partsTaskById(id)?.level === level)) return false;
  if (!Array.isArray(s.clean) || s.clean.length !== s.index || !s.clean.every((b) => typeof b === "boolean")) return false;
  if (partsDone(s)) return fresh(s.answer) && !s.heard;
  const task = partsTask(s);
  return !!task && validAnswer(s.answer, task);
}
export function partsOutcome(s: PartsState, versus: boolean) {
  if (!partsDone(s)) return null;
  return versus ? familyResult(s.clean, s.starter) : ("done" as const);
}
export const partsTurn = (s: PartsState): 0 | 1 => ((s.starter + Math.min(s.index, PARTS_PER_ROUND - 1)) % 2) as 0 | 1;
