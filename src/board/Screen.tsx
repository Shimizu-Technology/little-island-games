import React, { useCallback, useEffect, useState } from "react";
import { AppState, Platform, ScrollView, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Button, C, Chip, Copy, GameHeader, Heading, Label, Sheet, Status, ToggleRow, styles } from "../components/ui";
import { Celebrate } from "../learn/Celebrate";
import { PlayerNames, Scoreboard } from "../components/Match";
import { Recovery } from "../components/Recovery";
import { SaveStatus } from "../components/SaveStatus";
import { useSounds } from "../components/Audio";
import { useStore } from "../state/Store";
import { Seat } from "../games/match";
import { BoardId, BoardSession, catalog, createSession, engines, playAgain, strengths, Strength, undo } from "./index";
import { Text } from "../components/Text";
import { BoardArt, Piece } from "./Art";
import { Boards, demoPosition } from "./Boards";
import { coordinate } from "./hidden-canoes/engine";
import { edgeDots } from "./fishing-nets/engine";
const strengthNames = { gentle: "Gentle", growing: "Growing", challenge: "Challenge" };
const back = () =>
  router.canGoBack() ? router.back() : router.replace({ pathname: "/shelf", params: { island: "classic" } });
export function BoardScreen({ game }: { game: BoardId }) {
  const store = useStore(),
    [setup, setSetup] = useState(false),
    s = store.save.board?.[game];
  if (!store.ready)
    return (
      <SafeAreaView style={styles.page}>
        <Heading>Getting your board ready…</Heading>
      </SafeAreaView>
    );
  if (store.recovery)
    return (
      <SafeAreaView style={styles.page}>
        <Recovery />
      </SafeAreaView>
    );
  if (!s || setup)
    return (
      <Setup
        key={`${game}:${store.epoch}`}
        game={game}
        previous={s}
        onClose={() => setSetup(false)}
        onStart={(next) => {
          if (store.boardUpdate(game, next, s, store.epoch)) {
            if (next.mode === "together") store.rememberPlayers(next.match.names);
            setSetup(false);
          }
        }}
      />
    );
  return <Round key={`${s.id}:${store.epoch}`} session={s} onSetup={() => setSetup(true)} />;
}
function Setup({
  game,
  previous,
  onStart,
  onClose,
}: {
  game: BoardId;
  previous?: BoardSession;
  onStart: (s: BoardSession) => void;
  onClose: () => void;
}) {
  const store = useStore(),
    info = catalog[game];
  const [mode, setMode] = useState<"solo" | "together">(previous?.mode ?? "solo"),
    [strength, setStrength] = useState<Strength>(previous?.strength ?? "gentle"),
    [size, setSize] = useState(previous?.position.size ?? info.sizes[0]),
    [names, setNames] = useState<[string, string]>(previous?.mode === "together" ? previous.match.names : ["", ""]),
    [starter, setStarter] = useState<Seat>(previous?.position.starter ?? 0),
    [alternate, setAlternate] = useState(previous?.match.alternate ?? true);
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { maxWidth: 640, gap: 16 }]}
      >
        <GameHeader title={info.name} onBack={previous ? onClose : back} backLabel={previous ? "Back" : "Games"} />
        <View style={{ alignItems: "center", gap: 8 }}>
          <BoardArt game={game} size={116} />
          <Heading style={{ textAlign: "center" }}>{info.name}</Heading>
          <Copy style={{ textAlign: "center" }}>{info.description}</Copy>
        </View>
        <Copy>{info.rule}</Copy>
        {game !== "reef-sweep" && (
          <>
            <Label>Who is playing?</Label>
            <View style={[styles.row, { flexWrap: "wrap" }]}>
              <Chip selected={mode === "solo"} onPress={() => setMode("solo")}>
                With the computer
              </Chip>
              <Chip selected={mode === "together"} onPress={() => setMode("together")}>
                Two players
              </Chip>
            </View>
            {mode === "solo" ? (
              <>
                <Label>Computer strength</Label>
                <View style={[styles.row, { flexWrap: "wrap" }]}>
                  {strengths.map((level) => (
                    <Chip key={level} selected={strength === level} onPress={() => setStrength(level)}>
                      {strengthNames[level]}
                    </Chip>
                  ))}
                </View>
                <Copy style={{ fontSize: 14 }}>
                  {strength === "gentle"
                    ? "A relaxed companion for a first game."
                    : strength === "growing"
                      ? "Plans a little further. Take your time."
                      : "Looks ahead and notices useful patterns."}
                </Copy>
              </>
            ) : (
              <PlayerNames names={names} onChange={setNames} remembered={store.save.players} />
            )}
            <Label>Who starts?</Label>
            <View style={[styles.row, { flexWrap: "wrap" }]}>
              {([0, 1] as const).map((seat) => (
                <Chip key={seat} selected={starter === seat} onPress={() => setStarter(seat)}>
                  {mode === "solo" ? (seat === 0 ? "You" : "Computer") : names[seat].trim() || `Player ${seat + 1}`}
                </Chip>
              ))}
            </View>
            <ToggleRow
              label="Alternate who starts"
              detail="Swap the starting player when you play again."
              value={alternate}
              onChange={setAlternate}
            />
          </>
        )}
        {info.sizes.length > 1 && (
          <>
            <Label>Board size</Label>
            <View style={[styles.row, { flexWrap: "wrap" }]}>
              {info.sizes.map((n) => (
                <Chip key={n} selected={size === n} onPress={() => setSize(n)}>
                  {n} × {n}
                  {game === "reef-sweep" ? (n === 5 ? " · Gentle" : n === 6 ? " · Growing" : " · Challenge") : " boxes"}
                </Chip>
              ))}
            </View>
          </>
        )}
        {previous && (
          <Copy>
            Starting replaces this game’s saved round and begins a fresh family score. Use Play again after a result to
            keep the score.
          </Copy>
        )}
        <Button
          onPress={() =>
            onStart({
              ...createSession(game, {
                mode,
                strength,
                size,
                starter,
                names: mode === "solo" ? ["You", "Computer"] : names,
                alternate,
              }),
              taught: previous?.taught ?? false,
            })
          }
        >
          Start {info.name}
        </Button>
        {previous && (
          <Button quiet onPress={onClose}>
            Continue saved round
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
function Round({ session: s, onSetup }: { session: BoardSession; onSetup: () => void }) {
  const store = useStore(),
    info = catalog[s.game],
    engine = engines[s.game],
    p = s.position,
    insets = useSafeAreaInsets(),
    { width } = useWindowDimensions(),
    play = useSounds(store.save.settings.sound);
  const available = Math.max(280, Math.min(width - insets.left - insets.right - 40, 560));
  const [help, setHelp] = useState(false),
    [demo, setDemo] = useState(0),
    [visible, setVisible] = useState<string | null>(null),
    [hint, setHint] = useState<number | null>(null),
    [flag, setFlag] = useState(false),
    [notice, setNotice] = useState("");
  const teaching = help || !s.taught,
    token = `${store.epoch}:${s.id}:${p.moves.length}:${p.turn}`;
  const secret = s.game === "hidden-canoes" && p.outcome === null,
    ai = s.mode === "solo" && p.turn === 1 && s.game !== "reef-sweep" && p.outcome === null;
  const concealed = secret && !ai && visible !== token,
    locked = teaching || ai || concealed;
  const conceal = useCallback(() => setVisible(null), []);
  useFocusEffect(
    useCallback(
      () => () => {
        conceal();
      },
      [conceal]
    )
  );
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") conceal();
    });
    const hide = () => conceal();
    if (Platform.OS === "web") {
      document.addEventListener("visibilitychange", hide);
      window.addEventListener("blur", hide);
    }
    return () => {
      sub.remove();
      if (Platform.OS === "web") {
        document.removeEventListener("visibilitychange", hide);
        window.removeEventListener("blur", hide);
      }
    };
  }, [conceal]);
  const commit = useCallback((next: BoardSession) => store.boardUpdate(s.game, next, s, store.epoch), [store, s]);
  useEffect(() => {
    if (!ai || teaching) return;
    const timer = setTimeout(() => {
      const action = engine.choose(p, s.strength);
      if (action !== null) {
        const position = engine.move(p, action);
        if (commit({ ...s, position })) play(position.outcome !== null ? "win" : "tap");
      }
    }, 380);
    return () => clearTimeout(timer);
  }, [ai, teaching, engine, p, s, commit, play]);
  const move = (action: number) => {
    if (locked) return;
    const position = engine.move(p, action);
    if (position === p) {
      setNotice(
        flag
          ? p.moves.length >= 400
            ? "This reef has had plenty of flag changes. You can still remove flags and open pearls."
            : "That space is already open."
          : "Remove the flag before opening this space."
      );
      return;
    }
    if (commit({ ...s, position })) {
      setHint(null);
      setNotice("");
      if (secret) conceal();
      play(
        position.outcome !== null && !(s.game === "reef-sweep" && position.outcome === 1)
          ? "win"
          : position.scores[p.turn] > p.scores[p.turn]
            ? "match"
            : "tap"
      );
      if (s.game === "hidden-canoes") {
        const text = `${coordinate(action)} · ${position.scores[p.turn] > p.scores[p.turn] ? "Canoe found!" : "Open water."}`;
        setNotice(text);
        play(`board-coordinate-${coordinate(action).toLowerCase()}`);
      }
    }
  };
  const showHint = () => {
    const action = engine.choose(p, "challenge");
    setHint(action);
    if (action === null) {
      setNotice(
        s.game === "reef-sweep"
          ? "No certain next step from the visible numbers. Check your flags; a careful guess may be needed."
          : "No move is available."
      );
      return;
    }
    if (s.game === "coconut-drop")
      setNotice(`Try column ${action + 1}. Look for four in a line and block the other shape.`);
    else if (s.game === "shell-pits")
      setNotice(
        `Try ${p.turn === 0 ? "circle" : "square"} pit ${action < 6 ? action + 1 : action - 6}. Preview its last shell before sowing.`
      );
    else if (s.game === "fishing-nets") {
      const [a, b] = edgeDots(p.size, action);
      const dot = (i: number) => `${String.fromCharCode(65 + (i % (p.size + 1)))}${Math.floor(i / (p.size + 1)) + 1}`;
      setNotice(`Try tying ${dot(a)} to ${dot(b)}. Close a box, avoid its third side, or offer the smallest chain.`);
    } else if (s.game === "hidden-canoes")
      setNotice(`Try ${coordinate(action)}. Search beside a find, then explore new water.`);
    else {
      setFlag(action >= p.board.length);
      setNotice(
        !p.marks.includes(1)
          ? "The middle is a safe first opening."
          : action >= p.board.length
            ? "A visible number needs every remaining touching space to be an urchin. Flag the ringed tile if your other flags are correct."
            : "A visible number already has all its urchins flagged. The ringed tile is safe if those flags are correct."
      );
    }
    play("tap");
  };
  const finishTeaching = () => {
    setHelp(false);
    setDemo(0);
    if (!s.taught) commit({ ...s, taught: true });
  };
  const title =
    p.outcome === null
      ? ai
        ? "Computer is thinking…"
        : concealed
          ? `Pass to ${s.match.names[p.turn]}`
          : s.game === "reef-sweep"
            ? "A little pearl hunt"
            : `${s.match.names[p.turn]}’s turn`
      : s.game === "reef-sweep"
        ? p.outcome === 0
          ? "Every pearl found!"
          : "An urchin lives here."
        : p.outcome === "draw"
          ? "A good draw!"
          : `${s.match.names[p.outcome]} wins!`;
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={[styles.content, { maxWidth: 680, paddingHorizontal: 20, gap: 12 }]}>
        <GameHeader
          title={info.name}
          backLabel="Games"
          onBack={() => {
            conceal();
            back();
          }}
          sound={{ on: store.save.settings.sound, toggle: () => store.settings({ sound: !store.save.settings.sound }) }}
          onHelp={() => {
            conceal();
            setHelp(true);
          }}
        />
        <SaveStatus />
        {s.game !== "reef-sweep" && (
          <Scoreboard
            match={s.match}
            result={p.outcome}
            active={p.outcome === null ? p.turn : null}
            marks={
              s.game === "coconut-drop"
                ? [<Piece key="0" kind="coconut" size={28} />, <Piece key="1" kind="coconut" seat={1} size={28} />]
                : [
                    <Text key="0" style={{ fontSize: 26, color: "#805538" }}>
                      ●
                    </Text>,
                    <Text key="1" style={{ fontSize: 26, color: C.teal }}>
                      ■
                    </Text>,
                  ]
            }
          />
        )}
        <Status
          title={title}
          success={p.outcome !== null && (s.game !== "reef-sweep" || p.outcome === 0)}
          detail={
            p.outcome !== null
              ? s.game === "reef-sweep"
                ? p.outcome === 0
                  ? "You gave the sea urchins room and found their pearl neighbors."
                  : "You can undo the last opening or try a new reef. Take your time."
                : "Your family score includes this round. Play again to carry it forward."
              : s.game === "reef-sweep"
                ? "First tap is safe. Open every pearl space."
                : `${s.mode === "solo" ? strengthNames[s.strength] + " computer" : "Family match"} · ${s.game === "shell-pits" ? (p.turn === 0 ? "Circle side below" : "Square side above") : s.game === "fishing-nets" ? "Closing a box gives another turn." : s.game === "hidden-canoes" ? "Find all seven canoe spaces." : "Four in a line wins."}`
          }
        />
        {p.outcome !== null && (
          <View style={{ alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 10 }}>
            <BoardArt game={s.game} size={80} />
            <Celebrate burst={s.game === "reef-sweep" && p.outcome === 1 ? 0 : 1} />
            <Heading style={{ fontSize: 23 }}>
              {s.game === "reef-sweep" && p.outcome === 1 ? "Let’s explore again" : "Well played together"}
            </Heading>
          </View>
        )}
        {concealed ? (
          <View style={{ padding: 24, gap: 16, alignItems: "center", backgroundColor: "#DEEDEF", borderRadius: 24 }}>
            <BoardArt game="hidden-canoes" size={110} />
            <Heading style={{ fontSize: 24, textAlign: "center" }}>Keep the lagoon private</Heading>
            <Copy style={{ textAlign: "center" }}>
              Only {s.match.names[p.turn]} should look. Pass the device, then open your turn. Your chart stays hidden
              after leaving or reloading.
            </Copy>
            <Button
              onPress={() => {
                setVisible(token);
                setNotice("");
              }}
            >
              I’m {s.match.names[p.turn]} · open my turn
            </Button>
          </View>
        ) : secret && ai ? (
          <View style={{ alignItems: "center", padding: 24 }}>
            <BoardArt game="hidden-canoes" size={100} />
            <Copy>Your chart is covered while the computer searches.</Copy>
          </View>
        ) : (
          <>
            {s.game === "reef-sweep" && (
              <View style={[styles.row, { justifyContent: "center", flexWrap: "wrap" }]}>
                <Chip selected={!flag} onPress={() => setFlag(false)}>
                  Open pearls
                </Chip>
                <Chip selected={flag} onPress={() => setFlag(true)}>
                  Flag urchins
                </Chip>
              </View>
            )}
            <Boards
              key={`${s.id}:${p.moves.length}:${visible === token}`}
              game={s.game}
              state={p}
              width={available}
              onMove={move}
              locked={locked || p.outcome !== null}
              hint={hint}
              flag={flag}
              speak={play}
            />
          </>
        )}
        {!!notice && !concealed && (
          <Copy style={{ padding: 12, backgroundColor: C.sand, borderRadius: 12, color: C.ink }}>{notice}</Copy>
        )}
        <View style={[styles.row, { flexWrap: "wrap", justifyContent: "center" }]}>
          {p.outcome === null && !concealed && (
            <Button quiet compact disabled={locked} onPress={showHint}>
              Hint
            </Button>
          )}
          {(s.mode === "solo" || s.game === "reef-sweep") && s.game !== "hidden-canoes" && (
            <Button
              quiet
              compact
              disabled={teaching || undo(s) === s}
              onPress={() => {
                const next = undo(s);
                if (commit(next)) {
                  setHint(null);
                  setNotice("");
                  play("tap");
                }
              }}
            >
              Undo
            </Button>
          )}
          {secret && !concealed && !ai && (
            <Button quiet compact onPress={conceal}>
              Cover my turn
            </Button>
          )}
          {p.outcome !== null && <Button onPress={() => commit(playAgain(s, Date.now() >>> 0))}>Play again</Button>}
          <Button
            quiet
            compact
            onPress={() => {
              conceal();
              onSetup();
            }}
          >
            New game
          </Button>
        </View>
        <Copy style={{ fontSize: 12, textAlign: "center" }}>Saved on this device · No rush, take your time.</Copy>
      </ScrollView>
      <Sheet
        visible={teaching}
        title={`Show me · ${info.name}`}
        onClose={finishTeaching}
        footer={<Button onPress={finishTeaching}>Ready to play</Button>}
      >
        <Copy>{info.lesson}</Copy>
        <View style={{ alignItems: "center" }}>
          <Boards
            key={`${s.game}:demo:${demo}`}
            game={s.game}
            state={demoPosition(s.game, demo)}
            width={Math.min(available, 420)}
            hint={
              demo === 0
                ? { "coconut-drop": 3, "fishing-nets": 13, "shell-pits": 2, "hidden-canoes": 14, "reef-sweep": 12 }[
                    s.game
                  ]
                : null
            }
            onMove={() => {}}
            locked
            speak={play}
          />
        </View>
        <Button
          quiet
          onPress={() => {
            setDemo(demo === 0 ? 1 : 0);
            play(`board-teach-${s.game}`);
          }}
        >
          {demo === 0 ? "Show the move" : "Watch again"}
        </Button>
        <Copy>{info.rule}</Copy>
        <Button quiet compact onPress={() => play(`board-rules-${s.game}`)}>
          Hear the rules
        </Button>
      </Sheet>
    </SafeAreaView>
  );
}
