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
  const rack = shuffled([...word], seed ^ 0x91f3);
  if (rack.join('') === word) { const index = rack.findIndex(letter => letter !== rack[0]); [rack[0], rack[index]] = [rack[index], rack[0]]; }
  return rack;
}
export function selectRackTile(path: readonly number[], tile: number, size: RackSize): number[] {
  if (!Number.isInteger(tile) || tile < 0 || tile >= size) return [...path];
  return path.includes(tile) ? path.filter(i => i !== tile) : [...path, tile];
}
export function shuffleRack(order: readonly number[], seed: number) { return shuffled(order, seed); }
