import React, { useState } from "react";
import { View } from "react-native";
import { C, Copy, Heading, PressableScale } from "../../../components/ui";
import { SpeakButton } from "../../SpeakButton";
import type { BoardProps } from "../../types";
import { useSpokenPrompt } from "../../voice";
import { BeachItemArt, DotGroup, SplashCountArt } from "./art";
import {
  applyHelp,
  chooseNumber,
  countHint,
  engine,
  itemWord,
  NUMBER_WORDS,
  tapBeachItem,
  taskAt,
  type SplashCountState,
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
}: BoardProps<SplashCountState>) {
  const s = session.state;
  const [wrongChoice, setWrongChoice] = useState<number | null>(null);
  const done = s.index >= s.total;
  const task = done ? null : taskAt(s);
  const hint = countHint(s);

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
  const itemBox = task.shownCount <= 5 ? (compact ? 78 : 88) : compact ? 68 : 76;
  const itemArtSize = task.shownCount <= 5 ? 58 : 50;
  const choiceWidth = Math.max(88, Math.min(132, Math.floor((Math.min(width, 460) - 24) / 3)));

  const handleTapItem = (idx: number) => {
    if (!active) return;
    const { next, countSpoken, completedTask } = tapBeachItem(s, idx);
    coach.done();
    if (countSpoken !== null) {
      sound("tap", true);
      const numWord = NUMBER_WORDS[countSpoken] ?? String(countSpoken);
      if (completedTask) {
        practice(task.skill, true);
        setWrongChoice(null);
        speak(`${numWord}! You counted ${task.shownCount} ${itemWord(task.item, task.shownCount)}!`, { pitch: 1.12 });
        cheer(s.index === s.total - 1 ? "big" : "right");
      } else {
        speak(`${numWord}!`, { pitch: 1.08 });
      }
      update(next);
    }
  };

  const handleChoose = (val: number) => {
    if (!active) return;
    const { next, correct } = chooseNumber(s, val);
    practice(task.skill, correct);
    coach.done();
    if (correct) {
      setWrongChoice(null);
      speak(`Yay! ${NUMBER_WORDS[val] ?? val}!`, { pitch: 1.12 });
      cheer(s.index === s.total - 1 ? "big" : "right");
      update(next);
    } else {
      setWrongChoice(val);
      sound("tap", true);
      speak("Good try! Tap each treasure to count them again.");
      update(next);
    }
  };

  const handleHelp = () => {
    if (!active) return;
    assistance?.();
    const next = applyHelp(s);
    const nextHint = countHint(next);
    update(next);
    if (nextHint.text) speak(nextHint.text);
  };

  return (
    <View style={{ gap: 14, paddingBottom: 14 }}>
      {/* Voice-Led Header Banner */}
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
          <Copy maxFontSizeMultiplier={1.4} style={{ color: "#A36614", fontWeight: "900", fontSize: 13, letterSpacing: 0.6 }}>
            SPLASH {s.index + 1} OF {s.total}
          </Copy>
          <SpeakButton
            testID="splash-count-speak"
            size="toddler"
            label="Hear counting prompt again"
            text="Hear it"
            disabled={!soundOn || !active}
            onPress={replay}
          />
        </View>
        <Heading maxFontSizeMultiplier={1.6} style={{ fontSize: compact ? 22 : 26, color: C.ink }}>
          {task.prompt}
        </Heading>
      </View>

      {/* Sandy Lagoon Tray with Giant Tappable Treasures (>= 68×68pt) */}
      <View
        testID="splash-count-tray"
        style={{
          backgroundColor: "#E6F4F4",
          borderRadius: 24,
          borderWidth: 2,
          borderBottomWidth: 4,
          borderColor: "#B7DFE1",
          padding: compact ? 12 : 16,
          gap: 12,
          alignItems: "center",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: task.shownCount <= 5 ? 12 : 8,
            maxWidth: task.shownCount > 5 ? itemBox * 5 + 40 : undefined,
          }}
        >
          {Array.from({ length: task.shownCount }, (_, i) => {
            const order = s.tapped.indexOf(i);
            const counted = order >= 0;
            const glowing = hint.glowItemIndex === i;
            return (
              <PressableScale
                key={`${s.index}-${i}`}
                testID={`splash-count-item-${i}`}
                accessibilityRole="button"
                accessibilityLabel={
                  counted
                    ? `${itemWord(task.item, 1)} ${order + 1}, counted`
                    : `Tap ${itemWord(task.item, 1)} to count`
                }
                disabled={!active}
                onPress={() => handleTapItem(i)}
                style={{
                  width: itemBox,
                  height: itemBox,
                  minWidth: 68,
                  minHeight: 68,
                  borderRadius: 22,
                  backgroundColor: counted ? "#FFF5CE" : glowing ? "#FFEBB0" : "#FFFDF8",
                  borderWidth: glowing ? 4 : 2.5,
                  borderBottomWidth: glowing ? 6 : 4,
                  borderColor: glowing ? "#E1B251" : counted ? "#FF7A5C" : "#D6E8E8",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BeachItemArt kind={task.item} counted={counted} size={itemArtSize} />
                {counted && (
                  <View
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: "#FF7A5C",
                      borderWidth: 2,
                      borderColor: "#3D2B24",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Copy allowFontScaling={false} style={{ color: "#3D2B24", fontSize: 13, fontWeight: "900" }}>
                      {order + 1}
                    </Copy>
                  </View>
                )}
              </PressableScale>
            );
          })}
        </View>
        <Copy maxFontSizeMultiplier={1.4} style={{ color: "#1E6B66", fontWeight: "900", fontSize: 16 }}>
          {s.tapped.length === 0
            ? `Tap each ${itemWord(task.item, 1)} to count aloud!`
            : `Counted: ${s.tapped.length} ${s.tapped.length === task.shownCount ? "✓" : ""}`}
        </Copy>
      </View>

      {/* Giant Dot + Numeral Choice Cards (>= 88×88pt) for Levels 3–5 */}
      {task.choices.length > 0 && (
        <View
          testID="splash-count-choices"
          style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12 }}
        >
          {task.choices.map((val) => {
            const dimmed = hint.dimmedChoice === val;
            const highlighted = hint.highlightChoice === val;
            const missed = wrongChoice === val;
            return (
              <PressableScale
                key={`${s.index}-choice-${val}`}
                testID={`splash-count-choice-${val}`}
                accessibilityRole="button"
                accessibilityLabel={`${val} ${itemWord(task.item, val)}`}
                disabled={!active}
                onPress={() => handleChoose(val)}
                style={{
                  width: choiceWidth,
                  minWidth: 88,
                  minHeight: 92,
                  borderRadius: 22,
                  backgroundColor: highlighted ? "#FFF5CE" : "#FFFDF8",
                  borderWidth: highlighted ? 4 : 2.5,
                  borderBottomWidth: highlighted ? 6 : 5,
                  borderColor: highlighted ? "#E1B251" : missed ? "#C0442B" : "#E8D8BE",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  gap: 6,
                  opacity: dimmed ? 0.35 : 1,
                }}
              >
                <Copy maxFontSizeMultiplier={1.4} style={{ fontSize: 32, fontWeight: "900", color: C.ink }}>
                  {val}
                </Copy>
                <DotGroup count={val} color={highlighted ? "#E1B251" : "#FF7A5C"} />
              </PressableScale>
            );
          })}
        </View>
      )}

      {wrongChoice !== null && (
        <Copy accessibilityLiveRegion="polite" style={{ color: "#A33B22", fontWeight: "800", textAlign: "center", fontSize: 16 }}>
          Good try! Tap the {itemWord(task.item, 2)} to count them, then pick again.
        </Copy>
      )}

      {s.hintLevel > 0 && !!hint.text && (
        <View
          testID="splash-count-hint"
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
            testID="splash-count-speak-hint"
            label="Hear counting clue"
            text="Hear"
            disabled={!soundOn || !active}
            onPress={() => speak(hint.text)}
          />
        </View>
      )}

      <View style={{ flexDirection: "row", justifyContent: "center" }}>
        <PressableScale
          testID="splash-count-help"
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
  return <SplashCountArt size={size} />;
}
