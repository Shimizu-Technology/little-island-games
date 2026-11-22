import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeScreen } from '../src/home/HomeScreen';
import { instance, type HomeStateV2 } from '../src/home/model';
import { buildScene } from '../src/home/scene/graph';
import { resolve } from '../src/home/scene/proposal';
import { labFixtures } from '../src/home/runtime/lab';
const harness = vi.hoisted(() => ({ options: {} as any, chrome: {} as any, scene: {} as any, cues: [] as any[], active: {} as Record<string, string>, played: [] as string[], haptics: [] as string[],
  handoffs: [] as any[], live: undefined as boolean | undefined, settings: { sound: true } as any, reduced: false, sleeping: {} as Record<string, boolean>, slots: [{}, {}] as any[] }));
vi.mock('react-native-svg', () => Object.fromEntries(['G', 'Circle', 'Ellipse', 'Rect', 'Path', 'Defs', 'Pattern', 'LinearGradient', 'Stop'].map((k) => [k, k]).concat([['default', 'Svg']])));
vi.mock('../src/badges/BadgeArt', () => ({ BadgeGlyph: () => null }));
vi.mock('../src/home/runtime/homeSound', () => ({
  useHomeFeedback: (live: boolean) => {
    harness.live = live;
    return { play: (s: string) => { if (live) harness.played.push(s); return live; }, haptic: (k: string) => { if (live) harness.haptics.push(k); return live; },
      stop: () => {}, setLive: () => {}, silence: () => {}, dispose: () => {} };
  },
}));
vi.mock('expo-router', () => ({ router: { push: vi.fn() }, useFocusEffect: () => {} }));
vi.mock('react-native', () => ({ View: 'View', ScrollView: 'ScrollView', Text: 'Text', Pressable: 'Pressable', Platform: { OS: 'web' }, AppState: { addEventListener: () => ({ remove() {} }) }, useWindowDimensions: () => ({ width: 390, height: 844 }), AccessibilityInfo: { sendAccessibilityEvent: () => {} } }));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
vi.mock('react-native-reanimated', () => ({ default: { View: 'AnimatedView' }, useSharedValue: (v: any) => { const ref = React.useRef(v); return { get: () => ref.current, set: (n: any) => { ref.current = n; } }; }, useAnimatedStyle: () => ({}) }));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => harness.reduced }));
vi.mock('../src/state/Store', () => ({ useStore: () => ({ save: { settings: harness.settings } }) }));
vi.mock('../src/home/runtime/useIdleCharacters', () => ({ useIdleCharacters: () => ({ sleeping: harness.sleeping, wake: () => {} }) }));
vi.mock('../src/home/runtime/useInteraction', () => ({ useInteraction: (options: any) => { harness.options = options; return { isCurrent: () => true, finish: () => {}, completeMealHandoff:(...args:any[])=>harness.handoffs.push(args),
  animateProposal:(p:any)=>{harness.handoffs.push(p);return true;}, camera: { get: () => ({ a: .5, b: 0, c: 0, d: .5, tx: 0, ty: 0 }), set: () => {} }, slots: { get: () => harness.slots }, cancelAll: () => {}, animateCamera: () => {},
  showHint: () => {}, showCue: (...args: any[]) => { harness.active[args[0]] = args[1]; return harness.cues.push(args); }, clearCue: (id: string) => { delete harness.active[id]; }, dropZones: { set: () => {} } }; } }));
