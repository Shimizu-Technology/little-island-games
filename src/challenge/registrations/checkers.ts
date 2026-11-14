import React, { lazy, Suspense } from "react";
import { defineReplayGame } from "../replay";
import { checkersTacticsPuzzles } from "../../games/classics/puzzles";
import { checkersTacticsEngine, type Action, type State, type Initial } from "../../games/classics/checkersTactics";
import type { ChallengeViewProps, ReplayPayload } from "../types";
export type { Action, State } from "../../games/classics/checkersTactics";
export type Payload = ReplayPayload<Initial, Action>;
const Board = lazy(() => import("../../screens/classics/CheckersTacticsBoard").then(m => ({ default: m.CheckersTacticsBoard })));
export const registration = defineReplayGame({
  game: "checkers", codec: "tactic-v1", context: "tactic", cove: false,
  budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 },
  puzzles: checkersTacticsPuzzles, engine: checkersTacticsEngine,
  completionText: (_ref, result, facts) => result.event === "together" ? "You finished this puzzle together." : facts?.helpUsed ? "You used help and finished this puzzle." : facts?.failed ? "You kept trying and finished this puzzle." : "You found the winning capture.",
  Board: (props: ChallengeViewProps<State, Action>) => React.createElement(Suspense, { fallback: null }, React.createElement(Board, props)),
  controls: { help: (): Action => ["h"], reset: (): Action => ["z"] },
});
registration.backLabel = "Back to Checkers";
