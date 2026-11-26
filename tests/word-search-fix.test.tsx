import React, { createContext } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { WordSearchBoard } from '../src/puzzles/words/WordSearchBoard';
import { searchEngine } from '../src/puzzles/words/game';
import * as core from '../src/puzzles/words/core';
import { defineWordSearch } from '../src/puzzles/words/registration';
import { fixtureRegistration, fixturePuzzles } from './fixtures/word-search/registration';
import { emptyChallenge } from '../src/state/challenge';
import fixture from './fixtures/word-search/bank.json';
const env=vi.hoisted(()=>({width:744,height:1133,fontScale:1,reader:true,blur:vi.fn(),top:undefined as number|undefined,announce:vi.fn(),play:vi.fn(()=>true)}));
vi.mock('react-native',()=>({AccessibilityInfo:{isScreenReaderEnabled:async()=>env.reader,addEventListener:()=>({remove(){}}),announceForAccessibility:env.announce},ScrollView:'scroll',View:'view',TextInput:'input',Platform:{OS:'ios'},useWindowDimensions:()=>env}));
vi.mock('react-native-svg',()=>({default:'svg',Circle:'circle',Line:'line',SvgXml:'picture'}));
vi.mock('../src/components/ui',()=>({Button:'button',Copy:'copy',Heading:'heading',C:{}}));
vi.mock('../src/components/Text',()=>({Text:'text'}));
vi.mock('../src/components/Audio',()=>({useSoundControls:()=>({play:env.play})}));
vi.mock('../src/puzzles/words/picture-context',()=>({SearchPicturesContext:createContext({idFor:()=>undefined,load:async()=>{throw Error();}})}));
let screen:ReactTestRenderer;
const p=fixture.puzzles[0] as core.SearchPuzzle;
const initial=()=>searchEngine.create(p,{version:1},{ownRead:false,supportOff:false});
const mount=async(props={})=>{const dispatch=vi.fn();await act(async()=>{screen=create(<WordSearchBoard state={initial()} dispatch={dispatch} active width={353} together {...props}/>,{createNodeMock:()=>({focus(){},blur:env.blur,clear(){},measureInWindow:(cb:(x:number,y:number,w:number,h:number)=>void)=>{if(env.top!==undefined)cb(0,env.top,353,0);}})});});return dispatch;};
const surface=()=>screen.root.findAll(n=>!!n.props.onResponderGrant)[0];

