import type { Seat } from "../games/match";
import type { Position, Strength } from "../board/types";
import * as coconut from "../board/coconut-drop/engine";
import * as nets from "../board/fishing-nets/engine";
import * as canoes from "../board/hidden-canoes/engine";
import * as pits from "../board/shell-pits/engine";
import { IterativeSearch, type SearchRules } from "./search";
import { finished, type BoardPolicy, type CanoesView, type OpenView, type PolicyGame, type PolicyId, type PolicyTask, type PublicView } from "./types";
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
export const pitsRules: SearchRules<Position> = {
  legal: pits.legal,
  move: pits.move,
  turn: (p) => p.turn,
  outcome: (p) => p.outcome,
  evaluate: pits.evaluate,
  order: pitsOrder,
};
export const pitsChallengeLimits = { depth: 8, nodes: 50_000 } as const;

const openOnly = (v: PublicView): OpenView => {
  if (v.game === "hidden-canoes") throw new Error("This policy reads an open board.");
  return v;
};
const canoesOnly = (v: PublicView): CanoesView => {
  if (v.game !== "hidden-canoes") throw new Error("This policy reads a Hidden Canoes chart.");
  return v;
};
function searchTask(root: Position, rules: SearchRules<Position>, limits: { depth: number; nodes: number }): PolicyTask {
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
/** Every policy that has ever shipped. Entries are append-only. */
export const boardPolicies: readonly BoardPolicy[] = Object.freeze([
  ...strengths.map((s) => legacyOpen("coconut-drop", s, coconutPlays[s])),
  ...strengths.map((s) => legacyOpen("fishing-nets", s, netsPlays[s])),
  legacyOpen("shell-pits", "gentle", pitsPlays.gentle),
  legacyOpen("shell-pits", "growing", pitsPlays.growing),
  legacyOpen("shell-pits", "challenge", archivedPitsChallenge),
  {
    id: "shell-pits/challenge@2",
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
]);
/** Revision 1 of Hidden Canoes needs the saved position, exactly as 3.0 read it. */
export function archivedChoice(policy: BoardPolicy, p: Position): number | null {
  if (policy.publicOnly || policy.game !== "hidden-canoes") throw new Error("Not an archived policy.");
  return canoes.choose(p, policy.strength);
}

/** Checkers keeps its 3.0 search, unchanged. Registered so rivals and saves can name it. */
export const checkersPolicies = Object.freeze(
  (["gentle", "growing", "challenge"] as const).map((strength) => ({
    id: `checkers/${strength}@1` as PolicyId,
    strength,
    revision: 1,
    plays:
      strength === "gentle"
        ? "Picks any legal move."
        : strength === "growing"
          ? "Looks two moves ahead."
          : "Looks four moves ahead.",
  }))
);

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
