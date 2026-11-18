import React, { createContext, useState } from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { ChallengeBoard } from '../src/learn/games/crab-commands/challenge-view';
import { challengeEngine, type State } from '../src/learn/games/crab-commands/challenge-engine';
import { blockSolutions, deepPuzzles } from '../src/learn/games/crab-commands/challenge-content';
import { nodeCost, type Node, type Program } from '../src/learn/program/model';
import { programOperations } from '../src/learn/program/operations';
// The real ProgramEditor renders here: the hint is followed by pressing exactly the controls its words name.
vi.mock('react-native', () => ({ View: 'div', ScrollView: 'scroll', useWindowDimensions: () => ({ fontScale: 1 }), PanResponder: { create: (h: object) => ({ panHandlers: h }) } }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Copy: 'p', PressableScale: 'button', C: { ink: '#183F39', teal: '#246858', soft: '#E5EFE5', cream: '#FCFAF4', paper: '#FFF', line: '#DBE3DA' } }));
vi.mock('../src/content/learnAudio', () => ({ learnSources: {} }));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => true }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({ sound: false }), useSoundControls: () => ({ play: () => {}, stop: () => {} }) }));
vi.mock('../src/learn/games/crab-commands/view', () => ({ ArrowArt: () => null, Beach: 'beach', cardLabel: { forward: 'Walk', 'turn-left': 'Turn left', 'turn-right': 'Turn right' } }));

let tree: ReactTestRenderer | undefined;
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.unstubAllGlobals(); });
const text = (b: ReactTestInstance) => b.children.filter(c => typeof c === 'string' || typeof c === 'number').join('');
async function tap(b: ReactTestInstance | undefined, why: string) { expect(b, why).toBeDefined(); expect(b!.props.disabled, why).not.toBe(true); await act(async () => { await b!.props.onPress(); }); }
const buttons = () => tree!.root.findAllByType('button' as never);
const byText = (s: string) => buttons().find(b => text(b) === s || b.props.accessibilityLabel === s);
const block = (pos: string) => buttons().find(b => String(b.props.accessibilityLabel).startsWith(`Block in ${pos}:`));
const wrapper = (b: ReactTestInstance) => b.parent!.parent!;
const words = () => tree!.root.findAllByType('p' as never).map(text);

const W: Node = { kind: 'command', command: 4 };
const empty: Program = { version: 1, body: [], songs: [] };
const fill = (p: Program, tray: number): Program => ({ ...p, body: [...p.body, ...Array.from({ length: Math.max(0, tray - nodeCost(p)) }, () => W)] });
/** The first command in the plan (depth first) swapped for another card, or dropped. */
function mutate(p: Program, how: 'swap' | 'drop'): Program {
  let done = false;
  const go = (list: Node[]): Node[] => list.flatMap(n => {
    if (done) return [n];
    if (n.kind === 'command') { done = true; return how === 'drop' ? [] : [{ kind: 'command', command: n.command === 4 ? 5 : 4 } as Node]; }
    if (n.kind === 'repeat') return [{ ...n, body: go(n.body) }];
    if (n.kind === 'if') return [{ ...n, yes: go(n.yes), no: go(n.no) }];
    return [n];
  });
  const songs = p.songs.map(go);
  return { ...p, songs, body: go(p.body) };
}
/** Full, mistaken drafts a child could leave: every one fills the tray, and the editor accepted it. */
function drafts(p: (typeof deepPuzzles)[number]) {
  const tray = p.descriptor.tray!, witness = blockSolutions(p.descriptor)[0];
  return [
    { name: 'empty', program: empty },
    { name: 'all Walk', program: fill(empty, tray) },
    { name: 'card dropped, Walks after', program: fill(mutate(witness, 'drop'), tray) },
    { name: 'card swapped, Walks after', program: fill(mutate(witness, 'swap'), tray) },
  ];
}

