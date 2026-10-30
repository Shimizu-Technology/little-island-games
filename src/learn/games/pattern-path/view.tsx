import React, { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { C, Copy, PressableScale } from "../../../components/ui";
import type { BoardProps } from "../../types";
import { help, place, taskAt, type PatternState } from "./engine";

export function Board({ session, update, practice, assistance, cheer, coach, active }: BoardProps<PatternState>) {
  const s = session.state, task = taskAt(s);
  const [hint, setHint] = useState(false), [wrong, setWrong] = useState(false);
  const choose = (tile: string) => {
    const right = tile === task.answer;
    practice("think.pattern", right);
    if (right) { update(place(s, tile)); cheer(s.index === 3 ? "big" : "right"); coach.done(); setHint(false); setWrong(false); }
    else setWrong(true);
  };
  return <View style={{ gap: 16, paddingVertical: 8 }}>
    <Copy style={{ color: C.ink, fontSize: 22, fontWeight: "900" }}>{task.title}</Copy>
    <View style={{ backgroundColor: "#E3F0D7", borderRadius: 24, padding: 16, gap: 14 }}>
      <Copy style={{ color: "#365034", fontWeight: "800" }}>TRAIL {s.index + 1} OF 4</Copy>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
        {task.tiles.map((tile, i) => <View key={i} accessible accessibilityLabel={i === task.missing ? "Missing stone" : `Stone ${i + 1}: ${tile}`} style={{ minWidth: task.tiles.length === 9 ? 65 : 76, minHeight: 65, borderRadius: 18, borderWidth: i === task.missing ? 3 : 1, borderColor: i === task.missing ? "#57793D" : "#D4C8AB", backgroundColor: i === task.missing ? "#FFF9E5" : "#FFFDF2", alignItems: "center", justifyContent: "center", padding: 5 }}><Copy style={{ fontSize: tile.length > 3 ? 21 : 29, color: C.ink, fontWeight: "800" }}>{i === task.missing ? "?" : tile}</Copy></View>)}
      </View>
    </View>
    <Copy style={{ color: C.ink, fontWeight: "800" }}>Choose a stone for the gap</Copy>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>{task.choices.map((tile, i) => <PressableScale key={`${tile}-${i}`} accessibilityRole="button" accessibilityLabel={`Place ${tile} in the gap`} disabled={!active} onPress={() => choose(tile)} style={{ minWidth: 65, minHeight: 60, padding: 8, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFDF2", borderWidth: 2, borderColor: "#8CAD75" }}><Copy style={{ color: C.ink, fontSize: tile.length > 3 ? 19 : 26, fontWeight: "800" }}>{tile}</Copy></PressableScale>)}</View>
    {wrong && <Copy style={{ color: "#9A542E", fontWeight: "800" }}>Good try. Look at what changes from one stone to the next.</Copy>}
    <PressableScale accessibilityRole="button" accessibilityLabel="Help with this pattern" onPress={() => { assistance?.(); update(help(s)); setHint(true); }} style={{ alignSelf: "flex-start", padding: 14, borderRadius: 14, backgroundColor: "#E8F2DF" }}><Copy style={{ color: "#365034", fontWeight: "800" }}>💡 Help</Copy></PressableScale>
    {hint && <Copy style={{ color: C.ink, fontSize: 17 }}>{task.hint} The missing stone is {task.answer}.</Copy>}
  </View>;
}
export function Art({ size }: { size: number }) { return <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Path d="M7 75Q30 28 53 63T94 34" fill="none" stroke="#8EB5A0" strokeWidth="8" strokeLinecap="round"/><Circle cx="17" cy="69" r="13" fill="#E9866A" stroke="#365034" strokeWidth="3"/><Circle cx="50" cy="61" r="13" fill="#EDC654" stroke="#365034" strokeWidth="3"/><Circle cx="82" cy="43" r="13" fill="#E9866A" stroke="#365034" strokeWidth="3"/></Svg>; }
