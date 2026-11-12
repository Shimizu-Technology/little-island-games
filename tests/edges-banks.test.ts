import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { edgeFacts, factsFile, factsText } from '../scripts/puzzles/edges/facts';
import { productionDirs, readCatalog, readPackText } from '../scripts/puzzles/pipeline';
import { parsePack } from '../src/puzzles/bank';
import { decodeRow } from '../src/puzzles/descriptor';
import { bridgesAdapter } from '../src/puzzles/edges/adapter';
import { bridgesRungs } from '../src/puzzles/edges/rungs';
import { grade as gradeBridges, rank as rankBridges, techniques as bridgesTechniques } from '../src/puzzles/edges/solver';
import { lineAdapter } from '../src/puzzles/lines/adapter';
import { loopRungs, pearlRungs } from '../src/puzzles/lines/rungs';
import { grade as gradeLine, rank as rankLine, techniquesOf } from '../src/puzzles/lines/solver';
import { bridgesWeights, bridgesWorkload } from '../scripts/puzzles/edges/bridges';
import { lineWeights, lineWorkload } from '../scripts/puzzles/lines/loops';
import type { BridgesPuzzle } from '../src/puzzles/edges/core';
import type { LinePuzzle } from '../src/puzzles/lines/core';
import { worstBack } from '../scripts/puzzles/order';

const catalog = JSON.parse(readFileSync('src/state/save-catalog.json', 'utf8')) as { banks: { slot: number; family?: string; packHash?: string; first?: number; count?: number }[]; contexts: string[] };
function rows(family: string, slot: number, band: string) {
  const { families } = readCatalog(productionDirs), manifest = families.get(family)!, row = manifest.packs.find(p => p[0] === slot)!;
  const adapter = family === 'bridges' ? bridgesAdapter() : lineAdapter(family as LinePuzzle['kind']);
  return parsePack(readPackText(productionDirs, slot), row, manifest)!.rows.map(line => decodeRow(line, band, adapter as never)!);
}

