import { useCallback, useContext, useLayoutEffect, useRef } from 'react';
import type { View } from 'react-native';
import { nextLayoutFrame } from '../../frameClocks';

import { LagoonHintScroll } from '../../LagoonHintScroll';
export { LagoonHintScroll } from '../../LagoonHintScroll';
/** Move only as far as needed: preceding board rows stay visible whenever they fit. */
export function hintScrollTarget(offset: number, top: number, height: number, viewport: number, boardTop?: number) {
  if (height + 16 > viewport) return Math.max(0, top - 8);
  const lower = Math.max(0, top + height + 8 - viewport), upper = top - 8;
  const target = Math.max(lower, Math.min(offset, upper)), board = boardTop === undefined ? null : Math.max(0, boardTop - 8);
  return board !== null && board >= lower && board <= upper ? Math.min(target, board) : target;
}
export function useHintScroll(stage: number, enabled: boolean) {
  const host = useContext(LagoonHintScroll), card = useRef<View | null>(null), drawing = useRef<View | null>(null);
  const origin = useRef<number | null>(null), frame = useRef<(() => void) | null>(null), generation = useRef(0);
  const remember = useCallback(() => { if (host && enabled && stage === 0) origin.current = host.offset.current; }, [host, enabled, stage]);
  const reveal = useCallback(() => {
    frame.current?.(); const at = ++generation.current;
    if (!host || !enabled || !stage) return;
    frame.current = nextLayoutFrame(() => {
      frame.current = null;
      const scroll = host.scroll.current, target = card.current;
      if (!scroll || !target) return;
      const viewport = scroll.getNativeScrollRef();
      if (!viewport) return;
      viewport.measureInWindow((_x, viewportTop, _w, viewportHeight) => target.measureInWindow((_cx, cardTop, _cw, cardHeight) => {
        if (generation.current !== at) return;
        const offset = host.offset.current;
        const apply = (boardTop?: number) => {
          if (generation.current !== at || host.offset.current !== offset) return;
          const y = hintScrollTarget(offset, offset + cardTop - viewportTop, cardHeight, viewportHeight, boardTop);
          host.offset.current = y;
          scroll.scrollTo({ y, animated: false });
        };
        if (drawing.current) drawing.current.measureInWindow((_bx, boardTop) => apply(offset + boardTop - viewportTop));
        else apply();
      }));
    });
  }, [host, enabled, stage]);
  const cancel = useCallback(() => { generation.current++; frame.current?.(); frame.current = null; }, []);
  useLayoutEffect(() => {
    if (stage) reveal();
    else if (host && origin.current !== null) {
      const y = origin.current; origin.current = null;
      frame.current?.(); generation.current++;
      frame.current = nextLayoutFrame(() => { frame.current = null; host.offset.current = y; host.scroll.current?.scrollTo({ y, animated: false }); });
    }
    return cancel;
  }, [stage, reveal, host, cancel]);
  return { card, drawing, remember, onLayout: reveal };
}
