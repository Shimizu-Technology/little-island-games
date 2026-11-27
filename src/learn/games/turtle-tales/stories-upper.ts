import type { CreateContext } from "../../types";
import type { ReadingQuestion } from "../../reading/provenance";
import { bools, exact, integer, seat } from "../../kit/reading";

/**
 * Turtle Tales Levels 4 & 5: interactive storybook passage board built exclusively from
 * the pinned, frozen, branded inherited `readingGrowthTracks()["turtle-tales"]` records.
 * On opt-in Help, the exact supporting sentence inside the passage lights up — never before
 * the child asks. Completely untimed; pure state & validation.
 */
export type PassageLevel = 4 | 5;
export type PassageSkill = "read.tale-sequence" | "read.tale-inference" | "read.tale-motive" | "read.tale-evidence";

export type PassagePrompt = {
  id: string;
  skill: PassageSkill;
  skillLabel: string;
  question: string;
  options: readonly [string, string, string];
  correctIndex: number;
  evidence: string;
  reason: string;
  /** The pinned, branded ReadingQuestion record backing this prompt (checked by `admittedReading`). */
  record: ReadingQuestion;
};

export type UpperStory = {
  id: string;
  level: PassageLevel;
  title: string;
  body: string;
  /** The pinned, branded ReadingQuestion records backing every line of this story. */
  records: readonly ReadingQuestion[];
  prompts: readonly PassagePrompt[];
};

/** Derive a display prompt directly from a verified, branded `ReadingQuestion` record. */
export function passagePromptFromRecord(q: ReadingQuestion): PassagePrompt {
  const quote = q.explanation.match(/^The passage says, "([^"]+)" (.+)$/);
  const labels = q.choices.map((c) => c.label);
  return {
    id: q.id,
    skill: q.skill as PassageSkill,
    skillLabel: q.skillLabel,
    question: q.prompt,
    options: [labels[0] ?? "", labels[1] ?? "", labels[2] ?? ""] as const,
    correctIndex: 0,
    evidence: quote?.[1] ?? "",
    reason: quote?.[2] ?? q.explanation,
    record: q,
  };
}

/** Group the 8 pinned inherited L4–5 growth stories (24 branded ReadingQuestions) into UpperStory records. */
export function inheritedUpperStories(
  stretchQuestions: readonly ReadingQuestion[],
  deepQuestions: readonly ReadingQuestion[],
): UpperStory[] {
  const group = (level: PassageLevel, qs: readonly ReadingQuestion[]): UpperStory[] => {
    const byStory = new Map<string, ReadingQuestion[]>();
    for (const q of qs) {
      const storyId = q.id.replace(/-(sequence|inference|motive|evidence)$/, "");
      const list = byStory.get(storyId) ?? [];
      list.push(q);
      byStory.set(storyId, list);
    }
    return [...byStory.entries()].map(([id, items]) => ({
      id,
      level,
      title: items[0].scene?.labels?.[0] ?? id,
      body: items[0].context ?? "",
      records: items,
      prompts: items.map(passagePromptFromRecord),
    }));
  };
  return [...group(4, stretchQuestions), ...group(5, deepQuestions)];
}

