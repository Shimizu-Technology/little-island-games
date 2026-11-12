import React, { lazy, Suspense } from "react";
import { defineReplayGame } from "../replay";
import { memoryDarePuzzles } from "../../games/classics/puzzles";
import { memoryDareEngine, type Action, type State, type Initial } from "../../games/classics/memoryDares";
import type { ChallengeViewProps, ReplayPayload } from "../types";
export type { Action, State } from "../../games/classics/memoryDares";
export type Payload = ReplayPayload<Initial, Action>;
const Board = lazy(() => import("../../screens/classics/MemoryDareBoard").then(m => ({ default: m.MemoryDareBoard })));
export const registration = defineReplayGame({
  game: "memory", codec: "memdare-v1", context: "memdare", cove: false,
  budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 },
  puzzles: memoryDarePuzzles, engine: memoryDareEngine,
  completionText: (_ref, result, facts) => result.event === "together" ? "You finished this puzzle together." : facts?.helpUsed ? "You used help and finished this puzzle." : facts?.failed ? "You kept trying and finished this puzzle." : "Every card found its pair.",
  Board: (props: ChallengeViewProps<State, Action>) => React.createElement(Suspense, { fallback: null }, React.createElement(Board, props)),
  controls: { help: (): Action => ["h"], reset: (): Action => ["z"] },
});
registration.backLabel = "Back to Memory Pairs";
