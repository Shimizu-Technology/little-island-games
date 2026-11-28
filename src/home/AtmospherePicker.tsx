import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { Sheet } from '../ui/Sheet';
import { Text } from '../ui/Text';
import { defaultAtmosphere, timesOfDay, weatherKinds, type Atmosphere } from './atmosphere';
import { illustratedProps } from './art/illustrated';
import { seasonalPacks, unlockedSeasonalPacks, type SeasonalPackId } from './seasonal';
import { itemSpec } from './catalog';

const labels = { day: 'Day', sunset: 'Sunset', night: 'Night', clear: 'Clear', leaves: 'Leaves', snow: 'Snow', rain: 'Rain', fireflies: 'Fireflies' };
/** Pictures also remain meaningful without colour; words and selection state are explicit. */
export function SkyPicture({ kind, size = 30 }: { kind: keyof typeof labels; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 32 32" accessible={false}>
    {kind === 'day' || kind === 'clear' || kind === 'sunset' ? <G>
      <Circle cx={16} cy={kind === 'sunset' ? 20 : 16} r={7} fill={kind === 'sunset' ? '#EC9A77' : '#F1C564'} stroke="#A66F38" strokeWidth={1.5}/>
      <Path d="M16 2v4m0 20v4M2 16h4m20 0h4M6 6l3 3m14 14 3 3M6 26l3-3M23 9l3-3" stroke="#C69748" strokeWidth={2} strokeLinecap="round"/>
      {kind === 'sunset' && <Path d="M2 23h28M6 27h20" stroke="#7F739E" strokeWidth={3} strokeLinecap="round"/>}
    </G> : kind === 'night' ? <G fill="#737CA9" stroke="#4D577F"><Path d="M19 3a13 13 0 1 0 10 19A13 13 0 0 1 19 3Z"/><Path d="M25 3v6m-3-3h6" stroke="#C79C54" strokeWidth={1.5}/></G> : kind === 'leaves' ? <G fill="#DCA15C" stroke="#AE744B" strokeWidth={1.2}><Path d="M5 25Q-1 4 27 4Q31 29 5 25M5 25L24 7"/><Path d="M13 18l-1-7m6 2 6 1"/></G> : kind === 'snow' ? <G stroke="#71A6BE" strokeWidth={2} strokeLinecap="round"><Path d="M16 3v26M5 9l22 14M5 23 27 9M12 6l4 4 4-4M12 26l4-4 4 4M6 14l5-1-1-5m12 16-1-5 5-1M6 18l5 1-1 5m12-16-1 5 5 1"/></G> : kind === 'rain' ? <G><Path d="M5 17Q0 10 8 9Q11 0 20 7Q31 5 29 17Z" fill="#A7C7D3" stroke="#718EA7"/><Path d="M10 21l-3 7m11-7-3 7m11-7-3 7" stroke="#72A7BF" strokeWidth={2} strokeLinecap="round"/></G> : <G>{[8,17,25].map((x, n) => <G key={x}><Circle cx={x} cy={9+n*7} r={6} fill="#F4CF6B" opacity={.3}/><Circle cx={x} cy={9+n*7} r={2.5} fill="#B48C35"/></G>)}</G>}
  </Svg>;
}
function Pill({ kind, selected, onPress, onPreview, onRelease }: { kind: keyof typeof labels; selected: boolean; onPress: () => void; onPreview: () => void; onRelease: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={labels[kind]} accessibilityState={{ selected }} onPressIn={onPreview} onPressOut={onRelease} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 68, minWidth: 64, flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 3, padding: 6, borderRadius: 17,
      backgroundColor: selected ? '#F9E7BC' : '#F5EFE3', borderWidth: 2, borderColor: selected ? '#AC7C3C' : 'transparent', opacity: pressed ? .7 : 1 })}>
    <SkyPicture kind={kind}/><Text variant="caption" style={{ fontSize: 12, color: '#4F443B' }}>{labels[kind]}</Text>
  </Pressable>;
}
export function AtmospherePicker({ atmosphere = defaultAtmosphere, rounds, grownUp, onChange, onApply, onDecorate, onClose }: {
  atmosphere?: Atmosphere; rounds: number; grownUp: boolean; onChange: (a: Atmosphere) => void; onApply: (id: SeasonalPackId) => void; onDecorate: (item: string) => void; onClose: () => void;
}) {
  // Feedback begins at touch-down, before release admits the synchronous durable edit.
  // A cancelled gesture clears its preview and never writes a save or Undo entry.
  const [preview, setPreview] = useState<Atmosphere>();
  const selected = preview ?? atmosphere;
  const release = () => setPreview(undefined);
  const unlocked = unlockedSeasonalPacks(rounds, grownUp);
  return <Sheet visible onClose={onClose} title="Sky & Weather" closeLabel="Close Sky & Weather" mode="large" scroll heightRatio={.78} compactHeader>
    <View style={{ gap: 16, paddingBottom: 20 }}>
      <Text variant="body" style={{ color: '#716151', fontSize: 14 }}>A little mood for your whole island.</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>{timesOfDay.map(time => <Pill key={time} kind={time} selected={selected.timeOfDay === time} onPreview={() => setPreview({ ...atmosphere, timeOfDay: time })} onRelease={release} onPress={() => onChange({ ...atmosphere, timeOfDay: time })}/>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>{weatherKinds.map(weather => <Pill key={weather} kind={weather} selected={selected.weather === weather} onPreview={() => setPreview({ ...atmosphere, weather })} onRelease={release} onPress={() => onChange({ ...atmosphere, weather })}/>)}</View>
      <Text variant="title" style={{ fontSize: 20 }}>Seasonal treasures</Text>
      <Text variant="body" style={{ fontSize: 13, color: '#716151' }}>Learning together opens little celebrations. Keep them forever.</Text>
      {seasonalPacks.map(pack => {
        const open = unlocked.some(p => p.id === pack.id), remaining = Math.max(0, pack.rounds - rounds);
        return <View key={pack.id} style={{ padding: 13, borderRadius: 20, backgroundColor: '#F7EFDF', gap: 9 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Image source={illustratedProps[pack.preview]()} style={{ width: 65, height: 65 }} resizeMode="contain"/>
            <View style={{ flex: 1, gap: 3 }}><Text variant="title" style={{ fontSize: 18 }}>{pack.name}</Text><Text variant="caption" style={{ fontSize: 12, color: '#725840' }}>{pack.occasion}</Text></View>
          </View>
          <Text variant="body" style={{ fontSize: 14 }}>{pack.description}</Text>
          {open ? <>
            <Pressable accessibilityRole="button" accessibilityLabel={`Apply ${pack.name}`} onPress={() => onApply(pack.id)} style={({ pressed }) => ({ minHeight: 48, padding: 10, borderRadius: 14, backgroundColor: pressed ? '#315C56' : '#426E61', alignItems: 'center', justifyContent: 'center' })}>
              <Text variant="caption" style={{ color: '#FFF8E8', textAlign: 'center' }}>Set the scene · {labels[pack.atmosphere.timeOfDay]} + {labels[pack.atmosphere.weather]}</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{pack.items.map(item => <Pressable key={item} accessibilityRole="button" accessibilityLabel={`Decorate with ${itemSpec(item).name}`} onPress={() => onDecorate(item)} style={{ minWidth: 48, minHeight: 48, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#FFF9EC' }}><Text variant="caption" style={{ fontSize: 12 }}>{itemSpec(item).name}</Text></Pressable>)}</View>
          </> : <Text variant="body" style={{ fontSize: 13, color: '#725840' }}>Play {remaining} more learning {remaining === 1 ? 'round' : 'rounds'} to unlock, or ask a grown-up in Settings.</Text>}
        </View>;
      })}
    </View>
  </Sheet>;
}
