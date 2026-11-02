import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import Svg, { Path, Rect, Circle } from "react-native-svg";
import { Text } from "../components/Text";
import { font } from "../components/ui";
import { TopicArt } from "../explore/ExploreArt";
import { LibraryArt } from "./LibraryArt";
import { libraryAssets } from "./assets.generated";
import type { CatalogItem } from "./catalog";
export const palette = {
  ink: "#254E4B",
  paper: "#FCFAF4",
  sage: "#DCE9D8",
  lagoon: "#C4E1DC",
  sand: "#EBD3A0",
  muted: "#536B65",
  coral: "#B75C49",
};
export function LibraryIcon({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke={palette.ink}
      strokeWidth={2.2}
      accessible={false}
    >
      {name === "wonder" ? (
        <>
          <Circle cx={14} cy={13} r={9} fill="#C4E1DC" />
          <Path d="m21 20 8 9M9 13h10M14 8v10" />
        </>
      ) : name === "make" ? (
        <>
          <Path d="m6 23-1 5 6-1L28 10l-5-5ZM20 8l5 5M6 23l5 4" fill="#EBD3A0" />
        </>
      ) : name === "shelf" ? (
        <>
          <Path d="M3 27h26M3 15h26M7 5v10M13 3v12M19 6l4 9M7 19v8M14 18v9M22 20v7" />
        </>
      ) : name === "sound" ? (
        <>
          <Path d="m5 12 7-1 7-6v22l-7-6-7-1Z" fill="#EBD3A0" />
          <Path d="M23 9q9 7 0 14M23 14q3 2 0 4" />
        </>
      ) : name === "layer" ? (
        <>
          <Rect x={5} y={6} width={22} height={22} rx={2} fill="#EBD3A0" />
          <Path d="M10 6v22M5 22h22" />
        </>
      ) : (
        <>
          <Path d="M3 6q6-3 13 1 7-4 13-1v20q-6-3-13 1-7-4-13-1ZM16 7v20" fill="#EBD3A0" />
        </>
      )}
    </Svg>
  );
}
export function Action({
  children,
  onPress,
  label,
  selected,
  disabled,
}: {
  children: React.ReactNode;
  onPress: () => void;
  label?: string;
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
        s.action,
        selected && s.selected,
        disabled && { opacity: 0.45 },
        pressed && { opacity: 0.7 },
      ]}
    >
      {React.Children.map(children, (child) =>
        typeof child === "string" || typeof child === "number" ? <Text style={s.actionText}>{child}</Text> : child
      )}
    </Pressable>
  );
}
export function ItemPicture({ record, large = false }: { record: CatalogItem; large?: boolean }) {
  const path = record.item?.image.path;
  return (
    <View
      style={{
        width: "100%",
        height: large ? 230 : 148,
        overflow: "hidden",
        borderRadius: 18,
        backgroundColor: palette.lagoon,
      }}
    >
      {path && libraryAssets[path] ? (
        <Image
          source={libraryAssets[path]}
          resizeMode="contain"
          accessibilityLabel={record.item!.image.alt}
          style={{ width: "100%", height: "100%" }}
        />
      ) : record.legacy ? (
        <TopicArt topic={record.legacy} compact={!large} />
      ) : (
        <LibraryArt kind={record.motif} />
      )}
    </View>
  );
}
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    borderBottomWidth: 1,
    borderColor: "#D9E3DB",
  },
  title: { fontFamily: font, color: palette.ink, fontSize: 30, fontWeight: "800", lineHeight: 38 },
  heading: { fontFamily: font, color: palette.ink, fontSize: 23, fontWeight: "700", marginTop: 12 },
  body: { fontFamily: font, color: palette.ink, fontSize: 19, lineHeight: 30 },
  small: { fontFamily: font, color: palette.muted, fontSize: 14, lineHeight: 21 },
  action: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#C2D3C7",
    backgroundColor: "#EFF3E7",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
  },
  actionText: { fontFamily: font, fontSize: 16, fontWeight: "600", color: palette.ink, textAlign: "center" },
  selected: { backgroundColor: "#C4E1DC", borderColor: palette.ink },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 9 },
  content: { padding: 18, gap: 14, maxWidth: 1060, width: "100%", alignSelf: "center", paddingBottom: 36 },
  input: {
    fontFamily: font,
    color: palette.ink,
    minHeight: 52,
    fontSize: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#A5BFB2",
    backgroundColor: "white",
    borderRadius: 16,
  },
  card: {
    flex: 1,
    minWidth: 0,
    margin: 6,
    borderRadius: 22,
    borderColor: "#A4C1AE",
    borderWidth: 1.5,
    overflow: "hidden",
    backgroundColor: "#F0F2DE",
  },
  cardTitle: { fontFamily: font, color: palette.ink, fontSize: 17, fontWeight: "700", padding: 12, minHeight: 62 },
  notice: { backgroundColor: "#F2E5BF", padding: 12, borderRadius: 14, margin: 10 },
  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#E4EDDD",
    borderTopWidth: 1,
    borderColor: "#BACDBE",
    paddingTop: 8,
    paddingBottom: 6,
  },
  tab: { flex: 1, minHeight: 62, alignItems: "center", justifyContent: "center", gap: 3, borderRadius: 16 },
});
