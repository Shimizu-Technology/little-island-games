export function wordScore(word: string | number): number {
  const length = typeof word === 'number' ? word : word.length;
  if (!Number.isInteger(length) || length < 3) return 0;
  if (length === 3) return 100;
  if (length === 4) return 400;
  if (length === 5) return 800;
  if (length === 6) return 1400;
  if (length === 7) return 1800;
  return 2200 + (length - 8) * 400;
}
export function totalScore(words: readonly string[]) { return words.reduce((score, word) => score + wordScore(word), 0); }
export function roundStats(words: readonly string[], other: readonly string[] = []) {
  return { score: totalScore(words), count: words.length, unique: words.filter(word => !other.includes(word)).length,
    longest: [...words].sort((a, b) => b.length - a.length || a.localeCompare(b))[0] ?? '' };
}
