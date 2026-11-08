import React, { useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { itemIds, itemSpec, decorSpec, floorThemes, wallThemes } from "../catalog";
import { moreCatalog, tintIds, tintPalette } from "../catalogMore";
import { owns, type HomeAction, type HomeStateV2, type Ownership, type Instance } from "../model";
import { MoreItemArt } from "../art/More";
import { ItemArt } from "../art/Items";
import type { ItemId } from "../catalog";
import { screenPoint } from "../scene/types";
import type { Interaction } from "./useInteraction";
import { Tool } from "./HomeChrome";

const categoryNames: Record<string, string> = {
  "beds-seats": "Beds & seats",
  "tables-storage": "Tables & storage",
  kitchen: "Kitchen",
  "plants-nature": "Plants",
  lights: "Lights",
  "toys-fun": "Toys",
  "rugs-floor": "Rugs",
  "wall-art": "Wall art",
};
export const portraitDrawerHeight = 220;
export type CatalogGhost = { item?: ItemId; x: number; y: number; active: boolean };
function Thumbnail({
  id,
  ownership,
  vertical,
  ghost,
  onChoose,
  onDrop,
  onDragItem,
  interaction,
  offset,
}: {
  id: ItemId;
  ownership: Ownership;
  vertical: boolean;
  ghost: SharedValue<CatalogGhost>;
  onChoose: (id: ItemId) => void;
  onDrop: (id: ItemId, x: number, y: number, cancel?: boolean) => void;
  onDragItem: (id: ItemId, x: number, y: number) => void;
  interaction: Interaction;
  offset: SharedValue<{ x: number; y: number }>;
}) {
  const owned = owns(id, ownership);
  const { externalMove } = interaction;
  const pan = Gesture.Pan().enabled(owned).minDistance(8);
  if (vertical) pan.activeOffsetX([-8, 8]).failOffsetY([-14, 14]);
  else pan.activeOffsetY([-8, 8]).failOffsetX([-14, 14]);
  pan
    .onStart((event) => {
      runOnJS(onDragItem)(id, event.absoluteX, event.absoluteY);
      ghost.set({ item: id, x: event.absoluteX, y: event.absoluteY, active: true });
    })
    .onUpdate((event) => {
      externalMove(-500, screenPoint(event.absoluteX - offset.value.x, event.absoluteY - offset.value.y));
      ghost.set({ item: id, x: event.absoluteX, y: event.absoluteY, active: true });
    })
    .onEnd((event) => {
      runOnJS(onDrop)(id, event.absoluteX, event.absoluteY);
    })
    .onFinalize((event, success) => {
      if (!success) runOnJS(onDrop)(id, event.absoluteX, event.absoluteY, true);
      ghost.set({ x: 0, y: 0, active: false });
    });
  return (
    <GestureDetector gesture={pan} touchAction={vertical ? "pan-y" : "pan-x"}>
      <Pressable
        testID={`inventory-${id}`}
        accessibilityRole="button"
        accessibilityLabel={`${itemSpec(id).name}${owned ? "" : ", locked"}`}
        onPress={() => onChoose(id)}
        style={{
          width: 86,
          minHeight: 94,
          alignItems: "center",
          padding: 5,
          borderRadius: 14,
          backgroundColor: "#FFF8E9",
          opacity: owned ? 1 : 0.4,
        }}
      >
        {moreCatalog[id] ? <MoreItemArt id={id} size={58} reduced /> : <ItemArt item={id} size={58} reduced />}
        <Text numberOfLines={2} style={{ color: "#284F4B", fontSize: 12, textAlign: "center" }}>
          {itemSpec(id).name}
        </Text>
        {!owned && <Text accessibilityLabel="Locked">♢</Text>}
      </Pressable>
    </GestureDetector>
  );
}
export function DesignTools({
  state,
  initialItem,
  ownership,
  target,
  vertical,
  ghost,
  onChoose,
  onDrop,
  onDragItem,
  interaction,
  offset,
  dispatch,
  onClose,
}: {
  initialItem?: string;
  state: HomeStateV2;
  ownership: Ownership;
  target?: Instance;
  vertical: boolean;
  ghost: SharedValue<CatalogGhost>;
  onChoose: (id: ItemId) => void;
  onDrop: (id: ItemId, x: number, y: number, cancel?: boolean) => void;
  onDragItem: (id: ItemId, x: number, y: number) => void;
  interaction: Interaction;
  offset: SharedValue<{ x: number; y: number }>;
  dispatch: (action: HomeAction) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState(
      initialItem && !itemIds.includes(initialItem)
        ? "Room"
        : initialItem?.startsWith("sticker:")
          ? "Stickers"
          : "Furniture"
    ),
    [confirm, setConfirm] = useState(false);
  const items = itemIds.filter((id) =>
    tab === "Stickers"
      ? id.startsWith("sticker:") && owns(id, ownership)
      : !id.startsWith("sticker:") && (tab === "Furniture" || decorSpec(id).category === tab)
  ) as ItemId[];
  const catalogVisible = tab !== "Room" && tab !== "Colours";
  return (
    <View
      testID="design-drawer"
      style={{
        width: vertical ? 220 : "100%",
        height: vertical ? "100%" : portraitDrawerHeight,
        backgroundColor: "#E8D9BF",
        padding: 8,
        gap: 6,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 44 }}
        contentContainerStyle={{ gap: 8 }}
      >
        {["Furniture", ...Object.keys(categoryNames), "Stickers", "Room", "Colours"].map((name) => (
          <Pressable
            key={name}
            onPress={() => setTab(name)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === name }}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              backgroundColor: tab === name ? "#D5E6C8" : "#FFF8E9",
              borderRadius: 14,
            }}
          >
            <Text style={{ color: "#284F4B" }}>{categoryNames[name] ?? name}</Text>
          </Pressable>
        ))}
        <Tool label="Close catalog" symbol="✓" onPress={onClose} />
      </ScrollView>
      {catalogVisible && (
        <FlatList
          key={`${tab}-${vertical ? "column" : "row"}`}
          horizontal={!vertical}
          numColumns={vertical ? 2 : 1}
          data={items}
          style={{ flex: 1 }}
          getItemLayout={(_, index) => ({ length: vertical ? 100 : 92, offset: (vertical ? 100 : 92) * index, index })}
          initialScrollIndex={Math.max(0, Math.floor(items.indexOf(initialItem ?? "") / (vertical ? 2 : 1)))}
          keyExtractor={(id) => id}
          initialNumToRender={12}
          maxToRenderPerBatch={8}
          contentContainerStyle={{ gap: 6 }}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item: id }) => (
            <Thumbnail
              id={id}
              ownership={ownership}
              vertical={vertical}
              ghost={ghost}
              onChoose={onChoose}
              onDrop={onDrop}
              onDragItem={onDragItem}
              interaction={interaction}
              offset={offset}
            />
          )}
        />
      )}
      {tab === "Room" && (
        <ScrollView horizontal={!vertical} style={{ flex: 1 }} contentContainerStyle={{ gap: 8 }}>
          {wallThemes
            .filter((id) => !ownership.ownedWallpapers || ownership.ownedWallpapers.includes(id))
            .map((id) => (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={`${id} walls`}
                onPress={() => dispatch({ type: "theme", wallpaper: id })}
                style={{ padding: 14, backgroundColor: "#FFF8E9", borderRadius: 12 }}
              >
                <Text>{id.replaceAll("-", " ")}</Text>
              </Pressable>
            ))}
          {floorThemes
            .filter((id) => !ownership.ownedFloors || ownership.ownedFloors.includes(id))
            .map((id) => (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={`${id} floor`}
                onPress={() => dispatch({ type: "theme", floor: id })}
                style={{ padding: 14, backgroundColor: "#FFF8E9", borderRadius: 12 }}
              >
                <Text>{id.replaceAll("-", " ")}</Text>
              </Pressable>
            ))}
          <Tool label="Restore this room" symbol="↺" onPress={() => setConfirm(true)} />
        </ScrollView>
      )}
      {tab === "Colours" && (
        <ScrollView horizontal={!vertical} style={{ flex: 1 }}>
          {target ? (
            tintIds.map((tint) => (
              <Pressable
                key={tint}
                accessibilityRole="button"
                accessibilityLabel={`${tint} colour`}
                onPress={() => dispatch({ type: "tint", id: target.id, tint })}
                style={{ minWidth: 48, minHeight: 48, padding: 8 }}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: tintPalette[tint] ?? "#EDDDC1",
                    borderWidth: 2,
                    borderColor: "#284F4B",
                  }}
                />
              </Pressable>
            ))
          ) : (
            <Text style={{ padding: 12 }}>Choose an object.</Text>
          )}
        </ScrollView>
      )}
      <View style={{ height: 48 }}>
        {target && (
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Tool
              label="Rotate"
              symbol="⟳"
              disabled={itemSpec(target.item).rotations.length < 2}
              onPress={() => dispatch({ type: "rotate", id: target.id })}
            />
            <Tool
              label="Mirror"
              symbol="⇆"
              disabled={!itemSpec(target.item).mirror}
              onPress={() => dispatch({ type: "mirror", id: target.id })}
            />
            <Tool label="Put away" symbol="▱" onPress={() => dispatch({ type: "put-away", id: target.id })} />
          </View>
        )}
      </View>
      <Modal visible={confirm} transparent onRequestClose={() => setConfirm(false)} animationType="none">
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#284F4B66" }}>
          <View style={{ backgroundColor: "#FFF8E9", padding: 24, borderRadius: 20, maxWidth: 340, gap: 14 }}>
            <Text>Restore this room? Undo can bring it back.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                dispatch({ type: "reset" });
                setConfirm(false);
              }}
              style={{ padding: 12 }}
            >
              <Text>Restore room</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setConfirm(false)} style={{ padding: 12 }}>
              <Text>Keep playing</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
