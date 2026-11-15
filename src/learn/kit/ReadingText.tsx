import React from "react";
import { View } from "react-native";
import { C, Copy, PressableScale } from "../../components/ui";
import { wordFitMultiplier } from "../../components/wordFit";
import { REFUSED_TASK_TEXT, admittedReading, readableText, type ReadableRecord } from "../reading/admit";
/**
 * Printed reading text whose words can be tapped. Whole words stay intact and all touch targets are at least 44 points.
 * It prints only a branded record (`reading/provenance.ts` or `reading/tasks.ts`), never a string: anything else is
 * refused before a word is drawn (development throws; a release shows the "could not open" words with nothing to tap).
 * `end` adds one closing mark after the record's own words.
 */
export function ReadingText({
  record,
  end,
  current,
  highlight,
  onWord,
  compact = false,
  disabled = false,
}: {
  record: ReadableRecord;
  end?: "!";
  current?: number;
  highlight?: string;
  onWord: (index: number, word: string) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  if (!admittedReading(record, "ReadingText"))
    return (
      <View testID="reading-text-refused" accessibilityLiveRegion="polite" style={{ padding: 12, alignSelf: "stretch" }}>
        <Copy maxFontSizeMultiplier={1.4} style={{ color: C.ink, textAlign: "center" }}>{REFUSED_TASK_TEXT}</Copy>
      </View>
    );
  const text = readableText(record) + (end === "!" ? "!" : "");
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 3, justifyContent: "center" }}>
      {text.split(/\s+/).map((word, index) => {
        const next = current === index,
          read = current !== undefined && index < current;
        const marked = highlight === word.toLowerCase().replace(/[^a-z]/g, "");
        return (
          <PressableScale
            key={`${index}-${word}`}
            accessibilityRole="button"
            accessibilityLabel={`${word}${next ? ", next word" : read ? ", read" : ""}`}
            disabled={disabled}
            accessibilityState={{ selected: next, disabled }}
            onPress={() => onWord(index, word)}
            style={{
              minWidth: 44,
              minHeight: 44,
              paddingHorizontal: 6,
              justifyContent: "center",
              borderRadius: 9,
              backgroundColor: next ? C.gold : marked ? "#F5D3BF" : read ? C.success : C.paper,
              borderWidth: next || marked ? 2 : 1,
              borderColor: next || marked ? C.ink : C.line,
            }}
          >
            <Copy
              maxFontSizeMultiplier={wordFitMultiplier(word, compact ? 20 : 24, 300, 1.6)}
              style={{ fontSize: compact ? 20 : 24, lineHeight: 32, color: C.ink, fontWeight: next ? "700" : "500" }}
            >
              {word}
            </Copy>
          </PressableScale>
        );
      })}
    </View>
  );
}
