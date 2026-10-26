import type { LearnId, LearnOptions, SkillProgress } from "./types";
import { learnIds } from "./types";
import { dayNumber, recordPractice, SKILL_ID, validSkills } from "./skills";

export type LearningNote = { independent: number; helped: number; days: number[]; rounds: string[]; items: string[] };
export type Learner = { id: string; name: string; skills: SkillProgress; notes: Record<string, LearningNote>; choices: Partial<Record<LearnId, LearnOptions>> };
export type Learners = { active: string; people: Learner[] };
export const familyLearners = (): Learners => ({ active: "family", people: [{ id: "family", name: "Family practice", skills: {}, notes: {}, choices: {} }] });
export const activeLearner = (v?: Learners) => (v ?? familyLearners()).people.find(p => p.id === (v?.active ?? "family"))!;
export function addLearner(v: Learners | undefined, name: string, id: string): Learners {
  const before = v ?? familyLearners(), clean = name.trim().replace(/\s+/g, " ");
  if (before.people.length >= 5 || !clean || [...clean].length > 24 || !/^[a-z0-9-]{1,40}$/.test(id) || before.people.some(p => p.id === id || p.name.toLocaleLowerCase() === clean.toLocaleLowerCase())) return before;
  return { active: id, people: [...before.people, { id, name: clean, skills: {}, notes: {}, choices: {} }] };
}
export function selectLearner(v: Learners | undefined, id: string): Learners {
  const before = v ?? familyLearners();
  return before.active === id || !before.people.some(p => p.id === id) ? before : { ...before, active: id };
}
export function rememberLearningChoice(v: Learners | undefined, owner: string, game: LearnId, options: LearnOptions): Learners {
  const before = v ?? familyLearners();
  return { ...before, people: before.people.map(p => p.id === owner ? { ...p, choices: { ...p.choices, [game]: options } } : p) };
}
/** Called only from an accepted solo answer transition. One credit per saved question. */
export function recordLearning(v: Learners | undefined, owner: string, game: LearnId, stage: string, skill: string, item: string, round: string, helped: boolean, day = dayNumber()): Learners {
  const before = v ?? familyLearners(), p = before.people.find(p => p.id === owner);
  if (!p || before.active !== owner || !SKILL_ID.test(skill) || item.length > 160 || round.length > 120) return before;
  const key = `${game}:${stage}:${skill}`, note = p.notes[key] ?? { independent: 0, helped: 0, days: [], rounds: [], items: [] };
  const credit = `${round}:${item}`;
  if (note.items.includes(credit) || (!p.notes[key] && Object.keys(p.notes).length >= 200)) return before;
  const next: LearningNote = {
    independent: Math.min(99999, note.independent + (helped ? 0 : 1)), helped: Math.min(99999, note.helped + (helped ? 1 : 0)),
    days: helped ? note.days : [...new Set([...note.days, day])].slice(-14),
    rounds: helped ? note.rounds : [...new Set([...note.rounds, round])].slice(-14),
    items: [...note.items, credit].slice(-40),
  };
  return { ...before, people: before.people.map(person => person.id === owner ? {
    ...person, skills: recordPractice(person.skills, skill, !helped, day), notes: { ...person.notes, [key]: next },
  } : person) };
}
/** An invitation only: independent practice across three days/rounds, never auto-advance. */
export function readyForNext(p: Learner, game: LearnId, stage: string, requiredSkills: readonly string[]) {
  const notes = Object.entries(p.notes).filter(([k]) => k.startsWith(`${game}:${stage}:`)).map(([, n]) => n);
  return p.id !== "family" && requiredSkills.length > 0 && requiredSkills.every(skill => !!p.notes[`${game}:${stage}:${skill}`]) && notes.length > 0 && notes.every(n => n.independent >= 3 && n.days.length >= 3 && n.rounds.length >= 3);
}
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const bounded = (v: unknown, max: number) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
export function validLearners(v: unknown): v is Learners {
  if (!obj(v) || Object.keys(v).sort().join() !== "active,people" || typeof v.active !== "string" || !Array.isArray(v.people) || v.people.length < 1 || v.people.length > 5) return false;
  const ids = new Set<string>();
  for (const p of v.people) {
    if (!obj(p) || Object.keys(p).sort().join() !== "choices,id,name,notes,skills" || typeof p.id !== "string" || !/^[a-z0-9-]{1,40}$/.test(p.id) || ids.has(p.id) || typeof p.name !== "string" || !p.name.trim() || [...p.name].length > 24 || !validSkills(p.skills) || !obj(p.notes) || Object.keys(p.notes).length > 200 || !obj(p.choices)) return false;
    ids.add(p.id);
    if (!Object.entries(p.notes).every(([k, n]) => {
      const [game, stage, skill] = k.split(":");
      return k.split(":").length === 3 && learnIds.includes(game as LearnId) && ["easy", "medium", "hard", "stretch", "deep"].includes(stage) && SKILL_ID.test(skill ?? "") && obj(n) && Object.keys(n).sort().join() === "days,helped,independent,items,rounds" && bounded(n.independent, 99999) && bounded(n.helped, 99999) &&
        Array.isArray(n.days) && n.days.length <= 14 && new Set(n.days).size === n.days.length && n.days.every(d => bounded(d, 100000)) &&
        Array.isArray(n.rounds) && n.rounds.length <= 14 && new Set(n.rounds).size === n.rounds.length && n.rounds.every(r => typeof r === "string" && r.length <= 120) &&
        Array.isArray(n.items) && n.items.length <= 40 && new Set(n.items).size === n.items.length && n.items.every(i => typeof i === "string" && i.length <= 281);
    })) return false;
    if (!Object.entries(p.choices).every(([game, o]) => learnIds.includes(game as LearnId) && obj(o) && Object.keys(o).every(k => ["mode", "pace", "stage", "language", "mathOperation"].includes(k)) && ["solo", "together", "versus"].includes(o.mode as string) && ["easy", "medium", "hard"].includes(o.pace as string) && (o.stage === undefined || ["stretch", "deep"].includes(o.stage as string)) && (o.language === undefined || ["en", "ch"].includes(o.language as string)) && (o.mathOperation === undefined || ["add", "subtract", "mixed"].includes(o.mathOperation as string)))) return false;
  }
  return ids.has("family") && ids.has(v.active);
}
