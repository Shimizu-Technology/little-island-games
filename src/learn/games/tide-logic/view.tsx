import { BoardColumns, useBoardColumns, useBoardGeometry, useBoardSpace } from '../../BoardSpace';
import { SCHOOL_BOARD_MIN } from '../../boardGeometry';
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { Button, C, Copy, Heading } from "../../../components/ui";
import { GameIcon } from "../../../components/GameIcon";
import type { BoardProps } from "../../types";
import { LARGE_TEXT, wordFitMultiplier } from "../../../components/wordFit";
import { advance, counterAt, choices, complete, correct, ready, route, taskAt, type LegacyTide, type TideState } from "./engine";
import { BucketPicture, Cargo, bucketLabel } from "./art";
import { BoardV3 } from "./view3";

function LegacyBoard({ session, update, practice, assistance, cheer, coach, active, width }: BoardProps<LegacyTide>) {
  // Each bucket label has half the belt (12-pt padding, 8-pt gap); at large text its words stop where they fit it.
  const bucketMax = useWindowDimensions().fontScale >= LARGE_TEXT ? wordFitMultiplier("RIGHT BUCKET→", 16, (width - 32) / 2, 2) : undefined;
  const space = useBoardSpace(), compact = !!space?.ready && space.width < 600;
  const side = useBoardColumns(), cargoWidth = side ? width * .46 : width;
  const s = session.state, done = complete(s), t = done ? null : taskAt(s.level, s.seed, s.index, s.version);
  const singleRow = compact && !side && !space?.large;
  const cargoRows = singleRow ? 1 : Math.max(1, Math.ceil((t?.items.length ?? 0) / Math.max(1, Math.floor((cargoWidth - 24 + 5) / (Math.ceil((width >= 600 ? 64 : 56) * 64 / 49) + 11)))));
  const [cargoChrome, setCargoChrome] = useState(0);
  const cargoFloor = !space ? 64 : Math.ceil((width >= 600 ? 64 : SCHOOL_BOARD_MIN['tide-logic']) * 64 / 49);
  const geometry = useBoardGeometry('tide-logic', cargoFloor * cargoRows + cargoChrome, cargoFloor * cargoRows + cargoChrome);
  const cargoSize = (geometry.height - cargoChrome) / cargoRows;
  const [editing, setEditing] = useState<keyof LegacyTide["rule"] | null>(null);
  const [message, setMessage] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [guess, setGuess] = useState<"left" | "right" | null>(null);
  const [failure, setFailure] = useState<number | null>(null);
  const CargoViewport = singleRow ? ScrollView : React.Fragment;
  const cargoScroll = useRef<ScrollView | null>(null), cargoPositions = useRef<number[]>([]);
  const current = t && s.running >= 0 ? Math.min(s.running, t.items.length - 1) : 0;
  useEffect(() => {
    if (singleRow) cargoScroll.current?.scrollTo({x:s.running >= 0 ? cargoPositions.current[current] ?? 0 : 0,animated:false});
  }, [singleRow,current,s.running]);
  const traceIndex = s.index % 2 ? 1 : 0;
  const traceAnswer = t ? route(t.items[traceIndex], t.target) : null;
  const change = (slot: keyof LegacyTide["rule"], value: string) => { update({ ...s, rule: { ...s.rule, [slot]: value } }); setEditing(null); setMessage(""); setFailure(null); coach.done(); };
  const run = () => {
    if (!t || !ready(s) || (s.level === 5 && guess !== traceAnswer)) return;
    if (!correct(s)) {
      const wrong = t.items.findIndex((item) => route(item, s.rule) !== route(item, t.target));
      setFailure(wrong >= 0 ? wrong : 0);
      practice(s.level >= 3 ? "think.code-logic" : "think.code-condition", false);
      setMessage(wrong >= 0 ? `Catch ${wrong + 1} would go ${route(t.items[wrong], s.rule).toUpperCase()}, but it belongs ${route(t.items[wrong], t.target).toUpperCase()}. Change a block and try again.` : "The counter action is missing. Change the last block and try again.");
      return;
    }
    setFailure(null);
    update({ ...s, running: 0 }); setMessage("Watch each catch reach its bucket."); cheer("right");
  };
  const step = () => {
    if (!t) return;
    if (s.running >= t.items.length) { const next = advance(s); update(next); setMessage(""); setGuess(null); setFailure(null); if (complete(next)) cheer("big"); return; }
    const next = advance(s); update(next);
    if (next.running === t.items.length) { practice(s.level === 4 ? "think.code-events" : s.level >= 3 ? "think.code-logic" : "think.code-condition", true); cheer("right"); }
  };
  return <View style={{ gap: compact ? 4 : 12, paddingBottom: 20 }}>
    <Heading>{done ? "Dock sorter complete!" : `Belt ${s.index + 1} of 4`}</Heading>
    {t && <>
      <Copy>{t.prompt}</Copy>
      <BoardColumns drawing={<View style={{ backgroundColor: "#E2F3F2", borderRadius: 18, padding: compact ? 8 : 12, gap: compact ? 6 : 8 }}>
        <CargoViewport {...(singleRow ? { ref: cargoScroll, horizontal: true, nestedScrollEnabled: true, testID: "tide-cargo-scroll", accessibilityLabel: "Cargo belt. Scroll sideways to see every catch." } : {})}>
        <View testID={geometry.testID} onLayout={event => { geometry.onLayout?.(event); const fixed = Math.max(0, event.nativeEvent.layout.height - cargoRows * cargoSize); setCargoChrome(old => Math.abs(old - fixed) < 1 ? old : fixed); }} style={{ flexDirection: "row", flexWrap: singleRow ? "nowrap" : "wrap", justifyContent: "center", gap: 5 }}>
          {t.items.map((item, i) => <View key={i} onLayout={singleRow ? event => { cargoPositions.current[i] = event.nativeEvent.layout.x; if (s.running === i) cargoScroll.current?.scrollTo({x:event.nativeEvent.layout.x,animated:false}); } : undefined} style={{ opacity: s.running >= 0 && i > current ? .35 : 1, alignItems: "center", minWidth: 62, borderWidth: i === failure || s.running === i ? 3 : 0, borderColor: i === failure ? "#B74431" : "#287A82", borderRadius: 12, backgroundColor: i === failure ? "#FFE0D8" : s.running === i ? "#FFF2BA" : "transparent", padding: 3 }}><Cargo item={item} size={item.size === "big" ? cargoSize : cargoSize * 49 / 64}/><Copy style={{ fontSize: 13, fontWeight: "700" }}>{item.size}</Copy></View>)}
        </View>
        </CargoViewport>
        <View style={{ height: 9, borderRadius: 5, backgroundColor: "#B49C77" }}/>
        {/* The bucket labels shrink and wrap between words at large text, never running into each other or off the board. */}
        <View testID="tide-buckets" style={{ flexDirection: "row", justifyContent: "space-around", gap: 8 }}><Copy maxFontSizeMultiplier={bucketMax} style={{ flexShrink: 1 }}>{"←\u00a0LEFT BUCKET"}</Copy><Copy maxFontSizeMultiplier={bucketMax} style={{ flexShrink: 1, textAlign: "right" }}>{"RIGHT BUCKET\u00a0→"}</Copy></View>
        {s.level === 4 && <View accessibilityLiveRegion="polite" style={{padding:10,borderRadius:12,backgroundColor:"#FFF2BA"}}><Copy style={{fontSize:22,fontWeight:"800"}}>Counter: {counterAt(s)}</Copy><Copy>{s.running >= 0 && s.running < t.items.length ? route(t.items[s.running],s.rule)==="left" && s.rule.action==="count left" ? "Next catch: +1 when you tap Next catch" : "Next catch: counter stays the same" : s.running < 0 ? "Starts at 0. Count matching bell catches." : "Final count · every matching bell catch counted once"}</Copy></View>}
        {s.running >= 0 && <Copy style={{ textAlign: "center", fontWeight: "700" }}>{s.running < t.items.length ? `Catch ${s.running + 1}: ${route(t.items[s.running], s.rule).toUpperCase()} ${s.rule.action === "count left" && route(t.items[s.running], s.rule) === "left" ? " · counter +1" : ""}` : `All sorted! ${t.items.filter((item) => route(item, s.rule) === "left").length} left · ${t.items.filter((item) => route(item, s.rule) === "right").length} right`}</Copy>}
        {failure !== null && <Copy style={{ textAlign: "center", color: "#8D3528", fontWeight: "800" }}>Look at the outlined catch: the sorter found a bug.</Copy>}
      </View>
      }><View style={{ borderWidth: 2, borderColor: "#287A82", backgroundColor: "#FFF9EA", borderRadius: 16, padding: compact ? 8 : 12, gap: compact ? 5 : 7 }}>
        <Copy style={{ fontWeight: "700" }}>BUILD THE RULE</Copy>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", alignItems: "center" }}><Copy>IF</Copy>{t.slots.map((slot, i) => <React.Fragment key={slot}>{s.level === 1 && slot === "first" && !!s.rule.first && <View style={{ width: 23, height: 23, borderRadius: 12, backgroundColor: s.rule.first === "blue" ? "#4E9BB9" : "#E9826B", borderWidth: 2, borderColor: C.ink }}/>}{i === t.slots.length - 1 && <Copy>→</Copy>}{s.level === 1 && slot === "action" && <BucketPicture side={s.rule.action === "right" ? "right" : "left"}/>}<Button compact quiet selected={editing === slot} onPress={() => setEditing(editing === slot ? null : slot)} disabled={!active || s.running >= 0} label={`Choose ${slot}, currently ${s.rule[slot] || "empty"}`}>{slot === "action" ? bucketLabel(s.rule.action) : s.rule[slot] || (slot === "first" || slot === "second" ? "clue +" : s.level >= 4 ? "THEN +" : "AND/OR +")}</Button></React.Fragment>)}<Copy>{"ELSE\u00a0→ "}{bucketLabel(s.rule.action === "right" ? "left" : "right")}</Copy></View>
      </View>
      {editing && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>{choices[editing].filter((v) => editing === "first" ? (s.level === 1 ? ["blue","coral"].includes(v) : s.level === 2 || s.level === 5 ? ["big","small"].includes(v) : s.level === 4 ? v === "bell" : ["blue","coral"].includes(v)) : editing === "second" ? s.level === 3 ? ["big","small"].includes(v) : ["blue","coral"].includes(v) : editing === "join" ? (s.level >= 4 ? v === "then" : v !== "then") : s.level === 4 ? v !== "right" : v !== "count left").map((v) => <Button key={v} compact onPress={() => change(editing, v)}>{editing === "action" ? bucketLabel(v) : s.level === 1 && editing === "first" ? `${v === "blue" ? "🔵" : "🟠"} ${v}` : v}</Button>)}</View>}
      {s.level === 5 && s.running < 0 && ready(s) && <View style={{ gap: 6, backgroundColor: "#E8F3EA", borderRadius: 14, padding: 10 }}><Copy style={{ fontWeight: "700" }}>TRACE IT · Catch {traceIndex + 1}: which bucket will it reach?</Copy><View style={{ flexDirection: "row", gap: 8 }}>{(["left", "right"] as const).map((bucket) => <Button key={bucket} compact quiet selected={guess === bucket} onPress={() => { setGuess(bucket); if (bucket !== traceAnswer) { practice("think.code-logic", false); setMessage("Follow the first check, then the inner check. Try again."); } else { setMessage("You traced it! Now run the belt."); cheer("right"); } }}>{bucket === "left" ? "← Left" : "Right →"}</Button>)}</View></View>}
      {!!message && <Copy>{message}</Copy>}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {s.running < 0 ? <Button onPress={run} disabled={!active || !ready(s) || (s.level === 5 && guess !== traceAnswer)}>▶ Run the belt</Button> : <Button onPress={step} disabled={!active}>{s.running < t.items.length ? "Next catch →" : "Next belt →"}</Button>}

      </View>
      </BoardColumns>
<Button quiet onPress={() => { assistance?.(); update({ ...s, rule: t.target, helped: true }); setEditing(null); setFailure(null); setShowHelp(true); }} disabled={!active || s.running >= 0}>Show rule</Button>
      {showHelp && <Copy>Help filled the rule. Press Run to see why each catch goes there.</Copy>}
    </>}
  </View>;
}
/** Rounds saved before C4 (versions 1 and 2) keep the board they were made with. */
export function Board(props: BoardProps<TideState>) {
  const s = props.session.state;
  return s.version === 3 ? <BoardV3 {...props as BoardProps<typeof s>} /> : <LegacyBoard {...props as BoardProps<typeof s>} />;
}
export function Art({ size }: { size: number }) { return <GameIcon id="tide-logic" size={size}/>; }
