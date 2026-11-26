import Constants from 'expo-constants';
import {lagoonMeasurement} from '../lagoon-run/measurement';
import { LagoonFeedback, LandingDust, useRunFeedback, type RunFeedbackVisual } from '../lagoon-run/RunFeedback';
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
import { RunArena, type LagoonInsets } from '../lagoon-run/Arena';
import { useStage } from '../lagoon-run/stage';
import { CONTACT, HERO_SCALE, HERO_ZOOM, TRACK_HEIGHT } from '../lagoon-run/camera';
import { FlightPalm, FlightForest, FlightShore, FlightWideSky, Fruit } from "../fruit-bat-flight/Art";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Platform, Pressable, StyleSheet, View } from "react-native";
import Svg, { Path, Rect, Text as SvgText } from "react-native-svg";
import { runOnJS, runOnUI, useFrameCallback, useAnimatedReaction, useAnimatedStyle, useSharedValue, type SharedValue } from "react-native-reanimated";
import { useReducedMotion } from "../../../components/motion";
import { Button } from "../../../components/ui";
import { Text } from "../../../components/Text";
import { UiPlayTarget } from "../../Input";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { enqueueCommand, drainCommands } from "../../mailbox";
import { flightHud, runHud } from "../../publication";
import { HIDDEN_POSE, samePublication } from "../../poses";
import { HeartsHud } from "../../LivesHud";
import { useArcadeUiLoop } from "../../uiLoop";
import { ArcadeSprite, type SpritePose } from "../../Sprite";
import type { ArcadeResult, WorldId } from "../../types";
import type { OutfitId } from "../../progress";
import { createFlight, flightResult, type FlightInput } from "../fruit-bat-flight/engine";
import { createRun, runLearning, runResult, type RunInput, type RunState } from "../lagoon-run/engine";
import { isCanoe } from "../lagoon-run/geometry";
import { Deck, Canoe, PowerRing, RunTeachingCue, KiteRig } from "../lagoon-run/Art";
import { BakedHazard, BakedPower, BakedShell } from "../lagoon-run/Baked";
import { DepthSprite } from "../lagoon-run/DepthSprite";

import { hazardBox } from "../lagoon-run/course";
import { equation, type ScrollGame, type ScrollLevel } from "./content";
import { BatRig, RunnerRig, LastHit } from "./FeelArt";
import { FLIGHT_H, FLIGHT_W } from "../fruit-bat-flight/hull";
import { FLIGHT_CHROME_TINT, FLIGHT_GATE_COUNT, FLIGHT_SLOT, FRUIT_SIZE, PALM_CAP_WIDTH, PALM_COLUMN_HEIGHT, PORTAL_HEIGHTS, PORTAL_SIZE, flightPoses } from "../fruit-bat-flight/presentation";
import { FlightEffects, FlightFlash, useFlightCamera, useFlightFeedback } from "../fruit-bat-flight/Feedback";
import { runPoses, RUN_SLOTS, NEAR_START, CANOE_START, INCLINE_START, INCLINE_STRIDE, POWER_AURA } from "./render";

