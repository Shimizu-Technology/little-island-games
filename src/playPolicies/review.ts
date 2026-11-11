import type { Seat } from "../games/match";
import { other } from "../games/match";
import type { Position } from "../board/types";
import { edgeOf, withEdge } from "../board/types";
import * as coconut from "../board/coconut-drop/engine";
import * as nets from "../board/fishing-nets/engine";
import * as canoes from "../board/hidden-canoes/engine";
import * as pits from "../board/shell-pits/engine";
import { IterativeSearch } from "./search";
import { closedBy, exactBudget, isolatedCapture, NetsExact } from "./netsExact";
import { pitsChallengeLimits, pitsRules } from "./policies";
import type { BenchGame } from "./benchmark";

/**
 * One moment from a finished game, worth showing again. Built only after the game
 * ends, so it may show anything; nothing here runs while a round is in progress.
 */
export type KeyMoment = {
  /** Index into the move list of the decision shown. */
  ply: number;
  /** The board just before that decision, with `seat` to move. */
  before: Position;
  played: number;
  /** The move to ring on the board. Equal to `played` for "your-win". */
  show: number;
  kind: "your-win" | "winning" | "stronger";
  title: string;
  text: string;
};
export type ReviewTask = { readonly done: boolean; step: (quota: number) => boolean; result: () => KeyMoment | null };

const engines = { "coconut-drop": coconut, "fishing-nets": nets, "hidden-canoes": canoes, "shell-pits": pits };
export function replayStates(game: BenchGame, final: Position): Position[] {
  const engine = engines[game],
    states = [engine.create(final.seed, final.size, final.starter, final.edge)];
  for (const m of final.moves) states.push(engine.move(states[states.length - 1], m));
  return states;
}
const done = (value: KeyMoment | null): ReviewTask => ({ done: true, step: () => true, result: () => value });
const column = (c: number) => `column ${c + 1}`;
const pit = (m: number) => (m < 6 ? `circle pit ${m + 1}` : `square pit ${m - 6}`);
const box = (n: number, b: number) => `${String.fromCharCode(65 + (b % n))}${Math.floor(b / n) + 1}`;
const dot = (n: number, i: number) => `${String.fromCharCode(65 + (i % (n + 1)))}${Math.floor(i / (n + 1)) + 1}`;
const rope = (n: number, e: number) => {
  const [a, b] = nets.edgeDots(n, e);
  return `${dot(n, a)} to ${dot(n, b)}`;
};
/** Seat-to-move decisions, oldest first. */
const decisions = (states: Position[], seat: Seat) =>
  states.slice(0, -1).flatMap((s, i) => (s.turn === seat ? [i] : []));

/** "See the best move": the decision worth looking at again, for `seat`. */
export function reviewGame(game: BenchGame, final: Position, seat: Seat): ReviewTask {
  if (final.outcome === null) return done(null);
  const states = replayStates(game, final),
    mine = decisions(states, seat);
  if (!mine.length) return done(null);
  const moment = (ply: number, show: number, kind: KeyMoment["kind"], title: string, text: string): KeyMoment => ({
    ply,
    before: states[ply],
    played: final.moves[ply],
    show,
    kind,
    title,
    text,
  });
  if (final.outcome === seat) return done(winningMove(game, states, final, seat, mine, moment));
  switch (game) {
    case "coconut-drop":
      return done(coconutLesson(states, final, seat, mine, moment));
    case "fishing-nets":
      return netsLesson(states, final, mine, moment);
    case "shell-pits":
      return pitsLesson(states, final, mine, moment);
    case "hidden-canoes":
      return canoesLesson(states, final, seat, mine, moment);
  }
}
type Make = (ply: number, show: number, kind: KeyMoment["kind"], title: string, text: string) => KeyMoment;

