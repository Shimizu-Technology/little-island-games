import React from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Copy, PressableScale } from "../components/ui";

/**
 * Reusable Warm Island Storybook speaker button for replaying spoken prompts or hints.
 * Built on PressableScale + Copy + inline SVG so it works cleanly in every board and test host.
 */
export function SpeakButton({
  onPress,
  disabled = false,
  label = "Hear prompt",
  text = "Hear it",
  size = "compact",
  testID,
}: {
  onPress: () => void;
  disabled?: boolean;
  label?: string;
  text?: string;
  size?: "compact" | "toddler";
  testID?: string;
}) {
  const big = size === "toddler";
  const iconSize = big ? 20 : 17;
  return (
    <PressableScale
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      {...({ maxFontSizeMultiplier: 1.5 } as Record<string, unknown>)}
      style={{
        minHeight: big ? 52 : 44,
        borderRadius: big ? 18 : 14,
        backgroundColor: "#FFFDF8",
        borderWidth: 1.5,
        borderBottomWidth: 3,
        borderColor: "#E8D8BE",
        paddingHorizontal: big ? 16 : 12,
        paddingVertical: big ? 10 : 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24">
          <Path
            d="M4 9.5H8.5L13.5 5.5V18.5L8.5 14.5H4V9.5Z"
            fill="#FF7A5C"
            stroke="#3D2B24"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <Path
            d="M16.5 9C17.8 10.3 17.8 13.7 16.5 15M19 6.8C21.3 9.4 21.3 14.6 19 17.2"
            fill="none"
            stroke="#3D2B24"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </Svg>
      </View>
      <Copy
        maxFontSizeMultiplier={1.5}
        style={{ color: "#3D2B24", fontWeight: "800", fontSize: big ? 16 : 14 }}
      >
        {text}
      </Copy>
    </PressableScale>
  );
}
