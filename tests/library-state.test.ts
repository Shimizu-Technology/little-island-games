import { describe, expect, it } from 'vitest';
import categories from '../content/library/categories.json';
import { TOPICS } from '../src/explore/content';
import { newExploreProgress } from '../src/explore/progress';
import { labAction, newLab } from '../src/explore/activities';
import { familyLearners, addLearner } from '../src/learn/learners';
import { withoutLearner } from '../src/personalization/model';
import { emptySave, parseSave, withinSaveLimit } from '../src/state/validation';
import { libraryChild, libraryHoursOpen, migrateLibrary, newLibraryChild, validLegacyExplore, validLibraryChild, validLibraryData, type LibraryCreation } from '../src/library/state';

const creation = (): LibraryCreation => ({ id: 'page-1', title: 'My turtle', sourceId: 'turtle-breath', sentences: 'It swims.', updatedAt: 123,
  strokes: [{ color: '#123abc', width: 4, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }], stamps: [{ id: 'turtle', x: .5, y: .6, size: .2 }] });

export function legacyFixture() {
  const progress = newExploreProgress();
  progress.location = { kind: 'topic', id: 'water-cycle' };
  progress.history = [{ kind: 'world', world: 'oceans' }, { kind: 'topic', id: 'moon' }, { kind: 'topic', id: 'retired-topic' }];
  progress.query = 'cloud'; progress.onlyFavorites = true;
  progress.positions = { map: 400, 'topic:retired-topic': 300, 'activity:oceans': 200 };
  progress.labs.space = labAction(newLab(), { type: 'turn', by: 1 });
  progress.labs.oceans = labAction(newLab(), { type: 'chain', item: 'Sunlight' });
  progress.labs.animals = labAction(newLab(), { type: 'habitat', choice: 'Seagrass meadow' });
  progress.labs.weather = labAction(newLab(), { type: 'water', action: 'heat' });
  progress.labs.world = labAction(newLab(), { type: 'place', id: 'guam' });
  return { ...emptySave(), explore: { favorites: ['moon', 'retired-topic'], progress } };
}

