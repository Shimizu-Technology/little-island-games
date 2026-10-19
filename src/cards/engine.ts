import { Options, random, shuffle } from "../games/types";

export type CardGame = "go-fish" | "crazy-eights";
export const SUITS = ["shell", "leaf", "sun", "wave"] as const;
export type Suit = (typeof SUITS)[number];
export type Card = number;
export const rank = (card: Card) => (card % 13) + 1;
export const suit = (card: Card): Suit => SUITS[Math.floor(card / 13)];
export const rankName = (r: number) =>
  ["", "Ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King"][r];
export const cardName = (c: Card) => `${rankName(rank(c))} of ${suit(c)}s`;
export const points = (c: Card) => (rank(c) === 8 ? 50 : Math.min(rank(c), 10));
export type CardResult = {
  winner: 0 | 1 | "tie";
  scores: [number, number];
  reason: "books" | "empty-hand" | "blocked";
};
export type CardSession = {
  version: 1;
  game: CardGame;
  id: string;
  options: Options;
  seed: number;
  revision: number;
  hands: [Card[], Card[]];
  stock: Card[];
  discard: Card[];
  books: [number[], number[]];
  turn: 0 | 1;
  activeSuit: Suit;
  drawn: Card | null;
  passes: number;
  requests: [number[], number[]];
  message: string;
  result: CardResult | null;
};
export type CardAction =
  { type: "ask"; rank: number } | { type: "play"; card: Card; suit?: Suit } | { type: "draw" } | { type: "pass" };
