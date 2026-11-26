import React, { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, runOnUI } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { itemIds, itemSpec, decorSpec, floorThemes, wallThemes } from "../catalog";
import { moreCatalog, tintIds, tintPalette } from "../catalogMore";
import { owns, type HomeAction, type HomeStateV2, type Ownership, type Instance } from "../model";
import { MoreItemArt } from "../art/More";
import { ItemArt } from "../art/Items";
import type { ItemId } from "../catalog";
import { screenPoint } from "../scene/types";
import type { Interaction } from "./useInteraction";
import { Tool } from "./HomeTool";
import { UndoGonePicture } from "./UndoNote";
import { RESTORE_QUESTION, type RestoreCost } from "../useHomeStore";
import { theme } from "../../ui/theme";

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
/** R5: the 64 pt tabs and tool row need 36 pt more, so the catalog row keeps its full height. */
export const portraitDrawerHeightFor = (large = false) => portraitDrawerHeight + (large ? 36 : 0);
const big = (large: boolean) => (large ? { minWidth: 64, minHeight: 64, justifyContent: "center" as const } : null);
/** In the larger mode a text-only button shows its shape too, like the large Tools. */
const shape = (large: boolean) => (large ? { backgroundColor: "#F1E6CF", borderRadius: 18, paddingHorizontal: 18 } : null);
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
  const { externalMove, externalUp } = interaction;
  useEffect(() => () => {
    runOnUI(() => {
      "worklet";
      // A native recognizer may disappear without finalize when its cell unmounts.
      if (!ghost.value.active || ghost.value.item !== id) return;
      externalUp(-500, true);
      ghost.set({ x: 0, y: 0, active: false });
    })();
  // The external channel reads stable shared values; rerenders must not cancel it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ghost]);
  const pan = Gesture.Pan().enabled(owned).minDistance(8);
  if (vertical) pan.activeOffsetX([-8, 8]).failOffsetY([-14, 14]);
  else pan.activeOffsetY([-8, 8]).failOffsetX([-14, 14]);
  pan
    .onStart((event) => {
      if (ghost.value.active) return;
      runOnJS(onDragItem)(id, event.absoluteX, event.absoluteY);
      ghost.set({ item: id, x: event.absoluteX, y: event.absoluteY, active: true });
    })
    .onUpdate((event) => {
      if (!ghost.value.active || ghost.value.item !== id) return;
      externalMove(-500, screenPoint(event.absoluteX - offset.value.x, event.absoluteY - offset.value.y));
      ghost.set({ item: id, x: event.absoluteX, y: event.absoluteY, active: true });
    })
    .onEnd((event, success) => {
      if (!success || !ghost.value.active || ghost.value.item !== id) return;
      runOnJS(onDrop)(id, event.absoluteX, event.absoluteY);
    })
    .onFinalize((event, success) => {
      if (!ghost.value.active || ghost.value.item !== id) return;
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
  large = false,
  restoreCost,
  onRestoreAnyway,
}: {
  /** F3: what restoring this room would cost Undo, asked when the Restore question opens. */
  restoreCost?: () => RestoreCost | undefined;
  /** F3: the child chose Restore after being told Undo can't keep it all. */
  onRestoreAnyway?: () => void;
  /** HR-03 / R5: every child-used button here is at least 64 pt in the larger-target mode. */
  large?: boolean;
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
    [confirm, setConfirm] = useState(false),
    [moreOpen, setMoreOpen] = useState(false),
    [cost, setCost] = useState<RestoreCost>();
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
        height: vertical ? "100%" : portraitDrawerHeightFor(large),
        backgroundColor: "#E8D9BF",
        padding: 8,
        gap: 6,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: large ? 64 : 44 }}
        contentContainerStyle={{ gap: 8 }}
      >
        {["Furniture", ...Object.keys(categoryNames), "Stickers", "Room", "Colours"].map((name) => (
          <Pressable
            key={name}
            onPress={() => setTab(name)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === name }}
            style={[{
              paddingHorizontal: 12,
              paddingVertical: 10,
              backgroundColor: tab === name ? "#D5E6C8" : "#FFF8E9",
              borderRadius: 14,
            }, big(large)]}
          >
            <Text style={{ color: "#284F4B" }}>{categoryNames[name] ?? name}</Text>
          </Pressable>
        ))}
        <Tool
          label="More decorating"
          symbol="···"
          selected={moreOpen}
          onPress={() => setMoreOpen(true)}
          large={large}
        />
        <Tool label="Close catalog" symbol="✓" onPress={onClose} large={large} />
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
                style={[{ padding: 14, backgroundColor: "#FFF8E9", borderRadius: 12 }, big(large)]}
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
                style={[{ padding: 14, backgroundColor: "#FFF8E9", borderRadius: 12 }, big(large)]}
              >
                <Text>{id.replaceAll("-", " ")}</Text>
              </Pressable>
            ))}
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
                style={{ minWidth: large ? 64 : 48, minHeight: large ? 64 : 48, padding: 8, alignItems: "center", justifyContent: "center" }}
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
      <View style={{ height: large ? 64 : 48 }}>
        {target && (
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Tool
              label="Rotate"
              symbol="⟳"
              disabled={itemSpec(target.item).rotations.length < 2}
              onPress={() => dispatch({ type: "rotate", id: target.id })}
              large={large}
            />
            <Tool
              label="Mirror"
              symbol="⇆"
              disabled={!itemSpec(target.item).mirror}
              onPress={() => dispatch({ type: "mirror", id: target.id })}
              large={large}
            />
            <Tool label="Put away" symbol="▱" onPress={() => dispatch({ type: "put-away", id: target.id })} large={large} />
          </View>
        )}
      </View>
      {/* Decorate's More secondary sheet keeps Tidy up tucked out of reach of stray taps. */}
      <Modal visible={moreOpen} transparent onRequestClose={() => setMoreOpen(false)} animationType="none">
        <View style={{ flex: 1, justifyContent: "flex-end", alignItems: "center", backgroundColor: theme.colors.scrim }}>
          <View
            testID="decorate-more-sheet"
            accessibilityViewIsModal
            style={{
              width: "100%",
              maxWidth: theme.sheet.maxWidth,
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: theme.radius.sheet,
              borderTopRightRadius: theme.radius.sheet,
              padding: theme.space.xl,
              gap: theme.space.md,
            }}
          >
            <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: theme.radius.full, backgroundColor: theme.colors.hairline }} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.space.sm }}>
              <Text accessibilityRole="header" style={{ color: theme.colors.ink, fontSize: 22, fontWeight: "700" }}>
                More
              </Text>
              <Tool label="Close decorating options" symbol="×" onPress={() => setMoreOpen(false)} large={large} />
            </View>
            <Pressable
              testID="decorate-tidy-up-button"
              accessibilityRole="button"
              accessibilityLabel="Tidy up"
              onPress={() => {
                setMoreOpen(false);
                setCost(restoreCost?.());
                setConfirm(true);
              }}
              style={[
                {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: theme.space.lg,
                  borderRadius: theme.radius.tile,
                  backgroundColor: theme.colors.lagoonSoft,
                  minHeight: 56,
                },
                big(large),
              ]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: theme.colors.ink, fontSize: 17, fontWeight: "700" }}>Tidy up</Text>
                <Text style={{ color: theme.colors.muted, fontSize: 15 }}>Put things back where they started</Text>
              </View>
              <Text allowFontScaling={false} style={{ color: theme.colors.ink, fontSize: 22 }}>↺</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal visible={confirm} transparent onRequestClose={() => setConfirm(false)} animationType="none">
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.scrim }}>
          {cost === "no-undo" || cost === "drops-older" ? (
          // F3: Undo can't keep all of this restore. Say so first, in a picture and words; never refuse silently.
          <View testID="restore-anyway" accessibilityViewIsModal
            style={{ backgroundColor: theme.colors.bg, padding: 24, borderRadius: 24, maxWidth: 340, gap: 14, alignItems: "center" }}>
            <UndoGonePicture size={112} />
            <Text accessibilityRole="header" accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.6}
              style={{ color: theme.colors.ink, fontSize: 17, fontWeight: "600", textAlign: "center" }}>
              {RESTORE_QUESTION[cost]}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onRestoreAnyway?.();
                setConfirm(false);
              }}
              style={[{ padding: 12, alignSelf: "stretch", alignItems: "center", backgroundColor: "#F1E6CF", borderRadius: 14 }, big(large), shape(large)]}
            >
              <Text>Make it new</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setConfirm(false)}
              style={[{ padding: 12, alignSelf: "stretch", alignItems: "center", backgroundColor: "#CFE3D6", borderRadius: 14 }, big(large), shape(large)]}>
              <Text style={{ fontWeight: "600" }}>Keep my room</Text>
            </Pressable>
          </View>
          ) : (
          <View style={{ backgroundColor: theme.colors.bg, padding: 24, borderRadius: 24, maxWidth: 340, gap: 14 }}>
            <Text style={{ color: theme.colors.ink, fontSize: 17, fontWeight: "600" }}>Tidy up this room? Undo can bring it back.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                dispatch({ type: "reset" });
                setConfirm(false);
              }}
              style={[{ padding: 12, alignItems: "center", backgroundColor: theme.colors.coral, borderRadius: theme.radius.full }, big(large), shape(large)]}
            >
              <Text style={{ color: theme.colors.ink, fontWeight: "700" }}>Tidy up</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setConfirm(false)} style={[{ padding: 12, alignItems: "center", backgroundColor: theme.colors.lagoonSoft, borderRadius: theme.radius.full }, big(large), shape(large)]}>
              <Text style={{ color: theme.colors.ink, fontWeight: "700" }}>Keep playing</Text>
            </Pressable>
          </View>
          )}
        </View>
      </Modal>
    </View>
  );
}
