import React, { useContext, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { AudioPreferences, useSoundControls } from "../../../components/Audio";
import { feel } from "../../../components/feel";
import { Text } from "../../../components/Text";
import { Button, C, Copy, PressableScale } from "../../../components/ui";
import type { ChallengeViewProps } from "../../../challenge/types";
import { choicesAround, choicesFor, equationText, judge, placeValue, type Act, type Level, type RouteId } from "../../../math/kit";
import { Blocks } from "../../../math/kit/ui/Blocks";
import { Bridge } from "../../../math/kit/ui/Bridge";
import { deepHint, deepPrompt, deepSpoken, deepTitle } from "./challenge-copy";
import type { Action, State } from "./challenge-engine";
import { waysOf } from "./challenge-task";
import { hintLine, routeBlurb, routeName, stepPrompt, tileCap } from "./copy";
import { pictureFor } from "./picture";
import { HelpRow } from "./HelpRow";
import { problemOf } from "./round2";
import { StepInput } from "./StepInput";
import { Workspace } from "./Workspace";

/** The Challenge board for Shell Math: the same steps as School, plus a choice of ways and the four Deep Water shapes. */
export function ChallengeBoard({ state: s, dispatch, active, width }: ChallengeViewProps<State, Action>) {
  const prefs = useContext(AudioPreferences), { play, stop } = useSoundControls(prefs.sound ?? true);
  const [first, setFirst] = useState<number | null>(null);
  const [hidden, setHidden] = useState(false);
  useEffect(() => { if (!active) stop(); return stop; }, [active, stop]);
  const ways = useMemo(() => waysOf(s.d), [s.d]);
  const press = () => { if (prefs.sound !== false) play("tap", true); };
  const send = (a: Action) => { if (!active) return; dispatch(a); };
  const d = s.d;

  if (s.way === null) {
    const p = d.t === "fact" ? problemOf(d.item) : null;
    return <View style={{ gap: 12, alignSelf: "center", width: "100%", maxWidth: 700 }}>
      <Text accessibilityRole="header" style={{ color: C.ink, fontSize: 18, fontWeight: "700", textAlign: "center" }}>Choose a way to work it out</Text>
      {p && <Text accessibilityLabel={equationText(p)} style={{ fontSize: width < 350 ? 34 : 42, fontWeight: "900", color: C.ink, textAlign: "center" }}>{equationText(p)}</Text>}
      {d.t === "fact" && d.level === 5 && <Copy style={{ color: C.ink, textAlign: "center" }}>Some ways take fewer moves than others.</Copy>}
      {d.t === "fact" && d.level === 3 && <Copy style={{ color: C.ink, textAlign: "center" }}>Any way works. Try a different one each time.</Copy>}
      {d.t === "fact" && p && d.ways.map((r: RouteId, i) => <PressableScale key={r} accessibilityRole="button" accessibilityLabel={`${routeName(r)}. ${routeBlurb(p, r)}`} disabled={!active}
        onPress={() => { press(); send(["r", i]); }} amount={0.97}
        style={{ minHeight: 64, borderRadius: 18, borderWidth: 2, borderColor: C.line, backgroundColor: C.paper, justifyContent: "center", paddingHorizontal: 16, paddingVertical: 10 }}>
        <Text style={{ color: C.ink, fontSize: 18, fontWeight: "800" }}>{routeName(r)}</Text>
        <Copy style={{ color: C.ink, fontSize: 15 }}>{routeBlurb(p, r)}</Copy>
      </PressableScale>)}
    </View>;
  }

  const way = ways[s.way], plan = way.plan, w = s.work, step = plan[Math.min(w.at, plan.length - 1)];
  const act = (a: Act) => {
    if (!active) return;
    const v = judge(plan, w, a);
    if (v === "wrong") feel("warning");
    dispatch(a);
  };
  const solved = w.solved;
  const level: Level = d.t === "fact" ? d.level : 5;
  const typed = d.t === "fact" ? level >= 3 : true;
  const key = `${w.at}:${w.wrong}`;
  const common = (p: ReturnType<typeof problemOf> | null) => ({
    step, work: w, typed, width, active, coachActive: false, resetKey: key, addVerb: (p && p.op === "subtract" ? "back" : "on") as "on" | "back", press, onAct: act,
    soundOn: prefs.sound !== false, sound: (k: string) => play(k, true),
  });

  if (d.t === "fact") {
    const p = problemOf(d.item), route = d.ways[s.way];
    const pic = pictureFor(level, p, route, plan, w);
    const heading = solved ? `${equationText(p, true)}. Well done.` : stepPrompt(level, p, plan, w.at, route);
    const hint = hintLine(level, p, plan, w);
    const tiles = step.kind === "number" ? (step.role === "final" ? choicesFor(step.value, p, tileCap(level)) : choicesAround(step.value, w.at)) : [];
    return <View style={{ gap: 10, alignSelf: "center", width: "100%", maxWidth: 700 }}>
      <Text accessibilityRole="header" style={{ color: C.ink, fontSize: 18, fontWeight: "700", textAlign: "center" }}>{heading}</Text>
      <Text accessibilityLabel={equationText(p, solved)} style={{ fontSize: width < 350 ? 34 : 42, fontWeight: "900", color: C.ink, textAlign: "center" }}>{equationText(p, solved)}</Text>
      <Workspace pic={pic} width={width} hidePicture={hidden && level >= 2}
        onPick={step.kind === "fill" && p.op === "add" && active ? (side, k) => { press(); act(["m", side, k]); } : undefined}
        onPickOnes={step.kind === "fill" && p.op === "subtract" && active ? (k) => { press(); act(["m", 0, k]); } : undefined}
        onTradeMake={step.kind === "trade" && step.dir === "make" && active ? () => { press(); act(["t"]); } : undefined}
        onTradeOpen={step.kind === "trade" && step.dir === "open" && active ? () => { press(); act(["t"]); } : undefined} />
      <StepInput {...common(p)} tiles={tiles} prompt={step.kind === "number" && step.role === "final" ? "Your answer" : "This step"} />
      <View accessibilityLiveRegion="polite" style={{ minHeight: 24 }}>{!solved && hint ? <Copy style={{ color: C.ink, textAlign: "center", fontWeight: "700" }}>{hint}</Copy> : null}</View>
      {!solved && <HelpRow step={step} work={w} typed={typed} active={active} canHide={level >= 2} hidden={hidden} press={press}
        onHelp={() => act(["h"])} onChoices={() => act(["k"])} onToggle={() => setHidden((h) => !h)} />}
      {d.ways.length > 1 && !solved && w.moves === 0 && <Button quiet compact disabled={!active} onPress={() => { press(); send(["z"]); }}>Choose another way</Button>}
    </View>;
  }

  // Deep Water: four shapes of puzzle, one engine.
  const hint = deepHint(d, plan, w.at, w.hint);
  const heading = solved ? "You found it. Well done." : deepPrompt(d, plan, w.at);
  const finalValue = plan[plan.length - 1].kind === "number" ? (plan[plan.length - 1] as { value: number }).value : 0;
  const tiles = step.kind === "number" ? (step.role === "final" ? choicesAround(step.value, 7) : choicesAround(step.value, w.at)) : [];
  const pairs = d.t === "pairs" ? d.nums : [];
  const tapChip = (i: number) => {
    if (!active || solved || step.kind !== "pair" || (w.used >> i) & 1) return;
    press();
    if (first === null) { setFirst(i); return; }
    if (first === i) { setFirst(null); return; }
    const a: Act = ["p", first, i];
    setFirst(null);
    act(a);
  };
  const trades = plan.filter((x) => x.kind === "trade").length, done = Math.min(trades, w.at);
  return <View style={{ gap: 10, alignSelf: "center", width: "100%", maxWidth: 700 }}>
    <Text accessibilityRole="header" style={{ color: C.ink, fontSize: 18, fontWeight: "700", textAlign: "center" }}>{heading}</Text>
    <Text accessibilityLabel={deepSpoken(d)} style={{ fontSize: width < 350 ? 26 : 32, fontWeight: "900", color: C.ink, textAlign: "center" }}>{solved && d.t === "missing" ? (d.first ? `${finalValue} + ${d.known} = ${d.total}` : `${d.known} + ${finalValue} = ${d.total}`) : deepTitle(d)}</Text>
    {!hidden && d.t === "regroup" && <Blocks unit={Math.max(10, Math.min(16, Math.floor((width - 60) / (d.tens + 8))))} tens={d.tens + done} ones={d.ones - 10 * done} label={`${d.tens + done} tens and ${d.ones - 10 * done} ones`}
      onTradeMake={step.kind === "trade" && active ? () => { press(); act(["t"]); } : undefined} />}
    {!hidden && d.t === "missing" && <Bridge width={Math.min(width, 380)} start={d.known} hops={[d.known + (10 - (d.known % 10)), d.total]} ten={d.known + (10 - (d.known % 10))} lo={Math.floor(d.known / 10) * 10} hi={d.total}
      made={Math.min(w.at, 2)} label={`Number line. Start ${d.known}, hop to ${d.known + (10 - (d.known % 10))}, then to ${d.total}.`} />}
    {!hidden && d.t === "equalize" && <View style={{ flexDirection: "row", gap: 16, justifyContent: "center", alignItems: "flex-end" }}>
      {[d.x, d.y].map((n, i) => {
        const level2 = solved ? (d.x + d.y) / 2 : n, pv = placeValue(level2);
        return <View key={i} style={{ alignItems: "center", gap: 4 }}>
          <Blocks unit={Math.max(8, Math.min(12, Math.floor((width - 90) / 14)))} tens={pv.tens} ones={pv.ones} label={`${level2} shells`} />
          <Text style={{ fontSize: 20, fontWeight: "900", color: C.ink }}>{level2}</Text>
        </View>;
      })}
    </View>}
    {d.t === "pairs" && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
      {pairs.map((n, i) => {
        const used = ((w.used >> i) & 1) === 1, picked = first === i;
        return <PressableScale key={i} accessibilityRole="button" accessibilityLabel={`${n}${used ? ", used" : picked ? ", picked" : ""}`} accessibilityState={{ disabled: used || solved, selected: picked }}
          disabled={!active || used || solved || step.kind !== "pair"} onPress={() => tapChip(i)} amount={0.94}
          style={{ width: 64, height: 64, borderRadius: 18, borderWidth: 3, borderColor: picked ? C.teal : used ? C.line : C.ink, backgroundColor: used ? C.soft : picked ? "#EAF4EC" : C.paper, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 30, fontWeight: "900", color: used ? C.muted : C.ink }}>{n}</Text>
        </PressableScale>;
      })}
    </View>}
    {hidden && <Copy style={{ color: C.ink, textAlign: "center" }}>Picture hidden. Think it through, then use the number pad.</Copy>}
    <StepInput {...common(null)} tiles={tiles} prompt={step.kind === "number" && step.role === "final" ? "Your answer" : "This step"} />
    <View accessibilityLiveRegion="polite" style={{ minHeight: 24 }}>{!solved && hint ? <Copy style={{ color: C.ink, textAlign: "center", fontWeight: "700" }}>{hint}</Copy> : null}</View>
    {!solved && <HelpRow step={step} work={w} typed={typed} active={active} canHide={d.t !== "pairs"} hidden={hidden} press={press}
      onHelp={() => act(["h"])} onChoices={() => act(["k"])} onToggle={() => setHidden((h) => !h)} />}
  </View>;
}
