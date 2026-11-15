import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { certify, type CertifyContext } from '../../../src/puzzles/checks';
import { decodeRow } from '../../../src/puzzles/descriptor';
import { semanticHash } from '../../../src/puzzles/semantic';
import { latinAdapter } from '../../../src/puzzles/latin/adapter';
import { grade } from '../../../src/puzzles/latin/solver';
import type { LatinPuzzle } from '../../../src/puzzles/latin/core';
import type { DescriptorCore } from '../../../src/puzzles/types';
import { publishedJson } from '../../published-refs.mjs';
import { bakeFamily, productionDirs, readCatalog, readPackText } from '../pipeline';
import { slotClaim, assertClaimable } from '../slots';
import { arrangeBy } from '../order';
import { variantWorkload } from '../latin/variants';
import { logicLagoonFamily as spec, lagoonRungs } from './family';
import type { Candidate } from '../latin/family';

const git = (args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
// Source provenance must name a commit that actually contains every generator dependency.
const sourceSha = git(['rev-parse', 'HEAD']);
for (const file of [...spec.sources, 'scripts/puzzles/logic-lagoon/bake.ts']) git(['cat-file', '-e', `${sourceSha}:${file}`]);
git(['diff', '--exit-code', sourceSha, '--', ...spec.sources, 'scripts/puzzles/logic-lagoon/bake.ts']);
const rootFile = 'src/content/puzzles/root.json', { root, families } = readCatalog(productionDirs);
for (const p of publishedJson(rootFile)) if ((p.value as typeof root).families.some(f => f[0] === spec.id)) throw new Error('Published T1 packs cannot be replaced.');
const old = families.get(spec.id);
if (old && (old.packs.some(p => ![260, 261, 262].includes(p[0])) || old.packs.length !== 3)) throw new Error('This one-shot rebake only replaces the three unpublished T1 packs.');
const remaining = [...families.values()].filter(f => f.family !== spec.id);
const firstClaim = slotClaim(productionDirs, remaining, { first: 260, last: 262 }, 't1-logic-lagoon');
for (const slot of [260, 261, 262]) assertClaimable(firstClaim, slot);
const originals = new Map((old?.packs ?? []).map(p => [p[0], readPackText(productionDirs, p[0]).trimEnd().split('\n').slice(1).join('\n')]));
const ctx: CertifyContext = { budget: 200_000, seenExact: new Set(), seenSemantic: new Set() };
const chosen = spec.bands.map((b, i) => {
  // Keep the original three candidate streams byte-identical. Only the new School band
  // also excludes other families' killer grids, so there is no cross-family supply duplication.
  if (b.id === 'school-cages') for (const manifest of families.values()) if (manifest.engine === 'killer') for (const p of manifest.packs) for (const line of readPackText(productionDirs, p[0]).trimEnd().split('\n').slice(1)) {
    const d = decodeRow(line, manifest.bands[p[5]], latinAdapter('killer'));
    if (!d) throw new Error('Existing killer source no longer decodes.');
    ctx.seenSemantic.add(semanticHash(`killer:${latinAdapter('killer').semanticKey(d)}`));
  }
  const pool: Candidate[] = [], multiple = b.id === 'school-cages' ? 4 : 2;
  for (let j = 0; j < 60000 && pool.length < b.target * multiple; j++) {
    const d = spec.generate((i + 1) * 0x1000000 + j, b);
    if (!d || !certify(spec, b, d, ctx).ok) continue;
    const g = grade(d.payload);
    if (g.status === 'complete') pool.push({ seed: d.seed, puzzle: d.payload, template: d.template, grade: g });
  }
  const picked = arrangeBy(variantWorkload, pool, b.target);
  console.log(JSON.stringify({ band: b.id, pool: pool.length, picked: picked.length }));
  if (picked.length !== b.target) throw new Error(`Below target: ${b.id}`);
  return picked;
});
const generate = (seed: number, band: (typeof spec.bands)[number]) => {
  const i = spec.bands.findIndex(b => b.id === band.id), c = chosen[i][seed - 1 - i * 0x1000000];
  return c ? { format: 1, seed: c.seed, rng: 1, band: band.id, layout: c.template, template: c.template, payload: c.puzzle, objectives: [], limits: [], par: null, teaches: [c.grade.ceiling], speech: null } as DescriptorCore<LatinPuzzle> : null;
};
const backup = mkdtempSync(join(tmpdir(), 'li4-t1-rebake-'));
cpSync(productionDirs.content, join(backup, 'catalog'), { recursive: true });
const receipts = join(productionDirs.receipts, spec.id);
if (existsSync(receipts)) cpSync(receipts, join(backup, 'receipts'), { recursive: true });
try {
  // Retire only this branch's unpublished reference before its explicit re-bake.
  // Both high-water counters are copied unchanged; no base slot is assigned to them.
  writeFileSync(rootFile, JSON.stringify({ ...root, families: root.families.filter(f => f[0] !== spec.id) }) + '\n');
  if (existsSync(receipts)) rmSync(receipts, { recursive: true });
  const first = bakeFamily({ ...spec, bands: spec.bands.map(b => b.id === 'school-cages' ? { ...b, target: 0, floor: 0 } : b), generate }, { dirs: productionDirs, claim: firstClaim, seedBase: 1, maxAttempts: 200, sourceSha });
  if (!first.published || first.slots.join(',') !== '260,261,262') throw new Error(JSON.stringify(first));
  for (const [slot, lines] of originals) if (readPackText(productionDirs, slot).trimEnd().split('\n').slice(1).join('\n') !== lines) throw new Error(`Old T1 row identities shifted in ${slot}.`);
  const current = readCatalog(productionDirs), claim = slotClaim(productionDirs, current.families.values(), { first: 268, last: 279 }, 't1-logic-lagoon');
  const added = bakeFamily({ ...spec, generate }, { dirs: productionDirs, claim, seedBase: 1, maxAttempts: chosen.at(-1)!.length, sourceSha });
  if (!added.published || added.slots.some(s => s < 268 || s > 279)) throw new Error(JSON.stringify(added));
  console.log(JSON.stringify({ first, added, rungs: lagoonRungs.map(r => r.id) }));
} catch (error) {
  rmSync(productionDirs.content, { recursive: true }); cpSync(join(backup, 'catalog'), productionDirs.content, { recursive: true });
  if (existsSync(receipts)) rmSync(receipts, { recursive: true });
  if (existsSync(join(backup, 'receipts'))) cpSync(join(backup, 'receipts'), receipts, { recursive: true });
  throw error;
} finally { rmSync(backup, { recursive: true }); }
