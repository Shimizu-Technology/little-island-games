import { BadgeResultCard } from '../badges/ResultCard';
import { Companion } from "../islander/Companion";
import { resultEvent } from "../islander/reactions";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, ScrollView, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Button, C, Chip, Copy, GameHeader, Heading, Label, Sheet, Status, ToggleRow, styles } from "../components/ui";
import { CHROME_MAX, atLarge, wordFitMultiplier } from "../components/wordFit";
import { Celebrate } from "../learn/Celebrate";
import { PlayerNames, Scoreboard } from "../components/Match";
import { Recovery } from "../components/Recovery";
import { SaveStatus } from "../components/SaveStatus";
import { useSounds } from "../components/Audio";
import { useStore } from "../state/Store";
import { useRoundPractice } from "../practice/useRoundPractice";
import { Seat } from "../games/match";
import { BoardId, BoardSession, catalog, createSession, engines, playAgain, strengths, Strength, undo } from "./index";
import { edgeOf } from "./types";
import { computerTask, hintTask, runSteps, runTask, type Cancel } from "../playPolicies/decide";
import { headStartLabel, headStarts, rivalFor } from "../playPolicies/rivals";
import { reviewGame, type KeyMoment } from "../playPolicies/review";
import { Text } from "../components/Text";
import { BoardArt, Piece } from "./Art";
import { Boards, demoPosition } from "./Boards";
import { coordinate, target as canoeTarget } from "./hidden-canoes/engine";
import { hintReason as coconutHintReason } from "./coconut-drop/engine";
import { hintReason as netsHintReason, edgeDots } from "./fishing-nets/engine";
import { coordinate as reefCoordinate, createFallbackPosition, publicHintStep, urchins, type PublicStep } from "./reef-sweep/engine";
import { loadCertifiedFallback, type FallbackCandidate } from "./reef-sweep/fallback";
import { redrawBoardTask, type RedrawCancel } from "./reef-sweep/redrawTask";
const strengthNames = { gentle: "Gentle", growing: "Growing", challenge: "Challenge" };
/** Each board's Challenge puzzles, reached from its setup, and the Challenge ID they're registered under. */
const puzzleLinks = {
  "shell-pits": { game: "shell-pits", label: "Endgame puzzles · win in a few sows" },
  "coconut-drop": { game: "drop-puzzles", label: "Puzzles · win, block and fork" },
  "fishing-nets": { game: "fishing-nets", label: "Chain endings · keep control of the nets" },
  "hidden-canoes": { game: "hidden-canoes", label: "Chart puzzles · find canoes by thinking" },
  "reef-sweep": { game: "reef-sweep", label: "Deduction puzzles · 128 certified no-guess reefs" },
} as const;
const back = () =>
  router.canGoBack() ? router.back() : router.replace({ pathname: "/shelf", params: { island: "classic" } });
