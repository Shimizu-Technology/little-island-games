import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, View } from "react-native";
import Svg, { Path, Rect, Text as SvgText } from "react-native-svg";
import { runOnJS, runOnUI, useFrameCallback, useSharedValue, type SharedValue } from "react-native-reanimated";
import { useReducedMotion } from "../../../components/motion";
import { Button } from "../../../components/ui";
import { Text } from "../../../components/Text";
import { UiPlayTarget, uiThreadSwipe } from "../../Input";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { enqueueCommand, drainCommands } from "../../mailbox";
import { flightHud, runHud, type ScrollHud } from "../../publication";
import { HIDDEN_POSE } from "../../poses";
import { HeartsHud, HitReaction } from "../../LivesHud";
import { useArcadeUiLoop } from "../../uiLoop";
import { ArcadeSprite, type SpritePose } from "../../Sprite";
import type { ArcadeResult, WorldId } from "../../types";
import type { OutfitId } from "../../progress";
import { createFlight, flightGap, flightLearning, flightResult, type FlightInput, type FlightState } from "../fruit-bat-flight/engine";
import { createRun, jumpHeight, obstacleLane, runLearning, runResult, type RunInput, type RunState } from "../lagoon-run/engine";
import { projectTrack, trackSprite } from "../lagoon-run/camera";
import { equation, type ScrollGame, type ScrollLevel } from "./content";
import { Fruit, Hazard, Scenery } from "./Art";
import { BatRig, PalmPiece, RunnerRig, TrackBackdrop, LastHit } from "./FeelArt";
import { flightFrame, runFrame, type Commands } from "./commands";
export type BoardProps = { level: ScrollLevel | "endless"; seed: number; active: boolean; helper: boolean; outfit: OutfitId; onResult: (result: ArcadeResult, helped: boolean) => void; onTone: (key: string, haptic?: boolean) => void; onPause?: () => void; debug: boolean };
const W = 390, H = 660, still = HIDDEN_POSE;
const Portal = memo(function Portal({ value, index }: { value: number; index: number }) { return <Svg width={64} height={64} viewBox="0 0 64 64"><Rect x={3} y={3} width={58} height={58} rx={16} fill={["#F6C76D", "#A9E7E1", "#DEB1EF"][index]} stroke="#374565" strokeWidth={3}/><SvgText x={32} y={45} textAnchor="middle" fill="#27364E" fontWeight="900" fontSize={36}>{value}</SvgText></Svg>; });
const Particle = memo(function Particle() { return <Svg width={12} height={12}><Path d="M6 0L8 4L12 6L8 8L6 12L4 8L0 6L4 4Z" fill="#FFE294"/></Svg>; });
/** Dev-only UI-frame scheduling budget; never substitutes for native presented-frame acceptance. */
function Budget({ active }: { active: boolean }) {
  const samples = useSharedValue<number[]>([]), last = useSharedValue(0);
  const [stats, setStats] = useState({ fps: 0, p95: 0, max: 0, hitches: 0 });
  const callback = useCallback<Parameters<typeof useFrameCallback>[0]>(info => {
    "worklet";
    const gap = info.timeSincePreviousFrame;
    if (!gap || gap <= 0) return;
    const a = [...samples.value.slice(-179), gap]; samples.set(a);
    if (info.timestamp - last.value < 500) return;
    last.set(info.timestamp); const sorted = a.slice().sort((a, b) => a - b);
    runOnJS(setStats)({ fps: 1000 * a.length / a.reduce((sum, n) => sum + n, 0), p95: sorted[Math.floor(sorted.length * .95)], max: sorted[sorted.length - 1], hitches: a.filter(n => n > 25).length });
  }, [samples, last]);
  const frame = useFrameCallback(callback, false);
  useEffect(() => { frame.setActive(active); return () => frame.setActive(false); }, [frame, active]);
  return <Text testID="arcade-budget" pointerEvents="none" style={{ position: "absolute", top: 110, left: 5, color: "#FFFFFF", backgroundColor: "#14273E", padding: 4, fontSize: 11 }}>UI {stats.fps.toFixed(1)} fps · p95 {stats.p95.toFixed(1)} / 16.7 ms · max {stats.max.toFixed(1)} · &gt;25 {stats.hitches}</Text>;
}
function useKeyboard(active: boolean, action: (key: string) => void) {
  useEffect(() => { if (Platform.OS !== "web" || !active) return; const handler = (e: KeyboardEvent) => { if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyA", "KeyD", "KeyW", "KeyS"].includes(e.code)) { e.preventDefault(); if (!e.repeat) action(e.code); } }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [active, action]);
}
function Control<I>({ label, glyph, mailbox, action, onPress, feedback, disabled = false }: { label: string; glyph: string; mailbox: SharedValue<Commands<I>>; action: I; onPress: () => void; feedback: () => void; disabled?: boolean }) {
  return <UiPlayTarget mailbox={mailbox} action={action} active={!disabled} onFeedback={feedback} onAccessiblePress={onPress} accessibilityLabel={label} style={{ minWidth: 58, minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: "#FFF2CC", borderWidth: 2, borderBottomWidth: 5, borderColor: "#725B66" }}><Text style={{ fontSize: 25, fontWeight: "900", color: "#34354D" }}>{glyph}</Text></UiPlayTarget>;
}
function Arena({ children, game, controls, hud, overlay }: { children: React.ReactNode; game: string; controls: React.ReactNode; hud: React.ReactNode; overlay?: React.ReactNode }) {
  const [size, setSize] = useState({ w: W, h: H }), scale = Math.min(size.w / W, size.h / H);
  return <View testID={`${game}-field`} style={{ flex: 1, overflow: "hidden", backgroundColor: "#172B42" }} onLayout={e => { const { width, height } = e.nativeEvent.layout; if (width && height) setSize({ w: width, h: height }); }}><View style={{ position: "absolute", width: W, height: H, left: (size.w - W) / 2, top: (size.h - H) / 2, transform: [{ scale }], overflow: "hidden" }}>{children}</View>{hud}{overlay}{controls}</View>;
}
function useMailbox<I>(helper: boolean, active: boolean) {
  const input = useSharedValue<Commands<I>>({ helper, serial: 0, queue: [] }), enabled = useSharedValue(active);
  useEffect(() => { runOnUI((value: boolean, playing: boolean) => { "worklet"; enabled.set(playing); input.set({ ...input.value, helper: value, queue: playing ? input.value.queue : [] }); })(helper, active); }, [helper, active, input, enabled]);
  const send = useCallback((action: I) => { runOnUI((a: I) => { "worklet"; if (enabled.value) input.set(enqueueCommand(input.value, a)); })(action); }, [input, enabled]);
  return { input, send };
}
function useOutcome(s: ScrollHud, result: ArcadeResult | null, props: BoardProps) {
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
function Hud({ s, learning }: { s: ScrollHud; learning: boolean }) {
  return <View pointerEvents="none" style={{ position: "absolute", left: 10, right: 10, top: 8, gap: 5, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}><View style={{ borderRadius: 16, padding: 9, backgroundColor: "#192B49" }}><Text testID="scroll-progress" style={{ color: "#FFF4D3", fontWeight: "800", fontSize: 18 }}>{s.passed}/{s.level === "endless" ? "∞" : s.level.target} · {s.score} pts</Text></View>{!learning && <HeartsHud lives={s.lives}/>}</View>;
}
const FlightLayer = memo(function FlightLayer({ poses, facts, learn, world, storm }: { poses: SharedValue<SpritePose[]>; facts: number[][]; learn: boolean; world: WorldId; storm: boolean }) {
  return <View testID="flight-art" pointerEvents="none" style={{ position: "absolute", width: W, height: H }}><Scenery game="fruit-bat-flight" world={world} storm={storm}/>{Array.from({ length: 4 }, (_, i) => <React.Fragment key={i}><ArcadeSprite poses={poses} index={1 + i * 2} width={46} height={660}><PalmPiece/></ArcadeSprite><ArcadeSprite poses={poses} index={2 + i * 2} width={46} height={660}><PalmPiece bottom/></ArcadeSprite><ArcadeSprite poses={poses} index={9 + i} width={32} height={32}><Fruit size={32}/></ArcadeSprite>{learn && facts[i].map((n, c) => <ArcadeSprite key={c} poses={poses} index={13 + i * 3 + c} width={64} height={64}><Portal value={n} index={c}/></ArcadeSprite>)}</React.Fragment>)}{Array.from({ length: 6 }, (_, i) => <ArcadeSprite key={`p${i}`} poses={poses} index={25 + i} width={12} height={12}><Particle/></ArcadeSprite>)}<ArcadeSprite poses={poses} index={33} width={70} height={30}><Text style={{ color: "#FFF2BD", fontSize: 23, fontWeight: "900" }}>+1</Text></ArcadeSprite></View>;
});
export function FlightBoard(props: BoardProps) {
  const { level, seed, active, helper, outfit, onTone, debug } = props, reduced = useReducedMotion();
  const [initial] = useState(() => createFlight(level, seed, helper)), poses = useSharedValue<SpritePose[]>(Array.from({ length: 34 }, () => still));
  const { input, send } = useMailbox<FlightInput>(helper, active);
  const build = useCallback((s: FlightState) => {
    "worklet";
    const p: SpritePose[] = Array(34).fill(still), learn = flightLearning(s), gap = flightGap(s), x = W * .24, y = s.y * H + (s.waiting && !reduced ? Math.sin(s.hover * 4) * 7 : 0);
    const tumble = !reduced && s.cooldown > 0 && s.cue === "bump" ? (1 - s.cooldown / .3) * Math.PI * 2 : 0;
    const angle = reduced ? 0 : s.status === "cleared" ? -.2 : tumble || Math.max(-.436, Math.min(1.134, s.vy * 1.4));
    p[0] = { identity: s.lives.hit, x: x - 17, y: y - 30, angle };
    const wing = reduced ? 0 : s.flap > 0 ? Math.sin(s.flap / .12 * Math.PI) * .9 : Math.sin(s.time * 9) * .1;
    p[31] = { identity: s.lives.hit, x: x - 49, y: y - 26, angle: angle + wing, scale: 1 }; p[32] = { identity: s.lives.hit, x: x + 4, y: y - 26, angle: angle - wing, scale: 1 };
    s.gates.forEach((g, i) => {
      p[1 + i * 2] = learn ? still : { identity: g.phase, x: g.x * W - 23, y: (g.center - gap / 2) * H - H, opacity: learn ? 0 : 1 };
      p[2 + i * 2] = learn ? still : { identity: g.phase, x: g.x * W - 23, y: (g.center + gap / 2) * H, opacity: learn ? 0 : 1 };
      p[9 + i] = learn || g.passed ? still : { identity: g.phase, x: g.x * W - 16, y: g.center * H - 16, opacity: !learn && !g.passed ? 1 : 0 };
      if (learn && !g.passed) for (let c = 0; c < 3; c++) p[13 + i * 3 + c] = { x: g.x * W - 32, y: [.24, .5, .76][c] * H - 32, opacity: learn && !g.passed ? 1 : 0 };
    });
    const feedback = s.feedback / .45, scored = s.lastGain > 0, hit = s.cue === "bump";
    p[33] = { x: W * .44, y: H * .2 - (1 - feedback) * 22, opacity: scored ? feedback : 0 };
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; p[25 + i] = { x: x + Math.cos(a) * (1 - feedback) * 55, y: y + Math.sin(a) * (1 - feedback) * 55, opacity: !reduced && (scored || hit) ? feedback : 0 }; }
    return p;
  }, [reduced]);
  const pose = useMemo(() => ({ build, target: poses }), [build, poses]);
  const { snapshot: s, outcome: result } = useArcadeUiLoop({ initial, input, step: flightFrame, result: flightResult, pose, select: flightHud, drain: drainCommands, active });
  useOutcome(s, result, props);
  const flapTone = useCallback(() => { onTone("shell-2", false); }, [onTone]);
  const flap = useCallback(() => { if (active) { send({ type: "flap" }); flapTone(); } }, [send, flapTone, active]);
  useKeyboard(active, useCallback(() => flap(), [flap]));
  const learn = level !== "endless" && level.world === "learn", factKey = JSON.stringify(s.facts), facts: number[][] = useMemo(() => JSON.parse(factKey), [factKey]);
  const next = s.next;
  const controls = <View style={{ position: "absolute", left: 12, right: 12, bottom: 10, flexDirection: "row", justifyContent: "flex-end", gap: 10 }}><Control label="Flap wings" glyph="↑ Flap" mailbox={input} action={{ type: "flap" }} feedback={flapTone} disabled={!active} onPress={flap}/>{level === "endless" && <Button compact quiet onPress={() => send({ type: "finish" })}>Finish free flight</Button>}</View>;
  return <Arena game="flight" controls={controls} hud={<Hud s={s} learning={learn}/>} overlay={<>{learn && next && <View pointerEvents="none" style={{ position: "absolute", top: 62, alignSelf: "center", padding: 8, borderRadius: 14, backgroundColor: "#192B49" }}><Text testID="math-fact" style={{ color: "#FFF4D3", fontSize: 28, fontWeight: "900" }}>{equation(next)}</Text></View>}{s.waiting && s.status === "playing" && !learn && <View pointerEvents="none" style={{ position: "absolute", bottom: "26%", alignSelf: "center", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, backgroundColor: "#192B49CC" }}><Text style={{ color: "#FFF4D3", fontSize: 22, fontWeight: "900" }}>Tap to fly</Text></View>}</>}><FlightLayer poses={poses} facts={facts} learn={learn} world={level === "endless" ? "w3" : level.world} storm={level !== "endless" && level.storm}/><HitReaction hit={s.lives.hit} onTone={onTone}><LastHit dead={s.lives.hearts === 0} x={W * .24} y={s.lives.hearts ? 0 : s.y * H} bat><BatRig poses={poses} outfit={outfit}/></LastHit></HitReaction><UiPlayTarget mailbox={input} action={{ type: "flap" }} onFeedback={flapTone} onAccessiblePress={flap} testID="flight-touch" accessibilityLabel="Flight sky. Tap to flap" active={active} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}/>{debug && <Budget active={active}/>}</Arena>;
}
const RunLayer = memo(function RunLayer({ poses, spec, learn, world }: { poses: SharedValue<SpritePose[]>; spec: { kind: string; secondKind: string; third: boolean; choices: number[] }[]; learn: boolean; world: WorldId }) {
  return <View testID="run-art" pointerEvents="none" style={{ position: "absolute", width: W, height: H }}><TrackBackdrop world={world}/>{Array.from({ length: 14 }, (_, i) => <ArcadeSprite key={`stripe${i}`} poses={poses} index={35 + i} width={4} height={36}><View style={{ width: 4, height: 36, backgroundColor: "#FFF4D4", opacity: .7 }}/></ArcadeSprite>)}{spec.map((row, i) => <React.Fragment key={i}><ArcadeSprite poses={poses} index={1 + i * 2} width={72} height={72}><Hazard kind={row.kind} size={72}/></ArcadeSprite><ArcadeSprite poses={poses} index={2 + i * 2} width={72} height={72}><Hazard kind={row.secondKind} size={72}/></ArcadeSprite><ArcadeSprite poses={poses} index={75 + i} width={72} height={72}><Hazard kind="coconut" size={72}/></ArcadeSprite>{[0, 1, 2].map(c => <ArcadeSprite key={c} poses={poses} index={11 + i * 3 + c} width={30} height={30}><Fruit shell size={30}/></ArcadeSprite>)}{learn && row.choices.map((n, c) => <ArcadeSprite key={`a${c}`} poses={poses} index={60 + i * 3 + c} width={64} height={64}><Portal value={n} index={c}/></ArcadeSprite>)}</React.Fragment>)}<ArcadeSprite poses={poses} index={50} width={70} height={14}><Svg width={70} height={14}><Path d="M2 7Q35-5 68 7Q35 20 2 7Z" fill="#514E57" opacity={.25}/></Svg></ArcadeSprite>{Array.from({ length: 6 }, (_, i) => <ArcadeSprite key={`p${i}`} poses={poses} index={26 + i} width={12} height={12}><Particle/></ArcadeSprite>)}<ArcadeSprite poses={poses} index={55} width={80} height={30}><Text style={{ color: "#243D51", backgroundColor: "#FFF2CF", borderRadius: 9, fontSize: 21, fontWeight: "900" }}>+40</Text></ArcadeSprite><ArcadeSprite poses={poses} index={56} width={80} height={30}><Text style={{ color: "#243D51", backgroundColor: "#FFF2CF", borderRadius: 9, fontSize: 21, fontWeight: "900" }}>+10</Text></ArcadeSprite><ArcadeSprite poses={poses} index={57} width={110} height={46}><Svg width={110} height={46}><Path d="M10 23H36M10 23L17 16M10 23L17 30M36 23L29 16M36 23L29 30M77 5V40M77 5L70 12M77 5L84 12M77 40L70 33M77 40L84 33" stroke="#263F51" strokeWidth={3} strokeLinecap="round" fill="none"/><Path d="M48 37V15Q48 10 52 10Q56 10 56 15V24L61 23Q66 23 66 28L63 40H51Z" stroke="#263F51" strokeWidth={2} fill="#FFF1CF"/></Svg></ArcadeSprite></View>;
});
export function RunBoard(props: BoardProps) {
  const { level, seed, active, helper, outfit, onTone, debug } = props, reduced = useReducedMotion();
  const [initial] = useState(() => createRun(level, seed, helper)), poses = useSharedValue<SpritePose[]>(Array(80).fill(still));
  const { input, send } = useMailbox<RunInput>(helper, active);
  const build = useCallback((s: RunState) => {
    "worklet";
    const p: SpritePose[] = Array(80).fill(still), learn = runLearning(s), contact = projectTrack(s.poseLane, 1), lift = jumpHeight(s) * 105;
    const stride = !reduced && !s.jump && !s.duck ? Math.sin(s.time * Math.PI * 16) : 0, duck = s.duck > 0, squash = s.landing > 0 ? Math.sin(s.landing / .13 * Math.PI) * .12 : 0;
    const celebrating = s.status === "cleared";
    const lean = reduced ? 0 : (s.lane - s.poseLane) * .2, stumble = reduced || !s.cooldown ? 0 : Math.sin(s.cooldown * 45) * .2;
    const bodyY = contact.y - (duck ? 95 : 116) - lift + (reduced ? 0 : Math.abs(stride) * 2) + squash * 20;
    p[0] = { identity: s.lives.hit, x: contact.x - 31, y: bodyY, angle: lean + stumble + (duck ? -.65 : 0), scale: 1 - squash };
    p[50] = { x: contact.x - 35, y: contact.y - 7, scale: 1 - jumpHeight(s) * .3 };
    for (let i = 0; i < 4; i++) { const side = i % 2 ? 1 : -1, arm = i > 1; p[51 + i] = { x: contact.x + side * (arm ? 24 : 12) - 11, y: (arm ? bodyY + 39 : contact.y - 43 - lift) + (duck ? -7 : 0), angle: (celebrating && arm ? side * 2.4 : duck ? side * .85 : stride * side * (arm ? -.55 : .7)) + lean + stumble, scale: 1 }; }
    s.rows.forEach((row, i) => {
      const visible = !row.passed && !learn;
      p[1 + i * 2] = !visible || row.z <= 0 || row.z >= 1.16 ? still : { identity: row.phase, ...trackSprite(obstacleLane(row, s.time), row.z, 72, 72), opacity: visible && row.z > 0 && row.z < 1.16 ? 1 : 0 };
      p[2 + i * 2] = !visible || row.second < 0 || row.z <= 0 || row.z >= 1.16 ? still : { identity: row.phase, ...trackSprite(row.second, row.z, 72, 72), opacity: visible && row.second >= 0 && row.z > 0 && row.z < 1.16 ? 1 : 0 };
      p[75 + i] = !visible || !row.third || row.z <= 0 || row.z >= 1.16 ? still : { identity: row.phase, ...trackSprite(row.shellLane, row.z, 72, 72), opacity: visible && row.third && row.z > 0 && row.z < 1.16 ? 1 : 0 };
      for (let c = 0; c < 3; c++) {
        const z = row.z + c * .07;
        p[11 + i * 3 + c] = !visible || z <= 0 || z >= 1.05 ? still : { identity: row.phase, ...trackSprite(row.shellLane, z, 30, 30), opacity: visible && z > 0 && z < 1.05 ? 1 : 0 };
        if (learn && !row.passed && row.z > 0 && row.z < 1.08) p[60 + i * 3 + c] = { identity: row.phase, ...trackSprite(c, row.z, 64, 64), opacity: learn && !row.passed && row.z > 0 && row.z < 1.08 ? 1 : 0 };
      }
    });
    for (let i = 0; i < 14; i++) { const z = ((s.travel + Math.floor(i / 2) * .17) % 1.18), lane = i % 2 ? 1.5 : .5; p[35 + i] = trackSprite(lane, z, 4, 36); }
    p[57] = { x: W / 2 - 55, y: H - 130, opacity: reduced || learn ? 0 : Math.max(0, 1 - s.time / 4) };
    const f = s.feedback / .45, scored = s.lastGain > 0;
    p[55] = { x: contact.x + 45, y: H * .6 - (1 - f) * 25, opacity: scored && s.lastGain === 40 ? f : 0 };
    p[56] = { ...p[55], opacity: scored && !p[55].opacity ? f : 0 };
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; p[26 + i] = { x: contact.x + Math.cos(a) * (1 - f) * 60, y: contact.y - 60 + Math.sin(a) * (1 - f) * 60, opacity: !reduced && (scored || s.cue === "bump") ? f : 0 }; }
    return p;
  }, [reduced]);
  const pose = useMemo(() => ({ build, target: poses }), [build, poses]);
  const { snapshot: s, outcome: result } = useArcadeUiLoop({ initial, input, step: runFrame, result: runResult, pose, select: runHud, drain: drainCommands, active });
  useOutcome(s, result, props);
  const actionTone = useCallback((a: RunInput) => { onTone(a.type === "jump" ? "shell-4" : a.type === "duck" ? "shell-1" : "coral", false); }, [onTone]);
  const action = useCallback((a: RunInput) => { if (active) { send(a); actionTone(a); } }, [send, active, actionTone]);
  useKeyboard(active, useCallback(key => action({ type: ["ArrowLeft", "KeyA"].includes(key) ? "left" : ["ArrowRight", "KeyD"].includes(key) ? "right" : ["ArrowDown", "KeyS"].includes(key) ? "duck" : "jump" }), [action]));
  const fired = useSharedValue(false);
  const swipe = useMemo(() => uiThreadSwipe<RunInput>(input, { up: { type: "jump" }, down: { type: "duck" }, left: { type: "left" }, right: { type: "right" } }, fired, 20, actionTone).enabled(active), [input, fired, active, actionTone]);
  const learn = level !== "endless" && level.world === "learn", next = s.next;
  const specKey = JSON.stringify(s.spec), spec = useMemo(() => JSON.parse(specKey), [specKey]);
  const controls = <><View style={{ position: "absolute", left: 12, right: 12, bottom: 10, flexDirection: "row", justifyContent: "space-between", gap: 6 }}><Control disabled={!active} label="Move left" glyph="←" mailbox={input} action={{ type: "left" }} feedback={() => actionTone({ type: "left" })} onPress={() => action({ type: "left" })}/><Control disabled={!active} label="Jump" glyph="↑" mailbox={input} action={{ type: "jump" }} feedback={() => actionTone({ type: "jump" })} onPress={() => action({ type: "jump" })}/><Control disabled={!active} label="Duck" glyph="↓" mailbox={input} action={{ type: "duck" }} feedback={() => actionTone({ type: "duck" })} onPress={() => action({ type: "duck" })}/><Control disabled={!active} label="Move right" glyph="→" mailbox={input} action={{ type: "right" }} feedback={() => actionTone({ type: "right" })} onPress={() => action({ type: "right" })}/></View>{level === "endless" && <View style={{ position: "absolute", bottom: 76, right: 12 }}><Button compact quiet onPress={() => send({ type: "finish" })}>Finish free run</Button></View>}</>;
  return <Arena game="run" controls={controls} hud={<Hud s={s} learning={learn}/>} overlay={learn && next && <View pointerEvents="none" style={{ position: "absolute", top: 62, alignSelf: "center", padding: 8, borderRadius: 14, backgroundColor: "#192B49" }}><Text testID="math-fact" style={{ color: "#FFF4D3", fontSize: 28, fontWeight: "900" }}>{equation(next)}</Text></View>}><RunLayer poses={poses} spec={spec} learn={learn} world={level === "endless" ? "w3" : level.world}/><HitReaction hit={s.lives.hit} onTone={onTone}><LastHit dead={s.lives.hearts === 0} x={s.lives.hearts ? 0 : projectTrack(s.poseLane, 1).x} y={H * .84}><RunnerRig poses={poses} outfit={outfit}/></LastHit></HitReaction><GestureDetector gesture={swipe} touchAction="none"><Animated.View collapsable={false} testID="run-touch" accessible accessibilityRole="button" accessibilityLabel="Lagoon track. Swipe to steer, up to jump, down to duck" style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, ...(Platform.OS === "web" ? { touchAction: "none" as const } : {}) }}/></GestureDetector>{debug && <Budget active={active}/>}</Arena>;
}
export function ScrollBoard({ game, ...props }: BoardProps & { game: ScrollGame }) { return game === "fruit-bat-flight" ? <FlightBoard {...props}/> : <RunBoard {...props}/>; }
