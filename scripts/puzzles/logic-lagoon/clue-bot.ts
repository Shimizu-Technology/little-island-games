import { shapeOf, solved, type LatinPuzzle } from '../../../src/puzzles/latin/core';
/** Independent teaching probe: peer singles, hidden places, direct cage facts and arrow bounds only.
 * It does not enumerate cage combinations, eliminate pairs, search, or read the solution. */
export function clueSinglesBot(p: LatinPuzzle): { solved: boolean; placements: number } {
  const values = [...p.givens], { peers, groups } = shapeOf(p);
  let placements = 0;
  for (;;) {
    const domains = values.map((v, i) => v ? [v] : Array.from({ length: p.size }, (_, k) => k + 1).filter(n => !peers[i].some(j => values[j] === n)));
    for (const c of p.cages) {
      const empty = c.cells.filter(i => !values[i]);
      if (empty.length === 1 && ['+', '='].includes(c.op)) {
        const left = c.target - c.cells.reduce((n, i) => n + values[i], 0);
        domains[empty[0]] = domains[empty[0]].filter(v => v === left);
      }
    }
    for (;;) {
      let changed = false;
      for (const [a, b] of p.less) {
        const da = domains[a].filter(v => domains[b].some(w => v < w)), db = domains[b].filter(w => da.some(v => v < w));
        changed ||= da.length !== domains[a].length || db.length !== domains[b].length;
        domains[a] = da; domains[b] = db;
      }
      if (!changed) break;
    }
    const singles = new Map<number, number>();
    domains.forEach((d, i) => { if (!values[i] && d.length === 1) singles.set(i, d[0]); });
    for (const g of groups) if (['row', 'column', 'box'].includes(g.kind)) for (let v = 1; v <= p.size; v++) {
      if (g.cells.some(i => values[i] === v)) continue;
      const possible = g.cells.filter(i => !values[i] && domains[i].includes(v));
      if (possible.length === 1) singles.set(possible[0], v);
    }
    if (!singles.size) return { solved: solved(p, values), placements };
    for (const [i, v] of singles) { values[i] = v; placements++; }
  }
}
