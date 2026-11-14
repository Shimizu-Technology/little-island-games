/** R0b: the School game boards at the largest text size (AX5). Each board renders through the real `Text`, inside the
 * board text region the Learn frame sets, and each check names the word or control that broke or clipped natively. */
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { TextFit } from '../src/components/Text';
import { wordWidth } from '../src/components/wordFit';
import { startSession } from '../src/learn/session';
import { optionsAtLevel } from '../src/learn/levels';
import type { LearnId, LearnSession } from '../src/learn/types';
import { Board as B0 } from '../src/learn/games/code-lab/view';
import { Board as B1 } from '../src/learn/games/hafa-adai/view';
import { Board as B2 } from '../src/learn/games/fraction-feast/view';
import { Board as B3 } from '../src/learn/games/pattern-path/view';
import { Board as B4 } from '../src/learn/games/crab-commands/view';
import { Board as B5 } from '../src/learn/games/tide-pool/view';
import { Board as B6 } from '../src/learn/games/float-sink/view';
import { Board as B7 } from '../src/learn/games/weather-watch/view';
import { Board as B8 } from '../src/learn/games/treasure-algebra/view';
import { Board as B9 } from '../src/learn/games/sound-boat/view';
import { Board as B10 } from '../src/learn/games/reef-race/view';
import { Board as B11 } from '../src/learn/games/logic-lagoon/view';
import { Board as B12 } from '../src/learn/games/beep-bot/view';
import { Board as B13 } from '../src/learn/games/tide-logic/view';
const boards: Partial<Record<LearnId, unknown>> = { 'code-lab': B0, 'hafa-adai': B1, 'fraction-feast': B2, 'pattern-path': B3, 'crab-commands': B4, 'tide-pool': B5, 'float-sink': B6, 'weather-watch': B7, 'treasure-algebra': B8, 'sound-boat': B9, 'reef-race': B10, 'logic-lagoon': B11, 'beep-bot': B12, 'tide-logic': B13 };

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 3.12 }));
vi.mock('react-native', () => {
  class Value { v: number; constructor(v: number) { this.v = v; } setValue(v: number) { this.v = v; } stopAnimation() {} interpolate() { return new Value(0); } }
  class ValueXY { x = new Value(0); y = new Value(0); setValue() {} }
  const animation = { start: (done?: () => void) => done?.(), stop: () => {} };
  const flatten = (s: unknown): Record<string, unknown> => Array.isArray(s) ? Object.assign({}, ...s.map(flatten)) : s && typeof s === 'object' ? s as Record<string, unknown> : {};
  return {
    View: 'View', ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', Pressable: 'Pressable',
    Platform: { OS: 'ios', select: (o: Record<string, unknown>) => o.ios ?? o.default },
    StyleSheet: { flatten, create: (s: unknown) => s },
    Animated: { View: 'View', add: () => new Value(0), multiply: () => new Value(0), Value, ValueXY, timing: () => animation, sequence: () => animation, loop: () => animation, spring: () => animation, delay: () => animation, parallel: () => animation },
    AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
    useWindowDimensions: () => viewport,
  };
});
vi.mock('react-native-svg', () => Object.fromEntries(['Circle', 'ClipPath', 'Defs', 'Ellipse', 'FeColorMatrix', 'Filter', 'G', 'Line', 'LinearGradient', 'Path', 'Pattern', 'Polygon', 'Polyline', 'RadialGradient', 'Rect', 'Stop', 'SvgXml', 'Text', 'TSpan'].map(k => [k, `Svg${k}`]).concat([['default', 'Svg']])));
vi.mock('../src/components/motion', () => ({ easeInOut: () => 0, easeOut: () => 0, nativeDriver: false, useReducedMotion: () => true }));
vi.mock('../src/learn/Coach', () => ({ CoachSpot: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../src/components/Icon', () => ({ Icon: 'Icon' }));
vi.mock('../src/components/GameIcon', () => ({ GameIcon: 'GameIcon' }));
vi.mock('../src/learn/kit/ReadingText', () => ({ ReadingText: 'ReadingText' }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: React.createContext({}), useSoundControls: () => ({ play: () => {}, stop: () => {} }) }));
vi.mock('../src/islander/active', async () => { const { defaultLook } = await import('../src/islander/look'); return { useActiveIslanderLook: () => defaultLook }; });
// The shared controls draw their words through the real Text, so the board's text region reaches them.
vi.mock('../src/components/ui', async () => {
  const { Text } = await import('../src/components/Text');
  type P = { children?: React.ReactNode; style?: object; maxFontSizeMultiplier?: number; numberOfLines?: number; label?: string; onPress?: () => void; disabled?: boolean; testID?: string };
  return {
    C: new Proxy({}, { get: () => '#183F39' }), font: 'Avenir Next', styles: { row: { flexDirection: 'row' }, page: {}, content: {} },
    Copy: ({ children, style, ...p }: P) => <Text {...p} style={[{ fontSize: 16, lineHeight: 25 }, style]}>{children}</Text>,
    Heading: ({ children, style, maxFontSizeMultiplier }: P) => <Text accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier} style={[{ fontSize: 32 }, style]}>{children}</Text>,
    Button: ({ children, style, maxFontSizeMultiplier, label, onPress, disabled, numberOfLines }: P) => <Pressable role="button" label={label} onPress={onPress} disabled={disabled} style={style}><Text maxFontSizeMultiplier={maxFontSizeMultiplier} numberOfLines={numberOfLines} style={{ fontSize: 15 }}>{children}</Text></Pressable>,
    Chip: ({ children }: P) => <Pressable role="chip"><Text style={{ fontSize: 15 }}>{children}</Text></Pressable>,
    IconButton: 'IconButton', PressableScale: 'PressableScale',
  };
});
const Pressable = 'Pressable' as unknown as React.ComponentType<Record<string, unknown>>;

const LARGEST = 3.12;
let root: ReactTestRenderer | undefined;
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; vi.unstubAllGlobals(); Object.assign(viewport, { width: 393, height: 852, fontScale: 3.12 }); });
const textOf = (n: ReactTestInstance): string => n.children.map(c => typeof c === 'string' ? c : textOf(c)).join('');
const flat = (s: unknown): Record<string, unknown> => Array.isArray(s) ? Object.assign({}, ...s.map(flat)) : s && typeof s === 'object' ? s as Record<string, unknown> : {};
const texts = (r: ReactTestRenderer) => r.root.findAll(n => String(n.type) === 'Text');
/** The host text drawing exactly these words. */
const textNode = (r: ReactTestRenderer, words: string) => { const found = texts(r).filter(n => textOf(n) === words); expect(found.length, words).toBeGreaterThan(0); return found[0]; };
/** The size the text is drawn at on an AX5 phone: capped explicitly (above its cap) or by the native multiplier. */
const drawnSize = (n: ReactTestInstance) => {
  const style = flat(n.props.style), size = (style.fontSize as number) ?? 14;
  return n.props.allowFontScaling === false ? size : size * Math.min(LARGEST, n.props.maxFontSizeMultiplier ?? LARGEST);
};
const longest = (n: ReactTestInstance) => Math.max(...textOf(n).split(/[\s ]+/).map(w => wordWidth(w) * drawnSize(n)));
const inside = (n: ReactTestInstance, parent: ReactTestInstance) => { for (let p: ReactTestInstance | null = n; p; p = p.parent) if (p === parent) return true; return false; };
// iPhone 15 portrait: the frame gives the board 393 - 56 pt, and 852 - 59 - 34 pt of height.
const W = 337, H = 759;
const region = { width: W, ceiling: 2 };

