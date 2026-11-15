import { readingSpeech } from "../kit/readingSpeech";
import { tokens, wordAudio } from "../kit/reading";

/** The clip a tapped word plays. Registered text lines win; every other word uses the word-clip name. */
export const tapSpeechKey = (word: string): string => readingSpeech(word);
/** Plain lowercase form of a tapped word, or null when it holds no letters (a lone mark). */
export const tapForm = (word: string): string | null => tokens(word)[0] ?? null;
export type TapOutcome = { word: string; key: string };
/**
 * Tap-a-word: one tap says the word, one tap hears it again, and nothing about it is timed or scored. The caller
 * records the tap as a read-aloud act, never as reading the word alone.
 */
export function tapWord(raw: string): TapOutcome | null {
  const word = tapForm(raw);
  return word ? { word, key: tapSpeechKey(word) } : null;
}
export { wordAudio };
