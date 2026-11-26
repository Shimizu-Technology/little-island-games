import React,{useCallback,useContext,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Animated,AppState,PanResponder,Pressable,ScrollView,View,useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Button,C,Copy} from '../../components/ui';
import {Text} from '../../components/Text';
import {atLarge} from '../../components/wordFit';
import {GridFeedback,GridInteraction} from '../grid/preferences';
import {encodeBoard,previousStep,readTable} from './solitaireCheckpoint';
import {adviseAsync,type Advice} from './publicSolver';
import {cardWords} from './solver';
import {apply,columns,descending,legalMoves,rank,red,suit,won,type Move} from './solitaire';
import type {TableAction,TableView} from './registration';
import {useBoardHud} from '../../cove/boardHud';
export type SolitaireBoardProps={view:TableView;dispatch:(a:TableAction)=>void;active:boolean;width:number};
type Place={pile:number;index:number;card:number|null;covered:boolean;x:number;y:number};
const suits=['♣','♦','♠','♥'];
const face=(c:number)=>`${['','A','2','3','4','5','6','7','8','9','10','J','Q','K'][rank(c)]}`;
const pileName=(i:number,free:boolean)=>i<8?`Column ${i+1}`:i<12?`${['Clubs','Diamonds','Spades','Hearts'][i-8]} foundation`:free?`Free cell ${i-11}`:i===12?'Stock':'Waste';
/** A quiet card table. Controls remain above a bounded two-axis scroll area at every text size. */
export function SolitaireBoard({view,dispatch,active:routeActive,width}:SolitaireBoardProps){
 const [foreground,setForeground]=useState(()=>AppState.currentState!=='background'&&AppState.currentState!=='inactive'),active=routeActive&&foreground;
 const {bottom}=useSafeAreaInsets();
 const {fontScale,height}=useWindowDimensions(),large=fontScale>=1.5,short=large&&height<500,cap=atLarge(fontScale,1.5),controlCap=short?atLarge(fontScale,1.3):cap,read=readTable(view.payload,view.deal)!;
 const [viewport,setViewport]=useState<{width:number;height:number}|null>(null);
 // The host's width can include padding outside this table, especially after
 // rotation. Geometry and navigation use the measured viewport instead.
 const availableWidth=viewport?.height===height?Math.min(width,viewport.width):width;
 const historyFull=read.history.length===1024,inputActive=active&&!historyFull;
 const s=read.position,free=view.deal.mode==='freecell',cols=columns(view.deal.mode),gap=short?3:free&&!large?2:5,cardW=short?Math.max(56,Math.min(58,Math.floor((availableWidth-24)/(cols+4))-gap)):Math.max(large?64:40,Math.min(76,(availableWidth-12)/cols-gap)),cardH=short?56:large?96:86,overlap=short?46:large?54:32;
 // Short AX landscape places the reserve row beside the columns. Covered cards
 // need only a back edge; every opening face-up card stays in the same viewport.
 const reserveCols=4,tableX=short?reserveCols*(cardW+gap)+12:0;
 const boardW=Math.max(availableWidth,tableX+cols*(cardW+gap)+12),boardX=short?tableX:(boardW-cols*cardW-(cols-1)*gap)/2,tableY=short?4:cardH+30;
 const cardY=(pile:number,index:number)=>tableY+(short?Math.min(index,s.hidden[pile])*4+Math.max(0,index-s.hidden[pile])*overlap:index*overlap);
 const minimumTableHeight=short?2*(cardH+gap)+8:height<500?cardH+8:190;
 const boardH=Math.max(short?minimumTableHeight:0,...s.piles.slice(0,cols).map((p,i)=>cardY(i,Math.max(0,p.length-1))+cardH+12));
 const [selected,setSelected]=useState<{pile:number;index:number}|null>(null),[message,setMessage]=useState(''),[rules,setRules]=useState(false),[memory,setMemory]=useState(false),[advice,setAdvice]=useState<Advice|null>(null),[thinking,setThinking]=useState(false),[dragging,setDragging]=useState<Place|null>(null);
 const feedback=useContext(GridFeedback),holdPage=useContext(GridInteraction),accepted=useRef(view.payload.edits);
 const [help,setHelp]=useState<{stage:1|2|3|4;edits:number;audit:number}|null>(null);
 const search=useRef<AbortController|null>(null),vertical=useRef<ScrollView>(null),horizontal=useRef<ScrollView>(null),demonstration=useRef<{expected:string;edits:number;remaining:Move[];stage:3|4;text:string}|null>(null);
 const tableFrame=useRef<View>(null),[room,setRoom]=useState<number|null>(null);
 const measureRoom=useCallback(()=>tableFrame.current?.measureInWindow((_x,y,w)=>{if(Number.isFinite(w)&&w>0)setViewport(before=>before?.width===w&&before.height===height?before:{width:w,height});if(Number.isFinite(y))setRoom(Math.max(minimumTableHeight,height-y-bottom-12));}),[height,bottom,minimumTableHeight,setViewport]);
 useLayoutEffect(()=>{measureRoom();},[measureRoom]);
 const [translation]=useState(()=>new Animated.ValueXY());
 const places=useMemo(()=>{
  const out:Place[]=[];
  for(let i=0;i<16;i++){
   if(!free&&[7,14,15].includes(i))continue;
   const top=i>=8,slot=free?(i>=12?i-12:i-4):(i>=12?i-12:i-5);
   const compactSlot=free?(i>=12?i-12:i-4):i>=12?i-12:i-5;
   const x=top&&short?(compactSlot%reserveCols)*(cardW+gap)+6:(top?slot:i)*(cardW+gap)+boardX;
   const y=top?(short?4+Math.floor(compactSlot/reserveCols)*(cardH+gap):4):tableY,p=s.piles[i];
   if(!p.length)out.push({pile:i,index:0,card:null,covered:false,x,y});
   else if(top)out.push({pile:i,index:p.length-1,card:i===12&&!free?null:p.at(-1)!,covered:i===12&&!free,x,y});
   else p.forEach((c,j)=>out.push({pile:i,index:j,card:c,covered:j<s.hidden[i],x,y:cardY(i,j)}));
  }
  return out;
 // cardY is derived only from these geometry inputs and the current position.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[s,free,short,reserveCols,cardW,cardH,tableY,overlap,gap,boardX]);
 const live=useRef({s,active:inputActive,selected,dispatch,places});
 useLayoutEffect(()=>{live.current={s,active:inputActive,selected,dispatch,places};},[s,inputActive,selected,dispatch,places]);
 useEffect(()=>{if(view.payload.edits!==accepted.current){
  feedback();accepted.current=view.payload.edits;setSelected(null);setHelp(null);search.current?.abort();setThinking(false);
  const demo=demonstration.current;demonstration.current=null;
  if(demo&&view.payload.edits===demo.edits+1&&view.payload.board===demo.expected){setHelp({stage:demo.stage,edits:view.payload.edits,audit:view.payload.audit.length-1});setAdvice(demo.remaining.length?{kind:'move',move:demo.remaining[0],plan:demo.remaining,depth:demo.remaining.length}:null);setMessage(demo.text);}
  else{setAdvice(null);setMessage('');}
 }},[view.payload.edits,view.payload.board,view.payload.audit.length,feedback]);
 useEffect(()=>()=>{holdPage(false);search.current?.abort();},[holdPage]);
 const touch=useCallback((p:Place)=>{
  if(!live.current.active)return;
  const state=live.current.s,chosen=live.current.selected;
  if(chosen){const move:Move=[chosen.pile,p.pile,state.piles[chosen.pile].length-chosen.index];if(apply(state,view.deal.mode,move)!==state){dispatch({type:'move',move});return;}if(chosen.pile!==p.pile){setMessage("Those cards can't go there. Your table is kept.");return;}setSelected(null);setMessage('');return;}
  if(!free&&p.pile===12){const move:Move=state.piles[12].length?[12,13,0]:[13,12,0];if(apply(state,view.deal.mode,move)!==state)dispatch({type:'move',move});return;}
  if(p.card!==null&&!p.covered){if(p.pile<cols&&!descending(state.piles[p.pile].slice(p.index))){setMessage('Move the cards above this one first.');return;}setSelected({pile:p.pile,index:p.index});setMessage('');}
 },[dispatch,free,cols,view.deal.mode]);
 const hit=useCallback((x:number,y:number)=>[...live.current.places].reverse().find(p=>x>=p.x-2&&x<=p.x+cardW+2&&y>=p.y&&y<=p.y+cardH),[cardW,cardH]);
 const drag=useRef<Place|null>(null);
 useEffect(()=>{const listener=AppState.addEventListener('change',state=>{
  setForeground(state==='active');if(state!=='active'){search.current?.abort();setThinking(false);setHelp(null);setAdvice(null);setSelected(null);drag.current=null;setDragging(null);holdPage(false);}
 });return()=>listener.remove();},[holdPage]);
 // eslint-disable-next-line react-hooks/refs -- responder handlers run after render.
 const pan=useMemo(()=>PanResponder.create({
  onStartShouldSetPanResponder:e=>live.current.active&&!!hit(e.nativeEvent.locationX,e.nativeEvent.locationY),
  onPanResponderGrant:e=>{const p=hit(e.nativeEvent.locationX,e.nativeEvent.locationY);drag.current=p??null;if(p&&!p.covered&&p.card!==null&&(p.pile>=8||descending(live.current.s.piles[p.pile].slice(p.index)))){translation.setValue({x:0,y:0});setDragging(p);holdPage(true);}},
  onPanResponderMove:(_e,g)=>{if(drag.current&&!drag.current.covered)translation.setValue({x:g.dx,y:g.dy});},
  onPanResponderTerminationRequest:()=>{const p=drag.current;return !p||p.covered||p.card===null||p.pile<cols&&!descending(live.current.s.piles[p.pile].slice(p.index));},
  onPanResponderRelease:(e,g)=>{
   const p=drag.current;drag.current=null;setDragging(null);holdPage(false);if(!p)return;
   if(Math.hypot(g.dx,g.dy)<8){touch(p);return;}
   const target=hit(p.x+cardW/2+g.dx,p.y+Math.min(cardH/2,overlap/2)+g.dy);
   if(target&&!p.covered&&p.card!==null){const state=live.current.s,move:Move=[p.pile,target.pile,state.piles[p.pile].length-p.index];if(apply(state,view.deal.mode,move)!==state)live.current.dispatch({type:'move',move});else setMessage("Those cards can't go there. Your table is kept.");}
   else if(!target&&!p.covered&&p.card!==null)setMessage('Drop on a card or an empty place. Your table is kept.');
  },
  onPanResponderTerminate:()=>{drag.current=null;setDragging(null);holdPage(false);},
 }),[cardW,cardH,overlap,holdPage,translation,view.deal.mode,cols,hit,touch]);
 const ask=()=>{if(thinking||!inputActive||view.payload.audit.length>=128)return;setHelp({stage:1,edits:view.payload.edits,audit:view.payload.audit.length});setAdvice(null);dispatch({type:'help'});};
 const cueReady=help&&help.edits===view.payload.edits&&view.payload.audit.length>help.audit;
 const showOne=(plan:Move[],stage:3|4=4)=>{
  if(!plan.length||!live.current.active)return;
  const move=plan[0],before=live.current.s,next=apply(before,view.deal.mode,move);if(next===before)return;
  const drawn=Math.min(view.deal.mode==='draw-three'?3:1,before.piles[12].length);
  const text=move[2]===0?move[0]===12?`Drew ${drawn} ${drawn===1?'card':'cards'}.`:'Turned the waste over.':`Moved ${move[2]===1?cardWords(before.piles[move[0]].at(-1)!):`${move[2]} cards`} to ${pileName(move[1],free).toLowerCase()}.`;
  demonstration.current={expected:encodeBoard(next),edits:view.payload.edits,remaining:plan.slice(1),stage,text};
  dispatch({type:'move',move});
 };
 const oneStep=async(stage:3|4)=>{
  if(thinking||!inputActive||!view.payload.audit.includes(1))return;search.current?.abort();const controller=new AbortController();search.current=controller;
  const start=encodeBoard(live.current.s);setThinking(true);
  const previous=previousStep(read,view.deal);
  const result=await adviseAsync(live.current.s,view.deal,controller.signal,10000,1800,previous);
  if(controller.signal.aborted||!live.current.active||encodeBoard(live.current.s)!==start){if(search.current===controller)setThinking(false);return;}
  setThinking(false);setAdvice(result);setHelp({stage:3,edits:view.payload.edits,audit:view.payload.audit.length-1});if(result.kind==='move')showOne(result.plan,stage);
 };
 const description=(p:Place)=>!free&&p.pile===12?`Stock, ${s.piles[12].length} cards. ${s.piles[12].length?'Draw '+(view.deal.mode==='draw-three'?'three':'one'):'Turn waste over'}`:`${pileName(p.pile,free)}, ${p.covered?'face-down card':p.card===null?'empty':cardWords(p.card)}${p.pile<8&&p.card!==null&&!p.covered?`, ${s.piles[p.pile].length-p.index} card${s.piles[p.pile].length-p.index===1?' to move':'s from here'}`:''}`;
 const chosen=dragging??(selected?places.find(p=>p.pile===selected.pile&&p.index===selected.index):null);
 const destinations=new Set(chosen?Array.from({length:16},(_,to)=>to).filter(to=>apply(s,view.deal.mode,[chosen.pile,to,s.piles[chosen.pile].length-chosen.index])!==s):[]);
 const visual=(p:Place)=> <View style={{width:cardW,height:cardH,borderRadius:8,borderWidth:selected?.pile===p.pile&&selected.index===p.index||destinations.has(p.pile)?3:1,borderColor:selected?.pile===p.pile&&selected.index===p.index?C.gold:destinations.has(p.pile)?C.teal:'#BACCC4',backgroundColor:p.covered?'#367967':p.card===null?'#E3EEE7':'#FFFDF7',padding:short?1:4}}>
  {p.covered?<Text maxFontSizeMultiplier={cap} style={{color:'#FFFFFF',fontSize:18,textAlign:'center'}}>≈</Text>:p.card===null?<Text maxFontSizeMultiplier={cap} style={{color:p.pile>=8&&p.pile<12&&(p.pile-8)%2?'#A63E33':C.teal,fontSize:18,textAlign:'center'}}>{p.pile>=8&&p.pile<12?suits[p.pile-8]:p.pile>=12&&free?'○':''}</Text>:<View style={{flexDirection:'row',alignItems:'center',gap:2}}><Text maxFontSizeMultiplier={cap} style={{fontSize:short?16:large?17:15,lineHeight:large?30:23,fontWeight:'800',color:red(p.card)?'#A63E33':C.ink}}>{face(p.card)}</Text><Text maxFontSizeMultiplier={cap} style={{fontSize:short?15:large?16:15,lineHeight:large?30:23,color:red(p.card)?'#A63E33':C.ink}}>{suits[suit(p.card)]}</Text></View>}
 </View>;
 const hintAction=()=>{if(!cueReady){ask();return;}if(help.stage===1){setHelp({...help,stage:2});return;}if(help.stage>=3&&advice?.kind==='move')showOne(advice.plan,4);else void oneStep(help.stage===2?3:4);};
 const hintLabel=thinking?'Looking…':!cueReady?'Hint':help.stage===1?'Think':help.stage===2?'One step':help.stage===3?'Show me':'Next step';
 // In a Puzzles round the HUD owns this staged Hint and Undo; a full help log keeps the deal's own restart.
 const host=useBoardHud({hint:{run:hintAction,disabled:!inputActive||thinking||!cueReady&&view.payload.audit.length>=128,label:hintLabel},undo:{run:()=>dispatch({type:'undo'}),disabled:!active||!read.history.length},reset:{run:()=>dispatch({type:'reset'}),disabled:!active}}),hosted=!!host,title=host?.title||view.title;
 const scrollHeight=Math.max(minimumTableHeight,Math.min(440,height*(large?0.42:0.55),room??440));
 const detail=rules||memory||message||cueReady||advice;

 const status=won(s)?'Every card is home.':selected?`${cardWords(s.piles[selected.pile][selected.index])} selected.`:`${s.piles.slice(8,12).reduce((n,p)=>n+p.length,0)} of 52 cards home.`;
 const drawControl=!free&&<Button maxFontSizeMultiplier={controlCap} quiet compact disabled={!inputActive||!s.piles[12].length&&!s.piles[13].length} onPress={()=>dispatch({type:'move',move:s.piles[12].length?[12,13,0]:[13,12,0]})}>{s.piles[12].length?`Draw ${view.deal.mode==='draw-three'?'three':'one'} · ${s.piles[12].length} in stock`:'Turn waste over'}</Button>;
 const navigation=<View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
   {boardH>scrollHeight+(short?12:0)&&<><Button maxFontSizeMultiplier={controlCap} quiet compact label="Top of table" onPress={()=>vertical.current?.scrollTo({y:0,animated:false})}>{short?'↑':'Top'}</Button><Button maxFontSizeMultiplier={controlCap} quiet compact label="Lower cards" onPress={()=>vertical.current?.scrollToEnd({animated:false})}>{short?'↓':'Lower cards'}</Button></>}
   {boardW>availableWidth+1&&<><Button maxFontSizeMultiplier={controlCap} quiet compact label="First columns" onPress={()=>horizontal.current?.scrollTo({x:0,animated:false})}>←</Button><Button maxFontSizeMultiplier={controlCap} quiet compact label="Last columns" onPress={()=>horizontal.current?.scrollToEnd({animated:false})}>→</Button></>}
  </View>;
 const headings=<View style={{flexDirection:'row',justifyContent:'space-between',gap:8}}>
   <Text maxFontSizeMultiplier={cap} style={{fontSize:12,color:C.ink}}>{free?'Free cells':'Stock · waste'}</Text>
   <Text maxFontSizeMultiplier={cap} style={{fontSize:12,color:C.ink}}>Foundations</Text>
  </View>;
 return <View style={{gap:short?3:7}}>
  <Copy maxFontSizeMultiplier={short?controlCap:cap} style={short?{fontSize:12,lineHeight:18}:undefined}>{title}{short?` · ${status} · ${free?'Cells':'Stock / waste'} / foundations`:''}</Copy>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
   {!hosted&&<Button maxFontSizeMultiplier={controlCap} compact quiet disabled={!active||!read.history.length} onPress={()=>dispatch({type:'undo'})}>Undo</Button>}
   {!hosted&&<Button maxFontSizeMultiplier={controlCap} compact quiet disabled={!inputActive||thinking||!cueReady&&view.payload.audit.length>=128} onPress={hintAction}>{hintLabel}</Button>}
   <Button maxFontSizeMultiplier={controlCap} compact quiet label="How to play" onPress={()=>setRules(v=>!v)}>Rules</Button>
   {short&&drawControl}
   {short&&navigation}
  </View>
   {historyFull&&<Copy maxFontSizeMultiplier={cap}>This table has had lots of moves. Undo to keep going, or start this deal again.</Copy>}
  {detail&&<ScrollView nestedScrollEnabled style={{maxHeight:large?100:110}} accessibilityLabel="Table instructions and hint">
   {rules&&<View style={{gap:7}}><Copy maxFontSizeMultiplier={cap}>{free?'Build columns down in alternating colours. An empty column can hold any card. Four free cells hold one card each. A sequence moves only when spare cells and columns can carry it one card at a time.':'Build columns down in alternating colours. Only a King starts an empty column. Tap the stock to draw '+(view.deal.mode==='draw-three'?'three cards; only the top waste card can move.':'one card.')+' When the stock is empty, tap it to turn the waste over.'} Build each suit from Ace to King in its foundation. {free?'This family-friendly variant allows taking a card back from a foundation to a column.':'You may return a foundation card to a column.'} Tap a card, then its destination, or drag it. Green borders show legal destinations. Scroll tall stacks; at large text, scroll across for the other columns. Every deal has a winning line; a different line can reach a dead end. Cards never move automatically.</Copy>{!free&&<Button maxFontSizeMultiplier={cap} compact quiet onPress={()=>setMemory(v=>!v)}>Remembered cards</Button>}</View>}
   {memory&&!free&&<Copy maxFontSizeMultiplier={cap}>Previously seen stock, next draw first: {s.piles[12].slice().reverse().map(c=>s.known[c]?cardWords(c):'unseen card').join(', ')||'empty'}. Previously seen waste, top first: {s.piles[13].slice().reverse().map(cardWords).join(', ')||'empty'}.</Copy>}
   {message&&<Copy maxFontSizeMultiplier={cap} accessibilityLiveRegion="polite">{message}</Copy>}
   {cueReady&&<Copy maxFontSizeMultiplier={cap}>{help.stage===1?'Look for the next low card in a suit, or a card covering another card.':help.stage===2?'Think about which card a move will free. Spare columns and cells let you plan more than one move.':'One move at a time. Tap Next step for another, or keep playing yourself.'}</Copy>}
   {advice&&advice.kind!=='move'&&<Copy maxFontSizeMultiplier={cap} accessibilityLiveRegion="polite">{advice.kind==='dead-end'?'This position cannot finish. Undo can take you back.':'I have not proved a way forward from here yet. You can keep exploring.'}</Copy>}
  </ScrollView>}
  {!short&&<Copy maxFontSizeMultiplier={cap}>{status}</Copy>}
  {!short&&navigation}
  {view.payload.audit.length===128&&<Copy maxFontSizeMultiplier={cap}>This attempt’s help log is full. You can keep playing and undoing, or start this deal again.</Copy>}
  {!short&&drawControl}
  {!short&&headings}
  <View ref={tableFrame} testID="solitaire-table-viewport" collapsable={false} onLayout={measureRoom}><ScrollView ref={horizontal} horizontal nestedScrollEnabled scrollEnabled={!dragging} style={{maxHeight:scrollHeight}} accessibilityLabel="Solitaire table, horizontal scroll">
   <ScrollView ref={vertical} nestedScrollEnabled scrollEnabled={!dragging} style={{width:boardW,maxHeight:scrollHeight}} accessibilityLabel="Solitaire table, vertical scroll">
    <View {...pan.panHandlers} style={{width:boardW,height:boardH,backgroundColor:'#D4E7DC',borderRadius:12}}>
     {view.deal.mode==='draw-three'&&s.piles[13].length>1&&<View accessible accessibilityLabel={`Seen behind the top waste card: ${s.piles[13].slice(-3,-1).map(cardWords).join(', ')}. Only the top waste card can move.`} style={{position:'absolute',left:short?6+2*(cardW+gap):2*(cardW+gap)+boardX,top:4,width:cardW,gap:2}}>{s.piles[13].slice(-3,-1).map(c=><View key={c} style={{height:(cardH-2)/2,borderWidth:1,borderColor:'#BACCC4',borderRadius:6,backgroundColor:'#FFFDF7',paddingHorizontal:2,paddingVertical:short?0:2,flexDirection:'row',alignItems:'flex-start',gap:2}}><Text maxFontSizeMultiplier={cap} style={{fontSize:short?15:large?17:15,lineHeight:short?16:large?26:23,fontWeight:'800',color:red(c)?'#A63E33':C.ink}}>{face(c)}</Text><Text maxFontSizeMultiplier={cap} style={{fontSize:short?14:large?16:15,lineHeight:short?16:large?26:23,color:red(c)?'#A63E33':C.ink}}>{suits[suit(c)]}</Text></View>)}</View>}
     {places.map(p=><Pressable pointerEvents="none" accessibilityActions={[{name:'activate',label:'Select card or destination'}]} onAccessibilityAction={e=>{if(e.nativeEvent.actionName==='activate')touch(p);}} key={`${p.pile}-${p.index}`} accessible accessibilityRole="button" accessibilityLabel={description(p)} accessibilityState={{selected:selected?.pile===p.pile&&selected.index===p.index,disabled:!inputActive||p.covered&&(free||p.pile!==12)}} disabled={!inputActive||p.covered&&(free||p.pile!==12)} onPress={()=>touch(p)} style={{position:'absolute',left:p.x,top:p.y,width:cardW,height:p.pile<cols&&p.index<s.piles[p.pile].length-1?(short&&p.covered?4:overlap):cardH}}>{visual(p)}</Pressable>)}
     {dragging&&<Animated.View pointerEvents="none" style={{position:'absolute',left:dragging.x,top:dragging.y,zIndex:1000,transform:translation.getTranslateTransform(),opacity:0.9}}>{s.piles[dragging.pile].slice(dragging.index).map((c,i)=><View key={c} style={{position:i?'absolute':'relative',top:i*overlap}}>{visual({...dragging,index:dragging.index+i,card:c})}</View>)}</Animated.View>}
    </View>
   </ScrollView>
  </ScrollView></View>

  {!legalMoves(s,view.deal.mode).length&&!won(s)&&<Copy maxFontSizeMultiplier={cap}>There are no legal moves. You can undo freely.</Copy>}
 </View>;
}
