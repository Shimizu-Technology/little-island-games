import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { owns, compactHome, hydrateHome, migrateHome, starterHome, validHome, type HomeStateV2 } from '../src/home/model';
import { editHistory, restoredHistory, savedHistory, type History } from '../src/home/useHomeStore';
import { buildScene } from '../src/home/scene/graph';
import { resolve } from '../src/home/scene/proposal';
import { arrivalPoint, gamesHere, guamPlaceIds, places } from '../src/home/locations';
import { moreCatalog, roomIds, type RoomId } from '../src/home/catalogMore';
import { cookingIds } from '../src/home/runtime/delight';
import { locationBuilding, buildingLayout, roomOrigin } from '../src/home/camera';
import { HomeChrome } from '../src/home/runtime/HomeChrome';
import { SkyArt } from '../src/home/art/Room';
import { PlacesSheet } from '../src/home/PlacesSheet';
import { learnIds } from '../src/learn/types';
import { arcadeIds } from '../src/arcade';
import { initializePersonalization } from '../src/personalization/model';
import { emptySave, parseSave } from '../src/state/validation';
import { encodeSave } from '../src/state/profiles';

const flat = (s: unknown): Record<string, any> => typeof s === 'function' ? flat(s({ pressed: false })) : Array.isArray(s) ? Object.assign({}, ...s.map(flat)) : s ?? {};
vi.mock('react-native', () => ({ Pressable: 'Pressable', View: 'View', Text: 'Text', Image: 'Image', Platform: { OS: 'ios' }, StyleSheet: { create: (s: unknown) => s, flatten: (s: unknown) => flat(s) }, useWindowDimensions: () => ({ width: 390, height: 844 }) }));
vi.mock('react-native-svg', () => Object.fromEntries(['default', 'G', 'Path', 'Rect', 'Circle', 'Ellipse', 'Image', 'Defs', 'Stop', 'LinearGradient', 'RadialGradient'].map(k => [k, k])));
vi.mock('../src/ui/Sheet', () => ({ Sheet: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../src/ui/fonts', () => ({ useNunitoLoaded: () => false }));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => true }));
vi.mock('expo-haptics', () => ({}));
vi.mock('react-native-reanimated', () => ({ default: { View: 'AnimatedView', createAnimatedComponent: (c: unknown) => c }, useSharedValue: (v: number) => ({ get: () => v, set: () => {} }), withTiming: (v: number) => v, ReduceMotion: { System: 'system' }, useAnimatedStyle: (fn: () => unknown) => fn() }));
vi.mock('../src/ui/icons', () => Object.fromEntries(['ArrowClockwise','ArrowCounterClockwise','ArrowLeft','CaretLeft','CaretRight','Check','CoatHanger','DotsThree','PencilSimple','Star','Sun','UsersThree'].map(id => [id, () => null])));
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
let tree: ReactTestRenderer | undefined;
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; });
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
function start(room: RoomId = 'tumon-beach'): History { const h = starterHome(); h.current = room; return { present: h, past: [], future: [] }; }
function bring(h: History, slot = 0): History { const roomId = Object.entries(h.present.rooms).find(([, r]) => r.characters.some(c => c.slot === slot))![0] as RoomId; return editHistory(h, { type: 'transfer', slot: slot as 0, room: h.present.current, roomId, x: 4 + slot * 2, y: 10 }); }
function settle(h: History, id: string, targetId: string): History {
  const scene = buildScene(h.present), target = scene.rooms[h.present.current].targets.find(t => t.id === targetId)!;
  const proposal = resolve({ ...scene.rooms[h.present.current], entities: scene.entities }, scene.entities[id], target.contact, { scale: 1, target: target.id, release: true });
  expect(proposal.target).toBe(targetId);
  const result = editHistory(h, { type: 'apply-proposal', proposal }); expect(result).not.toBe(h); expect(validHome(result.present)).toBe(true); return result;
}
function roundTrip(h: History) { const saved = clone(compactHome(savedHistory(h))); expect(validHome(saved)).toBe(true); return restoredHistory(hydrateHome(saved)!); }

describe('Phase 5B family places: lossless houses, compact versioned saves and ordinary interactions', () => {
  it('switches all places without edits, changing the four house rooms or adding history', () => {
    let h = start('home'); const before = clone(h.present.rooms);
    for (const room of [...roomIds, ...guamPlaceIds, 'home'] as RoomId[]) { h = editHistory(h, { type: 'room', room }); expect(h.present.current).toBe(room); }
    expect(h.present.rooms).toEqual(before); expect(h.past).toEqual([]); expect(places).toHaveLength(3);
    for (const place of guamPlaceIds) expect(new Set([0, 1, 2, 3, 4, 5].map(slot => JSON.stringify(arrivalPoint(place, slot)))).size).toBe(6);
    expect(arrivalPoint('home', 0)).toEqual({ x: 230, y: 490 });
    for (let n = 0; n < 4; n++) expect(roomOrigin(n, locationBuilding(n))).toEqual(roomOrigin(n, buildingLayout(4)));
  });
  it('adds zero serialized bytes to a legacy save, retains original source and hydrates only for play', () => {
    const base = initializePersonalization(emptySave()), original = encodeSave(base);
    const legacy = base.personalization!.people.family.home as HomeStateV2;
    expect(Object.keys(legacy.rooms)).toEqual(roomIds);
    const hydrated = hydrateHome(legacy)!; for (const id of guamPlaceIds) expect(hydrated.rooms[id].instances.length).toBeGreaterThan(0);
    const withDefaults = clone(base); withDefaults.personalization!.people.family.home = compactHome(hydrated);
    expect(encodeSave(withDefaults)).toBe(original); expect(parseSave(original)).toEqual(base);
    expect(Object.keys(legacy.rooms)).toEqual(roomIds); expect(compactHome(hydrated)).toEqual(legacy);
    expect(migrateHome(hydrated)).toBe(hydrated);
  });
  it('persists rearranged props and all six unique family dolls; undo/redo after reload restores exact rooms', () => {
    let h = start(); for (const slot of [0, 3, 4, 5, 1, 2]) h = bring(h, slot);
    expect(h.present.rooms['tumon-beach'].characters).toHaveLength(6);
    h = editHistory(h, { type: 'move', id: 'place-surfboard', x: 11, y: 5 });
    const before = clone(h.present.rooms); const saved = compactHome(savedHistory(h));
    expect(Object.hasOwn(saved.rooms, 'tumon-beach')).toBe(true); expect(Object.hasOwn(saved.rooms, 'chamorro-village')).toBe(false);
    const loaded = roundTrip(h); expect(loaded.present.rooms).toEqual(before);
    const undone = editHistory(loaded, { type: 'undo' }); expect(undone.present.rooms).not.toEqual(before);
    expect(editHistory(undone, { type: 'redo' }).present.rooms).toEqual(before);
  });
  it('sits two dolls on the blanket, offers reclining, holds and moves the surfboard using the shared resolver', () => {
    let h = bring(bring(start()), 3); const base = 'tumon-beach/item/place-beach-blanket/socket/';
    h = settle(h, 'character/0', base + 'left'); h = settle(h, 'character/3', base + 'right');
    expect(h.present.rooms['tumon-beach'].characters.filter(c => c.pose === 'sit')).toHaveLength(2);
    expect(buildScene(h.present).rooms['tumon-beach'].sockets.some(t => t.base === 'lie')).toBe(true);
    h = settle(h, 'tumon-beach/item/place-surfboard', 'character/0/hand');
    expect(h.present.rooms['tumon-beach'].characters.find(c => c.slot === 0)?.holding).toBe('place-surfboard');
    expect(roundTrip(h).present.rooms).toEqual(h.present.rooms);
  });
  it('toggles glowing BBQ coals, places and cooks food on the grill, persists the surface across reload and undoes', () => {
    let h = start('chamorro-village'); h = editHistory(h, { type: 'toggle', id: 'place-bbq-grill' });
    expect(h.present.rooms['chamorro-village'].instances.find(i => i.item === 'bbq-grill')?.powered).toBe(true);
    h = settle(h, 'chamorro-village/item/place-fiesta-platter', 'chamorro-village/item/place-bbq-grill/surface/1');
    expect(cookingIds(buildScene(h.present))).toContain('chamorro-village/item/place-fiesta-platter');
    h = editHistory(h, { type: 'cook', id: 'place-fiesta-platter' });
    expect(h.present.rooms['chamorro-village'].instances.find(i => i.item === 'fiesta-platter')).toMatchObject({ on: 'place-bbq-grill', powered: true });
    expect(roundTrip(h).present.rooms).toEqual(h.present.rooms);
    expect(editHistory(roundTrip(h), { type: 'undo' }).present.rooms['chamorro-village'].instances.find(i => i.item === 'fiesta-platter')?.on).toBeUndefined();
  });
  it.each(['shaved-ice', 'fiesta-platter'])('holds and eats %s with a happy-reaction action, saved Undo and Redo', item => {
    let h = bring(start('chamorro-village'));
    h = settle(h, `chamorro-village/item/place-${item}`, 'character/0/hand'); const held = clone(h.present.rooms);
    h = editHistory(h, { type: 'use-item', id: `place-${item}`, slot: 0, eat: true });
    expect(h.present.rooms['chamorro-village'].characters.find(c => c.slot === 0)?.action).toBe('eat');
    expect(h.present.rooms['chamorro-village'].instances.some(i => i.id === `place-${item}`)).toBe(false);
    const loaded = roundTrip(h), undone = editHistory(loaded, { type: 'undo' }); expect(undone.present.rooms).toEqual(held);
    expect(editHistory(undone, { type: 'redo' }).present.rooms).toEqual(h.present.rooms);
  });
  it('strictly rejects corrupt locations, duplicate family, bad surfaces, extra fields and invalid Undo without mutating input', () => {
    const corruptions = [
      (s: HomeStateV2) => { (s.rooms as any).attic = clone(s.rooms.home); },
      (s: HomeStateV2) => { (s.rooms as any)['tumon-beach'] = null; },
      (s: HomeStateV2) => { s.rooms['tumon-beach'].characters = [clone(s.rooms.home.characters[0])]; },
      (s: HomeStateV2) => { s.rooms['chamorro-village'].instances[0].on = 'missing'; },
      (s: HomeStateV2) => { (s.rooms['tumon-beach'].instances[0] as any).bonus = true; },
      (s: HomeStateV2) => { s.undo = { version: 1, steps: [{ 'tumon-beach': { characters: { remove: [], put: [{ index: 0, value: { slot: 0, anchor: 'floor', pose: 'stand', x: -1, y: 9 } }] } } }] }; },
    ];
    for (const corrupt of corruptions) { const s = starterHome(); corrupt(s); const bytes = JSON.stringify(s); expect(validHome(s)).toBe(false); expect(hydrateHome(s)).toBeUndefined(); expect(JSON.stringify(s)).toBe(bytes); }
  });
});

describe('painted Village sky', () => {
  it('suppresses only the duplicate crescent while keeping the night sky and stars', async () => {
    for (const moon of [true, false]) {
      await act(async () => { tree = create(<SkyArt time="night" moon={moon}/>); });
      expect(tree!.root.findAll(n => String(n.type) === 'Path' && n.props.d === 'M659 143a48 48 0 1 0 33 77a48 48 0 0 1-33-77Z')).toHaveLength(moon ? 1 : 0);
      expect(tree!.root.findAll(n => String(n.type) === 'Circle')).toHaveLength(moon ? 38 : 36);
      await act(async () => tree!.unmount()); tree = undefined;
    }
  });
});

describe('Guam review save and entitlement regressions', () => {
  it('keeps Lagoon surfboard earned while the beach prop is free, validated and playable', () => {
    expect(owns('surfboard', {})).toBe(false);
    expect(owns('surfboard', { ownedItems: ['surfboard'] })).toBe(true);
    expect(owns('beach-surfboard', {})).toBe(true);
    expect(moreCatalog['beach-surfboard']).toMatchObject({ free: true, tintable: false, rooms: ['tumon-beach'] });
    const h = bring(start());
    expect(validHome(h.present)).toBe(true);
    expect(h.present.rooms['tumon-beach'].instances.find(i => i.id === 'place-surfboard')?.item).toBe('beach-surfboard');
    expect(settle(h, 'tumon-beach/item/place-surfboard', 'character/0/hand').present.rooms['tumon-beach'].characters[0].holding).toBe('place-surfboard');
  });
  it.each([2, 3])('rejects Guam keys in v%s saves without modifying the source', version => {
    const legacy = clone(compactHome(starterHome())); legacy.version = version as 2 | 3;
    expect(validHome(legacy)).toBe(true);
    for (const room of guamPlaceIds) {
      const invalid = clone(legacy); invalid.rooms[room] = clone(starterHome().rooms[room]);
      const bytes = JSON.stringify(invalid);
      expect(validHome(invalid)).toBe(false); expect(hydrateHome(invalid)).toBeUndefined();
      expect(JSON.stringify(invalid)).toBe(bytes);
    }
  });
});

describe('place picker and exact game routes', () => {
  it.each(guamPlaceIds)('provides four valid direct routes and one-tap launch callbacks at %s', async room => {
    const choose = vi.fn(), launch = vi.fn(); await act(async () => { tree = create(<PlacesSheet room={room} onRoom={choose} onClose={() => {}} onGame={launch}/>); });
    const chips = tree!.root.findAll(n => String(n.type) === 'Pressable' && /^(Play |Visit (My room|Kitchen|Tree house|Beach hut)$)/.test(n.props.accessibilityLabel));
    expect(chips).toHaveLength(8);
    for (const chip of chips) expect(flat(chip.props.style)).toMatchObject({ flexBasis: '46%', flexGrow: 1 });
    for (const game of gamesHere[room]) {
      expect(existsSync(`src/app/${game.route.pathname.slice(1)}.tsx`)).toBe(true);
      if ('game' in game.route.params) expect(game.route.pathname === '/arcade' ? arcadeIds : learnIds).toContain(game.route.params.game);
      else { expect(game.name).toBe('Game Hall'); expect(game.route).toEqual({ pathname: '/shelf', params: { island: 'classic' } }); }
      await act(async () => tree!.root.findByProps({ accessibilityLabel: `Play ${game.name}` }).props.onPress()); expect(launch).toHaveBeenLastCalledWith(game.route);
    }
    for (const id of [...roomIds, ...guamPlaceIds]) { await act(async () => tree!.root.findByProps({ accessibilityLabel: `Visit ${id === 'tumon-beach' ? 'Tumon Beach' : id === 'chamorro-village' ? 'Chamorro Village' : { home: 'My room', kitchen: 'Kitchen', treehouse: 'Tree house', beach: 'Beach hut' }[id]}` }).props.onPress()); expect(choose).toHaveBeenLastCalledWith(id); }
    expect(readFileSync('src/app/shelf.tsx', 'utf8')).toContain("island === 'classic' ? 'Game Hall'");
  });
  it.each([360, 390])('keeps the four dock buttons within 340pt and gives full place titles their own row at %s', async width => {
    for (const room of guamPlaceIds) {
      const onPlaces = vi.fn(); await act(async () => { tree = create(<HomeChrome room={room} width={width} overview={false} designing={false} canUndo canRedo showRedo top={0} bottom={0} onPlaces={onPlaces} onGames={() => {}} onBack={() => {}} onUndo={() => {}} onRedo={() => {}} onMore={() => {}} onFind={() => {}} onFriends={() => {}} onOverview={() => {}} onDesign={() => {}} onRoom={() => {}} onHeaderLayout={() => {}}/>); });
      const pill = tree!.root.findByProps({ testID: 'home-room-pill' });
      expect(pill.parent!.findAll(n => n.props.testID === 'home-undo-button')).toHaveLength(0);
      expect(pill.findAll(n => String(n.type) === 'Text').some(n => n.props.children === (room === 'tumon-beach' ? 'Tumon Beach' : 'Chamorro Village'))).toBe(true);
      const dock = tree!.root.findByProps({ testID: 'home-bottom-bar' }); const buttons = dock.findAll(n => String(n.type) === 'Pressable');
      const row = flat(dock.find(n => String(n.type) === 'View' && flat(n.props.style).gap === 8 && flat(n.props.style).flexDirection === 'row').props.style);
      expect(buttons).toHaveLength(4); expect(buttons.reduce((n, b) => n + flat(b.props.style).minWidth, 0) + row.gap * 3 + row.paddingHorizontal * 2).toBeLessThanOrEqual(340);
      await act(async () => tree!.root.findByProps({ testID: 'home-places-button' }).props.onPress()); expect(onPlaces).toHaveBeenCalledOnce();
      await act(async () => tree!.unmount()); tree = undefined;
    }
  });
});
