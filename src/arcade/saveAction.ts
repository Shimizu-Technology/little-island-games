import { rewardCompletion } from '../badges/transitions';
import { recordLearning } from "../learn/learners";
import { recordPracticeNote } from "../practice/notes";
import type { Save } from "../state/validation";
import { creditProgress, dareBits, saveCatalog, validChallengeProgress } from "../state/challenge";
import { progressFor, putProgress } from "../state/challengeDrafts";
import { arcadeDare, dareMet, dareRef } from "./dares";
import { emptyArcade, arcadeTransition, type ArcadeAction } from "./progress";
import type { ArcadeExpected } from "./types";
/** The active learner's permanent Arcade dare mark, read from their Challenge marks. */
export function dareMarked(save: Save, owner: string, slot: number): boolean {
  const progress = progressFor(save, owner), bits = progress ? dareBits(progress.dares) : null;
  return !!bits?.[slot];
}
/** One atomic progress/practice write, owned by the active learner and restore generation. */
export function applyArcadeAction(before: Save, action: ArcadeAction, expected: ArcadeExpected, epoch: number): Save {
  const owner = before.learning?.active ?? "family";
  if (expected.epoch !== epoch || expected.learner !== owner) return before;
  const base = before.arcade ?? emptyArcade(), arcade = arcadeTransition(base, owner, action);
  if (arcade === base && !(action.type === "visit" && (before.recent || before.recentActivity || before.recentLearn || before.recentBoard))) return before;
  let next: Save = { ...before, arcade };
  if (action.type === "visit") next = { ...next, recent: null, recentActivity: null, recentLearn: null, recentBoard: null };
  // AR-10: a cleared finish launched with a dare records the attempt and, when the engine's facts
  // prove it, the permanent mark, in this same write. A refused credit never blocks the stars.
  if (action.type === "finish" && action.dare !== undefined && action.stars > 0) {
    const dare = arcadeDare(action.dare), progress = progressFor(next, owner);
    if (dare && progress) {
      const earned = dareMet(dare, true, action.facts);
      const credited = creditProgress(progress, dareRef(dare), { event: action.helped ? "helped" : "independent", awards: 0, dares: earned ? [dare.slot] : [], cost: null, solution: null }, saveCatalog);
      if (validChallengeProgress(credited, owner, saveCatalog)) next = putProgress(next, owner, credited);
    }
  }
  if (action.type === "claim-chest") {
    // Only an accepted, unconsumed chest reaches here. A double tap cannot double-credit notes.
    const result = action.result, math = result.skill.startsWith("num.");
    const stage = math ? action.config.mathStage ?? (action.config.limit === 10 ? "easy" : "medium") : action.config.readingStage ?? "easy";
    next = { ...next, practiceNotes: recordPracticeNote(before.practiceNotes, result.skill, result.helped), learning: recordLearning(before.learning, owner, math ? "quick-practice" : "which-one", stage, result.skill, "arcade-chest", action.round, result.helped) };
    next = rewardCompletion(next, { kind: "learning", game: math ? "quick-practice" : "which-one", level: ["easy","medium","hard","stretch","deep"].indexOf(stage) + 1, helped: result.helped }, owner);
  }
  return next;
}
