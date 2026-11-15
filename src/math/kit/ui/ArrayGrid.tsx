import React from "react";
import { View } from "react-native";
import { C } from "../../../components/ui";

export type ArrayGridProps = { cell: number; rows: number; cols: number; label: string; tone?: string };
/** Equal rows of dots: the picture behind "groups of" and area. Shared with the Times and Fraction games. */
export function ArrayGrid({ cell, rows, cols, label, tone = "#F2CA85" }: ArrayGridProps) {
  return <View accessible accessibilityLabel={label} style={{ alignSelf: "center", gap: 3 }}>
    {Array.from({ length: rows }, (_, r) => <View key={r} style={{ flexDirection: "row", gap: 3 }}>
      {Array.from({ length: cols }, (_, c) => <View key={c} style={{ width: cell, height: cell, borderRadius: cell / 2, backgroundColor: tone, borderWidth: 2, borderColor: C.ink }} />)}
    </View>)}
  </View>;
}
