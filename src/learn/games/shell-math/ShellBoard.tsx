import { BoardColumns, useBoardColumns } from '../../BoardSpace';
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { Text } from "../../../components/Text";
import { hasSpeech } from "../../../components/Audio";
import { LARGE_TEXT, atLarge } from "../../../components/wordFit";
import { feel } from "../../../components/feel";
import { Button, C, Copy } from "../../../components/ui";
import {
  canUndo, choicesAround, choicesFor, equationText, judge, levelRoute, secondWays, type Level, type Problem,
} from "../../../math/kit";
import { useStepReveal } from "../../stepReveal";
import type { BoardProps } from "../../types";
import { hintLine, routeLines, routeName, solvedLine, stepPrompt, tileCap } from "./copy";
import { pictureFor } from "./picture";
import { progress, shellMove, type RoundAct, type ShellRound } from "./round2";
import { useEntryReveal } from "./entryReveal";
import { HelpButton, HelpRow, UndoButton } from "./HelpRow";
import { StepInput } from "./StepInput";
import { Workspace } from "./Workspace";

export const LEVEL_SKILL = ["num.count-on", "num.ten-and-ones", "num.bridge-ten", "num.make-ten", "num.regroup"] as const;
const speechKey = (p: Problem) => `math-${p.op}-${p.a}-${p.b}-${p.unknown === "second" ? "second" : "result"}`;

