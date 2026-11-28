import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeScreen } from '../src/home/HomeScreen';
import { starterHome, validHome, type HomeStateV2 } from '../src/home/model';
import { cozyRoomScale } from '../src/home/runtime/CameraController';

const harness = vi.hoisted(() => ({
  viewport: { width: 390, height: 844 },
  options: {} as any,
  chrome: {} as any,
  scene: {} as any,
  played: [] as string[],
}));

if (typeof globalThis.requestAnimationFrame !== 'function') {
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0)) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => clearTimeout(id)) as typeof cancelAnimationFrame;
}

vi.mock('../src/home/AtmospherePicker', () => ({ AtmospherePicker: () => null }));
vi.mock('react-native-svg', () =>
  Object.fromEntries(
    ['Image', 'G', 'Circle', 'Ellipse', 'Rect', 'Path', 'Defs', 'ClipPath', 'Pattern', 'LinearGradient', 'Stop']
      .map((k) => [k, k])
      .concat([['default', 'Svg']])
  )
);
vi.mock('../src/home/art/CrabFriend', () => ({ CrabFriend: 'CrabFriend' }));
vi.mock('../src/badges/BadgeArt', () => ({ BadgeGlyph: () => null }));
vi.mock('../src/home/runtime/homeSound', () => ({
  useHomeFeedback: (live: boolean) => ({
    play: (s: string) => {
      if (live) harness.played.push(s);
      return live;
    },
    haptic: () => live,
    stop: () => {},
    setLive: () => {},
    silence: () => {},
    dispose: () => {},
  }),
}));
vi.mock('expo-router', () => ({ router: { push: vi.fn(), replace: vi.fn() }, useFocusEffect: () => {} }));
vi.mock('react-native', () => ({
  View: 'View',
  ScrollView: 'ScrollView',
  Text: 'Text',
  Pressable: 'Pressable',
  Platform: { OS: 'web' },
  AppState: { addEventListener: () => ({ remove() {} }) },
  useWindowDimensions: () => harness.viewport,
  AccessibilityInfo: { sendAccessibilityEvent: () => {} },
}));
vi.mock('react-native-safe-area-context', () => {
  const insets = { top: 0, bottom: 0 };
  return { useSafeAreaInsets: () => insets };
});
vi.mock('react-native-reanimated', () => ({
  default: { View: 'AnimatedView', createAnimatedComponent: (c: unknown) => c },
  useSharedValue: (v: any) => {
    const ref = React.useRef<{ get: () => any; set: (n: any) => void } | null>(null);
    if (!ref.current) {
      let current = v;
      ref.current = { get: () => current, set: (n: any) => { current = n; } };
    }
    return ref.current;
  },
  useAnimatedStyle: () => ({}),
  useAnimatedProps: () => ({}),
  cancelAnimation: () => {},
  withRepeat: (v: any) => v,
  withSequence: (...v: any[]) => v.at(-1),
  withTiming: (v: any) => v,
  Easing: { inOut: () => null, sin: null },
}));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => false }));
vi.mock('../src/state/Store', () => ({ useStore: () => ({ save: { settings: { sound: true, effects: true } } }) }));
vi.mock('../src/home/runtime/useIdleCharacters', () => ({ useIdleCharacters: () => ({ sleeping: {}, wake: () => {} }) }));
vi.mock('../src/home/runtime/useInteraction', () => ({
  useInteraction: (options: any) => {
    harness.options = options;
    return {
      animateProposal: () => true,
      isCurrent: () => true,
      finish: () => {},
      completeMealHandoff: () => {},
      camera: {
        get: () => ({ a: cozyRoomScale(harness.options.viewport), b: 0, c: 0, d: cozyRoomScale(harness.options.viewport), tx: 0, ty: 0 }),
        set: () => {},
      },
      slots: { get: () => [{}, {}] },
      cancelAll: () => {},
      animateCamera: () => {},
      showHint: () => {},
      showCue: () => {},
      clearCue: () => {},
      dropZones: { set: () => {} },
      veil: { value: 0 },
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
  HomeChrome: (props: any) => {
    harness.chrome = props;
    return null;
  },
  Tool: () => null,
  navigationHeight: 60,
  navigationHeightFor: () => 60,
}));
vi.mock('../src/home/runtime/HomePanels', () => ({ HomePanels: () => null }));
vi.mock('../src/home/runtime/FriendDrawer', () => ({ FriendDrawer: () => null }));
vi.mock('../src/home/runtime/DesignTools', () => ({ DesignTools: () => null, portraitDrawerHeightFor: () => 180 }));
vi.mock('../src/home/runtime/StagingTray', () => ({ StagingTray: () => null }));
vi.mock('../src/home/runtime/StorageTray', () => ({ StorageTray: () => null, StorageFullNote: () => null }));
vi.mock('../src/home/runtime/Destinations', () => ({ Destinations: () => null }));
vi.mock('../src/home/runtime/DebugOverlay', () => ({ DebugOverlay: () => null }));
vi.mock('../src/home/runtime/CapacityCue', () => ({ CapacityCue: () => null, CAPACITY_CUE_MS: 2000, CAPACITY_MESSAGE: 'Full' }));
vi.mock('../src/home/runtime/UndoNote', () => ({ UndoNote: () => null }));
vi.mock('../src/home/HomeClosetSheet', () => ({ HomeClosetSheet: () => null, closetSheetHeightRatio: () => 0.45 }));
vi.mock('../src/home/HomeBadgesSheet', () => ({ HomeBadgesSheet: () => null }));
vi.mock('../src/home/runtime/visibility', () => ({ useHomeVisible: () => true }));

vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

let tree: ReactTestRenderer | undefined;
beforeEach(() => {
  harness.played = [];
  harness.chrome = {};
  harness.scene = {};
});
afterEach(async () => {
  if (tree) await act(async () => tree!.unmount());
  tree = undefined;
});

describe('Deep-linking /island-home?room=tumon-beach & cocos-island', () => {
  it('lands directly in Tumon Beach & Ocean and auto-brings the Islander when empty', async () => {
    const persisted: HomeStateV2[] = [];
    const persist = vi.fn((next: HomeStateV2) => {
      persisted.push(next);
      return true;
    });
    const onConsumeIntent = vi.fn();

    await act(async () => {
      tree = create(
        <HomeScreen
          initialState={starterHome()}
          initialRoom="tumon-beach"
          onConsumeIntent={onConsumeIntent}
          persist={persist}
        />
      );
    });

    expect(harness.chrome.room).toBe('tumon-beach');
    expect(typeof harness.chrome.onBack).toBe('function');
    expect(typeof harness.chrome.onPlaces).toBe('function');
    expect(onConsumeIntent).toHaveBeenCalledOnce();
    const latest = persisted.at(-1)!;
    expect(validHome(latest)).toBe(true);
    expect(latest.current).toBe('tumon-beach');
    expect(latest.rooms['tumon-beach'].characters.some((c) => c.slot === 0)).toBe(true);
    expect(latest.discoveredPlaces).toContain('tumon-beach');
  });

  it('lands in Secret Cocos Island, auto-brings the Islander, celebrates discovery once, and shakes bounded palm coconuts', async () => {
    const persisted: HomeStateV2[] = [];
    const persist = vi.fn((next: HomeStateV2) => {
      persisted.push(next);
      return true;
    });

    await act(async () => {
      tree = create(
        <HomeScreen
          initialState={starterHome()}
          initialRoom="cocos-island"
          persist={persist}
        />
      );
    });

    expect(harness.chrome.room).toBe('cocos-island');
    expect(tree!.root.findAllByProps({ testID: 'cocos-discovery-toast' })).toHaveLength(1);
    const latest = persisted.at(-1)!;
    expect(validHome(latest)).toBe(true);
    expect(latest.rooms['cocos-island'].characters.some((c) => c.slot === 0)).toBe(true);
    expect(latest.discoveredPlaces).toContain('cocos-island');

    // Shake coconut palm 3 times -> bounded to 2 coconuts, plays rustle + plop
    await act(async () => {
      harness.scene.onShakePalm();
      harness.scene.onShakePalm();
      harness.scene.onShakePalm();
    });
    const afterPalm = persisted.at(-1)!;
    expect(afterPalm.rooms['cocos-island'].instances.filter((i) => i.id.startsWith('palm-coconut-'))).toHaveLength(2);
    expect(harness.played).toContain('rustle');
    expect(harness.played).toContain('plop');

    // Revisiting Cocos Island with already-discovered state does NOT re-show the discovery toast
    await act(async () => tree!.unmount());
    tree = undefined;
    await act(async () => {
      tree = create(
        <HomeScreen
          initialState={afterPalm}
          initialRoom="cocos-island"
          persist={persist}
        />
      );
    });
    expect(tree!.root.findAllByProps({ testID: 'cocos-discovery-toast' })).toHaveLength(0);
  });

  it('retains Cocos Island discovery after leaving to My Room and tapping Undo/Redo in HomeScreen (R1-01)', async () => {
    const persisted: HomeStateV2[] = [];
    const persist = vi.fn((next: HomeStateV2) => {
      persisted.push(next);
      return true;
    });

    await act(async () => {
      tree = create(
        <HomeScreen
          initialState={starterHome()}
          initialRoom="cocos-island"
          persist={persist}
        />
      );
    });
    expect(persisted.at(-1)?.discoveredPlaces).toContain('cocos-island');

    // Switch back to My Room, then Undo the arrival transfer -> discoveredPlaces MUST keep 'cocos-island'!
    await act(async () => harness.chrome.onRoom('home'));
    expect(harness.chrome.room).toBe('home');
    await act(async () => harness.chrome.onUndo());
    const afterUndo = persisted.at(-1)!;
    expect(validHome(afterUndo)).toBe(true);
    expect(afterUndo.current).toBe('home');
    expect(afterUndo.discoveredPlaces).toEqual(['cocos-island']);

    await act(async () => harness.chrome.onRedo());
    const afterRedo = persisted.at(-1)!;
    expect(validHome(afterRedo)).toBe(true);
    expect(afterRedo.discoveredPlaces).toEqual(['cocos-island']);
  });
});