function sessionFor(id: LearnId, level = 1, patch?: (state: never) => unknown): LearnSession {
  const s = startSession(id, { options: optionsAtLevel({ mode: 'solo', pace: 'easy' }, level as 1) }, {}, 7);
  return patch ? { ...s, state: patch(s.state as never) } : s;
}
async function mount(view: LearnId, session: LearnSession, extra: Record<string, unknown> = {}, fit: typeof region | null = region) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const Board = boards[view] as React.ComponentType<Record<string, unknown>>;
  const props = { session, update: vi.fn(), practice: vi.fn(), assistance: vi.fn(), skills: {}, sound: vi.fn(), stopSound: vi.fn(), soundOn: true, width: W, height: H, active: true, coach: { active: false, done: vi.fn() }, cheer: vi.fn(), ...extra };
  await act(async () => { root = create(<TextFit.Provider value={fit}><Board {...props} /></TextFit.Provider>); });
  return root!;
}

it('every board text without its own cap stops at 2x inside the board region, and never breaks a word there', async () => {
  // Code Lab "Progr/am", Pattern Path "steppin/g", Håfa Adai "Welcom/e", Fraction Feast "Serv/e it".
  const cases: [LearnId, string][] = [['code-lab', 'Program 1 of 4'], ['hafa-adai', 'Welcome to our picnic!'], ['fraction-feast', 'Serve it']];
  for (const [id, words] of cases) {
    const r = await mount(id, sessionFor(id));
    const n = textNode(r, words);
    expect(n.props.maxFontSizeMultiplier ?? Infinity, words).toBeLessThanOrEqual(2);
    expect(longest(n), words).toBeLessThanOrEqual((W - 24) * 0.92 + 1);
    // No text in the board keeps the full AX5 size.
    for (const t of texts(r)) expect(drawnSize(t), `${id}: ${textOf(t)}`).toBeLessThanOrEqual(2 * (flat(t.props.style).fontSize as number ?? 14) + 0.01);
    await act(async () => root!.unmount()); root = undefined;
  }
  const pattern = await mount('pattern-path', sessionFor('pattern-path'));
  const title = texts(pattern)[0];
  expect(title.props.maxFontSizeMultiplier).toBeLessThanOrEqual(2);
  expect(longest(title)).toBeLessThanOrEqual(W * 0.92 + 1);
});

