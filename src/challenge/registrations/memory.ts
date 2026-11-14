import { jsonBytes } from "../../state/saveBits";
import { validChallengeSession } from "../../state/challenge";
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
  prefilledStart: payload => !!payload.initial.prior && payload.actions.length === 1 && payload.actions[0][0] === "h",
  completionText: (_ref, result, facts) => result.event === "together" ? "You finished this puzzle together." : facts?.helpUsed ? "You used help and finished this puzzle." : facts?.failed ? "You kept trying and finished this puzzle." : "Every card found its pair.",
  Board: (props: ChallengeViewProps<State, Action>) => React.createElement(Suspense, { fallback: null }, React.createElement(Board, props)),
  controls: { help: (): Action => ["h"], reset: (): Action => ["z"] },
});
registration.backLabel = "Back to Memory Pairs";

// The replay stays intact. Capacity ends this attempt explicitly; a fresh board carries
// lifetime reveal cost and assistance, so repeated attempts cannot earn a target for free.
registration.full = s => jsonBytes(s) + 16 > 3584 || (s.payload as Payload).actions.length + 1 > 496;
registration.restart = (session, id, progress) => {
  if (session.result || !validChallengeSession(session, session.owner, registration.catalog)) throw new Error("Invalid Memory attempt.");
  const puzzle = memoryDarePuzzles.find(p => p.ref.hash === session.puzzle.hash)!;
  const payload = session.payload as Payload;
  let state = memoryDareEngine.create(puzzle.descriptor, payload.initial, payload.options);
  for (const action of payload.actions) state = memoryDareEngine.step(state, action, puzzle.descriptor)!.state;
  const initial: Initial = { version: 1, prior: { runs: payload.initial.prior?.runs ?? 0, failed: payload.initial.prior?.failed ?? false, flips: Math.min(65535, state.flips), previewed: state.previewed, seen: state.seen } };
  const started = registration.start(session.puzzle, session.owner, id, progress, payload.options, session.selectedDares);
  let next = { ...started, payload: { ...(started.payload as Payload), initial } };
  if (payload.actions.some(a => a[0] === "h")) next = registration.move(next, ["h"])! as typeof next;
  return { ...next, revision: 0 };
};
