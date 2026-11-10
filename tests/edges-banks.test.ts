import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { edgeFacts, factsFile, factsText } from '../scripts/puzzles/edges/facts';
import { productionDirs, readCatalog, readPackText } from '../scripts/puzzles/pipeline';
import { parsePack } from '../src/puzzles/bank';
import { decodeRow } from '../src/puzzles/descriptor';
import { bridgesAdapter } from '../src/puzzles/edges/adapter';
import { bridgesRungs } from '../src/puzzles/edges/rungs';
import { grade as gradeBridges, rank as rankBridges } from '../src/puzzles/edges/solver';
import { lineAdapter } from '../src/puzzles/lines/adapter';
import { loopRungs, pearlRungs } from '../src/puzzles/lines/rungs';
import { grade as gradeLine, rank as rankLine } from '../src/puzzles/lines/solver';
import { bridgesWorkload } from '../scripts/puzzles/edges/bridges';
import { lineWorkload } from '../scripts/puzzles/lines/loops';
import type { BridgesPuzzle } from '../src/puzzles/edges/core';
import type { LinePuzzle } from '../src/puzzles/lines/core';

const catalog = JSON.parse(readFileSync('src/state/save-catalog.json', 'utf8')) as { banks: { slot: number; family?: string; packHash?: string; first?: number; count?: number }[]; contexts: string[] };
const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;
function rows(family: string, slot: number, band: string) {
  const { families } = readCatalog(productionDirs), manifest = families.get(family)!, row = manifest.packs.find(p => p[0] === slot)!;
  const adapter = family === 'bridges' ? bridgesAdapter() : lineAdapter(family as LinePuzzle['kind']);
  return parsePack(readPackText(productionDirs, slot), row, manifest)!.rows.map(line => decodeRow(line, band, adapter as never)!);
}

describe('G5 banks', () => {
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
  it('Bridges: every board re-grades inside its rung, and each rung runs gentle to hard', { timeout: 600_000 }, () => {
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
      const third = Math.floor(load.length / 3);
      expect(mean(load.slice(-third)), b.band).toBeGreaterThan(mean(load.slice(0, third)));
    }
  });
  it('Loop and Pearl Loop: every board (every fifth on the 10×10 rung) re-grades inside its rung, gentle to hard', { timeout: 1_200_000 }, () => {
    for (const kind of ['loop', 'pearl-loop'] as const) for (const b of edgeFacts()[kind]) {
      const rung = (kind === 'loop' ? loopRungs : pearlRungs).find(r => r.id === b.band)!, all = rows(kind, b.slot, b.band), step = rung.rows >= 10 ? 5 : 1, load: number[] = [];
      all.forEach((d, i) => {
        if (i % step) return;
        const p = d.payload as LinePuzzle, g = gradeLine(p);
        expect(p.rows).toBe(rung.rows); expect(p.cols).toBe(rung.cols);
        expect(g.status).toBe('complete');
        if (g.status !== 'complete') return;
        expect(g.ceiling).toBe(d.teaches[0]);
        expect(rankLine(kind, g.ceiling)).toBeGreaterThanOrEqual(rankLine(kind, rung.min)); expect(rankLine(kind, g.ceiling)).toBeLessThanOrEqual(rankLine(kind, rung.max));
        if (rung.needs) expect(g.steps.some(s => s.technique === rung.needs)).toBe(true);
        load.push(lineWorkload(kind, g));
      });
      const third = Math.floor(load.length / 3);
      expect(mean(load.slice(-third)), `${kind} ${b.band}`).toBeGreaterThan(mean(load.slice(0, third)));
    }
  });
});