it('Crab Commands at AX5: labels fit their cards, Go! keeps its own line, Clear and Hint share the next, and the beach shrinks', async () => {
  const r = await mount('crab-commands', sessionFor('crab-commands'));
  const cards = r.root.find(n => n.props.testID === 'crab-command-cards');
  const labels = cards.findAll(n => String(n.type) === 'Text');
  expect(labels.map(textOf)).toEqual(['Up', 'Right', 'Down', 'Left']);
  // Four cards with 6-pt gaps, 2-pt borders and 4-pt padding: "Rig/ht", "Do/wn", "Lef/t" broke at the full size.
  const inner = (W - 18) / 4 - 12;
  for (const label of labels) expect(longest(label), textOf(label)).toBeLessThanOrEqual(inner);
  expect(new Set(labels.map(l => l.props.maxFontSizeMultiplier)).size).toBe(1);
  const run = r.root.find(n => n.props.testID === 'crab-run-row');
  expect(flat(run.props.style).flexDirection).not.toBe('row');
  const [go, clear, hint] = run.findAll(n => String(n.type) === 'Pressable');
  expect(textOf(go)).toBe('Go!');expect(flat(go.props.style).alignSelf).toBe('stretch');
  expect([textOf(clear), textOf(hint)]).toEqual(['Clear', 'Hint']);
  expect(clear.parent!.parent).toBe(hint.parent!.parent);
  // Half the board each, less 8-pt gap and 13-pt compact padding: Hint stays inside the card.
  for (const b of [clear, hint]) expect(longest(b.findByType('Text' as never))).toBeLessThanOrEqual((W - 8) / 2 - 26);
  // The beach, the plan and the cards share one phone screen; the prompt stops at 2x.
  const beach = r.root.findAll(n => String(n.type) === 'View' && flat(n.props.style).alignSelf === 'center' && typeof flat(n.props.style).width === 'number')[0];
  expect(flat(beach.props.style).width).toBeLessThanOrEqual(Math.floor(H * 0.3));
  expect(textNode(r, "Plan the crab's path, then Go!").props.maxFontSizeMultiplier).toBeLessThanOrEqual(2);
  expect(textNode(r, 'Beach 1 of 3').props.maxFontSizeMultiplier).toBe(1.5);
  expect(textNode(r, 'Your plan: tap arrows below').props.maxFontSizeMultiplier).toBe(1.5);
});

