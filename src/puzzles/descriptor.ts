import { asciiId, exactKeys, plain, uint } from '../state/saveBits';
import { METRICS, type DescriptorCore, type Limit, type Metric, type Par, type PuzzleAdapter, type PuzzleDescriptor, type PuzzleRef, type Speech } from './types';

export const ROW_LIMITS = { ids: 8, idChars: 24, speechNumbers: 8, speechTerms: 8, metric: 4096 } as const;
const metric = (x: unknown): x is Metric => METRICS.includes(x as Metric);
const shortId = (x: unknown) => asciiId(x, ROW_LIMITS.idChars);
const ids = (x: unknown) => Array.isArray(x) && x.length <= ROW_LIMITS.ids && x.every(shortId) && new Set(x).size === x.length;
const validLimits = (x: unknown): x is Limit[] => Array.isArray(x) && x.length <= METRICS.length && new Set(x.map(l => l?.metric)).size === x.length
  && x.every(l => plain(l) && exactKeys(l, ['metric', 'max']) && metric(l.metric) && uint(l.max, ROW_LIMITS.metric) && l.max > 0);
const validPar = (x: unknown): x is Par | null => x === null || (plain(x) && exactKeys(x, ['metric', 'lower', 'upper', 'exact']) && metric(x.metric)
  && uint(x.lower, ROW_LIMITS.metric) && uint(x.upper, ROW_LIMITS.metric) && x.lower <= x.upper && x.exact === (x.lower === x.upper));
const validSpeech = (x: unknown): x is Speech | null => x === null || (plain(x) && exactKeys(x, ['template', 'numbers', 'terms']) && shortId(x.template)
  && Array.isArray(x.numbers) && x.numbers.length <= ROW_LIMITS.speechNumbers && x.numbers.every(n => Number.isInteger(n) && n >= -1000 && n <= 1000)
  && Array.isArray(x.terms) && x.terms.length <= ROW_LIMITS.speechTerms && x.terms.every(shortId));

export function validCore<P>(x: unknown, adapter: Pick<PuzzleAdapter<P, unknown, unknown>, 'isPayload'>): x is DescriptorCore<P> {
  return plain(x) && exactKeys(x, ['format', 'seed', 'rng', 'band', 'layout', 'template', 'payload', 'objectives', 'limits', 'par', 'teaches', 'speech'])
    && x.format === 1 && x.rng === 1 && uint(x.seed) && shortId(x.band) && shortId(x.layout) && shortId(x.template)
    && adapter.isPayload(x.payload) && ids(x.objectives) && ids(x.teaches) && validLimits(x.limits) && validPar(x.par) && validSpeech(x.speech);
}

/** Sorted-key JSON. Rejects values a plain-JSON pack could not carry back unchanged. */
export function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Object.is(value, -0)) throw new Error('Puzzle data must use finite numbers.');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) if (!(i in value)) throw new Error('Puzzle data cannot be sparse.');
    return `[${value.map(canonical).join(',')}]`;
  }
  if (plain(value)) return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  throw new Error('Puzzle data must be plain JSON.');
}
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/** Row tuple: [seed, layout, template, payload, par|0, objectives|0, limits|0, teaches|0, speech|0], trailing zeros dropped. */
export function encodeRow<P>(core: DescriptorCore<P>, adapter: Pick<PuzzleAdapter<P, unknown, unknown>, 'encodePayload'>): string {
  const row: unknown[] = [core.seed, core.layout, core.template, adapter.encodePayload(core.payload),
    core.par ? [core.par.metric, core.par.lower, core.par.upper] : 0,
    core.objectives.length ? core.objectives : 0,
    core.limits.length ? core.limits.map(l => [l.metric, l.max]) : 0,
    core.teaches.length ? core.teaches : 0,
    core.speech ? [core.speech.template, core.speech.numbers, core.speech.terms] : 0];
  while (row[row.length - 1] === 0) row.pop();
  return JSON.stringify(row);
}
export function decodeRow<P>(line: string, band: string, adapter: Pick<PuzzleAdapter<P, unknown, unknown>, 'decodePayload' | 'isPayload'>): DescriptorCore<P> | null {
  let row: unknown;
  try { row = JSON.parse(line); } catch { return null; }
  if (!Array.isArray(row) || row.length < 4 || row.length > 9) return null;
  const [seed, layout, template, rawPayload, par = 0, objectives = 0, limits = 0, teaches = 0, speech = 0] = row as unknown[];
  const payload = adapter.decodePayload(rawPayload);
  if (payload === null) return null;
  const pair = (x: unknown, length: number): x is unknown[] => Array.isArray(x) && x.length === length;
  if ((par !== 0 && !pair(par, 3)) || (limits !== 0 && !(Array.isArray(limits) && limits.every(l => pair(l, 2)))) || (speech !== 0 && !pair(speech, 3))) return null;
  const core = {
    format: 1 as const, seed, rng: 1 as const, band, layout, template, payload,
    objectives: objectives === 0 ? [] : objectives,
    limits: limits === 0 ? [] : (limits as unknown[][]).map(([m, max]) => ({ metric: m, max })),
    par: par === 0 ? null : { metric: (par as unknown[])[0], lower: (par as unknown[])[1], upper: (par as unknown[])[2], exact: (par as unknown[])[1] === (par as unknown[])[2] },
    teaches: teaches === 0 ? [] : teaches,
    speech: speech === 0 ? null : { template: (speech as unknown[])[0], numbers: (speech as unknown[])[1], terms: (speech as unknown[])[2] },
  };
  return validCore<P>(core, adapter) ? core : null;
}
export const withRef = <P,>(core: DescriptorCore<P>, ref: PuzzleRef): PuzzleDescriptor<P> => ({ ...core, ref });
