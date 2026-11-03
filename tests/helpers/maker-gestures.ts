/** Retain RNGH configuration/callbacks so tests exercise the production wiring. */
export function gestureMock() {
  const make = (kind: string) => {
    const config: Record<string, unknown> = {};
    const handlers: Record<string, (...args: any[]) => void> = {};
    const gesture: Record<string, any> = { kind, config, handlers };
    for (const name of ["minDistance", "maxPointers", "shouldCancelWhenOutside", "runOnJS"])
      gesture[name] = (value: unknown) => { config[name] = value; return gesture; };
    for (const name of ["onBegin", "onUpdate", "onEnd", "onFinalize"])
      gesture[name] = (callback: (...args: any[]) => void) => { handlers[name] = callback; return gesture; };
    return gesture;
  };
  return {
    GestureDetector: "GestureDetector",
    Gesture: { Pan: () => make("pan"), Tap: () => make("tap"), Race: (...gestures: unknown[]) => ({ gestures }) },
  };
}
