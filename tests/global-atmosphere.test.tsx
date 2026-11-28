import React, { useSyncExternalStore, useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { useIslandAtmosphere, atmosphereFlightPalette, atmosphereHeaderAccent, defaultAtmosphere, type Atmosphere } from '../src/atmosphere/useIslandAtmosphere';
import { GlobalWeatherLayer } from '../src/atmosphere/GlobalWeatherLayer';
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

const h = vi.hoisted(() => ({ save: {} as Save, epoch: 1, reduced: false, foreground: true, listeners: new Set<() => void>(), repeat: vi.fn(), cancel: vi.fn(), personalize: vi.fn(), focused: true }));
vi.mock('../src/state/Store', () => ({ useStore: () => {
  const save = useSyncExternalStore(fn => { h.listeners.add(fn); return () => h.listeners.delete(fn); }, () => h.save);
  return { save, ready: true, recovery: null, epoch: h.epoch, personalize: h.personalize };
} }));
vi.mock('react-native', () => ({ View: 'View', Pressable: 'Pressable', ScrollView: 'ScrollView', Image: 'Image', Platform: { OS: 'web' },
  useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
  StyleSheet: { absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, create: (v: unknown) => v },
}));
vi.mock('expo-router', () => ({ useIsFocused: () => h.focused, router: { push: vi.fn() } }));
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
vi.mock('../src/components/ui', () => ({ Heading: 'Heading', PressableScale: 'Pressable', C: {} }));
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
const render = async (node: React.ReactElement) => { await act(() => { tree = create(node); }); return tree!; };
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
    expect(nodes(`atmosphere-sky-${atmosphere.timeOfDay}`)).toHaveLength(atmosphere.timeOfDay === 'day' ? 0 : 2);
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

describe('permanent AB-1 splash', () => {
  it.each(['LittleIsland', 'LittleIslandDev'])('writes exact committed image and centered 200pt cream launch screen for %s', async name => {
    const require = createRequire(import.meta.url);
    const { writeSplash } = require('../plugins/withIslandSplash.cjs');
    const dir = await mkdtemp(join(tmpdir(), 'island-splash-test-'));
    try {
      const source = join(dir, name); await writeSplash(process.cwd(), source);
      expect(await readFile(join(source, 'Images.xcassets/SplashScreen.imageset/splash-icon.png'))).toEqual(await readFile('assets/splash-icon.png'));
      const xml = await readFile(join(source, 'SplashScreen.storyboard'), 'utf8');
      expect(xml).toContain('image="SplashScreen"'); expect(xml.match(/constant="200"/g)).toHaveLength(2); expect(xml).toContain('firstAttribute="centerX"'); expect(xml).toContain('firstAttribute="centerY"');
      const config = JSON.parse(await readFile('app.json', 'utf8')); expect(config.expo.plugins).toContain('./plugins/withIslandSplash.cjs');
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
