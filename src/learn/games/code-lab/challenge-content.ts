import type { Puzzle, RegisteredDare } from '../../../challenge/types';
import { sha256Hex } from '../../../puzzles/sha256';
import { deepPrograms, numberPrograms, schoolPrograms, type LabProgram } from './content';
let dareSlot = 500;
const puzzle = (d: LabProgram, bank: number, index: number, school = false, endless = false): Puzzle<LabProgram> => {
  const dares: RegisteredDare[] = [];
  // School templates have a Challenge copy so their optional dares use real replay evidence too.
  if (school || !endless) {
    const rule: RegisteredDare['rule'] = school && bank <= 231 && d.mode === 'predict' ? { kind: 'whole' } : school && bank <= 233 ? { kind: 'plan', max: 1 } : { kind: 'clean' };
    dares.push({ slot: dareSlot++, id: `lab-${bank}-${index}`, label: rule.kind === 'whole' ? 'Predict it first' : rule.kind === 'plan' ? 'First run works' : 'No line help or misses', rule, help: rule.kind === 'plan' ? 'allowed' : 'independent' });
  }
  return {
    ref: { bank, puzzle: index, engine: 'code-lab', rules: 1, hash: sha256Hex(JSON.stringify(d)) },
    source: school ? { kind: 'school', game: 'code-lab', level: d.band as 1|2|3|4|5, puzzle: d.id } : endless ? { kind: 'endless', bank, puzzle: index } : { kind: 'deep-water', collection: bank, puzzle: index },
    path: endless ? 'endless' : 'deep-water', tier: d.band as Puzzle<LabProgram>['tier'], title: `${d.idea} · ${d.mode === 'predict' ? 'Predict' : 'Build'} ${index + 1}`, descriptor: d, dares,
    awards: [{ rule: { kind: 'clean' }, help: 'independent' }, null],
  };
};
export const labPuzzles: readonly Puzzle<LabProgram>[] = [
  ...schoolPrograms.flatMap((rows, i) => rows.map((d, j) => puzzle(d, 230 + i, j, true))),
  ...deepPrograms.map((d, i) => puzzle(d, 235 + Math.floor(i / 10), i % 10)),
  ...numberPrograms.map((d, i) => puzzle(d, 241 + Math.floor(i / 75), i % 75, false, true)),
];
