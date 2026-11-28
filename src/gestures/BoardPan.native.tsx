/* eslint-disable react-hooks/refs -- Gesture builders store event callbacks; refs are read only on input. */
import React, { cloneElement, useEffect, useMemo, useRef } from 'react';
import { type GestureResponderEvent, type PanResponderCallbacks, type PanResponderGestureState, type ViewProps } from 'react-native';
import { Gesture, GestureDetector, type PanGestureHandlerEventPayload, type TouchData } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import type { BoardPanProps as WebPanProps, BoardTouchProps, DragRegion } from './BoardPan';

type Sample = Pick<PanGestureHandlerEventPayload, 'x' | 'y' | 'absoluteX' | 'absoluteY' | 'translationX' | 'translationY'> & { numberOfPointers: number };
type TapSample = Omit<Sample, 'translationX' | 'translationY'>;
export function panEvent(e: Sample): GestureResponderEvent {
  return { nativeEvent: { locationX: e.x, locationY: e.y, pageX: e.absoluteX, pageY: e.absoluteY, changedTouches: [], touches: [] } } as unknown as GestureResponderEvent;
}
export function panState(e: Sample): PanResponderGestureState {
  return { dx: e.translationX, dy: e.translationY, moveX: e.absoluteX, moveY: e.absoluteY, numberActiveTouches: e.numberOfPointers } as PanResponderGestureState;
}
export const createBoardPan = (callbacks: PanResponderCallbacks) => ({ callbacks, panHandlers: {} });
export const boardPanResponder = { create: createBoardPan };
export type BoardPan = ReturnType<typeof createBoardPan>;
type BoardPanProps = Omit<WebPanProps, 'pan'> & { pan: BoardPan };
const zero: Sample = { x: 0, y: 0, absoluteX: 0, absoluteY: 0, translationX: 0, translationY: 0, numberOfPointers: 0 };

/** Pan owns the first movement on draggable surfaces. Tap handles iOS's stationary
 * BEGAN -> FAILED pan path. Both recognizers share one grant and one terminal callback.
 * Only the native hit gate runs on UI; game/React callbacks explicitly cross to JS. */
export function BoardPanView({ pan, enabled = true, nativeRegions, axis, children }: BoardPanProps) {
  const latest = useRef(pan.callbacks), transaction = useRef({ open: false, held: false, panDone: false, tapDone: false });
  React.useLayoutEffect(() => { latest.current = pan.callbacks; });
  const begin = React.useCallback((e: Sample) => {
    const t = transaction.current;
    if (t.open) return;
    t.open = true; t.panDone = false; t.tapDone = false;
    const c = latest.current, event = panEvent(e), state = panState(e);
    t.held = c.onStartShouldSetPanResponderCapture?.(event, state) ?? c.onStartShouldSetPanResponder?.(event, state) ?? true;
    if (t.held) c.onPanResponderGrant?.(event, state);
  }, []);
  const update = React.useCallback((e: Sample) => { if (transaction.current.held) latest.current.onPanResponderMove?.(panEvent(e), panState(e)); }, []);
  const end = React.useCallback((e: Sample, success: boolean) => {
    const t = transaction.current;
    if (!t.held) return;
    t.held = false;
    if (success) latest.current.onPanResponderRelease?.(panEvent(e), panState(e));
    else latest.current.onPanResponderTerminate?.(panEvent(e), panState(e));
  }, []);
  const finalize = React.useCallback((part: 'pan' | 'tap', e: Sample) => {
    const t = transaction.current;
    if (part === 'pan') t.panDone = true; else t.tapDone = true;
    // A failed pan may still become a stationary tap. A failed tap may still be an active pan.
    if (t.panDone && t.tapDone) { end(e, false); t.open = false; }
  }, [end]);
  const tapBegin = React.useCallback((e: TapSample) => begin({ ...e, translationX: 0, translationY: 0 }), [begin]);
  const tapEnd = React.useCallback((e: TapSample, success: boolean) => end({ ...e, translationX: 0, translationY: 0 }, success), [end]);
  const tapFinalize = React.useCallback((e: TapSample) => finalize('tap', { ...e, translationX: 0, translationY: 0 }), [finalize]);
  const panFinalize = React.useCallback((e: Sample) => finalize('pan', e), [finalize]);
  const regionsKey = JSON.stringify(nativeRegions ?? null);
  const regions = useMemo(() => JSON.parse(regionsKey) as readonly DragRegion[] | null, [regionsKey]);
  const gesture = useMemo(() => {
    const drag = Gesture.Pan().enabled(enabled).minDistance(0).shouldCancelWhenOutside(false)
      .onTouchesDown((e, manager) => {
        'worklet';
        // Touch data can precede BEGAN (a rejected region can fail immediately).
        // Open the shared transaction before that failure or Tap's later BEGAN.
        const touch = e.changedTouches[0];
        if (touch) runOnJS(begin)({ x: touch.x, y: touch.y, absoluteX: touch.absoluteX, absoluteY: touch.absoluteY, translationX: 0, translationY: 0, numberOfPointers: e.numberOfTouches });
        // Serialized geometry is evaluated on UI BEFORE UIScrollView's pan threshold.
        // A JS shouldSet result alone is too late to decide native ownership.
        if (regions && (!touch || !regions.some(r => {
          const x = touch.x - r.left, y = touch.y - r.top;
          return r.radius === undefined ? x >= 0 && y >= 0 && x <= r.width && y <= r.height
            : (x - r.radius) ** 2 + (y - r.radius) ** 2 < r.radius ** 2;
        }))) manager.fail();
      })
      .onBegin(e => { 'worklet'; runOnJS(begin)(e); })
      .onUpdate(e => { 'worklet'; runOnJS(update)(e); })
      .onEnd((e, success) => { 'worklet'; runOnJS(end)(e, success); })
      .onFinalize(e => { 'worklet'; runOnJS(panFinalize)(e); });
    if (axis === 'horizontal') drag.activeOffsetX([-20, 20]).failOffsetY([-12, 12]);
    const tap = Gesture.Tap().enabled(enabled).maxDistance(8).maxDuration(30000)
      .onBegin(e => { 'worklet'; runOnJS(tapBegin)(e); })
      .onEnd((e, success) => { 'worklet'; runOnJS(tapEnd)(e, success); })
      .onFinalize(e => { 'worklet'; runOnJS(tapFinalize)(e); });
    return Gesture.Race(drag, tap);
  }, [enabled, regions, axis, begin, update, end, panFinalize, tapBegin, tapEnd, tapFinalize]);
  useEffect(() => () => { end(zero, false); transaction.current.open = false; }, [end]);
  return <GestureDetector gesture={gesture} touchAction={axis === 'horizontal' ? 'pan-y' : 'none'}>{cloneElement(children, { collapsable: false })}</GestureDetector>;
}

