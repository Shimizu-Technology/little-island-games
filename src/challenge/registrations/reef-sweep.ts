import React, { lazy, Suspense } from "react";
import { defineReplayGame } from "../replay";
import { reefSweepAdapter } from "../../puzzles/adapters/reef-sweep";
import {
  ASSIST_ACTIONS,
  ASSIST_BYTES,
  awardsFor,
  descriptorFromPayload,
  isAssistAction,
  isRecoveryAction,
  reefChallengeEngine,
  reefDeepPuzzles,
  reefPackedBanks,
  type Action,
  type State,
} from "../../board/reef-sweep/challenge";
import type { ChallengeViewProps } from "../types";

export type { Payload, Action, State } from "../../board/reef-sweep/challenge";

const Board = lazy(() =>
  import("../../board/reef-sweep/ChallengeBoard").then((m) => ({ default: m.ReefChallengeBoard }))
);

/**
 * Reef Sweep tiered deduction Challenge (BD-09, BK-21):
 * - Deep Water: 12 curated certified boards with dares (bank 468, dares 3350-3373)
 * - Endless Tide: 128 certified packed boards across 4 deduction tiers (banks 464-467)
 */
export const registration = defineReplayGame({
  game: "reef-sweep",
  codec: "reef-sweep-deduction-v1",
  context: "reef",
  cove: false,
  budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 },
  helpUI: "board",
  assistance: {
    bytes: ASSIST_BYTES,
    actions: ASSIST_ACTIONS,
    idempotentHelp: true,
    isAction: isAssistAction,
    isRecovery: isRecoveryAction,
  },
  puzzles: reefDeepPuzzles,
  engine: reefChallengeEngine,
  completionText: (_ref, result, facts) =>
    result.event === "together"
      ? "You deduced every pearl space together."
      : facts?.helpUsed
        ? "You used public clues and cleared the reef."
        : facts?.failed
          ? "You kept thinking and cleared every pearl."
          : "Every pearl deduced with no guessing.",
  Board: (props: ChallengeViewProps<State, Action>) =>
    React.createElement(Suspense, { fallback: null }, React.createElement(Board, props)),
  controls: { help: (): Action => ["h", 0], reset: (): Action => ["z"] },
  packed: {
    family: "reef-sweep",
    banks: reefPackedBanks,
    awards: 3,
    open: async (loader, ordinal) => {
      const entry = await loader.entry(reefSweepAdapter, "reef-sweep", ordinal);
      return { ref: entry.ref, descriptor: descriptorFromPayload(entry.payload, entry.band) };
    },
    describe: (d) => ({
      awards: awardsFor(d),
      par: { metric: "steps", lower: d.parLower, upper: d.parUpper },
    }),
  },
});
registration.backLabel = "Back to Reef Sweep";
