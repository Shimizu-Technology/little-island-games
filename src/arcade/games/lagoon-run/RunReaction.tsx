import React from 'react';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import type { SpritePose } from '../../poses';
/** Pose 36 is written in the same fixed step as contact, before the UI flush. */
export function RunHit({poses,children}:{poses:SharedValue<SpritePose[]>;children:React.ReactNode}) {
 const style=useAnimatedStyle(()=>({opacity:poses.value[36]?.scale??1}));
 return <Animated.View style={[{position:'absolute',width:390,height:660},style]}>{children}</Animated.View>;
}
export function RunHitFlash({poses}:{poses:SharedValue<SpritePose[]>}) {
 const style=useAnimatedStyle(()=>({opacity:poses.value[36]?.x??0}));
 return <Animated.View pointerEvents="none" style={[{position:'absolute',width:390,height:660,backgroundColor:'#FFF0CA'},style]}/>;
}
