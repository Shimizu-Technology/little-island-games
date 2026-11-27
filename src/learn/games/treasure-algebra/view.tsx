import { BoardColumns, useBoardColumns, useBoardGeometry, useBoardSpace } from '../../BoardSpace';
import { SCHOOL_BOARD_MIN } from '../../boardGeometry';
import React, { useEffect, useState } from "react";
import { Animated, Platform, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { useReducedMotion } from "../../../components/motion";
import { Button, C, Copy, Heading, PressableScale } from "../../../components/ui";
import type { BoardProps } from "../../types";
import { SpeakButton } from "../../SpeakButton";
import { useSpokenPrompt } from "../../voice";
import { LARGE_TEXT, wordFitMultiplier } from "../../../components/wordFit";
import { engine, initialValue, solved, workedHint, seaLineRange, type AlgebraState, type AlgebraTask } from "./engine";

const ink = "#3D2B24", lagoon = "#1E6B66", coral = "#FF7A5C", sand = "#FFF0D2", warmLine = "#E8D8BE", amber = "#9A641A";


function Diver({ size = 62 }: { size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 70 70" accessible={false}>
    <Ellipse cx="34" cy="57" rx="20" ry="6" fill={ink} opacity={0.14}/>
    <Path d="M16 43L7 37L9 31L22 38M50 43L62 36L61 31L46 37" fill="#F6C369" stroke={ink} strokeWidth="3" strokeLinejoin="round"/>
    <Path d="M23 49L17 62L10 64M44 49L52 62L60 64" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round"/>
    <Path d="M21 31Q34 24 48 31L46 53Q34 60 22 53Z" fill={coral} stroke={ink} strokeWidth="3"/>
    <Circle cx="35" cy="23" r="17" fill="#F7CF9C" stroke={ink} strokeWidth="3"/>
    <Path d="M19 22Q18 6 35 6Q52 6 51 22" fill={lagoon} stroke={ink} strokeWidth="3"/>
    <Rect x="22" y="16" width="26" height="12" rx="6" fill="#D7F3F2" stroke={ink} strokeWidth="2.5"/>
    <Circle cx="30" cy="22" r="2" fill={ink}/><Circle cx="41" cy="22" r="2" fill={ink}/>
    <Path d="M31 31Q35 35 39 31" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round"/>
    <Circle cx="60" cy="13" r="3" fill="#D7F3F2" stroke={lagoon} strokeWidth="1.5"/>
  </Svg>;
}

function LegacySeaLine({ value, start }: { value: number; start?: number }) {
  const space = useBoardSpace();
  const natural = Math.min(330, (space?.ready ? space.width : 286) * 330 / 286);
  const geometry = useBoardGeometry('treasure-algebra', natural, SCHOOL_BOARD_MIN['treasure-algebra']);
  const scale = geometry.height / 330;
  const reduced = useReducedMotion();
  const { min, max } = seaLineRange(value, start);
  const lineY = (n: number) => 290 - (n - min) / (max - min) * 250;
  const ticks = Array.from({ length: 6 }, (_, i) => Math.round(min + (max - min) * i / 5));
  const targetY = (lineY(value) - 165) * scale;
  const [motion] = useState(() => new Animated.Value(targetY));
  useEffect(() => {
    const toValue = targetY;
    if (reduced) { motion.stopAnimation(); motion.setValue(toValue); return; }
    const move = Animated.timing(motion, { toValue, duration: 220, useNativeDriver: true });
    move.start();
    return () => move.stop();
  }, [motion, targetY, reduced]);
  return <View style={{ alignItems: "center", gap: space?.ready && space.width < 600 ? 4 : 7 }}>
    <View accessibilityLabel={`Vertical sea-level number line. Diver at ${value}${start === undefined ? "" : `, start ${start}`}`} testID={geometry.testID} onLayout={geometry.onLayout} style={{ width: 286 * scale, height: geometry.height, borderRadius: 24, overflow: "hidden", borderWidth: 2, borderBottomWidth: 4, borderColor: warmLine, backgroundColor: "#DFF4F2" }}>
      <Svg width={286 * scale} height={geometry.height} viewBox="0 0 286 330" accessible={false}>
        <Rect width="286" height={lineY(0)} fill="#FFF6E2"/><Rect y={lineY(0)} width="286" height={330-lineY(0)} fill="#CFECEB"/>
        <Circle cx="47" cy="43" r="20" fill="#F8CC67"/><Path d="M47 10v10M47 66v10M14 43h10M70 43h10M23 19l7 7M64 61l7 7M71 19l-7 7M30 61l-7 7" stroke="#E6A63F" strokeWidth="3" strokeLinecap="round"/>
        <Path d={`M0 ${lineY(0)}H286`} fill="none" stroke={lagoon} strokeWidth="5"/>
        <Path d="M10 238Q55 223 102 240M26 275Q79 262 120 279M16 306Q54 295 85 307" fill="none" stroke="#9AD2D0" strokeWidth="4" strokeLinecap="round"/>
        <Path d="M15 316q9-24 18 0m16 0q8-19 16 0" fill="none" stroke={lagoon} strokeWidth="3"/>
        <Line x1="192" y1="14" x2="192" y2="316" stroke={ink} strokeWidth="3.5"/>
        {ticks.map(n => <G key={n}><Line x1="181" y1={lineY(n)} x2="204" y2={lineY(n)} stroke={n === 0 ? coral : ink} strokeWidth={n === 0 ? "4" : "2"}/><SvgText x="218" y={lineY(n)+5} fill={n === 0 ? "#A94D36" : ink} fontWeight="800" fontSize="16">{n > 0 ? `+${n}` : n}</SvgText></G>)}
        {start !== undefined && <G><Circle cx="192" cy={lineY(start)} r="8" fill="#F7C25E" stroke={ink} strokeWidth="2"/><SvgText x="105" y={lineY(start)-10} fill={ink} fontSize="12" fontWeight="800">START</SvgText></G>}
      </Svg>
      <Animated.View pointerEvents="none" style={{ position: "absolute", left: 104 * scale, top: 133 * scale, transform: [{ translateY: motion }] }}><Diver size={62 * scale}/></Animated.View>
    </View>
    <Copy style={{ color: ink, fontWeight: "900", fontSize: 18 }}>Diver at {value} {value === 0 ? "· sea level" : value > 0 ? "· above water" : "· below water"}</Copy>
  </View>;
}

function SeaLine({ value, start, narrow = false }: { value: number; start?: number; narrow?: boolean }) {
  const space = useBoardSpace();
  return space ? <MeasuredSeaLine value={value} start={start} narrow={narrow}/> : <LegacySeaLine value={value} start={start}/>;
}
function MeasuredSeaLine({ value, start, narrow }: { value: number; start?: number; narrow: boolean }) {
  const { fontScale, width } = useWindowDimensions();
  const g = useBoardGeometry('treasure-algebra', 330, SCHOOL_BOARD_MIN['treasure-algebra']);
  const label = 13 * (fontScale >= LARGE_TEXT ? 1.5 : 1), W = narrow ? 132 : 250, x = narrow ? 76 : 164;
  const { min, max } = seaLineRange(value, start);
  const y = (n: number) => g.height - 30 - (n - min) / (max - min) * (g.height - 60);
  const ticks = Array.from({ length: 6 }, (_, i) => Math.round(min + (max - min) * i / 5));
  const reduced = useReducedMotion(), targetY = y(value), [motion] = useState(() => new Animated.Value(targetY));
  useEffect(() => { const move = Animated.timing(motion, { toValue: targetY, duration: reduced ? 0 : 220, useNativeDriver: true }); move.start(); return () => move.stop(); }, [motion, targetY, reduced]);
  return <View style={{ alignItems: 'center', gap: 4 }}>
    <View testID={g.testID} onLayout={g.onLayout} accessibilityLabel={`Vertical sea-level number line. Diver at ${value}${start === undefined ? '' : `, start ${start}`}`} style={{ width: W, height: g.height, overflow: 'hidden', borderRadius: 22, borderWidth: 2, borderBottomWidth: 3, borderColor: warmLine, backgroundColor: '#CFECEB' }}>
      <Svg width={W} height={g.height} viewBox={`0 0 ${W} ${g.height}`} accessible={false}>
        <Rect width={W} height={Math.max(0, y(0))} fill="#FFF6E2"/>
        <Path d={`M0 ${y(0)}H${W}`} stroke={lagoon} strokeWidth={4}/>
        <Line x1={x} y1={12} x2={x} y2={g.height - 12} stroke={ink} strokeWidth={3}/>
        {ticks.map(n => <G key={n}><Line x1={x-7} x2={x+7} y1={y(n)} y2={y(n)} stroke={n === 0 ? coral : ink} strokeWidth={2}/><SvgText x={x+11} y={y(n)+5} fontSize={label} fontWeight="800" fill={ink}>{n>0?`+${n}`:n}</SvgText></G>)}
        {start !== undefined && <G><Circle cx={x} cy={y(start)} r={6} fill="#F7C25E" stroke={ink} strokeWidth={1.5}/><SvgText x={4} y={y(start)-12} fontSize={label} fontWeight="800" fill={ink}>START</SvgText></G>}
      </Svg>
      <Animated.View pointerEvents="none" style={{ position:'absolute', left:Math.max(0,x-72), top:-28, transform:[{translateY:motion}] }}><Diver size={width >= 600 ? 64 : 56}/></Animated.View>
    </View>
    <Copy style={{fontSize:16,fontWeight:'800',color:ink}}>Diver at {value} {value === 0 ? '· sea level' : value > 0 ? '· above water' : '· below water'}</Copy>
  </View>;
}

function Weight({ value }: { value: number }) {
  return <Svg width={46} height={45} viewBox="0 0 46 45" accessible={false}><Path d="M16 12h14l8 28H8Z" fill="#E3A864" stroke={ink} strokeWidth="2.5"/><Rect x="17" y="4" width="12" height="10" rx="4" fill="#F5D38E" stroke={ink} strokeWidth="2"/><SvgText x="23" y="34" fontSize="17" fontWeight="900" textAnchor="middle" fill={ink}>{value}</SvgText></Svg>;
}
function BalanceBoard({ task, state, remove, divide }: { task: AlgebraTask; state: AlgebraState; remove: () => void; divide: () => void }) {
  const left = task.a + state.offset, right = task.b + state.offset;
  const removal = <Button compact quiet onPress={remove}>−{task.a} both</Button>;
  const dragWeight = Platform.OS === "web" ? React.createElement("div", { draggable: left > 0, onDragStart: e => e.dataTransfer.setData("text/plain", "balance-weight"), style: { cursor: "grab" } }, removal) : removal;
  const dropBasket = Platform.OS === "web" ? React.createElement("div", { role: "button", "aria-label": "Drop weight to remove it from both pans", onDragOver: e => e.preventDefault(), onDrop: e => { e.preventDefault(); if (e.dataTransfer.getData("text/plain") === "balance-weight") remove(); }, style: { border: `2px dashed ${amber}`, borderRadius: 14, padding: 10, textAlign: "center", color: ink, fontWeight: 800, minWidth: 110, backgroundColor: "#FFFDF8" } }, "Drop weight here") : <Copy style={{ color: ink, fontWeight: "800" }}>Take the weight off both pans.</Copy>;
  return <View style={{ backgroundColor: "#FFF6E5", borderRadius: 22, padding: 14, gap: 10, borderWidth: 1.5, borderBottomWidth: 3, borderColor: warmLine }}>
    <Copy style={{ color: amber, fontWeight: "900", textAlign: "center", fontSize: 16, letterSpacing: 0.6 }}>{task.kind === "inequality" ? "KEEP THE ≤ RELATION" : "BALANCE BOTH PANS"}</Copy>
    <View style={{ flexDirection: "row", gap: 8 }}>
      <View style={{ flex: 1, backgroundColor: C.paper, borderRadius: 18, borderWidth: 1.5, borderBottomWidth: 3, borderColor: "#D8BE94", minHeight: 105, alignItems: "center", justifyContent: "center", gap: 3 }}><Copy style={{ fontSize: 23, fontWeight: "900", color: ink }}>{state.divided || task.extra === 1 ? "x" : `${task.extra}x`} {left > 0 ? `+ ${left}` : ""}</Copy>{left > 0 && <Weight value={left}/>}</View>
      {task.kind === "inequality" && <Copy style={{ alignSelf: "center", fontSize: 26, fontWeight: "900", color: ink }}>≤</Copy>}
      <View style={{ flex: 1, backgroundColor: C.paper, borderRadius: 18, borderWidth: 1.5, borderBottomWidth: 3, borderColor: "#D8BE94", minHeight: 105, alignItems: "center", justifyContent: "center", gap: 3 }}><Copy style={{ fontSize: 23, fontWeight: "900", color: ink }}>{state.divided ? right / task.extra : right}</Copy>{!state.divided && <Weight value={right}/>}</View>
    </View>
    <Svg height="50" width="100%" viewBox="0 0 300 50"><Path d="M20 3H280M150 3V34M127 47L150 30L173 47Z" fill="#F5C96B" stroke={ink} strokeWidth="3.5" strokeLinejoin="round"/></Svg>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 8 }}>{left > 0 && dragWeight}{left > 0 && dropBasket}{left <= 0 && task.extra > 1 && !state.divided && <Button compact quiet onPress={divide}>÷{task.extra} both</Button>}</View>
    {left <= 0 && <Copy style={{ color: ink, textAlign: "center", fontWeight: "800" }}>{task.extra > 1 && !state.divided ? `Now split both sides into ${task.extra} equal groups.` : task.kind === "inequality" ? `x ≤ ${task.answer}. Choose any integer at or below ${task.answer}.` : "Both sides still match. Find x below."}</Copy>}
  </View>;
}

