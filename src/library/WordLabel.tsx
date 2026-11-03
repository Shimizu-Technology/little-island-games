import React from "react";
import { View, type StyleProp, type TextStyle, type LayoutChangeEvent, type ViewStyle } from "react-native";
import { Text } from "../components/Text";

/** Wrap at spaces only. A single long word fits its chip instead of splitting. */
export function WordLabel({ children, style, textStyle, onWordLayout, maxFontSizeMultiplier = 1.4 }: {
  children: string;
  /** Tile labels are chrome: cap Dynamic Type so a tile never outgrows the screen. */
  maxFontSizeMultiplier?: number;
  onWordLayout?: (event: LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View accessible accessibilityLabel={children} style={[
      { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", columnGap: 4, maxWidth: "100%" }, style,
    ]}>
      {children.split(/\s+/).map((word, index) => (
        <Text key={index} onLayout={onWordLayout} accessible={false} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={maxFontSizeMultiplier}
          style={[textStyle, { maxWidth: "100%", flexShrink: 1 }]}>{word}</Text>
      ))}
    </View>
  );
}
