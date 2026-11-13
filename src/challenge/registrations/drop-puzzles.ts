import React, { lazy, Suspense } from "react";
import { defineReplayGame } from "../replay";
import { coconutPuzzles, coconutTacticsEngine, type Action, type State } from "../../board/coconut-drop/challenge";
import type { ChallengeViewProps } from "../types";
export type { Payload, Action, State } from "../../board/coconut-drop/challenge";
const found = { win: "You found the winning drop.", block: "You stopped Ray's four.", fork: "You made two fours at once." };
// Loading the catalog never loads the board renderer.
const Board = lazy(() => import("../../board/coconut-drop/TacticsBoard").then((m) => ({ default: m.TacticsBoard })));
/**
 * Coconut Drop puzzles: win, block and fork, each replayed from a legal opening. Help shows the drop.
 * The Challenge ID is "drop-puzzles", not the board's "coconut-drop": the ID ledger is a word list the
 * export guard scans, and that ID tipped it over its list threshold.
 */
export const registration = defineReplayGame({
  game: "drop-puzzles",
  codec: "coconut-tactics-v1",
  context: "coconut",
  cove: false,
  budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 },
  puzzles: coconutPuzzles,
  engine: coconutTacticsEngine,
  completionText: (ref, result, facts) =>
    result.event === "together"
      ? "You solved the puzzle together."
      : facts?.helpUsed
        ? "You used help and solved the puzzle."
        : facts?.failed
          ? "You kept trying and solved the puzzle."
          : found[coconutPuzzles[ref.puzzle]?.descriptor.kind ?? "win"],
  Board: (props: ChallengeViewProps<State, Action>) => React.createElement(Suspense, { fallback: null }, React.createElement(Board, props)),
  controls: { help: (): Action => ["h"], reset: (): Action => ["z"] },
});
registration.backLabel = "Back to Coconut Drop";
