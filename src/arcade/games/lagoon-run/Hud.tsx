import React, {memo} from 'react';
import { View } from 'react-native';
import { Text } from '../../../components/Text';
import { HeartsHud } from '../../LivesHud';
import type { runHud } from '../../publication';
import { Shell } from './World';
/** Event-published numbers; no React render is required for camera/track motion. */
export function RunHud({s,learning}:{s:Pick<ReturnType<typeof runHud>,'level'|'passed'|'score'|'lives'>&{shellNotes:number};learning:boolean}) {
  const target=s.level==='endless'?0:s.level.target,progress=target?Math.min(1,s.passed/target):0;
  return <View pointerEvents="none" style={{position:'absolute',left:10,right:10,top:8,flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'}}>
    <View accessible accessibilityLabel={`Score ${s.score}. ${learning?`${s.passed} answers`:`${s.shellNotes} shells. ${s.passed} trail markers`}. ${target?`Goal ${target}`:"Free run"}`} testID="run-score-panel" style={{width:180,borderRadius:18,borderWidth:2,borderBottomWidth:5,borderColor:'#103E49',backgroundColor:'#205968',paddingHorizontal:10,paddingVertical:6}}>
      <Text style={{fontSize:10,fontWeight:'900',color:'#BDE9DC',letterSpacing:1.8}}>LAGOON RUN</Text>
      <Text style={{fontFamily:'Arial',fontSize:38,lineHeight:42,fontWeight:'900',fontVariant:['tabular-nums'],color:'#FFF5D3',textShadowColor:'#123E49',textShadowOffset:{width:0,height:2},textShadowRadius:1}}>{String(s.score).padStart(4,'0')}</Text>
      <View style={{flexDirection:'row',alignItems:'center',gap:5}}><Text testID="scroll-progress" style={{color:'#FFE6A3',fontWeight:'900',fontSize:13}}>{learning?'Answers':'Markers'} · {s.passed}/{target||'∞'}</Text></View>
      {!!target&&<View style={{height:4,backgroundColor:'#133E49',borderRadius:3,marginTop:4}}><View style={{height:4,width:`${progress*100}%`,backgroundColor:'#F5CF75',borderRadius:3}}/></View>}
    </View>{!learning&&<View style={{alignItems:"flex-end",gap:5}}><RunHearts lives={s.lives}/><View style={{flexDirection:"row",alignItems:"center",gap:5,backgroundColor:"#173F57",borderColor:"#FFD367",borderWidth:2,borderRadius:14,paddingHorizontal:10,paddingVertical:4}}><Shell size={25}/><Text style={{fontSize:24,fontWeight:"900",color:"#FFF2AF"}}>{s.shellNotes}</Text></View></View>}
  </View>;
}

const RunHearts=memo(HeartsHud,(a,b)=>a.lives.hearts===b.lives.hearts && a.lives.maxHearts===b.lives.maxHearts);
