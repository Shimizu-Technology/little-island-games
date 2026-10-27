import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, View } from "react-native";
import Svg, { Path, Rect, Text as SvgText } from "react-native-svg";
import { useSharedValue, type SharedValue } from "react-native-reanimated";
import { useReducedMotion } from "../../../components/motion";
import { Button } from "../../../components/ui";
import { Text } from "../../../components/Text";
import { PressControl, PlayfieldTarget, useSwipe } from "../../Input";
import { HeartsHud, HitReaction } from "../../LivesHud";
import { useArcadeUiLoop } from "../../uiLoop";
import { ArcadeSprite, type SpritePose } from "../../Sprite";
import type { ArcadeResult } from "../../types";
import type { OutfitId } from "../../progress";
import { createFlight, flightGap, flightLearning, flightResult, type FlightInput, type FlightState } from "../fruit-bat-flight/engine";
import { createRun, jumpHeight, obstacleLane, runLearning, runResult, type RunInput, type RunState } from "../lagoon-run/engine";
import { projectTrack, trackSprite } from "../lagoon-run/camera";
import { equation, type ScrollGame, type ScrollLevel } from "./content";
import { Fruit, Hazard, Scenery } from "./Art";
import { BatRig, PalmPiece, RunnerRig, TrackBackdrop, LastHit } from "./FeelArt";
import { flightFrame, runFrame, type Commands } from "./commands";
export type BoardProps = { level: ScrollLevel | "endless"; seed: number; active: boolean; helper: boolean; outfit: OutfitId; onResult: (result: ArcadeResult, helped: boolean) => void; onTone: (key: string, haptic?: boolean) => void; onPause?: () => void; debug: boolean };
const W = 390, H = 660, still: SpritePose = { x: -2000, y: -2000, opacity: 0 };
const Portal = memo(function Portal({ value, index }: { value: number; index: number }) { return <Svg width={64} height={64} viewBox="0 0 64 64"><Rect x={3} y={3} width={58} height={58} rx={16} fill={["#F6C76D", "#A9E7E1", "#DEB1EF"][index]} stroke="#374565" strokeWidth={3}/><SvgText x={32} y={45} textAnchor="middle" fill="#27364E" fontWeight="900" fontSize={36}>{value}</SvgText></Svg>; });
const Particle = memo(function Particle() { return <Svg width={12} height={12}><Path d="M6 0L8 4L12 6L8 8L6 12L4 8L0 6L4 4Z" fill="#FFE294"/></Svg>; });
function useKeyboard(active: boolean, action: (key: string) => void) {
  useEffect(() => { if (Platform.OS !== "web" || !active) return; const handler = (e: KeyboardEvent) => { if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyA", "KeyD", "KeyW", "KeyS"].includes(e.code)) { e.preventDefault(); if (!e.repeat) action(e.code); } }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [active, action]);
}
function Control({ label, glyph, onPress, disabled = false }: { label: string; glyph: string; onPress: () => void; disabled?: boolean }) { return <PressControl disabled={disabled} accessibilityLabel={label} onPress={onPress} haptic={false} style={{ minWidth: 58, minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: "#FFF2CC", borderWidth: 2, borderBottomWidth: 5, borderColor: "#725B66" }}><Text style={{ fontSize: 25, fontWeight: "900", color: "#34354D" }}>{glyph}</Text></PressControl>; }
function Arena({ children, game, controls, hud, overlay }: { children: React.ReactNode; game: string; controls: React.ReactNode; hud: React.ReactNode; overlay?: React.ReactNode }) {
  const [size, setSize] = useState({ w: W, h: H }), scale = Math.min(size.w / W, size.h / H);
  return <View testID={`${game}-field`} style={{ flex: 1, overflow: "hidden", backgroundColor: "#172B42" }} onLayout={e => { const { width, height } = e.nativeEvent.layout; if (width && height) setSize({ w: width, h: height }); }}><View style={{ position: "absolute", width: W, height: H, left: (size.w - W) / 2, top: (size.h - H) / 2, transform: [{ scale }], overflow: "hidden" }}>{children}</View>{hud}{overlay}{controls}</View>;
}
function useMailbox<I>(helper: boolean, active: boolean) {
  const input = useSharedValue<Commands<I>>({ helper, queue: [] }), serial = useRef(0), queue = useRef<Commands<I>["queue"]>([]);
  useEffect(() => { input.set({ helper, queue: active ? queue.current : [] }); if (!active) queue.current = []; }, [helper, active, input]);
  const send = useCallback((action: I) => { if (!active) return; queue.current = [...queue.current.slice(-31), { id: ++serial.current, action }]; input.set({ helper, queue: queue.current }); }, [input, helper, active]);
  return { input, send };
}
function useOutcome(s: FlightState | RunState, result: ArcadeResult | null, props: BoardProps) {
  const done = useRef(false), last = useRef(0), { active, onResult, onTone } = props;
  useEffect(() => {
    if (s.event !== last.current) { last.current = s.event; if (["fruit", "shell", "answer"].includes(s.cue)) onTone("clear", true); else if (s.cue === "try") onTone("shell-0", false); }
  }, [s.event, s.cue, onTone]);
  useEffect(() => {
    if (!result || !active || done.current) return;
    const report = () => { done.current = true; onResult(result, s.helped); };
    if (result.outcome === "stopped") { report(); return; }
    const timer = setTimeout(report, result.outcome === "cleared" ? 380 : 320); return () => clearTimeout(timer);
  }, [result, active, onResult, s.helped]);
}
function Hud({ s, learning }: { s: FlightState | RunState; learning: boolean }) {
  return <View pointerEvents="none" style={{ position: "absolute", left: 10, right: 10, top: 8, gap: 5, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}><View style={{ borderRadius: 16, padding: 9, backgroundColor: "#192B49" }}><Text testID="scroll-progress" style={{ color: "#FFF4D3", fontWeight: "800", fontSize: 18 }}>{s.passed}/{s.level === "endless" ? "∞" : s.level.target} · {s.score} pts</Text></View>{!learning && <HeartsHud lives={s.lives}/>}</View>;
}
const FlightLayer = memo(function FlightLayer({ poses, facts, learn, world, storm }: { poses: SharedValue<SpritePose[]>; facts: number[][]; learn: boolean; world: string; storm: boolean }) {
  return <View testID="flight-art" pointerEvents="none" style={{ position: "absolute", width: W, height: H }}><Scenery game="fruit-bat-flight" world={world} storm={storm}/>{Array.from({ length: 4 }, (_, i) => <React.Fragment key={i}><ArcadeSprite poses={poses} index={1 + i * 2} width={46} height={660}><PalmPiece/></ArcadeSprite><ArcadeSprite poses={poses} index={2 + i * 2} width={46} height={660}><PalmPiece bottom/></ArcadeSprite><ArcadeSprite poses={poses} index={9 + i} width={32} height={32}><Fruit size={32}/></ArcadeSprite>{learn && facts[i].map((n, c) => <ArcadeSprite key={c} poses={poses} index={13 + i * 3 + c} width={64} height={64}><Portal value={n} index={c}/></ArcadeSprite>)}</React.Fragment>)}{Array.from({ length: 6 }, (_, i) => <ArcadeSprite key={`p${i}`} poses={poses} index={25 + i} width={12} height={12}><Particle/></ArcadeSprite>)}<ArcadeSprite poses={poses} index={33} width={70} height={30}><Text style={{ color: "#FFF2BD", fontSize: 23, fontWeight: "900" }}>+1</Text></ArcadeSprite></View>;
});
export function FlightBoard(props: BoardProps) {
  const { level, seed, active, helper, outfit, onTone, debug } = props, reduced = useReducedMotion();
  const [initial] = useState(() => createFlight(level, seed, helper)), poses = useSharedValue<SpritePose[]>(Array.from({ length: 34 }, () => still));
  const { input, send } = useMailbox<FlightInput>(helper, active);
  const publish = useCallback((s: FlightState) => {
    "worklet";
    const p: SpritePose[] = [], learn = flightLearning(s), gap = flightGap(s), x = W * .24, y = s.y * H;
    const tumble = !reduced && s.cooldown > 0 && s.cue === "bump" ? (1 - s.cooldown / .3) * Math.PI * 2 : 0;
    const angle = reduced ? 0 : s.status === "cleared" ? -.2 : tumble || Math.max(-.436, Math.min(1.134, s.vy * 1.4));
    p[0] = { x: x - 17, y: y - 30, angle };
    const wing = reduced ? 0 : s.flap > 0 ? Math.sin(s.flap / .12 * Math.PI) * .9 : Math.sin(s.time * 9) * .1;
    p[31] = { x: x - 49, y: y - 26, angle: angle + wing, scale: 1 }; p[32] = { x: x + 4, y: y - 26, angle: angle - wing, scale: 1 };
    s.gates.forEach((g, i) => {
      p[1 + i * 2] = { x: g.x * W - 23, y: (g.center - gap / 2) * H - H, opacity: learn ? 0 : 1 };
      p[2 + i * 2] = { x: g.x * W - 23, y: (g.center + gap / 2) * H, opacity: learn ? 0 : 1 };
      p[9 + i] = { x: g.x * W - 16, y: g.center * H - 16, opacity: !learn && !g.passed ? 1 : 0 };
      for (let c = 0; c < 3; c++) p[13 + i * 3 + c] = { x: g.x * W - 32, y: [.24, .5, .76][c] * H - 32, opacity: learn && !g.passed ? 1 : 0 };
    });
    const feedback = s.feedback / .45, scored = s.lastGain > 0, hit = s.cue === "bump";
    p[33] = { x: W * .44, y: H * .2 - (1 - feedback) * 22, opacity: scored ? feedback : 0 };
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; p[25 + i] = { x: x + Math.cos(a) * (1 - feedback) * 55, y: y + Math.sin(a) * (1 - feedback) * 55, opacity: !reduced && (scored || hit) ? feedback : 0 }; }
    poses.set(p);
  }, [poses, reduced]);
  const { snapshot: s } = useArcadeUiLoop({ initial, input, step: flightFrame, result: flightResult, onFrame: publish, active });
  const result = useMemo(() => flightResult(s), [s]); useOutcome(s, result, props);
  const flap = useCallback(() => { send({ type: "flap" }); if (active) onTone("shell-2", false); }, [send, onTone, active]);
  useKeyboard(active, useCallback(() => flap(), [flap]));
  const learn = flightLearning(s), factKey = JSON.stringify(s.gates.map(g => g.fact.choices)), facts: number[][] = useMemo(() => JSON.parse(factKey), [factKey]);
  const next = s.gates.filter(g => !g.passed).sort((a, b) => a.x - b.x)[0];
  const controls = <View style={{ position: "absolute", left: 12, right: 12, bottom: 10, flexDirection: "row", justifyContent: "flex-end", gap: 10 }}><Control label="Flap wings" glyph="↑ Flap" disabled={!active} onPress={flap}/>{level === "endless" && <Button compact quiet onPress={() => send({ type: "finish" })}>Finish free flight</Button>}</View>;
  return <Arena game="flight" controls={controls} hud={<Hud s={s} learning={learn}/>} overlay={learn && next && <View pointerEvents="none" style={{ position: "absolute", top: 62, alignSelf: "center", padding: 8, borderRadius: 14, backgroundColor: "#192B49" }}><Text testID="math-fact" style={{ color: "#FFF4D3", fontSize: 28, fontWeight: "900" }}>{equation(next.fact)}</Text></View>}><FlightLayer poses={poses} facts={facts} learn={learn} world={level === "endless" ? "w3" : level.world} storm={level !== "endless" && level.storm}/><HitReaction hit={s.lives.hit} onTone={onTone}><LastHit dead={s.lives.hearts === 0} x={W * .24} y={s.lives.hearts ? 0 : s.y * H} bat><BatRig poses={poses} outfit={outfit}/></LastHit></HitReaction><PlayfieldTarget testID="flight-touch" accessibilityLabel="Flight sky. Tap to flap" active={active} onPress={flap} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}/>{debug && <Text style={{ position: "absolute", top: 110, color: "white" }}>UI loop · {s.time.toFixed(1)} s</Text>}</Arena>;
}
const RunLayer = memo(function RunLayer({ poses, spec, learn, world }: { poses: SharedValue<SpritePose[]>; spec: { kind: string; secondKind: string; third: boolean; choices: number[] }[]; learn: boolean; world: string }) {
  return <View testID="run-art" pointerEvents="none" style={{ position: "absolute", width: W, height: H }}><TrackBackdrop world={world}/>{Array.from({ length: 14 }, (_, i) => <ArcadeSprite key={`stripe${i}`} poses={poses} index={35 + i} width={4} height={36}><View style={{ width: 4, height: 36, backgroundColor: "#FFF4D4", opacity: .7 }}/></ArcadeSprite>)}{spec.map((row, i) => <React.Fragment key={i}><ArcadeSprite poses={poses} index={1 + i * 2} width={72} height={72}><Hazard kind={row.kind} size={72}/></ArcadeSprite><ArcadeSprite poses={poses} index={2 + i * 2} width={72} height={72}><Hazard kind={row.secondKind} size={72}/></ArcadeSprite><ArcadeSprite poses={poses} index={75 + i} width={72} height={72}><Hazard kind="coconut" size={72}/></ArcadeSprite>{[0, 1, 2].map(c => <ArcadeSprite key={c} poses={poses} index={11 + i * 3 + c} width={30} height={30}><Fruit shell size={30}/></ArcadeSprite>)}{learn && row.choices.map((n, c) => <ArcadeSprite key={`a${c}`} poses={poses} index={60 + i * 3 + c} width={64} height={64}><Portal value={n} index={c}/></ArcadeSprite>)}</React.Fragment>)}<ArcadeSprite poses={poses} index={50} width={70} height={14}><Svg width={70} height={14}><Path d="M2 7Q35-5 68 7Q35 20 2 7Z" fill="#514E57" opacity={.25}/></Svg></ArcadeSprite>{Array.from({ length: 6 }, (_, i) => <ArcadeSprite key={`p${i}`} poses={poses} index={26 + i} width={12} height={12}><Particle/></ArcadeSprite>)}<ArcadeSprite poses={poses} index={55} width={80} height={30}><Text style={{ color: "#243D51", backgroundColor: "#FFF2CF", borderRadius: 9, fontSize: 21, fontWeight: "900" }}>+40</Text></ArcadeSprite><ArcadeSprite poses={poses} index={56} width={80} height={30}><Text style={{ color: "#243D51", backgroundColor: "#FFF2CF", borderRadius: 9, fontSize: 21, fontWeight: "900" }}>+10</Text></ArcadeSprite></View>;
});
export function RunBoard(props: BoardProps) {
  const { level, seed, active, helper, outfit, onTone, debug } = props, reduced = useReducedMotion();
  const [initial] = useState(() => createRun(level, seed, helper)), poses = useSharedValue<SpritePose[]>(Array.from({ length: 80 }, () => still));
  const { input, send } = useMailbox<RunInput>(helper, active);
  const publish = useCallback((s: RunState) => {
    "worklet";
    const p: SpritePose[] = Array.from({ length: 80 }, () => still), learn = runLearning(s), contact = projectTrack(s.poseLane, 1), lift = jumpHeight(s) * 105;
    const stride = !reduced && !s.jump && !s.duck ? Math.sin(s.time * Math.PI * 16) : 0, duck = s.duck > 0, squash = s.landing > 0 ? Math.sin(s.landing / .13 * Math.PI) * .12 : 0;
    const celebrating = s.status === "cleared";
    const lean = reduced ? 0 : (s.lane - s.poseLane) * .2, stumble = reduced || !s.cooldown ? 0 : Math.sin(s.cooldown * 45) * .2;
    const bodyY = contact.y - (duck ? 95 : 116) - lift + (reduced ? 0 : Math.abs(stride) * 2) + squash * 20;
    p[0] = { x: contact.x - 31, y: bodyY, angle: lean + stumble + (duck ? -.65 : 0), scale: 1 - squash };
    p[50] = { x: contact.x - 35, y: contact.y - 7, scale: 1 - jumpHeight(s) * .3 };
    for (let i = 0; i < 4; i++) { const side = i % 2 ? 1 : -1, arm = i > 1; p[51 + i] = { x: contact.x + side * (arm ? 24 : 12) - 11, y: (arm ? bodyY + 39 : contact.y - 43 - lift) + (duck ? -7 : 0), angle: (celebrating && arm ? side * 2.4 : duck ? side * .85 : stride * side * (arm ? -.55 : .7)) + lean + stumble, scale: 1 }; }
    s.rows.forEach((row, i) => {
      const visible = !row.passed && !learn;
      p[1 + i * 2] = { ...trackSprite(obstacleLane(row, s.time), row.z, 72, 72), opacity: visible && row.z > 0 && row.z < 1.16 ? 1 : 0 };
      p[2 + i * 2] = { ...trackSprite(row.second, row.z, 72, 72), opacity: visible && row.second >= 0 && row.z > 0 && row.z < 1.16 ? 1 : 0 };
      p[75 + i] = { ...trackSprite(row.shellLane, row.z, 72, 72), opacity: visible && row.third && row.z > 0 && row.z < 1.16 ? 1 : 0 };
      for (let c = 0; c < 3; c++) {
        const z = row.z + c * .07;
        p[11 + i * 3 + c] = { ...trackSprite(row.shellLane, z, 30, 30), opacity: visible && z > 0 && z < 1.05 ? 1 : 0 };
        p[60 + i * 3 + c] = { ...trackSprite(c, row.z, 64, 64), opacity: learn && !row.passed && row.z > 0 && row.z < 1.08 ? 1 : 0 };
      }
    });
    for (let i = 0; i < 14; i++) { const z = ((s.travel + Math.floor(i / 2) * .17) % 1.18), lane = i % 2 ? 1.5 : .5; p[35 + i] = trackSprite(lane, z, 4, 36); }
    const f = s.feedback / .45, scored = s.lastGain > 0;
    p[55] = { x: contact.x + 45, y: H * .6 - (1 - f) * 25, opacity: scored && s.lastGain === 40 ? f : 0 };
    p[56] = { ...p[55], opacity: scored && !p[55].opacity ? f : 0 };
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; p[26 + i] = { x: contact.x + Math.cos(a) * (1 - f) * 60, y: contact.y - 60 + Math.sin(a) * (1 - f) * 60, opacity: !reduced && (scored || s.cue === "bump") ? f : 0 }; }
    poses.set(p);
  }, [poses, reduced]);
  const { snapshot: s } = useArcadeUiLoop({ initial, input, step: runFrame, result: runResult, onFrame: publish, active });
  const result = useMemo(() => runResult(s), [s]); useOutcome(s, result, props);
  const action = useCallback((a: RunInput) => { send(a); if (active) onTone(a.type === "jump" ? "shell-4" : a.type === "duck" ? "shell-1" : "coral", false); }, [send, active, onTone]);
  useKeyboard(active, useCallback(key => action({ type: ["ArrowLeft", "KeyA"].includes(key) ? "left" : ["ArrowRight", "KeyD"].includes(key) ? "right" : ["ArrowDown", "KeyS"].includes(key) ? "duck" : "jump" }), [action]));
  const swipe = useSwipe(active, d => action({ type: d === "up" ? "jump" : d === "down" ? "duck" : d }), 20);
  const learn = runLearning(s), next = s.rows.filter(r => !r.passed).sort((a, b) => b.z - a.z)[0];
  const specKey = JSON.stringify(s.rows.map(r => ({ kind: r.kind, secondKind: r.secondKind, third: r.third, choices: r.fact.choices }))), spec = useMemo(() => JSON.parse(specKey), [specKey]);
  const controls = <><View style={{ position: "absolute", left: 12, right: 12, bottom: 10, flexDirection: "row", justifyContent: "space-between", gap: 6 }}><Control disabled={!active} label="Move left" glyph="←" onPress={() => action({ type: "left" })}/><Control disabled={!active} label="Jump" glyph="↑" onPress={() => action({ type: "jump" })}/><Control disabled={!active} label="Duck" glyph="↓" onPress={() => action({ type: "duck" })}/><Control disabled={!active} label="Move right" glyph="→" onPress={() => action({ type: "right" })}/></View>{level === "endless" && <View style={{ position: "absolute", bottom: 76, right: 12 }}><Button compact quiet onPress={() => send({ type: "finish" })}>Finish free run</Button></View>}</>;
  return <Arena game="run" controls={controls} hud={<Hud s={s} learning={learn}/>} overlay={learn && next && <View pointerEvents="none" style={{ position: "absolute", top: 62, alignSelf: "center", padding: 8, borderRadius: 14, backgroundColor: "#192B49" }}><Text testID="math-fact" style={{ color: "#FFF4D3", fontSize: 28, fontWeight: "900" }}>{equation(next.fact)}</Text></View>}><RunLayer poses={poses} spec={spec} learn={learn} world={level === "endless" ? "w3" : level.world}/><HitReaction hit={s.lives.hit} onTone={onTone}><LastHit dead={s.lives.hearts === 0} x={s.lives.hearts ? 0 : projectTrack(s.poseLane, 1).x} y={H * .84}><RunnerRig poses={poses} outfit={outfit}/></LastHit></HitReaction><View testID="run-touch" accessible accessibilityRole="button" accessibilityLabel="Lagoon track. Swipe to steer, up to jump, down to duck" {...swipe} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, ...(Platform.OS === "web" ? { touchAction: "none" as const } : {}) }}/>{!reduced && s.time < 4 && <Text pointerEvents="none" style={{ position: "absolute", bottom: 80, alignSelf: "center", color: "#263F51", fontSize: 30, opacity: Math.max(0, 1 - s.time / 4) }}>☝ ↔ ↑ ↓</Text>}{debug && <Text style={{ position: "absolute", top: 110, color: "white" }}>UI loop · {s.time.toFixed(1)} s</Text>}</Arena>;
}
export function ScrollBoard({ game, ...props }: BoardProps & { game: ScrollGame }) { return game === "fruit-bat-flight" ? <FlightBoard {...props}/> : <RunBoard {...props}/>; }
