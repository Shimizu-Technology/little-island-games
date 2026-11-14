/** F-frame: the shared Challenge frame tells the truth in its intro, keeps a compact bar once a puzzle is open,
 * keeps the finished board on the solved screen, and lets a child choose up to three dares (the save contract's limit). */
import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { ChallengeFrame, challengeIntro } from '../src/challenge/ChallengeFrame';
import { StoreProvider, useStore } from '../src/state/Store';
import { dareBits, emptyChallenge, registerSaveContent, type ChallengeSession } from '../src/state/challenge';
import { catalogManifest } from '../src/state/catalogManifest';
import { emptySave, parseSave } from '../src/state/validation';
import { addLearner } from '../src/learn/learners';
import { encodeSave, migrateProfiles } from '../src/state/profiles';
import { putProgress } from '../src/state/challengeDrafts';
import { wordWidth } from '../src/components/wordFit';
import { challengeEntries } from '../src/challenge/registry.generated';
import { registration as crab } from '../src/challenge/registrations/crab-commands';
import { registration as sudoku } from '../src/challenge/registrations/sudoku';
import { registration as shellPits } from '../src/challenge/registrations/shell-pits';
import { registration as drop } from '../src/challenge/registrations/drop-puzzles';
import { registration as slip, type Action as SlipAction, type State as SlipState } from '../src/learn/games/slip-tide/challenge';
import { ChallengeBoard } from '../src/learn/games/slip-tide/challengeBoard';
import { registration as maze, puzzle as mazePuzzle, solve, type Action as MazeAction, type Payload as MazePayload } from './helpers/challenge-replay';
import type { ChallengeCard, ChallengeEntry, ChallengeViewProps } from '../src/challenge/types';

const viewport=vi.hoisted(()=>({width:393,height:852,fontScale:1}));
const db=vi.hoisted(()=>({raw:null as string|null}));
vi.mock('../src/state/storage',()=>({storage:{get:async()=>db.raw,set:async(raw:string)=>{db.raw=raw;},preserve:async()=>{},writeDraft:async()=>{},discardSession:async()=>{}}}));
vi.mock('../src/puzzles/bankAssets',async()=>{const {readFileSync:read}=await import('node:fs');return {bankTransport:{read:async(name:string)=>read(`src/content/puzzles/assets/${name}.lipuzzle`,'utf8')}};});
vi.mock('react-native',()=>({ScrollView:'section',View:'div',useWindowDimensions:()=>viewport,AppState:{addEventListener:()=>({remove(){}})}}));
vi.mock('react-native-safe-area-context',()=>({SafeAreaView:'main',useSafeAreaInsets:()=>({top:59,bottom:34,left:0,right:0})}));
vi.mock('expo-router',()=>({useIsFocused:()=>true,router:{canGoBack:()=>false,replace:vi.fn()}}));
vi.mock('../src/components/ui',()=>({Button:'button',Chip:'button',Heading:'h2',Copy:'p',ToggleRow:'switch',PressableScale:'button',Sheet:()=>null,C:{},styles:{}}));
vi.mock('../src/components/Audio',()=>({AudioPreferences:createContext({sound:false}),useSoundControls:()=>({play:vi.fn(),stop:vi.fn()})}));
vi.mock('../src/components/motion',()=>({useReducedMotion:()=>true}));
vi.mock('../src/components/Settings',()=>({Settings:()=>null}));
vi.mock('../src/components/SaveStatus',()=>({SaveStatus:()=>null}));
vi.mock('../src/personalization/Portrait',()=>({Portrait:()=>null}));
vi.mock('../src/islander',()=>({Islander:()=>null}));
vi.mock('../src/content/learnAudio',()=>({learnSources:{}}));
vi.mock('../src/learn/games/crab-commands/view',()=>({ArrowArt:()=>null,Beach:'beach',cardLabel:{up:'Up',right:'Right',down:'Down',left:'Left',forward:'Walk','turn-left':'Turn left','turn-right':'Turn right',repeat:'Again ×2'}}));
vi.mock('../src/learn/games/slip-tide/field',()=>({Playfield:()=>React.createElement('slip-board')}));

