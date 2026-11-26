import {
  provenPar, type OddEitherPuzzle, type OddHeavyPuzzle, type ShellPuzzle, type SortPuzzle,
} from '../../../src/learn/games/shell-scale/rules';
import { runPublicPolicy, shellScaleAdapter } from '../../../src/puzzles/adapters/shell-scale';
import { createRng } from '../../../src/puzzles/rng';
import { parFrom } from '../../../src/puzzles/solver';
import type { BandQuota, DescriptorCore, FamilySpec } from '../../../src/puzzles/types';

export type ScaleRung = 'a' | 'b' | 'c' | 'd' | 'e' | 'f';

const bands: BandQuota[] = [
  { id: 'a', target: 4, floor: 4, advanced: false },
  { id: 'b', target: 4, floor: 4, advanced: false },
  { id: 'c', target: 6, floor: 6, advanced: true },
  { id: 'd', target: 6, floor: 6, advanced: true },
  { id: 'e', target: 6, floor: 6, advanced: true },
  { id: 'f', target: 6, floor: 6, advanced: true },
];

const BAND_A_CURATED: readonly { cast: [number, number]; weights: [number, number]; layout: string; template: string }[] = [
  { cast: [0, 1], weights: [1, 0], layout: 'left-heavy', template: 'a0-s2-lh' },
  { cast: [2, 3], weights: [0, 1], layout: 'right-heavy', template: 'a1-s2-rh' },
  { cast: [4, 5], weights: [1, 0], layout: 'left-heavy', template: 'a2-s2-lh' },
  { cast: [1, 2], weights: [0, 1], layout: 'right-heavy', template: 'a3-s2-rh' },
];

const BAND_B_CURATED: readonly { cast: [number, number, number]; weights: [number, number, number]; layout: string; template: string }[] = [
  { cast: [0, 1, 2], weights: [0, 2, 1], layout: 'mid-last', template: 'b0-s3-ml' },
  { cast: [1, 2, 3], weights: [2, 0, 1], layout: 'mid-hi', template: 'b1-s3-mh' },
  { cast: [2, 3, 4], weights: [0, 2, 1], layout: 'mid-last', template: 'b2-s3-ml' },
  { cast: [3, 4, 5], weights: [2, 0, 1], layout: 'mid-hi', template: 'b3-s3-mh' },
];

const BAND_D_PEARLS: readonly { odd: number; theme: number; layout: string; template: string }[] = [
  { odd: 0, theme: 0, layout: 'group-left', template: 'd0-left-first' },
  { odd: 4, theme: 1, layout: 'group-right', template: 'd1-right-mid' },
  { odd: 6, theme: 2, layout: 'group-off', template: 'd2-off-first' },
  { odd: 1, theme: 3, layout: 'group-left', template: 'd3-left-mid' },
  { odd: 5, theme: 4, layout: 'group-right', template: 'd4-right-last' },
  { odd: 7, theme: 5, layout: 'group-off', template: 'd5-off-mid' },
];

const BAND_F_PEARLS: readonly { odd: number; dir: 'heavy' | 'light'; theme: number; layout: string; template: string }[] = [
  { odd: 1, dir: 'heavy', theme: 0, layout: 'pearl12-left', template: 'f3-12p-left-heavy' },
  { odd: 6, dir: 'light', theme: 2, layout: 'pearl12-right', template: 'f4-12p-right-light' },
  { odd: 10, dir: 'heavy', theme: 4, layout: 'pearl12-off', template: 'f5-12p-off-heavy' },
];

function wrap(
  seed: number,
  band: ScaleRung,
  payload: ShellPuzzle,
  layout: string,
  template: string,
  teaches: string[],
  advanced: boolean,
): DescriptorCore<ShellPuzzle> | null {
  const par = provenPar(payload);
  const res = runPublicPolicy(payload);
  if (!res || res.weighings !== par) return null;
  return {
    format: 1,
    seed,
    rng: 1,
    band,
    layout,
    template,
    payload,
    objectives: [],
    limits: advanced ? [{ metric: 'turns', max: par }] : [],
    par: parFrom('turns', par, par),
    teaches,
    speech: null,
  };
}

