import React, { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Button, Copy, Heading } from "../../../components/ui";
import type { BoardProps } from "../../types";
import { complete, correct, ready, rendered, taskAt, type LabState } from "./engine";
const skill = (level: number) => level === 1 ? "think.code-sequence" : level === 2 ? "think.code-variables" : level === 3 ? "think.code-functions" : "think.code-debug";
export function Board({ session, update, practice, assistance, cheer, coach, active, width }: BoardProps<LabState>) {
  const s = session.state, done = complete(s), t = done ? null : taskAt(s.level, s.seed, s.task);
  const [message, setMessage] = useState("");
  const add = (i: number) => { update({ ...s, order: [...s.order, i], ran: false }); coach.done(); setMessage(""); };
  const remove = (i: number) => { update({ ...s, order: s.order.filter((_, j) => j !== i), ran: false }); setMessage(""); };
  const run = () => { if (!t) return; if (!correct(s)) { practice(skill(s.level), false); setMessage("The robot found a bug. Check the line order and the square blank."); return; } update({ ...s, ran: true }); practice(skill(s.level), true); cheer("right"); setMessage(`Output: ${t.output}`); };
  const next = () => { update({ ...s, task: s.task + 1, order: [], token: "", ran: false, helped: false }); setMessage(""); if (s.task === 3) cheer("big"); };
  const help = () => { if (!t) return; assistance?.(); const nextIndex = t.bank.findIndex((line, i) => !s.order.includes(i) && line === t.lines[s.order.length]); update({ ...s, order: nextIndex >= 0 ? [...s.order, nextIndex] : s.order, token: t.slot.length ? t.answer : s.token, helped: true, ran: false }); setMessage("I placed the next block. Keep building, then run it!"); };
  return <View style={{ gap: 10, paddingBottom: 20 }}>
    <Heading>{done ? "Code Lab complete!" : `Program ${s.task + 1} of 4`}</Heading>
    {t && <>
      <Copy>{t.goal}</Copy>
      <View style={{ backgroundColor: "#E9E6DC", borderRadius: 18, padding: 12, alignItems: "center" }}><Robot steps={s.ran ? t.robot : 0}/><Copy style={{ fontWeight: "700" }}>{s.ran ? t.output : "Robot is waiting for Run"}</Copy></View>
      <View style={{ flexDirection: width > 650 ? "row" : "column", gap: 9 }}>
        <View style={{ flex: width > 650 ? 1 : undefined, backgroundColor: "#F0EFFF", padding: 12, borderRadius: 16, gap: 7 }}>
          <Copy style={{ fontWeight: "700" }}>BLOCKS · tap in order</Copy>
          {t.bank.map((line, i) => !s.order.includes(i) && <Button key={i} quiet onPress={() => add(i)} disabled={!active || s.ran} label={`Add block ${line}`}>{line.replace("□", s.token || "□")}</Button>)}
          {s.order.length === t.lines.length && <Copy>All blocks placed. You can tap one in the code panel to change it.</Copy>}
        </View>
        <View style={{ flex: width > 650 ? 1 : undefined, backgroundColor: "#23334D", padding: 12, borderRadius: 16, gap: 7 }}>
          <Copy style={{ color: "#F5D886", fontWeight: "700" }}>PYTHON-LIKE CODE</Copy>
          {rendered(s).map((line, i) => <Button key={i} compact quiet onPress={() => remove(i)} disabled={!active || s.ran} label={`Remove line ${i + 1}, ${line}`} style={{ alignSelf: "stretch", backgroundColor: "#E8EEF5" }}>{`${i + 1}  ${line}`}</Button>)}
          {!s.order.length && <Copy style={{ color: "#FFF" }}>Your code appears here as you add blocks.</Copy>}
        </View>
      </View>
      {!!t.slot.length && <View style={{ gap: 5 }}><Copy style={{ fontWeight: "700" }}>FILL THE □</Copy><View style={{ flexDirection: "row", gap: 7, flexWrap: "wrap" }}>{t.slot.map((token) => <Button key={token} compact quiet selected={s.token === token} onPress={() => { update({ ...s, token, ran: false }); setMessage(""); }} disabled={!active || s.ran}>{token}</Button>)}</View></View>}
      {!!message && <Copy>{message}</Copy>}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>{s.ran ? <Button onPress={next} disabled={!active}>Next program →</Button> : <Button onPress={run} disabled={!active || !ready(s)}>▶ Run code</Button>}<Button quiet onPress={help} disabled={!active || s.ran || s.order.length >= t.lines.length}>Help with a block</Button></View>
    </>}
  </View>;
}
function Robot({ steps }: { steps: number }) { return <Svg width={140} height={100} viewBox="0 0 140 100" accessible accessibilityLabel={`Island robot, ${steps} steps completed`}><Rect x={15 + steps * 5} y="23" width="58" height="54" rx="13" fill="#5C5BA0"/><Circle cx={34 + steps * 5} cy="43" r="5" fill="#FFF"/><Circle cx={56 + steps * 5} cy="43" r="5" fill="#FFF"/><Path d={`M${32 + steps * 5} 60Q${44 + steps * 5} 70 ${58 + steps * 5} 60`} stroke="#FFF" strokeWidth="3" fill="none"/><Path d={`M${27 + steps * 5} 78V94M${61 + steps * 5} 78V94`} stroke="#4B4987" strokeWidth="8"/></Svg>; }
export function Art({ size }: { size: number }) { return <Svg width={size} height={size} viewBox="0 0 100 100"><Rect x="8" y="13" width="84" height="69" rx="10" fill="#5C5BA0"/><Path d="M28 38L40 48L28 58M49 60H71" stroke="#FFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/><Rect x="28" y="84" width="44" height="6" rx="3" fill="#4B4987"/></Svg>; }
