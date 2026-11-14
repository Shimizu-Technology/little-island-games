import React, { lazy, Suspense } from "react";
import { defineReplayGame } from "../replay";
import { canoesPuzzles, canoesScenarioEngine, type Action, type State } from "../../board/hidden-canoes/challenge";
import type { ChallengeViewProps } from "../types";
export type { Payload, Action, State } from "../../board/hidden-canoes/challenge";
// Loading the catalog never loads the board renderer.
const Board = lazy(() => import("../../board/hidden-canoes/ScenarioBoard").then((m) => ({ default: m.ScenarioBoard })));
/** Hidden Canoes deduction charts. Answers come from the chart alone; Help shows one and why. */
export const registration = defineReplayGame({
  game: "hidden-canoes",
  codec: "canoes-charts-v1",
  context: "canoes",
  cove: false,
  budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 },
  puzzles: canoesPuzzles,
  engine: canoesScenarioEngine,
  completionText: (_ref, result, facts) =>
    result.event === "together"
      ? "You worked out the chart together."
      : facts?.helpUsed
        ? "You used help and worked out the chart."
        : facts?.failed
          ? "You kept looking and worked out the chart."
          : "You read the chart.",
  Board: (props: ChallengeViewProps<State, Action>) => React.createElement(Suspense, { fallback: null }, React.createElement(Board, props)),
  controls: { help: (): Action => ["h"], reset: (): Action => ["z"] },
});
registration.backLabel = "Back to Hidden Canoes";
