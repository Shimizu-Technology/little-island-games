import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, ScrollView, TextInput, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { GameId, GameState, Options, createGame, difficultyLabel, gameIds, games, isFinished } from "../games";
import { defaultOptions } from "../games/types";
import { positionKey } from "../games/checkers";
import { createWord, customWord, WORDS } from "../games/words";
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
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions(),
    store = useStore(),
    s = store.save.sessions[id],
    g = games[id];
  const [setup, setSetup] = useState(false),
    [help, setHelp] = useState(false),
    [options, setOptions] = useState<Options>(s?.options ?? defaultOptions),
    [category, setCategory] = useState("All"),
    [secret, setSecret] = useState(""),
    [error, setError] = useState(""),
    [active, setActive] = useState(AppState.currentState === "active");
  const sound = useSounds(store.save.settings.sound),
    finished = s ? isFinished(s) : false,
    wasFinished = useRef(finished);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => setActive(state === "active"));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (finished && !wasFinished.current) sound("win");
    wasFinished.current = finished;
  }, [finished, sound]);
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
    setOptions(s?.options ?? defaultOptions);
    setSecret("");
    setError("");
    setSetup(true);
  }
  const boardProps = {
    width: Math.min(width - insets.left - insets.right - 32, 720),
    sound,
    help: store.save.settings.help,
    active: active && !setup && !help,
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
        <View style={[styles.row, { paddingVertical: 18, justifyContent: "space-between", flexWrap: "wrap" }]}>
          <Button quiet onPress={() => router.replace("/")}>
            ‹ Games
          </Button>
          <View style={[styles.row, { gap: 8 }]}>
            <Button quiet onPress={() => store.settings({ sound: !store.save.settings.sound })}>
              {store.save.settings.sound ? "Sound on" : "Sound off"}
            </Button>
            <Button quiet onPress={() => setHelp(true)}>
              How to play
            </Button>
          </View>
        </View>
        <Label style={{ color: g.color, marginTop: 8 }}>{g.tag}</Label>
        <Heading style={{ fontSize: width > 600 ? 37 : 31, marginTop: 7, marginBottom: 9 }}>{g.name}</Heading>
        {s && (
          <Copy style={{ fontSize: 13, marginBottom: 22 }}>
            {difficultyLabel[s.options.difficulty]} · {s.options.mode === "together" ? g.together : g.solo}
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
          <WordBoard {...boardProps} state={s} commit={commit} />
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
        {s && (
          <View
            style={{ alignItems: "center", marginTop: 28, paddingTop: 21, borderTopWidth: 1, borderTopColor: C.line }}
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
        <Heading style={{ fontSize: 18 }}>Choose your pace</Heading>
        <View style={[styles.row, { flexWrap: "wrap" }]}>
          {(["easy", "medium", "hard"] as const).map((d) => (
            <Chip key={d} selected={options.difficulty === d} onPress={() => setOptions({ ...options, difficulty: d })}>
              {difficultyLabel[d]}
            </Chip>
          ))}
        </View>
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
            pairs. Take a peek whenever you need one.
          </Copy>
        )}
        {id === "numbers" && (
          <Copy>
            {options.difficulty === "easy" ? "One die and numbers 1–6." : "Two dice and numbers 1–9."} You can use a
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
