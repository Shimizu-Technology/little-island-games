import { schoolContext } from '../challenge/catalog';
import { completedSignal } from '../challenge/offers';
import { progressFor, putProgress } from '../state/challengeDrafts';
import { creditProgress, saveCatalog, validChallengeProgress, challengeLimit, progressBytes } from '../state/challenge';
import { independentRound, creditSchool, creditSchoolTogether, validSchoolTogether, type SchoolTogetherProgress } from './schoolProgress';
import { encodeSave } from '../state/profiles';
import { withinSaveLimit } from '../state/validation';
import type { Save } from "../state/validation";
import type { LearnId, LearnSession } from "./types";
import { engines } from "./engines";
import { finished } from "./session";
import { growthProgress, growthQuestions, isGrowth } from "./growth/engine";
import type { GrowthState } from "./growth/types";
import { scaleTogetherRefs, type ScaleState } from "./games/shell-scale/engine";
import { levelRoundSkill, recordLearning } from "./learners";
import { levelOf, levelStage } from "./levels";
import { dayNumber } from "./skills";

function putSchoolTogether(save: Save, owner: string, schoolTogether: SchoolTogetherProgress): Save {
  if (!save.profiles || !Object.hasOwn(save.profiles.people, owner)) return save;
  const next: Save = {
    ...save,
    profiles: {
      ...save.profiles,
      people: {
        ...save.profiles.people,
        [owner]: { ...save.profiles.people[owner], schoolTogether },
      },
    },
  };
  return owner === (save.learning?.active ?? 'family') ? { ...next, schoolTogether } : next;
}

/**
 * PLAN §8: Scale-Holder Together co-play credits both surviving people atomically without touching
 * School stars, signals, learner notes, or personal Challenge recent history.
 * If an existing owner/partner cannot be admitted within byte limits, returns `before` so the
 * finish remains retryable instead of silently dropping credit.
 */
function creditShellScaleTogether(before: Save, after: Save, next: LearnSession): Save {
  const state = next.state as ScaleState;
  if (state.practice || !after.profiles) return after;
  const owner = next.learner ?? 'family';
  const active = after.learning?.active ?? 'family';
  // Distinguish genuinely removed partners (not in learning.people) from existing partners.
  const partner =
    state.partner && state.partner !== owner && after.learning?.people.some(p => p.id === state.partner)
      ? state.partner
      : null;
  const recipients = [...new Set([owner, ...(partner ? [partner] : [])])];
  const refs = scaleTogetherRefs(state);
  const level = levelOf(next.options);
  let candidate = after;
  for (const person of recipients) {
    if (!Object.hasOwn(candidate.profiles!.people, person)) return before;
    const prevTogether =
      person === active
        ? (candidate.schoolTogether ?? candidate.profiles!.people[person].schoolTogether)
        : candidate.profiles!.people[person].schoolTogether;
    const nextTogether = creditSchoolTogether(prevTogether, 'shell-scale', level, next.id);
    if (!validSchoolTogether(nextTogether)) return before;
    candidate = putSchoolTogether(candidate, person, nextTogether);
    if (refs.length > 0) {
      let progress = progressFor(candidate, person);
      if (!progress) return before;
      // Preserve personal Challenge `recent` history verbatim (PLAN §8 keeps Together out of personal offers).
      const originalRecent = progress.recent;
      for (const { bank: slot, puzzle } of refs) {
        const bank = saveCatalog.banks.get(slot);
        if (!bank) continue;
        progress = {
          ...creditProgress(
            progress,
            { bank: slot, puzzle, engine: 'shell-scale', rules: bank.rules, hash: '' },
            { event: 'together', awards: 0, dares: [], cost: null, solution: null },
            saveCatalog,
            false,
          ),
          recent: originalRecent,
        };
      }
      if (!validChallengeProgress(progress, person, saveCatalog, false)) return before;
      candidate = putProgress(candidate, person, progress);
    }
  }
  return withinSaveLimit(encodeSave(candidate)) ? candidate : before;
}

/** A round summary is separate from individual answers and optional warm-up practice. */

export function recordLevelRound(before: Save, after: Save, game: LearnId, day = dayNumber()): Save {
  const old = before.learn?.[game], next = after.learn?.[game];
  if (old && next && old.id === next.id && !finished(old) && finished(next) &&
      (next.learner ?? 'family') === (after.learning?.active ?? 'family')) {
    if (game === 'shell-scale' && next.options.mode === 'together') {
      return creditShellScaleTogether(before, after, next);
    }
    after = { ...after, school: creditSchool(after.school, { ...next, levelHelped: old.levelHelped === false ? next.levelHelped : old.levelHelped }, day) };
  }
  if (!old || !next || old.id !== next.id || finished(old) || !finished(next) || next.options.mode !== "solo" ||
    (next.learner ?? "family") === "family" || next.learner !== after.learning?.active ||
    old.levelHelped === undefined || next.levelHelped === undefined) return after;
  let helped = old.levelHelped || next.levelHelped || !!engines[game].notWon?.(next.state, next.options) || !!engines[game].helpedWork?.(next.state, next.options);
  if (isGrowth(next.state)) {
    const s = next.state as GrowthState;
    helped ||= growthProgress(s, growthQuestions(game, next.options, s)).clean.some(clean => !clean);
  }
  // Browsing vocabulary is discovery, not independent word recognition.
  if (game === "hafa-adai" && !next.options.stage && (next.state as { activity: string }).activity !== "spy") helped = true;
  const learning = recordLearning(after.learning, next.learner!, game, levelStage(next.options), levelRoundSkill, "completed-round", next.id, helped, day);
  if(learning!==after.learning)after={...after,learning};
  const progress=progressFor(after,next.learner!);
  if(progress){
    const optional=completedSignal(progress,schoolContext(game,levelOf(next.options)),independentRound(next),true), candidate=putProgress(after,next.learner!,optional);
    if(progressBytes(optional)<=challengeLimit()&&withinSaveLimit(encodeSave(candidate)))after=candidate;
  }
  return after;
}
