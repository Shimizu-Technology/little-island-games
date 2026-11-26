import React from "react";
import { StyleSheet, View } from "react-native";
import { Icon } from "./Icon";
import { PressTarget } from "./PressTarget";
import { Text } from "./Text";
import { Star } from "./icons";
import { theme } from "./theme";
import type { Pastel } from "./theme";

/**
 * Big picture tile: the game's art on its pastel with the name below. No border at rest, one soft shadow only when
 * selected. Tap opens, long-press favorites (with a haptic), and the favorite badge is a star on the picture.
 */
export function Tile({ name, pastel, art, favorite, selected, onPress, onLongPress, testID }: {
  name: string;
  pastel: Pastel;
  /** The picture. Decorative: the tile's own label names it. */
  art: React.ReactNode;
  favorite?: boolean;
  selected?: boolean;
  onPress?: () => void;
  /** Favorite or unfavorite. */
  onLongPress?: () => void;
  testID?: string;
}) {
  return (
    <PressTarget
      target="child"
      haptic
      selected={selected}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={favorite ? `${name}, favorite` : name}
      accessibilityActions={onLongPress ? [{ name: "longpress", label: favorite ? "Remove from favorites" : "Add to favorites" }] : undefined}
      onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === "longpress") onLongPress?.(); }}
      style={styles.tile}
    >
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={[styles.picture, { backgroundColor: theme.pastels[pastel] }, selected && theme.shadow]}>
        {art}
        {favorite && (
          <View testID="tile-favorite" style={styles.badge}>
            <Icon glyph={Star} weight="fill" size={20} tone="ink" />
          </View>
        )}
      </View>
      <Text variant="caption" numberOfLines={2} style={styles.name}>{name}</Text>
    </PressTarget>
  );
}

const BADGE = 32;

const styles = StyleSheet.create({
  tile: { gap: theme.space.sm, alignItems: "stretch" },
  picture: {
    aspectRatio: 1,
    minHeight: theme.target.child,
    borderRadius: theme.radius.tile,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  badge: {
    position: "absolute",
    top: theme.space.sm,
    right: theme.space.sm,
    width: BADGE,
    height: BADGE,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { textAlign: "center", fontWeight: "700" },
});