export type ReefRedrawOptions = Parameters<typeof redrawBoardTask>[4];
export function BoardScreen({ game, redrawOptions }: { game: BoardId; redrawOptions?: ReefRedrawOptions }) {
  const store = useStore(),
    [setup, setSetup] = useState(false),
    s = store.save.board?.[game];
  const practice = useRoundPractice(game, s);
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
      <>
        <Setup
          key={`${game}:${store.epoch}`}
          game={game}
          previous={s}
          onClose={() => setSetup(false)}
          onStart={(next) =>
            practice.request(() => {
              if (store.boardUpdate(game, next, s, store.epoch)) {
                if (next.mode === "together") store.rememberPlayers(next.match.names);
                setSetup(false);
              }
            })
          }
        />
        {practice.panel}
      </>
    );
  return (
    <>
      <Round
        key={`${s.id}:${store.epoch}`}
        session={s}
        redrawOptions={redrawOptions}
        onSetup={() => setSetup(true)}
        onReplay={() => practice.request(() => store.boardUpdate(game, playAgain(s, Date.now() >>> 0), s, store.epoch))}
      />
      {practice.panel}
    </>
  );
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
    info = catalog[game],
    { width, fontScale } = useWindowDimensions(),
    buttonCap = atLarge(fontScale, 1.3),
    copyCap = atLarge(fontScale, CHROME_MAX),
    titleCap = atLarge(fontScale, wordFitMultiplier(info.name, 26, Math.min(width, 640) - 40, 2));
  const [mode, setMode] = useState<"solo" | "together">(previous?.mode ?? "solo"),
    [strength, setStrength] = useState<Strength>(previous?.strength ?? "gentle"),
    [size, setSize] = useState(previous?.position.size ?? info.sizes[0]),
    [names, setNames] = useState<[string, string]>(previous?.mode === "together" ? previous.match.names : ["", ""]),
    [starter, setStarter] = useState<Seat>(previous?.position.starter ?? 0),
    [alternate, setAlternate] = useState(previous?.match.alternate ?? true),
    [edge, setEdge] = useState(previous?.position.edge?.[0] ?? 0);
  const rival = game === "reef-sweep" ? null : rivalFor(game, strength),
    offers = game === "reef-sweep" ? [] : headStarts(game, size),
    headStart = offers.find((h) => h.amount === edge);
  const headerMax = atLarge(fontScale, wordFitMultiplier(info.name, 21, Math.max(120, Math.min(width, 640) - 180), CHROME_MAX));
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { maxWidth: 640, gap: 16 }]}
      >
        <GameHeader title={info.name} titleMax={headerMax} onBack={previous ? onClose : back} backLabel={previous ? "Back" : "Games"} />
        <View style={{ alignItems: "center", gap: 8 }}>
          <BoardArt game={game} size={116} />
          <Heading maxFontSizeMultiplier={titleCap} style={{ textAlign: "center" }}>{info.name}</Heading>
          <Copy maxFontSizeMultiplier={copyCap} style={{ textAlign: "center" }}>{info.description}</Copy>
        </View>
        <Copy maxFontSizeMultiplier={copyCap}>{info.rule}</Copy>
        {game in puzzleLinks && (
          <Button quiet maxFontSizeMultiplier={buttonCap} onPress={() => router.push({ pathname: "/challenge", params: { game: puzzleLinks[game as keyof typeof puzzleLinks].game } })}>
            {puzzleLinks[game as keyof typeof puzzleLinks].label}
          </Button>
        )}
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
            {mode === "solo" && rival ? (
              <>
                <Label>Choose a rival</Label>
                <View style={[styles.row, { flexWrap: "wrap" }]}>
                  {strengths.map((level) => (
                    <Chip key={level} selected={strength === level} onPress={() => setStrength(level)}>
                      {`${rivalFor(game as Exclude<BoardId, "reef-sweep">, level).name} · ${strengthNames[level]}`}
                    </Chip>
                  ))}
                </View>
                <Copy style={{ fontSize: 14 }}>
                  {rival.name} is {rival.who}. {rival.plays}
                </Copy>
                <Label>Head start</Label>
                <View style={[styles.row, { flexWrap: "wrap" }]}>
                  <Chip selected={!headStart} onPress={() => setEdge(0)}>
                    Even game
                  </Chip>
                  {offers.map((h) => (
                    <Chip key={h.amount} selected={headStart === h} onPress={() => setEdge(h.amount)}>
                      {h.label}
                    </Chip>
                  ))}
                </View>
                <Copy style={{ fontSize: 14 }}>
                  {headStart
                    ? `${headStart.detail} ${rival.name} still plays its best. The head start shows on the board the whole game.`
                    : `No head start. ${rival.name} plays its best either way.`}
                </Copy>
              </>
            ) : (
              <PlayerNames names={names} onChange={setNames} remembered={store.save.players} />
            )}
            <Label>Who starts?</Label>
            <View style={[styles.row, { flexWrap: "wrap" }]}>
              {([0, 1] as const).map((seat) => (
                <Chip key={seat} selected={starter === seat} onPress={() => setStarter(seat)}>
                  {mode === "solo" ? (seat === 0 ? "You" : (rival?.name ?? "Computer")) : names[seat].trim() || `Player ${seat + 1}`}
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
                <Chip key={n} maxFontSizeMultiplier={buttonCap} selected={size === n} onPress={() => setSize(n)}>
                  {n} × {n}
                  {game === "reef-sweep" ? ` · ${urchins(n)} urchins` : " boxes"}
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
          maxFontSizeMultiplier={buttonCap}
          onPress={() =>
            onStart({
              ...createSession(game, {
                mode,
                strength,
                size,
                starter,
                names: mode === "solo" ? ["You", rival?.name ?? "Computer"] : names,
                alternate,
                edge: mode === "solo" && headStart ? [headStart.amount, 0] : undefined,
              }),
              taught: previous?.taught ?? false,
            })
          }
        >
          Start {info.name}
        </Button>
        {previous && (
          <Button quiet maxFontSizeMultiplier={buttonCap} onPress={onClose}>
            Continue saved round
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
function Round({
  session: s,
  redrawOptions,
  onSetup,
  onReplay,
}: {
  session: BoardSession;
  redrawOptions?: ReefRedrawOptions;
  onSetup: () => void;
  onReplay: () => void;
}) {
  const store = useStore(),
    info = catalog[s.game],
    engine = engines[s.game],
    p = s.position,
    insets = useSafeAreaInsets(),
    { width, height, fontScale } = useWindowDimensions(),
    play = useSounds(store.save.settings.sound);
  const wide = s.game === "reef-sweep" ? width >= 660 && width > height : width >= 900 && width > height;
  const buttonCap = atLarge(fontScale, 1.3);
  const copyCap = atLarge(fontScale, CHROME_MAX);
  const innerWidth = Math.max(240, width - insets.left - insets.right - 40);
  const reefWideCol = Math.floor((innerWidth - 16) * (1.15 / 2.15));
  const available =
    s.game === "reef-sweep" && wide
      ? Math.max(220, Math.min(reefWideCol, Math.min(440, height - insets.top - insets.bottom - 120)))
      : Math.max(
          280,
          Math.min(
            wide ? width * 0.52 - 48 : innerWidth,
            wide ? Math.min(440, height - insets.top - insets.bottom - 96) : 560
          )
        );
  const success = p.outcome !== null && p.outcome !== "draw" && (s.mode !== "solo" || p.outcome === 0);
  const [help, setHelp] = useState(false),
    [demo, setDemo] = useState(0),
    [visible, setVisible] = useState<string | null>(null),
    [hint, setHint] = useState<number | null>(null),
    [reefHintStage, setReefHintStage] = useState<0 | 1 | 2 | null>(null),
    [reefHintStep, setReefHintStep] = useState<PublicStep | null>(null),
    [redrawing, setRedrawing] = useState(false),
    [fallbackOffer, setFallbackOffer] = useState<{ tappedCell: number; candidate: FallbackCandidate } | null>(null),
    [flag, setFlag] = useState(false),
    [notice, setNotice] = useState("");
  const redrawRun = useRef<RedrawCancel | null>(null);
  const teaching = help || !s.taught,
    token = `${store.epoch}:${s.id}:${p.moves.length}:${p.turn}`;
  const secret = s.game === "hidden-canoes" && p.outcome === null,
    ai = s.mode === "solo" && p.turn === 1 && s.game !== "reef-sweep" && p.outcome === null;
  // Only two players sharing the device need the handover; against the computer nobody else looks.
  const concealed = secret && !ai && s.mode === "together" && visible !== token,
    locked = teaching || ai || concealed || redrawing;
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
  const rival = s.mode === "solo" && s.game !== "reef-sweep" ? s.match.names[1] : null,
    edge = edgeOf(p),
    headStart =
      s.game !== "reef-sweep" && (edge[0] || edge[1])
        ? headStartLabel(s.game, edge[0] || edge[1], p.size) ?? `${edge[0] || edge[1]} ahead`
        : null,
    headStartFor = edge[0] ? s.match.names[0] : s.match.names[1];
  useEffect(() => {
    if (!ai || teaching) return;
    // The search runs in short slices after a brief pause; leaving cancels it.
    const cancel: Cancel = { cancelled: false };
    const timer = setTimeout(() => {
      const task = computerTask(s);
      if (!task) return;
      void runTask(task, cancel).then((action) => {
        if (cancel.cancelled || action === null) return;
        const position = engine.move(p, action);
        if (commit({ ...s, position })) play(position.outcome !== null && position.outcome === 0 ? "win" : "tap");
      });
    }, 380);
    return () => {
      cancel.cancelled = true;
      clearTimeout(timer);
    };
  }, [ai, teaching, engine, p, s, commit, play]);
  const hintRun = useRef<Cancel | null>(null),
    [hinting, setHinting] = useState(false);
  useEffect(
    () => () => {
      if (hintRun.current) hintRun.current.cancelled = true;
      if (redrawRun.current) redrawRun.current.cancelled = true;
    },
    [token]
  );
  // A look-back belongs to one finished game: this round and exactly these moves. Undo,
  // a different finish or a new round changes the key, which cancels and hides it.
  const reviewKey = `${s.id}|${p.outcome}|${p.moves.join(".")}`;
  const [reviewed, setReviewed] = useState<{ key: string; moment: KeyMoment | "working" | "none" } | null>(null);
  const review = reviewed?.key === reviewKey ? reviewed.moment : null;
  const reviewRun = useRef<Cancel | null>(null);
  useEffect(
    () => () => {
      if (reviewRun.current) reviewRun.current.cancelled = true;
      setReviewed(null);
    },
    [reviewKey]
  );
  const reviewSeat = s.mode === "solo" ? 0 : typeof p.outcome === "number" ? p.outcome : null;
  const seeBestMove = () => {
    if (s.game === "reef-sweep" || reviewSeat === null || p.outcome === null) return;
    const cancel: Cancel = { cancelled: false },
      key = reviewKey;
    reviewRun.current = cancel;
    setReviewed({ key, moment: "working" });
    const task = reviewGame(s.game, p, reviewSeat);
    void runSteps(task, () => task.result(), cancel).then((moment) => {
      if (!cancel.cancelled) setReviewed({ key, moment: moment ?? "none" });
    });
    play("tap");
  };
  const commitMove = (action: number) => {
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
      setReefHintStage(null);
      setReefHintStep(null);
      setFallbackOffer(null);
      setNotice("");
      if (secret) conceal();
      play(
        position.outcome !== null && position.outcome !== "draw" && (s.mode !== "solo" || position.outcome === 0) && !(s.game === "reef-sweep" && position.outcome === 1)
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
  const move = (action: number) => {
    if (locked) return;
    if (
      s.game === "reef-sweep" &&
      p.rules === 2 &&
      !p.fallback &&
      !p.marks.includes(1) &&
      action < p.board.length &&
      p.marks[action] === 0
    ) {
      // First-tap no-guess redraw runs in bounded async slices off the frame callback.
      const cancel: RedrawCancel = { cancelled: false };
      if (redrawRun.current) redrawRun.current.cancelled = true;
      redrawRun.current = cancel;
      setRedrawing(true);
      setFallbackOffer(null);
      setNotice("Setting up a no-guess reef…");
      void redrawBoardTask(p.seed, p.size, action, cancel, redrawOptions).then(async (res) => {
        if (cancel.cancelled) return;
        if (res.status === "found") {
          setRedrawing(false);
          commitMove(action);
        } else if (res.status === "exhausted") {
          const candidate = await loadCertifiedFallback(p.size, p.seed);
          if (cancel.cancelled) return;
          setRedrawing(false);
          setFallbackOffer({ tappedCell: action, candidate });
          setNotice("");
        } else {
          setRedrawing(false);
        }
      });
      return;
    }
    commitMove(action);
  };
  const showHint = () => {
    if (s.game === "reef-sweep") {
      const step = publicHintStep(p);
      if (!step) {
        setHint(null);
        setReefHintStage(null);
        setReefHintStep(null);
        setNotice(
          p.rules === undefined
            ? "This older saved reef has no certain next step from the visible numbers. New reefs never need a guess."
            : "No certain next step is available right now. Check any flags or start a fresh reef."
        );
        return;
      }
      if (reefHintStage === null) {
        setReefHintStep(step);
        setReefHintStage(0);
        setHint(null);
        setNotice(step.reason.look);
        play("tap");
      } else if (reefHintStage === 0) {
        setReefHintStep(step);
        setReefHintStage(1);
        setHint(null);
        setNotice(step.reason.think);
        play("tap");
      } else if (reefHintStage === 1) {
        setReefHintStep(step);
        setReefHintStage(2);
        const targetAction = step.kind === "open" ? step.cell : step.cell + p.board.length;
        setHint(targetAction);
        if (step.kind === "flag") setFlag(true);
        else if (step.kind === "open") setFlag(false);
        setNotice(step.reason.oneStep);
        play("tap");
      } else {
        const targetAction = step.kind === "open" ? step.cell : step.cell + p.board.length;
        move(targetAction);
      }
      return;
    }
    const task = hintTask(s);
    if (!task) return explain(null);
    const cancel: Cancel = { cancelled: false };
    hintRun.current = cancel;
    setHinting(true);
    void runTask(task, cancel).then((action) => {
      setHinting(false);
      if (!cancel.cancelled) explain(action);
    });
  };
  const explain = (action: number | null) => {
    setHint(action);
    if (action === null) {
      setNotice("No move is available.");
      return;
    }
    if (s.game === "coconut-drop")
      setNotice(coconutHintReason(p, action));
    else if (s.game === "shell-pits")
      setNotice(
        `Try ${p.turn === 0 ? "circle" : "square"} pit ${action < 6 ? action + 1 : action - 6}. Preview its last shell before sowing.`
      );
    else if (s.game === "fishing-nets") {
      const [a, b] = edgeDots(p.size, action);
      const dot = (i: number) => `${String.fromCharCode(65 + (i % (p.size + 1)))}${Math.floor(i / (p.size + 1)) + 1}`;
      setNotice(`Try tying ${dot(a)} to ${dot(b)}. ${netsHintReason(p, action)}`);
    } else if (s.game === "hidden-canoes")
      setNotice(`Try ${coordinate(action)}. Search beside a find, then explore new water.`);
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
        ? `${rival ?? "Computer"} is thinking…`
        : concealed
          ? `Pass to ${s.match.names[p.turn]}`
          : s.game === "reef-sweep"
            ? "A little pearl hunt"
            : s.mode === "solo" && p.turn === 0 && s.match.names[0] === "You" ? "Your turn" : `${s.match.names[p.turn]}’s turn`
      : s.game === "reef-sweep"
        ? p.outcome === 0
          ? "Every pearl found!"
          : "An urchin lives here."
        : p.outcome === "draw"
          ? "A good draw!"
          : s.mode === "solo"
            ? p.outcome === 0
              ? "You win!"
              : `${rival ?? "The computer"} wins this time.`
            : `${s.match.names[p.outcome]} wins!`;
  const headerMax = atLarge(fontScale, wordFitMultiplier(info.name, 21, Math.max(120, width - insets.left - insets.right - 180), CHROME_MAX));
  const statusDetail =
    p.outcome !== null
      ? s.game === "reef-sweep"
        ? p.outcome === 0
          ? "You gave the sea urchins room and found their pearl neighbors."
          : "You can undo the last opening or try a new reef. Take your time."
        : "Your family score includes this round. Play again to carry it forward."
      : s.game === "reef-sweep"
        ? p.fallback && !p.marks.includes(1)
          ? `Certified no-guess reef · tap the ringed start at ${reefCoordinate(p.size, p.fallback.start)}.`
          : p.rules === 2
            ? "First tap is safe · every new reef solves with no guessing."
            : "First tap is safe. Open every pearl space."
        : `${s.mode === "solo" ? `${rival} · ${strengthNames[s.strength]}` : "Family match"} · ${s.game === "shell-pits" ? (p.turn === 0 ? "Circle side below" : "Square side above") : s.game === "fishing-nets" ? "Closing a box gives another turn." : s.game === "hidden-canoes" ? (canoeTarget(p, p.turn) === 7 ? "Find all seven canoe spaces." : `Find ${canoeTarget(p, p.turn)} canoe spaces.`) : "Four in a line wins."}`;
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={[styles.content, { maxWidth: wide ? 1120 : 680, paddingHorizontal: 20, gap: 12 }]}>
        <GameHeader
          title={info.name}
          titleMax={headerMax}
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
        <View style={{ flexDirection: wide ? "row" : "column", gap: 16, width: "100%" }}>
        <View style={{ flex: 1, minWidth: 0, gap: wide && s.game === "reef-sweep" ? 8 : 12 }}>
        {s.game !== "reef-sweep" && (
          <Scoreboard solo={s.mode === "solo"}
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
        {s.game === "reef-sweep" ? (
          <View accessibilityLiveRegion="polite" style={[styles.status, success && { backgroundColor: C.success }]}>
            <Heading maxFontSizeMultiplier={copyCap} style={{ fontSize: 20 }}>{title}</Heading>
            <Copy maxFontSizeMultiplier={copyCap} style={{ marginTop: 4, fontSize: 14, lineHeight: 21 }}>{statusDetail}</Copy>
          </View>
        ) : (
          <Status title={title} success={success} detail={statusDetail} />
        )}
        {headStart && (
          <Copy accessibilityLabel={`Head start for ${headStartFor}: ${headStart}`} style={{ fontSize: 14, color: C.ink, padding: 10, backgroundColor: "#FFF4D6", borderRadius: 12 }}>
            Head start for {headStartFor}: {headStart.charAt(0).toLowerCase() + headStart.slice(1)}.{rival && edge[0] ? ` ${rival} still plays its best.` : ""}
          </Copy>
        )}
        {p.outcome !== null && <BadgeResultCard round={s.id}/>}
        {p.outcome !== null && success && <Celebrate burst={1} />}
        {p.outcome !== null && (
          <View style={{ alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Companion event={resultEvent(p.outcome, s.mode === "solo" || s.game === "reef-sweep")} size={80}/>
            <View style={{ width: 80, height: 80, overflow: "hidden" }}>
              <BoardArt game={s.game} size={80} />
            </View>
            <Heading style={{ fontSize: 23, flexShrink: 1 }}>
              {s.game === "reef-sweep"
                ? p.outcome === 1
                  ? "Let’s explore again"
                  : "Great pearl hunt!"
                : s.mode !== "solo"
                  ? "Well played together"
                  : p.outcome === 0
                    ? "Great game!"
                    : "Good try. Play again?"}
            </Heading>
          </View>
        )}
        <View style={[styles.row, { flexWrap: "wrap", justifyContent: "center" }]}>
          {p.outcome === null && !concealed && (
            <Button quiet compact maxFontSizeMultiplier={buttonCap} disabled={locked || hinting} onPress={showHint}>
              {hinting
                ? "Thinking…"
                : s.game === "reef-sweep"
                  ? reefHintStage === null
                    ? "Hint · Look"
                    : reefHintStage === 0
                      ? "Hint · Think"
                      : reefHintStage === 1
                        ? "Hint · One step"
                        : "Hint · Show me"
                  : "Hint"}
            </Button>
          )}
          {p.outcome !== null && s.game !== "reef-sweep" && reviewSeat !== null && review === null && (
            <Button quiet compact maxFontSizeMultiplier={buttonCap} onPress={seeBestMove}>
              See the best move
            </Button>
          )}
          {(s.mode === "solo" || s.game === "reef-sweep") && s.game !== "hidden-canoes" && (
            <Button
              quiet
              compact
              maxFontSizeMultiplier={buttonCap}
              disabled={teaching || redrawing || undo(s) === s}
              onPress={() => {
                const next = undo(s);
                if (commit(next)) {
                  setHint(null);
                  setReefHintStage(null);
                  setReefHintStep(null);
                  setFallbackOffer(null);
                  setNotice("");
                  play("tap");
                }
              }}
            >
              Undo
            </Button>
          )}
          {secret && !concealed && !ai && (
            <Button quiet compact maxFontSizeMultiplier={buttonCap} onPress={conceal}>
              Cover my turn
            </Button>
          )}
          {p.outcome !== null && <Button maxFontSizeMultiplier={buttonCap} onPress={onReplay}>Play again</Button>}
          <Button
            quiet
            compact
            maxFontSizeMultiplier={buttonCap}
            onPress={() => {
              conceal();
              onSetup();
            }}
          >
            New game
          </Button>
        </View>
        {s.game === "reef-sweep" && fallbackOffer && (
          <View
            accessibilityLiveRegion="polite"
            style={{ gap: 10, padding: 14, backgroundColor: "#FFF4D6", borderRadius: 16 }}
          >
            <Heading
              maxFontSizeMultiplier={atLarge(fontScale, wordFitMultiplier("Try a certified reef?", 20, available, CHROME_MAX))}
              style={{ fontSize: 20 }}
            >
              Try a certified reef?
            </Heading>
            <Copy maxFontSizeMultiplier={copyCap} style={{ color: C.ink }}>
              Finding a no-guess reef from {reefCoordinate(p.size, fallbackOffer.tappedCell)} took too long. Your tap
              was not moved. Would you like a certified no-guess reef that starts at{" "}
              {reefCoordinate(p.size, fallbackOffer.candidate.start)}, or keep this reef and tap another space?
            </Copy>
            <View style={[styles.row, { flexWrap: "wrap" }]}>
              <Button
                compact
                maxFontSizeMultiplier={buttonCap}
                onPress={() => {
                  const nextPos = createFallbackPosition(p.seed, p.size, {
                    start: fallbackOffer.candidate.start,
                    mines: fallbackOffer.candidate.mines,
                  });
                  if (commit({ ...s, position: nextPos })) {
                    setFallbackOffer(null);
                    setHint(null);
                    setReefHintStage(null);
                    setReefHintStep(null);
                    setNotice("");
                    play("tap");
                  }
                }}
              >
                Use certified reef (starts at {reefCoordinate(p.size, fallbackOffer.candidate.start)})
              </Button>
              <Button
                quiet
                compact
                maxFontSizeMultiplier={buttonCap}
                onPress={() => {
                  setFallbackOffer(null);
                  setNotice("");
                  play("tap");
                }}
              >
                Keep this reef
              </Button>
            </View>
          </View>
        )}
        <Copy maxFontSizeMultiplier={copyCap} style={{ fontSize: 12, textAlign: "center" }}>Saved on this device · No rush, take your time.</Copy>
        </View>
        <View style={{ flex: wide ? 1.15 : undefined, minWidth: 0, gap: wide && s.game === "reef-sweep" ? 8 : 12, justifyContent: "center" }}>
        {p.outcome !== null && review !== null ? (
          <View accessibilityLiveRegion="polite" style={{ gap: 10, padding: 14, backgroundColor: C.paper, borderRadius: 20 }}>
            {review === "working" ? (
              <Copy>Looking back over the game…</Copy>
            ) : review === "none" ? (
              <>
                <Heading style={{ fontSize: 21 }}>No single turning point</Heading>
                <Copy>
                  The look-back didn’t find one move that clearly changed this game. Play again, or try a head start.
                </Copy>
              </>
            ) : (
              <>
                <Heading style={{ fontSize: 21 }}>{review.title}</Heading>
                <Copy style={{ color: C.ink }}>{review.text}</Copy>
                <Copy style={{ fontSize: 13 }}>
                  {s.game === "shell-pits"
                    ? "The board as it was before that sow. The outlined pit is the sow to look at; the gold ring shows where its last shell lands."
                    : `The board as it was before that ${s.game === "hidden-canoes" ? "search" : "move"}. Gold marks the ${s.game === "hidden-canoes" ? "search" : "move"}.`}
                </Copy>
                <Boards
                  key={`review:${review.ply}`}
                  game={s.game}
                  state={review.before}
                  width={Math.min(available, 420)}
                  hint={review.show}
                  onMove={() => {}}
                  locked
                  still
                  speak={play}
                />
              </>
            )}
            <Button quiet compact onPress={() => setReviewed(null)}>
              Back to the final board
            </Button>
          </View>
        ) : concealed ? (
          <View style={{ padding: 24, gap: 16, alignItems: "center", backgroundColor: "#DEEDEF", borderRadius: 24 }}>
            <BoardArt game="hidden-canoes" size={110} />
            <Heading style={{ fontSize: 24, textAlign: "center" }}>Keep the lagoon private</Heading>
            <Copy style={{ textAlign: "center" }}>
              Only {s.match.names[p.turn]} should look. Pass the device, then open your turn. Your chart stays hidden
              after leaving or reloading.
            </Copy>
            {p.moves.length > 0 && (
              <Copy style={{ textAlign: "center", color: C.ink }}>
                Last search: {coordinate(p.moves[p.moves.length - 1])} ·{" "}
                {p.marks[(p.turn === 0 ? 1 : 0) * 36 + p.moves[p.moves.length - 1]] === 2
                  ? "Canoe found!"
                  : "Open water."}
              </Copy>
            )}
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
                <Chip maxFontSizeMultiplier={buttonCap} selected={!flag} onPress={() => setFlag(false)}>
                  Open pearls
                </Chip>
                <Chip maxFontSizeMultiplier={buttonCap} selected={flag} onPress={() => setFlag(true)}>
                  Flag urchins
                </Chip>
              </View>
            )}
            {s.game === "reef-sweep" && !!notice && !concealed && (
              <Copy
                maxFontSizeMultiplier={copyCap}
                accessibilityLiveRegion="polite"
                style={{
                  width: "100%",
                  maxWidth: wide ? Math.min(reefWideCol, Math.max(available, 320)) : undefined,
                  alignSelf: "center",
                  padding: wide ? 10 : 12,
                  backgroundColor: C.sand,
                  borderRadius: 12,
                  color: C.ink,
                }}
              >
                {notice}
              </Copy>
            )}
            <Boards
              key={`${s.id}:${p.moves.length}:${visible === token}`}
              game={s.game}
              state={p}
              width={available}
              onMove={move}
              locked={locked || p.outcome !== null}
              hint={hint}
              hintFocus={s.game === "reef-sweep" && reefHintStage !== null && reefHintStep ? reefHintStep.clues : undefined}
              startCell={s.game === "reef-sweep" && p.fallback ? p.fallback.start : null}
              flag={flag}
              speak={play}
            />
          </>
        )}
        {s.game !== "reef-sweep" && !!notice && !concealed && (
          <Copy style={{ padding: 12, backgroundColor: C.sand, borderRadius: 12, color: C.ink }}>{notice}</Copy>
        )}
        </View>
        </View>
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
