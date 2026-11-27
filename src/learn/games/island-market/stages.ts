import type { Seat } from "../../../games/match";
import type { CreateContext, Outcome } from "../../types";
import {
  adjustPieces,
  emptyPieces,
  integer,
  keys,
  object,
  pieceTotal,
  validPieces,
  type Pieces,
} from "../../kit/numbers";
import { pickItems } from "../../skills";

/**
 * Island Market native Levels 4 & 5: multi-item basket totals, exact shell-coin combinations
 * with coin-count constraints, and two-item checkout change right at the mango stall.
 * Pure engine with strict validation and opt-in first-step Help (never leaks final answer).
 */
export const MARKET_STALL_ROUND = 6;
export const MARKET_STALL_MAX = 100;
export type MarketStallLevel = 4 | 5;

export type StallOrderKind = "multi-basket" | "multi-change" | "exact-coins" | "restock";

export type StallOrder = {
  id: string;
  level: MarketStallLevel;
  kind: StallOrderKind;
  skill: string;
  /** True when the customer wants shell coins in the basket; false for mango crates & loose mangoes. */
  money: boolean;
  /** Customer character 0..3. */
  who: number;
  /** Short title shown in the customer's speech bubble. */
  headline: string;
  /** Clear multi-step order details shown in the bubble. */
  lines: readonly string[];
  /** Exact target value (mangoes or shells). */
  target: number;
  /** Optional exact-coin constraint: maximum number of coins allowed in the basket. */
  maxCoins?: number;
  /** Optional exact-coin constraint: exact number of coins required. */
  exactCoins?: number;
  /** Opt-in first-step hint (never reveals `target`). */
  hint: string;
  /** Short celebration explanation after serving. */
  explain: string;
};

