import React, { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PlayfieldProps } from '../src/learn/games/slip-tide/field';
import { SchoolBoard } from '../src/learn/games/slip-tide/schoolBoard';
import { startRound, validSlip, type SlipState } from '../src/learn/games/slip-tide/engine';
import { requestHint, type PublicHintRules } from '../src/puzzles/hints';
import { dirOf, dirs, gridOf, slideOn, tuplePuzzle } from '../src/learn/games/slip-tide/rules';
import type { BoardProps } from '../src/learn/types';

let field: PlayfieldProps;
vi.mock('../src/learn/games/slip-tide/field', () => ({ Playfield: (props: PlayfieldProps) => { field = props; return props.finished ?? props.help ?? null; } }));
vi.mock('react-native', () => ({ View: 'section' }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Copy: 'p', Heading: 'h2', C: { ink: '#000' } }));
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
afterEach(() => { vi.unstubAllGlobals(); });

const rng = (() => { let x = 5; return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; })();
function harness(initial: SlipState) {
  const log: string[] = [], states: SlipState[] = [initial];
  let active = true, set!: (s: SlipState) => void;
  function Host() {
    const [state, setState] = useState(initial);
    set = setState;
    const props = { session: { state, options: { mode: 'solo', pace: 'easy', stage: 'deep' }, names: undefined }, active, width: 340, height: 760,
      update: (s: SlipState) => { log.push('update'); states.push(s); setState(s); }, practice: () => log.push('practice'), assistance: () => log.push('assistance'),
      cheer: () => {}, sound: () => {}, stopSound: () => {}, soundOn: false, skills: {}, coach: { active: false, done: () => {} } } as unknown as BoardProps<SlipState>;
    return <SchoolBoard {...props} />;
  }
  let root!: ReactTestRenderer;
  return { log, states, mount: async () => { await act(async () => { root = create(<Host />); }); return root; }, setActive: (v: boolean) => { active = v; }, replace: (s: SlipState) => act(async () => set(s)), unmount: () => act(async () => root.unmount()) };
}
const flush = () => act(async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); });
const press = async (root: ReactTestRenderer, label: string) => act(async () => {
  const button = root.root.findAllByType('button' as never).find(b => b.children.join('') === label);
  expect(button, label).toBeDefined(); await button!.props.onPress();
});
const text = (root: ReactTestRenderer) => JSON.stringify(root.toJSON());

it('School help marks the round helped before the first cue, and One step is a real helped swipe', async () => {
  const s = startRound(5, rng), h = harness(s), root = await h.mount();
  await press(root, 'Help'); await press(root, 'Look'); await flush();
  expect(h.log.slice(0, 2)).toEqual(['assistance', 'update']);
  expect(h.states.at(-1)!.helped).toBe(true);
  expect(text(root)).toContain('Look at the');
  await press(root, 'Think'); await press(root, 'One step'); await flush();
  const last = h.states.at(-1)!, first = dirOf(tuplePuzzle(s.puzzles[0])!.route[0]);
  expect(last.steps).toBe(1);
  expect(validSlip(last)).toBe(true);
  expect(last.crabs).not.toEqual(s.crabs);
  expect(first).toBeGreaterThanOrEqual(0);
  expect(h.log).not.toContain('practice');
  await h.unmount();
});
it('a Show me route never applies to a position the child changed', async () => {
  const s = startRound(5, rng), h = harness(s), root = await h.mount();
  await press(root, 'Help'); await press(root, 'Look'); await press(root, 'Think'); await press(root, 'One step'); await flush();
  await press(root, 'Show me'); await flush();
  expect(text(root)).toContain('Next step');
  const before = h.states.length, board = tuplePuzzle(s.puzzles[0])!;
  const at = h.states.at(-1)!.crabs, own = dirs.find(d => slideOn(gridOf(board), at, d) !== at)!;
  let moved = false;
  await act(async () => { moved = field.onMove(own); }); await flush();
  expect(moved).toBe(true);
  expect(text(root)).not.toContain('Next step');
  expect(h.states.length).toBe(before + 1);
  await h.unmount();
});
it('Show me plays one helped swipe per tap to a helped finish, then offers a fresh board', async () => {
  const s = startRound(2, rng), h = harness(s), root = await h.mount();
  await press(root, 'Help'); await press(root, 'Look'); await press(root, 'Think'); await press(root, 'One step'); await flush();
  if (!h.states.at(-1)!.crabs.every(c => c === -1)) {
    await press(root, 'Show me'); await flush();
    for (let i = 0; i < 20 && text(root).includes('Next step'); i++) { await press(root, 'Next step'); await flush(); }
  }
  expect(h.states.at(-1)!.crabs.every(c => c === -1)).toBe(true);
  expect(text(root)).toContain('A helped finish counts too');
  await press(root, 'Try a fresh one');
  const fresh = h.states.at(-1)!;
  expect(fresh.puzzles[0]).not.toEqual(s.puzzles[0]);
  expect(fresh.steps).toBe(0);
  await h.unmount();
});

it('shared hints: a sliding board gets Look and Think from the exact route, and an invalid stored route falls back to search', async () => {
  // A one-dimensional path: positions 0..4, goal 4. `known` lies; the real rules reject it and search instead.
  const base: PublicHintRules<number, number> = {
    draft: null, look: () => ({ text: 'generic', focus: [] }), think: () => ({ text: 'generic', focus: [] }), preserves: () => true,
    problem: start => ({ start, key: n => n, moves: n => (n < 4 ? [1] : []), apply: (n, a) => Math.min(4, n + a), goal: n => n === 4, nodeBudget: 50 }),
  };
  const routed: PublicHintRules<number, number> = { ...base, known: () => [1, 1, 1, 1, 1, 1, 1], routeCue: (v, step, route) => ({ text: `${step}:${v}:${route.length}`, focus: [] }) };
  const signal = new AbortController().signal, now = async () => {};
  expect(await requestHint(base, 1, 'look', signal, now)).toEqual({ status: 'cue', cue: { text: 'generic', focus: [] } });
  expect(await requestHint(routed, 1, 'look', signal, now)).toEqual({ status: 'cue', cue: { text: 'look:1:3', focus: [] } });
  expect(await requestHint(routed, 1, 'show-me', signal, now)).toEqual({ status: 'route', actions: [1, 1, 1], last: false });
  const stuck: PublicHintRules<number, number> = { ...routed, problem: start => ({ ...base.problem(start), moves: () => [] }) };
  expect(await requestHint(stuck, 1, 'think', signal, now)).toEqual({ status: 'unavailable' });
  const aborted = new AbortController(); aborted.abort();
  expect(await requestHint(routed, 1, 'look', aborted.signal, now)).toEqual({ status: 'cancelled' });
});
