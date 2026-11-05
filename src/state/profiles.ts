import { engines as learningEngines } from "../learn/engines";
import { games } from "../games";
import { catalog as boardCatalog } from "../board";
import { parseSave, type Save } from './validation';
import { familyLearners, type Learners } from '../learn/learners';
import { backfillSchool, creditSchool, validSchool, type SchoolProgress } from '../learn/schoolProgress';
import { libraryChild, newLibraryChild, validLegacyExplore, type LegacyExplore } from '../library/state';
import { validSkills } from '../learn/skills';
import { validWordRecords } from './wordRecords';
import { validActivityRecords } from './activities';
import type { LearnId, SkillProgress } from '../learn/types';
import { arcadeIds } from '../arcade/types';

/** Top-level game fields are the active learner's view. Only these canonical slots are encoded. */
export type ProfileProgress = Pick<Save, 'sessions' | 'recent' | 'learn' | 'board' | 'activities' | 'recentLearn' | 'recentBoard' | 'recentActivity' | 'favoriteGames' | 'coached' | 'wordRecords' | 'raceRecords'> & { recentArcade?: import('../arcade').ArcadeId | null; school?: SchoolProgress };
export type EarlierWork = { rounds: ProfileProgress; explore?: LegacyExplore; exploreUntouched?: string[]; skills?: SkillProgress; preferences?: Pick<ProfileProgress, 'favoriteGames' | 'coached' | 'recent' | 'recentLearn' | 'recentBoard' | 'recentActivity' | 'recentArcade'> };
export type Profiles = { version: 1; people: Record<string, ProfileProgress>; earlier: { wordRecords?: Save['wordRecords']; raceRecords?: Save['raceRecords'] }; unassigned: EarlierWork };
const fields = ['sessions','recent','learn','board','activities','recentLearn','recentBoard','recentActivity','favoriteGames','coached','wordRecords','raceRecords','school'] as const;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
export const emptyProfile = (): ProfileProgress => ({ sessions: {}, recent: null });
export function captureProfile(save: Save): ProfileProgress {
  const result: ProfileProgress = emptyProfile();
  for (const field of fields) if (save[field] !== undefined) Object.assign(result, { [field]: save[field] });
  if (save.arcade?.recent !== undefined) result.recentArcade = save.arcade.recent;
  return result;
}
export function syncProfile(save: Save): Save {
  if (!save.profiles) return save;
  const id = save.learning?.active ?? 'family';
  return { ...save, profiles: { ...save.profiles, people: { ...save.profiles.people, [id]: captureProfile(save) } } };
}
/** Projection also builds matching owner tags; an inactive round never reaches a screen. */
export function projectProfile(save: Save, learning: Learners = save.learning ?? familyLearners()): Save {
  if (!save.profiles) return { ...save, learning };
  const profile = save.profiles.people[learning.active] ?? emptyProfile();
  const next = { ...save, learning };
  for (const field of fields) delete next[field];
  Object.assign(next, emptyProfile(), profile);
  delete (next as Save & { recentArcade?: unknown }).recentArcade;
  if (next.arcade) next.arcade = { ...next.arcade, recent: profile.recentArcade ?? null };
  const rounds = Object.fromEntries(Object.entries(save.roundOwners?.rounds ?? {}).filter(([key]) => key.startsWith('explore:')));
  for (const [kind, entries] of [['classic',next.sessions],['board',next.board],['activity',next.activities]] as const)
    for (const [game, round] of Object.entries(entries ?? {})) if (round) rounds[`${kind}:${game}`] = { round: round.id, owner: learning.active };
  next.roundOwners = { version: 1, rounds };
  return next;
}
/** No duplicate active round payload in storage/backups, leaving the same 2 MB envelope. */
export function encodeSave(save: Save): string {
  if (!save.profiles) return JSON.stringify(save);
  const next: Save = { ...syncProfile(save), version: 2 };
  for (const field of fields) delete next[field];
  next.sessions = {}; next.recent = null;
  if (next.arcade) next.arcade = { ...next.arcade, recent: null };
  // Classic owner tags are a runtime view; canonical profile membership establishes ownership.
  next.roundOwners = { version: 1, rounds: Object.fromEntries(Object.entries(next.roundOwners?.rounds ?? {}).filter(([key]) => key.startsWith('explore:'))) };
  return JSON.stringify(next);
}
export function migrateProfiles(save: Save): Save {
  if (save.profiles) return projectProfile({ ...save, version: 2 });
  const learning = save.learning ?? familyLearners(), people = Object.fromEntries(learning.people.map(p => [p.id, emptyProfile()]));
  const unassigned: EarlierWork = { rounds: emptyProfile() };
  for (const [game, round] of Object.entries(save.learn ?? {})) if (round) {
    const owner = round.learner ?? 'family';
    people[owner].learn = { ...people[owner].learn, [game]: round };
    // Kept as a recovery/assignment copy, never copied into several children's live work.
    if (round.learner === undefined) unassigned.rounds.learn = { ...unassigned.rounds.learn, [game]: round };
  }
  for (const [kind, field] of [['classic','sessions'],['board','board'],['activity','activities']] as const) {
    for (const [game, round] of Object.entries(save[field] ?? {})) if (round) {
      const tag = save.roundOwners?.rounds[`${kind}:${game}`], owner = tag && tag.round === round.id ? tag.owner : undefined;
      const target = owner && people[owner] ? people[owner] : unassigned.rounds;
      Object.assign(target, { [field]: { ...target[field], [game]: round } });
    }
  }
  const preferences = { favoriteGames: save.favoriteGames, coached: save.coached, recent: save.recent, recentLearn: save.recentLearn, recentBoard: save.recentBoard, recentActivity: save.recentActivity, recentArcade: save.arcade?.recent };
  if (Object.values(preferences).some(v => v != null && (!Array.isArray(v) || v.length))) unassigned.preferences = clone(preferences);
  if (save.library?.archive?.explore || save.explore) {
    unassigned.explore = clone(save.library?.archive?.explore ?? save.explore!);
    unassigned.exploreUntouched = learning.people.filter(p => !save.library?.profiles[p.id]).map(p => p.id);
  }
  if (save.skills && Object.keys(save.skills).length) unassigned.skills = clone(save.skills);
  for (const p of learning.people) people[p.id].school = backfillSchool(p, Object.fromEntries(Object.entries(people[p.id].learn ?? {}).filter(([,r]) => r?.learner !== undefined)));
  const profiles: Profiles = { version: 1, people, earlier: { ...(save.wordRecords ? { wordRecords: save.wordRecords } : {}), ...(save.raceRecords ? { raceRecords: save.raceRecords } : {}) }, unassigned };
  return projectProfile({ ...save, version: 2, learning, profiles });
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
/** Reuse every real engine validator through a legacy envelope, without recursive profile data. */
function validProgress(v: unknown, learning: Learners, owner?: string): v is ProfileProgress {
  if (!object(v) || Object.keys(v).some(k => ![...fields,'recentArcade'].includes(k as typeof fields[number])) || !Object.hasOwn(v,'sessions') || !Object.hasOwn(v,'recent') || (v.school !== undefined && !validSchool(v.school)) || (v.recentArcade !== undefined && v.recentArcade !== null && !arcadeIds.includes(v.recentArcade as import('../arcade').ArcadeId))) return false;
  try {
    const test = parseSave(JSON.stringify({ version: 1, settings: {sound:true,help:true}, ...v, learning }));
    return !owner || Object.values(test.learn ?? {}).every(round => (round?.learner ?? 'family') === owner);
  } catch { return false; }
}
export function validProfiles(v: unknown, learning = familyLearners()): v is Profiles {
  if (!object(v) || Object.keys(v).sort().join() !== 'earlier,people,unassigned,version' || v.version !== 1 || !object(v.people) || Object.keys(v.people).length !== learning.people.length || !learning.people.every(p => Object.hasOwn(v.people as object,p.id)) || !Object.entries(v.people).every(([id,p]) => validProgress(p,learning,id)) || !object(v.earlier) || Object.keys(v.earlier).some(k => !['wordRecords','raceRecords'].includes(k)) || (v.earlier.wordRecords !== undefined && !validWordRecords(v.earlier.wordRecords)) || (v.earlier.raceRecords !== undefined && !validActivityRecords(v.earlier.raceRecords)) || !object(v.unassigned)) return false;
  // A round can have one live owner. The explicit recovery bucket may retain an original.
  const seen = new Set<string>();
  for (const profile of Object.values(v.people) as ProfileProgress[]) for (const field of ['learn','sessions','board','activities'] as const)
    for (const [game, round] of Object.entries(profile[field] ?? {})) if (round) {
      const key = `${field}:${game}:${round.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
    }
  const u = v.unassigned;
  return Object.keys(u).every(k => ['rounds','explore','exploreUntouched','skills','preferences'].includes(k)) && validProgress(u.rounds,learning) && (u.explore === undefined || validLegacyExplore(u.explore)) && (u.exploreUntouched === undefined || Array.isArray(u.exploreUntouched) && new Set(u.exploreUntouched).size === u.exploreUntouched.length && u.exploreUntouched.every(id => typeof id === 'string' && learning.people.some(p => p.id === id))) && (u.skills === undefined || validSkills(u.skills)) && (u.preferences === undefined || object(u.preferences) && Object.keys(u.preferences).every(k => ['favoriteGames','coached','recent','recentLearn','recentBoard','recentActivity','recentArcade'].includes(k)) && validProgress({ sessions:{}, recent:null, ...u.preferences },learning));
}
export type Assignment = { key: string; label: string };
export function pendingAssignments(save: Save): Assignment[] {
  const u = save.profiles?.unassigned;
  if (!u) return [];
  const rows: Assignment[] = [];
  const activities: Record<string,string> = { 'go-fish':'Go Fish', 'crazy-eights':'Crazy Eights', racer:'Island Dash', 'word-imposter':'Secret Word', 'island-mystery':'Picnic Mystery' };
  for (const field of ['learn','sessions','board','activities'] as const) for (const game of Object.keys(u.rounds[field] ?? {})) {
    const name = field === 'learn' ? learningEngines[game as LearnId].name : field === 'sessions' ? games[game as import('../games').GameId].name : field === 'board' ? boardCatalog[game as import('../board').BoardId].name : activities[game];
    rows.push({ key: `${field}:${game}`, label: `Earlier ${name} round` });
  }
  if (u.explore) rows.push({ key:'explore', label:'Earlier family discoveries' });
  if (u.skills) rows.push({ key:'skills', label:'Earlier family practice signals' });
  if (u.preferences) rows.push({ key:'preferences', label:'Earlier favorites and recent places' });
  return rows;
}
/** Grown-up choice, no owner inference and no replacement of a child's newer paused round. */
export function assignEarlier(save: Save, key: string, owner: string): Save {
  if (!save.profiles || !save.learning?.people.some(p => p.id === owner) || !pendingAssignments(save).some(p => p.key === key)) return save;
  const current = syncProfile(save), profiles = clone(current.profiles!), target = profiles.people[owner], u = profiles.unassigned;
  let next = { ...current, profiles };
  if (key.includes(':')) {
    const [field, game] = key.split(':') as ['learn'|'sessions'|'board'|'activities', string];
    const source = u.rounds[field] as Record<string, {id:string;learner?:string}>, slots = (target[field] ?? {}) as Record<string, {id:string;learner?:string}>;
    let round = source[game];
    if (!round || slots[game] && slots[game].id !== round.id) return save;
    if (field === 'learn') {
      const family = profiles.people.family.learn?.[game as LearnId];
      if (family?.id === round.id) { round = family; delete profiles.people.family.learn![game as LearnId]; }
    }
    Object.assign(target, { [field]: { ...target[field], [game]: field === 'learn' ? { ...round, learner: owner } : round } });
    if (field === 'learn') target.school = creditSchool(target.school, { ...round, learner: owner } as import('../learn/types').LearnSession);
    delete source[game];
  } else if (key === 'explore') {
    const old = u.explore!, before = libraryChild(next.library,owner), empty = newLibraryChild();
    const labs = { ...before.labs }, untouched = !next.library?.profiles[owner] || (u.exploreUntouched?.includes(owner) ?? false);
    for (const world of Object.keys(labs) as (keyof typeof labs)[]) if (untouched && JSON.stringify(labs[world]) === JSON.stringify(empty.labs[world]) && old.progress) labs[world] = clone(old.progress.labs[world]);
    const recent = old.progress ? [old.progress.location,...old.progress.history].flatMap(l => l.kind === 'topic' ? [l.id] : []) : [];
    const child = { ...before, labs, saved:[...new Set([...before.saved,...old.favorites])], recent:[...new Set([...before.recent,...recent])].slice(0,24), query:untouched ? old.progress?.query ?? before.query : before.query, positions:untouched ? { ...old.progress?.positions,...before.positions } : before.positions, ...(untouched && old.progress?.location.kind === 'topic' ? { current: old.progress.location.id } : {}) };
    next = { ...next, library: { ...next.library!, profiles: { ...next.library?.profiles, [owner]: child } } };
    delete u.explore; delete u.exploreUntouched;
  } else if (key === 'skills') {
    next = { ...next, learning: { ...next.learning!, people: next.learning!.people.map(p => p.id === owner ? { ...p, skills:{ ...u.skills,...p.skills } } : p) } };
    delete u.skills;
  } else {
    const prefs = u.preferences!;
    target.favoriteGames = [...new Set([...(target.favoriteGames ?? []),...(prefs.favoriteGames ?? [])])];
    // First-time coaching always starts fresh; history is not evidence that this child saw it.
    for (const field of ['recent','recentLearn','recentBoard','recentActivity','recentArcade'] as const) if (target[field] == null && prefs[field] != null) Object.assign(target,{[field]:prefs[field]});
    delete u.preferences;
  }
  return projectProfile(next);
}