function touchEvent(touches: TouchData[]): GestureResponderEvent {
  const changedTouches = touches.map(t => ({ identifier: t.id, locationX: t.x, locationY: t.y, pageX: t.absoluteX, pageY: t.absoluteY }));
  return { nativeEvent: { ...changedTouches[0], changedTouches, touches: changedTouches } } as unknown as GestureResponderEvent;
}
/** Preserve independent pointer identities for together-mode Word Search. */
export function BoardTouchView({ enabled = true, multiTouch = false, children }: BoardTouchProps) {
  const { onResponderGrant, onResponderMove, onResponderRelease, onResponderTerminate, onResponderStart: _start, onResponderEnd: _end, onStartShouldSetResponder: _shouldStart, onMoveShouldSetResponder: _shouldMove, onResponderTerminationRequest: _termination, ...props } = children.props;
  const latest = useRef({ onResponderGrant, onResponderMove, onResponderRelease, onResponderTerminate }), held = useRef(false);
  React.useLayoutEffect(() => { latest.current = { onResponderGrant, onResponderMove, onResponderRelease, onResponderTerminate }; });
  const gesture = useMemo(() => Gesture.Pan().enabled(enabled).maxPointers(multiTouch ? 2 : 1).minDistance(0).shouldCancelWhenOutside(false).runOnJS(true)
    .onTouchesDown(e => { held.current = true; latest.current.onResponderGrant?.(touchEvent(e.changedTouches)); })
    .onTouchesMove(e => { if (held.current) latest.current.onResponderMove?.(touchEvent(e.changedTouches)); })
    .onTouchesUp(e => { if (!held.current) return; if (e.numberOfTouches === 0) held.current = false; latest.current.onResponderRelease?.(touchEvent(e.changedTouches)); })
    .onFinalize(() => { if (held.current) { held.current = false; latest.current.onResponderTerminate?.(touchEvent([])); } }), [enabled, multiTouch]);
  useEffect(() => () => { if (held.current) { held.current = false; latest.current.onResponderTerminate?.(touchEvent([])); } }, []);
  // Build a fresh host element: cloneElement would retain omitted responder props.
  return <GestureDetector gesture={gesture} touchAction="none">{React.createElement(children.type, { ...props, collapsable: false } as ViewProps)}</GestureDetector>;
}
export const nativeBoardPan = true;
export const boardTouchStyle = {};
export const boardHorizontalTouchStyle = {};
