import {
  acceptsAnswer, analyzeOdd, analyzeSort, bestPublicWeighing, consistentWorlds, emptyOrder, orderComplete,
  placeInOrder, provenPar, puzzleTuple, tuplePuzzle, validOrder, validPanPair, validPuzzle, weighOnScale,
  type OddDir, type PublicBoard, type ShellPuzzle, type Weighing,
} from '../../learn/games/shell-scale/rules';
import { exactKeys, plain } from '../../state/saveBits';
import { sha256Hex } from '../sha256';
import type { Claim, DescriptorCore, HiddenTwin, PuzzleAdapter, SolveResult, TechniqueResult } from '../types';

/**
 * Shell Scale adapter for the shared puzzle kit (`certify` gates 1–8 + `hiddenInformation` twin checks).
 *
 * Compact integer actions:
 * - `0..99`: `placeSort(item, slot)` = `item * 8 + (slot + 1)` (slot -1..5)
 * - `100..149`: `pickOdd(pearl, dir)` = `100 + pearl * 2 + (dir === 'light' ? 1 : 0)`
 * - `1000..`: `weigh(leftMask, rightMask)` = `1000 + leftMask * 4096 + rightMask`
 */
export type ShellAdapterState = {
  history: Weighing[];
  order: number[];
  oddPick: number | null;
  oddDir: OddDir | null;
};

export type ShellAdapterAction = number;
type D = DescriptorCore<ShellPuzzle>;

export const PICK_ODD_BASE = 100;
export const WEIGH_BASE = 1000;

export const encodeSortPlace = (item: number, slot: number): number => item * 8 + (slot + 1);
export const decodeSortPlace = (a: number) => ({ item: Math.floor(a / 8), slot: (a % 8) - 1 });
export const encodeOddPick = (pearl: number, dir: OddDir): number => PICK_ODD_BASE + pearl * 2 + (dir === 'light' ? 1 : 0);
export const decodeOddPick = (a: number): { pearl: number; dir: OddDir } => {
  const v = a - PICK_ODD_BASE;
  return { pearl: Math.floor(v / 2), dir: v % 2 === 1 ? 'light' : 'heavy' };
};
export const encodeWeigh = (left: number, right: number): number => WEIGH_BASE + left * 4096 + right;
export const decodeWeigh = (a: number) => {
  const v = a - WEIGH_BASE;
  return { left: Math.floor(v / 4096), right: v % 4096 };
};

export function isShellAdapterAction(a: unknown): a is number {
  if (!Number.isInteger(a)) return false;
  const n = a as number;
  if (n >= 0 && n < 6 * 8) return n % 8 <= 6;
  if (n >= PICK_ODD_BASE && n < PICK_ODD_BASE + 24) return true;
  if (n >= WEIGH_BASE && n < WEIGH_BASE + 4096 * 4096) {
    const { left, right } = decodeWeigh(n);
    return left > 0 && right > 0 && (left & right) === 0;
  }
  return false;
}

const publicBoardOf = (s: ShellAdapterState, p: ShellPuzzle): PublicBoard => ({
  kind: p.kind,
  n: p.n,
  cast: p.cast,
  history: s.history,
});

/** Public-knowledge hint policy: NEVER reads hidden weights, odd pearl, or odd direction. */
export function adapterPublicHint(s: ShellAdapterState, p: ShellPuzzle): number | null {
  const pub = publicBoardOf(s, p);
  if (p.kind === 'sort') {
    const info = analyzeSort(p.n, s.history);
    if (info.deducedOrder) {
      for (let slot = 0; slot < p.n; slot++) {
        const want = info.deducedOrder[slot];
        if (s.order[slot] !== want) return encodeSortPlace(want, slot);
      }
      return null;
    }
    const w = bestPublicWeighing(pub);
    return w ? encodeWeigh(w.left, w.right) : null;
  }
  const info = analyzeOdd(p.kind, p.n, s.history);
  if (info.deduced) {
    if (s.oddPick !== info.deduced.odd || (p.kind === 'odd-either' && s.oddDir !== info.deduced.dir)) {
      return encodeOddPick(info.deduced.odd, info.deduced.dir);
    }
    return null;
  }
  const w = bestPublicWeighing(pub);
  return w ? encodeWeigh(w.left, w.right) : null;
}