let store:ReturnType<typeof useStore>, root:ReactTestRenderer|undefined;
const scrolls:unknown[]=[];
function Probe(){const s=useStore();useLayoutEffect(()=>{store=s;},[s]);return null;}
afterEach(async()=>{if(root)await act(async()=>root!.unmount());root=undefined;scrolls.length=0;vi.unstubAllGlobals();Object.assign(viewport,{width:393,height:852,fontScale:1});});
async function mount(entry:ChallengeEntry,session?:ChallengeSession){
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);registerSaveContent(entry.catalog,catalogManifest(entry.catalog));
  let save=migrateProfiles({...emptySave(),learning:addLearner(undefined,'WWWWWWWWWWWWWWWWWWWWWWWW','a')});
  if(session)save=putProgress(save,'a',{...emptyChallenge(),nextOrdinal:session.ordinal+1,paused:[session]});
  db.raw=encodeSave(save);
  function Ready(){const s=useStore();return s.ready?<ChallengeFrame key={`${s.epoch}`} entry={entry}/>:null;}
  await act(async()=>{root=create(<StoreProvider><Probe/><Ready/></StoreProvider>,{createNodeMock:el=>el.type==='section'?{scrollTo:(to:unknown)=>scrolls.push(to)}:null});});
  await vi.waitFor(()=>expect(store?.ready).toBe(true),{timeout:5000,interval:20});
}
const textOf=(n:ReactTestInstance):string=>n.children.map(c=>typeof c==='string'?c:textOf(c)).join('');
const all=(type:string)=>root!.root.findAll(n=>String(n.type)===type);
const page=()=>all('section')[0];
const bar=()=>root!.root.findAll(n=>n.props.testID==='challenge-bar'&&n.type==='div')[0];
const inside=(n:ReactTestInstance,parent:ReactTestInstance|undefined)=>{for(let p:ReactTestInstance|null=n;p;p=p.parent)if(p===parent)return true;return false;};
const buttonNamed=(label:string)=>all('button').find(n=>textOf(n)===label);
const press=async(label:string)=>{const b=buttonNamed(label);expect(b,label).toBeDefined();await act(async()=>{await b!.props.onPress();});};
/** Document order of rendered host nodes, for "the board comes before the result". */
const order=(n:ReactTestInstance)=>root!.root.findAll(()=>true).indexOf(n);

// Slip's board is lazily required on device; here the same props render it directly.
const slipEntry:ChallengeEntry={...slip,render:(session,dispatch,active,width,host)=>{const el=slip.render(session,dispatch,active,width,host) as React.ReactElement<ChallengeViewProps<SlipState,SlipAction>>|null;return el?<ChallengeBoard {...el.props}/>:null;}};
// A board that records whether it may take moves, and steps through the maze's real solution.
const route=(solve(maze.start(mazePuzzle.ref,'a','route',emptyChallenge(),{supportOff:false,ownRead:false},[])).payload as MazePayload).actions;
const mazeEntry:ChallengeEntry={...maze,render:(session,dispatch,active)=>{const n=(session.payload as MazePayload).actions.filter(a=>a.type==='move').length;return React.createElement('maze-board' as string,{active},React.createElement('button' as string,{onPress:()=>dispatch(route[n] satisfies MazeAction)},'Next maze step'));}};
// Beep Bot's Challenge (C2a, p4/c2a-beep) offers School Level 3–5 replays on the endless path, with no Deep Water and no packed bank.
const beepLike:ChallengeEntry={...maze,game:'beep-like',puzzles:[3,4,5].map((level,i):ChallengeCard=>({...mazePuzzle,ref:{...mazePuzzle.ref,puzzle:i},source:{kind:'school',game:'beep-like',level:level as 3|4|5,puzzle:`beep-${level}-0`},path:'endless',tier:level as 3|4|5,title:`Level ${level} · Shell path 1`}))};

