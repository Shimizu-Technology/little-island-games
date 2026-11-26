import React from "react";
import { View } from "react-native";
import type { Icon as PhosphorIcon } from "phosphor-react-native";
import { theme } from "./theme";

export type IconGlyph = PhosphorIcon;
type Tone = "ink" | "muted" | "lagoon" | "surface";

/**
 * The only path to Phosphor. Bold weight by default, `fill` for selected or earned states.
 * Decorative by default (hidden from VoiceOver): the control that holds it carries the label.
 */
export function Icon({ glyph: Glyph, tone = "ink", size = theme.icon.size, weight = theme.icon.weight, accessibilityLabel }: {
  glyph: IconGlyph;
  tone?: Tone;
  size?: number;
  weight?: "bold" | "fill";
  /** Give a label only when the icon stands alone. */
  accessibilityLabel?: string;
}) {
  const labelled = accessibilityLabel != null;
  return (
    <View
      accessible={labelled}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!labelled}
      importantForAccessibility={labelled ? "yes" : "no-hide-descendants"}
    >
      <Glyph color={theme.colors[tone]} size={size} weight={weight} />
    </View>
  );
}
