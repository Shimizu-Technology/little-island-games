import { describe, expect, it } from 'vitest';
import {
  acceptsAnswer, analyzeOdd, analyzeSort, bestPublicWeighing, closure, consistentWorlds, isPairKnown,
  linearExtensions, maskOf, ODD_EITHER_PAR, ODD_HEAVY_PAR, provenPar, puzzleTuple, SORT_PAR, tuplePuzzle,
  validPuzzle, weighOnScale, type PublicBoard, type ShellPuzzle, type SortPuzzle, type Weighing,
} from '../src/learn/games/shell-scale/rules';
import { shellHelpRules, type PublicScaleView } from '../src/learn/games/shell-scale/help';
import { adapterPublicHint, runPublicPolicy, shellScaleAdapter } from '../src/puzzles/adapters/shell-scale';
import { verifyShippedParTable } from '../scripts/puzzles/families/shell-scale-proof';
import { requestHint } from '../src/puzzles/hints';

function permutations(n: number): number[][] {
  if (n <= 1) return [[0]];
  const out: number[][] = [];
  for (const p of permutations(n - 1)) {
    for (let i = 0; i <= p.length; i++) {
      out.push([...p.slice(0, i), n - 1, ...p.slice(i)]);
    }
  }
  return out;
}

describe('Shell Scale proven par table (build-time minimax proof)', () => {
  it('proves exact sort par 1, 3, 5, 7, 10 and odd-pearl par 1, 2, 3 (13 needs 4)', () => {
    expect([SORT_PAR[2], SORT_PAR[3], SORT_PAR[4], SORT_PAR[5], SORT_PAR[6]]).toEqual([1, 3, 5, 7, 10]);
    expect(ODD_HEAVY_PAR[3]).toBe(1);
    expect(ODD_HEAVY_PAR[9]).toBe(2);
    expect(ODD_EITHER_PAR[12]).toBe(3);

    const proof = verifyShippedParTable();
    expect(proof.sort[2].par).toBe(1);
    expect(proof.sort[3].par).toBe(3);
    expect(proof.sort[4].par).toBe(5);
    expect(proof.sort[5].par).toBe(7);
    expect(proof.sort[6].par).toBe(10);
    expect(proof.oddHeavy[9]).toBe(2);
    expect(proof.oddEither[12]).toBe(3);
    expect(proof.oddEither[13]).toBe(4);
  });

  it('optimal public-knowledge policy solves EVERY sort permutation (n=2..6) within proven par', () => {
    for (const n of [2, 3, 4, 5, 6]) {
      const par = SORT_PAR[n];
      let worst = 0;
      const cast = Array.from({ length: n }, (_, i) => i);
      for (const weights of permutations(n)) {
        const p: SortPuzzle = { kind: 'sort', n, cast, weights };
        const res = runPublicPolicy(p);
        expect(res, `n=${n} weights=${weights.join('')}`).not.toBeNull();
        expect(res!.weighings, `n=${n} weights=${weights.join('')}`).toBeLessThanOrEqual(par);
        if (res!.weighings > worst) worst = res!.weighings;
      }
      expect(worst).toBe(par);
    }
  });

  it('optimal public-knowledge policy solves EVERY 9-pearl heavy world in 2 and EVERY 12-pearl heavy/light world in 3', () => {
    for (let odd = 0; odd < 9; odd++) {
      const res = runPublicPolicy({ kind: 'odd-heavy', n: 9, cast: [0], odd });
      expect(res?.weighings).toBe(2);
    }
    for (let odd = 0; odd < 12; odd++) {
      for (const dir of ['heavy', 'light'] as const) {
        const res = runPublicPolicy({ kind: 'odd-either', n: 12, cast: [0], odd, dir });
        expect(res?.weighings, `pearl ${odd} ${dir}`).toBe(3);
      }
    }
  });

  it('simple neighbour-bubble habit exceeds par on 4, 5, and 6 shells, and 4v4 fails par on 9 pearls', () => {
    const bubbleWeighings = (weights: number[]) => {
      const n = weights.length;
      let rel = new Array<number>(n).fill(0);
      let count = 0;
      const row = Array.from({ length: n }, (_, i) => i);
      for (let pass = 0; pass < n; pass++) {
        for (let a = 0; a + 1 < n; a++) {
          const i = row[a], j = row[a + 1];
          if (!isPairKnown(rel, i, j)) {
            count++;
            const next = rel.slice();
            if (weights[i] > weights[j]) next[i] |= 1 << j;
            else next[j] |= 1 << i;
            rel = closure(n, next);
          }
          if ((rel[i] >> j) & 1) [row[a], row[a + 1]] = [j, i];
        }
      }
      return count;
    };
    // Reversed order forces bubble habit over par on n=4 (6>5), n=5 (10>7), n=6 (15>10).
    expect(bubbleWeighings([3, 2, 1, 0])).toBeGreaterThan(SORT_PAR[4]);
    expect(bubbleWeighings([4, 3, 2, 1, 0])).toBeGreaterThan(SORT_PAR[5]);
    expect(bubbleWeighings([5, 4, 3, 2, 1, 0])).toBeGreaterThan(SORT_PAR[6]);

    // Starting 4v4 on 9 pearls leaves 4 candidates if it tips, which requires 2 more weighings (total 3 > par 2).
    const after4v4: Weighing[] = [{ left: maskOf([0, 1, 2, 3]), right: maskOf([4, 5, 6, 7]), outcome: 'L' }];
    const remaining = analyzeOdd('odd-heavy', 9, after4v4).maybeHeavy;
    expect(remaining).toHaveLength(4);
    expect(Math.ceil(Math.log(remaining.length) / Math.log(3)) + 1).toBe(3);
  });
});

