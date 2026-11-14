import React from "react";
import { View } from "react-native";
import { Button } from "../../../components/ui";
import type { Step, Work } from "../../../math/kit";

export type HelpRowProps = {
  step: Step;
  work: Work;
  typed: boolean;
  active: boolean;
  /** Offered at levels with a picture to hide. */
  canHide: boolean;
  hidden: boolean;
  press: () => void;
  onHelp: () => void;
  onChoices: () => void;
  onToggle: () => void;
};
/** Help is a ladder: a cue, then the number, then the number filled in. Choices and the hidden picture are the other two supports. */
export function HelpRow({ step, work, typed, active, canHide, hidden, press, onHelp, onChoices, onToggle }: HelpRowProps) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
    <Button quiet compact icon="help" disabled={!active || work.hint >= 3} onPress={() => { press(); onHelp(); }}>
      {work.hint === 0 ? "Help" : work.hint === 1 ? "More help" : work.hint === 2 ? "Fill it in" : "Answer filled in"}
    </Button>
    {typed && step.kind === "number" && !work.choices && <Button quiet compact disabled={!active} onPress={() => { press(); onChoices(); }}>Show choices</Button>}
    {canHide && <Button quiet compact disabled={!active} onPress={() => { press(); onToggle(); }}>{hidden ? "Show picture" : "Hide picture"}</Button>}
  </View>;
}
