import { buildTrie, getWordLexicon, getWordTrie, type TrieNode } from './lexicon';
import { seededRandom } from './random';
export type HuntSize = 4 | 5;
export type WordPaths = ReadonlyMap<string, readonly number[]>;
const neighbors = new Map<number, number[][]>();
function adjacency(size: number) {
  let table = neighbors.get(size);
  if (!table) {
    table = Array.from({ length: size * size }, (_, i) => Array.from({ length: size * size }, (_, j) => j).filter(j => j !== i && Math.abs(i % size - j % size) <= 1 && Math.abs(Math.floor(i / size) - Math.floor(j / size)) <= 1));
    neighbors.set(size, table);
  }
  return table;
}
export function adjacent(a: number, b: number, size: number) { return adjacency(size)[a]?.includes(b) ?? false; }
export function traceTile(path: readonly number[], tile: number, size: HuntSize): number[] {
  if (!Number.isInteger(tile) || tile < 0 || tile >= size * size) return [...path];
  if (path.length > 1 && tile === path[path.length - 2]) return path.slice(0, -1);
  if (path.includes(tile) || (path.length && !adjacent(path[path.length - 1], tile, size))) return [...path];
  return [...path, tile];
}
export function validHuntPath(path: readonly number[], grid: readonly string[]) {
  const size = Math.sqrt(grid.length);
  return path.length > 0 && new Set(path).size === path.length && path.every((tile, i) => Number.isInteger(tile) && tile >= 0 && tile < grid.length && (!i || adjacent(path[i - 1], tile, size)));
}
const solved = new Map<string, WordPaths>();
/** Canonical path: first DFS path in tile-index order. Bitset prevents cell reuse. */
export function solveBoard(grid: readonly string[], lexicon: ReadonlySet<string> = getWordLexicon()): WordPaths {
  const size = Math.sqrt(grid.length);
  if ((size !== 4 && size !== 5) || grid.some(letter => !/^[A-Z]$/.test(letter))) return new Map();
  const key = grid.join('');
  if (lexicon === getWordLexicon() && solved.has(key)) return solved.get(key)!;
  const root = lexicon === getWordLexicon() ? getWordTrie() : buildTrie(lexicon), table = adjacency(size), found = new Map<string, number[]>(), path: number[] = [];
  function visit(tile: number, parent: TrieNode, mask: number) {
    if (mask & (1 << tile)) return;
    const node = parent.children.get(grid[tile]);
    if (!node) return;
    path.push(tile);
    if (node.word && !found.has(node.word)) found.set(node.word, [...path]);
    if (node.children.size) for (const next of table[tile]) visit(next, node, mask | (1 << tile));
    path.pop();
  }
  for (let i = 0; i < grid.length; i++) visit(i, root, 0);
  if (lexicon === getWordLexicon()) { if (solved.size >= 32) solved.delete(solved.keys().next().value!); solved.set(key, found); }
  return found;
}
/** Rejection sampling only returns certified boards; no unchecked fallback can create a dud. */
export function generateBoard(size: HuntSize, seed: number): string[] {
  const random = seededRandom(seed), letters = 'AAAAAAAEEEEEEEEIIIIOOOOOUUUBCCDDDDFFGGHHHHLLLLMMNNNNNNRRRRRRSSSSSSTTTTTTTTVWY';
  const anchors = [...getWordLexicon()].filter(word => word.length >= 5 && word.length <= 8);
  for (let attempt = 0; attempt < 10000; attempt++) {
    const grid = Array.from({ length: size * size }, () => letters[Math.floor(random() * letters.length)]);
    const anchor = anchors[Math.floor(random() * anchors.length)];
    // A randomized adjacent walk plants one longer answer without favoring a visible row.
    let tile = Math.floor(random() * grid.length); const used = new Set<number>();
    for (const letter of anchor) {
      grid[tile] = letter; used.add(tile);
      const next = adjacency(size)[tile].filter(i => !used.has(i));
      if (!next.length) break;
      tile = next[Math.floor(random() * next.length)];
    }
    const words = solveBoard(grid);
    if (words.size >= (size === 4 ? 25 : 45) && [...words.keys()].some(word => word.length >= 5)) return grid;
  }
  throw new Error('Unable to certify a rich board. Try another seed.');
}
/** Centers and circular hit targets are shared by drag input and the ribbon. */
export function tileAtPoint(x: number, y: number, width: number, size: HuntSize): number | null {
  if (width <= 0 || x < 0 || y < 0 || x >= width || y >= width) return null;
  const cell = width / size, col = Math.floor(x / cell), row = Math.floor(y / cell);
  return Math.hypot(x - (col + 0.5) * cell, y - (row + 0.5) * cell) <= cell * 0.4 ? row * size + col : null;
}
