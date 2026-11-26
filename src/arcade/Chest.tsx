import { BadgeResultCard } from '../badges/ResultCard';
import { LearningCompanion, Companion, useCompanionReaction } from "../islander/Companion";
import React, { useRef, useState } from "react";
import { View } from "react-native";
import { Button, C, Copy, Heading, PressableScale } from "../components/ui";
import { useSoundControls } from "../components/Audio";
import { useNunitoLoaded } from "../ui/fonts";
import { theme } from "../ui/theme";
import { PictureObject, Scene } from "../learn/art/Objects";
import { sceneLabel } from "../learn/kit/reading";
import { learnerPractice } from "../learn/learners";
import { mathEquation } from "../math/questions";
import { ReadingRefused } from "../learn/kit/ReadingRefused";
import { createPracticeRound, practiceAdmitted, practiceAnswer, practiceText, practiceTransition, type PracticeAction } from "../practice/engine";
import { PracticeMathPicture } from "../practice/PracticePictures";
import { useStore } from "../state/Store";
import { type ArcadeExpected, type ArcadeGame } from "./types";
import { type ChestOffer } from "./progress";
import { stickerNames } from "./Art";
import { ChestArt } from "./TreasureArt";
import { ActionBurst } from "./Juice";

const INK = theme.colors.frame;
const SUBTLE_INK = "#6A5246";
const PAPER = "#FFFDF8";
const CREAM = "#FFF8EC";
const BORDER = "#E8D8BE";
const CORAL = theme.colors.coral;

