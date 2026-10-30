import React, { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Button, Copy, Heading } from "../../../components/ui";
import { GameIcon } from "../../../components/GameIcon";
import type { BoardProps } from "../../types";
import { complete, executionPlan, ready, rendered, taskAt, type LabState } from "./engine";
const skill = (level: number) => level === 1 ? "think.code-sequence" : level === 2 ? "think.code-variables" : level === 3 ? "think.code-functions" : "think.code-debug";
export function Board({ session, update, practice, assistance, cheer, coach, active, width }: BoardProps<LabState>) {
  const s = session.state, done = complete(s), t = done ? null : taskAt(s.level, s.seed, s.index);
  const [message, setMessage] = useState("");
  const [trace, setTrace] = useState<{ step: number; failure: number; plan: number[] } | null>(null);
  const traceLine = trace?.plan[trace.step];
  const robotSteps = trace && t ? Math.min(t.robot, trace.plan.slice(0, trace.step + 1).filter((i) => /robot\.(step|jump)/.test(t.lines[i])).length) : 0;
  const resetTrace = () => { setTrace(null); setMessage(""); };
  const add = (i: number) => { update({ ...s, order: [...s.order, i], ran: false }); coach.done(); resetTrace(); };
  const remove = (i: number) => { update({ ...s, order: s.order.filter((_, j) => j !== i), ran: false }); resetTrace(); };
  const run = () => {
    if (!t || !ready(s)) return;
    const failure = t.lines.findIndex((line, i) => t.bank[s.order[i]] !== line || (line.includes("□") && s.token !== t.answer));
    setTrace({ step: 0, failure, plan: failure >= 0 ? t.lines.map((_, i) => i) : executionPlan(t, s.token) });
    setMessage(failure === 0 ? "Step 1 has a bug. Tap the highlighted line to change it." : "Step 1 is running. Follow the highlighted code, one line at a time.");
    if (failure === 0) practice(skill(s.level), false);
  };
  const nextStep = () => {
    if (!t || !trace) return;
    if (trace.step + 1 < trace.plan.length) {
      const step = trace.step + 1;
      setTrace({ ...trace, step });
      setMessage(trace.plan[step] === trace.failure ? `Step ${step + 1} has a bug. Tap the highlighted line or token and try again.` : `Step ${step + 1} is running: ${t.lines[trace.plan[step]].trim().replace("□", s.token)}.`);
      if (trace.plan[step] === trace.failure) practice(skill(s.level), false);
      return;
    }
    update({ ...s, ran: true }); practice(skill(s.level), true); cheer("right"); setTrace(null); setMessage(`Output: ${t.output}`);
  };
  const next = () => { update({ ...s, index: s.index + 1, order: [], token: "", ran: false, helped: false }); resetTrace(); if (s.index === 3) cheer("big"); };
  const help = () => { if (!t) return; assistance?.(); const nextIndex = t.bank.findIndex((line, i) => !s.order.includes(i) && line === t.lines[s.order.length]); update({ ...s, order: nextIndex >= 0 ? [...s.order, nextIndex] : s.order, token: t.slot.length ? t.answer : s.token, helped: true, ran: false }); setTrace(null); setMessage("I placed the next block. Keep building, then run it!"); };
  return <View style={{ gap: 10, paddingBottom: 20 }}>
    <Heading>{done ? "Code Lab complete!" : `Program ${s.index + 1} of 4`}</Heading>
    {t && <>
      <Copy>{t.goal}</Copy>
      <View style={{ backgroundColor: "#E9E6DC", borderRadius: 18, padding: width > 650 ? 12 : 7, alignItems: "center", flexDirection: width > 650 ? "column" : "row", justifyContent: "center", gap: 8 }}><Robot steps={s.ran ? t.robot : robotSteps} size={width > 650 ? 140 : 82}/><View style={{ flex: width > 650 ? undefined : 1, gap: 4 }}><Copy style={{ fontWeight: "700" }}>{s.ran ? t.output : trace ? `Running step ${trace.step + 1} of ${trace.plan.length}` : "Robot is waiting for Run"}</Copy>{s.level === 1 && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>{t.lines.map((line, i) => <Copy key={i} style={{ fontSize: 13, color: "#355C58", backgroundColor: "#FFF9E9", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 }}>{line.startsWith("print") ? `💬 ${line.match(/"([^"]+)"/)?.[1] ?? "say"}` : "👣 step"}</Copy>)}</View>}</View></View>
      <View style={{ flexDirection: width >= 650 ? "row" : "column", gap: 7 }}>
        <View style={{ flex: width >= 650 ? 1 : undefined, minWidth: 0, backgroundColor: "#F0EFFF", padding: 9, borderRadius: 16, gap: 7 }}>
          <Copy style={{ fontWeight: "700" }}>BLOCKS · tap in order</Copy>
          {t.bank.map((line, i) => !s.order.includes(i) && <Button key={i} quiet onPress={() => add(i)} disabled={!active || s.ran} label={`Add block ${line}`} numberOfLines={1} textStyle={{ fontFamily: "monospace", fontSize: 14, fontWeight: "600" }}>{line.startsWith("    ") ? `  │ ${line.trimStart().replace("□", s.token || "□")}` : line.replace("□", s.token || "□")}</Button>)}
          {s.order.length === t.lines.length && <Copy>All blocks placed. Check the code → Tap a line to change it.</Copy>}
        </View>
        <View style={{ flex: width >= 650 ? 1 : undefined, minWidth: 0, backgroundColor: "#23334D", padding: 9, borderRadius: 16, gap: 7 }}>
          <Copy style={{ color: "#F5D886", fontWeight: "700" }}>{s.ran ? "PYTHON-LIKE CODE · verified" : "PYTHON-LIKE CODE · draft"}</Copy>
          {rendered(s).map((line, i) => <Button key={i} compact quiet onPress={() => remove(i)} disabled={!active || s.ran} label={`Remove line ${i + 1}, ${line}${traceLine === i ? trace?.failure === i ? ", bug here" : ", running now" : ""}`} numberOfLines={1} textStyle={{ fontFamily: "monospace", fontSize: 14, fontWeight: "600" }} style={{ alignSelf: "stretch", backgroundColor: traceLine === i ? trace?.failure === i ? "#F9C4B7" : "#F5D886" : "#E8EEF5", minHeight: 48, justifyContent: "flex-start" }}>{`${i + 1}  ${line.startsWith("    ") ? `  │ ${line.trimStart()}` : line}`}</Button>)}
          {!s.order.length && <Copy style={{ color: "#FFF" }}>Your code appears here as you add blocks.</Copy>}
        </View>
      </View>
      {!!t.slot.length && <View style={{ gap: 5 }}><Copy style={{ fontWeight: "700" }}>FILL THE □</Copy><View style={{ flexDirection: "row", gap: 7, flexWrap: "wrap" }}>{t.slot.map((token) => <Button key={token} compact quiet selected={s.token === token} onPress={() => { update({ ...s, token, ran: false }); resetTrace(); }} disabled={!active || s.ran}>{token}</Button>)}</View></View>}
      {!!message && <Copy>{message}</Copy>}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>{s.ran ? <Button onPress={next} disabled={!active}>Next program →</Button> : trace && trace.plan[trace.step] !== trace.failure ? <Button onPress={nextStep} disabled={!active}>Next step →</Button> : <Button onPress={run} disabled={!active || !ready(s)}>▶ Run code</Button>}<Button quiet onPress={help} disabled={!active || s.ran || s.order.length >= t.lines.length}>Help with a block</Button></View>
    </>}
  </View>;
}
function Robot({ steps, size = 140 }: { steps: number; size?: number }) { return <Svg width={size} height={size * 100 / 140} viewBox="0 0 140 100" accessible accessibilityLabel={`Island robot, ${steps} steps completed`}><Rect x={15 + steps * 5} y="23" width="58" height="54" rx="13" fill="#5C5BA0"/><Circle cx={34 + steps * 5} cy="43" r="5" fill="#FFF"/><Circle cx={56 + steps * 5} cy="43" r="5" fill="#FFF"/><Path d={`M${32 + steps * 5} 60Q${44 + steps * 5} 70 ${58 + steps * 5} 60`} stroke="#FFF" strokeWidth="3" fill="none"/><Path d={`M${27 + steps * 5} 78V94M${61 + steps * 5} 78V94`} stroke="#4B4987" strokeWidth="8"/></Svg>; }
export function Art({ size }: { size: number }) { return <GameIcon id="code-lab" size={size}/>; }
