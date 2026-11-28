import { friendNames } from "../family";
import React, { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import { moreCatalog, roomNames, type RoomId } from "../catalogMore";
import Svg, { Path } from "react-native-svg";
import { isGuamPlace } from "../locations";
import { MoreItemArt } from "../art/More";
import { ItemArt } from "../art/Items";
import { screenPoint, type Scene, type SceneEntity } from "../scene/types";
import { EntityArt, artFrame, type CharacterRender } from "./EntityArt";
import { Tool } from "./HomeChrome";
import type { Interaction } from "./useInteraction";

/**
 * HR-01 (rules 4 and 47): the friends drawer. Every friend has a cell you can drag them out of,
 * straight into the room under your finger, as the same friend with what they hold. A tap
 * brings them here. A friend carried onto the Friends button waits in the drawer. Opening or
 * closing it never moves the camera and never removes anyone.
 */
export const DRAWER_MS = 160;
export { friendNames } from "../family";
const roomIcon = { home: "bed", kitchen: "fridge", treehouse: "plant", beach: "shell", "tumon-beach": "shell", "chamorro-village": "bbq-grill", "cocos-island": "sea-turtle" } as const;
export type FriendPlace = { waiting: boolean; room: RoomId };
export function friendPlace(entity: SceneEntity): FriendPlace {
  return { waiting: entity.attachment.kind === "staging", room: entity.room };
}
export function friendLabel(entity: SceneEntity, here: RoomId): string {
  const name = friendNames[entity.character!.slot] ?? "Friend";
  const place = friendPlace(entity);
  const where = place.waiting ? "waiting in the drawer" : place.room === here ? "in this room"
    : isGuamPlace(place.room) ? `at ${roomNames[place.room]}`
    : place.room === "home" ? `in ${roomNames.home}` : `in the ${roomNames[place.room]}`;
  return `${name}, ${where}. Drag into the room, or tap to bring here.`;
}
function FriendCell({ entity, scene, here, size, offset, interaction, renderCharacter, onBring, onCarry }: {
  entity: SceneEntity;
  scene: Scene;
  here: RoomId;
  size: number;
  offset: SharedValue<{ x: number; y: number }>;
  interaction: Interaction;
  renderCharacter?: CharacterRender;
  onBring: (id: string, slot: number, from?: { x: number; y: number }) => void;
  onCarry: (carrying: boolean) => void;
}) {
  const cell = useRef<View | null>(null);
  const { externalDown, externalMove, externalUp, slots } = interaction;
  const slot = entity.character!.slot, pointer = -200 - slot;
  const standing: SceneEntity = { ...entity, base: "stand", facing: "front", action: null, children: [] };
  const frame = artFrame(standing), scale = Math.min((size - 10) / frame.width, (size - 8) / frame.height);
  // Hold them at the middle of the body, as you would pick a doll up.
  const below = frame.height * 0.45;
  const begin = useSharedValue({ x: 0, y: 0 }), carrying = useSharedValue(false);
  const held = entity.children.map((id) => scene.entities[id]).find((e) => e?.attachment.kind === "hand");
  const place = friendPlace(entity);
  const pan = Gesture.Pan()
    .minDistance(8)
    .onBegin((e) => { begin.set({ x: e.absoluteX, y: e.absoluteY }); })
    .onStart((e) => {
      if (slots.value.some((s) => s.id === entity.id)) return;
      carrying.set(true);
      externalDown(pointer, entity.id, screenPoint(begin.value.x - offset.value.x, begin.value.y - offset.value.y), undefined, { below });
      externalMove(pointer, screenPoint(e.absoluteX - offset.value.x, e.absoluteY - offset.value.y));
      runOnJS(onCarry)(true);
    })
    .onUpdate((e) => { if (carrying.value) externalMove(pointer, screenPoint(e.absoluteX - offset.value.x, e.absoluteY - offset.value.y)); })
    .onEnd(() => { if (carrying.value) externalUp(pointer, false); })
    .onFinalize((_e, success) => {
      if (!carrying.value) return;
      if (!success) externalUp(pointer, true);
      carrying.set(false);
      runOnJS(onCarry)(false);
    });
  const style = useAnimatedStyle(() => ({ opacity: slots.value.some((s) => s.id === entity.id && s.drawer && s.ready) ? 0.35 : 1 }));
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style}>
        <Pressable
          ref={cell}
          testID={`friend-cell-${slot}`}
          accessibilityRole="button"
          accessibilityLabel={friendLabel(entity, here)}
          onPress={() => cell.current?.measureInWindow((x, y, w, h) => onBring(entity.id, slot, { x: x + w / 2, y: y + h / 2 }))}
          style={{ width: size, height: size + 32, borderRadius: 16, alignItems: "center", justifyContent: "flex-end", paddingBottom: 4,
            backgroundColor: place.waiting ? "#F3E2C2" : place.room === here ? "#E3EBC9" : "#EEF0E2", overflow: "hidden" }}
        >
          <View pointerEvents="none" style={{ height: size, alignItems: "center", justifyContent: "flex-end" }}>
            <View style={{ width: frame.width * scale, height: frame.height * scale }}>
              <View style={{ width: frame.width, height: frame.height, transform: [{ scale }], transformOrigin: "left top" }}>
                <EntityArt entity={standing} reduced renderCharacter={renderCharacter} />
              </View>
            </View>
          </View>
          <Text maxFontSizeMultiplier={1} numberOfLines={2} style={{ width: "100%", height: 28, lineHeight: 14, textAlign: "center", fontSize: 11, color: "#284F4B", fontWeight: "600" }}>{friendNames[slot]}</Text>
          {held && (
            <View pointerEvents="none" style={{ position: "absolute", left: 3, top: 3, width: 22, height: 22, alignItems: "center", justifyContent: "center",
              borderRadius: 11, backgroundColor: "#FFF8E9" }}>
              <View style={{ transform: [{ scale: Math.min(18 / artFrame(held).width, 18 / artFrame(held).height) }] }}>
                <EntityArt entity={held} reduced />
              </View>
            </View>
          )}
          {!place.waiting && place.room !== here && (
            <View pointerEvents="none" style={badge}>
              {moreCatalog[roomIcon[place.room]]
                ? <MoreItemArt id={roomIcon[place.room]} size={24} reduced />
                : <ItemArt item={roomIcon[place.room]} size={24} reduced />}
            </View>
          )}
          {place.waiting && (
            <View pointerEvents="none" style={badge} testID={`friend-waiting-${slot}`}>
              <WaitingBasket />
            </View>
          )}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}
