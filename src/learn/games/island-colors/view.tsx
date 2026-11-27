import React, { useState } from "react";
import { View } from "react-native";
import { C, Copy, Heading, PressableScale } from "../../../components/ui";
import { SpeakButton } from "../../SpeakButton";
import type { BoardProps } from "../../types";
import { useSpokenPrompt } from "../../voice";
import { ColorCardArt, IslandColorsArt } from "./art";
import {
  applyHelp,
  chooseCard,
  COLOR_PALETTE,
  colorHint,
  engine,
  taskAt,
  type IslandColorsState,
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
}: BoardProps<IslandColorsState>) {
  const s = session.state;
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const done = s.index >= s.total;
  const task = done ? null : taskAt(s);
  const hint = colorHint(s);

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
  const cardHeight = task.choices.length === 2 ? 156 : 128;
  const artSize = task.choices.length === 2 ? 94 : 76;

  const handlePick = (idx: number) => {
    if (!active) return;
    const { next, correct } = chooseCard(s, idx);
    practice(task.skill, correct);
    coach.done();
    if (correct) {
      setWrongIndex(null);
      const chosen = task.choices[idx];
      speak(`Yay! ${chosen.label}!`, { pitch: 1.12 });
      cheer(s.index === s.total - 1 ? "big" : "right");
      update(next);
    } else {
      setWrongIndex(idx);
      sound("tap", true);
      speak("Good try! Let's look again.");
      update(next);
    }
  };

  const handleHelp = () => {
    if (!active) return;
    assistance?.();
    const next = applyHelp(s);
    const nextHint = colorHint(next);
    update(next);
    if (nextHint.text) speak(nextHint.text);
  };

  return (
    <View style={{ gap: 14, paddingBottom: 14 }}>
      {/* Cheerful Voice-Led Prompt Banner */}
      <View
        style={{
          backgroundColor: "#FFF0D2",
          borderRadius: 22,
          borderWidth: 2,
          borderBottomWidth: 4,
          borderColor: "#E8D8BE",
          padding: compact ? 14 : 18,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Copy maxFontSizeMultiplier={1.4} style={{ color: "#C4573A", fontWeight: "900", fontSize: 13, letterSpacing: 0.6 }}>
            CARD {s.index + 1} OF {s.total}
          </Copy>
          <SpeakButton
            testID="island-colors-speak"
            size="toddler"
            label="Hear the prompt again"
            text="Hear it"
            disabled={!soundOn || !active}
            onPress={replay}
          />
        </View>
        <Heading maxFontSizeMultiplier={1.6} style={{ fontSize: compact ? 22 : 26, color: C.ink }}>
          {task.prompt}
        </Heading>
      </View>

      {/* Level 5 Sample Card to Match */}
      {task.sample && (
        <View
          testID="island-colors-sample"
          accessible
          accessibilityLabel={`Card to match: ${task.sample.label}`}
          style={{
            alignSelf: "center",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: COLOR_PALETTE[task.sample.color].light,
            borderRadius: 24,
            borderWidth: 3,
            borderColor: "#E1B251",
            paddingHorizontal: 26,
            paddingVertical: 14,
            gap: 4,
          }}
        >
          <Copy maxFontSizeMultiplier={1.3} style={{ color: "#9A641A", fontWeight: "900", fontSize: 12 }}>
            MATCH THIS ONE
          </Copy>
          <ColorCardArt card={task.sample} size={84} />
        </View>
      )}

      {/* Giant Toddler Picture Cards (>= 120×128pt) */}
      <View
        testID="island-colors-choices"
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          gap,
        }}
      >
        {task.choices.map((card, i) => {
          const dimmed = hint.dimmedIndex === i;
          const highlighted = hint.highlightIndex === i;
          const missed = wrongIndex === i;
          const surfaceTint = COLOR_PALETTE[card.color].light;
          return (
            <PressableScale
              key={`${s.index}-${i}-${card.label}`}
              testID={`island-colors-choice-${i}`}
              accessibilityRole="button"
              accessibilityLabel={card.label}
              disabled={!active}
              onPress={() => handlePick(i)}
              style={{
                width: cardWidth,
                minWidth: 112,
                minHeight: cardHeight,
                borderRadius: 24,
                backgroundColor: highlighted ? "#FFF5CE" : surfaceTint,
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
              <ColorCardArt card={card} size={artSize} />
              <Copy
                maxFontSizeMultiplier={1.4}
                style={{ fontSize: 15, fontWeight: "900", color: C.ink, textAlign: "center" }}
              >
                {card.label}
              </Copy>
            </PressableScale>
          );
        })}
      </View>

      {wrongIndex !== null && (
        <Copy accessibilityLiveRegion="polite" style={{ color: "#A33B22", fontWeight: "800", textAlign: "center", fontSize: 16 }}>
          Good try! Let’s look again.
        </Copy>
      )}

      {s.hintLevel > 0 && !!hint.text && (
        <View
          testID="island-colors-hint"
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
            testID="island-colors-speak-hint"
            label="Hear clue"
            text="Hear"
            disabled={!soundOn || !active}
            onPress={() => speak(hint.text)}
          />
        </View>
      )}

      <View style={{ flexDirection: "row", justifyContent: "center" }}>
        <PressableScale
          testID="island-colors-help"
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
  return <IslandColorsArt size={size} />;
}
