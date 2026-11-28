import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  compactHome,
  homeReducer,
  hydrateHome,
  instance,
  starterHome,
  validHome,
  type HomeStateV2,
} from '../src/home/model';
import { FRIDGE_STAPLES, storageCapacity, storageOpen } from '../src/home/storage';
import { buildScene } from '../src/home/scene/graph';
import { apply, resolve } from '../src/home/scene/proposal';
import { roomPoint } from '../src/home/scene/types';
import { withPortions } from '../src/home/runtime/portions';
import { restingVisible } from '../src/home/runtime/group';
import { editHistory, type History } from '../src/home/useHomeStore';
import { StorageTray } from '../src/home/runtime/StorageTray';
import { TargetCue } from '../src/home/runtime/TargetCue';
import { HomeScreen } from '../src/home/HomeScreen';
import type { Interaction } from '../src/home/runtime/useInteraction';

const harness = vi.hoisted(() => ({
  options: {} as any,
  scene: {} as any,
  proposals: [] as any[],
  played: [] as string[],
  haptics: [] as string[],
  cues: [] as any[],
  slots: [{}, {}] as any[],
}));

vi.mock('../src/home/AtmospherePicker', () => ({ AtmospherePicker: () => null }));
vi.mock('react-native-svg', () =>
  Object.fromEntries(
    ['Image', 'G', 'Circle', 'Ellipse', 'Rect', 'Path', 'Defs', 'ClipPath', 'Pattern', 'LinearGradient', 'Stop']
      .map((k) => [k, k])
      .concat([['default', 'Svg']])
  )
);
vi.mock('../src/badges/BadgeArt', () => ({ BadgeGlyph: () => null }));
vi.mock('../src/home/runtime/homeSound', () => ({
  useHomeFeedback: (live: boolean) => ({
    play: (s: string) => {
      if (live) harness.played.push(s);
      return live;
    },
    haptic: (k: string) => {
      if (live) harness.haptics.push(k);
      return live;
    },
    stop: () => {},
    setLive: () => {},
    silence: () => {},
    dispose: () => {},
  }),
}));
vi.mock('expo-router', () => ({ router: { push: vi.fn(), replace: vi.fn() }, useFocusEffect: () => {} }));
vi.mock('../src/home/runtime/visibility', () => ({ useHomeVisible: () => true }));
vi.mock('../src/home/webPopState', () => ({ registerWebPopStateHandler: () => () => {} }));
vi.mock('react-native', () => ({
  View: 'View',
  ScrollView: 'ScrollView',
  Text: 'Text',
  Pressable: 'Pressable',
  Platform: { OS: 'web' },
  AppState: { addEventListener: () => ({ remove() {} }) },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
  AccessibilityInfo: { sendAccessibilityEvent: () => {} },
}));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
vi.mock('react-native-reanimated', () => ({
  default: { View: 'AnimatedView' },
  useSharedValue: (v: any) => {
    const ref = React.useRef(v);
    return { get: () => ref.current, set: (n: any) => { ref.current = n; }, value: v };
  },
  useAnimatedStyle: (fn: () => unknown) => fn(),
}));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => false }));
vi.mock('../src/state/Store', () => ({ useStore: () => ({ save: { settings: { sound: true } } }) }));
vi.mock('../src/home/runtime/useIdleCharacters', () => ({ useIdleCharacters: () => ({ sleeping: {}, wake: () => {} }) }));
vi.mock('../src/home/runtime/useInteraction', () => ({
  useInteraction: (options: any) => {
    harness.options = options;
    return {
      isCurrent: () => true,
      finish: () => {},
      completeMealHandoff: () => {},
      animateProposal: (p: any) => {
        harness.proposals.push(p);
        return true;
      },
      camera: { get: () => ({ a: 0.5, b: 0, c: 0, d: 0.5, tx: 0, ty: 0 }), set: () => {} },
      slots: { get: () => harness.slots, value: harness.slots },
      veil: { value: 0 },
      cancelAll: () => {},
      animateCamera: () => {},
      showHint: () => {},
      showCue: (...args: any[]) => harness.cues.push(args),
      clearCue: () => {},
      dropZones: { set: () => {} },
    };
  },
}));
vi.mock('../src/home/runtime/SceneView', () => ({
  SceneView: (props: any) => {
    harness.scene = props;
    return null;
  },
}));
vi.mock('../src/home/runtime/HomeChrome', () => ({
  HomeChrome: () => null,
  Tool: () => null,
  navigationHeight: 60,
  navigationHeightFor: () => 60,
}));
vi.mock('../src/home/runtime/HomePanels', () => ({ HomePanels: () => null }));
vi.mock('../src/home/HomeClosetSheet', () => ({ HomeClosetSheet: () => null }));
vi.mock('../src/home/HomeBadgesSheet', () => ({ HomeBadgesSheet: () => null }));
vi.mock('../src/home/runtime/DesignTools', () => ({
  DesignTools: () => null,
  portraitDrawerHeight: 200,
  portraitDrawerHeightFor: () => 200,
}));
vi.mock('../src/home/runtime/StagingTray', () => ({ StagingTray: () => null }));
vi.mock('../src/home/runtime/Destinations', () => ({ Destinations: () => null }));
vi.mock('../src/home/runtime/DebugOverlay', () => ({ DebugOverlay: () => null }));
vi.mock('../src/home/runtime/FriendDrawer', () => ({ FriendDrawer: () => null }));
vi.mock('../src/home/runtime/CapacityCue', () => ({
  CapacityCue: 'CapacityCue',
  CAPACITY_CUE_MS: 3200,
  CAPACITY_MESSAGE: 'Put something away to make room.',
}));
vi.mock('../src/home/art/Items', () => ({ ItemArt: 'ItemArt' }));
vi.mock('../src/home/art/More', () => ({ MoreItemArt: 'MoreItemArt' }));
vi.mock('../src/home/runtime/UndoNote', () => ({ UndoNote: () => null, UndoGonePicture: () => null }));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
vi.stubGlobal('requestAnimationFrame', () => 1);
vi.stubGlobal('cancelAnimationFrame', () => {});

