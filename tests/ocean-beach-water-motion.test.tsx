import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { starterHome } from '../src/home/model';
import { editHistory, type History } from '../src/home/useHomeStore';
import { buildScene } from '../src/home/scene/graph';
import { resolve } from '../src/home/scene/proposal';
import { locationBuilding } from '../src/home/camera';
import { locationIds } from '../src/home/catalogMore';
import { SceneView } from '../src/home/runtime/SceneView';

const motion = vi.hoisted(() => ({
  shared: [] as { value: unknown; get: () => unknown; set: (v: unknown) => void }[],
  repeats: 0,
  cancels: 0,
}));

vi.mock('react-native-svg', () => ({ default: 'Svg', Path: 'Path' }));
vi.mock('react-native', () => ({
  View: 'View',
  Pressable: 'Pressable',
  Text: 'Text',
  Image: 'Image',
  Platform: { OS: 'ios' },
  StyleSheet: { absoluteFill: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 } },
}));
vi.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('react-native-reanimated', async () => {
  const { useRef } = await import('react');
  return {
    default: { View: 'AnimatedView' },
    Easing: { inOut: () => null, sin: null, linear: null },
    runOnJS: (fn: unknown) => fn,
    useAnimatedReaction: () => {},
    useAnimatedStyle: () => ({}),
    useDerivedValue: (fn: () => unknown) => {
      const ref = useRef<{ value: unknown; get: () => unknown } | null>(null);
      if (!ref.current) {
        const val = fn();
        ref.current = { value: val, get: () => val };
      }
      return ref.current;
    },
    withTiming: () => 'timing',
    withRepeat: () => {
      motion.repeats++;
      return 'repeat';
    },
    cancelAnimation: (sv?: { value: unknown }) => {
      motion.cancels++;
      if (sv) sv.value = 'cancelled';
    },
    useSharedValue: (initial: unknown) => {
      const ref = useRef<{ value: unknown; get: () => unknown; set: (v: unknown) => void } | null>(null);
      if (!ref.current) {
        const shared = {
          value: initial,
          get: () => shared.value,
          set: (v: unknown) => {
            shared.value = v;
          },
        };
        ref.current = shared;
        motion.shared.push(shared);
      }
      return ref.current;
    },
  };
});
vi.mock('../src/home/art/Room', () => ({ RoomArt: () => null, ShoreArt: () => null, SkyArt: () => null }));
vi.mock('../src/home/art/More', () => ({ RoomShellArt: () => null }));
vi.mock('../src/home/BuildingArt', () => ({ BuildingArt: () => null, BuildingTrim: () => null, TerraceArt: () => null }));
vi.mock('../src/home/runtime/WeatherOverlay', () => ({ WeatherOverlay: () => null }));
vi.mock('../src/home/runtime/Effects', () => ({ Effects: () => null }));
vi.mock('../src/home/runtime/SetPieces', () => ({ SetPieces: () => null }));
vi.mock('../src/home/runtime/TargetCue', () => ({ SeatRimCue: () => null, TargetCue: () => null }));
vi.mock('../src/home/runtime/EntityArt', () => ({
  EntityArt: () => null,
  artFrame: (entity: any) => ({ left: entity.bounds.left, top: entity.bounds.top, width: entity.bounds.width, height: entity.bounds.height }),
}));
vi.mock('../src/home/runtime/DragOverlay', () => ({ DragOverlay: () => null }));

vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

let tree: ReactTestRenderer | undefined;
afterEach(async () => {
  vi.useRealTimers();
  if (tree) await act(async () => tree!.unmount());
  tree = undefined;
  motion.shared = [];
  motion.repeats = 0;
  motion.cancels = 0;
});

function swimmingTumonState() {
  let h: History = { present: { ...starterHome(), current: 'tumon-beach' }, past: [], future: [] };
  h = editHistory(h, { type: 'transfer', slot: 0, roomId: 'home', room: 'tumon-beach', x: 6, y: 8 });
  const s = buildScene(h.present);
  const prop = resolve(
    { ...s.rooms['tumon-beach'], entities: s.entities },
    s.entities['character/0'],
    { x: 300, y: 315 } as any,
    { scale: 1, release: true, floorOnly: true }
  );
  h = editHistory(h, { type: 'apply-proposal', proposal: prop });
  return h.present;
}

