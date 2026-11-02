import React from "react";
import { SvgXml } from "react-native-svg";
import { libraryVectors } from "./vectors.generated";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { LibraryGlyph } from "./LibraryGlyph";
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
  return <LibraryGlyph name={name} size={size} />;
}

export function Action({
  children,
  onPress,
  label,
  selected,
  disabled,
  expanded,
}: {
  children: React.ReactNode;
  onPress: () => void;
  label?: string;
  selected?: boolean;
  disabled?: boolean;
  expanded?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled, expanded }}
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
export function ItemPicture({
  record,
  large = false,
  pictureHeight,
}: {
  record: CatalogItem;
  large?: boolean;
  pictureHeight?: number;
}) {
  const path = record.item?.image.path;
  return (
    <View
      style={{
        width: "100%",
        height: pictureHeight ?? (large ? 230 : 148),
        overflow: "hidden",
        borderRadius: large ? 26 : 18,
        backgroundColor: palette.lagoon,
      }}
    >
      {path && libraryVectors[path] ? (
        <SvgXml xml={libraryVectors[path]} width="100%" height="100%" accessibilityLabel={record.item!.image.alt} />
      ) : path && libraryAssets[path] ? (
        <Image
          source={libraryAssets[path]}
          resizeMode="contain"
          accessibilityLabel={record.item!.image.alt}
          style={{ width: "100%", height: "100%" }}
        />
      ) : record.legacy ? (
        <TopicArt topic={record.legacy} compact={!large} height={pictureHeight} />
      ) : (
        <LibraryArt kind={record.motif} />
      )}
    </View>
  );
}
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    borderBottomWidth: 1,
    borderColor: "#D9E3DB",
  },
  title: { fontFamily: font, color: palette.ink, fontSize: 30, fontWeight: "800", lineHeight: 38 },
  heading: { fontFamily: font, color: palette.ink, fontSize: 23, fontWeight: "700", marginTop: 12 },
  body: { fontFamily: font, color: palette.ink, fontSize: 22, lineHeight: 34 },
  small: { fontFamily: font, color: palette.muted, fontSize: 14, lineHeight: 21 },
  action: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 12,
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
    borderRadius: 24,
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
