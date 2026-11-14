import React, { lazy, Suspense } from "react";
import { defineReplayGame } from "../../../challenge/replay";
import type { ChallengeViewProps, Puzzle } from "../../../challenge/types";
import { challengeEngine, type Action, type Descriptor, type State } from "./challenge-engine";
import { soundBoatProduction } from "./challenge-content";
export type { Payload, Action, State } from "./challenge-engine";
const Board = lazy(() => import("./challenge-view").then((m) => ({ default: m.ChallengeBoard })));
/** The Sound Boat Challenge over a set of puzzles. Production passes only reviewed, admitted words. */
export function defineSoundBoat(puzzles: readonly Puzzle<Descriptor>[]) {
  const entry = defineReplayGame({
    game: "sound-boat", codec: "sound-boat-proof-v1", context: "sbt", cove: false,
    budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 },
    puzzles, engine: challengeEngine, helpUI: "board",
    assistance: { bytes: 320, actions: 12, idempotentHelp: true, isAction: (a: Action) => a[0] === "h" },
    Board: (p: ChallengeViewProps<State, Action>) => <Suspense fallback={null}><Board {...p} /></Suspense>,
    controls: { help: (): Action => ["h"], reset: (): Action => ["z"] },
    completionText: (_ref, result, facts) =>
      result.event === "independent" ? "You built the word." : facts?.helpUsed ? "You built the word, with help along the way." : "You kept trying and built the word.",
  });
  entry.dareHelp = "Help keeps your finish, without a dare mark. Hearing the word again keeps it too, but not the own-read mark.";
  return entry;
}
export const registration = defineSoundBoat(soundBoatProduction());
