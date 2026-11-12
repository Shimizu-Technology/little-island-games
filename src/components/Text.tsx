import React, { createContext, forwardRef, useContext } from "react";
import { Text as NativeText, StyleSheet, TextProps, TextStyle, useWindowDimensions } from "react-native";

const LayoutScale = createContext(1);
export function TextLayoutProvider({ children }: { children: React.ReactNode }) {
  const { fontScale } = useWindowDimensions();
  return <LayoutScale.Provider value={fontScale}>{children}</LayoutScale.Provider>;
}
/** React Native's default text size when a style names none. */
const DEFAULT_SIZE = 14;
/**
 * React Native's native text measure cache (TextMeasureCache.h) compares font size, the system text multiplier, letter
 * spacing and line height, but not `maxFontSizeMultiplier`. The same words capped at 1.5x in landscape and 2x in
 * portrait share one cached measurement, so after a rotation the 2x text is drawn into the 1.5x box and clipped
 * ("Follow the arr"). When a cap is below the current text scale, plain text is therefore drawn at its capped size
 * explicitly, which gives each cap its own cache entry. Text with nested text elements keeps the native cap, so a child
 * never loses its own scaling. Below the cap nothing changes.
 */
export function cappedTextProps(props: TextProps, fontScale: number): TextProps {
  const max = props.maxFontSizeMultiplier;
  if (props.allowFontScaling === false || max == null || !(max >= 1) || fontScale <= max) return props;
  if (React.Children.toArray(props.children).some(child => typeof child !== "string" && typeof child !== "number")) return props;
  const style = (StyleSheet.flatten(props.style) ?? {}) as TextStyle;
  const sized: TextStyle = { ...style, fontSize: (style.fontSize ?? DEFAULT_SIZE) * max };
  if (style.lineHeight != null) sized.lineHeight = style.lineHeight * max;
  return { ...props, style: sized, allowFontScaling: false, maxFontSizeMultiplier: undefined };
}
/** Refresh native text measurement after a live Dynamic Type change without remounting routes or game state. */
export const Text = forwardRef<NativeText, TextProps>(function Text(props, ref) {
  const fontScale = useContext(LayoutScale);
  return <NativeText key={fontScale} ref={ref} {...cappedTextProps(props, fontScale)} />;
});
