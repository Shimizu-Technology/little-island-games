import React from "react";
import { View, useWindowDimensions } from "react-native";
import { Button, C, Copy } from "../../components/ui";
import { useSounds } from "../../components/Audio";
import { useStore } from "../../state/Store";
import type { ChallengeViewProps } from "../../challenge/types";
import { Boards } from "../Boards";
import type { Action, State } from "./challenge";
import { move } from "./engine";
import { winsNow } from "./tactics";

const column = (c: number) => `column ${c + 1}`;
/** Where Ray's latest coconut landed, so the board can ring it. */
function rayCell(s: State): number[] {
  const last = s.line[s.line.length - 1];
  if (!last || last.reply === null) return [];
  const before = s.line.length > 1 ? s.line[s.line.length - 2].after : s.start,
    dropped = move(before, last.drop);
  return last.after.board.flatMap((v, i) => (v !== dropped.board[i] ? [i] : []));
}
/** What went wrong on a lost try, read from the board. */
function missedWhy(s: State): string {
  const last = s.line[s.line.length - 1],
    before = s.line.length > 1 ? s.line[s.line.length - 2].after : s.start,
    dropped = move(before, last.drop);
  if (last.reply === null) return "That drop didn't finish four.";
  if (s.position.outcome === 1) return `Ray finished four in ${column(last.reply)}.`;
  if (winsNow({ ...dropped, turn: 0 }).includes(last.reply)) return `Ray dropped in ${column(last.reply)} and stopped your four.`;
  return s.descriptor.kind === "fork"
    ? `That drop didn't make two fours at once, and Ray dropped in ${column(last.reply)}.`
    : `That drop didn't finish four, and Ray dropped in ${column(last.reply)}.`;
}
const goal = {
  win: "Drop one coconut to finish four in a line.",
  block: "Ray could finish four next turn. Drop one coconut to stop it.",
  fork: "Make two ways to finish four at once. Ray can block only one.",
};
/** One Coconut Drop puzzle. Ray, the Challenge rival, answers each drop. */
export function TacticsBoard({ state: s, dispatch, active, width }: ChallengeViewProps<State, Action>) {
  const store = useStore(),
    play = useSounds(store.save.settings.sound),
    { height } = useWindowDimensions();
  // The shared Challenge header sits above; keep the whole board, bottom row included, on screen.
  const boardWidth = Math.max(280, Math.min(width, 490, ((height - 540) / 6.6) * 7));
  const d = s.descriptor,
    p = s.position,
    last = s.line[s.line.length - 1],
    solved = !!last && !s.missed && (d.kind === "block" ? p.outcome === null : p.outcome === 0);
  const send = (a: Action) => {
    if (!active) return;
    play("tap");
    dispatch(a);
  };
  const message = solved
    ? d.kind === "block"
      ? `You blocked Ray's four in ${column(last.drop)}!`
      : "Four in a line. You solved it!"
    : s.missed
      ? `${missedWhy(s)} Undo a drop or start again.`
      : s.hint === null
        ? "No sure answer from here. Undo a drop or start again."
        : s.hint !== undefined
          ? `Help suggests ${column(s.hint)}, in gold.`
          : last?.reply !== undefined && last.reply !== null
            ? `Ray dropped in ${column(last.reply)}. Your turn.`
            : `You are the brown circle coconuts. ${goal[d.kind]}`;
  return (
    <View style={{ gap: 10 }}>
      <Copy accessibilityLiveRegion="polite" style={{ color: C.ink, fontSize: 15 }}>
        {message}
      </Copy>
      {d.kind === "fork" && (
        <Copy style={{ fontSize: 14 }}>
          Your drops: {s.line.length} · Fewest that win: {d.par}
        </Copy>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        <Button quiet compact disabled={!active || !s.line.length || solved} onPress={() => send(["u"])}>
          Undo a drop
        </Button>
        <Button quiet compact disabled={!active || (!s.line.length && s.hint === undefined) || solved} onPress={() => send(["z"])}>
          Start again
        </Button>
      </View>
      <Boards
        key={`${s.line.length}:${String(s.hint)}`}
        game="coconut-drop"
        names={["You", "Ray"]}
        recent={rayCell(s)}
        state={p}
        width={boardWidth}
        onMove={(m) => send(["d", m])}
        locked={!active || solved || s.missed || p.outcome !== null || p.turn !== 0}
        hint={s.hint ?? null}
        speak={play}
      />
    </View>
  );
}
