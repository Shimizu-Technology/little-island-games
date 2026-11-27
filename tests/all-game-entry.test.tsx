import React, { Suspense, createContext } from 'react';
import { readFileSync } from 'node:fs';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChallengeEntry } from '../src/challenge/types';
import { challengeEntries } from '../src/challenge/catalog';
import { StartSheet } from '../src/cove/StartSheet';
import { difficultyOptionsFor, tierSummary, type SolitaireVariant } from '../src/cove/shelf';
import { emptyChallenge, validChallengeSession } from '../src/state/challenge';
import { emptySave } from '../src/state/validation';
import { LatinBoard } from '../src/puzzles/latin/LatinBoard';
import { BridgesBoard } from '../src/puzzles/edges/BridgesBoard';
import { LineBoard } from '../src/puzzles/lines/LineBoard';
import { SolitaireBoard } from '../src/puzzles/table/SolitaireBoard';

vi.mock('../src/puzzles/bankAssets', () => ({ bankTransport: { read: async (name: string) => readFileSync(`src/content/puzzles/assets/${name}.lipuzzle`, 'utf8') } }));
vi.mock('react-native', () => ({
  View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', TextInput: 'TextInput', Image: 'Image', Modal: 'Modal', Switch: 'Switch',
  Platform: { OS: 'ios', select: (v: Record<string, unknown>) => v.ios ?? v.default },
  useWindowDimensions: () => ({ width: 402, height: 874, scale: 3, fontScale: 1 }),
  StyleSheet: { create: (s: object) => s, absoluteFill: {}, absoluteFillObject: {}, hairlineWidth: 1 },
  PanResponder: { create: (h: object) => ({ panHandlers: h }) },
  AccessibilityInfo: { isScreenReaderEnabled: async () => false, isReduceMotionEnabled: async () => true, addEventListener: () => ({ remove() {} }) },
  Easing: { bezier: () => () => 0 },
  Animated: { timing: () => ({ start() {}, stop() {} }), ValueXY: class { getTranslateTransform() { return []; } setValue() {} }, Value: class { setValue() {} interpolate() { return 0; } }, View: 'AnimatedView' },
  AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
}));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 62, bottom: 34, left: 0, right: 0 }) }));
vi.mock('react-native-gesture-handler', () => {
  const builder: object = new Proxy({}, { get: () => () => builder });
  return { Gesture: new Proxy({}, { get: () => () => builder }), GestureDetector: ({ children }: { children: React.ReactNode }) => <>{children}</> };
});
vi.mock('react-native-svg', () => ({ default: 'Svg', G: 'G', Path: 'Path', Rect: 'Rect', Circle: 'Circle', Line: 'Line', Text: 'SvgText', Polygon: 'Polygon', Ellipse: 'Ellipse', Defs: 'Defs', LinearGradient: 'LinearGradient', Stop: 'Stop', ClipPath: 'ClipPath' }));
vi.mock('react-native-reanimated', async () => ({ ...(await import('./helpers/cove-ui')).reanimated, Easing: { bezier: () => () => 0, linear: (v: number) => v, out: (v: unknown) => v, cubic: (v: number) => v }, cancelAnimation: () => {}, runOnJS: (fn: unknown) => fn, withRepeat: (v: unknown) => v, withSequence: (v: unknown) => v }));
vi.mock('../src/components/GameIcon', () => ({ GameIcon: 'GameIcon', hasGameArt: () => false }));
vi.mock('expo-haptics', async () => (await import('./helpers/cove-ui')).haptics);
vi.mock('expo-router', () => ({ useIsFocused: () => true, router: {} }));
vi.mock('../src/ui', async () => (await import('./helpers/cove-ui')).ui);
vi.mock('../src/cove/CoveArt', async () => (await import('./helpers/cove-ui')).art);
vi.mock('../src/personalization/Portrait', () => ({ Portrait: () => null }));
vi.mock('../src/components/Text', () => ({ Text: 'Text' }));
vi.mock('../src/components/ui', () => ({ Button: 'Button', Chip: 'Chip', Copy: 'Copy', Heading: 'Heading', PressableScale: 'PressableScale', ToggleRow: 'ToggleRow', C: {}, styles: {}, font: (s: object) => s }));
vi.mock('../src/content/learnAudio', () => ({ learnSources: {} }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}), useSoundControls: () => ({ play() {}, stop() {} }), hasSpeech: () => false, useSounds: () => () => {} }));
vi.mock('../src/components/feel', () => ({ feel() {} }));
vi.mock('../src/state/Store', () => ({ useStore: () => ({ save: emptySave(), ready: true, epoch: 0, sound: true }) }));
// Vite cannot intercept CommonJS require of TSX. Only these synchronous module
// boundaries are substituted; the real boards and their registration props run.
vi.mock('../src/puzzles/latin/LazyBoard', () => ({ LazyLatinBoard: (props: React.ComponentProps<typeof LatinBoard>) => <LatinBoard {...props}/> }));
vi.mock('../src/puzzles/edges/LazyBoard', () => ({ LazyBridgesBoard: (props: React.ComponentProps<typeof BridgesBoard>) => <BridgesBoard {...props}/> }));
vi.mock('../src/puzzles/lines/LazyBoard', () => ({ LazyLineBoard: (props: React.ComponentProps<typeof LineBoard>) => <LineBoard {...props}/> }));
vi.mock('../src/puzzles/table/LazyBoard', () => ({ LazySolitaireBoard: (props: React.ComponentProps<typeof SolitaireBoard>) => <SolitaireBoard {...props}/> }));

