import { coveReady } from './generated/readiness';
import { challengeFor, schoolContext } from '../challenge/catalog';
import { ResultOffer } from '../challenge/ResultOffer';
import { resultOffer, ratingDue } from '../challenge/offers';
import { progressFor } from '../state/challengeDrafts';
import { learningComfort } from '../state/validation';
import { bridgeFor } from './destinations';
import { BadgeResultCard } from '../badges/ResultCard';
import { isMathGame, type MathRound } from "./games/shell-math/round";
import { Companion, LearningCompanion, PhoneLearningCompanion, useCompanionReaction } from "../islander/Companion";
import { LearnerChip } from "../personalization/LearnerChip";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AppState, ScrollView, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useIsFocused } from "expo-router";
import { useStore } from "../state/Store";
import { hasSpeech, useSoundControls } from "../components/Audio";
import { SaveStatus } from "../components/SaveStatus";
import { Button, C, Chip, Copy, GameHeader, Heading, Sheet, ToggleRow, styles } from "../components/ui";
import { LARGE_TEXT, wordFitMultiplier } from "../components/wordFit";
import { TextFit } from "../components/Text";
import { StepReveal } from "./stepReveal";
import { PlayerNames, Scoreboard } from "../components/Match";
import type { Seat } from "../games/match";
import { engines } from "./engines";
import { GrowthBoard } from "./growth/Board";
import { growthProgress, growthQuestions, isGrowth } from "./growth/engine";
import type { GrowthState } from "./growth/types";
import { LevelPath } from "./LevelPath";
import { levelOf, levelTitle, optionsAtLevel, type LearningLevel } from "./levels";
import { roundStars } from "./schoolProgress";
import { activeLearner } from "./learners";
import { views } from "./views";
import { GridInteraction } from "../puzzles/grid/preferences";
import { LastPicnicWord } from "./games/hafa-adai/view";
import type { IslandState } from "./games/hafa-adai/engine";
import { Celebrate } from "./Celebrate";
import { IslandBackdrop, RoundProgress, subjectTheme } from "./LearnChrome";
import { LearnArt } from "./LearnArt";
import { feel } from "../components/feel";
import { outcomeOf, replaySession, startSession } from "./session";
import type { Language, LearnId, LearnMode, LearnOptions, LearnSession, Pace } from "./types";
import { speakAfter } from "./frameClocks";

export const modeLabel: Record<LearnMode, string> = {
  solo: "On my own",
  together: "With a grown-up",
  versus: "Take turns · keep score",
};
export const paceLabel: Record<Pace, string> = { easy: "Gentle", medium: "Growing", hard: "Challenge" };
const languageLabel: Record<Language, string> = { en: "English", ch: "CHamoru" };

/**
 * The shared frame for every learning game: compact header, setup (mode, names, who starts,
 * pace, language), help with spoken instructions, family score, Play again and saving.
 * Each game supplies only its pure engine and its Board.
 */
