import React from "react";
import { StyleSheet } from "react-native";
import { Icon } from "./Icon";
import type { IconGlyph } from "./Icon";
import { PressTarget } from "./PressTarget";
import type { PressTargetProps } from "./PressTarget";
import { theme } from "./theme";

type Props = Omit<PressTargetProps, "children" | "accessibilityLabel"> & {
  glyph: IconGlyph;
  /** Required: an icon alone says nothing to VoiceOver. */
  accessibilityLabel: string;
  /** `adult` 48 pt (default) or `child` 64 pt. */
  target?: "adult" | "child";
  tone?: "ink" | "lagoon";
  filled?: boolean;
};

/** Round icon button, 48 to 64 pt. */
export function IconButton({ glyph, tone = "ink", filled, target = "adult", style, ...props }: Props) {
  return (
    <PressTarget {...props} target={target} style={[styles.button, { width: theme.target[target], height: theme.target[target] }, style]}>
      <Icon glyph={glyph} tone={tone} weight={filled ? "fill" : "bold"} size={target === "child" ? 32 : theme.icon.size} />
    </PressTarget>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: "center", justifyContent: "center", borderRadius: theme.radius.full },
});
