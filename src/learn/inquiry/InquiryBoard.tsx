import React, { useMemo, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { BoardColumns, useBoardColumns, useBoardGeometry, useBoardSpace } from "../BoardSpace";
import type { SchoolBoard } from "../boardGeometry";
import { Button, Copy, PressableScale } from "../../components/ui";
import { hasSpeech } from "../../components/Audio";
import { LARGE_TEXT, wordFitMultiplier } from "../../components/wordFit";
import { CoachSpot } from "../Coach";
import { useStepReveal } from "../stepReveal";
import type { BoardProps } from "../types";
import { clean, hintText, move, replay, testedBefore, undo, type InquiryState, type Investigation, type Move, type Observation } from "./engine";
import { inquirySpeechKey } from "./speech";

export type InquiryTheme = { ink: string; accent: string; card: string; line: string; chosen: string };
type Earlier = Pick<InquiryState, "draft" | "guess" | "history" | "index">;
export type SceneProps = { q: Investigation; settings: readonly number[]; seen: Observation | null; height: number; label: number };

/**
 * The K6 board: predict → test → explain around a game's model drawing. The game supplies its investigations, its
 * scene and the skill it records; the steps, checks, hints and stars all come from ./engine.
 */
export function InquiryBoard({
  qs, Scene, board, floor, skill, theme, ...props
}: BoardProps<InquiryState> & { qs: readonly Investigation[]; Scene: React.ComponentType<SceneProps>; board: SchoolBoard; floor: number; skill: string; theme: InquiryTheme }) {
  const { session, update, active, practice, assistance, sound, stopSound, soundOn, cheer, coach } = props;
  const s = session.state, p = useMemo(() => replay(qs, s.history), [qs, s.history]);
  const [earlier, setEarlier] = useState<Earlier[]>([]);
  const { fontScale } = useWindowDimensions();
  const large = fontScale >= LARGE_TEXT;
  const space = useBoardSpace(), side = useBoardColumns();
  const geometry = useBoardGeometry(board, side ? 190 : 210, floor);
  // At large text the frame brings the board back into view for each new step: a new investigation, and its result.
  useStepReveal(p ? `${p.index}:${p.phase === "setup" ? 0 : 1}` : "end");
  const width = space?.ready ? (side ? space.width * 0.54 - 12 : space.width) : props.width;
  if (!p || p.phase === "finished") return <Copy style={{ textAlign: "center", fontWeight: "800" }}>Your investigation journal is complete!</Copy>;
  const q = qs[p.index], record = p.records[p.index];
  const send = (m: Move, tone = true): InquiryState | null => {
    if (!active) return null;
    const next = move(qs, s, m);
    if (next === s) return null;
    stopSound();
    const after = replay(qs, next.history);
    // One rule for stars: once the engine says the work is not independent, the round is helped.
    if (after && clean(p, s.level) && !clean(after, s.level)) assistance?.();
    if (m.type === "set" || m.type === "predict") setEarlier((e) => [...e.slice(-11), { draft: s.draft, guess: s.guess, history: s.history, index: s.index }]);
    else setEarlier([]);
    update(next);
    coach.done();
    if (tone) sound("tap");
    return next;
  };
  const back = () => {
    const last = earlier[earlier.length - 1];
    if (!last || !active) return;
    const next = undo(s, last, qs);
    setEarlier(earlier.slice(0, -1));
    if (next !== s) { update(next); sound("tap"); }
  };
  const test = () => {
    const next = send({ type: "test" }, false);
    const seen = next && replay(qs, next.history);
    if (!seen) return;
    if (seen.matched) cheer("right"); else sound("tap");
  };
  const explain = (choice: number) => {
    const right = choice === q.explain.answer;
    if (!send({ type: "explain", choice }, false)) return;
    practice(skill, right);
    if (right) cheer(p.index === qs.length - 1 ? "big" : "right"); else sound("tap");
  };
  // Columns per row: short spot and number rows stay on one or two lines so Test stays in view at large text.
  const columns = (n: number) => {
    const wanted = n >= 6 ? 4 : large ? 2 : n === 5 ? 3 : n;
    return Math.max(1, Math.min(wanted, Math.floor(width / 78)));
  };
  const choices = (labels: readonly string[], selected: (i: number) => boolean, onPress: (i: number) => void, verb: string, off?: (i: number) => boolean) => {
    const across = columns(labels.length), basis = `${Math.floor(100 / across) - 3}%` as `${number}%`;
    const max = large ? Math.min(...labels.map((l) => wordFitMultiplier(l, 14, (width - 8 * (across - 1)) / across - 20, 2))) : undefined;
    return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {labels.map((label, i) => <PressableScale key={label} disabled={!active || off?.(i)} accessibilityRole="button" accessibilityLabel={`${verb}: ${label}`}
        accessibilityState={{ selected: selected(i), disabled: !active || !!off?.(i) }} onPress={() => onPress(i)}
        style={{ flexGrow: 1, flexBasis: basis, minHeight: 48, padding: 8, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center",
          borderColor: selected(i) ? theme.accent : theme.line, backgroundColor: off?.(i) ? "#EEEDE6" : selected(i) ? theme.chosen : theme.card }}>
        <Copy maxFontSizeMultiplier={max} style={{ fontSize: 14, fontWeight: "800", textAlign: "center", color: off?.(i) ? "#6F756F" : theme.ink }}>{label}</Copy>
      </PressableScale>)}
    </View>;
  };
  const steps = ["Predict", "Test", "Explain"], now = p.phase === "setup" ? 0 : p.phase === "result" ? 1 : 2;
  const speak = (text: string) => { const key = inquirySpeechKey(text); return soundOn && hasSpeech(key) ? <Button quiet compact icon="sound-on" disabled={!active} onPress={() => sound(key)}>Hear it</Button> : null; };
  const hints = hintText(q, p), repeat = p.phase === "setup" && testedBefore(qs, s);
  const result = p.seen && <View accessibilityLiveRegion="polite" style={{ padding: 12, gap: 8, borderRadius: 16, backgroundColor: p.matched ? "#E4EFD4" : "#FFF0CF" }}>
    <Copy style={{ fontSize: 17, fontWeight: "900", color: theme.ink }}>
      {q.kind === "reach" ? (p.matched ? "Your plan worked!" : "Not yet") : p.matched ? "Your prediction matched the model!" : `Surprise! The model showed: ${q.outcomes[p.seen.outcome]}`}
    </Copy>
    <Copy style={{ fontSize: 15 }}>{p.seen.reading}</Copy>
    {p.phase === "result" && <>
      <Copy style={{ fontSize: 15 }}>Change your plan, then test again.</Copy>
      <Button disabled={!active} onPress={() => send({ type: "revise" })}>Change my plan</Button>
    </>}
    {!p.matched && q.kind === "observe" && <Copy style={{ fontSize: 15 }}>A surprise is a discovery. Now find the reason.</Copy>}
    {p.phase === "explain" && <>
      <Copy style={{ fontSize: 16, fontWeight: "800" }}>{q.explain.prompt}</Copy>
      {choices(q.explain.choices, () => false, explain, "Reason", (i) => p.tried.includes(i))}
      {p.tried.length > 0 && <Copy style={{ fontSize: 15 }}>Not that one. Look again at what the model showed.</Copy>}
    </>}
    {p.phase === "done" && <>
      <Copy style={{ fontSize: 15, fontWeight: "800" }}>Yes: {q.explain.choices[q.explain.answer]}.</Copy>
      <Copy style={{ fontSize: 14 }}>{q.rule}</Copy>
      <Button disabled={!active} onPress={() => { send({ type: "next" }); }}>{p.index === qs.length - 1 ? "Finish" : "Next investigation"}</Button>
    </>}
  </View>;
  return (
    <View style={{ gap: 10 }}>
      <View testID="inquiry-steps" style={large ? { gap: 2 } : { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Copy maxFontSizeMultiplier={large ? 1.5 : undefined} style={{ color: theme.accent, fontWeight: "900", fontSize: 13 }}>INVESTIGATION {p.index + 1} / {qs.length}</Copy>
        <Copy maxFontSizeMultiplier={large ? 1.5 : undefined} accessibilityLabel={`Step: ${steps[now]}`} style={{ color: theme.ink, fontSize: 13 }}>
          {steps.map((step, i) => (i === now ? `▸${step}` : step)).join(" · ")}
        </Copy>
      </View>
      <BoardColumns drawing={<View style={{ alignSelf: space ? "stretch" : undefined, backgroundColor: "#EEF2F4", borderRadius: 20, padding: 8, gap: 4 }}>
        <View testID={geometry.testID} onLayout={geometry.onLayout}><Scene q={q} settings={s.draft} seen={p.seen} height={geometry.height} label={large ? 19.5 : 13} /></View>
        <Copy maxFontSizeMultiplier={1.5} style={{ fontSize: 12, textAlign: "center", color: theme.ink }}>Illustrative model{q.given ? ` · given: ${q.given}` : ""}</Copy>
      </View>}>
        {/* Once tested, the result and the reasons sit right under the drawing the child is watching. */}
        {p.phase !== "setup" && result}
        <Copy style={{ fontSize: 21, fontWeight: "900", color: theme.ink }}>{q.title}</Copy>
        <Copy style={{ fontSize: 16, lineHeight: 22 }}>{q.question}</Copy>
        {p.phase === "setup" && <CoachSpot active={coach.active}>
          <View style={{ gap: 8 }}>
            {q.controls.map((c, i) => c.fixed ? null : <View key={c.name} style={{ gap: 4 }}>
              <Copy style={{ fontSize: 14, fontWeight: "800" }}>{c.name}</Copy>
              {choices(c.options, (j) => s.draft[i] === j, (j) => send({ type: "set", control: i, value: j }), `Set ${c.name}`)}
            </View>)}
            {q.kind === "observe" && <>
              <Copy style={{ fontSize: 14, fontWeight: "800" }}>What do you predict?</Copy>
              {choices(q.outcomes, (i) => s.guess === i, (i) => send({ type: "predict", outcome: i }), "Predict")}
            </>}
          </View>
        </CoachSpot>}
        {p.phase === "setup" && <Button disabled={!active || (q.kind === "observe" && s.guess < 0) || repeat} onPress={test}>{q.kind === "observe" ? "Test the model" : "Test my plan"}</Button>}
        {repeat && <Copy style={{ fontSize: 14 }}>You already tested that setup. Change something first.</Copy>}
      </BoardColumns>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Button quiet compact disabled={!active || earlier.length === 0 || p.phase !== "setup"} onPress={back}>Undo</Button>
        <Button quiet compact disabled={!active || p.phase === "done" || record.hints >= 3} onPress={() => send({ type: "hint" })}>Hint</Button>
        {speak(`${q.title}. ${q.question}`)}
      </View>
      {hints.map((h, i) => <Copy key={i} style={{ padding: 10, backgroundColor: "#FFF3CE", borderRadius: 12, fontSize: 15 }}>{h}</Copy>)}
      {p.phase === "done" && speak(q.rule)}
    </View>
  );
}
