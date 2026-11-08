/** On-device helpers consume only a baked, reviewed accept list. No block data. */
export const missingWordReply = "That word isn't in this puzzle's list.";
const key = (s: string) => s.trim().toUpperCase();
export function acceptsWord(input: string, accept: readonly string[]): boolean {
  return /^[A-Z]+$/.test(key(input)) && accept.includes(key(input));
}
export function acceptsLadderStep(previous: string, next: string, accept: readonly string[]): boolean {
  const a = key(previous), b = key(next);
  return /^[A-Z]{3,5}$/.test(a) && a.length === b.length && [...a].filter((c, i) => c !== b[i]).length === 1 && acceptsWord(b, accept);
}
export function acceptsAnagram(input: string, letters: string, accept: readonly string[]): boolean {
  return acceptsWord(input, accept) && [...key(input)].sort().join('') === [...key(letters)].sort().join('');
}
export type WordHint = { kind: 'starts'; letter: string } | { kind: 'length'; length: number };
export function wordHintText(hint: WordHint): string {
  if (hint.kind === 'starts' && /^[A-Z]$/.test(hint.letter)) return `Starts with ${hint.letter}.`;
  if (hint.kind === 'length' && Number.isInteger(hint.length) && hint.length >= 1 && hint.length <= 30) return `Has ${hint.length} letters.`;
  throw new Error('Invalid closed word hint');
}
