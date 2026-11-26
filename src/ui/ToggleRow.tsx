import React from "react";
import { Pressable, StyleSheet, Switch, View, useWindowDimensions } from "react-native";
import { LARGE_TEXT } from "../components/wordFit";
import { Icon } from "./Icon";
import type { IconGlyph } from "./Icon";
import { Text } from "./Text";
import { theme } from "./theme";

/**
 * Friendly 64 pt toggle row: icon, label, switch. The whole row is the target and reads as one switch to VoiceOver.
 * At accessibility text sizes the switch moves below the words so they keep the line.
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
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Switch value={value} trackColor={{ true: theme.colors.lagoon, false: theme.colors.track }} thumbColor={theme.colors.surface} />
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
});
