import { styles as baseStyles, C as BaseC, Heading as BaseHeading, Copy as BaseCopy, Button as BaseButton, Chip as BaseChip , GameHeader, Sheet, ToggleRow } from "../components/ui";
import { Icon } from "../components/Icon";
import { useNunitoLoaded } from "../ui/fonts";
import { IslandBackdrop, RoundProgress, subjectTheme } from "./LearnChrome";
import { LagoonHintScroll } from './LagoonHintScroll';
import { BoardSpaceProvider, BoardSpaceContent } from './BoardSpace';
import { boardCardInner, boardCardPadding, cheerPillClear, companionBeside, layoutMatchesWindow, measuredBoardSpace, schoolEntryReveal, MEASURED_SCHOOL_BOARDS, type Box } from './boardGeometry';
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
import { AppState, ScrollView, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useIsFocused } from "expo-router";
import { useStore } from "../state/Store";
import { hasSpeech, useSoundControls } from "../components/Audio";
import { SaveStatus } from "../components/SaveStatus";
import { LARGE_TEXT, wordFitMultiplier } from "../components/wordFit";
import { TextFit } from "../components/Text";
import { StepReveal } from "./stepReveal";
import { PlayerNames, Scoreboard } from "../components/Match";
import type { Seat } from "../games/match";
import { engines } from "./engines";
import { GrowthBoard } from "./growth/Board";
import { helpForState as codeLabHelp } from "./games/code-lab/engine";
import { growthProgress, growthQuestions, isGrowth } from "./growth/engine";
import type { GrowthState } from "./growth/types";
import { LevelPath } from "./LevelPath";
import { levelOf, levelTitle, optionsAtLevel, type LearningLevel } from "./levels";
import { roundStars } from "./schoolProgress";
import { activeLearner, familyLearners } from "./learners";
import { setPartner as setScalePartner, type ScaleState } from "./games/shell-scale/engine";
import { views } from "./views";
import { GridInteraction } from "../puzzles/grid/preferences";
import { LastPicnicWord } from "./games/hafa-adai/view";
import type { IslandState } from "./games/hafa-adai/engine";
import { Celebrate } from "./Celebrate";
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
  const scroll = useRef<ScrollView | null>(null), lagoonOffset = useRef(0);
  const lagoonScroll = useMemo(() => id === "logic-lagoon" ? { scroll, offset: lagoonOffset } : null, [id]);
  // A board that owns a touch (Slip Tide's water) holds the page scroll until release, as Cove grids do.
  const [held, setHeld] = useState(false);
  const layoutKey = `${width}x${height}`;
  const [viewport, setViewport] = useState({ height: 0, width: 0, key: "" });
  const [boardLayout, setBoardLayout] = useState({ top: 0, inset: 0, width: 0, topAt: 0, insetAt: 0 });
  // Where a phone's cheer line may be drawn: its row and the in-flow boxes it must stay clear of (F-frame-3 fix 1).
  const [cheerFit, setCheerFit] = useState<Record<"row" | "mode" | "chip" | "pill", Box | null>>({ row: null, mode: null, chip: null, pill: null });
  const fit = useCallback((key: "row" | "mode" | "chip" | "pill") => (event: LayoutChangeEvent) => {
    const { x, y, width: w, height: h } = event.nativeEvent.layout;
    setCheerFit(old => old[key]?.x === x && old[key]?.y === y && old[key]?.width === w && old[key]?.height === h ? old : { ...old, [key]: { x, y, width: w, height: h } });
  }, []);
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
    scroll.current?.scrollTo({ y: (large || height < 500) && sameRound && boardTop.current !== null ? Math.max(0, boardTop.current + boardInset.current - 8) : 0, animated: false });
  }, [growthStep, saved?.id, large, height]);
  // Other step games (a story page, the next question) ask for the same return through `useStepReveal`.
  const revealBoard = useCallback(() => {
    if (boardTop.current !== null) scroll.current?.scrollTo({ y: Math.max(0, boardTop.current + boardInset.current - 8), animated: false });
  }, []);
  const reveal = useCallback(() => { if (large) revealBoard(); }, [large, revealBoard]);
  const learner = activeLearner(store.save.learning);
  const partners = useMemo(
    () => (store.save.learning ?? familyLearners()).people.filter(p => p.id !== learner.id).map(p => ({ id: p.id, name: p.name })),
    [store.save.learning, learner.id],
  );
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
  const [partnerChoice, setPartnerChoice] = useState<{ identity: string; id: string | null }>(() => ({
    identity,
    id: id === "shell-scale" && saved && (saved.learner ?? "family") === learner.id ? (saved.state as ScaleState).partner ?? null : null,
  }));
  const partnerId = partnerChoice.identity === identity
    ? partnerChoice.id
    : (id === "shell-scale" && saved && (saved.learner ?? "family") === learner.id ? (saved.state as ScaleState).partner ?? null : null);
  const setPartnerId = (next: string | null) => setPartnerChoice({ identity, id: next });
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
  // `done` is the last burst that finished (or was never drawn), kept here so a remount of the board card, which crossing
  // the 600-pt companion breakpoint causes, doesn't play a finished burst again.
  const [burst, setBurst] = useState({ n: 0, big: false, done: 0 });
  const burstDone = useCallback((n: number) => setBurst(b => b.n === n && b.done !== n ? { ...b, done: n } : b), []);
  useEffect(() => {
    if (finished && !wasFinished.current && !notWon) {
      sound("win");
      setBurst((b) => ({ ...b, n: b.n + 1, big: true }));
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
      setBurst((b) => ({ ...b, n: b.n + 1, big: kind === "big" }));
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
      if (!saved || expected.current.id !== saved.id || !boardActive || store.epoch !== epoch) return false;
      const revision = Math.max(saved.revision, expected.current.revision ?? 0) + 1;
      if (save({ ...saved, state, revision })) {
        if (isGrowth(saved.state)) {
          const next = state as GrowthState;
          if (next.history.at(-1)?.type === "answer" && next.history !== (saved.state as GrowthState).history) {
            const progress = growthProgress(next, growthQuestions(id, saved.options, next));
            reactCompanion(progress.solved ? "correct" : "incorrect");
          }
        } else if (isMathGame(id) && (state as MathRound).wrong !== null && !(state as MathRound).solved) reactCompanion("incorrect");
        return true;
      }
      return false;
    },
    [saved, save, boardActive, store.epoch, epoch, id, reactCompanion]
  );

  function start() {
    const chosenPartner = id === "shell-scale" && options.mode === "together" && partnerId ? partners.find(p => p.id === partnerId) ?? null : null;
    const startNames: [string, string] = chosenPartner && !names[0].trim() && !names[1].trim() ? [learner.name, chosenPartner.name] : names;
    let next = startSession(id, { options, names: startNames, starter: options.mode === "solo" ? 0 : starter, alternate }, learningSkills);
    if (chosenPartner) next = { ...next, state: setScalePartner(next.state as ScaleState, chosenPartner.id) };
    next.learner = learner.id;
    if (options.mode !== "solo") store.rememberPlayers(startNames);
    if (save(next)) { stopSound(); setBurst({ n: 0, big: false, done: 0 }); setSetup(false); }
  }
  function replay() {
    if (!saved || !finished) return;
    // A different learner starts with their own remembered choices, never the other child's level.
    const next = (saved.learner ?? "family") === learner.id
      ? replaySession(saved, learningSkills, undefined, learner.id)
      : startSession(id, { options: learner.choices[id] ?? { mode: engine.modes[0], pace: (["easy","medium","hard"] as const)[Math.min(3,comfort.opening)-1], ...(comfort.opening>3 ? {stage:comfort.opening===4 ? "stretch" as const : "deep" as const} : {}), ...(engine.languages ? { language: engine.languages[0] } : {}) } }, learningSkills);
    next.learner = learner.id;
    if (save(next)) { stopSound(); setBurst({ n: 0, big: false, done: 0 }); }
  }
  function openSetup() {
    if (saved) {
      setOptions((saved.learner ?? "family") === learner.id ? saved.options : learner.choices[id] ?? { mode: engine.modes[0], pace: (["easy","medium","hard"] as const)[Math.min(3,comfort.opening)-1], ...(comfort.opening>3 ? {stage:comfort.opening===4 ? "stretch" as const : "deep" as const} : {}), ...(engine.languages ? { language: engine.languages[0] } : {}) });
      setAlternate(saved.match?.alternate ?? true);
      setStarter(saved.starter ?? 0);
      if (id === "shell-scale") setPartnerId((saved.state as ScaleState).partner ?? null);
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
  // F-frame-3: the card's real content width, after its gutters, border, padding and any islander beside it.
  const islanderBeside = companionBeside(width, height) && store.save.settings.learningIslander !== false;
  const cardInner = boardCardInner(width, insets.left, insets.right, islanderBeside);
  const revealEntry = schoolEntryReveal(id, large, height);
  // A burst the revealed board doesn't draw counts as played, so a later rotation to a card that does draw it cannot start it late.
  if (revealEntry && !finished && burst.done !== burst.n) setBurst(b => ({ ...b, done: b.n }));
  const liveBurst = burst.done === burst.n ? 0 : burst.n;
  // An AX board's one entry reveal waits for the greeting to end, when the page has settled. F-frame-3: the greeting is
  // drawn over the page, so its end no longer moves the board or brings a fresh board layout to wait for; on a tablet it
  // no longer lengthens the page either, so revealing before the page settled stopped short (iPad mini AX5, 52 pt).
  // Only that first greeting waits. A rotation, or a right or wrong answer's cheer, has nothing to settle, so a reveal for
  // a new window never waits out a 1,200-ms reaction: once the round's greeting has passed, it is passed.
  const round = `${learner.id}:${saved?.id ?? "setup"}`;
  const [greeted, setGreeted] = useState("");
  if (companionEvent !== "entry" && greeted !== round) setGreeted(round);
  // Window dimensions and layout events arrive in either order. The reveal is consumed only against offsets the native
  // layout has delivered for this window (its viewport's width is the window's), never against the previous window's.
  const geometryFresh = layoutMatchesWindow(viewport.width, width, insets.left, insets.right);
  const anchorReady = (!large || greeted === round) && geometryFresh;
  const boardSpace = useMemo(() => viewport.height > 0 && boardLayout.width > 0 ? {
    width: boardLayout.width,
    // AX and short-landscape entry reveal put the board 8 pt below the viewport top. Other windows
    // reserve all real header/progress content above it. Scroll position is never
    // part of this budget, so scrolling cannot cause the board to grow or shrink.
    height: measuredBoardSpace(viewport.height, revealEntry ? 8 : boardLayout.top, revealEntry ? 0 : boardLayout.inset, boardCardPadding(width) + 2),
    large, reveal: revealEntry, layoutKey, anchorReady,
  } : null, [viewport, boardLayout, large, width, revealEntry, layoutKey, anchorReady]);
  // A measured board is told its measured width, which the card estimate already matches. Unmeasured boards keep
  // their earlier caps: 900 pt, or 812 beside the islander.
  const boardWidth = MEASURED_SCHOOL_BOARDS.has(id) ? boardSpace?.width ?? cardInner : Math.min(cardInner, islanderBeside ? 812 : 900);
  // At accessibility sizes, board text without a cap of its own (prompts, answers, results) stops at 2x, or where its
  // longest word still fits the board. Reading is never timed and Hear stays available, so it stays large without
  // filling the screen. Default sizes never change.
  // A 32-pt heading would reach 64 pt at 2x, so nothing in a board is drawn above 44 pt (about a 22-pt line at 2x).
  const boardFit = useMemo(() => large ? { width: boardWidth, ceiling: 2, maxSize: 44 } : null, [large, boardWidth]);
  // The result card ("You did it!") follows the same rule inside its 20-pt padding and 3-pt border.
  const resultFit = useMemo(() => large ? { width: width - insets.left - insets.right - 32 - 46, ceiling: 2, maxSize: 44 } : null, [large, width, insets.left, insets.right]);
  const Board = saved && isGrowth(saved.state) ? GrowthBoard : view.Board;
  const island = id === "hafa-adai" ? "reading" : engine.island;
  const theme = subjectTheme[island];
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
  // F-frame-3: the cheer line is drawn over the page, never laid out in it, so it can't move or resize the board when it
  // comes and goes. A phone shows it at the right end of the mode row, rising from the row's bottom into the free space
  // below the islander (it never hangs below the pinned header); a tablet beside the islander (above it when the islander
  // stands beside the card, to its left when below).
  // A phone's line is drawn only where it leaves the mode label and learner chip clear, so a long mode ("Together: two
  // directions each") or a long name, which wrap the row, never have text painted over. It stays mounted so the live region
  // still speaks it. A tablet's line stays inside its column and the 16-pt gutter beside it: a pill wider than the column
  // (about 102 pt) wraps its words rather than reaching past the gutter.
  const cheerPill = cheerText && <View accessibilityLiveRegion="polite" onLayout={phone ? fit("pill") : undefined} style={{ backgroundColor: C.paper, borderRadius: 16, paddingHorizontal: 12, ...(phone ? { paddingVertical: 2 } : { paddingVertical: 5, borderWidth: 2, borderColor: theme.accent, maxWidth: "100%" }) }}><Copy maxFontSizeMultiplier={small} style={{ color: theme.ink, fontWeight: "900", ...(phone ? {} : { textAlign: "center" }) }}>{cheerText}</Copy></View>;
  const pillClear = cheerPillClear(cheerFit.row, large ? [cheerFit.chip, cheerFit.mode] : [cheerFit.mode], cheerFit.pill);
  const phoneCheer = phone && cheerPill && saved && !finished && <View pointerEvents="none" testID="learn-cheer-phone" style={{ position: "absolute", bottom: 0, right: 0, opacity: pillClear ? 1 : 0 }}>{cheerPill}</View>;
  const islanderCheer = <View style={{ alignSelf: "stretch" }}>{cheerPill && <View pointerEvents="none" testID="learn-cheer-tablet" style={islanderBeside
    ? { position: "absolute", bottom: 4, left: -12, right: -12, alignItems: "center" }
    : { position: "absolute", top: 0, right: "100%", width: 240, height: 112, marginRight: 8, alignItems: "flex-end", justifyContent: "center" }}>{cheerPill}</View>}</View>;
  // Sheet text runs across the sheet (a 560-pt card on wide screens) inside its 22-pt padding.
  const sheetLine = (width >= 600 ? Math.min(560, width - 48) : width) - 44;
  const fontsLoaded = useNunitoLoaded();
  const header = <View style={{ gap: 4 }}>
        <LearnerChip compact/>
        {bar}
        {level}
        {phone && saved && <View onLayout={fit("row")}>
          <BaseCopy onLayout={fit("mode")} maxFontSizeMultiplier={small} style={{ ...(fontsLoaded ? {fontFamily: "Nunito_600SemiBold", fontWeight: "normal"} : {}), fontSize: 12, color: theme.ink, backgroundColor: theme.sky, alignSelf: "flex-start", paddingHorizontal: 4 }}>{modeText}</BaseCopy>
          {phoneCheer}
        </View>}

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
            {saved && <BaseCopy maxFontSizeMultiplier={small} style={{ ...(fontsLoaded ? {fontFamily: "Nunito_600SemiBold", fontWeight: "normal"} : {}), fontSize: 12, color: theme.ink, backgroundColor: theme.sky, paddingHorizontal: 8, borderRadius: 10, overflow: "hidden" }}>{modeText}</BaseCopy>}
          </View>
          {saved && <RoundProgress session={saved} island={island} colors={theme} finished={finished} inline/>}
        </View>
      </View> : <View testID="learn-header-scrolled" style={{ gap: 4 }}>
        {level}
        {saved && <View onLayout={fit("row")} style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <View onLayout={fit("chip")} style={{ maxWidth: "100%" }}><LearnerChip compact/></View>
          <BaseCopy onLayout={fit("mode")} maxFontSizeMultiplier={small} style={{ ...(fontsLoaded ? {fontFamily: "Nunito_600SemiBold", fontWeight: "normal"} : {}), fontSize: 12, color: theme.ink, backgroundColor: theme.sky, paddingHorizontal: 8, borderRadius: 10, overflow: "hidden" }}>{modeText}</BaseCopy>
          {phoneCheer}
        </View>}
        {!saved && <LearnerChip compact/>}
      </View>;
  const pinned = phone ? (large ? bar : header) : null;
  const scrolled = phone ? (large ? largeLines : null) : large ? <View style={{ gap: 4 }}>{bar}{largeLines}</View> : header;

  const helpText = <Copy>{saved && isGrowth(saved.state) ? "Read or hear the question, then choose an answer or put the pieces in order. Show me explains the idea and counts as helped practice. Take your time, then tap Next idea. Pictures and demonstrations stay available at every stage." : id === "code-lab" ? codeLabHelp(saved?.state) : engine.help}</Copy>;
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
      {/* Above the page, so a cheer drawn at the bottom of the pinned header shows in full over the scrolling content. */}
      {pinned && <View testID="learn-header-pinned" style={{ paddingHorizontal: 16, zIndex: 1 }}>{pinned}</View>}
      <GridInteraction.Provider value={setHeld}>
      <ScrollView {...(id === "logic-lagoon" ? { onScroll: (event: import("react-native").NativeSyntheticEvent<import("react-native").NativeScrollEvent>) => { lagoonOffset.current = event.nativeEvent.contentOffset.y; }, scrollEventThrottle: 16 } : {})} onLayout={event => setViewport({ height: event.nativeEvent.layout.height, width: event.nativeEvent.layout.width, key: layoutKey })} key={saved?.id ?? "setup"} ref={scroll} scrollEnabled={!held} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { maxWidth: 1280, paddingHorizontal: 16 }]}>
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
        {saved && !finished && <View testID="learn-board" onLayout={e => { const top = e.nativeEvent.layout.y; boardTop.current = top; setBoardLayout(old => old.top === top && old.topAt === width ? old : { ...old, top, topAt: width }); }}>
          <LearningCompanion visible={!finished} event={finished ? (notWon ? "loss" : result === "draw" ? "draw" : "complete") : companionEvent} desk={engine.island === "reading" || engine.island === "numbers"} active={boardActive} cheer={islanderCheer}>
          <View style={{ backgroundColor: "#FFFDF8", borderRadius: 28, borderWidth: 2, borderColor: "#E8D8BE", padding: boardCardPadding(width), shadowColor: theme.ink, shadowOpacity: 0.12, shadowOffset: { width: 0, height: 7 }, shadowRadius: 0, elevation: 5 }}>
            {/* F-frame-3: the burst plays over the card's top edge, so it never holds space above the board or moves it. Where
                the board is revealed at the top of the screen (AX, short landscape) that edge is under the pinned bar, and
                the burst would land on the board's own words, so it isn't drawn; the board, the islander and the line say it. */}
            {!revealEntry && <View pointerEvents="none" style={{ position: "absolute", top: burst.big ? -45 : -33, left: 0, right: 0, alignItems: "center", zIndex: 1 }}><Celebrate burst={liveBurst} big={burst.big} onDone={burstDone} /></View>}
            <StepReveal.Provider value={reveal}><TextFit.Provider value={boardFit}><BoardSpaceProvider key={saved.id} geometryEnabled={MEASURED_SCHOOL_BOARDS.has(id)} space={boardSpace} onReveal={revealBoard}>
            <BoardSpaceContent testID="learn-board-inset" onLayout={e => { const layout = e.nativeEvent.layout; boardInset.current = layout.y; setBoardLayout(old => old.inset === layout.y && old.width === layout.width && old.insetAt === width ? old : { ...old, inset: layout.y, width: layout.width, insetAt: width }); }}>
            <LagoonHintScroll.Provider value={lagoonScroll}><Board
              key={saved.id}
              session={saved}
              update={update}
              practice={practice}
              notePractice={store.notePractice}
              assistance={assistance}
              partners={partners}
              skills={learningSkills ?? {}}
              sound={boardSound}
              stopSound={stopSound}
              soundOn={soundOn}
              width={boardWidth}
              height={height - insets.top - insets.bottom}
              active={boardActive}
              coach={{ active: coachActive && boardActive, done: coachDone }}
              cheer={cheer}
            />
            </LagoonHintScroll.Provider></BoardSpaceContent>
            </BoardSpaceProvider></TextFit.Provider></StepReveal.Provider>
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
                <View pointerEvents="none" style={{ position: "absolute", top: 10, left: 0, right: 0, alignItems: "center" }}><Celebrate burst={liveBurst} big onDone={burstDone} /></View>
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
                      : saved.game === "shell-scale" && saved.options.mode === "together"
                        ? "You weighed it out together!"
                        : (notWon ?? "You did it!")}
                </Heading>
                <Copy style={{ color: theme.ink, fontSize: 17, fontWeight: "800", textAlign: "center" }}>
                  {saved.game === "shell-scale" && saved.options.mode === "together"
                    ? (() => {
                        const partner = (saved.state as ScaleState).partner ?? null;
                        const owner = saved.learner ?? "family";
                        const creditedPartner = !!(partner && partner !== owner && store.save.learning?.people.some(p => p.id === partner));
                        return creditedPartner
                          ? "Both people keep this Together finish. Ready for another round?"
                          : "Your Together finish is saved. Ready for another round?";
                      })()
                    : notWon
                      ? "Ready to try the island again?"
                      : "Your stars are shining. Ready for another adventure?"}
                </Copy>
                {ownsResult&&learner.id!=='family'&&challengeProgress&&<ResultOffer progress={challengeProgress} context={context} comfort={comfort} facts={offerFacts} samePuzzle={!!sameBeach} onHear={soundOn&&resultOffer(signal,comfort,offerFacts)?.kind==='harder'&&levelOf(saved.options)<5?()=>sound(`learning-try-level-${levelOf(saved.options)+1}`):undefined} onChange={changeWorking} onChoose={kind=>{
                  if(kind==='dare'||kind==='harder'&&levelOf(saved.options)===5)openChallenge(kind==='dare');
                  else {chooseLevel(Math.max(1,Math.min(5,levelOf(saved.options)+(kind==='easier'?-1:1))) as LearningLevel,saved.options);setSetup(true);}
                }}/>}
                {ownsResult&&!hasOffer&&bridge&&!store.save.settings.learningBridges?.[learner.id]?.includes(id)&&!signal?.[4]&&comfort.offers&&!comfort.youngChild&&<View style={{gap:8}}><Button quiet onPress={()=>{if(store.challengeWorking({bridge:id},{owner:learner.id,epoch,game:id,id:saved.id,revision:saved.revision,kind:'school'}))router.push(bridge.route);}}>{bridge.label}</Button><Button quiet compact onPress={()=>store.challengeWorking({bridge:id},{owner:learner.id,epoch,game:id,id:saved.id,revision:saved.revision,kind:'school'})}>Not now</Button></View>}
                <Button icon="right" onPress={replay} style={{ minWidth: 220, minHeight: 62, backgroundColor: "#FF7A5C", borderColor: "#FF7A5C" }}>
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
        footer={<Button maxFontSizeMultiplier={big} onPress={start} style={{ minHeight: 62, borderRadius: 20, backgroundColor: "#FF7A5C", borderColor: "#FF7A5C" }}>Play this level</Button>}
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
            {id === "shell-scale" && options.mode === "together" && partners.length > 0 && (
              <>
                <Heading maxFontSizeMultiplier={large ? wordFitMultiplier("Playing together with", 18, sheetLine, 2) : undefined} style={{ fontSize: 18 }}>Playing together with</Heading>
                <View style={[styles.row, { flexWrap: "wrap" }]}>
                  <Chip selected={partnerId === null} onPress={() => setPartnerId(null)}>Choose at finish</Chip>
                  {partners.map((p) => (
                    <Chip key={p.id} selected={partnerId === p.id} onPress={() => setPartnerId(p.id)}>
                      {p.name}
                    </Chip>
                  ))}
                </View>
              </>
            )}
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

const C = { ...BaseC, cream: '#FFF6E5', paper: '#FFFDF8', line: '#E8D8BE', ink: '#3D2B24', muted: '#665247', teal: '#9A641A', soft: '#FFF0D2', coral: '#FF7A5C' };
function Heading(props: React.ComponentProps<typeof BaseHeading>) {
 const loaded = useNunitoLoaded();
 return <BaseHeading {...props} style={[{ color: '#3D2B24' }, props.style, loaded ? {fontFamily: 'Nunito_800ExtraBold', fontWeight: 'normal'} : {fontWeight: '800'}]}/>;
}
function Copy(props: React.ComponentProps<typeof BaseCopy>) {
 const loaded = useNunitoLoaded();
 return <BaseCopy {...props} style={[{ color: '#665247' }, props.style, loaded && {fontFamily: 'Nunito_600SemiBold', fontWeight: 'normal'}]}/>;
}
function Button(props: React.ComponentProps<typeof BaseButton>) {
 const loaded = useNunitoLoaded();
 return <BaseButton {...props} icon={undefined} style={{...props.style, backgroundColor: props.quiet ? '#FFFDF8' : '#FF7A5C', borderWidth: props.quiet ? (props.selected ? 2 : 1) : 0, borderColor: props.selected ? '#3D2B24' : props.quiet ? '#E8D8BE' : 'transparent'}} textStyle={{...props.textStyle, color: '#3D2B24', ...(loaded ? {fontFamily: 'Nunito_800ExtraBold', fontWeight: 'normal'} : {})}}>{props.icon && <Icon name={props.icon} size={props.compact ? 18 : 20} color="#3D2B24"/>}{props.children}</BaseButton>;
}
function Chip(props: React.ComponentProps<typeof BaseChip>) {
 return <Button {...props} quiet compact textStyle={props.numberOfLines ? {flexShrink: 1} : undefined} style={{borderRadius: 24, paddingHorizontal: 16, minHeight: 44, flexShrink: props.numberOfLines ? 1 : 0, ...(props.numberOfLines ? {maxWidth: '100%'} : {}), borderWidth: props.selected ? 2 : 1, backgroundColor: '#FFFDF8'}}/>;
}

const styles = { ...baseStyles, page: [baseStyles.page, { backgroundColor: "#FFF6E5" }] };
