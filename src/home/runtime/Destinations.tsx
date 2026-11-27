import { storageCapacity, storageOpen } from '../storage';
import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { EntityArt, artFrame, type CharacterRender } from "./EntityArt";
import { roomIds, roomNames } from "../catalogMore";
import { roomOrigin, type Building } from "../camera";
import type { CameraMatrix } from "../scene/camera";
import { PosePicture, posePlan, trayLift } from "./PosePicture";
import { resolve, type DropProposal } from "../scene/proposal";
import type { Scene } from "../scene/types";
import { BasketPicture } from "./BasketPicture";
import { capabilityOf } from "../world";
import { isPortion } from "./portions";
import { restingVisible } from "./group";
import { entityLabels } from "../scene/labels";
/** Switch/keyboard/tap destinations call exactly the drag proposal engine. */
export function Destinations({
  scene,
  selected,
  designing = false,
  scale,
  onChoose,
  onSelect,
  bottom,
  camera,
  building,
  canvasTop = 0,
  windowHeight = 0,
  renderCharacter,
  large = false,
}: {
  /** HM-17: the tray reads the camera on the UI thread and moves up off the selected thing. */
  camera?: SharedValue<CameraMatrix>;
  building?: Building;
  canvasTop?: number;
  windowHeight?: number;
  renderCharacter?: CharacterRender;
  /** HR-03: 72 pt cells in the grown-ups' larger-target mode. */
  large?: boolean;
  scene: Scene;
  selected?: string;
  designing?: boolean;
  scale: number;
  onChoose: (proposal: DropProposal) => void;
  onSelect: (id: string | undefined) => void;
  bottom: number;
}) {
  const subject = selected ? scene.entities[selected] : undefined;
  const [trayHeight, setTrayHeight] = useState(large ? 88 : 80);
  // The selected thing and what it carries, in house units, for the tray's lift.
  const extent = (() => {
    if (!subject || !building) return { top: 0, bottom: 0 };
    let top = Infinity, bottom = -Infinity;
    for (const e of [subject, ...subject.children.map((id) => scene.entities[id]).filter((e) => !!e)]) {
      const origin = roomOrigin(roomIds.indexOf(e.room), building), f = artFrame(e);
      top = Math.min(top, origin.y + e.contact.y + f.top);
      bottom = Math.max(bottom, origin.y + e.contact.y + f.top + f.height);
    }
    return { top, bottom };
  })();
  const lift = useAnimatedStyle(() => {
    if (!camera || !building || !windowHeight) return { transform: [{ translateY: 0 }] };
    const c = camera.value;
    const thing = { top: canvasTop + extent.top * c.a + c.ty, bottom: canvasTop + extent.bottom * c.a + c.ty };
    return { transform: [{ translateY: trayLift({ top: windowHeight - bottom - trayHeight, height: trayHeight }, thing, canvasTop) }] };
  });
  if (!subject || (!designing && subject.item && !capabilityOf(subject.item.item).moveInPlay)) return null;
  const choices = Object.values(scene.rooms).flatMap((index) =>
    index.targets
      .map((target) => {
        const proposal = resolve({ ...index, entities: scene.entities }, subject, target.contact, {
          scale,
          avoidFurnitureOverlap: designing,
          target: target.id,
          release: true,
        });
        return proposal.target === target.id ? { target, proposal, room: index.room } : undefined;
      })
      .filter((choice) => !!choice)
  );
  const contents = (subject.item && storageCapacity(subject.item.item) && !storageOpen(subject.item) ? [] : subject.children).map((id) => scene.entities[id]).filter((e) => !!e);
  const store =
    subject.attachment.kind !== "staging" && !isPortion(subject.id)
      ? resolve({ ...scene.rooms[subject.room], entities: scene.entities }, subject, subject.contact, {
          scale,
          intent: "staging",
          release: true,
        })
      : undefined;
  if (!choices.length && !contents.length && !store) return null;
  const contentNames = entityLabels(contents);
  const ownerNames = entityLabels(Object.values(scene.entities).filter((e) => restingVisible(e, scene)));
  const verbOf = (target: (typeof choices)[number]["target"], proposal: (typeof choices)[number]["proposal"]) =>
    target.kind === "mouth" ? "Eat or drink" : target.kind === "hand" ? "Give" : target.kind === "socket" ? (proposal.base === "lie" ? "Lie" : proposal.base === "bathe" ? "Bathe" : "Sit") : target.kind === "container" ? "Put inside" : "Put on";
  const choiceLabels = choices.map(({ target, proposal, room }) => `${verbOf(target, proposal)} in ${roomNames[room]}`);
  // Two cushions in one room would both read "Sit in Tree house": add the numbered owner only then.
  const choiceLabel = (index: number) => {
    const plain = choiceLabels[index];
    return choiceLabels.filter((label) => label === plain).length > 1
      ? `${plain}, ${ownerNames[choices[index].target.owner] ?? ""}`
      : plain;
  };
  const cell = large ? 72 : 60;
  return (
    <Animated.View
      testID="tap-destinations"
      onLayout={(event) => setTrayHeight(event.nativeEvent.layout.height)}
      style={[{
        position: "absolute",
        bottom,
        alignSelf: "center",
        maxWidth: "94%",
        maxHeight: cell + 16,
        borderRadius: 18,
        backgroundColor: "#FFF8E9F5",
        padding: 6,
        zIndex: 35,
      }, lift]}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxWidth: "100%" }} contentContainerStyle={{ gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Put selection down" onPress={() => onSelect(undefined)}
          style={{ width: cell, minHeight: cell, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#EEDDBA" }}>
          <Text maxFontSizeMultiplier={1} style={{ fontSize: 28, color: "#284F4B" }}>×</Text>
        </Pressable>
        {store && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Put in tray"
            onPress={() => onChoose(store)}
            style={{
              width: cell,
              minHeight: cell,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              backgroundColor: "#EEDDBA",
            }}
          >
            <BasketPicture entity={subject} />
          </Pressable>
        )}
        {contents.map((entity) => {
          const frame = artFrame(entity),
            size = Math.min(42 / frame.width, 42 / frame.height);
          return (
            <Pressable
              key={entity.id}
              accessibilityRole="button"
              accessibilityLabel={`Choose ${entity.item ? contentNames[entity.id] : "friend"}`}
              onPress={() => onSelect(entity.id)}
              style={{ width: cell, height: cell, padding: 6, backgroundColor: "#EEDDBA", borderRadius: 14 }}
            >
              <View pointerEvents="none" style={{ transform: [{ scale: size }], transformOrigin: "left top" }}>
                <EntityArt entity={entity} reduced />
              </View>
            </Pressable>
          );
        })}
        {choices.map(({ target, proposal, room }, choiceIndex) => (
          <Pressable
            key={`${room}:${target.id}`}
            accessibilityRole="button"
            accessibilityLabel={choiceLabel(choiceIndex)}
            onPress={() => onChoose(proposal)}
            style={{
              width: cell,
              height: cell,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              backgroundColor: "#DDEACB",
            }}
          >
            {scene.entities[target.owner] && (
              <PosePicture plan={posePlan(scene.entities[target.owner], subject, target, proposal)} size={cell - 6}
                renderCharacter={renderCharacter} />
            )}
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );
}
