import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { screenPoint, type SceneEntity } from "../scene/types";
import { EntityArt, artFrame, type CharacterRender } from "./EntityArt";
import type { Interaction } from "./useInteraction";
function StagedItem({
  entity,
  index,
  offset,
  interaction,
  reduced,
  renderCharacter,
  onSelect,
}: {
  entity: SceneEntity;
  index: number;
  offset: SharedValue<{ x: number; y: number }>;
  interaction: Interaction;
  reduced: boolean;
  renderCharacter?: CharacterRender;
  onSelect: (id: string) => void;
}) {
  const { externalDown, externalMove, externalUp, slots } = interaction;
  const pointer = -100 - index;
  const frame = artFrame(entity),
    scale = Math.min(56 / frame.width, 56 / frame.height);
  const gesture = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .failOffsetX([-14, 14])
    .onBegin((e) =>
      externalDown(pointer, entity.id, screenPoint(e.absoluteX - offset.value.x, e.absoluteY - offset.value.y))
    )
    .onStart((e) => externalMove(pointer, screenPoint(e.absoluteX - offset.value.x, e.absoluteY - offset.value.y)))
    .onUpdate((e) => externalMove(pointer, screenPoint(e.absoluteX - offset.value.x, e.absoluteY - offset.value.y)))
    .onEnd(() => externalUp(pointer, false))
    .onFinalize((_e, success) => {
      if (!success) externalUp(pointer, true);
    });
  const style = useAnimatedStyle(() => ({ opacity: slots.value.some((s) => s.id === entity.id && s.ready) ? 0 : 1 }));
  return (
    <GestureDetector gesture={gesture} touchAction="pan-x">
      <Animated.View style={style}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Move ${entity.item?.item ?? "friend"} from tray`}
          onPress={() => onSelect(entity.id)}
          style={{ width: 64, height: 64, overflow: "hidden" }}
        >
          <View pointerEvents="none" style={{ transform: [{ scale }], transformOrigin: "left top" }}>
            <EntityArt entity={entity} reduced={reduced} renderCharacter={renderCharacter} />
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}
export function StagingTray({
  entities,
  bottom,
  ...props
}: {
  entities: SceneEntity[];
  bottom: number;
  offset: SharedValue<{ x: number; y: number }>;
  interaction: Interaction;
  reduced: boolean;
  renderCharacter?: CharacterRender;
  onSelect: (id: string) => void;
}) {
  if (!entities.length) return null;
  return (
    <ScrollView
      horizontal
      testID="staging-tray"
      style={{
        position: "absolute",
        bottom,
        left: 72,
        right: 72,
        maxHeight: 88,
        borderRadius: 16,
        backgroundColor: "#FFF8E9",
        zIndex: 36,
      }}
      contentContainerStyle={{ gap: 10, padding: 8 }}
    >
      {entities.map((entity, index) => (
        <StagedItem key={entity.id} entity={entity} index={index} {...props} />
      ))}
    </ScrollView>
  );
}
