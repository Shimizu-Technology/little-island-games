import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { certify, type CertifyContext } from '../../../src/puzzles/checks';
import { grade } from '../../../src/puzzles/latin/solver';
import type { LatinPuzzle } from '../../../src/puzzles/latin/core';
import type { DescriptorCore } from '../../../src/puzzles/types';
import { bakeFamily, productionDirs } from '../pipeline';
import { arrangeBy } from '../order';
import { variantWorkload } from '../latin/variants';
import { logicLagoonFamily as spec, lagoonRungs } from './family';
import type { Candidate } from '../latin/family';

const ctx: CertifyContext = { budget: 200_000, seenExact: new Set(), seenSemantic: new Set() };
const chosen = spec.bands.map((b, i) => {
  const pool: Candidate[] = [];
  for (let j = 0; j < 60000 && pool.length < b.target * 2; j++) {
    const d = spec.generate((i + 1) * 0x1000000 + j, b);
    if (!d || !certify(spec, b, d, ctx).ok) continue;
    const g = grade(d.payload);
    if (g.status === 'complete') pool.push({ seed: d.seed, puzzle: d.payload, template: d.template, grade: g });
  }
  const picked = arrangeBy(variantWorkload, pool, b.target);
  console.log(JSON.stringify({ band: b.id, pool: pool.length, picked: picked.length }));
  if (picked.length < b.floor) throw new Error(`Below floor: ${b.id}`);
  return picked;
});
const rootFile = 'src/content/puzzles/root.json', root = JSON.parse(readFileSync(rootFile, 'utf8'));
if (root.nextSlot > 260) throw new Error('T1 slots unavailable.');
writeFileSync(rootFile, JSON.stringify({ ...root, nextSlot: 260, nextOrdinal: Math.max(root.nextOrdinal, 260 * 1024) }) + '\n');
const report = bakeFamily({ ...spec, bands: spec.bands.map((b, i) => ({ ...b, target: chosen[i].length })), generate: (seed, band) => {
  const i = spec.bands.findIndex(b => b.id === band.id), c = chosen[i][seed - 1 - i * 0x1000000];
  return c ? { format: 1, seed: c.seed, rng: 1, band: band.id, layout: c.template, template: c.template, payload: c.puzzle, objectives: [], limits: [], par: null, teaches: [c.grade.ceiling], speech: null } as DescriptorCore<LatinPuzzle> : null;
} }, { dirs: productionDirs, seedBase: 1, maxAttempts: Math.max(...chosen.map(c => c.length)), sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() });
if (!report.published || report.slots.some(s => s < 260 || s > 279)) throw new Error(JSON.stringify(report));
console.log(JSON.stringify({ ...report, rungs: lagoonRungs.map(r => r.id) }));
