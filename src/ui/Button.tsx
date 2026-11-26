import React from "react";
import { StyleSheet } from "react-native";
import { PressTarget } from "./PressTarget";
import type { PressTargetProps } from "./PressTarget";
import { Text } from "./Text";
import { theme } from "./theme";

/** Primary: the one coral action. Secondary: soft lagoon pill. Quiet: lagoon text only. */
export const fills = { primary: theme.colors.coral, secondary: theme.colors.lagoonSoft, quiet: "transparent" } as const;
export type ButtonVariant = keyof typeof fills;

type Props = Omit<PressTargetProps, "children" | "accessibilityLabel"> & {
  label: string;
  variant?: ButtonVariant;
  accessibilityLabel?: string;
  /** Stretch to the row, as the start sheet's Play does. */
  fill?: boolean;
};

/** Pill button. Text is ink on coral and on the soft pill, never white; the quiet button reads in lagoon. */
export function Button({ label, variant = "primary", target = "child", fill, style, accessibilityLabel, ...props }: Props) {
  return (
    <PressTarget
      {...props}
      target={target}
      accessibilityLabel={accessibilityLabel ?? label}
      haptic={props.haptic ?? variant === "primary"}
      style={[styles.button, fill && styles.fill, { backgroundColor: fills[variant] }, style]}
    >
      <Text variant="body" tone={variant === "quiet" ? "lagoon" : "ink"} style={styles.label}>{label}</Text>
    </PressTarget>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.space.xl,
    paddingVertical: theme.space.md,
    borderRadius: theme.radius.full,
  },
  fill: { alignSelf: "stretch" },
  label: { textAlign: "center", fontWeight: "800" },
});
