/**
 * Phonics scope and sequence (K5). One ordered list says what is taught at each of Sound Boat's five levels,
 * so every decodable word and text can be tagged against it and checked. Reading is never timed anywhere in
 * this kit: nothing here reads a clock, and nothing rewards speed.
 */
export type ReadingLevel = 1 | 2 | 3 | 4 | 5;
export type StepId =
  | "short-a" | "short-e" | "short-i" | "short-o" | "short-u"
  | "digraph-sh" | "digraph-ch" | "digraph-th" | "digraph-ck" | "ng" | "blend-start" | "blend-end" | "silent-e"
  | "team-ee" | "team-ea" | "team-ai" | "team-oa" | "team-oo" | "r-ar" | "r-or"
  | "compound" | "syllables" | "endings"
  | "spelling-change" | "prefixes";
export type ScopeStep = {
  id: StepId;
  level: ReadingLevel;
  /** The grown-up practice label. */
  label: string;
  /** The practice skill this step records under (see readingSkills and partsSkills). */
  skill: string;
};
export const SCOPE: readonly ScopeStep[] = [
  { id: "short-a", level: 1, label: "Short a words", skill: "read.short-a" },
  { id: "short-e", level: 1, label: "Short e words", skill: "read.short-e" },
  { id: "short-i", level: 1, label: "Short i words", skill: "read.short-i" },
  { id: "short-o", level: 1, label: "Short o words", skill: "read.short-o" },
  { id: "short-u", level: 1, label: "Short u words", skill: "read.short-u" },
  { id: "digraph-sh", level: 2, label: "The sh sound", skill: "read.digraph-sh" },
  { id: "digraph-ch", level: 2, label: "The ch sound", skill: "read.digraph-ch" },
  { id: "digraph-th", level: 2, label: "The th sound", skill: "read.digraph-th" },
  { id: "digraph-ck", level: 2, label: "The ck sound", skill: "read.digraph-ck" },
  { id: "ng", level: 2, label: "The ng sound", skill: "read.ng" },
  { id: "blend-start", level: 2, label: "Blends at the start", skill: "read.blend-start" },
  { id: "blend-end", level: 2, label: "Blends at the end", skill: "read.blend-end" },
  { id: "silent-e", level: 2, label: "Silent e words", skill: "read.silent-e" },
  { id: "team-ee", level: 3, label: "The ee team", skill: "read.vowel-team-ee" },
  { id: "team-ea", level: 3, label: "The ea team", skill: "read.vowel-team-ea" },
  { id: "team-ai", level: 3, label: "The ai team", skill: "read.vowel-team-ai" },
  { id: "team-oa", level: 3, label: "The oa team", skill: "read.vowel-team-oa" },
  { id: "team-oo", level: 3, label: "The oo team", skill: "read.vowel-team-oo" },
  { id: "r-ar", level: 3, label: "The ar sound", skill: "read.r-controlled-ar" },
  { id: "r-or", level: 3, label: "The or sound", skill: "read.r-controlled-or" },
  { id: "compound", level: 4, label: "Two words in one", skill: "read.compound" },
  { id: "syllables", level: 4, label: "Words with two or three beats", skill: "read.syllables" },
  { id: "endings", level: 4, label: "Endings that keep the base word", skill: "read.endings" },
  { id: "spelling-change", level: 5, label: "Endings that change the spelling", skill: "read.spelling-change" },
  { id: "prefixes", level: 5, label: "Word starts that change meaning", skill: "read.prefixes" },
];
/** Practice skills for the words Levels 4 and 5 build from word parts. */
export const partsSkills: Record<string, string> = Object.fromEntries(
  SCOPE.filter((s) => s.level >= 4).map((s) => [s.skill, s.label])
);
export const stepOf = (id: StepId): ScopeStep => SCOPE.find((s) => s.id === id)!;
export const stepIds: readonly StepId[] = SCOPE.map((s) => s.id);
/** Everything taught up to and including a level. Reading practice only ever asks for what has been taught. */
export const taughtThrough = (level: ReadingLevel): readonly StepId[] =>
  SCOPE.filter((s) => s.level <= level).map((s) => s.id);
export const stepsAt = (level: ReadingLevel): readonly StepId[] => SCOPE.filter((s) => s.level === level).map((s) => s.id);
export const levelOfStep = (id: StepId): ReadingLevel => stepOf(id).level;
export const stepForSkill = (skill: string): StepId | undefined => SCOPE.find((s) => s.skill === skill)?.id;
/** Pace in the shipped rounds: easy → Level 1, medium → Level 2, hard → Level 3. */
export const levelOfPace = (pace: "easy" | "medium" | "hard"): ReadingLevel => (pace === "easy" ? 1 : pace === "medium" ? 2 : 3);