describe('R1-05: WaterRipples & swimBob respect HomeMotionContext visibility and Reduce Motion', () => {
  it('cancels and resets both swimming loops on hide/overview/Reduce Motion and restarts cleanly on return', async () => {
    vi.useFakeTimers();
    const state = swimmingTumonState();
    const scene = buildScene(state);
    const building = locationBuilding(locationIds.indexOf('tumon-beach'), false);
    const dummyInteraction = {
      gesture: {},
      camera: { value: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 } },
      slots: { value: [], get: () => [] },
      restingFlags: { value: { hidden: [], pressed: null, targets: [], landing: [], notice: [] } },
      restingMotion: { value: {} },
      acknowledgeLayout: () => {},
      dropZones: { value: [] },
      veil: { value: 0 },
    } as any;

    const baseProps = {
      state,
      scene,
      building,
      viewport: { width: 390, height: 700 },
      interaction: dummyInteraction,
      designing: false,
      overview: false,
      pickups: [],
      pokes: {},
      reactions: {},
      meals: {},
      sleeping: {},
      moods: {},
      effects: [],
      badges: [],
      onSelect: () => {},
      onMove: () => {},
      onNode: () => {},
      onPoke: () => {},
      onBadgePress: () => {},
      onMealPresented: () => {},
      onMealFinished: () => {},
      onMeasure: () => {},
    };

    // Active visible Tumon Beach -> both WaterRipples and swimBob start repeating!
    await act(async () => {
      tree = create(<SceneView {...baseProps} reduced={false} liveRoom="tumon-beach" />);
    });
    expect(tree!.root.findAllByProps({ testID: 'water-ripples-0' })).toHaveLength(1);
    const initialRepeats = motion.repeats;
    expect(initialRepeats).toBeGreaterThanOrEqual(2);
    expect(motion.shared.filter((s) => s.value === 'repeat').length).toBeGreaterThanOrEqual(2);

    // Hide Home (route blur, app background, or overview -> liveRoom = undefined) -> cancels & resets BOTH to 0!
    const cancelsBeforeHide = motion.cancels;
    await act(async () => {
      tree!.update(<SceneView {...baseProps} reduced={false} liveRoom={undefined} />);
    });
    expect(motion.cancels).toBeGreaterThanOrEqual(cancelsBeforeHide + 2);
    expect(motion.shared.filter((s) => s.value === 'repeat')).toHaveLength(0);

    // Return to active visible Tumon Beach -> restarts BOTH loops cleanly!
    await act(async () => {
      tree!.update(<SceneView {...baseProps} reduced={false} liveRoom="tumon-beach" />);
    });
    expect(motion.repeats).toBeGreaterThanOrEqual(initialRepeats + 2);
    expect(motion.shared.filter((s) => s.value === 'repeat').length).toBeGreaterThanOrEqual(2);

    // Enable Reduce Motion while character is already swimming -> cancels & resets BOTH to 0!
    const cancelsBeforeReduce = motion.cancels;
    await act(async () => {
      tree!.update(<SceneView {...baseProps} reduced liveRoom="tumon-beach" />);
    });
    expect(motion.cancels).toBeGreaterThanOrEqual(cancelsBeforeReduce + 2);
    expect(motion.shared.filter((s) => s.value === 'repeat')).toHaveLength(0);
  });
});

it.each(['tumon-beach', 'cocos-island'] as const)('clips swimming bodies with foreground underwater silhouette and foam only in %s water', async room => {
  for (const [wet, floaty] of [[true, true], [true, false], [false, true]]) {
    const state = starterHome(); state.current = room;
    for (const r of Object.values(state.rooms)) r.characters = [];
    const ring = state.rooms[room].instances.find(i => i.item === 'swim-ring')!;
    state.rooms[room].characters = [{ slot: 0, anchor: 'floor', pose: 'stand', x: 7, y: 0,
      at: { x: room === 'tumon-beach' ? 345 : wet ? 650 : 300, y: wet ? room === 'tumon-beach' ? 300 : 375 : 450 } as any,
      ...(floaty ? { holding: ring.id } : {}) }];
    const scene = buildScene(state);
    const interaction = { gesture: {}, camera: { value: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 } }, slots: { value: [], get: () => [] }, restingFlags: { value: { hidden: [], pressed: null, targets: [], landing: [], notice: [] } }, restingMotion: { value: {} }, acknowledgeLayout() {}, dropZones: { value: [] }, veil: { value: 0 } } as any;
    await act(async () => { tree = create(<SceneView state={state} scene={scene} building={locationBuilding(locationIds.indexOf(room), false)} viewport={{ width: 375, height: 812 }} interaction={interaction} designing={false} pickups={[]} reactions={{}} meals={{}} sleeping={{}} moods={{}} effects={[]} badges={[]} onSelect={() => {}} onMove={() => {}} onNode={() => {}} onMealPresented={() => {}} onMealFinished={() => {}} reduced liveRoom={room}/>); });
    expect(tree!.root.findAllByProps({ testID: 'water-body-clip-0' })).toHaveLength(wet ? 1 : 0);
    expect(tree!.root.findAllByProps({ testID: 'water-submerged-0' })).toHaveLength(wet ? 1 : 0);
    expect(tree!.root.findAllByProps({ testID: 'water-ripples-0' })).toHaveLength(wet ? 1 : 0);
    if (wet) {
      const clip = tree!.root.findByProps({ testID: 'water-body-clip-0' });
      const foreground = clip.parent!.children.filter(c => typeof c !== 'string');
      expect(foreground.indexOf(clip)).toBeLessThan(foreground.length - 1);
    }
    await act(async () => tree!.unmount()); tree = undefined;
  }
});