let root: ReturnType<typeof create> | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  harness.proposals = [];
  harness.played = [];
  harness.haptics = [];
  harness.cues = [];
  harness.slots = [{}, {}];
});

afterEach(async () => {
  if (root) {
    await act(async () => root!.unmount());
    root = undefined;
  }
  vi.useRealTimers();
});

function kitchenWithFriend(): HomeStateV2 {
  const s = starterHome();
  s.current = 'kitchen';
  const hero = s.rooms.home.characters.find((c) => c.slot === 0)!;
  s.rooms.home.characters = s.rooms.home.characters.filter((c) => c.slot !== 0);
  s.rooms.kitchen.characters = [{ ...hero, anchor: 'floor', pose: 'stand', x: 7, y: 9 }];
  return s;
}

describe('Real bounded fridge inventory (zero infinite duplicates)', () => {
  it('pre-stocks default kitchen fridge with 6 real usable food/drink items and 2 open slots (6/8)', () => {
    const s = starterHome();
    expect(validHome(s)).toBe(true);
    expect(compactHome(hydrateHome(compactHome(s))!)).toEqual(compactHome(s));

    const fridge = s.rooms.kitchen.instances.find((i) => i.id === 'starter-fridge')!;
    expect(fridge).toBeDefined();
    expect(storageCapacity(fridge.item)).toBe(8);

    const stocked = s.rooms.kitchen.instances.filter((i) => i.in === fridge.id);
    expect(stocked).toHaveLength(6);
    expect(stocked.map((i) => i.item)).toEqual([...FRIDGE_STAPLES]);

    // Closed fridge hides its stored contents from room rendering
    const closedScene = withPortions(buildScene(s));
    expect(
      Object.keys(closedScene.entities).filter((id) => id.includes('portion-starter-fridge'))
    ).toHaveLength(0);
    for (const item of stocked) {
      expect(restingVisible(closedScene.entities[`kitchen/item/${item.id}`], closedScene)).toBe(false);
    }

    // Open fridge renders those exact 6 real items on its shelves with ZERO virtual clones
    const opened = homeReducer(s, { type: 'toggle', id: 'starter-fridge', roomId: 'kitchen' }).state;
    const openScene = withPortions(buildScene(opened));
    expect(
      Object.keys(openScene.entities).filter((id) => id.includes('portion-starter-fridge'))
    ).toHaveLength(0);
    const shelfContacts = new Set<string>();
    for (const item of stocked) {
      const entity = openScene.entities[`kitchen/item/${item.id}`];
      expect(restingVisible(entity, openScene)).toBe(true);
      shelfContacts.add(`${Math.round(entity.contact.x)},${Math.round(entity.contact.y)}`);
    }
    expect(shelfContacts.size).toBe(6);
  });

  it('taking an item out reduces fridge count (6 -> 5) and creates ZERO duplicates', () => {
    const opened = homeReducer(starterHome(), {
      type: 'toggle',
      id: 'starter-fridge',
      roomId: 'kitchen',
    }).state;
    const totalBefore = opened.rooms.kitchen.instances.length;
    const scene = buildScene(opened);
    const mango = scene.entities['kitchen/item/starter-fridge-mango'];
    const takeProposal = resolve(
      { ...scene.rooms.kitchen, entities: scene.entities },
      mango,
      roomPoint(480, 515),
      { scale: 1, floorOnly: true, release: true }
    );
    const applied = apply(opened, takeProposal);
    expect('state' in applied).toBe(true);
    if (!('state' in applied)) return;

    const next = applied.state;
    expect(validHome(next)).toBe(true);
    expect(next.rooms.kitchen.instances).toHaveLength(totalBefore);
    expect(next.rooms.kitchen.instances.filter((i) => i.in === 'starter-fridge')).toHaveLength(5);
    expect(next.rooms.kitchen.instances.filter((i) => i.item === 'mango')).toHaveLength(1);
    expect(next.rooms.kitchen.instances.find((i) => i.id === 'starter-fridge-mango')?.in).toBeUndefined();
  });

  it('puts an item back into the fridge effortlessly when OPEN or CLOSED (5 -> 6), and refuses cleanly when FULL (8/8)', () => {
    // Start with 5 items in a closed fridge and 1 loose mango on the floor
    const s = starterHome();
    const mangoIdx = s.rooms.kitchen.instances.findIndex((i) => i.id === 'starter-fridge-mango');
    s.rooms.kitchen.instances[mangoIdx] = instance('starter-fridge-mango', 'mango', 6, 10);
    expect(s.rooms.kitchen.instances.filter((i) => i.in === 'starter-fridge')).toHaveLength(5);
    expect(storageOpen(s.rooms.kitchen.instances.find((i) => i.id === 'starter-fridge')!)).toBe(false);

    // 1. Put back onto CLOSED fridge (dropping near the upper body of the fridge)
    const closedScene = buildScene(s);
    const fridgeEntity = closedScene.entities['kitchen/item/starter-fridge'];
    const upperFridgeAim = roomPoint(fridgeEntity.contact.x, fridgeEntity.contact.y - 200);
    const dropClosed = resolve(
      { ...closedScene.rooms.kitchen, entities: closedScene.entities },
      closedScene.entities['kitchen/item/starter-fridge-mango'],
      upperFridgeAim,
      { scale: 0.5, aim: upperFridgeAim, release: true }
    );
    expect(dropClosed.attachment).toEqual({ kind: 'container', parent: 'kitchen/item/starter-fridge' });
    const putClosed = apply(s, dropClosed);
    expect('state' in putClosed).toBe(true);
    if (!('state' in putClosed)) return;
    expect(putClosed.state.rooms.kitchen.instances.filter((i) => i.in === 'starter-fridge')).toHaveLength(6);
    expect(storageOpen(putClosed.state.rooms.kitchen.instances.find((i) => i.id === 'starter-fridge')!)).toBe(true);
    expect(putClosed.state.rooms.kitchen.instances.filter((i) => i.item === 'mango')).toHaveLength(1);

    // 2. Put another item into the now-OPEN fridge (6 -> 7 -> 8)
    let state = putClosed.state;
    state.rooms.kitchen.instances.push(
      instance('extra-1', 'shell', 2, 6),
      instance('extra-2', 'teddy', 2, 10),
      instance('extra-9', 'book', 8, 6)
    );
    for (const extraId of ['extra-1', 'extra-2']) {
      const sc = buildScene(state);
      const t = sc.rooms.kitchen.targets.find((target) => target.id === 'kitchen/item/starter-fridge/container')!;
      const p = resolve({ ...sc.rooms.kitchen, entities: sc.entities }, sc.entities[`kitchen/item/${extraId}`], t.contact, {
        scale: 0.5,
        aim: upperFridgeAim,
        release: true,
      });
      expect(p.attachment).toEqual({ kind: 'container', parent: 'kitchen/item/starter-fridge' });
      const res = apply(state, p);
      if (!('state' in res)) throw new Error('expected apply to succeed');
      state = res.state;
    }
    expect(state.rooms.kitchen.instances.filter((i) => i.in === 'starter-fridge')).toHaveLength(8);

    // 3. Dropping a 9th item onto the full (8/8) fridge refuses cleanly with storage-capacity
    const fullScene = buildScene(state);
    const refused = resolve(
      { ...fullScene.rooms.kitchen, entities: fullScene.entities },
      fullScene.entities['kitchen/item/extra-9'],
      upperFridgeAim,
      { scale: 0.5, aim: upperFridgeAim, release: true }
    );
    expect(refused.refusal).toBe('storage-capacity');
    expect(apply(state, refused)).toEqual({ stale: true });
    expect(state.rooms.kitchen.instances.filter((i) => i.in === 'starter-fridge')).toHaveLength(8);
  });

  it('shows Put in Fridge cue when hovering space and Fridge full when full', async () => {
    const s = starterHome();
    const scene = buildScene(s);
    const target = scene.rooms.kitchen.targets.find((t) => t.id === 'kitchen/item/starter-fridge/container')!;
    const interaction = { restingFlags: { value: { dragTargets: [target.id] } } } as unknown as Interaction;

    await act(async () => {
      root = create(<TargetCue target={target} interaction={interaction} ownerName="Fridge" />);
    });
    expect(root!.root.findAllByType('Text' as any).some((t) => t.props.children === 'Put in Fridge')).toBe(true);

    await act(async () => {
      root!.update(<TargetCue target={{ ...target, closed: true }} interaction={interaction} ownerName="Fridge" />);
    });
    expect(root!.root.findAllByType('Text' as any).some((t) => t.props.children === 'Fridge full')).toBe(true);
  });

  it('Restock button refills missing staples cleanly without duplicating items already inside or exceeding 8, with Undo support', async () => {
    // Empty legacy fridge opens StorageTray with Restock fridge button (>=44pt)
    const emptyFridgeState = starterHome();
    emptyFridgeState.rooms.kitchen.instances = emptyFridgeState.rooms.kitchen.instances
      .filter((i) => i.in !== 'starter-fridge')
      .map((i) => (i.id === 'starter-fridge' ? { ...i, storage: { version: 1 as const, open: true }, powered: true } : i));
    const emptyScene = buildScene(emptyFridgeState);
    const onRestock = vi.fn();
    await act(async () => {
      root = create(
        <StorageTray
          entity={emptyScene.entities['kitchen/item/starter-fridge']}
          scene={emptyScene}
          bottom={80}
          onTake={() => {}}
          onClose={() => {}}
          onRestock={onRestock}
        />
      );
    });
    const restockBtn = root!.root.findByProps({ testID: 'fridge-restock-button' });
    expect(restockBtn.props.accessibilityLabel).toBe('Restock fridge');
    expect(restockBtn.props.style.minWidth).toBeGreaterThanOrEqual(44);
    expect(restockBtn.props.style.minHeight).toBeGreaterThanOrEqual(44);
    await act(async () => restockBtn.props.onPress());
    expect(onRestock).toHaveBeenCalledWith('starter-fridge');

    // Reducer restock fills empty fridge to 6/8 with all 6 staples
    let history: History = { present: emptyFridgeState, past: [], future: [] };
    history = editHistory(history, { type: 'restock-fridge', id: 'starter-fridge', roomId: 'kitchen' });
    expect(validHome(history.present)).toBe(true);
    const restocked = history.present.rooms.kitchen.instances.filter((i) => i.in === 'starter-fridge');
    expect(restocked).toHaveLength(6);
    expect(restocked.map((i) => i.item)).toEqual([...FRIDGE_STAPLES]);

    // Undo cleanly reverses restock
    const undone = editHistory(history, { type: 'undo' });
    expect(undone.present.rooms.kitchen.instances.filter((i) => i.in === 'starter-fridge')).toHaveLength(0);

    // Partial fridge with 2 mangos + 1 teddy (3/8): Restock adds only 3 non-duplicate staples (no extra mango!) to reach 6/8
    const partial = starterHome();
    partial.rooms.kitchen.instances = [
      ...partial.rooms.kitchen.instances.filter((i) => i.in !== 'starter-fridge'),
      { ...instance('m1', 'mango', 14, 0), in: 'starter-fridge' },
      { ...instance('m2', 'mango', 14, 0), in: 'starter-fridge' },
      { ...instance('t1', 'teddy', 14, 0), in: 'starter-fridge' },
    ];
    const partialRestocked = homeReducer(partial, {
      type: 'restock-fridge',
      id: 'starter-fridge',
      roomId: 'kitchen',
    }).state;
    const afterPartial = partialRestocked.rooms.kitchen.instances.filter((i) => i.in === 'starter-fridge');
    expect(afterPartial).toHaveLength(6);
    expect(afterPartial.filter((i) => i.item === 'mango')).toHaveLength(2);
    expect(afterPartial.filter((i) => i.item === 'teddy')).toHaveLength(1);
    expect(afterPartial.map((i) => i.item)).toEqual(['mango', 'mango', 'teddy', 'banana', 'rice-ball', 'cupcake']);

    // Already at 6/8 -> no-op and Restock button is hidden
    const noop = homeReducer(partialRestocked, {
      type: 'restock-fridge',
      id: 'starter-fridge',
      roomId: 'kitchen',
    }).state;
    expect(noop).toBe(partialRestocked);
    const fullEnoughScene = buildScene(partialRestocked);
    await act(async () => {
      root!.update(
        <StorageTray
          entity={fullEnoughScene.entities['kitchen/item/starter-fridge']}
          scene={fullEnoughScene}
          bottom={80}
          onTake={() => {}}
          onClose={() => {}}
          onRestock={onRestock}
        />
      );
    });
    expect(root!.root.findAllByProps({ testID: 'fridge-restock-button' })).toHaveLength(0);
  });
});