describe('Library durable data contract', () => {
  it('returns independent defaults with standard categories and optional collections off, hours off and safe fallback', () => {
    const a = newLibraryChild(), b = libraryChild(undefined, 'family');
    expect(validLibraryChild(a)).toBe(true); expect(a.policy.collections).toEqual(categories.filter(c => c.defaultEnabled).map(c => c.id));
    a.saved.push('moon'); a.policy.collections.pop(); a.labs.space.turn = 1; expect(b.labs.space.turn).toBe(0); expect(b.saved).toEqual([]); expect(b.policy.collections).toHaveLength(categories.filter(c => c.defaultEnabled).length);
    const data = { version: 1 as const, profiles: { family: b } };
    expect(libraryChild(data, 'family')).toBe(b); expect(libraryChild(data, '__proto__')).toEqual(newLibraryChild());
  });
  it('round-trips every creation field, reader context and policy in the normal backup', () => {
    const child = { ...newLibraryChild(), creations: [creation()], current: 'turtle-breath', bookPages: { busy: 14 }, layers: { moon: 'deep' as const }, positions: { wonder: 444 }, query: 'turtle', category: 'ocean', saved: ['moon'], recent: ['busy'] };
    const save = { ...emptySave(), library: { version: 1 as const, profiles: { family: child } } };
    expect(validLibraryData(save.library)).toBe(true); expect(parseSave(JSON.stringify(save))).toEqual(save);
  });
  it.each([
    { version: 2 }, { saved: ['moon', 'moon'] }, { recent: Array.from({ length: 25 }, (_, i) => `topic-${i}`) },
    { bookPages: { busy: -1 } }, { layers: { moon: 'hard' } }, { positions: { wonder: Infinity } }, { query: 'q'.repeat(201) },
    { current: 'https://outside' }, { labs: {} }, { labs: { ...newExploreProgress().labs, space: { ...newLab(), turn: 9 } } }, { onlyFavorites: 'yes' }, { unknown: true }, { creations: Array.from({ length: 25 }, (_, i) => ({ ...creation(), id: `page-${i}` })) },
    { creations: [creation(), creation()] }, { creations: [{ ...creation(), strokes: [{ color: '#abc', width: 1, points: [{ x: 1.1, y: 0 }] }] }] },
    { creations: [{ ...creation(), stamps: [{ id: 'turtle', x: 0, y: 0, size: 2 }] }] },
    { creations: [{ ...creation(), strokes: [{ color: '#abc', width: 1, points: Array.from({ length: 2049 }, () => ({ x: 0, y: 0 })) }] }] },
    { creations: [{ ...creation(), sentences: 'a'.repeat(4001) }] }, { policy: { collections: [], hours: { enabled: true, start: 1440, end: 1 } } },
  ])('rejects malformed child data %j without repairing it', patch => {
    const bad = { ...newLibraryChild(), ...patch };
    expect(validLibraryChild(bad)).toBe(false);
    expect(() => parseSave(JSON.stringify({ ...emptySave(), library: { version: 1, profiles: { family: bad } } })) ).toThrow();
  });
  it('enforces the total 1 MB child budget even when every stroke satisfies local bounds', () => {
    const c = creation(); c.strokes = Array.from({ length: 64 }, () => ({ color: '#abc', width: 4, points: Array.from({ length: 2048 }, () => ({ x: .123456, y: .789012 })) }));
    expect(validLibraryChild({ ...newLibraryChild(), creations: [c] })).toBe(false);
  });
  it('budgets UTF-8 bytes and rejects unexpected nested fields', () => {
    const child = { ...newLibraryChild(), creations: Array.from({ length: 24 }, (_, i) => ({ ...creation(), id: `page-${i}`, sentences: '界'.repeat(4000), title: '界'.repeat(120) })) };
    expect(validLibraryChild(child)).toBe(true);
    child.creations.forEach(c => { c.strokes = Array.from({ length: 20 }, () => ({ color: '#abc', width: 4, points: Array.from({ length: 100 }, () => ({ x: .3, y: .2 })) })); });
    expect(validLibraryChild(child)).toBe(false);
    expect(validLibraryChild({ ...newLibraryChild(), policy: { ...newLibraryChild().policy, extra: 'unbounded' } })).toBe(false);
  });
  it('bounds all profiles and the archive together within the existing backup budget', () => {
    const child = { ...newLibraryChild(), creations: Array.from({ length: 24 }, (_, i) => ({ ...creation(), id: `page-${i}`, sentences: '界'.repeat(4000), title: '界'.repeat(120) })) };
    expect(validLibraryChild(child)).toBe(true);
    const profiles = { family: child, a: child, b: child, c: child };
    expect(validLibraryData({ version: 1, profiles })).toBe(false);
    expect(withinSaveLimit('界'.repeat(700_000))).toBe(false);
    expect(withinSaveLimit('😀'.repeat(500_000))).toBe(true);
  });
  it('checks profile ownership and archive validity on import', () => {
    expect(() => parseSave(JSON.stringify({ ...emptySave(), library: { version: 1, profiles: { removed: newLibraryChild() } } }))).toThrow();
    expect(validLibraryData({ version: 3, profiles: {} })).toBe(false);
    expect(validLibraryData({ version: 1, profiles: {}, archive: { explore: { favorites: [], progress: {} } } })).toBe(false);
  });
  it('supports local daytime, overnight, disabled and equal-minute all-day hours', () => {
    const policy = newLibraryChild().policy, at = (h: number, m = 0) => new Date(2026, 10, 2, h, m);
    expect(libraryHoursOpen(policy, at(2))).toBe(true);
    policy.hours = { enabled: true, start: 9 * 60, end: 17 * 60 };
    expect(libraryHoursOpen(policy, at(9))).toBe(true); expect(libraryHoursOpen(policy, at(8, 59))).toBe(false); expect(libraryHoursOpen(policy, at(17))).toBe(false);
    policy.hours = { enabled: true, start: 22 * 60, end: 6 * 60 };
    for (const h of [22, 23, 0, 5]) expect(libraryHoursOpen(policy, at(h))).toBe(true);
    for (const h of [6, 12, 21]) expect(libraryHoursOpen(policy, at(h))).toBe(false);
    policy.hours.end = policy.hours.start; expect(libraryHoursOpen(policy, at(12))).toBe(true);
  });
});

