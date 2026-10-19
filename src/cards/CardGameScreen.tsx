import { Text } from "../components/Text";
import React, { useEffect, useRef, useState } from "react";
import { AppState, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Circle, Path, Polygon } from "react-native-svg";
import { Button, C, Copy, Heading, Label, Sheet, Status, font } from "../components/ui";
import {
  Card,
  CardAction,
  CardSession,
  SUITS,
  Suit,
  cardAction,
  cardName,
  computerCardTurn,
  createCardSession,
  legalCardPlays,
  rank,
  rankName,
  suit,
  suitName,
} from "./engine";

const colors: Record<Suit, string> = { shell: "#A44E37", leaf: "#246858", sun: "#916500", wave: "#386C9A" };
export function SuitMark({ kind, size = 30 }: { kind: Suit; size?: number }) {
  const color = colors[kind];
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessible={false}>
      {kind === "shell" && (
        <Path d="M8 32 L3 18 C0 10 7 4 13 8 C14 0 26 0 27 8 C35 4 42 12 37 20 L31 32Z" fill={color} />
      )}
      {kind === "leaf" && (
        <Path d="M6 34 Q0 3 34 6 Q37 37 6 34 M8 32 L29 11" fill={color} stroke="#FCFAF4" strokeWidth="2" />
      )}
      {kind === "sun" && (
        <>
          <Polygon
            points="20,1 25,10 35,5 30,15 39,20 30,25 35,35 25,30 20,39 15,30 5,35 10,25 1,20 10,15 5,5 15,10"
            fill={color}
          />
          <Circle cx="20" cy="20" r="9" fill="#FCFAF4" />
        </>
      )}
      {kind === "wave" && (
        <Path d="M2 16 Q10 3 19 16 T38 16 M2 26 Q10 13 19 26 T38 26" fill="none" stroke={color} strokeWidth="5" />
      )}
    </Svg>
  );
}
function CardFace({
  card,
  selected,
  disabled,
  onPress,
}: {
  card: Card;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityRole={onPress ? "button" : "image"}
      accessibilityLabel={cardName(card)}
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        { borderColor: selected ? C.teal : C.line, borderWidth: selected ? 3 : 1 },
        disabled && { opacity: 0.55 },
        pressed && { opacity: 0.7 },
        focused && { outlineWidth: 3, outlineColor: C.blue },
      ]}
    >
      <Text style={[s.rank, { color: colors[suit(card)] }]}>
        {({ 1: "A", 11: "J", 12: "Q", 13: "K" } as Record<number, string>)[rank(card)] ?? rank(card)}
      </Text>
      <SuitMark kind={suit(card)} />
      <Text style={s.suit}>{suit(card)}</Text>
    </Pressable>
  );
}
export type CardGameScreenProps = {
  state: CardSession;
  /** Persist atomically only if previous still matches the saved round/revision. */
  onChange: (next: CardSession, previous: CardSession) => void;
  width: number;
  /** Must be false while routing away or while any parent modal overlays this screen. */
  active: boolean;
  sound: boolean;
  /** Optional existing app sound hook; never called while muted. */
  onFeedback?: () => void;
};
export function CardGameScreen(props: CardGameScreenProps) {
  // Remount private UI for each new recipient or parent visibility change.
  // This prevents a revealed hand from surviving a route/modal handoff.
  return <CardGameRound key={`${props.state.id}:${props.state.turn}:${props.active}`} {...props} />;
}
function CardGameRound({ state, onChange, width, active, sound, onFeedback }: CardGameScreenProps) {
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);
  const [reveal, setReveal] = useState<string | null>(null);
  const [foreground, setForeground] = useState(AppState.currentState === "active" || AppState.currentState === null);
  const [help, setHelp] = useState(false),
    [setup, setSetup] = useState(false);
  const [mode, setMode] = useState(state.options.mode);
  const [wild, setWild] = useState<Card | null>(null);
  const turnKey = `${state.id}:${state.turn}`;
  const playing = active && foreground && !help && !setup;
  const cpu = state.options.mode === "solo" && state.turn === 1 && !state.result;
  const visible = playing && !cpu && (state.options.mode === "solo" || reveal === turnKey);
  useEffect(() => {
    const conceal = () => {
      setReveal(null);
      setWild(null);
    };
    const subscription = AppState.addEventListener("change", (value) => {
      setForeground(value === "active");
      if (value !== "active") conceal();
    });
    const suspend = () => {
      setForeground(false);
      conceal();
    };
    const focus = () => setForeground(Platform.OS === "web" ? !document.hidden : AppState.currentState === "active");
    const blur = Platform.OS === "android" ? AppState.addEventListener("blur", suspend) : null;
    const focused = Platform.OS === "android" ? AppState.addEventListener("focus", focus) : null;
    if (Platform.OS === "web") {
      window.addEventListener("blur", suspend);
      window.addEventListener("focus", focus);
    }
    const webVisibility = () => {
      setForeground(!document.hidden);
      conceal();
    };
    if (Platform.OS === "web" && typeof document !== "undefined")
      document.addEventListener("visibilitychange", webVisibility);
    return () => {
      subscription.remove();
      blur?.remove();
      focused?.remove();
      if (Platform.OS === "web") {
        window.removeEventListener("blur", suspend);
        window.removeEventListener("focus", focus);
      }
      if (Platform.OS === "web" && typeof document !== "undefined")
        document.removeEventListener("visibilitychange", webVisibility);
    };
  }, []);
  const commit = (next: CardSession, previous: CardSession) => {
    if (next === previous) return;
    latest.current = next;
    if (next.turn !== previous.turn || next.id !== previous.id) {
      setReveal(null);
      setWild(null);
    }
    if (sound) onFeedback?.();
    onChange(next, previous);
  };
  const act = (action: CardAction) => {
    if (!visible || latest.current.result) return;
    const previous = latest.current;
    commit(cardAction(previous, action, state.turn, state.revision), previous);
  };
  useEffect(() => {
    if (!playing || !cpu) return;
    const timer = setTimeout(() => {
      const previous = latest.current;
      if (previous.id === state.id && previous.revision === state.revision)
        commit(computerCardTurn(previous), previous);
    }, 650);
    return () => clearTimeout(timer);
    // The timer is tied to a single committed revision. A modal/background cancels it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.id, state.revision, cpu, playing]);
  const p = state.turn,
    opponent = p === 0 ? 1 : 0;
  const playerName = (n: number) =>
    state.options.mode === "solo" ? (n === 0 ? "You" : "Island computer") : `Player ${n + 1}`;
  const ranks = [...new Set(state.hands[p].map(rank))].sort((a, b) => a - b);
  const plays = state.game === "crazy-eights" ? legalCardPlays(state) : [];
  const openHelp = () => {
    setReveal(null);
    setWild(null);
    setHelp(true);
  };
  const result = state.result;
  const winner =
    result?.winner === "tie"
      ? "A tie!"
      : result
        ? `${playerName(result.winner)} ${result.winner === 0 && state.options.mode === "solo" ? "win" : "wins"}!`
        : "";
  return (
    <View style={{ width: "100%", maxWidth: 850, alignSelf: "center", gap: 16 }}>
      <Status
        title={
          result
            ? winner
            : cpu
              ? "Island computer is thinking…"
              : `${playerName(p)}${state.options.mode === "solo" && p === 0 ? "r" : "’s"} turn`
        }
        detail={
          result
            ? state.game === "go-fish"
              ? `All 13 books found. ${result.scores[0]} – ${result.scores[1]}.`
              : `${result.reason === "blocked" ? "Neither player can move. Lowest hand total wins." : "An empty hand wins the round."} Round points: ${result.scores[0]} – ${result.scores[1]}.`
            : state.message
                .replace(/Player 1's/g, state.options.mode === "solo" ? "Your" : "Player 1's")
                .replace(/Player 1/g, playerName(0))
                .replace(/Player 2/g, playerName(1))
        }
        success={!!result}
      />
      <View style={s.table}>
        <Label>{state.game === "go-fish" ? "The fishing pond" : "Island Eights"}</Label>
        <View style={s.tableRow}>
          <View style={s.pile} accessibilityLabel={`${state.stock.length} cards in draw pile`}>
            <Text style={s.back}>li</Text>
            <Copy style={{ color: C.cream }}>{state.stock.length} left</Copy>
          </View>
          {state.game === "crazy-eights" ? (
            <CardFace card={state.discard.at(-1)!} />
          ) : (
            <View style={{ gap: 5 }}>
              <Heading style={{ fontSize: 22 }}>
                {state.books[0].length} : {state.books[1].length}
              </Heading>
              <Copy>books collected</Copy>
            </View>
          )}
        </View>
        <Copy style={{ textAlign: "center", color: C.ink }}>
          {state.game === "crazy-eights"
            ? `Match ${suitName(state.activeSuit)} or ${rankName(rank(state.discard.at(-1)!))}. Eights are wild.`
            : "Collect all four cards of a rank to make a book."}
        </Copy>
        <Copy style={{ textAlign: "center" }}>
          {playerName(opponent)}: {state.hands[opponent].length} cards
          {state.game === "go-fish" ? ` · ${state.books[opponent].length} books` : ""}
        </Copy>
      </View>
      {!result && !visible && (
        <View style={s.cover}>
          <Heading style={{ fontSize: 24, textAlign: "center" }}>
            {cpu ? "Cards are private" : "Your cards are hidden"}
          </Heading>
          <Copy style={{ textAlign: "center" }}>
            {cpu
              ? "The computer only knows its own cards and public information."
              : `Pass the device to ${playerName(p)}. Everyone else looks away.`}
          </Copy>
          {playing && !cpu && (
            <Button onPress={() => setReveal(turnKey)}>
              {state.options.mode === "solo" ? "Show my cards" : `I’m ${playerName(p)} — show my cards`}
            </Button>
          )}
        </View>
      )}
      {!result && visible && (
        <View style={{ gap: 12 }}>
          <View style={s.tableRow}>
            <Heading style={{ fontSize: 23, flex: 1 }}>
              {playerName(p)}
              {state.options.mode === "solo" ? "r" : "’s"} hand
            </Heading>
            {state.options.mode === "together" && (
              <Button
                compact
                quiet
                onPress={() => {
                  setReveal(null);
                  setWild(null);
                }}
              >
                Hide cards
              </Button>
            )}
          </View>
          {state.game === "go-fish" && (
            <>
              <Copy>Choose a rank in your hand to ask for every matching card.</Copy>
              <View style={s.wrap}>
                {ranks.map((r) => (
                  <Button compact quiet key={r} onPress={() => act({ type: "ask", rank: r })}>
                    Ask for {rankName(r)}s
                  </Button>
                ))}
              </View>
            </>
          )}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            contentContainerStyle={{ gap: 10, paddingVertical: 4, paddingHorizontal: 3 }}
            style={{ width: "100%", maxWidth: Math.min(850, Math.max(0, width)) }}
          >
            {state.hands[p]
              .slice()
              .sort((a, b) => rank(a) - rank(b) || a - b)
              .map((card) => (
                <CardFace
                  key={card}
                  card={card}
                  selected={state.game === "crazy-eights" && plays.includes(card)}
                  disabled={state.game === "crazy-eights" && !plays.includes(card)}
                  onPress={
                    state.game === "crazy-eights"
                      ? () => {
                          if (rank(card) === 8) setWild(card);
                          else act({ type: "play", card });
                        }
                      : undefined
                  }
                />
              ))}
          </ScrollView>
          {state.game === "crazy-eights" && (
            <>
              <Copy>
                {plays.length
                  ? "Outlined cards can be played. Tap an eight to choose the next suit."
                  : state.drawn !== null
                    ? "That card does not match. Finish your turn."
                    : "No matching card? Draw one."}
              </Copy>
              <View style={s.wrap}>
                {state.drawn === null && !plays.length && (state.stock.length || state.discard.length > 1) ? (
                  <Button onPress={() => act({ type: "draw" })}>Draw one card</Button>
                ) : null}
                {state.drawn !== null || (!plays.length && !state.stock.length && state.discard.length === 1) ? (
                  <Button onPress={() => act({ type: "pass" })}>Finish my turn</Button>
                ) : null}
              </View>
            </>
          )}
        </View>
      )}
      {state.game === "go-fish" && state.books.flat().length > 0 && (
        <View style={s.wrap}>
          {state.books.map((books, n) => (
            <Copy key={n}>
              {playerName(n)} books: {books.map(rankName).join(", ") || "none yet"}
            </Copy>
          ))}
        </View>
      )}
      <View style={s.wrap}>
        <Button quiet onPress={openHelp}>
          How to play
        </Button>
        <Button
          onPress={() => {
            setReveal(null);
            setWild(null);
            setMode(state.options.mode);
            setSetup(true);
          }}
        >
          {result ? "Play a fresh round" : "New round"}
        </Button>
      </View>
      <Copy style={{ textAlign: "center", fontSize: 13 }}>
        Progress saves on this device. Hands hide when you leave or pause.
      </Copy>
      <Sheet visible={wild !== null && visible} title="Choose the next suit" onClose={() => setWild(null)}>
        <Copy>An eight is wild. Which suit should the next player match?</Copy>
        <View style={s.wrap}>
          {SUITS.map((kind) => (
            <Button
              quiet
              key={kind}
              onPress={() => {
                if (wild !== null) act({ type: "play", card: wild, suit: kind });
                setWild(null);
              }}
            >
              {suitName(kind)}
            </Button>
          ))}
        </View>
      </Sheet>
      <Sheet
        visible={help}
        title={state.game === "go-fish" ? "Go Fish rules" : "Island Eights rules"}
        onClose={() => setHelp(false)}
      >
        {state.game === "go-fish" ? (
          <>
            <Copy>
              Two players, 52 cards, seven cards each. Ask for a rank you hold. The other player gives you every card of
              that rank. If you receive any, ask again.
            </Copy>
            <Copy>
              If they have none, draw one: go fish! If you draw the rank you asked for, ask again. Otherwise the turn
              passes. Four matching ranks make a book automatically.
            </Copy>
            <Copy>
              An empty hand refills with up to seven cards while the pond has cards. When it is empty, a player with no
              cards waits. All 13 books ends the round; most books wins.
            </Copy>
          </>
        ) : (
          <>
            <Copy>
              Two players, 52 cards, seven cards each. Play one card matching the top card’s rank or the chosen suit.
              Any eight is wild: choose the next suit, even if it is your final card.
            </Copy>
            <Copy>
              If you cannot play, draw one card. You may play that new card if it matches, or finish your turn. You
              cannot draw while you already have a playable card. There are no stacking, skip, or draw-two cards.
            </Copy>
            <Copy>
              The first empty hand wins. Eights score 50, picture cards 10, aces 1, and other cards their number. The
              winner earns the other hand’s points. If the draw pile empties, shuffle the used pile except its top card.
              If both players are blocked, the lower hand total wins the difference; equal totals tie.
            </Copy>
          </>
        )}
        <Copy>
          Play alone against the island computer, or choose Two players for private pass-the-device hands. The computer
          never looks at your hidden cards.
        </Copy>
      </Sheet>
      <Sheet visible={setup} title="Fresh card round" onClose={() => setSetup(false)}>
        <Copy>
          {result ? "Choose who is playing." : "Starting a new round replaces this saved round. Cancel to keep it."}
        </Copy>
        <View style={s.wrap}>
          <Button quiet selected={mode === "solo"} onPress={() => setMode("solo")}>
            Play the computer
          </Button>
          <Button quiet selected={mode === "together"} onPress={() => setMode("together")}>
            Two players
          </Button>
        </View>
        <Button
          onPress={() => {
            const previous = latest.current;
            commit(createCardSession(state.game, { ...state.options, mode }), previous);
            setSetup(false);
          }}
        >
          Deal seven cards each
        </Button>
      </Sheet>
    </View>
  );
}
const s = StyleSheet.create({
  table: { backgroundColor: "#E7EFE3", borderRadius: 24, borderWidth: 1, borderColor: "#CCDCC9", padding: 18, gap: 14 },
  tableRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18, flexWrap: "wrap" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  card: {
    width: 86,
    minHeight: 132,
    borderRadius: 13,
    backgroundColor: C.paper,
    padding: 10,
    justifyContent: "space-between",
    alignItems: "center",
    gap: 5,
  },
  rank: { fontFamily: font, fontWeight: "800", fontSize: 21 },
  suit: { fontFamily: font, fontSize: 12, color: C.ink },
  pile: {
    width: 86,
    minHeight: 132,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: "#8AAE9A",
    backgroundColor: C.teal,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  back: { fontFamily: font, color: C.cream, fontSize: 35, fontWeight: "800" },
  cover: {
    backgroundColor: "#F0E8D5",
    padding: 22,
    borderRadius: 22,
    minHeight: 180,
    justifyContent: "center",
    gap: 14,
  },
});
