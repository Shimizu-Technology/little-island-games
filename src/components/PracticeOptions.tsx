import React from "react";
import { View } from "react-native";
import { Chip, Copy, Heading, styles, ToggleRow } from "./ui";
import type { PracticeSettings } from "../practice/types";

/** Rendered only after the existing grown-up gate is unlocked. */
export function PracticeOptions({ value, onChange, disabled }: { value: PracticeSettings; onChange: (next: PracticeSettings) => void; disabled: boolean }) {
  const set = (next: Partial<PracticeSettings>) => { if (!disabled) onChange({ ...value, ...next }); };
  return <View style={{ gap: 10 }}>
    <Heading style={{ fontSize: 19 }}>Practice, then play</Heading>
    <ToggleRow label="A little practice before a new game" value={value.enabled} disabled={disabled}
      detail="Three short questions, then a full game. Help counts. Saved games always continue."
      onChange={enabled => set({ enabled })} />
    {value.enabled && <>
      <Heading style={{ fontSize: 17 }}>What shall we practice?</Heading>
      <View style={[styles.row, { flexWrap: "wrap" }]}>
        {(["math", "reading", "mixed"] as const).map(subject => <Chip key={subject} selected={value.subject === subject}
          onPress={() => set({ subject })}>{subject === "math" ? "Math" : subject === "reading" ? "Reading" : "A little of both"}</Chip>)}
      </View>
      {value.subject !== "reading" && <>
        <Heading style={{ fontSize: 17 }}>Numbers</Heading>
        <View style={[styles.row, { flexWrap: "wrap" }]}>
          {([10, 20] as const).map(limit => <Chip key={limit} selected={value.limit === limit} onPress={() => set({ limit })}>Within {limit}</Chip>)}
        </View>
        <Heading style={{ fontSize: 17 }}>Math practice</Heading>
        <View style={[styles.row, { flexWrap: "wrap" }]}>
          {(["add", "subtract", "mixed"] as const).map(operation => <Chip key={operation} selected={value.operation === operation}
            onPress={() => set({ operation })}>{operation === "add" ? "Adding" : operation === "subtract" ? "Taking away" : "Both"}</Chip>)}
        </View>
      </>}
      <Copy>Learning islands stay open. A grown-up can skip practice when needed. Nothing is timed, and asking for help never resets progress.</Copy>
    </>}
  </View>;
}