export function generateShellScale(seed: number, band: BandQuota): DescriptorCore<ShellPuzzle> | null {
  const b = band.id as ScaleRung;
  const rng = createRng(seed);
  const idx = ((seed & 0xffff) - 1) & 0xffff;

  if (b === 'a') {
    if (idx >= BAND_A_CURATED.length) return null;
    const spec = BAND_A_CURATED[idx];
    const payload: SortPuzzle = { kind: 'sort', n: 2, cast: [...spec.cast], weights: [...spec.weights] };
    return wrap(seed, b, payload, spec.layout, spec.template, idx === 0 ? ['weigh-pair'] : [], false);
  }

  if (b === 'b') {
    if (idx >= BAND_B_CURATED.length) return null;
    const spec = BAND_B_CURATED[idx];
    const payload: SortPuzzle = { kind: 'sort', n: 3, cast: [...spec.cast], weights: [...spec.weights] };
    return wrap(seed, b, payload, spec.layout, spec.template, idx === 0 ? ['transitivity'] : [], false);
  }

  if (b === 'd') {
    const spec = BAND_D_PEARLS[idx % BAND_D_PEARLS.length];
    const payload: OddHeavyPuzzle = { kind: 'odd-heavy', n: 9, cast: [spec.theme], odd: spec.odd };
    return wrap(seed, b, payload, spec.layout, spec.template, spec.odd === 0 ? ['group-weigh-3v3'] : [], true);
  }

  if (b === 'f' && idx % 2 === 1) {
    const pIdx = Math.floor(idx / 2);
    if (pIdx >= BAND_F_PEARLS.length) return null;
    const spec = BAND_F_PEARLS[pIdx];
    const payload: OddEitherPuzzle = { kind: 'odd-either', n: 12, cast: [spec.theme], odd: spec.odd, dir: spec.dir };
    return wrap(seed, b, payload, spec.layout, spec.template, pIdx === 0 ? ['group-weigh-12-either'] : [], true);
  }

  const n = b === 'c' ? 4 : b === 'e' ? 5 : 6;
  const cast = rng.shuffle([0, 1, 2, 3, 4, 5]).slice(0, n);
  const weights = rng.shuffle(Array.from({ length: n }, (_, i) => i));
  // Avoid trivial ascending/descending orders so dumb bots never guess them.
  if (weights.every((w, i) => w === i) || weights.every((w, i) => w === n - 1 - i)) return null;
  const payload: SortPuzzle = { kind: 'sort', n, cast, weights };
  const par = provenPar(payload);
  const res = runPublicPolicy(payload);
  if (!res || res.weighings !== par) return null;

  // Use weights permutation signature as distinct template so every certified insight puzzle is structurally distinct.
  const heaviest = weights.indexOf(n - 1);
  const layout = b === 'f' ? `sort6-h${heaviest}` : `sort${n}-h${heaviest}`;
  const template = `${b}-${weights.join('')}`;
  const teaches = b === 'c' ? ['four-in-five'] : b === 'e' ? ['five-in-seven'] : ['six-in-ten'];
  return wrap(seed, b, payload, layout, template, teaches, band.advanced);
}

export const shellScaleFamily: FamilySpec<ShellPuzzle> = {
  id: 'shell-scale',
  adapter: shellScaleAdapter,
  sources: [
    'src/learn/games/shell-scale/rules.ts',
    'src/puzzles/adapters/shell-scale.ts',
    'scripts/puzzles/families/shell-scale.ts',
  ],
  bands,
  provenance: {
    source: 'original',
    note: 'Original balance-scale sorting (2-6 shells, par 1,3,5,7,10) and odd-pearl group weighing (9-pearl heavy par 2, 12-pearl heavy-or-light par 3) insight puzzles. Par table proven by exhaustive minimax search; every entry certified through public-knowledge twin tests.',
  },
  review: { ids: [], complete: false },
  maxRowBytes: 384,
  requiresUnique: false,
  requiresTrace: true,
  hiddenInformation: true,
  generate: (seed, band) => generateShellScale(seed, band),
};