import { runFrame, type Commands } from "./commands";
export type BoardProps = { level: ScrollLevel | "endless"; seed: number; active: boolean; helper: boolean; outfit: OutfitId; onResult: (result: ArcadeResult, helped: boolean) => void; onTone: (key: string, haptic?: boolean) => void; onPause?: () => void; debug: boolean; overlayTop?: number; overlayInsets?: LagoonInsets };
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
  return <UiPlayTarget mailbox={mailbox} action={action} active={!disabled} onFeedback={feedback} onAccessiblePress={onPress} accessibilityLabel={label} style={{ minWidth: overlay ? 44 : 58, minHeight: overlay ? 44 : 52, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: overlay ? "#FFF2CC99" : "#FFF2CC", borderWidth: overlay ? 1 : 2, borderBottomWidth: overlay ? 2 : 5, borderColor: "#725B66" }}><Text maxFontSizeMultiplier={overlay ? HUD_TEXT_MAX : undefined} style={{ fontSize: overlay ? 21 : 25, fontWeight: "900", color: "#34354D" }}>{glyph}</Text></UiPlayTarget>;
}
function useMailbox<I>(helper: boolean, active: boolean) {
  const input = useSharedValue<Commands<I>>({ helper, serial: 0, queue: [] }), enabled = useSharedValue(active);
  useEffect(() => { runOnUI((value: boolean, playing: boolean) => { "worklet"; enabled.set(playing); input.set({ ...input.value, helper: value, queue: playing ? input.value.queue : [] }); })(helper, active); }, [helper, active, input, enabled]);
  const send = useCallback((action: I) => { runOnUI((a: I) => { "worklet"; if (enabled.value) input.set(enqueueCommand(input.value, a)); })(action); }, [input, enabled]);
  return { input, send };
}
type OutcomeHud = ReturnType<typeof runHud>;
function useOutcome(s: Pick<OutcomeHud, "helped"> & Partial<Pick<OutcomeHud, "event" | "cue">>, result: ArcadeResult | null, props: BoardProps) {
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
const FlightPortal = memo(function FlightPortal({ value }: { value: number }) {
  return <View style={{ width: PORTAL_SIZE, height: PORTAL_SIZE, borderRadius: 19, backgroundColor: "#2A8C82", borderColor: "#88583E", borderWidth: 2, padding: 4 }}>
    <View style={{ flex: 1, borderRadius: 13, backgroundColor: "#FFFDF8", borderColor: "#E4B774", borderWidth: 2, justifyContent: "center", alignItems: "center" }}>
      <Text allowFontScaling={false} style={{ color: "#173D3A", fontSize: 30, fontWeight: "900" }}>{value}</Text>
    </View>
  </View>;
});

const FlightLayer = memo(function FlightLayer({ poses, facts, learn }: { poses: SharedValue<SpritePose[]>; facts: ReturnType<typeof flightHud>["facts"]; learn: boolean }) {
  return <View testID="flight-art" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    {Array.from({ length: FLIGHT_GATE_COUNT }, (_, i) => learn ? facts[i]?.map((value, choice) => (
      <ArcadeSprite key={`${i}-${choice}`} poses={poses} index={FLIGHT_SLOT.portal + i * PORTAL_HEIGHTS.length + choice} width={PORTAL_SIZE} height={PORTAL_SIZE}><FlightPortal value={value}/></ArcadeSprite>
    )) : <React.Fragment key={i}>
      <ArcadeSprite poses={poses} index={FLIGHT_SLOT.palm + i * 2} width={PALM_CAP_WIDTH} height={PALM_COLUMN_HEIGHT}><FlightPalm/></ArcadeSprite>
      <ArcadeSprite poses={poses} index={FLIGHT_SLOT.palm + i * 2 + 1} width={PALM_CAP_WIDTH} height={PALM_COLUMN_HEIGHT}><FlightPalm bottom/></ArcadeSprite>
      <ArcadeSprite poses={poses} index={FLIGHT_SLOT.fruit + i} width={FRUIT_SIZE} height={FRUIT_SIZE}><Fruit size={FRUIT_SIZE}/></ArcadeSprite>
    </React.Fragment>)}
  </View>;
}, (a, b) => a.poses === b.poses && a.learn === b.learn && samePublication(a.facts, b.facts));

const flightPill = {
  backgroundColor: "#FFFDF8", borderWidth: 1, borderColor: "#C98C56",
  borderRadius: 22, paddingHorizontal: 14, paddingVertical: 5,
};

export function FlightBoard(props: BoardProps) {
  const { level, seed, active, helper, outfit, onTone, debug } = props;
  const reduced = useReducedMotion();
  const [initial] = useState(() => createFlight(level, seed, helper));
  const [size, setSize] = useState({ width: FLIGHT_W, height: FLIGHT_H });
  const poses = useSharedValue(flightPoses(initial, reduced));
  const build = useCallback((state: typeof initial) => {
    "worklet";
    return flightPoses(state, reduced);
  }, [reduced]);
  const pose = useMemo(() => ({ build, target: poses }), [build, poses]);
  const { input, send } = useMailbox<FlightInput>(helper, active);
  const feedback = useFlightFeedback(reduced, onTone);
  const { snapshot: s, outcome: result, state } = useArcadeUiLoop({
    initial, input, step: feedback.step, result: flightResult, pose, select: flightHud, drain: drainCommands, active,
  });
  useOutcome({ helped: s.helped }, result, props);

  const canFly = active && s.status === "playing";
  const flapTone = useCallback(() => { onTone("flight-flap", true); }, [onTone]);
  const flap = useCallback(() => {
    if (canFly) { send({ type: "flap" }); flapTone(); }
  }, [canFly, send, flapTone]);
  useKeyboard(canFly, useCallback(() => flap(), [flap]));

  const world = level === "endless" ? "w1" : level.world;
  const learn = world === "learn", storm = level !== "endless" && level.storm;
  const camera = useFlightCamera(feedback.impact, reduced);
  const ready = useAnimatedStyle(() => ({ opacity: state.value.waiting && state.value.status === "playing" ? 1 : 0 }));
  const scale = Math.min(size.width / FLIGHT_W, size.height / FLIGHT_H);
  const extraTiles = scale === size.width / FLIGHT_W ? 0 : Math.ceil((size.width / scale - FLIGHT_W) / (2 * FLIGHT_W));
  const sceneryTiles = 2 * extraTiles + 1, sceneryWidth = FLIGHT_W * sceneryTiles;
  const arenaPosition = { position: "absolute" as const, height: FLIGHT_H, top: (size.height - FLIGHT_H) / 2, transform: [{ scale }], overflow: "hidden" as const };
  const scoreLabel = level === "endless" ? `Score ${s.score}` : `Score ${s.score} of ${level.target}`;
  return <View testID="flight-field" style={{ flex: 1, overflow: "hidden", backgroundColor: FLIGHT_CHROME_TINT }} onLayout={event => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
  }}>
    <FlightWideSky world={world} storm={storm} width={size.width} height={size.height}/>
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[arenaPosition, { width: sceneryWidth, left: (size.width - sceneryWidth) / 2 }]}>
      <FlightForest poses={poses} storm={storm} tiles={sceneryTiles}/>
      <FlightShore poses={poses} tiles={sceneryTiles}/>
    </View>
    <View pointerEvents="none" style={[arenaPosition, { width: FLIGHT_W, left: (size.width - FLIGHT_W) / 2 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, camera]}>
        <FlightLayer poses={poses} facts={s.facts} learn={learn}/>
        <BatRig poses={poses} outfit={outfit} debug={debug}/>
        <FlightEffects award={feedback.award} awardPulse={feedback.awardPulse} puffs={feedback.puffs} reduced={reduced}/>
      </Animated.View>
    </View>
    <FlightFlash impact={feedback.impact} reduced={reduced}/>
    <UiPlayTarget mailbox={input} action={{ type: "flap" }} onFeedback={flapTone} onAccessiblePress={flap}
      testID="flight-touch" accessibilityLabel="Flight sky. Tap to flap" active={canFly} style={StyleSheet.absoluteFill}/>
    <View pointerEvents="box-none" style={{ position: "absolute", top: 8, left: 8, right: 8, gap: 7, alignItems: "center" }}>
      <View pointerEvents="box-none" style={{ alignSelf: "stretch", flexDirection: "row", alignItems: "center", justifyContent: learn ? "center" : "space-between", gap: 6 }}>
        {s.lives && <View pointerEvents="none"><HeartsHud lives={s.lives} compact/></View>}
        <View pointerEvents="none" accessible accessibilityLabel={scoreLabel} style={flightPill}>
          <Text testID="flight-score" maxFontSizeMultiplier={1.5} style={{ color: "#173D3A", fontSize: 26, fontWeight: "900", fontVariant: ["tabular-nums"] }}>
            {s.score}{level !== "endless" && <Text maxFontSizeMultiplier={1.5} style={{ fontSize: 15, color: "#47645D", fontWeight: "800" }}> / {level.target}</Text>}
          </Text>
        </View>
      </View>
      {learn && s.next && <View pointerEvents="none" style={flightPill}>
        <Text testID="math-fact" maxFontSizeMultiplier={1.5} style={{ color: "#173D3A", fontSize: 23, fontWeight: "900" }}>{s.next}</Text>
      </View>}
    </View>
    <Animated.View pointerEvents="none" accessibilityElementsHidden={!s.waiting} importantForAccessibility={s.waiting ? "auto" : "no-hide-descendants"}
      style={[flightPill, { position: "absolute", top: learn ? "62%" : "31%", alignSelf: "center" }, ready]}>
      <Text maxFontSizeMultiplier={1.5} style={{ color: "#173D3A", fontSize: 17, fontWeight: "900" }}>Tap to fly</Text>
    </Animated.View>
    <View pointerEvents="box-none" testID="flight-controls" style={{ position: "absolute", bottom: 8, right: 12, left: 12, alignItems: "flex-end" }}>
      {level === "endless" && <Button compact quiet onPress={() => send({ type: "finish" })}>Finish free flight</Button>}
    </View>
    {debug && <Budget active={active}/>}
  </View>;
}
type RunRowSpec=ReturnType<typeof runHud>["spec"][number];
const RunRow=memo(function RunRow({poses,row,i,learn,reduced,front=false}:{poses:SharedValue<SpritePose[]>;row:RunRowSpec;i:number;learn:boolean;reduced:boolean;front?:boolean}) {
  const actor=(kind:RunRowSpec["kind"],index:number,canoe:number)=>{const box=isCanoe(kind)?{width:390,height:660}:hazardBox(kind);return <DepthSprite front={front} poses={poses} index={index} rotate={kind!=="coconut"} width={box.width} height={box.height}>{isCanoe(kind)?<Canoe poses={poses} index={CANOE_START+canoe*4} moving={kind==="moving-canoe"} reduced={reduced}/>:<BakedHazard kind={kind} width={box.width} height={box.height} poses={poses} index={index}/>}</DepthSprite>;};
  return <>{actor(row.kind,1+i*2,i*3)}{actor(row.secondKind,2+i*2,i*3+1)}{actor(row.kind,75+i,i*3+2)}<DepthSprite front={front} poses={poses} index={167+i} width={44} height={44}><BakedPower kind={row.power} size={44}/></DepthSprite>{[0, 1, 2].map(c => <DepthSprite key={c} front={front} poses={poses} index={11 + i * 3 + c} width={30} height={30}><BakedShell size={30}/></DepthSprite>)}{learn && !front && row.choices.map((n, c) => <DepthSprite key={`a${c}`} poses={poses} index={60 + i * 3 + c} width={64} height={64}><Portal value={n} index={c}/></DepthSprite>)}</>;
},(a,b)=>a.poses===b.poses && a.i===b.i && a.learn===b.learn && a.reduced===b.reduced && a.front===b.front && samePublication(a.row,b.row));
/** Effects never depend on the course, so a spawn or crossing cannot re-render them. */
const RunEffects = memo(function RunEffects({ poses }: { poses: SharedValue<SpritePose[]> }) {
  return <>
    <LandingDust poses={poses}/>
    {Array.from({ length: 6 }, (_, i) => <ArcadeSprite key={`splash${i}`} poses={poses} index={26 + i} width={12} height={12}><Svg width={12} height={12}><Path d="M6 0Q-3 9 6 12Q15 9 6 0Z" fill="#9BE9E8" stroke="#287984" strokeWidth={1}/></Svg></ArcadeSprite>)}
    {Array.from({ length: 6 }, (_, i) => <ArcadeSprite key={`near${i}`} poses={poses} index={NEAR_START + i} width={12} height={12}><Particle/></ArcadeSprite>)}
    <ArcadeSprite poses={poses} index={56} width={64} height={30}><View style={{ width: 64, height: 30, borderRadius: 15, backgroundColor: "#FFF2CF", borderWidth: 2, borderColor: "#B76A20", alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#5B4844", fontSize: 18, lineHeight: 22, fontWeight: "900" }}>+10</Text></View></ArcadeSprite>
  </>;
});
const RunnerPowers=memo(function RunnerPowers({poses}:{poses:SharedValue<SpritePose[]>}) {
  return <><ArcadeSprite poses={poses} index={POWER_AURA + 2} width={104} height={132}>
    <Svg width={104} height={132} accessible={false}>
      <Path d="M25 121Q2 111 9 82M79 121Q102 111 95 82M19 55Q10 75 15 91M85 55Q94 75 89 91" fill="none" stroke="#F5C249" strokeWidth={3} strokeLinecap="round"/>
      <Path d="M7 121L2 128M97 121l5 7M19 120l-3 9M85 120l3 9" stroke="#FFFDF8" strokeWidth={3} strokeLinecap="round"/>
    </Svg>
  </ArcadeSprite><ArcadeSprite poses={poses} index={POWER_AURA} width={112} height={154}><Svg width={112} height={154}><Path d="M20 127Q-12 72 17 29M95 127Q125 72 96 29" fill="none" stroke="#B1FFF2" strokeWidth={4} strokeDasharray="8 7"/><Path d="M6 72L17 66M101 66L110 72M12 105L22 99M91 99L103 105" stroke="#FFE49A" strokeWidth={3}/></Svg></ArcadeSprite><ArcadeSprite poses={poses} index={POWER_AURA+1} width={86} height={28}><Svg width={86} height={28}><Path d="M10 22Q24 7 37 20M49 20Q62 7 78 22" stroke="#FFF5A3" strokeWidth={7} fill="none"/><Path d="M8 5L13 12M77 5L72 12" stroke="#FFF5A3" strokeWidth={3}/></Svg></ArcadeSprite><ArcadeSprite poses={poses} index={172} width={72} height={110}><KiteRig/></ArcadeSprite><ArcadeSprite poses={poses} index={173} width={96} height={142}><Svg width={96} height={142}><Path d="M48 3C109 3 109 139 48 139C-13 139-13 3 48 3Z" fill="#AEE1BA" fillOpacity={.18} stroke="#E9FFD3" strokeWidth={3}/></Svg></ArcadeSprite></>;
});
const LAYER={position:"absolute" as const,left:0,top:0,width:W,height:H};
/**
 * Layer containers are never collapsed: flattening would merge every zIndex into one sibling list
 * and draw actors over the runner.
 * Fixed native draw order: scene, decks, actors behind the runner, effects, runner, actors in
 * front of the runner. Nothing reorders past the runner (see DepthSprite); a passing row hands
 * off between its pre-mounted twins by opacity only.
 */
export const RunLayer = memo(function RunLayer({ poses, spec, learn, world, runner, feedback }: { poses: SharedValue<SpritePose[]>; spec: RunRowSpec[]; learn: boolean; world: WorldId; runner?: React.ReactNode; feedback?: RunFeedbackVisual }) {
  const reduced = feedback?.reduced ?? false;
  return <RunCamera poses={poses} impact={feedback?.impact} reduced={reduced}><View testID="run-art" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: "absolute", width: W, height: H }}><DeckBase world={world}/><HarborPlanks poses={poses} world={world}/><DeckHaze world={world}/><DeckLight world={world}/><HarborEnvironment poses={poses} world={world}/><ArcadeSprite poses={poses} index={50} width={70} height={14}><Svg width={70} height={14}><Path d="M2 7Q35-5 68 7Q35 20 2 7Z" fill="#173F67" opacity={.48}/></Svg></ArcadeSprite>
    <View collapsable={false} style={LAYER}>{spec.map((row,i)=><React.Fragment key={i}><Deck poses={poses} index={147+i*4} surface={row.surface}/>{row.surface==="ramp"&&<Deck poses={poses} index={INCLINE_START+i*INCLINE_STRIDE} surface={row.surface} incline/>}</React.Fragment>)}</View>
    <View collapsable={false} testID="run-behind" style={LAYER}>{spec.map((row,i)=><RunRow key={i} row={row} i={i} poses={poses} learn={learn} reduced={reduced}/>)}</View>
    <RunEffects poses={poses}/>
    <View collapsable={false} style={LAYER}>{runner}<RunnerPowers poses={poses}/>{feedback && <LagoonFeedback {...feedback}/>}</View>
    <View collapsable={false} testID="run-front" style={LAYER}>{spec.map((row,i)=><RunRow key={i} row={row} i={i} poses={poses} learn={learn} reduced={reduced} front/>)}</View>
    <SpeedLines poses={poses}/></View></RunCamera>;
});
function selectRun(s: RunState) { "worklet"; return {helped:s.status !== "playing" && s.helped}; }
function useRunSnapshot<T>(state:SharedValue<RunState>, select:(s:RunState)=>T) {
  const [snapshot,setSnapshot]=useState(()=>select(state.value));
  useAnimatedReaction(()=>select(state.value),(next,previous)=>{if(!samePublication(next,previous))runOnJS(setSnapshot)(next);},[state,select]);
  return snapshot;
}
function sceneSpec(s:RunState) { "worklet"; const h=runHud(s);return {spec:h.spec,dead:s.lives.hearts===0}; }
const RunScene=memo(function RunScene({poses,state,learn,world,feedback}:{poses:SharedValue<SpritePose[]>;state:SharedValue<RunState>;learn:boolean;world:WorldId;feedback:RunFeedbackVisual}) {
  const s=useRunSnapshot(state,sceneSpec);
  // The runner is live vector art: supersample it to the stage's total zoom so it stays sharp.
  const stage=useStage(),sample=Math.max(1,Math.min(2,Math.ceil(HERO_ZOOM*HERO_SCALE*stage.scale*4)/4));
  const runner=useMemo(()=><LastHit dead={s.dead} x={195} y={TRACK_HEIGHT*CONTACT}><RunHit poses={poses}><RunnerRig poses={poses} sample={sample} wrap={frames=><View pointerEvents="none" style={{position:"absolute",left:-(80*sample-80)/2,top:-(132*sample-132)/2,width:80*sample,height:132*sample,transform:[{scale:1/sample}]}}>{frames}</View>}/></RunHit></LastHit>,[poses,s.dead,sample]);
  return <RunLayer poses={poses} spec={s.spec} learn={learn} world={world} runner={runner} feedback={feedback}/>;
});
function displayRun(s:RunState) {"worklet";const h=runHud(s);return {level:h.level,passed:h.passed,score:h.score,lives:h.lives,powers:h.powers,next:h.next,shellNotes:runLearning(s)?0:s.shells};}
/**
 * Top chrome in one column under the shared header's measured height (P2-2): the slim HUD, then the
 * learning equation, then power rings and the teaching cue. Each sits below the content before it,
 * so nothing is placed by a fixed offset that larger text could overrun. The cue subscribes to
 * nothing: the pose carries the move.
 */
