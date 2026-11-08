import { requireThat, foldScan } from './core.mjs';

export function validateGrid(grid) {
  requireThat(Array.isArray(grid) && grid.length > 0 && grid.length <= 25 && grid.every(row => Array.isArray(row) && row.length === grid[0].length && row.length > 0 && row.length <= 25 && row.every(c => typeof c === 'string' && /^(?:CH|NG|[A-ZÅÑ']|#)$/u.test(c))), 'Invalid grid cells');
}
function trieFor(terms) {
  const root = {};
  for (const term of terms) {
    const s = foldScan(term);
    requireThat(/^[A-Z]{3,40}$/.test(s), 'Invalid private scan entry');
    let node = root;
    for (const c of s) node = node[c] ??= {};
    node.end = s;
  }
  return root;
}
export function validateListed(grid, listed = []) {
  validateGrid(grid);
  for (const entry of listed) {
    requireThat(typeof entry.wordId === 'string' && entry.wordId && Array.isArray(entry.cells) && entry.cells.length >= 1 && entry.cells.every(p=>Array.isArray(p) && p.length === 2 && p.every(Number.isInteger)), 'Invalid listed path');
    requireThat(new Set(entry.cells.map(p => p.join(','))).size === entry.cells.length, 'Repeated listed cell');
    let direction;
    for (let i = 0; i < entry.cells.length; i++) {
      const [r, c] = entry.cells[i];
      requireThat(Number.isInteger(r) && Number.isInteger(c) && r >= 0 && c >= 0 && r < grid.length && c < grid[0].length, 'Listed cell outside grid');
      if (i) {
        const d = [r - entry.cells[i - 1][0], c - entry.cells[i - 1][1]];
        requireThat(d.some(Boolean) && d.every(n => Math.abs(n) <= 1), 'Listed path must be straight');
        direction ??= d;
        requireThat(d.join() === direction.join(), 'Listed path must be straight');
      }
    }
    requireThat(entry.cells.map(([r,c]) => grid[r][c]).join('') === entry.answer.toUpperCase().replaceAll(' ', ''), 'Listed path spelling mismatch');
  }
}
function exempt(path, listed) {
  return listed.some(e => path.every(([r,c]) => e.cells.some(([er,ec]) => er === r && ec === c)));
}
/** Trie walk. Python verifier deliberately uses independent whole-ray string searches. */
export function scanGrid(grid, terms, listed = []) {
  validateListed(grid, listed);
  const root = trieFor(terms), hits = [];
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[0].length; c++) {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      for (let offset = 0; offset < Math.max(1,foldScan(grid[r][c]).length); offset++) {
      let node = root;
      const path = [];
      outer: for (let nr = r, nc = c; nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length; nr += dr, nc += dc) {
        const token = grid[nr][nc];
        if (token === '#') break;
        path.push([nr,nc]);
        for (const letter of foldScan(token).slice(nr === r && nc === c ? offset : 0)) {
          node = node[letter];
          if (!node) break outer;
          if (node.end && !exempt(path, listed)) hits.push({ term: node.end, cells: [...path].map(p => [...p]) });
        }
      }
    }
    }
  }
  return hits;
}
export function countOccurrences(grid, cells) {
  validateGrid(grid);
  const paths = new Set();
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[0].length; c++) {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      if (cells.every((s, i) => grid[r + i * dr]?.[c + i * dc] === s)) {
        const path=cells.map((_,i) => `${r+i*dr},${c+i*dc}`);
        paths.add([path.join(';'),[...path].reverse().join(';')].sort()[0]);
      }
    }
  }
  return paths.size;
}
/** Wheel letters can be rearranged freely; never choose a blocked permutation. */
export function scanScramble(shuffle, terms) { return scanGrid([[...shuffle].join('')].map(row => [...row]), terms); }
/** Builder boards may bend through the eight touching neighbors, without reusing a cell. */
export function scanBentPaths(grid, coreTerms) {
  validateGrid(grid);
  const root = trieFor(coreTerms), found = new Set();
  function visit(r, c, node, used) {
    if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length || grid[r][c] === '#') return;
    const id = r * grid[0].length + c;
    if (used.has(id)) return;
    for (const letter of foldScan(grid[r][c])) { node = node[letter]; if (!node) return; }
    if (node.end) found.add(node.end);
    const next = new Set(used).add(id);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) visit(r + dr, c + dc, node, next);
  }
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[0].length; c++) visit(r, c, root, new Set());
  return [...found].sort();
}

/** A wheel can permute freely. Reject any core term whose multiset it contains. */
export function scanLetterWheel(letters, coreTerms) {
  requireThat(typeof letters === 'string' && /^[A-Z]{3,25}$/.test(letters),'Invalid wheel letters');
  const counts={};for (const c of letters) counts[c]=(counts[c] ?? 0)+1;
  return coreTerms.map(foldScan).filter(term => {
    const need={};for (const c of term) need[c]=(need[c] ?? 0)+1;
    return Object.entries(need).every(([c,n]) => (counts[c] ?? 0)>=n);
  });
}
