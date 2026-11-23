import React from "react";
import { defineReplayGame } from "../../../challenge/replay";
import type { AwardRule, ChallengeViewProps } from "../../../challenge/types";
import { shapeShiftAdapter } from "../../../puzzles/adapters/shape-shift";
import type { BankLoader } from "../../../puzzles/loader";
import { shapeChallengePuzzles } from "./challenge-content";
import {
  ASSIST_ACTIONS,
  ASSIST_BYTES,
  challengeEngine,
  isHelpAction,
  type Action,
  type ShapeChallengeDescriptor,
  type State,
} from "./challenge-engine";
import facts from "./packs.generated.json";

export type { Action, Payload, State } from "./challenge-engine";

const BAND_META: Record<string, { tier: 1 | 2 | 3 | 4 | 5 | 6; title: string }> = {
  a: { tier: 1, title: "Picture silhouettes" },
  b: { tier: 2, title: "Shaped outlines" },
  c: { tier: 3, title: "Five-piece islands" },
  d: { tier: 4, title: "Spare & multi-way" },
  e: { tier: 5, title: "Varied cube nets" },
  f: { tier: 6, title: "Tangram outlines" },
};

const cleanAward: AwardRule = { rule: { kind: "clean" }, help: "independent" };

let board: typeof import("./challenge-view").ChallengeBoard | undefined;
function LazyBoard(props: ChallengeViewProps<State, Action>) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  board ??= (require("./challenge-view") as typeof import("./challenge-view")).ChallengeBoard;
  return React.createElement(board, props);
}

export const makeRegistration = (loader?: () => Pick<BankLoader, "entry" | "savedHash">) => {
  const reg = defineReplayGame<ShapeChallengeDescriptor, 0, Action, State>({
    game: "shape-shift",
    codec: "shape-shift-v1",
    context: "shape",
    cove: false,
    budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 },
    puzzles: shapeChallengePuzzles,
    engine: challengeEngine,
    helpUI: "board",
    assistance: { bytes: ASSIST_BYTES, actions: ASSIST_ACTIONS, idempotentHelp: false, isAction: isHelpAction },
    Board: LazyBoard,
    controls: { help: (): Action => ["h"], reset: (): Action => ["z"] },
    packed: {
      family: "shape-shift",
      awards: 1,
      loader,
      banks: facts.map((f) => {
        const meta = BAND_META[f.band] ?? { tier: 1 as const, title: "Island outline" };
        return {
          slot: f.slot,
          first: f.first,
          count: f.count,
          packHash: f.packHash,
          rules: f.rules,
          path: "endless" as const,
          tier: meta.tier,
          title: meta.title,
        };
      }),
      open: async (ldr, ordinal) => {
        const e = await ldr.entry(shapeShiftAdapter, "shape-shift", ordinal);
        const title =
          e.payload.kind === "cube-opp"
            ? `Fold the ${e.payload.netName.toLowerCase()}`
            : e.payload.kind === "cube-fold"
              ? "Which net folds into a cube?"
              : e.payload.kind === "tangram"
                ? `Tangram · ${e.payload.name}`
                : e.payload.name;
        return {
          ref: e.ref,
          descriptor: { payload: e.payload, title, outlineOnly: true },
        };
      },
      describe: (d) => {
        const count = d.payload.kind === "poly" || d.payload.kind === "tangram" ? d.payload.pieces.length : 1;
        return { awards: [cleanAward, null], par: { metric: "placements", lower: count, upper: count } };
      },
    },
    completionText: (_ref, result) =>
      result.event === "independent"
        ? "Every piece locked into an exact fit on your own!"
        : "You completed the exact silhouette.",
  });
  reg.dareHelp = "Dares are optional. Pieces land exactly where you drop them, and any valid exact fill counts.";
  return reg;
};

export const registration = makeRegistration();
