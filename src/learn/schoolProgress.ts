import type { LearnId, LearnSession } from './types';
import { learnIds } from './types';
import { engines } from './engines';
import { finished } from './session';
import { growthProgress, growthQuestions, isGrowth } from './growth/engine';
import type { GrowthState } from './growth/types';
import { levelOf, type LearningLevel } from './levels';
import { dayNumber } from './skills';
import type { Learner } from './learners';
/** Enough to stop one round being credited twice; the counts carry the totals. */
const keptRounds = 6;
export type LevelRecord = { stars: 1 | 2 | 3; completed: number; independent: number; days: number[]; rounds: string[] };
export type SchoolProgress = Partial<Record<LearnId, Partial<Record<LearningLevel, LevelRecord>>>>;
/** No clock, speed or score: completion, independent work, then a return on another day. Family practice is shared, so it isn't one child's independent work. */
export function independentRound(round: LearnSession): boolean {
  if ((round.learner ?? 'family') === 'family' || round.options.mode !== 'solo' || round.levelHelped !== false || engines[round.game].notWon?.(round.state, round.options)) return false;
  if (isGrowth(round.state) && growthProgress(round.state as GrowthState, growthQuestions(round.game, round.options, round.state as GrowthState)).clean.some(clean => !clean)) return false;
  return !(round.game === 'hafa-adai' && !round.options.stage && (round.state as { activity: string }).activity !== 'spy');
}
/** What this finished round shows: a lost round none, a helped round one, independent work the level's best. */
export function roundStars(round: LearnSession, best: number): number {
  if (engines[round.game].notWon?.(round.state, round.options)) return 0;
  return independentRound(round) ? best : 1;
}
export function creditSchool(progress: SchoolProgress = {}, round: LearnSession, day = dayNumber()): SchoolProgress {
  if (!finished(round)) return progress;
  const level = levelOf(round.options), before = progress[round.game]?.[level];
  if (before?.rounds.includes(round.id)) return progress;
  const clean = independentRound(round), days = [...new Set([...(before?.days ?? []), ...(clean ? [day] : [])])].slice(-14);
  const independent = Math.min(99999, (before?.independent ?? 0) + Number(clean));
  const stars = Math.max(before?.stars ?? 1, independent >= 2 && days.length >= 2 ? 3 : independent ? 2 : 1) as 1 | 2 | 3;
  return { ...progress, [round.game]: { ...progress[round.game], [level]: { stars, completed: Math.min(99999, (before?.completed ?? 0) + 1), independent, days, rounds: [...(before?.rounds ?? []), round.id].slice(-keptRounds) } } };
}
/** Only exact completed-round notes are evidence. Warm-up totals and remembered choices aren't. */
export function backfillSchool(learner: Learner, rounds: Partial<Record<LearnId, LearnSession>>): SchoolProgress {
  let progress: SchoolProgress = {};
  for (const round of Object.values(rounds)) if (finished(round)) progress = creditSchool(progress, { ...round, levelHelped: undefined });
  for (const [key, note] of Object.entries(learner.notes)) {
    const [game, stage, skill] = key.split(':');
    if (!['think.level-round', 'think.level-round-v2'].includes(skill)) continue;
    const completed = note.items.filter(item => item.endsWith(':completed-round')).map(item => item.slice(0, -':completed-round'.length)).filter(id => id.length > 0 && id.length <= 120);
    if (!completed.length) continue;
    const level = (['easy', 'medium', 'hard', 'stretch', 'deep'].indexOf(stage) + 1) as LearningLevel;
    if (!level || !learnIds.includes(game as LearnId)) continue;
    // Old notes don't pair each day/assistance flag with a round: retain only provable evidence.
    const independent = learner.id !== 'family' && note.helped === 0 ? completed.length : 0;
    const before = progress[game as LearnId]?.[level];
    progress = { ...progress, [game]: { ...progress[game as LearnId], [level]: {
      stars: Math.max(before?.stars ?? 1, independent ? 2 : 1), completed: Math.max(before?.completed ?? 0, completed.length), independent,
      days: [], rounds: [...new Set([...(before?.rounds ?? []), ...completed])].slice(-keptRounds),
    } } };
  }
  return progress;
}
export function validSchool(v: unknown): v is SchoolProgress {
  const obj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
  const count = (x: unknown, max: number) => Number.isInteger(x) && Number(x) >= 0 && Number(x) <= max;
  return obj(v) && Object.entries(v).every(([game, levels]) => learnIds.includes(game as LearnId) && obj(levels) && Object.entries(levels).every(([level, r]) => /^[1-5]$/.test(level) && obj(r) && Object.keys(r).sort().join() === 'completed,days,independent,rounds,stars' && typeof r.stars === "number" && [1,2,3].includes(r.stars) && count(r.completed,99999) && Number(r.completed) > 0 && count(r.independent,Number(r.completed)) && Array.isArray(r.days) && r.days.length <= 14 && new Set(r.days).size === r.days.length && r.days.every(d => count(d,100000)) && Array.isArray(r.rounds) && r.rounds.length > 0 && r.rounds.length <= keptRounds && new Set(r.rounds).size === r.rounds.length && r.rounds.every(id => typeof id === 'string' && id.length > 0 && id.length <= 120) && (r.stars === 1 || Number(r.independent) >= (r.stars === 3 ? 2 : 1)) && (r.stars !== 3 || r.days.length >= 2)));
}