it('the intro names only what each game offers: Beep neither, Slip Tide both, a board game Deep Water, Sudoku Endless Tide',()=>{
  expect(challengeIntro(beepLike)).toBe('These puzzles come from School Levels 3–5. Every choice is open.');
  expect(challengeIntro(slip)).toBe('Deep Water is a big stretch. Endless Tide has more puzzles. Every choice is open.');
  expect(challengeIntro(shellPits)).toBe('Deep Water is a big stretch. Every choice is open.');
  expect(challengeIntro(drop)).toBe('Deep Water is a big stretch. Every choice is open.');
  expect(challengeIntro(sudoku)).toBe('Endless Tide has more puzzles. Every choice is open.');
  // Crab mixes Deep Water beaches with School-level dare replays; retired beaches never count.
  expect(challengeIntro(crab)).toBe('Deep Water is a big stretch. Some puzzles come from School Levels 1–3. Every choice is open.');
  expect(challengeIntro({...slip,puzzles:slip.puzzles.map(p=>({...p,retired:p.path==='deep-water'}))})).toBe('Endless Tide has more puzzles. Every choice is open.');
});

it('every registered game: Deep Water is promised only with a Deep Water choice, Endless Tide only with new endless puzzles',()=>{
  for(const entry of challengeEntries){
    const intro=challengeIntro(entry), cards=entry.puzzles.filter(p=>!p.retired), bands=entry.packed?.bands??[];
    expect(intro.includes('Deep Water'),entry.game).toBe([...cards,...bands].some(p=>p.path==='deep-water'));
    expect(intro.includes('Endless Tide has more puzzles'),entry.game).toBe(bands.some(b=>b.path==='endless')||cards.some(p=>p.path==='endless'&&p.source.kind!=='school'));
    expect(intro.endsWith('Every choice is open.'),entry.game).toBe(true);
  }
});

it('the picker shows the derived intro: a board game never mentions Endless Tide, Beep mentions neither path',async()=>{
  await mount(shellPits);
  const lines=()=>all('p').map(textOf);
  await vi.waitFor(()=>expect(lines()).toContain('Deep Water is a big stretch. Every choice is open.'),{timeout:5000,interval:20});
  expect(lines().some(t=>t.includes('Endless Tide'))).toBe(false);
  await act(async()=>root!.unmount());root=undefined;
  await mount(beepLike);
  await vi.waitFor(()=>expect(lines()).toContain('These puzzles come from School Levels 3–5. Every choice is open.'),{timeout:5000,interval:20});
  expect(lines().some(t=>/Deep Water|Endless Tide has/.test(t))).toBe(false);
});

it('header: once a puzzle is open, one compact bar is pinned above the page and the board is the first thing in it',async()=>{
  const p=slip.puzzles.find(c=>!c.retired&&c.dares.length)!;
  await mount(slipEntry,slip.start(p.ref,'a','bar-slip',emptyChallenge(),{supportOff:false,ownRead:false},[]));
  const board=await vi.waitFor(()=>{const b=all('slip-board')[0];expect(b).toBeDefined();return b;},{timeout:5000,interval:20});
  // The bar is outside the scrolling page: Back, the puzzle's name and the learner chip, in one row.
  expect(bar()).toBeDefined();expect(inside(bar(),page())).toBe(false);
  expect(bar().props.style.flexDirection).toBe('row');
  expect(bar().findAll(n=>n.type==='button')[0] && textOf(bar().findAll(n=>n.type==='button')[0])).toBe('Back');
  expect(bar().findAll(n=>n.type==='h2').map(textOf)).toEqual([p.title]);
  expect(bar().findAll(n=>n.type==='button'&&!!n.props.accessibilityLabel?.startsWith('Who is playing:'))).toHaveLength(1);
  // Nothing tall sits between the bar and the board: no page heading, intro or marks line above it.
  expect(all('h2').some(h=>textOf(h)==='Challenge')).toBe(false);
  const above=all('p').filter(n=>inside(n,page())&&order(n)<order(board)).map(textOf);
  expect(above).toEqual([]);
  // Nothing is lost: the marks line is still on the page, below the board, and the way back is still there.
  const marks=all('p').find(n=>textOf(n).startsWith('Your marks:'))!;
  expect(marks).toBeDefined();expect(order(marks)).toBeGreaterThan(order(board));
  expect(buttonNamed('Another puzzle')).toBeDefined();
});

