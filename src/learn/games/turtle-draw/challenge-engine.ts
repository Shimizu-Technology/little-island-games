import { applyOperations, validOperations, type Operation } from '../../program/operations';
import { decodeProgram, encodeProgram, type PackedProgram } from '../../program/codec';
import { nodeCost, type Program } from '../../program/model';
import type { ReplayEngine, ReplayPayload } from '../../../challenge/types';
import { exactKeys, plain, uint } from '../../../state/saveBits';
import { sha256Hex } from '../../../puzzles/sha256';
import { draw, type Block, type Point } from './engine';
import { blockCost } from './dsl';
import { deepCodes, readTurtleDraft, turtleProgram } from './program';
import { samePicture } from './picture';
import { DEEP_COUNTS } from './mincost';
import { editText, nearestEdit } from './distance';

/** C2c Deep Water. A "draw it" puzzle is built in the block editor within a tray; a "predict" puzzle names one of four pictures before anything is drawn. */
export type BuildDescriptor = { kind: 'build'; step: number; target: Block[]; winners: Block[][]; origin: Point; tray: number };
export type PredictDescriptor = { kind: 'predict'; step: number; program: Block[]; choices: Block[][]; answer: number; origin: Point; kinds: string[] };
export type Descriptor = BuildDescriptor | PredictDescriptor;
export type Prior = { runs: number; failed: boolean; edits: number; hints: number };
export type Initial = { version: 1; draft?: PackedProgram; prior?: Prior };
/** Block edits, Go, Help, Reset (draw it); pick a picture, Check, Help (predict). */
export type Action = ['e', Operation[]] | ['s', number] | ['g' | 'h' | 'z' | 'c'];
export type Payload = ReplayPayload<Initial, Action>;
export type State = {
  descriptor: Descriptor; draft: PackedProgram | null; program: Block[]; edits: number; runs: number; won: boolean;
  hintStage: number; hints: number; pick: number | null; wrong: number[]; ruled: number[];
};

