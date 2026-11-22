import React, { useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { Text } from "../../components/Text";
import { Button, C, Chip, Copy, PressableScale, font } from "../../components/ui";
import { CHROME_MAX, atLarge, wordFitMultiplier } from "../../components/wordFit";
import { useSounds } from "../../components/Audio";
import { useStore } from "../../state/Store";
import type { ChallengeViewProps } from "../../challenge/types";
import { Piece } from "../Art";
import { boardFromMines } from "./redraw";
import { coordinate } from "./solver";
import { bandMeta, challengeHintStep, type Action, type State } from "./challenge";

/**
 * Tiered deduction Challenge board for Reef Sweep (BD-09, BK-21).
 * Uses the exact same public-constraint deduction solver and 4-step hint ladder
 * (Look -> Think -> One step -> Show me) as live Reef Sweep.
 */
export function ReefChallengeBoard({ state: s, dispatch, active, width }: ChallengeViewProps<State, Action>) {
  const store = useStore();
  const play = useSounds(store.save.settings.sound);
  const { fontScale } = useWindowDimensions();
  const [flagMode, setFlagMode] = useState(false);

  const d = s.descriptor;
  const board = boardFromMines(d.size, d.mines);
  const unopened = !s.marks.includes(1);
  const solved = s.outcome === 0;
  const hitUrchin = s.outcome === 1;
  const pearlsFound = s.marks.filter((m, i) => m === 1 && board[i] !== -1).length;
  const totalPearls = d.size * d.size - d.mines.length;
  const flagsPlaced = s.marks.filter((m) => m === 2).length;
  const meta = bandMeta[d.band] ?? bandMeta["single-5"];

  const cell = Math.max(42, Math.min(Math.floor(width / d.size), 58));
  const buttonCap = atLarge(fontScale, 1.3);
  const copyCap = atLarge(fontScale, CHROME_MAX);

  const send = (action: Action, tone: "tap" | "match" | "win" = "tap") => {
    if (!active) return;
    play(tone);
    dispatch(action);
  };

  const nextHintLabel =
    s.hintStage === null
      ? "Hint · Look"
      : s.hintStage === 0
        ? "Hint · Think"
        : s.hintStage === 1
          ? "Hint · One step"
          : "Hint · Show me";

  const askHint = () => {
    if (!active || solved || hitUrchin) return;
    if (s.hintStage === null) {
      send(["h", 0]);
    } else if (s.hintStage === 0) {
      send(["h", 1]);
    } else if (s.hintStage === 1) {
      send(["h", 2]);
    } else {
      const step = challengeHintStep(s);
      if (step) send(["ho", step.cell], "match");
    }
  };

  const hintFocus = s.hintStage !== null && s.hintStep ? s.hintStep.clues : [];
  const hintCell = s.hintStage === 2 && s.hintStep ? s.hintStep.cell : null;
  const hintText =
    s.hintStage !== null && s.hintStep
      ? s.hintStage === 0
        ? s.hintStep.reason.look
        : s.hintStage === 1
          ? s.hintStep.reason.think
          : s.hintStep.reason.oneStep
      : "";

  const statusLine = solved
    ? `Every pearl found in ${s.opens} ${s.opens === 1 ? "opening" : "openings"}!`
    : hitUrchin
      ? `An urchin lives at ${s.lastHit !== null ? coordinate(d.size, s.lastHit) : "that space"}. Tap Undo or Start again — take your time.`
      : unopened
        ? `Tap the ringed safe start at ${coordinate(d.size, d.start)} to begin this no-guess reef.`
        : `${d.mines.length} sea urchins · ${flagsPlaced} flags · ${pearlsFound} of ${totalPearls} pearls`;

  return (
    <View style={{ gap: 10, alignItems: "center" }}>
      <Copy
        accessibilityLiveRegion="polite"
        maxFontSizeMultiplier={copyCap}
        style={{ color: C.ink, fontSize: 15, alignSelf: "stretch", textAlign: "center" }}
      >
        {statusLine}
      </Copy>
      <Copy maxFontSizeMultiplier={copyCap} style={{ fontSize: 13, textAlign: "center" }}>
        {meta.detail}
      </Copy>

      {!solved && !hitUrchin && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          <Chip maxFontSizeMultiplier={buttonCap} selected={!flagMode} onPress={() => setFlagMode(false)}>
            Open pearls
          </Chip>
          <Chip maxFontSizeMultiplier={buttonCap} selected={flagMode} onPress={() => setFlagMode(true)}>
            Flag urchins
          </Chip>
        </View>
      )}

      <View
        style={{
          width: cell * d.size,
          backgroundColor: "#CADFD0",
          borderRadius: 18,
          overflow: "hidden",
        }}
      >
        {Array.from({ length: d.size }, (_, r) => (
          <View key={r} style={{ flexDirection: "row" }}>
            {Array.from({ length: d.size }, (_, c) => {
              const i = r * d.size + c;
              const revealed = s.marks[i] === 1;
              const marked = s.marks[i] === 2;
              const showUrchin = s.outcome !== null && board[i] === -1;
              const isStart = unopened && i === d.start;
              const isHintCell = hintCell === i;
              const isFocusedClue = hintFocus.includes(i);
              const disabled = !active || solved || hitUrchin || revealed || (unopened && !flagMode && !marked && i !== d.start);
              const coord = coordinate(d.size, i);
              const label = `Reef ${coord}, ${
                showUrchin
                  ? "sea urchin"
                  : revealed
                    ? `${board[i]} neighboring urchins`
                    : marked
                      ? isStart
                        ? "safe start, flag"
                        : "flag"
                      : isStart
                        ? "safe start, closed"
                        : "closed"
              }`;

              return (
                <PressableScale
                  key={c}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ disabled }}
                  disabled={disabled}
                  onPress={() => {
                    if (flagMode || marked) send(["f", i], "tap");
                    else send(["o", i], "match");
                  }}
                  onLongPress={() => {
                    if (!revealed && !solved && !hitUrchin) send(["f", i], "tap");
                  }}
                  style={{
                    width: cell - 4,
                    height: cell - 4,
                    minHeight: 40,
                    margin: 2,
                    borderRadius: 10,
                    backgroundColor: showUrchin
                      ? "#EBD7E0"
                      : revealed
                        ? "#FAF5E6"
                        : marked
                          ? "#EDDBB6"
                          : isStart
                            ? "#548C78"
                            : "#64947C",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: isHintCell || isStart || isFocusedClue ? 3 : 1,
                    borderColor: isHintCell || isStart ? "#B77725" : isFocusedClue ? C.teal : "#36674F",
                  }}
                >
                  {showUrchin ? (
                    <Piece kind="urchin" size={cell - 12} />
                  ) : marked ? (
                    <Piece kind="flag" size={cell - 12} />
                  ) : revealed ? (
                    board[i] === 0 ? (
                      <Piece kind="pearl" size={cell - 14} />
                    ) : (
                      <Text
                        maxFontSizeMultiplier={1.25}
                        style={{
                          color: board[i] === 1 ? C.blue : board[i] === 2 ? C.teal : C.error,
                          fontSize: Math.min(22, Math.floor(cell * 0.48)),
                          fontFamily: font,
                          fontWeight: "800",
                          textAlign: "center",
                        }}
                      >
                        {board[i]}
                      </Text>
                    )
                  ) : isStart ? (
                    <Piece kind="pearl" size={Math.max(18, cell - 20)} />
                  ) : (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#D1E7C8" }} />
                  )}
                </PressableScale>
              );
            })}
          </View>
        ))}
      </View>

      {!!hintText && (
        <Copy
          accessibilityLiveRegion="polite"
          maxFontSizeMultiplier={atLarge(fontScale, wordFitMultiplier(hintText, 15, width - 24, CHROME_MAX))}
          style={{ padding: 12, backgroundColor: C.sand, borderRadius: 12, color: C.ink, alignSelf: "stretch" }}
        >
          {hintText}
        </Copy>
      )}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {!solved && !hitUrchin && (
          <Button quiet compact maxFontSizeMultiplier={buttonCap} disabled={!active} onPress={askHint}>
            {nextHintLabel}
          </Button>
        )}
        <Button
          quiet
          compact
          maxFontSizeMultiplier={buttonCap}
          disabled={!active || !s.history.length || solved}
          onPress={() => send(["u"], "tap")}
        >
          Undo
        </Button>
        <Button
          quiet
          compact
          maxFontSizeMultiplier={buttonCap}
          disabled={!active || (!s.history.length && s.hintStage === null) || solved}
          onPress={() => send(["z"], "tap")}
        >
          Start again
        </Button>
      </View>
      <Copy maxFontSizeMultiplier={copyCap} style={{ fontSize: 12, textAlign: "center" }}>
        Press and hold any closed tile to toggle a flag. No guessing required.
      </Copy>
    </View>
  );
}