const other = (p: 0 | 1): 0 | 1 => (p === 0 ? 1 : 0);
function collect(s: CardSession, p: 0 | 1) {
  for (let r = 1; r <= 13; r++)
    if (s.hands[p].filter((c) => rank(c) === r).length === 4) {
      s.books[p].push(r);
      s.hands[p] = s.hands[p].filter((c) => rank(c) !== r);
    }
}
function refill(s: CardSession, p: 0 | 1) {
  while (!s.hands[p].length && s.stock.length) {
    s.hands[p].push(...s.stock.splice(0, Math.min(7, s.stock.length)));
    collect(s, p);
  }
}
function fishResult(s: CardSession) {
  if (s.books[0].length + s.books[1].length === 13) {
    const scores: [number, number] = [s.books[0].length, s.books[1].length];
    s.result = { winner: scores[0] === scores[1] ? "tie" : scores[0] > scores[1] ? 0 : 1, scores, reason: "books" };
  }
}
export function createCardSession(
  game: CardGame,
  options: Options,
  seed = Date.now() >>> 0,
  id = `${game}-${Date.now().toString(36)}-${seed}`
): CardSession {
  const stock = shuffle(
    Array.from({ length: 52 }, (_, i) => i),
    random(seed)
  );
  const s: CardSession = {
    version: 1,
    game,
    id,
    options: { ...options },
    seed: seed >>> 0,
    revision: 0,
    hands: [stock.splice(0, 7), stock.splice(0, 7)],
    stock,
    discard: [],
    books: [[], []],
    turn: options.mode === "solo" && options.computerFirst ? 1 : 0,
    activeSuit: "shell",
    drawn: null,
    passes: 0,
    requests: [[], []],
    message: "Seven cards each. Your island card adventure begins.",
    result: null,
  };
  if (game === "go-fish") {
    collect(s, 0);
    collect(s, 1);
    refill(s, 0);
    refill(s, 1);
    fishResult(s);
  } else {
    const i = s.stock.findIndex((c) => rank(c) !== 8);
    s.discard.push(...s.stock.splice(i, 1));
    s.activeSuit = suit(s.discard[0]);
  }
  return s;
}
export function legalCardPlays(s: Pick<CardSession, "hands" | "turn" | "activeSuit" | "discard" | "drawn">): Card[] {
  const top = s.discard.at(-1);
  return s.hands[s.turn].filter(
    (c) =>
      (s.drawn === null || c === s.drawn) &&
      (rank(c) === 8 || suit(c) === s.activeSuit || (top !== undefined && rank(c) === rank(top)))
  );
}
function recycle(s: CardSession) {
  if (!s.stock.length && s.discard.length > 1) {
    const top = s.discard.pop()!;
    s.stock = shuffle(s.discard, random((s.seed + s.revision) >>> 0));
    s.discard = [top];
  }
}
function eightsResult(s: CardSession, reason: "empty-hand" | "blocked") {
  const totals = s.hands.map((h) => h.reduce((a, c) => a + points(c), 0));
  const winner = totals[0] === totals[1] ? "tie" : totals[0] < totals[1] ? 0 : 1;
  s.result = {
    winner,
    scores: winner === "tie" ? [0, 0] : winner === 0 ? [totals[1] - totals[0], 0] : [0, totals[0] - totals[1]],
    reason,
  };
}
/** Pure intent transition. Actor and expected revision reject stale/rapid duplicate actions. */
export function cardAction(
  state: CardSession,
  action: CardAction,
  actor = state.turn,
  expectedRevision = state.revision
): CardSession {
  if (state.result || actor !== state.turn || expectedRevision !== state.revision) return state;
  const s: CardSession = {
    ...state,
    hands: [state.hands[0].slice(), state.hands[1].slice()],
    stock: state.stock.slice(),
    discard: state.discard.slice(),
    books: [state.books[0].slice(), state.books[1].slice()],
    requests: [state.requests[0].slice(), state.requests[1].slice()],
  };
  const p = s.turn,
    q = other(p);
  if (s.game === "go-fish") {
    if (action.type !== "ask" || !s.hands[p].some((c) => rank(c) === action.rank)) return state;
    s.requests[p] = [...s.requests[p].filter((r) => r !== action.rank), action.rank];
    const caught = s.hands[q].filter((c) => rank(c) === action.rank);
    if (caught.length) {
      s.hands[p].push(...caught);
      s.hands[q] = s.hands[q].filter((c) => rank(c) !== action.rank);
      s.message = `Player ${p + 1} received ${caught.length} ${rankName(action.rank)} card${caught.length === 1 ? "" : "s"}. Ask again!`;
    } else {
      const fished = s.stock.shift();
      if (fished !== undefined) s.hands[p].push(fished);
      const again = fished !== undefined && rank(fished) === action.rank;
      s.message =
        fished === undefined
          ? `No ${rankName(action.rank)}s. The pond is empty.`
          : `Go fish! Player ${p + 1} drew a card.${again ? " It matched: ask again!" : " Next player's turn."}`;
      if (!again) s.turn = q;
    }
    collect(s, p);
    collect(s, q);
    refill(s, p);
    refill(s, q);
    fishResult(s);
    if (!s.hands[s.turn].length && s.hands[other(s.turn)].length) s.turn = other(s.turn);
  } else if (action.type === "play") {
    if (!legalCardPlays(s).includes(action.card) || (rank(action.card) === 8 && !SUITS.includes(action.suit as Suit)))
      return state;
    s.hands[p] = s.hands[p].filter((c) => c !== action.card);
    s.discard.push(action.card);
    s.activeSuit = rank(action.card) === 8 ? action.suit! : suit(action.card);
    s.drawn = null;
    s.passes = 0;
    s.message = `Player ${p + 1} played ${cardName(action.card)}.${rank(action.card) === 8 ? ` Match ${s.activeSuit}s next.` : ""}`;
    if (!s.hands[p].length) eightsResult(s, "empty-hand");
    else s.turn = q;
  } else if (action.type === "draw") {
    if (s.drawn !== null || legalCardPlays(s).length) return state;
    recycle(s);
    const c = s.stock.shift();
    if (c === undefined) return state;
    s.hands[p].push(c);
    s.drawn = c;
    s.message = "One card drawn. Play that card if it matches, or finish your turn.";
  } else if (action.type === "pass") {
    if (s.drawn === null) {
      if (legalCardPlays(s).length || s.stock.length || s.discard.length > 1) return state;
      s.passes++;
    } else s.passes = 0;
    s.drawn = null;
    s.turn = q;
    s.message = `Player ${p + 1} finished. Player ${q + 1}'s turn.`;
    if (s.passes >= 2) eightsResult(s, "blocked");
  } else return state;
  s.revision++;
  return s;
}
/** The CPU contract intentionally contains no opponent cards or stock order. */
export type CardPublicView = {
  game: CardGame;
  hand: Card[];
  opponentCount: number;
  activeSuit: Suit;
  top: Card | null;
  drawn: Card | null;
  canDraw: boolean;
  requests: number[];
};
export function cardPublicView(s: CardSession): CardPublicView {
  return {
    game: s.game,
    hand: s.hands[s.turn].slice(),
    opponentCount: s.hands[other(s.turn)].length,
    activeSuit: s.activeSuit,
    top: s.discard.at(-1) ?? null,
    drawn: s.drawn,
    canDraw: s.stock.length > 0 || s.discard.length > 1,
    requests: s.requests[s.turn].slice(),
  };
}
export function chooseCardAction(v: CardPublicView): CardAction {
  if (v.game === "go-fish") {
    const ranks = [...new Set(v.hand.map(rank))];
    ranks.sort(
      (a, b) =>
        v.requests.indexOf(a) - v.requests.indexOf(b) ||
        v.hand.filter((c) => rank(c) === b).length - v.hand.filter((c) => rank(c) === a).length ||
        a - b
    );
    return { type: "ask", rank: ranks[0] };
  }
  const playable = v.hand.filter(
    (c) =>
      (v.drawn === null || c === v.drawn) &&
      (rank(c) === 8 || suit(c) === v.activeSuit || (v.top !== null && rank(c) === rank(v.top)))
  );
  playable.sort((a, b) => (rank(a) === 8 ? 1 : 0) - (rank(b) === 8 ? 1 : 0) || points(b) - points(a) || a - b);
  if (playable.length) {
    const card = playable[0];
    const suits = SUITS.slice().sort(
      (a, b) =>
        v.hand.filter((c) => c !== card && suit(c) === b).length -
        v.hand.filter((c) => c !== card && suit(c) === a).length
    );
    return { type: "play", card, suit: suits[0] };
  }
  return v.drawn === null && v.canDraw ? { type: "draw" } : { type: "pass" };
}
export function computerCardTurn(s: CardSession): CardSession {
  return cardAction(s, chooseCardAction(cardPublicView(s)));
}