describe('Smoother eating, drinking, tap-to-eat, and empty drink refills', () => {
  it('feeds reliably near face and upper torso at default and zoomed-in scale, while keeping hand drops for toys and deliberate hand aims', () => {
    const s = kitchenWithFriend();
    s.rooms.kitchen.instances.push(
      instance('snack', 'cupcake', 2, 8),
      instance('toy', 'teddy', 8, 6)
    );
    const scene = buildScene(s);
    const index = { ...scene.rooms.kitchen, entities: scene.entities };
    const mouth = index.targets.find((t) => t.id === 'character/0/mouth')!;
    const hand = index.targets.find((t) => t.id === 'character/0/hand')!;
    const snack = scene.entities['kitchen/item/snack'];
    const toy = scene.entities['kitchen/item/toy'];

    // Upper torso (below chin/mouth, center of chest) at both 0.5 and 1.0 zoom resolves to mouth
    for (const scale of [0.5, 1.0]) {
      const upperChest = roomPoint(mouth.face!.x, mouth.face!.y + mouth.face!.headRadius * 1.6);
      const drop = resolve(index, snack, upperChest, { scale, aim: upperChest, release: true });
      expect(drop.kind, `upper chest at scale ${scale}`).toBe('mouth');
      expect(drop.consume).toBe('food');
    }

    // Deliberately aiming right on the hand still gives the snack to the hand
    const toHand = resolve(index, snack, hand.contact, { scale: 0.5, aim: hand.contact, release: true });
    expect(toHand.kind).toBe('hand');

    // Non-food toy goes to hand, never mouth
    const toyToHand = resolve(index, toy, hand.contact, { scale: 0.5, aim: hand.contact, release: true });
    expect(toyToHand.kind).toBe('hand');

    // Dropping food removes it cleanly without clutter
    const chest = roomPoint(mouth.face!.x, mouth.face!.y + mouth.face!.headRadius * 1.4);
    const eatProposal = resolve(index, snack, chest, { scale: 0.5, aim: chest, release: true });
    const eaten = apply(s, eatProposal);
    expect('state' in eaten).toBe(true);
    if (!('state' in eaten)) return;
    expect(eaten.state.rooms.kitchen.instances.some((i) => i.id === 'snack')).toBe(false);
    expect(eaten.state.rooms.kitchen.characters.find((c) => c.slot === 0)?.action).toBe('eat');
  });

  it('tapping a held edible food or non-empty drink triggers tap-to-eat/drink; tapping a held toy or empty drink does not', async () => {
    const s = kitchenWithFriend();
    s.rooms.kitchen.instances.push(instance('held-food', 'mango', 4, 10));
    s.rooms.kitchen.characters[0].holding = 'held-food';

    await act(async () => {
      root = create(<HomeScreen initialState={s} persist={() => true} />);
    });

    await act(async () => {
      harness.options.onTap('kitchen/item/held-food', { x: 200, y: 300 }, Date.now());
    });
    expect(harness.proposals).toHaveLength(1);
    expect(harness.proposals[0].kind).toBe('mouth');
    expect(harness.proposals[0].consume).toBe('food');
    expect(harness.proposals[0].id).toBe('kitchen/item/held-food');

    // Unmount and verify an empty held drink does NOT trigger mouth consumption on tap
    await act(async () => root!.unmount());
    harness.proposals = [];

    const emptyDrinkState = kitchenWithFriend();
    emptyDrinkState.rooms.kitchen.instances.push({ ...instance('held-juice', 'juice', 4, 10), empty: true });
    emptyDrinkState.rooms.kitchen.characters[0].holding = 'held-juice';

    await act(async () => {
      root = create(<HomeScreen initialState={emptyDrinkState} persist={() => true} />);
    });
    await act(async () => {
      harness.options.onTap('kitchen/item/held-juice', { x: 200, y: 300 }, Date.now());
    });
    expect(harness.proposals).toHaveLength(0);
  });

  it('refills an empty drink when dropped on the sink counter or fridge, or tapped on the sink counter', async () => {
    const s = kitchenWithFriend();
    s.rooms.kitchen.instances.push({ ...instance('cup', 'juice', 5, 10), empty: true });

    // 1. Drop empty drink onto sink-counter surface -> refills cleanly
    const scene = buildScene(s);
    const sinkSurface = scene.rooms.kitchen.targets.find(
      (t) => t.owner === 'kitchen/item/starter-sink-counter' && t.kind === 'surface'
    )!;
    const toSink = resolve(
      { ...scene.rooms.kitchen, entities: scene.entities },
      scene.entities['kitchen/item/cup'],
      sinkSurface.contact,
      { scale: 1, target: sinkSurface.id, release: true }
    );
    const onSink = apply(s, toSink);
    expect('state' in onSink).toBe(true);
    if (!('state' in onSink)) return;
    expect(onSink.state.rooms.kitchen.instances.find((i) => i.id === 'cup')?.empty).toBeUndefined();
    expect(onSink.state.rooms.kitchen.instances.find((i) => i.id === 'cup')?.on).toBe('starter-sink-counter');

    // 2. Drop empty drink into fridge -> refills cleanly AND stores in fridge
    const fridgeTarget = scene.rooms.kitchen.targets.find(
      (t) => t.id === 'kitchen/item/starter-fridge/container'
    )!;
    const toFridge = resolve(
      { ...scene.rooms.kitchen, entities: scene.entities },
      scene.entities['kitchen/item/cup'],
      fridgeTarget.contact,
      { scale: 1, target: fridgeTarget.id, release: true }
    );
    const inFridge = apply(s, toFridge);
    expect('state' in inFridge).toBe(true);
    if (!('state' in inFridge)) return;
    const refilledInFridge = inFridge.state.rooms.kitchen.instances.find((i) => i.id === 'cup')!;
    expect(refilledInFridge.empty).toBeUndefined();
    expect(refilledInFridge.in).toBe('starter-fridge');

    // 3. Tapping an empty drink sitting on the sink counter refills it cleanly with splash sound
    const onSinkEmpty = kitchenWithFriend();
    onSinkEmpty.rooms.kitchen.instances.push({
      ...instance('cup', 'coconut-drink', 8, 0),
      on: 'starter-sink-counter',
      empty: true,
    });
    const saves: HomeStateV2[] = [];
    await act(async () => {
      root = create(
        <HomeScreen
          initialState={onSinkEmpty}
          persist={(next) => {
            saves.push(JSON.parse(JSON.stringify(next)));
            return true;
          }}
        />
      );
    });
    await act(async () => {
      harness.options.onTap('kitchen/item/cup', { x: 200, y: 200 }, Date.now());
    });
    expect(saves.at(-1)?.rooms.kitchen.instances.find((i) => i.id === 'cup')?.empty).toBeUndefined();
    expect(harness.played).toContain('splash');
  });

  it('tapping a food item directly on the open fridge shelves takes that exact real entity out (zero clones)', async () => {
    const s = homeReducer(kitchenWithFriend(), {
      type: 'toggle',
      id: 'starter-fridge',
      roomId: 'kitchen',
    }).state;
    await act(async () => {
      root = create(<HomeScreen initialState={s} persist={() => true} />);
    });
    await act(async () => {
      harness.options.onTap('kitchen/item/starter-fridge-cupcake', { x: 300, y: 200 }, Date.now());
    });
    expect(harness.proposals).toHaveLength(1);
    expect(harness.proposals[0].id).toBe('kitchen/item/starter-fridge-cupcake');
    expect(harness.proposals[0].attachment.kind).toBe('floor');
  });
});
