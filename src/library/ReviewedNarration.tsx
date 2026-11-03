import React from "react";
import { View } from "react-native";
import scripts from "../../content/library/exhibits.json";
import { Text } from "../components/Text";
import { isDay, type LabState } from "../explore/activities";
import { SentenceLine } from "./Reader";
import type { Sentence } from "./schema";
import { s } from "./ui";

/** The reviewed explanation follows the installed engine, without inventing controls. */
export function ReviewedNarration({ id, state, selected, speak }: {
  id: string; state: LabState; selected: string; speak: (key: string, sentence?: Sentence) => void;
}) {
  const script = (scripts as Record<string, { limits: Sentence; steps: { key: string; label: Sentence; narration: Sentence[] }[] }>)[id];
  if (!script) return null;
  const key = id === "reef-food-web"
    ? ["light", "producer", "grazer", "predator", "branch", "limits"][Math.min(state.chain.length, 5)]
    : id === "water-journey"
      ? { ocean: "heat", vapor: "cool", cloud: "grow", rain: "soak", ground: "flow", ice: "melt" }[state.water]
      : state.turn === 2 || state.turn === 6 ? "turn" : isDay(state.turn) ? "day" : "night";
  const step = script.steps.find(step => step.key === key)!;
  return <View style={{ gap: 8 }}>
    <Text maxFontSizeMultiplier={1.6} style={s.heading}>{step.label.text}</Text>
    {step.narration.map(sentence => <SentenceLine key={sentence.id} sentence={sentence} selected={selected === sentence.id} onSentence={() => speak(sentence.speechKey, sentence)} />)}
    <Text maxFontSizeMultiplier={1.6} style={s.heading}>What this model leaves out</Text>
    <SentenceLine sentence={script.limits} selected={selected === script.limits.id} onSentence={() => speak(script.limits.speechKey, script.limits)} />
  </View>;
}
