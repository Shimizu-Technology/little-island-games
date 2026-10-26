import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AppState, ScrollView, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useIsFocused } from "expo-router";
import { useStore } from "../state/Store";
import { useSoundControls } from "../components/Audio";
import { SaveStatus } from "../components/SaveStatus";
import { Button, C, Chip, Copy, GameHeader, Heading, Sheet, ToggleRow, styles } from "../components/ui";
import { PlayerNames, Scoreboard } from "../components/Match";
import type { Seat } from "../games/match";
import { engines } from "./engines";
import { GrowthBoard } from "./growth/Board";
import { growthProgress, growthQuestions } from "./growth/engine";
import type { GrowthState } from "./growth/types";
import { foundationLabels, growthTrack } from "./growth/content";
import { activeLearner, readyForNext } from "./learners";
import { views } from "./views";
import { Celebrate } from "./Celebrate";
import { LearnArt } from "./LearnArt";
import { feel } from "../components/feel";
import { outcomeOf, replaySession, startSession } from "./session";
import type { Language, LearnId, LearnMode, LearnOptions, LearnSession, Pace } from "./types";

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
    { width, height } = useWindowDimensions();
  const engine = engines[id],
    view = views[id];
  const saved = store.save.learn?.[id];
  const scroll = useRef<ScrollView | null>(null);
  const growthState = saved?.options.stage ? saved.state as GrowthState : undefined;
  const growthStep = saved && growthState ? growthProgress(growthState, growthQuestions(id, saved.options, growthState)).index : undefined;
  useLayoutEffect(() => {
    if (growthStep !== undefined) scroll.current?.scrollTo({ y: 0, animated: false });
  }, [growthStep, saved?.id]);
  const learner = activeLearner(store.save.learning);
  const learningSkills = learner.id === "family" ? store.save.skills : learner.skills;
  const [epoch] = useState(store.epoch);
  const expected = useRef<{ id: string | null; revision?: number }>({ id: saved?.id ?? null, revision: saved?.revision });
  const remembered = store.save.players ?? [];
  const [setup, setSetup] = useState(false),
    [help, setHelp] = useState(false),
    [options, setOptions] = useState<LearnOptions>(
      (saved && (saved.learner ?? "family") === learner.id ? saved.options : learner.choices[id]) ?? { mode: engine.modes[0], pace: "easy", ...(engine.languages ? { language: engine.languages[0] } : {}) }
    ),
    [names, setNames] = useState<[string, string]>(
      saved?.names && !saved.names.every((n, i) => n === `Player ${i + 1}`) ? saved.names : ["", ""]
    ),
    [starter, setStarter] = useState<Seat>(0),
    [alternate, setAlternate] = useState(saved?.match?.alternate ?? true),
    [appActive, setAppActive] = useState(AppState.currentState === "active" || AppState.currentState == null);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => setAppActive(state === "active"));
    return () => sub.remove();
  }, []);
  const soundOn = store.save.settings.sound && (store.save.settings.narration ?? true);
  const { play: sound, stop: stopSound } = useSoundControls(store.save.settings.sound && focused);
  const result = saved ? outcomeOf(saved) : null,
    finished = result !== null,
    notWon = saved && result === "done" && engine.notWon ? engine.notWon(saved.state, saved.options) : null,
    wasFinished = useRef(finished);
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
  const cheer = useCallback(
    (kind: "right" | "big" = "right", say?: string) => {
      if (!boardActive || liveFeedback.current !== feedbackContext) return;
      setBurst((b) => ({ n: b.n + 1, big: kind === "big" }));
      sound(kind === "big" ? "win" : "match");
      if (kind === "big") feel("success");
      clearTimeout(cheerLine.current);
      if (say) cheerLine.current = setTimeout(() => {
        if (liveFeedback.current === feedbackContext) sound(say, true);
      }, kind === "big" ? 900 : 550);
    },
    [sound, boardActive, feedbackContext]
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
    if (!saved || !engine.introAudio || !soundOn || !boardActive || saved.options.stage) return;
    if (saved.revision !== 0 || introduced.current === saved.id) return;
    introduced.current = saved.id;
    const timer = setTimeout(() => sound(engine.introAudio!, true), 450);
    return () => clearTimeout(timer);
  }, [saved, engine.introAudio, soundOn, boardActive, sound]);

  const { learnUpdate, practiceOwned } = store;
  const practice = useCallback((skill: string, correct: boolean) => {
    if (!saved || !boardActive) return;
    practiceOwned(id, { id: saved.id, revision: saved.revision, epoch }, skill, correct);
  }, [saved, boardActive, practiceOwned, id, epoch]);
  const save = useCallback(
    (next: LearnSession) => {
      const accepted = learnUpdate(id, next, { ...expected.current, epoch });
      if (accepted) expected.current = { id: next.id, revision: next.revision };
      return accepted;
    },
    [learnUpdate, id, epoch]
  );
  const update = useCallback(
    (state: unknown) => {
      if (!saved || !boardActive || store.epoch !== epoch) return;
      const revision = Math.max(saved.revision, expected.current.revision ?? 0) + 1;
      save({ ...saved, state, revision });
    },
    [saved, save, boardActive, store.epoch, epoch]
  );

  function start() {
    const next = startSession(id, { options, names, starter: options.mode === "solo" ? 0 : starter, alternate }, learningSkills);
    next.learner = learner.id;
    if (options.mode !== "solo") store.rememberPlayers(names);
    if (save(next)) { setBurst({ n: 0, big: false }); setSetup(false); }
  }
  function replay() {
    if (!saved || !finished) return;
    const next = replaySession(saved, learningSkills, undefined, learner.id);
    if (save(next)) setBurst({ n: 0, big: false });
  }
  function openSetup() {
    if (saved) {
      setOptions((saved.learner ?? "family") === learner.id ? saved.options : { ...saved.options, ...(learner.choices[id] ?? {}), stage: learner.choices[id]?.stage });
      setAlternate(saved.match?.alternate ?? true);
      setStarter(saved.starter ?? 0);
    }
    setSetup(true);
  }
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const twoPlayer = options.mode !== "solo";
  const turn = saved && engine.turn && saved.options.mode !== "solo" && !finished ? engine.turn(saved.state, saved.options) : null;
  const boardWidth = Math.min(width - insets.left - insets.right - 56, 900);
  const Board = saved?.options.stage ? GrowthBoard : view.Board;

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView key={saved?.id ?? "setup"} ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { maxWidth: 1280, paddingHorizontal: 16 }]}>
        <GameHeader
          title={engine.name}
          onBack={back}
          sound={{ on: store.save.settings.sound, toggle: () => store.settings({ sound: !store.save.settings.sound }) }}
          onHelp={() => setHelp(true)}
        />
        {saved && (
          <Copy style={{ fontSize: 12, marginBottom: 8 }}>
            {(engine.modeLabels?.[saved.options.mode] ?? modeLabel[saved.options.mode]) +
              " · " +
              (saved.options.stage ? growthTrack(id, saved.options.stage)?.label : foundationLabels[id][["easy", "medium", "hard"].indexOf(saved.options.pace)] ?? engine.paceLabels?.[saved.options.pace] ?? paceLabel[saved.options.pace]) +
              (!saved.options.stage && engine.mathControls ? ` · ${saved.options.mathOperation === "mixed" ? "Add & subtract" : saved.options.mathOperation === "subtract" ? "Subtract" : "Add"}` : "") +
              (saved.options.language && engine.languages && engine.languages.length > 1 ? ` · ${languageLabel[saved.options.language]}` : "")}
          </Copy>
        )}
        <SaveStatus />
        {saved?.match && <Scoreboard match={saved.match} result={result === "done" ? null : result} active={turn} />}
        {saved && (
          <View style={{ backgroundColor: engine.surface, borderRadius: 22, padding: 12 }}>
            <Board
              key={saved.id}
              session={saved}
              update={update}
              practice={practice}
              notePractice={store.notePractice}
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
            <Celebrate burst={burst.n} big={burst.big} />
          </View>
        )}
        {saved && (
          <View style={{ alignItems: "center", gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line }}>
            {finished && (
              <View
                accessibilityLiveRegion="polite"
                style={{ alignItems: "center", gap: 8, padding: 16, borderRadius: 22, backgroundColor: C.success, alignSelf: "stretch" }}
              >
                <LearnArt island={engine.island} size={64} />
                <Heading style={{ fontSize: 26, textAlign: "center" }}>
                  {result === 0 || result === 1
                    ? `${saved.match?.names[result] ?? saved.names?.[result] ?? "You"} won this round!`
                    : result === "draw"
                      ? "A tie! Great playing."
                      : (notWon ?? "You did it!")}
                </Heading>
                <Button icon="refresh" onPress={replay} style={{ minWidth: 220 }}>
                  Play again
                </Button>
              </View>
            )}
            {(saved.learner ?? "family") !== learner.id && <Copy style={{ textAlign: "center" }}>This saved round belongs to {store.save.learning?.people.find(p => p.id === (saved.learner ?? "family"))?.name ?? "Family practice"}. New rounds use {learner.name}.</Copy>}
            {saved.options.stage === "stretch" && learner.id !== "family" && (saved.learner ?? "family") === learner.id && readyForNext(learner, id, "stretch", [...new Set(growthTrack(id, "stretch")?.questions.map(q => q.skill) ?? [])]) && finished && <Button quiet onPress={() => { setOptions({ ...saved.options, stage: "deep" }); setSetup(true); }}>Ready to explore {growthTrack(id, "deep")?.label}?</Button>}
            {/* Options are for grown-ups and changing modes; kept small so it's never the obvious tap mid-game. */}
            <Button compact quiet onPress={openSetup}>
              New round & options
            </Button>
            <Copy style={{ fontSize: 12, marginTop: 4, textAlign: "center" }}>Your round saves on this device.</Copy>
          </View>
        )}
      </ScrollView>
      <Sheet
        visible={setup || !saved}
        onClose={() => (saved ? setSetup(false) : back())}
        title={saved ? "A fresh round" : `Let’s play ${engine.name}`}
        footer={<Button onPress={start}>{saved ? "Start a new round" : "Start playing"}</Button>}
      >
        <Copy>{saved && !finished ? "Starting a new round replaces this round. Your other games stay saved." : options.stage ? "Choose a skill to explore. Pictures and help stay available at every level." : engine.description}</Copy>
        {engine.modes.length > 1 && (
          <>
            <Heading style={{ fontSize: 18 }}>How shall we play?</Heading>
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
            <Heading style={{ fontSize: 18 }}>Who goes first?</Heading>
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
            <Heading style={{ fontSize: 18 }}>What shall we practise?</Heading>
            <View style={[styles.row, { flexWrap: "wrap" }]}>
              {(["add", "subtract", "mixed"] as const).map((operation) => (
                <Chip key={operation} selected={(options.mathOperation ?? "add") === operation} onPress={() => setOptions({ ...options, mathOperation: operation })}>
                  {operation === "add" ? "Add" : operation === "subtract" ? "Subtract" : "Add & subtract"}
                </Chip>
              ))}
            </View>
          </>
        )}
        <Heading style={{ fontSize: 18 }}>Choose what to explore</Heading>
        <View style={[styles.row, { flexWrap: "wrap" }]}>
          {(engine.paces ?? (["easy", "medium", "hard"] as const)).map((pace) => (
            <Chip key={pace} selected={!options.stage && options.pace === pace} onPress={() => setOptions({ ...options, pace, stage: undefined })}>
              {foundationLabels[id][["easy", "medium", "hard"].indexOf(pace)] ?? engine.paceLabels?.[pace] ?? paceLabel[pace]}
            </Chip>
          ))}
          {(["stretch", "deep"] as const).map(stage => growthTrack(id, stage) && <Chip key={stage} selected={options.stage === stage} onPress={() => setOptions({ ...options, stage, language: undefined })}>{growthTrack(id, stage)!.label}</Chip>)}
        </View>
        {options.stage && <Copy>{growthTrack(id, options.stage)?.description} {options.mode === "versus" ? "Four ideas, two turns each." : "Three ideas, no clock."} Show me is always available.</Copy>}
        {!options.stage && engine.paceHelp?.[options.pace] && <Copy style={{ fontSize: 14 }}>{engine.paceHelp[options.pace]}</Copy>}
        {!options.stage && engine.languages && engine.languages.length > 1 && (
          <>
            <Heading style={{ fontSize: 18 }}>Words in</Heading>
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
      <Sheet visible={help} onClose={() => setHelp(false)} title={`How to play ${engine.name}`}>
        <Copy>{saved?.options.stage ? "Read or hear the question, then choose an answer or put the pieces in order. Show me explains the idea and counts as helped practice. Take your time, then tap Next idea. Pictures and demonstrations stay available at every stage." : engine.help}</Copy>
        {!saved?.options.stage && engine.helpAudio && (
          <>
            <Button icon="sound-on" onPress={() => sound(engine.helpAudio!)} disabled={!soundOn}>
              Hear a quick guide
            </Button>
            {!soundOn && <Copy>Turn sound on to hear the instructions.</Copy>}
          </>
        )}
        {saved && !finished && (
          <Button
            icon="help"
            onPress={() => {
              setHelp(false);
              setReplayCoach(true);
            }}
          >
            Show me how
          </Button>
        )}
        <Button
          quiet
          onPress={() => {
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
