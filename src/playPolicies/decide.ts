import type { BoardSession } from "../board";
import { sessionPolicy } from "../board";
import type { Seat } from "../games/match";
import { archivedChoice, currentPolicy, policyRandom } from "./policies";
import { finished, type PolicyTask } from "./types";
import { publicView } from "./views";

/** The computer's decision for this round, under the policy frozen in its save. */
export function computerTask(s: BoardSession): PolicyTask | null {
  const policy = sessionPolicy(s),
    p = s.position;
  if (!policy || p.outcome !== null) return null;
  if (!policy.publicOnly) return finished(archivedChoice(policy, p));
  return policy.choose(publicView(policy.game, p, p.turn), policyRandom(s.salt ?? 0, p.moves.length, p.turn));
}
/**
 * A hint for the seat to move, from that seat's view, using the strongest current
 * policy. Reef Sweep keeps its own solo hint.
 */
export function hintTask(s: BoardSession, seat: Seat = s.position.turn): PolicyTask | null {
  if (s.game === "reef-sweep" || s.position.outcome !== null) return null;
  const policy = currentPolicy(s.game, "challenge");
  return policy.choose(
    publicView(s.game, s.position, seat),
    policyRandom((s.salt ?? 0) ^ 0x5bd1e995, s.position.moves.length, seat)
  );
}
export type Cancel = { cancelled: boolean };
/** Spends at most `sliceMs` per frame, then yields. Same answer as running straight through. */
export function runSteps<T>(
  task: { readonly done: boolean; step: (quota: number) => boolean },
  answer: () => T,
  cancel: Cancel,
  sliceMs = 8,
  now = () => Date.now()
): Promise<T | null> {
  return new Promise((resolve) => {
    const tick = () => {
      if (cancel.cancelled) return resolve(null);
      const start = now();
      do task.step(128);
      while (!task.done && now() - start < sliceMs);
      if (task.done) resolve(answer());
      else setTimeout(tick, 0);
    };
    tick();
  });
}
export const runTask = (task: PolicyTask, cancel: Cancel, sliceMs = 8, now = () => Date.now()) =>
  runSteps(task, () => task.move(), cancel, sliceMs, now);
