import React from "react";
import Svg, { G, SvgXml } from "react-native-svg";
import { libraryVectors } from "./vectors.generated";
import { Image, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LibraryGlyph } from "./LibraryGlyph";
import { Text } from "../components/Text";
import { font } from "../components/ui";
import { useNunitoLoaded } from "../ui/fonts";
import { theme } from "../ui/theme";
import { Motif, TopicArt } from "../explore/ExploreArt";
import { SceneBackdrop } from "./SceneBackdrop";
import { sceneCategory, sceneDecor } from "./sceneContext";
import { sceneVector } from "./sceneVector";
import { LibraryArt } from "./LibraryArt";
import { libraryAssets } from "./assets.generated";
import type { CatalogItem } from "./catalog";

export const palette = {
  canvas: "#FFF6E5",
  ink: "#3D2B24",
  paper: "#FFFDF8",
  card: "#FFFDF8",
  border: "#E8D8BE",
  rim: "rgba(61, 43, 36, 0.16)",
  sage: "#E3EFE2",
  lagoon: "#DDF1EE",
  lagoonInk: "#1E6B66",
  sand: "#F6E5C6",
  warmTint: "#FFF3DA",
  muted: "#665247",
  coral: "#B75C49",
};

export function LibraryIcon({ name, size = 28, filled = false }: { name: string; size?: number; filled?: boolean }) {
  return <LibraryGlyph name={name} size={size} filled={filled} />;
}

export function Action({
  children,
  onPress,
  label,
  selected,
  disabled,
  expanded,
  testID,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  label?: string;
  selected?: boolean;
  disabled?: boolean;
  expanded?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const nunitoLoaded = useNunitoLoaded();
  const actionFont = nunitoLoaded
    ? ({ fontFamily: theme.fontFamily["700"], fontWeight: "normal" } as const)
    : ({ fontWeight: "700" } as const);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled, expanded }}
      aria-selected={selected}
      aria-expanded={expanded}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.action,
        selected && s.selected,
        disabled && { opacity: 0.45 },
        pressed && { opacity: 0.78 },
        style,
      ]}
    >
      {React.Children.map(children, (child) =>
        typeof child === "string" || typeof child === "number" ? (
          <Text maxFontSizeMultiplier={1.3} style={[s.actionText, actionFont]}>
            {child}
          </Text>
        ) : (
          child
        )
      )}
    </Pressable>
  );
}

