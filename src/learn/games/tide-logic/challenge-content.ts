/**
 * Tide Logic Challenge content (C4, SC-05 / BK-24). Endless Tide is banks 245-250, one tier each; Deep Water is banks 251-254,
 * one step each (Not, Three clues, Flip gate, Find the rule), twelve rungs climbing tiers 1-6. Dares sit on the top rungs, slots 650 up.
 */
import content from './content.json';
import type { AwardRule, Puzzle, RegisteredDare } from '../../../challenge/types';
import { sha256Hex } from '../../../puzzles/sha256';
import type { Row } from './generate';
import type { Descriptor } from './challenge-engine';

/** Names match generate.ts's ENDLESS and DEEP bands (a test checks); the generator itself stays out of the app bundle. */
export const ENDLESS_NAMES = ['Two clues', 'Bell first', 'Bell clues', 'Not', 'Three clues', 'Find it'], DEEP_NAMES = ['Not', 'Three clues', 'Flip gate', 'Find the rule'];

export const FIRST_ENDLESS = 245, FIRST_DEEP = 251, FIRST_DARE = 650;
const endlessRows = content.endless as unknown as Row[][], deepRows = content.deep as unknown as Row[][];
const VERB: Record<Row['kind'], string> = { write: 'Write it', find: 'Find it', trace: 'Trace it' };
type Tier = Puzzle<Descriptor>['tier'];
export const descriptorOf = (row: Row): Descriptor => ({ kind: row.kind, frame: row.frame, target: [...row.target], belt: [...row.belt] });
export const hashOf = (d: Descriptor) => sha256Hex(JSON.stringify(d));
const clean: AwardRule = { rule: { kind: 'clean' }, help: 'independent' };
/** Writing and finding: no Help and no wrong run; then a finish in at most two runs. Tracing: right on the first Check; then no Help. */
const awardsOf = (kind: Row['kind']): Puzzle<Descriptor>['awards'] => kind === 'trace' ? [{ rule: { kind: 'whole' }, help: 'independent' }, clean] : [clean, { rule: { kind: 'plan', max: 2 }, help: 'allowed' }];
let slot = FIRST_DARE;
const dareOf = (bank: number, i: number, kind: Row['kind']): RegisteredDare => kind === 'trace'
  ? { slot: slot++, id: `tide-${bank}-${i}-whole`, label: 'Right on the first Check', rule: { kind: 'whole' }, help: 'independent' }
  : { slot: slot++, id: `tide-${bank}-${i}-first`, label: 'First run sorts every catch, no Help', rule: { kind: 'plan', max: 1 }, help: 'independent' };
function puzzle(row: Row, bank: number, i: number, path: 'endless' | 'deep-water', tier: Tier, title: string, dared: boolean): Puzzle<Descriptor> {
  const d = descriptorOf(row);
  return {
    ref: { bank, puzzle: i, engine: 'tide-logic', rules: 1, hash: hashOf(d) },
    source: path === 'endless' ? { kind: 'endless', bank, puzzle: i } : { kind: 'deep-water', collection: bank, puzzle: i },
    path, tier, title, descriptor: d, dares: dared ? [dareOf(bank, i, row.kind)] : [], awards: awardsOf(row.kind),
  };
}
const endless = endlessRows.flatMap((rows, t) => rows.map((row, i) => puzzle(row, FIRST_ENDLESS + t, i, 'endless', (t + 1) as Tier, `${ENDLESS_NAMES[t]} ${i + 1} · ${VERB[row.kind]}`, t >= 4)));
const deep = deepRows.flatMap((rows, step) => rows.map((row, i) => { const tier = (Math.floor(i / 2) + 1) as Tier; return puzzle(row, FIRST_DEEP + step, i, 'deep-water', tier, `${DEEP_NAMES[step]} ${i + 1} of 12 · ${VERB[row.kind]}`, tier >= 5); }));
export const tidePuzzles: readonly Puzzle<Descriptor>[] = [...endless, ...deep];
export const TIDE_BANKS = [...new Set(tidePuzzles.map(p => p.ref.bank))].sort((a, b) => a - b);
export const rowFor = (bank: number, i: number): Row => bank < FIRST_DEEP ? endlessRows[bank - FIRST_ENDLESS][i] : deepRows[bank - FIRST_DEEP][i];
