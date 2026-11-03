import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { libraryChild, migrateLibrary, newLibraryChild, validLibraryData } from '../src/library/state';
import { newExploreProgress } from '../src/explore/progress';
import { familyLearners, addLearner } from '../src/learn/learners';
import { emptySave, parseSave } from '../src/state/validation';
import { visibleSaved } from '../src/library/availability';
import { search } from '../src/library/search';
import type { LibraryItem } from '../src/library/schema';
const items = JSON.parse(readFileSync('content/library/items.json', 'utf8')) as LibraryItem[];
const optional = ['faith', 'island-history'];
describe('reconciled family collection policy', () => {
  it('keeps fresh installs and later new learners off, migrating every previously saved learner on once', () => {
    const fresh = migrateLibrary(emptySave(), { existingLearners: false });
    expect(optional.some(id => fresh.library.profiles.family.policy.collections.includes(id))).toBe(false);
    const learning = addLearner(familyLearners(), 'Existing reader', 'existing');
    const input = { ...emptySave(), learning, library: { version: 1 as const, profiles: { family: { ...newLibraryChild(), saved: ['prayer-our-father'], query: 'kept' } } } };
    const before = JSON.stringify(input), migrated = migrateLibrary(input);
    for (const child of Object.values(migrated.library.profiles)) expect(child.policy.collections).toEqual(expect.arrayContaining(optional));
    expect(migrated.library.profiles.family.saved).toEqual(['prayer-our-father']);
    expect(migrated.library.profiles.family.query).toBe('kept');
    expect(migrated.library.version).toBe(2); expect(validLibraryData(migrated.library)).toBe(true);
    expect(parseSave(JSON.stringify(migrated))).toEqual(migrated);
    migrated.library.profiles.family.policy.collections = ['books'];
    expect(migrateLibrary(migrated)).toBe(migrated);
    expect(migrateLibrary(migrated).library.profiles.family.policy.collections).toEqual(['books']);
    expect(JSON.stringify(input)).toBe(before);
    expect(libraryChild(migrated.library, 'added-later').policy.collections).not.toEqual(expect.arrayContaining(optional));
  });
  it('preserves original Explore and archive data while enabling the existing family', () => {
    const input = { ...emptySave(), explore: { favorites: ['moon'], progress: newExploreProgress() } };
    const before = JSON.stringify(input), next = migrateLibrary(input);
    expect(next.library.profiles.family.policy.collections).toEqual(expect.arrayContaining(optional));
    expect(next.library.archive?.explore).toEqual(input.explore);
    next.library.archive!.explore.favorites.push('sun');
    expect(JSON.stringify(input)).toBe(before);
  });
  it('keeps every faith/history item and prayer out of default search, shelf and destinations', () => {
    const hidden = items.filter(i => optional.includes(i.category) && i.type !== 'collection');
    expect(hidden).toHaveLength(13);
    for (const i of hidden) expect(i.category === 'faith' || i.category === 'island-history').toBe(true);
    const allowed = newLibraryChild().policy.collections;
    const categoryById = new Map(items.map(i => [i.id, i.category]));
    const ids = hidden.map(i => i.id);
    expect(visibleSaved(ids, categoryById, allowed)).toEqual([]);
    expect(visibleSaved(ids, categoryById, [...allowed, ...optional])).toEqual(ids);
    const dir = mkdtempSync(join(tmpdir(), 'library-collections-'));
    try {
      execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/library/build-index.mjs', '--output-dir', dir], { env: { ...process.env, EXPO_PUBLIC_LIBRARY_FIXTURES: '1', EXPO_PUBLIC_LIBRARY_PREVIEW: '0' }, stdio: 'pipe' });
      const { index } = JSON.parse(readFileSync(join(dir, 'catalog.generated.json'), 'utf8'));
      const visible = new Set(items.filter(i => allowed.includes(i.category)).map(i => i.id));
      for (const q of ['Jesus', 'colonization', 'Eucharist', 'prayer', 'thank you']) {
        expect(search(index, q, visible).some(i => ids.includes(i.id)), q).toBe(false);
      }
      expect(search(index, 'Eucharist', new Set([...visible, ...ids])).some(i => i.id === 'saying-thank-you')).toBe(true);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it('retains all standard prayers, art briefs, grown-up notes and canonical-only teaching vocabulary', () => {
    const prayers = items.filter(i => i.type === 'prayer');
    expect(prayers).toHaveLength(5);
    expect(prayers.find(i => i.id === 'prayer-grace-before-meals')?.sentences.map(s => s.text).join(' ')).toBe('Bless us, O Lord, and these Thy gifts, which we are about to receive from Thy bounty, through Christ our Lord. Amen.');
    const history = items.filter(i => i.type === 'topic' && i.category === 'island-history');
    expect(history).toHaveLength(3); expect(history.some(i => i.tags.includes('held'))).toBe(false);
    for (const id of ['history-colonization', 'history-war-survival']) expect(items.find(i => i.id === id)?.grownUpNote).toMatch(/Read together|co-reading/);
    const allText = items.flatMap(i => i.type === 'topic' ? Object.values(i.layers).flat().map(s => s.text) : []).join(' ');
    expect(allText).not.toMatch(/Åtadok|Åtaduk|Mata/);
    for (const i of items.filter(i => i.artBrief)) expect(i.artBrief?.exactAlt).toBe(i.image.alt);
  });
});