function record(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
const ints = (v: unknown, min: number, max: number, length = 52): v is number[] =>
  Array.isArray(v) && v.length <= length && v.every((n) => Number.isInteger(n) && n >= min && n <= max);
/** Strict, bounded structural and rule invariants for local save/import. */
export function validCardSession(value: unknown): value is CardSession {
  if (!record(value)) return false;
  const s = value;
  if (
    s.version !== 1 ||
    !["go-fish", "crazy-eights"].includes(s.game as string) ||
    typeof s.id !== "string" ||
    !s.id.length ||
    s.id.length > 160 ||
    !record(s.options)
  )
    return false;
  if (
    !["easy", "medium", "hard"].includes(s.options.difficulty as string) ||
    !["solo", "together"].includes(s.options.mode as string) ||
    typeof s.options.computerFirst !== "boolean"
  )
    return false;
  if (
    !Number.isInteger(s.seed) ||
    (s.seed as number) < 0 ||
    (s.seed as number) > 0xffffffff ||
    !Number.isInteger(s.revision) ||
    (s.revision as number) < 0 ||
    (s.revision as number) > 1000000 ||
    ![0, 1].includes(s.turn as number)
  )
    return false;
  if (
    !Array.isArray(s.hands) ||
    s.hands.length !== 2 ||
    !s.hands.every((h) => ints(h, 0, 51)) ||
    !ints(s.stock, 0, 51) ||
    !ints(s.discard, 0, 51) ||
    !Array.isArray(s.books) ||
    s.books.length !== 2 ||
    !s.books.every((b) => ints(b, 1, 13, 13)) ||
    !Array.isArray(s.requests) ||
    s.requests.length !== 2 ||
    !s.requests.every((r) => ints(r, 1, 13, 13))
  )
    return false;
  if (
    !SUITS.includes(s.activeSuit as Suit) ||
    (s.drawn !== null &&
      (!Number.isInteger(s.drawn) || !(s.hands[s.turn as number] as Card[]).includes(s.drawn as Card))) ||
    !Number.isInteger(s.passes) ||
    (s.passes as number) < 0 ||
    (s.passes as number) > 2 ||
    typeof s.message !== "string" ||
    s.message.length > 400
  )
    return false;
  if (s.result !== null && !record(s.result)) return false;
  const cs = value as unknown as CardSession;
  if (cs.requests.some((r) => new Set(r).size !== r.length)) return false;
  const cards = [
    ...cs.hands.flat(),
    ...cs.stock,
    ...cs.discard,
    ...cs.books.flatMap((b) => b.flatMap((r) => SUITS.map((_, i) => i * 13 + r - 1))),
  ];
  if (cards.length !== 52 || new Set(cards).size !== 52) return false;
  if (cs.game === "go-fish") {
    if (
      cs.discard.length ||
      cs.drawn !== null ||
      cs.passes ||
      cs.hands.some((h) =>
        Array.from({ length: 13 }, (_, i) => i + 1).some((r) => h.filter((c) => rank(c) === r).length === 4)
      )
    )
      return false;
    if (!cs.result && (cs.books.flat().length === 13 || !cs.hands[cs.turn].length)) return false;
    if (cs.result && (cs.result.reason !== "books" || cs.books.flat().length !== 13)) return false;
  } else {
    if (!cs.discard.length || cs.books.flat().length || cs.requests.flat().length) return false;
    if (rank(cs.discard.at(-1)!) !== 8 && suit(cs.discard.at(-1)!) !== cs.activeSuit) return false;
    if (!cs.result && cs.hands.some((h) => !h.length)) return false;
    if (cs.result && !["empty-hand", "blocked"].includes(cs.result.reason)) return false;
    if (cs.result?.reason === "empty-hand" && cs.hands.every((h) => h.length)) return false;
    if (
      cs.result?.reason === "blocked" &&
      (cs.passes !== 2 ||
        cs.stock.length ||
        cs.discard.length !== 1 ||
        legalCardPlays(cs).length ||
        legalCardPlays({ ...cs, turn: other(cs.turn) }).length)
    )
      return false;
  }
  if (cs.result) {
    if (
      !record(cs.result) ||
      ![0, 1, "tie"].includes(cs.result.winner) ||
      !ints(cs.result.scores, 0, 2600, 2) ||
      cs.result.scores.length !== 2
    )
      return false;
    const expected = { ...cs, result: null } as CardSession;
    if (cs.game === "go-fish") fishResult(expected);
    else eightsResult(expected, cs.result.reason as "empty-hand" | "blocked");
    if (
      !expected.result ||
      expected.result.winner !== cs.result.winner ||
      expected.result.reason !== cs.result.reason ||
      expected.result.scores.some((n, i) => n !== cs.result!.scores[i])
    )
      return false;
  }
  return true;
}