describe('immutable Explore migration', () => {
  it('preserves all favorites, labs and unknown IDs in an independent archive, without changing Explore', () => {
    const old = legacyFixture(), original = JSON.stringify(old), migrated = migrateLibrary(parseSave(original));
    expect(JSON.stringify(old)).toBe(original); expect(migrated.explore).toEqual(old.explore);
    expect(migrated.library.archive?.explore).toEqual(old.explore);
    expect(migrated.library.profiles.family).toMatchObject({ labs: old.explore.progress.labs, onlyFavorites: true, saved: ['moon', 'retired-topic'], current: 'water-cycle', query: 'cloud', recent: ['water-cycle', 'retired-topic', 'moon'], positions: old.explore.progress.positions });
    expect(validLibraryData(migrated.library)).toBe(true); expect(parseSave(JSON.stringify(migrated))).toEqual(migrated);
    migrated.library.profiles.family.labs.oceans.chain.pop();
    expect(migrated.library.archive!.explore.progress!.labs).toEqual(old.explore.progress.labs);
    migrated.library.archive!.explore.favorites.push('another-retired');
    expect(JSON.stringify(old)).toBe(original); expect(migrated.explore!.favorites).toEqual(old.explore.favorites);
  });
  it('maps all fifty topic favorites and current destinations without loss and runs only once', () => {
    const old = { ...emptySave(), explore: { favorites: TOPICS.map(t => t.id) } };
    const migrated = migrateLibrary(old);
    expect(migrated.library.profiles.family.saved).toEqual(TOPICS.map(t => t.id)); expect(migrateLibrary(migrated)).toBe(migrated);
    for (const topic of TOPICS) {
      const progress = newExploreProgress(); progress.location = { kind: 'topic', id: topic.id };
      expect(migrateLibrary({ ...old, explore: { ...old.explore, progress } }).library.profiles.family.current).toBe(topic.id);
    }
  });
  it('uses the actual active learner, keeps the family fallback, and removes only the deleted profile', () => {
    const learning = addLearner(familyLearners(), 'Child', 'child-1'), migrated = migrateLibrary({ ...legacyFixture(), learning });
    expect(Object.keys(migrated.library.profiles)).toEqual(['family', 'child-1']);
    migrated.library.profiles.family = newLibraryChild();
    const next = withoutLearner(migrated, 'child-1');
    expect(next.learning?.active).toBe('family'); expect(Object.keys(next.library!.profiles)).toEqual(['family']);
    expect(next.library!.archive).toEqual(migrated.library.archive); expect(migrated.library.profiles['child-1']).toBeDefined();
    expect(parseSave(JSON.stringify(next))).toEqual(next);
  });
  it('keeps retired IDs but still rejects invalid labs, destinations, positions and versions', () => {
    const explore = legacyFixture().explore;
    expect(validLegacyExplore(explore)).toBe(true);
    const retired = { ...explore, progress: { ...explore.progress, location: { kind: 'topic' as const, id: 'retired-current' } } };
    const migrated = migrateLibrary({ ...emptySave(), explore: retired });
    expect(migrated.library.profiles.family.current).toBe('retired-current');
    expect(migrated.library.archive?.explore).toEqual(retired);
    expect(parseSave(JSON.stringify(migrated))).toEqual(migrated);
    for (const patch of [{ version: 2 }, { location: { kind: 'topic', id: 'https://outside' } }, { positions: { 'topic:retired': -1 } }, { labs: { ...explore.progress.labs, space: { ...newLab(), turn: 9 } } }])
      expect(validLegacyExplore({ ...explore, progress: { ...explore.progress, ...patch } })).toBe(false);
  });
});
