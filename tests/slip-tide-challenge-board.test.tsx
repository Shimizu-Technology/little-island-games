import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayfieldProps } from '../src/learn/games/slip-tide/field';
import { ChallengeBoard } from '../src/learn/games/slip-tide/challengeBoard';
import { HELP, ORDINARY_LIMIT, UNDO, puzzles, registration, type Action, type Payload, type State } from '../src/learn/games/slip-tide/challenge';
import { dirOf, dirs, gridOf, slideOn, type Dir } from '../src/learn/games/slip-tide/rules';
import type { ChallengeViewProps } from '../src/challenge/types';
import { emptyChallenge, type ChallengeSession } from '../src/state/challenge';

let field: PlayfieldProps;
vi.mock('../src/learn/games/slip-tide/field', () => ({ Playfield: (props: PlayfieldProps) => { field = props; return props.help ?? null; } }));
vi.mock('react-native', () => ({ View: 'section' }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Copy: 'p', Heading: 'h2' }));
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

/** A host that behaves like ChallengeFrame: revision-guarded commit through the real Slip Tide codec. */
function host(p = puzzles[0], dares: number[] = []) {
  let session: ChallengeSession = registration.start(p.ref, 'alex', 'c-1', emptyChallenge(), { supportOff: false, ownRead: false }, dares);
  const sent: Action[] = [], gates: (() => void)[] = [];
  let hold = false, reject = false, active = true, root: ReactTestRenderer | undefined;
  const keyOf = (s: ChallengeSession) => `alex:0:${s.id}:${s.revision}`;
  const props = () => (registration.render(session, () => { throw new Error('dispatch is not used with a host'); }, active, 340, { key: keyOf(session), onFresh: () => {}, commit }) as React.ReactElement<ChallengeViewProps<State, Action>>).props;
  async function commit(action: unknown, expected: string) {
    sent.push(action as Action);
    if (hold) await new Promise<void>(resolve => gates.push(resolve));
    if (reject || expected !== keyOf(session)) return null;
    const next = registration.move(session, action);
    if (!next) return null;
    session = next;
    root?.update(<ChallengeBoard {...props()} />);
    return { key: keyOf(session), session };
  }
  return {
    get session() { return session; }, sent, keyOf,
    mount: async () => { await act(async () => { root = create(<ChallengeBoard {...props()} />); }); return root!; },
    rerender: async () => { await act(async () => root!.update(<ChallengeBoard {...props()} />)); },
    holdCommits: () => { hold = true; }, rejectCommits: () => { reject = true; }, setActive: (v: boolean) => { active = v; },
    release: async () => { hold = false; await act(async () => { while (gates.length) { gates.shift()!(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); } }); },
    replace: (next: ChallengeSession) => { session = next; },
    unmount: async () => { if (root) await act(async () => root!.unmount()); },
    root: () => root!,
  };
}
const flush = () => act(async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); });
const text = (root: ReactTestRenderer) => JSON.stringify(root.toJSON());
const press = async (root: ReactTestRenderer, label: string) => act(async () => {
  const button = root.root.findAllByType('button' as never).find(b => b.children.join('') === label);
  expect(button, label).toBeDefined(); await button!.props.onPress();
});
const route = (p = puzzles[0]) => [...p.descriptor.puzzle.route].map(dirOf);

