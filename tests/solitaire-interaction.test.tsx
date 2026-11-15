import React,{useEffect,useState} from 'react';
import {act,create,type ReactTestRenderer,type ReactTestInstance} from 'react-test-renderer';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {defineSolitaire,type BankFacts,type TableAction} from '../src/puzzles/table/registration';
import {SolitaireBoard} from '../src/puzzles/table/SolitaireBoard';
import {GridFeedback,GridInteraction} from '../src/puzzles/grid/preferences';
import {construct} from '../scripts/puzzles/solitaire/generate';
import {emptyChallenge,type ChallengeSession} from '../src/state/challenge';
import {readTable} from '../src/puzzles/table/solitaireCheckpoint';
import {legalMoves,opening,type Deal,type Mode} from '../src/puzzles/table/solitaire';
import * as publicHints from '../src/puzzles/table/publicSolver';
import {cardWords} from '../src/puzzles/table/solver';
const fake=vi.hoisted(()=>({descriptor:null as unknown,scale:1,height:852,feedback:vi.fn(),held:[] as boolean[],session:null as ChallengeSession|null,appState:undefined as ((state:string)=>void)|undefined}));
vi.mock('../src/puzzles/catalog',()=>({bankLoader:()=>({entry:async()=>fake.descriptor,savedHash:async()=> 'a'.repeat(64)})}));
vi.mock('react-native-safe-area-context',()=>({useSafeAreaInsets:()=>({top:0,bottom:34,left:0,right:0})}));
vi.mock('react-native',()=>({AppState:{currentState:'active',addEventListener:(_type:string,listener:(state:string)=>void)=>{fake.appState=listener;return{remove(){if(fake.appState===listener)fake.appState=undefined;}};}},View:'div',Pressable:'button',ScrollView:'section',useWindowDimensions:()=>({width:fake.height<500?852:393,height:fake.height,fontScale:fake.scale}),PanResponder:{create:(h:unknown)=>({panHandlers:h})},Animated:{View:'aside',ValueXY:class{v={x:0,y:0};setValue(v:{x:number;y:number}){this.v=v;}getTranslateTransform(){return[{translateX:this.v.x},{translateY:this.v.y}];}}}}));
vi.mock('../src/components/ui',()=>({Button:'button',Copy:'p',C:{gold:'#E1B251',teal:'#246858',ink:'#183F39'}}));
vi.mock('../src/components/Text',()=>({Text:'span'}));
async function fixture(mode:Mode='freecell'){
 const deal=construct(mode,4,1).deal,ref={bank:100,puzzle:0,engine:'solitaire',rules:1,hash:'a'.repeat(64)};
 fake.descriptor={format:1,seed:4,rng:1,band:'f1',layout:'steady',template:'steady',payload:deal,objectives:[],limits:[],par:null,teaches:['search-1'],speech:null,ref};
 const fact:BankFacts={family:mode==='freecell'?'freecell':'solitaire',slot:100,first:102400,count:1,packHash:'b'.repeat(64),rules:1,band:'f1',tier:1,title:'FreeCell · Paddling',summary:'Foundation building'};
 const entry=defineSolitaire([fact]);await entry.packed!.prepare(ref);
 const initial=entry.start(ref,'family','cove-family-1',emptyChallenge(),{supportOff:false,ownRead:false},[]);
 function Harness({saved=initial}:{saved?:ChallengeSession}){const[s,set]=useState(saved);useEffect(()=>{fake.session=s;},[s]);return <GridFeedback.Provider value={fake.feedback}><GridInteraction.Provider value={held=>fake.held.push(held)}><SolitaireBoard view={{deal,payload:readTable(s.payload,deal)!.payload,title:'FreeCell · Paddling 1',summary:'Foundation building'}} dispatch={(a:TableAction)=>set(before=>entry.move(before,a)??before)} active={!s.result} width={fake.height<500?734:353}/></GridInteraction.Provider></GridFeedback.Provider>;}
 return {deal,Harness};
}
const text=(screen:ReactTestRenderer)=>JSON.stringify(screen.toJSON());
const press=async(screen:ReactTestRenderer,label:string)=>act(async()=>{const b=screen.root.findAllByType('button').find(n=>(n.children as unknown[]).join('')===label);expect(b,label).toBeDefined();expect(b!.props.disabled).not.toBe(true);b!.props.onPress();});
const settle=()=>act(async()=>{await new Promise(r=>setTimeout(r,10));});
const card=(screen:ReactTestRenderer,pile:number,id:number)=>screen.root.findAllByType('button').find(n=>n.props.accessibilityLabel===`Column ${pile+1}, ${cardWords(id)}, 1 card to move`)!;
const blank=(screen:ReactTestRenderer)=>screen.root.findAllByType('button').find(n=>n.props.accessibilityLabel==='Free cell 1, empty')!;
const surface=(screen:ReactTestRenderer)=>screen.root.findAll(n=>typeof n.props.onPanResponderGrant==='function')[0];
const board=(d:Deal)=>readTable(fake.session!.payload,d)!;
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);fake.scale=1;fake.height=852;fake.feedback.mockClear();fake.held=[];fake.session=null;});
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
   await press(screen,'One step');for(let i=0;i<100&&board(deal).payload.edits!==1;i++)await settle();expect(board(deal).payload.edits).toBe(1);expect(text(screen)).toContain('Moved');
   await press(screen,'Show me');for(let i=0;i<100&&board(deal).payload.edits!==2;i++)await settle();expect(board(deal).payload.edits).toBe(2);
   await settle();await settle();expect(board(deal).payload.edits).toBe(2);expect(board(deal).payload.audit).toEqual([1]);
   await press(screen,'Undo');expect(board(deal).payload.audit).toEqual([1]);
  }finally{if(screen)await act(async()=>screen.unmount());}
 });

 it('a tap on a blocked FreeCell stack explains which cards must move first, with a hit frame inside the exposed strip',async()=>{
  const{Harness,deal}=await fixture();let screen!:ReactTestRenderer;
  try{await act(async()=>{screen=create(<Harness/>);});
   const first=screen.root.findAllByType('button').find(n=>n.props.accessibilityLabel?.startsWith('Column 1,')&&n.props.style.top<180)!;
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

 it('keeps a selected card and explains an illegal tap destination before accepting a legal one',async()=>{
  const{Harness,deal}=await fixture();let screen!:ReactTestRenderer;
  try{await act(async()=>{screen=create(<Harness/>);});const initial=opening(deal),move=legalMoves(initial,deal.mode).find(a=>a[0]<8&&a[1]>=8&&a[1]<12)!;
   const c=initial.piles[move[0]].at(-1)!;await act(async()=>card(screen,move[0],c).props.onAccessibilityAction({nativeEvent:{actionName:'activate'}}));
   const names=['Clubs','Diamonds','Spades','Hearts'],target=(pile:number)=>screen.root.findAllByType('button').find(n=>n.props.accessibilityLabel===`${names[pile-8]} foundation, empty`)!;
   await act(async()=>target(8+(move[1]-8+1)%4).props.onAccessibilityAction({nativeEvent:{actionName:'activate'}}));
   expect(text(screen)).toContain("Those cards can't go there. Your table is kept.");expect(board(deal).payload.edits).toBe(0);expect(card(screen,move[0],c).props.accessibilityState.selected).toBe(true);
   const from=card(screen,move[0],c),to=target(8+(move[1]-8+1)%4);
   await act(async()=>{const p=surface(screen).props;p.onPanResponderGrant({nativeEvent:{locationX:from.props.style.left+20,locationY:from.props.style.top+16}});p.onPanResponderRelease({}, {dx:to.props.style.left-from.props.style.left,dy:to.props.style.top-from.props.style.top});});
   expect(text(screen)).toContain("Those cards can't go there. Your table is kept.");expect(board(deal).payload.edits).toBe(0);
   await act(async()=>target(move[1]).props.onAccessibilityAction({nativeEvent:{actionName:'activate'}}));expect(board(deal).position.piles[move[1]]).toEqual([c]);expect(fake.feedback).toHaveBeenCalledTimes(1);
  }finally{if(screen)await act(async()=>screen.unmount());}
 });

 it('explains a drag dropped on empty table and keeps the accepted table',async()=>{
  const{Harness,deal}=await fixture();let screen!:ReactTestRenderer;
  try{await act(async()=>{screen=create(<Harness/>);});const m=legalMoves(opening(deal),deal.mode).find(a=>a[0]<8&&a[2]===1)!,c=opening(deal).piles[m[0]].at(-1)!,from=card(screen,m[0],c),x=from.props.style.left+20,y=from.props.style.top+16;
   await act(async()=>{const p=surface(screen).props;p.onPanResponderGrant({nativeEvent:{locationX:x,locationY:y}});p.onPanResponderRelease({}, {dx:2000,dy:0});});
   expect(text(screen)).toContain('Drop on a card or an empty place. Your table is kept.');expect(board(deal).payload.edits).toBe(0);
  }finally{if(screen)await act(async()=>screen.unmount());}
 });
 it('keeps Draw before the table and gives Foundations a whole heading row',async()=>{
  const{Harness}=await fixture('draw-three');let screen!:ReactTestRenderer;
  try{fake.scale=3.5;await act(async()=>{screen=create(<Harness/>);});const all=screen.root.findAll(()=>true),draw=all.findIndex(n=>n.type==='button'&&n.children.join('').startsWith('Draw three')),table=all.findIndex(n=>n.props.testID==='solitaire-table-viewport');expect(draw).toBeLessThan(table);
   const heading=screen.root.findAllByType('span').find(n=>n.children.includes('Foundations'))!;expect(heading.props.style.position).not.toBe('absolute');
  }finally{if(screen)await act(async()=>screen.unmount());}
 });
 it('keeps Draw, Rules, both reserve rows and every opening tableau face visible at AX5 phone landscape',async()=>{
  const{Harness,deal}=await fixture('draw-three');let screen!:ReactTestRenderer;
  try{fake.scale=3.5;fake.height=393;await act(async()=>{screen=create(<Harness/>,{createNodeMock:n=>(n.props as {testID?:string}).testID==='solitaire-table-viewport'?{measureInWindow:(cb:(x:number,y:number,w:number,h:number)=>void)=>cb(0,220,694,130)}:null});});
   const buttons=screen.root.findAllByType('button'),draw=buttons.find(n=>n.children.join('').startsWith('Draw three'))!,undo=buttons.find(n=>n.children.includes('Undo'))!;
   expect(draw.parent).toBe(undo.parent);expect(draw.props.maxFontSizeMultiplier).toBe(1.3);
   const viewport=screen.root.findAllByType('section').find(n=>n.props.accessibilityLabel==='Solitaire table, vertical scroll')!;expect(viewport.props.style.width).toBe(694);const maxHeight=viewport.props.style.maxHeight;
   const faces=buttons.filter(n=>/^Column /.test(n.props.accessibilityLabel??'')&&!n.props.accessibilityLabel.includes('face-down'));expect(faces).toHaveLength(7);
   for(const n of faces){expect(n.props.style.top+n.props.style.height).toBeLessThanOrEqual(maxHeight);expect(n.props.style.left+(n.children[0] as ReactTestInstance).props.style.width).toBeLessThanOrEqual(694);}
   for(const label of ['Stock,','Waste,','Clubs foundation,','Diamonds foundation,','Spades foundation,','Hearts foundation,']){const n=buttons.find(n=>n.props.accessibilityLabel?.startsWith(label))!;expect(n).toBeDefined();expect(n.props.style.top+n.props.style.height).toBeLessThanOrEqual(maxHeight);}
   await press(screen,'Draw three · 24 in stock');expect(board(deal).position.piles[12]).toHaveLength(21);
   await press(screen,'Rules');expect(text(screen)).toContain('Build columns down');
   await press(screen,'Remembered cards');expect(text(screen)).not.toContain('Previously seen covered cards');expect(text(screen)).not.toContain('face-down, previously seen');
  }finally{if(screen)await act(async()=>screen.unmount());}
 });
 it('drags from an exposed tableau card into the reserve area at AX5 phone landscape',async()=>{
  const{Harness,deal}=await fixture('draw-three');let screen!:ReactTestRenderer;
  try{fake.scale=3.5;fake.height=393;await act(async()=>{screen=create(<Harness/>);});
   const initial=opening(deal),move=legalMoves(initial,deal.mode).find(a=>a[0]<7&&a[1]>=8&&a[1]<12)!,c=initial.piles[move[0]].at(-1)!;
   const from=card(screen,move[0],c),to=screen.root.findAllByType('button').find(n=>n.props.accessibilityLabel===`${['Clubs','Diamonds','Spades','Hearts'][move[1]-8]} foundation, empty`)!;
   const dx=to.props.style.left-from.props.style.left,dy=to.props.style.top-from.props.style.top;
   await act(async()=>{const p=surface(screen).props;p.onPanResponderGrant({nativeEvent:{locationX:from.props.style.left+20,locationY:from.props.style.top+16}});p.onPanResponderMove({}, {dx,dy});p.onPanResponderRelease({}, {dx,dy});});
   expect(board(deal).position.piles[move[1]]).toEqual([c]);expect(board(deal).payload.edits).toBe(1);expect(fake.held).toContain(true);expect(fake.held.at(-1)).toBe(false);
  }finally{if(screen)await act(async()=>screen.unmount());}
 });
 it('keeps budget-exhausted advice honest without asking a child to undo',async()=>{
  const{Harness}=await fixture();let screen!:ReactTestRenderer;const spy=vi.spyOn(publicHints,'adviseAsync').mockResolvedValueOnce({kind:'unknown'});
  try{await act(async()=>{screen=create(<Harness/>);});await press(screen,'Hint');await press(screen,'Think');await press(screen,'One step');
   expect(text(screen)).toContain('I have not proved a way forward from here yet. You can keep exploring.');expect(text(screen)).not.toContain('Try undoing');
  }finally{spy.mockRestore();if(screen)await act(async()=>screen.unmount());}
 });
 it('cancels a pending hint when the app backgrounds and keeps the accepted table on return',async()=>{
  const{Harness,deal}=await fixture();let screen!:ReactTestRenderer,release!:(value:publicHints.Advice)=>void;
  const gate=new Promise<publicHints.Advice>(r=>{release=r;}),spy=vi.spyOn(publicHints,'adviseAsync').mockReturnValueOnce(gate);
  try{await act(async()=>{screen=create(<Harness/>);});await press(screen,'Hint');await press(screen,'Think');await press(screen,'One step');
   await act(async()=>fake.appState?.('background'));
   const move=legalMoves(opening(deal),deal.mode)[0];await act(async()=>{release({kind:'move',move,plan:[move],depth:1});await Promise.resolve();});
   expect(board(deal).payload.edits).toBe(0);expect(board(deal).payload.audit).toEqual([1]);
   await act(async()=>fake.appState?.('active'));expect(screen.root.findAllByType('button').find(n=>n.children.join('')==='Hint')?.props.disabled).toBe(false);
  }finally{spy.mockRestore();if(screen)await act(async()=>screen.unmount());}
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
