import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import { Button, C, Copy, Heading, PressableScale } from "../../../components/ui";
import type { BoardProps } from "../../types";
import { Scene, PictureObject } from "../../art/Objects";
import { ReadingText } from "../../kit/ReadingText";
import { sceneLabel, wordAudio } from "../../kit/reading";
import { whichAnswer, whichItem, whichNext, whichPick, type WhichState } from "./engine";

export function Board({ session, update, practice, sound, soundOn, width, height, active }: BoardProps<WhichState>) {
  const s = session.state;
  const prompted = useRef(false);
  useEffect(() => {
    if (active && !prompted.current && s.index === 0) {
      prompted.current = true;
      sound("which-one-read");
    }
  }, [active, s.index, sound]);
  if (s.index === 8)
    return (
      <View style={{ alignItems: "center", padding: 16, gap: 10 }}>
        <PictureObject name="cat" size={100} />
        <Heading>Every word has its picture.</Heading>
        <Copy>You read all eight sentences.</Copy>
      </View>
    );
  const item = whichItem(s),
    correct = item.scenes[0],
    wrong = s.wrong === null ? null : item.scenes[s.orders[s.index][s.wrong]];
  const changed = wrong
    ? (["subject", "object", "relation", "color", "size"] as const).find((k) => wrong[k] !== correct[k])
    : undefined;
  const highlight = changed ? correct[changed] : undefined;
  const choiceWidth = Math.min(208, (width - 14) / 3),
    pictureHeight = height < 730 ? 91 : 124;
  return (
    <View style={{ gap: height < 730 ? 9 : 14, alignItems: "center" }}>
      <Copy style={{ fontSize: 13 }}>
        Sentence {s.index + 1} of 8
        {session.options.mode === "versus"
          ? ` · ${session.names?.[(s.starter + s.index) % 2] ?? `Player ${((s.starter + s.index) % 2) + 1}`} reads`
          : ""}
      </Copy>
      <ReadingText
        disabled={!s.tried && !s.solved}
        text={item.text}
        highlight={highlight}
        onWord={(_, word) => {
          if (active && (s.tried || s.solved)) sound(wordAudio(word));
        }}
      />
      <Copy style={{ fontSize: 15, textAlign: "center", color: C.ink }}>
        {s.solved
          ? "You found the picture in every word."
          : s.tried
            ? "Look at the warm word. What does it tell you?"
            : "Read first. Which picture matches every word?"}
      </Copy>
      <View style={{ flexDirection: "row", gap: 7, alignSelf: "center" }}>
        {s.orders[s.index].map((sceneIndex, i) => (
          <PressableScale
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Picture ${i + 1}: ${sceneLabel(item.scenes[sceneIndex])}`}
            accessibilityState={{ selected: s.solved && i === whichAnswer(s), disabled: s.solved }}
            disabled={s.solved || !active}
            onPress={() => {
              const next = whichPick(s, i);
              practice(item.skill, next.solved);
              practice("read.meaning", next.solved);
              sound(next.solved ? "match" : "which-one-look");
              update(next);
            }}
            style={{
              width: choiceWidth,
              minHeight: pictureHeight + 28,
              borderWidth: s.wrong === i || (s.solved && i === whichAnswer(s)) ? 3 : 1,
              borderColor: s.wrong === i ? C.coral : C.teal,
              borderRadius: 16,
              backgroundColor: C.paper,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <Scene scene={item.scenes[sceneIndex]} width={choiceWidth - 6} height={pictureHeight} />
            <Copy style={{ fontSize: 14, color: C.ink }}>
              {i + 1}
              {s.solved && i === whichAnswer(s) ? " ✓" : ""}
            </Copy>
          </PressableScale>
        ))}
      </View>
      {s.tried || s.solved ? (
        <Button
          compact
          quiet
          icon="sound-on"
          disabled={!soundOn}
          onPress={() => sound(`which-one-sentence-${item.id}`)}
        >
          Hear it
        </Button>
      ) : (
        <Copy style={{ fontSize: 12, textAlign: "center" }}>Try a picture first. Then you can hear it.</Copy>
      )}
      {s.tried && !s.solved && (
        <Copy style={{ fontSize: 13, textAlign: "center" }}>Tap any word to hear just that word.</Copy>
      )}
      {s.solved && (
        <Button compact onPress={() => active && update(whichNext(s))}>
          {s.index === 7 ? "Finish this round" : "Next sentence"}
        </Button>
      )}
    </View>
  );
}
export function Art({ size }: { size: number }) {
  return <PictureObject name="cat" size={size} />;
}
