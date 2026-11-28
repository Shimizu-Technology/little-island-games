import React from 'react';
import { Image, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { trashCan } from '../kitchen';
import type { Interaction } from './useInteraction';
export function KitchenBin({ interaction, reduced }: { interaction: Interaction; reduced: boolean }) {
  const { restingFlags } = interaction;
  const open = useAnimatedStyle(() => ({ opacity: withTiming(restingFlags.value.dragTargets.includes(trashCan.id) ? 1 : 0, { duration: reduced ? 0 : 120 }) }));
  const closed = useAnimatedStyle(() => ({ opacity: withTiming(restingFlags.value.dragTargets.includes(trashCan.id) ? 0 : 1, { duration: reduced ? 0 : 120 }) }));
  const box = { position: 'absolute' as const, width: trashCan.size, height: trashCan.size };
  return <View testID="trash-can" pointerEvents="none" style={{ position: 'absolute', left: trashCan.x - trashCan.size / 2, top: trashCan.y - trashCan.size * .75, width: trashCan.size, height: trashCan.size }}>
    <View style={{ position: 'absolute', bottom: 1, left: 19, width: 65, height: 10, borderRadius: 40, backgroundColor: '#4A33281C' }}/>
    <Animated.View testID="trash-can-closed" style={[box, closed]}><Image source={require('../../../assets/home/props/trash-can-closed.webp')} style={{ width: '100%', height: '100%' }} resizeMode="contain"/></Animated.View>
    <Animated.View testID="trash-can-open" style={[box, open]}><Image source={require('../../../assets/home/props/trash-can-open.webp')} style={{ width: '100%', height: '100%' }} resizeMode="contain"/>
      <Text style={{ position: 'absolute', top: -25, left: 2, width: 116, padding: 5, borderRadius: 10, fontSize: 16, textAlign: 'center', backgroundColor: '#FFF8E9', color: '#315C56', fontWeight: '700' }}>Throw away</Text>
    </Animated.View>
  </View>;
}