export function LearnFrame({ id }: { id: LearnId }) {
  const store = useStore(),
    focused = useIsFocused(),
    insets = useSafeAreaInsets(),
    { width, height, fontScale } = useWindowDimensions();
  const engine = engines[id],
    view = views[id];
  const saved = store.save.learn?.[id];
  const scroll = useRef<ScrollView | null>(null);
  // A board that owns a touch (Slip Tide's water) holds the page scroll until release, as Cove grids do.
  const [held, setHeld] = useState(false);
  const growthState = saved && isGrowth(saved.state) ? saved.state as GrowthState : undefined;
  const growthStep = saved && growthState ? growthProgress(growthState, growthQuestions(id, saved.options, growthState)).index : saved && (engine.ownLevels||engine.nativeStages) ? (saved.state as { index?: number }).index : undefined;
  const large = fontScale >= LARGE_TEXT;
  // The board's top within the page, measured on layout.
  // The board's own top inside its card: below the card's padding and the celebration cell once a burst has shown.
  const boardTop = useRef<number | null>(null), boardInset = useRef(0), stepRound = useRef(saved?.id), lastStep = useRef<number | undefined>(undefined);
  useLayoutEffect(() => {
    if (growthStep === undefined) return;
    // Only a real move to another question or round repositions the page. A text-size change alone (crossing the
    // large threshold mid-answer) must leave the child where they are.
    if (lastStep.current === growthStep && stepRound.current === saved?.id) return;
    lastStep.current = growthStep;
    // The next question of the same round. At accessibility sizes the header alone can fill the screen, so the page
    // returns to the top of the board rather than above the header, and the answers stay a short scroll away.
    const sameRound = stepRound.current === saved?.id;
    stepRound.current = saved?.id;
    scroll.current?.scrollTo({ y: large && sameRound && boardTop.current !== null ? Math.max(0, boardTop.current + boardInset.current - 8) : 0, animated: false });
  }, [growthStep, saved?.id, large]);
  // Other step games (a story page, the next question) ask for the same return through `useStepReveal`.
  const reveal = useCallback(() => {
    if (large && boardTop.current !== null) scroll.current?.scrollTo({ y: Math.max(0, boardTop.current + boardInset.current - 8), animated: false });
  }, [large]);
  const learner = activeLearner(store.save.learning);
  const comfort = learningComfort(store.save, learner.id);
  const learningSkills = learner.id === "family" && !store.save.profiles ? store.save.skills : learner.skills;
  const epoch = store.epoch;
  const acceptedRound = useRef(saved);
  useLayoutEffect(() => { acceptedRound.current = saved; }, [saved]);
  const roundHelped = useRef(false);
  useLayoutEffect(() => { roundHelped.current = saved?.levelHelped ?? false; }, [saved?.id, saved?.levelHelped]);
  const expected = useRef<{ id: string | null; revision?: number }>({ id: saved?.id ?? null, revision: saved?.revision });
  useLayoutEffect(() => { expected.current = { id: saved?.id ?? null, revision: saved?.revision }; }, [epoch, saved?.id, saved?.revision]);
  const remembered = store.save.players ?? [];
  const [setup, setSetup] = useState(false),
    [help, setHelp] = useState(false),
    [options, setOptions] = useState<LearnOptions>(
      (saved && (saved.learner ?? "family") === learner.id ? saved.options : learner.choices[id]) ?? { mode: engine.modes[0], pace: (["easy","medium","hard"] as const)[Math.min(3,comfort.opening)-1], ...(comfort.opening>3 ? {stage:comfort.opening===4 ? "stretch" as const : "deep" as const} : {}), ...(engine.languages ? { language: engine.languages[0] } : {}) }
    ),
    [names, setNames] = useState<[string, string]>(
      saved?.names && !saved.names.every((n, i) => n === `Player ${i + 1}`) ? saved.names : ["", ""]
    ),
    [starter, setStarter] = useState<Seat>(0),
    [alternate, setAlternate] = useState(saved?.match?.alternate ?? true),
    [appActive, setAppActive] = useState(AppState.currentState === "active" || AppState.currentState == null);
  const identity = `${learner.id}:${epoch}`;
  const previousIdentity = useRef(identity);
  useLayoutEffect(() => {
    if (previousIdentity.current === identity) return;
    previousIdentity.current = identity;
    // Keep the options/help sheet open, but use this learner's own learning choices.
    setOptions((saved && (saved.learner ?? "family") === learner.id ? saved.options : learner.choices[id]) ?? { mode: engine.modes[0], pace: (["easy","medium","hard"] as const)[Math.min(3,comfort.opening)-1], ...(comfort.opening>3 ? {stage:comfort.opening===4 ? "stretch" as const : "deep" as const} : {}), ...(engine.languages ? { language: engine.languages[0] } : {}) });
  }, [identity, saved, learner, id, engine, comfort.opening]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => setAppActive(state === "active"));
    return () => sub.remove();
  }, []);
  const soundOn = store.save.settings.sound && (store.save.settings.narration ?? true);
  const { play: sound, stop: stopSound } = useSoundControls(store.save.settings.sound && focused);
  const result = saved ? outcomeOf(saved) : null,
    finished = result !== null,
    notWon = saved && result === "done" && engine.notWon ? engine.notWon(saved.state, saved.options) : null,
    earnedStars = saved ? roundStars(saved, store.save.school?.[id]?.[levelOf(saved.options)]?.stars ?? 1) : 0,
    wasFinished = useRef(finished);
  useLayoutEffect(() => {
    if (finished) scroll.current?.scrollTo({ y: 0, animated: false });
  }, [finished, saved?.id]);
  // Celebrations: a small burst on right answers, a big one when the round is won or completed.
  // A round the island friend or tide won ends calmly; the board says who got there first.
  const [burst, setBurst] = useState({ n: 0, big: false });
  useEffect(() => {
    if (finished && !wasFinished.current && !notWon) {
      sound("win");
      setBurst((b) => ({ n: b.n + 1, big: true }));
    }
    wasFinished.current = finished;
  }, [finished, notWon, sound]);

  // First-move coaching: shown the first time a child opens this game, and again from Help.
  const [replayCoach, setReplayCoach] = useState(false);
  const coachActive = !!saved && !finished && (replayCoach || !(store.save.coached ?? []).includes(id));
  const { markCoached } = store;
  const coachDone = useCallback(() => {
    setReplayCoach(false);
    markCoached(id);
  }, [markCoached, id, setReplayCoach]);
  const cheerLine = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const boardActive = appActive && focused && !setup && !help,
    savedId = saved?.id;
  useEffect(() => {
    if (!boardActive) stopSound();
  }, [boardActive, stopSound]);
  // A falling object can retain a callback after mute, Help or a round change. Invalidate
  // that callback too, rather than only cancelling speech it had already scheduled.
  const audioSettings = store.save.settings;
  const feedbackContext = useMemo(() => ({ boardActive, soundOn, savedId, audioSettings }), [boardActive, soundOn, savedId, audioSettings]);
  const liveFeedback = useRef<object | null>(feedbackContext);
  useLayoutEffect(() => {
    liveFeedback.current = feedbackContext;
    return () => {
      liveFeedback.current = null;
      clearTimeout(cheerLine.current);
    };
  }, [feedbackContext]);
  const { event: companionEvent, react: reactCompanion } = useCompanionReaction(`${learner.id}:${saved?.id ?? "setup"}`, boardActive);
  const cheer = useCallback(
    (kind: "right" | "big" = "right", say?: string) => {
      if (!boardActive || liveFeedback.current !== feedbackContext) return;
      reactCompanion("correct");
      setBurst((b) => ({ n: b.n + 1, big: kind === "big" }));
      sound(kind === "big" ? "win" : "match");
      if (kind === "big") feel("success");
      clearTimeout(cheerLine.current);
      if (say) cheerLine.current = speakAfter(() => {
        if (liveFeedback.current === feedbackContext) sound(say, true);
      }, kind === "big" ? 900 : 550);
    },
    [sound, boardActive, feedbackContext, reactCompanion]
  );
  // A newer sound, a new round, sound off, Help or leaving the screen drops a pending cheer line.
  const boardSound = useCallback(
    (key: string, automatic = false) => {
      if (!boardActive || liveFeedback.current !== feedbackContext) return;
      clearTimeout(cheerLine.current);
      sound(key, automatic);
    },
    [sound, boardActive, feedbackContext]
  );
  // Say the game's goal once when a fresh round opens, so a non-reader knows what to do.
  const introduced = useRef<string | null>(null);
  useEffect(() => {
    if (!saved || !engine.introAudio || !soundOn || !boardActive || (isGrowth(saved.state))) return;
    if (saved.revision !== 0 || introduced.current === saved.id) return;
    introduced.current = saved.id;
    const timer = speakAfter(() => sound(engine.introAudio!, true), 450);
    return () => clearTimeout(timer);
  }, [saved, engine.introAudio, soundOn, boardActive, sound]);

  const { learnUpdate, practiceOwned } = store;
  const save = useCallback(
    (next: LearnSession) => {
      if (next.id === expected.current.id && roundHelped.current) next = { ...next, levelHelped: true };
      const accepted = learnUpdate(id, next, { ...expected.current, epoch });
      if (accepted) { expected.current = { id: next.id, revision: next.revision }; acceptedRound.current = next; }
      return accepted;
    },
    [learnUpdate, id, epoch]
  );
  const assistance = useCallback(() => {
    if (!saved || expected.current.id !== saved.id || !appActive || !focused || roundHelped.current) return;
    roundHelped.current = true;
    const current = acceptedRound.current ?? saved;
    save({ ...current, levelHelped: true, revision: Math.max(current.revision, expected.current.revision ?? 0) + 1 });
  }, [saved, appActive, focused, save]);
  const practice = useCallback((skill: string, correct: boolean) => {
    if (!saved || !boardActive) return;
    reactCompanion(correct ? "correct" : "incorrect");
    practiceOwned(id, { id: saved.id, revision: saved.revision, epoch }, skill, correct);
    if (!correct) assistance();
  }, [saved, boardActive, practiceOwned, id, epoch, assistance, reactCompanion]);
  const update = useCallback(
    (state: unknown) => {
      if (!saved || expected.current.id !== saved.id || !boardActive || store.epoch !== epoch) return;
      const revision = Math.max(saved.revision, expected.current.revision ?? 0) + 1;
      if (save({ ...saved, state, revision })) {
        if (isGrowth(saved.state)) {
          const next = state as GrowthState;
          if (next.history.at(-1)?.type === "answer" && next.history !== (saved.state as GrowthState).history) {
            const progress = growthProgress(next, growthQuestions(id, saved.options, next));
            reactCompanion(progress.solved ? "correct" : "incorrect");
          }
        } else if (isMathGame(id) && (state as MathRound).wrong !== null && !(state as MathRound).solved) reactCompanion("incorrect");
      }
    },
    [saved, save, boardActive, store.epoch, epoch, id, reactCompanion]
  );

  function start() {
    const next = startSession(id, { options, names, starter: options.mode === "solo" ? 0 : starter, alternate }, learningSkills);
    next.learner = learner.id;
    if (options.mode !== "solo") store.rememberPlayers(names);
    if (save(next)) { stopSound(); setBurst({ n: 0, big: false }); setSetup(false); }
  }
  function replay() {
    if (!saved || !finished) return;
    // A different learner starts with their own remembered choices, never the other child's level.
    const next = (saved.learner ?? "family") === learner.id
      ? replaySession(saved, learningSkills, undefined, learner.id)
      : startSession(id, { options: learner.choices[id] ?? { mode: engine.modes[0], pace: (["easy","medium","hard"] as const)[Math.min(3,comfort.opening)-1], ...(comfort.opening>3 ? {stage:comfort.opening===4 ? "stretch" as const : "deep" as const} : {}), ...(engine.languages ? { language: engine.languages[0] } : {}) } }, learningSkills);
    next.learner = learner.id;
    if (save(next)) { stopSound(); setBurst({ n: 0, big: false }); }
  }
  function openSetup() {
    if (saved) {
      setOptions((saved.learner ?? "family") === learner.id ? saved.options : learner.choices[id] ?? { mode: engine.modes[0], pace: (["easy","medium","hard"] as const)[Math.min(3,comfort.opening)-1], ...(comfort.opening>3 ? {stage:comfort.opening===4 ? "stretch" as const : "deep" as const} : {}), ...(engine.languages ? { language: engine.languages[0] } : {}) });
      setAlternate(saved.match?.alternate ?? true);
      setStarter(saved.starter ?? 0);
    }
    setSetup(true);
  }

  function chooseLevel(level: LearningLevel, base = options) {
    stopSound();
    sound(`learning-level-${level}`);
    setOptions(optionsAtLevel(base, level));
  }
  const challenge = challengeFor(id), challengeProgress=progressFor(store.save,learner.id);
  const schoolState=id==='crab-commands'&&saved?saved.state as {levels:string[];completed:unknown[]}:undefined;
  const schoolBeach=schoolState?.levels?.[Math.min(schoolState.completed.length,schoolState.levels.length-1)];
  const sameBeach=challenge?.puzzles.find(p=>!p.retired&&p.source.kind==='school'&&p.source.game===id&&p.source.puzzle===schoolBeach);
  const context=schoolContext(id,levelOf(saved?.options??options));
  const levelRecord=store.save.school?.[id]?.[levelOf(saved?.options??options)];
  const offerFacts={atPar:false,firstHigher:!!saved && levelOf(saved.options)>1 && levelRecord?.completed===1 && Object.keys(store.save.school?.[id]??{}).some(level=>Number(level)<levelOf(saved.options)),dare:!!challenge,easier:!!saved&&levelOf(saved.options)>1,harder:!!saved&&(levelOf(saved.options)<5||!!challenge)};
  const signal=challengeProgress?.signals.find(s=>s[0]===context);
  const ownsResult=!!saved&&(saved.learner??'family')===learner.id&&saved.options.mode==='solo';
  const hasOffer=ownsResult&&learner.id!=='family'&&comfort.offers&&!comfort.youngChild&&!!signal&&!signal[4]&&!!challengeProgress&&(ratingDue(challengeProgress,context)||!!resultOffer(signal,comfort,offerFacts));
  // G1 supplies the Cove route. Until then there is no link to an unfinished surface.
  const bridge=bridgeFor(id,levelOf(saved?.options??options),coveReady);
  const changeWorking=(next:NonNullable<typeof challengeProgress>)=>store.challengeWorking({signal:next.signals.find(s=>s[0]===context)},{owner:learner.id,epoch,game:id,id:saved?.id??'',revision:saved?.revision??-1,kind:'school'});
  const openChallenge=(same=false)=>{stopSound();setSetup(false);router.push({pathname:'/challenge',params:{game:id,...(same&&sameBeach?{puzzle:`${sameBeach.ref.bank}:${sameBeach.ref.puzzle}`}:{})}});};
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const twoPlayer = options.mode !== "solo";
  const turn = saved && engine.turn && saved.options.mode !== "solo" && !finished ? engine.turn(saved.state, saved.options) : null;
  const boardWidth = Math.min(width - insets.left - insets.right - 56, 900);
  const boardInner = boardWidth - (width >= 768 && height >= 600 && store.save.settings.learningIslander !== false ? 88 : 0);
  // At accessibility sizes, board text without a cap of its own (prompts, answers, results) stops at 2x, or where its
  // longest word still fits the board. Reading is never timed and Hear stays available, so it stays large without
  // filling the screen. Default sizes never change.
  // A 32-pt heading would reach 64 pt at 2x, so nothing in a board is drawn above 44 pt (about a 22-pt line at 2x).
  const boardFit = useMemo(() => large ? { width: boardInner, ceiling: 2, maxSize: 44 } : null, [large, boardInner]);
  // The result card ("You did it!") follows the same rule inside its 20-pt padding and 3-pt border.
  const resultFit = useMemo(() => large ? { width: width - insets.left - insets.right - 32 - 46, ceiling: 2, maxSize: 44 } : null, [large, width, insets.left, insets.right]);
  const Board = saved && isGrowth(saved.state) ? GrowthBoard : view.Board;
  const island = id === "hafa-adai" ? "reading" : engine.island;
  const theme = id === "hafa-adai" ? { sky: "#FFE4D9", land: "#F5BCA6", accent: "#A44E3A", ink: "#65382D" } : subjectTheme[island];
  const cheerText = companionEvent === "correct" ? "You got it!" : companionEvent === "incorrect" ? "Try again!" : companionEvent === "entry" ? "Let's play!" : null;
  const modeText = saved ? (engine.modeLabels?.[saved.options.mode] ?? modeLabel[saved.options.mode]) +
    (!saved.options.stage && engine.mathControls ? ` · ${saved.options.mathOperation === "mixed" ? "Add & subtract" : saved.options.mathOperation === "subtract" ? "Subtract" : "Add"}` : "") +
    (saved.options.language && engine.languages && engine.languages.length > 1 ? ` · ${languageLabel[saved.options.language]}` : "") : "";

  const phone = width < 600;
  const lineWidth = width - insets.left - insets.right - 32;
  const levelLine = levelTitle(id, levelOf(saved?.options ?? options)), levelSize = phone ? 19 : 25, artSize = phone ? 36 : 48;
  const companionShown = phone && !!saved && !finished && store.save.settings.learningIslander !== false;
  const gameName = id === "hafa-adai" && phone ? "Håfa Adai" : engine.name;
  const bar = <GameHeader
          title={gameName}
          onBack={back}
          sound={{ on: store.save.settings.sound, toggle: () => store.settings({ sound: !store.save.settings.sound }) }}
          onHelp={() => setHelp(true)}
          // Back, Sound and Help are three 44-pt icons; the title wraps between words beside them.
          titleMax={large ? wordFitMultiplier(gameName, 21, lineWidth - 3 * 44 - 3 * 8, 1.5) : undefined}
        />;
  // At accessibility sizes the header text stops growing where its words still fit: the level title at 1.5x, so it is
  // never larger than the game name in the bar, and the small lines (mode, cheer) at 1.5x like compact chrome. Default sizes never change.
  const level = <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <view.Art size={artSize} />
          <Heading maxFontSizeMultiplier={large ? wordFitMultiplier(levelLine, levelSize, lineWidth - artSize - 8 - (companionShown ? 72 : 0), 1.5) : undefined} style={{ fontSize: levelSize, flex: 1, minWidth: 0, color: theme.ink }}>{levelLine}</Heading>
          {phone && saved && !finished && <PhoneLearningCompanion event={companionEvent} active={boardActive}/>}
        </View>;
  const small = large ? 1.5 : undefined, big = large ? 2 : undefined;
  // Sheet text runs across the sheet (a 560-pt card on wide screens) inside its 22-pt padding.
  const sheetLine = (width >= 600 ? Math.min(560, width - 48) : width) - 44;
  const header = <View style={{ gap: 4 }}>
        <LearnerChip compact/>
        {bar}
        {level}
        {phone && saved && <Copy maxFontSizeMultiplier={small} style={{ fontSize: 12, color: theme.ink, backgroundColor: theme.sky, alignSelf: "flex-start", paddingHorizontal: 4 }}>{modeText}</Copy>}
        {phone && cheerText && saved && !finished && <View accessibilityLiveRegion="polite" style={{ alignSelf: "flex-end", backgroundColor: C.paper, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5 }}><Copy maxFontSizeMultiplier={small} style={{ color: theme.ink, fontWeight: "900" }}>{cheerText}</Copy></View>}

  </View>;
  // A phone pins its header above the board. At accessibility sizes only the one-row bar stays pinned; the learner,
  // level and mode lines scroll with the page, so the board gets the screen and everything stays reachable.
  // Wider screens (landscape, iPad) scroll the whole header, with the learner chip sharing the mode line.
  // A short landscape phone has about 400 pt: the level line shares one wrapping row with the learner chip, the mode
  // and a one-line journey, so the header takes about a third of the screen before it scrolls away.
  const shortLandscape = !phone && large && height < 500;
  const largeLines = shortLandscape ? <View testID="learn-header-scrolled" style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 16, rowGap: 4 }}>
        <View style={{ flexGrow: 1, flexBasis: 320, minWidth: 0 }}>{level}</View>
        <View testID="learn-header-cluster" style={{ flexGrow: 1, flexBasis: 260, gap: 4 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <LearnerChip compact/>
            {saved && <Copy maxFontSizeMultiplier={small} style={{ fontSize: 12, color: theme.ink, backgroundColor: theme.sky, paddingHorizontal: 8, borderRadius: 10, overflow: "hidden" }}>{modeText}</Copy>}
          </View>
          {saved && <RoundProgress session={saved} island={island} colors={theme} finished={finished} inline/>}
        </View>
      </View> : <View testID="learn-header-scrolled" style={{ gap: 4 }}>
        {level}
        {saved && <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <LearnerChip compact/>
          <Copy maxFontSizeMultiplier={small} style={{ fontSize: 12, color: theme.ink, backgroundColor: theme.sky, paddingHorizontal: 8, borderRadius: 10, overflow: "hidden" }}>{modeText}</Copy>
        </View>}
        {!saved && <LearnerChip compact/>}
        {phone && cheerText && saved && !finished && <View accessibilityLiveRegion="polite" style={{ alignSelf: "flex-end", backgroundColor: C.paper, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5 }}><Copy maxFontSizeMultiplier={small} style={{ color: theme.ink, fontWeight: "900" }}>{cheerText}</Copy></View>}
      </View>;
  const pinned = phone ? (large ? bar : header) : null;
  const scrolled = phone ? (large ? largeLines : null) : large ? <View style={{ gap: 4 }}>{bar}{largeLines}</View> : header;

  const helpText = <Copy>{saved && isGrowth(saved.state) ? "Read or hear the question, then choose an answer or put the pieces in order. Show me explains the idea and counts as helped practice. Take your time, then tap Next idea. Pictures and demonstrations stay available at every stage." : engine.help}</Copy>;
  // Offered only when the guide has a shipped recording in the chosen voice; the written help is always here.
  const hear = !(saved && isGrowth(saved.state)) && engine.helpAudio && hasSpeech(engine.helpAudio, store.save.settings.voice) ? <>
            <Button icon="sound-on" maxFontSizeMultiplier={big} onPress={() => sound(engine.helpAudio!)} disabled={!soundOn}>
              Hear a quick guide
            </Button>
            {!soundOn && <Copy maxFontSizeMultiplier={big}>Turn sound on to hear the instructions.</Copy>}
          </> : null;

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: theme.sky }]}>
      <IslandBackdrop island={island} colors={theme}/>
      {pinned && <View testID="learn-header-pinned" style={{ paddingHorizontal: 16 }}>{pinned}</View>}
      <GridInteraction.Provider value={setHeld}>
      <ScrollView key={saved?.id ?? "setup"} ref={scroll} scrollEnabled={!held} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { maxWidth: 1280, paddingHorizontal: 16 }]}>
        {scrolled}
        {width >= 600 && !large && saved && (
          <Copy style={{ fontSize: 12, marginBottom: 8 }}>
            {(engine.modeLabels?.[saved.options.mode] ?? modeLabel[saved.options.mode]) +
              (!saved.options.stage && engine.mathControls ? ` · ${saved.options.mathOperation === "mixed" ? "Add & subtract" : saved.options.mathOperation === "subtract" ? "Subtract" : "Add"}` : "") +
              (saved.options.language && engine.languages && engine.languages.length > 1 ? ` · ${languageLabel[saved.options.language]}` : "")}
          </Copy>
        )}
        {saved && !shortLandscape && <RoundProgress session={saved} island={island} colors={theme} finished={finished}/>}
        <SaveStatus />
        {saved?.match && <Scoreboard match={saved.match} result={result === "done" ? null : result} active={turn} />}
        {saved && !finished && <View testID="learn-board" onLayout={e => { boardTop.current = e.nativeEvent.layout.y; }}>
          <LearningCompanion visible={!finished} event={finished ? (notWon ? "loss" : result === "draw" ? "draw" : "complete") : companionEvent} desk={engine.island === "reading" || engine.island === "numbers"} active={boardActive} cheer={cheerText ? <View accessibilityLiveRegion="polite" style={{ backgroundColor: C.paper, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 2, borderColor: theme.accent }}><Copy style={{ color: theme.ink, fontWeight: "900" }}>{cheerText}</Copy></View> : undefined}>
          <View style={{ backgroundColor: "#FFFEFA", borderRadius: 28, borderWidth: 2, borderColor: theme.accent, padding: width < 600 ? 12 : 22, shadowColor: theme.ink, shadowOpacity: 0.12, shadowOffset: { width: 0, height: 7 }, shadowRadius: 0, elevation: 5 }}>
            <Celebrate burst={burst.n} big={burst.big} />
            <StepReveal.Provider value={reveal}><TextFit.Provider value={boardFit}>
            <View testID="learn-board-inset" onLayout={e => { boardInset.current = e.nativeEvent.layout.y; }}>
            <Board
              key={saved.id}
              session={saved}
              update={update}
              practice={practice}
              notePractice={store.notePractice}
              assistance={assistance}
              skills={learningSkills ?? {}}
              sound={boardSound}
              stopSound={stopSound}
              soundOn={soundOn}
              width={boardInner}
              height={height - insets.top - insets.bottom}
              active={boardActive}
              coach={{ active: coachActive && boardActive, done: coachDone }}
              cheer={cheer}
            />
            </View>
            </TextFit.Provider></StepReveal.Provider>
          </View>
          </LearningCompanion>
        </View>}
        {saved && (
          <View style={{ alignItems: "center", gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line }}>
            {finished && (
              <TextFit.Provider value={resultFit}>
              <View
                accessibilityLiveRegion="polite"
                style={{ alignItems: "center", justifyContent: "center", gap: 14, padding: 20, borderRadius: 28, backgroundColor: theme.sky, alignSelf: "stretch", minHeight: Math.max(430, height - insets.top - insets.bottom - 190), borderWidth: 3, borderColor: theme.accent }}
              >
                <View pointerEvents="none" style={{ position: "absolute", top: 10, left: 0, right: 0, alignItems: "center" }}><Celebrate burst={burst.n} big /></View>
                {engine.id === "hafa-adai" && !saved.options.stage && <LastPicnicWord state={saved.state as IslandState} />}
                {earnedStars > 0 && <View accessible accessibilityLabel={`${earnedStars} ${earnedStars === 1 ? "star" : "stars"} earned`}><Heading style={{ color: theme.accent, fontSize: 38, textAlign: "center" }}>{"★  ".repeat(earnedStars).trim()}</Heading></View>}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  {store.save.settings.learningIslander !== false && <Companion event={notWon ? "loss" : result === "draw" ? "draw" : "complete"} active={boardActive} size={166}/>}
                  {engine.ownLevels ? <view.Art size={86} /> : <LearnArt island={engine.island} size={86} />}
                </View>
                <Heading style={{ fontSize: 26, textAlign: "center" }}>
                  {result === 0 || result === 1
                    ? `${saved.match?.names[result] ?? saved.names?.[result] ?? "You"} won this round!`
                    : result === "draw"
                      ? "A tie! Great playing."
                      : (notWon ?? "You did it!")}
                </Heading>
                <Copy style={{ color: theme.ink, fontSize: 17, fontWeight: "800", textAlign: "center" }}>{notWon ? "Ready to try the island again?" : "Your stars are shining. Ready for another adventure?"}</Copy>
                {ownsResult&&learner.id!=='family'&&challengeProgress&&<ResultOffer progress={challengeProgress} context={context} comfort={comfort} facts={offerFacts} samePuzzle={!!sameBeach} onHear={soundOn&&resultOffer(signal,comfort,offerFacts)?.kind==='harder'&&levelOf(saved.options)<5?()=>sound(`learning-try-level-${levelOf(saved.options)+1}`):undefined} onChange={changeWorking} onChoose={kind=>{
                  if(kind==='dare'||kind==='harder'&&levelOf(saved.options)===5)openChallenge(kind==='dare');
                  else {chooseLevel(Math.max(1,Math.min(5,levelOf(saved.options)+(kind==='easier'?-1:1))) as LearningLevel,saved.options);setSetup(true);}
                }}/>}
                {ownsResult&&!hasOffer&&bridge&&!store.save.settings.learningBridges?.[learner.id]?.includes(id)&&!signal?.[4]&&comfort.offers&&!comfort.youngChild&&<View style={{gap:8}}><Button quiet onPress={()=>{if(store.challengeWorking({bridge:id},{owner:learner.id,epoch,game:id,id:saved.id,revision:saved.revision,kind:'school'}))router.push(bridge.route);}}>{bridge.label}</Button><Button quiet compact onPress={()=>store.challengeWorking({bridge:id},{owner:learner.id,epoch,game:id,id:saved.id,revision:saved.revision,kind:'school'})}>Not now</Button></View>}
                <Button icon="right" onPress={replay} style={{ minWidth: 220, minHeight: 62, backgroundColor: theme.accent, borderColor: theme.accent }}>
                  Keep going
                </Button>
              </View>
              </TextFit.Provider>
            )}
            {finished && <BadgeResultCard round={saved.id}/>}
            {finished && <LevelPath game={id} level={levelOf(saved.options)} progress={store.save.school} onChoose={level => { chooseLevel(level, saved.options); setSetup(true); }}/>}
            {(saved.learner ?? "family") !== learner.id && <Copy style={{ textAlign: "center" }}>This saved round belongs to {store.save.learning?.people.find(p => p.id === (saved.learner ?? "family"))?.name ?? "Family practice"}. New rounds use {learner.name}.</Copy>}
            {/* Options are for grown-ups and changing modes; kept small so it's never the obvious tap mid-game. */}
            <Button compact quiet maxFontSizeMultiplier={large ? 2 : undefined} onPress={openSetup}>
              New round & options
            </Button>
            <Copy maxFontSizeMultiplier={small} style={{ fontSize: 12, marginTop: 4, textAlign: "center" }}>Your round saves on this device.</Copy>
          </View>
        )}
      </ScrollView>
      </GridInteraction.Provider>
      <Sheet
        visible={focused && (setup || !saved)}
        onClose={() => (saved ? setSetup(false) : back())}
        title={saved ? "A fresh round" : `Let’s play ${engine.name}`}
        footer={<Button maxFontSizeMultiplier={big} onPress={start} style={{ minHeight: 62, borderRadius: 20, backgroundColor: theme.accent, borderColor: theme.accent }}>Play this level</Button>}
      >
        {/* At accessibility sizes the art sits above the name, so the name has the card's width and never breaks a word. */}
        <View testID="learn-setup-card" style={{ flexDirection: large ? "column" : "row", alignItems: large ? "flex-start" : "center", gap: large ? 4 : 12, backgroundColor: theme.sky, padding: 12, borderRadius: 22 }}><view.Art size={large ? 56 : 72}/><View style={large ? { alignSelf: "stretch" } : { flex: 1 }}><Heading maxFontSizeMultiplier={large ? wordFitMultiplier(engine.name, 21, sheetLine - 24, 2) : undefined} style={{ fontSize: 21, color: theme.ink }}>{engine.name}</Heading><Copy maxFontSizeMultiplier={big} style={{ color: theme.ink, fontSize: 14 }}>Pick a stepping stone, then play.</Copy></View></View>
        <LearnerChip compact/>
        {id==='code-lab'&&<Copy>Ages 9–14, with the top challenges for older learners and grown-ups.</Copy>}
        <Copy maxFontSizeMultiplier={big}>{saved && !finished ? "Starting a new round replaces this round. Your other games stay saved." : options.stage && !engine.ownLevels && !engine.nativeStages ? "Choose a skill to explore. Pictures and help stay available at every level." : engine.description}</Copy>
        <LevelPath game={id} level={levelOf(options)} onChoose={chooseLevel} progress={store.save.school} />
        {challenge&&!comfort.youngChild&&<Button quiet maxFontSizeMultiplier={big} onPress={()=>openChallenge()}>Challenge</Button>}
        {engine.modes.length > 1 && (
          <>
            <Heading maxFontSizeMultiplier={large ? wordFitMultiplier("How shall we play?", 18, sheetLine, 2) : undefined} style={{ fontSize: 18 }}>How shall we play?</Heading>
            <View style={[styles.row, { flexWrap: "wrap" }]}>
              {engine.modes.map((mode) => (
                <Chip key={mode} selected={options.mode === mode} onPress={() => setOptions({ ...options, mode })}>
                  {engine.modeLabels?.[mode] ?? modeLabel[mode]}
                </Chip>
              ))}
            </View>
          </>
        )}
        {twoPlayer && (
          <>
            <PlayerNames names={names} onChange={setNames} remembered={remembered} labels={["First player", "Second player"]} />
            <Heading maxFontSizeMultiplier={large ? wordFitMultiplier("Who goes first?", 18, sheetLine, 2) : undefined} style={{ fontSize: 18 }}>Who goes first?</Heading>
            <View style={[styles.row, { flexWrap: "wrap" }]}>
              {([0, 1] as const).map((seat) => (
                <Chip key={seat} selected={starter === seat} onPress={() => setStarter(seat)}>
                  {names[seat].trim() || `Player ${seat + 1}`}
                </Chip>
              ))}
            </View>
            {options.mode === "versus" && (
              <ToggleRow label="Take turns starting" detail="Swap who goes first after each round" value={alternate} onChange={setAlternate} />
            )}
          </>
        )}
        {!options.stage && engine.mathControls && (
          <>
            <Heading maxFontSizeMultiplier={large ? wordFitMultiplier("What shall we practise?", 18, sheetLine, 2) : undefined} style={{ fontSize: 18 }}>What shall we practise?</Heading>
            <View style={[styles.row, { flexWrap: "wrap" }]}>
              {(["add", "subtract", "mixed"] as const).map((operation) => (
                <Chip key={operation} selected={(options.mathOperation ?? "add") === operation} onPress={() => setOptions({ ...options, mathOperation: operation })}>
                  {operation === "add" ? "Add" : operation === "subtract" ? "Subtract" : "Add & subtract"}
                </Chip>
              ))}
            </View>
          </>
        )}
        {!options.stage && engine.languages && engine.languages.length > 1 && (
          <>
            <Heading maxFontSizeMultiplier={large ? wordFitMultiplier("Words in", 18, sheetLine, 2) : undefined} style={{ fontSize: 18 }}>Words in</Heading>
            <View style={[styles.row, { flexWrap: "wrap" }]}>
              {engine.languages.map((language) => (
                <Chip key={language} selected={options.language === language} onPress={() => setOptions({ ...options, language })}>
                  {languageLabel[language]}
                </Chip>
              ))}
            </View>
          </>
        )}
      </Sheet>
      <Sheet visible={help} onClose={() => { stopSound(); setHelp(false); }} title={`How to play ${engine.name}`}>
        {/* At accessibility sizes the instructions run several screens, so Hear comes first for a child who can't read them yet. */}
        {!large && helpText}
        {hear}
        {large && helpText}
        {saved && !finished && (
          <Button
            icon="help"
            maxFontSizeMultiplier={big}
            onPress={() => {
              stopSound();
              setHelp(false);
              assistance();
              setReplayCoach(true);
            }}
          >
            Show me how
          </Button>
        )}
        <Button
          quiet
          maxFontSizeMultiplier={big}
          onPress={() => {
            stopSound();
            setHelp(false);
            openSetup();
          }}
        >
          Choose a fresh round
        </Button>
      </Sheet>
    </SafeAreaView>
  );
}
