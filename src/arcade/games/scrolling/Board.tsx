import Constants from 'expo-constants';
import {lagoonMeasurement} from '../lagoon-run/measurement';
import {runSounds} from '../lagoon-run/feedback';
import { runSwipe } from "../lagoon-run/swipe";
import { RunHit, RunHitFlash } from "../lagoon-run/RunReaction";
import { useLocalSearchParams } from "expo-router";
import { useLagoonUiLoop } from "../lagoon-run/useLagoonUiLoop";
import { useRunMeter, runEventTags } from "../lagoon-run/useRunMeter";
import { fixtureInput } from "../lagoon-run/fixtures";
import { runLevels } from "./content";
import { RunHud, HUD_TEXT_MAX } from '../lagoon-run/Hud';
import { HarborPlanks, HarborEnvironment, RunCamera, SpeedLines } from '../lagoon-run/World';
import { DeckBase, DeckHaze, DeckLight } from '../lagoon-run/Backdrop';
import { RunArena } from '../lagoon-run/Arena';
import { useStage } from '../lagoon-run/stage';
import { CONTACT, HERO_SCALE, HERO_ZOOM, TRACK_HEIGHT } from '../lagoon-run/camera';
import { FlightPalm, FlightForest, FlightShore, FlightSky, FlightWideSky } from "../fruit-bat-flight/Art";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Platform, Pressable, View } from "react-native";
import Svg, { Path, Rect, Text as SvgText } from "react-native-svg";
import { runOnJS, runOnUI, useFrameCallback, useAnimatedReaction, useSharedValue, type SharedValue } from "react-native-reanimated";
import { useReducedMotion } from "../../../components/motion";
import { Button } from "../../../components/ui";
import { Text } from "../../../components/Text";
import { UiPlayTarget } from "../../Input";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { enqueueCommand, drainCommands } from "../../mailbox";
import { flightHud, runHud, type ScrollHud } from "../../publication";
import { HIDDEN_POSE, samePublication } from "../../poses";
import { HeartsHud, HitReaction } from "../../LivesHud";
import { useArcadeUiLoop } from "../../uiLoop";
import { ArcadeSprite, type SpritePose } from "../../Sprite";
import type { ArcadeResult, WorldId } from "../../types";
import type { OutfitId } from "../../progress";
import { createFlight, flightGap, flightLearning, flightResult, type FlightInput, type FlightState } from "../fruit-bat-flight/engine";
import { createRun, runLearning, runResult, type RunInput, type RunState } from "../lagoon-run/engine";
import { isCanoe } from "../lagoon-run/geometry";
import { Deck, Canoe, PowerRing, RunTeachingCue, KiteRig } from "../lagoon-run/Art";
import { BakedHazard, BakedPower, BakedShell } from "../lagoon-run/Baked";
import { DepthSprite } from "../lagoon-run/DepthSprite";

import { hazardBox } from "../lagoon-run/course";
import { equation, type ScrollGame, type ScrollLevel } from "./content";
import { Fruit, palette } from "./Art";
import { BatRig, RunnerRig, LastHit } from "./FeelArt";
import { batAngle } from "../fruit-bat-flight/hull";
import { runPoses, RUN_SLOTS, NEAR_START, CANOE_START, INCLINE_START, INCLINE_STRIDE, POWER_AURA } from "./render";