/** Replay the deterministic public-knowledge strategy to produce a certified witness & trace. */
export function runPublicPolicy(p: ShellPuzzle): { witness: number[]; weighings: number; trace: string } | null {
  let s: ShellAdapterState = {
    history: [],
    order: p.kind === 'sort' ? emptyOrder(p.n) : [],
    oddPick: null,
    oddDir: null,
  };
  const witness: number[] = [];
  const steps: string[] = [];
  for (let guard = 0; guard < 40; guard++) {
    if (acceptsAnswer(p, s)) return { witness, weighings: s.history.length, trace: steps.join(';') };
    const a = adapterPublicHint(s, p);
    if (a === null) return null;
    const next = reduceState(s, a, p);
    if (next === s) return null;
    witness.push(a);
    if (a >= WEIGH_BASE) {
      const last = next.history[next.history.length - 1];
      steps.push(`W(${last.left}:${last.right}=${last.outcome})`);
    } else if (a >= PICK_ODD_BASE) {
      const { pearl, dir } = decodeOddPick(a);
      steps.push(`O(${pearl}:${dir})`);
    } else {
      const { item, slot } = decodeSortPlace(a);
      steps.push(`P(${item}@${slot})`);
    }
    s = next;
  }
  return acceptsAnswer(p, s) ? { witness, weighings: s.history.length, trace: steps.join(';') } : null;
}

function reduceState(s: ShellAdapterState, a: number, p: ShellPuzzle): ShellAdapterState {
  if (a >= WEIGH_BASE) {
    const { left, right } = decodeWeigh(a);
    const outcome = weighOnScale(p, left, right);
    if (!outcome) return s;
    return { ...s, history: [...s.history, { left, right, outcome }] };
  }
  if (a >= PICK_ODD_BASE) {
    if (p.kind === 'sort') return s;
    const { pearl, dir } = decodeOddPick(a);
    if (pearl < 0 || pearl >= p.n) return s;
    if (p.kind === 'odd-heavy' && dir !== 'heavy') return s;
    if (s.oddPick === pearl && s.oddDir === dir) return s;
    return { ...s, oddPick: pearl, oddDir: dir };
  }
  if (p.kind !== 'sort') return s;
  const { item, slot } = decodeSortPlace(a);
  if (item < 0 || item >= p.n || slot < -1 || slot >= p.n) return s;
  const nextOrder = placeInOrder(s.order, p.n, item, slot);
  if (nextOrder === s.order) return s;
  return { ...s, order: nextOrder };
}

function legalActions(s: ShellAdapterState, p: ShellPuzzle): number[] {
  const out: number[] = [];
  if (p.kind === 'sort') {
    for (let i = 0; i < p.n; i++) {
      for (let j = i + 1; j < p.n; j++) out.push(encodeWeigh(1 << i, 1 << j));
    }
    for (let item = 0; item < p.n; item++) {
      for (let slot = 0; slot < p.n; slot++) {
        if (s.order[slot] !== item) out.push(encodeSortPlace(item, slot));
      }
    }
    return out;
  }
  // Odd-pearl public actions: small weighings, pearl picks, then larger group weighings.
  for (let size = 1; size <= 2 && size * 2 <= p.n; size++) {
    for (let start = 0; start + size * 2 <= p.n; start++) {
      let l = 0, r = 0;
      for (let k = 0; k < size; k++) {
        l |= 1 << (start + k);
        r |= 1 << (start + size + k);
      }
      out.push(encodeWeigh(l, r));
    }
  }
  for (let i = 0; i < p.n; i++) {
    if (s.oddPick !== i || s.oddDir !== 'heavy') out.push(encodeOddPick(i, 'heavy'));
    if (p.kind === 'odd-either' && (s.oddPick !== i || s.oddDir !== 'light')) out.push(encodeOddPick(i, 'light'));
  }
  for (let size = 3; size * 2 <= p.n; size++) {
    for (let start = 0; start + size * 2 <= p.n; start++) {
      let l = 0, r = 0;
      for (let k = 0; k < size; k++) {
        l |= 1 << (start + k);
        r |= 1 << (start + size + k);
      }
      out.push(encodeWeigh(l, r));
    }
  }
  return out;
}

export function semanticKey(p: ShellPuzzle): string {
  if (p.kind === 'sort') return `sort:${p.n}:${p.cast.join('')}:${p.weights.join('')}`;
  if (p.kind === 'odd-heavy') return `odd-heavy:${p.n}:${p.odd}`;
  return `odd-either:${p.n}:${p.odd}:${p.dir}`;
}

