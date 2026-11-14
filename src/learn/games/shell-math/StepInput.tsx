import React from "react";
import { View } from "react-native";
import { Text } from "../../../components/Text";
import { Button, C } from "../../../components/ui";
import type { Act, Step, Work } from "../../../math/kit";
import { NumberPad } from "../../../math/kit/ui/NumberPad";
import { AnswerTile } from "../../AnswerTile";
import { CoachSpot } from "../../Coach";

export type StepInputProps = {
  step: Step;
  work: Work;
  /** Typed answers (level 3 and up). Below that, number steps use three tiles. */
  typed: boolean;
  /** Tiles for the current number step, used when the child is not typing or turned choices on. */
  tiles: readonly number[];
  width: number;
  active: boolean;
  coachActive: boolean;
  /** Changes whenever the step changes, so the pad clears. */
  resetKey: string;
  addVerb: "on" | "back";
  /** Press feedback for controls that are not a key (sound and haptic). */
  press: () => void;
  onAct: (a: Act) => void;
  soundOn: boolean;
  sound: (key: string) => void;
  prompt: string;
};

/** The control for whichever step the child is on: count, trade, tiles or the number pad. Fill and pair are touched in the picture. */
export function StepInput({ step, work, typed, tiles, width, active, coachActive, resetKey, addVerb, press, onAct, soundOn, sound, prompt }: StepInputProps) {
  if (work.solved) return null;
  const hinted = step.kind === "number" && work.hint >= 3 ? step.value : null;
  if (step.kind === "count") {
    return <CoachSpot active={coachActive && active}>
      <Button disabled={!active} onPress={() => { press(); onAct(["c"]); }} style={{ minHeight: 60 }}>{addVerb === "on" ? "Count on one" : "Count back one"}</Button>
    </CoachSpot>;
  }
  if (step.kind === "trade") {
    return <CoachSpot active={coachActive && active}>
      <Button disabled={!active} onPress={() => { press(); onAct(["t"]); }} style={{ minHeight: 60 }}>{step.dir === "make" ? "Make a ten" : "Open a ten"}</Button>
    </CoachSpot>;
  }
  if (step.kind !== "number") return null;
  if (!typed || work.choices) {
    return <CoachSpot active={coachActive && active} handAt="none">
      <View accessibilityLabel={`${prompt}: choose one`} style={{ flexDirection: "row", gap: 10 }}>
        {tiles.map((n) => <AnswerTile key={n} label={`Choose ${n}`} disabled={!active} wrong={work.last === n}
          onPress={() => { press(); onAct(["n", n]); }} style={{ flex: 1, minHeight: 64 }}>
          <Text style={{ fontSize: 32, fontWeight: "900", color: C.ink }}>{n}</Text>
        </AnswerTile>)}
      </View>
    </CoachSpot>;
  }
  return <CoachSpot active={coachActive && active} handAt="none">
    <NumberPad resetKey={resetKey} width={width} disabled={!active} prefill={hinted} prompt={prompt}
      onKey={() => { if (soundOn) sound("tap"); }} onSubmit={(n) => onAct(["n", n])} />
  </CoachSpot>;
}
