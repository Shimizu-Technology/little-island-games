import React from "react";
import { View, type StyleProp, type TextStyle, type LayoutChangeEvent, type ViewStyle } from "react-native";
import { Text } from "../components/Text";

/** Wrap at spaces only. A single long word fits its chip instead of splitting. */
export function WordLabel({ children, style, textStyle, onWordLayout }: {
  children: string;
  onWordLayout?: (event: LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View accessible accessibilityLabel={children} style={[
      { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", columnGap: 4, maxWidth: "100%" }, style,
    ]}>
      {children.split(/\s+/).map((word, index) => (
        <Text key={index} onLayout={onWordLayout} accessible={false} numberOfLines={1} adjustsFontSizeToFit
          style={[textStyle, { maxWidth: "100%", flexShrink: 1 }]}>{word}</Text>
      ))}
    </View>
  );
}
