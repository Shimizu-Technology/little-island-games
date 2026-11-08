import { describe, expect, it } from 'vitest';
import { canonical, decodeRow, deepFreeze, encodeRow, validCore } from '../src/puzzles/descriptor';
import type { DescriptorCore } from '../src/puzzles/types';

type P = { n: number };
const adapter = { isPayload: (x: unknown): x is P => typeof (x as P)?.n === 'number', encodePayload: (p: P) => p.n, decodePayload: (x: unknown) => (typeof x === 'number' ? { n: x } : null) };
const core = (over: Partial<DescriptorCore<P>> = {}): DescriptorCore<P> => ({ format: 1, seed: 7, rng: 1, band: 'shallows', layout: 'cross', template: 'spine', payload: { n: 3 }, objectives: [], limits: [], par: null, teaches: [], speech: null, ...over });

describe('descriptor shell', () => {
  it('accepts a complete descriptor', () => expect(validCore(core(), adapter)).toBe(true));
  it.each<[string, unknown]>([
    ['unknown key', { ...core(), extra: 1 }],
    ['missing key', (() => { const { speech: _speech, ...rest } = core(); return rest; })()],
    ['format', core({ format: 2 as 1 })],
    ['rng revision', core({ rng: 2 as 1 })],
    ['negative seed', core({ seed: -1 })],
    ['seed above uint32', core({ seed: 2 ** 32 })],
    ['non-integer seed', core({ seed: 1.5 })],
    ['band id', core({ band: 'Has Spaces' })],
    ['layout length', core({ layout: 'x'.repeat(25) })],
    ['payload', core({ payload: { n: 'no' } as unknown as P })],
    ['too many objectives', core({ objectives: Array.from({ length: 9 }, (_, i) => `o${i}`) })],
    ['duplicate objectives', core({ objectives: ['a', 'a'] })],
    ['zero limit', core({ limits: [{ metric: 'steps', max: 0 }] })],
    ['limit above 4096', core({ limits: [{ metric: 'steps', max: 4097 }] })],
    ['unknown metric', core({ limits: [{ metric: 'clock' as 'steps', max: 5 }] })],
    ['duplicate metric', core({ limits: [{ metric: 'steps', max: 5 }, { metric: 'steps', max: 6 }] })],
    ['par lower above upper', core({ par: { metric: 'steps', lower: 9, upper: 8, exact: false } })],
    ['par falsely exact', core({ par: { metric: 'steps', lower: 3, upper: 8, exact: true } })],
    ['par falsely inexact', core({ par: { metric: 'steps', lower: 8, upper: 8, exact: false } })],
    ['speech number range', core({ speech: { template: 't', numbers: [1001], terms: [] } })],
    ['speech number count', core({ speech: { template: 't', numbers: Array(9).fill(1), terms: [] } })],
    ['speech term count', core({ speech: { template: 't', numbers: [], terms: Array.from({ length: 9 }, (_, i) => `t${i}`) } })],
    ['prototype key', JSON.parse('{"__proto__":{"format":1}}')],
    ['class instance', Object.assign(Object.create({ inherited: true }), core())],
  ])('rejects %s', (_, value) => expect(validCore(value, adapter)).toBe(false));

  it('round-trips rows and drops only trailing empty fields', () => {
    const bare = encodeRow(core(), adapter);
    expect(bare).toBe('[7,"cross","spine",3]');
    expect(decodeRow(bare, 'shallows', adapter)).toEqual(core());
    const full = core({ par: { metric: 'steps', lower: 2, upper: 4, exact: false }, objectives: ['reach'], limits: [{ metric: 'steps', max: 9 }], teaches: ['keys'], speech: { template: 'reach-in', numbers: [8], terms: ['shell'] } });
    expect(decodeRow(encodeRow(full, adapter), 'shallows', adapter)).toEqual(full);
    const middle = core({ limits: [{ metric: 'steps', max: 9 }] });
    expect(decodeRow(encodeRow(middle, adapter), 'shallows', adapter)).toEqual(middle);
  });
  it.each(['not json', '{}', '[1,2]', '[7,"cross","spine","no"]', '[7,"cross","spine",3,["steps",9]]', '[7,"cross","spine",3,0,0,[["steps"]]]', '[7,"cross","spine",3,0,0,0,0,0,0]', '[7,"BAD","spine",3]'])('rejects malformed row %s', line => {
    expect(decodeRow(line, 'shallows', adapter)).toBeNull();
  });
  it('derives exact from the bounds, so a row cannot claim a proof it lacks', () => {
    expect(decodeRow('[7,"cross","spine",3,["steps",2,4]]', 'shallows', adapter)?.par?.exact).toBe(false);
    expect(decodeRow('[7,"cross","spine",3,["steps",4,4]]', 'shallows', adapter)?.par?.exact).toBe(true);
  });
  it('makes canonical JSON independent of key order and strict about values', () => {
    expect(canonical({ b: 1, a: [true, null, 'x'] })).toBe(canonical({ a: [true, null, 'x'], b: 1 }));
    expect(() => canonical({ a: Number.NaN })).toThrow();
    expect(() => canonical({ a: Infinity })).toThrow();
    expect(() => canonical([-0])).toThrow();
    expect(() => canonical([1, , 3])).toThrow();
    expect(() => canonical(new Date())).toThrow();
    expect(() => canonical({ a: undefined })).toThrow();
  });
  it('deep-freezes nested data', () => {
    const value = deepFreeze({ a: { b: [1] } });
    expect(Object.isFrozen(value.a.b)).toBe(true);
    expect(() => { (value.a.b as number[]).push(2); }).toThrow();
  });
});
