import React, { memo } from "react";
import { Image, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { OutfitId } from "../../progress";
import { illustrated, railActorFrame } from "../rail-parade/illustrated";

export const RAIL_FEET = 0.92;
const outfits = { sunhat: "#FFD06A", explorer: "#A3F5E0", starlight: "#E3BEFE" } as const;

/** Unwrapped illustrated rail/chick figure so animated segments can share one padded Android canvas. */
export const RailFigure = memo(function RailFigure({
  size,
  chick,
  outfit = "island",
  left = false,
  shadow = true,
  testID,
}: {
  size: number;
  chick: boolean;
  outfit?: OutfitId;
  left?: boolean;
  shadow?: boolean;
  testID?: string;
}) {
  const art = chick ? illustrated.chick : illustrated.rail;
  const accent = !chick && outfit !== "island" ? outfits[outfit] : undefined;
  return (
    <>
      {shadow && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: size * (chick ? 0.17 : 0.12),
            top: size * (RAIL_FEET - 0.1),
            width: size * (chick ? 0.66 : 0.76),
            height: size * 0.18,
            borderRadius: size,
            backgroundColor: "#1431234A",
          }}
        />
      )}
      <Image
        testID={testID ?? (chick ? "rail-chick-art" : "rail-rilla-art")}
        accessible={false}
        fadeDuration={0}
        source={art.source()}
        resizeMode="contain"
        style={railActorFrame(art, size, size, size * RAIL_FEET, left)}
      />
      {accent && (
        <View testID={`rail-outfit-${outfit}`} style={{ position: "absolute", left: size * 0.6, top: size * 0.56 }}>
          <Svg width={size * 0.24} height={size * 0.24} viewBox="0 0 24 24" accessible={false}>
            <Circle cx={12} cy={12} r={10} fill={accent} stroke="#6E473A" strokeWidth={2} />
            <Path
              d={
                outfit === "sunhat"
                  ? "M6 14H18M8 13Q8 5 12 6Q16 5 16 13"
                  : outfit === "explorer"
                    ? "M12 5L17 12L12 19L7 12Z"
                    : "M12 5L14 10L19 12L14 14L12 19L10 14L5 12L10 10Z"
              }
              fill="none"
              stroke="#654649"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      )}
    </>
  );
});

/** Illustrated Guam ko'ko' rail or baby chick (faces right by default; flip horizontally with left). */
export const RailArt = memo(function RailArt({
  size,
  chick,
  outfit = "island",
  left = false,
  shadow = true,
  testID,
}: {
  size: number;
  chick: boolean;
  outfit?: OutfitId;
  left?: boolean;
  shadow?: boolean;
  testID?: string;
}) {
  return (
    <View pointerEvents="none" style={{ width: size, height: size }}>
      <RailFigure size={size} chick={chick} outfit={outfit} left={left} shadow={shadow} testID={testID} />
    </View>
  );
});

/** Illustrated tropical fern hedge obstacle grounded on its garden cell. */
export const RailFern = memo(function RailFern({ size }: { size: number }) {
  const art = illustrated.fern;
  return (
    <View pointerEvents="none" style={{ width: size, height: size }}>
      <View
        style={{
          position: "absolute",
          left: size * 0.1,
          top: size * 0.8,
          width: size * 0.8,
          height: size * 0.2,
          borderRadius: size,
          backgroundColor: "#1430224F",
        }}
      />
      <Image
        testID="rail-fern-art"
        accessible={false}
        fadeDuration={0}
        source={art.source()}
        resizeMode="contain"
        style={railActorFrame(art, size, size, size * 0.94)}
      />
    </View>
  );
});