import { flightFrame, runFrame, type Commands } from "./commands";
export type BoardProps = { level: ScrollLevel | "endless"; seed: number; active: boolean; helper: boolean; outfit: OutfitId; onResult: (result: ArcadeResult, helped: boolean) => void; onTone: (key: string, haptic?: boolean) => void; onPause?: () => void; debug: boolean; overlayTop?: number };
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
function Control<I>({ label, glyph, mailbox, action, onPress, feedback, disabled = false, overlay = false }: { overlay?: boolean; label: string; glyph: string; mailbox: SharedValue<Commands<I>>; action: I; onPress: () => void; feedback: () => void; disabled?: boolean }) {
  return <UiPlayTarget mailbox={mailbox} action={action} active={!disabled} onFeedback={feedback} onAccessiblePress={onPress} accessibilityLabel={label} style={{ minWidth: overlay ? 44 : 58, minHeight: overlay ? 44 : 52, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: overlay ? "#FFF2CC99" : "#FFF2CC", borderWidth: overlay ? 1 : 2, borderBottomWidth: overlay ? 2 : 5, borderColor: "#725B66" }}><Text style={{ fontSize: overlay ? 21 : 25, fontWeight: "900", color: "#34354D" }}>{glyph}</Text></UiPlayTarget>;
}
function Arena({ children, game, controls, hud, overlay, world }: { children: React.ReactNode; game: "run" | "flight"; world: WorldId; controls: React.ReactNode; hud: React.ReactNode; overlay?: React.ReactNode }) {
  const [size, setSize] = useState({ w: W, h: H }), scale = Math.min(size.w / W, size.h / H);
  const [sky,horizon,sea]=palette(game === "run" ? "lagoon-run" : "fruit-bat-flight",world);
  const controlWidth=Math.min(size.w-24,Math.max(300,W*scale));
  return <View testID={`${game}-field`} style={{ flex: 1, overflow: "hidden", backgroundColor: sea }} onLayout={e => { const { width, height } = e.nativeEvent.layout; if (width && height) setSize({ w: width, h: height }); }}>{game === "flight" ? <FlightWideSky/> : <Svg width="100%" height="100%" viewBox="0 0 1000 660" preserveAspectRatio="none" style={{position:"absolute"}}><Rect width={1000} height={660} fill={sky}/><Path d="M0 211Q100 148 200 211T400 211T600 211T800 211T1000 211" fill={horizon}/><Rect y={211} width={1000} height={449} fill={sea}/><Path d="M0 500Q180 430 300 500M700 500Q830 430 1000 500M0 610Q180 540 300 610M700 610Q830 540 1000 610" stroke={horizon} strokeWidth={4} opacity={.3} fill="none"/>{game === "run" && <><Path d="M0 660V375Q94 410 158 660M1000 660V375Q906 410 842 660" fill="#D8B87C"/><Path d="M0 360Q106 402 174 660M1000 360Q894 402 826 660" fill="none" stroke="#B8E9DB" strokeWidth={6}/><Path d="M25 660Q80 370 66 176M975 660Q920 370 934 176" fill="none" stroke="#527C68" strokeWidth={18}/><Path d="M66 183Q13 111 0 165Q38 162 66 183Q103 119 153 168Q105 160 66 183Q19 177 6 242Q42 207 66 183Q113 180 134 236Q99 207 66 183M934 183Q987 111 1000 165Q962 162 934 183Q897 119 847 168Q895 160 934 183Q981 177 994 242Q958 207 934 183Q887 180 866 236Q901 207 934 183" fill="#3D8F70"/></>}</Svg>}<View style={{ position: "absolute", width: W, height: H, left: (size.w - W) / 2, top: (size.h - H) / 2, transform: [{ scale }], overflow: "hidden" }}>{children}</View><View pointerEvents="box-none" style={{position:"absolute",top:0,bottom:0,left:game==="run"?(size.w-Math.min(size.w,W*scale))/2:0,width:game==="run"?Math.min(size.w,W*scale):size.w}}>{hud}</View>{overlay}<View pointerEvents="box-none" testID={`${game}-controls`} style={{position:"absolute",width:controlWidth,left:(size.w-controlWidth)/2,bottom:0,height:levelControlHeight(game)}}>{controls}</View></View>;
}
function levelControlHeight(game: string) { return game === "run" ? 62 : 90; }
function useMailbox<I>(helper: boolean, active: boolean) {
  const input = useSharedValue<Commands<I>>({ helper, serial: 0, queue: [] }), enabled = useSharedValue(active);
  useEffect(() => { runOnUI((value: boolean, playing: boolean) => { "worklet"; enabled.set(playing); input.set({ ...input.value, helper: value, queue: playing ? input.value.queue : [] }); })(helper, active); }, [helper, active, input, enabled]);
  const send = useCallback((action: I) => { runOnUI((a: I) => { "worklet"; if (enabled.value) input.set(enqueueCommand(input.value, a)); })(action); }, [input, enabled]);
  return { input, send };
}
function useOutcome(s: Pick<ScrollHud,"helped"> & Partial<Pick<ScrollHud,"event"|"cue">>, result: ArcadeResult | null, props: BoardProps) {
  const done = useRef(false), last = useRef(0), { active, onResult, onTone } = props;
  useEffect(() => {
    if (s.event !== undefined && s.cue !== undefined && s.event !== last.current) { last.current = s.event; if (["fruit", "answer"].includes(s.cue)) onTone("clear", true); else if (s.cue === "try") onTone("shell-0", false); }
  }, [s.event, s.cue, onTone]);
  useEffect(() => {
    if (!result || !active || done.current) return;
    const report = () => { done.current = true; onResult(result, s.helped); };
    if (result.outcome === "stopped") { report(); return; }
    const timer = setTimeout(report, result.outcome === "cleared" ? 380 : 320); return () => clearTimeout(timer);
  }, [result, active, onResult, s.helped]);
}
const FlightLayer = memo(function FlightLayer({ poses, facts, learn, storm, debug }: { poses: SharedValue<SpritePose[]>; facts: number[][]; learn: boolean; storm: boolean; debug: boolean }) {
  return <View testID="flight-art" pointerEvents="none" style={{ position: "absolute", width: W, height: H }}><FlightSky storm={storm}/><FlightForest poses={poses} debug={debug}/>{Array.from({ length: 4 }, (_, i) => <React.Fragment key={i}><ArcadeSprite poses={poses} index={1 + i * 2} width={46} height={660}><FlightPalm/></ArcadeSprite><ArcadeSprite poses={poses} index={2 + i * 2} width={46} height={660}><FlightPalm bottom/></ArcadeSprite><ArcadeSprite poses={poses} index={9 + i} width={32} height={32}><Fruit size={32}/></ArcadeSprite>{learn && facts[i].map((n, c) => <ArcadeSprite key={c} poses={poses} index={13 + i * 3 + c} width={64} height={64}><Portal value={n} index={c}/></ArcadeSprite>)}</React.Fragment>)}{Array.from({ length: 6 }, (_, i) => <ArcadeSprite key={`p${i}`} poses={poses} index={25 + i} width={12} height={12}><Particle/></ArcadeSprite>)}<ArcadeSprite poses={poses} index={33} width={70} height={30}><Text style={{ color: "#FFF2BD", fontSize: 23, fontWeight: "900" }}>+1</Text></ArcadeSprite><FlightShore poses={poses}/></View>;
});
export function FlightBoard(props: BoardProps) {
  const { level, seed, active, helper, outfit, onTone, debug } = props, reduced = useReducedMotion();
  const [initial] = useState(() => createFlight(level, seed, helper)), poses = useSharedValue<SpritePose[]>(Array.from({ length: 38 }, () => still));
  const { input, send } = useMailbox<FlightInput>(helper, active);
  const build = useCallback((s: FlightState) => {
    "worklet";
    const p: SpritePose[] = Array(38).fill(still), learn = flightLearning(s), gap = flightGap(s), x = W * .24, y = s.y * H + (s.waiting && !reduced ? Math.sin(s.hover * 4) * 7 : 0);
    const tumble = !reduced && s.cooldown > 0 && s.cue === "bump" ? Math.sin((1 - s.cooldown / .3) * Math.PI) * .85 : 0;
    const angle = s.status === "cleared" && !reduced ? -.2 : tumble || batAngle(s.vy);
    p[0] = { identity: s.lives.hit, x: x - 48, y: y - 38, angle };
    const wing = reduced ? .12 : s.wing;
    // Real centred frames: top-left + (48,48) stays on the shoulder through every rotation.
    p[31] = { x: 45 - 48, y: 32 - 48, angle: -.35 + wing * .65 };
    p[32] = { x: 43 - 48, y: 38 - 48, angle: wing };
    p[34]={x:-((s.travel*W*.11)%390),y:0};p[35]={x:-((s.travel*W*.28)%390),y:0};
    const shore = (s.travel * W * .9) % 390; p[36] = { x: -shore, y: 638 }; p[37] = { x: 390 - shore, y: 638 };
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
  return <Arena game="flight" world={level === "endless" ? "w3" : level.world} controls={controls} hud={<><View pointerEvents="none" style={{position:"absolute",top:8,left:12,right:12,alignItems:"center"}}><Text testID="flight-score" style={{fontSize:54,fontWeight:"900",color:"#FFF8DF",textShadowColor:"#253348",textShadowOffset:{width:0,height:4},textShadowRadius:2}}>{s.score}</Text></View><View pointerEvents="none" style={{position:"absolute",top:15,left:12,backgroundColor:"#24394DBB",paddingHorizontal:10,paddingVertical:5,borderRadius:13}}><Text style={{color:"#FFF2D1",fontWeight:"800"}}>{s.passed}/{s.level === "endless" ? "∞" : s.level.target}</Text></View>{!learn && <View pointerEvents="none" style={{position:"absolute",right:12,top:15}}><HeartsHud lives={s.lives}/></View>}</>} overlay={<>{learn && next && <View pointerEvents="none" style={{ position: "absolute", top: 62, alignSelf: "center", padding: 8, borderRadius: 14, backgroundColor: "#192B49" }}><Text testID="math-fact" style={{ color: "#FFF4D3", fontSize: 28, fontWeight: "900" }}>{equation(next)}</Text></View>}{s.waiting && s.status === "playing" && !learn && <View pointerEvents="none" style={{ position: "absolute", top: "29%", alignSelf: "center", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, backgroundColor: "#192B49CC" }}><Text style={{ color: "#FFF4D3", fontSize: 30, fontWeight: "900", textAlign:"center" }}>Get Ready</Text><Text style={{ color: "#E5F1D9", fontSize: 17, fontWeight: "700", textAlign:"center" }}>✦  Tap anywhere to flap  ✦</Text></View>}</>}><FlightLayer poses={poses} facts={facts} learn={learn} storm={level !== "endless" && level.storm} debug={debug}/><HitReaction hit={s.lives.hit} onTone={onTone}><LastHit dead={s.lives.hearts === 0} x={W * .24} y={s.lives.hearts ? 0 : s.y * H} bat><BatRig poses={poses} outfit={outfit} debug={debug}/></LastHit></HitReaction><UiPlayTarget mailbox={input} action={{ type: "flap" }} onFeedback={flapTone} onAccessiblePress={flap} testID="flight-touch" accessibilityLabel="Flight sky. Tap to flap" active={active} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}/>{debug && <Budget active={active}/>}</Arena>;
}
type RunRowSpec=ReturnType<typeof runHud>["spec"][number];
const RunRow=memo(function RunRow({poses,row,i,learn,front=false}:{poses:SharedValue<SpritePose[]>;row:RunRowSpec;i:number;learn:boolean;front?:boolean}) {
  const actor=(kind:RunRowSpec["kind"],index:number,canoe:number)=>{const box=isCanoe(kind)?{width:390,height:660}:hazardBox(kind);return <DepthSprite front={front} poses={poses} index={index} rotate={kind!=="coconut"} width={box.width} height={box.height}>{isCanoe(kind)?<Canoe poses={poses} index={CANOE_START+canoe*4} moving={kind==="moving-canoe"}/>:<BakedHazard kind={kind} width={box.width} height={box.height} poses={poses} index={index}/>}</DepthSprite>;};
  return <>{actor(row.kind,1+i*2,i*3)}{actor(row.secondKind,2+i*2,i*3+1)}{actor(row.kind,75+i,i*3+2)}<DepthSprite front={front} poses={poses} index={167+i} width={44} height={44}><BakedPower kind={row.power} size={44}/></DepthSprite>{[0, 1, 2].map(c => <DepthSprite key={c} front={front} poses={poses} index={11 + i * 3 + c} width={30} height={30}><BakedShell size={30}/></DepthSprite>)}{learn && !front && row.choices.map((n, c) => <DepthSprite key={`a${c}`} poses={poses} index={60 + i * 3 + c} width={64} height={64}><Portal value={n} index={c}/></DepthSprite>)}</>;
},(a,b)=>a.poses===b.poses && a.i===b.i && a.learn===b.learn && a.front===b.front && samePublication(a.row,b.row));
/** Effects never depend on the course, so a spawn or crossing cannot re-render them. */
const RunEffects=memo(function RunEffects({poses}:{poses:SharedValue<SpritePose[]>}) {
  return <>{Array.from({length:15},(_,i)=><ArcadeSprite key={`shell-burst${i}`} poses={poses} index={132+i} width={48} height={48}><Svg width={48} height={48}><Path d="M24 2L28 15L42 8L34 22L47 27L33 30L38 44L25 35L16 47L17 32L2 33L13 23L3 12L19 16Z" fill="#FFE9A7" stroke="#B76A20" strokeWidth={1}/><SvgText x={24} y={30} textAnchor="middle" fill="#5B4844" fontSize={14} fontWeight="900">+1</SvgText></Svg></ArcadeSprite>)}{Array.from({ length: 6 }, (_, i) => <ArcadeSprite key={`splash${i}`} poses={poses} index={26 + i} width={12} height={12}><Svg width={12} height={12}><Path d="M6 0Q-3 9 6 12Q15 9 6 0Z" fill="#9BE9E8" stroke="#287984" strokeWidth={1}/></Svg></ArcadeSprite>)}{Array.from({length:6},(_,i)=><ArcadeSprite key={`near${i}`} poses={poses} index={NEAR_START+i} width={12} height={12}><Particle/></ArcadeSprite>)}<ArcadeSprite poses={poses} index={55} width={80} height={30}><Svg width={80} height={30}><Path d="M2 22Q-1 10 15 13Q8 1 25 7L31 18M78 22Q81 10 65 13Q72 1 55 7L49 18" fill="#FFE5A1" opacity={.8}/><Path d="M9 25L22 23M58 23L71 25" stroke="#FFF5D4" strokeWidth={2}/></Svg></ArcadeSprite><ArcadeSprite poses={poses} index={56} width={64} height={30}><View style={{ width: 64, height: 30, borderRadius: 15, backgroundColor: "#FFF2CF", borderWidth: 2, borderColor: "#B76A20", alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#5B4844", fontSize: 18, lineHeight: 22, fontWeight: "900" }}>+10</Text></View></ArcadeSprite></>;
});
const RunnerPowers=memo(function RunnerPowers({poses}:{poses:SharedValue<SpritePose[]>}) {
  return <><ArcadeSprite poses={poses} index={POWER_AURA} width={112} height={154}><Svg width={112} height={154}><Path d="M20 127Q-12 72 17 29M95 127Q125 72 96 29" fill="none" stroke="#B1FFF2" strokeWidth={4} strokeDasharray="8 7"/><Path d="M6 72L17 66M101 66L110 72M12 105L22 99M91 99L103 105" stroke="#FFE49A" strokeWidth={3}/></Svg></ArcadeSprite><ArcadeSprite poses={poses} index={POWER_AURA+1} width={86} height={28}><Svg width={86} height={28}><Path d="M10 22Q24 7 37 20M49 20Q62 7 78 22" stroke="#FFF5A3" strokeWidth={7} fill="none"/><Path d="M8 5L13 12M77 5L72 12" stroke="#FFF5A3" strokeWidth={3}/></Svg></ArcadeSprite><ArcadeSprite poses={poses} index={172} width={72} height={110}><KiteRig/></ArcadeSprite><ArcadeSprite poses={poses} index={173} width={96} height={142}><Svg width={96} height={142}><Path d="M48 3C109 3 109 139 48 139C-13 139-13 3 48 3Z" fill="#AEE1BA" fillOpacity={.18} stroke="#E9FFD3" strokeWidth={3}/></Svg></ArcadeSprite></>;
});
const LAYER={position:"absolute" as const,left:0,top:0,width:W,height:H};
/**
 * Layer containers are never collapsed: flattening would merge every zIndex into one sibling list
 * and draw actors over the runner.
 * Fixed native draw order: scene, decks, actors behind the runner, effects, runner, actors in
 * front of the runner. Nothing reorders past the runner (see DepthSprite); a passing row hands
 * off between its pre-mounted twins by opacity only.
 */
export const RunLayer = memo(function RunLayer({ poses, spec, learn, world, runner }: { poses: SharedValue<SpritePose[]>; spec: RunRowSpec[]; learn: boolean; world: WorldId; runner?: React.ReactNode }) {
  return <RunCamera poses={poses}><View testID="run-art" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: "absolute", width: W, height: H }}><DeckBase world={world}/><HarborPlanks poses={poses} world={world}/><DeckHaze world={world}/><DeckLight world={world}/><HarborEnvironment poses={poses} world={world}/><ArcadeSprite poses={poses} index={50} width={70} height={14}><Svg width={70} height={14}><Path d="M2 7Q35-5 68 7Q35 20 2 7Z" fill="#173F67" opacity={.48}/></Svg></ArcadeSprite>
    <View collapsable={false} style={LAYER}>{spec.map((row,i)=><React.Fragment key={i}><Deck poses={poses} index={147+i*4} surface={row.surface}/>{row.surface==="ramp"&&<Deck poses={poses} index={INCLINE_START+i*INCLINE_STRIDE} surface={row.surface} incline/>}</React.Fragment>)}</View>
    <View collapsable={false} testID="run-behind" style={LAYER}>{spec.map((row,i)=><RunRow key={i} row={row} i={i} poses={poses} learn={learn}/>)}</View>
    <RunEffects poses={poses}/>
    <View collapsable={false} style={LAYER}>{runner}<RunnerPowers poses={poses}/></View>
    <View collapsable={false} testID="run-front" style={LAYER}>{spec.map((row,i)=><RunRow key={i} row={row} i={i} poses={poses} learn={learn} front/>)}</View>
    <SpeedLines poses={poses}/></View></RunCamera>;
});
function selectRun(s: RunState) { "worklet"; return {helped:s.helped,status:s.status,learned:s.learned}; }
function useRunSnapshot<T>(state:SharedValue<RunState>, select:(s:RunState)=>T) {
  const [snapshot,setSnapshot]=useState(()=>select(state.value));
  useAnimatedReaction(()=>select(state.value),(next,previous)=>{if(!samePublication(next,previous))runOnJS(setSnapshot)(next);},[state,select]);
  return snapshot;
}
function sceneSpec(s:RunState) { "worklet"; const h=runHud(s);return {spec:h.spec,dead:s.lives.hearts===0}; }
const RunScene=memo(function RunScene({poses,state,learn,world}:{poses:SharedValue<SpritePose[]>;state:SharedValue<RunState>;learn:boolean;world:WorldId}) {
  const s=useRunSnapshot(state,sceneSpec);
  // The runner is live vector art: supersample it to the stage's total zoom so it stays sharp.
  const stage=useStage(),sample=Math.max(1,Math.min(2,Math.ceil(HERO_ZOOM*HERO_SCALE*stage.scale*4)/4));
  const runner=useMemo(()=><LastHit dead={s.dead} x={195} y={TRACK_HEIGHT*CONTACT}><RunHit poses={poses}><RunnerRig poses={poses} sample={sample} wrap={frames=><View pointerEvents="none" style={{position:"absolute",left:-(80*sample-80)/2,top:-(132*sample-132)/2,width:80*sample,height:132*sample,transform:[{scale:1/sample}]}}>{frames}</View>}/></RunHit></LastHit>,[poses,s.dead,sample]);
  return <><RunLayer poses={poses} spec={s.spec} learn={learn} world={world} runner={runner}/><RunHitFlash poses={poses}/></>;
});
function displayRun(s:RunState) {"worklet";const h=runHud(s);return {level:h.level,passed:h.passed,score:h.score,lives:h.lives,powers:h.powers,next:h.next,shellNotes:runLearning(s)?0:s.shells};}
/**
 * Top chrome in one column under the shared header's measured height (P2-2): the slim HUD, then the
 * learning equation, then power rings and the teaching cue. Each sits below the content before it,
 * so nothing is placed by a fixed offset that larger text could overrun. The cue subscribes to
 * nothing: the pose carries the move.
 */
export function RunTopChrome({state,learn,poses,top}:{state:SharedValue<RunState>;learn:boolean;poses:SharedValue<SpritePose[]>;top:number}) {
  const s=useRunSnapshot(state,displayRun);
  return <View pointerEvents="none" testID="run-top" style={{position:"absolute",left:10,right:10,top:top+4,gap:6}}>
    <RunHud s={s} learning={learn}/>
    {learn&&s.next?<View style={{alignSelf:"center",padding:8,borderRadius:14,backgroundColor:"#192B49"}}><Text testID="math-fact" maxFontSizeMultiplier={HUD_TEXT_MAX} style={{color:"#FFF4D3",fontSize:28,fontWeight:"900"}}>{equation(s.next)}</Text></View>:null}
    <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start"}}><View style={{flexDirection:"row",gap:4}}>{(["magnet","kite","sandals","shield"] as const).filter(k=>s.powers[k]>0).map(k=><PowerRing key={k} kind={k} remaining={s.powers[k]} state={state}/>)}</View><RunTeachingCue poses={poses}/></View>
  </View>;
}
/** Arrow buttons are an option, not the default look (LG-S3). The choice lasts for this app
 * session only, like teaching memory: no save field. VoiceOver users get them by default. */
let runArrowsChoice: boolean | null = null;
function useRunArrows(): [boolean, (v: boolean) => void] {
  const [screenReader, setScreenReader] = useState(false), [choice, setChoice] = useState(runArrowsChoice);
  useEffect(() => { let live = true; AccessibilityInfo.isScreenReaderEnabled().then(v => { if (live) setScreenReader(v); }).catch(() => {}); const sub = AccessibilityInfo.addEventListener("screenReaderChanged", setScreenReader); return () => { live = false; sub.remove(); }; }, []);
  const set = useCallback((v: boolean) => { runArrowsChoice = v; setChoice(v); }, []);
  return [choice ?? screenReader, set];
}
const TOGGLE_SLOP=8, BUTTON_SLOP=4;
function ArrowToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return <Pressable accessibilityRole="switch" accessibilityState={{ checked: shown }} accessibilityLabel="Arrow buttons" onPress={onToggle} hitSlop={TOGGLE_SLOP} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: shown ? "#FFF2CCDD" : "#10303ECC", borderWidth: 1, borderColor: "#FFF2CC" }}><Text maxFontSizeMultiplier={1} style={{ fontSize: 18, fontWeight: "900", color: shown ? "#34354D" : "#FFF2CC" }}>✥</Text></Pressable>;
}
/**
 * Bottom chrome (P2-1). Finish and the arrow switch share one flex row with a gap wider than both
 * touch slops, so their hit areas can never overlap at any text size (a long Finish wraps above the
 * switch). The arrow pad has its own row underneath. Nothing here is absolutely placed.
 */
