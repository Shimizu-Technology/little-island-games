import { describe, expect, it } from 'vitest';
import { BANK_CAPS } from '../src/puzzles/bank';
import { measureScale } from '../scripts/puzzles/scale';

describe('format at full catalog scale', () => {
  it('holds every boot and manifest limit at 62,647 entries', async () => {
    const r = await measureScale({ samples: 20 });
    expect(r.entries).toBe(62647);
    expect(r.modelEntries).toBe(62647);
    expect(r.rootBytes).toBeLessThanOrEqual(BANK_CAPS.rootBytes);
    expect(r.largestFamilyBytes).toBeLessThanOrEqual(BANK_CAPS.familyBytes);
    expect(r.catalogBytes).toBeLessThanOrEqual(BANK_CAPS.catalogBytes);
    expect(r.packs).toBeLessThanOrEqual(BANK_CAPS.slots);
    expect(r.modelIssues).toEqual([]);
    expect(r.verify?.errors).toBe(0);
    expect(r.verify?.replayed).toBe(62647);
    // Two packs held plus one being checked, as text, plus the largest manifest.
    expect(BANK_CAPS.packBytes * 3 * 2 + BANK_CAPS.familyBytes).toBeLessThanOrEqual(BANK_CAPS.decodedBytes);
  }, 900_000);
});
