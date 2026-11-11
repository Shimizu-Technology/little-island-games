/** L2 fix round: Lagoon's real RunBoard chrome with inert art (P2-1 controls, P2-2 header-relative HUD). */
import React, { useRef } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runLevels } from '../src/arcade/games/scrolling/content';

const probe = vi.hoisted(() => ({ commands: [] as unknown[], initials: new Set<unknown>() }));
vi.mock('react-native', () => ({ View: 'View', Pressable: 'Pressable', Image: 'Image', Platform: { OS: 'ios' }, AccessibilityInfo: { isScreenReaderEnabled: async () => false, addEventListener: () => ({ remove() {} }) } }));
vi.mock('react-native-svg', () => ({ default: 'Svg', Path: 'Path', Rect: 'Rect', Text: 'SvgText', Circle: 'Circle', G: 'G', Ellipse: 'Ellipse' }));
vi.mock('react-native-reanimated', () => ({ default: { View: 'AnimatedView' }, runOnJS: (f: unknown) => f, runOnUI: (f: unknown) => f, useFrameCallback: () => ({ setActive() {} }), useAnimatedReaction: () => {}, useSharedValue: (value: unknown) => useRef({ value, set(next: unknown) { this.value = next; } }).current }));
vi.mock('react-native-gesture-handler', () => ({ GestureDetector: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('expo-constants', () => ({ default: { expoConfig: {} } }));
vi.mock('expo-router', () => ({ useLocalSearchParams: () => ({}) }));
vi.mock('../src/components/Text', () => ({ Text: 'Text' }));
vi.mock('../src/components/ui', () => ({ Button: 'Button' }));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => false }));
vi.mock('../src/arcade/Input', () => ({ UiPlayTarget: 'UiPlayTarget' }));
vi.mock('../src/arcade/Sprite', () => ({ ArcadeSprite: () => null }));
vi.mock('../src/arcade/LivesHud', () => ({ HeartsHud: () => null, HitReaction: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../src/arcade/uiLoop', () => ({ useArcadeUiLoop: () => ({}) }));
vi.mock('../src/arcade/mailbox', () => ({ enqueueCommand: (queue: unknown, action: unknown) => { probe.commands.push(action); return queue; }, drainCommands: () => [] }));
vi.mock('../src/arcade/games/lagoon-run/measurement', () => ({ lagoonMeasurement: () => false }));
vi.mock('../src/arcade/games/lagoon-run/feedback', () => ({ runSounds: () => [] }));
vi.mock('../src/arcade/games/lagoon-run/swipe', () => ({ runSwipe: () => ({ enabled: () => ({}) }) }));
vi.mock('../src/arcade/games/lagoon-run/RunReaction', () => ({ RunHit: ({ children }: { children: React.ReactNode }) => children, RunHitFlash: () => null }));
vi.mock('../src/arcade/games/lagoon-run/useLagoonUiLoop', () => ({ useLagoonUiLoop: ({ initial, select }: { initial: unknown; select: (s: unknown) => unknown }) => { probe.initials.add(initial); return { snapshot: select(initial), outcome: null, state: { value: initial } }; } }));
vi.mock('../src/arcade/games/lagoon-run/useRunMeter', () => ({ useRunMeter: () => '', runEventTags: () => [] }));
vi.mock('../src/arcade/games/lagoon-run/World', () => ({ Shell: () => null, HarborPlanks: () => null, HarborEnvironment: () => null, RunCamera: ({ children }: { children: React.ReactNode }) => children, SpeedLines: () => null }));
vi.mock('../src/arcade/games/lagoon-run/Backdrop', () => ({ DeckBase: () => null, DeckHaze: () => null, DeckLight: () => null, RunAmbient: () => null, RunBackdrop: () => null, RunForeground: () => null }));
vi.mock('../src/arcade/games/lagoon-run/Art', () => ({ Deck: () => null, Canoe: () => null, PowerRing: 'PowerRing', RunTeachingCue: 'RunTeachingCue', KiteRig: () => null }));
vi.mock('../src/arcade/games/lagoon-run/Baked', () => ({ BakedHazard: () => null, BakedPower: () => null, BakedShell: () => null }));
vi.mock('../src/arcade/games/lagoon-run/DepthSprite', () => ({ DepthSprite: () => null }));
vi.mock('../src/arcade/games/fruit-bat-flight/Art', () => ({ FlightPalm: () => null, FlightForest: () => null, FlightShore: () => null, FlightSky: () => null, FlightWideSky: () => null }));
vi.mock('../src/arcade/games/scrolling/Art', () => ({ Fruit: () => null, palette: () => ['#000', '#000', '#000'] }));
vi.mock('../src/arcade/games/scrolling/FeelArt', () => ({ BatRig: () => null, RunnerRig: () => null, LastHit: ({ children }: { children: React.ReactNode }) => children }));

const { RunBoard, OPTION_GAP, PAD_GAP } = await import('../src/arcade/games/scrolling/Board');
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
type Style = Record<string, unknown>;
const flat = (style: unknown): Style => Array.isArray(style) ? Object.assign({}, ...style.map(flat)) : (style ?? {}) as Style;
const absolute = (node: ReactTestInstance) => flat(node.props.style).position === 'absolute';
function ancestors(node: ReactTestInstance, stop: ReactTestInstance) {
  const out: ReactTestInstance[] = [];
  for (let n = node.parent; n && n !== stop; n = n.parent) if (typeof n.type === 'string') out.push(n);
  return out;
}
let root: ReactTestRenderer | undefined;
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; probe.commands.length = 0; probe.initials.clear(); });
async function board(level: (typeof runLevels)[number] | 'endless', overlayTop?: number) {
  await act(async () => { root = create(<RunBoard level={level} seed={7} active helper={false} outfit={'classic' as never} onResult={() => {}} onTone={() => {}} debug={false} overlayTop={overlayTop}/>); });
  await act(async () => { await new Promise(r => setTimeout(r, 150)); });
  return root!;
}
const toggle = (r: ReactTestRenderer) => r.root.find(n => String(n.type) === 'Pressable' && n.props.accessibilityLabel === 'Arrow buttons');
const finish = (r: ReactTestRenderer) => r.root.findAll(n => String(n.type) === 'Button' && n.props.children === 'Finish free run');

describe('P2-1: arrow switch and Finish free run', () => {
  it('share one flex row with a gap wider than their touch slop, in both arrow states', async () => {
    const r = await board('endless');
    for (const shown of [false, true, false]) {
      expect(toggle(r).props.accessibilityState.checked).toBe(shown);
      const button = finish(r);
      expect(button).toHaveLength(1);
      // Largest text: the label stops growing at the HUD cap, so it never covers the runner.
      expect(button[0].props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.5);
      const row = r.root.find(n => n.props.testID === 'run-option-row');
      expect(flat(row.props.style).flexDirection).toBe('row');
      expect(flat(row.props.style).gap).toBe(OPTION_GAP);
      // Opposite ends of the row, and the arrow pad well clear below it.
      expect(flat(row.props.style).justifyContent).toBe('space-between');
      expect(flat(row.parent!.props.style).gap).toBe(PAD_GAP);
      expect(PAD_GAP).toBeGreaterThanOrEqual(20);
      expect(OPTION_GAP).toBeGreaterThan(toggle(r).props.hitSlop);
      // Neither control, nor anything between it and the shared row, is absolutely placed.
      for (const control of [toggle(r), button[0]]) {
        expect(row.findAll(n => n === control)).toHaveLength(1);
        expect(absolute(control)).toBe(false);
        expect(ancestors(control, row).some(absolute)).toBe(false);
      }
      // Finish comes first in the row, so a long label wraps above the switch rather than over it.
      const order = row.findAll(n => n === toggle(r) || n === button[0]);
      expect(order).toEqual([button[0], toggle(r)]);
      await act(async () => toggle(r).props.onPress());
    }
  });
  it('turning arrows on and off keeps the same round going and never sends finish', async () => {
    const r = await board('endless');
    const rounds = probe.initials.size, pad = () => r.root.findAll(n => String(n.type) === 'UiPlayTarget' && n.props.accessibilityLabel === 'Jump').length;
    // The choice lasts for the app session, so start from whatever the previous test left.
    const start = toggle(r).props.accessibilityState.checked as boolean;
    for (let i = 1; i <= 4; i++) {
      await act(async () => toggle(r).props.onPress());
      const shown = i % 2 ? !start : start;
      expect(toggle(r).props.accessibilityState.checked).toBe(shown);
      expect(pad()).toBe(shown ? 1 : 0);
      if (shown) expect(r.root.find(n => String(n.type) === 'UiPlayTarget' && n.props.accessibilityLabel === 'Jump').find(n => String(n.type) === 'Text').props.maxFontSizeMultiplier).toBe(1.5);
      expect(finish(r)).toHaveLength(1);
    }
    expect(probe.initials.size).toBe(rounds);
    expect(probe.commands).toEqual([]);
    await act(async () => finish(r)[0].props.onPress());
    expect(probe.commands).toEqual([{ type: 'finish' }]);
  });
});

describe('P2-2: HUD, equation and cues sit below the measured header', () => {
  const learning = runLevels.find(l => l.world === 'learn')!;
  for (const top of [62, 188]) it(`stack in one column starting under a ${top}pt header`, async () => {
    const r = await board(learning, top);
    const column = r.root.find(n => n.props.testID === 'run-top');
    expect(flat(column.props.style)).toMatchObject({ position: 'absolute', top: top + 4 });
    const hud = column.find(n => n.props.testID === 'run-score-panel');
    const fact = column.find(n => n.props.testID === 'math-fact');
    const cue = column.find(n => String(n.type) === 'RunTeachingCue');
    for (const node of [hud, fact, cue]) expect(ancestors(node, column).some(absolute)).toBe(false);
    // Document order inside the column is visual order: HUD, then the equation, then the cue row.
    const order = column.findAll(n => n === hud || n === fact || n === cue);
    expect(order).toEqual([hud, fact, cue]);
    expect(fact.props.maxFontSizeMultiplier).toBeGreaterThan(1);
    // Nothing else in the top chrome is pinned to a fixed screen offset.
    expect(column.findAll(n => typeof n.type === 'string' && n !== column && absolute(n))).toEqual([]);
  });
});
