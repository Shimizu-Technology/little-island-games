import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

export const CAPACITY_MESSAGE = "Put something away to make room.";
export const CAPACITY_CUE_MS = 3200;
const ink = "#284F4B";

/** A full room, drawn: a crowded room and a curved arrow into the basket. */
export function FullRoomPicture({ size = 96 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.75} viewBox="0 -3 64 48" accessible={false}>
      <Path d="M3 17L19 5L35 17V41H3Z" fill="#FFF8E9" stroke={ink} strokeWidth={2.4} strokeLinejoin="round" />
      {/* Packed to the roof: three rows of things and one that no longer fits through the wall. */}
      <Rect x={5.5} y={32} width={7} height={7} rx={1.5} fill="#E8B07A" stroke={ink} strokeWidth={1.2} />
      <Circle cx={16.5} cy={35.5} r={3.6} fill="#F08069" stroke={ink} strokeWidth={1.2} />
      <Rect x={21} y={32} width={6} height={7} rx={1.5} fill="#8CC4E8" stroke={ink} strokeWidth={1.2} />
      <Rect x={28} y={31} width={5.5} height={8} rx={1.5} fill="#F2D27A" stroke={ink} strokeWidth={1.2} />
      <Rect x={6} y={24} width={8} height={7} rx={1.5} fill="#B9D98C" stroke={ink} strokeWidth={1.2} />
      <Circle cx={18.5} cy={27.5} r={3.4} fill="#F7B6C8" stroke={ink} strokeWidth={1.2} />
      <Rect x={23} y={23.5} width={9} height={7.5} rx={1.5} fill="#E8B07A" stroke={ink} strokeWidth={1.2} />
      <Rect x={10} y={16} width={7} height={7} rx={1.5} fill="#8CC4E8" stroke={ink} strokeWidth={1.2} />
      <Circle cx={22} cy={19.5} r={3.3} fill="#F2D27A" stroke={ink} strokeWidth={1.2} />
      <Rect x={15.5} y={9.5} width={7} height={6} rx={1.5} fill="#F08069" stroke={ink} strokeWidth={1.2} />
      <Rect x={31} y={19} width={7} height={6.5} rx={1.5} fill="#B9D98C" stroke={ink} strokeWidth={1.2} transform="rotate(18 34.5 22)" />
      {/* Spilling over the roof: there is no room left inside. */}
      <Rect x={9} y={2} width={6.5} height={6} rx={1.5} fill="#F2D27A" stroke={ink} strokeWidth={1.2} transform="rotate(-20 12 5)" />
      <Circle cx={25} cy={4.5} r={3.2} fill="#8CC4E8" stroke={ink} strokeWidth={1.2} />
      <Path d="M17 3.5l1-3M20.5 4l2-2.5M13.5 1.5l-1.5-1.5" stroke={ink} strokeWidth={1} strokeLinecap="round" />
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
