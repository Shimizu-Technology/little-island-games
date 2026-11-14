import { createContext, useContext, useLayoutEffect, useRef } from "react";

/** Set by the Learn frame: brings the top of the board back into view. It does nothing at default text sizes. */
export const StepReveal = createContext<() => void>(() => {});
/**
 * At accessibility text sizes the header and an answered step can push the next sentence or question above the
 * visible page. A board calls this with the key of its current step (a page, a question); when the key changes, never
 * on the first render, the frame returns the page to the top of the board, as it does for growth and own-level steps.
 * Boards whose page must hold still mid-move, such as Reef Race's hops, do not call it.
 */
export function useStepReveal(step: string | number) {
  const reveal = useContext(StepReveal), last = useRef(step);
  useLayoutEffect(() => {
    if (last.current === step) return;
    last.current = step;
    reveal();
  }, [step, reveal]);
}