it('header: the picker keeps its full heading, intro and marks, with no puzzle bar',async()=>{
  await mount(slipEntry);
  await vi.waitFor(()=>expect(all('h2').some(h=>textOf(h)==='Challenge')).toBe(true),{timeout:5000,interval:20});
  expect(bar()).toBeUndefined();
  expect(all('p').map(textOf)).toContain('Deep Water is a big stretch. Endless Tide has more puzzles. Every choice is open.');
  expect(all('p').some(n=>textOf(n).startsWith('Your marks:'))).toBe(true);
});

it('header at the largest text: the bar stays one row (learner chip moves into the page), its words never break, Back stays compact',async()=>{
  Object.assign(viewport,{fontScale:3.12});
  const p=slip.puzzles.find(c=>!c.retired&&c.dares.length)!;
  await mount(slipEntry,slip.start(p.ref,'a','ax-slip',emptyChallenge(),{supportOff:false,ownRead:false},[]));
  await vi.waitFor(()=>expect(all('slip-board')).toHaveLength(1),{timeout:5000,interval:20});
  expect(inside(bar(),page())).toBe(false);
  expect(bar().findAll(n=>n.type==='button'&&!!n.props.accessibilityLabel?.startsWith('Who is playing:'))).toHaveLength(0);
  expect(all('button').filter(n=>n.props.accessibilityLabel?.startsWith('Who is playing:')).filter(n=>inside(n,page()))).toHaveLength(1);
  expect(bar().findAll(n=>n.type==='button')[0].props.maxFontSizeMultiplier).toBe(1.3);
  const title=bar().findAll(n=>n.type==='h2')[0], max=title.props.maxFontSizeMultiplier as number, size=title.props.style.fontSize as number;
  expect(max).toBeLessThanOrEqual(1.5);expect(max).toBeGreaterThanOrEqual(1);
  // Room left for the title: the width less the bar's padding and the capped Back button.
  const room=393-24-86-16, widest=Math.max(...p.title.split(/\s+/).map(w=>wordWidth(w)*size*Math.min(3.12,max)));
  expect(widest).toBeLessThanOrEqual(room);
});

it('header at the largest text in a short landscape window: the bar scrolls with the page',async()=>{
  Object.assign(viewport,{width:852,height:393,fontScale:3.12});
  const p=slip.puzzles.find(c=>!c.retired)!;
  await mount(slipEntry,slip.start(p.ref,'a','land-slip',emptyChallenge(),{supportOff:false,ownRead:false},[]));
  await vi.waitFor(()=>expect(all('slip-board')).toHaveLength(1),{timeout:5000,interval:20});
  expect(inside(bar(),page())).toBe(true);
});

it('header: every registered puzzle title fits the default iPhone bar without breaking a word',async()=>{
  // The bar's title room on a 393-pt iPhone at default text: width, padding, Back, the learner chip and gaps.
  const room=(393-24-72-132-16)*0.92;
  const titles=challengeEntries.flatMap(e=>[...e.puzzles.filter(p=>!p.retired).map(p=>p.title),...(e.packed?.bands??[]).map(b=>`${b.title} ${b.count}`)]);
  expect(titles.length).toBeGreaterThan(100);
  for(const t of titles)expect(Math.max(...t.split(/\s+/).map(w=>wordWidth(w)*19)),t).toBeLessThanOrEqual(room);
});

