import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, ScrollView, TextInput, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, router, useLocalSearchParams, useIsFocused } from "expo-router";
import { GameId, GameState, Options, createGame, difficultyLabel, gameIds, games, isFinished } from "../games";
import { defaultOptions } from "../games/types";
import { positionKey } from "../games/checkers";
import { createWord, customWord, guessLetter, wordHint, wordRules, wordStatus, WORDS } from "../games/words";
import { useStore } from "../state/Store";
import { Button, C, Chip, Copy, Heading, Label, Sheet, styles } from "../components/ui";
import { useSounds } from "../components/Audio";
import { Recovery } from "../components/Recovery";
import { CheckersBoard, MemoryBoard, MazeBoard, NumbersBoard, TicBoard, WordBoard } from "../screens/GameBoards";
export default function Play() {
  const params = useLocalSearchParams<{ game?: string }>(),
    id = params.game as GameId;
  if (!gameIds.includes(id)) return <Redirect href="/" />;
  return <Game key={id} id={id} />;
}
function Game({ id }: { id: GameId }) {
  const insets = useSafeAreaInsets(), focused = useIsFocused();
  const { width } = useWindowDimensions(),
    store = useStore(),
    s = store.save.sessions[id],
    g = games[id];
  const [setup, setSetup] = useState(false),
    [help, setHelp] = useState(false),
    [options, setOptions] = useState<Options>(
      s?.options ?? { ...defaultOptions, ...(id === "checkers" ? { checkersRules: "friendly" as const } : {}) }
    ),
    [category, setCategory] = useState("All"),
    [secret, setSecret] = useState(""),
    [error, setError] = useState(""),
    [active, setActive] = useState(AppState.currentState === "active");
  const sound = useSounds(store.save.settings.sound && focused),
    finished = s ? isFinished(s) : false,
    wasFinished = useRef(finished);
  const lostWord = s?.game === "word-rescue" && wordStatus(s) === "lost";
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => setActive(state === "active"));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (finished && !wasFinished.current) sound(lostWord ? "tap" : "win");
    wasFinished.current = finished;
  }, [finished, sound, lostWord]);
  const update = store.update;
  const commit = useCallback((next: GameState) => update(id, next, s), [id, s, update]);
  function start() {
    let next: GameState;
    if (id === "word-rescue") {
      if (options.mode === "together") {
        const custom = customWord(options, secret);
        if (!custom) {
          setError("Use one word with 2–12 letters, A to Z.");
          return;
        }
        next = custom;
      } else next = createWord(options, category, s?.game === "word-rescue" ? s.seen : []);
    } else next = createGame(id, options);
    store.update(id, next);
    setSetup(false);
    setSecret("");
    setError("");
  }
  function newRound() {
    setOptions(
      s?.options ?? { ...defaultOptions, ...(id === "checkers" ? { checkersRules: "friendly" as const } : {}) }
    );
    setSecret("");
    setError("");
    setSetup(true);
  }
  const boardProps = {
    width: Math.min(width - insets.left - insets.right - 32, 720),
    sound,
    help: store.save.settings.help,
    active: active && focused && !setup && !help,
  };
  if (!store.ready)
    return (
      <SafeAreaView style={styles.page}>
        <Copy>Opening your game…</Copy>
      </SafeAreaView>
    );
  if (store.recovery)
    return (
      <SafeAreaView style={styles.page}>
        <Recovery />
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { maxWidth: 800, paddingHorizontal: 16 }]}
      >
        <View style={[styles.row, { paddingVertical: 12, justifyContent: "space-between", flexWrap: "wrap" }]}>
          <Button compact quiet onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}>
            ‹ Games
          </Button>
          <View style={[styles.row, { gap: 8 }]}>
            <Button
              compact
              quiet
              label={store.save.settings.sound ? "Sound on. Turn sound off" : "Sound off. Turn sound on"}
              onPress={() => store.settings({ sound: !store.save.settings.sound })}
            >
              {store.save.settings.sound ? "Sound on" : "Sound off"}
            </Button>
            <Button compact quiet onPress={() => setHelp(true)}>
              How to play
            </Button>
          </View>
        </View>
        <Label style={{ color: g.color, marginTop: 5 }}>{g.tag}</Label>
        <Heading style={{ fontSize: width > 600 ? 34 : 28, marginTop: 5, marginBottom: 5 }}>{g.name}</Heading>
        {s && (
          <Copy style={{ fontSize: 13, marginBottom: 15 }}>
            {s.game === "word-rescue" ? (s.custom ? "" : `${({ easy: "Short words", medium: "Longer words", hard: "Big words" })[s.options.difficulty]} · `) : `${difficultyLabel[s.options.difficulty]} · `}{s.options.mode === "together" ? g.together : g.solo}
            {s.game === "word-rescue" && ` · ${wordRules(s) === "challenge" ? "Six-guess Challenge" : "Practice"}`}
            {s.game === "numbers" && s.options.difficulty === "hard" && s.maxNumber === undefined && " · Earlier round: numbers 1–9"}
            {id === "checkers" &&
              (s.game === "checkers" && s.lesson !== null
                ? " · Classic practice lesson"
                : ` · ${s.options.checkersRules === "friendly" ? "Friendly · jumps optional" : "Classic · must jump"}`)}
          </Copy>
        )}
        {store.error && (
          <View
            accessibilityRole="alert"
            style={{ padding: 15, backgroundColor: "#FBE8DE", borderRadius: 16, marginBottom: 16, gap: 8 }}
          >
            <Copy>{store.error}</Copy>
            <Button quiet onPress={() => void store.retry()}>
              Try saving again
            </Button>
          </View>
        )}
        {s?.game === "tic-tac-toe" ? (
          <TicBoard key={`${s.id}:${s.history.length}`} {...boardProps} state={s} commit={commit} />
        ) : s?.game === "word-rescue" ? (
          <WordBoard
            {...boardProps}
            state={s}
            commit={commit}
            guess={(letter) =>
              store.act(id, s.id, (current) =>
                current.game === "word-rescue" ? guessLetter(current, letter) : current
              )
            }
            reveal={() =>
              store.act(id, s.id, (current) => (current.game === "word-rescue" ? wordHint(current) : current))
            }
          />
        ) : s?.game === "memory" ? (
          <MemoryBoard
            key={`${s.id}:${s.turns}:${s.open.join()}:${s.matched.length}`}
            {...boardProps}
            state={s}
            commit={commit}
          />
        ) : s?.game === "checkers" ? (
          <CheckersBoard
            key={`${s.id}:${s.history.length}:${positionKey(s.position.board, s.position.turn)}`}
            {...boardProps}
            state={s}
            commit={commit}
          />
        ) : s?.game === "maze" ? (
          <MazeBoard key={`${s.id}:${s.path.join()}`} {...boardProps} state={s} commit={commit} />
        ) : s?.game === "numbers" ? (
          <NumbersBoard {...boardProps} state={s} commit={commit} />
        ) : null}
        {s?.game === "word-rescue" && store.save.wordRecords && (
          <Copy style={{ textAlign: "center", fontSize: 13, marginTop: 20 }}>
            Challenge record: {store.save.wordRecords.wins} won · {store.save.wordRecords.losses} lost ·{" "}
            {store.save.wordRecords.assistedWins} assisted wins
            {store.save.wordRecords.bestWrong !== null
              ? ` · Best: ${store.save.wordRecords.bestWrong} wrong guesses without a hint`
              : ""}
          </Copy>
        )}
        {s && (
          <View
            style={{ alignItems: "center", marginTop: 20, paddingTop: 18, borderTopWidth: 1, borderTopColor: C.line }}
          >
            <Button onPress={newRound}>{finished ? "Play a fresh round" : "New round & options"}</Button>
            <Copy style={{ fontSize: 12, marginTop: 12, textAlign: "center" }}>
              Your current round saves on this device.
            </Copy>
          </View>
        )}
      </ScrollView>
      <Sheet
        visible={setup || !s}
        onClose={() => (s ? setSetup(false) : router.replace("/"))}
        title={s ? "A fresh little round" : `Let’s play ${g.name}`}
      >
        <Copy>
          {s && !finished
            ? "Starting a new round replaces this game’s current round. Your other games stay saved."
            : g.description}
        </Copy>
        <Heading style={{ fontSize: 18 }}>How shall we play?</Heading>
        <View style={[styles.row, { flexWrap: "wrap" }]}>
          <Chip selected={options.mode === "solo"} onPress={() => setOptions({ ...options, mode: "solo" })}>
            {g.solo}
          </Chip>
          <Chip selected={options.mode === "together"} onPress={() => setOptions({ ...options, mode: "together" })}>
            {g.together}
          </Chip>
        </View>
        {!(id === "word-rescue" && options.mode === "together") && <>
        <Heading style={{ fontSize: 18 }}>{id === "word-rescue" ? "Word length" : "Choose your pace"}</Heading>
        <View style={[styles.row, { flexWrap: "wrap" }]}>
          {(["easy", "medium", "hard"] as const).map((d) => (
            <Chip key={d} selected={options.difficulty === d} onPress={() => setOptions({ ...options, difficulty: d })}>
              {id === "word-rescue" ? ({ easy: "Short words", medium: "Longer words", hard: "Big words" })[d] : difficultyLabel[d]}
            </Chip>
          ))}
        </View>
        </>}
        {id === "word-rescue" && (
          <>
            <Heading style={{ fontSize: 18 }}>Choose your rules</Heading>
            <View style={[styles.row, { flexWrap: "wrap" }]}>
              <Chip
                selected={options.wordRules !== "practice"}
                onPress={() => setOptions({ ...options, wordRules: "challenge" })}
              >
                Challenge
              </Chip>
              <Chip
                selected={options.wordRules === "practice"}
                onPress={() => setOptions({ ...options, wordRules: "practice" })}
              >
                Practice
              </Chip>
            </View>
            <Copy>
              {options.wordRules === "practice"
                ? "Unlimited attempts and letter hints. Practice rounds do not change your Challenge record."
                : "Find the word before six wrong letter guesses. One optional hint marks the result assisted."}
            </Copy>
          </>
        )}
        {id === "checkers" && (
          <>
            <Heading style={{ fontSize: 18 }}>Choose your rules</Heading>
            <View style={[styles.row, { flexWrap: "wrap" }]}>
              <Chip
                selected={options.checkersRules === "friendly"}
                onPress={() => setOptions({ ...options, checkersRules: "friendly" })}
              >
                Friendly
              </Chip>
              <Chip
                selected={options.checkersRules !== "friendly"}
                onPress={() => setOptions({ ...options, checkersRules: "classic" })}
              >
                Classic
              </Chip>
            </View>
            <Copy>
              {options.checkersRules === "friendly"
                ? "Jumps are optional. Choose a jump or move another piece. Once you start a jump chain, finish it with the same piece."
                : "Standard American checkers: take a jump whenever one is available, and finish the whole jump chain."}
            </Copy>
            <Copy style={{ fontSize: 13 }}>
              The computer follows the same rules. Changing rules starts a new round.
            </Copy>
          </>
        )}
        {id === "tic-tac-toe" && options.mode === "solo" && (
          <View style={[styles.row, { flexWrap: "wrap" }]}>
            <Chip selected={!options.computerFirst} onPress={() => setOptions({ ...options, computerFirst: false })}>
              I’ll start · X
            </Chip>
            <Chip selected={options.computerFirst} onPress={() => setOptions({ ...options, computerFirst: true })}>
              Computer starts · X
            </Chip>
          </View>
        )}
        {id === "word-rescue" &&
          (options.mode === "together" ? (
            <>
              <Copy>A grown-up chooses a secret word, then passes the device. The word stays hidden while typing.</Copy>
              <TextInput
                accessibilityLabel="Secret family word"
                placeholder="One secret word"
                value={secret}
                onChangeText={setSecret}
                secureTextEntry
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                style={styles.input}
              />
            </>
          ) : (
            <>
              <Heading style={{ fontSize: 18 }}>Pick a word pack</Heading>
              <View style={[styles.row, { flexWrap: "wrap" }]}>
                {["All", ...new Set(WORDS.map((w) => w[1]))].map((c) => (
                  <Chip key={c} selected={category === c} onPress={() => setCategory(c)}>
                    {c}
                  </Chip>
                ))}
              </View>
            </>
          ))}
        {id === "memory" && (
          <Copy>
            {options.difficulty === "easy" ? "Six" : options.difficulty === "medium" ? "Eight" : "Twelve"} picture
            pairs. {options.mode === "solo" ? "Practice with a peek whenever you need one." : "Two-player match: no peeks. Most pairs wins; equal pairs is a tie."}
          </Copy>
        )}
        {id === "numbers" && (
          <Copy>
            {options.difficulty === "easy" ? "Gentle: one die and numbers 1–6." : options.difficulty === "medium" ? "Growing: two dice and numbers 1–9." : "Challenge: two dice and numbers 1–12. Plan which totals to save."} You can use a
            combination hint whenever you like.
          </Copy>
        )}
        {!!error && <Copy style={{ color: "#9C432D" }}>{error}</Copy>}
        <Button onPress={start}>{s ? "Start a new round" : "Start playing"}</Button>
      </Sheet>
      <Sheet visible={help} onClose={() => setHelp(false)} title={`How to play ${g.name}`}>
        <Copy>{g.help}</Copy>
        <Button onPress={() => sound(`instructions-${id}`)} disabled={!store.save.settings.sound}>
          Listen to the instructions
        </Button>
        {!store.save.settings.sound && <Copy>Turn sound on to hear the instructions.</Copy>}
        {s?.game === "word-rescue" && (
          <>
            <Heading style={{ fontSize: 18 }}>This round: {wordRules(s) === "practice" ? "Practice" : "Challenge"}</Heading>
            <Copy>{wordRules(s) === "practice"
              ? "Unlimited attempts and letter hints. Practice does not change your Challenge record."
              : "Six wrong letters end the round. One optional letter hint marks the result assisted."}</Copy>
            <Button quiet onPress={() => { setHelp(false); newRound(); }}>Choose rules for a fresh round</Button>
          </>
        )}
        {id === "checkers" && (
          <Copy>
            The four little lessons are below the board. “Back to my game” restores your full round. Your board keeps
            the same direction for both players.
          </Copy>
        )}
      </Sheet>
    </SafeAreaView>
  );
}