it('Crab Commands at the default size keeps its row of Go!, Clear and Hint and its full beach', async () => {
  Object.assign(viewport, { fontScale: 1 });
  const r = await mount('crab-commands', sessionFor('crab-commands'), {}, null);
  expect(flat(r.root.find(n => n.props.testID === 'crab-run-row').props.style).flexDirection).toBe('row');
  for (const label of r.root.find(n => n.props.testID === 'crab-command-cards').findAll(n => String(n.type) === 'Text')) expect(label.props.maxFontSizeMultiplier).toBeUndefined();
  const beach = r.root.findAll(n => String(n.type) === 'View' && flat(n.props.style).alignSelf === 'center' && typeof flat(n.props.style).width === 'number')[0];
  expect(flat(beach.props.style).width).toBe(280);
});

it('Tide Pool at AX5: answer labels fit their tiles ("Gre/en fuz/z"), and the pool controls are rows of two with fitted labels', async () => {
  const guess = await mount('tide-pool', sessionFor('tide-pool'));
  const tiles = guess.root.findAll(n => String(n.type) === 'PressableScale' && typeof n.props.label === 'string' || n.props.accessibilityRole === 'button' && String(n.type) !== 'IconButton');
  expect(tiles.length).toBeGreaterThan(0);
  const answers = guess.root.findAll(n => String(n.type) === 'Text' && flat(n.props.style).fontSize === 14 && flat(n.props.style).textAlign === 'center');
  expect(answers.length).toBeGreaterThanOrEqual(2);
  const tile = (W - 8 * (answers.length - 1)) / answers.length - 16;
  for (const a of answers) expect(longest(a), textOf(a)).toBeLessThanOrEqual(tile);
  await act(async () => root!.unmount()); root = undefined;
  // The coral mission: three controls, each a row of its two choices at this size.
  const { current } = await import('../src/learn/games/tide-pool/engine');
  const base = sessionFor('tide-pool') as LearnSession<{ index: number; missions: string[] }>;
  const fix = base.state.missions.findIndex((_, i) => current({ ...base.state, index: i } as never)?.kind === 'fix');
  if (fix < 0) return;
  const r = await mount('tide-pool', { ...base, state: { ...base.state, index: fix } });
  const controls = r.root.find(n => n.props.testID === 'tide-controls');
  expect(flat(controls.props.style).flexDirection).toBe('column');
  for (const label of controls.findAll(n => String(n.type) === 'Text')) expect(longest(label), textOf(label)).toBeLessThanOrEqual((W - 8) / 2 - 14);
});

it('Float or Sink at AX5: "Floa/t" fits its half of the row', async () => {
  const r = await mount('float-sink', sessionFor('float-sink'));
  for (const words of ['Float', 'Sink']) expect(longest(textNode(r, words)), words).toBeLessThanOrEqual((W - 10) / 2 - 6);
});

