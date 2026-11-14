import React, { useState } from "react";
import { ReadingText } from "../kit/ReadingText";
import { tapWord } from "./tap";

/**
 * Printed words a child can tap to hear. The last word tapped stays marked so a grown-up can see which one it was.
 * Sound off leaves the words fully readable; a word with no recording stays silent rather than failing.
 */
export function TapWords({
  text,
  sound,
  soundOn,
  onHeard,
  compact = false,
}: {
  text: string;
  sound: (key: string) => void;
  soundOn: boolean;
  /** Called for every tap that names a word: a read-aloud act. */
  onHeard?: (word: string) => void;
  compact?: boolean;
}) {
  const [marked, setMarked] = useState<string | undefined>();
  return (
    <ReadingText
      text={text}
      compact={compact}
      highlight={marked}
      onWord={(_, raw) => {
        const hit = tapWord(raw);
        if (!hit) return;
        setMarked(hit.word);
        if (soundOn) sound(hit.key);
        onHeard?.(hit.word);
      }}
    />
  );
}
