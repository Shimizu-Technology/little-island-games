import React from "react";
import { Pressable, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { C } from "../../../components/ui";

export type BlocksProps = {
  /** Side of one ones-cube. A tens-rod is one cube wide and ten tall. */
  unit: number;
  tens: number;
  ones: number;
  /** Cubes drawn pale: the ones still to be joined or traded in. */
  ghostOnes?: number;
  /** The last `struckOnes` cubes are crossed out: taken away. */
  struckOnes?: number;
  /** The last `struckTens` rods are crossed out. */
  struckTens?: number;
  label: string;
  /** Touch a rod to open it, or the ones tray to make a ten, when the step asks for a trade. */
  onTradeOpen?: () => void;
  onTradeMake?: () => void;
  tone?: "teal" | "gold";
};
const TEN = "#7FC0AE", ONE = "#F2CA85";

function Rod({ u, struck }: { u: number; struck?: boolean }) {
  const w = u + 2, h = u * 10 + 2;
  return <Svg width={w} height={h} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Rect x={1} y={1} width={u} height={u * 10} rx={3} fill={struck ? "#E9E5D3" : TEN} stroke={C.ink} strokeWidth={1.6} />
    {Array.from({ length: 9 }, (_, i) => <Rect key={i} x={1} y={1 + (i + 1) * u - 0.5} width={u} height={1} fill={C.ink} opacity={0.35} />)}
  </Svg>;
}
function Cube({ u, ghost, struck }: { u: number; ghost?: boolean; struck?: boolean }) {
  return <Svg width={u} height={u} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Rect x={1} y={1} width={u - 2} height={u - 2} rx={3} fill={ghost || struck ? "#E9E5D3" : ONE} stroke={ghost || struck ? "#B9B59F" : C.ink} strokeWidth={1.6} />
  </Svg>;
}
/** Tens as rods, ones as cubes in rows of five. Pure drawing; the board decides what a touch means. */
export function Blocks({ unit, tens, ones, ghostOnes = 0, struckOnes = 0, struckTens = 0, label, onTradeOpen, onTradeMake }: BlocksProps) {
  const shown = ones + ghostOnes, rows = Math.max(1, Math.ceil(shown / 5));
  const rods = <View style={{ flexDirection: "row", gap: 4, alignItems: "flex-end" }}>
    {Array.from({ length: tens }, (_, i) => <Rod key={i} u={unit} struck={i >= tens - struckTens} />)}
  </View>;
  const cubes = <View style={{ width: 5 * unit + 4, gap: 2 }}>
    {Array.from({ length: rows }, (_, r) => <View key={r} style={{ flexDirection: "row", gap: 0 }}>
      {Array.from({ length: 5 }, (_, c) => {
        const i = r * 5 + c;
        if (i >= shown) return <View key={c} style={{ width: unit, height: unit }} />;
        return <Cube key={c} u={unit} ghost={i >= ones} struck={i < ones && i >= ones - struckOnes} />;
      })}
    </View>)}
  </View>;
  return <View accessible accessibilityLabel={label} style={{ flexDirection: "row", gap: 14, alignItems: "flex-end", justifyContent: "center", minHeight: unit * 10 + 4 }}>
    {tens > 0 && (onTradeOpen
      ? <Pressable accessibilityRole="button" accessibilityLabel="Open a ten" onPress={onTradeOpen}>{rods}</Pressable>
      : rods)}
    {shown > 0 && (onTradeMake
      ? <Pressable accessibilityRole="button" accessibilityLabel="Make a ten" onPress={onTradeMake}>{cubes}</Pressable>
      : cubes)}
  </View>;
}
