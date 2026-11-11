import React, {memo} from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '../../../components/Text';
import type { Lives } from '../../lives';
import type { runHud } from '../../publication';
import { Shell } from './World';
/** HUD numbers scale with Dynamic Type up to this multiplier, so the largest text sizes keep the
 * track visible below the overlaid header (the header's measured height places the HUD). */
export const HUD_TEXT_MAX = 1.5;
const pill = { backgroundColor: '#10303ECC', borderRadius: 18, paddingHorizontal: 11, paddingVertical: 5, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5 };
/** Event-published numbers; no React render is required for camera/track motion.
 * LG-S3 slim HUD: three small pills over the sky, never a panel over the track. */
export function RunHud({s,learning}:{s:Pick<ReturnType<typeof runHud>,'level'|'passed'|'score'|'lives'>&{shellNotes:number};learning:boolean}) {
  const target=s.level==='endless'?0:s.level.target,progress=target?Math.min(1,s.passed/target):0;
  return <View pointerEvents="none" style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8}}>
    <View accessible accessibilityLabel={`Score ${s.score}. ${learning?`${s.passed} answers`:`${s.shellNotes} shells. ${s.passed} trail markers`}. ${target?`Goal ${target}`:"Free run"}`} testID="run-score-panel" style={{flex:1,flexDirection:'row',alignItems:'center',gap:8}}>
      {!learning&&<View style={pill}><Shell size={22}/><Text maxFontSizeMultiplier={HUD_TEXT_MAX} style={{fontSize:20,fontWeight:'900',color:'#FFF2C4',fontVariant:['tabular-nums']}}>{s.shellNotes}</Text></View>}
      <View style={[pill,{flex:1,maxWidth:220}]}>
        {target?<><View style={{flex:1,height:6,borderRadius:3,backgroundColor:'#0B242F'}}><View style={{height:6,width:`${progress*100}%`,borderRadius:3,backgroundColor:'#FFD86E'}}/></View><Text testID="scroll-progress" maxFontSizeMultiplier={HUD_TEXT_MAX} style={{color:'#FFE6A3',fontWeight:'900',fontSize:13,fontVariant:['tabular-nums']}}>{s.passed}/{target}</Text></>
          :<Text testID="scroll-progress" maxFontSizeMultiplier={HUD_TEXT_MAX} style={{color:'#FFE6A3',fontWeight:'900',fontSize:15,fontVariant:['tabular-nums']}}>Score {s.score}</Text>}
      </View>
    </View>
    {!learning&&<RunHearts lives={s.lives}/>}
  </View>;
}
/** Compact hearts pill; one announcement, like the shared HeartsHud. */
const RunHearts=memo(function RunHearts({lives}:{lives:Lives}) {
  return <View accessible accessibilityLabel={`${lives.hearts} of ${lives.maxHearts} hearts`} accessibilityLiveRegion="polite" testID="hearts-hud" style={[pill,{gap:2,paddingHorizontal:8}]}>
    {Array.from({length:lives.maxHearts},(_,i)=><Svg key={i} width={19} height={19} viewBox="0 0 24 24" accessible={false}><Path d="M12 21C8 17 2 13 2 7C2 1 10 1 12 6C14 1 22 1 22 7C22 13 16 17 12 21Z" fill={i<lives.hearts?'#F28B87':'#486978'} stroke="#FFE8CE" strokeWidth={1.5}/></Svg>)}
  </View>;
},(a,b)=>a.lives.hearts===b.lives.hearts && a.lives.maxHearts===b.lives.maxHearts);
