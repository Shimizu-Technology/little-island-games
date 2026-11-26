import { schoolContext } from '../challenge/catalog';
import { completedSignal } from '../challenge/offers';
import { progressFor, putProgress } from '../state/challengeDrafts';
import { creditProgress, saveCatalog, validChallengeProgress, challengeLimit, progressBytes } from '../state/challenge';
import { independentRound , creditSchool } from './schoolProgress';
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

/** PLAN §8: Scale-Holder Together co-play credits both surviving people atomically without touching School stars or signals. */
function creditShellScaleTogether(after: Save, next: LearnSession): Save {
  const state = next.state as ScaleState;
  const owner = next.learner ?? 'family';
  const partner =
    state.partner && state.partner !== owner && after.learning?.people.some(p => p.id === state.partner)
      ? state.partner
      : null;
  const refs = scaleTogetherRefs(state);
  if (!refs.length) return after;
  const recipients = [...new Set([owner, ...(partner ? [partner] : [])])];
  let candidate = after;
  for (const person of recipients) {
    let progress = progressFor(candidate, person);
    if (!progress) continue;
    for (const { bank: slot, puzzle } of refs) {
      const bank = saveCatalog.banks.get(slot);
      if (!bank) continue;
      progress = creditProgress(
        progress,
        { bank: slot, puzzle, engine: 'shell-scale', rules: bank.rules, hash: '' },
        { event: 'together', awards: 0, dares: [], cost: null, solution: null },
        saveCatalog,
        false,
      );
    }
    if (!validChallengeProgress(progress, person, saveCatalog, false)) {
      if (person === owner) return after;
      continue;
    }
    candidate = putProgress(candidate, person, progress);
  }
  return withinSaveLimit(encodeSave(candidate)) ? candidate : after;
}

/** A round summary is separate from individual answers and optional warm-up practice. */

export function recordLevelRound(before: Save, after: Save, game: LearnId, day = dayNumber()): Save {
  const old = before.learn?.[game], next = after.learn?.[game];
  if (old && next && old.id === next.id && !finished(old) && finished(next) &&
      (next.learner ?? 'family') === (after.learning?.active ?? 'family')) {
    if (game === 'shell-scale' && next.options.mode === 'together') {
      return creditShellScaleTogether(after, next);
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
