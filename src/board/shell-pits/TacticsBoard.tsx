import React from "react";
import { View } from "react-native";
import { Button, C, Copy } from "../../components/ui";
import { useSounds } from "../../components/Audio";
import { useStore } from "../../state/Store";
import type { ChallengeViewProps } from "../../challenge/types";
import { Boards } from "../Boards";
import type { Action, State } from "./challenge";

const pitName = (m: number) => (m < 6 ? `circle pit ${m + 1}` : `square pit ${m - 6}`);
/** One Shell Pits endgame. Ray, the Challenge rival, answers each sow with its best defence. */
export function TacticsBoard({ state: s, dispatch, active, width }: ChallengeViewProps<State, Action>) {
  const store = useStore(),
    play = useSounds(store.save.settings.sound);
  const p = s.position,
    last = s.line[s.line.length - 1],
    won = p.outcome === 0,
    over = p.outcome !== null;
  const send = (a: Action) => {
    if (!active) return;
    play("tap");
    dispatch(a);
  };
  const message = won
    ? "You won the endgame!"
    : over
      ? "Ray kept enough shells this time. Undo a sow or start again."
      : s.hint === null
        ? "No sure win from here. Undo a sow or start again."
        : s.hint !== undefined
          ? `Help: try ${pitName(s.hint)}. The gold ring marks it.`
          : last?.replies.length
            ? `Ray sowed ${last.replies.map(pitName).join(", then ")}. Your turn.`
            : last
              ? "Another turn! Your last shell landed in your store."
              : "Win this endgame. You are the circle side. Ray answers every sow with its best defence.";
  return (
    <View style={{ gap: 10 }}>
      <Copy accessibilityLiveRegion="polite" style={{ color: C.ink, fontSize: 15 }}>
        {message}
      </Copy>
      <Copy style={{ fontSize: 14 }}>
        Your sows: {s.line.length} · Fewest that win: {s.descriptor.par}
      </Copy>
      <Boards
        key={`${s.line.length}:${String(s.hint)}`}
        game="shell-pits"
        state={p}
        width={Math.min(width, 520)}
        onMove={(m) => send(["s", m])}
        locked={!active || over || p.turn !== 0}
        hint={s.hint ?? null}
        speak={play}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        <Button quiet compact disabled={!active || !s.line.length || won} onPress={() => send(["u"])}>
          Undo a sow
        </Button>
        <Button quiet compact disabled={!active || (!s.line.length && s.hint === undefined) || won} onPress={() => send(["z"])}>
          Start again
        </Button>
      </View>
    </View>
  );
}
