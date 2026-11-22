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

  const trailWidth = Math.min(Math.max(width - 32, 268), 430);
  const trailHeight = 292;
  const left = 36, middle = trailWidth / 2, right = trailWidth - 36;
  const matrix = task.tiles.length === 9;
  const points: [number, number][] = matrix
    ? Array.from({ length: 9 }, (_, i) => [[left, middle, right][i % 3], [46, 143, 240][Math.floor(i / 3)]])
    : [[left, 46], [middle, 46], [right, 46], [right, 143], [middle, 143], [left, 143], [left, 240], [middle, 240], [right, 240]];

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
    <View style={{ gap: 14, paddingVertical: 8 }}>
      <Copy style={{ color: C.ink, fontSize: 22, fontWeight: "900" }}>{task.title}</Copy>
      <View style={{ backgroundColor: "#E4EED9", borderRadius: 25, paddingVertical: 13, alignItems: "center", overflow: "hidden" }}>
        <Copy maxFontSizeMultiplier={1.5} style={{ color: "#365034", fontWeight: "900", alignSelf: "flex-start", marginLeft: 17 }}>
          TRAIL {s.index + 1} OF 4
        </Copy>
        <View style={{ width: trailWidth, height: trailHeight, marginTop: 7 }}>
          {!matrix && (
            <Svg width={trailWidth} height={trailHeight} style={{ position: "absolute" }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Path d={`M${left} 46 Q${middle} 25 ${right} 46 C${trailWidth + 3} 78 ${trailWidth + 3} 111 ${right} 143 Q${middle} 165 ${left} 143 C-3 177 -3 211 ${left} 240 Q${middle} 219 ${right} 240`} fill="none" stroke="#A4C69B" strokeWidth="18" strokeLinecap="round" />
              <Path d={`M${left} 46 Q${middle} 25 ${right} 46 C${trailWidth + 3} 78 ${trailWidth + 3} 111 ${right} 143 Q${middle} 165 ${left} 143 C-3 177 -3 211 ${left} 240 Q${middle} 219 ${right} 240`} fill="none" stroke="#F8F2D9" strokeWidth="5" strokeDasharray="4 12" strokeLinecap="round" />
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
                  position: "absolute", left: x - 29, top: y - 29, width: 58, height: 58, borderRadius: 19,
                  alignItems: "center", justifyContent: "center",
                  backgroundColor: missing ? "#FFF5CC" : "#FFFDF3",
                  borderWidth: missing ? 3 : 2,
                  borderColor: missing ? "#D6A53C" : "#789C75",
                  shadowColor: missing ? "#E7B248" : "transparent",
                  shadowOpacity: missing ? 0.55 : 0, shadowRadius: 11, elevation: missing ? 5 : 0,
                }}
              >
                {missing ? (
                  <>
                    <CircleGap size={39} />
                    <Copy maxFontSizeMultiplier={1.4} style={{ position: "absolute", color: "#8E6B2C", fontSize: 20, fontWeight: "900" }}>?</Copy>
                  </>
                ) : (
                  <PatternGlyph token={tile} size={tile.startsWith("shells:") ? 40 : 42} />
                )}
                <View style={{ position: "absolute", right: -7, bottom: -8, width: 20, height: 20, borderRadius: 10, backgroundColor: "#3D6549", alignItems: "center", justifyContent: "center" }}>
                  <Copy maxFontSizeMultiplier={1.2} style={{ color: "#FFFDF3", fontSize: 11, fontWeight: "900" }}>{i + 1}</Copy>
                </View>
              </View>
            );
          })}
          {hopAt !== null && (
            <View pointerEvents="none" style={{ position: "absolute", left: points[hopAt][0] - 16, top: points[hopAt][1] - 51 - (hopAt % 2 ? 8 : 0) }}>
              <SeaGlyph kind="crab" size={34} />
            </View>
          )}
        </View>
      </View>

      <Copy maxFontSizeMultiplier={1.6} style={{ color: C.ink, fontWeight: "900", fontSize: 17 }}>
        Which stone fills the glowing gap?
      </Copy>

      <View testID="pattern-choices" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {task.choices.map((tile, i) => (
          <PressableScale
            key={`${tile}-${i}`}
            testID={`pattern-choice-${i}`}
            accessibilityRole="button"
            accessibilityLabel={`Place ${patternLabel(tile)} in the gap`}
            disabled={!active || hopAt !== null}
            onPress={() => choose(tile)}
            style={{
              minWidth: 68, minHeight: 64, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 18,
              alignItems: "center", justifyContent: "center",
              backgroundColor: "#FFFDF2", borderWidth: 2, borderColor: "#7C9C75",
            }}
          >
            <PatternGlyph token={tile} size={44} />
          </PressableScale>
        ))}
      </View>

      {wrong && (
        <Copy accessibilityLiveRegion="polite" style={{ color: "#965633", fontWeight: "800" }}>
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
          style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: "#E8F2DF", minHeight: 46, justifyContent: "center" }}
        >
          <Copy maxFontSizeMultiplier={buttonCap} style={{ color: "#365034", fontWeight: "800" }}>
            {s.hintLevel === 0 ? "Help me see the rule" : s.hintLevel === 1 ? "Show the missing stone" : "Rule shown"}
          </Copy>
        </PressableScale>
      </View>

      {s.hintLevel > 0 && (
        <View testID="pattern-hint-box" style={{ backgroundColor: "#F4F8EC", borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: "#BFD4B4" }}>
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
      <Path d="M7 75Q30 28 53 63T94 34" fill="none" stroke="#8EB5A0" strokeWidth="8" strokeLinecap="round" />
      <Circle cx="17" cy="69" r="13" fill="#E9866A" stroke="#365034" strokeWidth="3" />
      <Circle cx="50" cy="61" r="13" fill="#EDC654" stroke="#365034" strokeWidth="3" />
      <Circle cx="82" cy="43" r="13" fill="#E9866A" stroke="#365034" strokeWidth="3" />
    </Svg>
  );
}
