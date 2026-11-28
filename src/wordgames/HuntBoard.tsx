import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { PressableScale } from '../components/ui';
import { Text } from '../components/Text';
import { W } from './WordGameUI';
import { tileAtPoint, type HuntSize } from './wordHuntEngine';
interface Props { tiles: readonly string[]; size: HuntSize; path: readonly number[]; hint?: number; width: number; interactive?: boolean; tapMode?: boolean; onTile?: (tile: number) => void; onRelease?: () => void; onCancel?: () => void }
/** Capture only in drag mode. Tap mode exposes each full-size tile to VoiceOver and keyboard. */
export function HuntBoard({ tiles, size, path, hint, width, interactive = false, tapMode = false, onTile, onRelease, onCancel }: Props) {
  const [measured, setMeasured] = useState(width), gesture = useRef(false);
  const handlers = useRef({ onTile, onRelease, onCancel });
  // Event handlers always read the latest round without rebuilding an active responder.
  React.useLayoutEffect(() => { handlers.current = { onTile, onRelease, onCancel }; }, [onTile, onRelease, onCancel]);
  const geometry = useRef({ width: measured, size });
  React.useLayoutEffect(() => { geometry.current = { width: measured, size }; }, [measured, size]);
  const hit = (event: GestureResponderEvent) => {
    // Passive tile children make the responder surface the native touch target.
    // Local coordinates are synchronous, so a fast first move never waits for a bridge measurement.
    const tile = tileAtPoint(event.nativeEvent.locationX, event.nativeEvent.locationY, geometry.current.width, geometry.current.size);
    if (tile !== null) handlers.current.onTile?.(tile);
  };
  // Stable responder callbacks read refs only when React Native dispatches a gesture.
  // eslint-disable-next-line react-hooks/refs
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: event => {
      gesture.current = true;
      hit(event);
    },
    onPanResponderMove: event => { if (gesture.current) hit(event); },
    onPanResponderRelease: event => { if (gesture.current) hit(event); gesture.current = false; handlers.current.onRelease?.(); },
    onPanResponderTerminate: () => { gesture.current = false; handlers.current.onCancel?.(); },
    onPanResponderTerminationRequest: () => false,
  }), []);
  const cell = measured / size;
  return <View collapsable={false} testID="hunt-board" onLayout={event => { const value = event.nativeEvent.layout.width; if (value > 0) setMeasured(value); }}
    {...(interactive && !tapMode ? pan.panHandlers : {})}
    style={[styles.board, { width, height: width }, Platform.OS === 'web' && interactive && !tapMode ? { touchAction: 'none' } as never : undefined]}>
    {tiles.map((letter, i) => {
      const tileStyle = [W.tile, { position: 'absolute' as const, left: (i % size) * cell + 3, top: Math.floor(i / size) * cell + 3, width: cell - 6, height: cell - 6, minWidth: 0, minHeight: 0, backgroundColor: path.includes(i) ? '#F9C85F' : hint === i ? '#D6EBCA' : '#F3D49C', borderColor: path.includes(i) ? '#80521F' : '#A06A35' }];
      const label = <Text selectable={false} maxFontSizeMultiplier={1.5} style={[W.letter, { fontSize: size === 5 ? 25 : 30 }]}>{letter}</Text>;
      // Disabled HTML buttons swallow mouse-down before it reaches a parent responder.
      // Passive tile views let the board own the entire drag surface on web and native.
      return interactive && tapMode ? <PressableScale key={i} testID={`hunt-tile-${i}`} accessibilityRole="button" accessibilityLabel={`${letter}, row ${Math.floor(i / size) + 1}, column ${i % size + 1}${path.includes(i) ? ', selected' : ''}${hint === i ? ', hint starts here' : ''}`}
        accessibilityState={{ selected: path.includes(i) }} onPress={() => onTile?.(i)} style={tileStyle}>{label}</PressableScale>
        : <View key={i} testID={`hunt-tile-${i}`} pointerEvents="none" accessible={false} style={tileStyle}>{label}</View>;
    })}
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}><Svg width="100%" height="100%" viewBox={`0 0 ${measured} ${measured}`}>
      {path.length > 1 && <><Polyline points={path.map(i => `${(i % size + 0.5) * cell},${(Math.floor(i / size) + 0.5) * cell}`).join(' ')} stroke="#FCE59A" strokeWidth={cell * 0.24} strokeOpacity={0.65} strokeLinecap="round" strokeLinejoin="round" fill="none"/><Polyline points={path.map(i => `${(i % size + 0.5) * cell},${(Math.floor(i / size) + 0.5) * cell}`).join(' ')} stroke="#9B641B" strokeWidth={3} strokeOpacity={0.8} strokeLinecap="round" strokeLinejoin="round" fill="none"/></>}
      {path.map(i => <Circle key={i} cx={(i % size + 0.5) * cell} cy={(Math.floor(i / size) + 0.5) * cell} r={cell * 0.39} stroke="#80521F" strokeWidth={2} fill="none"/>)}
    </Svg></View>
  </View>;
}
const styles = StyleSheet.create({ board: { alignSelf: 'center', backgroundColor: '#C59C62', borderRadius: 16, overflow: 'hidden' } });
