

import React from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { GameState } from "../../games";

import { row, col } from "../../games/checkers";

import { PressableScale } from "../../components/ui";
import { Scoreboard } from "../../components/Match";

export type Sound = (key: string) => void;
export type Props<S extends GameState> = {
  state: S;
  commit: (next: S) => void;
  width: number;
  sound: Sound;
  help: boolean;
  active: boolean;
};
export const coords = (i: number) => `${String.fromCharCode(65 + col(i))}${8 - row(i)}`;
export function Cell({
  label,
  onPress,
  children,
  style,
  disabled = false,
  selected = false,
}: {
  label: string;
  onPress: () => void;
  children?: React.ReactNode;
  style?: object;
  disabled?: boolean;
  selected?: boolean;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={(event) => {
        // A pointer-selected cell may disable itself before the browser emits blur.
        // Clear that pointer focus first; keyboard activation keeps its focus ring.
        if (Platform.OS === "web" && (event.nativeEvent as unknown as { detail?: number }).detail) {
          (event.currentTarget as unknown as { blur?: () => void }).blur?.();
        }
        onPress();
      }}
      style={[S.cell, style]}
    >
      {children}
    </PressableScale>
  );
}
export function BoardArea({ children }: { children: React.ReactNode }) {
  return <View style={{ alignItems: "center", gap: 10 }}>{children}</View>;
}
/** Physical board stays left in wide landscape; decisions stay within easy reach on the right. */
export function BoardLayout({ children, clueFirst = false }: { children: React.ReactNode; clueFirst?: boolean }) {
  const { width, height } = useWindowDimensions(),
    wide = width >= 900 && width > height;
  const items = React.Children.toArray(children),
    board = items.filter((item) => React.isValidElement(item) && item.type === BoardArea),
    rest = items.filter((item) => !board.includes(item));
  const scores: React.ReactNode[] = [];
  const landscapeBoard = board.map((item) => {
    const area = item as React.ReactElement<{ children: React.ReactNode }>;
    const pieces = React.Children.toArray(area.props.children);
    scores.push(...pieces.filter((piece) => React.isValidElement(piece) && piece.type === Scoreboard));
    return React.cloneElement(
      area,
      {},
      pieces.filter((piece) => !(React.isValidElement(piece) && piece.type === Scoreboard))
    );
  });
  return wide ? (
    <View style={{ flexDirection: "row", gap: 24, paddingHorizontal: 12, alignItems: "flex-start" }}>
      <View style={{ flex: 1.35, minWidth: 0 }}>{landscapeBoard}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        {scores}
        {rest}
      </View>
    </View>
  ) : (
    <View style={{ gap: 4 }}>
      {clueFirst && rest[0]}
      {board}
      {clueFirst ? rest.slice(1) : rest}
    </View>
  );
}
export const S = StyleSheet.create({
  cell: { alignItems: "center", justifyContent: "center" },
  tic: {
    alignSelf: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "#FFF6E5",
    borderWidth: 1,
    borderColor: "#E8D8BE",
    padding: 12,
    borderRadius: 28,
  },
});
