import React, { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultAtmosphere, validAtmosphere, type Atmosphere } from '../src/home/atmosphere';
import { compactHome, homeReducer, instance, migrateHome, starterHome, validHome, type HomeStateV2, type Ownership } from '../src/home/model';
import { completedLearningRounds, seasonalItems, seasonalPacks, unlockedSeasonalPacks } from '../src/home/seasonal';
import { editHistory, restoredHistory, savedHistory, type History } from '../src/home/useHomeStore';
import { emptySave, parseSave } from '../src/state/validation';
import { encodeSave, emptyProfile } from '../src/state/profiles';
import { entitledHome, initializePersonalization } from '../src/personalization/model';
import { creditSchool, creditSchoolTogether } from '../src/learn/schoolProgress';
import { startSession } from '../src/learn/session';
import { finishMathRound } from './helpers/shell-rounds';
import { WeatherOverlay, weatherRuns, WEATHER_PARTICLES } from '../src/home/runtime/WeatherOverlay';
import { useHomeVisible } from '../src/home/runtime/visibility';
import { buildScene } from '../src/home/scene/graph';
import { litLamps } from '../src/home/runtime/delight';
import { illustratedProps } from '../src/home/art/illustrated';
import { itemShapes } from '../src/home/art/silhouettes';

const motion = vi.hoisted(() => ({ repeat: vi.fn(), cancel: vi.fn(), app: null as null | ((state: string) => void), blur: null as null | (() => void), removes: vi.fn() }));
vi.mock('react-native', () => ({ View: 'View', Platform: { OS: 'ios' }, StyleSheet: { absoluteFill: {}, create: (v: unknown) => v }, AppState: {
  currentState: 'active', addEventListener: (_: string, fn: (s: string) => void) => { motion.app = fn; return { remove: motion.removes }; },
} }));
vi.mock('expo-router', () => ({ useFocusEffect: (fn: () => () => void) => useEffect(() => { const blur = fn(); motion.blur = blur; return blur; }, [fn]) }));
vi.mock('react-native-svg', () => ({ default: 'Svg', Path: 'Path' }));
vi.mock('react-native-reanimated', () => ({ default: { View: 'AnimatedView' },
  useSharedValue: (value: number) => React.useMemo(() => ({ value }), [value]), useAnimatedStyle: (fn: () => unknown) => fn(),
  cancelAnimation: (...args: unknown[]) => motion.cancel(...args), withTiming: () => 1,
  withRepeat: (...args: unknown[]) => { motion.repeat(...args); return 1; }, Easing: { linear: (n: number) => n },
}));
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
let tree: ReactTestRenderer | undefined;
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.clearAllMocks(); });
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const ownership: Ownership = { ownedItems: seasonalPacks.flatMap(p => [...p.items]), ownedWallpapers: seasonalPacks.map(p => p.wallpaper), ownedFloors: seasonalPacks.map(p => p.floor) };
function emptyHome(): HomeStateV2 {
  const s = starterHome();
  for (const room of Object.values(s.rooms)) { room.instances = []; room.characters = []; }
  s.rooms.home.characters = [{ slot: 0, anchor: 'floor', pose: 'stand', x: 4, y: 9 }];
  return s;
}
const history = (): History => ({ present: emptyHome(), past: [], future: [] });

