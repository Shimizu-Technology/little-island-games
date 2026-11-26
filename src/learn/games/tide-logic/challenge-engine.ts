/**
 * C4 Challenge engine for Tide Logic (Endless Tide and Deep Water). The same pure rules as School (rules.ts):
 * "write" turns a goal sentence into a rule, "find" names the rule behind a sorted belt, "trace" follows a given flip gate.
 */
import type { ReplayEngine, ReplayPayload } from '../../../challenge/types';
import { exactKeys, plain, uint } from '../../../state/saveBits';
import { sha256Hex } from '../../../puzzles/sha256';
import { FRAMES, complete, firstMiss, gateTrace, lookText, nearestAnswer, oneStep, routes, sorts, type FrameId, type Side } from './rules';
import type { Kind } from './generate';

export type Descriptor = { kind: Kind; frame: FrameId; target: number[]; belt: number[] };
/** A continued attempt ("Keep my plan") carries its draft and what the earlier attempt recorded. */
export type Prior = { runs: number; failed: boolean; hints: number };
export type Initial = { version: 1; draft?: number[]; prior?: Prior };
/**
 * Numbers, so the 512-action log, not the 4,096-byte session, is always the limit:
 * 0-127 set rule block `slot * 16 + option`; 128-159 send catch `i` to a bucket (`128 + i * 2 + side`); then Undo, Clear, Run (or Check), Help.
 */
