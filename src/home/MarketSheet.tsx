import React, { useCallback, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { Sheet } from '../ui/Sheet';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { MoreItemArt } from './art/More';
import { itemSpec, type ItemId } from './catalog';
import { marketStock, marketContents } from './market';
import type { HomeAction, HomeStateV2 } from './model';
type Rect = { x: number; y: number; width: number; height: number };
function Grocery({ item, onAdd, basket, reduced, dragPoint, onDrag }: { item: ItemId; onAdd: (item: ItemId) => void; basket: React.RefObject<Rect>; reduced: boolean; dragPoint: SharedValue<{x: number; y: number}>; onDrag: (item: ItemId | undefined) => void }) {
  const dx = useSharedValue(0), dy = useSharedValue(0), dragging = useSharedValue(false);
  const style = useAnimatedStyle(() => ({ opacity: dragging.value ? .4 : 1, zIndex: dragging.value ? 20 : 0, transform: [{ translateX: dx.value }, { translateY: dy.value }, { scale: dragging.value ? 1.12 : 1 }] }));
  const acceptDrop = (x: number, y: number) => {
    const box = basket.current;
    if (x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height) onAdd(item);
  };
  const pan = Gesture.Pan().minDistance(6).onStart(event => { dragging.set(true); dragPoint.set({x: event.absoluteX, y: event.absoluteY}); runOnJS(onDrag)(item); })
    .onUpdate(event => { dragPoint.set({x: event.absoluteX, y: event.absoluteY}); })
    .onEnd(event => { runOnJS(acceptDrop)(event.absoluteX, event.absoluteY); })
    .onFinalize(() => { runOnJS(onDrag)(undefined); dragging.set(false); dx.set(withTiming(0, { duration: reduced ? 0 : 120 })); dy.set(withTiming(0, { duration: reduced ? 0 : 120 })); });
  return <GestureDetector gesture={pan}><Animated.View style={[{ width: '30%', minWidth: 80, alignItems: 'center', borderBottomWidth: 7, borderBottomColor: '#AC723F', backgroundColor: '#FFF8E9D9', borderRadius: 12, padding: 4, minHeight: 88 }, style]}>
    <Pressable testID={`market-stock-${item}`} accessibilityRole="button" accessibilityLabel={`Add ${itemSpec(item).name} to Carry Basket`} onPress={() => onAdd(item)} style={{ alignItems: 'center', minWidth: 72, minHeight: 72 }}>
      <MoreItemArt id={item} size={55} reduced/>
      <Text variant="small" numberOfLines={1} style={{ fontSize: 12 }}>{itemSpec(item).name}</Text>
    </Pressable>
  </Animated.View></GestureDetector>;
}
export function MarketSheet({ state, dispatch, onHome, onClose, onUndo, canUndo, message, reduced }: {
  state: HomeStateV2; dispatch: (action: HomeAction) => unknown; onHome: () => void; onClose: () => void; onUndo: () => void; canUndo: boolean; message: string; reduced: boolean;
}) {
  const contents = marketContents(state);
  const [dragged, setDragged] = useState<ItemId>();
  const dragPoint = useSharedValue({x: 0, y: 0}), origin = useSharedValue({x: 0, y: 0});
  const root = useRef<View>(null);
  const ghost = useAnimatedStyle(() => ({transform: [{translateX: dragPoint.value.x - origin.value.x - 32}, {translateY: dragPoint.value.y - origin.value.y - 32}]}));
  const basket = useRef<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  const basketNode = useRef<View>(null);
  const { height } = useWindowDimensions();
  const measure = useCallback(() => { basketNode.current?.measureInWindow((x, y, width, height) => { basket.current = { x, y, width, height }; }); root.current?.measureInWindow((x, y) => origin.set({x, y})); }, [origin]);
  const add = (item: ItemId) => dispatch({ type: 'market-add', item });
  return <Sheet visible title="Little Island Market" closeLabel="Leave Market" mode="large" heightRatio={.96} compactHeader scroll={false} onClose={onClose}>
    <View ref={root} onLayout={measure} testID="island-market" style={{ flex: 1, minHeight: 0, gap: 8 }}>
      {dragged && <Animated.View pointerEvents="none" testID="market-drag-grocery" style={[{position: "absolute", left: 0, top: 0, width: 64, height: 64, zIndex: 100}, ghost]}><MoreItemArt id={dragged} size={64} reduced/></Animated.View>}
      <Text variant="small">Tap a grocery or drag it into your basket.</Text>
      <View style={{ flex: 1, minHeight: 80, borderRadius: 18, overflow: 'hidden', backgroundColor: '#E7C68D' }}>
        <Image source={require('../../assets/art/home/places/island-market.webp')} resizeMode="cover" style={{ position: 'absolute', width: '100%', height: '100%' }}/>
        <ScrollView onScroll={measure} scrollEventThrottle={100} contentContainerStyle={{ padding: 12, paddingTop: height < 520 ? 24 : 64, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 }}>
          {marketStock.map(item => <Grocery key={item} item={item} onAdd={add} basket={basket} reduced={reduced} dragPoint={dragPoint} onDrag={setDragged}/>)}
        </ScrollView>
      </View>
      <View ref={basketNode} collapsable={false} onLayout={measure} testID="market-carry-basket" style={{ padding: 8, borderRadius: 18, backgroundColor: '#F1E0BE', borderWidth: 2, borderColor: '#B58B55', gap: 4 }}>
        <Text variant="caption">Carry Basket · {contents.length}/4</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {Array.from({ length: 4 }, (_, n) => { const grocery = contents[n]; return <Pressable key={n} disabled={!grocery} accessibilityRole="button" accessibilityLabel={grocery ? `Put back ${itemSpec(grocery.item).name}` : `Empty basket slot ${n + 1}`} onPress={() => grocery && dispatch({ type: 'market-return', id: grocery.id })} style={{ flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#FFF8E9' }}>
            {grocery ? <><MoreItemArt id={grocery.item} size={36} reduced/><Text variant="small" style={{ fontSize: 10 }}>Put back</Text></> : <Text variant="small" tone="muted">{n + 1}</Text>}
          </Pressable>; })}
        </View>
      </View>
      <Text testID="market-message" variant="small" accessibilityLiveRegion="polite" numberOfLines={2}>{message}</Text>
      <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 8 }}>
        <Button label="Carry Home" onPress={onHome} style={{ flex: 1 }}/>
        <Button label="Undo" variant="secondary" disabled={!canUndo} onPress={onUndo}/>
      </View>
    </View>
  </Sheet>;
}
