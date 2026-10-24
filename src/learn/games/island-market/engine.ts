import type { Seat } from "../../../games/match";
import type { LearnEngine, LearnOptions } from "../../types";
import { pickItems } from "../../skills";
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
import { ORDERS, type MarketOrder } from "./orders";
export { ORDERS } from "./orders";
export type MarketState = {
  version: 1;
  starter: Seat;
  orders: string[];
  index: number;
  phase: "order" | "pack" | "served" | "done";
  pieces: Pieces;
  served: number[];
};
export const marketOrder = (s: MarketState): MarketOrder | undefined => ORDERS.find((o) => o.id === s.orders[s.index]);
export const marketMax = (o: LearnOptions) => (o.pace === "easy" ? 20 : 100);
export const shopkeeper = (s: MarketState): Seat => ((s.starter + s.index) % 2) as Seat;
export const marketTurn = (s: MarketState): Seat | null =>
  s.phase === "done" ? null : s.phase === "pack" ? ((1 - shopkeeper(s)) as Seat) : shopkeeper(s);
export function chooseOrder(s: MarketState): MarketState {
  if (s.phase !== "order" || s.index + 1 >= s.orders.length) return s;
  const orders = [...s.orders];
  [orders[s.index], orders[s.index + 1]] = [orders[s.index + 1], orders[s.index]];
  return { ...s, orders };
}
export const openOrder = (s: MarketState): MarketState => (s.phase === "order" ? { ...s, phase: "pack" } : s);
export function packPiece(
  s: MarketState,
  o: LearnOptions,
  part: "tens" | "ones" | 0 | 1 | 2 | 3,
  delta: 1 | -1
): MarketState {
  const order = marketOrder(s);
  if (s.phase !== "pack" || !order || order.kind === "compare") return s;
  const pieces = adjustPieces(s.pieces, part, delta, marketMax(o), order.kind === "change");
  return pieces === s.pieces ? s : { ...s, pieces };
}
export function serve(s: MarketState, choice?: number): MarketState {
  const order = marketOrder(s);
  if (
    s.phase !== "pack" ||
    !order ||
    (order.kind === "compare"
      ? choice !== order.target
      : pieceTotal(s.pieces, order.kind === "change") !== order.target)
  )
    return s;
  return { ...s, phase: "served", served: [...s.served, order.target] };
}
export function nextCustomer(s: MarketState): MarketState {
  if (s.phase !== "served") return s;
  const index = s.index + 1;
  return { ...s, index, phase: index === s.orders.length ? "done" : "order", pieces: emptyPieces() };
}
const labels = {
  "num.tens-ones": "Packing tens and ones",
  "num.compare": "Comparing two amounts",
  "num.add-within-20": "Adding within twenty",
  "num.add-tens": "Adding tens and ones",
  "num.add-within-100": "Adding within one hundred",
  "num.subtract-within-100": "Taking away within one hundred",
  "num.make-change": "Making change with shell coins",
};
export const engine: LearnEngine<MarketState> = {
  id: "island-market",
  name: "Island Market",
  island: "numbers",
  tagline: "Build orders with tens, ones and shell change.",
  description:
    "Meet the island customers. Pack crates of ten and loose mangoes, combine orders, or find who wants more. Take your time and adjust your basket.",
  help: "A crate holds ten mangoes. Tap plus to pack, or minus to take pieces out. Your basket shows the total. Serve when it matches the order; you can always adjust. Compare orders by choosing who wants more. Challenge includes taking away and making change with pretend shells worth 1, 5, 10 and 25. Together, one shopkeeper hears and chooses an order, then the other player packs. Swap roles for every customer.",
  helpAudio: "island-market-help",
  color: "#9A6A1F",
  surface: "#FBEFD3",
  modes: ["solo", "together"],
  skills: labels,
  paceHelp: {
    easy: "Six customers · tens and ones within 20",
    medium: "Eight customers · amounts to 100 and adding tens",
    hard: "Eight customers · two-digit addition, subtraction and change",
  },
  create(o, ctx) {
    const pool = ORDERS.filter((q) => q.pace === o.pace),
      count = o.pace === "easy" ? 6 : 8;
    const selected = pickItems(pool, ctx.skills, count, ctx.rng, ctx.today);
    // Keep every available kind in this round, while spacing chooses the remaining practice.
    for (const kind of [...new Set(pool.map((q) => q.kind))]) {
      if (selected.some((q) => q.kind === kind)) continue;
      const replace = selected.findLastIndex((q) => selected.filter((a) => a.kind === q.kind).length > 1);
      selected[replace] = pickItems(
        pool.filter((q) => q.kind === kind),
        ctx.skills,
        1,
        ctx.rng,
        ctx.today
      )[0];
    }
    return {
      version: 1,
      starter: ctx.starter,
      orders: pickItems(selected, ctx.skills, count, ctx.rng, ctx.today).map((q) => q.id),
      index: 0,
      phase: "order",
      pieces: emptyPieces(),
      served: [],
    };
  },
  validate(v, o): v is MarketState {
    if (
      !object(v) ||
      !keys(v, ["version", "starter", "orders", "index", "phase", "pieces", "served"]) ||
      v.version !== 1 ||
      !integer(v.starter, 0, 1) ||
      !Array.isArray(v.orders) ||
      v.orders.length !== (o.pace === "easy" ? 6 : 8) ||
      !v.orders.every((id) => typeof id === "string" && ORDERS.some((q) => q.id === id && q.pace === o.pace)) ||
      new Set(v.orders).size !== v.orders.length ||
      !integer(v.index, 0, v.orders.length) ||
      !["order", "pack", "served", "done"].includes(v.phase as string) ||
      !Array.isArray(v.served)
    )
      return false;
    const s = v as MarketState,
      order = marketOrder(s);
    if (
      [...new Set(ORDERS.filter((q) => q.pace === o.pace).map((q) => q.kind))].some(
        (kind) => !s.orders.some((id) => ORDERS.find((q) => q.id === id)!.kind === kind)
      )
    )
      return false;
    if (
      (s.phase === "done") !== (s.index === s.orders.length) ||
      s.served.length !== s.index + (s.phase === "served" ? 1 : 0) ||
      !s.served.every((n, i) => n === ORDERS.find((q) => q.id === s.orders[i])!.target) ||
      !validPieces(s.pieces, marketMax(o), order?.kind === "change")
    )
      return false;
    if (s.phase === "order" || s.phase === "done" || order?.kind === "compare")
      return pieceTotal(s.pieces) === 0 && s.pieces.coins.every((n) => n === 0);
    return s.phase !== "served" || pieceTotal(s.pieces, order?.kind === "change") === order?.target;
  },
  outcome: (s) => (s.phase === "done" ? "done" : null),
  turn: marketTurn,
};
