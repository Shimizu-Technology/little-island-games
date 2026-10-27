import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import Svg, { Circle, Path, Rect, Text as SvgText } from "react-native-svg";
import { useSharedValue } from "react-native-reanimated";
import { useReducedMotion } from "../../../components/motion";
import { Copy, PressableScale } from "../../../components/ui";
import { Text } from "../../../components/Text";
import { useArcadeLoop, type FrameBudget } from "../../loop";
import { ArcadeSprite, type SpritePose } from "../../Sprite";
import type { ArcadeResult } from "../../types";
import type { OutfitId } from "../../progress";
import { createFlight, flightGap, flightLearning, flightResult, flightStep, flightTransition, type FlightInput, type FlightState } from "../fruit-bat-flight/engine";
import { createRun, runLearning, runResult, runStep, runTransition, type RunInput, type RunState } from "../lagoon-run/engine";
import { equation, type ScrollGame, type ScrollLevel } from "./content";
import { Fruit, Hazard, PalmColumn, Scenery, ScrollHero } from "./Art";
export type BoardProps = { level: ScrollLevel | "endless"; seed: number; active: boolean; helper: boolean; outfit: OutfitId; onResult: (result: ArcadeResult, helped: boolean) => void; onTone: (key: string, haptic?: boolean) => void; onPause?: () => void; debug: boolean };
const still: SpritePose = { x: -200, y: -200, opacity: 0 };
function Budget({ budget }: { budget: FrameBudget }) { return <Text testID="arcade-budget" style={{ color: "#FFFFFF", backgroundColor: "#14273E", fontSize: 11, padding: 4 }}>{budget.fps.toFixed(1)} fps · p95 {budget.p95.toFixed(1)} ms / 16.7 · max {budget.max.toFixed(1)} · {budget.ticks} steps · {budget.dropped.toFixed(2)}s clamped</Text>; }
const Portal = memo(function Portal({ value, index, wide = false }: { value: number; index: number; wide?: boolean }) { return <Svg width="100%" height="100%" viewBox={wide ? "0 0 100 90" : "0 0 90 90"} accessible={false}><Rect x={5} y={5} width={wide ? 90 : 80} height={80} rx={22} fill={["#F6C76D", "#A9E7E1", "#DEB1EF"][index]} stroke="#374565" strokeWidth={5}/><Path d={index === 0 ? "M17 20L24 10L31 20Z" : index === 1 ? "M22 11L29 18L22 25L15 18Z" : "M17 13H29V25H17Z"} fill="#3C4760"/><SvgText x={wide ? 51 : 46} y={62} textAnchor="middle" fill="#27364E" fontWeight="900" fontSize={42}>{value}</SvgText></Svg>; });
function useKeyboard(active: boolean, action: (key: string) => void) {
  useEffect(() => { if (Platform.OS !== "web" || !active) return; const handler = (e: KeyboardEvent) => { if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyA", "KeyD", "KeyW", "KeyS"].includes(e.code)) { e.preventDefault(); if (!e.repeat) action(e.code); } }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [active, action]);
}
function Control({ label, glyph, onPress, disabled = false }: { label: string; glyph: string; onPress: () => void; disabled?: boolean }) { return <PressableScale disabled={disabled} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ minWidth: 56, minHeight: 52, paddingHorizontal: 15, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: "#FFF2CC", borderWidth: 2, borderBottomWidth: 5, borderColor: "#725B66" }}><Text style={{ fontSize: 25, fontWeight: "900", color: "#34354D" }}>{glyph}</Text></PressableScale>; }
function HUD({ progress, target, collected, learning, onPause }: { progress: number; target: number | string; collected: number; learning: boolean; onPause?: () => void }) {
  return <View style={{ position: "absolute", top: 12, left: 12, right: 12, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "space-between" }}><View style={{ borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#192B49", borderWidth: 2, borderColor: "#A8D5DB" }}><Text accessibilityLabel={`${progress} of ${target} ${learning ? "answers" : "markers"}`} style={{ color: "#FFF4D3", fontWeight: "800", fontSize: 18 }}>{learning ? "＝" : "⚑"} {progress}/{target}　★ {collected}</Text></View>{onPause && <Control label="Pause game" glyph="Ⅱ" onPress={onPause}/>}</View>;
}
const Particle = memo(function Particle() { return <Svg width={20} height={20} viewBox="0 0 20 20"><Path d="M10 1L13 7L19 10L13 13L10 19L7 13L1 10L7 7Z" fill="#FFE294" stroke="#FFF9D4" strokeWidth={1}/></Svg>; });
function feedback(cue: string, collected = 0) { if (["fruit", "shell"].includes(cue) && collected > 0 && collected % 3 === 0) return "Combo! +40"; return cue === "answer" ? "Great! +60" : cue === "try" ? "Try the answer again" : cue === "bump" ? "Whoops! Keep going" : cue === "fruit" || cue === "shell" ? "+40 · Nice!" : ""; }
export function FlightBoard(props: BoardProps) {
  const { level, seed, active, helper, outfit, onResult, onTone, onPause, debug } = props;
  const [size, setSize] = useState({ w: 390, h: 700 }), reduced = useReducedMotion(), poses = useSharedValue<SpritePose[]>(Array.from({ length: 34 }, () => still));
  const [initial] = useState(() => createFlight(level, seed, helper)), done = useRef(false), lastEvent = useRef(0);
  const heroSize = Math.min(126, size.w * .23, size.h * .19), gateWidth = Math.min(100, size.w * .14);
  const publish = useCallback((s: FlightState) => {
    const learn = flightLearning(s), p: SpritePose[] = [];
    p[0] = { x: size.w * .24 - heroSize / 2 + (!reduced && s.cooldown ? Math.sin(s.time * 45) * 3 : 0), y: size.h * s.y - heroSize / 2, angle: reduced ? 0 : s.cooldown ? Math.sin(s.time * 17) * .15 : s.vy * .55, scale: reduced ? 1 : 1 + Math.sin(s.flap * 18) * .06 };
    s.gates.forEach((g, i) => {
      p[1 + i] = { x: g.x * size.w - gateWidth / 2, y: 0, opacity: learn ? 0 : .98 };
      p[5 + i] = { x: g.x * size.w - 25, y: g.center * size.h - 25, opacity: !learn && g.fruit && !g.passed ? 1 : 0, scale: 1.12 };
      for (let c = 0; c < 3; c++) p[9 + i * 3 + c] = { x: g.x * size.w - 32, y: [.24, .5, .76][c] * size.h - 32, opacity: learn && !g.passed ? 1 : 0 };
    });
    for (let i = 0; i < 6; i++) { const phase = 1 - s.feedback / .85, a = i * Math.PI / 3; p[21 + i] = { x: size.w * .24 + Math.cos(a) * phase * 75, y: s.y * size.h + Math.sin(a) * phase * 70, opacity: !reduced && s.feedback > 0 && ["fruit", "answer"].includes(s.cue) ? s.feedback : 0, scale: .5 + s.feedback * .7 }; }
    for (let i = 0; i < 6; i++) p[27 + i] = { x: size.w * ((i * .173 + .1) % 1) + (reduced ? 0 : Math.sin(s.time * .5 + i) * 12), y: size.h * (.18 + (i % 3) * .25) + (reduced ? 0 : Math.sin(s.time + i * 3) * 14), opacity: .65, scale: .6 + (i % 3) * .2 };
    p[33] = { x: !reduced && s.cooldown ? Math.sin(s.time * 43) * 2 : 0, y: 0 };
    // eslint-disable-next-line react-hooks/immutability -- Reanimated shared handles intentionally publish poses outside React.
    poses.value = p;
  }, [poses, size, heroSize, gateWidth, reduced]);
  const { snapshot: s, dispatch, budget } = useArcadeLoop<FlightState, FlightInput>({ initial, step: flightStep, reduce: flightTransition, input: { type: "idle" }, active, onFrame: publish });
  useEffect(() => { dispatch({ type: "helper", value: helper }); }, [dispatch, helper, active]);
  useEffect(() => { const r = flightResult(s); if (r && !done.current) { done.current = true; onResult(r, s.helped); } if (s.event !== lastEvent.current) { lastEvent.current = s.event; if (["fruit", "answer"].includes(s.cue)) onTone("clear"); else if (["bump", "try"].includes(s.cue)) onTone("shell-0"); } }, [s, onResult, onTone]);
  const flap = useCallback(() => { if (!active) return; dispatch({ type: "flap" }); onTone("shell-2", false); }, [active, dispatch, onTone]);
  useKeyboard(active, useCallback(() => flap(), [flap]));
  const learn = flightLearning(s), next = s.gates.filter(g => !g.passed && g.x >= .2).sort((a, b) => a.x - b.x)[0];
  return <View testID="flight-field" style={{ flex: 1, overflow: "hidden", backgroundColor: "#172B42" }} onLayout={e => { const { width: w, height: h } = e.nativeEvent.layout; if (w > 0 && h > 0) setSize({ w, h }); }}>
    <ArcadeSprite poses={poses} index={33} width={size.w} height={size.h}><Scenery game="fruit-bat-flight" world={level === "endless" ? "w3" : level.world} storm={level !== "endless" && level.storm}/></ArcadeSprite>
    {Array.from({ length: 6 }, (_, i) => <ArcadeSprite key={`ambient${i}`} poses={poses} index={27 + i} width={24} height={24}><Svg width={24} height={24}><Circle cx={12} cy={12} r={10} fill="#EFFFA5" opacity={.15}/><Circle cx={12} cy={12} r={3} fill="#F3FFBB"/></Svg></ArcadeSprite>)}
    {s.gates.map((g, i) => <ArcadeSprite key={`p${i}`} poses={poses} index={1 + i} width={gateWidth} height={size.h}><PalmColumn width={gateWidth} height={size.h} center={g.center} gap={flightGap(s)}/></ArcadeSprite>)}
    {s.gates.map((_, i) => <ArcadeSprite key={`f${i}`} poses={poses} index={5 + i} width={50} height={50}><Fruit/></ArcadeSprite>)}
    {learn && s.gates.flatMap((g, i) => g.fact.choices.map((n, c) => <ArcadeSprite key={`a${i}-${c}`} poses={poses} index={9 + i * 3 + c} width={64} height={64}><Portal value={n} index={c}/></ArcadeSprite>))}
    <ArcadeSprite poses={poses} index={0} width={heroSize} height={heroSize}><ScrollHero game="fruit-bat-flight" size={heroSize} outfit={outfit}/></ArcadeSprite>
    {Array.from({ length: 6 }, (_, i) => <ArcadeSprite key={`e${i}`} poses={poses} index={21 + i} width={20} height={20}><Particle/></ArcadeSprite>)}
    <View accessible accessibilityRole="button" accessibilityLabel="Flight sky. Tap to flap" onStartShouldSetResponder={() => active} onResponderGrant={flap} style={{ position: "absolute", top: 70, bottom: 80, left: 0, right: 0, ...(Platform.OS === "web" ? { touchAction: "none" as const } : {}) }}/>
    <HUD progress={s.passed} target={level === "endless" ? "∞" : level.target} collected={s.fruit} learning={learn} onPause={onPause}/>
    {learn && next && <View pointerEvents="none" style={{ position: "absolute", top: 82, alignSelf: "center", padding: 8, borderRadius: 18, backgroundColor: "#192B49" }}><Text testID="math-fact" style={{ color: "#FFF4D3", fontSize: 29, fontWeight: "900" }}>{equation(next.fact)}</Text></View>}
    {s.feedback > 0 && <View pointerEvents="none" style={{ position: "absolute", top: "45%", alignSelf: "center", backgroundColor: "#192B49", padding: 8, borderRadius: 14 }}><Text style={{ color: "#FFF0B1", fontSize: 23, fontWeight: "900" }}>{feedback(s.cue, s.fruit)}</Text></View>}
    <View style={{ position: "absolute", left: 14, right: 14, bottom: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}><Copy style={{ color: "#FFF8DD", backgroundColor: "#192B49", padding: 8, borderRadius: 12, fontSize: 15 }}>{learn ? "Fly through the answer" : "Tap to flutter"}</Copy><Control disabled={!active} label="Flap wings" glyph="↑ Flap" onPress={flap}/>{level === "endless" && <Control label="Finish free flight" glyph="✓" onPress={() => dispatch({ type: "finish" })}/>}</View>
    {debug && <View pointerEvents="none" style={{ position: "absolute", left: 0, bottom: 75 }}><Budget budget={budget}/></View>}
  </View>;
}
export function RunBoard(props: BoardProps) {
  const { level, seed, active, helper, outfit, onResult, onTone, onPause, debug } = props;
  const [size, setSize] = useState({ w: 390, h: 700 }), reduced = useReducedMotion(), poses = useSharedValue<SpritePose[]>(Array.from({ length: 39 }, () => still));
  const [initial] = useState(() => createRun(level, seed, helper)), done = useRef(false), lastEvent = useRef(0), pointer = useRef({ x: 0, y: 0 });
  const heroSize = Math.min(155, size.h * .24, size.w * .26);
  const publish = useCallback((s: RunState) => {
    const learn = runLearning(s), p: SpritePose[] = [], jump = s.jump > 0 ? Math.sin((1.1 - s.jump) / 1.1 * Math.PI) : 0, ground = size.h * .82;
    p[0] = { x: size.w / 2 + (s.poseLane - 1) * size.w * .309 - heroSize / 2, y: ground - heroSize * .9 - jump * size.h * .16 + (!reduced && !s.jump && !s.duck ? Math.sin(s.time * 17) * 3 : s.duck ? heroSize * .25 : 0), angle: reduced ? 0 : s.cooldown ? Math.sin(s.time * 20) * .15 : (s.lane - s.poseLane) * .2, scale: s.duck ? .62 : 1 };
    s.rows.forEach((row, i) => {
      const z = Math.max(0, Math.min(1.15, row.z)), scale = .24 + z * .92, y = size.h * (.34 + .62 * z * z), laneX = (n: number) => size.w / 2 + (n - 1) * size.w * (.08 + .26 * z), visible = row.z >= 0 && row.z < 1.12 && !row.passed;
      p[1 + i] = { x: laneX(row.lane) - 50, y: y - 85, scale, opacity: visible && !learn ? 1 : 0 };
      p[6 + i] = { x: laneX(row.shellLane) - 25, y: y - 45, scale: scale * 1.3, opacity: visible && !learn ? 1 : 0 };
      for (let c = 0; c < 3; c++) p[11 + i * 3 + c] = { x: laneX(c) - 40, y: y - 67, scale: Math.min(scale, size.w / 350), opacity: visible && learn ? 1 : 0 };
    });
    for (let i = 0; i < 6; i++) { const phase = 1 - s.feedback / .9, a = i * Math.PI / 3; p[26 + i] = { x: size.w / 2 + (s.lane - 1) * size.w * .309 + Math.cos(a) * phase * 75, y: ground - heroSize * .6 + Math.sin(a) * phase * 70, opacity: !reduced && s.feedback > 0 && ["shell", "answer"].includes(s.cue) ? s.feedback : 0, scale: .5 + s.feedback }; }
    for (let i = 0; i < 6; i++) p[32 + i] = { x: size.w * (i < 3 ? .035 : .91), y: size.h * (.52 + (i % 3) * .16) + (reduced ? 0 : Math.sin(s.time * .7 + i) * 9), opacity: .65, scale: 1.3 };
    p[38] = { x: !reduced && s.cooldown ? Math.sin(s.time * 43) * 2 : 0, y: 0 };
    // eslint-disable-next-line react-hooks/immutability -- Reanimated shared handles intentionally publish poses outside React.
    poses.value = p;
  }, [poses, size, heroSize, reduced]);
  const { snapshot: s, dispatch, budget } = useArcadeLoop<RunState, RunInput>({ initial, step: runStep, reduce: runTransition, input: { type: "idle" }, active, onFrame: publish });
  useEffect(() => { dispatch({ type: "helper", value: helper }); }, [dispatch, helper, active]);
  useEffect(() => { const r = runResult(s); if (r && !done.current) { done.current = true; onResult(r, s.helped); } if (s.event !== lastEvent.current) { lastEvent.current = s.event; if (["shell", "answer"].includes(s.cue)) onTone("clear"); else if (["bump", "try"].includes(s.cue)) onTone("shell-0"); } }, [s, onResult, onTone]);
  const action = useCallback((input: RunInput) => { if (!active) return; dispatch(input); onTone(input.type === "jump" ? "shell-4" : input.type === "duck" ? "shell-1" : "coral", false); }, [active, dispatch, onTone]);
  useKeyboard(active, useCallback(key => action({ type: ["ArrowLeft", "KeyA"].includes(key) ? "left" : ["ArrowRight", "KeyD"].includes(key) ? "right" : ["ArrowDown", "KeyS"].includes(key) ? "duck" : "jump" }), [action]));
  const learn = runLearning(s), next = s.rows.filter(r => !r.passed && r.z < .9).sort((a, b) => b.z - a.z)[0];
  return <View testID="run-field" style={{ flex: 1, overflow: "hidden", backgroundColor: "#297C95" }} onLayout={e => { const { width: w, height: h } = e.nativeEvent.layout; if (w > 0 && h > 0) setSize({ w, h }); }}>
    <ArcadeSprite poses={poses} index={38} width={size.w} height={size.h}><Scenery game="lagoon-run" world={level === "endless" ? "w3" : level.world} storm={level !== "endless" && level.storm}/></ArcadeSprite>
    {Array.from({ length: 6 }, (_, i) => <ArcadeSprite key={`ambient${i}`} poses={poses} index={32 + i} width={24} height={24}><Svg width={24} height={24}><Path d="M2 8Q8 3 13 8T24 8M2 16Q8 11 13 16T24 16" stroke="#D2F5E5" strokeWidth={3} fill="none"/></Svg></ArcadeSprite>)}
    {s.rows.map((row, i) => <ArcadeSprite key={`o${i}`} poses={poses} index={1 + i} width={100} height={100}><Hazard kind={row.kind}/></ArcadeSprite>)}
    {s.rows.map((_, i) => <ArcadeSprite key={`s${i}`} poses={poses} index={6 + i} width={50} height={50}><Fruit shell/></ArcadeSprite>)}
    {learn && s.rows.flatMap((row, i) => row.fact.choices.map((n, c) => <ArcadeSprite key={`a${i}-${c}`} poses={poses} index={11 + i * 3 + c} width={80} height={80}><Portal value={n} index={c}/></ArcadeSprite>))}
    <ArcadeSprite poses={poses} index={0} width={heroSize} height={heroSize}><ScrollHero game="lagoon-run" size={heroSize} outfit={outfit} back/></ArcadeSprite>
    {Array.from({ length: 6 }, (_, i) => <ArcadeSprite key={`e${i}`} poses={poses} index={26 + i} width={20} height={20}><Particle/></ArcadeSprite>)}
    <View accessible accessibilityRole="button" accessibilityLabel="Lagoon track. Swipe to steer, up to jump, down to duck. Or tap a lane." onStartShouldSetResponder={() => active} onResponderGrant={e => { pointer.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }; }} onResponderRelease={e => { if (!active) return; const dx = e.nativeEvent.pageX - pointer.current.x, dy = e.nativeEvent.pageY - pointer.current.y; if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) action({ type: "lane", lane: Math.min(2, Math.floor(e.nativeEvent.locationX / size.w * 3)) }); else action({ type: Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "duck" : "jump" }); }} style={{ position: "absolute", top: 72, bottom: 77, left: 0, right: 0, ...(Platform.OS === "web" ? { touchAction: "none" as const } : {}) }}/>
    <HUD progress={s.passed} target={level === "endless" ? "∞" : level.target} collected={s.shells} learning={learn} onPause={onPause}/>
    {learn && next && <View pointerEvents="none" style={{ position: "absolute", top: 82, alignSelf: "center", padding: 8, borderRadius: 18, backgroundColor: "#192B49" }}><Text testID="math-fact" style={{ color: "#FFF4D3", fontSize: 29, fontWeight: "900" }}>{equation(next.fact)}</Text></View>}
    {s.feedback > 0 && <View pointerEvents="none" style={{ position: "absolute", top: "44%", alignSelf: "center", backgroundColor: "#192B49", padding: 8, borderRadius: 14 }}><Text style={{ color: "#FFF0B1", fontSize: 23, fontWeight: "900" }}>{feedback(s.cue, s.shells)}</Text></View>}
    {!learn && next && next.z > .35 && !next.passed && next.lane === s.lane && <View pointerEvents="none" style={{ position: "absolute", top: 83, alignSelf: "center", backgroundColor: "#192B49", padding: 8, borderRadius: 14 }}><Text style={{ color: "#FFF3CF", fontWeight: "800", fontSize: 18 }}>{["coconut", "crab"].includes(next.kind) ? "↑ Jump or switch lanes" : "↓ Duck or switch lanes"}</Text></View>}
    <View style={{ position: "absolute", left: 12, right: 12, bottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 6 }}><Control disabled={!active} label="Move left" glyph="←" onPress={() => action({ type: "left" })}/><Control disabled={!active} label="Jump" glyph="↑" onPress={() => action({ type: "jump" })}/><Control disabled={!active} label="Duck" glyph="↓" onPress={() => action({ type: "duck" })}/><Control disabled={!active} label="Move right" glyph="→" onPress={() => action({ type: "right" })}/>{level === "endless" && <Control label="Finish free run" glyph="✓" onPress={() => dispatch({ type: "finish" })}/>}</View>
    {debug && <View pointerEvents="none" style={{ position: "absolute", left: 0, bottom: 75 }}><Budget budget={budget}/></View>}
  </View>;
}
export function ScrollBoard({ game, ...props }: BoardProps & { game: ScrollGame }) { return game === "fruit-bat-flight" ? <FlightBoard {...props}/> : <RunBoard {...props}/>; }
