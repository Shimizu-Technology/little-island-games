import type { LearnEngine } from '../../types';
import { levelOf } from '../../levelOptions';
import { engine as legacyEngine, type LabState as LegacyState } from './legacy';
import { schoolPrograms, type LabProgram } from './content';
import { initialAttempt, validAttempt, type Attempt } from './attempt';
import { exactKeys, plain, uint } from '../../../state/saveBits';
// Kept for old fixtures and callers. New rounds use programAt and version 2 exclusively.
export { taskAt, execute, executionPlan, executionOutput, ready, correct, rendered, complete } from './legacy';
export { runPython } from './python';
export type { LabTask, ExecutionStep, WatchValue } from './legacy';
export type ModernState = { version: 2; level: number; seed: number; programs: number[]; index: number; attempt: Attempt; helped: boolean };
export type LabState = LegacyState | ModernState;
/** Two Predict and two Build programs; no repetition inside a round or from the immediately previous round.
 * A seeded Fisher-Yates shuffle avoids the old four-program rotation.
 */
export function selectPrograms(level: number, seed: number, prior: readonly number[] = []): number[] {
  let word = seed >>> 0;
  const random = () => { word = (Math.imul(word, 1664525) + 1013904223) >>> 0; return word / 4294967296; };
  const select = (mode: LabProgram['mode']) => {
    const pool = schoolPrograms[level - 1].flatMap((p, i) => p.mode === mode && !prior.includes(i) ? [i] : []);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return pool.slice(0, 2);
  };
  const [p, q] = select('predict'), [b, c] = select('build');
  return [p, b, q, c];
}
export const programAt = (s: ModernState): LabProgram => schoolPrograms[s.level - 1][s.programs[Math.min(s.index, 3)]];
export const engine: LearnEngine<LabState> = {
  ...legacyEngine, notWon: undefined, turn: undefined,
  tagline: 'Read code. Build a working plan.', description: 'Predict what real Python prints, then build and fix programs with touch choices. Ages 9–14, with deeper puzzles for older learners and adults.',
  help: 'Predict: read the code and choose what it prints before Run. Build: tap a blank line, then a value. Run checks the whole program. Undo takes back an edit. Look, One step and Clear help you follow the real trace. There is no timer.',
  levelNames: [
    { name: 'Say in order', description: 'Read the order of printed lines and build a short plan.' },
    { name: 'Scores and loops', description: 'Track changing values through every line of a loop.' },
    { name: 'Functions', description: 'Pass values, return answers and keep local values separate.' },
    { name: 'Choices and fixes', description: 'Trace if and else, and repair a decision.' },
    { name: 'Lists and patterns', description: 'Use list positions, loops and functions together.' },
  ],
  create: (o, c) => {
    const level = levelOf(o), seed = Math.floor(c.rng() * 65536), prior = c.previous?.version === 2 && c.previous.level === level ? c.previous.programs : [];
    const programs = selectPrograms(level, seed, prior);
    return { version: 2, level, seed, programs, index: 0, attempt: initialAttempt(schoolPrograms[level - 1][programs[0]]), helped: false };
  },
  validate: (v, o): v is LabState => {
    if (plain(v) && v.version === 1) return legacyEngine.validate(v, o);
    if (!plain(v) || !exactKeys(v, ['version', 'level', 'seed', 'programs', 'index', 'attempt', 'helped']) || v.version !== 2 || v.level !== levelOf(o) || !uint(v.seed, 65535) || !uint(v.index, 4) || typeof v.helped !== 'boolean' || !Array.isArray(v.programs) || v.programs.length !== 4 || new Set(v.programs).size !== 4 || !v.programs.every(i => uint(i, 15))) return false;
    const s = v as ModernState;
    if (s.programs.some((p, i) => schoolPrograms[s.level - 1][p].mode !== (i % 2 ? 'build' : 'predict'))) return false;
    return validAttempt(s.attempt, programAt(s)) && (s.index !== 4 || s.attempt.won);
  },
  outcome: s => s.index === 4 ? 'done' : null,
  helpedWork: s => s.helped || s.version === 2 && (s.attempt.help > 0 || s.attempt.failed),
};