const steps = [-10, -5, -1, 1, 5, 10], stepLabel = (step: number) => `${step > 0 ? "+" : ""}${step}`;
/** At accessibility sizes the six steps are three to a row, wide enough that "−10" never stacks digit by digit. */
function StepControls({ value, balance, change, width }: { value: number; balance: boolean; change: (v: number) => void; width: number }) {
  const large = useWindowDimensions().fontScale >= LARGE_TEXT, key = large ? Math.floor((width - 28) / 3) : 48;
  const max = large ? Math.min(...steps.map(step => wordFitMultiplier(stepLabel(step), 18, key - 8, 2))) : undefined;
  return <View testID="algebra-steps" style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>{steps.map(step => <PressableScale key={step} accessibilityRole="button" accessibilityLabel={`${step > 0 ? "Add" : "Subtract"} ${Math.abs(step)} ${balance ? "from x" : "steps"}`} onPress={() => change(Math.max(-20, Math.min(100, value + step)))} style={{ width: key, minHeight: 52, borderRadius: 15, backgroundColor: C.paper, borderWidth: 1.5, borderBottomWidth: 3, borderColor: warmLine, alignItems: "center", justifyContent: "center" }}><Copy maxFontSizeMultiplier={max} style={{ color: ink, fontSize: 18, fontWeight: "900" }}>{stepLabel(step)}</Copy></PressableScale>)}</View>;
}