describe('G5 banks', () => {
  it('weighs every technique when ordering a rung (regression: a missing weight made Deep Channel unordered)', () => {
    expect(bridgesWeights.length).toBe(bridgesTechniques.length);
    for (const kind of ['loop', 'pearl-loop'] as const) expect(lineWeights[kind].length).toBe(techniquesOf(kind).length);
  });
  it('registers exactly the packaged facts, inside G5’s slots 60–79 and their ordinals', () => {
    expect(readFileSync(factsFile, 'utf8')).toBe(factsText(edgeFacts()));
    const facts = edgeFacts();
    expect(Object.keys(facts).sort()).toEqual(['bridges', 'loop', 'pearl-loop']);
    for (const [family, banks] of Object.entries(facts)) for (const b of banks) {
      expect(b.slot).toBeGreaterThanOrEqual(60); expect(b.slot).toBeLessThanOrEqual(79);
      expect(b.first).toBeGreaterThanOrEqual(60 * 1024); expect(b.first + b.count).toBeLessThanOrEqual(80 * 1024);
      expect(catalog.banks.find(x => x.slot === b.slot)).toMatchObject({ family, packHash: b.packHash, first: b.first, count: b.count });
    }
    // One rung is one bank, in ladder order.
    expect(facts.bridges.map(b => b.band)).toEqual(bridgesRungs.map(r => r.id));
    expect(facts.loop.map(b => b.band)).toEqual(loopRungs.map(r => r.id));
    expect(facts['pearl-loop'].map(b => b.band)).toEqual(pearlRungs.map(r => r.id));
  });
  // One pass over every packaged row (every one, the 10×10 Abyss included): decode, re-grade, weigh.
  type Rung = { family: string; id: string; tier: number; area: number; min: number; max: number; loads: number[] };
  let banks: Rung[] = [];
  it('Bridges: every board re-grades inside its rung, with its named idea used', { timeout: 600_000 }, () => {
    for (const b of edgeFacts().bridges) {
      const rung = bridgesRungs.find(r => r.id === b.band)!, load: number[] = [];
      for (const d of rows('bridges', b.slot, b.band)) {
        const p = d.payload as BridgesPuzzle, g = gradeBridges(p);
        expect(p.width).toBe(rung.width); expect(p.height).toBe(rung.height);
        expect(g.status).toBe('complete');
        if (g.status !== 'complete') continue;
        expect(g.ceiling).toBe(d.teaches[0]);
        expect(rankBridges(g.ceiling)).toBeGreaterThanOrEqual(rankBridges(rung.min)); expect(rankBridges(g.ceiling)).toBeLessThanOrEqual(rankBridges(rung.max));
        if (rung.needs) expect(g.steps.some(s => s.technique === rung.needs)).toBe(true);
        load.push(bridgesWorkload(g, p));
      }
      banks.push({ family: 'bridges', id: b.band, tier: rung.tier, area: rung.width * rung.height, min: rankBridges(rung.min), max: rankBridges(rung.max), loads: load });
    }
  });
  it('Loop and Pearl Loop: every board re-grades inside its rung, with its named idea used', { timeout: 1_800_000 }, () => {
    for (const kind of ['loop', 'pearl-loop'] as const) for (const b of edgeFacts()[kind]) {
      const rung = (kind === 'loop' ? loopRungs : pearlRungs).find(r => r.id === b.band)!, load: number[] = [];
      for (const d of rows(kind, b.slot, b.band)) {
        const p = d.payload as LinePuzzle, g = gradeLine(p);
        expect(p.rows).toBe(rung.rows); expect(p.cols).toBe(rung.cols);
        expect(g.status).toBe('complete');
        if (g.status !== 'complete') continue;
        expect(g.ceiling).toBe(d.teaches[0]);
        expect(rankLine(kind, g.ceiling)).toBeGreaterThanOrEqual(rankLine(kind, rung.min)); expect(rankLine(kind, g.ceiling)).toBeLessThanOrEqual(rankLine(kind, rung.max));
        if (rung.needs) expect(g.steps.some(s => s.technique === rung.needs)).toBe(true);
        load.push(lineWorkload(kind, g));
      }
      banks.push({ family: kind, id: b.band, tier: rung.tier, area: rung.rows * rung.cols, min: rankLine(kind, rung.min), max: rankLine(kind, rung.max), loads: load });
    }
  });
  it('R3: each published rung runs gentle to hard, with no step back beyond the stated policy (no rest beats)', () => {
    expect(banks.length).toBe(16);
    for (const b of banks) {
      const { worst, allowed } = worstBack(b.loads);
      expect(worst, `${b.family}/${b.id}: worst step back ${worst} > ${allowed}`).toBeLessThanOrEqual(allowed);
      for (let k = 1; k < b.loads.length; k++) expect(b.loads[k - 1] - b.loads[k], `${b.family}/${b.id} ${k}→${k + 1}`).toBeLessThanOrEqual(allowed);
    }
  });
  it('R3: across rungs, tiers and technique windows never go back, and on one board size the median workload never does', () => {
    const median = (xs: number[]) => [...xs].sort((a, c) => a - c)[Math.floor(xs.length / 2)];
    for (const family of ['bridges', 'loop', 'pearl-loop']) {
      const ladder = banks.filter(b => b.family === family);
      for (let k = 1; k < ladder.length; k++) {
        const [a, b] = [ladder[k - 1], ladder[k]];
        expect(b.tier).toBeGreaterThanOrEqual(a.tier);
        expect(b.min, `${family} ${a.id}→${b.id}`).toBeGreaterThanOrEqual(a.min); expect(b.max).toBeGreaterThanOrEqual(a.max);
        if (b.area === a.area) expect(median(b.loads), `${family} ${a.id}→${b.id}`).toBeGreaterThanOrEqual(median(a.loads));
      }
    }
  });
});
