import { describe, expect, it, vi } from 'vitest';
import { BANK_CAPS } from '../src/puzzles/bank';
import { measureScale } from '../scripts/puzzles/scale';
// The scale model occupies synthetic global ordinals, independent of shipped game banks.
vi.mock('../src/challenge/registry.generated',()=>({challengeEntries:[]}));

vi.mock('../src/challenge/registry.generated', () => ({ challengeEntries: [] }));

describe('format at full catalog scale', () => {
  it('holds every boot and manifest limit at 65,083 entries', async () => {
    const r = await measureScale({ samples: 20 });
    expect(r.launch.paused.map(p=>p.sessions)).toEqual([1,8,56]);
    for(const paused of r.launch.paused){
      expect(paused.assetReads).toBe(0);
      expect(paused.structureP95Ms).toBeGreaterThanOrEqual(0);
      expect(paused.structureP95Ms).toBeLessThan(r.launch.budgets.structureP95Ms);
    }
    expect(r.launch.continue.coldP95Ms).toBeLessThan(r.launch.budgets.continueColdP95Ms);
    expect(r.launch.continue.warmP95Ms).toBeLessThan(r.launch.budgets.continueWarmP95Ms);
    expect(r.launch.continue.refsPerOpen).toBe(1);
    if(r.launch.continue.retainedHeapBytes!==null)expect(r.launch.continue.retainedHeapBytes).toBeLessThanOrEqual(r.launch.budgets.decodedBytes);
    expect(r.saveFragmentBytes).toBeLessThan(100_000);
    expect(r.launch.aggregateEagerBytes).toBeLessThan(120_000);
    expect(r.entries).toBe(65083);
    expect(r.modelEntries).toBe(65083);
    expect(r.rootBytes).toBeLessThanOrEqual(BANK_CAPS.rootBytes);
    expect(r.largestFamilyBytes).toBeLessThanOrEqual(BANK_CAPS.familyBytes);
    expect(r.catalogBytes).toBeLessThanOrEqual(BANK_CAPS.catalogBytes);
    expect(r.packs).toBeLessThanOrEqual(BANK_CAPS.slots);
    expect(r.modelIssues).toEqual([]);
    expect(r.verify?.errors).toBe(0);
    expect(r.verify?.replayed).toBe(65083);
    // Two packs held plus one being checked, as text, plus the largest manifest.
    expect(BANK_CAPS.packBytes * 3 * 2 + BANK_CAPS.familyBytes).toBeLessThanOrEqual(BANK_CAPS.decodedBytes);
  }, 900_000);
});
