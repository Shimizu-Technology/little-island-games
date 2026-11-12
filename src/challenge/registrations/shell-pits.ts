import React, { lazy, Suspense } from "react";
import { defineReplayGame } from "../replay";
import { pitsPuzzles, pitsTacticsEngine, type Action, type State } from "../../board/shell-pits/challenge";
import type { ChallengeViewProps } from "../types";
export type { Payload, Action, State } from "../../board/shell-pits/challenge";
// Loading the catalog never loads the board renderer.
const Board = lazy(() => import("../../board/shell-pits/TacticsBoard").then((m) => ({ default: m.TacticsBoard })));
/** Shell Pits endgames, certified by an exact solver. Help shows the next winning sow. */
export const registration = defineReplayGame({
  game: "shell-pits",
  codec: "pits-tactics-v1",
  context: "pits",
  cove: false,
  budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 },
  puzzles: pitsPuzzles,
  engine: pitsTacticsEngine,
  completionText: (_ref, result, facts) =>
    result.event === "together"
      ? "You won the endgame together."
      : facts?.helpUsed
        ? "You used help and won the endgame."
        : facts?.failed
          ? "You kept trying and won the endgame."
          : "You found the winning sows.",
  Board: (props: ChallengeViewProps<State, Action>) => React.createElement(Suspense, { fallback: null }, React.createElement(Board, props)),
  controls: { help: (): Action => ["h"], reset: (): Action => ["z"] },
});
registration.backLabel = "Back to Shell Pits";