/** Shell Math, levels 1 to 5. Every state change goes through shellMove, so the board can only do what the rules allow. */
export function ShellBoard(props: BoardProps<ShellRound>) {
  const side = useBoardColumns();
  const { session, active, update, practice, notePractice, assistance, stopSound, sound, soundOn, cheer, coach, width } = props;
  const s = session.state;
  // At accessibility sizes the header has no room for a second button, so Help moves down beside the other supports.
  const { fontScale } = useWindowDimensions();
  const large = fontScale >= LARGE_TEXT;
  // At accessibility sizes the frame's header fills the screen: the question, the prompt and the equation stop at 1.5x so the
  // board and its first row of keys share the screen, and the page is brought to the board on entry (see useEntryReveal).
  const cap = atLarge(fontScale, 1.5), equationCap = atLarge(fontScale, 1.2);
  const entry = useEntryReveal(large);
  const level = s.level as Level;
  const prog = useMemo(() => progress(s), [s]);
  const live = useRef(s);
  const context = useRef({ active, id: session.id });
  const [note, setNote] = useState<string | null>(null);
  const [hidePicture, setHidePicture] = useState(false);
  const [way, setWay] = useState<number | null>(null);
  // At accessibility sizes the prompt of the next step can sit above the visible page: bring the board's top back after each step.
  useStepReveal(`${s.index}:${prog?.work.at ?? 0}`);
  useLayoutEffect(() => {
    live.current = s;
    context.current = { active, id: session.id };
    return () => { context.current.active = false; };
  }, [s, active, session.id]);
  useLayoutEffect(() => {
    if (!active || !soundOn) stopSound();
    return () => stopSound();
  }, [active, soundOn, session.id, stopSound]);
  // A new question or a new step clears the last gentle note and any open second way.
  const stepKey = `${s.index}:${prog?.work.at ?? 0}`;
  const lastStep = useRef(stepKey);
  useLayoutEffect(() => {
    if (lastStep.current === stepKey) return;
    lastStep.current = stepKey;
    setNote(null);
  }, [stepKey]);
  const lastIndex = useRef(s.index);
  useLayoutEffect(() => {
    if (lastIndex.current !== s.index) { lastIndex.current = s.index; setWay(null); }
  }, [s.index]);

  if (!prog) return <Copy style={{ color: C.ink, textAlign: "center" }}>This round could not be opened. Start a new one from the setup sheet.</Copy>;
  if (s.index >= s.items.length || !prog.problem || !prog.plan) return <Copy style={{ color: C.ink, textAlign: "center" }}>All {s.items.length} questions explored. Play again whenever you like.</Copy>;
  const { problem, plan, work } = prog;
  const step = plan[Math.min(work.at, plan.length - 1)];
  const route = levelRoute(level, problem);
  const pic = pictureFor(level, problem, route, plan, work);
  const typed = level >= 3;
  const undoable = canUndo(plan, work);
  const hint = hintLine(level, problem, plan, work);
  const total = plan.length;
  const rungInfo = `Question ${s.index + 1} of ${s.items.length}`;

  function act(a: RoundAct) {
    if (!context.current.active || context.current.id !== session.id || live.current !== s || !prog?.plan) return;
    const verdict = a[0] === "x" ? "ok" : judge(prog.plan, prog.work, a);
    const next = shellMove(s, a);
    if (next === s) {
      // A miss in a very long round is not saved (the round keeps the room it needs to finish), but the child still gets the same gentle answer.
      if (verdict === "wrong") { feel("warning"); assistance?.(); setNote("Not quite. Try again, or tap Help."); }
      else if (verdict === "help") setNote("There is no more help to save in this round. You can still finish it.");
      else if (verdict === "undo") setNote("That choice stays. You can still finish it.");
      return;
    }
    entry.touched();
    live.current = next;
    stopSound();
    coach.done();
    if (verdict === "wrong" || verdict === "help") assistance?.();
    update(next);
    const after = progress(next);
    if (!after) return;
    if (verdict === "wrong") { feel("warning"); setNote("Not quite. Try again, or tap Help."); return; }
    if (verdict === "ok" && a[0] !== "x") {
      if (after.work.solved && !prog.work.solved) {
        const skill = LEVEL_SKILL[level - 1];
        practice(skill, !after.work.helped);
        notePractice?.(skill, after.work.helped);
        cheer("right");
      } else sound("match");
    }
  }
  const press = () => { if (soundOn) sound("tap"); };

  // A hint takes the question's place, so help never pushes the pad down the page.
  const heading = work.solved ? solvedLine(problem, work.helped) : note ? stepPrompt(level, problem, plan, work.at, route, work.side) : hint ?? stepPrompt(level, problem, plan, work.at, route, work.side);
  const seconds = work.solved ? secondWays(level, problem) : [];
  const typedStepLabel = step.kind === "number" ? (step.role === "final" ? "Your answer" : "This step") : "";
  const stepChoices = step.kind === "number" ? choicesAround(step.value, s.index * 7 + work.at) : [];

  return <View onLayout={entry.onLayout} style={{ gap: 8, alignSelf: "center", width: "100%", maxWidth: 700 }}>
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <Copy maxFontSizeMultiplier={cap} style={{ fontSize: 14, color: C.ink }}>{rungInfo}</Copy>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {!work.solved && !large && <HelpButton work={work} active={active} press={press} onHelp={() => act(["h"])} />}
        {!work.solved && !large && undoable && <UndoButton active={active} press={press} onUndo={() => act(["u"])} />}
        {soundOn && hasSpeech(speechKey(problem)) && <Button compact quiet icon="sound-on" disabled={!active} onPress={() => {
          if (context.current.active && context.current.id === session.id && live.current === s) { stopSound(); sound(speechKey(problem)); }
        }}>Hear</Button>}
      </View>
    </View>
    <Text accessibilityRole="header" maxFontSizeMultiplier={cap} style={{ color: C.ink, fontSize: 18, fontWeight: "700", textAlign: "center" }}>{heading}</Text>
    <Text accessibilityLabel={equationText(problem, work.solved)} maxFontSizeMultiplier={equationCap} style={{ fontSize: width < 350 ? 30 : 38, fontWeight: "900", color: C.ink, textAlign: "center" }}>{equationText(problem, work.solved)}</Text>
    {/* A gentle miss is one short line with the question, above the picture and the pad. */}
    {!work.solved && note ? <View accessibilityLiveRegion="polite"><Copy maxFontSizeMultiplier={cap} style={{ color: C.ink, textAlign: "center" }}>{note}</Copy></View> : null}
    <BoardColumns drawing={<Workspace pic={pic} width={side ? width * .46 : width} hidePicture={hidePicture && level >= 2}
      onPick={step.kind === "fill" && problem.op === "add" && active ? (side, k) => { press(); act(["m", side, k]); } : undefined}
      onPickOnes={step.kind === "fill" && problem.op === "subtract" && active ? (k) => { press(); act(["m", 0, k]); } : undefined}
      onTradeMake={step.kind === "trade" && step.dir === "make" && active ? () => { press(); act(["t"]); } : undefined}
      onTradeOpen={step.kind === "trade" && step.dir === "open" && active ? () => { press(); act(["t"]); } : undefined} />}>
    <StepInput step={step} work={work} typed={typed} tiles={step.kind === "number" ? (step.role === "final" ? choicesFor(step.value, problem, tileCap(level)) : stepChoices) : []}
      width={side ? width * .5 : width} active={active} coachActive={coach.active} resetKey={stepKey} addVerb={problem.op === "add" ? "on" : "back"} press={press} onAct={act}
      soundOn={soundOn} sound={sound} prompt={typedStepLabel} />
    </BoardColumns>
    {work.solved
      ? <View style={{ gap: 8 }}>
        {seconds.length > 0 && <Button quiet compact disabled={!active} onPress={() => { press(); setWay((w) => (w === null ? 0 : w + 1 >= seconds.length ? null : w + 1)); }}>
          {way === null ? "Show a second way" : way + 1 < seconds.length ? "Another way" : "Hide second way"}
        </Button>}
        {way !== null && seconds[way] && <View accessibilityLiveRegion="polite" style={{ borderWidth: 2, borderColor: C.line, borderRadius: 16, backgroundColor: C.paper, padding: 12, gap: 4 }}>
          <Text accessibilityRole="header" style={{ color: C.ink, fontSize: 16, fontWeight: "800" }}>Another way: {routeName(seconds[way])}</Text>
          {routeLines(problem, seconds[way]).map((line, i) => <Copy key={i} style={{ color: C.ink }}>{line}</Copy>)}
        </View>}
        <Button disabled={!active} onPress={() => { press(); act(["x"]); }}>{s.index === s.items.length - 1 ? "Finish round" : "Next question"}</Button>
      </View>
      : <HelpRow step={step} work={work} typed={typed} active={active} canHide={level >= 2} hidden={hidePicture} press={press}
        onHelp={() => act(["h"])} onChoices={() => act(["k"])} onToggle={() => setHidePicture((h) => !h)} showHelp={large} onUndo={large && undoable ? () => act(["u"]) : undefined} />}
    <Copy maxFontSizeMultiplier={cap} style={{ fontSize: 12, color: C.muted, textAlign: "center" }}>{work.solved ? "" : `Step ${Math.min(work.at + 1, total)} of ${total}`}</Copy>
  </View>;
}
