import React from 'react';
import { View } from 'react-native';
import { Islander, type IslanderLook } from '../islander';
/** Center the 80×132 rig in a sunlit tropical medallion; leave room for cheek-heavy heads, puffs, and hats. */
export function Portrait({ look, size = 40 }: { look: IslanderLook; size?: number }) {
  const body = size * 1.98;
  return <View testID="learner-portrait" style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: '#DFF2EC', borderWidth: size >= 44 ? 2 : 1.5, borderColor: '#FFF8EC' }}>
    <View style={{ position: 'absolute', width: size * .74, height: size * .74, borderRadius: size * .37, top: size * .07, left: size * .13, backgroundColor: '#FFF5DA', opacity: .75 }}/>
    <View style={{ position: 'absolute', top: size * .06, left: (size - body * 80 / 132) / 2 }}><Islander look={look} view="front" pose="idle" size={body}/></View>
  </View>;
}
