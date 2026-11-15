/**
 * Listening is not decoding. A child who hears a page read has done something good, but it is not evidence that
 * they read it alone, so the two are kept apart everywhere the kit records what happened.
 * - prompt: the task's own narration (the dictated word, "change one letter"). Part of the task, neutral.
 * - read-aloud: the child asked to hear printed words read to them (tap-a-word, hear the page).
 * - help: a hint or a shown answer. - miss: an attempt that was checked and was not right.
 */
export type ReadingAct = "prompt" | "read-aloud" | "help" | "miss";
export type ReadingEvidence = {
  /** The child heard printed words read to them. */
  listened: boolean;
  helped: boolean;
  missed: boolean;
  /** Read it alone: no read-aloud, no help, no miss. Listening can never make this true. */
  independentDecoding: boolean;
};
export function readingEvidence(acts: readonly ReadingAct[]): ReadingEvidence {
  const listened = acts.includes("read-aloud"), helped = acts.includes("help"), missed = acts.includes("miss");
  return { listened, helped, missed, independentDecoding: !listened && !helped && !missed };
}
/** Plain words for a grown-up summary: never "read" when the child listened. */
export function evidenceWords(e: ReadingEvidence): string {
  if (e.independentDecoding) return "Read on their own";
  if (e.listened && !e.helped && !e.missed) return "Listened and followed along";
  return e.helped ? "Built with help" : "Got there after a retry";
}