import { ChallengeBoard as CanoeSeatsBoard } from '../src/learn/games/canoe-seats/challengeBoard';
import { ChallengeBoard as GateCrabBoard } from '../src/learn/games/gate-crab/challengeBoard';
import { ChallengeBoard as ShellScaleBoard } from '../src/learn/games/shell-scale/challengeBoard';
import { ChallengeBoard as SlipTideBoard } from '../src/learn/games/slip-tide/challengeBoard';
import { ChallengeBoard as PatternPathBoard } from '../src/learn/games/pattern-path/challenge-view';
import { ChallengeBoard as ShapeShiftBoard } from '../src/learn/games/shape-shift/challenge-view';
import { ChallengeBoard as TideLogicBoard } from '../src/learn/games/tide-logic/challenge-view';
const directBoards = {
  'canoe-seats': CanoeSeatsBoard,
  'gate-crab': GateCrabBoard,
  'shell-scale': ShellScaleBoard,
  'slip-tide': SlipTideBoard,
  'pattern-path': PatternPathBoard,
  'shape-shift': ShapeShiftBoard,
  'tide-logic': TideLogicBoard
};
let screen: ReactTestRenderer | undefined;
beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(async () => { if (screen) await act(async () => screen!.unmount()); screen = undefined; vi.unstubAllGlobals(); });

const playable = challengeEntries.filter(entry => entry.puzzles.length || entry.packed?.bands.length);
type EntryCase = { entry: ChallengeEntry; variant?: SolitaireVariant; label: string };
const cases = playable.flatMap<EntryCase>(entry => entry.game === 'solitaire'
  ? (['draw-1', 'draw-3', 'freecell'] as const).map(variant => ({ entry, variant, label: `solitaire/${variant}` }))
  : [{ entry, variant: undefined, label: entry.game }]);

describe('every playable Challenge/Cove registration', () => {
  it.each(cases)('$label opens its sheet and renders its initial board', async ({ entry, variant }) => {
    const progress = emptyChallenge();
    if (entry.cove) {
      const tier = difficultyOptionsFor(entry, variant)[0]?.key ?? 1;
      expect(() => tierSummary(entry, tier, variant)).not.toThrow();
      const onPlay = vi.fn();
      await act(async () => { screen = create(<StartSheet entry={entry} variant={variant} visible tier={tier} onTier={() => {}} partners={[]} partner={null} onPartner={() => {}} favorite={false} onFavorite={() => {}} onPlay={onPlay} onContinue={() => {}} onNew={() => {}} onClose={() => {}}/>); });
      const play = screen!.root.findByProps({ testID: 'start-play' });
      await act(async () => play.props.onPress());
      expect(onPlay).toHaveBeenCalledOnce();
      await act(async () => screen!.unmount()); screen = undefined;
    }
    const ref = entry.puzzles.find(p => !p.retired)?.ref ?? await entry.packed!.choose(entry.packed!.bands.find(b => b.count > 0 && (!variant || (variant === 'freecell' ? b.title.startsWith('FreeCell') : b.title.startsWith(`Klondike ${variant.replace('-', ' ')}`)) ))!.bank, progress);
    if (entry.packed && !entry.puzzles.some(p => p.ref === ref)) await entry.packed.prepare(ref);
    const session = entry.start(ref, 'family', `entry-${entry.game}`, progress, { supportOff: false, ownRead: false }, []);
    expect(validChallengeSession(session, 'family', entry.catalog)).toBe(true);
    const element = entry.render(session, () => {}, true, 362) as React.ReactElement;
    const Direct = directBoards[entry.game as keyof typeof directBoards] as React.ComponentType<Record<string, unknown>> | undefined;
    const board = Direct ? <Direct {...element.props as Record<string, unknown>}/> : element;
    await act(async () => { screen = create(<Suspense fallback={React.createElement('View', { testID: 'registration-loading' })}>{board}</Suspense>); });
    await act(async () => { await vi.dynamicImportSettled(); });
    expect(screen!.toJSON()).not.toBeNull();
    expect(screen!.root.findAllByProps({ testID: 'registration-loading' })).toHaveLength(0);
    expect(JSON.stringify(screen!.toJSON())).not.toContain('picture-grid-load-error');
  });
});

it('keeps registrations without published word content out of playable routes', () => {
  expect(challengeEntries.filter(entry => !playable.includes(entry)).map(entry => entry.game)).toEqual(['sound-boat', 'word-search']);
});
