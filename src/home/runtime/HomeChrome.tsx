import React, { useCallback, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { roomIds, roomNames, type RoomId } from "../catalogMore";
import type { RoomHover } from "./useInteraction";
import { Icon } from "../../ui/Icon";
import { IconButton } from "../../ui/IconButton";
import { PressTarget } from "../../ui/PressTarget";
import { Text } from "../../ui/Text";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowLeft,
  CaretLeft,
  CaretRight,
  Check,
  CoatHanger,
  DotsThree,
  PencilSimple,
  Star,
  UsersThree,
} from "../../ui/icons";
import { theme } from "../../ui/theme";
import type { IconGlyph } from "../../ui/Icon";

export { Tool, FriendsIcon } from "./HomeTool";

export type WindowRect = { x: number; y: number; width: number; height: number };

/** Room arrow button that also registers as an H3 carry drop-zone target (HM-14). */
function RoomArrowDropButton({
  testID,
  glyph,
  targetRoom,
  accessibilityLabel,
  target,
  hover,
  onPress,
  onRect,
  measureKey,
}: {
  testID: string;
  glyph: IconGlyph;
  targetRoom: RoomId;
  accessibilityLabel: string;
  target: "adult" | "child";
  hover?: SharedValue<RoomHover | null>;
  onPress: () => void;
  onRect?: (room: RoomId, rect: WindowRect | null) => void;
  measureKey: string;
}) {
  const ref = useRef<View>(null);
  const measure = useCallback(() => {
    ref.current?.measureInWindow?.((x, y, width, height) => {
      if (width > 0 && height > 0) onRect?.(targetRoom, { x, y, width, height });
    });
  }, [onRect, targetRoom]);

  useEffect(() => {
    measure();
    return () => {
      onRect?.(targetRoom, null);
    };
  }, [measure, measureKey, onRect, targetRoom]);

  const ring = useAnimatedStyle(() => {
    const on = hover?.value?.room === targetRoom;
    return { opacity: on ? 1 : 0, transform: [{ scale: on ? 1.16 : 1 }] };
  });
  const fill = useAnimatedStyle(() => ({
    height: `${(hover?.value?.room === targetRoom ? hover.value.progress : 0) * 100}%`,
  }));

  return (
    <View ref={ref} collapsable={false} onLayout={measure} style={styles.dropTargetWrap}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dropRing, ring]}>
        <Animated.View style={[styles.dropFill, fill]} />
      </Animated.View>
      <IconButton
        testID={testID}
        glyph={glyph}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Carry something here to move it to this room."
        onPress={onPress}
        target={target}
      />
    </View>
  );
}

/** Compact Friends drawer button that also registers as the H3 friend-staging drop zone (HR-01). */
function FriendsDropButton({
  open,
  target,
  hover,
  onPress,
  onRect,
  measureKey,
}: {
  open: boolean;
  target: "adult" | "child";
  hover?: SharedValue<boolean>;
  onPress: () => void;
  onRect?: (rect: WindowRect) => void;
  measureKey: string;
}) {
  const ref = useRef<View>(null);
  const measure = useCallback(() => {
    ref.current?.measureInWindow?.((x, y, width, height) => {
      if (width > 0 && height > 0) onRect?.({ x, y, width, height });
    });
  }, [onRect]);

  useEffect(() => {
    measure();
  }, [measure, measureKey]);

  const ring = useAnimatedStyle(() => ({
    opacity: hover?.value ? 1 : 0,
    transform: [{ scale: hover?.value ? 1.18 : 1 }],
  }));

  return (
    <View ref={ref} collapsable={false} onLayout={measure} style={styles.dropTargetWrap}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dropRing, ring]} />
      <IconButton
        testID="home-friends-button"
        glyph={UsersThree}
        accessibilityLabel="Friends drawer"
        accessibilityHint="Open the friends drawer, or drop a friend here to wait."
        selected={open}
        tone={open ? "lagoon" : "ink"}
        filled={open}
        onPress={onPress}
        target={target}
        style={[styles.topButton, open && styles.topButtonSelected]}
      />
    </View>
  );
}

