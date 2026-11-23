import type { ReplayEngine, ReplayPayload } from '../../../challenge/types';
import { exactKeys, plain } from '../../../state/saveBits';
import { sha256Hex } from '../../../puzzles/sha256';
import { initialAttempt, step, validAction, type Action, type Attempt } from './attempt';
import type { LabProgram } from './content';
export type { Action } from './attempt';
export type Initial = { version: 1 };
export type State = Attempt & { descriptor: LabProgram };
export type Payload = ReplayPayload<Initial, Action>;
export const challengeEngine: ReplayEngine<LabProgram, Initial, Action, State> = {
  initial: () => ({ version: 1 }),
  validInitial: (v): v is Initial => plain(v) && exactKeys(v, ['version']) && v.version === 1,
  validAction,
  create: d => ({ ...initialAttempt(d), descriptor: d }),
  step: (s, a, d) => {
    const next = step(s, a, d); if (!next) return null;
    return { state: { ...next, descriptor: d }, event: a[0] === 'h' ? 'help' : a[0] === 'c' ? d.mode === 'predict' ? 'check' : 'run' : a[0] === 'z' ? 'reset' : 'edit', ...(a[0] === 'c' ? { correct: next.won } : {}) };
  },
  inspect: s => ({ solved: s.won, metrics: {}, edits: s.edits, solution: s.won ? sha256Hex(JSON.stringify(s.descriptor.mode === 'predict' ? s.prediction : s.picks)) : null, objectives: [] }),
};
