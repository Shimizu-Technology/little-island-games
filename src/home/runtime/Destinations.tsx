import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { EntityArt, artFrame } from "./EntityArt";
import { roomNames } from "../catalogMore";
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
}: {
  scene: Scene;
  selected?: string;
  designing?: boolean;
  scale: number;
  onChoose: (proposal: DropProposal) => void;
  onSelect: (id: string) => void;
  bottom: number;
}) {
  const subject = selected ? scene.entities[selected] : undefined;
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
  const contents = subject.children.map((id) => scene.entities[id]).filter((e) => !!e);
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
    target.kind === "mouth" ? "Eat or drink" : target.kind === "hand" ? "Give" : target.kind === "socket" ? (proposal.base === "lie" ? "Lie" : proposal.base === "bathe" ? "Bathe" : "Sit") : "Put on";
  const choiceLabels = choices.map(({ target, proposal, room }) => `${verbOf(target, proposal)} in ${roomNames[room]}`);
  // Two cushions in one room would both read "Sit in Tree house": add the numbered owner only then.
  const choiceLabel = (index: number) => {
    const plain = choiceLabels[index];
    return choiceLabels.filter((label) => label === plain).length > 1
      ? `${plain}, ${ownerNames[choices[index].target.owner] ?? ""}`
      : plain;
  };
  const symbols = { hand: "✋", mouth: "◡", socket: "◠", surface: "▱", container: "▣" };
  return (
    <View
      testID="tap-destinations"
      style={{
        position: "absolute",
        bottom,
        left: 72,
        right: 72,
        maxHeight: 80,
        borderRadius: 18,
        backgroundColor: "#FFF8E9F5",
        padding: 6,
        zIndex: 35,
      }}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {store && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Put in tray"
            onPress={() => onChoose(store)}
            style={{
              width: 58,
              minHeight: 64,
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
              style={{ width: 58, height: 56, padding: 6, backgroundColor: "#EEDDBA", borderRadius: 14 }}
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
              minWidth: 58,
              minHeight: 64,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              backgroundColor: "#DDEACB",
            }}
          >
            {scene.entities[target.owner] &&
              (() => {
                const owner = scene.entities[target.owner],
                  frame = artFrame(owner),
                  size = Math.min(36 / frame.width, 36 / frame.height);
                return (
                  <View pointerEvents="none" style={{ width: 36, height: 36 }}>
                    <View style={{ transform: [{ scale: size }], transformOrigin: "left top" }}>
                      <EntityArt entity={owner} reduced />
                    </View>
                  </View>
                );
              })()}
            <Text allowFontScaling={false} style={{ fontSize: 18, color: "#284F4B" }}>
              {symbols[target.kind]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