vi.mock('../src/home/runtime/SceneView', () => ({ SceneView: (props: any) => { harness.scene = props; return null; } }));
vi.mock('../src/home/runtime/HomeChrome', () => ({ HomeChrome: (props: any) => { harness.chrome = props; return null; }, Tool: () => null, navigationHeight: 60, navigationHeightFor: () => 60 }));
vi.mock('../src/home/runtime/HomePanels', () => ({ HomePanels: () => null }));
vi.mock('../src/home/runtime/DesignTools', () => ({ DesignTools: () => null, portraitDrawerHeight: 200, portraitDrawerHeightFor: () => 200 }));
vi.mock('../src/home/runtime/StagingTray', () => ({ StagingTray: () => null }));
vi.mock('../src/home/runtime/Destinations', () => ({ Destinations: () => null }));
vi.mock('../src/home/runtime/DebugOverlay', () => ({ DebugOverlay: () => null }));
vi.mock('../src/home/runtime/FriendDrawer', () => ({ FriendDrawer: () => null }));
vi.mock('../src/home/runtime/CapacityCue', () => ({ CapacityCue: 'CapacityCue', CAPACITY_CUE_MS: 3200, CAPACITY_MESSAGE: 'Put something away to make room.' }));
vi.mock('../src/home/art/Items', () => ({ ItemArt: () => null }));
vi.mock('../src/home/art/More', () => ({ MoreItemArt: () => null }));
vi.mock('../src/home/runtime/UndoNote', () => ({ UndoNote: () => null, UndoGonePicture: () => null }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
vi.stubGlobal('requestAnimationFrame', () => 1);
vi.stubGlobal('cancelAnimationFrame', () => {});
let root: ReturnType<typeof create>;
beforeEach(() => { vi.useFakeTimers(); harness.reduced = false; harness.handoffs=[]; harness.slots = [{}, {}]; harness.cues = []; harness.active = {}; harness.played = []; harness.haptics = []; harness.settings = { sound: true }; harness.sleeping = {}; });
afterEach(async () => { if (root) await act(async () => root.unmount()); vi.useRealTimers(); });
async function open(state: HomeStateV2, persist: (state: HomeStateV2) => boolean = vi.fn((_s: HomeStateV2) => true)) {
  await act(async () => { root = create(<HomeScreen initialState={state} persist={persist} />); });
  return persist;
}
const tap = async (id: string | undefined, point = { x: 0, y: 0 }) => act(async () => harness.options.onTap(id, point, Date.now()));


describe('H5 storage on the live screen', () => {
  it('opens the anchored chest, offers real take-out actions, closes without losing contents', async () => {
    const s = labFixtures['rig-menu-0']();
    s.rooms.home.instances = [instance('box','toy-box',8,7), {...instance('toy','teddy',0,0),in:'box'}];
    s.rooms.home.characters = [];
    const saves: HomeStateV2[] = [];
    await open(s, next => { saves.push(JSON.parse(JSON.stringify(next))); return true; });
    await act(async()=>harness.scene.onSelect('home/item/box'));
    expect(root.root.findAllByProps({testID:'storage-tray'}).length).toBeGreaterThan(0);
    const take = root.root.findAll(n => n.props.accessibilityLabel==='Take out Teddy' && (n.type as unknown)==='Pressable')[0];
    await act(async()=>take.props.onPress());
    const p = harness.handoffs.at(-1);
    expect(p.id).toBe('home/item/toy'); expect(p.attachment.kind).toBe('floor');
    await tap('home/item/box');
    expect(root.root.findAllByProps({testID:'storage-tray'})).toHaveLength(0);
    expect(saves.at(-1)!.rooms.home.instances.find(i=>i.id==='toy')?.in).toBe('box');
  });
  it('a full refusal is visible and writes nothing', async()=>{
    const s = labFixtures['rig-menu-0']();
    s.rooms.home.instances=[instance('box','carry-basket',8,7),instance('loose','mango',3,10),...Array.from({length:4},(_,n)=>({...instance(`toy-${n}`,'shell',0,0),in:'box'}))];s.rooms.home.characters=[];
    const persist=await open(s), scene=buildScene(s), target=scene.rooms.home.targets.find(t=>t.kind==='container')!;
    const p=resolve(scene.rooms.home,scene.entities['home/item/loose'],target.contact,{scale:1,release:true,target:target.id});
    await act(async()=>harness.options.onCommit(0,p,target.contact,{}));
    expect(persist).not.toHaveBeenCalled();
    expect(root.root.findAllByProps({testID:'storage-full-note'}).length).toBeGreaterThan(0);
  });
  it('the second of two simultaneous drops gets full feedback and preserves its source', async()=>{
    const s = labFixtures['rig-menu-0']();
    s.rooms.home.instances=[instance('box','carry-basket',8,7),instance('first','mango',2,10),instance('second','ball',4,10),...Array.from({length:3},(_,n)=>({...instance(`toy-${n}`,'shell',0,0),in:'box'}))];s.rooms.home.characters=[];
    const saves: HomeStateV2[]=[];
    await open(s,next=>{saves.push(next);return true;});
    const scene=buildScene(s), target=scene.rooms.home.targets.find(t=>t.kind==='container')!;
    const proposals=['first','second'].map(id=>resolve(scene.rooms.home,scene.entities[`home/item/${id}`],target.contact,{scale:1,release:true,target:target.id}));
    for(const p of proposals)await act(async()=>harness.options.onCommit(0,p,target.contact,{}));
    expect(saves).toHaveLength(1);
    expect(saves[0].rooms.home.instances.find(i=>i.id==='second')?.in).toBeUndefined();
    expect(root.root.findAllByProps({testID:'storage-full-note'}).length).toBeGreaterThan(0);
  });

});
