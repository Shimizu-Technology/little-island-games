import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { ChallengeFrame } from '../src/challenge/ChallengeFrame';
import { StoreProvider, useStore } from '../src/state/Store';
import { registerSaveContent, emptyChallenge } from '../src/state/challenge';
import { catalogManifest } from '../src/state/catalogManifest';
import { emptySave } from '../src/state/validation';
import { addLearner } from '../src/learn/learners';
import { engine, puzzle, type Action, type Payload } from './helpers/challenge-replay';
import { completedSignal } from '../src/challenge/offers';
import { defineReplayGame } from '../src/challenge/replay';
import * as challengeCatalog from '../src/challenge/catalog';
import type { ChallengeEntry, ChallengeViewProps } from '../src/challenge/types';
import { migrateProfiles, encodeSave } from '../src/state/profiles';
import { putProgress } from '../src/state/challengeDrafts';
import { PuzzleHelp } from '../src/puzzles/ui/PuzzleHelp';
import type { PublicHintRules } from '../src/puzzles/hints';
import { mazeRoute, mazeMove, mazeDone, directions, type MazeState } from '../src/games/maze';
import { choiceAnswerEngine, answerMissed, type ChoiceAction, type ChoiceState, type AnswerRules } from '../src/puzzles/wholeAnswer';
import { WholeAnswerControls } from '../src/puzzles/ui/WholeAnswerControls';
import { jsonBytes } from '../src/state/saveBits';
const db = vi.hoisted(() => ({ raw: null as string | null }));
vi.mock('../src/state/storage', () => ({ storage: { get: async () => db.raw, set: async (raw: string) => { db.raw = raw; }, preserve: async () => {}, writeDraft: async () => {}, discardSession: async () => {} } }));
vi.mock('react-native', () => ({ ScrollView: 'section', View: 'div', useWindowDimensions: () => ({ width: 320, height: 667 }), AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'main', useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
vi.mock('expo-router', () => ({ useIsFocused: () => true, router: { canGoBack: () => false, replace: vi.fn() } }));
vi.mock('../src/components/ui', () => ({ Button: 'button', Chip: 'button', Heading: 'h2', Copy: 'p', ToggleRow: 'switch', styles: {} }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}), useSoundControls: () => ({ play: () => {} }) }));
vi.mock('../src/components/Settings', () => ({ Settings: () => null }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
vi.mock('../src/personalization/LearnerChip', () => ({ LearnerChip: () => null }));
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
let store: ReturnType<typeof useStore>, root: ReactTestRenderer;
function Probe() { const s = useStore(); useLayoutEffect(() => { store = s; }, [s]); return null; }
function Ready({ entry }: { entry: ChallengeEntry }) { const s = useStore(); return s.ready ? <ChallengeFrame entry={entry} /> : null; }
afterEach(async () => { if (root) await act(async () => root.unmount()); vi.restoreAllMocks(); });
const labels = () => root.root.findAllByType('button').map(b => b.children.filter(c => typeof c === 'string').join(''));
const text = () => JSON.stringify(root.toJSON());
const press = async (label: string) => act(async () => { const b = root.root.findAllByType('button').find(b => b.children.join('') === label); expect(b, `${label}: ${text()}`).toBeDefined(); expect(b!.props.disabled).not.toBe(true); await (b!.props.onPress ?? b!.props.onClick)(); });
async function mount(entry: ChallengeEntry, progress = emptyChallenge(), comfort = {}) {
  registerSaveContent(entry.catalog, catalogManifest(entry.catalog));
  const save = migrateProfiles({ ...emptySave(), learning: addLearner(undefined, 'A', 'a') });
  save.settings.learningComfort = { a: { offers: true, youngChild: false, opening: 1, ...comfort } };
  db.raw = encodeSave(putProgress(save, 'a', progress));
  vi.spyOn(challengeCatalog, 'challengeFor').mockReturnValue(entry);
  await act(async () => { root = create(<StoreProvider><Probe /><Ready entry={entry} /></StoreProvider>); });
  await press('Start this puzzle');
}
const hints: PublicHintRules<MazeState, number> = {
  draft: null,
  look: () => ({ text: 'Look at the open paths.', focus: ['path'] }), think: () => ({ text: 'Follow a path home.', focus: [] }), preserves: () => true,
  problem: start => ({ start, key: s => s.path.at(-1)!, apply: mazeMove, goal: mazeDone, nodeBudget: 100,
    moves: s => directions.flatMap(d => { const cell = s.path.at(-1)!, r = Math.floor(cell / s.size) + d.dr, c = cell % s.size + d.dc; return !(s.walls[cell] & d.bit) && r >= 0 && c >= 0 && r < s.size && c < s.size ? [r * s.size + c] : []; }) }),
};
type LadderAction = Action | {type:'demo';cell:number};
const ladderEngine = {...engine, validAction:(v:unknown):v is LadderAction=>engine.validAction(v)||!!v&&typeof v==='object'&&(v as LadderAction).type==='demo'&&Number.isInteger((v as {cell?:number}).cell),step:(s:ReturnType<typeof engine.create>,a:LadderAction,d:{seed:number})=>engine.step(s,a.type==='demo'?{type:'move',cell:a.cell}:a,d)};
function Board({ state, sessionKey, commit, active }: ChallengeViewProps<ReturnType<typeof engine.create>, LadderAction>) {
  return <><button onClick={() => void commit?.({ type: 'move', cell: mazeRoute(state.board)[1] }, sessionKey!)}>Move</button>
    <button onClick={async () => { let accepted = await commit?.({ type: 'move', cell: mazeRoute(state.board)[1] }, sessionKey!); while (accepted && !mazeDone(accepted.state.board)) accepted = await commit?.({ type: 'move', cell: mazeRoute(accepted.state.board)[1] }, accepted.key); if (accepted) await commit?.({ type: 'check' }, accepted.key); }}>Solve</button>
    <PuzzleHelp snapshot={{ key: sessionKey!, view: state.board }} rules={hints} active={active} kind="grid" failedRuns={0} onFresh={() => {}} commit={async (e, key) => {
      const a: LadderAction = e.kind === 'step' ? { type: 'demo', cell: e.action } : e.kind === 'finish' ? { type: 'check' } : { type: 'help' };
      let next = await commit?.(a, key);
      if (e.kind === 'step' && e.last && next) next = await commit?.({ type: 'check' }, next.key);
      return next ? { key: next.key, view: next.state.board } : null;
    }} />
  </>;
}
function makeEntry(count = 3, completionText?: ChallengeEntry['completionText']) {
  return defineReplayGame({ game: 'fix-proof', codec: `fix-proof-${count}-v1`, context: 'fixproof', cove: true, budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 }, engine:ladderEngine, Board,
    assistance:{idempotentHelp:true,bytes:1600,actions:48,isAction:(a:LadderAction)=>a.type==='help'||a.type==='demo'},
    helpUI: 'board', completionText, objectives: ['shell'],
    puzzles: Array.from({ length: count }, (_, i) => ({ ...puzzle, dares: [], awards: [null, null] as const, par: undefined, ref: { ...puzzle.ref, engine: 'fix-proof', bank: 450 + count, puzzle: i, hash: String(i + 1).repeat(64) }, source: { kind: 'endless' as const, bank: 450 + count, puzzle: i }, title: `Maze ${i}` })),
    controls: { help: () => ({ type: 'help' } as Action), reset: () => ({ type: 'reset' } as Action) } });
}
it('F5/F10: one real ladder in the frame; opening it records nothing; immediate durable writes allow One step', async () => {
  await mount(makeEntry());
  expect(labels().filter(l => l === 'Help')).toHaveLength(1);
  await press('Help'); expect((store.save.challenge!.paused[0].payload as Payload).actions).toEqual([]);
  await press('Look'); await press('Think'); await press('One step');
  expect(text()).not.toContain('Your draft changed'); expect(labels()).toContain('Show me');
  expect((store.save.challenge!.paused[0].payload as Payload).actions.filter(a => (a as LadderAction).type === 'demo')).toHaveLength(1);
});
it('F3: one offer replaces directions, and dismissing it does not reveal another offer in that round', async () => {
  const prior = completedSignal(emptyChallenge(), 'fixproof-1', true, true);
  const e = makeEntry();
  // There is a higher tide so the real two-clean signal proposes a stretch.
  e.puzzles = e.puzzles.map((p, i) => ({ ...p, tier: i === 2 ? 2 : 1 }));
  await mount(e, prior); await press('Solve');
  expect(text()).toContain('Want something harder?'); expect(labels()).not.toContain('Harder');
  expect(labels()).not.toContain('Another puzzle'); expect(labels()).not.toContain('Easier choice · Levels 1–5');
  await press('Stay here'); expect(labels()).not.toContain('Harder'); expect(labels()).toContain('Try another');
});
it.each([{ offers: false }, { youngChild: true }])('F3: comfort %j leaves plain replay without direction prompts', async comfort => {
  await mount(makeEntry(), emptyChallenge(), comfort); await press('Solve');
  expect(labels()).not.toContain('Harder'); expect(labels()).not.toContain('Easier'); expect(labels()).not.toContain('Same'); expect(labels()).toContain('Try another');
});
it('F4: saved endings rotate the whole tier, including after remount, without carrying dares', async () => {
  const e = makeEntry(4); await mount(e); const seen: number[] = [];
  for (let i = 0; i < 8; i++) { seen.push(store.save.challenge!.paused[0].puzzle.puzzle); await press('Solve'); await press('Try another'); }
  expect(seen).toEqual([0, 1, 2, 3, 0, 1, 2, 3]); expect(store.save.challenge!.paused[0].selectedDares).toEqual([]);
  await act(async () => root.unmount());
  await act(async () => { root = create(<StoreProvider><Probe /><Ready entry={e} /></StoreProvider>); });
  await press('Solve'); await press('Try another'); expect(store.save.challenge!.paused[0].puzzle.puzzle).toBe(1);
});
it('F4: a one-card tier opens the chooser and does not redeal the demonstration', async () => {
  await mount(makeEntry(1)); await press('Solve'); await press('Try another');
  expect(store.save.challenge!.paused).toEqual([]); expect(labels()).toContain('Start this puzzle');
});
it('F7: a saved helped finish receives honest outcome-dependent praise', async () => {
  const praise = vi.fn((_ref, _result, facts) => facts?.helpUsed ? 'You watched the path reach home.' : 'You connected the path home.');
  await mount(makeEntry(3, praise)); await press('Help'); await press('Look'); await press('Solve');
  expect(text()).toContain('You watched the path reach home.'); expect(praise.mock.calls.at(-1)?.[1]?.event).toBe('helped'); expect(praise.mock.calls.at(-1)?.[2]).toEqual({helpUsed:true,failed:false});
  expect(store.save.challenge!.recent).toEqual([[453, 0]]);
});
it('F9: a full ordinary draft reserves saved help and a whole bounded demonstration', async () => {
  // Same maze engine, explicit assisted move wrapper; no new save fields or trusted result.
  type Assisted = Action | { type: 'demo'; cell: number };
  const assistEngine = { ...engine, validAction: (v: unknown): v is Assisted => engine.validAction(v) || !!v && typeof v === 'object' && (v as Assisted).type === 'demo' && Number.isInteger((v as {cell?:number}).cell),
    step: (s: ReturnType<typeof engine.create>, a: Assisted, d: {seed:number}) => engine.step(s, a.type === 'demo' ? { type: 'move', cell: a.cell } : a, d) };
  const e = defineReplayGame({ game: 'budget-proof', codec: 'budget-proof-v1', context: 'budget', cove: true, budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 }, engine: assistEngine, Board: () => null, objectives: ['shell'],
    assistance: { idempotentHelp:true, bytes: 1600, actions: 48, isAction: (a: Assisted) => a.type === 'help' || a.type === 'demo' },
    puzzles: [{ ...puzzle, ref: { ...puzzle.ref, engine: 'budget-proof', bank: 437 }, source: { kind: 'endless', bank: 437, puzzle: 0 }, dares: [], awards: [null, null] }], controls: { help: () => ({ type: 'help' } as Assisted), reset: () => ({ type: 'reset' } as Assisted) } });
  let s = e.start(e.puzzles[0].ref, 'a', 'budget-1', emptyChallenge(), { supportOff: false, ownRead: false }, []);
  const first = engine.create({seed:1},{seed:1},{supportOff:false,ownRead:false}).board, cell = mazeRoute(first)[1];
  for (let i = 0; i < 512; i++) { const n = e.move(s, { type: 'move', cell: i % 2 ? 0 : cell }); if (!n) break; s = n; }
  expect(jsonBytes(s)).toBeLessThanOrEqual(4096 - 1600);
  s = e.move(s, {type:'help'})!; expect(s).not.toBeNull();
  const count=(s.payload as {actions:Assisted[]}).actions.length;
  for(let i=0;i<600;i++)s=e.move(s,{type:'help'})!;
  expect((s.payload as {actions:Assisted[]}).actions).toHaveLength(count);
  // Reconstruct exact current draft using the registered real maze engine.
  let board = first;
  for (const a of (s.payload as { actions: Assisted[] }).actions) if (a.type === 'move' || a.type === 'demo') board = mazeMove(board, a.cell);
  for (const next of mazeRoute(board).slice(1)) s = e.move(s, {type:'demo',cell:next})!;
  s = e.move(s, {type:'check'})!; expect(s.result?.event).toBe('helped'); expect(jsonBytes(s)).toBeLessThanOrEqual(4096);
});

