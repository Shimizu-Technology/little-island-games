import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { PuzzleHelp, type HintCommit, type HintSnapshot } from '../src/puzzles/ui/PuzzleHelp';
import { PickYourTide, PuzzleEnding } from '../src/puzzles/ui/PuzzleEnding';
import { WholeAnswerControls } from '../src/puzzles/ui/WholeAnswerControls';
import type { PublicHintRules } from '../src/puzzles/hints';
vi.mock('react-native', () => ({ View: 'section' }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Copy: 'p', Heading: 'h2' }));
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
let root: ReactTestRenderer;
afterEach(async () => { if (root) await act(async () => root.unmount()); });
const rules: PublicHintRules<number, number> = {
  draft: null,
  look: () => ({ text: 'Look at the next stepping stone.', focus: ['stone'] }), think: () => ({ text: 'Each step gets closer to shore.', focus: [] }),
  problem: start => ({ start, key: n => n, moves: n => [n + 1], apply: (_, a) => a, goal: n => n === 3, nodeBudget: 10 }), preserves: () => true,
};
const press = async (label: string) => act(async () => {
  const button = root.root.findAllByType('button').find(b => b.children.join('') === label);
  expect(button, label).toBeDefined(); expect(button!.props.disabled).not.toBe(true); await button!.props.onPress();
});
const text = () => JSON.stringify(root.toJSON());
it('keeps Help reachable on the first failed build run; each hint needs a tap; Show me finishes helped then offers a fresh puzzle', async () => {
  let snapshot: HintSnapshot<number> = { key: 'a:0:p:0', view: 0 }, revision = 0;
  const log: HintCommit<number>[] = [], fresh = vi.fn();
  const props = () => ({ snapshot, rules, kind: 'build-run' as const, failedRuns: 0, onFresh: fresh, commit });
  async function commit(event: HintCommit<number>, expected: string) {
    if (snapshot.key !== expected) return null;
    log.push(event); snapshot = { key: `a:0:p:${++revision}`, view: event.kind === 'step' ? event.action : snapshot.view };
    root.update(<PuzzleHelp {...props()} />); return snapshot;
  }
  await act(async () => { root = create(<PuzzleHelp {...props()} />); });
  expect(text()).not.toContain('Want a hint?'); await press('Help');
  await press('Look'); expect(log).toEqual([{ kind: 'help' }]); expect(text()).toContain('Look at the next');
  await press('Think'); expect(snapshot.view).toBe(0);
  await press('One step'); expect(snapshot.view).toBe(1); expect(log.filter(e => e.kind === 'step')).toHaveLength(1);
  await press('Show me'); expect(snapshot.view).toBe(1); expect(fresh).not.toHaveBeenCalled();
  await press('Next step'); expect(snapshot.view).toBe(2); expect(fresh).not.toHaveBeenCalled();
  await press('Next step'); expect(snapshot.view).toBe(3); expect(log.at(-1)).toEqual({ kind: 'step', action: 3, last: true });
  expect(text()).toContain('fresh one'); await press('Try another'); expect(fresh).toHaveBeenCalledOnce();
});
it('reveals nothing when marking help cannot be saved', async () => {
  await act(async () => { root = create(<PuzzleHelp snapshot={{ key: 'a', view: 0 }} rules={rules} kind="grid" failedRuns={0} commit={async () => null} onFresh={vi.fn()} />); });
  await press('Help'); await press('Look'); expect(text()).not.toContain('Look at the next'); expect(text()).toContain('Your draft is kept');
});
it('ignores a slow hint after learner switch/restore', async () => {
  let finish!: (value: HintSnapshot<number> | null) => void;
  const commit = vi.fn(() => new Promise<HintSnapshot<number> | null>(resolve => { finish = resolve; }));
  const props = { rules, kind: 'grid' as const, failedRuns: 0, commit, onFresh: vi.fn() };
  await act(async () => { root = create(<PuzzleHelp {...props} snapshot={{ key: 'a:0', view: 0 }} />); });
  await press('Help'); let pending: Promise<void>;
  await act(async () => { pending = root.root.findAllByType('button').find(b => b.children.join('') === 'Look')!.props.onPress(); await Promise.resolve(); });
  await act(async () => root.update(<PuzzleHelp {...props} snapshot={{ key: 'b:0', view: 2 }} />));
  await act(async () => { finish({ key: 'a:1', view: 0 }); await pending; });
  expect(text()).not.toContain('Look at the next');
});
it('retains a pending lock against rapid taps and stops all actions while inactive', async () => {
  let finish!: (value: HintSnapshot<number> | null) => void;
  const commit = vi.fn(() => new Promise<HintSnapshot<number> | null>(resolve => { finish = resolve; }));
  const props = { snapshot: { key: 'a', view: 0 }, rules, kind: 'grid' as const, failedRuns: 0, commit, onFresh: vi.fn() };
  await act(async () => { root = create(<PuzzleHelp {...props} />); }); await press('Help');
  const ask = root.root.findAllByType('button').find(b => b.children.join('') === 'Look')!.props.onPress;
  await act(async () => { ask(); ask(); await Promise.resolve(); }); expect(commit).toHaveBeenCalledOnce();
  await act(async () => root.update(<PuzzleHelp {...props} active={false} />));
  await act(async () => { finish({ key: 'a', view: 0 }); await Promise.resolve(); }); expect(text()).not.toContain('Look at the next');
});
it('gives equal tide choices, a one-tap Try another, and a quiet stop at puzzle four', async () => {
  const choose = vi.fn(), another = vi.fn(), rest = vi.fn();
  const props = { praise: 'You used both clues to seat the friends.', onChoose: choose, onAnother: another, onRest: rest };
  await act(async () => { root = create(<PuzzleEnding {...props} />); });
  const group = root.root.findByProps({ testID: 'tide-choices' }).findAllByType('button');
  expect(group.map(b => b.props.quiet)).toEqual([true, true, true]);
  expect(choose).not.toHaveBeenCalled(); await press('Harder'); expect(choose).toHaveBeenCalledExactlyOnceWith('harder');
  await press('Try another'); expect(another).toHaveBeenCalledOnce();
  await act(async () => root.update(<PuzzleEnding {...props} roundDone />));
  expect(text()).toContain('Four puzzles finished'); expect(text()).not.toContain('Try another'); await press('Back to the island'); expect(rest).toHaveBeenCalledOnce();
});
it('first-open samples make no placement or automatic choice', async () => {
  const choose = vi.fn();
  await act(async () => { root = create(<PickYourTide samples={[{ id: 'a', label: 'Shallow', sample: <p>Small puzzle</p> }, { id: 'b', label: 'Middle', sample: <p>Middle puzzle</p> }, { id: 'c', label: 'Deep', sample: <p>Deep puzzle</p> }]} onChoose={choose} />); });
  expect(choose).not.toHaveBeenCalled(); await press('Middle'); expect(choose).toHaveBeenCalledExactlyOnceWith('b');
});
it('whole controls keep the draft after a miss, and expose a fresh choice instead of narrowed options', async () => {
  const check = vi.fn(), variant = vi.fn();
  await act(async () => { root = create(<WholeAnswerControls canCheck incorrect needsVariant={false} onCheck={check} onVariant={variant} />); });
  expect(text()).toContain('Your answer is still here'); await press('Check'); expect(check).toHaveBeenCalledOnce();
  await act(async () => root.update(<WholeAnswerControls canCheck={false} incorrect needsVariant onCheck={check} onVariant={variant} />));
  await press('Try another'); expect(variant).toHaveBeenCalledOnce();
});
it('drops a Show me route after an ordinary draft edit and re-derives help', async () => {
  let snapshot: HintSnapshot<number> = { key: 'a:0', view: 0 }, revision = 0;
  const log: HintCommit<number>[] = [];
  const props = () => ({ snapshot, rules, kind: 'grid' as const, failedRuns: 0, onFresh: vi.fn(), commit });
  async function commit(event: HintCommit<number>, expected: string) {
    if (expected !== snapshot.key) return null;
    log.push(event); snapshot = { key: `a:${++revision}`, view: event.kind === 'step' ? event.action : snapshot.view };
    root.update(<PuzzleHelp {...props()} />); return snapshot;
  }
  await act(async () => { root = create(<PuzzleHelp {...props()} />); });
  await press('Help'); await press('Look'); await press('Think'); await press('One step'); await press('Show me');
  expect(text()).toContain('Next step');
  await act(async () => { snapshot = { key: 'a:external-edit', view: 2 }; root.update(<PuzzleHelp {...props()} />); });
  expect(text()).not.toContain('Next step'); expect(log.filter(e => e.kind === 'step')).toHaveLength(1);
  await press('Look'); await press('Think'); await press('One step'); expect(snapshot.view).toBe(3);
});
it('Show me checks an already filled draft through the helped finish callback', async () => {
  const commit = vi.fn(async (_event: HintCommit<number>, key: string) => ({ key, view: 3 }));
  await act(async () => { root = create(<PuzzleHelp snapshot={{ key: 'filled', view: 3 }} rules={rules} kind="grid" failedRuns={0} commit={commit} onFresh={vi.fn()} />); });
  await press('Help'); await press('Look'); await press('Think'); await press('One step');
  expect(text()).toContain('Check when you are ready'); await press('Show me');
  expect(commit).toHaveBeenLastCalledWith({ kind: 'finish' }, 'filled'); expect(text()).toContain('Try another');
});

