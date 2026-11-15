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
  /** False when the board keeps Help in its header, where it never scrolls out of reach. */
  showHelp?: boolean;
};
/** Help is a ladder: a cue, then the number, then the number filled in. Choices and the hidden picture are the other two supports. */
export function HelpRow({ step, work, typed, active, canHide, hidden, press, onHelp, onChoices, onToggle, showHelp = true }: HelpRowProps) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
    {showHelp && <HelpButton work={work} active={active} press={press} onHelp={onHelp} />}
    {typed && step.kind === "number" && !work.choices && <Button quiet compact disabled={!active} onPress={() => { press(); onChoices(); }}>Show choices</Button>}
    {canHide && <Button quiet compact disabled={!active} onPress={() => { press(); onToggle(); }}>{hidden ? "Show picture" : "Hide picture"}</Button>}
  </View>;
}

/** The help ladder's one button: its words say what the next press gives. */
export function HelpButton({ work, active, press, onHelp }: { work: Work; active: boolean; press: () => void; onHelp: () => void }) {
  return <Button quiet compact icon="help" disabled={!active || work.hint >= 3} onPress={() => { press(); onHelp(); }}>
    {work.hint === 0 ? "Help" : work.hint === 1 ? "More help" : work.hint === 2 ? "Fill it in" : "Filled in"}
  </Button>;
}