function winningMove(game: BenchGame, states: Position[], final: Position, seat: Seat, mine: number[], make: Make): KeyMoment {
  const last = mine[mine.length - 1],
    played = (i: number) => final.moves[i];
  if (game === "coconut-drop")
    return make(last, played(last), "your-win", "Your winning move", `Dropping in ${column(played(last))} finished four in a line.`);
  if (game === "hidden-canoes")
    return make(last, played(last), "your-win", "Your winning search", `${canoes.coordinate(played(last))} found your last canoe space.`);
  // Pits and Nets: the move after which the other side could no longer catch up.
  const e = edgeOf(final),
    total = game === "shell-pits" ? 48 : final.size * final.size,
    half = (total + e[0] + e[1]) / 2;
  const sealing = mine.find((i) => withEdge(states[i + 1])[seat] > half);
  const at = sealing ?? last;
  if (game === "shell-pits")
    return make(
      at,
      played(at),
      "your-win",
      "Your winning move",
      sealing !== undefined
        ? `Sowing ${pit(played(at))} gave you more than half of all the shells. After that the win was certain.`
        : `Sowing ${pit(played(at))} was your last move. Your shells were enough.`
    );
  return make(
    at,
    played(at),
    "your-win",
    "Your winning move",
    sealing !== undefined
      ? `Tying ${rope(final.size, played(at))} gave you more than half of the boxes. After that the win was certain.`
      : `Tying ${rope(final.size, played(at))} closed your last box.`
  );
}

function coconutLesson(states: Position[], final: Position, seat: Seat, mine: number[], make: Make): KeyMoment | null {
  const rival = other(seat);
  for (const i of mine) {
    const s = states[i],
      win = coconut.legal(s).find((c) => coconut.move(s, c).outcome === seat);
    if (win !== undefined && win !== final.moves[i])
      return make(i, win, "winning", "The winning move", `Dropping in ${column(win)} would have finished four in a line right away.`);
  }
  const threatAfter = (p: Position) => coconut.legal(p).some((c) => coconut.move(p, c).outcome === rival);
  for (const i of [...mine].reverse()) {
    const s = states[i];
    if (!threatAfter(states[i + 1])) continue;
    const safe = coconut.legal(s).find((c) => {
      const next = coconut.move(s, c);
      return next.outcome === null && !threatAfter(next);
    });
    if (safe !== undefined)
      return make(i, safe, "stronger", "A move to look at again", `Dropping in ${column(safe)} would have blocked the other coconut’s four.`);
  }
  return null;
}

/**
 * Fishing Nets advice is shown only when it is proven: a box whose rope touches nothing
 * else is always right to take, and any other advice must beat the played rope in an
 * exact search, which runs only once 16 or fewer ropes are open. The boxes named are the ones the rope really closes.
 */
function netsLesson(states: Position[], final: Position, mine: number[], make: Make): ReviewTask {
  const n = final.size;
  type Check = { i: number; ropes: number[]; text: (s: Position, rope: number) => string; title: string };
  const waiting = (s: Position, e: number) =>
    `Tying ${rope(n, e)} would have closed ${closedBy(s, e).map((b) => box(n, b)).join(" and ")} and kept your turn.`;
  const checks: Check[] = [];
  for (const i of mine) {
    const s = states[i],
      captures = nets.scoring(s);
    if (captures.length && !captures.includes(final.moves[i]))
      checks.push({ i, ropes: [...captures].sort((a, b) => nets.giveaway(s, b) - nets.giveaway(s, a)), text: waiting, title: "A box was waiting" });
  }
  const gifts: { i: number; better: number; gap: number; gave: number; least: number }[] = [];
  for (const i of mine) {
    const s = states[i],
      played = final.moves[i];
    if (nets.scoring(s).includes(played)) continue;
    const gave = nets.giveaway(s, played);
    if (!gave) continue;
    const options = nets.legal(s).filter((e) => !nets.scoring(s).includes(e)).map((e) => [e, nets.giveaway(s, e)] as const);
    const [better, least] = options.reduce((a, b) => (b[1] < a[1] ? b : a));
    if (least < gave) gifts.push({ i, better, gap: gave - least, gave, least });
  }
  // The biggest giveaway first, as before; equal gaps keep the earlier decision.
  for (const g of [...gifts].sort((a, b) => b.gap - a.gap || a.i - b.i))
    checks.push({
      i: g.i,
      ropes: [g.better],
      title: "A rope to look at again",
      text: (_, e) =>
        `That rope let the other player close ${g.gave} ${g.gave === 1 ? "box" : "boxes"}. Tying ${rope(n, e)} ${g.least ? `gave only ${g.least}` : "gave none"}.`,
    });
  let k = 0,
    exact: NetsExact | null = null,
    answer: KeyMoment | null = null,
    ready = false;
  const show = (c: Check, e: number) => {
    answer = make(c.i, e, "stronger", c.title, c.text(states[c.i], e));
    ready = true;
  };
  return {
    get done() {
      return ready;
    },
    result: () => answer,
    step(quota) {
      while (!ready && quota > 0) {
        const c = checks[k];
        if (!c) return (ready = true);
        const s = states[c.i],
          played = final.moves[c.i];
        // Proven without a search.
        const free = c.title === "A box was waiting" ? c.ropes.find((e) => isolatedCapture(s, e)) : undefined;
        if (free !== undefined) {
          show(c, free);
          break;
        }
        exact ??= new NetsExact(s, exactBudget);
        // The quota counts ropes the exact search looks at.
        const finished = exact.step(quota);
        quota = 0;
        if (!finished) break;
        const solved = exact;
        exact = null;
        k++;
        if (!solved.solved) continue;
        const beat = solved.valueOf(played)!,
          best = c.ropes.filter((e) => solved.valueOf(e)! > beat).sort((a, b) => solved.valueOf(b)! - solved.valueOf(a)!)[0];
        if (best !== undefined) show(c, best);
      }
      return ready;
    },
  };
}

