import React, { createContext } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { ChallengeBoard } from '../src/learn/games/crab-commands/challenge-view';
import { challengeEngine, type State } from '../src/learn/games/crab-commands/challenge-engine';
import { crabPuzzles } from '../src/learn/games/crab-commands/challenge-content';
vi.mock('../src/content/learnAudio', () => ({ learnSources: {} }));
vi.mock('react-native', () => ({ View: 'div', ScrollView: 'section' }));
vi.mock('../src/components/ui', () => ({ View: 'div', Button: 'button', Copy: 'p', PressableScale: 'button', C: { ink: '#183F39', soft: '#E5EFE5' } }));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => true }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({ sound: false }), useSoundControls: () => ({ play: vi.fn(), stop: vi.fn() }) }));
vi.mock('../src/learn/games/crab-commands/view', () => ({ ArrowArt: () => null, Beach: 'beach', cardLabel: { up: 'Up', right: 'Right', down: 'Down', left: 'Left', forward: 'Walk', 'turn-left': 'Turn left', 'turn-right': 'Turn right', repeat: 'Again ×2' } }));
let root: ReactTestRenderer | undefined;
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; vi.unstubAllGlobals(); });
const mount = async (s: State) => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); await act(async () => { root = create(<ChallengeBoard state={s} dispatch={vi.fn()} active width={335} />); }); };
const start = (title: string) => { const p = crabPuzzles.find((p) => p.title.includes(title) && !p.retired)!; return challengeEngine.create(p.descriptor, { version: 1 }, { supportOff: false, ownRead: false }); };
const lines = () => root!.root.findAllByType('p').map((p) => p.children.join(''));
const inside = (node: { parent: unknown }, test: (n: { type: unknown; props: Record<string, unknown> }) => boolean) => {
  for (let n = node.parent as { type: unknown; props: Record<string, unknown>; parent: unknown } | null; n; n = n.parent as typeof n) if (test(n)) return true;
  return false;
};

it('A3 gap: the empty-plan prompt is outside the horizontal card strip, so it wraps at the largest text', async () => {
  await mount(start('Shell corner'));
  const prompt = root!.root.findAllByType('p').find((p) => p.children.join('') === 'Tap a command below to add it.')!;
  expect(prompt).toBeDefined();
  expect(inside(prompt, (n) => n.type === 'section' && n.props.horizontal === true)).toBe(false);
  expect(prompt.props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.5);
  // The strip comes back with the first card.
  let s = start('Shell corner');s = challengeEngine.step(s, ['a', 2], s.descriptor)!.state;
  await act(async () => root!.update(<ChallengeBoard state={s} dispatch={vi.fn()} active width={335} />));
  expect(lines()).not.toContain('Tap a command below to add it.');
  expect(root!.root.findByProps({ accessibilityLabel: 'Your program editor' }).props.horizontal).toBe(true);
});

it('A3 gap: the goal shows once, beside the beach, on School-beach dares, Mud and bug puzzles', async () => {
  for (const [title, goal] of [['Shell corner', 'Collect every shell, then reach home.'], ['Mud 2', 'Collect every shell, then reach home.'], ['Fix a bug 1', 'Find the bug. Tap any card to change it.']] as const) {
    await mount(start(title));
    const all = lines(), shown = all.filter((l) => /^Collect every shell|^Find the bug/.test(l));
    expect(shown, title).toEqual([goal]);
    // A lesson that is not the goal still shows (Mud and bug puzzles).
    const lesson = start(title).descriptor.lesson;
    if (lesson !== goal) expect(all, title).toContain(lesson);
    await act(async () => root!.unmount());root = undefined;
  }
});

it('largest text: a selected card\'s choice line, its four buttons and the command labels stop at 1.5×, keeping Replace in reach', async () => {
  let s = start('Shell corner');s = challengeEngine.step(s, ['a', 0], s.descriptor)!.state;
  await mount(s);
  await act(async () => root!.root.findAllByType('button').find((b) => b.props.accessibilityLabel?.startsWith('Card 1: Up.'))!.props.onPress());
  const line = root!.root.findAllByType('p').find((p) => p.children.join('').startsWith('Card 1: Up. Choose a command'))!;
  expect(line.props.maxFontSizeMultiplier).toBe(1.5);
  for (const name of ['Replace', 'Insert before', 'Remove card', 'Add at end']) {
    const b = root!.root.findAllByType('button').find((b) => b.children.join('') === name)!;
    expect(b.props.maxFontSizeMultiplier, name).toBe(1.5);
  }
  for (const name of ['Up', 'Right', 'Down', 'Left']) {
    const label = root!.root.findAllByType('p').find((p) => p.children.join('') === name)!;
    expect(label.props.maxFontSizeMultiplier, name).toBe(1.5);
  }
});

it('review: the Challenge strip marks the card a shown hint names, like the School board', async () => {
  const p = crabPuzzles.find((p) => p.title.startsWith('Fix a bug 1') && !p.retired)!;
  let s = challengeEngine.create(p.descriptor, { version: 1 }, { supportOff: false, ownRead: false });
  s = challengeEngine.step(s, ['h'], s.descriptor)!.state;
  await mount(s);
  await vi.waitFor(async () => { await act(async () => {}); expect(lines().some((l) => /^Change card \d+:/.test(l))).toBe(true); }, { timeout: 5000, interval: 20 });
  const at = Number(lines().find((l) => /^Change card \d+:/.test(l))!.match(/card (\d+)/)![1]);
  const marked = root!.root.findAllByType('button').filter((b) => String(b.props.accessibilityLabel).includes('the hint is about this card'));
  expect(marked).toHaveLength(1);expect(marked[0].props.accessibilityLabel).toMatch(new RegExp(`^Card ${at}: `));
  expect(marked[0].props.style.borderStyle).toBe('dashed');
});