function DockButton({
  testID,
  glyph,
  iconNode,
  label,
  accessibilityLabel,
  selected = false,
  dot = false,
  targetRef,
  onPress,
}: {
  testID: string;
  glyph?: IconGlyph;
  iconNode?: React.ReactNode;
  label: string;
  accessibilityLabel?: string;
  selected?: boolean;
  dot?: boolean;
  targetRef?: React.Ref<View>;
  onPress: () => void;
}) {
  return (
    <PressTarget
      testID={testID}
      targetRef={targetRef}
      target="child"
      selected={selected}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={[styles.dockButton, selected && styles.dockButtonSelected]}
    >
      <View style={styles.dockIconWrap}>
        {iconNode ??
          (glyph ? (
            <Icon
              glyph={glyph}
              tone={selected ? "lagoon" : "ink"}
              weight={selected ? "fill" : "bold"}
              size={26}
            />
          ) : null)}
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
  canRedo,
  showRedo = false,
  onBack,
  onUndo,
  onRedo,
  onMore,
  onFriends,
  onDesign,
  onRoom,
  onCloset,
  onBadges,
  closetOpen = false,
  badgesOpen = false,
  hasNewCloset = false,
  friendsOpen = false,
  roomHover,
  onRoomRect,
  drawerHover,
  onDrawerRect,
  closetButtonRef,
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
  onRoomRect?: (room: RoomId, rect: WindowRect | null) => void;
  closetButtonRef?: React.Ref<View>;
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
  const showRedoButton = designing || showRedo;
  const wrapHeader = (large && width < 720) || (designing && width < 500) || (showRedoButton && width < 430);
  const measureKey = `${room}:${width}:${large ? 1 : 0}:${designing ? 1 : 0}:${showRedoButton ? 1 : 0}`;

  const actionControls = (
    <View style={styles.topActions}>
      {designing && (
        <IconButton
          testID="home-undo-button"
          glyph={ArrowCounterClockwise}
          accessibilityLabel="Undo"
          disabled={!canUndo}
          onPress={onUndo}
          target={controlTarget}
          style={styles.topButton}
        />
      )}
      {showRedoButton && (
        <IconButton
          testID="home-redo-button"
          glyph={ArrowClockwise}
          accessibilityLabel="Redo"
          disabled={!canRedo}
          onPress={onRedo}
          target={controlTarget}
          style={styles.topButton}
        />
      )}
      <FriendsDropButton
        open={friendsOpen}
        target={controlTarget}
        hover={drawerHover}
        onPress={onFriends}
        onRect={onDrawerRect}
        measureKey={measureKey}
      />
      <IconButton
        testID="home-more-button"
        glyph={DotsThree}
        accessibilityLabel="More home controls"
        onPress={onMore}
        target={controlTarget}
        style={styles.topButton}
      />
    </View>
  );

  return (
    <>
      <View
        testID="home-top-bar"
        onLayout={(event) => onHeaderLayout(event.nativeEvent.layout.height)}
        style={[styles.header, wrapHeader && styles.headerWrapped, { paddingTop: top }]}
      >
        <View style={styles.headerPrimaryRow}>
          <IconButton
            testID="home-back-button"
            glyph={ArrowLeft}
            accessibilityLabel="Back to island"
            onPress={onBack}
            target={controlTarget}
            style={styles.topButton}
          />
          <View testID="home-room-pill" style={[styles.roomPill, theme.shadow]}>
            <RoomArrowDropButton
              testID="home-room-prev"
              glyph={CaretLeft}
              targetRoom={prevRoom}
              accessibilityLabel={`Previous room, ${roomNames[prevRoom]}`}
              target={controlTarget}
              hover={roomHover}
              onPress={() => onRoom(prevRoom)}
              onRect={onRoomRect}
              measureKey={measureKey}
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
            <RoomArrowDropButton
              testID="home-room-next"
              glyph={CaretRight}
              targetRoom={nextRoom}
              accessibilityLabel={`Next room, ${roomNames[nextRoom]}`}
              target={controlTarget}
              hover={roomHover}
              onPress={() => onRoom(nextRoom)}
              onRect={onRoomRect}
              measureKey={measureKey}
            />
          </View>
          {!wrapHeader && actionControls}
        </View>
        {wrapHeader && <View style={styles.headerSecondaryRow}>{actionControls}</View>}
      </View>

      <View testID="home-bottom-bar" style={[styles.navigation, { bottom, height: barHeight }]}>
        <View style={styles.navigationItems}>
          <DockButton
            testID="home-closet-button"
            targetRef={closetButtonRef}
            glyph={CoatHanger}
            label="Closet"
            accessibilityLabel={hasNewCloset ? "Closet, new items" : "Closet"}
            selected={closetOpen}
            dot={hasNewCloset}
            onPress={() => onCloset?.()}
          />
          <DockButton
            testID="home-badges-button"
            iconNode={
              <View
                testID="home-badges-star-frame"
                accessible={false}
                style={[styles.starFrame, badgesOpen && styles.starFrameSelected]}
              >
                <Icon
                  glyph={Star}
                  tone={badgesOpen ? "lagoon" : "ink"}
                  weight={badgesOpen ? "fill" : "bold"}
                  size={16}
                />
              </View>
            }
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
        <View
          testID="home-save-status"
          pointerEvents="box-none"
          style={[styles.saveStatusWrap, { bottom: bottom + barHeight }]}
        >
          {saveStatus}
        </View>
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
    flexDirection: "column",
    gap: theme.space.xs,
    paddingHorizontal: theme.space.sm,
    paddingBottom: theme.space.xs,
    minHeight: 60,
    zIndex: 30,
    backgroundColor: theme.colors.bg,
  },
  headerWrapped: {
    paddingBottom: theme.space.xs,
  },
  headerPrimaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.space.xs,
  },
  headerSecondaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.xs,
  },
  topButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  topButtonSelected: {
    backgroundColor: theme.colors.lagoonSoft,
    borderColor: theme.colors.lagoon,
  },
  dropTargetWrap: {
    position: "relative",
    borderRadius: theme.radius.full,
  },
  dropRing: {
    borderRadius: theme.radius.full,
    borderWidth: 3,
    borderColor: theme.colors.lagoon,
    backgroundColor: theme.colors.bg,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  dropFill: {
    width: "100%",
    backgroundColor: "#8FC48A",
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
    paddingHorizontal: 4,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontWeight: "800",
    paddingHorizontal: 4,
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
  starFrame: {
    width: 28,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.ink,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  starFrameSelected: {
    borderColor: theme.colors.lagoon,
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
  saveStatusWrap: {
    position: "absolute",
    right: 8,
    zIndex: 100,
    elevation: 100,
  },
});
