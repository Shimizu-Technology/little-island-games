import { useCallback, useContext, useEffect, useRef } from "react";
import { StepReveal } from "../../stepReveal";

/**
 * A fresh entry or a resume at accessibility text sizes. The frame's header can fill the screen, so the board starts
 * below the fold and the child would scroll before the first answer. Once the board has laid out, ask the frame to bring
 * the top of the board back into view, the same call a finished step makes. It runs only at those sizes, only until the
 * child makes a move (a later layout change must not pull the page away from where they are), and after a pause, so the
 * frame has measured the board's place first. `touched` is called on the child's first move.
 */
export function useEntryReveal(large: boolean) {
  const reveal = useContext(StepReveal), timer = useRef<ReturnType<typeof setTimeout> | null>(null), moved = useRef(false);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const onLayout = useCallback(() => {
    if (!large || moved.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; if (!moved.current) reveal(); }, 80);
  }, [large, reveal]);
  const touched = useCallback(() => { moved.current = true; if (timer.current) { clearTimeout(timer.current); timer.current = null; } }, []);
  return { onLayout, touched };
}
