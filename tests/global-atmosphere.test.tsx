import React, { useSyncExternalStore, useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm, mkdir, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { useIslandAtmosphere, atmosphereFlightPalette, atmosphereHeaderAccent, defaultAtmosphere, type Atmosphere } from '../src/atmosphere/useIslandAtmosphere';
import { GlobalWeatherLayer, AtmosphereSky } from '../src/atmosphere/GlobalWeatherLayer';
import { AtmosphereHeader } from '../src/atmosphere/AtmosphereHeader';
import { WeatherOverlay } from '../src/home/runtime/WeatherOverlay';
import { FlightWideSky } from '../src/arcade/games/fruit-bat-flight/Art';
import { IslandScene } from '../src/hub/IslandScene';
import HubScreen from '../src/hub/HubScreen';
import { PlayScene } from '../src/arcade/PlayScene';
import { AtmospherePicker } from '../src/home/AtmospherePicker';
import { defaultLook } from '../src/islander/look';
import { personFor, applyPersonalization, initializePersonalization } from '../src/personalization/model';
import { emptySave, parseSave, type Save } from '../src/state/validation';
import { encodeSave } from '../src/state/profiles';
import { hydrateHome } from '../src/home/model';
import { restoredHistory, editHistory, savedHistory } from '../src/home/useHomeStore';
import { ArcadeGameScreen, ArcadeLobby } from '../src/arcade/ArcadeScreen';
import type { ArcadeGame } from '../src/arcade/types';
import SchoolScreen from '../src/hub/SchoolScreen';
import Shelf from '../src/app/shelf';

const h = vi.hoisted(() => ({ save: {} as Save, epoch: 1, reduced: false, foreground: true, listeners: new Set<() => void>(), repeat: vi.fn(), cancel: vi.fn(), personalize: vi.fn(), focused: true, arcade: vi.fn(() => true) }));
vi.mock('../src/state/Store', () => ({ useStore: () => {
  const save = useSyncExternalStore(fn => { h.listeners.add(fn); return () => h.listeners.delete(fn); }, () => h.save);
  return { save, ready: true, recovery: null, epoch: h.epoch, personalize: h.personalize, arcade: h.arcade };
} }));
vi.mock('react-native', () => ({ View: 'View', Text: 'Text', TextInput: 'TextInput', Pressable: 'Pressable', ScrollView: 'ScrollView', Image: 'Image', Platform: { OS: 'web' },
  useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
  StyleSheet: { absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, create: (v: unknown) => v },
}));
vi.mock('expo-router', () => ({ useIsFocused: () => h.focused, useLocalSearchParams: () => ({ island: 'classic' }), router: { push: vi.fn(), canGoBack: () => false } }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }) }));
vi.mock('react-native-svg', () => Object.fromEntries(['Svg', 'Circle', 'G', 'Path', 'Defs', 'Ellipse', 'LinearGradient', 'RadialGradient', 'Rect', 'Stop', 'Mask', 'Image'].map(k => [k, k]).concat([['default', 'Svg']])));
vi.mock('react-native-reanimated', () => ({ default: { View: 'AnimatedView', createAnimatedComponent: (v: unknown) => v },
  useSharedValue: (value: number) => React.useMemo(() => ({ value, get() { return this.value; }, set(v: number) { this.value = v; } }), [value]),
  useAnimatedStyle: (fn: () => unknown) => fn(), cancelAnimation: h.cancel, withTiming: (v: number) => v,
  withRepeat: (...args: unknown[]) => { h.repeat(...args); return 1; }, withSequence: (...v: number[]) => v.at(-1), withDelay: (_: number, v: number) => v,
  Easing: { linear: (v: number) => v, out: () => null, cubic: null },
}));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => h.reduced }));
vi.mock('../src/hub/foreground', () => ({ useAppForeground: () => h.foreground }));
vi.mock('../src/arcade/Sprite', () => ({ ArcadeSprite: 'ArcadeSprite' }));
vi.mock('../src/arcade/Scene', () => ({ ArcadeScene: 'ArcadeScene' }));
vi.mock('../src/components/ui', () => ({ Heading: 'Heading', PressableScale: 'Pressable', Button: 'Button', Copy: 'Copy', Chip: 'Chip', IconButton: 'IconButton', ToggleRow: 'ToggleRow', styles: {}, Sheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => visible ? children : null, C: {} }));
vi.mock('../src/badges/ResultCard', () => ({ BadgeResultCard: () => null }));
vi.mock('../src/islander/Companion', () => ({ Companion: () => null }));
vi.mock('../src/arcade/FamilySetup', () => ({ FamilySetup: () => null }));
vi.mock('../src/arcade/PlayTeaching', () => ({ PlayTeaching: ({ onPlay }: { onPlay: () => void }) => <button onClick={onPlay}>Teach play</button> }));
vi.mock('../src/components/Icon', () => ({ Icon: () => null }));
vi.mock('../src/components/GameIcon', () => ({ GameIcon: () => null }));
vi.mock('../src/components/GameShelf', () => ({ GameCards: () => null }));
vi.mock('../src/arcade/Juice', () => ({ Hero: () => null, StarReveal: () => null }));
vi.mock('../src/arcade/TreasureArt', () => ({ ChestArt: () => null }));
vi.mock('../src/arcade/Art', () => ({ ArcadeIsland: () => null, StarDisplay: () => null }));
vi.mock('../src/arcade/Chest', () => ({ TreasureChest: () => null }));
vi.mock('../src/arcade/Collection', () => ({ OutfitCloset: () => null, StickerBook: () => null }));
vi.mock('../src/arcade/Teaching', () => ({ Teaching: ({ onPlay }: { onPlay: () => void }) => <button onClick={onPlay}>Teach play</button> }));
vi.mock('../src/arcade/audio', () => ({ useArcadeAudio: () => ({ say() {}, tone() {} }) }));
vi.mock('../src/arcade/breakClock', () => ({ markArcadePlaying() {}, arcadeBreakDue: () => false, acknowledgeArcadeBreak() {} }));
vi.mock('../src/arcade/loop', () => ({ useArcadeForeground: () => true }));
vi.mock('../src/arcade/LevelMap', () => ({ LevelMap: ({ onLevel }: { onLevel: (id: string) => void }) => <button onClick={() => onLevel('w1-1')}>Choose level</button> }));
vi.mock('../src/arcade/registry', () => ({ arcadeShelfGames: () => [], arcadeGames: [] }));
vi.mock('../src/arcade/plays', async () => {
  const { reefLevel, reefLevels } = await import('../src/arcade/games/reef-builder/engine');
  const play = { level: reefLevel, levels: reefLevels, speech: () => '', goal: () => '', Board: 'audit-board', Scene: () => null };
  return { arcadePlays: Object.fromEntries(['lagoon-run', 'beach-ball', 'palm-patrol', 'crab-crossing', 'canoe-cargo', 'rail-parade', 'reef-builder', 'shell-song'].map(id => [id, play])) };
});
vi.mock('../src/components/sheetPresence', () => ({ useSheetsClear: () => true }));
vi.mock('../src/components/Settings', () => ({ Settings: () => null }));
vi.mock('../src/components/Recovery', () => ({ Recovery: () => null }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
vi.mock('../src/personalization/LearnerChip', () => ({ LearnerChip: () => null }));
vi.mock('../src/personalization/Creator', () => ({ Creator: () => null }));
vi.mock('../src/cove/HubCove', () => ({ coveContinue: () => null, CovePersonResume: () => null }));
vi.mock('../src/ui/Sheet', () => ({ Sheet: 'Sheet' }));
vi.mock('../src/ui/Text', () => ({ Text: 'Text' }));
vi.mock('../src/ui/Icon', () => ({ Icon: () => null }));
vi.mock('../src/ui/fonts', () => ({ useNunitoLoaded: () => false }));
vi.mock('../src/islander', () => ({ Islander: () => null }));
vi.mock('../src/hub/Terrain', () => ({ Terrain: 'Terrain' }));
vi.mock('../src/hub/IslandLife', () => ({ IslandLife: () => null }));
vi.mock('../src/hub/Landmarks', () => ({ Landmark: 'Landmark' }));
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
let tree: ReactTestRenderer | undefined;
let sky!: ReturnType<typeof useIslandAtmosphere>;
function Probe() { const next = useIslandAtmosphere(); useLayoutEffect(() => { sky = next; }, [next]); return <AtmosphereHeader/>; }
const publish = (save: Save) => { h.save = save; h.listeners.forEach(fn => fn()); };
beforeEach(() => {
  h.save = initializePersonalization(emptySave()); h.epoch = 1; h.reduced = false; h.foreground = true; h.focused = true;
  h.personalize.mockImplementation((patch, expected) => { const next = applyPersonalization(h.save, patch, expected, h.epoch); publish(parseSave(encodeSave(next))); return true; });
});
afterEach(async () => { if (tree) await act(() => tree!.unmount()); tree = undefined; h.listeners.clear(); vi.clearAllMocks(); });
const render = async (node: React.ReactElement) => { await act(async () => { tree = create(node); }); return tree!; };
const nodes = (testID: string) => tree!.root.findAll(n => typeof n.type === 'string' && n.props.testID === testID);
const nightSnow: Atmosphere = { timeOfDay: 'night', weather: 'snow' };
const sunsetLeaves: Atmosphere = { timeOfDay: 'sunset', weather: 'leaves' };

describe('one durable island sky', () => {
  it('leaves default saves byte-identical, updates the real Home field, and keeps Home Undo', async () => {
    const before = encodeSave(h.save);
    await render(<Probe/>);
    expect(sky.atmosphere).toEqual(defaultAtmosphere); expect(encodeSave(h.save)).toBe(before); expect(h.personalize).not.toHaveBeenCalled();
    await act(() => sky.setAtmosphere(nightSnow));
    expect(hydrateHome(personFor(h.save).home)?.atmosphere).toEqual(nightSnow);
    expect(sky.atmosphere).toEqual(nightSnow);
    expect(nodes('atmosphere-header')).toHaveLength(1);
    const home = hydrateHome(personFor(h.save).home)!;
    const undo = editHistory(restoredHistory(home), { type: 'undo' });
    expect(undo.present.atmosphere).toBeUndefined();
    // Home's existing transaction is observed by the global hook, with no second preference.
    await act(() => publish(applyPersonalization(h.save, { home: savedHistory(editHistory(restoredHistory(home), { type: 'atmosphere', atmosphere: sunsetLeaves })) }, { learner: 'family', epoch: 1 }, 1)));
    expect(sky.atmosphere).toEqual(sunsetLeaves);
    await act(() => sky.setAtmosphere(defaultAtmosphere));
    expect(hydrateHome(personFor(h.save).home)?.atmosphere).toBeUndefined();
  });
  it('rejects malformed sky and fences a callback held across restore', async () => {
    await render(<Probe/>); const held = sky.setAtmosphere;
    await act(() => sky.setAtmosphere({ timeOfDay: 'invalid', weather: 'snow' } as unknown as Atmosphere));
    expect(h.personalize).not.toHaveBeenCalled();
    h.epoch++;
    await act(() => held(nightSnow));
    expect(hydrateHome(personFor(h.save).home)?.atmosphere).toBeUndefined();
  });
  it('opens the accessible map shortcut and immediately previews saved selections', async () => {
    await render(<HubScreen/>);
    const button = tree!.root.findByProps({ testID: 'hub-atmosphere' });
    expect(button.props.accessibilityLabel).toBe('Sky and Weather'); expect(button.props.style.width).toBeGreaterThanOrEqual(48);
    await act(() => button.props.onPress());
    const picker = tree!.root.findByType(AtmospherePicker);
    await act(() => picker.props.onChange(nightSnow));
    expect(tree!.root.findByType(IslandScene).props.atmosphere).toEqual(nightSnow);
    expect(nodes('atmosphere-tint-night')).toHaveLength(1); expect(nodes('island-lantern')).toHaveLength(6);
    expect(nodes('weather-particle').length).toBeGreaterThan(0);
  });
  it.each([nightSnow, sunsetLeaves, defaultAtmosphere])('renders map and flight mood %j without changing doors or hit targets', async atmosphere => {
    await render(<><IslandScene width={390} height={660} fontScale={1} look={defaultLook} reduced={false} active door={null} onArrive={vi.fn()} atmosphere={atmosphere}/><FlightWideSky atmosphere={atmosphere}/><GlobalWeatherLayer atmosphere={atmosphere} width={390} height={660} tint={false}/></>);
    expect(tree!.root.findAll(n => typeof n.type === 'string' && n.props.accessibilityLabel?.startsWith('Visit '))).toHaveLength(6);
    expect(nodes('weather-particle')).toHaveLength(atmosphere.weather === 'clear' ? 0 : 36);
    expect(nodes(`atmosphere-sky-${atmosphere.timeOfDay}`)).toHaveLength(atmosphere.timeOfDay === 'day' ? 0 : atmosphere.timeOfDay === 'night' ? 2 : 1);
    if (atmosphere.timeOfDay === 'day') expect(h.repeat).not.toHaveBeenCalled();
  });
  it.each(['snow', 'rain', 'leaves', 'fireflies'] as const)('uses one field for %s and cancels motion when away or reduced', async weather => {
    const atmosphere = { timeOfDay: 'night' as const, weather };
    await render(<GlobalWeatherLayer atmosphere={atmosphere} width={390} height={660}/>);
    expect(h.repeat).toHaveBeenCalledTimes(1);
    expect(tree!.root.findByType(WeatherOverlay).props.active).toBe(true);
    h.foreground = false; h.repeat.mockClear();
    await act(() => tree!.update(<GlobalWeatherLayer atmosphere={atmosphere} width={390} height={660}/>));
    expect(tree!.root.findByType(WeatherOverlay).props.active).toBe(false); expect(h.repeat).not.toHaveBeenCalled(); expect(h.cancel).toHaveBeenCalled();
    h.foreground = true; h.reduced = true;
    await act(() => tree!.update(<GlobalWeatherLayer atmosphere={atmosphere} width={390} height={660}/>));
    expect(nodes('weather-particle')).toHaveLength(3); expect(h.repeat).not.toHaveBeenCalled();
  });
  it('keeps every new header/chrome text pairing above AA contrast', () => {
    const luminance = (hex: string) => {
      const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
      return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    };
    for (const atmosphere of [nightSnow, sunsetLeaves]) {
      const p = atmosphereFlightPalette(atmosphere);
      for (const [ink, paper] of [[p.ink, p.chrome], [p.muted, p.chrome], ['#3D2B24', atmosphereHeaderAccent(atmosphere)!]]) {
        const [low, high] = [luminance(ink), luminance(paper)].sort((a, b) => a - b);
        expect((high + .05) / (low + .05)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
  it('does no overlay work for day/clear and gives other Arcade scenes a single mood/weather field', async () => {
    await render(<GlobalWeatherLayer atmosphere={defaultAtmosphere} width={390} height={660}/>);
    expect(tree!.toJSON()).toBeNull(); expect(h.repeat).not.toHaveBeenCalled();
    await act(() => tree!.update(<PlayScene game="beach-ball" atmosphere={nightSnow} active={false}/>));
    expect(nodes('atmosphere-tint-night')).toHaveLength(1); expect(nodes('weather-particle')).toHaveLength(18); expect(h.repeat).not.toHaveBeenCalled();
    expect(atmosphereFlightPalette(nightSnow).ink).toBe('#FFF8E8'); expect(atmosphereHeaderAccent(nightSnow)).toBe('#E4E6F2');
  });
});

describe('R1 atmosphere regression coverage', () => {
  const savedSky = (atmosphere: Atmosphere) => {
    const home = hydrateHome(personFor(h.save).home)!;
    h.save = applyPersonalization(h.save, { home: { ...home, atmosphere } }, { learner: 'family', epoch: h.epoch }, h.epoch);
  };
  it.each(['lagoon-run', 'beach-ball', 'palm-patrol', 'crab-crossing', 'canoe-cargo', 'rail-parade', 'reef-builder', 'shell-song'] as const)('R1-01: %s keeps sky/lighting behind the playing board and sizes particles to its measured arena', async id => {
    savedSky(nightSnow);
    const game: ArcadeGame = { id, name: 'Atmosphere test', color: '#123', hero: 'Pip', tagline: 'Test', surface: '#fff', subject: 'math', twoPlayer: false, worlds: [{ id: 'w1', name: 'Test world', detail: '', stars: 0 }] };
    await render(<ArcadeGameScreen game={game}/>);
    await act(() => tree!.root.findByType('button').props.onClick());
    await act(() => tree!.root.findAll(n => String(n.type) === 'Button' && n.props.children === 'Show me & play')[0].props.onPress());
    await act(() => tree!.root.findAllByType('button').find(n => n.children.includes('Teach play'))!.props.onClick());
    const arena = nodes('arcade-arena')[0];
    await act(() => arena.props.onLayout({ nativeEvent: { layout: { x: 0, y: 80, width: 327, height: 501 } } }));
    const weather = arena.findByType(GlobalWeatherLayer);
    expect(weather.props).toMatchObject({ width: 327, height: 501, tint: false, sky: false, subtle: true });
    expect(arena.findAllByType(AtmosphereSky)).toHaveLength(0);
    expect(arena.findAll(n => n.props.testID === 'atmosphere-tint-night')).toHaveLength(0);
    expect(arena.findAll(n => String(n.type) === 'AnimatedView' && n.props.testID === 'weather-particle')).toHaveLength(6);
    const backdrop = tree!.root.findByType(PlayScene);
    expect(backdrop.props.atmosphere).toEqual({ timeOfDay: 'night', weather: 'clear' });
    expect(backdrop.findAllByType(AtmosphereSky)).toHaveLength(1);
    expect(tree!.root.find(n => String(n.type) === 'audit-board').props.atmosphere).toEqual(nightSnow);
  });
  it('R1-01: subtle mode is particles only even when sky and tint are accidentally requested', async () => {
    await render(<GlobalWeatherLayer atmosphere={nightSnow} width={300} height={400} sky tint subtle/>);
    expect(tree!.root.findAllByType(AtmosphereSky)).toHaveLength(0);
    expect(nodes('atmosphere-tint-night')).toHaveLength(0);
    expect(nodes('weather-particle')).toHaveLength(6);
    await act(() => tree!.update(<GlobalWeatherLayer atmosphere={{ ...nightSnow, weather: 'clear' }} width={300} height={400} sky tint subtle/>));
    expect(tree!.toJSON()).toBeNull();
  });
  it.each([[390, 660], [900, 440]])('R1-02: preserves the sunset illustration and omits hidden night bitmaps at %sx%s', async (width, height) => {
    await render(<FlightWideSky atmosphere={sunsetLeaves} width={width} height={height}/>);
    const images = tree!.root.findAll(n => typeof n.type === 'string' && (n.props.source || n.props.href));
    expect(images).toHaveLength(1);
    expect(String(images[0].props.source ?? images[0].props.href)).toContain('backdrop-sunset.webp');
    expect(tree!.root.findAllByType(AtmosphereSky)).toHaveLength(0);
    expect(nodes('flight-sunset-glow')).toHaveLength(1);
    await act(() => tree!.update(<FlightWideSky atmosphere={nightSnow} width={width} height={height}/>));
    expect(tree!.root.findAll(n => typeof n.type === 'string' && (n.props.source || n.props.href))).toHaveLength(0);
    expect(tree!.root.findByType(AtmosphereSky).props.gradient).toBe(true);
  });
  it('R1-02: multiple gradient skies reference their own unique SVG definitions', async () => {
    await render(<><AtmosphereSky atmosphere={nightSnow} width={390} height={660} gradient/><AtmosphereSky atmosphere={sunsetLeaves} width={390} height={660} gradient/></>);
    const ids = tree!.root.findAll(n => String(n.type) === 'LinearGradient').map(n => n.props.id);
    expect(new Set(ids).size).toBe(2);
    expect(ids.every(id => /^[a-zA-Z0-9_-]+$/.test(id))).toBe(true);
    expect(tree!.root.findAll(n => String(n.type) === 'Rect').map(n => n.props.fill)).toEqual(ids.map(id => `url(#${id})`));
  });
  it('R1-04: full-bleed corners fill squarely and identical or invalid layouts do not publish extra renders', async () => {
    savedSky(nightSnow);
    const commits = vi.fn();
    await render(<React.Profiler id="header" onRender={commits}><AtmosphereHeader/></React.Profiler>);
    const header = nodes('atmosphere-header')[0];
    expect(header.props.style[1].borderRadius).toBe(0);
    const layout = { x: 14, y: 28, width: 720, height: 70 };
    await act(() => header.props.onLayout({ nativeEvent: { layout } }));
    const weather = tree!.root.findByType(GlobalWeatherLayer);
    expect(weather.props).toMatchObject({ width: 720, height: 70 });
    expect(weather.props).not.toHaveProperty('x'); expect(weather.props).not.toHaveProperty('y');
    const count = commits.mock.calls.length;
    await act(() => header.props.onLayout({ nativeEvent: { layout: { ...layout, x: 99 } } }));
    await act(() => header.props.onLayout({ nativeEvent: { layout: { ...layout, width: 0 } } }));
    expect(commits.mock.calls.length).toBe(count);
    await act(() => tree!.update(<AtmosphereHeader rounded/>));
    expect(nodes('atmosphere-header')[0].props.style[1].borderRadius).toBe(12);
  });
  it.each([SchoolScreen, ArcadeLobby, Shelf])('R1-04: inset scroll headers have breathing room within their rounded accent', async Screen => {
    savedSky(nightSnow);
    await render(<Screen/>);
    const header = tree!.root.findAllByType(AtmosphereHeader)[0];
    expect(header.props.rounded).toBe(true);
    const row = header.parent!;
    expect(row.props.style.padding ?? row.props.style.paddingHorizontal).toBeGreaterThanOrEqual(8);
    expect(row.props.style.marginHorizontal).toBe(-8);
  });
});

describe('permanent AB-1 splash', () => {
  it('R1-03: repairs missing Xcode registration and resource links without duplicates', () => {
    const require = createRequire(import.meta.url), xcode = require('xcode');
    const { ensureSplashResource } = require('../plugins/withIslandSplash.cjs');
    for (const name of ['LittleIsland', 'LittleIslandDev']) {
      const project = xcode.project('fixture.pbxproj');
      project.hash = { project: { objects: {
        PBXProject: { PROJECT: { mainGroup: 'MAIN', targets: [{ value: 'TARGET' }] } },
        PBXGroup: { MAIN: { children: [{ value: 'APP', comment: name }] }, APP: { name, path: name, children: [] }, APP_comment: name },
        PBXNativeTarget: { TARGET: { name, productType: '"com.apple.product-type.application"', buildPhases: [{ value: 'RES', comment: 'Resources' }] } },
        PBXResourcesBuildPhase: { RES: { isa: 'PBXResourcesBuildPhase', files: [] }, RES_comment: 'Resources' }, PBXFileReference: {}, PBXBuildFile: {},
      } } };
      ensureSplashResource(project, name);
      const phase = project.pbxResourcesBuildPhaseObj('TARGET'), refs = project.pbxFileReferenceSection();
      expect(phase.files).toHaveLength(1);
      const ref = project.pbxBuildFileSection()[phase.files[0].value].fileRef;
      expect(refs[ref].path.replace(/^"|"$/g, '')).toBe('SplashScreen.storyboard');
      expect(refs[ref].lastKnownFileType).toBe('file.storyboard');
      phase.files = []; // Template kept a file reference but dropped the build-phase entry.
      ensureSplashResource(project, name); ensureSplashResource(project, name);
      expect(phase.files).toHaveLength(1);
      expect(project.pbxBuildFileSection()[phase.files[0].value].fileRef).toBe(ref);
      expect(Object.keys(refs).filter(key => !key.endsWith('_comment'))).toHaveLength(1);
      expect(Object.keys(project.pbxBuildFileSection()).filter(key => !key.endsWith('_comment'))).toHaveLength(1);
    }
  });
  it('R1-03: explicitly configures the launch storyboard and Xcode mod', async () => {
    const require = createRequire(import.meta.url), plugin = require('../plugins/withIslandSplash.cjs');
    const config = plugin({ name: 'Little Island', slug: 'little-island-games', ios: {} });
    expect(config.mods.ios.xcodeproj).toBeTypeOf('function');
    const result = await config.mods.ios.infoPlist({ ...config, modResults: { UILaunchStoryboardName: 'OldTemplate' }, modRequest: { projectRoot: process.cwd(), introspect: false } });
    expect(result.modResults.UILaunchStoryboardName).toBe('SplashScreen');
  });
  it.each(['LittleIsland', 'LittleIslandDev'])('writes exact committed image and centered 200pt cream launch screen for %s', async name => {
    const require = createRequire(import.meta.url);
    const { writeSplash } = require('../plugins/withIslandSplash.cjs');
    const dir = await mkdtemp(join(tmpdir(), 'island-splash-test-'));
    try {
      const source = join(dir, name), images = join(source, 'Images.xcassets/SplashScreen.imageset');
      await mkdir(images, { recursive: true });
      await writeFile(join(images, 'old-template.png'), 'stale');
      await writeFile(join(images, 'image@2x.png'), 'stale');
      await writeSplash(process.cwd(), source);
      await writeSplash(process.cwd(), source);
      expect((await readdir(images)).sort()).toEqual(['Contents.json', 'splash-icon.png']);
      expect(await readFile(join(source, 'Images.xcassets/SplashScreen.imageset/splash-icon.png'))).toEqual(await readFile('assets/splash-icon.png'));
      const xml = await readFile(join(source, 'SplashScreen.storyboard'), 'utf8');
      expect(xml).toContain('image="SplashScreen"'); expect(xml.match(/constant="200"/g)).toHaveLength(2); expect(xml).toContain('firstAttribute="centerX"'); expect(xml).toContain('firstAttribute="centerY"');
      const config = JSON.parse(await readFile('app.json', 'utf8')); expect(config.expo.plugins).toContain('./plugins/withIslandSplash.cjs');
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
