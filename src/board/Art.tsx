import React from "react";
import { View } from "react-native";
import Svg, { Circle, Ellipse, G, Line, Path } from "react-native-svg";
import { GameHallArt, hasGameHallArt, IllustratedArt, PUZZLE_TILE_ART } from "../art/illustrated";
import { BoardId } from "./index";
/** Original, simple shapes remain distinct in monochrome: round coconut / pointed leaf. */
export function Piece({
  kind,
  size = 32,
  seat = 0,
}: {
  kind: "coconut" | "shell" | "canoe" | "urchin" | "pearl" | "flag" | "ripple";
  size?: number;
  seat?: number;
}) {
  const color = seat === 0 ? "#805538" : "#286B69";
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessible={false}>
      {kind === "coconut" &&
        (seat === 0 ? (
          <G>
            <Circle cx="24" cy="25" r="18" fill={color} />
            <Path d="M12 17 Q20 7 31 12" stroke="#C89B65" strokeWidth="3" fill="none" strokeLinecap="round" />
            <Circle cx="28" cy="27" r="2.2" fill="#EEDABB" />
            <Circle cx="20" cy="28" r="2.2" fill="#EEDABB" />
            <Circle cx="24" cy="34" r="2.2" fill="#EEDABB" />
          </G>
        ) : (
          <G>
            <Path d="M24 3 Q48 23 24 45 Q0 23 24 3" fill={color} />
            <Path d="M24 11 L24 37 M15 20 L24 26 L34 18" stroke="#BEE2D4" strokeWidth="2.5" fill="none" />
          </G>
        ))}
      {kind === "shell" && (
        <G>
          <Path
            d="M9 34 Q1 14 12 12 Q17 1 24 9 Q34 2 38 13 Q49 21 38 34 L29 41 L19 41 Z"
            fill="#E6BC73"
            stroke="#805538"
            strokeWidth="2"
          />
          <Path d="M24 36 L12 17 M24 36 L23 12 M24 36 L35 17" stroke="#A46D37" strokeWidth="2" />
        </G>
      )}
      {kind === "canoe" && (
        <G>
          <Path d="M3 24 Q24 44 45 24 L39 35 Q24 45 9 35 Z" fill="#A66A42" stroke="#633E2C" strokeWidth="2" />
          <Path d="M24 5 L24 27 L39 25 Z" fill="#F0CB7A" stroke="#805538" strokeWidth="2" />
          <Path d="M5 43 Q15 37 24 43 Q34 47 44 41" fill="none" stroke="#528E9E" strokeWidth="2" />
        </G>
      )}
      {kind === "urchin" && (
        <G>
          {Array.from({ length: 12 }, (_, i) => (
            <Line
              key={i}
              x1="24"
              y1="24"
              x2={24 + 21 * Math.cos((i * Math.PI) / 6)}
              y2={24 + 21 * Math.sin((i * Math.PI) / 6)}
              stroke="#675078"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ))}
          <Circle cx="24" cy="24" r="12" fill="#675078" />
          <Circle cx="20" cy="22" r="2" fill="#FFF" />
          <Circle cx="28" cy="22" r="2" fill="#FFF" />
        </G>
      )}
      {kind === "pearl" && (
        <G>
          <Circle cx="24" cy="24" r="15" fill="#FCF8E9" stroke="#9A925F" strokeWidth="2" />
          <Ellipse cx="19" cy="18" rx="5" ry="3" fill="#FFF" />
        </G>
      )}
      {kind === "flag" && (
        <G>
          <Path
            d="M14 42 L14 6 L38 10 L32 23 L14 20"
            fill="#D78B50"
            stroke="#70482E"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <Path d="M7 43 L27 43" stroke="#70482E" strokeWidth="3" strokeLinecap="round" />
        </G>
      )}
      {kind === "ripple" && (
        <G>
          <Ellipse cx="24" cy="27" rx="19" ry="9" stroke="#538896" strokeWidth="2" fill="none" />
          <Ellipse cx="24" cy="26" rx="10" ry="4" stroke="#538896" strokeWidth="2" fill="none" />
        </G>
      )}
    </Svg>
  );
}
export function BoardArt({ game, size = 96 }: { game: BoardId; size?: number }) {
  if (hasGameHallArt(game)) {
    return (
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <GameHallArt id={game} size={size} />
      </View>
    );
  }
  const reefSource = PUZZLE_TILE_ART[game];
  if (reefSource) {
    return (
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <IllustratedArt source={reefSource} size={size} />
      </View>
    );
  }
  return null;
}
