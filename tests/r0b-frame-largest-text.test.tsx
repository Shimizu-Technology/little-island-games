/** R0b: what the Learn frame gives each School board at the largest text size. The board and the result card get a
 * text region (2x, or where the words fit), step games can bring the board back into view, and a short landscape
 * phone folds the learner chip, mode and journey into one row beside the level line. */
import React, { createContext, useLayoutEffect } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { solveActs } from '../src/math/kit';
import { shellMove, progress, type ShellRound } from '../src/learn/games/shell-math/round2';
import { LearnFrame } from '../src/learn/LearnFrame';
import { StoreProvider, useStore } from '../src/state/Store';
import { emptySave } from '../src/state/validation';
import { encodeSave, migrateProfiles } from '../src/state/profiles';
import { startSession } from '../src/learn/session';
import { optionsAtLevel } from '../src/learn/levels';
import type { LearnId, LearnSession } from '../src/learn/types';

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 3.12 }));
const companion = vi.hoisted(()=>({event:'entry'}));
const db = vi.hoisted(() => ({ raw: null as string | null }));
vi.mock('../src/state/storage', () => ({ storage: { get: async () => db.raw, set: async (s: string) => { db.raw = s; }, preserve: async () => {} } }));
vi.mock('react-native', () => ({ ScrollView: 'ScrollView', View: 'View', Text: 'Text', StyleSheet: { flatten: (s: unknown) => s }, useWindowDimensions: () => viewport, AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));
vi.mock('expo-router', () => ({ useIsFocused: () => true, router: { canGoBack: () => false, replace: vi.fn(), push: vi.fn() } }));
// Headings report the text region they are drawn in, as the real Text reads it.
vi.mock('../src/components/ui', async () => {
  const { TextFit } = await import('../src/components/Text');
  const Heading = ({ children, maxFontSizeMultiplier }: { children: React.ReactNode; maxFontSizeMultiplier?: number }) => React.createElement('Heading', { maxFontSizeMultiplier, fit: React.useContext(TextFit) }, children);
  return { Button: 'Button', Chip: 'Chip', Heading, Copy: 'Copy', ToggleRow: 'ToggleRow', GameHeader: 'GameHeader', C: {}, styles: {},
    Sheet: ({ visible, children, footer }: { visible: boolean; children: React.ReactNode; footer: React.ReactNode }) => visible ? React.createElement('SheetBody', null, children, footer) : null };
});
vi.mock('../src/components/Audio', () => ({ hasSpeech: () => true, AudioPreferences: createContext({}), useSoundControls: () => ({ play: () => {}, stop: () => {} }) }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
vi.mock('../src/components/Match', () => ({ Scoreboard: () => null, PlayerNames: () => null }));
vi.mock('../src/components/feel', () => ({ feel: () => {} }));
vi.mock('../src/personalization/LearnerChip', () => ({ LearnerChip: 'LearnerChip' }));
vi.mock('../src/islander/Companion', () => ({ Companion: () => null, LearningCompanion: ({ children }: { children: React.ReactNode }) => children, PhoneLearningCompanion: 'PhoneLearningCompanion', useCompanionReaction: () => ({ event: companion.event, react: () => {} }) }));
vi.mock('../src/learn/LearnChrome', () => ({ IslandBackdrop: () => null, RoundProgress: 'RoundProgress', subjectTheme: new Proxy({}, { get: () => ({}) }) }));
vi.mock('../src/learn/LearnArt', () => ({ LearnArt: () => null }));
vi.mock('../src/learn/Celebrate', () => ({ Celebrate: () => null }));
vi.mock('../src/learn/LevelPath', () => ({ LevelPath: () => null }));
vi.mock('../src/learn/games/hafa-adai/view', () => ({ LastPicnicWord: () => null }));
vi.mock('../src/badges/ResultCard', () => ({ BadgeResultCard: () => null }));
vi.mock('../src/challenge/ResultOffer', () => ({ ResultOffer: () => null }));
// Every board reports the text region and the step reveal the frame gives it.
vi.mock('../src/learn/growth/Board', async () => {
  const { TextFit } = await import('../src/components/Text');
  const { StepReveal } = await import('../src/learn/stepReveal');
  return { GrowthBoard: (p: object) => React.createElement('Board', { ...p, fit: React.useContext(TextFit), reveal: React.useContext(StepReveal) }) };
});
vi.mock('../src/learn/views', async () => {
  const { TextFit } = await import('../src/components/Text');
  const { StepReveal } = await import('../src/learn/stepReveal');
  const { useBoardSpace } = await import('../src/learn/BoardSpace');
  const Board = (p: object) => React.createElement('Board', { ...p, boardSpace: useBoardSpace(), fit: React.useContext(TextFit), reveal: React.useContext(StepReveal) });
  return { views: new Proxy({}, { get: () => ({ Board, Art: 'Art' }) }) };
});

let root: ReactTestRenderer | undefined;
const scrolls = vi.hoisted(() => [] as number[]);
const scrollOptions = vi.hoisted(() => [] as {y:number;animated:boolean}[]);
function Probe({ id }: { id: LearnId }) { const s = useStore(); useLayoutEffect(() => {}, [s]); return s.ready ? <LearnFrame id={id} /> : null; }
async function mount(id: LearnId, patch?: (s: LearnSession) => LearnSession) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const save = migrateProfiles(emptySave());
  const round = { ...startSession(id, { options: optionsAtLevel({ mode: 'solo', pace: 'easy' }, 1) }, {}, 7), learner: 'family' };
  save.learn = { [id]: patch ? patch(round) : round };
  db.raw = encodeSave(save);
  await act(async () => { root = create(<StoreProvider><Probe id={id} /></StoreProvider>, { createNodeMock: () => ({ scrollTo: (options: { y: number; animated: boolean }) => { scrolls.push(options.y); scrollOptions.push(options); } }) }); });
  return root!;
}
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; vi.unstubAllGlobals(); scrolls.length = 0; scrollOptions.length = 0; Object.assign(viewport, { width: 393, height: 852, fontScale: 3.12 }); companion.event='entry'; });
const byType = (r: ReactTestRenderer, type: string) => r.root.findAll(n => String(n.type) === type);
const textOf = (n: ReactTestInstance): string => n.children.map(c => typeof c === 'string' ? c : textOf(c)).join('');
const inside = (n: ReactTestInstance, parent: ReactTestInstance) => { for (let p: ReactTestInstance | null = n; p; p = p.parent) if (p === parent) return true; return false; };

