import React from "react";
import { View } from "react-native";
import { Copy } from "../../../components/ui";
import type { BoardProps } from "../../types";
import { LearnArt } from "../../LearnArt";
// Placeholder: the Håfa Adai Island worker replaces Board and Art.
export function Board(_: BoardProps<unknown>) {
  return (
    <View style={{ padding: 24, alignItems: "center" }}>
      <Copy>Håfa Adai Island is being built.</Copy>
    </View>
  );
}
export function Art({ size }: { size: number }) {
  return <LearnArt island="reading" size={size} />;
}
