import React, { useEffect, useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useReducedMotion } from "../../../components/motion";
import { C, Copy, PressableScale } from "../../../components/ui";
import { atLarge } from "../../../components/wordFit";
import type { BoardProps } from "../../types";
import { PatternGlyph, patternLabel, SeaGlyph } from "../thinkingArt";
import { help, hintText, place, taskAt, type PatternState } from "./engine";
import { LegacyBoard } from "./legacy-view";

export function Board(props: BoardProps<PatternState>) {
  if (props.session.state.version === 1) {
    return <LegacyBoard {...(props as BoardProps<Extract<PatternState, { version: 1 }>>)} />;
  }
  return <PatternBoardV2 {...props} stateV2={props.session.state} />;
}

function PatternBoardV2({ stateV2: s, update, practice, assistance, cheer, coach, active, width }: BoardProps<PatternState> & { stateV2: Extract<PatternState, { version: 2 }> }) {
  const task = taskAt(s);
  const reduced = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  const buttonCap = atLarge(fontScale, 1.4);
  const [wrongAt, setWrongAt] = useState<number | null>(null);
  const [freshMsg, setFreshMsg] = useState(false);
  const [hopAt, setHopAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const wrong = wrongAt === s.index;

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const compact = width < 420;
  const trailWidth = Math.min(Math.max(width - 32, 268), 430);
  const rowYs: [number, number, number] = compact ? [34, 106, 178] : [46, 142, 238];
  const trailHeight = compact ? 212 : 284;
  const stoneBox = compact ? 50 : 58;
  const half = stoneBox / 2;
  const left = 36, middle = trailWidth / 2, right = trailWidth - 36;
  const matrix = task.tiles.length === 9;
  const points: [number, number][] = matrix
    ? Array.from({ length: 9 }, (_, i) => [[left, middle, right][i % 3], rowYs[Math.floor(i / 3)]])
    : [
        [left, rowYs[0]], [middle, rowYs[0]], [right, rowYs[0]],
        [right, rowYs[1]], [middle, rowYs[1]], [left, rowYs[1]],
        [left, rowYs[2]], [middle, rowYs[2]], [right, rowYs[2]],
      ];
  const trailPath = `M${left} ${rowYs[0]} Q${middle} ${rowYs[0] - 18} ${right} ${rowYs[0]} C${trailWidth + 3} ${Math.round((rowYs[0] + rowYs[1]) * 0.43)} ${trailWidth + 3} ${Math.round((rowYs[0] + rowYs[1]) * 0.6)} ${right} ${rowYs[1]} Q${middle} ${rowYs[1] + 18} ${left} ${rowYs[1]} C-3 ${Math.round((rowYs[1] + rowYs[2]) * 0.46)} -3 ${Math.round((rowYs[1] + rowYs[2]) * 0.56)} ${left} ${rowYs[2]} Q${middle} ${rowYs[2] - 18} ${right} ${rowYs[2]}`;

  const choose = (tile: string) => {
    if (hopAt !== null) return;
    const rightAnswer = tile === task.answer;
    practice("think.pattern", rightAnswer);
    if (!rightAnswer) {
      setWrongAt(s.index);
      const next = place(s, tile);
      if (next !== s) {
        setFreshMsg(true);
        update(next);
      } else {
        setFreshMsg(false);
      }
      return;
    }
    setWrongAt(null);
    setFreshMsg(false);
    const solvedState = place(s, tile);
    if (reduced || matrix) {
      update(solvedState);
      cheer(s.index === 3 ? "big" : "right");
      coach.done();
      return;
    }
    setHopAt(0);
    let step = 0;
    timer.current = setInterval(() => {
      step += 1;
      if (step > task.missing) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        setHopAt(null);
        update(solvedState);
        cheer(s.index === 3 ? "big" : "right");
        coach.done();
      } else {
        setHopAt(step);
      }
    }, 85);
  };

  const askHelp = () => {
    assistance?.();
    update(help(s));
  };

  return (
    <View style={{ gap: compact ? 8 : 12, paddingVertical: compact ? 4 : 8 }}>
      <Copy maxFontSizeMultiplier={1.65} style={{ color: C.ink, fontSize: compact ? 18 : 21, fontWeight: "900" }}>{task.title}</Copy>
      <View style={{ backgroundColor: "#FFF0D2", borderWidth: 1.5, borderBottomWidth: 3, borderColor: "#E8D8BE", borderRadius: 24, paddingVertical: compact ? 9 : 12, alignItems: "center", overflow: "hidden" }}>
        <Copy maxFontSizeMultiplier={1.4} style={{ color: "#C4573A", fontWeight: "900", alignSelf: "flex-start", marginLeft: 17 }}>
          TRAIL {s.index + 1} OF 4
        </Copy>
        <View style={{ width: trailWidth, height: trailHeight, marginTop: compact ? 4 : 7 }}>
          {!matrix && (
            <Svg width={trailWidth} height={trailHeight} style={{ position: "absolute" }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Path d={trailPath} fill="none" stroke="#E5C996" strokeWidth={compact ? "16" : "18"} strokeLinecap="round" />
              <Path d={trailPath} fill="none" stroke="#FFFDF8" strokeWidth="5" strokeDasharray="4 12" strokeLinecap="round" />
            </Svg>
          )}
          {task.tiles.map((tile, i) => {
            const [x, y] = points[i], missing = i === task.missing;
            return (
              <View
                key={i}
                accessible
                accessibilityLabel={missing ? `Stone ${i + 1}: missing stone` : `Stone ${i + 1}: ${patternLabel(tile)}`}
                style={{
                  position: "absolute", left: x - half, top: y - half, width: stoneBox, height: stoneBox, borderRadius: compact ? 17 : 19,
                  alignItems: "center", justifyContent: "center",
                  backgroundColor: missing ? "#FFEBB0" : "#FFFDF8",
                  borderWidth: missing ? 3 : 2,
                  borderColor: missing ? "#FF7A5C" : "#D8C09B",
                  shadowColor: missing ? "#E7B248" : "transparent",
                  shadowOpacity: missing ? 0.55 : 0, shadowRadius: 11, elevation: missing ? 5 : 0,
                }}
              >
                {missing ? (
                  <>
                    <CircleGap size={compact ? 35 : 39} />
                    <Copy allowFontScaling={false} style={{ position: "absolute", color: "#9A641A", fontSize: compact ? 18 : 20, fontWeight: "900" }}>?</Copy>
                  </>
                ) : (
                  <PatternGlyph token={tile} size={tile.startsWith("shells:") ? (compact ? 34 : 40) : (compact ? 38 : 42)} />
                )}
                <View style={{ position: "absolute", right: -7, bottom: -7, width: 22, height: 22, borderRadius: 11, backgroundColor: missing ? "#FF7A5C" : "#3D2B24", alignItems: "center", justifyContent: "center" }}>
                  <Copy allowFontScaling={false} style={{ color: missing ? "#3D2B24" : "#FFFDF8", fontSize: 11, lineHeight: 14, fontWeight: "900", includeFontPadding: false }}>{i + 1}</Copy>
                </View>
              </View>
            );
          })}
          {hopAt !== null && (
            <View pointerEvents="none" style={{ position: "absolute", left: points[hopAt][0] - 16, top: points[hopAt][1] - 48 - (hopAt % 2 ? 8 : 0) }}>
              <SeaGlyph kind="crab" size={32} />
            </View>
          )}
        </View>
      </View>

      <Copy maxFontSizeMultiplier={1.55} style={{ color: C.ink, fontWeight: "900", fontSize: compact ? 16 : 17 }}>
        Which stone fills the glowing gap?
      </Copy>

      <View testID="pattern-choices" style={{ flexDirection: "row", flexWrap: "wrap", gap: compact ? 6 : 8, justifyContent: "center" }}>
        {task.choices.map((tile, i) => (
          <PressableScale
            key={`${tile}-${i}`}
            testID={`pattern-choice-${i}`}
            accessibilityRole="button"
            accessibilityLabel={`Place ${patternLabel(tile)} in the gap`}
            disabled={!active || hopAt !== null}
            onPress={() => choose(tile)}
            style={{
              width: compact && task.choices.length === 6 ? "30%" : undefined,
              minWidth: compact ? 60 : 68, minHeight: compact ? 52 : 64, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 16,
              alignItems: "center", justifyContent: "center",
              backgroundColor: "#FFFDF8", borderWidth: 1.5, borderBottomWidth: 3, borderColor: "#E8D8BE",
            }}
          >
            <PatternGlyph token={tile} size={compact ? 36 : 44} />
          </PressableScale>
        ))}
      </View>

      {wrong && (
        <Copy accessibilityLiveRegion="polite" style={{ color: "#A33B22", fontWeight: "800" }}>
          {freshMsg
            ? "Good try! Here is a fresh trail — find the rule from stone 1."
            : "Good try. Follow the path from stone 1 and watch what changes."}
        </Copy>
      )}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <PressableScale
          testID="pattern-help-button"
          accessibilityRole="button"
          accessibilityLabel={s.hintLevel === 0 ? "Help me see the rule" : "Show the missing stone"}
          disabled={!active}
          onPress={askHelp}
          style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, backgroundColor: "#FFFDF8", borderWidth: 1.5, borderBottomWidth: 2, borderColor: "#E8D8BE", minHeight: 46, justifyContent: "center" }}
        >
          <Copy maxFontSizeMultiplier={buttonCap} style={{ color: "#3D2B24", fontWeight: "800" }}>
            {s.hintLevel === 0 ? "Help me see the rule" : s.hintLevel === 1 ? "Show the missing stone" : "Rule shown"}
          </Copy>
        </PressableScale>
      </View>

      {s.hintLevel > 0 && (
        <View testID="pattern-hint-box" style={{ backgroundColor: "#FFF8DC", borderRadius: 16, padding: 12, borderWidth: 1.5, borderColor: "#E8D8BE" }}>
          <Copy accessibilityLiveRegion="polite" style={{ color: C.ink, fontSize: 16 }}>
            {hintText(s)}
          </Copy>
        </View>
      )}
    </View>
  );
}

function CircleGap({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx="20" cy="20" r="17" fill="#FFF9E5" stroke="#E9C36C" strokeWidth="2" strokeDasharray="3 3" />
    </Svg>
  );
}

export function Art({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d="M7 75Q30 28 53 63T94 34" fill="none" stroke="#E5C996" strokeWidth="8" strokeLinecap="round" />
      <Circle cx="17" cy="69" r="13" fill="#FF7A5C" stroke="#3D2B24" strokeWidth="3" />
      <Circle cx="50" cy="61" r="13" fill="#EDC654" stroke="#3D2B24" strokeWidth="3" />
      <Circle cx="82" cy="43" r="13" fill="#FF7A5C" stroke="#3D2B24" strokeWidth="3" />
    </Svg>
  );
}
