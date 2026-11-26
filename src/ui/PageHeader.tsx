import React from "react";
import { StyleSheet, View } from "react-native";
import { IconButton } from "./IconButton";
import { Text } from "./Text";
import { ArrowLeft, X } from "./icons";
import { theme } from "./theme";

/**
 * Clean top bar: `←` (or `✕` for a screen that opens over another), the title, and an optional right slot, usually a
 * compact `ProfilePill`. The title is the screen's heading for VoiceOver and gives up width to the slot, never the
 * other way round.
 */
export function PageHeader({ title, onBack, backLabel, close, right }: {
  title: string;
  onBack: () => void;
  /** Defaults to "Back", or "Close" when `close` is set. */
  backLabel?: string;
  /** Show ✕ instead of ←. */
  close?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <View testID="page-header" style={styles.row}>
      <IconButton glyph={close ? X : ArrowLeft} accessibilityLabel={backLabel ?? (close ? "Close" : "Back")} onPress={onBack} />
      <Text variant="section" accessibilityRole="header" numberOfLines={1} style={styles.title}>{title}</Text>
      {right != null && <View style={styles.right}>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: theme.hud.height, flexDirection: "row", alignItems: "center", gap: theme.space.md, paddingHorizontal: theme.space.sm },
  title: { flex: 1 },
  right: { flexShrink: 0 },
});