it.each([[3.12, { width: 337, ceiling: 2, maxSize: 44 }], [1, null]])('at text scale %s the board gets the text region %o', async (fontScale, fit) => {
  Object.assign(viewport, { fontScale });
  const r = await mount('turtle-tales');
  expect(byType(r, 'Board')[0].props.fit).toEqual(fit);
});

it('an iPad board region is the board width beside the companion', async () => {
  Object.assign(viewport, { width: 1133, height: 744 });
  const r = await mount('turtle-tales');
  // 1133 - 56, less the 88-pt companion column on a wide screen.
  expect(byType(r, 'Board')[0].props.fit).toEqual({ width: 900 - 88, ceiling: 2, maxSize: 44 });
});

it.each([[3.12, [892]], [1, []]])('a step game asking for the board at text scale %s scrolls the page to %o', async (fontScale, expected) => {
  Object.assign(viewport, { fontScale });
  const r = await mount('turtle-tales');
  await act(async () => { r.root.find(n => n.props.testID === 'learn-board').props.onLayout({ nativeEvent: { layout: { x: 0, y: 900, width: 361, height: 700 } } }); });
  scrolls.length = 0;
  await act(async () => { byType(r, 'Board')[0].props.reveal(); });
  expect(scrolls).toEqual(expected);
});

it.each([[3.12, 2], [1, undefined]])('the result card at text scale %s draws its words inside a region capped at %s', async (fontScale, ceiling) => {
  Object.assign(viewport, { fontScale });
  // A finished Quick practice round: every question answered.
  const r = await mount('quick-practice', s => {
    const st = s.state as { questions: unknown[]; index: number; completed: boolean[] };
    return { ...s, state: { ...st, index: st.questions.length, completed: st.questions.map(() => false) } };
  });
  const result = r.root.find(n => String(n.type) === 'Heading' && textOf(n) === 'You did it!');
  expect(result.props.fit?.ceiling).toBe(ceiling);
  if (ceiling) expect(result.props.fit.width).toBe(393 - 32 - 46);
});