export const STALL_ORDERS: readonly StallOrder[] = [
  // ---- Level 4: Two-step basket totals, making change, and compact coin combinations (14 orders) ----
  {
    id: "ms4-b1",
    level: 4,
    kind: "multi-basket",
    skill: "num.add-within-100",
    money: false,
    who: 0,
    headline: "Family picnic order",
    lines: ["2 bags of 12 mangoes", "plus 5 extra mangoes"],
    target: 29,
    hint: "Step 1: Add the two bags first (12 + 12), then add the 5 extra mangoes.",
    explain: "12 + 12 = 24, and 24 + 5 = 29 mangoes!",
  },
  {
    id: "ms4-b2",
    level: 4,
    kind: "multi-basket",
    skill: "num.add-within-100",
    money: false,
    who: 1,
    headline: "Two cousins' order",
    lines: ["18 mangoes for Ana", "16 mangoes for Kai"],
    target: 34,
    hint: "Step 1: Add the tens (10 + 10 = 20), then add the ones (8 + 6).",
    explain: "18 + 16 = 34 mangoes (3 crates and 4 loose).",
  },
  {
    id: "ms4-b3",
    level: 4,
    kind: "multi-basket",
    skill: "num.add-tens",
    money: false,
    who: 2,
    headline: "Three picnic bunches",
    lines: ["3 bunches of 14 mangoes"],
    target: 42,
    hint: "Step 1: Three tens make 30. Next, add three 4s (4 + 4 + 4).",
    explain: "30 + 12 = 42 mangoes packed cleanly!",
  },
  {
    id: "ms4-r1",
    level: 4,
    kind: "restock",
    skill: "num.subtract-within-100",
    money: false,
    who: 3,
    headline: "Stall count check",
    lines: ["Started with 45 mangoes", "Sold 1 crate of 10 and 7 loose"],
    target: 28,
    hint: "Step 1: Take away the crate of 10 first (45 − 10 = 35), then subtract 7.",
    explain: "45 − 17 = 28 mangoes left on the table.",
  },
  {
    id: "ms4-r2",
    level: 4,
    kind: "restock",
    skill: "num.subtract-within-100",
    money: false,
    who: 0,
    headline: "After the rush",
    lines: ["Had 52 mangoes", "Packed 19 for a neighbor"],
    target: 33,
    hint: "Step 1: Subtract 20 from 52 first (32), then put 1 back because you only took 19.",
    explain: "52 − 19 = 33 mangoes remaining.",
  },
  {
    id: "ms4-b4",
    level: 4,
    kind: "multi-basket",
    skill: "num.add-within-100",
    money: false,
    who: 1,
    headline: "Beach barbecue",
    lines: ["2 crates of 10 mangoes", "plus 15 more mangoes"],
    target: 35,
    hint: "Step 1: Two crates equal 20 mangoes. Add 15 more to 20.",
    explain: "20 + 15 = 35 mangoes for the beach!",
  },
  {
    id: "ms4-c1",
    level: 4,
    kind: "multi-change",
    skill: "num.make-change",
    money: true,
    who: 2,
    headline: "Change for two treats",
    lines: ["Mangoes: 14 shells · Limes: 11 shells", "Customer pays 50 shells"],
    target: 25,
    hint: "Step 1: Add both prices first (14 + 11). Then find what is left from 50.",
    explain: "14 + 11 = 25 shells total; 50 − 25 = 25 shells change!",
  },
  {
    id: "ms4-c2",
    level: 4,
    kind: "multi-change",
    skill: "num.make-change",
    money: true,
    who: 3,
    headline: "Fruit stand checkout",
    lines: ["Papaya: 18 shells · Bananas: 12 shells", "Customer pays 50 shells"],
    target: 20,
    hint: "Step 1: Add 18 + 12 first (notice 8 + 2 makes a clean ten!). Then subtract from 50.",
    explain: "18 + 12 = 30 shells spent; 50 − 30 = 20 shells change!",
  },
  {
    id: "ms4-c3",
    level: 4,
    kind: "multi-change",
    skill: "num.make-change",
    money: true,
    who: 0,
    headline: "Morning market change",
    lines: ["Coconut: 16 shells · Mango: 7 shells", "Customer pays 40 shells"],
    target: 17,
    hint: "Step 1: Combine 16 + 7 first, then count up from that total to 40.",
    explain: "16 + 7 = 23 shells; 40 − 23 = 17 shells change!",
  },
  {
    id: "ms4-c4",
    level: 4,
    kind: "multi-change",
    skill: "num.make-change",
    money: true,
    who: 1,
    headline: "Sweet snack change",
    lines: ["2 bags at 15 shells each", "Customer pays 50 shells"],
    target: 20,
    hint: "Step 1: Find the cost of two 15-shell bags first (15 + 15), then subtract from 50.",
    explain: "Two bags cost 30 shells; 50 − 30 = 20 shells change!",
  },
  {
    id: "ms4-e1",
    level: 4,
    kind: "exact-coins",
    skill: "num.make-change",
    money: true,
    who: 2,
    headline: "Light coin pouch",
    lines: ["Make 36 shells", "Use 4 coins or fewer"],
    target: 36,
    maxCoins: 4,
    hint: "Start with the biggest shell coin that fits inside 36 (the 25-shell coin), then build the rest.",
    explain: "25 + 10 + 1 = 36 shells using only 3 coins!",
  },
  {
    id: "ms4-e2",
    level: 4,
    kind: "exact-coins",
    skill: "num.make-change",
    money: true,
    who: 3,
    headline: "Exact 3 coins!",
    lines: ["Make 40 shells", "Use exactly 3 shell coins"],
    target: 40,
    exactCoins: 3,
    hint: "Try starting with a 25-shell coin — how much is left for the other 2 coins?",
    explain: "25 + 10 + 5 = 40 shells in exactly 3 coins!",
  },
  {
    id: "ms4-e3",
    level: 4,
    kind: "exact-coins",
    skill: "num.make-change",
    money: true,
    who: 0,
    headline: "Exact 4 coins!",
    lines: ["Make 32 shells", "Use exactly 4 shell coins"],
    target: 32,
    exactCoins: 4,
    hint: "Start with one 25-shell coin, then see how to make the remaining 7 shells in 3 coins.",
    explain: "25 + 5 + 1 + 1 = 32 shells in 4 coins (or 10 + 10 + 10 + 2 won't work — nice precision!).",
  },
  {
    id: "ms4-e4",
    level: 4,
    kind: "exact-coins",
    skill: "num.make-change",
    money: true,
    who: 1,
    headline: "Compact change",
    lines: ["Make 45 shells", "Use 3 coins or fewer"],
    target: 45,
    maxCoins: 3,
    hint: "Start with a 25-shell coin; what two coins make the remaining 20?",
    explain: "25 + 10 + 10 = 45 shells in just 3 coins!",
  },

  // ---- Level 5: Three-step stall totals, crate exchanges, exact multi-item change & tight coin puzzles (14 orders) ----
  {
    id: "ms5-b1",
    level: 5,
    kind: "multi-basket",
    skill: "num.add-within-100",
    money: false,
    who: 0,
    headline: "Fiesta fruit table",
    lines: ["4 bags of 12 mangoes", "plus 9 extra mangoes"],
    target: 57,
    hint: "Step 1: Double 12 twice (12 + 12 = 24, then 24 + 24 = 48), then add 9.",
    explain: "4 × 12 = 48, plus 9 = 57 mangoes!",
  },
  {
    id: "ms5-b2",
    level: 5,
    kind: "multi-basket",
    skill: "num.add-within-100",
    money: false,
    who: 1,
    headline: "School picnic crates",
    lines: ["3 crates of 10 + 18 mangoes", "plus 14 more for teachers"],
    target: 62,
    hint: "Step 1: Three crates are 30. Add 18 first (48), then add 14.",
    explain: "30 + 18 + 14 = 62 mangoes!",
  },
  {
    id: "ms5-r1",
    level: 5,
    kind: "restock",
    skill: "num.subtract-within-100",
    money: false,
    who: 2,
    headline: "Crate swap left over",
    lines: ["Had 73 mangoes", "Sold 2 crates of 10 and 9 loose"],
    target: 44,
    hint: "Step 1: Subtract 20 first (73 − 20 = 53), then take away 9 loose mangoes.",
    explain: "73 − 29 = 44 mangoes left at the stall!",
  },
  {
    id: "ms5-r2",
    level: 5,
    kind: "restock",
    skill: "num.subtract-within-100",
    money: false,
    who: 3,
    headline: "Pack, then share",
    lines: ["3 baskets of 15 mangoes", "Give 8 mangoes to cousins"],
    target: 37,
    hint: "Step 1: Find 3 baskets of 15 (15 + 15 + 15 = 45), then subtract 8.",
    explain: "45 − 8 = 37 mangoes left to pack!",
  },
  {
    id: "ms5-r3",
    level: 5,
    kind: "restock",
    skill: "num.subtract-within-100",
    money: false,
    who: 0,
    headline: "Morning + afternoon",
    lines: ["Started with 81 mangoes", "Sold 19 before noon and 16 after"],
    target: 46,
    hint: "Step 1: Add the two sales together first (19 + 16 = 35), then subtract from 81.",
    explain: "19 + 16 = 35 sold; 81 − 35 = 46 mangoes left!",
  },
  {
    id: "ms5-b3",
    level: 5,
    kind: "multi-basket",
    skill: "num.add-within-100",
    money: false,
    who: 1,
    headline: "Village celebration",
    lines: ["5 bags of 11 mangoes", "plus 1 crate of 10"],
    target: 65,
    hint: "Step 1: Five 11s make 55. Add one crate of 10 to 55.",
    explain: "55 + 10 = 65 mangoes packed!",
  },
  {
    id: "ms5-c1",
    level: 5,
    kind: "multi-change",
    skill: "num.make-change",
    money: true,
    who: 2,
    headline: "Three-item checkout",
    lines: ["Papaya 19 + Mango 14 + Lime 8 shells", "Customer pays 75 shells"],
    target: 34,
    hint: "Step 1: Add the three prices first (19 + 14 + 8 = 41), then subtract from 75.",
    explain: "41 shells total; 75 − 41 = 34 shells change!",
  },
  {
    id: "ms5-c2",
    level: 5,
    kind: "multi-change",
    skill: "num.make-change",
    money: true,
    who: 3,
    headline: "Big basket change",
    lines: ["2 crates at 24 shells each + 7 shells", "Customer pays 100 shells"],
    target: 45,
    hint: "Step 1: Two crates cost 24 + 24 = 48. Add 7, then subtract from 100.",
    explain: "48 + 7 = 55 shells spent; 100 − 55 = 45 shells change!",
  },
  {
    id: "ms5-c3",
    level: 5,
    kind: "multi-change",
    skill: "num.make-change",
    money: true,
    who: 0,
    headline: "Picnic bundle change",
    lines: ["3 coconuts at 12 shells + 16 shells", "Customer pays 80 shells"],
    target: 28,
    hint: "Step 1: Three 12s equal 36. Add 16 first (52), then count up to 80.",
    explain: "36 + 16 = 52 shells spent; 80 − 52 = 28 shells change!",
  },
  {
    id: "ms5-c4",
    level: 5,
    kind: "multi-change",
    skill: "num.make-change",
    money: true,
    who: 1,
    headline: "Sunset stall change",
    lines: ["Guava 27 shells + Bananas 18 shells", "Customer pays 75 shells"],
    target: 30,
    hint: "Step 1: Add 27 + 18 (try 27 + 20 − 2 = 45), then subtract from 75.",
    explain: "27 + 18 = 45 shells; 75 − 45 = 30 shells change!",
  },
  {
    id: "ms5-e1",
    level: 5,
    kind: "exact-coins",
    skill: "num.make-change",
    money: true,
    who: 2,
    headline: "Fewest shell coins",
    lines: ["Make 66 shells", "Use 5 coins or fewer"],
    target: 66,
    maxCoins: 5,
    hint: "Two 25-shell coins make 50 right away! Build the remaining 16 with big coins first.",
    explain: "25 + 25 + 10 + 5 + 1 = 66 shells in 5 coins!",
  },
  {
    id: "ms5-e2",
    level: 5,
    kind: "exact-coins",
    skill: "num.make-change",
    money: true,
    who: 3,
    headline: "Exact 4 coins!",
    lines: ["Make 70 shells", "Use exactly 4 shell coins"],
    target: 70,
    exactCoins: 4,
    hint: "Two 25-shell coins make 50 using 2 coins. Which 2 coins make the remaining 20?",
    explain: "25 + 25 + 10 + 10 = 70 shells in 4 coins!",
  },
  {
    id: "ms5-e3",
    level: 5,
    kind: "exact-coins",
    skill: "num.make-change",
    money: true,
    who: 0,
    headline: "Exact 5 coins!",
    lines: ["Make 57 shells", "Use exactly 5 shell coins"],
    target: 57,
    exactCoins: 5,
    hint: "Start with two 25-shell coins (50) — then make 7 shells with 3 more coins.",
    explain: "25 + 25 + 5 + 1 + 1 = 57 shells in exactly 5 coins!",
  },
  {
    id: "ms5-e4",
    level: 5,
    kind: "exact-coins",
    skill: "num.make-change",
    money: true,
    who: 1,
    headline: "Tight coin pouch",
    lines: ["Make 86 shells", "Use 5 coins or fewer"],
    target: 86,
    maxCoins: 5,
    hint: "Three 25-shell coins reach 75! How few coins can finish the last 11 shells?",
    explain: "25 + 25 + 25 + 10 + 1 = 86 shells in 5 coins!",
  },
];