/** Deterministic option shuffle order for a prompt so the answer isn't always first. */
export function promptOptionOrder(promptId: string): [number, number, number] {
  const order: [number, number, number] = [0, 1, 2];
  let h = 2166136261;
  for (const ch of promptId) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  for (let i = 2; i > 0; i--) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const j = h % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export type PassageState = {
  kind: "passage";
  level: PassageLevel;
  storyId: string;
  starter: 0 | 1;
  /** Question 0..2; equal to prompt count when finished. */
  index: number;
  /** Option index (0..2 in original options) tried wrongly on this question, or null. */
  wrong: number | null;
  /** True once a wrong option has been tried on this question; preserved through a correct retry until Next. */
  missed: boolean;
  /** True once the child tapped "Show evidence" (opt-in Help) on this question. */
  showEvidence: boolean;
  /** True once the child picked the right answer and is ready for Next. */
  solved: boolean;
  /** One entry per completed question: true iff right on first try without Help. */
  clean: boolean[];
};

export const isPassage = (s: unknown): s is PassageState =>
  !!s && typeof s === "object" && (s as { kind?: unknown }).kind === "passage";

export const passageDone = (s: PassageState, story: UpperStory | undefined) =>
  !story || s.index >= story.prompts.length;

export const passageTurn = (s: PassageState, story: UpperStory | undefined): 0 | 1 =>
  ((s.starter + Math.min(s.index, Math.max(0, (story?.prompts.length ?? 1) - 1))) % 2) as 0 | 1;

export function createPassage(
  level: PassageLevel,
  stories: readonly UpperStory[],
  c: CreateContext<unknown>,
): PassageState {
  const prevId = isPassage(c.previous) ? c.previous.storyId : undefined;
  const pool = stories.filter((st) => st.level === level);
  const fresh = pool.filter((st) => st.id !== prevId);
  const list = fresh.length ? fresh : pool;
  const idx = Math.min(list.length - 1, Math.max(0, Math.floor(c.rng() * list.length)));
  return {
    kind: "passage",
    level,
    storyId: list[idx].id,
    starter: c.starter,
    index: 0,
    wrong: null,
    missed: false,
    showEvidence: false,
    solved: false,
    clean: [],
  };
}

export function passagePick(s: PassageState, optionIndex: number, story: UpperStory | undefined): PassageState {
  if (!story || passageDone(s, story) || s.solved || !integer(optionIndex, 2)) return s;
  const prompt = story.prompts[s.index];
  if (optionIndex === prompt.correctIndex) {
    return { ...s, solved: true, wrong: null };
  }
  return s.wrong === optionIndex && s.missed ? s : { ...s, wrong: optionIndex, missed: true };
}

export function passageHelp(s: PassageState, story: UpperStory | undefined): PassageState {
  if (!story || passageDone(s, story) || s.solved || s.showEvidence) return s;
  return { ...s, showEvidence: true };
}

export function passageNext(s: PassageState, story: UpperStory | undefined): PassageState {
  if (!story || !s.solved || passageDone(s, story)) return s;
  return {
    ...s,
    index: s.index + 1,
    wrong: null,
    missed: false,
    showEvidence: false,
    solved: false,
    clean: [...s.clean, !s.missed && !s.showEvidence],
  };
}

export function validPassage(
  v: unknown,
  level: PassageLevel,
  lookup: (id: unknown) => UpperStory | undefined,
): v is PassageState {
  if (!exact(v, ["kind", "level", "storyId", "starter", "index", "wrong", "missed", "showEvidence", "solved", "clean"])) {
    return false;
  }
  const s = v as unknown as PassageState;
  const story = lookup(s.storyId);
  if (
    s.kind !== "passage" ||
    s.level !== level ||
    !story ||
    story.level !== level ||
    !seat(s.starter) ||
    !integer(s.index, story.prompts.length) ||
    (s.wrong !== null && !integer(s.wrong, 2)) ||
    typeof s.missed !== "boolean" ||
    typeof s.showEvidence !== "boolean" ||
    typeof s.solved !== "boolean" ||
    !bools(s.clean, s.index)
  ) {
    return false;
  }
  if (s.index === story.prompts.length) return s.wrong === null && !s.missed && !s.showEvidence && !s.solved;
  if (s.solved) return s.wrong === null;
  if (s.wrong !== null && (s.wrong === story.prompts[s.index].correctIndex || !s.missed)) return false;
  return true;
}

/** Split passage into [before, evidence, after] so opt-in Help highlights the exact supporting quote. */
export function splitEvidence(body: string, evidence: string): [string, string, string] {
  if (!evidence) return [body, "", ""];
  const at = body.indexOf(evidence);
  if (at < 0) return [body, "", ""];
  return [body.slice(0, at), evidence, body.slice(at + evidence.length)];
}