it('AX5 landscape phone: the learner chip, the mode and a one-line journey share a row beside the level line', async () => {
  Object.assign(viewport, { width: 874, height: 402 });
  const r = await mount('crab-commands');
  const header = r.root.find(n => n.props.testID === 'learn-header-scrolled');
  expect(header.props.style.flexDirection).toBe('row');
  const cluster = header.find(n => n.props.testID === 'learn-header-cluster');
  expect(byType(r, 'LearnerChip').filter(n => inside(n, cluster))).toHaveLength(1);
  expect(byType(r, 'Copy').filter(n => inside(n, cluster)).map(textOf)).toEqual(['On my own']);
  const journeys = byType(r, 'RoundProgress');
  expect(journeys).toHaveLength(1);
  expect(inside(journeys[0], cluster)).toBe(true);
  expect(journeys[0].props.inline).toBe(true);
  // The level line sits in the same wrapping row, before the cluster.
  expect(byType(r, 'Heading').filter(n => inside(n, header)).length).toBeGreaterThan(0);
});

it.each([[1133, 744, 3.12], [874, 402, 1], [393, 852, 3.12]])('at %sx%s, text scale %s, the journey keeps its own labelled rows', async (width, height, fontScale) => {
  Object.assign(viewport, { width, height, fontScale });
  const r = await mount('crab-commands');
  expect(r.root.findAll(n => n.props.testID === 'learn-header-cluster')).toHaveLength(0);
  const journeys = byType(r, 'RoundProgress');
  expect(journeys).toHaveLength(1);
  expect(journeys[0].props.inline).toBeUndefined();
});

it('the step reveal lands on the board itself, below the card padding and a celebration cell above it', async () => {
  const r = await mount('turtle-tales');
  await act(async () => { r.root.find(n => n.props.testID === 'learn-board').props.onLayout({ nativeEvent: { layout: { x: 0, y: 900, width: 361, height: 700 } } }); });
  await act(async () => { r.root.find(n => n.props.testID === 'learn-board-inset').props.onLayout({ nativeEvent: { layout: { x: 14, y: 78, width: 333, height: 600 } } }); });
  scrolls.length = 0;
  await act(async () => { byType(r, 'Board')[0].props.reveal(); });
  expect(scrolls).toEqual([970]);
});

it('measures actual card width and space below the real header instead of passing the window estimate', async () => {
  Object.assign(viewport, { fontScale: 1 });
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  const r = await mount('crab-commands');
  await act(async () => {
    byType(r, 'ScrollView')[0].props.onLayout({ nativeEvent: { layout: { height: 640 } } });
    r.root.findAll(n => String(n.type) === 'View' && n.props.testID === 'learn-board')[0].props.onLayout({ nativeEvent: { layout: { y: 86 } } });
    r.root.findAll(n => String(n.type) === 'View' && n.props.testID === 'learn-board-inset')[0].props.onLayout({ nativeEvent: { layout: { y: 14, width: 333, height: 400 } } });
  });
  expect(byType(r, 'Board')[0].props.width).toBe(333); // measured port gets its actual inset width
  expect(byType(r, 'Board')[0].props.boardSpace).toMatchObject({ width: 333, height: 526, large: false, ready: true });
});