const press=async(label:string)=>{await act(async()=>{const b=screen.root.findAllByType('button').find(n=>n.children.includes(label));expect(b).toBeDefined();b!.props.onPress();});};
const tap=async(i:number)=>{await act(async()=>{const n=screen.root.findAll(n=>n.props.accessibilityRole==='button'&&n.props.accessibilityLabel?.startsWith(`Row ${Math.floor(i/6)+1}, column ${i%6+1},`))[0];n.props.onAccessibilityTap();});};
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);env.width=744;env.height=1133;env.fontScale=1;env.reader=true;env.blur.mockClear();env.top=undefined;env.announce.mockClear();});
afterEach(async()=>{if(screen)await act(async()=>screen.unmount());vi.unstubAllGlobals();});
it('off-centre curved finger paths lock correctly at every speed and cell size',()=>{
 let seed=79;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(const size of [35,44,58])for(const [dy,dx] of core.directions){let correct=0;
  for(let n=0;n<400;n++){const start={x:(8.2+rand()*.6)*size,y:(8.2+rand()*.6)*size},angle=Math.atan2(dy,dx)+(rand()-.5)*16*Math.PI/180;let lock:core.Direction|null=null;const steps=5+Math.floor(rand()*50);
   for(let k=1;k<=steps;k++){const d=k/steps*size*3.8,curve=Math.sin(k/steps*Math.PI)*size*.12;const ray=core.dragRay(8*16+8,start,{x:start.x+Math.cos(angle)*d+curve,y:start.y+Math.sin(angle)*d-curve},size,16,16,lock);lock=ray.direction;}
   if(lock?.[0]===dy&&lock?.[1]===dx)correct++;
  }expect(correct/400).toBeGreaterThanOrEqual(.95);
 }
});
it('can re-snap after an early curve and cancels a stroke returned to its origin',()=>{
 const start={x:44,y:44},a=core.dragRay(17,start,{x:100,y:44},44,16,16);expect(a.direction).toEqual([0,1]);
 expect(core.dragRay(17,start,{x:170,y:170},44,16,16,a.direction).direction).toEqual([1,1]);
 expect(core.dragRay(17,start,start,44,16,16,a.direction).cells).toEqual([17]);
});
it('hunters choose stable identities; taps never cross and another hunter drag preserves the first tap',async()=>{
 const dispatch=await mount();await tap(p.words[0].cells[0]);await press('Purple');await tap(p.words[1].cells[0]);expect(dispatch).not.toHaveBeenCalled();
 await tap(p.words[1].cells.at(-1)!);expect(dispatch).toHaveBeenLastCalledWith(['find',p.words[1].cells[0],p.words[1].cells.at(-1),1]);
 await press('Green');await tap(p.words[0].cells.at(-1)!);expect(dispatch).toHaveBeenLastCalledWith(['find',p.words[0].cells[0],p.words[0].cells.at(-1),0]);
});
it('landscape phones retain turns rather than admitting two hunters',async()=>{
 env.width=852;env.height=393;await mount();expect(JSON.stringify(screen.toJSON())).toContain("Green's turn");expect(JSON.stringify(screen.toJSON())).not.toContain('Purple');
});
it('hearing is recorded once and undo, redo, help restore the right phone turn',()=>{
 let s=initial();s=searchEngine.step(s,['hear',0],p)!.state;expect(searchEngine.step(s,['hear',1],p)?.state.heard).toBe(true);
 const card=fixtureRegistration.puzzles[0];let session=fixtureRegistration.start(card.ref,'family','hear-budget',emptyChallenge(),{ownRead:false,supportOff:false},[]);
 session=fixtureRegistration.move(session,['hear',0])!;const before=JSON.stringify(session);
 for(let i=0;i<1000;i++)expect(fixtureRegistration.move(session,['hear',i%p.words.length])).toBeNull();expect(JSON.stringify(session)).toBe(before);
 for(const w of p.words)session=fixtureRegistration.move(session,['find',w.cells[0],w.cells.at(-1),0])!;expect(session.result).not.toBeNull();
 s=searchEngine.step(s,['find',p.words[0].cells[0],p.words[0].cells.at(-1)!,0],p)!.state;expect(s.turn).toBe(1);
 s=searchEngine.step(s,['undo'],p)!.state;expect(s.turn).toBe(0);s=searchEngine.step(s,['redo'],p)!.state;expect(s.turn).toBe(1);
 s=searchEngine.step(s,['help'],p)!.state;expect(s.found.at(-1)?.[1]).toBe(1);expect(s.turn).toBe(0);
});
it('announces first/last choices and accepted finds on iOS, and has a hardware-keyboard selection path',async()=>{
 await mount();await tap(0);expect(env.announce).toHaveBeenCalledWith(expect.stringContaining('Now tap'));
 const input=screen.root.findByType('input');expect(input.props.showSoftInputOnFocus).toBe(false);await act(async()=>input.props.onKeyPress({nativeEvent:{key:'ArrowRight'}}));await act(async()=>input.props.onKeyPress({nativeEvent:{key:' '}}));
 expect(screen.root.findAll(n=>n.props.accessibilityActions).length).toBe(0);
});
it.each([1,1.3,1.35])('keeps all default type sizes and the board unchanged at %s',async(scale)=>{
 env.fontScale=scale;await mount();for(const type of ['button','copy','heading'])for(const n of screen.root.findAllByType(type as React.ElementType))expect(n.props.maxFontSizeMultiplier??Infinity).toBeGreaterThanOrEqual(scale);
 expect(surface().props.style.width).toBe(350);
});
it.each([[393,852],[852,393],[744,1133],[1133,744]])('budgets board plus first list row at AX5 in %sx%s',async(width,height)=>{
 env.width=width;env.height=height;env.fontScale=3.12;await mount({width:width-40});
 const board=surface(),row=screen.root.findByProps({testID:'search-board-list'});expect(row.props.style.flexDirection).toBe(width>=700?'row':'column');
 expect(board.props.style.height).toBeLessThanOrEqual(height-150);for(const type of ['button','copy','heading'])for(const n of screen.root.findAllByType(type as React.ElementType))expect(n.props.maxFontSizeMultiplier).toBeLessThanOrEqual(type==='heading'?2:1.5);
 const answers=screen.root.findAllByProps({testID:'search-answer'});expect(answers).toHaveLength(p.words.length);expect(answers.every(n=>n.props.numberOfLines===1&&n.props.adjustsFontSizeToFit)).toBe(true);
});
it('zoom has an explicit pan mode so native scrolling never steals word selection',async()=>{
 const large={...p,cells:Array.from({length:16},()=>Array(16).fill('A'))};await mount({state:{...initial(),puzzle:large}});await press('Enlarge letters');
 expect(screen.root.findAllByType('scroll' as React.ElementType).filter(n=>n.props.scrollEnabled).length).toBe(0);await press('Move grid');expect(surface().props.onStartShouldSetResponder()).toBe(false);
});
it('keeps the full board and first list row within one height budget, including the host bar',async()=>{
 const {searchLayout}=await import('../src/puzzles/words/layout');
 for(const [width,height] of [[393,852],[852,393],[744,1133],[1133,744]])for(const n of [4,6,16]){
  const chrome={top:height<500?0:60,bottom:34,bar:80},l=searchLayout(width-40,height,3.12,n,n,false,false,chrome);
  const overhead=l.short?95:58+30+33+48+(l.beside?0:58);
  expect(l.size*n+chrome.top+chrome.bottom+chrome.bar+overhead).toBeLessThanOrEqual(height);
 }
});
it('leaves an existing repeated-hearing replay readable and completable',()=>{
 const ref=fixtureRegistration.puzzles[0].ref,s=fixtureRegistration.start(ref,'family','legacy-hearing',emptyChallenge(),{ownRead:false,supportOff:false},[]);
 const prior={...s,revision:2,payload:{...(s.payload as object),actions:[['hear',0],['hear',0]]}};
 expect(fixtureRegistration.move(prior,['find',p.words[0].cells[0],p.words[0].cells.at(-1),0])).not.toBeNull();
});
it('never reveals unfound teaching spellings in a hidden-list round',async()=>{
 const hidden={...p,language:'ch' as const,list:'hidden' as const};await mount({state:{...initial(),puzzle:hidden}});
 const text=JSON.stringify(screen.toJSON());for(const w of p.words)expect(text).not.toContain(w.spelling);
});
it('provides a neutral picture fallback with Hear still available when loading fails',async()=>{
 await mount();expect(screen.root.findAll(n=>n.props.accessibilityLabel==='Picture unavailable. Use Hear word.').length).toBe(p.words.length);
 expect(screen.root.findAllByType('button').filter(n=>n.children.includes('Hear word')).length).toBe(p.words.length);
});
it('keeps enlargement and pan mode visible ahead of a dense AX5 board',async()=>{
 env.fontScale=3.12;const large={...p,cells:Array.from({length:16},()=>Array(16).fill('A'))};await mount({state:{...initial(),puzzle:large}});
 const container=screen.root.findByProps({testID:'word-search-keyboard'}),children=container.children as import('react-test-renderer').ReactTestInstance[];
 const tools=children.findIndex(n=>n.props?.testID==='search-viewport-tools'),board=children.findIndex(n=>n.props?.testID==='search-board-list');
 expect(tools).toBeGreaterThanOrEqual(0);expect(tools).toBeLessThan(board);
 await press('Enlarge letters');expect(screen.root.findByProps({testID:'search-viewport-tools'}).findAllByType('button').some(n=>n.children.includes('Move grid'))).toBe(true);
});
it('keeps grid and list taps handled while the native hardware-key input is focused',async()=>{
 env.fontScale=3.12;await mount();const scrolls=screen.root.findAllByType('scroll' as React.ElementType);
 expect(scrolls.length).toBeGreaterThan(1);for(const scroll of scrolls)expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
});
it('speaks the newly found answer as well as the updated count on iOS',async()=>{
 const dispatch=await mount(),s=initial(),w=p.words[0],next=searchEngine.step(s,['find',w.cells[0],w.cells.at(-1)!,0],p)!.state;
 await act(async()=>screen.update(<WordSearchBoard state={next} dispatch={dispatch} active width={353} together/>));
 expect(env.announce).toHaveBeenLastCalledWith(expect.stringContaining(w.spelling));expect(env.announce).toHaveBeenLastCalledWith(expect.stringContaining('1 of'));
});
it('reserves the complete first answer card, including Hear, in both phone orientations',async()=>{
 const {searchLayout}=await import('../src/puzzles/words/layout');
 for(const [width,height] of [[393,852],[852,393]])for(const pictures of [false,true])for(const n of [4,6,16]){
  const short=height<500,chrome={top:short?0:59,bottom:short?21:34,bar:110};
  const l=searchLayout(width-40,height,3.12,n,n,pictures,false,chrome,true);
  const card=short?108:118,other=short?99:66+38+33+48,tools=l.size<44?54:0;
  const region=l.beside?Math.max(l.size*n,card):l.size*n+card;
  expect(region+chrome.top+chrome.bottom+chrome.bar+other+tools).toBeLessThanOrEqual(height);
 }
});
it('shares one fitted size across long answers, reserving the found mark too',async()=>{
 const {wordWidth}=await import('../src/components/wordFit');env.fontScale=3.12;
 const long={...p,words:p.words.map((w,i)=>({...w,spelling:i===0?'W'.repeat(16):w.spelling}))};await mount({state:{...initial(),puzzle:long}});
 const answers=screen.root.findAllByProps({testID:'search-answer'}),sizes=answers.map(n=>n.props.style.fontSize),caps=answers.map(n=>n.props.maxFontSizeMultiplier);
 expect(new Set(sizes).size).toBe(1);expect(new Set(caps).size).toBe(1);
 expect(wordWidth(`✓ ${long.words[0].spelling}`)*sizes[0]*caps[0]).toBeLessThanOrEqual(168*.92+.01);
});

