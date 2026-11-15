import React, { useEffect, useState } from "react";
import { Animated, View } from "react-native";
import Svg, { Ellipse, Path } from "react-native-svg";
import { C } from "../../../components/ui";
import { easeOut, nativeDriver, useReducedMotion } from "../../../components/motion";
import { wordFitMultiplier } from "../../../components/wordFit";
import { ObjectGlyph } from "../../art/Objects";
import { WORDS_PER_ROUND } from "./engine";

export const ink = C.ink;
export const glow = "#F9EDC9";

/** Boat on the water, sailing one step toward the island for each finished word. */
export function Voyage({ step, width, total = WORDS_PER_ROUND }: { step: number; width: number; total?: number }) {
  const reduced = useReducedMotion();
  const w = Math.min(width, 380),
    room = w - 92;
  const [x] = useState(() => new Animated.Value((step / total) * room));
  useEffect(() => {
    const to = (step / total) * room;
    if (reduced) x.setValue(to);
    else Animated.timing(x, { toValue: to, duration: 700, easing: easeOut, useNativeDriver: nativeDriver }).start();
  }, [step, room, reduced, x, total]);
  return (
    <View
      accessible
      accessibilityLabel={`The boat has sailed ${step} of ${total} steps to the island`}
      style={{ width: w, height: 46 }}
    >
      <Svg width={w} height={46} viewBox={`0 0 ${w} 46`} style={{ position: "absolute" }}>
        <Path
          d={`M4 38 Q20 32 36 38 T68 38 T100 38 T132 38 T164 38 T196 38 T228 38 T260 38 T292 38 T324 38 T356 38 T388 38`}
          fill="none"
          stroke="#91C6D3"
          strokeWidth={3}
        />
        <Ellipse cx={w - 26} cy={38} rx={24} ry={7} fill="#E6D3AC" stroke={ink} strokeWidth={2} />
        <Path
          d={`M${w - 24} 35 L${w - 24} 12 M${w - 24} 12 Q${w - 42} 6 ${w - 38} 18 M${w - 24} 12 Q${w - 8} 5 ${w - 8} 18`}
          stroke={C.teal}
          fill="none"
          strokeWidth={3}
          strokeLinecap="round"
        />
      </Svg>
      <Animated.View style={{ position: "absolute", left: 0, top: 4, transform: [{ translateX: x }] }}>
        <Svg width={44} height={38} viewBox="0 0 100 100">
          <ObjectGlyph name="boat" color="coral" />
        </Svg>
      </Animated.View>
    </View>
  );
}


/** Letters in a fixed box stop growing where they fit its width and height (never below the default size). */
export const letterFit = (text: string, size: number, width: number, height: number) => Math.max(1, Math.min(wordFitMultiplier(text, size, width, 2), Math.floor(height * 100) / 100));
