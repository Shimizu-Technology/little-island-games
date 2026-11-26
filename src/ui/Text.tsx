import React from "react";
import type { TextProps } from "react-native";
import { Text as FitText } from "../components/Text";
import { TITLE_MAX } from "../components/wordFit";
import { useNunitoLoaded } from "./fonts";
import { theme } from "./theme";
import type { TextVariant } from "./theme";

type Props = TextProps & { variant?: TextVariant; tone?: "ink" | "muted" | "lagoon" | "surface" };

/** Headings stop at 2x so a title never outgrows its row; reading text follows Dynamic Type all the way up. */
const ceiling: Partial<Record<TextVariant, number>> = { display: TITLE_MAX, title: TITLE_MAX, section: TITLE_MAX };

/**
 * Nunito text with Dynamic Type. Built on the shared fit Text, so region ceilings and word-fit still apply.
 * Falls back to the system font (same weight) until Nunito loads.
 */
export function Text({ variant = "body", tone = "ink", style, maxFontSizeMultiplier, ...props }: Props) {
  const loaded = useNunitoLoaded();
  const { fontSize, lineHeight, fontWeight } = theme.type[variant];
  const font = loaded ? { fontFamily: theme.fontFamily[fontWeight] } : { fontWeight };
  return (
    <FitText
      {...props}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? ceiling[variant]}
      style={[{ fontSize, lineHeight, color: theme.colors[tone], ...font }, style]}
    />
  );
}