describe('Public-knowledge hints & transitive closure purity', () => {
  it('transitive closure marks implied pairs as already known without weighing them', () => {
    // 0 < 1 and 1 < 2 -> implies 0 < 2 automatically!
    const history: Weighing[] = [
      { left: 1 << 0, right: 1 << 1, outcome: 'R' },
      { left: 1 << 1, right: 1 << 2, outcome: 'R' },
    ];
    const info = analyzeSort(3, history);
    expect(isPairKnown(info.rel, 0, 2)).toBe(true);
    expect(info.knownPairs).toEqual([[0, 1], [0, 2], [1, 2]]);
    expect(info.unknownPairs).toEqual([]);
    expect(info.deducedOrder).toEqual([0, 1, 2]);
    expect(linearExtensions(3, info.rel)).toBe(1);
  });

  it('identical public weighing transcript across different consistent hidden worlds produces the EXACT same hints', async () => {
    // Sort 5 shells: 0 < 1 and 2 < 3 -> many distinct consistent weight assignments!
    const sortHistory: Weighing[] = [
      { left: 1 << 0, right: 1 << 1, outcome: 'R' },
      { left: 1 << 2, right: 1 << 3, outcome: 'R' },
    ];
    const sortPub: PublicBoard = { kind: 'sort', n: 5, cast: [0, 1, 2, 3, 4], history: sortHistory };
    const sortWorlds = consistentWorlds(sortPub, 10);
    expect(sortWorlds.length).toBeGreaterThanOrEqual(6);

    const ac = new AbortController();
    const firstSortView: PublicScaleView = { ...sortPub, order: [-1, -1, -1, -1, -1], oddPick: null, oddDir: null };
    const firstSortRules = shellHelpRules(firstSortView);
    const refLook = await requestHint(firstSortRules, firstSortView, 'look', ac.signal);
    const refThink = await requestHint(firstSortRules, firstSortView, 'think', ac.signal);
    const refStep = await requestHint(firstSortRules, firstSortView, 'one-step', ac.signal);
    const refAdapter = adapterPublicHint({ history: sortHistory, order: [-1, -1, -1, -1, -1], oddPick: null, oddDir: null }, sortWorlds[0]);

    // Verify Step 1 (Look) greys out known pairs & Step 2 (Think) suggests optimal public weighing.
    expect(refLook.status === 'cue' && refLook.cue.focus.includes('grey-known')).toBe(true);
    expect(refThink.status === 'cue' && refThink.cue.focus.some(f => f.startsWith('panL:'))).toBe(true);

    for (const world of sortWorlds) {
      // Every twin must genuinely match every weighing in the public transcript.
      for (const w of sortHistory) expect(weighOnScale(world, w.left, w.right)).toBe(w.outcome);
      const state = { history: sortHistory, order: [-1, -1, -1, -1, -1], oddPick: null, oddDir: null };
      expect(adapterPublicHint(state, world)).toBe(refAdapter);
      const view: PublicScaleView = { kind: world.kind, n: world.n, cast: world.cast, history: sortHistory, order: state.order, oddPick: null, oddDir: null };
      const rules = shellHelpRules(view);
      expect(await requestHint(rules, view, 'look', ac.signal)).toEqual(refLook);
      expect(await requestHint(rules, view, 'think', ac.signal)).toEqual(refThink);
      expect(await requestHint(rules, view, 'one-step', ac.signal)).toEqual(refStep);
    }

    // Odd-either 12 pearls: 4v4 tips Left -> 8 distinct consistent hidden worlds (0..3 heavy, 4..7 light)!
    const oddHistory: Weighing[] = [{ left: maskOf([0, 1, 2, 3]), right: maskOf([4, 5, 6, 7]), outcome: 'L' }];
    const oddPub: PublicBoard = { kind: 'odd-either', n: 12, cast: [0], history: oddHistory };
    const oddWorlds = consistentWorlds(oddPub, 20);
    expect(oddWorlds).toHaveLength(8);
    const refOddNext = bestPublicWeighing(oddPub);
    expect(refOddNext).not.toBeNull();
    const refOddHint = adapterPublicHint({ history: oddHistory, order: [], oddPick: null, oddDir: null }, oddWorlds[0]);
    for (const world of oddWorlds) {
      expect(weighOnScale(world, oddHistory[0].left, oddHistory[0].right)).toBe('L');
      expect(adapterPublicHint({ history: oddHistory, order: [], oddPick: null, oddDir: null }, world)).toBe(refOddHint);
    }
  });

  it('round-trips every tuple format and rejects malformed payloads', () => {
    const samples: ShellPuzzle[] = [
      { kind: 'sort', n: 4, cast: [0, 2, 4, 5], weights: [2, 0, 3, 1] },
      { kind: 'odd-heavy', n: 9, cast: [3], odd: 6 },
      { kind: 'odd-either', n: 12, cast: [1], odd: 10, dir: 'light' },
    ];
    for (const p of samples) {
      expect(validPuzzle(p)).toBe(true);
      expect(tuplePuzzle(puzzleTuple(p))).toEqual(p);
      expect(shellScaleAdapter.decodePayload(shellScaleAdapter.encodePayload(p))).toEqual(p);
    }
    expect(tuplePuzzle(['s', 4, '012', '0123'])).toBeNull();
    expect(tuplePuzzle(['s', 4, '0012', '0123'])).toBeNull();
    expect(tuplePuzzle(['h', 9, 0, 9])).toBeNull();
    expect(tuplePuzzle(['e', 12, 0, 5, 2])).toBeNull();
    expect(acceptsAnswer(samples[0], { order: [1, 3, 0, 2], oddPick: null, oddDir: null })).toBe(true);
    expect(provenPar(samples[2])).toBe(3);
  });
});
