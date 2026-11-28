import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { compactHome, homeReducer, hydrateHome, starterHome, validHome, type HomeStateV2 } from '../src/home/model';
import { editHistory, restoredHistory, savedHistory, type History } from '../src/home/useHomeStore';
import { buildScene } from '../src/home/scene/graph';
import { resolve } from '../src/home/scene/proposal';
import { defaultGuamRoom, guamPlaceIds } from '../src/home/locations';
import { moreCatalog, roomNames, type RoomId } from '../src/home/catalogMore';
import { capabilityOf } from '../src/home/world';
import { illustratedProps, illustratedRooms } from '../src/home/art/illustrated';
import {
  COCOS_PALM_HOTSPOT,
  MAX_PALM_COCONUTS,
  isEntitySwimming,
  isInWaterZone,
  isPointInCocosPalm,
} from '../src/home/waterZone';
import { activityFaceOf } from '../src/home/runtime/expressions';
import { landingMaterial, landingSound } from '../src/home/runtime/delight';
import { PlacesSheet } from '../src/home/PlacesSheet';
import { MoreItemArt } from '../src/home/art/More';
import { AtmosphereLighting } from '../src/home/art/AtmosphereLighting';
import { mapExtrasLayout, mapLayout, WALK_MS, ZOOM_MS } from '../src/hub/model';
import { excursionRoute } from '../src/hub/navigation';
import { IslandScene } from '../src/hub/IslandScene';
import { IslandLife } from '../src/hub/IslandLife';
import { defaultLook } from '../src/islander/look';
import { initializePersonalization } from '../src/personalization/model';
import { emptySave } from '../src/state/validation';
import { encodeSave } from '../src/state/profiles';

const flat = (s: unknown): Record<string, any> =>
  typeof s === 'function' ? flat(s({ pressed: false })) : Array.isArray(s) ? Object.assign({}, ...s.map(flat)) : (s ?? {});

