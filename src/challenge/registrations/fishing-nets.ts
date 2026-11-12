import React, { lazy, Suspense } from "react";
import { defineReplayGame } from "../replay";
import { netsChainsEngine, netsPuzzles, type Action, type State } from "../../board/fishing-nets/challenge";
import type { ChallengeViewProps } from "../types";
export type { Payload, Action, State } from "../../board/fishing-nets/challenge";
// Loading the catalog never loads the board renderer.
const Board = lazy(() => import("../../board/fishing-nets/ChainsBoard").then((m) => ({ default: m.ChainsBoard })));
/** Fishing Nets chain endings, solved exactly. Help shows the next rope and the idea behind it. */
export const registration = defineReplayGame({
  game: "fishing-nets",
  codec: "nets-chains-v1",
  context: "nets",
  cove: false,
  budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 },
  puzzles: netsPuzzles,
  engine: netsChainsEngine,
  completionText: (_ref, result, facts) =>
    result.event === "together"
      ? "You won the ending together."
      : facts?.helpUsed
        ? "You used help and won the ending."
        : facts?.failed
          ? "You kept trying and won the ending."
          : "You kept control of the chains.",
  Board: (props: ChallengeViewProps<State, Action>) => React.createElement(Suspense, { fallback: null }, React.createElement(Board, props)),
  controls: { help: (): Action => ["h"], reset: (): Action => ["z"] },
});
registration.backLabel = "Back to Fishing Nets";
