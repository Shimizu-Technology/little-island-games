import type { Seat } from "../games/match";
import type { Strength } from "../board/types";

/** Games whose computer player is a registered policy. */
export const policyGames = ["coconut-drop", "fishing-nets", "hidden-canoes", "shell-pits", "checkers"] as const;
export type PolicyGame = (typeof policyGames)[number];
/** Board games where nothing is hidden from either player. */
export type OpenBoardGame = "coconut-drop" | "fishing-nets" | "shell-pits";

/**
 * `<game>/<strength>@<revision>`. An ID never changes meaning: a stronger or
 * different search is a new revision, and saved rounds keep the one they began with.
 */
export type PolicyId = `${PolicyGame}/${Strength}@${number}`;

/**
 * What a seat may see in a game with no hidden state. `seed` is listed because
 * Fishing Nets breaks ties with it; on these boards it decides nothing secret.
 */
export type OpenView = Readonly<{
  game: OpenBoardGame;
  seat: Seat;
  size: number;
  seed: number;
  board: readonly number[];
  marks: readonly number[];
  scores: readonly [number, number];
  edge: readonly [number, number];
  plies: number;
}>;
/**
 * Hidden Canoes as one seat sees it: its own fleet, its own searches, and the
 * other seat's searches of its lagoon. There is no field for the other fleet
 * and no seed, because the seed lays out both fleets.
 */
export type CanoesView = Readonly<{
  game: "hidden-canoes";
  seat: Seat;
  ownFleet: readonly number[];
  searched: readonly number[];
  incoming: readonly number[];
  scores: readonly [number, number];
  edge: readonly [number, number];
  plies: number;
}>;
export type PublicView = OpenView | CanoesView;

/** A decision in progress. Strength comes from the node count, not the clock. */
export type PolicyTask = {
  readonly done: boolean;
  step: (quota: number) => boolean;
  /** The chosen move once done; null when no move exists. */
  move: () => number | null;
  readonly nodes: number;
};
/**
 * A shipped policy. Every field is readonly and every policy object, its limits and the
 * rules its chooser reads are frozen at runtime: the ID fixes the real search budget.
 */
export type BoardPolicy = Readonly<{
  id: PolicyId;
  game: Exclude<PolicyGame, "checkers">;
  strength: Strength;
  revision: number;
  /**
   * False only for an archived revision that read state outside the public view.
   * It stays so rounds saved under it can finish exactly as they began.
   */
  publicOnly: boolean;
  /** Fixed by the ID. No caller can change a policy's depth or node budget. */
  limits: SearchBudget | null;
  /** Plain words a child can read. Each claim is checked by a test. */
  plays: string;
  choose: (view: PublicView, rng: () => number) => PolicyTask;
}>;
export type SearchBudget = Readonly<{ depth: number; nodes: number }>;
export const finished = (move: number | null): PolicyTask => ({ done: true, step: () => true, move: () => move, nodes: 0 });
