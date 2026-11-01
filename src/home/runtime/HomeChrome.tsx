import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { roomIds, roomNames, type RoomId } from '../catalogMore';
import { ItemArt } from '../art/Items';
const ink = '#284F4B';
export function Tool({ label, symbol, onPress, selected, disabled }: { label: string; symbol: string; onPress: () => void; selected?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.tool, selected && { backgroundColor: '#D6E9C8' }, { opacity: disabled ? .35 : pressed ? .65 : 1 }]}><Text allowFontScaling={false} style={{ fontSize: 25, color: ink }}>{symbol}</Text></Pressable>;
}
function FindIcon() {
  return <Svg width={32} height={32} viewBox="0 0 32 32" accessible={false}><Circle cx={13} cy={12} r={9} fill="#EDD3B5" stroke={ink} strokeWidth={2} /><Path d="M7 24Q13 17 20 24M20 20L29 29M9 11h1m6 0h1M11 15q2 2 4 0" stroke={ink} strokeWidth={2.5} strokeLinecap="round" fill="none" /></Svg>;
}
export function HomeChrome({ room, overview, designing, canUndo, canRedo, onBack, onUndo, onRedo, onFind, onFriends, onOverview, onDesign, onRoom, onZoom, top, headerHeight, onHeaderLayout, title, saveStatus }: {
  room: RoomId; overview: boolean; designing: boolean; canUndo: boolean; canRedo: boolean; top: number; headerHeight: number; onHeaderLayout: (height: number) => void; title?: string; saveStatus?: React.ReactNode;
  onBack: () => void; onUndo: () => void; onRedo: () => void; onFind: () => void; onFriends: () => void; onOverview: () => void; onDesign: () => void; onRoom: (room: RoomId) => void; onZoom: (ratio: number) => void;
}) {
  return <>
    <View onLayout={event => onHeaderLayout(event.nativeEvent.layout.height)} style={[styles.header, { paddingTop: top }]}>
      <Tool label="Back to island" symbol="‹" onPress={onBack} />
      <Text numberOfLines={2} style={styles.title}>{title ?? (overview ? 'Our house' : roomNames[room])}</Text>
      <Tool label="Undo" symbol="↶" disabled={!canUndo} onPress={onUndo} />
      {designing && <Tool label="Redo" symbol="↷" disabled={!canRedo} onPress={onRedo} />}
      <Tool label={designing ? 'Done designing' : 'Design'} symbol={designing ? '✓' : '✎'} selected={designing} onPress={onDesign} />
    </View>
    <View pointerEvents="box-none" style={{ position: 'absolute', top: headerHeight + 14, left: 10, zIndex: 30, gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Find my Islander" onPress={onFind} style={styles.tool}><FindIcon /></Pressable>
      <Tool label="Bring friends here" symbol="♧" onPress={onFriends} />
      <Tool label={overview ? 'Close up' : 'Whole house'} symbol={overview ? '⊕' : '⌂'} selected={overview} onPress={onOverview} />
      <Tool label="Zoom in" symbol="+" onPress={() => onZoom(1.2)} />
      <Tool label="Zoom out" symbol="−" onPress={() => onZoom(1 / 1.2)} />
    </View>
    <View style={{ position: 'absolute', right: 8, top: headerHeight + 12, zIndex: 30, maxWidth: 74 }}>
      <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ gap: 5 }}>{roomIds.map(id => <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Go to ${roomNames[id]}`} accessibilityState={{ selected: room === id && !overview }} onPress={() => onRoom(id)} style={[styles.room, room === id && !overview && { borderColor: '#477D60', backgroundColor: '#E3EBC9' }]}>
        <ItemArt item={({ home: 'bed', kitchen: 'fridge', treehouse: 'plant', beach: 'shell' } as const)[id]} size={44} reduced />
      </Pressable>)}</ScrollView>
    </View>
    {saveStatus && <View style={{ position: 'absolute', right: 8, bottom: 8 }}>{saveStatus}</View>}
  </>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, minHeight: 64, zIndex: 30, backgroundColor: '#FFF8E9' },
  title: { flex: 1, color: ink, fontWeight: '700', fontSize: 20, paddingVertical: 10 },
  tool: { minWidth: 48, minHeight: 48, borderRadius: 24, backgroundColor: '#FFF8E9EE', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  room: { width: 58, height: 54, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8E9E8', borderWidth: 2, borderColor: 'transparent' },
});
