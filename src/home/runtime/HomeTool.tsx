import React from "react";
import { Pressable, Text as RNText } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { theme } from "../../ui/theme";

const ink = theme.colors.ink;
const toolStyle = {
  minWidth: 48,
  minHeight: 48,
  borderRadius: 24,
  backgroundColor: "#FFF8E9EE",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  paddingHorizontal: 10,
};

export function Tool({
  label,
  symbol,
  onPress,
  selected,
  disabled,
  large = false,
}: {
  label: string;
  symbol: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  /** HR-03: 64 pt in the grown-ups' larger-target mode. */
  large?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        toolStyle,
        // In the larger mode every button shows its shape, so a 64 pt target looks like one.
        large && { minWidth: 64, minHeight: 64, borderRadius: 32, backgroundColor: "#F1E6CF" },
        selected && { backgroundColor: "#D6E9C8" },
        { opacity: disabled ? 0.35 : pressed ? 0.65 : 1, transform: [{ scale: pressed && !disabled ? 0.94 : 1 }] },
      ]}
    >
      <RNText allowFontScaling={false} style={{ fontSize: large ? 30 : 25, color: ink }}>
        {symbol}
      </RNText>
    </Pressable>
  );
}

export function FriendsIcon() {
  return (
    <Svg width={34} height={34} viewBox="0 0 34 34" accessible={false}>
      <Circle cx={10} cy={10} r={6} fill="#E5BB98" stroke={ink} strokeWidth={1.5} />
      <Circle cx={24} cy={10} r={6} fill="#D4DDD2" stroke={ink} strokeWidth={1.5} />
      <Path
        d="M3 24Q10 16 16 24M18 24Q24 16 31 24M17 23v9m-4-4 4 4 4-4"
        fill="none"
        stroke={ink}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
