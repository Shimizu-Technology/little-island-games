import type { Seat } from "../games/match";
import type { Edge, Position } from "../board/types";
import { rng } from "../board/types";
import * as coconut from "../board/coconut-drop/engine";
import * as nets from "../board/fishing-nets/engine";
import * as canoes from "../board/hidden-canoes/engine";
import * as pits from "../board/shell-pits/engine";
import type { BoardPolicy } from "./types";
import { publicView } from "./views";
import { archivedChoice, policyRandom } from "./policies";

export type BenchGame = "coconut-drop" | "fishing-nets" | "hidden-canoes" | "shell-pits";
export const benchEngines = { "coconut-drop": coconut, "fishing-nets": nets, "hidden-canoes": canoes, "shell-pits": pits };
/** Plays one decision for whichever seat is to move. */
export type Player = (p: Position) => number | null;

/** Runs a policy to its answer for the seat to move, from that seat's public view only. */
export function policyPlayer(game: BenchGame, policy: BoardPolicy, salt = 0): Player {
  return (p) => {
    if (!policy.publicOnly) return archivedChoice(policy, p);
    const task = policy.choose(publicView(game, p, p.turn), policyRandom(salt, p.moves.length, p.turn));
    while (!task.step(4096));
    return task.move();
  };
}
/** The audit's simple Shell Pits exploit: grab the most shells, then any extra turn. */
export const pitsGreedy: Player = (s) =>
  [...pits.legal(s)].sort((a, b) => {
    const value = (m: number) => {
      const n = pits.move(s, m);
      return (n.scores[s.turn] - s.scores[s.turn]) * 10 + Number(n.turn === s.turn) * 3;
    };
    return value(b) - value(a);
  })[0] ?? null;
/** The audit's Coconut Drop tactician: win now, block now, else the most central column. */
export const coconutTactician: Player = (s) => {
  const legal = coconut.legal(s);
  const win = legal.find((c) => coconut.move(s, c).outcome === s.turn);
  if (win !== undefined) return win;
  const rival = { ...s, turn: (s.turn === 0 ? 1 : 0) as Seat };
  const block = legal.find((c) => coconut.move(rival, c).outcome === rival.turn);
  return block ?? legal[0] ?? null;
};

export type BenchRow = {
  starter: Seat;
  subject: Seat;
  seed: number;
  openingPlies: number;
  prefix: number[];
  result: "win" | "draw" | "loss" | "capped";
  scores: [number, number];
  moves: number[];
};
export type BenchSummary = {
  games: number;
  /** Distinct full move lists. Repeated seeds that replay one game count once here. */
  uniqueTrajectories: number;
  win: number;
  draw: number;
  loss: number;
  capped: number;
};
export function summarize(rows: readonly BenchRow[]): BenchSummary {
  const t = { win: 0, draw: 0, loss: 0, capped: 0 };
  for (const r of rows) t[r.result]++;
  return { games: rows.length, uniqueTrajectories: new Set(rows.map((r) => r.moves.join(","))).size, ...t };
}

/**
 * Both starters, both seats and seeded random legal openings. `subject` is the
 * player under test; `rival` takes the other seat.
 */
export function bench(config: {
  game: BenchGame;
  subject: Player;
  rival: Player;
  openingPlies: readonly number[];
  seeds: number;
  /** Head start for the subject's seat, in the game's own units. */
  edge?: number;
  size?: number;
  /** Seeds that also lay out a board (Hidden Canoes) vary with each game. */
  boardSeed?: (seed: number) => number;
  maxPlies?: number;
}): BenchRow[] {
  const engine = benchEngines[config.game],
    rows: BenchRow[] = [];
  for (const starter of [0, 1] as Seat[])
    for (const subject of [0, 1] as Seat[])
      for (const openingPlies of config.openingPlies)
        for (let seed = 0; seed < (openingPlies ? config.seeds : 1); seed++) {
          const random = rng(seed * 7919 + 43),
            edge: Edge | undefined = config.edge ? (subject === 0 ? [config.edge, 0] : [0, config.edge]) : undefined;
          let s = engine.create(config.boardSeed?.(seed) ?? seed, config.size, starter, edge);
          for (let i = 0; i < openingPlies && s.outcome === null; i++) {
            const legal = engine.legal(s);
            s = engine.move(s, legal[Math.floor(random() * legal.length)]);
          }
          const prefix = [...s.moves];
          let steps = 0;
          while (s.outcome === null && steps++ < (config.maxPlies ?? 400)) {
            const m = (s.turn === subject ? config.subject : config.rival)(s);
            if (m === null) break;
            const next = engine.move(s, m);
            if (next === s) throw new Error(`Illegal move ${m} in ${config.game}.`);
            s = next;
          }
          rows.push({
            starter,
            subject,
            seed,
            openingPlies,
            prefix,
            result: s.outcome === null ? "capped" : s.outcome === "draw" ? "draw" : s.outcome === subject ? "win" : "loss",
            scores: s.scores,
            moves: s.moves,
          });
        }
  return rows;
}