it('Weather Watch at AX5: choice labels fit their tiles ("Sunh/at") and the step count and "Build · Test · Notice" stack', async () => {
  const r = await mount('weather-watch', sessionFor('weather-watch'));
  const steps = r.root.find(n => n.props.testID === 'science-steps');
  expect(flat(steps.props.style).flexDirection).not.toBe('row');
  for (const t of steps.findAll(n => String(n.type) === 'Text')) expect(t.props.maxFontSizeMultiplier).toBe(1.5);
  const labels = r.root.findAll(n => String(n.type) === 'Text' && flat(n.props.style).fontSize === 13 && flat(n.props.style).textAlign === 'center');
  expect(labels.length).toBeGreaterThan(1);
  const basis = labels.length > 4 ? 0.29 : 0.44;
  for (const label of labels) expect(longest(label), textOf(label)).toBeLessThanOrEqual(W * basis - 20);
});

it('Treasure Algebra at AX5: the six step buttons are three to a row and "-10" never stacks digit by digit', async () => {
  const r = await mount('treasure-algebra', sessionFor('treasure-algebra'));
  const steps = r.root.find(n => n.props.testID === 'algebra-steps');
  const keys = steps.findAll(n => String(n.type) === 'PressableScale');
  expect(keys).toHaveLength(6);
  const key = flat(keys[0].props.style).width as number;
  // The card is 4 pt narrower than the board width it reports (its 2-pt border), so three keys fit inside that.
  expect(key * 3 + 16).toBeLessThanOrEqual(W - 4);expect(key).toBeGreaterThan(48);
  for (const k of keys) expect(longest(k.findByType('Text' as never)), textOf(k)).toBeLessThanOrEqual(key - 8);
});

it('Sound Boat at AX5: letters stop where they fit their tiles and boxes, which keep their height', async () => {
  const r = await mount('sound-boat', sessionFor('sound-boat'));
  const letters = r.root.findAll(n => String(n.type) === 'PressableScale' && String(n.props.accessibilityLabel ?? '').startsWith('Letter'));
  expect(letters.length).toBeGreaterThan(2);
  for (const tile of letters) {
    const t = tile.findByType('Text' as never), height = flat(tile.props.style).height as number;
    const lineHeight = flat(t.props.style).lineHeight as number;
    // Drawn line height (capped) never taller than the tile inside its borders.
    expect(lineHeight * Math.min(LARGEST, t.props.maxFontSizeMultiplier ?? LARGEST), textOf(t)).toBeLessThanOrEqual(height - 8 + 0.01);
  }
  const boxes = r.root.findAll(n => String(n.type) === 'View' && /box|letter /.test(String(n.props.accessibilityLabel ?? '')) && flat(n.props.style).height !== undefined);
  for (const box of boxes) {
    const t = box.findAll(n => String(n.type) === 'Text')[0];
    if (!t) continue;
    const style = flat(box.props.style), cap = Math.min(LARGEST, t.props.maxFontSizeMultiplier ?? LARGEST);
    expect((flat(t.props.style).lineHeight as number) * cap).toBeLessThanOrEqual((style.height as number) - 8 + 0.01);
  }
});

it('Reef Race at AX5: score cards wrap their names between words instead of "Yo…", and stone numbers fit their circles', async () => {
  const r = await mount('reef-race', sessionFor('reef-race'));
  const name = textNode(r, 'Your turtle');
  expect(name.props.numberOfLines).toBe(2);
  expect(longest(name)).toBeLessThanOrEqual((W - 6) / 2 - 38 - 6 - 22);
  expect(textNode(r, 'Island friend').props.numberOfLines).toBe(2);
  const { stoneTextMax } = await import('../src/learn/kit/NumberParts');
  for (const r of [16, 20, 24, 30]) for (const n of [1, 9, 42, 100]) {
    const size = Math.round(r * 0.8), cap = stoneTextMax(n, r);
    expect(cap).toBeGreaterThanOrEqual(1);
    expect(size * cap * 1.25, `${n} in radius ${r}`).toBeLessThanOrEqual(r * 2 - 8 + 0.01);
    if (n < 100) expect(wordWidth(String(n)) * size * cap).toBeLessThanOrEqual(r * 2 - 8);
  }
  const stones = r.root.findAll(n => String(n.type) === 'Text' && /^\d+$/.test(textOf(n)));
  expect(stones.length).toBeGreaterThan(5);
  for (const s of stones) expect(s.props.maxFontSizeMultiplier, textOf(s)).toBeLessThanOrEqual(2);
});

