import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { itemSpec } from '../catalog';
import { storageCapacity, storageOpen, STORAGE_FULL_MESSAGE } from '../storage';
import { storageDescription } from '../scene/labels';
import type { Scene, SceneEntity } from '../scene/types';
import { ItemArt } from '../art/Items';
import { MoreItemArt } from '../art/More';
import { moreCatalog } from '../catalogMore';

/** A real, bounded contents shelf. Taking one out uses the same resolver as a drag. */
export function StorageTray({ entity, scene, bottom, large = false, onTake, onClose }: {
  entity?: SceneEntity; scene: Scene; bottom: number; large?: boolean;
  onTake: (id: string) => void; onClose: () => void;
}) {
  if (!entity?.item || !storageOpen(entity.item)) return null;
  const contents = entity.children.map(id => scene.entities[id]).filter(e => e?.attachment.kind === 'container');
  const capacity = storageCapacity(entity.item.item), cell = large ? 72 : 60;
  if (!capacity) return null;
  return <View testID="storage-tray" style={{ position: 'absolute', bottom, left: 10, right: 10, borderRadius: 20, backgroundColor: '#FFF8E9', borderWidth: 2, borderColor: '#D7C29A', padding: 8, zIndex: 38 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text accessibilityLabel={`${itemSpec(entity.item.item).name}, ${storageDescription(entity)}`} maxFontSizeMultiplier={1.4} style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#284F4B' }}>
        {itemSpec(entity.item.item).name} · {contents.length}/{capacity}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Close ${itemSpec(entity.item.item).name}`} onPress={onClose} style={{ minWidth: large ? 64 : 44, minHeight: large ? 64 : 44, justifyContent: 'center', alignItems: 'center', borderRadius: 24, backgroundColor: '#EEDDBA' }}><Text maxFontSizeMultiplier={1} style={{ fontSize: 24, color: '#284F4B' }}>×</Text></Pressable>
    </View>
    <ScrollView horizontal contentContainerStyle={{ gap: 8, alignItems: 'center' }} showsHorizontalScrollIndicator>
      {Array.from({ length: capacity }, (_, n) => {
        const child = contents[n];
        return child ? <Pressable key={child.id} accessibilityRole="button" accessibilityLabel={`Take out ${itemSpec(child.item!.item).name}`} onPress={() => onTake(child.id)}
          style={{ width: cell, height: cell, borderRadius: 14, backgroundColor: '#E3EBC9', alignItems: 'center', justifyContent: 'center' }}>
          <View pointerEvents="none">{moreCatalog[child.item!.item] ? <MoreItemArt id={child.item!.item} size={52} tint={child.item!.tint} state={{ on: child.item!.powered, empty: child.item!.empty }} reduced/> : <ItemArt item={child.item!.item} size={52} tint={child.item!.tint} reduced/>}</View>
        </Pressable> : <View key={`space-${n}`} accessible={false} style={{ width: cell, height: cell, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: '#D7C29A', backgroundColor: '#F8EEDB' }}/>;
      })}
    </ScrollView>
  </View>;
}
export function StorageFullNote({ onDismiss, top }: { onDismiss: () => void; top: number }) {
  return <Pressable testID="storage-full-note" accessibilityRole="alert" accessibilityLiveRegion="polite" accessibilityLabel={STORAGE_FULL_MESSAGE} accessibilityHint="Tap to close." onPress={onDismiss}
    style={{ position: 'absolute', top, left: 12, right: 12, padding: 12, borderRadius: 20, backgroundColor: '#FFF8E9', borderWidth: 2, borderColor: '#D7C29A', zIndex: 46, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
    <View accessible={false} style={{ width: 48, height: 40, flexDirection: 'row', flexWrap: 'wrap', gap: 4, backgroundColor: '#D7AE74', borderRadius: 8, padding: 5 }}>{[0,1,2,3].map(n => <View key={n} style={{ width: 16, height: 12, backgroundColor: '#79B090', borderRadius: 5 }}/>)}</View>
    <Text maxFontSizeMultiplier={1.4} style={{ flex: 1, fontSize: 16, fontWeight: '600', color: '#284F4B' }}>{STORAGE_FULL_MESSAGE}</Text><Text accessible={false} maxFontSizeMultiplier={1} style={{ fontSize: 22, color: '#284F4B' }}>×</Text>
  </Pressable>;
}