it.each([[1, 0], [3, 0], [1, 1], [2, 4]])('F1/F2: entry draft %j never gets a free verdict from One step and can reach Show me', async (a, b) => {
  type Grid = number[];
  const grid: PublicHintRules<Grid, Grid> = {
    look: () => ({ text: 'Look at the boxes.', focus: [] }), think: () => ({ text: 'Make six.', focus: [] }),
    draft: { hasEntries: s => s.some(Boolean), complete: s => s.every(Boolean), opening: () => [0, 0], describe: s => ({ text: `One way: ${s.join(' + ')} = 6.`, focus: [] }) },
    preserves: (s, n) => s.every((v, i) => !v || v === n[i]),
    problem: start => ({ start, key: s => s.join(), moves: () => [[2, 4], [3, 3], [4, 2]], apply: (_, n) => n, goal: s => s.every(Boolean) && s[0] + s[1] === 6, nodeBudget: 20 }),
  };
  const commit = vi.fn(async (_e: HintCommit<Grid>, key: string) => ({ key, view: [a, b] }));
  const fresh = vi.fn();
  await act(async () => { root = create(<PuzzleHelp snapshot={{key:'grid',view:[a,b]}} rules={grid} kind="grid" failedRuns={0} commit={commit} onFresh={fresh}/>); });
  await press('Help'); await press('Look'); await press('Think'); await press('One step');
  expect(text()).not.toContain('Your draft is ready'); expect(text()).not.toContain('Try undo');
  expect(commit.mock.calls.every(([e]) => e.kind === 'help')).toBe(true);
  expect(text()).toContain('Show me');
  if (a === 1) { await press('Show me'); expect(text()).toContain('Try another'); await press('Try another'); expect(fresh).toHaveBeenCalledOnce(); }
});
it('F11: One step reports its terminal action accurately', async () => {
  const commit = vi.fn(async (_e: HintCommit<number>, key: string) => ({key,view:2}));
  await act(async () => { root = create(<PuzzleHelp snapshot={{key:'last',view:2}} rules={rules} kind="grid" failedRuns={0} commit={commit} onFresh={vi.fn()}/>); });
  await press('Help'); await press('Look'); await press('Think'); await press('One step');
  expect(commit.mock.calls.at(-1)?.[0]).toEqual({kind:'step',action:3,last:true}); expect(text()).not.toContain('Your turn to keep going');
});
it('F12/F16: Close clears highlight; child edits restore the ladder so Look and Think can be reread', async () => {
  const onCue=vi.fn(), props={rules,kind:'grid' as const,failedRuns:0,commit:async (_e: HintCommit<number>,key:string)=>({key,view:0}),onFresh:vi.fn(),onCue};
  await act(async()=>{root=create(<PuzzleHelp {...props} snapshot={{key:'a',view:0}}/>);});
  await press('Help');await press('Look'); expect(onCue.mock.calls.at(-1)?.[0]?.focus).toEqual(['stone']);
  await press('Close help');expect(onCue).toHaveBeenLastCalledWith(null);
  await press('Help');await press('Think');
  await act(async()=>root.update(<PuzzleHelp {...props} snapshot={{key:'a:edit',view:1}}/>));
  expect(text()).toContain('Look'); await press('Look'); expect(text()).toContain('Think');
});
it('F13: a refused choice sibling leaves a visible explanation', async()=>{
  await act(async()=>{root=create(<WholeAnswerControls canCheck={false} incorrect needsVariant onCheck={vi.fn()} onVariant={()=>false}/>);});
  await press('Try another'); expect(text()).toContain('No fresh puzzle');
});