// Product brief: offline family Home; additive v4 extensions; no timers, dates, money,
// duplicate learning ledgers, or changes to the child's existing arranged room on unlock.
describe('compact, strict atmosphere and settings save contracts', () => {
  it('adds exactly zero bytes to untouched homes and settings, including explicit imported defaults', () => {
    const base = initializePersonalization(emptySave()), before = encodeSave(base);
    const home = base.personalization!.people.family.home as HomeStateV2;
    expect(Object.hasOwn(home, 'atmosphere')).toBe(false);
    const explicit = clone(base); (explicit.personalization!.people.family.home as HomeStateV2).atmosphere = { ...defaultAtmosphere };
    explicit.settings.unlockSeasonalPacks = false;
    expect(encodeSave(explicit)).toBe(before);
    expect(Object.hasOwn(compactHome({ ...home, atmosphere: { ...defaultAtmosphere } }), 'atmosphere')).toBe(false);
    expect(explicit.settings.unlockSeasonalPacks).toBe(false); // serializer never mutates recovery input
    expect(parseSave(before)).toEqual(base);
  });
  it.each(['day', 'sunset', 'night'] as const)('round-trips every weather with %s', timeOfDay => {
    for (const weather of ['clear', 'leaves', 'snow', 'rain', 'fireflies'] as const) {
      const original = emptyHome(), atmosphere = { timeOfDay, weather };
      const next = homeReducer(original, { type: 'atmosphere', atmosphere }).state;
      expect(validHome(next)).toBe(true); expect(validAtmosphere(atmosphere)).toBe(true);
      expect(migrateHome(clone(next))?.atmosphere ?? defaultAtmosphere).toEqual(atmosphere);
      expect(original.atmosphere).toBeUndefined();
    }
  });
  it.each([null, [], {}, { timeOfDay: 'night' }, { timeOfDay: 'midnight', weather: 'clear' }, { timeOfDay: 'day', weather: 'storm' }, { ...defaultAtmosphere, extra: 1 }, { timeOfDay: 1, weather: 'snow' }])('rejects malformed atmosphere %j without overwriting the original', atmosphere => {
    const original = emptyHome(); expect(validAtmosphere(atmosphere)).toBe(false);
    expect(validHome({ ...original, atmosphere })).toBe(false);
    expect(homeReducer(original, { type: 'atmosphere', atmosphere: atmosphere as Atmosphere }).state).toBe(original);
    expect(migrateHome({ ...original, atmosphere })).toBeUndefined();
  });
  it('rejects malformed undo atmosphere and non-boolean grown-up override', () => {
    const s = emptyHome(); expect(validHome({ ...s, undo: { version: 1, steps: [{ atmosphere: { timeOfDay: 'night', weather: 'storms' } }] } })).toBe(false);
    for (const value of ['true', 1, null, {}, []]) expect(() => parseSave(JSON.stringify({ ...emptySave(), settings: { ...emptySave().settings, unlockSeasonalPacks: value } }))).toThrow();
    const save = { ...emptySave(), settings: { ...emptySave().settings, unlockSeasonalPacks: true } };
    expect(parseSave(encodeSave(save)).settings.unlockSeasonalPacks).toBe(true);
  });
  it('persists atmosphere Undo across reload and supports Redo without changing rooms', () => {
    const before = history(); let h = editHistory(before, { type: 'atmosphere', atmosphere: { timeOfDay: 'night', weather: 'snow' } });
    const saved = savedHistory(h); expect(saved.undo?.steps).toEqual([{ atmosphere: null }]); expect(validHome(saved)).toBe(true);
    h = restoredHistory(clone(saved)); h = editHistory(h, { type: 'undo' });
    expect(h.present.atmosphere).toBeUndefined(); expect(h.present.rooms).toEqual(before.present.rooms);
    h = editHistory(h, { type: 'redo' }); expect(h.present.atmosphere).toEqual({ timeOfDay: 'night', weather: 'snow' });
    h = editHistory(h, { type: 'atmosphere', atmosphere: defaultAtmosphere });
    expect(Object.hasOwn(savedHistory(h), 'atmosphere')).toBe(false);
  });
});

