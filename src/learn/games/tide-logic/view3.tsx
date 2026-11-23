/** School version 3 (C4): certified belts, a rule builder per level, the real bell, Help's ladder, Undo and Clear. */
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { BoardColumns, useBoardColumns, useBoardGeometry, useBoardSpace } from "../../BoardSpace";
import { SCHOOL_BOARD_MIN } from "../../boardGeometry";
import { Button, Copy, Heading } from "../../../components/ui";
import { LARGE_TEXT, wordFitMultiplier } from "../../../components/wordFit";
import type { BoardProps } from "../../types";
import { BucketPicture, Cargo, bucketLabel, itemOf } from "./art";
import { bell, complete, goalSentence, lookText, routes, catchWords, type Side } from "./rules";
import { advance, choose, clear, counted, currentRow, frameOf, help, run, undo, type TideV3 } from "./school";

const SIDE = ["left", "right"] as const;
const clueLabel = (v: string, level: number) => level === 1 ? `${v === "blue" ? "🔵" : "🟠"} ${v}` : v === "bell" ? "🔔 bell" : v;
const whenLabel = (v: string) => v === "on" ? "on this catch" : "on the catch before";
export function BoardV3({ session, update, practice, assistance, cheer, coach, sound, active, width }: BoardProps<TideV3>) {
  const bucketMax = useWindowDimensions().fontScale >= LARGE_TEXT ? wordFitMultiplier("RIGHT BUCKET→", 16, (width - 32) / 2, 2) : undefined;
  const space = useBoardSpace(), compact = !!space?.ready && space.width < 600;
  const sideBySide = useBoardColumns(), cargoWidth = sideBySide ? width * .46 : width;
  const s = session.state, row = currentRow(s), f = frameOf(s.level), done = !row;
  // Version 3 belts run to eight catches: on a phone in portrait they stay on one sideways row at every text size, so the rule and Run stay in view.
  const singleRow = compact && !sideBySide;
  const cargoRows = singleRow ? 1 : Math.max(1, Math.ceil((row?.belt.length ?? 0) / Math.max(1, Math.floor((cargoWidth - 24 + 5) / (Math.ceil((width >= 600 ? 64 : 56) * 64 / 49) + 11)))));
  const [cargoChrome, setCargoChrome] = useState(0);
  const cargoFloor = !space ? 64 : Math.ceil((width >= 600 ? 64 : SCHOOL_BOARD_MIN['tide-logic']) * 64 / 49);
  const geometry = useBoardGeometry('tide-logic', cargoFloor * cargoRows + cargoChrome, cargoFloor * cargoRows + cargoChrome);
  const cargoSize = (geometry.height - cargoChrome) / cargoRows;
  const [editing, setEditing] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [guess, setGuess] = useState<Side | null>(null);
  const [failure, setFailure] = useState<number | null>(null);
  const CargoViewport = singleRow ? ScrollView : React.Fragment;
  const cargoScroll = useRef<ScrollView | null>(null), cargoPositions = useRef<number[]>([]);
  const current = row && s.running >= 0 ? Math.min(s.running, row.belt.length - 1) : 0;
  useEffect(() => {
    if (singleRow) cargoScroll.current?.scrollTo({ x: s.running >= 0 ? cargoPositions.current[current] ?? 0 : 0, animated: false });
  }, [singleRow, current, s.running]);
  const sideSlot = f.id === "flip" ? 1 : f.slots.length - 1, chosenSide = s.rule[sideSlot];
  // Where the child's rule sends each catch; only a complete rule sorts anything.
  const placed = row && complete(f, s.rule) ? routes(f, s.rule, row.belt) : null;
  // Level 5 traces the child's own rule on one catch before it runs: the catch where the target and its most tempting wrong rule part ways.
  const traceAt = row?.trace ?? -1, traced = row && traceAt >= 0 && complete(f, s.rule) ? routes(f, s.rule, row.belt)[traceAt] : null;
  // A changed rule must be traced again before it runs.
  const accepted = (next: TideV3 | null, say = "") => { if (!next) return false; update(next); setMessage(say); setFailure(null); setGuess(null); sound("tap", true); return true; };
  const change = (slot: number, option: number) => { if (accepted(choose(s, slot, option))) { setEditing(null); coach.done(); } };
  const tryRun = () => {
    if (!row || (traceAt >= 0 && guess !== traced)) return;
    const result = run(s);
    if (!result) return;
    update(result.state);
    if (result.miss !== null) {
      const got = routes(f, s.rule, row.belt)[result.miss];
      setFailure(result.miss);
      practice(s.level === 4 ? "think.code-events" : s.level >= 3 ? "think.code-logic" : "think.code-condition", false);
      sound("wrong", true);
      setMessage(`Catch ${result.miss + 1}, the ${catchWords(row.belt[result.miss])}, would go ${SIDE[got].toUpperCase()}, but it belongs ${SIDE[1 - got].toUpperCase()}. Change a block and run again.`);
      return;
    }
    setFailure(null); setMessage("Watch each catch reach its bucket."); cheer("right");
  };
  const step = () => {
    if (!row) return;
    const next = advance(s); update(next);
    if (s.running >= row.belt.length) { setMessage(""); setGuess(null); setFailure(null); if (next.index >= 4) cheer("big"); return; }
    sound("tap", true);
    if (next.running === row.belt.length) { practice(s.level === 4 ? "think.code-events" : s.level >= 3 ? "think.code-logic" : "think.code-condition", true); cheer("right"); }
  };
  const askHelp = () => {
    if (!row) return;
    const next = help(s);
    if (!next) { setMessage("Your rule already sorts every catch. Press Run."); return; }
    assistance?.(); update(next); setEditing(null); setFailure(null); setMessage(""); if (next.rule !== s.rule) setGuess(null);
  };
  // Help's words come from the saved rung, so a resumed round shows the same help it left with.
  const look = row && s.hint === 1 ? lookText(f, s.rule, row.target, row.belt) : null;
  const helpLine = !row || s.hint === 0 ? "" : look ? look.text : s.hint === 2 ? "Help set one block right. Look at the rule, then press Run." : "Help filled the rule. Press Run to see why each catch goes there.";
  const lit = look?.focus ?? [];
  const ruleView = (slot: number) => {
    const option = s.rule[slot], slotDef = f.slots[slot], value = option >= 0 ? slotDef.options[option] : "";
    const text = slotDef.kind === "side" ? bucketLabel(value) : slotDef.kind === "when" ? (value ? whenLabel(value) : "on which catch? +") : slotDef.kind === "join" ? (value ? value.toUpperCase() : "AND/OR +") : value ? clueLabel(value, s.level) : "clue +";
    return <Button key={slot} maxFontSizeMultiplier={1.5} compact quiet selected={editing === slot} onPress={() => setEditing(editing === slot ? null : slot)} disabled={!active || s.running >= 0} label={`Choose ${slotDef.name}, currently ${value || "empty"}`}>{text}</Button>;
  };
  const bellNote = (i: number) => {
    if (!row || f.id !== "bell") return "";
    const rings = bell(row.belt[i]), before = i > 0 && bell(row.belt[i - 1]);
    return `${rings ? " · ♪ this catch rings" : ""}${before ? " · the catch before rang" : ""}`;
  };
  return <View style={{ gap: compact ? 4 : 12, paddingBottom: 20 }}>
    <Heading>{done ? "Dock sorter complete!" : `Belt ${s.index + 1} of 4`}</Heading>
    {row && <>
      <Copy testID="tide-goal" maxFontSizeMultiplier={2}>{goalSentence(f, row.target)}</Copy>
      {/* The column centres its child; stretching keeps the belt inside the column so it wraps instead of spilling under the rule. */}
      <BoardColumns drawing={<View testID="tide-belt-panel" style={{ alignSelf: "stretch", backgroundColor: "#E2F3F2", borderRadius: 18, padding: compact ? 8 : 12, gap: compact ? 6 : 8 }}>
        <CargoViewport {...(singleRow ? { ref: cargoScroll, horizontal: true, nestedScrollEnabled: true, testID: "tide-cargo-scroll", accessibilityLabel: "Cargo belt. Scroll sideways to see every catch." } : {})}>
        <View testID={geometry.testID} onLayout={event => { geometry.onLayout?.(event); const fixed = Math.max(0, event.nativeEvent.layout.height - cargoRows * cargoSize); setCargoChrome(old => Math.abs(old - fixed) < 1 ? old : fixed); }} style={{ flexDirection: "row", flexWrap: singleRow ? "nowrap" : "wrap", justifyContent: "center", gap: 5 }}>
          {row.belt.map((c, i) => { const item = itemOf(c), wrong = i === failure, marked = wrong || lit.includes(i) || s.running === i; return <View key={i} accessibilityLabel={`Catch ${i + 1}: ${catchWords(c)}${s.running > i && placed ? `, sorted ${SIDE[placed[i]]}` : ""}`} onLayout={singleRow ? event => { cargoPositions.current[i] = event.nativeEvent.layout.x; if (s.running === i) cargoScroll.current?.scrollTo({ x: event.nativeEvent.layout.x, animated: false }); } : undefined} style={{ opacity: s.running >= 0 && i > current ? .35 : 1, alignItems: "center", minWidth: 62, borderWidth: marked ? 3 : 0, borderColor: wrong ? "#B74431" : lit.includes(i) ? "#8A6A00" : "#287A82", borderRadius: 12, backgroundColor: wrong ? "#FFE0D8" : lit.includes(i) ? "#FFF5CC" : s.running === i ? "#FFF2BA" : "transparent", padding: 3 }}><Cargo item={item} size={item.size === "big" ? cargoSize : cargoSize * 49 / 64}/><Copy maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: "700" }}>{`${i + 1} · ${item.size}`}</Copy></View>; })}
        </View>
        </CargoViewport>
        <View style={{ height: 9, borderRadius: 5, backgroundColor: "#B49C77" }}/>
        <View testID="tide-buckets" style={{ flexDirection: "row", justifyContent: "space-around", gap: 8 }}><Copy maxFontSizeMultiplier={bucketMax} style={{ flexShrink: 1 }}>{"← LEFT BUCKET"}</Copy><Copy maxFontSizeMultiplier={bucketMax} style={{ flexShrink: 1, textAlign: "right" }}>{"RIGHT BUCKET →"}</Copy></View>
        {s.level === 4 && <View accessibilityLiveRegion="polite" style={{ padding: 10, borderRadius: 12, backgroundColor: "#FFF2BA" }}><Copy style={{ fontSize: 22, fontWeight: "800" }}>Counter: {counted(s)}</Copy><Copy>{s.running < 0 ? `Starts at 0. It counts the catches sent ${chosenSide >= 0 ? SIDE[chosenSide] : "to the rule's bucket"}.` : s.running < row.belt.length ? `Next: catch ${s.running + 1}${bellNote(s.running)}` : "Final count · every catch counted once"}</Copy></View>}
        {s.running >= 0 && placed && <Copy accessibilityLiveRegion="polite" style={{ textAlign: "center", fontWeight: "700" }}>{s.running < row.belt.length ? `Catch ${s.running + 1}: ${SIDE[placed[s.running]].toUpperCase()} ✓${bellNote(s.running)}` : `All sorted! ${placed.filter(x => x === 0).length} left · ${placed.filter(x => x === 1).length} right`}</Copy>}
        {failure !== null && <Copy style={{ textAlign: "center", color: "#8D3528", fontWeight: "800" }}>Look at the outlined catch: the sorter found a bug.</Copy>}
      </View>
      }><View style={{ borderWidth: 2, borderColor: "#287A82", backgroundColor: "#FFF9EA", borderRadius: 16, padding: compact ? 8 : 12, gap: compact ? 5 : 7 }}>
        <Copy maxFontSizeMultiplier={1.5} style={{ fontWeight: "700" }}>BUILD THE RULE</Copy>
        <View testID="tide-rule" style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <Copy maxFontSizeMultiplier={1.5}>IF</Copy>
          {f.id === "bell" && <Copy maxFontSizeMultiplier={1.5}>{"🔔 rings"}</Copy>}
          {f.slots.map((slot, i) => slot.kind === "side" ? null : <React.Fragment key={i}>{f.id === "bell" && i === 1 && <Copy maxFontSizeMultiplier={1.5}>AND</Copy>}{ruleView(i)}</React.Fragment>)}
          <Copy maxFontSizeMultiplier={1.5}>→</Copy>{s.level === 1 && <BucketPicture side={chosenSide === 1 ? "right" : "left"}/>}{ruleView(sideSlot)}
          <Copy maxFontSizeMultiplier={1.5}>{"ELSE → "}{bucketLabel(chosenSide < 0 ? "" : SIDE[1 - chosenSide])}</Copy>
        </View>
      </View>
      {editing !== null && <View testID="tide-options" style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>{f.slots[editing].options.map((v, o) => <Button maxFontSizeMultiplier={1.5} key={v} compact selected={s.rule[editing] === o} onPress={() => change(editing, o)}>{f.slots[editing].kind === "side" ? bucketLabel(v) : f.slots[editing].kind === "when" ? whenLabel(v) : f.slots[editing].kind === "join" ? v.toUpperCase() : clueLabel(v, s.level)}</Button>)}</View>}
      {traceAt >= 0 && s.running < 0 && complete(f, s.rule) && <View style={{ gap: 6, backgroundColor: "#E8F3EA", borderRadius: 14, padding: 10 }}><Copy maxFontSizeMultiplier={1.5} style={{ fontWeight: "700" }}>TRACE IT · Catch {traceAt + 1}, the {catchWords(row.belt[traceAt])}: which bucket will your rule send it to?</Copy><View style={{ flexDirection: "row", gap: 8 }}>{([0, 1] as Side[]).map(bucket => <Button maxFontSizeMultiplier={1.5} key={bucket} compact quiet selected={guess === bucket} onPress={() => { setGuess(bucket); sound("tap", true); if (bucket !== traced) { practice("think.code-logic", false); setMessage("Follow your rule one clue at a time. Try again."); } else setMessage("You traced it! Now run the belt to see if it sorts every catch."); }}>{bucket === 0 ? "← Left" : "Right →"}</Button>)}</View></View>}
      {!!message && <Copy maxFontSizeMultiplier={1.5} accessibilityLiveRegion="polite" testID="tide-message">{message}</Copy>}
      {!!helpLine && s.running < 0 && <View testID="tide-hint" accessibilityLiveRegion="polite" style={{ padding: 10, borderRadius: 12, backgroundColor: "#FFF5CC" }}><Copy maxFontSizeMultiplier={1.5}>{helpLine}</Copy></View>}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {s.running < 0 ? <Button maxFontSizeMultiplier={1.5} onPress={tryRun} disabled={!active || !complete(f, s.rule) || (traceAt >= 0 && guess !== traced)}>▶ Run the belt</Button> : <Button maxFontSizeMultiplier={1.5} onPress={step} disabled={!active}>{s.running < row.belt.length ? "Next catch →" : "Next belt →"}</Button>}
        {s.running < 0 && <Button maxFontSizeMultiplier={1.5} quiet compact onPress={() => { if (accepted(undo(s))) setEditing(null); }} disabled={!active || !s.undo.length}>↶ Undo</Button>}
        {s.running < 0 && <Button maxFontSizeMultiplier={1.5} quiet compact onPress={() => { if (accepted(clear(s))) setEditing(null); }} disabled={!active || s.rule.every(x => x < 0)}>Clear</Button>}
      </View>
      </BoardColumns>
      <Button maxFontSizeMultiplier={1.5} quiet onPress={askHelp} disabled={!active || s.running >= 0 || s.hint >= 3}>{s.hint === 0 ? "Help: look" : s.hint === 1 ? "Help: one step" : s.hint === 2 ? "Help: show rule" : "Help used"}</Button>
    </>}
  </View>;
}
