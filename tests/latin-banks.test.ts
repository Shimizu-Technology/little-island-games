import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { factsFile, factsText, latinFacts } from '../scripts/puzzles/latin/facts';
import { productionDirs, readCatalog, readPackText } from '../scripts/puzzles/pipeline';
import { parsePack } from '../src/puzzles/bank';
import { decodeRow } from '../src/puzzles/descriptor';
import { latinAdapter } from '../src/puzzles/latin/adapter';
import { kinds } from '../src/puzzles/latin/core';
import { latinRungs } from '../src/puzzles/latin/rungs';
import { grade, rank } from '../src/puzzles/latin/solver';
import { workload } from '../scripts/puzzles/latin/sudoku';
import { variantWorkload } from '../scripts/puzzles/latin/variants';

const catalog = JSON.parse(readFileSync('src/state/save-catalog.json', 'utf8')) as { banks: { slot: number; family?: string; packHash?: string; first?: number; count?: number }[]; contexts: string[] };
describe('Latin banks', () => {
  it('registers exactly the packaged bank facts, inside G3’s reserved slots and ordinals', () => {
    expect(readFileSync(factsFile, 'utf8')).toBe(factsText(latinFacts()));
    const facts = latinFacts();
    for (const [family, banks] of Object.entries(facts)) for (const b of banks) {
      expect(b.slot).toBeGreaterThanOrEqual(40); expect(b.slot).toBeLessThanOrEqual(59);
      expect(b.first).toBeGreaterThanOrEqual(40 * 1024); expect(b.first + b.count).toBeLessThanOrEqual(60 * 1024);
      const frozen = catalog.banks.find(x => x.slot === b.slot);
      expect(frozen).toMatchObject({ family, packHash: b.packHash, first: b.first, count: b.count });
    }
    expect(Object.keys(facts).every(k => kinds.includes(k as never))).toBe(true);
  });
  it('orders each rung gentle to hard and keeps every row inside its technique window', { timeout: 600_000 }, () => {
    const { families } = readCatalog(productionDirs);
    for (const [family, banks] of Object.entries(latinFacts())) {
      const manifest = families.get(family)!, adapter = latinAdapter(family as never);
      for (const b of banks) {
        const rung = latinRungs[family as keyof typeof latinRungs].find(r => r.id === b.band)!, row = manifest.packs.find(p => p[0] === b.slot)!;
        const rows = parsePack(readPackText(productionDirs, b.slot), row, manifest)!.rows.map(line => decodeRow(line, b.band, adapter)!);
        expect(rows.every(d => d.payload.size === rung.size)).toBe(true);
        for (const d of rows) { expect(rank(d.teaches[0])).toBeGreaterThanOrEqual(rank(rung.min)); expect(rank(d.teaches[0])).toBeLessThanOrEqual(rank(rung.max)); }
        // Re-graded workload: the last third of a rung is harder than the first.
        const load = rows.map(d => { const g = grade(d.payload); return g.status === 'complete' ? (family === 'sudoku' ? workload({ grade: g, puzzle: d.payload }) : variantWorkload({ seed: 0, template: '', grade: g, puzzle: d.payload })) : -1; }), third = Math.floor(rows.length / 3);
        const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;
        expect(load.every(x => x >= 0)).toBe(true);
        expect(mean(load.slice(-third))).toBeGreaterThan(mean(load.slice(0, third)));
      }
    }
  });
});
