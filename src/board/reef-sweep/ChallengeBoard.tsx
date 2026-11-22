import React, { useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const { width: winW, height: winH, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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

  // Hold Look -> Think -> One step in local UI state keyed to board state so Help only logs one
  // idempotent ["h", 0] marker + 1 board-mutating ["ho", cell] per Show me (P1-1).
  const boardSig = `${s.opens}:${s.history.length}:${s.outcome}:${s.marks.join("")}`;
  const [localHint, setLocalHint] = useState<{ sig: string; stage: 0 | 1 | 2 } | null>(null);
  const effectiveStage: 0 | 1 | 2 | null = localHint?.sig === boardSig ? localHint.stage : s.hintStage;
  const activeStep = effectiveStage !== null ? (s.hintStep ?? challengeHintStep(s)) : null;

  const large = fontScale >= 1.5;
  const wide = winW >= 660 && winW > winH;
  const compactPhone = !wide && large && winH < 920;
  const shortLandscape = wide && winH < 500;

  // ChallengeFrame clamps content to maxWidth 1080 inside SafeAreaView with 20pt horizontal padding.
  const innerW = Math.max(240, Math.min(width, Math.min(1080, winW - insets.left - insets.right) - 40));
  const usableH = Math.max(280, winH - insets.top - insets.bottom);
  const boardColW = wide
    ? Math.min(Math.floor((innerW - 12) * 0.52), shortLandscape ? Math.max(280, usableH - 72) : 406)
    : innerW;
  const leftColW = wide ? Math.max(220, innerW - 12 - boardColW) : innerW;
  const maxCell = compactPhone ? 44 : shortLandscape ? Math.floor((usableH - 72) / d.size) : 58;
  const minCell = shortLandscape ? 40 : 42;
  const cell = Math.max(minCell, Math.min(Math.floor(boardColW / d.size), maxCell));
  const buttonCap = atLarge(fontScale, compactPhone || shortLandscape ? 1.2 : 1.3);
  const copyCap = atLarge(fontScale, compactPhone || shortLandscape ? 1.25 : CHROME_MAX);

  const send = (action: Action, tone: "tap" | "match" | "win" = "tap") => {
    if (!active) return;
    play(tone);
    dispatch(action);
  };

  const nextHintLabel =
    effectiveStage === null
      ? "Hint · Look"
      : effectiveStage === 0
        ? "Hint · Think"
        : effectiveStage === 1
          ? "Hint · One step"
          : "Hint · Show me";

  const askHint = () => {
    if (!active || solved || hitUrchin) return;
    const step = challengeHintStep(s);
    if (!step) return;
    if (effectiveStage === null) {
      setLocalHint({ sig: boardSig, stage: 0 });
      send(["h", 0]);
    } else if (effectiveStage === 0) {
      setLocalHint({ sig: boardSig, stage: 1 });
      play("tap");
    } else if (effectiveStage === 1) {
      setLocalHint({ sig: boardSig, stage: 2 });
      if (step.kind === "flag") setFlagMode(true);
      else if (step.kind === "open") setFlagMode(false);
      play("tap");
    } else {
      setLocalHint(null);
      send(["ho", step.cell], "match");
    }
  };

  const hintFocus = effectiveStage !== null && activeStep ? activeStep.clues : [];
  const hintCell = effectiveStage === 2 && activeStep ? activeStep.cell : null;
  const hintText =
    effectiveStage !== null && activeStep
      ? effectiveStage === 0
        ? activeStep.reason.look
        : effectiveStage === 1
          ? activeStep.reason.think
          : activeStep.reason.oneStep
      : "";

  const statusLine = solved
    ? `Every pearl found in ${s.opens} ${s.opens === 1 ? "opening" : "openings"}!`
    : hitUrchin
      ? `An urchin lives at ${s.lastHit !== null ? coordinate(d.size, s.lastHit) : "that space"}. Tap Undo or Start again — take your time.`
      : unopened
        ? `Tap the ringed safe start at ${coordinate(d.size, d.start)} to begin.`
        : compactPhone || shortLandscape
          ? `${d.mines.length} urchins · ${flagsPlaced} flags · ${pearlsFound}/${totalPearls} pearls`
          : `${d.mines.length} sea urchins · ${flagsPlaced} flags · ${pearlsFound} of ${totalPearls} pearls`;

  const modeChips = !solved && !hitUrchin && (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
      <Chip maxFontSizeMultiplier={buttonCap} selected={!flagMode} onPress={() => setFlagMode(false)}>
        Open pearls
      </Chip>
      <Chip maxFontSizeMultiplier={buttonCap} selected={flagMode} onPress={() => setFlagMode(true)}>
        Flag urchins
      </Chip>
    </View>
  );

  const actionRow = (
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
        onPress={() => {
          setLocalHint(null);
          send(["u"], "tap");
        }}
      >
        Undo
      </Button>
      <Button
        quiet
        compact
        maxFontSizeMultiplier={buttonCap}
        disabled={!active || (!s.history.length && effectiveStage === null) || solved}
        onPress={() => {
          setLocalHint(null);
          if (s.history.length > 0 || s.hintStage !== null) send(["z"], "tap");
          else play("tap");
        }}
      >
        Start again
      </Button>
    </View>
  );

  const hintBanner = !!hintText && (
    <Copy
      accessibilityLiveRegion="polite"
      maxFontSizeMultiplier={atLarge(
        fontScale,
        wordFitMultiplier(hintText, compactPhone || shortLandscape ? 13 : 15, (wide ? leftColW : innerW) - 20, compactPhone || shortLandscape ? 1.2 : CHROME_MAX)
      )}
      style={{
        padding: compactPhone || shortLandscape ? 8 : 12,
        backgroundColor: C.sand,
        borderRadius: 12,
        color: C.ink,
        fontSize: compactPhone || shortLandscape ? 13 : 15,
        lineHeight: compactPhone || shortLandscape ? 18 : 22,
        alignSelf: "stretch",
      }}
    >
      {hintText}
    </Copy>
  );

  const gridView = (
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
                  setLocalHint(null);
                  if (flagMode || marked) send(["f", i], "tap");
                  else send(["o", i], "match");
                }}
                onLongPress={() => {
                  if (!revealed && !solved && !hitUrchin) {
                    setLocalHint(null);
                    send(["f", i], "tap");
                  }
                }}
                style={{
                  width: cell - 4,
                  height: cell - 4,
                  minHeight: Math.min(40, cell - 4),
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
  );

  if (wide) {
    return (
      <View style={{ flexDirection: "row", gap: 12, width: "100%", alignItems: "flex-start", justifyContent: "center" }}>
        <View style={{ flex: 1, minWidth: 0, gap: 8, alignItems: "center" }}>
          <Copy
            accessibilityLiveRegion="polite"
            maxFontSizeMultiplier={copyCap}
            style={{ color: C.ink, fontSize: shortLandscape ? 14 : 15, alignSelf: "stretch", textAlign: "center" }}
          >
            {statusLine}
          </Copy>
          {modeChips}
          {actionRow}
          {hintBanner}
          {!shortLandscape && (
            <Copy maxFontSizeMultiplier={copyCap} style={{ fontSize: 13, textAlign: "center" }}>
              {meta.detail}
            </Copy>
          )}
        </View>
        <View style={{ width: boardColW, minWidth: 0, alignItems: "center" }}>
          {gridView}
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: compactPhone ? 6 : 10, alignItems: "center", width: "100%" }}>
      <Copy
        accessibilityLiveRegion="polite"
        maxFontSizeMultiplier={copyCap}
        style={{ color: C.ink, fontSize: compactPhone ? 13 : 15, alignSelf: "stretch", textAlign: "center" }}
      >
        {statusLine}
      </Copy>
      {!compactPhone && (
        <Copy maxFontSizeMultiplier={copyCap} style={{ fontSize: 13, textAlign: "center" }}>
          {meta.detail}
        </Copy>
      )}
      {modeChips}
      {gridView}
      {compactPhone ? (
        <>
          {actionRow}
          {hintBanner}
          <Copy maxFontSizeMultiplier={copyCap} style={{ fontSize: 12, textAlign: "center" }}>
            {meta.detail}
          </Copy>
        </>
      ) : (
        <>
          {hintBanner}
          {actionRow}
        </>
      )}
      <Copy maxFontSizeMultiplier={copyCap} style={{ fontSize: 12, textAlign: "center" }}>
        Press and hold any closed tile to toggle a flag. No guessing required.
      </Copy>
    </View>
  );
}
