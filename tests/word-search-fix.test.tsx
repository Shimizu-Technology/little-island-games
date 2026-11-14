import React, { createContext } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { WordSearchBoard } from '../src/puzzles/words/WordSearchBoard';
import { searchEngine } from '../src/puzzles/words/game';
import * as core from '../src/puzzles/words/core';
import { fixtureRegistration } from './fixtures/word-search/registration';
import { emptyChallenge } from '../src/state/challenge';
import fixture from './fixtures/word-search/bank.json';
const env=vi.hoisted(()=>({width:744,height:1133,fontScale:1,announce:vi.fn(),play:vi.fn(()=>true)}));
vi.mock('react-native',()=>({AccessibilityInfo:{isScreenReaderEnabled:async()=>true,addEventListener:()=>({remove(){}}),announceForAccessibility:env.announce},ScrollView:'scroll',View:'view',TextInput:'input',Platform:{OS:'ios'},useWindowDimensions:()=>env}));
vi.mock('react-native-svg',()=>({default:'svg',Circle:'circle',Line:'line',SvgXml:'picture'}));
vi.mock('../src/components/ui',()=>({Button:'button',Copy:'copy',Heading:'heading',C:{}}));
vi.mock('../src/components/Text',()=>({Text:'text'}));
vi.mock('../src/components/Audio',()=>({useSoundControls:()=>({play:env.play})}));
vi.mock('../src/puzzles/words/picture-context',()=>({SearchPicturesContext:createContext({idFor:()=>undefined,load:async()=>{throw Error();}})}));
let screen:ReactTestRenderer;
const p=fixture.puzzles[0] as core.SearchPuzzle;
const initial=()=>searchEngine.create(p,{version:1},{ownRead:false,supportOff:false});
const mount=async(props={})=>{const dispatch=vi.fn();await act(async()=>{screen=create(<WordSearchBoard state={initial()} dispatch={dispatch} active width={353} together {...props}/>);});return dispatch;};
const surface=()=>screen.root.findAll(n=>!!n.props.onResponderGrant)[0];

const press=async(label:string)=>{await act(async()=>{const b=screen.root.findAllByType('button').find(n=>n.children.includes(label));expect(b).toBeDefined();b!.props.onPress();});};
const tap=async(i:number)=>{await act(async()=>{const n=screen.root.findAll(n=>n.props.accessibilityRole==='button'&&n.props.accessibilityLabel?.startsWith(`Row ${Math.floor(i/6)+1}, column ${i%6+1},`))[0];n.props.onAccessibilityTap();});};
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);env.width=744;env.height=1133;env.fontScale=1;env.announce.mockClear();});
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
 const dispatch=await mount();await tap(p.words[0].cells[0]);await press('Purple hunter · dotted');await tap(p.words[1].cells[0]);expect(dispatch).not.toHaveBeenCalled();
 await tap(p.words[1].cells.at(-1)!);expect(dispatch).toHaveBeenLastCalledWith(['find',p.words[1].cells[0],p.words[1].cells.at(-1),1]);
 await press('Green hunter · solid');await tap(p.words[0].cells.at(-1)!);expect(dispatch).toHaveBeenLastCalledWith(['find',p.words[0].cells[0],p.words[0].cells.at(-1),0]);
});
it('landscape phones retain turns rather than admitting two hunters',async()=>{
 env.width=852;env.height=393;await mount();expect(JSON.stringify(screen.toJSON())).toContain('Take turns.');expect(JSON.stringify(screen.toJSON())).not.toContain('Purple hunter · dotted');
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
 await mount();await tap(0);expect(env.announce).toHaveBeenCalledWith(expect.stringContaining('Now choose'));
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
 expect(screen.root.findAllByType('scroll' as React.ElementType).filter(n=>n.props.scrollEnabled).length).toBe(0);await press('Move enlarged grid');expect(surface().props.onStartShouldSetResponder()).toBe(false);
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
