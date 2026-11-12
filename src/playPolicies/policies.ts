import type { Seat } from "../games/match";
import type { Position, Strength } from "../board/types";
import * as coconut from "../board/coconut-drop/engine";
import * as nets from "../board/fishing-nets/engine";
import * as canoes from "../board/hidden-canoes/engine";
import * as pits from "../board/shell-pits/engine";
import { IterativeSearch, type SearchRules } from "./search";
import { CanoesHeatmap, likeliest } from "./canoesHeatmap";
import { NetsExact } from "./netsExact";
import { finished, type BoardPolicy, type SearchBudget, type CanoesView, type OpenView, type PolicyGame, type PolicyId, type PolicyTask, type PublicView } from "./types";
import { openPosition } from "./views";

/** Extra turns first, then captures, then pit order. Only search speed depends on it. */
export function pitsOrder(p: Position, moves: number[]): number[] {
  const key = (m: number) => {
    const n = p.board[m],
      c = p.turn === 0 ? m : m - 7,
      land = (c + n) % 13;
    if (land === 6) return 0;
    if (n < 13 && land < 6) {
      const at = p.turn === 0 ? land : land + 7;
      if (p.board[at] === 0 && p.board[12 - at] > 0) return 1;
    }
    return 2;
  };
  return moves.map((m) => [key(m), m]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(([, m]) => m);
}
export const pitsRules: Readonly<SearchRules<Position>> = Object.freeze({
  legal: pits.legal,
  move: pits.move,
  turn: (p: Position) => p.turn,
  outcome: (p: Position) => p.outcome,
  evaluate: pits.evaluate,
  order: pitsOrder,
});
export const pitsChallengeLimits: SearchBudget = Object.freeze({ depth: 8, nodes: 50_000 });
/**
 * Fishing Nets Challenge revision 2 solves the ending exactly once this many ropes or
 * fewer are open (`depth`). The memo visits each set of tied ropes at most once, so
 * `nodes` (2^14) is the most it can search.
 */
export const netsEndgameLimits: SearchBudget = Object.freeze({ depth: 14, nodes: 1 << 14 });

const openOnly = (v: PublicView): OpenView => {
  if (v.game === "hidden-canoes") throw new Error("This policy reads an open board.");
  return v;
};
const canoesOnly = (v: PublicView): CanoesView => {
  if (v.game !== "hidden-canoes") throw new Error("This policy reads a Hidden Canoes chart.");
  return v;
};
function searchTask(root: Position, rules: Readonly<SearchRules<Position>>, limits: SearchBudget): PolicyTask {
  const search = new IterativeSearch(root, rules, limits);
  return {
    get done() {
      return search.done;
    },
    get nodes() {
      return search.nodes;
    },
    step: (quota) => search.step(quota),
    move: () => search.result().move,
  };
}
function shuffled<T>(values: readonly T[], random: () => number): T[] {
  const a = [...values];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/**
 * Revision 2 of the Hidden Canoes rules of thumb, reading only one seat's chart.
 * Revision 1 drew its search order from the seed that also lays out the fleets.
 */
export function canoesChoice(v: CanoesView, strength: Strength, random: () => number): number | null {
  const all = shuffled(
    Array.from({ length: 36 }, (_, i) => i).filter((i) => !v.searched[i]),
    random
  );
  if (strength === "gentle") return all[0] ?? null;
  const seen = v.searched,
    targets = new Map<number, number>();
  for (let i = 0; i < 36; i++)
    if (seen[i] === 2) {
      for (const d of [-6, -1, 1, 6]) {
        const next = i + d;
        if (!all.includes(next) || (Math.abs(d) === 1 && Math.floor(i / 6) !== Math.floor(next / 6))) continue;
        const behind = i - d,
          aligned =
            behind >= 0 &&
            behind < 36 &&
            seen[behind] === 2 &&
            (Math.abs(d) === 6 || Math.floor(behind / 6) === Math.floor(i / 6));
        targets.set(next, (targets.get(next) ?? 0) + (aligned && strength === "challenge" ? 4 : 1));
      }
    }
  const target = [...targets].sort((a, b) => b[1] - a[1])[0]?.[0];
  return (
    target ??
    (strength === "challenge" ? all.find((i) => (Math.floor(i / 6) + (i % 6)) % 2 === 0) : undefined) ??
    all[0] ??
    null
  );
}

/**
 * Fishing Nets Challenge revision 2. With more than 14 ropes open it plays exactly as
 * revision 1. From 14 down it searches the whole ending: closing a box keeps the turn,
 * so the same seat chooses again, and it picks a rope that wins the most of the boxes
 * still open. Ties are broken by the round's public salt.
 */
function netsEndgameTask(v: OpenView, random: () => number): PolicyTask {
  const p = openPosition(v),
    open = nets.legal(p);
  if (open.length > netsEndgameLimits.depth) return finished(nets.choose(p, "challenge"));
  const exact = new NetsExact({ ...p, moves: [] }, netsEndgameLimits.nodes, netsEndgameLimits.depth);
  let chosen: number | null = null,
    settled = false;
  const settle = () => {
    if (settled || !exact.done) return;
    settled = true;
    if (!exact.solved) {
      chosen = nets.choose(p, "challenge");
      return;
    }
    const values = open.map((r) => exact.valueOf(r) ?? -Infinity),
      top = Math.max(...values),
      best = open.filter((_, i) => values[i] === top);
    chosen = best[Math.floor(random() * best.length)] ?? null;
  };
  return {
    get done() {
      return exact.done;
    },
    get nodes() {
      return exact.nodes;
    },
    step: (quota) => {
      const over = exact.step(quota);
      settle();
      return over;
    },
    move: () => {
      settle();
      return chosen;
    },
  };
}
/**
 * Hidden Canoes Challenge revision 3: the placement heatmap. It counts every fleet layout
 * that fits its own chart and searches the open cell most of them cover. Ties are broken
 * by the caller's random source, which never reads the seed.
 */
function canoesHeatmapTask(v: CanoesView, random: () => number): PolicyTask {
  const map = new CanoesHeatmap(v.searched);
  let chosen: number | null = null,
    settled = false;
  const settle = () => {
    if (settled || !map.done) return;
    settled = true;
    const best = likeliest(map, v.searched),
      open = Array.from({ length: 36 }, (_, i) => i).filter((i) => !v.searched[i]),
      from = best.length ? best : open;
    chosen = from[Math.floor(random() * from.length)] ?? null;
  };
  return {
    get done() {
      return map.done;
    },
    get nodes() {
      return map.work;
    },
    step: (quota) => {
      const over = map.step(quota);
      settle();
      return over;
    },
    move: () => {
      settle();
      return chosen;
    },
  };
}

type Plays = Record<Strength, string>;
const coconutPlays: Plays = {
  gentle: "Looks one drop ahead. Takes four in a row when it can.",
  growing: "Looks three drops ahead, so it blocks a four you could finish next.",
  challenge: "Looks five drops ahead and sets up two threats at once.",
};
const netsPlays: Plays = {
  gentle: "Ties any open rope.",
  growing: "Closes a box when it can and avoids giving one away.",
  challenge: "Also counts chains, and gives you the shortest one.",
};
const canoesPlays: Plays = {
  gentle: "Searches anywhere it hasn’t looked.",
  growing: "Searches next to its finds.",
  challenge: "Follows a line of finds, then searches in a checkerboard pattern.",
};
const pitsPlays: Plays = {
  gentle: "Looks at one sow at a time.",
  growing: "Looks three sows ahead.",
  challenge: "Looks eight sows ahead. A greedy grab for extra turns won’t fool it.",
};
const netsEndgamePlays = "Also counts chains, and gives you the shortest one. With 14 ropes or fewer left, it works out the whole ending.";
const canoesHeatmapPlays = "Counts every way the canoes could fit its chart, then searches where the most of them could be.";
const archivedPitsChallenge = "Looks six sows ahead. Kept only to finish rounds saved before 4.0.";
const archivedCanoes = "The 3.0 searcher, kept only to finish rounds saved before 4.0.";

const legacyOpen = (game: "coconut-drop" | "fishing-nets" | "shell-pits", strength: Strength, plays: string): BoardPolicy => ({
  id: `${game}/${strength}@1`,
  game,
  strength,
  revision: 1,
  publicOnly: true,
  limits: null,
  plays,
  choose: (view) => {
    const p = openPosition(openOnly(view));
    const engine = game === "coconut-drop" ? coconut : game === "fishing-nets" ? nets : pits;
    return finished(engine.choose(p, strength));
  },
});
const strengths: Strength[] = ["gentle", "growing", "challenge"];
/** Freezes a policy and its limits, so its ID always means the same search. */
const seal = (p: BoardPolicy): BoardPolicy => {
  if (p.limits) Object.freeze(p.limits);
  return Object.freeze(p);
};
/** Every policy that has ever shipped. Entries are append-only and frozen. */
export const boardPolicies: readonly BoardPolicy[] = Object.freeze(([
  ...strengths.map((s) => legacyOpen("coconut-drop", s, coconutPlays[s])),
  ...strengths.map((s) => legacyOpen("fishing-nets", s, netsPlays[s])),
  legacyOpen("shell-pits", "gentle", pitsPlays.gentle),
  legacyOpen("shell-pits", "growing", pitsPlays.growing),
  legacyOpen("shell-pits", "challenge", archivedPitsChallenge),
  {
    id: "shell-pits/challenge@2" as const,
    game: "shell-pits",
    strength: "challenge",
    revision: 2,
    publicOnly: true,
    limits: pitsChallengeLimits,
    plays: pitsPlays.challenge,
    // History isn't needed to search, and copying it at every node is the slowest part.
    choose: (view) => searchTask({ ...openPosition(openOnly(view)), moves: [] }, pitsRules, pitsChallengeLimits),
  },
  ...strengths.map(
    (s): BoardPolicy => ({
      id: `hidden-canoes/${s}@1`,
      game: "hidden-canoes",
      strength: s,
      revision: 1,
      publicOnly: false,
      limits: null,
      plays: archivedCanoes,
      choose: () => {
        throw new Error("Archived: read the saved position with archivedChoice.");
      },
    })
  ),
  ...strengths.map(
    (s): BoardPolicy => ({
      id: `hidden-canoes/${s}@2`,
      game: "hidden-canoes",
      strength: s,
      revision: 2,
      publicOnly: true,
      limits: null,
      plays: canoesPlays[s],
      choose: (view, random) => finished(canoesChoice(canoesOnly(view), s, random)),
    })
  ),
  {
    id: "fishing-nets/challenge@2" as const,
    game: "fishing-nets",
    strength: "challenge",
    revision: 2,
    publicOnly: true,
    limits: netsEndgameLimits,
    plays: netsEndgamePlays,
    choose: (view, random) => netsEndgameTask(openOnly(view), random),
  },
  {
    id: "hidden-canoes/challenge@3" as const,
    game: "hidden-canoes",
    strength: "challenge",
    revision: 3,
    publicOnly: true,
    limits: null,
    plays: canoesHeatmapPlays,
    choose: (view, random) => canoesHeatmapTask(canoesOnly(view), random),
  },
] satisfies BoardPolicy[]).map(seal));
/** Revision 1 of Hidden Canoes needs the saved position, exactly as 3.0 read it. */
export function archivedChoice(policy: BoardPolicy, p: Position): number | null {
  if (policy.publicOnly || policy.game !== "hidden-canoes") throw new Error("Not an archived policy.");
  return canoes.choose(p, policy.strength);
}

/**
 * Checkers' computer player. Revision 1 is the 3.0 search: a fixed depth and node cap, but
 * each root branch also stopped after 8 ms, so a slow device played weaker. It stays only
 * to finish rounds saved without a policy. Revision 2 is the same search with no clock:
 * the same depth and node cap, run in slices, so strength is the same on every device.
 */
export type CheckersPolicy = Readonly<{
  id: PolicyId;
  strength: Strength;
  revision: number;
  /** Depth and node cap; null picks any legal move. */
  limits: SearchBudget | null;
  /** True only for revision 1, whose search also stopped on the clock. */
  timed: boolean;
  plays: string;
}>;
const checkersPlays: Plays = {
  gentle: "Picks any legal move.",
  growing: "Looks two moves ahead.",
  challenge: "Looks four moves ahead.",
};
const checkersLimits: Record<Strength, SearchBudget | null> = {
  gentle: null,
  growing: Object.freeze({ depth: 2, nodes: 1800 }),
  challenge: Object.freeze({ depth: 4, nodes: 9000 }),
};
/** Every Checkers policy that has ever shipped. Append-only and frozen. */
export const checkersPolicies: readonly CheckersPolicy[] = Object.freeze(
  [1, 2].flatMap((revision) =>
    strengths.map(
      (strength): CheckersPolicy =>
        Object.freeze({
          id: `checkers/${strength}@${revision}` as PolicyId,
          strength,
          revision,
          limits: checkersLimits[strength],
          timed: revision === 1 && strength !== "gentle",
          plays: checkersPlays[strength],
        })
    )
  )
);
export const checkersPolicyById = (id: unknown): CheckersPolicy | undefined => checkersPolicies.find((p) => p.id === id);
/** The revision a new Checkers round starts with. Saved rounds keep theirs. */
export const currentCheckersPolicy = (strength: Strength): CheckersPolicy =>
  checkersPolicies.filter((p) => p.strength === strength).reduce((a, b) => (b.revision > a.revision ? b : a));

export const policyById = (id: unknown): BoardPolicy | undefined => boardPolicies.find((p) => p.id === id);
/** The revision a new round starts with. Saved rounds keep theirs. */
export function currentPolicy(game: Exclude<PolicyGame, "checkers">, strength: Strength): BoardPolicy {
  const all = boardPolicies.filter((p) => p.game === game && p.strength === strength && p.publicOnly);
  return all.reduce((a, b) => (b.revision > a.revision ? b : a));
}
/** What a version-1 saved round was playing before policies were recorded. */
export const archivedPolicy = (game: Exclude<PolicyGame, "checkers">, strength: Strength): BoardPolicy =>
  policyById(`${game}/${strength}@1`)!;
export const isBoardPolicyId = (id: unknown): id is PolicyId => !!policyById(id);

/** A public, per-round salt mixed with the ply count. Never derived from the seed. */
export function policyRandom(salt: number, plies: number, seat: Seat): () => number {
  let value = (Math.imul(salt ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(plies + 1, 0xc2b2ae35) ^ (seat ? 0x27d4eb2f : 0)) >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
