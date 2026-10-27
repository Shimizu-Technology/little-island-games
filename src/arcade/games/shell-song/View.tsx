import React, { memo, useEffect, useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, Easing, withSequence, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import { Button, Copy, Heading, PressableScale } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { useReducedMotion } from "../../../components/motion";
import { PictureObject } from "../../../learn/art/Objects";
import { wordAudio } from "../../../learn/kit/reading";
import { Shell } from "../../Art";
import { ActionBurst, Hero, HudPill, MiniStars } from "../../Juice";
import { useArcadeLoop, type FrameBudget } from "../../loop";
import { glowingShell, noteDuration, songResult, songStep, songTiles, songTransition, type SongInput, type SongState } from "./engine";
import type { ArcadeResult } from "../../types";
import type { OutfitId } from "../../progress";
const tick: SongInput = { type: "tick" };
const SingingShell = memo(function SingingShell({ index, lit, cue, size, outfit }: { index: number; lit: boolean; cue: string; size: number; outfit: OutfitId }) {
  const reduced = useReducedMotion(), bounce = useSharedValue(0), notes = useSharedValue(0);
  useEffect(() => { bounce.value = 0; notes.value = 0; if (lit && !reduced) { bounce.value = withSequence(withTiming(1, { duration: 95 }), withSpring(0, { damping: 8, stiffness: 180 })); notes.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.quad) }); } return () => { cancelAnimation(bounce); cancelAnimation(notes); }; }, [lit, cue, reduced, bounce, notes]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -bounce.value * 14 }, { scaleX: 1 + bounce.value * .07 }, { scaleY: 1 - bounce.value * .06 }] }));
  const noteStyle = useAnimatedStyle(() => ({ opacity: reduced ? 1 : 1 - notes.value * .7, transform: [{ translateY: reduced ? 0 : -notes.value * 28 }, { translateX: reduced ? 0 : notes.value * 8 }] }));
  return <View><Animated.View style={style}><Shell size={size} index={index} glowing={lit} outfit={outfit}/></Animated.View>{lit && <Animated.View pointerEvents="none" style={[{ position: "absolute", right: 0, top: 0 }, noteStyle]}><Svg width={44} height={58} viewBox="0 0 44 58" accessible={false}><Path d="M14 47V19L32 13V38M14 24L32 18" stroke="#FFE3A3" strokeWidth={4} fill="none"/><Ellipse cx={9} cy={47} rx={7} ry={5} fill="#FFE3A3"/><Ellipse cx={27} cy={38} rx={7} ry={5} fill="#FFE3A3"/><Circle cx={36} cy={5} r={3} fill="#F9BF9F"/></Svg></Animated.View>}</View>;
});
export function SongBoard({ initial, active, helper, outfit, onResult, onTone, onSay, debug }: { initial: SongState; active: boolean; helper: boolean; outfit: OutfitId; onResult: (result: ArcadeResult, helped?: boolean) => void; onTone: (tone: string, haptic?: boolean) => void; onSay: (key: string, automatic?: boolean) => boolean; debug?: boolean }) {
  const { snapshot: s, dispatch, state, budget } = useArcadeLoop({ initial, reduce: songTransition, step: songStep, input: tick, active });
  const [manualGlow, setManualGlow] = useState<number | null>(null), [tapCue, setTapCue] = useState(0), [burst, setBurst] = useState<{ id: number; text: string } | null>(null);
  const reported = useRef(false), feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null), reduced = useReducedMotion();
  const { width, height } = useWindowDimensions(), glow = glowingShell(s), learning = s.level !== "endless" && !!s.level.word, tiles = songTiles(s);
  const noteIndex = s.phase === "watch" && s.elapsed >= 450 ? Math.floor((s.elapsed - 450) / noteDuration(s)) : -1;
  const noteKey = `${s.rounds}-${s.slips}-${noteIndex}`;
  useEffect(() => {
    if (glow !== null && active) { if (!(learning && onSay(`arcade-phoneme-${tiles[glow]}`, true))) onTone(`shell-${glow}`, false); }
    // Sound once per note, including repeated notes on one shell; callbacks are not timing dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteKey, active]);
  useEffect(() => { if (active && state.current.helper !== helper) dispatch({ type: "helper", value: helper }); }, [active, helper, dispatch, state]);
  useEffect(() => () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); }, []);
  useEffect(() => { if (!burst) return; const timer = setTimeout(() => setBurst(null), 1100); return () => clearTimeout(timer); }, [burst]);
  useEffect(() => {
    const result = songResult(s);
    if (!result || !active || reported.current) return;
    const timer = setTimeout(() => { if (!reported.current) { reported.current = true; onResult(result, s.helped); } }, reduced ? 150 : 700);
    return () => clearTimeout(timer);
  }, [s, active, onResult, reduced]);
  function tap(index: number) {
    if (!active || state.current.phase !== "repeat") return;
    const before = state.current, next = dispatch({ type: "shell", index });
    if (!(learning && onSay(`arcade-phoneme-${tiles[index]}`))) onTone(`shell-${index}`);
    setManualGlow(index); setTapCue(n => n + 1);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setManualGlow(null), 220);
    if (next.slips > before.slips) { onTone("bump"); setBurst({ id: before.score + next.slips, text: "Once more!" }); }
    else if (next.rounds > before.rounds) { onTone("clear"); setBurst({ id: next.score, text: "Great!" }); }
  }
  const shellSize = Math.floor(Math.min(width >= 600 ? 252 : 126, (Math.min(1100, width) - 24) / 3, height < 500 ? 115 : height * (s.shells > 3 ? .23 : .34)));
  const phase = s.phase === "watch" ? "Watch" : s.phase === "picture" ? "Find the picture" : s.phase === "cleared" ? "Bravo!" : s.phase === "rest" ? "Again?" : "Your turn";
  return <View style={{ flex: 1, width: "100%", alignItems: "center", justifyContent: "space-evenly", gap: 8, paddingBottom: 16, minHeight: height - 90 }}>
    <View style={{ width: "100%", maxWidth: 1050, paddingHorizontal: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 6, flexWrap: "wrap" }}><HudPill icon={<Icon name="flag" color="#986940"/>}>{learning ? "Sound a word" : s.level === "endless" ? `Pattern ${s.rounds + 1}` : `${Math.min(s.rounds + 1, s.level.rounds)}/${s.level.rounds} patterns`}</HudPill><HudPill><MiniStars stars={s.slips === 0 ? 3 : s.slips <= 2 ? 2 : 1}/></HudPill></View>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}><Hero game="shell-song" size={width >= 600 ? 124 : 88} outfit={outfit} cue={`${s.rounds}-${s.slips}-${s.cursor}`} mood={s.slips && s.cursor === 0 ? "dizzy" : s.cursor || s.rounds ? "happy" : "idle"} active={active}/><View accessibilityLiveRegion="polite" style={{ gap: 4 }}><Heading style={{ color: "#FFF3D4", fontSize: width >= 600 ? 36 : 29 }}>{phase}</Heading><Copy style={{ color: "#F5E5D9", fontSize: 15 }}>{s.phase === "watch" ? "Follow the glow" : s.phase === "repeat" ? "Play it back · no hurry" : s.phase === "picture" ? "Blend the sounds" : s.phase === "cleared" ? "A beautiful song" : "A fresh song is waiting"}</Copy></View></View>
    {s.phase !== "picture" ? <>
      <View style={{ width: "100%", maxWidth: 1100, alignItems: "center", position: "relative", paddingVertical: width >= 600 ? 18 : 10 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", columnGap: 2, rowGap: 7, maxWidth: shellSize * 3 + 24 }}>
          {tiles.map((tile, index) => {
            const lit = glow === index || manualGlow === index, next = helper && s.phase === "repeat" && s.pattern[s.cursor] === index;
            return <PressableScale key={index} disabled={!active || s.phase !== "repeat"} accessibilityRole="button" accessibilityLabel={`Shell ${index + 1}${learning ? `, sound ${tile}` : ""}${next ? ", Helper suggests this shell" : ""}`} accessibilityState={{ disabled: !active || s.phase !== "repeat", selected: lit }} onPress={() => tap(index)} style={{ width: shellSize, minHeight: shellSize + 40, borderRadius: 34, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: next ? "#FFE5A1" : "transparent", backgroundColor: lit ? "#827096" : next ? "#5E658C" : "transparent" }}>
              <SingingShell index={index} size={shellSize - 6} lit={lit} cue={manualGlow === index ? String(tapCue) : noteKey} outfit={index === 0 ? outfit : "island"}/><Heading style={{ fontSize: learning ? 32 : 23, color: "#FFF0CC" }}>{learning ? tile : index + 1}</Heading>
            </PressableScale>;
          })}
        </View>{burst && <ActionBurst key={burst.id} text={burst.text}/>}
      </View>
      <View accessibilityLabel={`Pattern progress, ${s.cursor} of ${s.pattern.length}`} style={{ flexDirection: "row", gap: 7, justifyContent: "center", flexWrap: "wrap", paddingHorizontal: 16 }}>{s.pattern.map((_, i) => <View key={i} style={{ width: 13, height: 13, borderRadius: i < s.cursor ? 4 : 7, backgroundColor: s.phase === "repeat" && i < s.cursor ? "#FFDB8C" : "#7983AA", borderWidth: 2, borderColor: "#D4D0E0" }}/>)}</View>
    </> : <View style={{ gap: 14, alignItems: "center", width: "100%" }}>
      <Heading style={{ fontSize: 38, letterSpacing: 5, color: "#FFF0CC" }}>{tiles.join(" · ")}</Heading><Button quiet compact onPress={() => { if (s.level !== "endless" && s.level.word) onSay(wordAudio(s.level.word)); }}>Hear the blended word</Button>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>{s.choices.map(word => <PressableScale key={word} accessibilityRole="button" accessibilityLabel={`Word picture: ${word}`} disabled={!active} onPress={() => { const next = dispatch({ type: "picture", word }); if (next.phase === "cleared") onTone("clear"); else onTone("bump"); }} style={{ width: Math.min(196, (width - 48) / 3), minHeight: width >= 600 ? 190 : 118, padding: 8, backgroundColor: "#FFF4D8", borderRadius: 26, borderWidth: 3, borderColor: s.helped && s.level !== "endless" && s.level.word === word ? "#F8BD54" : "#B9AED1", justifyContent: "center", alignItems: "center" }}><PictureObject name={word} size={width >= 600 ? 130 : 78}/></PressableScale>)}</View>
      <View accessibilityLiveRegion="polite"><Copy style={{ color: "#FFF3D4", textAlign: "center" }}>{s.helped && s.level !== "endless" ? `Blend it: ${s.level.word}.` : s.slips ? "Try blending the sounds again." : "Which picture?"}</Copy></View>
      <Button quiet compact onPress={() => dispatch({ type: "show" })}>Help · show the picture</Button>
    </View>}
    <Button quiet compact icon="refresh" disabled={!active || s.phase === "cleared" || s.phase === "rest"} onPress={() => { dispatch({ type: "replay" }); onTone("coral"); }}>Listen & watch again</Button>
    {s.level === "endless" && <Button quiet compact disabled={!active} onPress={() => dispatch({ type: "finish" })}>Finish my free-play song</Button>}
    {debug && <BudgetOverlay budget={budget}/>}
  </View>;
}
export function BudgetOverlay({ budget }: { budget: FrameBudget }) { return <View testID="arcade-budget"><Copy style={{ fontSize: 12, color: "#FFF0CC", backgroundColor: "#29385D", borderRadius: 10, paddingHorizontal: 10 }}>{budget.fps.toFixed(1)} fps · p95 {budget.p95.toFixed(1)} ms / 16.7 ms · {budget.ticks} fixed steps · {budget.dropped.toFixed(2)} s clamped</Copy></View>; }