export const stallOrderById = (id: unknown): StallOrder | undefined =>
  typeof id === "string" ? STALL_ORDERS.find((o) => o.id === id) : undefined;

export const coinCount = (pieces: Pieces): number =>
  pieces.coins.reduce((sum, n) => sum + n, 0);

export type MarketStallState = {
  kind: "market-stall";
  level: MarketStallLevel;
  starter: Seat;
  orders: string[];
  index: number;
  phase: "pack" | "served" | "done";
  pieces: Pieces;
  helped: boolean;
  served: number[];
};

export const isMarketStall = (s: unknown): s is MarketStallState =>
  !!s && typeof s === "object" && (s as { kind?: unknown }).kind === "market-stall";

export const stallOrder = (s: MarketStallState): StallOrder | undefined =>
  stallOrderById(s.orders[s.index]);

export const stallTurn = (s: MarketStallState): Seat | null =>
  s.phase === "done" ? null : (((s.starter + s.index) % 2) as Seat);

export function createMarketStall(level: MarketStallLevel, c: CreateContext<unknown>): MarketStallState {
  const prev = isMarketStall(c.previous) ? new Set(c.previous.orders) : new Set<string>();
  const pool = STALL_ORDERS.filter((o) => o.level === level);
  const fresh = pool.filter((o) => !prev.has(o.id));
  const list = fresh.length >= MARKET_STALL_ROUND ? fresh : pool;
  // Guarantee a rich mix: 3 mango-pack/restock orders + 3 shell-coin (change & exact-coins) orders.
  const fruit = pickItems(list.filter((o) => !o.money), c.skills, 3, c.rng, c.today);
  const coins = pickItems(list.filter((o) => o.money), c.skills, 3, c.rng, c.today);
  const combined: StallOrder[] = [];
  for (let i = 0; i < 3; i++) {
    if (fruit[i]) combined.push(fruit[i]);
    if (coins[i]) combined.push(coins[i]);
  }
  return {
    kind: "market-stall",
    level,
    starter: c.starter,
    orders: combined.map((o) => o.id),
    index: 0,
    phase: "pack",
    pieces: emptyPieces(),
    helped: false,
    served: [],
  };
}

