import React, { useCallback, useEffect, useRef, useState } from "react";
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
  const [epoch] = useState(store.epoch);
  const expected = useRef<{ id: string | null; revision?: number }>({ id: saved?.id ?? null, revision: saved?.revision });
  const remembered = store.save.players ?? [];
  const [setup, setSetup] = useState(false),
    [help, setHelp] = useState(false),
    [options, setOptions] = useState<LearnOptions>(
      saved?.options ?? { mode: engine.modes[0], pace: "easy", ...(engine.languages ? { language: engine.languages[0] } : {}) }
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
  const soundOn = store.save.settings.sound;
  const { play: sound, stop: stopSound } = useSoundControls(soundOn && focused);
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
  }, [markCoached, id]);
  const cheerLine = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(cheerLine.current), []);
  const cheer = useCallback(
    (kind: "right" | "big" = "right", say?: string) => {
      setBurst((b) => ({ n: b.n + 1, big: kind === "big" }));
      sound(kind === "big" ? "win" : "match");
      if (kind === "big") feel("success");
      clearTimeout(cheerLine.current);
      if (say) cheerLine.current = setTimeout(() => sound(say), kind === "big" ? 900 : 550);
    },
    [sound]
  );
  // Say the game's goal once when a fresh round opens, so a non-reader knows what to do.
  const introduced = useRef<string | null>(null);
  const boardActive = appActive && focused && !setup && !help;
  useEffect(() => {
    if (!saved || !engine.introAudio || !soundOn || !boardActive) return;
    if (saved.revision !== 0 || introduced.current === saved.id) return;
    introduced.current = saved.id;
    const timer = setTimeout(() => sound(engine.introAudio!), 450);
    return () => clearTimeout(timer);
  }, [saved, engine.introAudio, soundOn, boardActive, sound]);

  const { learnUpdate, practice } = store;
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
      if (!saved) return;
      const revision = Math.max(saved.revision, expected.current.revision ?? 0) + 1;
      save({ ...saved, state, revision });
    },
    [saved, save]
  );

  function start() {
    const next = startSession(id, { options, names, starter: options.mode === "solo" ? 0 : starter, alternate }, store.save.skills);
    if (options.mode !== "solo") store.rememberPlayers(names);
    if (save(next)) setSetup(false);
  }
  function replay() {
    if (!saved || !finished) return;
    save(replaySession(saved, store.save.skills));
  }
  function openSetup() {
    if (saved) {
      setOptions(saved.options);
      setAlternate(saved.match?.alternate ?? true);
      setStarter(saved.starter ?? 0);
    }
    setSetup(true);
  }
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const twoPlayer = options.mode !== "solo";
  const turn = saved && engine.turn && saved.options.mode !== "solo" && !finished ? engine.turn(saved.state, saved.options) : null;
  const boardWidth = Math.min(width - insets.left - insets.right - 56, 900);
  const Board = view.Board;

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { maxWidth: 1280, paddingHorizontal: 16 }]}>
        <GameHeader
          title={engine.name}
          onBack={back}
          sound={{ on: soundOn, toggle: () => store.settings({ sound: !soundOn }) }}
          onHelp={() => setHelp(true)}
        />
        {saved && (
          <Copy style={{ fontSize: 12, marginBottom: 8 }}>
            {(engine.modeLabels?.[saved.options.mode] ?? modeLabel[saved.options.mode]) +
              " · " +
              (engine.paceLabels?.[saved.options.pace] ?? paceLabel[saved.options.pace]) +
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
              skills={store.save.skills ?? {}}
              sound={sound}
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
        <Copy>{saved && !finished ? "Starting a new round replaces this round. Your other games stay saved." : engine.description}</Copy>
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
        <Heading style={{ fontSize: 18 }}>Choose your pace</Heading>
        <View style={[styles.row, { flexWrap: "wrap" }]}>
          {(["easy", "medium", "hard"] as const).map((pace) => (
            <Chip key={pace} selected={options.pace === pace} onPress={() => setOptions({ ...options, pace })}>
              {engine.paceLabels?.[pace] ?? paceLabel[pace]}
            </Chip>
          ))}
        </View>
        {engine.paceHelp?.[options.pace] && <Copy style={{ fontSize: 14 }}>{engine.paceHelp[options.pace]}</Copy>}
        {engine.languages && engine.languages.length > 1 && (
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
        <Copy>{engine.help}</Copy>
        {engine.helpAudio && (
          <>
            <Button icon="sound-on" onPress={() => sound(engine.helpAudio!)} disabled={!soundOn}>
              Listen to the instructions
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
