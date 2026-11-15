import React, { lazy, Suspense } from "react";
import { defineReplayGame } from "../../../challenge/replay";
import type { ChallengeViewProps } from "../../../challenge/types";
import { challengeEngine, type Action, type State } from "./challenge-engine";
import { shellPuzzles } from "./challenge-content";
export type { Payload, Action, State } from "./challenge-engine";

const Board = lazy(() => import("./challenge-view").then((m) => ({ default: m.ChallengeBoard })));
/**
 * Shell Math in Challenge: five Endless Tide banks (420-424, one per level) and a Deep Water collection (425),
 * with level dares in slots 1000-1079. The board owns its Help ladder, so it declares the reserve it needs: three
 * stages on each of about five steps, the choices switch, and the result.
 */
export const registration = defineReplayGame({
  game: "shell-math", codec: "shell-math-proof-v1", context: "shell", cove: false,
  budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 },
  puzzles: shellPuzzles, engine: challengeEngine, helpUI: "board",
  assistance: { bytes: 420, actions: 24, idempotentHelp: false, isAction: (a: Action) => a[0] === "h" || a[0] === "k" },
  Board: (p: ChallengeViewProps<State, Action>) => <Suspense fallback={null}><Board {...p} /></Suspense>,
  controls: { help: (): Action => ["h"], reset: (): Action => ["z"] },
  completionText: (_ref, result) => (result.event === "independent" ? "You worked it out step by step." : "You kept going and worked it out."),
});
registration.dareHelp = "Dares are optional. Help keeps your finish, without a dare mark.";
