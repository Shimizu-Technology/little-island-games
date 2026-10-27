import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { runOnJS, useFrameCallback, useSharedValue, type SharedValue } from "react-native-reanimated";
import { advanceClock, FIXED_DT } from "./clock";
import { arcadeEvent } from "./events";
import type { ArcadeResult } from "./types";
/**
 * Opt in only with worklet-safe state/step/result/onFrame (no refs, native modules or JS closures).
 * Own the round with a React key. Gesture worklets write input; poses stay on UI.
 * React receives event edges immediately and HUD snapshots at 10 Hz.
 */
export function useArcadeUiLoop<S, I>({ initial, input, step, result, onFrame, onResult, active }: {
  initial: S; input: SharedValue<I>; step: (s: S, input: I, dt: number) => S;
  result?: (s: S) => ArcadeResult | null; onFrame: (s: S) => void;
  onResult?: (result: ArcadeResult) => void; active: boolean;
}) {
  const state = useSharedValue(initial), enabled = useSharedValue(false), reported = useSharedValue(false);
  const clock = useSharedValue({ remainder: 0, ticks: 0, dropped: 0 }), lastHud = useSharedValue(0);
  const [snapshot, setSnapshot] = useState(initial);
  const live = useRef({ active, onResult }), mounted = useRef(true), pending = useRef<ArcadeResult | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; pending.current = null; }; }, []);
  useEffect(() => { if (active && pending.current) { const end = pending.current; pending.current = null; onResult?.(end); } }, [active, onResult]);
  useLayoutEffect(() => { live.current = { active, onResult }; }, [active, onResult]);
  const publish = useCallback((next: S, end: ArcadeResult | null) => {
    if (!mounted.current) return;
    setSnapshot(next);
    if (end) { if (live.current.active) live.current.onResult?.(end); else pending.current = end; }
  }, []);
  const callback = useCallback<Parameters<typeof useFrameCallback>[0]>(info => {
    "worklet";
    if (!enabled.value || reported.value) return;
    const before = arcadeEvent(state.value), advanced = advanceClock(clock.value, (info.timeSincePreviousFrame ?? 0) / 1000);
    clock.set(advanced.clock);
    let next = state.value, end: ArcadeResult | null = null;
    for (let i = 0; i < advanced.steps; i++) {
      next = step(next, input.value, FIXED_DT);
      end = result?.(next) ?? null;
      if (end) break;
    }
    state.set(next); onFrame(next);
    if (end || before !== arcadeEvent(next) || info.timestamp - lastHud.value >= 100) {
      lastHud.set(info.timestamp); runOnJS(publish)(next, end);
    }
    if (end) reported.set(true);
  }, [enabled, reported, state, clock, step, input, result, onFrame, lastHud, publish]);
  const frame = useFrameCallback(callback, false);
  useEffect(() => {
    enabled.set(active);
    clock.set({ ...clock.value, remainder: 0 }); lastHud.set(0);
    frame.setActive(active);
    return () => { enabled.set(false); frame.setActive(false); };
  }, [active, frame, enabled, clock, lastHud]);
  return { snapshot, state, clock };
}