/** Search both the best move and the played move at every decision, a slice at a time. */
function pitsLesson(states: Position[], final: Position, mine: number[], make: Make): ReviewTask {
  const WIN = 100000;
  const rows: { i: number; best: number; bestScore: number; playedScore: number }[] = [];
  let k = 0,
    phase: "best" | "played" = "best",
    search: IterativeSearch<Position> | null = null,
    best: { move: number | null; score: number } | null = null,
    answer: KeyMoment | null = null,
    finishedAll = false;
  const strip = (p: Position): Position => ({ ...p, moves: [] });
  const choose = () => {
    const missed = rows.filter((r) => r.best !== final.moves[r.i]);
    const win = missed.find((r) => r.bestScore >= WIN && r.playedScore < WIN);
    if (win)
      return make(win.i, win.best, "winning", "The winning move", `Sowing ${pit(win.best)} here wins, if you keep playing your best.`);
    // The first sow after which the other side could force a win, when another sow kept the game open.
    const opened = missed.find((r) => r.playedScore <= -WIN && r.bestScore > -WIN);
    if (opened)
      return make(opened.i, opened.best, "stronger", "A better sow", `After the sow you chose, the other side could win whatever you did next. Sowing ${pit(opened.best)} would have kept your chance to win.`);
    const drop = missed
      .filter((r) => Math.abs(r.bestScore) < WIN && Math.abs(r.playedScore) < WIN)
      .reduce<(typeof rows)[number] | null>((a, r) => (r.bestScore - r.playedScore > (a ? a.bestScore - a.playedScore : 23) ? r : a), null);
    if (!drop) return null;
    const shells = Math.max(2, Math.round((drop.bestScore - drop.playedScore) / 12));
    return make(drop.i, drop.best, "stronger", "A better sow", `Sowing ${pit(drop.best)} would have kept about ${shells} more shells for you.`);
  };
  return {
    get done() {
      return finishedAll;
    },
    result: () => answer,
    step(quota) {
      while (!finishedAll && quota > 0) {
        if (k >= mine.length) {
          answer = choose();
          finishedAll = true;
          break;
        }
        const i = mine[k],
          s = states[i];
        if (!search) {
          const child = states[i + 1];
          search =
            phase === "best"
              ? new IterativeSearch(strip(s), pitsRules, { ...pitsChallengeLimits, scoreForced: true })
              : child.outcome === null
                ? new IterativeSearch(strip(child), pitsRules, { depth: pitsChallengeLimits.depth - 1, nodes: pitsChallengeLimits.nodes, scoreForced: true })
                : null;
          if (!search) {
            // The played sow ended the game: score it exactly.
            const o = child.outcome;
            rows.push({ i, best: best!.move!, bestScore: best!.score, playedScore: o === "draw" ? 0 : o === s.turn ? WIN : -WIN });
            phase = "best";
            k++;
            continue;
          }
        }
        const before = search.nodes;
        const ready = search.step(Math.min(quota, 512));
        quota -= Math.max(1, search.nodes - before);
        if (!ready) continue;
        const r = search.result();
        search = null;
        if (phase === "best") {
          best = { move: r.move, score: r.score };
          phase = "played";
        } else {
          const child = states[i + 1],
            same = child.turn === s.turn;
          rows.push({ i, best: best!.move!, bestScore: best!.score, playedScore: same ? r.score : -r.score });
          phase = "best";
          k++;
        }
      }
      return finishedAll;
    },
  };
}