it('Håfa Adai at AX5: captions fit their slots on at most two lines, and each row makes room for them', async () => {
  const r = await mount('hafa-adai', sessionFor('hafa-adai'));
  const captions = r.root.findAll(n => String(n.type) === 'Text' && flat(n.props.style).fontSize === 12 && flat(n.props.style).lineHeight === 14);
  expect(captions.length).toBeGreaterThan(3);
  let tile = captions[0];
  while (String(tile.type) !== 'PressableScale') tile = tile.parent!;
  const slot = flat(tile.props.style).width as number, rowHeight = flat(tile.props.style).height as number;
  for (const c of captions) {
    expect(c.props.numberOfLines).toBe(2);
    expect(longest(c)).toBeLessThanOrEqual(slot - 8);
    const picture = rowHeight - (10 + 2 * Math.ceil(14 * c.props.maxFontSizeMultiplier));
    expect(picture).toBeGreaterThanOrEqual(44);
  }
});

it('Håfa Adai: no caption word is wider than its picture, on any level or seed, at AX5 or the default size (review P2)', async () => {
  // Level 2 seed 5 has "Grandmother": four columns left 69 pt for a word about 78 pt wide even at 12 pt.
  const { engine } = await import('../src/learn/games/hafa-adai/engine');
  const captionsOf = (r: ReactTestRenderer) => r.root.findAll(n => String(n.type) === 'Text' && flat(n.props.style).fontSize === 12 && flat(n.props.style).lineHeight === 14);
  const room = (n: ReactTestInstance) => { let tile = n; while (String(tile.type) !== 'PressableScale') tile = tile.parent!; const st = flat(tile.props.style); return (st.width as number) - 2 * (st.borderWidth as number); };
  let checked = 0;
  for (const level of [1, 2, 3]) for (let seed = 1; seed <= 20; seed++) {
    const options = optionsAtLevel({ mode: 'solo', pace: 'easy' }, level as 1);
    const session = startSession('hafa-adai', { options }, {}, seed);
    expect(engine.validate(session.state as never, options)).toBe(true);
    const r = await mount('hafa-adai', session);
    for (const c of captionsOf(r)) { expect(longest(c), `level ${level} seed ${seed}: ${textOf(c)}`).toBeLessThanOrEqual(room(c)); checked++; }
    await act(async () => root!.unmount()); root = undefined;
  }
  expect(checked).toBeGreaterThan(300);
  Object.assign(viewport, { fontScale: 1 });
  const options = optionsAtLevel({ mode: 'solo', pace: 'easy' }, 2);
  const r = await mount('hafa-adai', startSession('hafa-adai', { options }, {}, 5), {}, null);
  const grandmother = textNode(r, 'Grandmother');
  expect(wordWidth('Grandmother') * 12).toBeLessThanOrEqual(room(grandmother));
});

it('Logic Lagoon at AX5: the values follow the grid directly, with the "tap a square" line above the grid', async () => {
  const r = await mount('logic-lagoon', sessionFor('logic-lagoon'));
  const board = r.root.children[0] as ReactTestInstance;
  const order = board.children.filter((c): c is ReactTestInstance => typeof c !== 'string');
  const grid = order.findIndex(c => String(c.type) === 'ScrollView'), status = order.findIndex(c => c.props.testID === 'logic-status'), values = order.findIndex(c => c.props.testID === 'logic-values');
  expect(grid).toBeGreaterThan(0);
  expect(status).toBe(grid - 1);
  expect(values).toBe(grid + 1);
});

