import React from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { SceneEntity } from "../scene/types";
import { EntityArt, artFrame } from "./EntityArt";
/** The actual item peeks out of an open basket, rather than an abstract tray glyph. */
export function BasketPicture({ entity, reduced = true }: { entity: SceneEntity; reduced?: boolean }) {
  const frame = artFrame(entity), scale = Math.min(32 / frame.width, 34 / frame.height);
  return <View pointerEvents="none" style={{ width: 52, height: 56 }}>
    <View style={{ position: "absolute", left: 26 - frame.width * scale / 2, top: 2,
      transform: [{ scale }], transformOrigin: "left top" }}>
      <EntityArt entity={entity} reduced={reduced} />
    </View>
    <Svg width={52} height={56} viewBox="0 0 52 56" style={{ position: "absolute" }} accessible={false}>
      <Path d="M5 30Q26 22 47 30L42 50Q26 55 10 50Z" fill="#D7AE74" stroke="#385451" strokeWidth={2} />
      <Path d="M5 30Q26 39 47 30M15 38L17 49M26 40V51M37 38L35 49M11 44H42" fill="none" stroke="#FFF1D3" strokeWidth={2} />
    </Svg>
  </View>;
}
