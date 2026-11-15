/** Narration keys for inquiry sentences: a stable hash of the exact text, like the science-v25 lines. */
export function inquirySpeechKey(text: string): string {
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return `inquiry-v1-${hash.toString(16)}`;
}
