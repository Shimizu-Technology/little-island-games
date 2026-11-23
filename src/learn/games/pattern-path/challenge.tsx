import React from "react";
import { defineReplayGame } from "../../../challenge/replay";
import type { AwardRule, ChallengeViewProps } from "../../../challenge/types";
import { patternPathAdapter } from "../../../puzzles/adapters/pattern-path";
import type { BankLoader } from "../../../puzzles/loader";
import { patternChallengePuzzles } from "./challenge-content";
import {
  ASSIST_ACTIONS,
  ASSIST_BYTES,
  HELP,
  RESET,
  challengeEngine,
  isHelpAction,
  type Action,
  type PatternChallengeDescriptor,
  type State,
} from "./challenge-engine";
import facts from "./packs.generated.json";
import { RULE_BY_ID } from "./rules";

export type { Action, Payload, State } from "./challenge-engine";

const BAND_META: Record<string, { tier: 1 | 2 | 3 | 4 | 5 | 6; title: string }> = {
  a: { tier: 1, title: "Color cycles" },
  b: { tier: 2, title: "Shells & turns" },
  c: { tier: 3, title: "Steps & two clues" },
  d: { tier: 4, title: "Growth rules" },
  e: { tier: 5, title: "Two rules & two gaps" },
  f: { tier: 6, title: "3 × 3 Pattern grids" },
};

const cleanAward: AwardRule = { rule: { kind: "clean" }, help: "independent" };

// Keep Node-side catalog tests free of React Native imports by lazy-loading the view only on render.
let board: typeof import("./challenge-view").ChallengeBoard | undefined;
function LazyBoard(props: ChallengeViewProps<State, Action>) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  board ??= (require("./challenge-view") as typeof import("./challenge-view")).ChallengeBoard;
  return React.createElement(board, props);
}

export const makeRegistration = (loader?: () => Pick<BankLoader, "entry" | "savedHash">) => {
  const reg = defineReplayGame<PatternChallengeDescriptor, 0, Action, State>({
    game: "pattern-path",
    codec: "pattern-path-v1",
    context: "pattern",
    cove: false,
    budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 },
    puzzles: patternChallengePuzzles,
    engine: challengeEngine,
    helpUI: "board",
    assistance: { bytes: ASSIST_BYTES, actions: ASSIST_ACTIONS, idempotentHelp: false, isAction: isHelpAction },
    Board: LazyBoard,
    controls: { help: (): Action => HELP, reset: (): Action => RESET },
    packed: {
      family: "pattern-path",
      awards: 1,
      loader,
      banks: facts.map((f) => {
        const meta = BAND_META[f.band] ?? { tier: 1 as const, title: "Pattern trail" };
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
        const e = await ldr.entry(patternPathAdapter, "pattern-path", ordinal);
        const rule = RULE_BY_ID[e.payload.ruleId];
        return {
          ref: e.ref,
          descriptor: {
            payload: e.payload,
            title: e.payload.tiles.length === 9 ? "3 × 3 Pattern grid" : e.payload.gaps.length > 1 ? "Two-gap pattern trail" : "Pattern trail",
            ruleHint: rule.lookCue,
          },
        };
      },
      describe: (d) => {
        const steps = d.payload.gaps.length + (d.payload.ruleChoices ? 1 : 0);
        return { awards: [cleanAward, null], par: { metric: "steps", lower: steps, upper: steps } };
      },
    },
    completionText: (_ref, result) =>
      result.event === "independent"
        ? "You spotted the rule and finished the trail on your own!"
        : "You worked out the pattern trail.",
  });
  reg.dareHelp = "Dares are optional. In Say-the-rule puzzles, choose the rule card and the missing stone, then tap Check.";
  return reg;
};

export const registration = makeRegistration();