function validState(x: unknown, d: D): x is ShellAdapterState {
  if (!plain(x) || !exactKeys(x, ['history', 'order', 'oddPick', 'oddDir'])) return false;
  const s = x as ShellAdapterState, p = d.payload;
  if (!Array.isArray(s.history)) return false;
  for (const w of s.history) {
    if (!plain(w) || !exactKeys(w, ['left', 'right', 'outcome'])) return false;
    if (!validPanPair(p, w.left, w.right)) return false;
    if (weighOnScale(p, w.left, w.right) !== w.outcome) return false;
  }
  if (p.kind === 'sort') {
    return validOrder(p.n, s.order) && s.oddPick === null && s.oddDir === null;
  }
  if (!Array.isArray(s.order) || s.order.length !== 0) return false;
  const pickOk = s.oddPick === null || (Number.isInteger(s.oddPick) && s.oddPick >= 0 && s.oddPick < p.n);
  const dirOk = s.oddDir === null || s.oddDir === 'heavy' || (p.kind === 'odd-either' && s.oddDir === 'light');
  return pickOk && dirOk;
}

function solve(d: D): SolveResult<ShellAdapterAction> {
  const res = runPublicPolicy(d.payload);
  if (!res) return { status: 'unsolved' };
  const par = provenPar(d.payload);
  if (res.weighings > par) return { status: 'unsolved' };
  return {
    status: 'solved',
    witness: res.witness,
    metric: 'turns',
    lower: res.weighings,
    upper: par,
    exact: res.weighings === par,
  };
}

function technique(d: D): TechniqueResult {
  const res = runPublicPolicy(d.payload);
  if (!res) return { status: 'stalled' };
  const ceiling = d.payload.kind === 'sort'
    ? `sort-${d.payload.n}-par-${provenPar(d.payload)}`
    : d.payload.kind === 'odd-heavy'
      ? `group-${d.payload.n}-heavy-par-${provenPar(d.payload)}`
      : `group-${d.payload.n}-either-par-${provenPar(d.payload)}`;
  return { status: 'complete', ceiling, steps: res.weighings, trace: res.trace };
}

function claims(d: D): Claim[] {
  const p = d.payload;
  const par = provenPar(p);
  const res = runPublicPolicy(p);
  const exactPar = !!res && res.weighings === par;
  const expectedPar = p.kind === 'sort'
    ? ({ 2: 1, 3: 3, 4: 5, 5: 7, 6: 10 } as Record<number, number>)[p.n]
    : p.kind === 'odd-heavy'
      ? ({ 3: 1, 9: 2 } as Record<number, number>)[p.n]
      : 3;
  return [
    { id: 'proven-par-table', proven: par === expectedPar, evidence: `${p.kind}:${p.n}=>${par}` },
    { id: 'public-policy-hits-par', proven: exactPar, evidence: res ? `weighings:${res.weighings}/${par}` : 'failed' },
  ];
}

export const shellScaleAdapter: PuzzleAdapter<ShellPuzzle, ShellAdapterState, ShellAdapterAction> = {
  engine: 'shell-scale',
  rules: 1,
  needsCheck: true,
  isPayload: (x): x is ShellPuzzle => validPuzzle(x) && tuplePuzzle(puzzleTuple(x)) !== null,
  isAction: isShellAdapterAction,
  encodePayload: puzzleTuple,
  decodePayload: tuplePuzzle,
  create: d => ({
    history: [],
    order: d.payload.kind === 'sort' ? emptyOrder(d.payload.n) : [],
    oddPick: null,
    oddDir: null,
  }),
  validState,
  reduce: (s, a, d) => reduceState(s, a, d.payload),
  actions: (s, d) => legalActions(s, d.payload),
  solved: (s, d) => acceptsAnswer(d.payload, s),
  metrics: s => ({ turns: s.history.length }),
  solve: d => solve(d),
  semanticKey: d => semanticKey(d.payload),
  solutionHash: (s, d) => sha256Hex(`scale|${puzzleTuple(d.payload).join('|')}|${s.order.join(',')}|${s.oddPick ?? ''}|${s.oddDir ?? ''}`),
  hint: (s, d) => adapterPublicHint(s, d.payload),
  hidden: {
    view: (s, d) => ({
      kind: d.payload.kind,
      n: d.payload.n,
      cast: d.payload.cast,
      history: s.history,
      order: s.order,
      oddPick: s.oddPick,
      oddDir: s.oddDir,
    }),
    twins: (s, d): HiddenTwin<ShellPuzzle, ShellAdapterState>[] => {
      const worlds = consistentWorlds(publicBoardOf(s, d.payload), 6);
      const mine = JSON.stringify(puzzleTuple(d.payload));
      return worlds
        .filter(w => JSON.stringify(puzzleTuple(w)) !== mine)
        .slice(0, 4)
        .map(payload => ({
          state: s,
          descriptor: { ...d, payload },
        }));
    },
  },
  technique,
  claims,
};

export { orderComplete };