describe('R1: queued actions are checked against each accepted position and never retried', () => {
  it('drops a duplicate swipe that would move nothing, sends the next legal one, and never retries', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval'] });
    const p = puzzles[0], puzzle = p.descriptor.puzzle, g = gridOf(puzzle);
    const d = dirs.find(x => { const once = slideOn(g, puzzle.crabs, x); return once !== puzzle.crabs && slideOn(g, once, x) === once; })!;
    const after = slideOn(g, puzzle.crabs, d), another = dirs.find(x => x !== d && slideOn(g, after, x) !== after)!;
    const h = host(p); await h.mount(); h.holdCommits();
    let first = false, duplicate = true, legal = false;
    await act(async () => { first = field.onMove(d); duplicate = field.onMove(d); legal = field.onMove(another); });
    expect([first, duplicate, legal]).toEqual([true, false, true]);
    await h.release(); await flush();
    await act(async () => { vi.advanceTimersByTime(5000); });
    await flush();
    expect(h.sent).toEqual([d, another]);
    expect((h.session.payload as Payload).actions).toEqual([d, another]);
    await h.unmount();
  });
  it('drops the queue when a commit is rejected and sends nothing more', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval'] });
    const r = route(), h = host(); await h.mount(); h.holdCommits(); h.rejectCommits();
    await act(async () => { field.onMove(r[0]); field.onMove(r[1]); field.onMove(r[2]); });
    await h.release(); await flush();
    await act(async () => { vi.advanceTimersByTime(5000); });
    await flush();
    expect(h.sent).toEqual([r[0]]);
    expect((h.session.payload as Payload).actions).toEqual([]);
    await h.unmount();
  });
  it('drops queued swipes when the board becomes inactive or another revision arrives', async () => {
    const r = route(), h = host(); await h.mount(); h.holdCommits();
    await act(async () => { field.onMove(r[0]); field.onMove(r[1]); });
    h.setActive(false); await h.rerender();
    await h.release(); await flush();
    expect(h.sent).toEqual([r[0]]);
    h.setActive(true); await h.rerender();
    h.holdCommits();
    await act(async () => { field.onMove(r[1]); field.onMove(r[2]); });
    // A restore or switch replaces the accepted session with one this board did not commit.
    const restored = registration.start(puzzles[0].ref, 'alex', 'c-2', emptyChallenge(), { supportOff: false, ownRead: false }, []);
    h.replace(restored); await h.rerender();
    await h.release(); await flush();
    expect(h.sent).toEqual([r[0], r[1]]);
    expect(h.session.id).toBe('c-2');
    await h.unmount();
  });
});

describe('R2: help is saved before any cue, and is never silently dropped', () => {
  it('records Help before the first cue appears', async () => {
    const h = host(); const root = await h.mount();
    await press(root, 'Help'); await press(root, 'Look'); await flush();
    expect((h.session.payload as Payload).actions).toEqual([HELP]);
    expect(text(root)).toContain('Look at the');
    expect(field.cue?.focus[0]).toMatch(/^crab:/);
    await h.unmount();
  });
  for (const timing of ['hint ready before the swipes save', 'swipes save while the hint is found'] as const) it(`a Look asked behind queued swipes reveals nothing and records nothing (${timing})`, async () => {
    const p = puzzles[0], r = route(p), h = host(p, [p.dares[0].slot, p.dares[1].slot]); const root = await h.mount();
    await press(root, 'Help');
    h.holdCommits();
    await act(async () => { field.onMove(r[0]); field.onMove(r[1]); field.onMove(r[2]); });
    let asked!: Promise<void>;
    await act(async () => { asked = root.root.findAllByType('button' as never).find(b => b.children.join('') === 'Look')!.props.onPress(); await Promise.resolve(); });
    if (timing === 'hint ready before the swipes save') await flush();
    await h.release(); await act(async () => { await asked; }); await flush();
    // Help for the older position is refused or cancelled: no cue, no record.
    expect(text(root)).not.toContain('Look at the');
    expect(field.cue ?? null).toBeNull();
    expect((h.session.payload as Payload).actions).toEqual(r.slice(0, 3));
    expect(h.sent).not.toContain(HELP);
    if (timing === 'hint ready before the swipes save') {
      // Help stays available: asking again on the new position records Help, then shows the cue.
      await press(root, 'Look'); await flush();
      expect((h.session.payload as Payload).actions.at(-1)).toBe(HELP);
      expect(text(root)).toContain('Look at the');
      for (const d of r.slice(3)) { await act(async () => { field.onMove(d); }); await flush(); }
      expect(h.session.result?.event).toBe('helped');
    } else {
      // Finishing without any revealed help is honestly independent.
      for (const d of r.slice(3)) { await act(async () => { field.onMove(d); }); await flush(); }
      expect(h.session.result?.event).toBe('independent');
    }
    await h.unmount();
  });
  it('One step and Show me save Help, then play helped swipes; the finish is helped with no independent dares', async () => {
    const p = puzzles[0], h = host(p, [p.dares[0].slot, p.dares[1].slot]); const root = await h.mount();
    await press(root, 'Help'); await press(root, 'Look'); await press(root, 'Think'); await press(root, 'One step'); await flush();
    expect((h.session.payload as Payload).actions[0]).toBe(HELP);
    await press(root, 'Show me'); await flush();
    for (let i = 0; i < 80 && !h.session.result; i++) { await press(root, 'Next step'); await flush(); }
    expect(h.session.result).toMatchObject({ event: 'helped', dares: [] });
    expect((h.session.payload as Payload).actions.filter(a => a === HELP)).toHaveLength(1);
    await h.unmount();
  });
});