vi.mock('react-native', () => ({
  Pressable: 'Pressable',
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  Platform: { OS: 'ios' },
  AppState: { currentState: 'active', addEventListener: () => ({ remove: () => {} }) },
  StyleSheet: {
    absoluteFill: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
    create: (s: unknown) => s,
    flatten: (s: unknown) => flat(s),
  },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
}));
vi.mock('react-native-svg', () =>
  Object.fromEntries(
    ['default', 'G', 'Path', 'Rect', 'Circle', 'Ellipse', 'Image', 'Defs', 'Stop', 'LinearGradient', 'RadialGradient', 'Filter', 'FeColorMatrix'].map(
      (k) => [k, k]
    )
  )
);
vi.mock('expo-router', () => ({ router: { push: vi.fn(), replace: vi.fn() } }));
vi.mock('../src/components/GameShelf', () => ({ openShelfGame: vi.fn() }));
vi.mock('../src/ui/Sheet', () => ({ Sheet: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../src/ui/fonts', () => ({ useNunitoLoaded: () => false }));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => true }));
vi.mock('../src/components/ui', () => ({ C: { blue: '#3B82F6' }, font: undefined }));
vi.mock('../src/hub/Terrain', () => ({ Terrain: () => null }));
const motionMock = vi.hoisted(() => ({
  foreground: true,
  timingTargets: [] as { shared: { value: number; get: () => number; set: (n: number) => void }; target: number }[],
  sharedValues: [] as { value: number; get: () => number; set: (n: number) => void }[],
  cancels: 0,
  freezeAtHalf: false,
}));
vi.mock('../src/hub/foreground', () => ({ useAppForeground: () => motionMock.foreground }));
vi.mock('../src/islander', () => ({ Islander: () => null }));
vi.mock('../src/home/runtime/WeatherOverlay', () => ({ WeatherOverlay: () => null }));
vi.mock('../src/atmosphere/GlobalWeatherLayer', () => ({ GlobalWeatherLayer: () => null }));
vi.mock('expo-haptics', () => ({}));
vi.mock('react-native-reanimated', async () => {
  const { useRef } = await import('react');
  return {
    default: { View: 'AnimatedView', createAnimatedComponent: (c: unknown) => c },
    cancelAnimation: vi.fn((sv?: { value: number }) => {
      motionMock.cancels++;
      if (sv) sv.value = 0;
    }),
    Easing: { out: () => null, inOut: () => null, cubic: null, sin: null, linear: null },
    useSharedValue: (v: number) => {
      const ref = useRef<{ value: number; get: () => number; set: (n: number) => void } | null>(null);
      if (!ref.current) {
        const shared = {
          value: v,
          get: () => shared.value,
          set: (n: number) => {
            shared.value = n;
          },
        };
        ref.current = shared;
        motionMock.sharedValues.push(shared);
      }
      return ref.current;
    },
    withTiming: (v: number) => (motionMock.freezeAtHalf ? v * 0.5 : v),
    withSequence: (...vals: number[]) => vals.at(-1),
    withDelay: (_: number, v: number) => v,
    withRepeat: (v: number) => v,
    ReduceMotion: { System: 'system', Never: 'never' },
    useAnimatedStyle: (fn: () => unknown) => fn(),
  };
});

vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

let tree: ReactTestRenderer | undefined;
afterEach(async () => {
  vi.useRealTimers();
  motionMock.foreground = true;
  motionMock.freezeAtHalf = false;
  motionMock.sharedValues = [];
  motionMock.cancels = 0;
  if (tree) await act(async () => tree!.unmount());
  tree = undefined;
});

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function start(room: RoomId = 'tumon-beach'): History {
  const h = starterHome();
  h.current = room;
  return { present: h, past: [], future: [] };
}

function bring(h: History, slot = 0, x = 8, y = 8): History {
  const roomId = Object.entries(h.present.rooms).find(([, r]) => r.characters.some((c) => c.slot === slot))![0] as RoomId;
  return editHistory(h, { type: 'transfer', slot: slot as 0, room: h.present.current, roomId, x, y });
}

function settle(h: History, id: string, targetId: string): History {
  const scene = buildScene(h.present);
  const target = scene.rooms[h.present.current].targets.find((t) => t.id === targetId)!;
  expect(target).toBeDefined();
  const proposal = resolve(
    { ...scene.rooms[h.present.current], entities: scene.entities },
    scene.entities[id],
    target.contact,
    { scale: 1, target: target.id, release: true }
  );
  expect(proposal.target).toBe(targetId);
  const result = editHistory(h, { type: 'apply-proposal', proposal });
  expect(result).not.toBe(h);
  expect(validHome(result.present)).toBe(true);
  return result;
}

describe('Tumon Beach & Ocean and Secret Cocos Island worlds', () => {
  it('ships valid default layouts and all 8 new storybook WebP assets', () => {
    const s = starterHome();
    expect(validHome(s)).toBe(true);
    expect(guamPlaceIds).toContain('cocos-island');
    expect(roomNames['cocos-island']).toBe('Cocos Island');
    expect(illustratedRooms['cocos-island']()).toBe('assets/art/home/places/cocos-island.webp');
    for (const key of [
      'swim-ring',
      'sandcastle',
      'snorkel-set',
      'treasure-chest-open',
      'treasure-chest-closed',
      'sea-turtle',
      'outrigger-canoe',
    ] as const) {
      expect(illustratedProps[key]()).toBe(`assets/art/home/places/${key}.webp`);
    }
    const tumonItems = defaultGuamRoom('tumon-beach').instances.map((i) => i.item);
    expect(tumonItems).toEqual(
      expect.arrayContaining(['beach-blanket', 'sandcastle', 'coconut-drink', 'ball', 'shell', 'swim-ring', 'beach-surfboard', 'snorkel-set'])
    );
    const cocosItems = defaultGuamRoom('cocos-island').instances.map((i) => i.item);
    expect(cocosItems).toEqual(
      expect.arrayContaining(['hammock', 'treasure-chest', 'outrigger-canoe', 'sea-turtle', 'swim-ring', 'shell'])
    );
  });

  it('calibrates Tumon and Cocos shorelines to painted wet water vs dry sand and supports reachable wading drops for all 6 characters', () => {
    // R1-04: Dry sand points in both paintings MUST stay dry
    expect(isInWaterZone('tumon-beach', { x: 300, y: 400 })).toBe(false);
    expect(isInWaterZone('tumon-beach', { x: 500, y: 360 })).toBe(false);
    expect(isInWaterZone('tumon-beach', { x: 700, y: 340 })).toBe(false);
    expect(isInWaterZone('tumon-beach', { x: 260, y: 510 })).toBe(false);
    expect(isInWaterZone('cocos-island', { x: 500, y: 450 })).toBe(false);
    expect(isInWaterZone('cocos-island', { x: 300, y: 400 })).toBe(false);
    expect(isInWaterZone('cocos-island', { x: 400, y: 500 })).toBe(false);
    expect(isInWaterZone('cocos-island', { x: 180, y: 480 })).toBe(false);
    // Genuine shallow turquoise water points MUST register wet
    expect(isInWaterZone('tumon-beach', { x: 300, y: 320 })).toBe(true);
    expect(isInWaterZone('tumon-beach', { x: 150, y: 330 })).toBe(true);
    expect(isInWaterZone('tumon-beach', { x: 500, y: 305 })).toBe(true);
    expect(isInWaterZone('tumon-beach', { x: 300, y: 220 })).toBe(false); // sky above horizon
    expect(isInWaterZone('cocos-island', { x: 650, y: 386 })).toBe(true);
    expect(isInWaterZone('cocos-island', { x: 680, y: 450 })).toBe(true);
    expect(isInWaterZone('cocos-island', { x: 620, y: 500 })).toBe(true);
    expect(isInWaterZone('cocos-island', { x: 500, y: 535 })).toBe(true);
    // Indoor rooms never have ocean water
    expect(isInWaterZone('home', { x: 300, y: 320 })).toBe(false);

    // Move all 6 family/friends into reachable Tumon Beach shallow water via real resolve + apply!
    let h = start('tumon-beach');
    for (const [idx, slot] of ([0, 1, 2, 3, 4, 5] as const).entries()) {
      h = bring(h, slot, 2 + idx * 2, 8);
      const s = buildScene(h.present);
      const ent = s.entities[`character/${slot}`];
      const prop = resolve(
        { ...s.rooms['tumon-beach'], entities: s.entities },
        ent,
        { x: 100 + idx * 80, y: 315 } as any,
        { scale: 1, release: true, floorOnly: true }
      );
      expect(isInWaterZone('tumon-beach', prop.contact), `slot ${slot} reachable wet drop`).toBe(true);
      h = editHistory(h, { type: 'apply-proposal', proposal: prop });
      expect(validHome(h.present)).toBe(true);
    }
    const scene = buildScene(h.present);
    for (const slot of [0, 1, 2, 3, 4, 5] as const) {
      const entity = scene.entities[`character/${slot}`];
      expect(isEntitySwimming(entity, scene)).toBe(true);
      expect(activityFaceOf(entity, false, undefined, false, false, true)).toBe('happy');
    }

    // Boundary crossing in Tumon: dry sand (300, 400) -> dry; shallow turquoise (300, 315) -> wet + splash!
    const tumonDry = bring(start('tumon-beach'), 0, 8, 9);
    const tumonScene = buildScene(tumonDry.present);
    const hero = tumonScene.entities['character/0'];
    const dryDrop = resolve(
      { ...tumonScene.rooms['tumon-beach'], entities: tumonScene.entities },
      hero,
      { x: 300, y: 400 } as any,
      { scale: 1, release: true, floorOnly: true }
    );
    expect(isInWaterZone('tumon-beach', dryDrop.contact)).toBe(false);
    expect(landingMaterial(hero, dryDrop, tumonScene)).not.toBe('splash');

    const wetDrop = resolve(
      { ...tumonScene.rooms['tumon-beach'], entities: tumonScene.entities },
      hero,
      { x: 300, y: 315 } as any,
      { scale: 1, release: true, floorOnly: true }
    );
    expect(isInWaterZone('tumon-beach', wetDrop.contact)).toBe(true);
    expect(landingMaterial(hero, wetDrop, tumonScene)).toBe('splash');
    expect(landingSound(hero, wetDrop, tumonScene)).toBe('splash');

    // Boundary crossing in Cocos Island: dry sand (500, 450) -> dry; turquoise lagoon (680, 450) -> wet + splash!
    const cocosStart = bring(start('cocos-island'), 0, 4, 8);
    const cocosScene = buildScene(cocosStart.present);
    const cocosHero = cocosScene.entities['character/0'];
    const cocosDry = resolve(
      { ...cocosScene.rooms['cocos-island'], entities: cocosScene.entities },
      cocosHero,
      { x: 500, y: 450 } as any,
      { scale: 1, release: true, floorOnly: true }
    );
    expect(isInWaterZone('cocos-island', cocosDry.contact)).toBe(false);
    expect(landingMaterial(cocosHero, cocosDry, cocosScene)).not.toBe('splash');

    const cocosWet = resolve(
      { ...cocosScene.rooms['cocos-island'], entities: cocosScene.entities },
      cocosHero,
      { x: 680, y: 450 } as any,
      { scale: 1, release: true, floorOnly: true }
    );
    expect(isInWaterZone('cocos-island', cocosWet.contact)).toBe(true);
    expect(landingMaterial(cocosHero, cocosWet, cocosScene)).toBe('splash');
    expect(landingSound(cocosHero, cocosWet, cocosScene)).toBe('splash');
    const cocosAfterWet = editHistory(cocosStart, { type: 'apply-proposal', proposal: cocosWet });
    expect(validHome(cocosAfterWet.present)).toBe(true);
    expect(isEntitySwimming(buildScene(cocosAfterWet.present).entities['character/0'], buildScene(cocosAfterWet.present))).toBe(true);
  });

  it('supports swim-ring float socket (including floating in water), beach-surfboard riding socket + hand hold, sandcastle sparkle, and snorkel bubbles', async () => {
    // Swim ring is movable into shallow turquoise water & any character can float in it
    expect(capabilityOf('swim-ring').moveInPlay).toBe(true);
    expect(capabilityOf('swim-ring').sockets?.length).toBeGreaterThan(0);
    let h = bring(bring(start('tumon-beach'), 0, 6, 8), 2, 10, 8);
    const ringScene = buildScene(h.present);
    const ringToWater = resolve(
      { ...ringScene.rooms['tumon-beach'], entities: ringScene.entities },
      ringScene.entities['tumon-beach/item/place-swim-ring'],
      { x: 300, y: 315 } as any,
      { scale: 1, release: true, floorOnly: true }
    );
    h = editHistory(h, { type: 'apply-proposal', proposal: ringToWater });
    expect(validHome(h.present)).toBe(true);
    h = settle(h, 'character/0', 'tumon-beach/item/place-swim-ring/socket/float');
    expect(h.present.rooms['tumon-beach'].characters.find((c) => c.slot === 0)).toMatchObject({
      pose: 'sit',
      seatId: 'place-swim-ring',
    });
    expect(isEntitySwimming(buildScene(h.present).entities['character/0'], buildScene(h.present))).toBe(true);

    // Surfboard has a real standing/riding socket AND remains holdable in hand
    let surf = bring(start('tumon-beach'), 0, 10, 8);
    surf = settle(surf, 'character/0', 'tumon-beach/item/place-surfboard/socket/ride');
    expect(surf.present.rooms['tumon-beach'].characters.find((c) => c.slot === 0)).toMatchObject({
      pose: 'stand',
      seatId: 'place-surfboard',
    });
    const surfHeld = settle(bring(start('tumon-beach'), 0, 10, 8), 'tumon-beach/item/place-surfboard', 'character/0/hand');
    expect(surfHeld.present.rooms['tumon-beach'].characters.find((c) => c.slot === 0)?.holding).toBe('place-surfboard');

    // Sandcastle toggles sparkling decorated state
    let castle = start('tumon-beach');
    castle = editHistory(castle, { type: 'toggle', id: 'place-sandcastle' });
    expect(castle.present.rooms['tumon-beach'].instances.find((i) => i.id === 'place-sandcastle')?.powered).toBe(true);
    await act(async () => {
      tree = create(<MoreItemArt id="sandcastle" size={145} active state={{ on: true }} />);
    });
    expect(tree!.root.findAllByProps({ testID: 'sandcastle-sparkle' })).toHaveLength(1);
    await act(async () => tree!.unmount());
    tree = undefined;

    // Snorkel set is holdable & plays bubbles sound when handed to a character
    expect(moreCatalog['snorkel-set']).toMatchObject({ free: true, small: true });
    expect(capabilityOf('snorkel-set')).toMatchObject({ moveInPlay: true, holdable: true });
    const snkStart = bring(start('tumon-beach'), 0, 10, 8);
    const snkScene = buildScene(snkStart.present);
    const snkTarget = snkScene.rooms['tumon-beach'].targets.find((t) => t.id === 'character/0/hand')!;
    const snkProposal = resolve(
      { ...snkScene.rooms['tumon-beach'], entities: snkScene.entities },
      snkScene.entities['tumon-beach/item/place-snorkel-set'],
      snkTarget.contact,
      { scale: 1, target: snkTarget.id, release: true }
    );
    expect(landingSound(snkScene.entities['tumon-beach/item/place-snorkel-set'], snkProposal, snkScene)).toBe('bubbles');
    const snkHeld = settle(snkStart, 'tumon-beach/item/place-snorkel-set', 'character/0/hand');
    expect(snkHeld.present.rooms['tumon-beach'].characters.find((c) => c.slot === 0)?.holding).toBe('place-snorkel-set');
  });

  it('supports Cocos Island treasure chest toggle, outrigger canoe paddling socket, sea turtle spot, and bounded palm coconut drops', async () => {
    let h = bring(bring(start('cocos-island'), 0, 5, 8), 3, 7, 8);

    // Treasure chest toggles closed -> open with matching art and golden glow
    expect(h.present.rooms['cocos-island'].instances.find((i) => i.id === 'place-treasure-chest')?.powered).toBeUndefined();
    h = editHistory(h, { type: 'toggle', id: 'place-treasure-chest' });
    expect(h.present.rooms['cocos-island'].instances.find((i) => i.id === 'place-treasure-chest')?.powered).toBe(true);

    await act(async () => {
      tree = create(<MoreItemArt id="treasure-chest" size={150} active={false} state={{ on: false }} />);
    });
    expect(tree!.root.findAllByProps({ testID: 'painted-prop-treasure-chest-closed' })).toHaveLength(1);
    await act(async () => tree!.update(<MoreItemArt id="treasure-chest" size={150} active state={{ on: true }} />));
    expect(tree!.root.findAllByProps({ testID: 'painted-prop-treasure-chest-open' })).toHaveLength(1);
    expect(tree!.root.findAllByProps({ testID: 'treasure-chest-glow' })).toHaveLength(1);
    await act(async () => tree!.unmount());
    tree = undefined;

    // Outrigger canoe paddle socket & sea-turtle beside-swim spot
    h = settle(h, 'character/0', 'cocos-island/item/place-outrigger-canoe/socket/paddle');
    expect(h.present.rooms['cocos-island'].characters.find((c) => c.slot === 0)).toMatchObject({
      pose: 'sit',
      seatId: 'place-outrigger-canoe',
    });
    h = settle(h, 'character/3', 'cocos-island/item/place-sea-turtle/socket/swim-beside');
    expect(h.present.rooms['cocos-island'].characters.find((c) => c.slot === 3)).toMatchObject({
      pose: 'sit',
      seatId: 'place-sea-turtle',
    });

    // Shakeable coconut palm hotspot bounds and max-2 coconut drop limit
    expect(isPointInCocosPalm({ x: COCOS_PALM_HOTSPOT.left + 40, y: COCOS_PALM_HOTSPOT.top + 40 })).toBe(true);
    expect(isPointInCocosPalm({ x: 650, y: 480 })).toBe(false);
    let palmState = h.present;
    for (let i = 0; i < MAX_PALM_COCONUTS + 2; i++) {
      palmState = homeReducer(palmState, { type: 'palm-coconut', roomId: 'cocos-island' }).state;
    }
    const palmCoconuts = palmState.rooms['cocos-island'].instances.filter((i) => i.id.startsWith('palm-coconut-'));
    expect(palmCoconuts).toHaveLength(MAX_PALM_COCONUTS);
    expect(palmCoconuts.every((i) => i.item === 'coconut-drink')).toBe(true);
    expect(validHome(palmState)).toBe(true);
  });

  it('persists discoveredPlaces cleanly, unlocks Cocos Island in PlacesSheet, and adds zero bytes to untouched saves', async () => {
    // Untouched legacy save remains byte-for-byte identical
    const base = initializePersonalization(emptySave());
    const original = encodeSave(base);
    const hydrated = hydrateHome(base.personalization!.people.family.home)!;
    const compacted = compactHome(hydrated);
    expect(compacted.discoveredPlaces).toBeUndefined();
    const copy = clone(base);
    copy.personalization!.people.family.home = compacted;
    expect(encodeSave(copy)).toBe(original);

    // Discover Cocos Island -> persists across compact/hydrate round-trip without entering Undo
    let h = start('cocos-island');
    h = editHistory(h, { type: 'discover', place: 'cocos-island' });
    expect(h.past).toHaveLength(0);
    expect(h.present.discoveredPlaces).toEqual(['cocos-island']);
    const saved = compactHome(savedHistory(h));
    expect(validHome(saved)).toBe(true);
    expect(saved.discoveredPlaces).toEqual(['cocos-island']);
    const restored = restoredHistory(hydrateHome(saved)!);
    expect(restored.present.discoveredPlaces).toEqual(['cocos-island']);

    // R1-01: First visit to Cocos -> arrival edit -> discover -> leave to My Room -> Undo -> Redo MUST retain cocos-island before AND after reload!
    let visitHistory = start('cocos-island');
    visitHistory = bring(visitHistory, 0, 5, 8);
    visitHistory = editHistory(visitHistory, { type: 'discover', place: 'cocos-island' });
    visitHistory = editHistory(visitHistory, { type: 'room', room: 'home' });
    expect(visitHistory.present.discoveredPlaces).toEqual(['cocos-island']);
    const afterInMemoryUndo = editHistory(visitHistory, { type: 'undo' });
    expect(afterInMemoryUndo.present.current).toBe('home');
    expect(afterInMemoryUndo.present.discoveredPlaces).toEqual(['cocos-island']);
    expect(validHome(afterInMemoryUndo.present)).toBe(true);
    const afterInMemoryRedo = editHistory(afterInMemoryUndo, { type: 'redo' });
    expect(afterInMemoryRedo.present.discoveredPlaces).toEqual(['cocos-island']);
    // Same guarantee after save -> compact -> hydrate -> reload!
    const reloaded = restoredHistory(hydrateHome(compactHome(savedHistory(visitHistory)))!);
    expect(editHistory(reloaded, { type: 'undo' }).present.discoveredPlaces).toEqual(['cocos-island']);
    expect(editHistory(editHistory(reloaded, { type: 'undo' }), { type: 'redo' }).present.discoveredPlaces).toEqual(['cocos-island']);

    // Corrupt discoveredPlaces are strictly rejected
    const badEmpty = { ...clone(saved), discoveredPlaces: [] };
    expect(validHome(badEmpty)).toBe(false);
    const badDup = { ...clone(saved), discoveredPlaces: ['cocos-island', 'cocos-island'] };
    expect(validHome(badDup)).toBe(false);
    const badName = { ...clone(saved), discoveredPlaces: ['atlantis'] };
    expect(validHome(badName)).toBe(false);

    // PlacesSheet keeps Cocos Island secret until visited/discovered, then shows it with secret badge
    const onRoom = vi.fn();
    await act(async () => {
      tree = create(<PlacesSheet room="home" onRoom={onRoom} onGame={() => {}} onClose={() => {}} />);
    });
    expect(tree!.root.findAllByProps({ testID: 'places-card-cocos-island' })).toHaveLength(0);
    await act(async () =>
      tree!.update(<PlacesSheet room="home" discoveredPlaces={['cocos-island']} onRoom={onRoom} onGame={() => {}} onClose={() => {}} />)
    );
    expect(tree!.root.findAllByProps({ testID: 'places-card-cocos-island' })).toHaveLength(1);
    expect(tree!.root.findAllByProps({ testID: 'places-secret-badge' })).toHaveLength(1);
    await act(async () => tree!.root.findByProps({ testID: 'places-card-cocos-island' }).props.onPress());
    expect(onRoom).toHaveBeenCalledWith('cocos-island');
    await act(async () => tree!.unmount());
    tree = undefined;

    // Night atmosphere renders outdoor bioluminescent shimmer in both tumon-beach and cocos-island
    for (const place of ['tumon-beach', 'cocos-island'] as const) {
      await act(async () => {
        tree = create(
          <AtmosphereLighting room={place} atmosphere={{ timeOfDay: 'night', weather: 'clear' }} reduced active />
        );
      });
      expect(tree!.root.findAllByProps({ testID: `bioluminescent-shimmer-${place}` })).toHaveLength(1);
      await act(async () => tree!.unmount());
      tree = undefined;
    }
  });
});

describe('Guam Map interactive water, Secret Cocos Island boat trip & Easter eggs', () => {
  it.each([
    ['compact minimum', 320, 355],
    ['compact SE phone', 320, 568],
    ['compact mid portrait', 375, 454],
    ['standard iPhone', 375, 667],
    ['portrait phone', 390, 710],
    ['compact landscape', 844, 245],
    ['landscape iPad', 1024, 600],
    ['wide landscape', 1366, 600],
  ])('keeps all map hotspots >=48pt, inside bounds, clear of all 6 buildings, and mutually non-overlapping on %s (%dx%d)', (_label, width, height) => {
    const layout = mapLayout(width, height, 1);
    const extras = mapExtrasLayout(width, height, layout);
    const buildings = layout.targets.map((place) => {
      const boxWidth = Math.max(48, place.width, place.labelWidth);
      return {
        id: place.id,
        left: place.left + (place.width - boxWidth) / 2,
        top: place.top,
        width: boxWidth,
        height: place.height,
      };
    });
    // Core excursion hotspots (Cocos & Ocean) are ALWAYS present and >=48pt
    expect(extras.cocos.width).toBeGreaterThanOrEqual(48);
    expect(extras.cocos.height).toBeGreaterThanOrEqual(48);
    expect(extras.ocean.width).toBeGreaterThanOrEqual(48);
    expect(extras.ocean.height).toBeGreaterThanOrEqual(48);

    const activeExtras = (
      [
        ['ocean', extras.ocean],
        ['cocos', extras.cocos],
        ...(extras.sailboat ? [['sailboat', extras.sailboat] as const] : []),
        ...(extras.dolphinReef ? [['dolphinReef', extras.dolphinReef] as const] : []),
        ...(extras.northernIslet ? [['northernIslet', extras.northernIslet] as const] : []),
        ...(extras.nightMoon ? [['nightMoon', extras.nightMoon] as const] : []),
      ] as const
    );
    const overlapsBox = (a: { left: number; top: number; width: number; height: number }, b: { left: number; top: number; width: number; height: number }) =>
      a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;

    for (const [name, hotspot] of activeExtras) {
      expect(hotspot.width, name).toBeGreaterThanOrEqual(48);
      expect(hotspot.height, name).toBeGreaterThanOrEqual(48);
      expect(hotspot.left, name).toBeGreaterThanOrEqual(0);
      expect(hotspot.top, name).toBeGreaterThanOrEqual(0);
      expect(hotspot.left + hotspot.width, name).toBeLessThanOrEqual(width);
      expect(hotspot.top + hotspot.height, name).toBeLessThanOrEqual(height);
      for (const b of buildings) {
        expect(overlapsBox(hotspot, b), `${name} overlaps building ${b.id} at ${width}x${height}`).toBe(false);
      }
    }
    for (let i = 0; i < activeExtras.length; i++) {
      for (let j = i + 1; j < activeExtras.length; j++) {
        expect(
          overlapsBox(activeExtras[i][1], activeExtras[j][1]),
          `${activeExtras[i][0]} overlaps ${activeExtras[j][0]} at ${width}x${height}`
        ).toBe(false);
      }
    }
    // Compact cropped portrait (320x355) & landscape show the visible miniature Cocos Islet affordance
    if (width === 320 && height === 355) {
      expect(extras.showCocosIslet).toBe(true);
    }
  });

  it('enforces single latest-destination owner across buildings and excursions (R1-02)', async () => {
    vi.useFakeTimers();
    const onArrive = vi.fn();
    const onExcursion = vi.fn();
    await act(async () => {
      tree = create(
        <IslandScene
          width={390}
          height={710}
          fontScale={1}
          look={defaultLook}
          reduced={false}
          active
          door={null}
          onArrive={onArrive}
          onExcursion={onExcursion}
        />
      );
    });
    // Direction 1: Ocean -> 80ms -> School => ONLY School fires!
    await act(async () => tree!.root.findByProps({ testID: 'map-ocean-hotspot' }).props.onPress());
    await act(async () => { vi.advanceTimersByTime(80); });
    await act(async () => tree!.root.findByProps({ testID: 'place-school' }).props.onPress());
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(onArrive).toHaveBeenCalledExactlyOnceWith('school');
    expect(onExcursion).not.toHaveBeenCalled();

    // Reset focus to return to map
    await act(async () => {
      tree!.update(
        <IslandScene width={390} height={710} fontScale={1} look={defaultLook} reduced={false} active={false} door="school" onArrive={onArrive} onExcursion={onExcursion} />
      );
    });
    await act(async () => {
      tree!.update(
        <IslandScene width={390} height={710} fontScale={1} look={defaultLook} reduced={false} active door="school" onArrive={onArrive} onExcursion={onExcursion} />
      );
    });
    onArrive.mockClear();
    onExcursion.mockClear();

    // Direction 2: School -> 80ms -> Cocos => ONLY Cocos fires!
    await act(async () => tree!.root.findByProps({ testID: 'place-school' }).props.onPress());
    await act(async () => { vi.advanceTimersByTime(80); });
    await act(async () => tree!.root.findByProps({ testID: 'map-cocos-hotspot' }).props.onPress());
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(onExcursion).toHaveBeenCalledExactlyOnceWith('cocos-island');
    expect(onArrive).not.toHaveBeenCalled();

    // Repeated excursion taps: Ocean -> 50ms -> Cocos => ONLY Cocos fires once
    onExcursion.mockClear();
    await act(async () => tree!.root.findByProps({ testID: 'map-ocean-hotspot' }).props.onPress());
    await act(async () => { vi.advanceTimersByTime(50); });
    await act(async () => tree!.root.findByProps({ testID: 'map-cocos-hotspot' }).props.onPress());
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(onExcursion).toHaveBeenCalledExactlyOnceWith('cocos-island');

    // Focus loss (active=false) mid-excursion cancels pending excursion
    onExcursion.mockClear();
    await act(async () => tree!.root.findByProps({ testID: 'map-ocean-hotspot' }).props.onPress());
    await act(async () => { vi.advanceTimersByTime(60); });
    await act(async () => {
      tree!.update(
        <IslandScene width={390} height={710} fontScale={1} look={defaultLook} reduced={false} active={false} door="school" onArrive={onArrive} onExcursion={onExcursion} />
      );
    });
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(onExcursion).not.toHaveBeenCalled();
  });

  it('navigates to Tumon Beach & Ocean and Secret Cocos Island via calibrated hotspots with sound cues', async () => {
    expect(excursionRoute('tumon-beach')).toEqual({ pathname: '/island-home', params: { room: 'tumon-beach' } });
    expect(excursionRoute('cocos-island')).toEqual({ pathname: '/island-home', params: { room: 'cocos-island' } });

    vi.useFakeTimers();
    const onExcursion = vi.fn();
    const onSound = vi.fn();
    await act(async () => {
      tree = create(
        <IslandScene
          width={390}
          height={710}
          fontScale={1}
          look={defaultLook}
          reduced={false}
          active
          door={null}
          onArrive={vi.fn()}
          onExcursion={onExcursion}
          onSound={onSound}
        />
      );
    });
    await act(async () => tree!.root.findByProps({ testID: 'map-ocean-hotspot' }).props.onPress());
    expect(onSound).toHaveBeenCalledWith('splash');
    expect(tree!.root.findAllByProps({ testID: 'map-egg-splash' })).toHaveLength(1);
    await act(async () => {
      vi.advanceTimersByTime(WALK_MS + ZOOM_MS + 10);
    });
    expect(onExcursion).toHaveBeenCalledWith('tumon-beach');

    // Secret Cocos Island boat trip plays shell cue and shows wake ripples
    await act(async () => tree!.root.findByProps({ testID: 'map-cocos-hotspot' }).props.onPress());
    expect(onSound).toHaveBeenCalledWith('shell');
    expect(tree!.root.findAllByProps({ testID: 'map-egg-sail-wake' })).toHaveLength(1);
    await act(async () => {
      vi.advanceTimersByTime(Math.round(WALK_MS * 1.4) + ZOOM_MS + 10);
    });
    expect(onExcursion).toHaveBeenCalledWith('cocos-island');
  });

  it('triggers dolphin leap, northern islet hibiscus petals, and night-only shooting star while respecting Reduce Motion', async () => {
    const onSound = vi.fn();
    await act(async () => {
      tree = create(
        <IslandScene
          width={390}
          height={710}
          fontScale={1}
          look={defaultLook}
          reduced
          active
          door={null}
          atmosphere={{ timeOfDay: 'day', weather: 'clear' }}
          onArrive={vi.fn()}
          onSound={onSound}
        />
      );
    });
    // Moon hotspot only exists at night
    expect(tree!.root.findAllByProps({ testID: 'map-moon-hotspot' })).toHaveLength(0);

    // Dolphin leap
    await act(async () => tree!.root.findByProps({ testID: 'map-dolphin-hotspot' }).props.onPress());
    expect(onSound).toHaveBeenCalledWith('splash');
    expect(tree!.root.findAllByProps({ testID: 'map-egg-dolphin' })).toHaveLength(1);

    // Northern islet hibiscus petals
    await act(async () => tree!.root.findByProps({ testID: 'map-northern-islet-hotspot' }).props.onPress());
    expect(onSound).toHaveBeenCalledWith('rustle');
    expect(tree!.root.findAllByProps({ testID: 'map-egg-hibiscus' })).toHaveLength(1);

    // Switch to night -> crescent moon hotspot appears and triggers shooting star
    await act(async () =>
      tree!.update(
        <IslandScene
          width={390}
          height={710}
          fontScale={1}
          look={defaultLook}
          reduced
          active
          door={null}
          atmosphere={{ timeOfDay: 'night', weather: 'clear' }}
          onArrive={vi.fn()}
          onSound={onSound}
        />
      )
    );
    expect(tree!.root.findAllByProps({ testID: 'map-moon-hotspot' })).toHaveLength(1);
    await act(async () => tree!.root.findByProps({ testID: 'map-moon-hotspot' }).props.onPress());
    expect(onSound).toHaveBeenCalledWith('shell');
    expect(tree!.root.findAllByProps({ testID: 'map-egg-shooting-star' })).toHaveLength(1);
    await act(async () => tree!.unmount());
    tree = undefined;

    // Landscape renders the miniature Cocos Islet SVG; compact cropped portrait renders compact-cocos-islet; full portrait uses the painting
    const landExtras = mapExtrasLayout(1024, 660);
    await act(async () => {
      tree = create(<IslandLife width={1024} height={660} fontScale={1} reduced active extras={landExtras} />);
    });
    expect(tree!.root.findAllByProps({ testID: 'landscape-cocos-islet' })).toHaveLength(1);
    const compactExtras = mapExtrasLayout(320, 355);
    await act(async () => tree!.update(<IslandLife width={320} height={355} fontScale={1} reduced active extras={compactExtras} />));
    expect(tree!.root.findAllByProps({ testID: 'compact-cocos-islet' })).toHaveLength(1);
    const portExtras = mapExtrasLayout(390, 710);
    await act(async () => tree!.update(<IslandLife width={390} height={710} fontScale={1} reduced active extras={portExtras} />));
    expect(tree!.root.findAllByProps({ testID: 'landscape-cocos-islet' })).toHaveLength(0);
    await act(async () => tree!.unmount());
    tree = undefined;
  });

  it('animates sailboat glide, dolphin leap, hibiscus flutter, and shooting star with shared values, Reduce Motion fallback, and blur cancellation (R1-06)', async () => {
    motionMock.freezeAtHalf = true;
    const extras = mapExtrasLayout(390, 710);
    const readTransform = (node: any) => {
      const style = Array.isArray(node.props.style) ? Object.assign({}, ...node.props.style) : node.props.style;
      return Object.assign({}, ...(style.transform ?? []));
    };

    // Sailboat glides across Cocos Lagoon at mid-animation (progress = 0.5)
    const sailEvent = { id: 1, kind: 'sail' as const, x: extras.sailboat?.x ?? 40, y: extras.sailboat?.y ?? 650, toX: extras.cocos.x + 80, toY: extras.cocos.y - 30 };
    const sailEl = (
      <IslandLife
        width={390}
        height={710}
        fontScale={1}
        reduced={false}
        active
        extras={extras}
        easterEgg={sailEvent}
      />
    );
    await act(async () => { tree = create(sailEl); });
    // Re-evaluate animated styles after useEffect has driven the shared value to mid-animation (0.5).
    await act(async () => { tree!.update(React.cloneElement(sailEl, { easterEgg: { ...sailEvent } })); });
    const boatTransform = readTransform(tree!.root.findByProps({ testID: 'map-sailboat-art' }));
    expect(Math.abs(boatTransform.translateX)).toBeGreaterThan(10);
    expect(boatTransform.translateY).not.toBe(0);

    // Dolphin leaps along parabolic arc (translateY < -20 at apex)
    const dolphinEvent = { id: 2, kind: 'dolphin' as const, x: 340, y: 340 };
    const dolphinEl = (
      <IslandLife
        width={390}
        height={710}
        fontScale={1}
        reduced={false}
        active
        extras={extras}
        easterEgg={dolphinEvent}
      />
    );
    await act(async () => tree!.update(dolphinEl));
    await act(async () => tree!.update(React.cloneElement(dolphinEl, { easterEgg: { ...dolphinEvent } })));
    const dolphinTransform = readTransform(tree!.root.findByProps({ testID: 'map-egg-dolphin' }));
    expect(dolphinTransform.translateY).toBeLessThan(-20);

    // Hibiscus petals flutter & drift
    const hibiscusEvent = { id: 3, kind: 'hibiscus' as const, x: 60, y: 110 };
    const hibiscusEl = (
      <IslandLife
        width={390}
        height={710}
        fontScale={1}
        reduced={false}
        active
        extras={extras}
        easterEgg={hibiscusEvent}
      />
    );
    await act(async () => tree!.update(hibiscusEl));
    await act(async () => tree!.update(React.cloneElement(hibiscusEl, { easterEgg: { ...hibiscusEvent } })));
    const hibiscusTransform = readTransform(tree!.root.findByProps({ testID: 'map-egg-hibiscus' }));
    expect(hibiscusTransform.translateX).not.toBe(0);
    expect(hibiscusTransform.translateY).not.toBe(0);

    // Night shooting star streaks diagonally
    const starEvent = { id: 4, kind: 'shooting-star' as const, x: 320, y: 70 };
    const starEl = (
      <IslandLife
        width={390}
        height={710}
        fontScale={1}
        reduced={false}
        active
        extras={extras}
        easterEgg={starEvent}
      />
    );
    await act(async () => tree!.update(starEl));
    await act(async () => tree!.update(React.cloneElement(starEl, { easterEgg: { ...starEvent } })));
    const starTransform = readTransform(tree!.root.findByProps({ testID: 'map-egg-shooting-star' }));
    expect(starTransform.translateY).not.toBe(0);

    // Reduce Motion switches to clean static/fade (zero translation)
    await act(async () =>
      tree!.update(
        <IslandLife
          width={390}
          height={710}
          fontScale={1}
          reduced
          active
          extras={extras}
          easterEgg={{ id: 5, kind: 'dolphin', x: 340, y: 340 }}
        />
      )
    );
    const reducedDolphin = readTransform(tree!.root.findByProps({ testID: 'map-egg-dolphin' }));
    expect(reducedDolphin.translateX).toBe(0);
    expect(reducedDolphin.translateY).toBe(0);

    // Blur (active=false) cancels the one-shot animation immediately and resets shared value to 0
    const cancelsBefore = motionMock.cancels;
    await act(async () =>
      tree!.update(
        <IslandLife
          width={390}
          height={710}
          fontScale={1}
          reduced={false}
          active={false}
          extras={extras}
          easterEgg={{ id: 6, kind: 'dolphin', x: 340, y: 340 }}
        />
      )
    );
    expect(motionMock.cancels).toBeGreaterThan(cancelsBefore);
    expect(motionMock.sharedValues.at(-1)?.get()).toBe(0);
  });
});
