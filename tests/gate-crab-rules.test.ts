import { describe, expect, it } from 'vitest';
import {
  ALL_RULES, bestSplittingRow, closestContrastingEvidence, compareRowsText, copyNearestPasses,
  evaluateRow, goodTesterWitness, HYPOTHESES_FOR_RUNG, isNonAlternating, liveHypotheses,
  RULE_BY_ID, RULES_BY_RUNG, RUNGS, starterEvidence, tuplePuzzle, type Rung,
} from '../src/learn/games/gate-crab/rules';
import { gateCrabAdapter } from '../src/puzzles/adapters/gate-crab';
import { parsePack } from '../src/puzzles/bank';
import { productionDirs, readCatalog, readPackText } from '../scripts/puzzles/pipeline';

describe('Gate Crab 216-row truth-table catalog & certified packs (OR-03, BK-14)', () => {
  it('deduplicates all rules canonically by their full 216-row truth table', () => {
    expect(ALL_RULES.length).toBeGreaterThanOrEqual(384);
    const tables = new Set(ALL_RULES.map(r => r.table216));
    const hashes = new Set(ALL_RULES.map(r => r.tableHash));
    expect(tables.size).toBe(ALL_RULES.length);
    expect(hashes.size).toBe(ALL_RULES.length);
    for (const r of ALL_RULES) {
      expect(r.table216).toHaveLength(216);
      expect(r.pass216).toBeGreaterThanOrEqual(12);
      expect(r.pass216).toBeLessThanOrEqual(204);
    }
    // Rung A rules are also distinct on 2-shell rows.
    const aTables36 = new Set(RULES_BY_RUNG.a.map(r => r.table36));
    expect(aTables36.size).toBe(RULES_BY_RUNG.a.length);
  });

  it('ships 384 certified puzzles across Rungs A-F inside slots 310-329 with distinct 216-row truth tables and <= 25% family share', () => {
    const { families } = readCatalog(productionDirs);
    const manifest = families.get('gate-crab');
    expect(manifest).toBeDefined();
    if (!manifest) return;

    const allTruthHashes = new Set<string>();
    let totalEntries = 0;
    let totalNearestPasses = 0;

    for (const packRow of manifest.packs) {
      const slot = packRow[0];
      const band = manifest.bands[packRow[5]] as Rung;
      expect(slot).toBeGreaterThanOrEqual(310);
      expect(slot).toBeLessThanOrEqual(329);

      const parsed = parsePack(readPackText(productionDirs, slot), packRow, manifest);
      expect(parsed).not.toBeNull();
      if (!parsed) continue;

      const familyCounts = new Map<string, number>();
      let bandNearest = 0;

      for (const row of parsed.rows) {
        totalEntries++;
        const raw = JSON.parse(row);
        const template = raw[2] as string;
        const p = tuplePuzzle(raw[3]);
        expect(p).not.toBeNull();
        if (!p) continue;
        expect(p.rung).toBe(band);
        expect(p.len).toBe(band === 'a' ? 2 : 3);

        const rule = RULE_BY_ID.get(p.ruleId)!;
        expect(rule).toBeDefined();
        expect(allTruthHashes.has(rule.tableHash)).toBe(false);
        allTruthHashes.add(rule.tableHash);

        familyCounts.set(template, (familyCounts.get(template) ?? 0) + 1);

        // Quiz disagreement & balanced non-alternating proof
        const ev0 = starterEvidence(p);
        const live0 = liveHypotheses(p.rung, p.len, ev0);
        const rivals = live0.filter(h => h.id !== rule.id);
        expect(rivals.length).toBeGreaterThanOrEqual(1);
        const qAns = p.quiz.map(r => evaluateRow(rule, p.len, r));
        const qPass = qAns.filter(Boolean).length;
        expect(qPass === 2 || qPass === 3).toBe(true);
        expect(isNonAlternating(qAns)).toBe(true);
        expect(rivals.some(h => p.quiz.some((r, i) => evaluateRow(h, p.len, r) !== qAns[i]))).toBe(true);

        // Copy-nearest habit simulation
        if (copyNearestPasses(p.len, rule, p.starters, p.quiz)) {
          bandNearest++;
          totalNearestPasses++;
        }

        // Good tester identifies cleanly
        const w = goodTesterWitness(p, 16);
        expect(w.identified).toBe(true);
      }

      // No rule family > 25% of a band
      const cap = Math.max(1, Math.floor(parsed.rows.length * 0.25));
      for (const [fam, count] of familyCounts) {
        expect(count, `band ${band} family ${fam} (${count}/${parsed.rows.length})`).toBeLessThanOrEqual(cap);
      }
      // Copy-nearest habit <= 20% in every single band
      expect(bandNearest / parsed.rows.length, `band ${band} copy-nearest`).toBeLessThanOrEqual(0.2);
    }

    expect(totalEntries).toBe(384);
    expect(allTruthHashes.size).toBe(384);
    expect(totalNearestPasses / totalEntries).toBeLessThanOrEqual(0.2);
  });

  it('produces identical public hints on hidden twin worlds without leaking the secret rule', () => {
    const { families } = readCatalog(productionDirs);
    const manifest = families.get('gate-crab')!;
    for (const packRow of manifest.packs) {
      const parsed = parsePack(readPackText(productionDirs, packRow[0]), packRow, manifest)!;
      const sample = parsed.rows.slice(0, 3);
      for (const line of sample) {
        const raw = JSON.parse(line);
        const p = tuplePuzzle(raw[3])!;
        const d = {
          format: 1 as const, seed: raw[0] as number, rng: 1 as const, band: p.rung,
          layout: raw[1] as string, template: raw[2] as string, payload: p,
          objectives: [], limits: [], par: null, teaches: [], speech: null,
        };
        const s0 = gateCrabAdapter.create(d);
        const h0 = gateCrabAdapter.hint!(s0, d);
        expect(h0).not.toBeNull();
        const twins = gateCrabAdapter.hidden!.twins(s0, d);
        expect(twins.length).toBeGreaterThanOrEqual(1);
        for (const twin of twins) {
          expect(twin.descriptor.payload.ruleId).not.toBe(p.ruleId);
          expect(gateCrabAdapter.hint!(twin.state, twin.descriptor)).toBe(h0);
        }
      }
    }
  });

  it('finds a contrasting tested row and clear difference note for a counterexample', () => {
    const rule = RULE_BY_ID.get('c-p1-big')!;
    const ev = [
      { row: 0, pass: evaluateRow(rule, 3, 0) }, // small coral, small coral, small coral (BLOCK)
      { row: 18, pass: evaluateRow(rule, 3, 18) }, // small coral, BIG coral, small coral (PASS)
    ];
    const contrast = closestContrastingEvidence(3, 18, true, ev);
    expect(contrast?.row).toBe(0);
    expect(compareRowsText(3, 18, 0)).toContain('middle shell');
  });

  it('grows hypothesis space and minimax test depth smoothly from Rung A to Rung F', () => {
    const sizes = RUNGS.map(r => HYPOTHESES_FOR_RUNG[r].length);
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeGreaterThan(sizes[i - 1]);
    expect(bestSplittingRow('a', 2, [{ row: 0, pass: false }])).not.toBeNull();
  });
});
