import React, { createContext } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { performance } from 'node:perf_hooks';
import { HomeRoute } from '../src/home/HomeRoute';
import { resolve } from '../src/home/scene/proposal';
import { roomPoint } from '../src/home/scene/types';
import { poseToken } from '../src/home/runtime/poseBank';
import { layoutToken } from '../src/home/runtime/layout';
import { labFixtures } from '../src/home/runtime/lab';
import { HomeScreen } from '../src/home/HomeScreen';
import { AtmospherePicker } from '../src/home/AtmospherePicker';
import { StoreProvider, useStore } from '../src/state/Store';
import { emptySave, parseSave } from '../src/state/validation';
import { encodeSave } from '../src/state/profiles';
import { initializePersonalization, personFor } from '../src/personalization/model';
import { editHistory, historyAdmits, savedHistory, type History } from '../src/home/useHomeStore';
import { starterHome, type HomeStateV2 } from '../src/home/model';
import { AtmosphereLighting } from '../src/home/art/AtmosphereLighting';
import { defaultAtmosphere, type Atmosphere } from '../src/home/atmosphere';
import { fitCamera, zoomCamera } from '../src/home/runtime/CameraController';

const h = vi.hoisted(() => ({
  raw: null as string | null, panels: {} as any, chrome: {} as any, inUI: false,
  defer: false, queue: [] as (() => void)[], uiCalls: 0, forbidReads: false,
  reads: 0, drawings: 0, entityDrawings: {} as Record<string, number>, timings: [] as number[], reduced: false, frames: new Set<any>(),
}));
vi.mock('../src/challenge/registry.generated', () => ({ challengeEntries: [] }));
vi.mock('../src/state/storage', () => ({ storage: {
  get: async () => h.raw, set: async (raw: string) => { h.raw = raw; },
  preserve: async () => {}, readDrafts: async () => [], discardSession: async () => {},
} }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}) }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
vi.mock('../src/components/Recovery', () => ({ Recovery: () => null }));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => h.reduced }));
vi.mock('expo-router', () => ({ router: { push: vi.fn() }, useFocusEffect: (fn: any) => React.useEffect(fn, [fn]) }));
vi.mock('react-native', () => ({
  View: 'View', Pressable: 'Pressable', Text: 'Text', TextInput: 'TextInput', Image: 'Image',
  Platform: { OS: 'ios' }, StyleSheet: { absoluteFill: {}, create: (s: any) => s },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
  AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
  AccessibilityInfo: { sendAccessibilityEvent() {} },
}));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
vi.mock('../src/ui/Text', () => ({ Text: 'Text' }));
vi.mock('../src/ui/Sheet', () => ({ Sheet: ({ children }: any) => children }));
vi.mock('react-native-svg', () => Object.fromEntries(['Image', 'G', 'Circle', 'Ellipse', 'Rect', 'Path', 'Defs', 'ClipPath', 'Pattern', 'LinearGradient', 'RadialGradient', 'Stop'].map(k => [k, k]).concat([['default', 'Svg']])));
vi.mock('react-native-gesture-handler', () => ({ GestureDetector: 'GestureDetector', Gesture: {
  Manual: () => { const builder: any = new Proxy({}, { get: () => () => builder }); return builder; },
} }));
vi.mock('react-native-reanimated', () => ({
  default: { View: 'AnimatedView', createAnimatedComponent: (v: any) => v },
  useSharedValue: (initial: any) => React.useMemo(() => {
    let value = initial;
    return { get value() { return value; }, set value(next) { value = next; },
      get() { if (h.forbidReads && !h.inUI) { h.reads++; throw new Error('blocking shared-value read on JS'); } return value; },
      set(next: any) { value = typeof next === 'function' ? next(value) : next; },
      modify(fn: any) { value = fn(value); },
    };
  // Shared values retain identity for the lifetime of the hook, as on native.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []),
  useAnimatedStyle: (fn: any) => ({ evaluate: fn }), useAnimatedProps: (fn: any) => ({ evaluate: fn }),
  useDerivedValue: (fn: any) => ({ get value() { return fn(); } }), useAnimatedReaction: () => {},
  withTiming: (v: any, options: any) => { h.timings.push(options?.duration); return v; }, withRepeat: (v: any) => v, cancelAnimation() {}, Easing: { linear: (n: number) => n },
  useFrameCallback: (fn: any) => {
    const latest = React.useRef(fn); latest.current = fn;
    const frame = React.useMemo(() => ({ active: true, setActive(v: boolean) { this.active = v; }, tick: () => latest.current({ timeSincePreviousFrame: 16.67 }) }), []);
    React.useEffect(() => { h.frames.add(frame); return () => { h.frames.delete(frame); }; }, [frame]);
    return frame;
  },
  runOnUI: (fn: any) => (...args: any[]) => {
    h.uiCalls++;
    const run = () => { h.inUI = true; try { return fn(...args); } finally { h.inUI = false; } };
    if (h.defer) h.queue.push(run); else return run();
  },
  runOnJS: (fn: any) => fn,
}));
vi.mock('../src/home/runtime/EntityArt', () => ({
  EntityArt: (props: any) => { h.drawings++; h.entityDrawings[props.entity.id] = (h.entityDrawings[props.entity.id] ?? 0) + 1; return React.createElement('drawing', { id: props.entity.id }); },
  artFrame: (entity: any) => entity.bounds,
}));
vi.mock('../src/home/runtime/DragOverlay', () => ({ DragOverlay: () => null }));
vi.mock('../src/home/runtime/TargetCue', () => ({ TargetCue: () => null, SeatRimCue: () => null }));
vi.mock('../src/home/runtime/homeSound', () => ({ useHomeFeedback: () => ({ play() {}, haptic() {}, setLive() {}, silence() {}, dispose() {} }) }));
vi.mock('../src/home/runtime/HomeChrome', () => ({ HomeChrome: (props: any) => { h.chrome = props; return null; }, navigationHeightFor: () => 60 }));
vi.mock('../src/home/runtime/HomePanels', () => ({ HomePanels: (props: any) => { h.panels = props; return null; } }));
vi.mock('../src/home/runtime/DesignTools', () => ({ DesignTools: () => null, portraitDrawerHeightFor: () => 200 }));
vi.mock('../src/home/runtime/Destinations', () => ({ Destinations: () => null }));
vi.mock('../src/home/runtime/StagingTray', () => ({ StagingTray: () => null }));
vi.mock('../src/home/runtime/FriendDrawer', () => ({ FriendDrawer: () => null }));
vi.mock('../src/home/runtime/DebugOverlay', () => ({ DebugOverlay: () => null }));
vi.mock('../src/home/runtime/StorageTray', () => ({ StorageTray: () => null }));
vi.mock('../src/home/runtime/UndoNote', () => ({ UndoNote: () => null, UndoGonePicture: () => null }));
vi.mock('../src/home/HomeClosetSheet', () => ({ HomeClosetSheet: () => null, closetSheetHeightRatio: () => .5 }));
vi.mock('../src/home/HomeBadgesSheet', () => ({ HomeBadgesSheet: () => null, validBadgeId: () => false }));

let tree: ReactTestRenderer | undefined;
let store: ReturnType<typeof useStore>;
function Probe() { const current = useStore(); React.useLayoutEffect(() => { store = current; }); return null; }
async function mount() {
  await act(async () => { tree = create(<StoreProvider><Probe/><HomeRoute/></StoreProvider>); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
}
const screen = () => tree!.root.findByType(HomeScreen);
const scene = () => tree!.root.findByProps({ testID: 'room-door-veil' }).parent!.findAll(n => typeof n.type === 'function' && n.type.name === 'SceneView')[0];
const flushUI = () => { while (h.queue.length) h.queue.shift()!(); };
beforeEach(() => {
  h.raw = encodeSave(initializePersonalization(emptySave()));
  h.drawings = 0; h.entityDrawings = {}; h.timings = []; h.reads = 0; h.forbidReads = false; h.defer = false; h.queue = []; h.uiCalls = 0; h.reduced = false;
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; vi.unstubAllGlobals(); });

it('real Store → HomeRoute → HomeScreen atmosphere saves redraw zero resting entities or rigs, and keep route props stable', async () => {
  await mount();
  const original = screen().props, before = h.drawings;
  expect(before).toBeGreaterThan(40);
  const measured: number[] = [];
  await act(async () => h.chrome.onAtmosphere());
  for (const atmosphere of [
    { timeOfDay: 'sunset', weather: 'leaves' }, { timeOfDay: 'night', weather: 'snow' },
    { timeOfDay: 'night', weather: 'rain' }, defaultAtmosphere,
  ] as Atmosphere[]) {
    const home = personFor(store.save).home;
    await act(async () => {
      const start = performance.now();
      expect(screen().props.persist({ ...home, atmosphere })).toBe(true);
      measured.push(performance.now() - start);
    });
    // Also dispatch through the actual Home screen so its internal state changes.
    await act(async () => tree!.root.findByType(AtmospherePicker).props.onChange(atmosphere));
    expect(h.drawings).toBe(before);
    for (const key of ['closet', 'badges', 'ownedWallpapers', 'ownedFloors', 'ownedItems', 'persist']) {
      expect(screen().props[key], key).toBe(original[key]);
    }
  }
  console.info('Home synchronous Store admission ms:', measured.map(n => n.toFixed(2)).join(', '));
  expect(parseSave(h.raw!)).toEqual(store.save);
});

it('picker selects at touch-down before persistence and cancels without changing saved atmosphere', async () => {
  await mount(); await act(async () => h.chrome.onAtmosphere());
  const button = () => tree!.root.findAllByProps({ accessibilityLabel: 'Night' }).find(n => String(n.type) === 'Pressable');
  const raw = h.raw;
  await act(async () => button()!.props.onPressIn());
  expect(button()!.props.accessibilityState.selected).toBe(true); expect(h.raw).toBe(raw);
  await act(async () => button()!.props.onPressOut());
  expect(button()!.props.accessibilityState.selected).toBe(false); expect(h.raw).toBe(raw);
  await act(async () => { button()!.props.onPressIn(); });
  await act(async () => { button()!.props.onPressOut(); button()!.props.onPress(); });
  expect((personFor(parseSave(h.raw!)).home as HomeStateV2).atmosphere?.timeOfDay).toBe('night');
});

it('rapid +/- taps use one UI worklet each, no JS reads/renders, and compose from the pending target', async () => {
  await mount();
  const { interaction, viewport, building } = scene().props;
  const camera = interaction.camera, initial = camera.value;
  const expected = [1.3, 1.3, 1 / 1.3].reduce((c, ratio) => zoomCamera(c, ratio, viewport.width / 2, viewport.height / 2, viewport, building), initial);
  const before = h.drawings, callbacks = h.panels;
  h.defer = true; h.uiCalls = 0; h.forbidReads = true;
  await act(async () => { callbacks.onZoom(1.3); callbacks.onZoom(1.3); callbacks.onZoom(1 / 1.3); });
  expect(h.uiCalls).toBe(3); expect(h.queue).toHaveLength(3); expect(h.reads).toBe(0);
  expect(h.panels).toBe(callbacks); expect(h.drawings).toBe(before);
  flushUI(); h.forbidReads = false; h.defer = false;
  // The camera tween is visible to the first frame, even if JS never renders again.
  const now = vi.spyOn(Date, 'now'); now.mockReturnValue(Date.now() + 1000);
  for (const frame of h.frames) frame.tick(); now.mockRestore();
  expect(camera.value.a).toBeCloseTo(expected.a);
});

it.each([false, true])('Whole house queues atomic camera motion before overview chrome (Reduce Motion %s)', async reduced => {
  h.reduced = reduced; await mount();
  const { interaction, viewport, building } = scene().props;
  const beforeSave = h.raw;
  const furnitureBefore = Object.fromEntries(Object.entries(h.entityDrawings).filter(([id]) => !id.startsWith('character/')));
  h.defer = true; h.uiCalls = 0; h.forbidReads = true;
  await act(async () => h.panels.onOverview());
  expect(h.uiCalls).toBeGreaterThanOrEqual(1); expect(h.reads).toBe(0); expect(h.panels.overview).toBe(true);
  flushUI(); h.defer = false; h.forbidReads = false;
  const now = vi.spyOn(Date, 'now'); now.mockReturnValue(Date.now() + 1000);
  for (const frame of h.frames) frame.tick(); now.mockRestore();
  expect(interaction.camera.value.a).toBeCloseTo(fitCamera(viewport, building).a);
  expect(Object.fromEntries(Object.entries(h.entityDrawings).filter(([id]) => !id.startsWith('character/')))).toEqual(furnitureBefore);
  expect(h.raw).toBe(beforeSave); // camera/navigation never writes Undo or changes Guam places
});

it('measures 60-step history admission and whole-envelope validation without bypassing checks', () => {
  let history: History = { present: starterHome(), past: [], future: [] };
  for (let i = 0; i < 60; i++) history = editHistory(history, { type: 'atmosphere', atmosphere: { timeOfDay: i % 2 ? 'night' : 'sunset', weather: i % 2 ? 'snow' : 'leaves' } });
  const admission: number[] = [], envelope: number[] = [];
  for (let i = 0; i < 10; i++) {
    let start = performance.now(); expect(historyAdmits(history)).toBe(true); const home = savedHistory(history); admission.push(performance.now() - start);
    const save = initializePersonalization(emptySave()); save.personalization!.people.family.home = home;
    start = performance.now(); expect((parseSave(encodeSave(save)).personalization!.people.family.home as HomeStateV2).atmosphere).toEqual(home.atmosphere); envelope.push(performance.now() - start);
  }
  console.info('60-step Home history admission/save ms:', admission.map(n => n.toFixed(2)).join(', '));
  console.info('60-step encode + parseSave ms:', envelope.map(n => n.toFixed(2)).join(', '));
});


it.each([false, true])('native lighting crossfades opacity, keeps its window art mounted and has no room SVG wash (Reduce Motion %s)', async reduced => {
  await act(async () => { tree = create(<AtmosphereLighting room="home" atmosphere={defaultAtmosphere} reduced={reduced} active={false}/>); });
  const skies = tree!.root.findAllByType('Svg' as any);
  expect(skies).toHaveLength(4); // two authored panes × two prewarmed skies
  expect(tree!.root.findAllByType('RadialGradient' as any)).toHaveLength(0);
  expect(skies.every(sky => sky.props.viewBox !== '0 0 800 560')).toBe(true);
  h.timings = [];
  await act(async () => tree!.update(<AtmosphereLighting room="home" atmosphere={{ timeOfDay: 'night', weather: 'snow' }} reduced={reduced} active={false}/>));
  expect(tree!.root.findAllByType('Svg' as any).slice(0, 4)).toEqual(skies);
  expect(h.timings).toEqual([reduced ? 0 : 160]);
});


it('bed → floor commit skips untouched drawings and an acknowledged handoff permits immediate re-grab', async () => {
  h.reduced = true;
  const save = initializePersonalization(emptySave());
  const home = labFixtures['silky-family']();
  // Keep observers far from the landing so this measures unchanged actors, not a greeting.
  home.rooms.kitchen.characters = [...home.rooms.kitchen.characters, ...home.rooms.home.characters.filter(c => [1,2,5].includes(c.slot))];
  home.rooms.home.characters = home.rooms.home.characters.filter(c => ![1,2,5].includes(c.slot));
  personFor(save).home = home;
  h.raw = encodeSave(save);
  await mount();
  const before = {...h.entityDrawings}, props = scene().props;
  const doll = props.scene.entities['character/0'];
  expect(doll.base).toBe('lie');
  const proposal = resolve({...props.scene.rooms.home,entities:props.scene.entities}, doll, roomPoint(460,515), {scale:.5,release:true});
  expect(proposal.kind).toBe('floor');
  await act(async () => expect(props.interaction.animateProposal(proposal)).toBe(true));
  const after = scene().props;
  expect(after.scene.entities[doll.id].base).toBe('stand');
  for (const [id, count] of Object.entries(before)) {
    if (id !== doll.id && id !== doll.parent) expect(h.entityDrawings[id], id).toBe(count);
  }
  // Native onLayout acknowledges the already committed placement. No arbitrary timeout.
  after.interaction.acknowledgeLayout(doll.id, layoutToken(after.scene.entities[doll.id]));
  after.interaction.acknowledgePose(doll.id, poseToken(after.scene.entities[doll.id].base, after.scene.entities[doll.id].facing, after.scene.entities[doll.id].action), 1);
  // Synthetic accessibility moves retain the three presented-tick opacity handoff.
  const active = after.interaction.slots.value[0];
  after.interaction.ready(0, doll.id, undefined, active.generation);
  await act(async () => { for(let tick=0;tick<3;tick++) for (const frame of h.frames) frame.tick(); });
  expect(scene().props.interaction.slots.value.every((s:any) => !s.id)).toBe(true);
  const again = scene().props;
  const next = resolve({...again.scene.rooms.home,entities:again.scene.entities}, again.scene.entities[doll.id], roomPoint(490,515), {scale:.5,release:true});
  await act(async () => expect(again.interaction.animateProposal(next)).toBe(true));
  expect((personFor(parseSave(h.raw!)).home as HomeStateV2).rooms.home.characters.find(c=>c.slot===0)?.pose).toBe('stand');
});

it('goRoom queues camera motion before Store admission, preserves untouched furniture, and saves Places selection', async () => {
  await mount();
  const props = screen().props, persist = props.persist;
  const instrumented = vi.fn((value:HomeStateV2)=>{
    // cancelAll and animateCamera must both be scheduled before synchronous persistence.
    expect(h.queue.length).toBeGreaterThanOrEqual(2);
    return persist(value);
  });
  await act(async()=>{ tree!.update(<StoreProvider><Probe/><HomeScreen {...props} persist={instrumented}/></StoreProvider>); });
  const furniture = () => Object.fromEntries(Object.entries(h.entityDrawings).filter(([id])=>!id.startsWith('character/')));
  const before = furniture();
  for (const room of ['kitchen','home','tumon-beach','chamorro-village','home'] as const) {
    h.defer = true; h.queue = [];
    await act(async()=>h.chrome.onRoom(room));
    expect(instrumented).toHaveBeenCalled();
    expect((personFor(parseSave(h.raw!)).home as HomeStateV2).current).toBe(room);
    flushUI(); h.defer = false;
    if (room === 'kitchen') expect(furniture()).toEqual(before);
  }
});


it('the real Home renderer forwards Crab sleeping, bathing, sitting and carry expressions to the expressive rig', async () => {
  await mount();
  const paint = scene().props.renderCharacter;
  for (const [base, face] of [['lie','sleepy'],['bathe','happy'],['sit','happy'],['carry','happy']]) {
    const element = paint({slot:2,familySlot:2,base,face,action:null,facing:'right',size:120,tilt:0,limbLag:0,reduced:true});
    expect(element.type.name).toBe('HomeCharacter');
    expect(element.props.input.face).toBe(face);
  }
});
