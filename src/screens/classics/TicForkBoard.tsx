import React from "react";
import { View } from "react-native";
import { Button, C, Copy } from "../../components/ui";
import { TicMark } from "../../components/Art";
import { ticTurn } from "../../games/tic";
import { Cell } from "./shared";
import type { ChallengeViewProps } from "../../challenge/types";
import type { Action, State } from "../../games/classics/ticForks";
export function TicForkBoard({ state: s, dispatch, active, width }: ChallengeViewProps<State, Action>) {
  const size = Math.min(width, 390), cell = (size - 16) / 3, player = ticTurn(s.board);
  return <View style={{ gap: 12 }}>
    <Copy style={{ color: C.ink }}>Find a fork for {player}: choose an empty square that creates two different ways to win on your next turn.</Copy>
    <Copy accessibilityLiveRegion="polite" style={{ color: C.ink }}>{s.correct ? "A fork! Two different winning squares are ready." : s.checked ? "That square does not make a fork. Your choice stays here; try another square." : s.hint !== null ? `Help: look at square ${s.hint + 1}. Count the two different squares where ${player} could complete a line.` : "Tap a square, then Check your fork."}</Copy>
    <View style={{ width: size, alignSelf: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {s.board.map((mark, i) => <Cell key={i} label={`Square ${i + 1}, ${mark ?? "empty"}${s.selected === i ? ", selected" : ""}${s.hint === i ? ", suggested" : ""}`} disabled={!active || !!mark || s.correct} selected={s.selected === i} onPress={() => dispatch(["s", i])} style={{ width: cell, height: cell, borderRadius: 16, backgroundColor: s.hint === i ? "#FBE7B3" : C.paper, borderWidth: s.selected === i ? 3 : 1, borderColor: s.selected === i ? C.teal : C.line }}>
        {mark ? <TicMark mark={mark} size={cell * 0.62}/> : s.selected === i ? <TicMark mark={player} size={cell * 0.55}/> : null}
      </Cell>)}
    </View>
    <Button disabled={!active || s.selected === null || s.checked || s.correct} onPress={() => dispatch(["c"])}>Check your fork</Button>
  </View>;
}
