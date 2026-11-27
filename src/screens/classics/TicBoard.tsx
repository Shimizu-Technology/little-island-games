import { Status, C, Button, Copy } from "../../board/WarmUI";


import React, { useEffect, useState } from "react";
import { Animated, View, useWindowDimensions } from "react-native";

import { TicState, ticChoice, ticMove, ticOutcome, ticTurn, ticUndo, ticHintReason, ticResult, ticXSeat, lines } from "../../games/tic";

import { Controls } from "../../components/ui";
import { Scoreboard } from "../../components/Match";
import { newMatch } from "../../games/match";

import { easeOut, nativeDriver, useReducedMotion } from "../../components/motion";
import { TicMark } from "../../components/Art";
import { type Props, Cell, BoardArea, BoardLayout, S } from "./shared";
function MarkEntrance({ mark, size }: { mark: "X" | "O"; size: number }) {
  const reduced = useReducedMotion(),
    [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.timing(value, {
      toValue: 1,
      duration: reduced ? 0 : 150,
      easing: easeOut,
      useNativeDriver: nativeDriver,
    });
    animation.start();
    return () => animation.stop();
  }, [value, reduced]);
  return (
    <Animated.View
      style={{
        opacity: value,
        transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
      }}
    >
      <TicMark mark={mark} size={size} />
    </Animated.View>
  );
}
function WinningLine({ cells, size, cell }: { cells: number[]; size: number; cell: number }) {
  const reduced = useReducedMotion(),
    [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.timing(value, {
      toValue: 1,
      duration: reduced ? 0 : 250,
      easing: easeOut,
      useNativeDriver: nativeDriver,
    });
    animation.start();
    return () => animation.stop();
  }, [value, reduced]);
  const a = cells[0],
    b = cells[2],
    x = 13 + (a % 3) * (cell + 8) + cell / 2,
    y = 13 + Math.floor(a / 3) * (cell + 8) + cell / 2;
  const dx = ((b % 3) - (a % 3)) * (cell + 8),
    dy = (Math.floor(b / 3) - Math.floor(a / 3)) * (cell + 8),
    length = Math.hypot(dx, dy),
    angle = Math.atan2(dy, dx);
  return (
    <View pointerEvents="none" style={{ position: "absolute", width: size, height: size, left: 0, top: 0 }}>
      <Animated.View
        style={{
          position: "absolute",
          left: x + dx / 2 - length / 2,
          top: y + dy / 2 - 3,
          width: length,
          height: 6,
          borderRadius: 3,
          backgroundColor: C.teal,
          opacity: value,
          transform: [{ rotate: `${angle}rad` }, { scaleX: value }],
        }}
      />
    </View>
  );
}
export function TicBoard({ state: s, commit, width, sound, active }: Props<TicState>) {
  const outcome = ticOutcome(s.board),
    turn = ticTurn(s.board, s.first),
    computer = s.options.mode === "solo" && turn !== s.human && !outcome;
  // A hint belongs to the position it was asked for; any move or undo makes it stale.
  const [asked, setAsked] = useState<{ square: number | null; at: number } | null>(null);
  const hint = asked && asked.at === s.history.length ? asked.square : null;
  useEffect(() => {
    if (!computer || !active) return;
    const timer = setTimeout(() => {
      const index = ticChoice(s);
      if (index !== null) commit(ticMove(s, index));
    }, 400);
    return () => clearTimeout(timer);
  }, [s, computer, commit, active]);
  const winning =
    lines.find(([a, b, c]) => s.board[a] && s.board[a] === s.board[b] && s.board[a] === s.board[c]) ?? [];
  const { height } = useWindowDimensions();
  // Fit short windows, but never below a comfortable touch size; the page scrolls instead.
  const size = Math.max(Math.min(width, 560, height - 290), Math.min(width, 264));
  const cellSize = (size - 26 - 16) / 3;
  const title =
    outcome === "draw"
      ? "A good draw!"
      : outcome
        ? s.options.mode === "solo"
          ? outcome === s.human
            ? "You made a line!"
            : "Your island friend made a line!"
          : `${(s.match?.names ?? ["Player 1", "Player 2"])[outcome === "X" ? ticXSeat(s) : ticXSeat(s) === 0 ? 1 : 0]} made a line!`
        : computer
          ? "Your island friend is thinking…"
          : s.options.mode === "solo"
            ? `Your turn · ${s.human}`
            : `${(s.match?.names ?? ["Player 1", "Player 2"])[turn === "X" ? ticXSeat(s) : ticXSeat(s) === 0 ? 1 : 0]}’s turn · ${turn}`;
  return (
    <BoardLayout>
      <Status
        title={title}
        detail={
          outcome
            ? "Try another round, or choose a different game."
            : "Make three in a row, across, down, or diagonally."
        }
        success={!!outcome}
      />
      <BoardArea>
        <Scoreboard solo={s.options.mode === "solo"}
          match={s.match ?? newMatch(s.options.mode === "solo" ? ["You", "Island friend"] : undefined)}
          result={ticResult(s)}
          active={outcome ? null : turn === "X" ? ticXSeat(s) : ticXSeat(s) === 0 ? 1 : 0}
          marks={
            ticXSeat(s) === 0
              ? [<TicMark key="X" mark="X" size={24} />, <TicMark key="O" mark="O" size={24} />]
              : [<TicMark key="O" mark="O" size={24} />, <TicMark key="X" mark="X" size={24} />]
          }
        />
        <View style={[S.tic, { width: size, height: size }]}>
          {s.board.map((mark, i) => (
            <Cell
              key={i}
              label={`Square ${i + 1}, ${mark ?? "empty"}${hint === i ? ", suggested move" : ""}${winning.includes(i) ? ", winning line" : ""}`}
              disabled={!!mark || computer || !!outcome}
              onPress={() => {
                commit(ticMove(s, i));
                sound("tap");
              }}
              style={{
                width: cellSize,
                height: cellSize,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: winning.includes(i) ? "#91B488" : "#F2F0E8",
                backgroundColor: winning.includes(i) ? "#D8E9CD" : hint === i ? "#FBE7B3" : C.paper,
              }}
            >
              {mark ? (
                <MarkEntrance key={`${i}:${mark}`} mark={mark} size={cellSize * 0.62} />
              ) : hint === i ? (
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: C.teal }} />
              ) : null}
            </Cell>
          ))}
          {winning.length > 0 && (
            <WinningLine key={winning.join()} cells={winning} size={size} cell={cellSize} />
          )}
        </View>
      </BoardArea>
      <Controls>
        {!outcome && (
          <Button quiet onPress={() => setAsked({ square: ticChoice(s, () => 0.5, true), at: s.history.length })} disabled={computer}>
            Show a hint
          </Button>
        )}
        <Button
          quiet
          onPress={() => commit(ticUndo(s))}
          disabled={
            !s.history.length ||
            (s.options.mode === "solo" && s.human !== (s.first ?? "X") && s.history.length < 2)
          }
        >
          Undo my turn
        </Button>
      </Controls>
      {hint !== null && !outcome && !computer && (
        <Copy style={{ textAlign: "center", fontSize: 13, marginTop: 10 }}>{ticHintReason(s, hint)}</Copy>
      )}
    </BoardLayout>
  );
}
