import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { Text } from "../../../components/Text";
import { hasSpeech } from "../../../components/Audio";
import { LARGE_TEXT, atLarge } from "../../../components/wordFit";
import { feel } from "../../../components/feel";
import { Button, C, Copy, PressableScale } from "../../../components/ui";
import { MAX_RESTART, bestJump, canUndo, choicesAround, jumpText, jumpsLeft, landings, type Act, type HopAct, type Level } from "../../../math/kit";
import { NumberPad } from "../../../math/kit/ui/NumberPad";
import { AnswerTile } from "../../AnswerTile";
import { CoachSpot } from "../../Coach";
import { useStepReveal } from "../../stepReveal";
import type { BoardProps } from "../../types";
import { useEntryReveal } from "../shell-math/entryReveal";
import { HelpButton, UndoButton } from "../shell-math/HelpRow";
import { HopLine, hopWindow } from "./HopLine";
import { LEVEL_SKILL, ROUND_LENGTH, countOp, countResult, hopOf, landingOf, lineMax, planOf, startJumps, type HopItem } from "./items";
import { cleanOf, hopMove, hopProgress, verdictOf, type HopRound, type HopRoundAct, type Puzzle } from "./round2";

const minus = "−";
const speechKey = (i: HopItem) => (i[0] === 0 ? `math-${countOp(i)}-${i[2]}-${i[3]}-result` : "");
const jumpName = (j: number) => `Jump ${j > 0 ? "forward" : "back"} ${Math.abs(j)}`;
const jumpsWord = (n: number) => `${n} ${n === 1 ? "jump" : "jumps"}`;
/** "+10, +10, −2" and the sentence `? + 10 + 10 − 2 = 68`. */
const startSentence = (i: HopItem, reveal: boolean) =>
  `${reveal ? i[1] : "?"} ${startJumps(i).map((j) => (j > 0 ? `+ ${j}` : `${minus} ${-j}`)).join(" ")} = ${landingOf(i)}`;
/** Working back from the landing, one jump at a time: "68 + 2 = 70, 70 − 10 = 60, …". */
function backWorking(i: HopItem): string {
  const js = startJumps(i);
  let at = landingOf(i);
  const parts: string[] = [];
  for (let k = js.length - 1; k >= 0; k--) {
    const j = js[k], to = at - j;
    parts.push(`${at} ${j > 0 ? minus : "+"} ${Math.abs(j)} = ${to}`);
    at = to;
  }
  return `${parts.join(", ")}.`;
}