/** PracticePanel fixes its round length at three. This single-question adapter uses its exact engine and pictures. */
export function TreasureChest({ offer, game, expected, active, onClose }: { offer: ChestOffer; game: ArcadeGame; expected: ArcadeExpected; active: boolean; onClose: () => void }) {
  const store = useStore();
  const nunitoLoaded = useNunitoLoaded();
  const headingFace = nunitoLoaded
    ? ({ fontFamily: theme.fontFamily["800"], fontWeight: "normal" } as const)
    : ({ fontWeight: "800" } as const);
  const companion = useCompanionReaction(offer.round, active);
  const [config] = useState(() => {
    const p = learnerPractice(store.save.learning, store.save.settings.practice);
    return { ...p, enabled: true, subject: p.enabled ? p.subject : game.subject };
  });
  const [state, setState] = useState(() => createPracticeRound(config, Array.from(offer.round).reduce((a, c) => Math.imul(a, 31) + c.charCodeAt(0), 1)));
  const current = useRef(state), consumed = useRef(false), [claimed, setClaimed] = useState(false);
  const sound = useSoundControls(store.save.settings.sound && active);
  const q = state.questions[0], answer = practiceAnswer(q);
  function send(action: PracticeAction) {
    if (!active || consumed.current) return;
    const next = practiceTransition(current.current, action); current.current = next; setState(next);
    if (next !== state && action.type === "choose") sound.play(next.solved ? "match" : "practice-try", true);
  }
  function skip() { if (active && !consumed.current) { consumed.current = true; store.arcade({ type: "skip-chest", round: offer.round }, expected); sound.stop(); onClose(); } }
  function claim() {
    if (!active || consumed.current || !current.current.solved) return;
    consumed.current = true;
    if (store.arcade({ type: "claim-chest", round: offer.round, result: current.current.results[0], config }, expected)) { setClaimed(true); sound.play("win"); }
    else onClose();
  }
  // A reading question must carry a record branded by the provenance module; otherwise only Skip is offered.
  if (!practiceAdmitted(q, "The treasure chest's question")) return <View style={{ gap: 14, maxWidth: 520, width: "100%", alignSelf: "center" }}>
    <View style={{ alignItems: "center", gap: 8 }}><ChestArt sticker={offer.sticker} open={false} active={active} size={176}/></View>
    <Button quiet onPress={skip} style={{ backgroundColor: PAPER, borderColor: BORDER, borderRadius: 18 }} textStyle={{ color: INK }}>Skip chest · costs nothing</Button>
    <ReadingRefused />
  </View>;
  if (claimed) return <View style={{ alignItems: "center", gap: 14 }}><BadgeResultCard round={offer.round}/>{store.save.settings.learningIslander !== false && <Companion event="complete" active={active}/>}<View><ChestArt sticker={offer.sticker} open size={240}/><ActionBurst text="A new friend!"/></View><Heading style={{ ...headingFace, color: INK, textAlign: "center" }}>A new island friend</Heading><Copy style={{ color: SUBTLE_INK, textAlign: "center" }}>{stickerNames[offer.sticker]} is in your sticker book.</Copy><Button onPress={onClose} style={{ backgroundColor: CORAL, borderColor: "#D95D42", borderRadius: 18, boxShadow: "0 4px 0 #C8573D" }} textStyle={{ ...headingFace, color: INK, fontSize: 17 }}>Lovely! Back to my game</Button></View>;
  return <LearningCompanion event={state.solved ? "correct" : state.wrong !== null ? "incorrect" : companion.event} desk={q.kind === "math" || q.kind === "word"} active={active}><View style={{ gap: 14, maxWidth: 520, width: "100%", alignSelf: "center" }}>
    <View style={{ alignItems: "center", gap: 8, padding: 14, backgroundColor: CREAM, borderRadius: 24, borderWidth: 1.5, borderColor: BORDER }}><ChestArt sticker={offer.sticker} open={state.solved} active={active} size={168}/><Heading style={{ ...headingFace, fontSize: 23, textAlign: "center", color: INK }}>{stickerNames[offer.sticker]}</Heading><Copy style={{ textAlign: "center", fontSize: 15, color: SUBTLE_INK }}>One question for this sticker. Stars already saved!</Copy></View>
    <Button quiet onPress={skip} style={{ backgroundColor: PAPER, borderColor: BORDER, borderRadius: 18 }} textStyle={{ color: INK }}>Skip chest · costs nothing</Button>
    <Heading style={{ ...headingFace, fontSize: 22, color: INK }}>{q.kind === "math" ? "Find the missing number" : q.kind === "growth" ? q.task.prompt : "Read it. Tap its picture."}</Heading>
    <Button quiet compact onPress={() => sound.play(q.speech)} style={{ alignSelf: "flex-start", backgroundColor: CREAM, borderColor: BORDER, borderRadius: 999 }} textStyle={{ color: INK }}>Hear the question</Button>
    {q.kind === "math" ? <>
      <Heading style={{ ...headingFace, fontSize: 32, textAlign: "center", color: INK }}>{mathEquation(q.question, state.shown || state.solved)}</Heading>
      {state.helped && <PracticeMathPicture question={q.question}/>}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{q.question.choices.map((n, i) => <Button key={i} quiet selected={(state.shown || state.solved) && i === answer} disabled={!active || state.solved} label={`Chest answer ${n}`} onPress={() => send({ type: "choose", question: 0, choice: i })} style={{ flexGrow: 1, minWidth: 64, borderRadius: 18, borderColor: (state.shown || state.solved) && i === answer ? theme.colors.lagoon : BORDER, backgroundColor: (state.shown || state.solved) && i === answer ? theme.colors.lagoon : PAPER }}>{n}</Button>)}</View>
    </> : q.kind === "growth" ? <>
      {!!q.task.context && <Copy style={{ color: SUBTLE_INK }}>{q.task.context}</Copy>}
      {q.choices.map((value, i) => <Button key={value} quiet selected={(state.shown || state.solved) && i === answer} disabled={!active || state.solved} onPress={() => send({ type: "choose", question: 0, choice: i })} style={{ borderRadius: 18, borderColor: (state.shown || state.solved) && i === answer ? theme.colors.lagoon : BORDER, backgroundColor: (state.shown || state.solved) && i === answer ? theme.colors.lagoon : PAPER }}>{q.task.choices.find(c => c.value === value)!.label}</Button>)}
      {(state.shown || state.solved) && <Copy style={{ color: INK }}>{q.task.explanation}</Copy>}
    </> : <>
      <Heading style={{ ...headingFace, fontSize: q.kind === "word" ? 32 : 23, textAlign: "center", color: INK }}>{practiceText(q)}</Heading>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>{q.choices.map((choice, i) => <PressableScale key={i} disabled={!active || state.solved} accessibilityRole="button" accessibilityLabel={`Chest picture ${i + 1}: ${typeof choice === "string" ? choice : sceneLabel(choice)}`} accessibilityState={{ selected: (state.shown || state.solved) && i === answer, disabled: !active || state.solved }}
        onPress={() => send({ type: "choose", question: 0, choice: i })} style={{ minHeight: 108, width: q.kind === "word" ? "30%" : "46%", padding: 6, alignItems: "center", justifyContent: "center", backgroundColor: (state.shown || state.solved) && i === answer ? theme.colors.successSoft : PAPER, borderWidth: 2, borderColor: (state.shown || state.solved) && i === answer ? theme.colors.lagoon : BORDER, borderRadius: 20 }}>
        {typeof choice === "string" ? <PictureObject name={choice} size={72}/> : <Scene scene={choice} width={120}/>}</PressableScale>)}</View>
    </>}
    {state.wrong !== null && !state.solved && <Copy style={{ color: C.error }}>Let’s try again. {q.kind === "math" ? "Count the parts in the picture, or ask Help to show the missing number." : "Look closely at each picture. Help can show the match."}</Copy>}
    {!state.solved ? <Button quiet disabled={!active} onPress={() => { send({ type: "show", question: 0 }); sound.play(q.speech); }} style={{ backgroundColor: CREAM, borderColor: BORDER, borderRadius: 18 }} textStyle={{ color: INK }}>Help · show me</Button> : <><Copy style={{ color: theme.colors.lagoon, fontWeight: "700" }}>{state.helped ? "You found it together. Helped answers count!" : "You found it!"}</Copy><Button onPress={claim} style={{ backgroundColor: CORAL, borderColor: "#D95D42", borderRadius: 18, boxShadow: "0 4px 0 #C8573D" }} textStyle={{ ...headingFace, color: INK, fontSize: 17 }}>Add sticker to my book</Button></>}
  </View></LearningCompanion>;
}
