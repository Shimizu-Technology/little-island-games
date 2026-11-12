import React from "react";
import { View } from "react-native";
import { Button, C, Copy } from "../../components/ui";
import { useSounds } from "../../components/Audio";
import { useStore } from "../../state/Store";
import type { ChallengeViewProps } from "../../challenge/types";
import { Boards } from "../Boards";
import { ideas, netsFacts, netsPuzzles, type Action, type State } from "./challenge";
import { lessonAt, tableFor } from "./chains";
import { move } from "./engine";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
/** One Fishing Nets chain ending. Ray, the Challenge rival, answers each rope with its best reply. */
export function ChainsBoard({ state: s, dispatch, active, width }: ChallengeViewProps<State, Action>) {
  const store = useStore(),
    play = useSounds(store.save.settings.sound);
  const p = s.position,
    last = s.line[s.line.length - 1],
    won = p.outcome === 0,
    index = netsPuzzles.findIndex((x) => x.descriptor === s.descriptor || JSON.stringify(x.descriptor) === JSON.stringify(s.descriptor)),
    idea = index >= 0 ? ideas[netsFacts[index].theme] : null;
  const send = (a: Action) => {
    if (!active) return;
    play("tap");
    dispatch(a);
  };
  const closes = s.hint !== undefined && s.hint !== null && move(p, s.hint).turn === 0;
  const taken = last ? last.after.scores[1] - (s.line.length > 1 ? s.line[s.line.length - 2].after.scores[1] : s.start.scores[1]) : 0;
  const message = won
    ? `You won the ending, ${p.scores[0]} boxes to ${p.scores[1]}!`
    : s.missed
      ? p.outcome !== null
        ? `Ray won ${p.scores[1]} boxes to ${p.scores[0]}. Undo a rope or start again.`
        : last && !last.replies.length
          ? `Taking that box lets Ray win, whatever you tie next. Undo a rope or start again.`
          : "Ray can win from here now. Undo a rope or start again."
      : s.hint === null
        ? "No win from here. Undo a rope or start again."
        : s.hint !== undefined
          ? closes
            ? "Help suggests the gold rope. It closes a box, so you get another turn."
            : "Help suggests the gold rope."
          : last?.replies.length
            ? `Ray tied ${plural(last.replies.length, "rope")} (the thick teal ones) and took ${taken} ${taken === 1 ? "box" : "boxes"}. Your turn.`
            : last
              ? "You closed a box, so you get another turn."
              : "Win from here: finish with more boxes than Ray. You are the circle side. Ray answers every rope with a strong one.";
  // The idea is about a rope that hands Ray boxes. Beside a hinted rope it must hold on this board, which a different
  // winning route can change, so it is worked out again here; after a win or a miss the ending's own idea shows.
  const hinted = s.hint !== undefined && s.hint !== null && !closes ? lessonAt(p, s.hint, tableFor(s.descriptor)) : null,
    shown = won || s.missed ? idea : hinted ? ideas[hinted.theme] : null;
  return (
    <View style={{ gap: 10 }}>
      <Copy accessibilityLiveRegion="polite" style={{ color: C.ink, fontSize: 15 }}>
        {message}
      </Copy>
      {shown && (
        <Copy testID="chain-idea" style={{ fontSize: 15 }}>
          The idea: {shown}
        </Copy>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        <Button quiet compact disabled={!active || !s.line.length || won} onPress={() => send(["u"])}>
          Undo a rope
        </Button>
        <Button quiet compact disabled={!active || (!s.line.length && s.hint === undefined) || won} onPress={() => send(["z"])}>
          Start again
        </Button>
      </View>
      <Boards
        key={`${s.line.length}:${String(s.hint)}`}
        game="fishing-nets"
        names={["You", "Ray"]}
        recent={last?.replies ?? []}
        state={p}
        width={Math.min(width, 520)}
        onMove={(m) => send(["r", m])}
        locked={!active || won || s.missed || p.turn !== 0}
        still={won || s.missed}
        hint={s.hint ?? null}
        speak={play}
      />
    </View>
  );
}