it('a pinned (animated) board: the bar holds Back, title and learner, and the board header keeps only the dare and save lines',async()=>{
  const p=crab.puzzles.find(c=>!c.retired&&c.dares.some(d=>!d.retired))!, dare=p.dares.find(d=>!d.retired)!;
  await mount(crab,crab.start(p.ref,'a','pinned-crab',emptyChallenge(),{supportOff:false,ownRead:false},[dare.slot]));
  await vi.waitFor(()=>expect(root!.root.findAll(n=>n.props.testID==='chosen-dare'&&n.type==='div')).toHaveLength(1),{timeout:5000,interval:20});
  expect(inside(bar(),page())).toBe(false);
  expect(bar().findAll(n=>n.type==='h2').map(textOf)).toEqual([p.title]);
  expect(all('h2').filter(h=>textOf(h)===p.title)).toHaveLength(1);
  expect(page().props.scrollEnabled).toBe(false);
});

it('the solved screen keeps the finished board above the result, takes no more moves, and starts at the top',async()=>{
  await mount(mazeEntry,maze.start(mazePuzzle.ref,'a','solve-maze',emptyChallenge(),{supportOff:false,ownRead:false},[]));
  await vi.waitFor(()=>expect(all('maze-board')).toHaveLength(1),{timeout:5000,interval:20});
  for(let i=0;i<40&&!all('h2').some(h=>textOf(h)==='Puzzle solved!');i++)await press('Next maze step');
  const heading=all('h2').find(h=>textOf(h)==='Puzzle solved!')!;
  expect(heading).toBeDefined();
  const board=all('maze-board');
  expect(board).toHaveLength(1);
  expect(order(board[0])).toBeLessThan(order(heading));
  expect(board[0].props.active).toBe(false);
  expect(buttonNamed('Help')).toBeUndefined();
  expect(scrolls.at(-1)).toEqual({y:0,animated:false});
});

it('dares: a child can choose several (up to three); each is named through the round and each is earned on its own',async()=>{
  const expectedSlots=['par','pick-up','edits'].map(kind=>mazePuzzle.dares.find(d=>d.rule.kind===kind)!.slot);
  await mount(mazeEntry);
  await vi.waitFor(()=>expect(all('h2').map(textOf)).toContain('Optional dares'),{timeout:5000,interval:20});
  expect(all('p').map(textOf).some(t=>t.startsWith('Choose up to three, or none.'))).toBe(true);
  for(const label of ['par · Help welcome','pick-up · Help welcome','blind · Help welcome'])await press(label);
  // Changing your mind: a chosen dare can be cleared, and another chosen in its place.
  await press('blind · Help welcome');await press('edits · Help welcome');
  expect(all('button').filter(n=>n.props.selected===true&&/Help welcome|On my own/.test(textOf(n))).map(textOf)).toEqual(['par · Help welcome','pick-up · Help welcome','edits · Help welcome']);
  // A fourth waits until one is cleared; it is shown as unavailable, not silently ignored.
  const fourth=buttonNamed('two-ways · Help welcome')!;
  expect(fourth.props.disabled).toBe(true);
  await act(async()=>{fourth.props.onPress();});
  await press('Start this puzzle');
  const started=store.save.challenge!.paused[0];
  expect(started.selectedDares).toEqual(expectedSlots);
  expect(root!.root.findAll(n=>n.props.testID==='chosen-dare'&&n.type==='div')).toHaveLength(3);
  // The save keeps its existing shape and validates on reload.
  expect(parseSave(db.raw!)).not.toBeNull();
  for(let i=0;i<40&&!all('h2').some(h=>textOf(h)==='Puzzle solved!');i++)await press('Next maze step');
  await vi.waitFor(()=>expect(all('h2').map(textOf)).toContain('Puzzle solved!'),{timeout:5000,interval:20});
  const bits=dareBits(store.save.challenge!.dares)!;
  expect(bits.flatMap((bit,slot)=>bit?[slot]:[])).toEqual(expectedSlots);
});

