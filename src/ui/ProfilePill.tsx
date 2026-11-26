import React from "react";
import { StyleSheet } from "react-native";
import { PressTarget } from "./PressTarget";
import { Text } from "./Text";
import { theme } from "./theme";

/**
 * Who is playing. Full (face and name, 64 pt) on the map; compact (face only, 48 pt) on inner screens, where the name
 * stays in the spoken label. It is a presentational wrapper: the screen passes the learner's face (the existing
 * `Portrait`) and opens the existing "Who is playing?" sheet from `onPress`.
 */
export function ProfilePill({ name, avatar, compact, onPress, label = `Who is playing: ${name}. Switch learner` }: {
  name: string;
  avatar: React.ReactNode;
  compact?: boolean;
  onPress: () => void;
  label?: string;
}) {
  return (
    <PressTarget
      testID="profile-pill"
      target={compact ? "adult" : "child"}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.pill, compact && styles.compact]}
    >
      {avatar}
      {!compact && <Text variant="body" numberOfLines={1} style={styles.name}>{name}</Text>}
    </PressTarget>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space.sm,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.lagoonSoft,
    maxWidth: "100%",
  },
  compact: { paddingHorizontal: theme.space.xs },
  name: { flexShrink: 1, fontWeight: "700" },
});
