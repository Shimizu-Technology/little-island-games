/** F-frame: hasSpeech uses the player's own lookup (the chosen voice first, then the shared sources), so a Hear button
 * shown on its answer always has something to play. */
import { expect, it, vi } from 'vitest';
import { hasSpeech } from '../src/components/Audio';
vi.mock('expo-audio', () => ({ createAudioPlayer: () => ({}), useAudioPlayer: () => ({}), setAudioModeAsync: async () => {} }));
vi.mock('react-native', () => ({ AppState: { addEventListener: () => ({ remove() {} }), currentState: 'active' }, Platform: { OS: 'ios' } }));
vi.mock('../src/components/feel', () => ({ feel: () => {}, toneFeel: {} }));
vi.mock('../src/content/audioSources', () => ({ sources: { tap: 1 } }));
vi.mock('../src/content/learnAudio', () => ({ learnSources: { 'shared-help': 2 } }));
vi.mock('../src/content/neuralAudio', () => ({ voiceSources: { warm: { 'warm-help': 3, 'both-help': 4 }, calm: { 'both-help': 5 } } }));

it('a recording counts in the voice that has it, or in the shared sources; a missing key never does', () => {
  expect(hasSpeech('warm-help', 'warm')).toBe(true);
  expect(hasSpeech('warm-help', 'calm')).toBe(false);
  expect(hasSpeech('both-help', 'calm')).toBe(true);
  expect(hasSpeech('shared-help', 'calm')).toBe(true);
  expect(hasSpeech('warm-help')).toBe(true);
  expect(hasSpeech('slip-help', 'warm')).toBe(false);
  expect(hasSpeech('slip-help', 'calm')).toBe(false);
});
