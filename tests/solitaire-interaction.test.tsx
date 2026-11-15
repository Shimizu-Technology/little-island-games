import React,{useEffect,useState} from 'react';
import {act,create,type ReactTestRenderer,type ReactTestInstance} from 'react-test-renderer';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {defineSolitaire,type BankFacts,type TableAction} from '../src/puzzles/table/registration';
import {SolitaireBoard} from '../src/puzzles/table/SolitaireBoard';
import {GridFeedback,GridInteraction} from '../src/puzzles/grid/preferences';
import {construct} from '../scripts/puzzles/solitaire/generate';
import {emptyChallenge,type ChallengeSession} from '../src/state/challenge';
import {readTable} from '../src/puzzles/table/checkpoint';
import {legalMoves,opening,type Deal,type Mode} from '../src/puzzles/table/solitaire';
import {cardWords} from '../src/puzzles/table/solver';
const fake=vi.hoisted(()=>({descriptor:null as unknown,scale:1,feedback:vi.fn(),held:[] as boolean[],session:null as ChallengeSession|null}));
vi.mock('../src/puzzles/catalog',()=>({bankLoader:()=>({entry:async()=>fake.descriptor,savedHash:async()=> 'a'.repeat(64)})}));
vi.mock('react-native-safe-area-context',()=>({useSafeAreaInsets:()=>({top:0,bottom:34,left:0,right:0})}));
vi.mock('react-native',()=>({View:'div',Pressable:'button',ScrollView:'section',useWindowDimensions:()=>({width:393,height:852,fontScale:fake.scale}),PanResponder:{create:(h:unknown)=>({panHandlers:h})},Animated:{View:'aside',ValueXY:class{v={x:0,y:0};setValue(v:{x:number;y:number}){this.v=v;}getTranslateTransform(){return[{translateX:this.v.x},{translateY:this.v.y}];}}}}));
vi.mock('../src/components/ui',()=>({Button:'button',Copy:'p',C:{gold:'#E1B251',teal:'#246858',ink:'#183F39'}}));
vi.mock('../src/components/Text',()=>({Text:'span'}));
async function fixture(mode:Mode='freecell'){
 const deal=construct(mode,4,1).deal,ref={bank:100,puzzle:0,engine:'solitaire',rules:1,hash:'a'.repeat(64)};
 fake.descriptor={format:1,seed:4,rng:1,band:'f1',layout:'steady',template:'steady',payload:deal,objectives:[],limits:[],par:null,teaches:['search-1'],speech:null,ref};
 const fact:BankFacts={family:mode==='freecell'?'freecell':'solitaire',slot:100,first:102400,count:1,packHash:'b'.repeat(64),rules:1,band:'f1',tier:1,title:'FreeCell · Paddling',summary:'Foundation building'};
 const entry=defineSolitaire([fact]);await entry.packed!.prepare(ref);
 const initial=entry.start(ref,'family','cove-family-1',emptyChallenge(),{supportOff:false,ownRead:false},[]);
 function Harness({saved=initial}:{saved?:ChallengeSession}){const[s,set]=useState(saved);useEffect(()=>{fake.session=s;},[s]);return <GridFeedback.Provider value={fake.feedback}><GridInteraction.Provider value={held=>fake.held.push(held)}><SolitaireBoard view={{deal,payload:readTable(s.payload,deal)!.payload,title:'FreeCell · Paddling 1',summary:'Foundation building'}} dispatch={(a:TableAction)=>set(before=>entry.move(before,a)??before)} active={!s.result} width={353}/></GridInteraction.Provider></GridFeedback.Provider>;}
 return {deal,Harness};
}
const text=(screen:ReactTestRenderer)=>JSON.stringify(screen.toJSON());
const press=async(screen:ReactTestRenderer,label:string)=>act(async()=>{const b=screen.root.findAllByType('button').find(n=>(n.children as unknown[]).join('')===label);expect(b,label).toBeDefined();expect(b!.props.disabled).not.toBe(true);b!.props.onPress();});
const settle=()=>act(async()=>{await new Promise(r=>setTimeout(r,10));});
const card=(screen:ReactTestRenderer,pile:number,id:number)=>screen.root.findAllByType('button').find(n=>n.props.accessibilityLabel===`Column ${pile+1}, ${cardWords(id)}, 1 card to move`)!;
const blank=(screen:ReactTestRenderer)=>screen.root.findAllByType('button').find(n=>n.props.accessibilityLabel==='Free cell 1, empty')!;
const surface=(screen:ReactTestRenderer)=>screen.root.findAll(n=>typeof n.props.onPanResponderGrant==='function')[0];
const board=(d:Deal)=>readTable(fake.session!.payload,d)!;
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);fake.scale=1;fake.feedback.mockClear();fake.held=[];fake.session=null;});
describe('Solitaire card interaction',()=>{
 it('tap alternatives, drag, undo and serialized resume keep the exact accepted table',async()=>{
  const{deal,Harness}=await fixture();let screen!:ReactTestRenderer;
  try{
   await act(async()=>{screen=create(<Harness/>);});
   const move=legalMoves(opening(deal),deal.mode).find(a=>a[0]<8&&a[1]===12&&a[2]===1)!;
   const c=opening(deal).piles[move[0]].at(-1)!;
   await act(async()=>card(screen,move[0],c).props.onAccessibilityAction({nativeEvent:{actionName:'activate'}}));
   await act(async()=>blank(screen).props.onAccessibilityAction({nativeEvent:{actionName:'activate'}}));
   expect(board(deal).position.piles[12]).toEqual([c]);expect(fake.feedback).toHaveBeenCalledTimes(1);
   const saved=JSON.parse(JSON.stringify(fake.session));await act(async()=>screen.unmount());
   await act(async()=>{screen=create(<Harness saved={saved}/>);});expect(fake.session).toEqual(saved);
   await press(screen,'Undo');expect(board(deal).position.piles).toEqual(opening(deal).piles);
   const from=card(screen,move[0],c),to=blank(screen),x=from.props.style.left+20,y=from.props.style.top+16,dx=to.props.style.left-from.props.style.left,dy=to.props.style.top-from.props.style.top;
   await act(async()=>{const p=surface(screen).props;p.onPanResponderGrant({nativeEvent:{locationX:x,locationY:y}});p.onPanResponderMove({}, {dx,dy});p.onPanResponderRelease({}, {dx,dy});});
   expect(board(deal).position.piles[12]).toEqual([c]);expect(fake.held).toContain(true);expect(fake.held.at(-1)).toBe(false);
  }finally{if(screen)await act(async()=>screen.unmount());}
 });
 it('Look and Think reveal no move; One step and every demonstration step require a tap',async()=>{
  const{deal,Harness}=await fixture();let screen!:ReactTestRenderer;
  try{
   await act(async()=>{screen=create(<Harness/>);});await press(screen,'Hint');expect(text(screen)).toContain('Look for');expect(board(deal).payload.edits).toBe(0);
   await press(screen,'Think');expect(text(screen)).toContain('Think about');expect(board(deal).payload.edits).toBe(0);
   await press(screen,'One step');for(let i=0;i<100&&board(deal).payload.edits!==1;i++)await settle();expect(board(deal).payload.edits).toBe(1);
   await press(screen,'Show me');for(let i=0;i<100&&board(deal).payload.edits!==2;i++)await settle();expect(board(deal).payload.edits).toBe(2);
   await settle();await settle();expect(board(deal).payload.edits).toBe(2);expect(board(deal).payload.audit).toEqual([1]);
   await press(screen,'Undo');expect(board(deal).payload.audit).toEqual([1]);
  }finally{if(screen)await act(async()=>screen.unmount());}
 });

 it('a tap on a blocked FreeCell stack explains which cards must move first, with a hit frame inside the exposed strip',async()=>{
  const{Harness,deal}=await fixture();let screen!:ReactTestRenderer;
  try{await act(async()=>{screen=create(<Harness/>);});
   const first=screen.root.findAllByType('button').find(n=>n.props.accessibilityLabel?.startsWith('Column 1,')&&n.props.style.top<200)!;
   expect(first.props.style.height).toBeLessThanOrEqual(32);
   await act(async()=>{const p=surface(screen).props;p.onPanResponderGrant({nativeEvent:{locationX:first.props.style.left+10,locationY:first.props.style.top+16}});p.onPanResponderRelease({}, {dx:0,dy:0});});
   expect(text(screen)).toContain('Move the cards above this one first.');expect(board(deal).payload.edits).toBe(0);
  }finally{if(screen)await act(async()=>screen.unmount());}
 });

 it('draw-three displays the two observed cards behind the playable top waste card',async()=>{
  const{Harness,deal}=await fixture('draw-three');let screen!:ReactTestRenderer;
  try{await act(async()=>{screen=create(<Harness/>);});await press(screen,'Draw three · 24 in stock');
   const waste=board(deal).position.piles[13];expect(waste).toHaveLength(3);
   const seen=screen.root.findAll(n=>typeof n.props.accessibilityLabel==='string'&&n.props.accessibilityLabel.startsWith('Seen behind the top waste card:'));
   expect(seen).toHaveLength(1);for(const c of waste.slice(0,2))expect(seen[0].props.accessibilityLabel).toContain(cardWords(c));
   expect(screen.root.findAllByType('button').filter(n=>n.props.accessibilityLabel?.startsWith('Waste,'))).toHaveLength(1);
   expect(screen.root.findAllByType('button').find(n=>n.props.accessibilityLabel===`Waste, ${cardWords(waste[2])}`)).toBeDefined();
  }finally{if(screen)await act(async()=>screen.unmount());}
 });

 it('bounds Lower cards to the actual visible space above the phone home indicator',async()=>{
  const{Harness}=await fixture();let screen!:ReactTestRenderer;
  try{await act(async()=>{screen=create(<Harness/>,{createNodeMock:n=>(n.props as {testID?:string}).testID==='solitaire-table-viewport'?{measureInWindow:(cb:(x:number,y:number,w:number,h:number)=>void)=>cb(0,600,353,440)}:null});});
   expect(screen.root.findAllByType('section').find(n=>n.props.accessibilityLabel==='Solitaire table, vertical scroll')!.props.style.maxHeight).toBe(206);
  }finally{if(screen)await act(async()=>screen.unmount());}
 });
 it('fits eight default-size columns and keeps AX5 controls plus full card names available',async()=>{
  const{Harness}=await fixture();let screen!:ReactTestRenderer;
  try{
   await act(async()=>{screen=create(<Harness/>);});
   const columns=screen.root.findAllByType('button').filter(n=>/^Column /.test(n.props.accessibilityLabel??''));
   expect(new Set(columns.map(n=>n.props.accessibilityLabel.match(/^Column \d+/)[0])).size).toBe(8);
   expect(Math.max(...columns.map(n=>n.props.style.left+(n.children[0] as ReactTestInstance).props.style.width))).toBeLessThanOrEqual(353);
   await act(async()=>screen.unmount());fake.scale=3.5;await act(async()=>{screen=create(<Harness/>);});
   expect(screen.root.findAllByType('span').every(n=>n.props.maxFontSizeMultiplier===1.5)).toBe(true);
   expect(text(screen)).toContain('Lower cards');expect(text(screen)).toContain('Top');
   expect(screen.root.findAllByType('button').some(n=>/^Column 8, /.test(n.props.accessibilityLabel??''))).toBe(true);
  }finally{if(screen)await act(async()=>screen.unmount());}
 });
});
