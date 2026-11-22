import React, { useState } from "react";
import { View, useWindowDimensions } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { ChallengeViewProps } from "../../../challenge/types";
import { Button, C, Copy, PressableScale } from "../../../components/ui";
import { atLarge } from "../../../components/wordFit";
import { PatternGlyph, patternLabel } from "../thinkingArt";
import {
  CHECK,
  HELP,
  RESET,
  UNDO,
  challengeHint,
  completeDraft,
  gapAction,
  hinted,
  ruleAction,
  type Action,
  type State,
} from "./challenge-engine";
import { RULE_BY_ID } from "./rules";

export function ChallengeBoard({ state, dispatch, active, width }: ChallengeViewProps<State, Action>) {
  const p = state.descriptor.payload;
  const { fontScale } = useWindowDimensions();
  const buttonCap = atLarge(fontScale, 1.35);
  const [gapSelection, setGapSelection] = useState<{ desc: typeof state.descriptor; slot: number }>({
    desc: state.descriptor,
    slot: 0,
  });
  const selectedGapSlot = gapSelection.desc === state.descriptor ? gapSelection.slot : 0;
  const setSelectedGapSlot = (slot: number) => setGapSelection({ desc: state.descriptor, slot });

  // Keep selectedGapSlot pointing at a valid gap slot (or auto-advance to first unfilled gap).
  const activeSlot = selectedGapSlot < p.gaps.length ? selectedGapSlot : 0;

  const trailWidth = Math.min(Math.max(width - 28, 268), 430);
  const trailHeight = 292;
  const left = 36, middle = trailWidth / 2, right = trailWidth - 36;
  const matrix = p.tiles.length === 9;
  const points: [number, number][] = matrix
    ? Array.from({ length: 9 }, (_, i) => [[left, middle, right][i % 3], [46, 143, 240][Math.floor(i / 3)]])
    : [[left, 46], [middle, 46], [right, 46], [right, 143], [middle, 143], [left, 143], [left, 240], [middle, 240], [right, 240]];

  const ready = completeDraft(state);
  const hintInfo = challengeHint(state);

  const pickChoice = (choiceIdx: number) => {
    if (!active || state.won) return;
    dispatch(gapAction(activeSlot, choiceIdx));
    // For two-gap puzzles, move focus to the other unfilled gap so the child doesn't have to tap twice.
    if (p.gaps.length > 1) {
      const other = p.gaps.findIndex((_, slot) => slot !== activeSlot && state.picks[slot] < 0);
      if (other >= 0) setSelectedGapSlot(other);
    }
  };

  const applyHintStep = () => {
    if (!active || state.won) return;
    if (state.hintStage < 2) {
      dispatch(HELP);
    } else if (hintInfo.nextAction !== null) {
      dispatch(hinted(hintInfo.nextAction));
    } else {
      dispatch(HELP);
    }
  };

  const helpLabel =
    state.hintStage === 0
      ? "Look (rule clue)"
      : state.hintStage === 1
        ? "Think (how to apply)"
        : hintInfo.nextAction !== null
          ? "One step"
          : "Rule shown";

  return (
    <View style={{ gap: 14, paddingVertical: 6 }}>
      <Copy style={{ color: C.ink, fontSize: 20, fontWeight: "900" }}>{state.descriptor.title}</Copy>

      <View style={{ backgroundColor: "#E4EED9", borderRadius: 24, paddingVertical: 12, alignItems: "center", overflow: "hidden" }}>
        <Copy maxFontSizeMultiplier={1.4} style={{ color: "#365034", fontWeight: "900", alignSelf: "flex-start", marginLeft: 16 }}>
          {matrix ? "3 × 3 PATTERN GRID" : p.gaps.length > 1 ? "TWO-GAP TRAIL" : "PATTERN TRAIL"}
        </Copy>
        <View style={{ width: trailWidth, height: trailHeight, marginTop: 6 }}>
          {!matrix && (
            <Svg width={trailWidth} height={trailHeight} style={{ position: "absolute" }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Path d={`M${left} 46 Q${middle} 25 ${right} 46 C${trailWidth + 3} 78 ${trailWidth + 3} 111 ${right} 143 Q${middle} 165 ${left} 143 C-3 177 -3 211 ${left} 240 Q${middle} 219 ${right} 240`} fill="none" stroke="#A4C69B" strokeWidth="18" strokeLinecap="round" />
              <Path d={`M${left} 46 Q${middle} 25 ${right} 46 C${trailWidth + 3} 78 ${trailWidth + 3} 111 ${right} 143 Q${middle} 165 ${left} 143 C-3 177 -3 211 ${left} 240 Q${middle} 219 ${right} 240`} fill="none" stroke="#F8F2D9" strokeWidth="5" strokeDasharray="4 12" strokeLinecap="round" />
            </Svg>
          )}
          {p.tiles.map((tile, i) => {
            const [x, y] = points[i];
            const gapSlot = p.gaps.indexOf(i);
            const isGap = gapSlot >= 0;
            const pickedIdx = isGap ? state.picks[gapSlot] : -1;
            const pickedTile = pickedIdx >= 0 ? p.choices[pickedIdx] : null;
            const selected = isGap && gapSlot === activeSlot && !state.won;

            const inner = (
              <>
                {isGap ? (
                  pickedTile ? (
                    <PatternGlyph token={pickedTile} size={pickedTile.startsWith("shells:") ? 38 : 42} />
                  ) : (
                    <>
                      <Svg width={39} height={39} viewBox="0 0 40 40" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                        <Circle cx="20" cy="20" r="17" fill="#FFF9E5" stroke="#E9C36C" strokeWidth="2" strokeDasharray="3 3" />
                      </Svg>
                      <Copy maxFontSizeMultiplier={1.4} style={{ position: "absolute", color: "#8E6B2C", fontSize: 20, fontWeight: "900" }}>?</Copy>
                    </>
                  )
                ) : (
                  <PatternGlyph token={tile} size={tile.startsWith("shells:") ? 38 : 42} />
                )}
                <View style={{ position: "absolute", right: -7, bottom: -8, width: 20, height: 20, borderRadius: 10, backgroundColor: selected ? "#B97D19" : "#3D6549", alignItems: "center", justifyContent: "center" }}>
                  <Copy maxFontSizeMultiplier={1.2} style={{ color: "#FFFDF3", fontSize: 11, fontWeight: "900" }}>{i + 1}</Copy>
                </View>
              </>
            );

            const boxStyle = {
              position: "absolute" as const,
              left: x - 29,
              top: y - 29,
              width: 58,
              height: 58,
              borderRadius: 19,
              alignItems: "center" as const,
              justifyContent: "center" as const,
              backgroundColor: state.won && isGap ? "#E2F4DF" : isGap ? (selected ? "#FFF0B8" : "#FFF8DB") : "#FFFDF3",
              borderWidth: selected ? 3.5 : isGap ? 2.5 : 2,
              borderColor: state.won && isGap ? "#3D7E4A" : selected ? "#C6861E" : isGap ? "#D6A53C" : "#789C75",
            };

            if (isGap && p.gaps.length > 1) {
              return (
                <PressableScale
                  key={i}
                  testID={`pattern-gap-${gapSlot}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Gap stone ${i + 1}${pickedTile ? `, filled with ${patternLabel(pickedTile)}` : ", empty"}${selected ? ", selected" : ""}`}
                  disabled={!active || state.won}
                  onPress={() => setSelectedGapSlot(gapSlot)}
                  style={boxStyle}
                >
                  {inner}
                </PressableScale>
              );
            }

            return (
              <View
                key={i}
                accessible
                accessibilityLabel={isGap ? `Gap stone ${i + 1}${pickedTile ? `, filled with ${patternLabel(pickedTile)}` : ", empty"}` : `Stone ${i + 1}: ${patternLabel(tile)}`}
                style={boxStyle}
              >
                {inner}
              </View>
            );
          })}
        </View>
      </View>

      {p.ruleChoices && (
        <View style={{ gap: 8 }}>
          <Copy maxFontSizeMultiplier={1.5} style={{ color: C.ink, fontWeight: "900", fontSize: 16 }}>
            1. Say the rule
          </Copy>
          <View style={{ gap: 8 }}>
            {p.ruleChoices.map((id, idx) => {
              const chosen = state.rulePick === idx;
              return (
                <PressableScale
                  key={id}
                  testID={`pattern-rule-${idx}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: chosen }}
                  disabled={!active || state.won}
                  onPress={() => dispatch(ruleAction(idx))}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, minHeight: 46,
                    backgroundColor: chosen ? "#DCEFD6" : "#FFFDF4",
                    borderWidth: chosen ? 2.5 : 1.5,
                    borderColor: chosen ? "#3D7E4A" : "#9BB593",
                    justifyContent: "center",
                  }}
                >
                  <Copy maxFontSizeMultiplier={1.5} style={{ color: C.ink, fontWeight: chosen ? "900" : "700", fontSize: 15 }}>
                    {RULE_BY_ID[id].card}
                  </Copy>
                </PressableScale>
              );
            })}
          </View>
        </View>
      )}

      <View style={{ gap: 8 }}>
        <Copy maxFontSizeMultiplier={1.5} style={{ color: C.ink, fontWeight: "900", fontSize: 16 }}>
          {p.ruleChoices ? "2. Pick the missing stone" : p.gaps.length > 1 ? `Pick stone for gap ${p.gaps[activeSlot] + 1}` : "Pick the missing stone"}
        </Copy>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {p.choices.map((tile, idx) => {
            const chosen = state.picks[activeSlot] === idx;
            return (
              <PressableScale
                key={`${tile}-${idx}`}
                testID={`pattern-ch-choice-${idx}`}
                accessibilityRole="button"
                accessibilityState={{ selected: chosen }}
                accessibilityLabel={`Choose ${patternLabel(tile)}`}
                disabled={!active || state.won}
                onPress={() => pickChoice(idx)}
                style={{
                  minWidth: 66, minHeight: 62, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 18,
                  alignItems: "center", justifyContent: "center",
                  backgroundColor: chosen ? "#DCEFD6" : "#FFFDF2",
                  borderWidth: chosen ? 3 : 2,
                  borderColor: chosen ? "#3D7E4A" : "#7C9C75",
                }}
              >
                <PatternGlyph token={tile} size={42} />
              </PressableScale>
            );
          })}
        </View>
      </View>

      {state.lastWrongCount !== null && !state.won && (
        <Copy accessibilityLiveRegion="polite" style={{ color: "#965633", fontWeight: "800" }}>
          {state.lastWrongCount === 1
            ? "1 choice needs another look. Your draft is kept — adjust it and tap Check."
            : `${state.lastWrongCount} choices need another look. Your draft is kept — adjust them and tap Check.`}
        </Copy>
      )}

      {!state.won && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <Button
            disabled={!active || !ready || state.checked}
            maxFontSizeMultiplier={buttonCap}
            onPress={() => dispatch(CHECK)}
          >
            Check
          </Button>
          <Button
            quiet
            disabled={!active || state.stack.length === 0}
            maxFontSizeMultiplier={buttonCap}
            onPress={() => dispatch(UNDO)}
          >
            Undo
          </Button>
          <Button
            quiet
            disabled={!active || (state.picks.every((v) => v < 0) && state.rulePick < 0)}
            maxFontSizeMultiplier={buttonCap}
            onPress={() => dispatch(RESET)}
          >
            Clear
          </Button>
          <Button
            quiet
            disabled={!active}
            maxFontSizeMultiplier={buttonCap}
            onPress={applyHintStep}
          >
            {helpLabel}
          </Button>
        </View>
      )}

      {state.hintStage > 0 && !state.won && (
        <View testID="pattern-ch-hint" style={{ backgroundColor: "#F4F8EC", borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: "#BFD4B4" }}>
          <Copy accessibilityLiveRegion="polite" style={{ color: C.ink, fontSize: 15 }}>
            {hintInfo.text}
          </Copy>
        </View>
      )}
    </View>
  );
}