it('Hear preserves independent completion and solo Clean credit in the real registration, but forbids own-read',()=>{
 const base=fixturePuzzles[0],card={...base,dares:[
  {slot:1500,id:'synthetic-clean',label:'Clean',rule:{kind:'clean' as const},help:'independent' as const},
  {slot:1501,id:'synthetic-read',label:'Read',rule:{kind:'own-read' as const},help:'independent' as const}]};
 const entry=defineWordSearch([],[card]);
 for(const hear of [false,true]){
  let s=entry.start(card.ref,'family',`hearing-${hear}`,emptyChallenge(),{ownRead:true,supportOff:false},[1500,1501]);
  if(hear)s=entry.move(s,['hear',0])!;
  for(const w of p.words)s=entry.move(s,['find',w.cells[0],w.cells.at(-1),0])!;
  expect(s.result?.event).toBe('independent');expect(s.result?.dares).toEqual(hear?[1500]:[1500,1501]);
 }
});
it('realistic curved traces finish on the intended start, direction AND end, including edge landings',()=>{
 let seed=913;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(const size of [35,44,58])for(const [dy,dx] of core.directions){let correct=0;
  for(let n=0;n<600;n++){
   const row=dy<0?9:6,col=dx<0?9:6,start=row*16+col,length=2+n%6;
   const origin={x:(col+.02+rand()*.96)*size,y:(row+.02+rand()*.96)*size};
   const target={x:(col+dx*length+.15+rand()*.7)*size,y:(row+dy*length+.15+rand()*.7)*size};
   let ray:ReturnType<typeof core.dragRay>={direction:null,cells:[start]};const distance=Math.hypot(target.x-origin.x,target.y-origin.y),steps=Math.ceil(distance/(2+rand()*5));
   for(let k=1;k<=steps;k++){
    const t=k/steps,curve=Math.sin(t*Math.PI)*size*.12,wobble=Math.sin(t*Math.PI*4)*(1-t)*size*.04;
    ray=core.dragRay(start,origin,{x:origin.x+(target.x-origin.x)*t+curve+wobble,y:origin.y+(target.y-origin.y)*t-curve+wobble},size,16,16,ray.direction);
   }
   if(ray.cells[0]===start&&ray.direction?.[0]===dy&&ray.direction?.[1]===dx&&ray.cells.at(-1)===start+length*(dy*16+dx))correct++;
  }expect(correct/600).toBeGreaterThanOrEqual(.99);
 }
});
const touch=(x:number,y:number,id=0)=>({nativeEvent:{changedTouches:[{identifier:id,locationX:x,locationY:y}]}});
it('board follows the finger vector rather than snapping to the first neighbour cell (M1)',async()=>{
 env.reader=false;const dispatch=await mount(),size=(surface().props.style.width-2)/6;
 // The first sample is in the horizontal neighbour, but the true diagonal then curves down.
 const a=touch(size*4.08,size*4.50),b=touch(size*3.88,size*4.35),c=touch(size*1.52,size*1.55);
 await act(async()=>surface().props.onResponderGrant(a));await act(async()=>surface().props.onResponderMove(b));
 await act(async()=>surface().props.onResponderMove(c));await act(async()=>surface().props.onResponderRelease(c));
 expect(dispatch).toHaveBeenLastCalledWith(['find-many',[[28,7,0]]]);
});
it('second simultaneous pointer gets the other hunter even when purple was chosen first (M2)',async()=>{
 env.reader=false;const dispatch=await mount();await press('Purple');const size=(surface().props.style.width-2)/6;
 const at=(i:number,id:number)=>touch((i%6+.5)*size,(Math.floor(i/6)+.5)*size,id);
 await act(async()=>surface().props.onResponderGrant(at(p.words[0].cells[0],11)));
 await act(async()=>surface().props.onResponderStart(at(p.words[1].cells[0],12)));
 const both={nativeEvent:{changedTouches:[...at(p.words[0].cells.at(-1)!,11).nativeEvent.changedTouches,...at(p.words[1].cells.at(-1)!,12).nativeEvent.changedTouches]}};
 await act(async()=>surface().props.onResponderMove(both));await act(async()=>surface().props.onResponderRelease(both));
 expect(dispatch).toHaveBeenLastCalledWith(['find-many',[[p.words[0].cells[0],p.words[0].cells.at(-1),1],[p.words[1].cells[0],p.words[1].cells.at(-1),0]]]);
});
it('keeps focus separate from selection, with no default cursor or completed-find selection',async()=>{
 await mount();const cells=()=>screen.root.findAll(n=>n.props.accessibilityRole==='button'&&n.props.accessibilityLabel?.startsWith('Row '));
 expect(cells().some(n=>n.props.accessibilityState.selected)).toBe(false);
 expect(cells().some(n=>n.props.style.borderStyle==='dashed'&&n.props.style.borderWidth)).toBe(false);
 await tap(p.words[0].cells[0]);expect(cells().filter(n=>n.props.accessibilityState.selected)).toHaveLength(1);
 await tap(p.words[0].cells.at(-1)!);expect(cells().some(n=>n.props.accessibilityState.selected)).toBe(false);
 await act(async()=>screen.root.findByType('input').props.onKeyPress({nativeEvent:{key:'ArrowRight'}}));
 expect(cells().some(n=>n.props.style.borderStyle==='dashed'&&n.props.style.borderWidth)).toBe(true);
 expect(cells().some(n=>n.props.accessibilityState.selected)).toBe(false);
});
it('a tiny edge-crossing tap retains its starting cell and pending first letter',async()=>{
 env.reader=false;const dispatch=await mount(),size=(surface().props.style.width-2)/6;
 await tap(p.words[0].cells[0]);const end=p.words[0].cells.at(-1)!,x=(end%6+1)*size-1,y=(Math.floor(end/6)+.5)*size;
 await act(async()=>surface().props.onResponderGrant(touch(x,y)));await act(async()=>surface().props.onResponderMove(touch(x+3,y)));await act(async()=>surface().props.onResponderRelease(touch(x+3,y)));
 expect(dispatch).toHaveBeenLastCalledWith(['find',p.words[0].cells[0],end,0]);
});
it('uses its measured window position to budget the actual host chrome at AX5',async()=>{
 env.width=393;env.height=852;env.fontScale=3.12;env.top=230;await mount();
 const root=screen.root.findByProps({testID:'word-search-keyboard'});await act(async()=>root.props.onLayout({nativeEvent:{layout:{y:100,width:353}}}));
 // board, title/instructions/status/gaps, full picture/audio card and bottom inset.
 expect(surface().props.style.height+66+38+33+48+118+env.top+34).toBeLessThanOrEqual(852);
});
it('includes the full frame border within the iPad viewport at default text',async()=>{
 await mount({width:704});expect(surface().props.style.width).toBeLessThanOrEqual(660);
});

