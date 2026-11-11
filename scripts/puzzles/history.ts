import { execFileSync } from 'node:child_process';
import { relative, resolve } from 'node:path';
import { assertFamilyAppendOnly, assertRootAppendOnly, validFamily, validRoot, type RootIndex } from '../../src/puzzles/bank';
import { productionDirs, readCatalog, type CatalogDirs } from './pipeline';

import { publishedHistory, publishedRefs } from '../published-refs.mjs';
export { publishedRefs };
export type HistoryResult = { generations: number; checked: number; unpublished: number; refs: string[] };

/**
 * Every root generation in this checkout's history must be an append-only ancestor of the current
 * catalog. One narrow exception: a generation that no published ref contains never reached a family,
 * so a branch may still replace what it alone added. Anything a published ref contains is checked
 * in full through that ref's own generations. With no published ref present, every generation is
 * treated as published.
 */
export function verifyHistory(options: { cwd?: string; dirs?: CatalogDirs; refs?: readonly string[] } = {}): HistoryResult {
  const { cwd = process.cwd(), dirs = productionDirs, refs: wanted = publishedRefs } = options;
  const git = (...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (git('rev-parse', '--is-shallow-repository').trim() === 'true') throw new Error('Catalog immutability needs full Git history. Fetch with --unshallow before checking.');
  const { refs, published } = publishedHistory(cwd, wanted);
  const { root, families: current } = readCatalog(dirs), content = relative(cwd, resolve(cwd, dirs.content)), file = `${content}/root.json`;
  const commits = git('log', '--full-history', '--format=%H', '--', file).trim().split('\n').filter(Boolean);
  let checked = 0;
  for (const commit of commits) {
    if (!published(commit)) continue;
    checked++;
    const old: unknown = JSON.parse(git('show', `${commit}:${file}`));
    if (!validRoot(old)) throw new Error(`Historic root at ${commit} is invalid.`);
    const at = (what: string, check: () => void) => { try { check(); } catch (e) { throw new Error(`${what} at published generation ${commit.slice(0, 8)}: ${e instanceof Error ? e.message : String(e)}`); } };
    at('Root', () => assertRootAppendOnly(old as RootIndex, root));
    for (const [id, asset] of old.families) {
      const manifest: unknown = JSON.parse(git('show', `${commit}:${content}/assets/${asset}.lipuzzle`));
      const next = current.get(id);
      if (!validFamily(manifest) || !next) throw new Error(`Historic family ${id} is missing.`);
      at(`Family ${id}`, () => assertFamilyAppendOnly(manifest, next));
    }
  }
  return { generations: commits.length, checked, unpublished: commits.length - checked, refs };
}
