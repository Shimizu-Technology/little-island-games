import React, { createContext, forwardRef, useContext } from "react";
import { Text as NativeText, StyleSheet, TextProps, TextStyle, useWindowDimensions } from "react-native";
import { wordFitMultiplier } from "./wordFit";

const LayoutScale = createContext(1);
export function TextLayoutProvider({ children }: { children: React.ReactNode }) {
  const { fontScale } = useWindowDimensions();
  return <LayoutScale.Provider value={fontScale}>{children}</LayoutScale.Provider>;
}
/**
 * A text ceiling for a region, such as a School game board at accessibility sizes: text that names no cap of its own
 * stops at `ceiling`, or earlier where its longest word would no longer fit `width`, so prompts, answers and results
 * stay large without filling the screen or breaking a word. Text with its own cap keeps it. Absent (null), nothing changes.
 */
export const TextFit = createContext<{ width: number; ceiling: number } | null>(null);
/** React Native's default text size when a style names none. */
const DEFAULT_SIZE = 14;
const plainText = (children: React.ReactNode): string => React.Children.toArray(children).map(child =>
  typeof child === "string" || typeof child === "number" ? String(child)
    : React.isValidElement(child) ? plainText((child.props as { children?: React.ReactNode }).children) : "").join("");
/** The region's ceiling for text without a cap of its own (see `TextFit`). */
export function fittedTextProps(props: TextProps, fit: { width: number; ceiling: number } | null): TextProps {
  if (!fit || props.maxFontSizeMultiplier != null || props.allowFontScaling === false) return props;
  const size = (StyleSheet.flatten(props.style) as TextStyle | undefined)?.fontSize ?? DEFAULT_SIZE;
  return { ...props, maxFontSizeMultiplier: wordFitMultiplier(plainText(props.children), size, fit.width, fit.ceiling) };
}
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
  const fontScale = useContext(LayoutScale), fit = useContext(TextFit);
  return <NativeText key={fontScale} ref={ref} {...cappedTextProps(fittedTextProps(props, fit), fontScale)} />;
});
