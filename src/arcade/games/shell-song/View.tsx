import React, { useEffect, useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { Button, C, Copy, Heading, PressableScale } from "../../../components/ui";
import { PictureObject } from "../../../learn/art/Objects";
import { wordAudio } from "../../../learn/kit/reading";
import { Shell } from "../../Art";
import { useArcadeLoop, type FrameBudget } from "../../loop";
import { glowingShell, noteDuration, songResult, songStep, songTiles, songTransition, type SongInput, type SongState } from "./engine";
import type { ArcadeResult } from "../../types";
import type { OutfitId } from "../../progress";
const tick: SongInput = { type: "tick" };
export function SongBoard({ initial, active, helper, outfit, onResult, onTone, onSay, debug }: { initial: SongState; active: boolean; helper: boolean; outfit: OutfitId; onResult: (result: ArcadeResult, helped?: boolean) => void; onTone: (tone: string, haptic?: boolean) => void; onSay: (key: string, automatic?: boolean) => boolean; debug?: boolean }) {
  const { snapshot: s, dispatch, state, budget } = useArcadeLoop({ initial, reduce: songTransition, step: songStep, input: tick, active });
  const [manualGlow, setManualGlow] = useState<number | null>(null), reported = useRef(false), feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { width } = useWindowDimensions(), glow = glowingShell(s), learning = s.level !== "endless" && !!s.level.word, tiles = songTiles(s);
  const noteIndex = s.phase === "watch" && s.elapsed >= 450 ? Math.floor((s.elapsed - 450) / noteDuration(s)) : -1;
  const noteKey = `${s.rounds}-${noteIndex}`;
  useEffect(() => {
    if (glow !== null && active) {
      if (!(learning && onSay(`arcade-phoneme-${tiles[glow]}`, true))) onTone(`shell-${glow}`, false);
    }
    // One sound per note, including two repeated notes on the same shell. Ref callbacks stay outside the timing dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteKey, active]);
  useEffect(() => { if (active && state.current.helper !== helper) dispatch({ type: "helper", value: helper }); }, [active, helper, dispatch, state]);
  useEffect(() => () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); }, []);
  useEffect(() => {
    const result = songResult(s);
    if (result && !reported.current) { reported.current = true; onResult(result, s.helped); }
  }, [s, onResult]);
  function tap(index: number) {
    if (!active || state.current.phase !== "repeat") return;
    if (!(learning && onSay(`arcade-phoneme-${tiles[index]}`))) onTone(`shell-${index}`);
    setManualGlow(index);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setManualGlow(null), 180);
    dispatch({ type: "shell", index });
  }
  const shellSize = Math.min(146, Math.max(94, (width - 68) / (s.shells <= 3 ? 3 : 3)));
  return <View style={{ gap: 16, alignItems: "center", width: "100%" }}>
    <View style={{ width: "100%", flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}><Heading style={{ fontSize: 21 }}>{learning ? "Sound a word" : s.level === "endless" ? `Pattern ${s.rounds + 1}` : `Pattern ${Math.min(s.rounds + 1, s.level.rounds)} of ${s.level.rounds}`}</Heading><Copy>{s.pattern.length} sounds · {s.slips} slips</Copy></View>
    <View style={{ width: "100%", minHeight: 54 }} accessibilityLiveRegion="polite"><Copy style={{ fontSize: 18, lineHeight: 25, textAlign: "center", color: C.ink }}>{s.message}</Copy></View>
    {s.phase !== "picture" ? <>
      <View style={{ width: "100%", backgroundColor: "#E6E3F1", borderRadius: 28, paddingVertical: 20, paddingHorizontal: 4, gap: 14, alignItems: "center", borderWidth: 1, borderColor: "#C9C3DE" }}>
        <Heading style={{ fontSize: 20, color: "#535579" }}>{s.phase === "watch" ? "Watch & listen" : "Your turn"}</Heading>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, maxWidth: 480 }}>
          {tiles.map((tile, index) => {
            const lit = glow === index || manualGlow === index, next = helper && s.phase === "repeat" && s.pattern[s.cursor] === index;
            return <PressableScale key={index} disabled={!active || s.phase !== "repeat"} accessibilityRole="button" accessibilityLabel={`Shell ${index + 1}${learning ? `, sound ${tile}` : ""}${next ? ", Helper suggests this shell" : ""}`} accessibilityState={{ disabled: !active || s.phase !== "repeat", selected: lit }} onPress={() => tap(index)} style={{ width: shellSize, minHeight: shellSize + 42, borderRadius: 24, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: next ? "#53568B" : lit ? "#AD873D" : "transparent", backgroundColor: lit ? "#FFF2C9" : next ? "#F3F0FA" : "transparent" }}>
              <Shell size={shellSize} index={index} glowing={lit} outfit={index === 0 ? outfit : "island"}/><Heading style={{ fontSize: learning ? 28 : 19, color: "#424561" }}>{learning ? tile : index + 1}</Heading>
            </PressableScale>;
          })}
        </View>
        <Copy style={{ fontSize: 15, color: "#424561" }}>{s.phase === "watch" ? "Follow the glow. The shapes help you remember." : `${s.cursor} of ${s.pattern.length} sounds played. No hurry.`}</Copy>
      </View>
      <View accessibilityLabel={`Pattern progress, ${s.cursor} of ${s.pattern.length}`} style={{ flexDirection: "row", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>{s.pattern.map((_, i) => <View key={i} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: s.phase === "repeat" && i < s.cursor ? "#5F7F6F" : "#DDD8E9", borderWidth: 1, borderColor: "#A5A0B9" }}/>)}</View>
    </> : <View style={{ gap: 12, alignItems: "center", width: "100%" }}>
      <Heading style={{ fontSize: 32, letterSpacing: 5 }}>{tiles.join(" · ")}</Heading><Button quiet compact onPress={() => { if (s.level !== "endless" && s.level.word) onSay(wordAudio(s.level.word)); }}>Hear the blended word</Button>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>{s.choices.map(word => <PressableScale key={word} accessibilityRole="button" accessibilityLabel={`Word picture: ${word}`} disabled={!active} onPress={() => { const next = dispatch({ type: "picture", word }); if (next.phase === "cleared") onTone("clear"); }} style={{ width: Math.min(128, (width - 64) / 3), minHeight: 118, padding: 8, backgroundColor: "#FFF8E8", borderRadius: 20, borderWidth: 2, borderColor: s.helped && s.level !== "endless" && s.level.word === word ? C.teal : C.line, justifyContent: "center", alignItems: "center" }}><PictureObject name={word} size={78}/></PressableScale>)}</View>
      {s.helped && s.level !== "endless" && <Copy>Blend it: {s.level.word}. Helped answers count.</Copy>}
      <Button quiet onPress={() => dispatch({ type: "show" })}>Help · show the picture</Button>
    </View>}
    <Button quiet disabled={!active} onPress={() => dispatch({ type: "replay" })}>Listen & watch again</Button>
    {s.level === "endless" && <Button quiet disabled={!active} onPress={() => dispatch({ type: "finish" })}>Finish my free-play song</Button>}
    {debug && <BudgetOverlay budget={budget}/>}
  </View>;
}
export function BudgetOverlay({ budget }: { budget: FrameBudget }) { return <Copy style={{ fontSize: 12, color: C.muted }}>{budget.fps.toFixed(1)} fps · p95 {budget.p95.toFixed(1)} ms / 16.7 ms · {budget.ticks} fixed steps · {budget.dropped.toFixed(2)} s clamped</Copy>; }
