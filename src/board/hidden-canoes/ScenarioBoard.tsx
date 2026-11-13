import React from "react";
import { View } from "react-native";
import { Text } from "../../components/Text";
import { Button, C, Copy, PressableScale, font } from "../../components/ui";
import { useSounds } from "../../components/Audio";
import { useStore } from "../../state/Store";
import type { ChallengeViewProps } from "../../challenge/types";
import { Piece } from "../Art";
import { coordinate } from "./engine";
import { askText, reason, solvedState, type Action, type State } from "./challenge";
import { factsFor } from "./scenarios";

const Label = ({ children }: { children: React.ReactNode }) => (
  <Text style={{ color: C.ink, fontSize: 16, fontFamily: font, fontWeight: "800", textAlign: "center" }}>{children}</Text>
);
/** One Hidden Canoes chart. Every answer follows from the chart; nothing hidden is in it. */
export function ScenarioBoard({ state: s, dispatch, active, width }: ChallengeViewProps<State, Action>) {
  const store = useStore(),
    play = useSounds(store.save.settings.sound);
  const d = s.descriptor,
    solved = solvedState(s),
    last = s.picks[s.picks.length - 1],
    right = new Set(s.picks.filter((p) => p.right).map((p) => p.cell)),
    wrong = last && !last.right ? last.cell : null,
    finds = d.chart.filter((v) => v === 2).length,
    cell = Math.min((width - 34) / 6, 60);
  const send = (a: Action) => {
    if (!active) return;
    play("tap");
    dispatch(a);
  };
  const left = factsFor(d).answers.length - right.size;
  const message = solved
    ? `You worked it out! ${reason(d, last!.cell)}`
    : wrong !== null
      ? `${reason(d, wrong)} Undo, or try another space.`
      : s.hint !== undefined
        ? `Help suggests ${coordinate(s.hint)}, in gold. ${reason(d, s.hint)}`
        : last
          ? `Yes! ${reason(d, last.cell)} ${left} more to find.`
          : askText[d.ask](d.count);
  const marker = d.ask === "water" ? "ripple" : "canoe";
  return (
    <View style={{ gap: 10, alignItems: "center" }}>
      <Copy accessibilityLiveRegion="polite" style={{ color: C.ink, fontSize: 15, alignSelf: "stretch" }}>
        {message}
      </Copy>
      <Copy style={{ fontSize: 14, alignSelf: "stretch" }}>
        {last || s.hint !== undefined ? `${askText[d.ask](d.count)} ` : ""}Canoes: one 3 long, two 2 long. The chart shows {finds} {finds === 1 ? "find" : "finds"}.
      </Copy>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        <Button quiet compact disabled={!active || !s.picks.length || solved} onPress={() => send(["u"])}>
          Undo a tap
        </Button>
        <Button quiet compact disabled={!active || (!s.picks.length && s.hint === undefined) || solved} onPress={() => send(["z"])}>
          Start again
        </Button>
      </View>
      <View style={{ width: cell * 6 + 34, backgroundColor: "#D8EBEF", borderRadius: 18, paddingBottom: 6, paddingRight: 8 }}>
        <View style={{ flexDirection: "row", paddingLeft: 26 }}>
          {"ABCDEF".split("").map((c) => (
            <View key={c} style={{ width: cell }}>
              <Label>{c}</Label>
            </View>
          ))}
        </View>
        {Array.from({ length: 6 }, (_, r) => (
          <View key={r} style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 26 }}>
              <Label>{r + 1}</Label>
            </View>
            {Array.from({ length: 6 }, (_, c) => {
              const i = r * 6 + c,
                v = d.chart[i],
                picked = right.has(i),
                missed = wrong === i,
                hinted = s.hint === i;
              const label = `${coordinate(i)}${v === 2 ? ", canoe found" : v === 1 ? ", open water" : picked ? (d.ask === "water" ? ", marked: can't hold a canoe" : ", marked: canoe") : missed ? ", not this one" : ", not searched"}`;
              return (
                <PressableScale
                  key={c}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  disabled={!active || solved || v !== 0 || picked}
                  accessibilityState={{ disabled: !active || solved || v !== 0 || picked, selected: picked }}
                  onPress={() => send(["t", i])}
                  style={{
                    width: cell - 2,
                    height: cell - 2,
                    margin: 1,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: picked ? "#F4D58F" : hinted ? "#F1D495" : v === 2 ? "#ECD9B6" : v === 1 ? "#F3F5ED" : "#BCDCE4",
                    borderWidth: picked || hinted || missed ? 3 : 1,
                    borderColor: picked ? "#96601E" : hinted ? "#BA7D2B" : missed ? "#A2463A" : "#90B8C2",
                  }}
                >
                  {v === 2 ? (
                    <Piece kind="canoe" size={cell - 10} />
                  ) : v === 1 ? (
                    <Piece kind="ripple" size={cell - 12} />
                  ) : picked ? (
                    <Piece kind={marker} size={cell - 12} />
                  ) : null}
                </PressableScale>
              );
            })}
          </View>
        ))}
      </View>
      <Copy style={{ fontSize: 12, textAlign: "center" }}>Canoe: found · Ripple: open water · Gold: your answer</Copy>
    </View>
  );
}
