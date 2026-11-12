import React, { useState } from "react";
import { View } from "react-native";
import { Text } from "../../components/Text";
import { Button, C, Copy } from "../../components/ui";
import { checkersMoves, row, col } from "../../games/checkers";
import { coords, Cell } from "./shared";
import type { ChallengeViewProps } from "../../challenge/types";
import type { Action, State } from "../../games/classics/checkersTactics";
export function CheckersTacticsBoard({ state: s, dispatch, active, width }: ChallengeViewProps<State, Action>) {
  const [selection, setSelection] = useState<{ from: number; path: number[]; at: State } | null>(null);
  const chosen = selection?.at === s ? selection : null;
  const moves = checkersMoves(s.position, "classic"), candidates = chosen ? moves.filter(m => m.from === chosen.from && chosen.path.every((v, i) => m.path[i] === v)) : [];
  const destinations = candidates.map(m => m.path[chosen!.path.length]);
  const display = [...s.position.board];
  if (chosen?.path.length) { display[chosen.from] = 0; candidates[0]?.captured.slice(0, chosen.path.length).forEach(i => { display[i] = 0; }); display[chosen.path.at(-1)!] = s.position.board[chosen.from]; }
  const size = Math.min(width, 560), cell = size / 8;
  function tap(i: number) {
    if (!active || s.tried) return;
    if (chosen && destinations.includes(i)) {
      const path = [...chosen.path, i], done = candidates.find(m => m.path.join() === path.join());
      if (done) { dispatch(["m", done.from, done.path]); setSelection(null); } else setSelection({ ...chosen, path });
    } else if (!chosen?.path.length && moves.some(m => m.from === i)) setSelection({ from: i, path: [], at: s });
  }
  return <View style={{ gap: 12 }}>
    <Copy style={{ color: C.ink }}>{s.correct ? "You found the winning capture!" : s.tried ? "That capture leaves the other side a move. Start again and try a different route." : `${s.position.turn === 1 ? "Red" : "Blue"} to move. Win this position with one complete capture turn. Classic rules: jumps are required; finish the same piece's chain.`}</Copy>
    {s.hint && <Copy accessibilityLiveRegion="polite" style={{ color: C.ink }}>Help: start at {coords(s.hint.from)}, then jump to {s.hint.path.map(coords).join(", then ")}.</Copy>}
    <View style={{ width: size, alignSelf: "center", flexDirection: "row", flexWrap: "wrap", borderRadius: 12, overflow: "hidden" }}>
      {display.map((piece, i) => {
        const dark = (row(i) + col(i)) % 2 === 1, target = destinations.includes(i), hinted = s.hint && (s.hint.from === i || s.hint.path.includes(i));
        return <Cell key={i} label={`${coords(i)}, ${piece ? `${piece > 0 ? "red" : "blue"} ${Math.abs(piece) === 2 ? "king" : "piece"}` : "empty"}${target ? ", legal destination" : ""}${hinted ? ", suggested route" : ""}`} disabled={!active || !dark || s.tried} selected={chosen?.from === i} onPress={() => tap(i)} style={{ width: cell, height: cell, backgroundColor: hinted ? "#E9CB7D" : target ? "#C9DBA1" : dark ? "#A7C3B0" : "#F3E8D1", borderWidth: chosen?.from === i ? 3 : 0, borderColor: C.ink }}>
          {piece ? <View style={{ width: cell * 0.78, height: cell * 0.78, borderRadius: cell, backgroundColor: piece > 0 ? "#A64F37" : "#315D79", borderWidth: 2, borderColor: "#FFF6DB", alignItems: "center", justifyContent: "center" }}>{Math.abs(piece) === 2 && <Text allowFontScaling={false} style={{ fontSize: cell * 0.42, fontWeight: "900", color: "#FFF6DB" }}>K</Text>}</View> : target ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.teal }}/> : null}
        </Cell>;
      })}
    </View>
    {!!chosen?.path.length && <Button quiet disabled={!active} onPress={() => setSelection(null)}>Start this turn over</Button>}
    <Copy style={{ color: C.ink }}>Red moves down the board; Blue moves up. Kings have a K and can jump both ways. Each puzzle is a composed legal endgame, separate from your saved match.</Copy>
  </View>;
}
