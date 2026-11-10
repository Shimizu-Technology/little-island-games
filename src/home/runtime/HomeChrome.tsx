import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { roomIds, roomNames, type RoomId } from "../catalogMore";
import { ItemArt } from "../art/Items";
import type { RoomHover } from "./useInteraction";
const ink = "#284F4B";
export function Tool({
  label,
  symbol,
  onPress,
  selected,
  disabled,
  large = false,
}: {
  label: string;
  symbol: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  /** HR-03: 64 pt in the grown-ups' larger-target mode. */
  large?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tool,
        // In the larger mode every button shows its shape, so a 64 pt target looks like one.
        large && { minWidth: 64, minHeight: 64, borderRadius: 32, backgroundColor: "#F1E6CF" },
        selected && { backgroundColor: "#D6E9C8" },
        { opacity: disabled ? 0.35 : pressed ? 0.65 : 1 },
      ]}
    >
      <Text allowFontScaling={false} style={{ fontSize: large ? 30 : 25, color: ink }}>
        {symbol}
      </Text>
    </Pressable>
  );
}
export function FriendsIcon() {
  return (
    <Svg width={34} height={34} viewBox="0 0 34 34" accessible={false}>
      <Circle cx={10} cy={10} r={6} fill="#E5BB98" stroke={ink} strokeWidth={1.5} />
      <Circle cx={24} cy={10} r={6} fill="#D4DDD2" stroke={ink} strokeWidth={1.5} />
      <Path
        d="M3 24Q10 16 16 24M18 24Q24 16 31 24M17 23v9m-4-4 4 4 4-4"
        fill="none"
        stroke={ink}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
function FindIcon() {
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32" accessible={false}>
      <Circle cx={13} cy={12} r={9} fill="#EDD3B5" stroke={ink} strokeWidth={2} />
      <Path
        d="M7 24Q13 17 20 24M20 20L29 29M9 11h1m6 0h1M11 15q2 2 4 0"
        stroke={ink}
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
export type WindowRect = { x: number; y: number; width: number; height: number };
/** A room button is also a drop target (HM-14): it fills while a carried thing waits on it. */
function RoomButton({ id, selected, onRoom, onFriends, hover, onRect, size, token }: {
  token: number;
  id: RoomId; selected: boolean; onRoom: (room: RoomId) => void; onFriends: () => void;
  hover?: SharedValue<RoomHover | null>; onRect?: (room: RoomId, rect: WindowRect) => void; size: number;
}) {
  const ref = React.useRef<View>(null);
  const measure = React.useCallback(() => ref.current?.measureInWindow((x, y, width, height) => onRect?.(id, { x, y, width, height })), [id, onRect]);
  React.useEffect(() => { if (token) measure(); }, [token, measure]);
  const ring = useAnimatedStyle(() => {
    const on = hover?.value?.room === id;
    return { opacity: on ? 1 : 0, transform: [{ scale: on ? 1.22 : 1 }] };
  });
  const fill = useAnimatedStyle(() => ({ height: `${(hover?.value?.room === id ? hover.value.progress : 0) * 100}%` }));
  return (
    <Pressable
      ref={ref}
      onLayout={measure}
      accessibilityRole="button"
      accessibilityLabel={`Go to ${roomNames[id]}`}
      accessibilityHint="Hold to bring friends here. Carry something here to move it."
      accessibilityState={{ selected }}
      onPress={() => onRoom(id)}
      onLongPress={() => {
        onRoom(id);
        onFriends();
      }}
      style={[styles.room, { width: size, height: size }, selected && { borderColor: "#477D60", backgroundColor: "#E3EBC9" }]}
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 15, borderWidth: 3, borderColor: "#477D60",
        backgroundColor: "#FFF8E9", overflow: "hidden", justifyContent: "flex-end" }, ring]}>
        <Animated.View style={[{ width: "100%", backgroundColor: "#8FC48A" }, fill]} />
      </Animated.View>
      <ItemArt
        item={({ home: "bed", kitchen: "fridge", treehouse: "plant", beach: "shell" } as const)[id]}
        size={Math.round(size * 0.8)}
        reduced
      />
    </Pressable>
  );
}
/** HR-01: opens the friends drawer; a carried friend let go on it waits there. */
function FriendsButton({ open, onPress, hover, onRect, size, token }: {
  open: boolean; onPress: () => void; hover?: SharedValue<boolean>; onRect?: (rect: WindowRect) => void; size: number; token: number;
}) {
  const ref = React.useRef<View>(null);
  const measure = React.useCallback(() => ref.current?.measureInWindow((x, y, width, height) => onRect?.({ x, y, width, height })), [onRect]);
  React.useEffect(() => { if (token) measure(); }, [token, measure]);
  const ring = useAnimatedStyle(() => ({ opacity: hover?.value ? 1 : 0, transform: [{ scale: hover?.value ? 1.22 : 1 }] }));
  return (
    <Pressable
      ref={ref}
      onLayout={measure}
      testID="friends-button"
      accessibilityRole="button"
      accessibilityLabel="Friends"
      accessibilityHint="Opens the friends drawer. Carry a friend here to let them wait."
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      style={[styles.tool, { minWidth: size, minHeight: size, borderRadius: size / 2 }, size > 48 && { backgroundColor: "#F1E6CF" }, open && { backgroundColor: "#D6E9C8" }]}
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: size / 2, borderWidth: 3, borderColor: "#477D60",
        backgroundColor: "#8FC48A" }, ring]} />
      <FriendsIcon />
    </Pressable>
  );
}
export function HomeChrome(props: Parameters<typeof HomeChromeView>[0]) {
  // Room buttons are drop targets in window space; re-measure after the bar scrolls.
  const [token, setToken] = React.useState(0);
  return <HomeChromeView {...props} measureToken={token} onScrolled={() => setToken((n) => n + 1)} />;
}
function HomeChromeView({
  room,
  overview,
  designing,
  canUndo,
  canRedo,
  onBack,
  onUndo,
  onRedo,
  onFind,
  onFriends,
  onOverview,
  onDesign,
  onRoom,
  top,
  bottom,
  onMore,
  onHeaderLayout,
  title,
  saveStatus,
  roomHover,
  onRoomRect,
  showRedo = false,
  large = false,
  measureToken = 0,
  onScrolled,
  friendsOpen = false,
  drawerHover,
  onDrawerRect,
  width = 1024,
}: {
  /** Window width; decides whether the larger-target bar needs two rows. */
  width?: number;
  friendsOpen?: boolean;
  drawerHover?: SharedValue<boolean>;
  onDrawerRect?: (rect: WindowRect) => void;
  measureToken?: number;
  onScrolled?: () => void;
  roomHover?: SharedValue<RoomHover | null>;
  /** HM-18: Redo stays reachable in Play for 10 s after an Undo. */
  showRedo?: boolean;
  onRoomRect?: (room: RoomId, rect: WindowRect) => void;
  /** HR-03: the grown-ups' larger-target mode. */
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
}) {
  const barHeight = navigationHeightFor(large, width), wrap = large && width < LARGE_ROW;
  return (
    <>
      <View
        onLayout={(event) => onHeaderLayout(event.nativeEvent.layout.height)}
        style={[styles.header, { paddingTop: top }]}
      >
        <Tool label="Back to island" symbol="‹" onPress={onBack} large={large} />
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} adjustsFontSizeToFit style={styles.title}>
          {title ?? (overview ? "Our house" : roomNames[room])}
        </Text>
        <Tool label="Undo" symbol="↶" disabled={!canUndo} onPress={onUndo} large={large} />
        {(designing || showRedo) && <Tool label="Redo" symbol="↷" disabled={!canRedo} onPress={onRedo} large={large} />}
        <Tool
          label={designing ? "Done designing" : "Design"}
          symbol={designing ? "✓" : "✎"}
          selected={designing}
          onPress={onDesign}
          large={large}
        />
        <Tool label="More home controls" symbol="···" onPress={onMore} large={large} />
      </View>
      <View testID="home-bottom-bar" style={[styles.navigation, { bottom, height: barHeight }]}>
        <Bar wrap={wrap} onScrolled={onScrolled}>
          <Tool label="Whole house" symbol="⌂" selected={overview} onPress={onOverview} large={large} />
          {roomIds.map((id) => (
            <RoomButton key={id} id={id} selected={room === id && !overview} onRoom={onRoom} onFriends={onFriends}
              hover={roomHover} onRect={onRoomRect} size={large ? 64 : 48} token={measureToken} />
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Find my Islander"
            onPress={onFind}
            style={[styles.tool, large && { minWidth: 64, minHeight: 64, borderRadius: 32, backgroundColor: "#F1E6CF" }]}
          >
            <FindIcon />
          </Pressable>
          <FriendsButton open={friendsOpen} onPress={onFriends} hover={drawerHover} onRect={onDrawerRect} size={large ? 64 : 48} token={measureToken} />
        </Bar>
      </View>
      {saveStatus && (
        <View style={{ position: "absolute", right: 8, bottom: bottom + barHeight }}>{saveStatus}</View>
      )}
    </>
  );
}
export const navigationHeight = 60;
/** HR-03: the bottom bar with 64 pt buttons. */
export const largeNavigationHeight = 76;
const LARGE_ROW = 7 * 64 + 6 * 3 + 12;
/** HR-03: the 64 pt bar wraps to two rows when one row would hide buttons off-screen. */
export function navigationHeightFor(large: boolean, width: number): number {
  return !large ? navigationHeight : width >= LARGE_ROW ? largeNavigationHeight : 2 * 64 + 3 + 2 * 6 + 4;
}
function Bar({ wrap, onScrolled, children }: { wrap: boolean; onScrolled?: () => void; children: React.ReactNode }) {
  // Four columns: the second row lines up under the first instead of floating between them.
  if (wrap) return <View testID="home-bottom-bar-wrapped" style={[styles.navigationItems, { flexDirection: "row", flexWrap: "wrap",
    justifyContent: "flex-start", alignSelf: "center", flexGrow: 0, width: 4 * 64 + 3 * 3 + 12 }]}>{children}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navigationItems}
      onScrollEndDrag={onScrolled} onMomentumScrollEnd={onScrolled}>
      {children}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  navigation: {
    position: "absolute",
    left: 0,
    right: 0,
    height: navigationHeight,
    backgroundColor: "#FFF8E9",
    zIndex: 30,
    justifyContent: "center",
  },
  navigationItems: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    minHeight: 64,
    zIndex: 30,
    backgroundColor: "#FFF8E9",
  },
  title: { flex: 1, color: ink, fontWeight: "700", fontSize: 20, paddingVertical: 10 },
  tool: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: "#FFF8E9EE",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  room: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8E9E8",
    borderWidth: 2,
    borderColor: "transparent",
  },
});
