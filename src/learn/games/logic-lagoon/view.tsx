import React, { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { C, Copy, PressableScale } from "../../../components/ui";
import type { BoardProps } from "../../types";
import { enter, hint, taskAt, valueAt, type LogicState } from "./engine";

export function Board({session,update,practice,assistance,cheer,coach,active,width}:BoardProps<LogicState>) {
  const s=session.state,task=taskAt(s);
  const [selected,setSelected]=useState<number|null>(null),[message,setMessage]=useState("");
  const choose=(value:number)=>{
    if(selected===null)return;
    const answer=task.kind==="grid"?task.solution[selected]:task.answer;
    const next=enter(s,selected,value),right=value===answer;
    practice(task.kind==="grid"?"think.logic":"think.balance",right);
    update(next);if(right){cheer(next.index>s.index?"big":"right");coach.done();setMessage("");if(next.index>s.index)setSelected(null);}else setMessage("Not quite. Look at the clues and try another value.");
  };
  const showHelp=()=>{assistance?.();const h=hint(s);setSelected(h.cell);setMessage(`Try ${task.kind==="grid"?task.symbols[h.value-1]:h.value} in the glowing spot.`);update(h.state);};
  const size=task.kind==="grid"?Math.min(54,Math.floor((width-60)/task.size)):0;
  return <View style={{gap:14,paddingVertical:8}}>
    <Copy style={{fontSize:21,fontWeight:"900",color:C.ink}}>{task.title}</Copy>
    <Copy style={{color:C.ink,fontWeight:"700"}}>PUZZLE {s.index+1} OF 4</Copy>
    {task.kind==="grid" ? <>
      <Copy style={{color:C.ink}}>One of each {s.level<=2 || s.level===3 && s.index<2 ? "picture" : "number"} in every row and column.{task.boxRows>1?" Each outlined box also needs one of each.":""}</Copy>
      {task.writtenClue&&<Copy style={{color:C.ink,fontWeight:"800",backgroundColor:"#FFF4D6",padding:12,borderRadius:12}}>{task.writtenClue.text}</Copy>}
      <View style={{alignSelf:"center",padding:7,borderRadius:18,backgroundColor:"#E8EFDA"}}>{Array.from({length:task.size},(_,r)=><View key={r} style={{flexDirection:"row"}}>{Array.from({length:task.size},(_,c)=>{const i=r*task.size+c,v=valueAt(s,i),given=!!task.givens[i],cage=task.cages.find(g=>g.cells.includes(i));return <PressableScale key={i} accessibilityRole="button" accessibilityLabel={`Row ${r+1}, column ${c+1}: ${v?task.symbols[v-1]:"empty"}${given?", clue":""}`} disabled={!active||given} onPress={()=>setSelected(i)} style={{width:size,height:size,margin:1,borderRadius:5,alignItems:"center",justifyContent:"center",backgroundColor:selected===i?"#FFE8A5":given?"#D8EACD":"#FFFDF3",borderWidth:2,borderColor:c%task.boxCols===0||r%task.boxRows===0?"#668A66":"#B6CCAB"}}><Copy style={{fontSize:task.size===6?21:26,fontWeight:"800",color:C.ink}}>{v?task.symbols[v-1]:""}</Copy>{cage&&cage.cells[0]===i&&<Copy style={{position:"absolute",top:1,left:3,fontSize:10,color:"#365034"}}>Σ{cage.sum}</Copy>}</PressableScale>;})}</View>)}</View>
      {task.cages.length>0&&<Copy style={{color:C.ink}}>Σ shows the sum of the two squares in each outlined pair.</Copy>}
      <Copy style={{color:C.ink,fontWeight:"800"}}>{selected===null?"Tap an empty square":"Choose a value for the glowing square"}</Copy>
      <View style={{flexDirection:"row",flexWrap:"wrap",justifyContent:"center",gap:9}}>{task.symbols.map((symbol,i)=><PressableScale key={i} accessibilityRole="button" accessibilityLabel={`Place ${symbol}`} disabled={!active||selected===null} onPress={()=>choose(i+1)} style={{minWidth:52,minHeight:54,padding:7,alignItems:"center",justifyContent:"center",borderRadius:13,backgroundColor:"#FDF6DF",borderWidth:2,borderColor:"#87AA72"}}><Copy style={{fontSize:25,fontWeight:"800",color:C.ink}}>{symbol}</Copy></PressableScale>)}</View>
    </> : <>
      <Copy style={{color:C.ink,fontSize:17}}>The left scale holds {task.left} shells. The right holds {task.right} shells plus a mystery bag. How many shells are in the bag?</Copy>
      <View style={{flexDirection:"row",justifyContent:"space-around",padding:20,backgroundColor:"#E5F0E0",borderRadius:20}}><Copy style={{fontSize:32}}>⚖️ {task.left}</Copy><Copy style={{fontSize:32}}>{task.right} + ❓</Copy></View>
      <View style={{flexDirection:"row",flexWrap:"wrap",gap:8,justifyContent:"center"}}>{Array.from({length:10},(_,i)=><PressableScale key={i} accessibilityRole="button" accessibilityLabel={`Put ${i+1} shells in the mystery bag`} disabled={!active} onPress={()=>{setSelected(0);const next=enter(s,0,i+1);practice("think.balance",i+1===task.answer);update(next);if(i+1===task.answer)cheer("big");else setMessage("The scales are still uneven. Try another number.");}} style={{width:53,minHeight:53,borderRadius:13,alignItems:"center",justifyContent:"center",backgroundColor:"#FFF8DE"}}><Copy style={{fontSize:24,color:C.ink}}>{i+1}</Copy></PressableScale>)}</View>
    </>}
    {!!message&&<Copy style={{color:"#79512D",fontWeight:"800"}}>{message}</Copy>}
    <PressableScale accessibilityRole="button" accessibilityLabel="Help with this puzzle" onPress={showHelp} style={{alignSelf:"flex-start",padding:14,borderRadius:14,backgroundColor:"#E4EFDD"}}><Copy style={{fontWeight:"800",color:C.ink}}>💡 Help</Copy></PressableScale>
  </View>;
}
export function Art({size}:{size:number}) {return <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Path d="M10 10H90V90H10ZM10 50H90M50 10V90" fill="#FFF9E9" stroke="#365034" strokeWidth="4"/><Circle cx="30" cy="30" r="12" fill="#E9916F"/><Circle cx="70" cy="70" r="12" fill="#5C9FA0"/><Path d="M62 31L69 23L76 31L69 39Z" fill="#D8AE55"/></Svg>;}
