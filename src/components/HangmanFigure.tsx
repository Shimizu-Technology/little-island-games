import React from "react";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { C } from "./ui";

export function HangmanFigure({ mistakes, won }: { mistakes: number; won: boolean }) {
  const stroke = { stroke: C.ink, strokeWidth: 4, strokeLinecap: "round" as const, fill: "none" };
  return (
    <Svg width={130} height={142} viewBox="0 0 130 142" accessibilityElementsHidden>
      <Path d="M10 132H82M25 131V12H89V28M25 31L44 12" {...stroke} stroke="#A99774" />
      {(mistakes > 0 || won) && <Circle cx="89" cy="43" r="14" {...stroke} stroke={won ? C.teal : C.ink} />}
      {(mistakes > 1 || won) && <Line x1="89" y1="57" x2="89" y2="94" {...stroke} />}
      {(mistakes > 2 || won) && <Line x1="89" y1="66" x2={won ? 63 : 69} y2={won ? 48 : 83} {...stroke} />}
      {(mistakes > 3 || won) && <Line x1="89" y1="66" x2="110" y2={won ? 48 : 83} {...stroke} />}
      {(mistakes > 4 || won) && <Line x1="89" y1="94" x2="72" y2="119" {...stroke} />}
      {(mistakes > 5 || won) && <Line x1="89" y1="94" x2="105" y2="119" {...stroke} />}
      {won && <Path d="M83 45Q89 52 95 45" {...stroke} strokeWidth={2} />}
    </Svg>
  );
}