/** Fleet layouts that fit one chart: misses stay open water, every find is covered. */
export class CanoesCoverage {
  private readonly p3: number[][];
  private readonly p2: number[][];
  private readonly hits: number[];
  private next = 0;
  layouts = 0;
  readonly cover = Array<number>(36).fill(0);
  constructor(searched: readonly number[]) {
    const placements = (length: number) => {
      const out: number[][] = [];
      for (let i = 0; i < 36; i++)
        for (const d of [1, 6]) {
          const cells = Array.from({ length }, (_, j) => i + j * d);
          if (cells.every((p) => p < 36 && (d !== 1 || Math.floor(p / 6) === Math.floor(i / 6)) && searched[p] !== 1))
            out.push(cells);
        }
      return out;
    };
    this.hits = searched.flatMap((v, i) => (v === 2 ? [i] : []));
    this.p3 = placements(3);
    this.p2 = placements(2);
  }
  get done() {
    return this.next >= this.p3.length;
  }
  /** Counts every layout that starts with the next few long-canoe placements. */
  step(placements = 4): boolean {
    const { p2, hits, cover } = this;
    for (const end = Math.min(this.p3.length, this.next + placements); this.next < end; this.next++) {
      const a = this.p3[this.next];
      for (let x = 0; x < p2.length; x++) {
        const b = p2[x];
        if (b.some((c) => a.includes(c))) continue;
        for (let y = x + 1; y < p2.length; y++) {
          const c = p2[y];
          if (c.some((z) => a.includes(z) || b.includes(z))) continue;
          if (!hits.every((h) => a.includes(h) || b.includes(h) || c.includes(h))) continue;
          this.layouts++;
          for (const z of a) cover[z]++;
          for (const z of b) cover[z]++;
          for (const z of c) cover[z]++;
        }
      }
    }
    return this.done;
  }
}
function canoesLesson(states: Position[], final: Position, seat: Seat, mine: number[], make: Make): ReviewTask {
  // The last few searches only; each reads the chart as it was, never the fleet.
  const recent = mine.slice(-4).reverse();
  let k = 0,
    counting: CanoesCoverage | null = null,
    answer: KeyMoment | null = null,
    ready = false;
  return {
    get done() {
      return ready;
    },
    result: () => answer,
    step() {
      if (ready) return true;
      if (k >= recent.length) return (ready = true);
      const i = recent[k],
        searched = states[i].marks.slice(seat * 36, seat * 36 + 36);
      counting ??= new CanoesCoverage(searched);
      if (!counting.step()) return false;
      const { layouts, cover } = counting;
      counting = null;
      k++;
      const open = cover.map((n, c) => (searched[c] ? -1 : n));
      const bestCell = open.indexOf(Math.max(...open)),
        played = final.moves[i];
      if (layouts && open[played] < open[bestCell]) {
        answer = make(
          i,
          bestCell,
          "stronger",
          "The best chance",
          `${canoes.coordinate(bestCell)} had the best chance: ${Math.round((100 * open[bestCell]) / layouts)} of every 100 fleet layouts that fit your chart cover it. ${canoes.coordinate(played)} had ${Math.round((100 * open[played]) / layouts)}.`
        );
        ready = true;
      }
      return ready;
    },
  };
}
