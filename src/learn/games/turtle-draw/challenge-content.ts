/** Deep Water for Turtle Draw (SC-03): banks 220–224 are "draw it" and 225–229 "predict the picture", one step each, twelve puzzles per bank.
 * Free drawing is not a puzzle here and has no dare. Dares sit only on the two hardest rungs (tier 6) of each bank, slots 400–429. */
import deepContent from './deep-content.json';
import { parseBlocks } from './dsl';
import { buildBank, predictBank, STEPS, type DeepBuild, type DeepPredict } from './deep';
import type { BuildDescriptor, Descriptor, PredictDescriptor } from './challenge-engine';
import type { Puzzle, RegisteredDare } from '../../../challenge/types';
import { sha256Hex } from '../../../puzzles/sha256';
import type { Block } from './engine';

const must = (text: string): Block[] => { const b = parseBlocks(text); if (!b) throw new Error(`Bad Turtle program: ${text}`); return b; };
const buildRows = deepContent.build as unknown as DeepBuild[][], predictRows = deepContent.predict as unknown as DeepPredict[][];
const clean = { kind: 'clean' as const };
export const FIRST_DARE = 400;
let slot = FIRST_DARE;
const dare = (id: string, label: string, rule: RegisteredDare['rule'], help: RegisteredDare['help']): RegisteredDare => ({ slot: slot++, id, label, rule, help });

export const buildDescriptor = (row: DeepBuild): BuildDescriptor => ({ kind: 'build', step: row.step, target: must(row.target), winners: [must(row.target), ...row.alts.map(must)], origin: { x: row.origin[0], y: row.origin[1] }, tray: row.tray });
export const predictDescriptor = (row: DeepPredict): PredictDescriptor => ({ kind: 'predict', step: row.step, program: must(row.program), choices: row.choices.map(must), answer: row.answer, origin: { x: row.origin[0], y: row.origin[1] }, kinds: row.misreads });

const builds: Puzzle<Descriptor>[] = buildRows.flatMap((rows, step) => rows.map((row, i) => {
  const d = buildDescriptor(row), top = row.tier === 6;
  const dares: RegisteredDare[] = top ? [dare(`turtle-${step}-${i}-first`, 'First run works', { kind: 'plan', max: 1 }, 'allowed'), dare(`turtle-${step}-${i}-fewest`, 'Fewest blocks', { kind: 'par', metric: 'cards', max: row.min }, 'allowed')] : [];
  return {
    ref: { bank: buildBank(step), puzzle: i, engine: 'turtle-draw', rules: 1, hash: sha256Hex(JSON.stringify(d)) }, source: { kind: 'deep-water', collection: buildBank(step), puzzle: i },
    path: 'deep-water', tier: row.tier as Puzzle<Descriptor>['tier'], title: `${STEPS[step].name} ${i + 1} of 12 · Draw it`, descriptor: d, dares,
    awards: [{ rule: clean, help: 'independent' }, { rule: { kind: 'par', metric: 'cards', max: row.min }, help: 'independent' }],
    par: { metric: 'cards', lower: row.min, upper: row.min },
  } satisfies Puzzle<Descriptor>;
}));
const predicts: Puzzle<Descriptor>[] = predictRows.flatMap((rows, step) => rows.map((row, i) => {
  const d = predictDescriptor(row), top = row.tier === 6;
  return {
    ref: { bank: predictBank(step), puzzle: i, engine: 'turtle-draw', rules: 1, hash: sha256Hex(JSON.stringify(d)) }, source: { kind: 'deep-water', collection: predictBank(step), puzzle: i },
    path: 'deep-water', tier: row.tier as Puzzle<Descriptor>['tier'], title: `${STEPS[step].name} ${i + 1} of 12 · Predict the picture`, descriptor: d,
    dares: top ? [dare(`turtle-p${step}-${i}-right`, 'Right on the first check, no Help', clean, 'independent')] : [],
    awards: [{ rule: clean, help: 'independent' }, null],
  } satisfies Puzzle<Descriptor>;
}));
export const turtlePuzzles: readonly Puzzle<Descriptor>[] = [...builds, ...predicts];
export const TURTLE_BANKS = [...new Set(turtlePuzzles.map(p => p.ref.bank))].sort((a, b) => a - b);