it('Logic Lagoon at the default size keeps the line between the grid and the values', async () => {
  Object.assign(viewport, { fontScale: 1 });
  const r = await mount('logic-lagoon', sessionFor('logic-lagoon'), {}, null);
  const order = (r.root.children[0] as ReactTestInstance).children.filter((c): c is ReactTestInstance => typeof c !== 'string');
  const grid = order.findIndex(c => String(c.type) === 'ScrollView');
  expect(order[grid + 1].props.testID).toBe('logic-status');
  expect(order[grid + 2].props.testID).toBe('logic-values');
});

it('the board region is what caps an uncapped prompt: without it the Crab prompt keeps the full AX5 size', async () => {
  const r = await mount('crab-commands', sessionFor('crab-commands'), {}, null);
  expect(textNode(r, "Plan the crab's path, then Go!").props.maxFontSizeMultiplier).toBeUndefined();
  expect(inside(textNode(r, 'Up'), r.root)).toBe(true);
});

it('Beep Bot at AX5: the instruction gets the full width with Hear Beep under it, not a one-word column beside it', async () => {
  const r = await mount('beep-bot', sessionFor('beep-bot'));
  const row = r.root.find(n => n.props.testID === 'beep-message');
  expect(row.props.style.flexDirection).toBe('column');
  expect(flat(row.findAll(n => String(n.type) === 'Text')[0].props.style).flex).toBeUndefined();
  await act(async () => root!.unmount()); root = undefined;
  Object.assign(viewport, { fontScale: 1 });
  const d = await mount('beep-bot', sessionFor('beep-bot'), {}, null);
  expect(d.root.find(n => n.props.testID === 'beep-message').props.style.flexDirection).toBe('row');
});

it('Tide Logic at AX5: the two bucket labels each fit half the belt, so they never run together ("LEFT BUCKETRIGHT")', async () => {
  const r = await mount('tide-logic', sessionFor('tide-logic'));
  const labels = r.root.find(n => n.props.testID === 'tide-buckets').findAll(n => String(n.type) === 'Text');
  // The arrows are joined to their words with no-break spaces, so neither is ever left alone on a line.
  expect(labels.map(textOf)).toEqual(['←\u00a0LEFT BUCKET', 'RIGHT BUCKET\u00a0→']);
  for (const l of labels) { expect(flat(l.props.style).flexShrink).toBe(1); expect(wordWidth('BUCKET→') * drawnSize(l), textOf(l)).toBeLessThanOrEqual((W - 32) / 2); }
});

it('Beep Bot at AX5 reads in play order: board, plan, arrow keys, then Go (keys are never below the fold under Go)', async () => {
  const r = await mount('beep-bot', sessionFor('beep-bot'));
  const board = r.root.children[0] as ReactTestInstance;
  const order = board.children.filter((c): c is ReactTestInstance => typeof c !== 'string');
  const go = order.findIndex(c => c.props.testID === 'beep-go'), keys = order.findIndex(c => c.findAll(n => String(n.props.accessibilityLabel ?? '') === 'Add up card').length > 0);
  expect(keys).toBeGreaterThan(0);expect(go).toBeGreaterThan(keys);
});

it('Treasure Algebra says "Climb 1 step", and a 32-pt board heading stops at 44 pt in the board region', async () => {
  type Tasks = { tasks: { kind: string; a: number; b: number }[] };
  const one = sessionFor('treasure-algebra', 1, (st: Tasks) => ({ ...st, tasks: [{ ...st.tasks[0], kind: 'steps', a: 5, b: 1 }, ...st.tasks.slice(1)] }));
  const r = await mount('treasure-algebra', one, {}, { width: W, ceiling: 2, maxSize: 44 } as typeof region);
  const heading = r.root.findAll(n => String(n.type) === 'Text' && n.props.accessibilityRole === 'header')[0];
  expect(textOf(heading)).toBe('Start at 5. Climb 1 step.');
  expect(drawnSize(heading)).toBeLessThanOrEqual(44);
});