describe('learning-unlocked seasonal packs', () => {
  it.each([[0, []], [3, ['harvest-fiesta']], [6, ['harvest-fiesta', 'island-snow']], [9, ['harvest-fiesta', 'island-snow', 'island-fiesta']]] as const)('opens only the right packs after %s completed rounds', (rounds, ids) => {
    expect(unlockedSeasonalPacks(rounds).map(p => p.id)).toEqual(ids);
    expect(unlockedSeasonalPacks(rounds, true)).toHaveLength(3);
  });
  it('uses existing completed-round records, counts helped and together play, and stays learner-scoped', () => {
    // Shell Scale together has its own authoritative ledger; it must count once alongside helped work.
    let school = {};
    for (let n = 0; n < 3; n++) {
      const round = startSession('shell-math', { options: { mode: 'solo', pace: 'easy' } }, {}, n + 1);
      const helped = { ...round, learner: 'family', levelHelped: true, state: finishMathRound(round.state) };
      school = creditSchool(school, helped);
    }
    expect(completedLearningRounds({ ...emptySave(), school })).toBe(3);
    const row = { stars: 1 as const, completed: 3, independent: 0, days: [], rounds: ['a', 'b', 'c'] };
    const save = emptySave(); save.school = { 'shell-scale': { 1: row } };
    save.schoolTogether = creditSchoolTogether(undefined, 'shell-scale', 1, 'together');
    expect(completedLearningRounds(save)).toBe(4);
    save.profiles = { version: 1, people: { family: { ...emptyProfile(), school: save.school, schoolTogether: save.schoolTogether }, child: { ...emptyProfile(), school: { 'shell-scale': { 1: { ...row, completed: 9 } } } } }, earlier: {}, unassigned: { rounds: emptyProfile() } };
    expect(completedLearningRounds(save, 'child')).toBe(9); expect(completedLearningRounds(save)).toBe(4); // projected/canonical copies never double count
    expect(completedLearningRounds(save, 'missing')).toBe(0);
    expect(creditSchoolTogether(save.schoolTogether, 'shell-scale', 1, 'together')).toBe(save.schoolTogether);
  });
  it.each(seasonalPacks)('applies $name as one undoable scene with real props and reload persistence', pack => {
    const before = history(), untouched = clone(before.present.rooms.kitchen);
    const h = editHistory(before, { type: 'seasonal-pack', pack: pack.id }, ownership);
    expect(h.present).not.toBe(before.present); expect(h.past).toHaveLength(1);
    expect(h.present.rooms.home.theme).toEqual({ wallpaper: pack.wallpaper, floor: pack.floor });
    expect(h.present.atmosphere).toEqual(pack.atmosphere);
    for (const id of pack.items) expect(h.present.rooms.home.instances.some(i => i.item === id)).toBe(true);
    expect(h.present.rooms.kitchen).toEqual(untouched);
    const saved = clone(savedHistory(h)); expect(validHome(saved)).toBe(true);
    expect(entitledHome(saved, [])).toBe(true); // placed props survive turning the instant-unlock setting off
    const restored = restoredHistory(migrateHome(saved)!);
    const undone = editHistory(restored, { type: 'undo' }); expect(undone.present.rooms).toEqual(before.present.rooms); expect(undone.present.atmosphere).toBeUndefined();
    expect(editHistory(undone, { type: 'redo' }).present).toEqual(restored.present);
    expect(homeReducer(h.present, { type: 'seasonal-pack', pack: pack.id }, ownership).state.rooms.home.instances).toHaveLength(pack.items.length);
  });
  it('refuses locked catalog items and pack application while keeping ordinary play available', () => {
    const s = emptyHome();
    for (const pack of seasonalPacks) expect(homeReducer(s, { type: 'seasonal-pack', pack: pack.id }).state).toBe(s);
    for (const id of seasonalItems) expect(homeReducer(s, { type: 'place', instance: instance(`test-${id}`, id, 8, 8) }).state).toBe(s);
    expect(homeReducer(s, { type: 'place', instance: instance('plain', 'mango', 8, 8) }).state).not.toBe(s);
  });
});

