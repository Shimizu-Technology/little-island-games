import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { roomIds, roomNames, type RoomId } from "../catalogMore";
import { ItemArt } from "../art/Items";
const ink = "#284F4B";
export function Tool({
  label,
  symbol,
  onPress,
  selected,
  disabled,
}: {
  label: string;
  symbol: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
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
        selected && { backgroundColor: "#D6E9C8" },
        { opacity: disabled ? 0.35 : pressed ? 0.65 : 1 },
      ]}
    >
      <Text allowFontScaling={false} style={{ fontSize: 25, color: ink }}>
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
export function HomeChrome({
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
}: {
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
  return (
    <>
      <View
        onLayout={(event) => onHeaderLayout(event.nativeEvent.layout.height)}
        style={[styles.header, { paddingTop: top }]}
      >
        <Tool label="Back to island" symbol="‹" onPress={onBack} />
        <Text numberOfLines={2} style={styles.title}>
          {title ?? (overview ? "Our house" : roomNames[room])}
        </Text>
        <Tool label="Undo" symbol="↶" disabled={!canUndo} onPress={onUndo} />
        {designing && <Tool label="Redo" symbol="↷" disabled={!canRedo} onPress={onRedo} />}
        <Tool
          label={designing ? "Done designing" : "Design"}
          symbol={designing ? "✓" : "✎"}
          selected={designing}
          onPress={onDesign}
        />
      </View>
      <View testID="home-bottom-bar" style={[styles.navigation, { bottom }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navigationItems}>
          <Tool label="Whole house" symbol="⌂" selected={overview} onPress={onOverview} />
          {roomIds.map((id) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={`Go to ${roomNames[id]}`}
              accessibilityHint="Hold to bring friends here."
              accessibilityState={{ selected: room === id && !overview }}
              onPress={() => onRoom(id)}
              onLongPress={() => {
                onRoom(id);
                onFriends();
              }}
              style={[styles.room, room === id && !overview && { borderColor: "#477D60", backgroundColor: "#E3EBC9" }]}
            >
              <ItemArt
                item={({ home: "bed", kitchen: "fridge", treehouse: "plant", beach: "shell" } as const)[id]}
                size={38}
                reduced
              />
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Find my Islander"
            onPress={onFind}
            style={styles.tool}
          >
            <FindIcon />
          </Pressable>
          <Tool label="More home controls" symbol="···" onPress={onMore} />
        </ScrollView>
      </View>
      {saveStatus && (
        <View style={{ position: "absolute", right: 8, bottom: bottom + navigationHeight }}>{saveStatus}</View>
      )}
    </>
  );
}
export const navigationHeight = 60;
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
