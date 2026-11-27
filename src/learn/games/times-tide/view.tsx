import React, { createRef, useMemo, useState } from "react";
import { Platform, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import Svg, { Circle, Ellipse, Line, Path, Rect } from "react-native-svg";
import { Button, C, Copy, Heading, PressableScale } from "../../../components/ui";
import type { BoardProps } from "../../types";
import { SpeakButton } from "../../SpeakButton";
import { useSpokenPrompt } from "../../voice";
import { engine, solved, changePool, type TideState } from "./engine";
const palette = { sea: "#FFF6E5", card: "#FFFDF8", deep: "#1E6B66", rim: "#E8D8BE", coral: "#FF7A5C", sand: "#FFF0D2", amber: "#9A641A" };
function Fish({ size = 28 }: { size?: number }) { return <Svg width={size} height={size} viewBox="0 0 50 38"><Path d="M5 19L1 5L18 12Q37 2 47 19Q37 36 18 26L1 33Z" fill={palette.coral} stroke={C.ink} strokeWidth="2.2" strokeLinejoin="round"/><Circle cx="36" cy="16" r="2.2" fill={C.ink}/></Svg>; }
function MiniShell({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" accessible={false}>
      <Path d="M4 19Q4 6 14 6Q24 6 24 19L14 23Z" fill="#F4B59A" stroke={C.ink} strokeWidth="1.8" strokeLinejoin="round" />
      <Path d="M14 8V21M9 10L12 21M19 10L16 21" stroke={C.ink} strokeWidth="1.3" strokeLinecap="round" />
    </Svg>
  );
}
function AreaGrid({ cols, rows, revealed, width }: { cols: number; rows: number; revealed: boolean; width: number }) {
  const maxW = Math.min(Math.max(width - 72, 140), 280);
  const cell = Math.max(8, Math.min(20, Math.floor(maxW / Math.max(cols, 1))));
  const gridW = cols * cell;
  const gridH = rows * cell;
  return (
    <Svg width={gridW + 4} height={gridH + 4} viewBox={`0 0 ${gridW + 4} ${gridH + 4}`} accessible={false}>
      <Rect x={2} y={2} width={gridW} height={gridH} rx={6} fill={revealed ? "#E2F2E4" : "#FFFDF8"} stroke={revealed ? "#2E7D54" : C.ink} strokeWidth={2} />
      {Array.from({ length: cols - 1 }, (_, i) => (
        <Line key={`c${i}`} x1={2 + (i + 1) * cell} y1={2} x2={2 + (i + 1) * cell} y2={2 + gridH} stroke={revealed ? "#7CB694" : "#E2CFAF"} strokeWidth={(i + 1) % 10 === 0 ? 2 : 1} />
      ))}
      {Array.from({ length: rows - 1 }, (_, i) => (
        <Line key={`r${i}`} x1={2} y1={2 + (i + 1) * cell} x2={2 + gridW} y2={2 + (i + 1) * cell} stroke={revealed ? "#7CB694" : "#E2CFAF"} strokeWidth={1} />
      ))}
    </Svg>
  );
}
function FishSourceArt() { return <Svg width={170} height={106} viewBox="0 0 170 106" accessible={false}>
  <Ellipse cx="86" cy="82" rx="75" ry="17" fill="#DDF1EE"/>
  <Path d="M10 78Q35 67 60 78T110 78T160 78" fill="none" stroke={palette.deep} strokeWidth="3" strokeLinecap="round"/>
  <Path d="M26 38L14 25L17 47L30 43Q51 22 74 39Q56 58 30 44Z" fill="#F6C77D" stroke={C.ink} strokeWidth="2.5"/><Circle cx="58" cy="37" r="2.5" fill={C.ink}/>
  <Path d="M72 60L53 41L57 72L76 66Q107 32 142 59Q107 86 76 67Z" fill={palette.coral} stroke={C.ink} strokeWidth="3.5"/><Circle cx="119" cy="56" r="3.5" fill={C.ink}/>
  <Path d="M116 26L106 16L109 32L119 30Q135 17 154 27Q136 41 119 31Z" fill="#F7CF91" stroke={C.ink} strokeWidth="2"/><Circle cx="143" cy="26" r="2" fill={C.ink}/>
  <Circle cx="35" cy="16" r="3" fill="#FFFDF8" stroke={palette.deep} strokeWidth="1.5"/><Circle cx="99" cy="10" r="4" fill="#FFFDF8" stroke={palette.deep} strokeWidth="1.5"/>
</Svg>; }
function Keypad({ value, onChange }: { value: string; onChange: (v: string) => void }) { return <View style={{ gap: 6 }}><Copy style={{ fontSize: 24, fontWeight: "900", textAlign: "center", color: C.ink }}>Total: {value || "?"}</Copy><View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 }}>{[1,2,3,4,5,6,7,8,9,"⌫",0].map(k => <PressableScale key={k} accessibilityRole="button" accessibilityLabel={k === "⌫" ? "Delete digit" : `Enter ${k}`} onPress={() => onChange(k === "⌫" ? value.slice(0,-1) : value.length < 3 ? value + k : value)} style={{ width: 52, minHeight: 50, borderRadius: 14, backgroundColor: C.paper, borderColor: C.line, borderWidth: 1.5, borderBottomWidth: 3, alignItems: "center", justifyContent: "center" }}><Copy style={{ fontSize: 23, fontWeight: "800", color: C.ink }}>{k}</Copy></PressableScale>)}</View></View>; }
export function Board({ session, update, practice, assistance, sound, soundOn, active, cheer, coach, width }: BoardProps<TideState>) {
  const s = session.state, t = s.tasks[s.index]; const [feedback, setFeedback] = useState(""); const [hint, setHint] = useState(false); const [removeMode, setRemoveMode] = useState(false); const [history, setHistory] = useState<number[][]>([]);
  const marks = s.marks; const required = t?.kind === "share" ? t.b + 1 : t?.kind === "area" ? 2 : t?.a ?? 0;
  const [poolRefs] = useState(() => Array.from({ length: 20 }, () => createRef<View>()));
  const drag = useSharedValue({ x: 0, y: 0 });
  const promptTitle = !t ? "" : t.kind === "groups" ? `Make ${t.a} pools with ${t.b} fish each` : t.kind === "array" ? `Build ${t.a} rows of ${t.b} shells` : t.kind === "table" ? `Skip-count ${t.a} groups of ${t.b}` : t.kind === "share" ? `Share ${t.total} fish with ${t.b} friends` : `Build ${t.a} × ${t.b} with tens and ones`;
  const promptSub = !t ? "" : t.kind === "share" ? "Find the equal factor for each friend. Put the leftovers in the extra pool." : t.kind === "area" ? `The tide brings ${t.b} baskets with ${t.a} shells each. Tap the tens and ones pieces, then add their products.` : t.kind === "table" ? `Tap each row to fill one group of ${t.b}. Skip-count the groups, then enter the product.` : "Tap a pool or row to add pieces, then enter the total.";
  const spokenPrompt = !t ? null : `${s.index === 0 && session.revision === 0 && engine.spokenIntro ? `${engine.spokenIntro} ` : ""}${promptTitle.replace("×", "times")}. ${promptSub}`;
  const { replay, speak } = useSpokenPrompt(spokenPrompt, `${session.id}:${s.index}`, { soundOn, active: active && !!t });
  const pushUndo = (prev: number[]) => setHistory((h) => [...h.slice(-19), prev]);
  const setMark = (i: number, value: number) => { pushUndo(marks); const next = Array.from({ length: required }, (_, k) => marks[k] ?? 0); next[i] = value; update({ ...s, marks: next }); setFeedback(""); sound("tap", true); coach.done(); };
  const poolAction = (i: number, action: "add" | "remove" | "fill") => { const next = changePool(s, i, action); if (next.marks.some((v, idx) => v !== (marks[idx] ?? 0)) || next.marks.length !== marks.length) pushUndo(marks); update(next); setFeedback(""); sound("tap", true); coach.done(); };
  const undoPool = () => { const prev = history.at(-1); if (!prev) return; setHistory((h) => h.slice(0, -1)); update({ ...s, marks: prev }); setFeedback(""); sound("tap", true); };
  const shareEqually = (amount: number) => { if (!t) return; const next = Array.from({ length: required }, (_, k) => marks[k] ?? 0); if (next.reduce((sum, n) => sum + n, 0) + amount * t.b > t.total) return; pushUndo(marks); for (let i = 0; i < t.b; i++) next[i] += amount; update({ ...s, marks: next }); setFeedback(""); sound("tap", true); coach.done(); };
  const fishStyle = useAnimatedStyle(() => ({ transform: [{ translateX: drag.value.x }, { translateY: drag.value.y }] }));
  const dropFishRef = React.useRef((_x: number, _y: number) => {});
  React.useEffect(() => {
    dropFishRef.current = (x: number, y: number) => { poolRefs.forEach((ref, i) => ref.current?.measureInWindow((left, top, width, height) => { if (x >= left && x <= left + width && y >= top && y <= top + height && t) setMark(i, Math.min((marks[i] ?? 0) + 1, t.kind === "share" ? t.total : t.b)); })); };
  });
  const handleDropFish = React.useCallback((x: number, y: number) => { dropFishRef.current(x, y); }, []);
  // Pool refs are read only after the gesture ends on the UI thread.
  // eslint-disable-next-line react-hooks/refs
  const fishPan = useMemo(() => Gesture.Pan().minDistance(2).onUpdate(e => { drag.set({ x: e.translationX, y: e.translationY }); }).onEnd(e => { runOnJS(handleDropFish)(e.absoluteX, e.absoluteY); }).onFinalize(() => { drag.set({ x: 0, y: 0 }); }), [drag, handleDropFish]);
  if (!t) return null;
  const fishSource = Platform.OS === "web"
    ? React.createElement("div", { draggable: true, role: "button", "aria-label": "Drag a fish into a tide pool", onDragStart: e => e.dataTransfer.setData("text/plain", "tide-fish"), style: { width: 170, height: 106, cursor: "grab" } }, <FishSourceArt/>)
    : <GestureDetector gesture={fishPan}><Animated.View collapsable={false} accessible accessibilityLabel="Drag a fish into a tide pool" style={[{ width: 170, height: 106, zIndex: 10 }, fishStyle]}><FishSourceArt/></Animated.View></GestureDetector>;
  const hintCopy = t.kind === "share" ? `Each friend gets ${t.a}; ${t.remainder} go in Extra.` : t.kind === "area" ? `Split ${t.a} into ${Math.floor(t.a/10)*10} and ${t.a%10}. The parts are ${Math.floor(t.a/10)*10*t.b} and ${(t.a%10)*t.b}.` : `${t.kind === "table" ? `Skip-count: ${Array.from({ length: t.a }, (_, i) => (i + 1) * t.b).join(" · ")}. ` : ""}${t.a} groups of ${t.b} make ${t.total}. Count the pieces in each ${t.kind === "groups" ? "pool" : "row"}.`;
  const check = () => { const right = solved(s); practice(t.kind === "groups" ? "num.equal-groups" : t.kind === "array" ? "num.arrays" : t.kind === "table" ? "num.tables" : t.kind === "share" ? "num.division" : "num.area", right); if (!right) { const msg = "Take another look at the picture. You can change any pool or digit."; setFeedback(msg); sound("tap", true); speak(msg); return; } cheer("right"); setFeedback(""); setHint(false); setHistory([]); setRemoveMode(false); update({ ...s, index: s.index + 1, marks: [], answer: "" }); };
  return <View style={{ gap: 14, paddingBottom: 20 }}>
    <View style={{ backgroundColor: palette.sand, borderRadius: 20, borderWidth: 1.5, borderColor: palette.rim, padding: 16, gap: 6 }}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}><Copy style={{ color: palette.amber, fontWeight: "900" }}>TIDE {s.index + 1} OF 5</Copy><SpeakButton testID="times-tide-speak" label="Hear tide prompt" disabled={!soundOn || !active} onPress={replay} /></View><Heading>{promptTitle}</Heading><Copy>{promptSub}</Copy></View>
    {(t.kind === "groups" || t.kind === "share") && <View style={{ alignItems: "center", gap: 4 }}>{fishSource}<Copy style={{ fontSize: 13, fontWeight: "700" }}>Drag a fish to a pool, or tap the pool.</Copy></View>}
    {t.kind === "share" && <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}><Button compact quiet onPress={() => shareEqually(1)}>Give 1 to each</Button><Button compact quiet onPress={() => shareEqually(5)}>Give 5 to each</Button></View>}
    {t.kind !== "area" && (
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
        <Button compact quiet selected={!removeMode} onPress={() => setRemoveMode(false)}>+ Add</Button>
        <Button compact quiet selected={removeMode} onPress={() => setRemoveMode(true)}>− Take off</Button>
        <Button compact quiet disabled={history.length === 0} onPress={undoPool}>↶ Undo</Button>
      </View>
    )}
    {t.kind === "area" ? <View style={{ gap: 10 }}>{[Math.floor(t.a / 10) * 10, t.a % 10].map((n, i) => <PressableScale key={i} accessibilityRole="button" accessibilityLabel={`Reveal ${n} times ${t.b} area piece`} onPress={() => setMark(i, n * t.b)} style={{ minHeight: 82, borderRadius: 18, backgroundColor: marks[i] ? "#E2F2E4" : palette.card, borderWidth: 1.5, borderBottomWidth: 3, borderColor: marks[i] ? "#2E7D54" : palette.rim, padding: 14, gap: 8, alignItems: "center", justifyContent: "center" }}><AreaGrid cols={n} rows={t.b} revealed={!!marks[i]} width={width} /><Copy style={{ fontSize: 20, fontWeight: "900", color: C.ink }}>{n} × {t.b} {marks[i] ? `= ${marks[i]}` : "= ?"}</Copy></PressableScale>)}</View> : <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>{Array.from({ length: required }, (_, i) => { const count = marks[i] ?? 0; const max = t.kind === "share" ? t.total : t.b; const poolName = t.kind === "share" && i === t.b ? "Extra pool" : t.kind === "share" ? `Friend ${i + 1}` : t.kind === "groups" ? `Pool ${i + 1}` : `Row ${i + 1}`; const pool = <View key={i} ref={poolRefs[i]} style={{ alignItems: "center", gap: 4 }}><PressableScale accessibilityRole="button" accessibilityLabel={`${poolName}, ${count} ${t.kind === "groups" || t.kind === "share" ? "fish" : "shells"}. ${removeMode ? "Tap to remove one." : t.kind === "table" ? "Tap to fill the group." : "Tap to add."}`} onPress={() => poolAction(i, removeMode ? "remove" : t.kind === "table" ? "fill" : "add")} onLongPress={() => poolAction(i, "remove")} style={{ width: t.kind === "share" ? 112 : t.a >= 7 ? 94 : 144, minHeight: t.kind === "share" ? 116 : 130, backgroundColor: palette.card, borderRadius: 24, borderWidth: 2, borderBottomWidth: 4, borderColor: removeMode ? palette.coral : count === (t.kind === "share" ? t.a : t.b) && count > 0 ? "#2E7D54" : palette.rim, alignItems: "center", justifyContent: "center", padding: 8, gap: 4 }}><Copy style={{ fontWeight: "900", fontSize: 14, color: palette.amber }}>{t.kind === "share" ? i === t.b ? "Extra" : `Friend ${i+1}` : t.kind === "groups" ? `Pool ${i+1}` : `Row ${i+1}`}</Copy><View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 2 }}>{Array.from({length: Math.min(count, 12)}, (_,j) => t.kind === "share" || t.kind === "groups" ? <Fish key={j} size={26}/> : <MiniShell key={j} size={20} />)}</View><Copy style={{ fontSize: 20, fontWeight: "900", color: C.ink }}>{count}</Copy>{t.kind === "table" && !removeMode && <Copy style={{ fontSize: 12, color: C.muted }}>Tap to fill</Copy>}</PressableScale></View>; return Platform.OS === "web" && (t.kind === "groups" || t.kind === "share") ? React.createElement("div", { key: i, onDragOver: e => e.preventDefault(), onDrop: e => { e.preventDefault(); if (e.dataTransfer.getData("text/plain") === "tide-fish") setMark(i, Math.min(count + 1, max)); } }, pool) : pool; })}</View>}
    {t.kind !== "share" && <Keypad value={s.answer} onChange={answer => { update({ ...s, answer }); setFeedback(""); sound("tap", true); coach.done(); }} />}
    {t.kind === "share" && <Copy style={{ textAlign: "center", fontWeight: "800", color: C.ink }}>{marks.reduce((sum,n) => sum+n,0)} of {t.total} fish placed</Copy>}
    {hint && <View style={{ backgroundColor: "#FFF8DC", borderRadius: 14, borderWidth: 1, borderColor: palette.rim, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 }}><Copy style={{ flex: 1, fontWeight: "700", color: C.ink }}>{hintCopy}</Copy><SpeakButton testID="times-tide-speak-hint" label="Hear hint" text="Hear" disabled={!soundOn || !active} onPress={() => speak(hintCopy)} /></View>}
    {!!feedback && <Copy style={{ color: C.error, fontWeight: "700" }}>{feedback}</Copy>}
    <View style={{ flexDirection: "row", gap: 8 }}><Button style={{ flex: 1 }} onPress={check}>Check tide</Button><Button quiet compact onPress={() => { const nextOpen = !hint; if (!hint) assistance?.(); setHint(nextOpen); update({ ...s, helped: true }); sound("tap", true); if (nextOpen) speak(hintCopy); }}>Hint</Button></View>
  </View>;
}
export function Art({ size }: { size: number }) { return <Svg width={size} height={size} viewBox="0 0 100 100"><Ellipse cx="50" cy="70" rx="47" ry="23" fill="#DDF1EE" stroke={palette.deep} strokeWidth="3"/><Path d="M19 54L9 43L10 66Z" fill={palette.coral}/><Ellipse cx="43" cy="54" rx="27" ry="15" fill={palette.coral} stroke={C.ink} strokeWidth="2.2"/><Circle cx="60" cy="50" r="3" fill={C.ink}/><Path d="M28 42L38 29L47 43" fill={palette.coral} stroke={C.ink} strokeWidth="2.2"/></Svg>; }
