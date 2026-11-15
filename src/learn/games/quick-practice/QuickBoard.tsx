import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { Text } from "../../../components/Text";
import { hasSpeech } from "../../../components/Audio";
import { LARGE_TEXT, atLarge } from "../../../components/wordFit";
import { feel } from "../../../components/feel";
import { Button, C, Copy } from "../../../components/ui";
import { judge, type Level } from "../../../math/kit";
import { Bridge } from "../../../math/kit/ui/Bridge";
import { NumberPad } from "../../../math/kit/ui/NumberPad";
import { AnswerTile } from "../../AnswerTile";
import { CoachSpot } from "../../Coach";
import { useStepReveal } from "../../stepReveal";
import type { BoardProps } from "../../types";
import { useEntryReveal } from "../shell-math/entryReveal";
import { BoardColumns, useBoardColumns, useBoardGeometry } from "../../BoardSpace";
import { SCHOOL_BOARD_MIN } from "../../boardGeometry";
import { HelpButton } from "../shell-math/HelpRow";
import { LEVEL_SKILL, ROUND, answerOf, choicesOf, cueFor, hopsFor, levelMax, sentenceOf, storyText, typedLevel, workingFor, type QItem } from "./items";
import { choiceOf, planOf, quickMove, quickProgress, type QAct, type QuickRound } from "./round2";

const speechKey = (i: QItem) => (i[0] === 0 && i[4] !== 0 ? `math-${i[1] === 0 ? "add" : "subtract"}-${i[2]}-${i[3]}-${i[4] === 1 ? "second" : "result"}` : "");

/**
 * The optional open number line Help draws, inside the measured School board space (F-frame-2): it gives up height, down to a
 * readable floor, before the pad or the tiles leave the screen. The question itself is text and is not resized.
 */
function QuickLine({ line, width }: { line: NonNullable<ReturnType<typeof hopsFor>>; width: number }) {
  const g = useBoardGeometry("quick-practice", 74, SCHOOL_BOARD_MIN["quick-practice"]);
  return <View testID={g.testID} onLayout={g.onLayout} style={{ alignItems: "center" }}>
    <Bridge width={width} start={line.start} hops={line.hops} lo={line.lo} hi={line.hi} ten={line.hops.length > 1 ? line.hops[0] : undefined} height={g.height} />
  </View>;
}

