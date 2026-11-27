/**
 * Vitest setup: Metro turns `require('….webp')` into an asset id; Node would parse the image as JavaScript. Here an
 * illustration resolves to its repository path, so screens render and tests can check which file a picture uses.
 * Also registers a safe Node default for `expo-speech` (which fails honestly on speak() unless a test mocks it),
 * so unrelated screen tests that import LearnFrame or voiced boards do not crash on `requireNativeModule('ExpoSpeech')`.
 */
import Module from 'node:module';
import { relative } from 'node:path';
import { vi } from 'vitest';

const extensions = (Module as unknown as { _extensions: Record<string, (module: { exports: unknown }, file: string) => void> })._extensions;
extensions['.webp'] = (module, file) => { module.exports = relative(process.cwd(), file); };

vi.mock('expo-speech', () => ({
  speak: () => {
    throw new Error('expo-speech unavailable in Node test environment');
  },
  stop: () => Promise.resolve(),
}));
