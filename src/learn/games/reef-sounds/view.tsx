import React, { useState } from "react";
import { View } from "react-native";
import { C, Copy, Heading, PressableScale } from "../../../components/ui";
import { SpeakButton } from "../../SpeakButton";
import type { BoardProps } from "../../types";
import { useSpokenPrompt } from "../../voice";
import { AnimalArt, ReefSoundsArt } from "./art";
import {
  animalHint,
  applyHelp,
  chooseAnimal,
  engine,
  taskAt,
  type ReefSoundsState,
} from "./engine";

export function Board({
  session,
  update,
  practice,
  assistance,
  sound,
  soundOn,
  width,
  active,
  coach,
  cheer,
}: BoardProps<ReefSoundsState>) {
  const s = session.state;
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const done = s.index >= s.total;
  const task = done ? null : taskAt(s);
  const hint = animalHint(s);

  const spokenLine = task
    ? s.index === 0 && session.revision === 0 && engine.spokenIntro
      ? `${engine.spokenIntro} ${task.voicePrompt}`
      : task.voicePrompt
    : null;

  const { replay, speak } = useSpokenPrompt(spokenLine, `${session.id}:${s.index}`, {
    soundOn,
    active: active && !done,
    rate: 0.92,
    pitch: 1.08,
  });

  if (!task) return null;

  const compact = width < 420;
  const cols = task.choices.length === 2 ? 2 : task.choices.length === 3 && !compact ? 3 : 2;
  const gap = 12;
  const cardWidth = Math.max(120, Math.floor((Math.min(width, 520) - gap * (cols - 1)) / cols));
  const cardHeight = task.choices.length === 2 ? 158 : 132;
  const artSize = task.choices.length === 2 ? 96 : 78;

  const handlePick = (idx: number) => {
    if (!active) return;
    const { next, correct } = chooseAnimal(s, idx);
    practice(task.skill, correct);
    coach.done();
    if (correct) {
      setWrongIndex(null);
      const chosen = task.choices[idx];
      speak(`Yay! ${chosen.soundWords}! ${chosen.name}!`, { pitch: 1.12 });
      cheer(s.index === s.total - 1 ? "big" : "right");
      update(next);
    } else {
      setWrongIndex(idx);
      sound("tap", true);
      speak("Good try! Listen closely and tap another friend.");
      update(next);
    }
  };

  const handleHelp = () => {
    if (!active) return;
    assistance?.();
    const next = applyHelp(s);
    const nextHint = animalHint(next);
    update(next);
    if (nextHint.text) speak(nextHint.text);
  };

  return (
    <View style={{ gap: 14, paddingBottom: 14 }}>
      <View
        style={{
          backgroundColor: "#E2F4EA",
          borderRadius: 22,
          borderWidth: 2,
          borderBottomWidth: 4,
          borderColor: "#CBE5D5",
          padding: compact ? 14 : 18,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Copy maxFontSizeMultiplier={1.4} style={{ color: "#1E6B66", fontWeight: "900", fontSize: 13, letterSpacing: 0.6 }}>
            FRIEND {s.index + 1} OF {s.total}
          </Copy>
          <SpeakButton
            testID="reef-sounds-speak"
            size="toddler"
            label="Hear the animal clue again"
            text="Hear it"
            disabled={!soundOn || !active}
            onPress={replay}
          />
        </View>
        <Heading maxFontSizeMultiplier={1.6} style={{ fontSize: compact ? 21 : 25, color: C.ink }}>
          {task.prompt}
        </Heading>
      </View>

      <View
        testID="reef-sounds-choices"
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          gap,
        }}
      >
        {task.choices.map((animal, i) => {
          const dimmed = hint.dimmedIndex === i;
          const highlighted = hint.highlightIndex === i;
          const missed = wrongIndex === i;
          return (
            <PressableScale
              key={`${s.index}-${animal.id}`}
              testID={`reef-sounds-choice-${i}`}
              accessibilityRole="button"
              accessibilityLabel={animal.name}
              disabled={!active}
              onPress={() => handlePick(i)}
              style={{
                width: cardWidth,
                minWidth: 112,
                minHeight: cardHeight,
                borderRadius: 24,
                backgroundColor: highlighted ? "#FFF5CE" : animal.surface,
                borderWidth: highlighted ? 4 : 2.5,
                borderBottomWidth: highlighted ? 6 : 5,
                borderColor: highlighted ? "#E1B251" : missed ? "#C0442B" : "#E8D8BE",
                alignItems: "center",
                justifyContent: "center",
                padding: 12,
                gap: 6,
                opacity: dimmed ? 0.35 : 1,
              }}
            >
              <AnimalArt id={animal.id} size={artSize} />
              <Copy
                maxFontSizeMultiplier={1.4}
                style={{ fontSize: 15, fontWeight: "900", color: C.ink, textAlign: "center" }}
              >
                {animal.name}
              </Copy>
            </PressableScale>
          );
        })}
      </View>

      {wrongIndex !== null && (
        <Copy accessibilityLiveRegion="polite" style={{ color: "#A33B22", fontWeight: "800", textAlign: "center", fontSize: 16 }}>
          Good try! Listen to the clue and try another animal.
        </Copy>
      )}

      {s.hintLevel > 0 && !!hint.text && (
        <View
          testID="reef-sounds-hint"
          accessibilityLiveRegion="polite"
          style={{
            backgroundColor: "#FFF8DC",
            borderRadius: 18,
            borderWidth: 2,
            borderColor: "#E1B251",
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <Copy style={{ flex: 1, fontWeight: "800", color: C.ink, fontSize: 16 }}>{hint.text}</Copy>
          <SpeakButton
            testID="reef-sounds-speak-hint"
            label="Hear animal clue"
            text="Hear"
            disabled={!soundOn || !active}
            onPress={() => speak(hint.text)}
          />
        </View>
      )}

      <View style={{ flexDirection: "row", justifyContent: "center" }}>
        <PressableScale
          testID="reef-sounds-help"
          accessibilityRole="button"
          accessibilityLabel={s.hintLevel === 0 ? "Help" : "Show glow"}
          disabled={!active}
          onPress={handleHelp}
          style={{
            minHeight: 52,
            minWidth: 140,
            borderRadius: 18,
            backgroundColor: C.paper,
            borderWidth: 1.5,
            borderBottomWidth: 3,
            borderColor: C.line,
            paddingHorizontal: 18,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Copy maxFontSizeMultiplier={1.5} style={{ color: C.ink, fontWeight: "800", fontSize: 16 }}>
            {s.hintLevel === 0 ? "Help" : "Show glow"}
          </Copy>
        </PressableScale>
      </View>
    </View>
  );
}

export function Art({ size }: { size: number }) {
  return <ReefSoundsArt size={size} />;
}