export function RunTopChrome({state,learn,poses,top,insets}:{state:SharedValue<RunState>;learn:boolean;poses:SharedValue<SpritePose[]>;top:number;insets?:LagoonInsets}) {
  const s=useRunSnapshot(state,displayRun);
  return <View pointerEvents="none" testID="run-top" style={{position:"absolute",left:10+(insets?.left??0),right:10+(insets?.right??0),top:top+4,gap:6}}>
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
 * Bottom chrome (P2-1). Finish and the arrow switch share one flex row, at opposite ends, with at
 * least a gap wider than both touch slops, so their hit areas can never overlap at any text size (a
 * long Finish wraps above the switch). The arrow pad has its own row, PAD_GAP below. Nothing here is absolutely placed. Their
 * labels stop growing at the HUD cap so the largest text never covers the runner.
 */
export const OPTION_GAP = TOGGLE_SLOP + BUTTON_SLOP + 2, PAD_GAP = 24;
export function RunControls({ arrows, onToggle, pad, finish, insets }: { arrows: boolean; onToggle: () => void; pad: React.ReactNode; finish?: React.ReactNode; insets?: LagoonInsets }) {
  return <View pointerEvents="box-none" testID="run-chrome-bottom" style={{ position: "absolute", left: 12 + (insets?.left ?? 0), right: 12 + (insets?.right ?? 0), bottom: 10 + (insets?.bottom ?? 0), gap: PAD_GAP }}>
    <View pointerEvents="box-none" testID="run-option-row" style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: OPTION_GAP }}>{finish ?? <View/>}<ArrowToggle shown={arrows} onToggle={onToggle}/></View>
    {arrows && <View pointerEvents="box-none" style={{ flexDirection: "row", justifyContent: "center", gap: 10 }}>{pad}</View>}
  </View>;
}
// Runtime-only teaching memory is deliberately outside saves; reload starts a new app session.
let learnedRunMoves = 0;
function rememberRunMoves(moves: number) { learnedRunMoves |= moves; }
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
  const { observe, visual } = useRunFeedback(reduced, active, onTone);
  const measure = useMemo(() => ({ enabled: debug, tick, tags, events: runEventTags }), [debug, tick, tags]);
  const step = useCallback((before: RunState, i: Commands<RunInput>, dt: number) => {
    "worklet";
    if (replay && witness && Math.round(before.time * 60) >= witness) return before;
    const start = replay && runResult(before) ? createRun(replayLevel, 771, false) : before;
    const after = replay
      ? runFrame(start, { ...i, helper: false, queue: [{ id: start.command + 1, action: fixtureInput(start) }] }, dt)
      : runFrame(start, i, dt);
    observe(start, after);
    if (!replay && start.learned !== after.learned) runOnJS(rememberRunMoves)(after.learned);
    return after;
  }, [replay, witness, replayLevel, observe]);
  const resultFn = useCallback((s:RunState)=>{ "worklet"; return replay ? null : runResult(s); },[replay]);
  const [initial] = useState(() => ({...createRun(level, seed, replay?false:helper),learned:replay?0:learnedRunMoves})), poses = useSharedValue<SpritePose[]>(Array(RUN_SLOTS).fill(still));
  const { input, send } = useMailbox<RunInput>(helper, active);
  const build = useCallback((s: RunState) => { "worklet"; return runPoses(s,reduced); }, [reduced]);
  const pose = useMemo(() => ({ build, target: poses }), [build, poses]);
  const { snapshot: s, outcome: result, state } = useLagoonUiLoop({ initial, input, step, result: resultFn, pose, select: selectRun, drain: drainCommands, active, measure });
  const meterLabel=useRunMeter(lagoonMeasurement(Constants.expoConfig,debug), active, state,tick,tags,replay,seed);
  useOutcome(s, result, props);
  const actionTone=useCallback((_a?:RunInput)=>{},[]); // Accepted actions emit from the fixed-step event observer.
  const action = useCallback((a:RunInput)=>{if(active)send(a);},[active,send]);
  useKeyboard(active, useCallback(key => action({ type: ["ArrowLeft", "KeyA"].includes(key) ? "left" : ["ArrowRight", "KeyD"].includes(key) ? "right" : ["ArrowDown", "KeyS"].includes(key) ? "duck" : "jump" }), [action]));
  const origin=useSharedValue({x:0,y:0});
  const swipe=useMemo(()=>runSwipe(input,origin).enabled(active),[input,origin,active]);
  const learn = level !== "endless" && level.world === "learn";
  const [arrows,setArrows]=useRunArrows();
  const toggleArrows=useCallback(()=>setArrows(!arrows),[arrows,setArrows]);
  const pad = <><Control overlay disabled={!active} label="Move left" glyph="←" mailbox={input} action={{ type: "left" }} feedback={() => actionTone({ type: "left" })} onPress={() => action({ type: "left" })}/><Control overlay disabled={!active} label="Jump" glyph="↑" mailbox={input} action={{ type: "jump" }} feedback={() => actionTone({ type: "jump" })} onPress={() => action({ type: "jump" })}/><Control overlay disabled={!active} label="Roll or drop" glyph="↓" mailbox={input} action={{ type: "duck" }} feedback={() => actionTone({ type: "duck" })} onPress={() => action({ type: "duck" })}/><Control overlay disabled={!active} label="Move right" glyph="→" mailbox={input} action={{ type: "right" }} feedback={() => actionTone({ type: "right" })} onPress={() => action({ type: "right" })}/></>;
  const controls = <RunControls insets={props.overlayInsets} arrows={arrows} onToggle={toggleArrows} pad={pad} finish={level === "endless" ? <Button compact quiet maxFontSizeMultiplier={HUD_TEXT_MAX} onPress={() => send({ type: "finish" })}>Finish free run</Button> : undefined}/>;
  return <RunArena active={active} world={level === "endless" ? "w3" : level.world} controls={controls} overlay={<RunHitFlash impact={visual.impact} reduced={reduced}/>} hud={quietHud?null:<RunTopChrome state={state} learn={learn} poses={poses} top={props.overlayTop ?? 0} insets={props.overlayInsets}/>}><RunScene poses={poses} state={state} learn={learn} feedback={visual} world={level === "endless" ? "w3" : level.world}/><GestureDetector gesture={swipe} touchAction="none"><Animated.View collapsable={false} testID="run-touch" accessible accessibilityRole="button" accessibilityLabel="Lagoon track. Swipe to steer, up to jump, down to duck" style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, ...(Platform.OS === "web" ? { touchAction: "none" as const } : {}) }}/></GestureDetector>{debug && <Text testID="lagoon-meter" pointerEvents="none" style={{position:"absolute",top:150,left:5,color:"white",backgroundColor:"#14273E",fontSize:11}}>{witness?`${replayLevel.id.toUpperCase()} / 771 / frozen tick ${witness} | `:""}{meterLabel}</Text>}</RunArena>;
}
export function ScrollBoard({ game, ...props }: BoardProps & { game: ScrollGame }) { return game === "fruit-bat-flight" ? <FlightBoard {...props}/> : <RunBoard {...props}/>; }
