import React, { lazy, Suspense } from "react";
import { defineReplayGame } from "../replay";
import { ticForkPuzzles } from "../../games/classics/puzzles";
import { ticForkEngine, type Action, type State, type Initial } from "../../games/classics/ticForks";
import type { ChallengeViewProps, ReplayPayload } from "../types";
export type { Action, State } from "../../games/classics/ticForks";
export type Payload = ReplayPayload<Initial, Action>;
const Board = lazy(() => import("../../screens/classics/TicForkBoard").then(m => ({ default: m.TicForkBoard })));
export const registration = defineReplayGame({
  game: "tic-tac-toe", codec: "fork-v1", context: "fork", cove: false,
  budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 },
  puzzles: ticForkPuzzles, engine: ticForkEngine,
  completionText: (_ref, result, facts) => result.event === "together" ? "You finished this puzzle together." : facts?.helpUsed ? "You used help and finished this puzzle." : facts?.failed ? "You kept trying and finished this puzzle." : "You found a fork: two different winning squares.",
  Board: (props: ChallengeViewProps<State, Action>) => React.createElement(Suspense, { fallback: null }, React.createElement(Board, props)),
  controls: { help: (): Action => ["h"], reset: (): Action => ["z"] },
});
registration.backLabel = "Back to Tic-tac-toe";