export function stallPackPiece(
  s: MarketStallState,
  part: "tens" | "ones" | 0 | 1 | 2 | 3,
  delta: 1 | -1,
): MarketStallState {
  const order = stallOrder(s);
  if (s.phase !== "pack" || !order) return s;
  let pieces = adjustPieces(s.pieces, part, delta, MARKET_STALL_MAX, order.money);
  if (pieces !== s.pieces && part === "ones" && delta > 0 && pieces.ones === 10 && pieceTotal(pieces) <= order.target) {
    pieces = { ...pieces, tens: pieces.tens + 1, ones: 0 };
  }
  return pieces === s.pieces ? s : { ...s, pieces };
}

export type StallCheckFeedback = "under" | "over" | "too-many-coins" | "wrong-coin-count" | "ok";

export function checkStallBasket(order: StallOrder, pieces: Pieces): StallCheckFeedback {
  const total = pieceTotal(pieces, order.money);
  if (total < order.target) return "under";
  if (total > order.target) return "over";
  if (order.money) {
    const count = coinCount(pieces);
    if (order.maxCoins !== undefined && count > order.maxCoins) return "too-many-coins";
    if (order.exactCoins !== undefined && count !== order.exactCoins) return "wrong-coin-count";
  }
  return "ok";
}

export function stallServe(s: MarketStallState): MarketStallState {
  const order = stallOrder(s);
  if (s.phase !== "pack" || !order) return s;
  if (checkStallBasket(order, s.pieces) !== "ok") return s;
  return { ...s, phase: "served", served: [...s.served, order.target] };
}

