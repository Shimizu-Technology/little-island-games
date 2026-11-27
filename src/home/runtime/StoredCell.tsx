import React from 'react';
import { Pressable, View } from 'react-native';
import { itemSpec } from '../catalog';
import { ItemArt } from '../art/Items';
import { MoreItemArt } from '../art/More';
import { moreCatalog } from '../catalogMore';
import type { SceneEntity } from '../scene/types';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { screenPoint } from '../scene/types';
import type { Interaction } from './useInteraction';

export function StoredCell({ child, cell, index, onTake, interaction, offset }: {
  child: SceneEntity; cell: number; index: number; onTake: (id: string) => void;
  interaction?: Interaction; offset?: SharedValue<{ x: number; y: number }>;
}) {
  const { externalDown, externalMove, externalUp } = interaction ?? {};
  const start = useSharedValue({ x: 0, y: 0 }), carrying = useSharedValue(false);
  // Separate pointers let two stored cells be carried at the same time.
  const pointer = -400 - index;
  const pan = Gesture.Pan().minDistance(8)
    .onBegin(e => { start.set({ x: e.absoluteX, y: e.absoluteY }); })
    .onStart(e => {
      if (!externalDown || !externalMove || !offset) return;
      carrying.set(true);
      externalDown(pointer, child.id, screenPoint(start.value.x - offset.value.x, start.value.y - offset.value.y), undefined, { below: 0 });
      externalMove(pointer, screenPoint(e.absoluteX - offset.value.x, e.absoluteY - offset.value.y));
    })
    .onUpdate(e => { if (carrying.value && externalMove && offset) externalMove(pointer, screenPoint(e.absoluteX - offset.value.x, e.absoluteY - offset.value.y)); })
    .onEnd(() => { if (carrying.value) externalUp?.(pointer, false); })
    .onFinalize((_e, success) => { if (carrying.value && !success) externalUp?.(pointer, true); carrying.set(false); });
  const button = <Pressable accessibilityRole="button" accessibilityLabel={`Take out ${itemSpec(child.item!.item).name}`} accessibilityHint="Drag into the room, or tap to take out." onPress={() => onTake(child.id)}
    style={{ width: cell, height: cell, borderRadius: 14, backgroundColor: '#E3EBC9', alignItems: 'center', justifyContent: 'center' }}>
    <View pointerEvents="none">{moreCatalog[child.item!.item] ? <MoreItemArt id={child.item!.item} size={52} tint={child.item!.tint} state={{ on: child.item!.powered, empty: child.item!.empty }} reduced/> : <ItemArt item={child.item!.item} size={52} tint={child.item!.tint} reduced/>}</View>
  </Pressable>;
  return interaction && offset ? <GestureDetector gesture={pan}>{button}</GestureDetector> : button;
}
