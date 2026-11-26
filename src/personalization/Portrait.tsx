import React from 'react';
import { View } from 'react-native';
import { Islander, type IslanderLook } from '../islander';
/** Center the 80×132 rig in a sunlit tropical medallion; leave room above its highest hat and curls. */
export function Portrait({ look, size = 40 }: { look: IslanderLook; size?: number }) {
  const body = size * 2.05;
  return <View testID="learner-portrait" style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: '#DFF2EC', borderWidth: size >= 44 ? 2 : 1.5, borderColor: '#FFF8EC' }}>
    <View style={{ position: 'absolute', width: size * .72, height: size * .72, borderRadius: size * .36, top: size * .08, left: size * .14, backgroundColor: '#FFF5DA', opacity: .7 }}/>
    <View style={{ position: 'absolute', top: size * .04, left: (size - body * 80 / 132) / 2 }}><Islander look={look} view="front" pose="idle" size={body}/></View>
  </View>;
}