/** Quick Practice, Levels 1 to 5 (version 2). Every state change goes through quickMove, so the board can only do what the rules allow. */
export function QuickBoard(props: BoardProps<QuickRound>) {
  const { session, active, update, practice, notePractice, assistance, stopSound, sound, soundOn, cheer, coach, width } = props;
  const s = session.state, level = s.level as Level, choice = choiceOf(session.options);
  // On a wide landscape window the question sits beside the pad; elsewhere above it.
  const side = useBoardColumns();
  const { fontScale } = useWindowDimensions();
  const large = fontScale >= LARGE_TEXT;
  // At accessibility sizes the frame's header fills the page: the question and its lines stop at 1.5x, so the question and the
  // first row of keys share the screen, and the page is brought to the board on entry.
  const cap = atLarge(fontScale, 1.5), sentenceCap = atLarge(fontScale, 1.2);
  const entry = useEntryReveal(large);
  const prog = useMemo(() => quickProgress(s), [s]);
  const live = useRef(s);
  const context = useRef({ active, id: session.id });
  const [note, setNote] = useState<string | null>(null);
  const stepKey = `${s.index}:${prog?.cur ?? 0}`;
  useStepReveal(stepKey);
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
  if (s.index >= ROUND) return <Copy style={{ color: C.ink, textAlign: "center" }}>All {ROUND} questions done. Play again whenever you like.</Copy>;
  const item = s.items[prog.cur], work = prog.work, answer = answerOf(item);
  const typed = typedLevel(level) && !work.choices;
  const story = item[0] === 3;
  const placeHelped = work.helped || prog.placeMissed;
  // `8 + 5 = ?` and `40 − 15 + 8 = ?` ask for an answer; `? + 6 = 14` asks for a missing number.
  const result = item[0] === 2 || (item[0] === 0 && item[4] === 2);

  function act(a: QAct) {
    if (!context.current.active || context.current.id !== session.id || live.current !== s || !prog) return;
    const verdict = a[0] === "x" ? "ok" : judge(planOf(item), prog.work, a as Exclude<QAct, readonly ["x"]>);
    const next = quickMove(s, a, choice);
    if (next === s) {
      if (verdict === "help") setNote("There is no more help to save in this round. You can still finish it.");
      return;
    }
    entry.touched();
    live.current = next;
    stopSound();
    coach.done();
    if (verdict === "wrong" || verdict === "help") assistance?.();
    update(next);
    if (verdict === "wrong") { feel("warning"); return; }
    if (verdict === "ok" && a[0] === "n") {
      const skill = LEVEL_SKILL[level - 1];
      practice(skill, !placeHelped);
      notePractice?.(skill, placeHelped);
      cheer("right");
    }
  }
  const press = () => { if (soundOn) sound("tap"); };

  // One line above the question answers what just happened, or says what Help gives; it never pushes the pad down twice.
  const missLine = prog.missed ? `Not quite. ${workingFor(prog.missed.item)} Here is a new question like it.` : null;
  const heading = work.solved
    ? `${placeHelped ? "We worked it out together." : "You found it!"} The answer is ${answer}.`
    : missLine ?? (work.last !== null ? "Not quite. Try again, or tap Help." : work.hint >= 3 ? `It is ${answer}. ${typed ? "Tap Go to check it." : "Choose it."}`
      : work.hint === 2 ? `${cueFor(item)} ${workingFor(item)}` : work.hint === 1 ? cueFor(item)
        : story ? (typed ? "Read the story. Type the answer." : "Read the story.") : `${typed ? "Type" : "Choose"} ${result ? "the answer" : "the missing number"}.`);
  const line = work.hint >= 1 && !work.solved ? hopsFor(item) : null;
  const tiles = choicesOf(item, level, prog.cur);
  const speech = speechKey(item);

  return <View onLayout={entry.onLayout} style={{ gap: 8, alignSelf: "center", width: "100%", maxWidth: 700 }}>
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <Copy maxFontSizeMultiplier={cap} style={{ fontSize: 14, color: C.ink }}>Question {s.index + 1} of {ROUND}</Copy>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {!work.solved && !large && <HelpButton work={work} active={active} press={press} onHelp={() => act(["h"])} />}
        {soundOn && speech && hasSpeech(speech) && <Button compact quiet icon="sound-on" disabled={!active} onPress={() => {
          if (context.current.active && context.current.id === session.id && live.current === s) { stopSound(); sound(speech); }
        }}>Hear</Button>}
      </View>
    </View>
    <View accessibilityLiveRegion="polite">
      <Text accessibilityRole="header" maxFontSizeMultiplier={cap} style={{ color: C.ink, fontSize: 18, fontWeight: "700", textAlign: "center" }}>{heading}</Text>
    </View>
    <BoardColumns drawing={<View style={{ gap: 8 }}>
      {story && <Copy maxFontSizeMultiplier={cap} style={{ color: C.ink, fontSize: 18, lineHeight: 26, textAlign: "center" }}>{storyText(item)}</Copy>}
      {(!story || work.solved) && <Text accessibilityLabel={sentenceOf(item, work.solved).replace("?", "what number")} maxFontSizeMultiplier={sentenceCap}
        style={{ fontSize: width < 350 ? 28 : sentenceOf(item).length > 14 ? 32 : 38, fontWeight: "900", color: C.ink, textAlign: "center" }}>{sentenceOf(item, work.solved)}</Text>}
      {note && !work.solved ? <View accessibilityLiveRegion="polite"><Copy maxFontSizeMultiplier={cap} style={{ color: C.ink, textAlign: "center" }}>{note}</Copy></View> : null}
      {line && <QuickLine line={line} width={Math.min(side ? Math.floor(width * 0.46) : width, 520)} />}
    </View>}>
    {!work.solved && (typed
      ? <CoachSpot active={coach.active && active} handAt="none">
        <NumberPad resetKey={stepKey} width={side ? Math.floor(width * 0.5) : width} disabled={!active} max={levelMax(level)} maxDigits={String(levelMax(level)).length}
          prefill={work.hint >= 3 ? answer : null} prompt={story ? "Your answer" : "The missing number"}
          onKey={() => { if (soundOn) sound("tap"); }} onSubmit={(n) => act(["n", n])} />
      </CoachSpot>
      : <CoachSpot active={coach.active && active} handAt="none">
        <View accessibilityLabel="Choose one" style={{ flexDirection: "row", gap: 10 }}>
          {tiles.map((n) => <AnswerTile key={n} label={`Choose ${n}`} disabled={!active} wrong={work.last === n} selected={work.hint >= 3 && n === answer}
            onPress={() => { press(); act(["n", n]); }} style={{ flex: 1, minHeight: 64 }}>
            <Text style={{ fontSize: 32, fontWeight: "900", color: C.ink }}>{n}</Text>
          </AnswerTile>)}
        </View>
      </CoachSpot>)}
    {work.solved && <Button disabled={!active} onPress={() => { press(); act(["x"]); }}>{s.index === ROUND - 1 ? "Finish round" : "Next question"}</Button>}
    </BoardColumns>
    {!work.solved && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {large && <HelpButton work={work} active={active} press={press} onHelp={() => act(["h"])} />}
        {typedLevel(level) && !work.choices && <Button quiet compact disabled={!active} onPress={() => { press(); act(["k"]); }}>Show choices</Button>}
      </View>}
  </View>;
}