it('reports capacity using the attempted two-find action, with no byte estimate',()=>{
 const ref=fixtureRegistration.puzzles[0].ref,base=fixtureRegistration.start(ref,'family','capacity',emptyChallenge(),{ownRead:false,supportOff:false},[]);
 const action=['find-many',[[28,7,0],[32,17,1]]];
 for(let n=0;n<3330;n++){
  const s={...base,id:'x'.repeat(n)},payload=s.payload as import('../src/challenge/types').ReplayPayload<unknown,unknown>;
  const next={...s,revision:s.revision+1,payload:{...payload,actions:[...payload.actions,action]}};
  expect(fixtureRegistration.full(s,action)).toBe(new TextEncoder().encode(JSON.stringify(next)).length>2896);
 }
});

it('keeps the short-window theme compact enough for the measured Cove chrome and Hear card',async()=>{
 env.width=852;env.height=393;env.fontScale=3.12;env.top=126;await mount({width:694});
 expect(screen.root.findByType('heading' as React.ElementType).props.maxFontSizeMultiplier).toBe(1);
});

it('blurs the hidden native keyboard when the round becomes inactive',async()=>{
 const dispatch=await mount();await act(async()=>screen.update(<WordSearchBoard state={initial()} dispatch={dispatch} active={false} width={353} together/>));expect(env.blur).toHaveBeenCalled();
});
it('the selected purple hunter keeps purple colour and a dotted pattern',async()=>{
 await mount();await press('Purple');const b=screen.root.findAllByType('button').find(n=>n.children.includes('Purple'))!;
 expect(b.props.style.backgroundColor).toBe('#8A4D81');expect(b.props.style.borderStyle).toBe('dotted');
});