it('dares: a puzzle with one dare still reads as one optional dare',async()=>{
  const p=slip.puzzles.find(c=>!c.retired&&c.dares.filter(d=>!d.retired).length===2)!;
  const {packed:_packed,...inline}=slipEntry, one:ChallengeEntry={...inline,puzzles:[{...p,dares:[p.dares[0]]}]};
  await mount(one);
  await vi.waitFor(()=>expect(all('h2').map(textOf)).toContain('An optional dare'),{timeout:5000,interval:20});
  expect(all('p').map(textOf).some(t=>t.startsWith('Choose'))).toBe(false);
});

for(const width of [393,744])for(const fontScale of [1,3.12])it(`real learner chip is bounded at ${width} / ${fontScale}`,async()=>{
  Object.assign(viewport,{width,fontScale});
  const p=slip.puzzles.find(c=>!c.retired)!;
  await mount(slipEntry,slip.start(p.ref,'a','wide-name',emptyChallenge(),{supportOff:false,ownRead:false},[]));
  const chip=all('button').find(n=>n.props.accessibilityLabel?.startsWith('Who is playing:'))!;
  expect(chip.props.accessibilityLabel).toContain('WWWWWWWWWWWWWWWWWWWWWWWW');
  expect(chip.props.style.maxWidth).toBe('100%');
  expect(chip.findAll(n=>n.type==='p')[0].props.style.flexShrink).toBe(1);
  if(fontScale===1){const slot=root!.root.findAll(n=>n.type==='div'&&n.props.testID==='challenge-learner-slot')[0];expect(inside(chip,slot)).toBe(true);expect(slot.props.style).toMatchObject({width:132,maxWidth:132,flexShrink:1});}
  else expect(inside(chip,page())).toBe(true);
});

it('AX5 nonanimated Start, Continue and next puzzle reset only once the board lays out, never on moves',async()=>{
  Object.assign(viewport,{fontScale:3.12});
  await mount(slipEntry);
  const ready=async()=>{
    await vi.waitFor(()=>expect(root!.root.findAll(n=>n.props.testID==='challenge-board-ready'&&n.type==='div')).toHaveLength(1));
    const board=root!.root.findAll(n=>n.props.testID==='challenge-board-ready'&&n.type==='div')[0];
    await act(async()=>board.props.onLayout());
    expect(scrolls.at(-1)).toEqual({y:0,animated:false});
    scrolls.length=0;
    await act(async()=>board.props.onLayout());expect(scrolls).toEqual([]);
  };
  // Model a picker offset retained by the native scroll view.
  scrolls.push({y:600,animated:false});
  await press('Start this puzzle');await ready();
  await press('Another puzzle');scrolls.push({y:600,animated:false});
  await press('Continue saved puzzle');await ready();
  await press('Another puzzle');scrolls.push({y:600,animated:false});
  const prior=store.save.challenge!.paused[0];
  const next=slip.puzzles.find(p=>!p.retired&&p.path==='deep-water'&&p.ref.puzzle!==prior.puzzle.puzzle)!;
  await press('Deep Water · A big stretch');
  await press(`${next.title} · Tide ${next.tier}`);
  const toggle=root!.root.findByType('switch' as never);await act(async()=>toggle.props.onChange(true));
  await press('Start this puzzle');await ready();
  expect(store.save.challenge!.paused[0].puzzle).toEqual(next.ref);
  const current=store.save.challenge!.paused[0];
  await act(async()=>{await store.challengeSave({...current,revision:current.revision+1},{owner:'a',game:current.game,epoch:store.epoch,id:current.id,revision:current.revision});});
  const board=root!.root.findAll(n=>n.props.testID==='challenge-board-ready'&&n.type==='div')[0];
  await act(async()=>board.props.onLayout());expect(scrolls).toEqual([]);
});