export type Action = number;
export const PICK = 128, UNDO = 160, CLEAR = 161, RUN = 162, HELP = 163, UNDO_DEPTH = 24;
export const setBlock = (slot: number, option: number): Action => slot * 16 + option;
export const pick = (catchIndex: number, side: Side): Action => PICK + catchIndex * 2 + side;
export type Payload = ReplayPayload<Initial, Action>;
export type State = {
  d: Descriptor; draft: number[]; undo: number[][]; last: string | null; runs: number; misses: number; edits: number;
  miss: number | null; hint: number; hints: number; won: boolean;
  /** Help was pressed on a draft that was already right: it confirmed the answer, so the attempt counts as helped. */
  confirmed: boolean;
};
/** The answer a draft is judged against: the target's rule, or (tracing) where the gate sends each catch. */
export const answerOf = (d: Descriptor): number[] => d.kind === 'trace' ? routes(FRAMES[d.frame], d.target, d.belt) : d.target;
export const emptyDraft = (d: Descriptor) => d.kind === 'trace' ? d.belt.map(() => -1) : FRAMES[d.frame].slots.map(() => -1);
const filled = (d: Descriptor, draft: readonly number[]) => d.kind === 'trace' ? draft.length === d.belt.length && draft.every(x => x === 0 || x === 1) : complete(FRAMES[d.frame], draft);
/** The draft sorts every catch exactly as the target (with a proven belt, this is the target's behaviour) or traces every catch right. */
export function right(d: Descriptor, draft: readonly number[]): boolean {
  if (!filled(d, draft)) return false;
  if (d.kind === 'trace') { const a = answerOf(d); return draft.every((x, i) => x === a[i]); }
  return sorts(FRAMES[d.frame], draft, d.target, d.belt);
}
/** The first catch a draft gets wrong: the concrete counterexample shown after a miss. */
export function missOf(d: Descriptor, draft: readonly number[]): number | null {
  if (d.kind === 'trace') { const a = answerOf(d), i = draft.findIndex((x, k) => x !== a[k]); return i < 0 ? null : i; }
  return firstMiss(FRAMES[d.frame], draft, d.target, d.belt);
}
export function validDraft(d: Descriptor, v: unknown): v is number[] {
  if (!Array.isArray(v) || Object.keys(v).length !== v.length) return false;
  if (d.kind === 'trace') return v.length === d.belt.length && v.every(x => x === -1 || x === 0 || x === 1);
  const f = FRAMES[d.frame];
  return v.length === f.slots.length && v.every((o, i) => Number.isInteger(o) && o >= -1 && o < f.slots[i].options.length);
}
/** Help's ladder, from the same rules: Look (no change), One step (one block or catch set right), Show (the whole answer). */
export function helped(d: Descriptor, draft: readonly number[], rung: number): number[] {
  if (rung < 2) return [...draft];
  if (d.kind === 'trace') {
    const a = answerOf(d);
    if (rung >= 3) return [...a];
    const i = draft.findIndex((x, k) => x !== a[k]), next = [...draft]; if (i >= 0) next[i] = a[i]; return next;
  }
  const f = FRAMES[d.frame];
  return rung >= 3 ? nearestAnswer(f, draft, d.target) : oneStep(f, draft, d.target, d.belt) ?? [...draft];
}
const keyOf = (draft: readonly number[]) => draft.join(',');
const edited = (s: State, draft: number[], event: 'edit' | 'reset' = 'edit') => ({ state: { ...s, draft, undo: [...s.undo, s.draft].slice(-UNDO_DEPTH), edits: s.edits + 1, miss: null, hint: 0, confirmed: false }, event });
export const challengeEngine: ReplayEngine<Descriptor, Initial, Action, State> = {
  initial: () => ({ version: 1 }),
  validInitial: (v, d): v is Initial => plain(v) && v.version === 1 && Object.keys(v).every(k => ['version', 'draft', 'prior'].includes(k))
    && (!('draft' in v) || validDraft(d, v.draft))
    && (!('prior' in v) || plain(v.prior) && exactKeys(v.prior, ['runs', 'failed', 'hints']) && uint(v.prior.runs, 65535) && typeof v.prior.failed === 'boolean' && uint(v.prior.hints, 65535)),
  create: (d, initial) => ({ d, draft: initial.draft ? [...initial.draft] : emptyDraft(d), undo: [], last: null, runs: 0, misses: 0, edits: 0, miss: null, hint: 0, hints: initial.prior?.hints ?? 0, won: false, confirmed: false }),
  // Help or a miss before Keep my plan stays on the record: the continued attempt is never independent after it.
  prior: initial => initial.prior ? { runs: initial.prior.runs, failed: initial.prior.failed || initial.prior.hints > 0 } : null,
  validAction: (v): v is Action => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= HELP,
  step: (s, a, d) => {
    if (s.won) return null;
    if (a === HELP) {
      // A press with the ladder used up is refused, so Help cannot fill the log. It never looks at the draft's correctness:
      // confirming an already right draft is assistance too, so Help is no free check before Run.
      if (s.hint >= 3) return null;
      const rung = s.hint + 1, confirmed = right(d, s.draft), draft = confirmed ? [...s.draft] : helped(d, s.draft, rung), changed = keyOf(draft) !== keyOf(s.draft);
      return { state: { ...s, draft, undo: changed ? [...s.undo, s.draft].slice(-UNDO_DEPTH) : s.undo, hint: rung, hints: s.hints + 1, miss: null, confirmed }, event: 'help' };
    }
    if (a === RUN) {
      // An unchanged rerun of a draft that already ran is a no-op, as is an unfinished one.
      if (!filled(d, s.draft) || s.last === keyOf(s.draft)) return null;
      const ok = right(d, s.draft);
      return { state: { ...s, runs: s.runs + 1, misses: s.misses + (ok ? 0 : 1), last: keyOf(s.draft), won: ok, miss: ok ? null : missOf(d, s.draft) }, event: d.kind === 'trace' ? 'check' : 'run', correct: ok };
    }
    if (a === UNDO) return s.undo.length ? { state: { ...s, draft: s.undo[s.undo.length - 1], undo: s.undo.slice(0, -1), edits: s.edits + 1, miss: null, hint: 0, confirmed: false }, event: 'edit' } : null;
    if (a === CLEAR) return s.draft.every(x => x === -1) ? null : edited(s, emptyDraft(d), 'reset');
    if (a >= PICK) {
      const i = (a - PICK) >> 1, side = (a - PICK) & 1;
      if (d.kind !== 'trace' || i >= d.belt.length || s.draft[i] === side) return null;
      const draft = [...s.draft]; draft[i] = side; return edited(s, draft);
    }
    const slot = a >> 4, option = a & 15, f = FRAMES[d.frame];
    if (d.kind === 'trace' || slot >= f.slots.length || option >= f.slots[slot].options.length || s.draft[slot] === option) return null;
    const draft = [...s.draft]; draft[slot] = option; return edited(s, draft);
  },
  inspect: s => ({ solved: s.won, metrics: {}, edits: s.edits, solution: s.won ? sha256Hex(`tide|${s.d.kind}|${keyOf(s.draft)}`) : null, objectives: [] }),
};
/** True while Help still has a rung to give. Independent of whether the draft is right, so the button never hints at the answer. */
export const helpLeft = (s: State) => !s.won && s.hint < 3;
/** The words Help shows for the rung the attempt has reached. Pure, so a test can walk it. */
export function hintText(s: State): string {
  const d = s.d, f = FRAMES[d.frame];
  if (s.hint <= 0) return '';
  if (s.confirmed) return d.kind === 'trace' ? 'Every catch you traced matches the gate. Press Check.' : 'Your rule sorts every catch. Press Run.';
  if (d.kind === 'trace') {
    if (s.hint === 1) { const g = gateTrace(f, d.target, d.belt), first = g.findIndex(x => x.flips); return `Start at catch 1 with the gate pointing ${['left', 'right'][d.target[1]].toUpperCase()}. ${first < 0 ? 'No catch flips it.' : `Catch ${first + 1} is the first that flips it, as it arrives.`} After a flip the gate stays until the next flip.`; }
    return s.hint === 2 ? 'Help set one catch right. Keep following the gate from there.' : 'Help set every catch. Check to see the gate work.';
  }
  if (s.hint === 1) return lookText(f, s.draft, d.target, d.belt).text;
  return s.hint === 2 ? 'Help set one block right. Look at the rule again, then run.' : 'Help filled the rule. Press Run to watch it sort the belt.';
}
