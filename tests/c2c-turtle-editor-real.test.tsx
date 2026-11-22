import React, { createContext, useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { ChallengeBoard, editorRoom } from '../src/learn/games/turtle-draw/challenge-view';
import { challengeEngine, type Action, type BuildDescriptor, type State } from '../src/learn/games/turtle-draw/challenge-engine';
import { turtlePuzzles } from '../src/learn/games/turtle-draw/challenge-content';
import { deepCodes } from '../src/learn/games/turtle-draw/program';
import { decodeProgram } from '../src/learn/program/codec';
vi.mock('react-native', () => ({ View: 'div', ScrollView: 'scroll', useWindowDimensions: () => ({ width: 393, height: 852, fontScale: 1 }), PanResponder: { create: (handlers: object) => ({ panHandlers: handlers }) } }));
vi.mock('react-native-svg', () => ({ default: 'svg', Circle: 'circle', Path: 'path', Rect: 'rect', Text: 'text' }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Copy: 'p', PressableScale: 'button', C: { ink: '#183F39', teal: '#246858', soft: '#E5EFE5', paper: '#FFF', cream: '#FCFAF4', line: '#DBE3DA' } }));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => true }));
vi.mock('../src/content/learnAudio', () => ({ learnSources: {} }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({ sound: true }), useSoundControls: () => ({ play: vi.fn(), stop: vi.fn() }) }));
vi.mock('../src/challenge/registry.generated', () => ({ challengeEntries: [] }));
let tree: ReactTestRenderer | undefined;
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.unstubAllGlobals(); });
const label = (b: { props: Record<string, unknown>; children: unknown[] }) => b.props.accessibilityLabel ?? b.props.label ?? b.children.filter(c => typeof c === 'string' || typeof c === 'number').join('');
const find = (name: string) => tree!.root.findAllByType('button').find(b => label(b) === name);
const press = async (name: string) => act(async () => { const b = find(name); expect(b, name).toBeDefined(); expect(b!.props.disabled, `${name} enabled`).not.toBe(true); await b!.props.onPress(); });
const d = turtlePuzzles.find(p => p.descriptor.kind === 'build')!.descriptor as BuildDescriptor;

/** The frame's own contract, reduced: every accepted action replays through the real engine, bumps the revision and re-keys the session. */
async function mount() {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const seen: { revision: number; state: State }[] = [];
  function Frame() {
    const [round, setRound] = useState<{ state: State; revision: number }>({ state: challengeEngine.create(d, { version: 1 }, { supportOff: false, ownRead: false }), revision: 0 });
    const key = `owner:1:round:${round.revision}`;
    seen.push({ revision: round.revision, state: round.state });
    const commit = async (action: Action, expected: string) => {
      if (expected !== key) return null;
      const next = challengeEngine.step(round.state, action, d);
      if (!next) return null;
      const accepted = { state: next.state, revision: round.revision + 1 };
      setRound(accepted);
      return { key: `owner:1:round:${accepted.revision}`, state: next.state };
    };
    return <ChallengeBoard state={round.state} dispatch={() => undefined} active width={353} sessionKey={key} commit={commit} />;
  }
  await act(async () => { tree = create(<Frame />); });
  return seen;
}
const body = (s: State) => decodeProgram(s.draft!, c => c < deepCodes.length)!.body;

it('P0-1: with the session key moving on every edit, Repeat then a card lands inside the Repeat, and Undo works', async () => {
  const seen = await mount();
  await press('Add Repeat 2 times');
  const afterRepeat = seen.at(-1)!;
  expect(afterRepeat.revision).toBe(1);
  expect(body(afterRepeat.state)).toEqual([{ kind: 'repeat', times: 2, body: [] }]);
  await press('Add Forward 40 block');
  const inside = seen.at(-1)!;
  expect(inside.revision).toBe(2);
  // The card went inside the Repeat, as the editor told the child it would; the target did not snap back to "End of plan".
  expect(body(inside.state)).toEqual([{ kind: 'repeat', times: 2, body: [{ kind: 'command', command: 12 }] }]);
  await press('Add Turn 72° block');
  expect(body(seen.at(-1)!.state)).toEqual([{ kind: 'repeat', times: 2, body: [{ kind: 'command', command: 12 }, { kind: 'command', command: 15 }] }]);
  // Undo history survived three re-keyed revisions.
  expect(find('Undo block edit')!.props.disabled).toBe(false);
  await press('Undo block edit');
  expect(body(seen.at(-1)!.state)).toEqual([{ kind: 'repeat', times: 2, body: [{ kind: 'command', command: 12 }] }]);
  await press('Redo block edit');
  expect(body(seen.at(-1)!.state)[0]).toMatchObject({ kind: 'repeat', body: [{ command: 12 }, { command: 15 }] });
});

it('P1-4: the editor gets the column in landscape and most of the screen stacked, and the new Deep Water cards come before the pen colours', async () => {
  expect(editorRoom(744, true)).toBe(554); expect(editorRoom(393, true)).toBe(420); expect(editorRoom(852, false)).toBe(596); expect(editorRoom(1133, false)).toBe(640); expect(editorRoom(600, false)).toBe(420);
  await mount();
  const names = tree!.root.findAllByType('button').map(label).filter(n => /^Add .* block$/.test(String(n)));
  const at = (n: string) => names.indexOf(`Add ${n} block`);
  for (const step of ['Forward 40', 'Forward 50', 'Turn 40°', 'Turn 72°', 'Turn 144°', 'Grow +10']) expect(at(step), step).toBeGreaterThanOrEqual(0);
  for (const step of ['Forward 40', 'Forward 50', 'Turn 40°', 'Turn 72°', 'Turn 144°', 'Grow +10']) for (const pen of ['coral pen', 'teal pen', 'gold pen']) expect(at(step)).toBeLessThan(at(pen));
  expect(deepCodes[12]).toEqual({ kind: 'forward', n: 40 }); expect(deepCodes[17]).toEqual({ kind: 'grow' });
  const editor = tree!.root.findByProps({ testID: 'program-editor' });
  expect(editor.props.style.maxHeight).toBe(596);
});
