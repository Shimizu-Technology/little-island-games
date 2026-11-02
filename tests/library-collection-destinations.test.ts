import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/library/catalog.generated.json', async () => {
  const { readFileSync } = await import('node:fs');
  return { default: { items: JSON.parse(readFileSync('content/library/items.json', 'utf8')), index: [] } };
});
import { availableItems, canOpen, catalog } from '../src/library/catalog';
import { newLibraryChild } from '../src/library/state';
import { visibleSaved } from '../src/library/availability';
describe('optional collection destination boundary with the full candidate corpus', () => {
  it('rejects all hidden direct and related destinations before exposing a title', () => {
    const defaults = newLibraryChild().policy.collections;
    const hidden = catalog.filter(i => ['faith', 'island-history'].includes(i.category));
    expect(hidden).toHaveLength(13);
    expect(availableItems(defaults).some(i => hidden.some(h => h.id === i.id))).toBe(false);
    for (const record of hidden) expect(canOpen(record.id, defaults), record.id).toBe(false);
    for (const record of hidden) expect(canOpen(record.id, [...defaults, record.category]), record.id).toBe(true);
    const saved = hidden.map(i => i.id), categories = new Map(catalog.map(i => [i.id, i.category]));
    expect(visibleSaved(saved, categories, defaults)).toEqual([]);
    expect(saved).toHaveLength(13);
    expect(visibleSaved(saved, categories, [...defaults, 'faith', 'island-history'])).toEqual(saved);
  });
});
