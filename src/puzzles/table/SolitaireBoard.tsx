import React,{useCallback,useContext,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Animated,PanResponder,Pressable,ScrollView,View,useWindowDimensions} from 'react-native';
import {Button,C,Copy} from '../../components/ui';
import {Text} from '../../components/Text';
import {atLarge} from '../../components/wordFit';
import {GridFeedback,GridInteraction} from '../grid/preferences';
import {readTable} from './checkpoint';
import {advise,type Advice} from './publicSolver';
import {cardWords} from './solver';
import {apply,columns,legalMoves,rank,red,suit,won,type Move} from './solitaire';
import type {TableAction,TableView} from './registration';
export type SolitaireBoardProps={view:TableView;dispatch:(a:TableAction)=>void;active:boolean;width:number};
type Place={pile:number;index:number;card:number|null;covered:boolean;x:number;y:number};
const suits=['♣','♦','♠','♥'];
const face=(c:number)=>`${['','A','2','3','4','5','6','7','8','9','10','J','Q','K'][rank(c)]}`;
const pileName=(i:number,free:boolean)=>i<8?`Column ${i+1}`:i<12?`${['Clubs','Diamonds','Spades','Hearts'][i-8]} foundation`:free?`Free cell ${i-11}`:i===12?'Stock':'Waste';
/** A quiet card table. Controls remain above a bounded two-axis scroll area at every text size. */
export function SolitaireBoard({view,dispatch,active,width}:SolitaireBoardProps){
 const {fontScale,height}=useWindowDimensions(),large=fontScale>=1.5,cap=atLarge(fontScale,1.5),read=readTable(view.payload,view.deal)!;
 const s=read.position,free=view.deal.mode==='freecell',cols=columns(view.deal.mode),cardW=Math.max(large?64:42,Math.min(76,(width-12)/cols-5)),cardH=large?96:86,overlap=large?54:32,gap=5;
 const boardW=Math.max(width,cols*(cardW+gap)+12),tableY=cardH*2+50;
 const boardH=tableY+Math.max(...s.piles.slice(0,cols).map(p=>Math.max(0,p.length-1)*overlap+cardH))+12;
 const [selected,setSelected]=useState<{pile:number;index:number}|null>(null),[message,setMessage]=useState(''),[rules,setRules]=useState(false),[advice,setAdvice]=useState<Advice|null>(null),[thinking,setThinking]=useState(false),[dragging,setDragging]=useState<Place|null>(null);
 const feedback=useContext(GridFeedback),holdPage=useContext(GridInteraction),accepted=useRef(view.payload.edits),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [translation]=useState(()=>new Animated.ValueXY());
 const places=useMemo(()=>{
  const out:Place[]=[];
  for(let i=0;i<16;i++){
   if(!free&&[7,14,15].includes(i))continue;
   const top=i>=8;const x=top?(i>=12?i-12:i-8)*(cardW+gap)+6:i*(cardW+gap)+6;
   const y=top?(i>=12?6:cardH+28):tableY,p=s.piles[i];
   if(!p.length)out.push({pile:i,index:0,card:null,covered:false,x,y});
   else if(top)out.push({pile:i,index:p.length-1,card:i===12&&!free?null:p.at(-1)!,covered:i===12&&!free,x,y});
   else p.forEach((c,j)=>out.push({pile:i,index:j,card:c,covered:j<s.hidden[i],x,y:y+j*overlap}));
  }
  return out;
 },[s,free,cardW,cardH,tableY,overlap]);
 const live=useRef({s,active,selected,dispatch,places});
 useLayoutEffect(()=>{live.current={s,active,selected,dispatch,places};},[s,active,selected,dispatch,places]);
 useEffect(()=>{if(view.payload.edits!==accepted.current){feedback();accepted.current=view.payload.edits;setSelected(null);setAdvice(null);setMessage('');}},[view.payload.edits,feedback]);
 useEffect(()=>()=>{holdPage(false);if(timer.current)clearTimeout(timer.current);},[holdPage]);
 const touch=useCallback((p:Place)=>{
  if(!live.current.active)return;
  const state=live.current.s,chosen=live.current.selected;
  if(chosen){const move:Move=[chosen.pile,p.pile,state.piles[chosen.pile].length-chosen.index];if(apply(state,view.deal.mode,move)!==state){dispatch({type:'move',move});return;}if(chosen.pile!==p.pile){setMessage('That place cannot hold these cards. Choose another place, or tap the selected card to put it down.');return;}setSelected(null);return;}
  if(!free&&p.pile===12){const move:Move=state.piles[12].length?[12,13,0]:[13,12,0];if(apply(state,view.deal.mode,move)!==state)dispatch({type:'move',move});return;}
  if(p.card!==null&&!p.covered){setSelected({pile:p.pile,index:p.index});setMessage(`${cardWords(p.card)} selected. Tap a destination.`);}
 },[dispatch,free,view.deal.mode]);
 const hit=useCallback((x:number,y:number)=>[...live.current.places].reverse().find(p=>x>=p.x&&x<=p.x+cardW&&y>=p.y&&y<=p.y+cardH),[cardW,cardH]);
 const drag=useRef<Place|null>(null);
 // eslint-disable-next-line react-hooks/refs -- responder handlers run after render.
 const pan=useMemo(()=>PanResponder.create({
  onStartShouldSetPanResponder:e=>live.current.active&&!!hit(e.nativeEvent.locationX,e.nativeEvent.locationY),
  onPanResponderGrant:e=>{const p=hit(e.nativeEvent.locationX,e.nativeEvent.locationY);drag.current=p??null;if(p&&!p.covered&&p.card!==null){translation.setValue({x:0,y:0});setDragging(p);holdPage(true);}},
  onPanResponderMove:(_e,g)=>{if(drag.current&&!drag.current.covered)translation.setValue({x:g.dx,y:g.dy});},
  onPanResponderTerminationRequest:()=>!drag.current||drag.current.covered||drag.current.card===null,
  onPanResponderRelease:(e,g)=>{
   const p=drag.current;drag.current=null;setDragging(null);holdPage(false);if(!p)return;
   if(Math.hypot(g.dx,g.dy)<8){touch(p);return;}
   const target=hit(p.x+cardW/2+g.dx,p.y+Math.min(cardH/2,overlap/2)+g.dy);
   if(target&&!p.covered&&p.card!==null){const state=live.current.s,move:Move=[p.pile,target.pile,state.piles[p.pile].length-p.index];if(apply(state,view.deal.mode,move)!==state)live.current.dispatch({type:'move',move});else setMessage('Those cards cannot go there. Your table is kept.');}
  },
  onPanResponderTerminate:()=>{drag.current=null;setDragging(null);holdPage(false);},
 }),[cardW,cardH,overlap,holdPage,translation,view.deal.mode,hit,touch]);
 const ask=()=>{if(thinking||!active||view.payload.audit.length>=128)return;dispatch({type:'help'});setThinking(true);timer.current=setTimeout(()=>{const result=advise(live.current.s,view.deal,10000);setAdvice(result);setThinking(false);timer.current=null;},0);};
 const description=(p:Place)=>`${pileName(p.pile,free)}, ${p.covered?'face-down card':p.card===null?'empty':cardWords(p.card)}${p.pile<8&&p.card!==null&&!p.covered?`, ${s.piles[p.pile].length-p.index} card${s.piles[p.pile].length-p.index===1?'':'s'} to move`:''}`;
 const visual=(p:Place)=> <View style={{width:cardW,height:cardH,borderRadius:8,borderWidth:selected?.pile===p.pile&&selected.index===p.index?3:1,borderColor:selected?.pile===p.pile&&selected.index===p.index?C.gold:'#BACCC4',backgroundColor:p.covered?'#367967':p.card===null?'#E3EEE7':'#FFFDF7',padding:4}}>
  {p.covered?<Text maxFontSizeMultiplier={cap} style={{color:'#FFFFFF',fontSize:18,textAlign:'center'}}>≈</Text>:p.card===null?<Text maxFontSizeMultiplier={cap} style={{color:C.teal,fontSize:18,textAlign:'center'}}>{p.pile>=8&&p.pile<12?suits[p.pile-8]:p.pile>=12&&free?'○':''}</Text>:<View style={{flexDirection:'row',alignItems:'center',gap:2}}><Text maxFontSizeMultiplier={cap} style={{fontSize:large?17:15,lineHeight:large?30:23,fontWeight:'800',color:red(p.card)?'#A63E33':C.ink}}>{face(p.card)}</Text><Text maxFontSizeMultiplier={cap} style={{fontSize:large?16:15,lineHeight:large?30:23,color:red(p.card)?'#A63E33':C.ink}}>{suits[suit(p.card)]}</Text></View>}
 </View>;
 return <View style={{gap:8}}>
  <Copy maxFontSizeMultiplier={cap}>{view.title}</Copy>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
   <Button maxFontSizeMultiplier={cap} compact quiet disabled={!active||!read.history.length} onPress={()=>dispatch({type:'undo'})}>Undo</Button>
   <Button maxFontSizeMultiplier={cap} compact quiet disabled={!active||thinking||view.payload.audit.length>=128} onPress={ask}>{thinking?'Looking…':'Hint'}</Button>
   <Button maxFontSizeMultiplier={cap} compact quiet onPress={()=>setRules(v=>!v)}>How to play</Button>
   {selected&&<Button maxFontSizeMultiplier={cap} compact quiet onPress={()=>setSelected(null)}>Put down</Button>}
  </View>
  {rules&&<Copy maxFontSizeMultiplier={cap}>{free?'Build columns down in alternating colours. An empty column can hold any card. Four free cells hold one card each. A sequence moves only when spare cells and columns can carry it one card at a time.':'Build columns down in alternating colours. Only a King starts an empty column. Tap the stock to draw '+(view.deal.mode==='draw-three'?'three cards; only the top waste card can move.':'one card.')+' When the stock is empty, tap it to turn the waste over.'} Build each suit from Ace to King in its foundation. Tap a card, then its destination, or drag it. Every deal has a winning line; a different line can reach a dead end. There is no score. Cards never move automatically.</Copy>}
  {message&&<Copy maxFontSizeMultiplier={cap} accessibilityLiveRegion="polite">{message}</Copy>}
  {advice&&<View style={{gap:6}}><Copy maxFontSizeMultiplier={cap} accessibilityLiveRegion="polite">{advice.kind==='move'?advice.plan.length>1?`Try this ${advice.plan.length}-move plan using the cards you can see.`:advice.move[2]===0?'Try turning the stock.':`Try ${cardWords(s.piles[advice.move[0]].at(-advice.move[2])!)} toward ${pileName(advice.move[1],free).toLowerCase()}.`:advice.kind==='dead-end'?'There are no legal moves here. Undo can take you back.':'I have not proved a way forward from here. Try undoing a move, or keep exploring.'}</Copy>{advice.kind==='move'&&<Button maxFontSizeMultiplier={cap} compact quiet disabled={!active} onPress={()=>dispatch({type:'hint'})}>Show me</Button>}</View>}
  <Copy maxFontSizeMultiplier={cap}>{won(s)?'Every card is home.':`${s.piles.slice(8,12).reduce((n,p)=>n+p.length,0)} of 52 cards home. Swipe the table to see tall stacks${large?' and other columns':''}.`}</Copy>
  <ScrollView horizontal nestedScrollEnabled scrollEnabled={!dragging} style={{maxHeight:Math.max(150,Math.min(440,height*(large?0.4:0.55)))}} accessibilityLabel="Solitaire table, horizontal scroll">
   <ScrollView nestedScrollEnabled scrollEnabled={!dragging} style={{width:boardW,maxHeight:Math.max(150,Math.min(440,height*(large?0.4:0.55)))}} accessibilityLabel="Solitaire table, vertical scroll">
    <View {...pan.panHandlers} style={{width:boardW,height:boardH,backgroundColor:'#D4E7DC',borderRadius:12}}>
     {places.map(p=><Pressable pointerEvents="none" accessibilityActions={[{name:'activate',label:'Select card or destination'}]} onAccessibilityAction={e=>{if(e.nativeEvent.actionName==='activate')touch(p);}} key={`${p.pile}-${p.index}`} accessible accessibilityRole="button" accessibilityLabel={description(p)} accessibilityState={{selected:selected?.pile===p.pile&&selected.index===p.index,disabled:!active||p.covered}} disabled={!active||p.covered} onPress={()=>touch(p)} style={{position:'absolute',left:p.x,top:p.y}}>{visual(p)}</Pressable>)}
     {dragging&&<Animated.View pointerEvents="none" style={{position:'absolute',left:dragging.x,top:dragging.y,zIndex:1000,transform:translation.getTranslateTransform(),opacity:0.9}}>{visual(dragging)}</Animated.View>}
    </View>
   </ScrollView>
  </ScrollView>
  {view.payload.audit.length===128&&<Copy maxFontSizeMultiplier={cap}>This attempt’s help log is full. You can keep playing and undoing, or choose a fresh attempt from the puzzle browser.</Copy>}
  {!free&&<Button maxFontSizeMultiplier={cap} quiet compact disabled={!active||!s.piles[12].length&&!s.piles[13].length} onPress={()=>dispatch({type:'move',move:s.piles[12].length?[12,13,0]:[13,12,0]})}>{s.piles[12].length?`Draw ${view.deal.mode==='draw-three'?'three':'one'} · ${s.piles[12].length} in stock`:'Turn waste over'}</Button>}
  {!legalMoves(s,view.deal.mode).length&&!won(s)&&<Copy maxFontSizeMultiplier={cap}>There are no legal moves. You can undo freely.</Copy>}
 </View>;
}
