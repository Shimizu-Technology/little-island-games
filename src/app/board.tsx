import { useStore } from "../state/Store";
import React from "react";
import { Redirect, useLocalSearchParams } from "expo-router";
import { isBoardId } from "../board";
import { BoardScreen } from "../board/Screen";
export default function BoardRoute() {
  const store = useStore();
  const { game } = useLocalSearchParams<{ game?: string }>();
  return isBoardId(game) ? <BoardScreen key={`${game}:${store.save.learning?.active ?? "family"}:${store.epoch}`} game={game} /> : <Redirect href="/" />;
}
