/** How far a finger may wander on a key before the touch counts as a drag, in points. */
export const PRESS_SLOP = 10;
type PressPoint = { nativeEvent: { pageX: number; pageY: number } };
/**
 * Touch tracking for a key that acts only when the finger stayed put. React Native keeps a press
 * alive while a finger slides a good way off a key, so a scroll that starts on a number pad could
 * enter a number. The key's own touch events bound one gesture: once it moves past the slop it never
 * presses, even if it slides back onto the key. `take()` says whether a press may act, and starts
 * over. A press with no touch (an accessibility activation) may always act.
 */
export function stillGesture(slop = PRESS_SLOP) {
  let start: { x: number; y: number } | null = null, moved = false;
  const begin = (e: PressPoint) => { start = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }; moved = false; };
  const move = (e: PressPoint) => { if (start && Math.hypot(e.nativeEvent.pageX - start.x, e.nativeEvent.pageY - start.y) > slop) moved = true; };
  // After the gesture's own release has been handled, so a cancelled drag cannot linger.
  const end = () => { setTimeout(() => { start = null; moved = false; }, 0); };
  return {
    onTouchStart: begin, onTouchMove: move, onTouchEnd: end, onTouchCancel: end,
    onPressIn: (e: PressPoint) => { if (!start) begin(e); },
    onPressMove: move,
    take: () => { const act = !moved; start = null; moved = false; return act; },
  };
}
/** The same, as a complete set of press handlers around one callback. */
export function stillPress(onPress: () => void, slop = PRESS_SLOP) {
  const g = stillGesture(slop);
  return { ...g, onPress: () => { if (g.take()) onPress(); } };
}
