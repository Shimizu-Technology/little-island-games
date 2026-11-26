import React from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { LARGE_TEXT } from "../components/wordFit";
import { Icon } from "./Icon";
import type { IconGlyph } from "./Icon";
import { Text } from "./Text";
import { theme } from "./theme";

/**
 * Friendly 64 pt toggle row: icon, label, switch. The whole row is the one switch: the track and thumb are plain
 * decorative views, so there is a single keyboard stop and a single VoiceOver element. The off track has a muted
 * outline so it stays visible on white. At accessibility text sizes the switch moves below the words.
 */
export function ToggleRow({ glyph, label, value, onChange, disabled }: {
  glyph?: IconGlyph;
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const stacked = useWindowDimensions().fontScale >= LARGE_TEXT;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={[styles.row, stacked && styles.stacked, disabled && { opacity: theme.opacity.disabled }]}
    >
      <View style={styles.words}>
        {glyph && <Icon glyph={glyph} tone="lagoon" />}
        <Text variant="body" style={styles.label}>{label}</Text>
      </View>
      <View
        testID="toggle-track"
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[styles.track, value ? styles.trackOn : styles.trackOff, { alignItems: value ? "flex-end" : "flex-start" }]}
      >
        <View testID="toggle-thumb" style={[styles.thumb, !value && styles.thumbOff]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: theme.target.child,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.space.md,
    paddingVertical: theme.space.sm,
  },
  stacked: { flexDirection: "column", alignItems: "flex-start" },
  words: { flex: 1, flexDirection: "row", alignItems: "center", gap: theme.space.md },
  label: { flex: 1, fontWeight: "700" },
  track: { width: 52, height: 32, borderRadius: theme.radius.full, borderWidth: 2, justifyContent: "center", paddingHorizontal: 2 },
  trackOn: { backgroundColor: theme.colors.lagoon, borderColor: theme.colors.lagoon },
  trackOff: { backgroundColor: theme.colors.track, borderColor: theme.colors.muted },
  thumb: { width: 24, height: 24, borderRadius: theme.radius.full, backgroundColor: theme.colors.surface },
  thumbOff: { backgroundColor: theme.colors.muted },
});
