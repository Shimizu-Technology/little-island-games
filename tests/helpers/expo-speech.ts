/**
 * Node-safe Vitest alias stub for `expo-speech`.
 * `speak()` throws honestly unless a test overrides `"expo-speech"` with `vi.mock`,
 * so `src/learn/voice.ts` catches it and returns `false` without emitting fake speech events.
 */
export function speak(): void {
  throw new Error('expo-speech unavailable in Node test environment');
}

export function stop(): Promise<void> {
  return Promise.resolve();
}

export function isSpeakingAsync(): Promise<boolean> {
  return Promise.resolve(false);
}

export function getAvailableVoicesAsync(): Promise<unknown[]> {
  return Promise.resolve([]);
}