it('projects from the first cell centre for lifts anywhere inside the last cell',()=>{
 let seed=19;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(const size of [35,44,58])for(const direction of core.directions)for(let i=0;i<1000;i++){
  const [dy,dx]=direction,row=dy<0?9:6,col=dx<0?9:6,start=row*16+col,length=2+i%6;
  const origin={x:(col+.01+rand()*.98)*size,y:(row+.01+rand()*.98)*size};
  const point={x:(col+dx*length+.01+rand()*.98)*size,y:(row+dy*length+.01+rand()*.98)*size};
  expect(core.dragRay(start,origin,point,size,16,16,direction).cells.at(-1)).toBe(start+length*(dy*16+dx));
 }
});

it('returning a real drag to its origin cancels quietly rather than choosing a first letter',async()=>{
 env.reader=false;const dispatch=await mount(),size=(surface().props.style.width-2)/6;
 const start=touch(size*4.5,size*4.5),far=touch(size*1.5,size*1.5);
 await act(async()=>surface().props.onResponderGrant(start));await act(async()=>surface().props.onResponderMove(far));await act(async()=>surface().props.onResponderMove(start));await act(async()=>surface().props.onResponderRelease(start));
 expect(dispatch).not.toHaveBeenCalled();expect(JSON.stringify(screen.toJSON())).not.toContain('Now tap the last letter.');
});