export function Board({ session, update, practice, assistance, sound, soundOn, active, cheer, coach, width }: BoardProps<AlgebraState>) {
  const space = useBoardSpace(), compact = !!space?.ready && space.width < 600;
  const wide = useBoardColumns(), side = wide || !!space?.ready && width >= 304 && width < 600;
  const controlsWidth = side ? Math.max(160, width - (wide ? width * .46 : 144)) : width;
  const state = session.state, task = state.tasks[state.index];
  const [feedback, setFeedback] = useState(""), [hint, setHint] = useState(false);
  const balance = task ? ["balance", "two-step", "inequality"].includes(task.kind) : false;
  const title = !task ? "" : task.kind === "steps" || task.kind === "depth" ? `Start at ${task.a}. ${task.b > 0 ? "Climb" : "Dive"} ${Math.abs(task.b)} ${Math.abs(task.b) === 1 ? "step" : "steps"}.`
    : task.kind === "missing" ? `□ + ${task.b} = ${task.a}`
    : task.kind === "balance" ? `x + ${task.a} = ${task.b}`
    : task.kind === "two-step" ? `${task.extra}x + ${task.a} = ${task.b}`
    : task.kind === "substitution" ? `If x = ${task.extra}, find ${task.a} + ${task.b} × x`
    : task.kind === "pattern" ? `Continue ${task.a}, ${task.a+task.b}, ${task.a+2*task.b}, ...`
    : task.kind === "expression" ? `Find ${task.a} + ${task.b} × ${task.extra}`
    : `${task.extra}x + ${task.a} ≤ ${task.b}`;
  const instruction = !task ? "" : task.kind === "inequality" ? "Keep ≤ as you remove and divide both sides. Choose an integer that makes the inequality true." : task.kind === "pattern" ? "Find the repeated step. Move the diver to the next number after the last shown." : task.kind === "expression" ? "Multiply before adding. Move the diver to the result." : balance ? "Remove the same treasure from both pans. Split both sides if x has a group, then set x." : task.kind === "missing" ? "What number is hiding in the box? Move the diver to show x." : task.kind === "substitution" ? "Put the given x into the expression. Multiply before adding." : "The diver begins at START. Use the steps to move up or down.";
  const spokenTitle = !task ? "" : title.replace("□", "what number").replace("×", "times").replace("≤", "is less than or equal to");
  const spokenPrompt = !task ? null : `${state.index === 0 && session.revision === 0 && engine.spokenIntro ? `${engine.spokenIntro} ` : ""}${spokenTitle}. ${instruction.replace("≤", "less than or equal to")}`;
  const { replay, speak } = useSpokenPrompt(spokenPrompt, `${session.id}:${state.index}`, { soundOn, active: active && !!task });
  if (!task) return null;
  const change = (patch: Partial<AlgebraState>) => { update({ ...state, ...patch }); setFeedback(""); sound("tap", true); coach.done(); };
  const check = () => {
    const right = solved(state);
    practice(task.kind === "steps" || task.kind === "pattern" ? "num.patterns" : task.kind === "depth" ? "num.integers" : task.kind === "missing" || task.kind === "expression" ? "num.expressions" : task.kind === "balance" ? "num.balance" : "num.two-step", right);
    if (!right) {
      const msg = "The chest is still locked. Check the line or both pans and try again.";
      setFeedback(msg);
      sound("tap", true);
      speak(msg);
      return;
    }
    cheer("right"); setFeedback(""); setHint(false);
    update({ ...state, index: state.index + 1, value: initialValue(state.tasks[state.index + 1]), offset: 0, divided: false });
  };
  const headerCard = <View style={{ backgroundColor: sand, borderRadius: 20, borderWidth: 1.5, borderColor: warmLine, padding: compact ? 12 : 16, gap: compact ? 4 : 7 }}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}><Copy style={{ color: amber, fontWeight: "900" }}>CHEST {state.index + 1} OF 5</Copy><SpeakButton testID="treasure-algebra-speak" label="Hear algebra prompt" disabled={!soundOn || !active} onPress={replay} /></View><Heading>{title}</Heading><Copy>{instruction}</Copy></View>;
  return <View style={{ gap: compact ? 8 : 14, paddingBottom: 20 }}>

    {!wide && headerCard}
    {balance && <BalanceBoard task={task} state={state} remove={() => change({ offset: -task.a, divided: false })} divide={() => change({ divided: true })}/>}
    {!balance && task.kind === "substitution" && <View style={{ backgroundColor: "#FFFDF8", borderRadius: 20, borderWidth: 1.5, borderBottomWidth: 3, borderColor: warmLine, padding: 15, alignItems: "center" }}><Copy style={{ color: ink, fontSize: 26, fontWeight: "900" }}>{task.a} + {task.b} × {task.extra} = ?</Copy></View>}
    <BoardColumns side={side} drawingWidth={wide ? undefined : side ? 132 : undefined} drawing={<SeaLine narrow={side && !wide} value={state.value} start={task.kind === "steps" || task.kind === "depth" ? task.a : undefined}/>}>
    {wide && headerCard}
    <StepControls value={state.value} balance={balance} change={value => change({ value })} width={controlsWidth}/>