it('F6/F8: choice miss, neutral sibling, serialized pause and finish replay as one helped attempt',async()=>{
 const rules:AnswerRules<number,number[],number[]>={initial:()=>[0,0],valid:d=>d.length===2&&d.every(n=>Number.isInteger(n)&&n>=0&&n<=6),edit:(_,a)=>a,complete:d=>d.every(Boolean),accepts:(d,p)=>d[0]+d[1]===p};
 const engine=choiceAnswerEngine(rules,(v):v is number[]=>Array.isArray(v)&&rules.valid(v,6));
 function ChoiceBoard({state,dispatch}:ChallengeViewProps<ChoiceState<number[]>,ChoiceAction<number[]>>){return <>
  <p>{state.puzzleId}</p><button onClick={()=>dispatch({type:'edit',action:[1,1]})}>Wrong pair</button><button onClick={()=>dispatch({type:'edit',action:[2,4]})}>Six pair</button>
  <WholeAnswerControls canCheck={!state.answer.needsVariant} incorrect={answerMissed(state.answer)} needsVariant={state.answer.needsVariant} onCheck={()=>dispatch({type:'check'})} onVariant={()=>dispatch({type:'variant'})}/>
 </>;}
 const e=defineReplayGame({game:'choice-proof',codec:'choice-proof-v1',context:'choiceproof',cove:true,budget:{wrapper:700,draft:3396,undo:0,audit:0},engine,Board:ChoiceBoard,controls:{help:()=>({type:'help'} as const),reset:()=>({type:'reset'} as const)},puzzles:[{...puzzle,ref:{...puzzle.ref,engine:'choice-proof',bank:436},source:{kind:'endless',bank:436,puzzle:0},descriptor:{siblings:[{id:'five',skill:'add',puzzle:5},{id:'six',skill:'add',puzzle:6}]},dares:[],awards:[null,null]}]});
 await mount(e);await press('Wrong pair');await press('Check');expect(text()).toContain('Not quite yet');
 await press('Try another');expect(text()).not.toContain('Not quite yet');expect(text()).toContain('six');
 const original=store.save.challenge!.paused[0];expect(original.puzzle.puzzle).toBe(0);
 await act(async()=>{await store.retry();root.unmount();});await act(async()=>{root=create(<StoreProvider><Probe/><Ready entry={e}/></StoreProvider>);});
 expect(store.save.challenge!.paused[0]).toEqual(original);await press('Six pair');expect(text()).not.toContain('Not quite yet');await press('Check');
 expect(store.save.challenge!.paused).toEqual([]);expect(store.save.challenge!.signals[0][1]).toBe('h');expect(text()).toContain('Puzzle solved!');
});
it.each([[1,0],[3,0],[1,1],[2,4],[3,3]])('F1/F2/F6/F17/F20: real frame draft %i + %i stays neutral, keeps its entries, and offers a fresh sibling',async(left,right)=>{
 const {publicSumView,sumHints,sumRules}=await import('./helpers/puzzle-kit');
 type GridAction={type:'edit'|'demo';draft:readonly number[]}|{type:'check'|'help'|'reset'};
 type GridState=import('../src/puzzles/wholeAnswer').AnswerState<readonly number[]>;
 const {answerStart,answerCheck,answerEdit,answerHelp}=await import('../src/puzzles/wholeAnswer');
 const gridEngine:import('../src/challenge/types').ReplayEngine<number,number,GridAction,GridState>={
  initial:d=>d,validInitial:(v,d):v is number=>v===d,create:d=>answerStart(sumRules,d),
  validAction:(v):v is GridAction=>!!v&&typeof v==='object'&&['edit','demo','check','help','reset'].includes((v as GridAction).type),
  step:(s,a,d)=>{
   if(a.type==='edit'||a.type==='demo'){const next=answerEdit(sumRules,d,s,a.draft);return next===s?null:{state:next,event:'edit'};}
   if(a.type==='check'){const next=answerCheck(sumRules,d,s);return next===s?null:{state:next,event:'check',correct:next.solved};}
   return {state:answerHelp(s),event:'help'};
  },inspect:s=>({solved:s.solved,metrics:{},edits:s.revision,solution:null,objectives:[]}),
 };
 function GridBoard({state,dispatch,commit,sessionKey,onFresh}:ChallengeViewProps<GridState,GridAction>){return <>
  <button onClick={()=>dispatch({type:'edit',draft:[left,right]})}>Enter left</button><button onClick={()=>dispatch({type:'edit',draft:[1,1]})}>Enter wrong pair</button><button onClick={()=>dispatch({type:'edit',draft:[2,4]})}>Enter six</button>
  <WholeAnswerControls canCheck={sumRules.complete(state.draft,6)} incorrect={answerMissed(state)} needsVariant={false} onCheck={()=>dispatch({type:'check'})} onVariant={()=>false}/>
  <PuzzleHelp snapshot={{key:sessionKey!,view:publicSumView({target:6,draft:state.draft})}} rules={sumHints} kind="grid" failedRuns={state.misses} onFresh={onFresh!} commit={async(e,key)=>{
   let next=await commit?.(e.kind==='step'?{type:'demo',draft:e.action}:e.kind==='finish'?{type:'check'}:{type:'help'},key);
   if(e.kind==='step'&&e.last&&next)next=await commit?.({type:'check'},next.key);
   return next?{key:next.key,view:publicSumView({target:6,draft:next.state.draft})}:null;
  }}/>
 </>;}
 // Throwaway banks 477-479: the top of the P1 boards range, kept free for tests (461-463 are real board puzzles).
 const e=defineReplayGame({game:'grid-proof',codec:`grid-proof-${left}-v1`,context:'gridproof',cove:true,budget:{wrapper:700,draft:3396,undo:0,audit:0},engine:gridEngine,Board:GridBoard,helpUI:'board',assistance:{idempotentHelp:true,bytes:800,actions:16,isAction:a=>a.type==='help'||a.type==='demo'},controls:{help:()=>({type:'help'} as GridAction),reset:()=>({type:'reset'} as GridAction)},puzzles:Array.from({length:3},(_,i)=>({...puzzle,descriptor:6,ref:{...puzzle.ref,engine:'grid-proof',bank:476+left,puzzle:i,hash:String(i+1).repeat(64)},source:{kind:'endless' as const,bank:476+left,puzzle:i},dares:[],awards:[null,null] as const}))});
 await mount(e);await press('Enter left');await press('Help');await press('Look');await press('Think');await press('One step');
 expect(text()).toContain(right?'Every box is filled. Check when you are ready':'Your entries are kept. Choose Show me or try another puzzle.');expect(labels()).toContain('Show me');
 const actions=(store.save.challenge!.paused[0].payload as {actions:GridAction[]}).actions;
 expect(actions.filter(a=>a.type==='demo'||a.type==='check')).toEqual([]);
 await press('Show me');
 expect(text()).toContain('One way: 2 + 4 = 6.');expect(labels()).toContain('Try another');expect(labels()).not.toContain('Next step');
 const kept=store.save.challenge!.paused[0];expect((kept.payload as {actions:GridAction[]}).actions.filter(a=>a.type==='demo'||a.type==='check')).toEqual([]);
 expect((kept.payload as {actions:GridAction[]}).actions.filter(a=>a.type==='help')).toHaveLength(1);
 await press('Try another');expect(labels()).toContain('Start fresh puzzle');expect(labels()).toContain('Continue saved puzzle');expect(store.save.challenge!.paused[0]).toEqual(kept);
 await press('Continue saved puzzle');
 await press('Enter wrong pair');await press('Check');expect(text()).toContain('Not quite yet');await press('Enter six');expect(text()).not.toContain('Not quite yet');await press('Check');expect(store.save.challenge!.paused).toEqual([]);
});
it('F9: full draft still reaches and saves Look and a whole demonstration through frame/Store',async()=>{
 const e=makeEntry();await mount(e);
 // Drive the real board/Store, not entry.move shortcuts, until the ordinary reserve stops edits.
 const start=store.save.challenge!.paused[0];
 let current=start,turn=0;
 const cell=mazeRoute(engine.create({seed:1},{seed:1},{supportOff:false,ownRead:false}).board)[1];
 const wrapped:ChallengeEntry={...e,render:(session,dispatch,active,width,host)=><><button onClick={()=>dispatch({type:'move',cell:turn++%2?0:cell})}>Wander</button>{e.render(session,dispatch,active,width,host)}</>};
 await act(async()=>root.update(<StoreProvider><Probe/><Ready entry={wrapped}/></StoreProvider>));
 for(let i=0;i<512;i++){await press('Wander');const next=store.save.challenge!.paused[0];if(next.revision===current.revision)break;current=next;}
 expect(jsonBytes(current)).toBeLessThanOrEqual(2496);expect(text()).toContain('Try Help');
 await press('Help');await press('Look');expect(text()).toContain('Look at the open paths.');await press('Think');await press('One step');await press('Show me');
 for(let i=0;i<40&&store.save.challenge!.paused.length;i++)await press('Next step');
 expect(store.save.challenge!.paused).toEqual([]);expect(store.save.challenge!.signals[0][1]).toBe('h');
});

