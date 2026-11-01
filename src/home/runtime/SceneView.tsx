import React, { memo } from 'react';
import { Platform, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { roomIds, roomNames } from '../catalogMore';
import { RoomArt, ShoreArt } from '../art/Room';
import { RoomShellArt } from '../art/More';
import { BuildingArt, BuildingTrim, TerraceArt } from '../BuildingArt';
import { roomOrigin, type Building } from '../camera';
import { itemSpec } from '../catalog';
import type { HomeStateV2 } from '../model';
import type { Scene, SceneEntity } from '../scene/types';
import { EntityArt, artFrame, type CharacterRender } from './EntityArt';
import { DragOverlay } from './DragOverlay';
import type { Interaction, Pickup } from './useInteraction';
import type { Viewport } from './CameraController';

function ancestors(entity: SceneEntity, scene: Scene): string[] {
  const result = [entity.id];
  let parent = entity.parent;
  while (parent && !result.includes(parent)) { result.push(parent); parent = scene.entities[parent]?.parent; }
  return result;
}
const RestingEntity = memo(function RestingEntity({ entity, owners, interaction, reduced, renderCharacter, onSelect, onMove, selected, front = false }: {
  entity: SceneEntity; owners: string[]; interaction: Interaction; reduced: boolean; renderCharacter?: CharacterRender; selected?: string;
  onSelect: (id: string) => void; onMove: (id: string, action: string) => void; front?: boolean;
}) {
  const frame = artFrame(entity);
  const style = useAnimatedStyle(() => {
    for (let i = 0; i < 2; i++) {
      const slot = interaction.slots.value[i];
      if (slot.id && owners.includes(slot.id)) return { opacity: slot.ready ? 0 : 1, transform: [{ translateX: slot.ready ? 0 : slot.x - slot.sourceX }, { translateY: slot.ready ? 0 : slot.y - slot.sourceY }] };
    }
    return { opacity: 1, transform: [{ translateX: 0 }, { translateY: 0 }] };
  });
  const name = entity.character ? ['Islander', 'Pip', 'Crab'][entity.character.slot] : itemSpec(entity.item!.item).name;
  return <Animated.View
    testID={front ? undefined : entity.character ? `character-${entity.character.slot}` : `object-${entity.item!.id}`}
    accessible={!front} focusable={!front} tabIndex={front ? -1 : 0}
    accessibilityRole="button" accessibilityLabel={`${name}, ${roomNames[entity.room]}${entity.character ? `, ${entity.base}` : ''}`}
    accessibilityState={{ selected: selected === entity.id }}
    accessibilityHint="Select, then choose a place."
    accessibilityActions={[{ name: 'activate', label: 'Select' }, ...['left', 'right', 'back', 'forward', 'store'].map(name => ({ name, label: name }))]}
    onAccessibilityAction={event => event.nativeEvent.actionName === 'activate' ? onSelect(entity.id) : onMove(entity.id, event.nativeEvent.actionName)}
    {...(Platform.OS === 'web' ? { onKeyDown: (event: { nativeEvent: { key: string }; preventDefault: () => void }) => {
      const action = ({ ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'back', ArrowDown: 'forward', Enter: 'activate', ' ': 'activate' } as Record<string, string>)[event.nativeEvent.key];
      if (action) { event.preventDefault(); if (action === 'activate') onSelect(entity.id); else onMove(entity.id, action); }
    }} : {})}
    pointerEvents={front ? 'none' : 'auto'}
    style={[{ position: 'absolute', left: entity.contact.x + frame.left, top: entity.contact.y + frame.top, width: frame.width, height: frame.height }, style]}>
    {selected === entity.id && !front && <View pointerEvents="none" style={{ position: 'absolute', left: '12%', right: '12%', bottom: 0, height: 12, borderRadius: 50, borderWidth: 3, borderColor: '#61AB8D', backgroundColor: '#D8EFBA88' }} />}
    <EntityArt entity={entity} front={front} reduced={reduced} renderCharacter={renderCharacter} />
  </Animated.View>;
});
export function SceneView({ state, scene, building, viewport, interaction, pickups, reduced, renderCharacter, selected, onSelect, onMove, stress = false }: {
  state: HomeStateV2; scene: Scene; building: Building; viewport: Viewport; interaction: Interaction; pickups: (Pickup | undefined)[]; reduced: boolean; renderCharacter?: CharacterRender; selected?: string; stress?: boolean;
  onSelect: (id: string) => void; onMove: (id: string, action: string) => void;
}) {
  const cameraStyle = useAnimatedStyle(() => ({ transformOrigin: 'left top', transform: [{ translateX: interaction.camera.value.tx }, { translateY: interaction.camera.value.ty }, { scale: interaction.camera.value.a }] }));
  return <GestureDetector gesture={interaction.gesture} touchAction="none"><View testID="house-viewport" style={{ width: viewport.width, height: viewport.height, overflow: 'hidden', backgroundColor: '#BEE4DD' }}>
    <Animated.View testID="house-camera" style={[{ position: 'absolute', width: building.width, height: building.height }, cameraStyle]}>
      <View pointerEvents="none" style={{ position: 'absolute', width: building.width, height: building.height }}><BuildingArt building={building} /></View>
      {roomIds.map((roomId, index) => {
        const origin = roomOrigin(index, building), room = state.rooms[roomId];
        const entities = Object.values(scene.rooms[roomId].entities).filter(e => e.attachment.kind !== 'staging').sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id));
        return <View key={roomId} testID={`home-scene-${roomId}`} pointerEvents="box-none" style={{ position: 'absolute', left: origin.x, top: origin.y, width: 800, height: 740 }}>
          <View pointerEvents="none" style={{ width: 800, height: 560 }}>{roomId === 'home' ? <RoomArt theme={room.theme} reduced={reduced} /> : <RoomShellArt room={roomId} theme={room.theme} />}</View>
          <View pointerEvents="none" style={{ position: 'absolute', top: 525, width: 800, height: 215 }}>{index < building.columns ? <ShoreArt depth={215} /> : <TerraceArt />}</View>
          <View pointerEvents="box-none" style={{ position: 'absolute', left: 8, top: 8, width: 784, height: 544, overflow: 'hidden' }}><View pointerEvents="box-none" style={{ position: 'absolute', left: -8, top: -8 }}>
            {entities.map(entity => <RestingEntity key={entity.id} entity={entity} owners={ancestors(entity, scene)} interaction={interaction} reduced={reduced} renderCharacter={renderCharacter} selected={selected} onSelect={onSelect} onMove={onMove} />)}
            {entities.filter(entity => entity.item && entity.children.some(child => scene.entities[child]?.attachment.kind === 'socket')).map(entity => <RestingEntity key={`front:${entity.id}`} front entity={entity} owners={ancestors(entity, scene)} interaction={interaction} reduced={reduced} onSelect={onSelect} onMove={onMove} />)}
            {stress && <StressCopies entities={entities} reduced={reduced} renderCharacter={renderCharacter} />}
          </View></View>
        </View>;
      })}
      <View pointerEvents="none" style={{ position: 'absolute', width: building.width, height: building.height }}><BuildingTrim building={building} /></View>
      <DragOverlay pickups={pickups} interaction={interaction} building={building} reduced={reduced} renderCharacter={renderCharacter} />
    </Animated.View>
  </View></GestureDetector>;
}
/** Render-only stress fixture: never bypasses production save identity/capacity limits. */
function StressCopies({ entities, reduced, renderCharacter }: { entities: SceneEntity[]; reduced: boolean; renderCharacter?: CharacterRender }) {
  const actors = entities.filter(e => e.character), props = entities.filter(e => e.item && !e.children.length);
  return <View pointerEvents="none" style={{ position: 'absolute' }}>{Array.from({ length: actors.length ? 9 : 0 }, (_, i) => <View key={`actor-${i}`} style={{ position: 'absolute', left: 50 + i % 6 * 110, top: 170 + Math.floor(i / 6) * 80 }}><EntityArt entity={actors[i % actors.length]} reduced={reduced} renderCharacter={renderCharacter} /></View>)}{Array.from({ length: props.length ? 36 : 0 }, (_, i) => <View key={`prop-${i}`} style={{ position: 'absolute', left: 30 + i % 12 * 60, top: 320 + Math.floor(i / 12) * 55 }}><EntityArt entity={props[i % props.length]} reduced={reduced} /></View>)}</View>;
}
