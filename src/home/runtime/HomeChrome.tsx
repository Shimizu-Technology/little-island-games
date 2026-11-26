import React from "react";
import { StyleSheet, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { roomIds, roomNames, type RoomId } from "../catalogMore";
import type { RoomHover } from "./useInteraction";
import { Icon } from "../../ui/Icon";
import { IconButton } from "../../ui/IconButton";
import { PressTarget } from "../../ui/PressTarget";
import { Text } from "../../ui/Text";
import {
  ArrowCounterClockwise,
  ArrowLeft,
  CaretLeft,
  CaretRight,
  Check,
  CoatHanger,
  Medal,
  PencilSimple,
} from "../../ui/icons";
import { theme } from "../../ui/theme";
import type { IconGlyph } from "../../ui/Icon";

export { Tool, FriendsIcon } from "./HomeTool";

export type WindowRect = { x: number; y: number; width: number; height: number };

function DockButton({
  testID,
  glyph,
  label,
  accessibilityLabel,
  selected = false,
  dot = false,
  onPress,
}: {
  testID: string;
  glyph: IconGlyph;
  label: string;
  accessibilityLabel?: string;
  selected?: boolean;
  dot?: boolean;
  onPress: () => void;
}) {
  return (
    <PressTarget
      testID={testID}
      target="child"
      selected={selected}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={[styles.dockButton, selected && styles.dockButtonSelected]}
    >
      <View style={styles.dockIconWrap}>
        <Icon
          glyph={glyph}
          tone={selected ? "lagoon" : "ink"}
          weight={selected ? "fill" : "bold"}
          size={26}
        />
        {dot && <View testID={`${testID}-dot`} accessible={false} style={styles.newDot} />}
      </View>
      <Text
        variant="small"
        tone={selected ? "lagoon" : "ink"}
        maxFontSizeMultiplier={1.25}
        numberOfLines={1}
        style={styles.dockLabel}
      >
        {label}
      </Text>
    </PressTarget>
  );
}

export function HomeChrome({
  room,
  overview,
  designing,
  canUndo,
  onBack,
  onUndo,
  onDesign,
  onRoom,
  onCloset,
  onBadges,
  closetOpen = false,
  badgesOpen = false,
  hasNewCloset = false,
  top,
  bottom,
  onHeaderLayout,
  title,
  saveStatus,
  large = false,
  width = 1024,
}: {
  width?: number;
  friendsOpen?: boolean;
  drawerHover?: SharedValue<boolean>;
  onDrawerRect?: (rect: WindowRect) => void;
  roomHover?: SharedValue<RoomHover | null>;
  showRedo?: boolean;
  onRoomRect?: (room: RoomId, rect: WindowRect) => void;
  large?: boolean;
  room: RoomId;
  overview: boolean;
  designing: boolean;
  canUndo: boolean;
  canRedo: boolean;
  top: number;
  bottom: number;
  onMore: () => void;
  onHeaderLayout: (height: number) => void;
  title?: string;
  saveStatus?: React.ReactNode;
  onBack: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onFind: () => void;
  onFriends: () => void;
  onOverview: () => void;
  onDesign: () => void;
  onRoom: (room: RoomId) => void;
  onCloset?: () => void;
  onBadges?: () => void;
  closetOpen?: boolean;
  badgesOpen?: boolean;
  hasNewCloset?: boolean;
}) {
  const barHeight = navigationHeightFor(large, width);
  const currentIndex = Math.max(0, roomIds.indexOf(room));
  const prevRoom = roomIds[(currentIndex - 1 + roomIds.length) % roomIds.length];
  const nextRoom = roomIds[(currentIndex + 1) % roomIds.length];
  const controlTarget = large ? "child" : "adult";
  const sideSize = theme.target[controlTarget];

  return (
    <>
      <View
        testID="home-top-bar"
        onLayout={(event) => onHeaderLayout(event.nativeEvent.layout.height)}
        style={[styles.header, { paddingTop: top }]}
      >
        <IconButton
          testID="home-back-button"
          glyph={ArrowLeft}
          accessibilityLabel="Back to island"
          onPress={onBack}
          target={controlTarget}
          style={styles.topButton}
        />
        <View testID="home-room-pill" style={[styles.roomPill, theme.shadow]}>
          <IconButton
            testID="home-room-prev"
            glyph={CaretLeft}
            accessibilityLabel={`Previous room, ${roomNames[prevRoom]}`}
            onPress={() => onRoom(prevRoom)}
            target={controlTarget}
          />
          <Text
            variant="body"
            maxFontSizeMultiplier={1.3}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={styles.title}
          >
            {title ?? (overview ? "Our house" : roomNames[room])}
          </Text>
          <IconButton
            testID="home-room-next"
            glyph={CaretRight}
            accessibilityLabel={`Next room, ${roomNames[nextRoom]}`}
            onPress={() => onRoom(nextRoom)}
            target={controlTarget}
          />
        </View>
        {designing ? (
          <IconButton
            testID="home-undo-button"
            glyph={ArrowCounterClockwise}
            accessibilityLabel="Undo"
            disabled={!canUndo}
            onPress={onUndo}
            target={controlTarget}
            style={styles.topButton}
          />
        ) : (
          <View style={{ width: sideSize, height: sideSize }} />
        )}
      </View>

      <View testID="home-bottom-bar" style={[styles.navigation, { bottom, height: barHeight }]}>
        <View style={styles.navigationItems}>
          <DockButton
            testID="home-closet-button"
            glyph={CoatHanger}
            label="Closet"
            accessibilityLabel={hasNewCloset ? "Closet, new items" : "Closet"}
            selected={closetOpen}
            dot={hasNewCloset}
            onPress={() => onCloset?.()}
          />
          <DockButton
            testID="home-badges-button"
            glyph={Medal}
            label="Badges"
            accessibilityLabel="Badges"
            selected={badgesOpen}
            onPress={() => onBadges?.()}
          />
          <DockButton
            testID="home-decorate-button"
            glyph={designing ? Check : PencilSimple}
            label={designing ? "Done" : "Decorate"}
            accessibilityLabel={designing ? "Done decorating" : "Decorate"}
            selected={designing}
            onPress={onDesign}
          />
        </View>
      </View>

      {saveStatus && (
        <View style={{ position: "absolute", right: 8, bottom: bottom + barHeight }}>{saveStatus}</View>
      )}
    </>
  );
}

/** Clean 4.0 bottom bar height: holds three 64 pt child buttons comfortably. */
export const navigationHeight = 76;
export const largeNavigationHeight = 76;
export function navigationHeightFor(_large: boolean, _width: number): number {
  return navigationHeight;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.space.sm,
    paddingHorizontal: theme.space.sm,
    paddingBottom: theme.space.xs,
    minHeight: 60,
    zIndex: 30,
    backgroundColor: theme.colors.bg,
  },
  topButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  roomPill: {
    flex: 1,
    maxWidth: 320,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    paddingHorizontal: theme.space.xs,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontWeight: "800",
    paddingHorizontal: theme.space.xs,
  },
  navigation: {
    position: "absolute",
    left: 0,
    right: 0,
    height: navigationHeight,
    backgroundColor: theme.colors.bg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.hairline,
    zIndex: 30,
    justifyContent: "center",
  },
  navigationItems: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: theme.space.md,
    paddingHorizontal: theme.space.md,
  },
  dockButton: {
    minWidth: 88,
    minHeight: theme.target.child,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
    borderRadius: theme.radius.tile,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    backgroundColor: "transparent",
  },
  dockButtonSelected: {
    backgroundColor: theme.colors.lagoonSoft,
  },
  dockIconWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  newDot: {
    position: "absolute",
    top: -2,
    right: -6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.coral,
    borderWidth: 2,
    borderColor: theme.colors.bg,
  },
  dockLabel: {
    fontWeight: "700",
    textAlign: "center",
  },
});