it('F18: frame Help starts state-driven hints for a board without its own ladder', async () => {
  const base = makeEntry();
  const e: ChallengeEntry = { ...base, helpUI: undefined,
    render: (session) => <p>{(session.payload as Payload).actions.some(a => a.type === 'help') ? 'Crab hint is visible' : 'Build a path'}</p> };
  await mount(e); expect(labels().filter(l => l === 'Help')).toHaveLength(1);
  expect(text()).not.toContain('Crab hint is visible'); await press('Help');
  expect(text()).toContain('Crab hint is visible');
  expect((store.save.challenge!.paused[0].payload as Payload).actions).toEqual([{type:'help'}]);
});
it.each([false, true])('F19: miss-only finish has truthful default and callback facts (callback %s)', async custom => {
  const praise = vi.fn((_ref, _result, facts) => facts?.helpUsed ? 'You followed help home.' : facts?.failed ? 'You kept trying and found the path home.' : 'You found the path home.');
  const base = makeEntry(3, custom ? praise : undefined);
  const e: ChallengeEntry = { ...base, render: (s, dispatch, active, width, host) => <>
    <button onClick={() => dispatch({type:'check'})}>Miss Check</button>{base.render(s,dispatch,active,width,host)}
  </> };
  await mount(e); await press('Miss Check'); await press('Solve');
  expect(text()).not.toContain('with help');
  expect(text()).toContain(custom ? 'You kept trying and found the path home.' : 'You kept trying and solved it.');
  if(custom) expect(praise.mock.calls.at(-1)?.[2]).toEqual({helpUsed:false,failed:true});
  expect(store.save.challenge!.signals[0][1]).toBe('h');
});
it('F20: fresh chooser selects a different same-tier card, preserves Continue, and replaces only after plain confirmation', async () => {
  const base=makeEntry();
  const e:ChallengeEntry={...base,render:(s,d,a,w,host)=><><button onClick={host?.onFresh}>Fresh from help</button>{base.render(s,d,a,w,host)}</>};
  await mount(e); await press('Move'); const kept=store.save.challenge!.paused[0];
  await press('Fresh from help'); expect(labels()).toContain('Continue saved puzzle');
  expect(labels()).toContain('Start fresh puzzle'); expect(text()).not.toContain('Start another attempt');
  expect(root.root.findAllByType('button').find(b=>b.children.join('')==='Maze 1 · Tide 1')?.props.selected).toBe(true);
  expect(store.save.challenge!.paused[0]).toEqual(kept);
  await press('Continue saved puzzle'); expect(store.save.challenge!.paused[0]).toEqual(kept);
  await press('Fresh from help'); await press('Start fresh puzzle'); expect(store.save.challenge!.paused[0]).toEqual(kept);
  await press('Replace saved puzzle and start');
  const next=store.save.challenge!.paused[0]; expect(next.id).not.toBe(kept.id); expect(next.puzzle.puzzle).toBe(1);
  expect((next.payload as Payload).actions).toEqual([]);
});
it.each(['check','run'] as const)('F21: a failed %s spends the reserve after ordinary edits stop', type => {
  const e=defineReplayGame({game:'reserve-proof',codec:'reserve-proof-v1',context:'reserveproof',cove:true,budget:{wrapper:700,draft:3396,undo:0,audit:0},engine,Board:()=>null,objectives:['shell'],
    puzzles:[{...puzzle,ref:{...puzzle.ref,engine:'reserve-proof',bank:435},source:{kind:'endless',bank:435,puzzle:0},dares:[],awards:[null,null]}],controls:{help:()=>({type:'help'} as Action),reset:()=>({type:'reset'} as Action)}});
  let s=e.start(e.puzzles[0].ref,'a','reserve-1',emptyChallenge(),{supportOff:false,ownRead:false},[]);
  const cell=mazeRoute(engine.create({seed:1},{seed:1},{supportOff:false,ownRead:false}).board)[1];
  for(let i=0;i<512;i++){const n=e.move(s,{type:'move',cell:i%2?0:cell});if(!n)break;s=n;}
  // Fill the remaining ordinary bytes with shorter valid edits, leaving no Check-sized slack.
  for(let i=0;i<30;i++){const n=e.move(s,{type:'reset'});if(!n)break;s=n;}
  const next=e.move(s,{type}); expect(next).not.toBeNull();
  expect((next!.payload as Payload).actions.at(-1)).toEqual({type});
  expect(next!.result).toBeNull();
});