/** Number Hop, Levels 1 to 5 (version 2). Every change goes through hopMove, so the board can only do what the rules allow. */
export function HopBoard(props: BoardProps<HopRound>) {
  const { session, active, update, practice, notePractice, assistance, stopSound, sound, soundOn, cheer, coach, width } = props;
  const s = session.state, level = s.level as Level;
  const { fontScale } = useWindowDimensions();
  const large = fontScale >= LARGE_TEXT;
  const cap = atLarge(fontScale, 1.5), sentenceCap = atLarge(fontScale, 1.2), keyCap = atLarge(fontScale, 1.4);
  const entry = useEntryReveal(large);
  const prog = useMemo(() => hopProgress(s), [s]);
  const live = useRef(s);
  const context = useRef({ active, id: session.id });
  const [note, setNote] = useState<string | null>(null);
  const puzzleAt = prog?.puzzle ? (prog.puzzle.kind === 1 ? prog.puzzle.work.path.length : prog.puzzle.work.at) : 0;
  const stepKey = `${s.index}:${puzzleAt}`;
  useStepReveal(`${s.index}:${prog?.puzzle?.kind === 1 ? 0 : puzzleAt}`);
  useLayoutEffect(() => {
    live.current = s;
    context.current = { active, id: session.id };
    return () => { context.current.active = false; };
  }, [s, active, session.id]);
  useLayoutEffect(() => {
    if (!active || !soundOn) stopSound();
    return () => stopSound();
  }, [active, soundOn, session.id, stopSound]);
  const lastStep = useRef(stepKey);
  useLayoutEffect(() => {
    if (lastStep.current === stepKey) return;
    lastStep.current = stepKey;
    setNote(null);
  }, [stepKey]);

  if (!prog) return <Copy style={{ color: C.ink, textAlign: "center" }}>This round could not be opened. Start a new one from the setup sheet.</Copy>;
  if (s.index >= ROUND_LENGTH || !prog.puzzle || !prog.item) return <Copy style={{ color: C.ink, textAlign: "center" }}>All {ROUND_LENGTH} puzzles done. Play again whenever you like.</Copy>;
  const item = prog.item, puzzle = prog.puzzle, solved = puzzle.work.solved;

  function act(a: HopRoundAct) {
    if (!context.current.active || context.current.id !== session.id || live.current !== s || !prog?.puzzle || !prog.item) return;
    const before = prog.puzzle;
    const verdict = a[0] === "x" ? "ok" : verdictOf(before, prog.item, level, a as Act | HopAct);
    const next = hopMove(s, a);
    if (next === s) {
      if (a[0] === "j") setNote(verdict === "ignored" ? "That jump goes off the line." : "That jump can't reach the flag any more. Try Undo.");
      else if (verdict === "help") setNote("There is no more help to save in this round. You can still finish it.");
      return;
    }
    entry.touched();
    live.current = next;
    stopSound();
    coach.done();
    if (verdict === "wrong" || verdict === "help") assistance?.();
    update(next);
    if (verdict === "wrong") { feel("warning"); setNote("Not quite. Try again, or tap Help."); return; }
    if (a[0] === "x") {
      const skill = LEVEL_SKILL[level - 1], clean = cleanOf(before);
      practice(skill, clean);
      notePractice?.(skill, !clean);
      return;
    }
    const after = hopProgress(next)?.puzzle;
    if (after && after.work.solved && !before.work.solved) {
      if (cleanOf(after)) cheer("right");
      else sound("match");
    }
  }
  const press = () => { if (soundOn) sound("tap"); };
  const nextLabel = s.index === ROUND_LENGTH - 1 ? "Finish round" : "Next puzzle";
  const reachHelp = (hint: number) => <Button quiet compact icon="help" disabled={!active || hint > 0} onPress={() => { press(); act(["h"]); }}>Help</Button>;
  const header = (help: React.ReactNode, undo: boolean) => <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
    <Copy maxFontSizeMultiplier={cap} style={{ fontSize: 14, color: C.ink }}>Puzzle {s.index + 1} of {ROUND_LENGTH}</Copy>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {!solved && !large && help}
      {!solved && !large && undo && <UndoButton active={active} press={press} onUndo={() => act(["u"])} />}
      {soundOn && speechKey(item) && hasSpeech(speechKey(item)) && <Button compact quiet icon="sound-on" disabled={!active} onPress={() => {
        if (context.current.active && context.current.id === session.id && live.current === s) { stopSound(); sound(speechKey(item)); }
      }}>Hear</Button>}
    </View>
  </View>;
  const heading = (t: string) => <View accessibilityLiveRegion="polite">
    <Text accessibilityRole="header" maxFontSizeMultiplier={cap} style={{ color: C.ink, fontSize: 18, fontWeight: "700", textAlign: "center" }}>{t}</Text>
  </View>;
  const noteLine = note && !solved ? <View accessibilityLiveRegion="polite"><Copy maxFontSizeMultiplier={cap} style={{ color: C.ink, textAlign: "center" }}>{note}</Copy></View> : null;
  const nextButton = <Button disabled={!active} onPress={() => { press(); act(["x"]); }}>{nextLabel}</Button>;
  const lineWidth = Math.min(width, 560);

  if (puzzle.kind === 1) return reachView();
  const work = puzzle.work, undoable = canUndo(planOf(item)!, work);
  const help = <HelpButton work={work} active={active} press={press} onHelp={() => act(["h"])} />;

  if (puzzle.kind === 0) {
    // Hop by ones, then say where you landed.
    const op = countOp(item), dir = op === "add" ? 1 : -1, made = work.at === 0 ? work.tapped : item[3], at = item[2] + dir * made;
    const hops = Array.from({ length: made }, () => dir);
    const top = lineMax(level), { lo, hi } = top <= 20 ? { lo: 0, hi: top } : hopWindow([item[2], countResult(item)], 0, top);
    const prompt = solved ? `${work.helped ? "We worked it out together." : "You found it!"} ${item[2]} ${op === "add" ? "+" : minus} ${item[3]} = ${countResult(item)}`
      : work.hint >= 2 ? (work.at === 0 ? `Make ${item[3] - work.tapped} more ${item[3] - work.tapped === 1 ? "hop" : "hops"}.` : `It landed on ${countResult(item)}.`)
        : work.hint === 1 ? (work.at === 0 ? `Tap ${op === "add" ? "Hop forward one" : "Hop back one"} once for each hop.` : "Look at the number under the frog.")
          : work.at === 0 ? `Start at ${item[2]}. Hop ${op === "add" ? "forward" : "back"} ${item[3]}.` : "Where did you land?";
    return <View onLayout={entry.onLayout} style={{ gap: 8, alignSelf: "center", width: "100%", maxWidth: 700 }}>
      {header(help, undoable)}
      {heading(prompt)}
      <Text maxFontSizeMultiplier={sentenceCap} style={{ fontSize: width < 350 ? 30 : 38, fontWeight: "900", color: C.ink, textAlign: "center" }}>
        {item[2]} {op === "add" ? "+" : minus} {item[3]} = {solved ? countResult(item) : "?"}
      </Text>
      {noteLine}
      <HopLine width={lineWidth} lo={lo} hi={hi} start={item[2]} landings={landings(item[2], hops)}
        label={`Number line from ${lo} to ${hi}. Started on ${item[2]}. ${made === 0 ? "No hops yet." : `${made} ${made === 1 ? "hop" : "hops"} made.`}${work.at > 0 ? "" : ` On ${at}.`}`} />
      {!solved && work.at === 0 && <CoachSpot active={coach.active && active}>
        <Button disabled={!active} onPress={() => { press(); act(["c"]); }} style={{ minHeight: 60 }}>{op === "add" ? "Hop forward one" : "Hop back one"}</Button>
      </CoachSpot>}
      {!solved && work.at === 1 && <View accessibilityLabel="Where did you land? Choose one" style={{ flexDirection: "row", gap: 10 }}>
        {choicesAround(countResult(item), s.index, top).map((n) => <AnswerTile key={n} label={`Choose ${n}`} disabled={!active} wrong={work.last === n}
          selected={work.hint >= 3 && n === countResult(item)} onPress={() => { press(); act(["n", n]); }} style={{ flex: 1, minHeight: 64 }}>
          <Text style={{ fontSize: 32, fontWeight: "900", color: C.ink }}>{n}</Text>
        </AnswerTile>)}
      </View>}
      {solved ? nextButton : large && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        <HelpButton work={work} active={active} press={press} onHelp={() => act(["h"])} />
        {undoable && <UndoButton active={active} press={press} onUndo={() => act(["u"])} />}
      </View>}
    </View>;
  }

  // Where did the frog start?
  const landing = landingOf(item), js = startJumps(item);
  const points = [item[1], ...landings(item[1], js)];
  const win = hopWindow(points, 0, 100);
  const prompt = solved ? `${work.helped ? "We worked it out together." : "You found it!"} It started on ${item[1]}.`
    : work.hint >= 3 ? `It started on ${item[1]}. Tap Go to check it.` : work.hint === 2 ? backWorking(item)
      : work.hint === 1 ? `Start at ${landing} and do each jump backwards, from the last one.` : `The frog landed on ${landing}. Where did it start?`;
  return <View onLayout={entry.onLayout} style={{ gap: 8, alignSelf: "center", width: "100%", maxWidth: 700 }}>
    {header(help, false)}
    {heading(prompt)}
    <Text accessibilityLabel={`The frog jumped ${js.map(jumpText).join(", ")} and landed on ${landing}. ${startSentence(item, solved).replace("?", "what number")}`} maxFontSizeMultiplier={sentenceCap} style={{ fontSize: width < 350 ? 26 : 32, fontWeight: "900", color: C.ink, textAlign: "center" }}>{startSentence(item, solved)}</Text>
    {noteLine}
    {/* The line carries something only once Help draws the jumps back (or the start is found); before that it would only repeat
        the heading and push the pad off a phone screen. */}
    {(work.hint >= 2 || solved) && <HopLine width={lineWidth} lo={win.lo} hi={win.hi} start={solved ? item[1] : null} from={item[1]}
      landings={points.slice(1)} target={landing} label={`Number line. The jumps ${js.map(jumpText).join(", ")} end on ${landing}.`} />}
    {!solved && <CoachSpot active={coach.active && active} handAt="none">
      {work.choices
        ? <View accessibilityLabel="Choose the start" style={{ flexDirection: "row", gap: 10 }}>
          {choicesAround(item[1], s.index * 7, 100).map((n) => <AnswerTile key={n} label={`Choose ${n}`} disabled={!active} wrong={work.last === n}
            onPress={() => { press(); act(["n", n]); }} style={{ flex: 1, minHeight: 64 }}><Text style={{ fontSize: 32, fontWeight: "900", color: C.ink }}>{n}</Text></AnswerTile>)}
        </View>
        : <NumberPad resetKey={stepKey} width={width} disabled={!active} max={100} prefill={work.hint >= 3 ? item[1] : null} prompt="The start"
          onKey={() => { if (soundOn) sound("tap"); }} onSubmit={(n) => act(["n", n])} />}
    </CoachSpot>}
    {solved ? nextButton : <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
      {large && <HelpButton work={work} active={active} press={press} onHelp={() => act(["h"])} />}
      {!work.choices && <Button quiet compact disabled={!active} onPress={() => { press(); act(["k"]); }}>Show choices</Button>}
    </View>}
  </View>;

  /** Reach the flag in as few jumps as you can. */
  function reachView() {
    const p = puzzle as Extract<Puzzle, { kind: 1 }>, h = hopOf(item, level), w = p.work;
    const left = jumpsLeft(h, w.at), suggest = w.hint > 0 && !solved ? bestJump(h, w.at) : null;
    const reach = h.jumps.reduce((m, j) => Math.max(m, Math.abs(j)), 0), back = h.jumps.some((j) => j < 0);
    const path = landings(h.start, w.path);
    const win = hopWindow([h.start, h.target, ...path, ...(back ? [h.target + reach, h.target - reach] : [])], h.lo, h.hi);
    const n = w.path.length, atPar = solved && n === p.par;
    const prompt = solved
      ? atPar ? `You reached ${h.target} in ${jumpsWord(n)}, the fewest!` : `You reached ${h.target} in ${jumpsWord(n)}. It can be done in ${p.par}.`
      : suggest !== null ? `Try ${jumpText(suggest)}.` : left === null ? `No jump can reach ${h.target} from ${w.at}. Undo, or start again.`
        : n === 0 ? `Get from ${h.start} to ${h.target}.` : `You are on ${w.at}. Keep going to ${h.target}.`;
    const label = `Number line from ${win.lo} to ${win.hi}. Started on ${h.start}. Flag on ${h.target}. ${n === 0 ? "No jumps yet." : `Jumps: ${w.path.map(jumpText).join(", ")}. On ${w.at}.`}`;

    return <View onLayout={entry.onLayout} style={{ gap: 8, alignSelf: "center", width: "100%", maxWidth: 700 }}>
      {header(reachHelp(w.hint), w.path.length > 0)}
      {heading(prompt)}
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
        <Copy maxFontSizeMultiplier={cap} style={{ color: C.ink, fontWeight: "800" }}>Fewest: {jumpsWord(p.par)}</Copy>
        <Copy maxFontSizeMultiplier={cap} style={{ color: C.ink }}>Jumps so far: {n}</Copy>
      </View>
      {noteLine}
      <HopLine width={lineWidth} lo={win.lo} hi={win.hi} start={h.start} landings={path} target={h.target} suggest={suggest} label={label} />
      {!solved && <CoachSpot active={coach.active && active} handAt="none">
        {/* One row of keys, sharing the width: four keys still clear 56 pt on the smallest phone. */}
        <View accessibilityLabel="Choose a jump" style={{ flexDirection: "row", gap: 8, justifyContent: "center", alignSelf: "stretch" }}>
          {h.jumps.map((j, k) => {
            const off = w.at + j < h.lo || w.at + j > h.hi, hot = suggest === j;
            return <PressableScale key={j} accessibilityRole="button" accessibilityLabel={jumpName(j)} accessibilityState={{ disabled: !active || off, selected: hot }}
              disabled={!active || off} onPress={() => { press(); act(["j", k]); }} amount={0.94}
              style={{ flex: 1, minWidth: 56, maxWidth: 110, minHeight: 60, borderRadius: 16, borderWidth: hot ? 4 : 2, borderColor: hot ? C.teal : C.line, backgroundColor: j > 0 ? C.paper : C.cream,
                alignItems: "center", justifyContent: "center", opacity: off ? 0.4 : 1, shadowColor: C.ink, shadowOpacity: 0.16, shadowOffset: { width: 0, height: 3 }, shadowRadius: 0, elevation: 3 }}>
              <Text maxFontSizeMultiplier={keyCap} style={{ fontSize: 26, fontWeight: "900", color: j > 0 ? C.teal : C.coral }}>{jumpText(j)}</Text>
            </PressableScale>;
          })}
        </View>
      </CoachSpot>}
      {solved
        ? <View style={{ gap: 8 }}>
          {!atPar && w.restarts < MAX_RESTART && <Button quiet disabled={!active} onPress={() => { press(); act(["r"]); }}>Try for {jumpsWord(p.par)}</Button>}
          {nextButton}
        </View>
        : <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {large && reachHelp(w.hint)}
          {large && w.path.length > 0 && <UndoButton active={active} press={press} onUndo={() => act(["u"])} />}
          {w.path.length > 0 && w.restarts < MAX_RESTART && <Button quiet compact disabled={!active} onPress={() => { press(); act(["r"]); }}>Start again</Button>}
        </View>}
    </View>;
  }
}