const empty = () => turtleProgram([], deepCodes);
/** What the editor will accept and the replay will keep: Deep Water blocks only, no songs, within the tray and the 120-line limit. */
export function admit(draft: unknown, d: BuildDescriptor): { program: Program; blocks: Block[] } | null {
  const read = readTurtleDraft(draft, deepCodes);
  if (!read || read.program.songs.length) return null;
  // Check the saved tree itself: turtleBlocks drops empty Repeats and flattens groups, which would hide an illegal count or node.
  const clean = (nodes: Program['body']): boolean => nodes.every(n => n.kind === 'command' ? n.command < deepCodes.length : n.kind === 'repeat' && (DEEP_COUNTS as readonly number[]).includes(n.times) && clean(n.body));
  if (!clean(read.program.body) || nodeCost(read.program) > d.tray || (read.blocks.length > 0 && !draw(read.blocks, d.origin))) return null;
  return read;
}
/** The picture is right and the tray holds it. A different plan that draws the same picture counts. */
export function solvesBuild(d: BuildDescriptor, program: Block[]): boolean {
  const a = draw(d.target, d.origin), b = program.length ? draw(program, d.origin) : null;
  return !!a && !!b && blockCost(program) <= d.tray && samePicture(a, b);
}
const packedOf = (program: Program): PackedProgram => encodeProgram(program);
export const challengeEngine: ReplayEngine<Descriptor, Initial, Action, State> = {
  initial: () => ({ version: 1 }),
  validInitial: (v, d): v is Initial => plain(v) && v.version === 1 && Object.keys(v).every(k => ['version', 'draft', 'prior'].includes(k))
    && (!('draft' in v) || d.kind === 'build' && !!admit(v.draft, d))
    && (!('prior' in v) || d.kind === 'build' && plain(v.prior) && exactKeys(v.prior, ['runs', 'failed', 'edits', 'hints']) && uint(v.prior.runs, 65535) && typeof v.prior.failed === 'boolean' && uint(v.prior.edits, 65535) && uint(v.prior.hints, 65535)),
  create: (d, initial) => {
    const read = d.kind === 'build' && initial.draft ? admit(initial.draft, d) : null;
    return { descriptor: d, draft: initial.draft ?? null, program: read?.blocks ?? [], edits: initial.prior?.edits ?? 0, runs: 0, won: false, hintStage: Math.min(3, initial.prior?.hints ?? 0), hints: initial.prior?.hints ?? 0, pick: null, wrong: [], ruled: [] };
  },
  // Help used before Keep my plan stays on the record: a continued attempt is never independent after it.
  prior: initial => initial.prior ? { runs: initial.prior.runs, failed: initial.prior.failed || initial.prior.hints > 0 } : null,
  validAction: (v): v is Action => Array.isArray(v) && Object.keys(v).length === v.length && (
    v[0] === 'e' ? v.length === 2 && validOperations(v[1])
    : v[0] === 's' ? v.length === 2 && uint(v[1], 3)
    : v.length === 1 && ['g', 'h', 'z', 'c'].includes(v[0] as string)),
  step: (s, a, d) => {
    if (s.won) return null;
    if (d.kind === 'predict') {
      if (a[0] === 'h') {
        if (s.hintStage >= 3) return null;
        // From the second press Help crosses a picture out; with none left to cross out there is nothing more to give.
        const out = s.hintStage >= 1 ? ruleOut(s, d) : null;
        if (s.hintStage >= 1 && out === null) return null;
        return { state: { ...s, hintStage: s.hintStage + 1, hints: s.hints + 1, ruled: out === null ? s.ruled : [...s.ruled, out] }, event: 'help' };
      }
      if (a[0] === 's') return a[1] === s.pick || s.wrong.includes(a[1]) || s.ruled.includes(a[1]) ? null : { state: { ...s, pick: a[1] }, event: 'edit' };
      if (a[0] === 'c') { if (s.pick === null) return null; const right = s.pick === d.answer; return { state: { ...s, runs: s.runs + 1, won: right, wrong: right ? s.wrong : [...s.wrong, s.pick], pick: right ? s.pick : null }, event: 'check', correct: right }; }
      return null;
    }
    if (a[0] === 'h') return s.hintStage >= 3 ? null : { state: { ...s, hintStage: s.hintStage + 1, hints: s.hints + 1 }, event: 'help' };
    if (a[0] === 'g') { if (!s.program.length) return null; const won = solvesBuild(d, s.program); return { state: { ...s, runs: s.runs + 1, won }, event: 'run', correct: won }; }
    if (a[0] === 'z') return s.draft === null && !s.program.length ? null : { state: { ...s, draft: null, program: [], edits: s.edits + 1, hintStage: 0 }, event: 'reset' };
    if (a[0] === 'e') {
      const current = s.draft ? decodeProgram(s.draft, code => code < deepCodes.length) : empty();
      const program = current && applyOperations(current, a[1]);
      if (!program) return null;
      const packed = packedOf(program), read = admit(packed, d);
      if (!read || JSON.stringify(packed) === JSON.stringify(s.draft ?? packedOf(empty()))) return null;
      return { state: { ...s, draft: packed, program: read.blocks, edits: s.edits + 1, hintStage: 0 }, event: 'edit' };
    }
    return null;
  },
  inspect: (s, d) => ({
    solved: s.won, metrics: d.kind === 'build' && s.draft ? { cards: nodeCost(decodeProgram(s.draft, code => code < deepCodes.length) ?? empty()) } : {},
    edits: s.edits, solution: s.won ? sha256Hex(JSON.stringify(d.kind === 'build' ? s.draft : s.pick)) : null, objectives: [],
  }),
};
/** Help rules out the wrong picture that a skim would choose first, then another. Never the answer, never one already chosen. */
export function ruleOut(s: State, d: PredictDescriptor): number | null {
  const order = [...d.choices.keys()].filter(i => i !== d.answer && i !== s.pick && !s.wrong.includes(i) && !s.ruled.includes(i));
  return order.find(i => d.kinds[i] === 'once') ?? order[0] ?? null;
}
/** True while another Help press would still give the child something. */
export const predictHelpLeft = (s: State, d: PredictDescriptor): boolean => !s.won && s.hintStage < 3 && (s.hintStage < 1 || ruleOut(s, d) !== null);
/** The board's Help for the current rung of the ladder: where you are, then one edit, then a whole plan. Pure, so a test can walk it. */
export function buildHint(d: BuildDescriptor, program: Block[], stage: number): { text: string; reveal?: Block[] } {
  if (stage <= 0) return { text: '' };
  // Any plan that already draws the picture inside the tray wins, written one or not.
  if (solvesBuild(d, program)) return { text: 'Your blocks match. Press Go.' };
  const near = nearestEdit(program, d.winners, { full: blockCost(program) >= d.tray });
  if (!near) return { text: 'Your blocks match. Press Go.' };
  if (stage === 1) return { text: program.length ? `Your picture is ${near.distance === 1 ? 'one change' : `${near.distance} changes`} from the goal.` : 'Start with a Repeat. The picture comes back to where it began, so the turns add up to a whole circle.' };
  if (stage === 2) return { text: editText(near.edit, program) };
  return { text: `One way to draw it, ${near.distance} ${near.distance === 1 ? 'edit' : 'edits'} from yours:`, reveal: [...near.winner] };
}
export function predictHint(d: PredictDescriptor, stage: number, ruled: readonly number[] = []): string {
  if (stage <= 0) return '';
  if (stage === 1) return 'Follow the program one block at a time. How far does a whole turn go before the repeat starts again?';
  // Only the picture that really is the quick reading may be called that.
  if (stage === 2) return ruled.length && d.kinds[ruled[0]] === 'once' ? 'One picture is crossed out. It is the one a quick reading would give.' : 'One picture is crossed out.';
  return ruled.length > 1 ? 'Another picture is crossed out.' : 'There is no other picture to cross out. Look at the turns once more.';
}
