import type { Save } from "./validation";
import type { LearnId, LearnSession } from "../learn/types";
import { validLearnSession } from "../learn/session";
import { dayNumber, recordPractice } from "../learn/skills";
export type LearnExpected = { id: string | null; revision?: number; epoch: number };
/** Reject callbacks from replaced rounds or an earlier backup generation (same rules as activities). */
export function applyLearnSave(save: Save, game: LearnId, next: LearnSession, expected: LearnExpected, epoch: number): Save {
  const current = save.learn?.[game];
  if (
    expected.epoch !== epoch ||
    (current?.id ?? null) !== expected.id ||
    (expected.revision !== undefined && current?.revision !== expected.revision) ||
    !validLearnSession(next, game)
  )
    return save;
  return { ...save, learn: { ...save.learn, [game]: next }, recentLearn: game, recentActivity: null };
}
export function applyPractice(save: Save, skill: string, correct: boolean, day = dayNumber()): Save {
  const skills = recordPractice(save.skills, skill, correct, day);
  return skills === save.skills ? save : { ...save, skills };
}
