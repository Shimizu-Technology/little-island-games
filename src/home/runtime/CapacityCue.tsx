import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

export const CAPACITY_MESSAGE = "Put something away to make room.";
export const CAPACITY_CUE_MS = 3200;
const ink = "#284F4B";

/** A full room, drawn: a crowded room and a curved arrow into the basket. */
export function FullRoomPicture({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.7} viewBox="0 0 64 45" accessible={false}>
      <Path d="M3 17L19 5L35 17V41H3Z" fill="#FFF8E9" stroke={ink} strokeWidth={2.4} strokeLinejoin="round" />
      <Rect x={7} y={29} width={9} height={9} rx={2} fill="#E8B07A" stroke={ink} strokeWidth={1.5} />
      <Circle cx={23} cy={34} r={4.4} fill="#F08069" stroke={ink} strokeWidth={1.5} />
      <Path d="M27 39q2-12 5-6q-1-6 0-12" fill="none" stroke="#5E9A6B" strokeWidth={2.4} strokeLinecap="round" />
      <Rect x={11} y={19} width={10} height={8} rx={2} fill="#8CC4E8" stroke={ink} strokeWidth={1.5} />
      <Path d="M24 13Q42 1 49 18" fill="none" stroke="#477D60" strokeWidth={2.6} strokeLinecap="round" />
      <Path d="M44 16l5 3 2-6" fill="none" stroke="#477D60" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M40 26H62L58 42H44Z" fill="#E5C48F" stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
      <Path d="M43 31H59M45 36H57M48 27V41M53 27V41" stroke="#B8915E" strokeWidth={1.4} />
      <Path d="M43 26Q51 15 59 26" fill="none" stroke={ink} strokeWidth={2} />
    </Svg>
  );
}
/** HM-18: a full room no longer refuses silently. The picture carries the meaning; the words are for grown-ups. */
export function CapacityCue({ bottom }: { bottom: number }) {
  return (
    <View
      testID="capacity-cue"
      pointerEvents="none"
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`This room is full. ${CAPACITY_MESSAGE}`}
      style={{
        position: "absolute",
        bottom,
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: "#FFF8E9",
        borderWidth: 2,
        borderColor: "#D7C29A",
        zIndex: 45,
      }}
    >
      <FullRoomPicture />
      <Text maxFontSizeMultiplier={1.4} style={{ color: ink, fontSize: 15, fontWeight: "600", maxWidth: 170 }}>
        {CAPACITY_MESSAGE}
      </Text>
    </View>
  );
}
