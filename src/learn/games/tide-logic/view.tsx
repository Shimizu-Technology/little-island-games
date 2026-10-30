import React, { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Path, Rect, Text as SvgText } from "react-native-svg";
import { Button, C, Copy, Heading } from "../../../components/ui";
import type { BoardProps } from "../../types";
import { advance, choices, complete, correct, ready, route, taskAt, type Item, type TideState } from "./engine";

function Cargo({ item, size = 56 }: { item: Item; size?: number }) {
  const fill = item.color === "blue" ? "#4E9BB9" : "#E9826B";
  return <Svg width={size} height={size} viewBox="0 0 64 64" accessible accessibilityLabel={`${item.size} ${item.color} ${item.kind}${item.bell ? ", bell" : ""}`}>
    {item.kind === "fish" ? <><Path d="M8 32 Q28 8 51 32 Q28 56 8 32 M48 32 L61 19 V45 Z" fill={fill} stroke={C.ink} strokeWidth="2"/><Circle cx="23" cy="28" r="2" fill={C.ink}/></> : <><Path d="M8 47 Q9 12 32 12 Q55 12 56 47 L32 56 Z" fill={fill} stroke={C.ink} strokeWidth="2"/><Path d="M32 15V51M18 23L28 51M46 23L36 51" stroke="#FFF" strokeWidth="2"/></>}
    {item.bell && <><Circle cx="51" cy="12" r="10" fill="#F1C75A"/><SvgText x="51" y="16" textAnchor="middle" fontSize="13">♪</SvgText></>}
  </Svg>;
}
export function Board({ session, update, practice, assistance, cheer, coach, active, width }: BoardProps<TideState>) {
  const s = session.state, done = complete(s), t = done ? null : taskAt(s.level, s.seed, s.index);
  const [editing, setEditing] = useState<keyof TideState["rule"] | null>(null);
  const [message, setMessage] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [guess, setGuess] = useState<"left" | "right" | null>(null);
  const current = t && s.running >= 0 ? Math.min(s.running, t.items.length - 1) : 0;
  const traceIndex = s.index % 2 ? 1 : 0;
  const traceAnswer = t ? route(t.items[traceIndex], t.target) : null;
  const change = (slot: keyof TideState["rule"], value: string) => { update({ ...s, rule: { ...s.rule, [slot]: value } }); setEditing(null); setMessage(""); coach.done(); };
  const run = () => {
    if (!t || !ready(s) || (s.level === 5 && guess !== traceAnswer)) return;
    if (!correct(s)) { practice(s.level >= 3 ? "think.code-logic" : "think.code-condition", false); setMessage("The belt would send one catch to the wrong bucket. Try a different block."); return; }
    update({ ...s, running: 0 }); setMessage("Watch each catch reach its bucket."); cheer("right");
  };
  const step = () => {
    if (!t) return;
    if (s.running >= t.items.length) { const next = advance(s); update(next); setMessage(""); setGuess(null); if (complete(next)) cheer("big"); return; }
    const next = advance(s); update(next);
    if (next.running === t.items.length) { practice(s.level === 4 ? "think.code-events" : s.level >= 3 ? "think.code-logic" : "think.code-condition", true); cheer("right"); }
  };
  return <View style={{ gap: 12, paddingBottom: 20 }}>
    <Heading>{done ? "Dock sorter complete!" : `Belt ${s.index + 1} of 4`}</Heading>
    {t && <>
      <Copy>{t.prompt}</Copy>
      <View style={{ backgroundColor: "#E2F3F2", borderRadius: 18, padding: 12, gap: 8 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 5 }}>
          {t.items.map((item, i) => <View key={i} style={{ opacity: s.running >= 0 && i > current ? .35 : 1, alignItems: "center", minWidth: 56 }}><Cargo item={item} size={item.size === "big" ? 58 : 43}/><Copy style={{ fontSize: 11 }}>{item.size}</Copy></View>)}
        </View>
        <View style={{ height: 9, borderRadius: 5, backgroundColor: "#B49C77" }}/>
        <View style={{ flexDirection: "row", justifyContent: "space-around" }}><Copy>← LEFT BUCKET</Copy><Copy>RIGHT BUCKET →</Copy></View>
        {s.running >= 0 && <Copy style={{ textAlign: "center", fontWeight: "700" }}>{s.running < t.items.length ? `Catch ${s.running + 1}: ${route(t.items[s.running], s.rule).toUpperCase()} ${s.rule.action === "count left" && route(t.items[s.running], s.rule) === "left" ? " · counter +1" : ""}` : `All sorted! ${t.items.filter((item) => route(item, s.rule) === "left").length} left · ${t.items.filter((item) => route(item, s.rule) === "right").length} right`}</Copy>}
      </View>
      <View style={{ borderWidth: 2, borderColor: "#287A82", backgroundColor: "#FFF9EA", borderRadius: 16, padding: 12, gap: 7 }}>
        <Copy style={{ fontWeight: "700" }}>BUILD THE RULE</Copy>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", alignItems: "center" }}><Copy>IF</Copy>{t.slots.map((slot, i) => <React.Fragment key={slot}>{i === t.slots.length - 1 && <Copy>→</Copy>}<Button compact quiet selected={editing === slot} onPress={() => setEditing(editing === slot ? null : slot)} disabled={!active || s.running >= 0} label={`Choose ${slot}, currently ${s.rule[slot] || "empty"}`}>{s.rule[slot] || (slot === "first" || slot === "second" ? "clue +" : slot === "join" ? (s.level >= 4 ? "THEN +" : "AND/OR +") : "bucket +")}</Button></React.Fragment>)}<Copy>ELSE → {s.rule.action === "right" ? "left" : "right"}</Copy></View>
      </View>
      {editing && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>{choices[editing].filter((v) => editing === "first" ? (s.level === 1 ? ["blue","coral"].includes(v) : s.level === 2 || s.level === 5 ? ["big","small"].includes(v) : s.level === 4 ? v === "bell" : ["blue","coral"].includes(v)) : editing === "second" ? s.level === 3 ? ["big","small"].includes(v) : ["blue","coral"].includes(v) : editing === "join" ? (s.level >= 4 ? v === "then" : v !== "then") : s.level === 4 ? v !== "right" : v !== "count left").map((v) => <Button key={v} compact onPress={() => change(editing, v)}>{v}</Button>)}</View>}
      {s.level === 5 && s.running < 0 && ready(s) && <View style={{ gap: 6, backgroundColor: "#E8F3EA", borderRadius: 14, padding: 10 }}><Copy style={{ fontWeight: "700" }}>TRACE IT · Catch {traceIndex + 1}: which bucket will it reach?</Copy><View style={{ flexDirection: "row", gap: 8 }}>{(["left", "right"] as const).map((bucket) => <Button key={bucket} compact quiet selected={guess === bucket} onPress={() => { setGuess(bucket); if (bucket !== traceAnswer) { practice("think.code-logic", false); setMessage("Follow the first check, then the inner check. Try again."); } else { setMessage("You traced it! Now run the belt."); cheer("right"); } }}>{bucket === "left" ? "← Left" : "Right →"}</Button>)}</View></View>}
      {!!message && <Copy>{message}</Copy>}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {s.running < 0 ? <Button onPress={run} disabled={!active || !ready(s) || (s.level === 5 && guess !== traceAnswer)}>▶ Run the belt</Button> : <Button onPress={step} disabled={!active}>{s.running < t.items.length ? "Next catch →" : "Next belt →"}</Button>}
        <Button quiet onPress={() => { assistance?.(); update({ ...s, rule: t.target, helped: true }); setEditing(null); setShowHelp(true); }} disabled={!active || s.running >= 0}>Show rule</Button>
      </View>
      {showHelp && <Copy>Help filled the rule. Press Run to see why each catch goes there.</Copy>}
    </>}
  </View>;
}
export function Art({ size }: { size: number }) { return <Svg width={size} height={size} viewBox="0 0 100 100"><Rect x="6" y="55" width="88" height="11" rx="5" fill="#B49C77"/><Path d="M50 56V28M50 40L23 78M50 40L77 78" stroke="#287A82" strokeWidth="7" fill="none"/><Circle cx="34" cy="42" r="12" fill="#4E9BB9"/><Circle cx="65" cy="43" r="9" fill="#E9826B"/></Svg>; }