export const OPTION_GAP = TOGGLE_SLOP + BUTTON_SLOP + 2;
export function RunControls({ arrows, onToggle, pad, finish }: { arrows: boolean; onToggle: () => void; pad: React.ReactNode; finish?: React.ReactNode }) {
  return <View pointerEvents="box-none" testID="run-chrome-bottom" style={{ position: "absolute", left: 12, right: 12, bottom: 10, gap: 10 }}>
    <View pointerEvents="box-none" testID="run-option-row" style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center", gap: OPTION_GAP }}>{finish}<ArrowToggle shown={arrows} onToggle={onToggle}/></View>
    {arrows && <View pointerEvents="box-none" style={{ flexDirection: "row", justifyContent: "center", gap: 10 }}>{pad}</View>}
  </View>;
}
// Runtime-only teaching memory is deliberately outside saves; reload starts a new app session.
let learnedRunMoves = 0;
export function RunBoard(props: BoardProps) {
  const params = useLocalSearchParams<{replay?:string;witness?:string;quietHud?:string;level?:string}>(), replay = props.debug && params.replay === "1" && lagoonMeasurement(Constants.expoConfig,props.debug);
  const witness=replay && /^\d+$/.test(params.witness??'')?Math.min(10000,Number(params.witness)):0;
    // Look witnesses may replay another authored level (dev measurement build only); meter receipts use W1-8.
  const replayLevel=replay?runLevels.find(l=>l.id===params.level)??runLevels[7]:runLevels[7];
  return <RunRound key={`${replay?"replay":"play"}-${witness}-${replayLevel.id}`} {...props} replay={replay} witness={witness} replayLevel={replayLevel} quietHud={replay && params.quietHud==="1"}/>;
}
function RunRound(props:BoardProps & {replay:boolean;witness:number;quietHud:boolean;replayLevel:typeof runLevels[number]}) {
  const { helper, onTone, debug, replay, witness, quietHud, replayLevel } = props, reduced = useReducedMotion();
  // Mount and decode the complete scene during a short ready beat, before time advances.
  const [ready,setReady]=useState(false);
  useEffect(()=>{const timer=setTimeout(()=>setReady(true),120);return()=>clearTimeout(timer);},[]);
  const active=props.active && ready;
  const level = replay ? replayLevel : props.level, seed = replay ? 771 : props.seed;
  const tick = useSharedValue(0), tags = useSharedValue<string[]>([]);
  const playEvents=useCallback((sounds:string[])=>{for(const sound of sounds)onTone(sound,sound==="run-hit"||["run-magnet","run-kite","run-sandals","run-shield","clear"].includes(sound));},[onTone]);
  const observe=useCallback((a:RunState,b:RunState)=>{ "worklet";
    const sounds=runSounds(a,b);
    if(sounds.length)runOnJS(playEvents)(sounds);
  },[playEvents]);
  const measure = useMemo(()=>({enabled:debug,tick,tags,events:runEventTags,onEvent:observe}),[debug,tick,tags,observe]);
  const step = useCallback((s:RunState,i:Commands<RunInput>,dt:number)=>{ "worklet";
    if (!replay) return runFrame(s,i,dt);
    if(witness && Math.round(s.time*60)>=witness)return s;
    if (runResult(s)) s=createRun(replayLevel,771,false);
    return runFrame(s,{...i,helper:false,queue:[{id:s.command+1,action:fixtureInput(s)}]},dt);
  },[replay,witness,replayLevel]);
  const resultFn = useCallback((s:RunState)=>{ "worklet"; return replay ? null : runResult(s); },[replay]);
  const [initial] = useState(() => ({...createRun(level, seed, replay?false:helper),learned:replay?0:learnedRunMoves})), poses = useSharedValue<SpritePose[]>(Array(RUN_SLOTS).fill(still));
  const { input, send } = useMailbox<RunInput>(helper, active);
  const build = useCallback((s: RunState) => { "worklet"; return runPoses(s,reduced); }, [reduced]);
  const pose = useMemo(() => ({ build, target: poses }), [build, poses]);
  const { snapshot: s, outcome: result, state } = useLagoonUiLoop({ initial, input, step, result: resultFn, pose, select: selectRun, drain: drainCommands, active, measure });
  const meterLabel=useRunMeter(lagoonMeasurement(Constants.expoConfig,debug), active, state,tick,tags,replay,seed);
  useOutcome(s, result, props);
  useEffect(() => { if(!replay)learnedRunMoves |= s.learned; },[s.learned,replay]);
  const actionTone=useCallback((_a?:RunInput)=>{},[]); // Accepted actions emit from the fixed-step event observer.
  const action = useCallback((a:RunInput)=>{if(active)send(a);},[active,send]);
  useKeyboard(active, useCallback(key => action({ type: ["ArrowLeft", "KeyA"].includes(key) ? "left" : ["ArrowRight", "KeyD"].includes(key) ? "right" : ["ArrowDown", "KeyS"].includes(key) ? "duck" : "jump" }), [action]));
  const origin=useSharedValue({x:0,y:0});
  const swipe=useMemo(()=>runSwipe(input,origin).enabled(active),[input,origin,active]);
  const learn = level !== "endless" && level.world === "learn";
  const [arrows,setArrows]=useRunArrows();
  const toggleArrows=useCallback(()=>setArrows(!arrows),[arrows,setArrows]);
  const pad = <><Control overlay disabled={!active} label="Move left" glyph="←" mailbox={input} action={{ type: "left" }} feedback={() => actionTone({ type: "left" })} onPress={() => action({ type: "left" })}/><Control overlay disabled={!active} label="Jump" glyph="↑" mailbox={input} action={{ type: "jump" }} feedback={() => actionTone({ type: "jump" })} onPress={() => action({ type: "jump" })}/><Control overlay disabled={!active} label="Roll or drop" glyph="↓" mailbox={input} action={{ type: "duck" }} feedback={() => actionTone({ type: "duck" })} onPress={() => action({ type: "duck" })}/><Control overlay disabled={!active} label="Move right" glyph="→" mailbox={input} action={{ type: "right" }} feedback={() => actionTone({ type: "right" })} onPress={() => action({ type: "right" })}/></>;
  const controls = <RunControls arrows={arrows} onToggle={toggleArrows} pad={pad} finish={level === "endless" ? <Button compact quiet onPress={() => send({ type: "finish" })}>Finish free run</Button> : undefined}/>;
  return <RunArena active={active} world={level === "endless" ? "w3" : level.world} controls={controls} hud={quietHud?null:<RunTopChrome state={state} learn={learn} poses={poses} top={props.overlayTop ?? 0}/>}><RunScene poses={poses} state={state} learn={learn} world={level === "endless" ? "w3" : level.world}/><GestureDetector gesture={swipe} touchAction="none"><Animated.View collapsable={false} testID="run-touch" accessible accessibilityRole="button" accessibilityLabel="Lagoon track. Swipe to steer, up to jump, down to duck" style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, ...(Platform.OS === "web" ? { touchAction: "none" as const } : {}) }}/></GestureDetector>{debug && <Text testID="lagoon-meter" pointerEvents="none" style={{position:"absolute",top:150,left:5,color:"white",backgroundColor:"#14273E",fontSize:11}}>{witness?`${replayLevel.id.toUpperCase()} / 771 / frozen tick ${witness} | `:""}{meterLabel}</Text>}</RunArena>;
}
export function ScrollBoard({ game, ...props }: BoardProps & { game: ScrollGame }) { return game === "fruit-bat-flight" ? <FlightBoard {...props}/> : <RunBoard {...props}/>; }
