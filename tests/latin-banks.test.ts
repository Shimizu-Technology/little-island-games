import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { factsFile, factsText, latinFacts } from '../scripts/puzzles/latin/facts';
import { productionDirs, readCatalog, readPackText } from '../scripts/puzzles/pipeline';
import { parsePack } from '../src/puzzles/bank';
import { decodeRow } from '../src/puzzles/descriptor';
import { latinAdapter } from '../src/puzzles/latin/adapter';
import { kinds } from '../src/puzzles/latin/core';
import { latinRungs, tierCeiling, type RungInfo } from '../src/puzzles/latin/rungs';
import { worstBack } from '../scripts/puzzles/latin/bake';
import type { Technique } from '../src/puzzles/latin/solver';
import { grade, rank } from '../src/puzzles/latin/solver';
import { workload } from '../scripts/puzzles/latin/sudoku';
import { variantWorkload } from '../scripts/puzzles/latin/variants';

const clueOf: Record<string, Technique> = { 'cage-math': 'cage-sum', killer: 'cage-sum', 'greater-than': 'inequality', skyline: 'skyline-line' };
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
  // One pass over every packaged row: decode, then re-grade with the rung's own ceiling.
  const decoded = () => {
    const { families } = readCatalog(productionDirs), out: { family: string; rung: RungInfo; loads: number[]; ceilings: string[]; complete: boolean[]; teaches: string[] }[] = [];
    for (const [family, banks] of Object.entries(latinFacts())) {
      const manifest = families.get(family)!, adapter = latinAdapter(family as never);
      for (const b of banks) {
        const rung = latinRungs[family as keyof typeof latinRungs].find(r => r.id === b.band)!, row = manifest.packs.find(p => p[0] === b.slot)!;
        const rows = parsePack(readPackText(productionDirs, b.slot), row, manifest)!.rows.map(line => decodeRow(line, b.band, adapter)!);
        expect(rows.every(d => d.payload.size === rung.size)).toBe(true);
        const graded = rows.map(d => grade(d.payload, 400_000, d.payload.givens, rank(rung.max)));
        out.push({ family, rung, teaches: rows.map(d => d.teaches[0]), complete: graded.map(g => g.status === 'complete'), ceilings: graded.map(g => g.ceiling ?? ''),
          loads: graded.map((g, k) => g.status !== 'complete' ? -1 : family === 'sudoku' ? workload({ grade: g, puzzle: rows[k].payload }) : variantWorkload({ seed: 0, template: '', grade: g, puzzle: rows[k].payload })) });
      }
    }
    return out;
  };
  let banks: ReturnType<typeof decoded>;
  it('R1: every row finishes under its rung’s technique ceiling, and children’s rungs allow only singles, one place and the game’s clue rule', { timeout: 900_000 }, () => {
    banks = decoded();
    for (const b of banks) {
      expect(b.complete.every(Boolean), `${b.family}/${b.rung.id}`).toBe(true);
      for (let k = 0; k < b.teaches.length; k++) {
        expect(b.teaches[k], `${b.family}/${b.rung.id} ${k + 1}`).toBe(b.ceilings[k]);
        expect(rank(b.ceilings[k])).toBeGreaterThanOrEqual(rank(b.rung.min));
      }
      if (b.rung.tier <= 3) expect(rank(b.rung.max), `${b.family}/${b.rung.id}`).toBeLessThan(rank('locked-candidates'));
      if (b.family !== 'sudoku') expect(b.rung.max, `${b.family}/${b.rung.id}`).toBe(tierCeiling(b.rung.tier, clueOf[b.family]));
    }
  });
  it('R3: each published rung runs gentle to hard, with no step back beyond the stated policy', () => {
    for (const b of banks) {
      const { worst, allowed } = worstBack(b.loads);
      expect(worst, `${b.family}/${b.rung.id}: worst step back ${worst} > ${allowed}`).toBeLessThanOrEqual(allowed);
      // So no adjacent pair drops by more either.
      for (let k = 1; k < b.loads.length; k++) expect(b.loads[k - 1] - b.loads[k]).toBeLessThanOrEqual(allowed);
    }
  });
  it('R3: across rungs, tiers rise; on one board size the window and the median never go back; a bigger board says it starts simple', () => {
    const median = (xs: number[]) => [...xs].sort((a, c) => a - c)[Math.floor(xs.length / 2)];
    for (const family of new Set(banks.map(b => b.family))) {
      const ladder = banks.filter(b => b.family === family);
      for (let k = 1; k < ladder.length; k++) {
        const [a, b] = [ladder[k - 1], ladder[k]];
        expect(b.rung.tier).toBeGreaterThanOrEqual(a.rung.tier);
        expect(b.rung.size).toBeGreaterThanOrEqual(a.rung.size);
        if (b.rung.size === a.rung.size) {
          expect(rank(b.rung.max), `${family} ${a.rung.id}→${b.rung.id}`).toBeGreaterThanOrEqual(rank(a.rung.max));
          expect(rank(b.rung.min)).toBeGreaterThanOrEqual(rank(a.rung.min));
          expect(median(b.loads), `${family} ${a.rung.id}→${b.rung.id}`).toBeGreaterThanOrEqual(median(a.loads));
        } else if (rank(b.rung.max) < rank(a.rung.max) && family === 'sudoku') expect(b.rung.summary).toMatch(/bigger board/);
      }
    }
  });
});