export function stallHelp(s: MarketStallState): MarketStallState {
  if (s.phase !== "pack" || s.helped) return s;
  return { ...s, helped: true };
}

export function stallNextCustomer(s: MarketStallState): MarketStallState {
  if (s.phase !== "served") return s;
  const index = s.index + 1;
  return {
    ...s,
    index,
    phase: index >= s.orders.length ? "done" : "pack",
    pieces: emptyPieces(),
    helped: false,
  };
}

export function validMarketStall(v: unknown, level: MarketStallLevel): v is MarketStallState {
  if (!object(v) || !keys(v, ["kind", "level", "starter", "orders", "index", "phase", "pieces", "helped", "served"])) {
    return false;
  }
  const s = v as unknown as MarketStallState;
  if (
    s.kind !== "market-stall" ||
    s.level !== level ||
    !integer(s.starter, 0, 1) ||
    !Array.isArray(s.orders) ||
    s.orders.length !== MARKET_STALL_ROUND ||
    new Set(s.orders).size !== MARKET_STALL_ROUND ||
    !s.orders.every((id) => stallOrderById(id)?.level === level) ||
    !integer(s.index, 0, MARKET_STALL_ROUND) ||
    !["pack", "served", "done"].includes(s.phase) ||
    typeof s.helped !== "boolean" ||
    !Array.isArray(s.served)
  ) {
    return false;
  }
  const order = stallOrder(s);
  if (
    (s.phase === "done") !== (s.index === s.orders.length) ||
    s.served.length !== s.index + (s.phase === "served" ? 1 : 0) ||
    !s.served.every((n, i) => n === stallOrderById(s.orders[i])?.target) ||
    !validPieces(s.pieces, MARKET_STALL_MAX, !!order?.money)
  ) {
    return false;
  }
  if (s.phase === "done") {
    return pieceTotal(s.pieces) === 0 && s.pieces.coins.every((n) => n === 0) && !s.helped;
  }
  if (s.phase === "served") {
    return !!order && checkStallBasket(order, s.pieces) === "ok";
  }
  return true;
}

export const stallOutcome = (s: MarketStallState): Outcome => (s.phase === "done" ? "done" : null);