describe('R3: a slow hint for an old position or inactive board is cancelled', () => {
  // The Trench boards need hundreds of expansions off their route, so the search yields between slices.
  const deep = puzzles.filter(p => p.path === 'deep-water' && p.descriptor.puzzle.size === 7).at(-1)!;
  const offRoute = () => {
    const puzzle = deep.descriptor.puzzle, g = gridOf(puzzle), r = route(deep);
    return dirs.find(d => d !== r[0] && slideOn(g, puzzle.crabs, d) !== puzzle.crabs)!;
  };
  for (const change of ['position', 'inactive'] as const) it(`a ${change} change while Thinking leaves no cue and no saved help`, async () => {
    const h = host(deep); const root = await h.mount();
    await act(async () => { field.onMove(offRoute()); }); await flush();
    await press(root, 'Help');
    let asked!: Promise<void>;
    await act(async () => { asked = root.root.findAllByType('button' as never).find(b => b.children.join('') === 'Look')!.props.onPress(); await Promise.resolve(); });
    expect(text(root)).toContain('Finding a hint');
    if (change === 'position') await act(async () => { field.onUndo(); for (let i = 0; i < 5; i++) await Promise.resolve(); });
    else { h.setActive(false); await h.rerender(); }
    await act(async () => { await asked; await new Promise(r => setTimeout(r, 30)); });
    expect(h.sent).not.toContain(HELP);
    expect(field.cue ?? null).toBeNull();
    expect(text(root)).not.toContain('Look at the');
    await h.unmount();
  });
});

describe('R4: the board stops ordinary play exactly where the codec does', () => {
  it('accepts ordinary moves below the limit, then shows the notice, refuses them, and keeps Help', async () => {
    const p = puzzles[0], puzzle = p.descriptor.puzzle, g = gridOf(puzzle);
    const d = dirs.find(x => slideOn(g, puzzle.crabs, x) !== puzzle.crabs && !slideOn(g, puzzle.crabs, x).every(c => c === -1))!;
    let s = registration.start(p.ref, 'alex', 'c-1', emptyChallenge(), { supportOff: false, ownRead: false }, []);
    while ((s.payload as Payload).actions.length + 2 <= ORDINARY_LIMIT - 1) s = registration.move(registration.move(s, d)!, UNDO)!;
    const h = host(p); h.replace(s); const root = await h.mount();
    expect(field.notice).toBeUndefined();
    await act(async () => { expect(field.onMove(d)).toBe(true); }); await flush();
    expect((h.session.payload as Payload).actions).toHaveLength(ORDINARY_LIMIT);
    expect(field.notice).toContain('Help can still show the way');
    const sent = h.sent.length;
    await act(async () => { field.onUndo(); expect(field.canUndo).toBe(false); expect(field.onMove(d)).toBe(false); }); await flush();
    expect(h.sent).toHaveLength(sent);
    expect(registration.move(h.session, UNDO)).toBeNull();
    await press(root, 'Help'); await press(root, 'Look'); await flush();
    expect((h.session.payload as Payload).actions.at(-1)).toBe(HELP);
    await h.unmount();
  });
  it('the arrows refuse a swipe that would move nothing, before anything is sent', async () => {
    const p = puzzles[0], puzzle = p.descriptor.puzzle, blocked = dirs.find(d => slideOn(gridOf(puzzle), puzzle.crabs, d) === puzzle.crabs);
    const h = host(p); await h.mount();
    if (blocked !== undefined) await act(async () => { expect(field.onMove(blocked as Dir)).toBe(false); });
    expect(h.sent).toEqual([]);
    await h.unmount();
  });
});
