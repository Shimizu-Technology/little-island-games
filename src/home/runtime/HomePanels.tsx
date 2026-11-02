import React from "react";
import { Pressable, Text, View } from "react-native";
import { HomeCharacter } from "../characterRenderer";
import type { Scene } from "../scene/types";
import type { CharacterRender } from "./EntityArt";
import { FriendsIcon, Tool } from "./HomeChrome";

/** Explicit controls only: room/background taps never open a picker. */
export function HomePanels({
  more,
  friends,
  bottom,
  scene,
  renderCharacter,
  onClose,
  onFriends,
  onZoom,
  onBring,
}: {
  more: boolean;
  friends: boolean;
  bottom: number;
  scene: Scene;
  renderCharacter?: CharacterRender;
  onClose: () => void;
  onFriends: () => void;
  onZoom: (ratio: number) => void;
  onBring: (id: string, slot: number) => void;
}) {
  if (!more && !friends) return null;
  return (
    <View
      testID={friends ? "bring-friends" : "more-home-controls"}
      style={{
        position: "absolute",
        bottom,
        left: 8,
        right: 8,
        padding: 10,
        borderRadius: 18,
        backgroundColor: "#FFF8E9",
        zIndex: 40,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ flex: 1, color: "#284F4B", fontWeight: "700" }}>
          {friends ? "Bring friends here" : "Home controls"}
        </Text>
        <Tool label="Close home controls" symbol="×" onPress={onClose} />
      </View>
      {more ? (
        <View style={{ flexDirection: "row", justifyContent: "space-evenly" }}>
          <Tool label="Zoom in" symbol="+" onPress={() => onZoom(1.3)} />
          <Tool label="Zoom out" symbol="−" onPress={() => onZoom(1 / 1.3)} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bring friends here"
            onPress={onFriends}
            style={{ alignItems: "center", minWidth: 100 }}
          >
            <FriendsIcon />
            <Text style={{ color: "#284F4B" }}>Bring here ↓</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: "row", justifyContent: "space-evenly" }}>
          {Object.values(scene.entities)
            .filter((e) => e.character)
            .map((entity) => {
              const input = {
                slot: entity.character!.slot,
                base: "stand" as const,
                action: null,
                face: null,
                facing: "right" as const,
                size: 64,
                reduced: true,
              };
              return (
                <Pressable
                  key={entity.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Bring ${["Islander", "Pip", "Crab"][input.slot]} here`}
                  onPress={() => onBring(entity.id, input.slot)}
                  style={{
                    width: 86,
                    height: 104,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 16,
                    backgroundColor: "#E3EBC9",
                  }}
                >
                  <View style={{ width: 64, height: 68, alignItems: "center", justifyContent: "center" }}>
                    {renderCharacter?.(input) ?? <HomeCharacter input={input} />}
                  </View>
                  <Text style={{ fontSize: 18, color: "#284F4B" }}>↓ here</Text>
                </Pressable>
              );
            })}
        </View>
      )}
    </View>
  );
}