it('F10: an immediate commit can beat the render for both help and its move',async()=>{
 let revision=0;const commit=vi.fn(async(_e:HintCommit<number>,_key:string)=>({key:`instant:${++revision}`,view:1}));
 await act(async()=>{root=create(<PuzzleHelp snapshot={{key:'instant:0',view:0}} rules={rules} kind="grid" failedRuns={0} commit={commit} onFresh={vi.fn()}/>);});
 await press('Help');await press('Look');
 // Supply the host's latest saved key for the next explicit rung, then withhold renders within One step.
 await act(async()=>root.update(<PuzzleHelp snapshot={{key:'instant:1',view:0}} rules={rules} kind="grid" failedRuns={0} commit={commit} onFresh={vi.fn()}/>));
 await press('Think');await act(async()=>root.update(<PuzzleHelp snapshot={{key:'instant:2',view:0}} rules={rules} kind="grid" failedRuns={0} commit={commit} onFresh={vi.fn()}/>));
 await press('One step');expect(text()).not.toContain('Your draft changed');expect(text()).toContain('Show me');expect(commit.mock.calls.at(-1)?.[0].kind).toBe('step');
});

it('F17: Show me reveals the same example for blank, wrong, partial and correct grids, without checking or changing a draft', async () => {
  const { sumHints, publicSumView } = await import('./helpers/puzzle-kit');
  const screens: string[] = [];
  for (const draft of [[0,0], [1,0], [3,0], [1,1], [2,4], [3,3]]) {
    const view = publicSumView({ target: 6, draft });
    const commit = vi.fn(async (_e: HintCommit<readonly number[]>, key: string) => ({ key, view }));
    await act(async () => { root = create(<PuzzleHelp snapshot={{ key: 'grid', view }} rules={sumHints} kind="grid" failedRuns={0} commit={commit} onFresh={vi.fn()} />); });
    await press('Help'); await press('Look'); await press('Think'); await press('One step');
    commit.mockClear(); await press('Show me');
    expect(commit).toHaveBeenCalledExactlyOnceWith({ kind: 'help' }, 'grid');
    expect(draft).toEqual(view.draft);
    expect(text()).toContain('One way: 2 + 4 = 6.');
    expect(text()).not.toContain('Puzzle solved'); expect(text()).not.toContain('Next step');
    screens.push(text());
    await act(async () => root.unmount());
  }
  expect(new Set(screens).size).toBe(1);
});
