import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createSha256, sha256Hex, sha256Sliced } from '../src/puzzles/sha256';
import { createRng } from '../src/puzzles/rng';

const native = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
const sample = ['', 'a', 'abc', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'x'.repeat(1000), 'Håfa Adai ñ å', '🐢 turtle 🌊', 'mixed é 漢字 😀 end'];
describe('SHA-256 over UTF-8', () => {
  it('agrees with the platform hash at every padding boundary', () => {
    for (const text of sample) expect(sha256Hex(text)).toBe(native(text));
    for (let n = 0; n < 200; n++) expect(sha256Hex('b'.repeat(n))).toBe(native('b'.repeat(n)));
  });
  it('agrees across random text split at every offset', () => {
    const rng = createRng(11), pieces = ['a', 'é', '漢', '😀', '\n', '"'];
    const text = Array.from({ length: 300 }, () => pieces[rng.below(pieces.length)]).join('');
    for (let cut = 0; cut <= text.length; cut += 7) {
      const sha = createSha256();
      sha.update(text, 0, cut);
      sha.update(text, cut, text.length);
      expect(sha.hex()).toBe(native(text));
    }
  });
  it('treats lone surrogates as the replacement character, as UTF-8 encoders do', () => {
    expect(sha256Hex('a\ud83dz')).toBe(native('a�z'));
    expect(sha256Hex('a\ude00z')).toBe(native('a�z'));
    expect(sha256Hex('end\ud83d')).toBe(native('end�'));
  });
  it('yields between slices, reports bytes, and can be cancelled', async () => {
    let clock = 0, pauses = 0;
    const text = 'é'.repeat(50_000);
    const done = await sha256Sliced(text, { budgetMs: 1, now: () => (clock += 1), pause: async () => { pauses++; } });
    expect(done).toEqual({ hex: native(text), bytes: Buffer.byteLength(text) });
    expect(pauses).toBeGreaterThan(5);
    let cancelled = false;
    const stopped = await sha256Sliced(text, { budgetMs: 1, now: () => (clock += 1), pause: async () => { cancelled = true; }, cancelled: () => cancelled });
    expect(stopped).toBeNull();
  });
});
