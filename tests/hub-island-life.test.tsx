import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IslandLife } from '../src/hub/IslandLife';

// The hub's repeating tide runs only while the map is focused and the app is in front (H3 finding).
const app = vi.hoisted(() => ({ state: 'active' as string, listeners: new Set<(state: string) => void>(), os: 'ios' }));
vi.mock('react-native', () => ({
 View: 'div', Platform: { get OS() { return app.os; } },
 AppState: {
  get currentState() { return app.state; },
  addEventListener: (_: 'change', listener: (state: string) => void) => { app.listeners.add(listener); return { remove: () => app.listeners.delete(listener) }; },
 },
}));
vi.mock('react-native-svg', () => ({ default: 'svg', Path: 'path' }));
const REPEAT = 'repeat';
const motion = vi.hoisted(() => ({ tide: null as null | { value: unknown; get: () => unknown; set: (v: unknown) => void }, cancels: 0, repeats: 0 }));
vi.mock('react-native-reanimated', async () => {
 const { useRef } = await import('react');
 return {
  default: { View: 'div' }, Easing: { inOut: () => null, sin: null },
  cancelAnimation: () => { motion.cancels++; if (motion.tide) motion.tide.value = 0.4; },
  withTiming: () => 'timing', withRepeat: () => { motion.repeats++; return REPEAT; },
  useAnimatedStyle: () => ({}),
  useSharedValue: (initial: number) => {
   const ref = useRef<typeof motion.tide>(null);
   if (!ref.current) { const shared = { value: initial as unknown, get: () => shared.value, set: (v: unknown) => { shared.value = v; } }; ref.current = shared; motion.tide = shared; }
   return ref.current;
  },
 };
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let screen: ReactTestRenderer | undefined;
beforeEach(() => { app.state = 'active'; app.listeners.clear(); app.os = 'ios'; motion.tide = null; motion.cancels = 0; motion.repeats = 0; });
afterEach(async () => { if (screen) await act(() => screen!.unmount()); screen = undefined; });
const render = async (props: Partial<{ active: boolean; reduced: boolean }> = {}) => {
 const all = { width: 390, height: 710, fontScale: 1, active: true, reduced: false, ...props };
 await act(() => { screen = create(<IslandLife {...all}/>); });
 return (next: Partial<typeof all>) => act(() => { screen!.update(<IslandLife {...all} {...next}/>); });
};
const change = (state: string) => act(() => { for (const listener of app.listeners) listener(state); });

describe('hub tide and the app state', () => {
 it('stops the tide when the app goes to the background, at rest, and starts it once on return', async () => {
  await render();
  expect(motion.tide!.value).toBe(REPEAT); expect(motion.repeats).toBe(1);
  await change('background');
  expect(motion.cancels).toBeGreaterThan(0);
  expect(motion.tide!.value).toBe(0);
  const cancels = motion.cancels;
  await change('active');
  expect(motion.tide!.value).toBe(REPEAT); expect(motion.repeats).toBe(2);
  expect(motion.cancels).toBe(cancels);
 });

 it('stops while inactive (app switcher, Control Centre) and comes back', async () => {
  await render();
  await change('inactive');
  expect(motion.tide!.value).toBe(0);
  await change('active');
  expect(motion.tide!.value).toBe(REPEAT); expect(motion.repeats).toBe(2);
 });

 it('does not start when launched in the background, and starts when the app comes to the front', async () => {
  app.state = 'background';
  await render();
  expect(motion.repeats).toBe(0); expect(motion.tide!.value).toBe(0);
  await change('active');
  expect(motion.repeats).toBe(1);
 });

 it('a return to the front keeps the tide still when the map has lost focus or motion is reduced', async () => {
  const update = await render({ active: false });
  await change('background'); await change('active');
  expect(motion.repeats).toBe(0); expect(motion.tide!.value).toBe(0);
  await update({ active: true, reduced: true });
  await change('background'); await change('active');
  expect(motion.repeats).toBe(0);
  await update({ active: true, reduced: false });
  expect(motion.repeats).toBe(1);
 });

 it('treats "unknown" at launch as in front, and stops listening when the map unmounts', async () => {
  app.state = 'unknown';
  await render();
  expect(motion.repeats).toBe(1);
  await act(() => screen!.unmount()); screen = undefined;
  expect(app.listeners.size).toBe(0);
 });

 it('on the web, a hidden page stops the tide and a visible one starts it again', async () => {
  app.os = 'web';
  let hidden = false; const listeners = new Set<() => void>();
  vi.stubGlobal('document', { get hidden() { return hidden; }, addEventListener: (_: string, l: () => void) => listeners.add(l), removeEventListener: (_: string, l: () => void) => listeners.delete(l) });
  try {
   await render();
   expect(motion.repeats).toBe(1);
   hidden = true; await act(() => { for (const l of listeners) l(); });
   expect(motion.tide!.value).toBe(0);
   hidden = false; await act(() => { for (const l of listeners) l(); });
   expect(motion.repeats).toBe(2);
   await act(() => screen!.unmount()); screen = undefined;
   expect(listeners.size).toBe(0);
  } finally { vi.unstubAllGlobals(); }
 });
});
