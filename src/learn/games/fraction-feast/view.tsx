import React, { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import { Button, C, Copy, Heading, PressableScale } from "../../../components/ui";
import type { BoardProps } from "../../types";
import { fractionModel, fractionClue, mixedNumber, type FeastState, type FeastTask } from "./engine";
const ink = "#3D2B24", coral = "#FF7A5C", pale = "#FFF0D2", warmLine = "#E8D8BE", amber = "#9A641A";

/** Illustrated circular pie, coconut, or island fruit sliced into equal wedges for L1 fair-share tasks. */
function FoodCircle({ food, denominator, pieces }: { food: number; denominator: number; pieces: number }) {
  const name = ["pie", "coconut", "fruit"][food] ?? "pie";
  const rimFill = food === 1 ? "#7D5033" : food === 2 ? "#E89B3C" : "#E5AE58";
  const innerRim = food === 1 ? "#B9885D" : food === 2 ? "#FFD47A" : "#F8D794";
  const shadedFill = food === 1 ? "#FFFDF8" : food === 2 ? "#FF9266" : "#FF7A5C";
  const emptyFill = food === 1 ? "#EFE2CC" : food === 2 ? "#FFF4DC" : "#FFF6E5";
  const r = 68;
  const cx = 86, cy = 86;
  const wedge = (i: number) => {
    const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / denominator;
    const a1 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / denominator;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const largeArc = a1 - a0 > Math.PI ? 1 : 0;
    return `M${cx} ${cy} L${x0} ${y0} A${r} ${r} 0 ${largeArc} 1 ${x1} ${y1} Z`;
  };
  const midDot = (i: number, dist: number) => {
    const a = -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / denominator;
    return { x: cx + dist * Math.cos(a), y: cy + dist * Math.sin(a) };
  };
  return (
    <View accessible accessibilityLabel={`${pieces} of ${denominator} slices of ${name} served`} style={{ alignItems: "center" }}>
      <Svg width={172} height={172} viewBox="0 0 172 172" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Circle cx={cx} cy={cy + 3} r={78} fill="#DFCAA8" opacity={0.45} />
        <Circle cx={cx} cy={cy} r={77} fill={rimFill} stroke={ink} strokeWidth={3} />
        <Circle cx={cx} cy={cy} r={71} fill={innerRim} />
        {Array.from({ length: denominator }, (_, i) => {
          const lit = i < pieces;
          const d1 = midDot(i, 36);
          const d2 = midDot(i, 52);
          return (
            <G key={i}>
              <Path d={wedge(i)} fill={lit ? shadedFill : emptyFill} stroke={ink} strokeWidth={2.5} strokeLinejoin="round" />
              {lit && food === 0 && <><Circle cx={d1.x} cy={d1.y} r={5} fill="#C4422E" /><Circle cx={d2.x} cy={d2.y} r={4} fill="#FFE0A3" /></>}
              {lit && food === 1 && <Circle cx={d1.x} cy={d1.y} r={4.5} fill="#EFE2CC" />}
              {lit && food === 2 && <><Circle cx={d1.x} cy={d1.y} r={3} fill={ink} /><Circle cx={d2.x} cy={d2.y} r={2.5} fill={ink} /></>}
            </G>
          );
        })}
        <Circle cx={cx} cy={cy} r={5} fill={innerRim} stroke={ink} strokeWidth={2} />
      </Svg>
    </View>
  );
}

/** Bars have identical outer dimensions. Selection controls stay 44pt even for twelfths. */
function WholeBar({ denominator, pieces, complete = false }: { denominator: number; pieces: number; complete?: boolean }) {
  return <View accessibilityLabel={`${pieces} of ${denominator} pieces shaded in one whole${complete ? ", complete whole" : ""}`} style={{ width: 268, height: 78, flexDirection: "row", borderWidth: 2, borderBottomWidth: 4, borderColor: complete ? "#2E7D54" : ink, borderRadius: 14, overflow: "hidden", backgroundColor: "#FFFDF8" }}>
    {Array.from({ length: denominator }, (_, i) => <View key={i} style={{ flex: 1, backgroundColor: i < pieces ? complete ? "#78BAA1" : coral : "#FFE6C4", borderRightWidth: i === denominator - 1 ? 0 : 1.5, borderColor: ink }}/>) }
  </View>;
}
function SliceBoard({ task, pieces, onSelect }: { task: FeastTask; pieces: number; onSelect: (n: number) => void }) {
  const { denominator, wholes, total } = fractionModel(task);
  return <View style={{ alignItems: "center", gap: 10 }}>
    {task.kind === "share" ? (
      <View style={{ gap: 6, alignItems: "center" }}>
        <FoodCircle food={task.extra} denominator={denominator} pieces={pieces} />
        <Copy style={{ fontWeight: "800", color: ink }}>{denominator} equal slices</Copy>
      </View>
    ) : (
      Array.from({ length: wholes }, (_, whole) => {
        const shaded = Math.max(0, Math.min(denominator, pieces - whole * denominator));
        const complete = task.kind === "combine" && shaded === denominator;
        return <View key={whole} style={{ gap: 4, alignItems: "center" }}><Copy style={{ fontWeight: "800", color: ink }}>{complete ? "Complete whole" : `Whole ${whole + 1}`} · {denominator} equal pieces</Copy><WholeBar denominator={denominator} pieces={shaded} complete={complete}/></View>;
      })
    )}
    <Copy style={{ color: C.muted }}>Choose how many {task.kind === "share" ? "slices" : "pieces"} to shade:</Copy>
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, maxWidth: 320 }}>
      {Array.from({ length: total + 1 }, (_, n) => <PressableScale key={n} accessibilityRole="button" accessibilityLabel={`Shade ${n} of ${total} pieces`} accessibilityState={{ selected: pieces === n }} onPress={() => onSelect(n)} style={{ minWidth: 46, minHeight: 46, borderRadius: 12, borderWidth: 2, borderBottomWidth: 3, borderColor: pieces === n ? ink : warmLine, backgroundColor: pieces === n ? coral : C.paper, alignItems: "center", justifyContent: "center" }}><Copy style={{ fontWeight: "900", color: ink }}>{n}</Copy></PressableScale>)}
    </View>
  </View>;
}
export function Board({ session, update, practice, assistance, cheer, coach, width }: BoardProps<FeastState>) {
  const s = session.state, t = s.tasks[s.index]; const [feedback, setFeedback] = useState(""); const [hint, setHint] = useState(false); const [served, setServed] = useState(false); if (!t) return null;
  const unit = fractionModel(t).total;
  const gridSide = Math.min(Math.max(width - 28, 264), 324);
  const cell = Math.floor((gridSide - 4) / 10);
  const exactGrid = cell * 10 + 4;
  const setPieces = (pieces: number) => { update({ ...s, pieces: Math.max(0, Math.min(unit, pieces)) }); setFeedback(""); setServed(false); coach.done(); };
  const check = () => { const right = s.pieces === t.answer; practice(t.kind === "share" ? "num.fair-shares" : t.kind === "line" ? "num.fraction-line" : t.kind === "equivalent" ? "num.equivalent" : t.kind === "combine" || t.kind === "subtract" ? "num.fraction-sums" : "num.decimal-percent", right); if (!right) { setFeedback(fractionClue(t, s.pieces)); return; } cheer("right"); setFeedback(""); setHint(false); if (t.kind === "combine") { setServed(true); return; } update({ ...s, index: s.index + 1, pieces: 0 }); };
  const prompt = t.kind === "share" ? `Serve ${t.n}/${t.d} of the ${["pie", "coconut", "fruit"][t.extra]}` : t.kind === "line" ? `Walk to ${t.n}/${t.d} on the line` : t.kind === "equivalent" ? `Fold ${t.n}/${t.d} into ${unit} little pieces` : t.kind === "combine" ? `Join ${t.n}/${t.d} and ${t.extra}/${t.d}` : t.kind === "subtract" ? `Take ${t.extra}/${t.d} from ${t.n}/${t.d}` : t.extra === 1 ? `Show ${t.n}/100 on the hundred grid` : t.extra === 2 ? `Show ${t.n}% on the hundred grid` : `Show $0.${String(t.n).padStart(2,"0")} on the hundred grid`;
  return <View style={{ gap: 15, paddingBottom: 20 }}>
    <View style={{ backgroundColor: pale, borderWidth: 1.5, borderColor: warmLine, padding: 16, borderRadius: 20, gap: 7 }}><Copy style={{ color: amber, fontWeight: "900" }}>FEAST {s.index+1} OF 5</Copy><Heading>{prompt}</Heading><Copy>{t.kind === "equivalent" ? `The new pieces are ${t.extra} times smaller. Shade the same amount.` : t.kind === "combine" ? "Choose the total pieces. Each outlined bar is one whole." : t.kind === "subtract" ? "Shade the part that remains after taking some away." : t.kind === "decimal" ? "Ten squares make one tenth. One square makes one hundredth. Shade the grid to match." : "Choose how many slices to shade. Choose zero to start again."}</Copy></View>
    {t.kind === "equivalent" && <View style={{ gap: 5, alignItems: "center" }}><Copy style={{ fontWeight: "900", color: ink }}>Original share: {t.n}/{t.d}</Copy><WholeBar denominator={t.d} pieces={t.n}/><Copy>Fold the bar below to match this amount.</Copy></View>}
    {t.kind === "line" ? <View style={{ paddingVertical: 18, gap: 14 }}><View style={{ height: 5, borderRadius: 3, backgroundColor: ink, marginHorizontal: 15 }}/><View style={{ flexDirection: "row", justifyContent: "space-between" }}>{Array.from({ length: t.d+1 }, (_, i) => <PressableScale key={i} accessibilityRole="button" accessibilityLabel={`Mark ${i} of ${t.d}`} onPress={() => setPieces(i)} style={{ width: 46, minHeight: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: i === s.pieces ? coral : C.paper, borderWidth: 2, borderBottomWidth: 3, borderColor: i === s.pieces ? ink : warmLine }}><Copy style={{ color: ink, fontWeight: "900" }}>{i}</Copy></PressableScale>)}</View><Copy style={{ textAlign: "center", fontWeight: "800", color: ink }}>0  ···  {s.pieces}/{t.d}  ···  1</Copy></View> : t.kind === "decimal" ? <View style={{ gap: 12, alignItems: "center" }}><View style={{ width: exactGrid, height: exactGrid, flexDirection: "row", flexWrap: "wrap", borderWidth: 2, borderColor: ink, borderRadius: 10, overflow: "hidden", backgroundColor: C.paper }}>{Array.from({ length: 100 }, (_, i) => { const col = i % 10, row = Math.floor(i / 10); return <View key={i} style={{ width: cell, height: cell, backgroundColor: i < s.pieces ? coral : C.paper, borderRightWidth: col === 4 ? 1.5 : 0.5, borderBottomWidth: row === 4 ? 1.5 : 0.5, borderColor: col === 4 || row === 4 ? "#B59978" : "#DFCEB4" }}/>; })}</View><View style={{ flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 8 }}><Button compact quiet onPress={() => setPieces(s.pieces-10)}>−10</Button><Button compact onPress={() => setPieces(s.pieces+10)}>+10</Button><Button compact quiet onPress={() => setPieces(s.pieces-1)}>−1</Button><Button compact onPress={() => setPieces(s.pieces+1)}>+1</Button></View><Copy style={{ textAlign: "center", fontWeight: "800", color: ink }}>{s.pieces} of 100 squares shaded</Copy></View> : <View style={{ gap: 10 }}><SliceBoard task={t} pieces={s.pieces} onSelect={setPieces}/><Copy style={{ textAlign: "center", fontWeight: "800", color: ink }}>{s.pieces}/{t.kind === "equivalent" ? unit : t.d} shaded</Copy></View>}
    {served && <View accessibilityLiveRegion="polite" style={{ padding: 14, gap: 7, backgroundColor: C.success, borderWidth: 1.5, borderColor: "#9CC9A8", borderRadius: 16 }}><Heading>{t.answer}/{t.d} = {mixedNumber(t.answer, t.d)}</Heading><Copy>One complete whole is {t.d}/{t.d}. The other bar has {t.answer % t.d}/{t.d} left.</Copy><Button onPress={() => { setServed(false); update({ ...s, index: s.index + 1, pieces: 0 }); }}>Next feast</Button></View>}
    {hint && <View style={{ backgroundColor: "#FFF8DC", borderRadius: 14, borderWidth: 1, borderColor: warmLine, padding: 12 }}><Copy style={{ fontWeight: "700", color: ink }}>{t.kind === "equivalent" ? `Each of the ${t.n} original pieces becomes ${t.extra} little pieces. Count ${t.n} groups of ${t.extra}.` : t.kind === "combine" ? `The denominator stays ${t.d}. Add the top numbers: ${t.n} + ${t.extra}. One whole is ${t.d}/${t.d}.` : t.kind === "subtract" ? `The denominator stays ${t.d}. Take ${t.extra} from ${t.n}.` : t.kind === "decimal" ? `Start with ${Math.floor(t.n/10)} tens, then add ${t.n%10} single squares.` : `Count ${t.n} ${t.n === 1 ? "piece" : "pieces"} out of ${t.d}.`}</Copy></View>}
    {!!feedback && <Copy style={{ color: C.error, fontWeight: "700" }}>{feedback}</Copy>}
    <View style={{ flexDirection: "row", gap: 8 }}>{!served && <Button style={{ flex: 1 }} onPress={check}>Serve it</Button>}<Button quiet compact onPress={() => { if (!hint) assistance?.(); setHint(!hint); update({ ...s, helped: true }); }}>Hint</Button></View>
  </View>;
}
export function Art({ size }: { size: number }) { return <Svg width={size} height={size} viewBox="0 0 100 100"><Circle cx="50" cy="50" r="43" fill="#F7D29A" stroke={ink} strokeWidth="3"/><Path d="M50 50V8M50 50L89 34M50 50L66 89M50 50L12 71" stroke={ink} strokeWidth="2"/><Circle cx="35" cy="29" r="5" fill={coral}/><Circle cx="65" cy="67" r="5" fill={coral}/><Circle cx="31" cy="64" r="5" fill={coral}/></Svg>; }