describe('seasonal props use the ordinary physics, interaction and history engines', () => {
  it.each(['pumpkin-pie', 'fiesta-platter', 'hot-cocoa'])('holds and consumes %s, then undoes, redoes and reloads', id => {
    let h = history(); h = editHistory(h, { type: 'place', instance: instance('treat', id, 8, 9), target: { slot: 0, eat: false } }, ownership);
    expect(h.present.rooms.home.characters[0].holding).toBe('treat');
    const held = h.present; h = editHistory(h, { type: 'use-item', id: 'treat', slot: 0, eat: true }, ownership);
    expect(h.present.rooms.home.characters[0].action).toBe(id === 'hot-cocoa' ? 'drink' : 'eat');
    if (id === 'hot-cocoa') expect(h.present.rooms.home.instances.find(i => i.id === 'treat')?.empty).toBe(true);
    else expect(h.present.rooms.home.instances.some(i => i.id === 'treat')).toBe(false);
    const saved = clone(savedHistory(h)); expect(validHome(saved)).toBe(true);
    const reloaded = restoredHistory(migrateHome(saved)!);
    expect(editHistory(reloaded, { type: 'undo' }).present.rooms).toEqual(held.rooms);
    const redone = editHistory(editHistory(reloaded, { type: 'undo' }), { type: 'redo' });
    expect(redone.present.rooms).toEqual(h.present.rooms);
  });
  it('toggles Christmas Tree light power, glow and Undo without changing its position', () => {
    let h = editHistory(history(), { type: 'place', instance: instance('tree', 'christmas-tree', 12, 8) }, ownership);
    const before = clone(h.present.rooms.home.instances[0]); h = editHistory(h, { type: 'toggle', id: 'tree' }, ownership);
    expect(h.present.rooms.home.instances[0]).toMatchObject({ ...before, powered: true, state: 'active' });
    expect(litLamps(buildScene(h.present), 'home').map(e => e.item?.id)).toContain('tree');
    const reloaded = restoredHistory(migrateHome(clone(savedHistory(h)))!);
    expect(editHistory(reloaded, { type: 'undo' }).present.rooms.home.instances[0]).toEqual(before);
    expect(editHistory(h, { type: 'toggle', id: 'tree' }, ownership).present.rooms.home.instances[0].powered).toBe(false);
  });
  it('bundles all six static WebP assets and gives every prop a painted interaction hull', () => {
    for (const id of seasonalItems) {
      expect(illustratedProps[id]()).toBe(`assets/art/home/seasonal/${id}.webp`);
      expect(itemShapes(instance(id, id, 0, 0), 150).length).toBeGreaterThan(0);
    }
  });
});

describe('bounded weather follows Reduce Motion and Home visibility', () => {
  it.each(['leaves', 'snow', 'rain', 'fireflies'] as const)('animates only while visible: %s', async weather => {
    expect(weatherRuns(weather, false, true)).toBe(true); expect(weatherRuns(weather, true, true)).toBe(false); expect(weatherRuns(weather, false, false)).toBe(false);
    await act(async () => { tree = create(<WeatherOverlay weather={weather} width={390} height={844} active reduced={false} count={100}/>); });
    expect(tree!.root.findAllByProps({ testID: 'weather-particle' })).toHaveLength(WEATHER_PARTICLES);
    expect(tree!.root.findByProps({ testID: 'weather-overlay' }).props.pointerEvents).toBe('none');
    expect(motion.repeat).toHaveBeenCalledTimes(1);
    await act(async () => tree!.update(<WeatherOverlay weather={weather} width={390} height={844} active reduced count={100}/>));
    expect(tree!.root.findAllByProps({ testID: 'weather-particle' })).toHaveLength(3); expect(motion.repeat).toHaveBeenCalledTimes(1);
    await act(async () => tree!.update(<WeatherOverlay weather={weather} width={390} height={844} active={false} reduced={false}/>));
    expect(motion.repeat).toHaveBeenCalledTimes(1); expect(motion.cancel.mock.calls.length).toBeGreaterThanOrEqual(5);
    await act(async () => tree!.update(<WeatherOverlay weather={weather} width={390} height={844} active reduced={false}/>));
    expect(motion.repeat).toHaveBeenCalledTimes(2);
    await act(async () => tree!.unmount()); tree = undefined; expect(motion.cancel).toHaveBeenCalled();
  });
  it('clear weather mounts no particles or clocks', async () => {
    await act(async () => { tree = create(<WeatherOverlay weather="clear" width={390} height={844} active reduced={false}/>); });
    expect(tree!.toJSON()).toBeNull(); expect(motion.repeat).not.toHaveBeenCalled();
  });
  it('cancels on actual app background and route blur; removes the listener on unmount', async () => {
    function VisibleWeather() { const active = useHomeVisible(); return <WeatherOverlay weather="snow" width={390} height={844} active={active} reduced={false}/>; }
    await act(async () => { tree = create(<VisibleWeather/>); }); expect(motion.repeat).toHaveBeenCalledTimes(1);
    await act(async () => motion.app!('background')); expect(motion.repeat).toHaveBeenCalledTimes(1);
    await act(async () => motion.app!('active')); expect(motion.repeat).toHaveBeenCalledTimes(2);
    await act(async () => motion.blur!()); expect(motion.repeat).toHaveBeenCalledTimes(2);
    await act(async () => tree!.unmount()); tree = undefined; expect(motion.removes).toHaveBeenCalledTimes(1);
  });
});