async function measureFrame(r: ReactTestRenderer, height=556, top=56, inset=14, width=333) {
  await act(async()=>{
    byType(r,'ScrollView')[0].props.onLayout({nativeEvent:{layout:{height}}});
    r.root.findAll(n=>String(n.type)==='View'&&n.props.testID==='learn-board')[0].props.onLayout({nativeEvent:{layout:{y:top}}});
    r.root.findAll(n=>String(n.type)==='View'&&n.props.testID==='learn-board-inset')[0].props.onLayout({nativeEvent:{layout:{y:inset,width,height:400}}});
  });
}
it.each([499,500,744,852])('default window height %s uses only the approved short-landscape reveal',async height=>{
 Object.assign(viewport,{width:852,height,fontScale:1});
 const frames=new Map<number,FrameRequestCallback>();let n=0;
 vi.stubGlobal('requestAnimationFrame',(f:FrameRequestCallback)=>{frames.set(++n,f);return n;});
 vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));
 const r=await mount('turtle-tales');scrolls.length=0;scrollOptions.length=0;
 await measureFrame(r,height-93,180,24,654);
 await act(async()=>{const queue=[...frames.values()];frames.clear();queue.forEach(f=>f(0));});
 expect(scrolls).toEqual(height<500?[196]:[]);
 const b=byType(r,'Board')[0];
 expect(b.props.boardSpace).toBeNull(); // reveal remains available without geometry opt-in
 expect(byType(r,'GameHeader')).toHaveLength(1);
 expect(byType(r,'LearnerChip').length).toBeGreaterThan(0);
 if(height<500)expect(scrollOptions).toEqual([{y:196,animated:false}]);
});
it('portrait-landscape-portrait preserves the round and reveals once per rotation, with no animation',async()=>{
 Object.assign(viewport,{width:393,height:852,fontScale:1});
 const frames=new Map<number,FrameRequestCallback>();let n=0;
 vi.stubGlobal('requestAnimationFrame',(f:FrameRequestCallback)=>{frames.set(++n,f);return n;});
 vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));
 const flush=async()=>act(async()=>{const queue=[...frames.values()];frames.clear();queue.forEach(f=>f(0));});
 const r=await mount('turtle-tales');await measureFrame(r);await flush();
 const round=byType(r,'Board')[0].props.session;
 scrolls.length=0;scrollOptions.length=0;
 const rotate=async(width:number,height:number)=>{
  Object.assign(viewport,{width,height});
  await act(async()=>r.update(<StoreProvider><Probe id="turtle-tales"/></StoreProvider>));
  await measureFrame(r,width===393?556:372,width===393?56:247,width===393?14:24,width===393?333:654);
  await flush();
 };
 await rotate(852,393);expect(scrolls).toEqual([263]);
 await act(async()=>byType(r,'Board')[0].props.reveal());expect(scrolls).toEqual([263]);
 await measureFrame(r,372,247,24,654);await flush();expect(scrolls).toEqual([263]);
 await rotate(393,852);expect(scrolls).toEqual([263]);
 await rotate(852,393);expect(scrolls).toEqual([263,263]);
 expect(byType(r,'Board')[0].props.session).toBe(round);
 expect(scrollOptions.every(o=>o.animated===false)).toBe(true);
});

it.each([500,852])('AX5 height %s reveals ported Crab but leaves an unported reading entry alone',async height=>{
 companion.event='waiting'; Object.assign(viewport,{width:393,height,fontScale:3.12});
 const frames=new Map<number,FrameRequestCallback>();let n=0;
 vi.stubGlobal('requestAnimationFrame',(f:FrameRequestCallback)=>{frames.set(++n,f);return n;});vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));
 for(const id of ['crab-commands','turtle-tales'] as const){
  const r=await mount(id);scrolls.length=0;await measureFrame(r,height-93,180,24,333);
  await act(async()=>{const queue=[...frames.values()];frames.clear();queue.forEach(f=>f(0));});
  expect(scrolls).toEqual(id==='crab-commands'?[196]:[]);
  await act(async()=>r.unmount());root=undefined;
 }
});
it('a 499-pt next question retains the short-landscape reveal at default text',async()=>{
 Object.assign(viewport,{width:852,height:499,fontScale:1});
 vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',()=>{});
 const r=await mount('shell-math');await measureFrame(r,406,180,24,654);scrolls.length=0;
 const board=byType(r,'Board')[0];
 let next=board.props.session.state as ShellRound;
 const p=progress(next)!;for(const a of solveActs(p.plan!))next=shellMove(next,a);next=shellMove(next,['x']);
 expect(next.index).toBe(1);await act(async()=>board.props.update(next));
 expect(scrolls).toEqual([196]);expect(scrollOptions.at(-1)).toEqual({y:196,animated:false});
});
it('layout events arriving before the rotation dimensions still provide measured board space',async()=>{
 Object.assign(viewport,{width:393,height:852,fontScale:1});vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',()=>{});
 const r=await mount('crab-commands');await measureFrame(r,300,220,24,654);
 Object.assign(viewport,{width:852,height:393});
 await act(async()=>r.update(<StoreProvider><Probe id="crab-commands"/></StoreProvider>));
 expect(byType(r,'Board')[0].props.boardSpace).toMatchObject({width:654,ready:true});
});

it.each(['food-web','space-station','turtle-tales'] as const)('%s retains its legacy allocation and text width after measurement',async id=>{
 Object.assign(viewport,{width:1133,height:744,fontScale:3.12});
 vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',()=>{});
 const r=await mount(id);await measureFrame(r,620,180,24,943);
 const board=byType(r,'Board')[0];
 expect(board.props.boardSpace).toBeNull();expect(board.props.width).toBe(812);expect(board.props.fit.width).toBe(812);
});