export function ItemPicture({
  record,
  large = false,
  pictureHeight,
  scene = false,
  fill = false,
  badge,
}: {
  record: CatalogItem;
  large?: boolean;
  pictureHeight?: number;
  scene?: boolean;
  fill?: boolean;
  badge?: string;
}) {
  const path = record.item?.image.path;
  const framed = !scene && !fill;
  return (
    <View
      style={{
        width: "100%",
        height: fill ? "100%" : (pictureHeight ?? (large ? 230 : 148)),
        overflow: "hidden",
        borderRadius: scene ? 0 : large ? 24 : 18,
        backgroundColor: framed ? "#FBF4E4" : palette.lagoon,
        padding: framed ? 5 : 0,
      }}
    >
      <View
        style={{
          flex: 1,
          width: "100%",
          height: "100%",
          overflow: "hidden",
          borderRadius: scene ? 0 : large ? 20 : 14,
          backgroundColor: palette.lagoon,
          borderWidth: framed ? 1 : 0,
          borderColor: framed ? "#EADBC2" : "transparent",
        }}
      >
        {scene && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <SceneBackdrop category={sceneCategory(record.id, record.category)} {...sceneDecor(record.id)} />
          </View>
        )}
        {/* A positioned foreground paints above the absolute scene on web and native. */}
        <View style={scene ? [StyleSheet.absoluteFill, { zIndex: 1 }] : { flex: 1 }}>
          {path && libraryVectors[path] ? (
            <SvgXml
              xml={scene ? sceneVector(libraryVectors[path]) : libraryVectors[path]}
              width="100%"
              height="100%"
              accessibilityLabel={record.item!.image.alt}
            />
          ) : path && libraryAssets[path] ? (
            <Image
              source={libraryAssets[path]}
              resizeMode="contain"
              accessibilityLabel={record.item!.image.alt}
              style={{ width: "100%", height: "100%" }}
            />
          ) : record.legacy ? (
            scene ? (
              <Svg width="100%" height="100%" viewBox="0 0 160 140" accessible={false}>
                <G transform="translate(20 10)">
                  <Motif name={record.legacy.illustration} />
                </G>
              </Svg>
            ) : (
              <TopicArt topic={record.legacy} compact={!large} height={pictureHeight} />
            )
          ) : (
            <LibraryArt kind={record.motif} category={record.category} />
          )}
        </View>
        {!!badge && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 8,
              top: 8,
              zIndex: 2,
              backgroundColor: "#FFFDF8EE",
              borderWidth: 1,
              borderColor: "#E4D1B1",
              borderRadius: 999,
              paddingHorizontal: 9,
              paddingVertical: 3,
              maxWidth: "74%",
            }}
          >
            <Text
              maxFontSizeMultiplier={1.2}
              numberOfLines={1}
              style={{
                fontFamily: font,
                fontSize: 11.5,
                fontWeight: "700",
                color: palette.ink,
                lineHeight: 15,
              }}
            >
              {badge}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.canvas },
  header: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
    backgroundColor: palette.canvas,
    borderBottomWidth: 1,
    borderColor: palette.border,
  },
  title: { fontFamily: font, color: palette.ink, fontSize: 30, fontWeight: "800", lineHeight: 38 },
  heading: { fontFamily: font, color: palette.ink, fontSize: 22, fontWeight: "800", lineHeight: 28, marginTop: 10 },
  body: { fontFamily: font, color: palette.ink, fontSize: 20, lineHeight: 31 },
  small: { fontFamily: font, color: palette.muted, fontSize: 14, lineHeight: 21 },
  action: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderBottomWidth: 3,
    borderBottomColor: palette.rim,
    backgroundColor: palette.card,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
  },
  actionText: { fontFamily: font, fontSize: 16, fontWeight: "700", color: palette.ink, textAlign: "center" },
  selected: {
    backgroundColor: palette.lagoon,
    borderColor: palette.lagoonInk,
    borderBottomColor: palette.lagoonInk,
  },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 },
  content: { padding: 18, gap: 16, maxWidth: 1060, width: "100%", alignSelf: "center", paddingBottom: 36 },
  input: {
    fontFamily: font,
    color: palette.ink,
    minHeight: 50,
    fontSize: 17,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: palette.border,
    backgroundColor: palette.card,
    borderRadius: 18,
    shadowColor: palette.ink,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  card: {
    flex: 1,
    minWidth: 0,
    margin: 6,
    borderRadius: 22,
    borderColor: palette.border,
    borderWidth: 1.5,
    borderBottomWidth: 3.5,
    borderBottomColor: palette.rim,
    overflow: "hidden",
    backgroundColor: palette.card,
    shadowColor: palette.ink,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: { fontFamily: font, color: palette.ink, fontSize: 17, fontWeight: "800", lineHeight: 23, padding: 12, minHeight: 58 },
  notice: {
    backgroundColor: palette.warmTint,
    borderWidth: 1.5,
    borderColor: "#E4C994",
    padding: 14,
    borderRadius: 18,
    marginHorizontal: 12,
    marginVertical: 8,
    gap: 10,
  },
  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 4,
    backgroundColor: palette.card,
    borderTopWidth: 1.5,
    borderColor: palette.border,
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 6,
  },
  tab: {
    flex: 1,
    minHeight: 58,
    paddingHorizontal: 2,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
});
