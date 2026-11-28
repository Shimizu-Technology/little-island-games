import { getWordLexicon } from './lexicon';
import { shuffled, seededRandom } from './random';
export type RackSize = 6 | 7;
export function canBuildWord(word: string, rack: readonly string[]): boolean {
  const available = [...rack];
  for (const letter of word) { const index = available.indexOf(letter); if (index < 0) return false; available.splice(index, 1); }
  return word.length >= 3 && word.length <= rack.length;
}
const solutions = new Map<string, readonly string[]>();
export function solveRack(rack: readonly string[], lexicon: ReadonlySet<string> = getWordLexicon()): readonly string[] {
  const key = [...rack].sort().join('');
  if (lexicon === getWordLexicon() && solutions.has(key)) return solutions.get(key)!;
  const words = [...lexicon].filter(word => canBuildWord(word, rack)).sort((a, b) => b.length - a.length || a.localeCompare(b));
  if (lexicon === getWordLexicon()) { if (solutions.size >= 256) solutions.delete(solutions.keys().next().value!); solutions.set(key, words); }
  return words;
}
const bases = new Map<RackSize, string[]>();
export function generateRack(size: RackSize, seed: number): string[] {
  let rich = bases.get(size);
  if (!rich) {
    rich = [...getWordLexicon()].filter(word => word.length === size && solveRack([...word]).length >= 12);
    bases.set(size, rich);
  }
  if (!rich.length) throw new Error('No rich racks in the reviewed lexicon.');
  const word = rich[Math.floor(seededRandom(seed)() * rich.length)];
  return scrambleRack([...word], seed ^ 0x91f3);
}
/** Reject every full-length answer, including another anagram of the chosen base word. */
export function scrambleRack(letters: readonly string[], seed: number, lexicon: ReadonlySet<string> = getWordLexicon()): string[] {
  for (let attempt = 0; attempt < 32; attempt++) {
    const rack = shuffled(letters, seed + attempt);
    if (!lexicon.has(rack.join(''))) return rack;
  }
  // Deterministic exhaustive fallback over distinct permutations (at most 7!).
  const rack = [...letters].sort();
  do {
    if (!lexicon.has(rack.join(''))) return rack;
    let i = rack.length - 2;
    while (i >= 0 && rack[i] >= rack[i + 1]) i--;
    if (i < 0) break;
    let j = rack.length - 1;
    while (rack[j] <= rack[i]) j--;
    [rack[i], rack[j]] = [rack[j], rack[i]];
    rack.splice(i + 1, rack.length - i - 1, ...rack.slice(i + 1).reverse());
  } while (true);
  throw new Error('No unsolved arrangement exists for this rack.');
}

export function selectRackTile(path: readonly number[], tile: number, size: RackSize): number[] {
  if (!Number.isInteger(tile) || tile < 0 || tile >= size) return [...path];
  return path.includes(tile) ? path.filter(i => i !== tile) : [...path, tile];
}
export function shuffleRack(order: readonly number[], seed: number) { return shuffled(order, seed); }
