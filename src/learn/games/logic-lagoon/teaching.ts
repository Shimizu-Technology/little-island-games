import type { LatinPuzzle } from '../../../puzzles/latin/core';
import { planHint, type HintPlan } from '../../../puzzles/latin/solver';
import { cueFor, groupName, type Cue } from '../../../puzzles/latin/teach';

/** Replay and render often request the same public deduction. Keep a bounded per-puzzle cache. */
const hints = new WeakMap<LatinPuzzle, Map<string, HintPlan>>();
export function lagoonHint(p: LatinPuzzle, values: readonly number[]): HintPlan {
  let cache = hints.get(p); if (!cache) { cache = new Map(); hints.set(p, cache); }
  const key = values.join(','), hit = cache.get(key); if (hit) return hit;
  const plan = planHint(p, values);
  cache.set(key, plan); if (cache.size > 128) cache.delete(cache.keys().next().value!);
  return plan;
}
/** Symbol words are local presentation. Row/column coordinates keep their ordinary names. */
export function lagoonCue(p: LatinPuzzle, values: readonly number[], pictures?: readonly string[]): Cue {
  const plan = lagoonHint(p, values), cue = cueFor(p, plan);
  if (!pictures) return cue;
  const pictureWords = (text: string) => text.replace(/\bnumbers\b/g, 'pictures').replace(/\bnumber\b/g, 'picture');
  if (plan.kind === 'clash' && plan.rule.kind === 'repeat') {
    const rule = plan.rule;
    return { ...cue, think: `${pictures[rule.value - 1]} is in ${groupName(p, rule.group)} twice. Each picture goes once in a ${rule.group.kind}.` };
  }
  return { ...cue, look: pictureWords(cue.look), think: pictureWords(cue.think), show: plan.kind === 'place' ? cue.show.replace(/^\d+/, pictures[plan.value - 1]) : pictureWords(cue.show) };
}
