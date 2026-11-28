/* eslint-disable react-hooks/refs -- RNGH stores callbacks; refs are read only when a native touch arrives. */
import React, { useEffect, useMemo, useRef, type Ref } from 'react';
import { View, type GestureResponderEvent, type PanResponderCallbacks, type PanResponderGestureState, type ViewProps } from 'react-native';
import { Gesture, GestureDetector, type PanGestureHandlerEventPayload, type TouchData } from 'react-native-gesture-handler';

type Sample = Pick<PanGestureHandlerEventPayload, 'x' | 'y' | 'absoluteX' | 'absoluteY' | 'translationX' | 'translationY'> & { numberOfPointers: number };
export function panEvent(e: Sample): GestureResponderEvent {
  return { nativeEvent: { locationX: e.x, locationY: e.y, pageX: e.absoluteX, pageY: e.absoluteY, changedTouches: [], touches: [] } } as unknown as GestureResponderEvent;
}
export function panState(e: Sample): PanResponderGestureState {
  return { dx: e.translationX, dy: e.translationY, moveX: e.absoluteX, moveY: e.absoluteY, numberActiveTouches: e.numberOfPointers } as PanResponderGestureState;
}
export const createBoardPan = (callbacks: PanResponderCallbacks) => ({ callbacks, panHandlers: {} });
export type BoardPan = ReturnType<typeof createBoardPan>;

/** Native recognition starts at touch-down, before UIScrollView reaches its pan threshold.
 * JS callbacks only update the game; they are never responsible for winning the native race.
 * Do not add activeOffset thresholds: Pan requires ALL activation criteria to be met. */
export function BoardPanView({ pan, enabled = true, ...props }: ViewProps & { pan: BoardPan; enabled?: boolean }) {
  const latest = useRef(pan.callbacks), held = useRef(false);
  React.useLayoutEffect(() => { latest.current = pan.callbacks; });
  const gesture = useMemo(() => Gesture.Pan().enabled(enabled).minDistance(0).shouldCancelWhenOutside(false).runOnJS(true)
    .onBegin(e => {
      const event = panEvent(e), state = panState(e), c = latest.current;
      held.current = (c.onStartShouldSetPanResponderCapture?.(event, state) ?? c.onStartShouldSetPanResponder?.(event, state) ?? true);
      if (held.current) c.onPanResponderGrant?.(event, state);
    })
    .onUpdate(e => { if (held.current) latest.current.onPanResponderMove?.(panEvent(e), panState(e)); })
    .onEnd(e => {
      if (!held.current) return;
      held.current = false;
      latest.current.onPanResponderRelease?.(panEvent(e), panState(e));
    })
    .onFinalize(e => {
      if (!held.current) return;
      held.current = false;
      latest.current.onPanResponderTerminate?.(panEvent(e), panState(e));
    }), [enabled]);
  useEffect(() => () => {
    if (held.current) { held.current = false; latest.current.onPanResponderTerminate?.(panEvent({ x: 0, y: 0, absoluteX: 0, absoluteY: 0, translationX: 0, translationY: 0, numberOfPointers: 0 }), {} as PanResponderGestureState); }
  }, []);
  return <GestureDetector gesture={gesture} touchAction="none"><View {...props} collapsable={false} /></GestureDetector>;
}

function touchEvent(touches: TouchData[]): GestureResponderEvent {
  const changedTouches = touches.map(t => ({ identifier: t.id, locationX: t.x, locationY: t.y, pageX: t.absoluteX, pageY: t.absoluteY }));
  return { nativeEvent: { ...changedTouches[0], changedTouches, touches: changedTouches } } as unknown as GestureResponderEvent;
}
/** Preserve independent pointer identities for together-mode Word Search. */
export function BoardTouchView({ enabled = true, multiTouch = false, onResponderGrant, onResponderMove, onResponderRelease, onResponderTerminate, onResponderStart: _start, onResponderEnd: _end, onStartShouldSetResponder: _shouldStart, onMoveShouldSetResponder: _shouldMove, onResponderTerminationRequest: _termination, ...props }: ViewProps & { enabled?: boolean; multiTouch?: boolean; ref?: Ref<View> }) {
  const latest = useRef({ onResponderGrant, onResponderMove, onResponderRelease, onResponderTerminate }), held = useRef(false);
  React.useLayoutEffect(() => { latest.current = { onResponderGrant, onResponderMove, onResponderRelease, onResponderTerminate }; });
  const gesture = useMemo(() => Gesture.Pan().enabled(enabled).maxPointers(multiTouch ? 2 : 1).minDistance(0).shouldCancelWhenOutside(false).runOnJS(true)
    .onTouchesDown(e => { held.current = true; latest.current.onResponderGrant?.(touchEvent(e.changedTouches)); })
    .onTouchesMove(e => latest.current.onResponderMove?.(touchEvent(e.changedTouches)))
    .onTouchesUp(e => { latest.current.onResponderRelease?.(touchEvent(e.changedTouches)); if (!e.allTouches.length) held.current = false; })
    .onFinalize(() => { if (held.current) { held.current = false; latest.current.onResponderTerminate?.(touchEvent([])); } }), [enabled, multiTouch]);
  useEffect(() => () => { if (held.current) { held.current = false; latest.current.onResponderTerminate?.(touchEvent([])); } }, []);
  return <GestureDetector gesture={gesture} touchAction="none"><View {...props} collapsable={false} /></GestureDetector>;
}

export const nativeBoardPan = true;

export const boardTouchStyle = {};