const badge = { position: "absolute" as const, right: 3, top: 3, width: 28, height: 28, borderRadius: 14, backgroundColor: "#FFF8E9",
  borderWidth: 1.5, borderColor: "#D7C29A", alignItems: "center" as const, justifyContent: "center" as const };
/** A friend waiting in the drawer: the same woven basket as the tray, so "put away" always looks the same. */
function WaitingBasket() {
  return (
    <Svg width={22} height={20} viewBox="0 0 52 40" accessible={false}>
      <Path d="M5 14Q26 6 47 14L42 34Q26 39 10 34Z" fill="#D7AE74" stroke="#385451" strokeWidth={3} />
      <Path d="M5 14Q26 23 47 14M15 22L17 33M26 24V35M37 22L35 33" fill="none" stroke="#FFF1D3" strokeWidth={3} />
    </Svg>
  );
}
export function FriendDrawer({ open, scene, here, bottom, top, interaction, offset, reduced, large = false, compact = false, renderCharacter, onBring, onClose, onCarry }: {
  open: boolean;
  scene: Scene;
  here: RoomId;
  bottom: number;
  /** HR-03 on a phone: the 64 pt bar is two rows, so the drawer opens at the top of the play area instead of over the floor. */
  top?: number;
  interaction: Interaction;
  offset: SharedValue<{ x: number; y: number }>;
  reduced: boolean;
  large?: boolean;
  compact?: boolean;
  renderCharacter?: CharacterRender;
  onBring: (id: string, slot: number, from?: { x: number; y: number }) => void;
  onClose: () => void;
  onCarry: (carrying: boolean) => void;
}) {
  const shown = useSharedValue(open ? 1 : 0);
  const [carrying, setCarrying] = React.useState(false);
  useEffect(() => {
    const to = open && !carrying ? 1 : 0;
    shown.set(reduced ? to : withTiming(to, { duration: DRAWER_MS }));
  }, [open, carrying, reduced, shown]);
  const style = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateY: (1 - shown.value) * (top === undefined ? 18 : -18) }] }));
  const friends = Object.values(scene.entities).filter((e) => e.character).sort((a, b) => a.character!.slot - b.character!.slot);
  const size = large ? 76 : 64;
  return (
    <Animated.View
      testID="friend-drawer"
      accessibilityViewIsModal={false}
      pointerEvents={open ? "box-none" : "none"}
      importantForAccessibility={open ? "auto" : "no-hide-descendants"}
      accessibilityElementsHidden={!open}
      style={[{ position: "absolute", ...(top === undefined ? { bottom } : { top }), alignSelf: "center", width: compact ? (large ? 600 : 520) : large ? 292 : 256, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 8, padding: 8,
        borderRadius: 20, backgroundColor: "#FFF8E9", borderWidth: 2, borderColor: "#D7C29A", zIndex: 41 }, style]}
    >
      <Text accessibilityRole="header" style={{ width: "100%", textAlign: "center", fontWeight: "700", color: "#284F4B" }}>Family & Friends</Text>
      {friends.map((entity) => (
        <FriendCell key={entity.id} entity={entity} scene={scene} here={here} size={size} offset={offset} interaction={interaction}
          renderCharacter={renderCharacter} onBring={onBring}
          onCarry={(on) => { setCarrying(on); onCarry(on); }} />
      ))}
      <Tool label="Close friends" symbol="×" onPress={onClose} large={large} />
    </Animated.View>
  );
}
