import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { roomNames, type RoomId } from '../catalogMore';
import { roomHops } from '../roomHops';
export function RoomPortals({ room, onHop }: { room: RoomId; onHop?: (room: RoomId) => void }) {
  return <>{roomHops(room).map(hop => <Pressable key={hop.kind} testID={`room-${hop.kind}-${room}`} accessibilityRole="button" accessibilityLabel={`${hop.kind === 'ladder' ? 'Climb' : 'Hop'} to ${roomNames[hop.room]}`} onPress={() => onHop?.(hop.room)} style={{ position: 'absolute', left: hop.box.left, top: hop.box.top, width: hop.box.width, height: hop.box.height, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 18, backgroundColor: '#FFF6DFE6', borderWidth: 2, borderColor: '#C39A64' }}>
    <Svg width={44} height={hop.kind === 'ladder' ? 60 : 42} viewBox="0 0 44 60" accessible={false}>
      <Path d={hop.kind === 'ladder' ? 'M10 4V56M34 4V56M10 12H34M10 25H34M10 38H34M10 51H34' : 'M8 56V6H34V56M19 30H29M24 25L29 30L24 35'} fill="none" stroke="#967044" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
    <View style={{ paddingHorizontal: 3 }}><Text style={{ fontSize: 16, lineHeight: 18, fontWeight: '700', textAlign: 'center', color: '#315C56' }}>{roomNames[hop.room]}</Text></View>
  </Pressable>)}</>;
}