async function ladder(p: (typeof deepPuzzles)[number], start: Program, name: string) {
  const fresh = challengeEngine.create(p.descriptor, { version: 1 }, { supportOff: false, ownRead: false });
  const first = start.body.length ? challengeEngine.step(fresh, ['e', programOperations(empty, start)], p.descriptor) : { state: fresh };
  expect(first, `${p.title} ${name}: the draft is one the editor accepts`).not.toBeNull();
  let latest: State = first!.state;
  function Harness() {
    const [s, set] = useState(first!.state); latest = s;
    const commit = (a: never) => { const n = challengeEngine.step(s, a, p.descriptor); if (n) set(n.state); return n; };
    return <ChallengeBoard state={s} dispatch={a => { commit(a as never); }} active width={335} sessionKey={'c1d' as never} commit={async a => { const n = commit(a as never); return n ? { state: n.state, key: 'c1d' } as never : null; }} />;
  }
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  await act(async () => { tree = create(<Harness />); });
  const lines: string[] = [];
  for (let i = 0; i < 40; i++) {
    if (byText('Help')) await tap(byText('Help'), 'Help');
    const line = words().find(s => /^(The tray is full|Build the group|Tap |Your group|Your blocks reach home)/.test(s));
    expect(line, `${p.title} ${name}: a hint is shown`).toBeDefined();
    lines.push(line!);
    if (line!.startsWith('Your blocks reach home')) break;
    const before = latest.blockDraft, said = line!.replace(/^The tray is full, so make room first\. /, '').replace(/^Build the group for Song 1 in the plan first\. /, '');
    let m: RegExpMatchArray | null;
    if (said.startsWith('Your group')) await tap(byText('Make plan a song'), said);
    else if ((m = said.match(/^Tap “(＋ [^”]+)”(.*), then tap (.+?)\.(?: The Repeat| Its two|$)/))) {
      const [, place, owner, tool] = m;
      let choices = buttons().filter(b => text(b) === place || b.props.accessibilityLabel === place);
      if (owner) { const w = wrapper(block(owner.replace(/^ in the If at |^ in /, ''))!); choices = choices.filter(b => { let at: ReactTestInstance | null = b; while (at && at !== w) at = at.parent; return at === w; }); }
      await tap(choices.at(-1), said);
      await tap(byText(tool === 'Walk' || tool.startsWith('Turn ') ? `Add ${tool} block` : tool), said);
    } else if ((m = said.match(/^Tap the Repeat at (.+), then tap ×(\d+)\.$/))) { await tap(block(m[1]), said); await tap(byText(`×${m[2]}`), said); }
    else if ((m = said.match(/^Tap (.+) \(.+\), then tap (.+)\.$/))) { await tap(block(m[1]), said); await tap(byText(m[2] === 'Remove block' ? 'Remove block' : `Replace with ${m[2].replace(' to replace it', '')} block`), said); }
    else throw new Error(`Unparsed hint: ${said}`);
    // Every step the hint names is one the editor accepts: the plan changes and is never refused.
    expect(words().join(' '), `${p.title} ${name}: ${said}`).not.toContain('Your plan is kept.');
    expect(latest.blockDraft, `${p.title} ${name}: ${said}`).not.toEqual(before);
  }
  await tap(byText('Go!'), 'Go!');
  expect(latest.won, `${p.title} ${name}: ${lines.join(' | ')}`).toBe(true);
  await act(async () => tree!.unmount()); tree = undefined;
  return lines;
}

it('fix round 2 P2-1: the reviewer\'s full Fog 1 tray reaches a helped win by following the words, making room first', async () => {
  const p = deepPuzzles.find(q => q.ref.bank === 15 && q.ref.puzzle === 0)!;
  const draft: Program = { version: 1, body: [{ kind: 'repeat', times: 2, body: [{ kind: 'if', condition: { kind: 'blocked' }, yes: [{ kind: 'command', command: 6 }], no: [] }] }, W, W], songs: [] };
  expect(nodeCost(draft)).toBe(p.descriptor.tray);
  const lines = await ladder(p, draft, 'reviewer draft');
  expect(lines[0]).toMatch(/^The tray is full, so make room first\. Tap plan, block 3 \(Walk\), then tap Remove block\.$/);
});

it('fix round 2 P2-1: from empty and from full mistaken drafts, every Songs and Fog hint is accepted and ends in a helped win', async () => {
  for (const p of deepPuzzles.filter(q => [14, 15].includes(q.ref.bank)))
    for (const { name, program } of drafts(p)) {
      if (name !== 'empty') expect(nodeCost(program), `${p.title} ${name}`).toBe(p.descriptor.tray);
      await ladder(p, program, name);
    }
}, 120_000);
