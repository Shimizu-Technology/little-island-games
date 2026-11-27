import React, { useEffect, useState } from "react";
import { Animated, View } from "react-native";
import { Button, C, Copy, Heading, PressableScale } from "../../../components/ui";
import { nativeDriver, useReducedMotion } from "../../../components/motion";
import type { BoardProps } from "../../types";
import { useStepReveal } from "../../stepReveal";
import { CoachSpot } from "../../Coach";
import { Scene, PictureObject } from "../../art/Objects";
import { ReadingText } from "../../kit/ReadingText";
import { ReadingRefused } from "../../kit/ReadingRefused";
import { admittedReading } from "../../reading/admit";
import { sceneLabel, wordAudio } from "../../kit/reading";
import {
  whichAnswer,
  whichClueItem,
  whichHelp,
  whichItem,
  whichNext,
  whichPick,
  type WhichOneState,
  type WhichState,
} from "./engine";
import {
  clueChips,
  clueHintText,
  isWhichClue,
  whichClueAnswer,
  whichClueDone,
  whichClueHelp,
  whichClueNext,
  whichCluePick,
  whichClueToggleCross,
  whichClueTurn,
  type WhichClueState,
} from "./stages";

/** A big picture card: wiggles and steps back when wrong, wears a check when right. */
function Card({
  children,
  label,
  state,
  width,
  disabled,
  onPress,
}: {
  children: React.ReactNode;
  label: string;
  state: "idle" | "wrong" | "right" | "faded";
  width: number;
  disabled: boolean;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const [x] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (state !== "wrong" || reduced) return;
    const anim = Animated.sequence([
      Animated.timing(x, { toValue: 1, duration: 70, useNativeDriver: nativeDriver }),
      Animated.timing(x, { toValue: -1, duration: 120, useNativeDriver: nativeDriver }),
      Animated.timing(x, { toValue: 1, duration: 120, useNativeDriver: nativeDriver }),
      Animated.timing(x, { toValue: 0, duration: 80, useNativeDriver: nativeDriver }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [state, reduced, x]);
  return (
    <Animated.View
      style={{ transform: [{ translateX: x.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] }) }] }}
    >
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${label}${state === "right" ? ", matches" : state === "wrong" ? ", not this one" : ""}`}
        accessibilityState={{ selected: state === "right", disabled }}
        disabled={disabled}
        onPress={onPress}
        style={{
          width,
          padding: 3,
          borderWidth: state === "right" || state === "wrong" ? 5 : 2,
          borderColor: state === "wrong" ? C.coral : state === "right" ? C.teal : C.line,
          borderRadius: 18,
          backgroundColor: C.paper,
          alignItems: "center",
          overflow: "hidden",
          opacity: state === "wrong" || state === "faded" ? 0.4 : 1,
        }}
      >
        {children}
        {state === "right" && (
          <View
            style={{
              position: "absolute",
              right: 6,
              top: 6,
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: C.teal,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Copy style={{ color: "#FFFFFF", fontSize: 22, lineHeight: 26, fontWeight: "800" }}>✓</Copy>
          </View>
        )}
      </PressableScale>
    </Animated.View>
  );
}

export function Board(props: BoardProps<WhichOneState>) {
  if (isWhichClue(props.session.state)) {
    return <WhichClueBoard {...props} session={{ ...props.session, state: props.session.state }} />;
  }
  return <ClassicWhichBoard {...props} session={{ ...props.session, state: props.session.state }} />;
}

/** Levels 4–5 native multi-clue visual elimination board. Completely untimed. */
function WhichClueBoard({
  session,
  update,
  practice,
  sound,
  width,
  height,
  active,
  coach,
  cheer,
  assistance,
}: BoardProps<WhichOneState> & { session: { state: WhichClueState } }) {
  const s = session.state;
  const small = height < 730;
  useStepReveal(s.index);

  if (whichClueDone(s)) {
    return (
      <View style={{ alignItems: "center", padding: 16, gap: 10 }}>
        <PictureObject name="cat" size={96} />
        <Heading style={{ textAlign: "center" }}>Every clue checked!</Heading>
        <Copy style={{ color: C.ink, textAlign: "center" }}>
          You solved all {s.ids.length} multi-clue puzzles.
        </Copy>
      </View>
    );
  }

  const item = whichClueItem(s);
  if (!admittedReading(item, "Which One")) return <ReadingRefused />;
  const chips = clueChips(item);
  const answer = whichClueAnswer(s);
  const reader = session.names?.[whichClueTurn(s)] ?? `Player ${whichClueTurn(s) + 1}`;

  function pick(displayIdx: number) {
    if (!active) return;
    const next = whichCluePick(s, displayIdx);
    if (next === s) return;
    if (coach.active) coach.done();
    if (!s.helped && s.wrong.length === 0) {
      practice(item!.skill, next.solved);
      practice("read.meaning", next.solved);
    }
    if (next.solved) cheer(s.index === s.ids.length - 1 ? "big" : "right");
    else sound("which-one-look", true);
    update(next);
  }

  return (
    <View style={{ gap: small ? 8 : 12, maxWidth: Math.min(width, 620), width: "100%", alignSelf: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Copy style={{ fontSize: 13, fontWeight: "800", color: C.muted }}>
          Clue {s.index + 1} of {s.ids.length}
        </Copy>
        <View style={{ backgroundColor: C.soft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Copy style={{ fontSize: 12, fontWeight: "800", color: C.teal }}>{item.skillLabel}</Copy>
        </View>
      </View>

      {session.options.mode === "versus" && (
        <Copy style={{ color: C.teal, fontWeight: "800", fontSize: 19, textAlign: "center" }}>{reader}’s turn</Copy>
      )}

      <View
        style={{
          backgroundColor: C.paper,
          borderRadius: 20,
          borderWidth: 2,
          borderColor: C.line,
          padding: small ? 12 : 15,
          gap: 8,
        }}
      >
        <Copy style={{ fontSize: 13, fontWeight: "800", color: C.muted }}>READ EVERY CLUE</Copy>
        <View style={{ gap: 6 }}>
          {chips.map((clue, idx) => (
            <View
              key={`${item.id}-clue-${idx}`}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                backgroundColor: C.soft,
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 8,
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: C.coral,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Copy style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "900" }}>{idx + 1}</Copy>
              </View>
              <Copy style={{ flex: 1, fontSize: 16, lineHeight: 22, color: C.ink, fontWeight: "600" }}>{clue}</Copy>
            </View>
          ))}
        </View>
        <Copy style={{ fontSize: 18, fontWeight: "800", color: C.ink, marginTop: 2 }}>{item.prompt}</Copy>
      </View>

      {!s.solved && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Copy style={{ flex: 1, fontSize: 13, color: C.muted }}>
            Tap a card to choose it, or Cross out cards that break a clue.
          </Copy>
          {!s.helped && (
            <Button
              compact
              quiet
              disabled={!active}
              onPress={() => {
                if (!active) return;
                assistance?.();
                update(whichClueHelp(s));
              }}
            >
              Clue helper
            </Button>
          )}
        </View>
      )}

      {s.helped && !s.solved && (
        <View
          accessibilityLiveRegion="polite"
          style={{
            backgroundColor: C.soft,
            borderRadius: 14,
            borderWidth: 2,
            borderColor: C.gold,
            padding: 10,
          }}
        >
          <Copy style={{ fontSize: 14, fontWeight: "700", color: C.ink }}>{clueHintText(item)}</Copy>
        </View>
      )}

      <CoachSpot active={coach.active && !s.helped && !s.solved} handAt="none">
        <View style={{ gap: 8 }}>
          {s.orders[s.index].map((choiceIdx, displayIdx) => {
            const choice = item.choices[choiceIdx];
            const isRight = s.solved && displayIdx === answer;
            const isWrong = s.wrong.includes(displayIdx);
            const isCrossed = !s.solved && !isWrong && s.crossed.includes(displayIdx);
            return (
              <View
                key={`${item.id}-${choiceIdx}`}
                style={{
                  flexDirection: "row",
                  alignItems: "stretch",
                  gap: 8,
                }}
              >
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`${choice.label}${isRight ? ", matches every clue" : isWrong ? ", does not fit" : isCrossed ? ", crossed out" : ""}`}
                  accessibilityState={{ disabled: !active || s.solved || isWrong, selected: isRight }}
                  disabled={!active || s.solved || isWrong}
                  onPress={() => pick(displayIdx)}
                  style={{
                    flex: 1,
                    minHeight: 56,
                    borderRadius: 16,
                    borderWidth: isRight || isWrong ? 3 : 2,
                    borderColor: isRight ? C.teal : isWrong ? C.coral : C.line,
                    backgroundColor: isRight ? C.success : isWrong ? C.coralFill : isCrossed ? C.cream : C.paper,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    opacity: isWrong ? 0.5 : isCrossed ? 0.6 : 1,
                  }}
                >
                  <Copy
                    style={{
                      flex: 1,
                      fontSize: 16,
                      fontWeight: "700",
                      color: C.ink,
                      textDecorationLine: isCrossed || isWrong ? "line-through" : "none",
                    }}
                  >
                    {choice.label}
                  </Copy>
                  {isRight && <Copy style={{ color: C.teal, fontSize: 20, fontWeight: "900" }}>✓</Copy>}
                </PressableScale>
                {!s.solved && !isWrong && (
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={isCrossed ? `Restore ${choice.label}` : `Cross out ${choice.label}`}
                    accessibilityState={{ selected: isCrossed }}
                    disabled={!active}
                    onPress={() => active && update(whichClueToggleCross(s, displayIdx))}
                    style={{
                      minWidth: 52,
                      minHeight: 56,
                      borderRadius: 16,
                      borderWidth: 2,
                      borderColor: isCrossed ? C.teal : C.line,
                      backgroundColor: isCrossed ? C.soft : C.paper,
                      paddingHorizontal: 10,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Copy style={{ fontSize: 13, fontWeight: "800", color: isCrossed ? C.teal : C.muted }}>
                      {isCrossed ? "Undo" : "✕"}
                    </Copy>
                  </PressableScale>
                )}
              </View>
            );
          })}
        </View>
      </CoachSpot>

      {s.solved && (
        <View
          accessibilityLiveRegion="polite"
          style={{
            backgroundColor: C.success,
            borderRadius: 16,
            borderWidth: 2,
            borderColor: C.teal,
            padding: 12,
            gap: 8,
          }}
        >
          <Copy style={{ fontSize: 15, fontWeight: "700", color: C.ink }}>{item.explanation}</Copy>
          <Button disabled={!active} onPress={() => update(whichClueNext(s))}>
            {s.index === s.ids.length - 1 ? "Finish" : "Next clue"}
          </Button>
        </View>
      )}
    </View>
  );
}

function ClassicWhichBoard({
  session,
  update,
  practice,
  sound,
  soundOn,
  width,
  height,
  active,
  coach,
  cheer,
  assistance,
}: BoardProps<WhichOneState> & { session: { state: WhichState } }) {
  const s = session.state;
  // Pictures already tried on this sentence step back (the save keeps only the latest).
  const [out, setOut] = useState<{ index: number; picks: number[] }>({ index: s.index, picks: [] });
  const tried = out.index === s.index ? out.picks : [];
  // The next sentence opens at the top of the board, above the pictures she just chose from.
  useStepReveal(s.index);

  if (s.index === 8)
    return (
      <View style={{ alignItems: "center", padding: 16, gap: 10 }}>
        <PictureObject name="cat" size={100} />
        <Heading style={{ textAlign: "center" }}>Every word has its picture.</Heading>
        <Copy style={{ color: C.ink, textAlign: "center" }}>You read all eight sentences.</Copy>
      </View>
    );
  // The sentence is the pinned inherited record for this saved id. Anything else is refused before a word or picture
  // is shown, spoken or credited.
  const item = whichItem(s);
  if (!admittedReading(item, "Which One")) return <ReadingRefused />;
  const correct = item.scenes[0],
    wrong = s.wrong === null ? null : item.scenes[s.orders[s.index][s.wrong]];
  const changed = wrong
    ? (["subject", "object", "relation", "color", "size"] as const).find((k) => wrong[k] !== correct[k])
    : undefined;
  const highlight = changed && !s.solved ? correct[changed] : undefined;
  const small = height < 730,
    room = Math.min(width, 900),
    across = room >= 600 ? 3 : 2,
    cardWidth = Math.min(250, (room - 10 * (across - 1)) / across),
    pictureHeight = Math.round(cardWidth * (small ? 0.6 : 0.72));
  const reader = session.names?.[(s.starter + s.index) % 2] ?? `Player ${((s.starter + s.index) % 2) + 1}`;
  const answer = whichAnswer(s);

  function pick(i: number) {
    if (!active) return;
    const next = whichPick(s, i);
    if (next === s) return;
    if (coach.active) coach.done();
    // Only the first pick on each sentence counts as practice.
    if (!s.tried) {
      practice(item.skill, next.solved);
      practice("read.meaning", next.solved);
    }
    if (next.solved) cheer(s.index === 7 ? "big" : "right");
    else {
      sound("which-one-look", true);
      setOut({ index: s.index, picks: [...tried, i] });
    }
    update(next);
  }

  const cards = s.orders[s.index].map((sceneIndex, i) => {
    const isWrong = tried.includes(i) || s.wrong === i;
    return (
      <Card
        key={`${s.index}-${i}`}
        label={`Picture ${i + 1}: ${sceneLabel(item.scenes[sceneIndex])}`}
        width={cardWidth}
        state={s.solved ? (i === answer ? "right" : "faded") : isWrong ? "wrong" : "idle"}
        disabled={s.solved || isWrong || !active}
        onPress={() => pick(i)}
      >
        <Scene scene={item.scenes[sceneIndex]} width={cardWidth - 10} height={pictureHeight} />
      </Card>
    );
  });
  const grid =
    across === 3 ? (
      <View style={{ flexDirection: "row", gap: 10 }}>{cards}</View>
    ) : (
      <View style={{ gap: 10, alignItems: "center" }}>
        <View style={{ flexDirection: "row", gap: 10 }}>{cards.slice(0, 2)}</View>
        {cards[2]}
      </View>
    );

  return (
    <View style={{ gap: small ? 8 : 12, alignItems: "center" }}>
      {session.options.mode === "versus" && (
        <Copy style={{ color: C.teal, fontWeight: "800", fontSize: 22, textAlign: "center" }}>{reader} reads</Copy>
      )}
      <Copy style={{ fontSize: 13, color: C.muted }}>{s.index + 1} of 8</Copy>
      <ReadingText
        record={item}
        highlight={highlight}
        onWord={(_, word) => {
          if (active && soundOn) {
            if (!s.solved) { update(whichHelp(s)); assistance?.(); }
            sound(wordAudio(word));
          }
        }}
      />
      <Copy style={{ fontSize: 18, fontWeight: "700", textAlign: "center", color: C.ink }}>
        {s.solved ? "Yes! That’s the one." : s.wrong !== null ? "Look at the glowing word." : "Read it. Which picture matches?"}
      </Copy>
      {/* Reading is never timed: the next sentence waits for the child to press Next. */}
      {s.solved && (
        <Button disabled={!active} onPress={() => update(whichNext(s))}>
          {s.index === 7 ? "Finish" : "Next"}
        </Button>
      )}
      {!s.solved && (
        <Button compact quiet icon="sound-on" disabled={!soundOn || !active}
          onPress={() => { update(whichHelp(s)); assistance?.(); sound(`which-one-sentence-${item.id}`); }}>
          Hear it
        </Button>
      )}
      {!s.solved && <Copy style={{ fontSize: 14, textAlign: "center" }}>Read it yourself, or ask to hear it. Help counts.</Copy>}
      <CoachSpot active={coach.active && !s.tried && !s.solved} handAt="none">
        {grid}
      </CoachSpot>
    </View>
  );
}
export function Art({ size }: { size: number }) {
  return <PictureObject name="cat" size={size} />;
}