<Button onPress={check}>Open chest</Button></BoardColumns>
    {hint && <View style={{ backgroundColor: "#FFF8DC", borderRadius: 14, borderWidth: 1, borderColor: warmLine, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 }}><Copy style={{ flex: 1, fontWeight: "700", color: ink }}>{workedHint(task)}</Copy><SpeakButton testID="treasure-algebra-speak-hint" label="Hear algebra hint" text="Hear" disabled={!soundOn || !active} onPress={() => speak(workedHint(task).replace("×", "times").replace("≤", "less than or equal to"))} /></View>}
    {!!feedback && <Copy style={{ color: C.error, fontWeight: "800" }}>{feedback}</Copy>}
    <View style={{ flexDirection: "row", gap: 8 }}><Button quiet compact onPress={() => { const nextOpen = !hint; if (!hint) assistance?.(); setHint(nextOpen); update({ ...state, helped: true }); sound("tap", true); if (nextOpen) speak(workedHint(task).replace("×", "times").replace("≤", "less than or equal to")); }}>Hint</Button></View>
  </View>;
}

export function Art({ size }: { size: number }) {
  return <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false}>
    <Ellipse cx="50" cy="82" rx="44" ry="9" fill={ink} opacity={0.14}/>
    <Path d="M12 40Q50 9 88 40V75H12Z" fill="#E5AC68" stroke={ink} strokeWidth="4"/>
    <Path d="M12 40Q50 20 88 40L78 49Q50 34 22 49Z" fill="#F4C984" stroke={ink} strokeWidth="3"/>
    <Rect x="12" y="49" width="76" height="30" rx="5" fill="#BC7540" stroke={ink} strokeWidth="4"/>
    <Path d="M50 38V79M12 60H88" stroke="#F6DA83" strokeWidth="6"/>
    <Circle cx="50" cy="61" r="9" fill="#FFE8A6" stroke={ink} strokeWidth="2"/><Path d="M50 56v10" stroke={ink} strokeWidth="3" strokeLinecap="round"/>
    <Path d="M8 26l4-8m76 8l-4-8M50 12V3" stroke="#E7AC52" strokeWidth="3" strokeLinecap="round"/>
  </Svg>;
}
