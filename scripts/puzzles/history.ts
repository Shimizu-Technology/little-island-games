import { execFileSync } from 'node:child_process';
import { relative, resolve } from 'node:path';
import { assertFamilyAppendOnly, assertRootAppendOnly, validFamily, validRoot, type RootIndex } from '../../src/puzzles/bank';
import { productionDirs, readCatalog, type CatalogDirs } from './pipeline';

import { publishedFile, publishedJson, publishedRefs } from '../published-refs.mjs';
export { publishedRefs };
/**
 * `checked`: published root snapshots compared (one per ref whose tip has a root). `published`: the
 * family ids any of them lists. `unpublished`: current families no published root lists, which this
 * branch may still replace. `generations`: root commits in this checkout's history, for the log only.
 */
export type HistoryResult = { generations: number; checked: number; unpublished: number; refs: string[]; published: string[] };

/**
 * The current catalog must keep everything published at the tip of every published ref
 * (scripts/published-refs.mjs): each published root is append-only into the current root, and each
 * family manifest it lists is append-only into the current one, so every published pack row, hash
 * and daily pool stays byte-identical or is retired the existing way. Which commits carried a
 * published family there is irrelevant. A family no published root lists may still be re-baked.
 */
export function verifyHistory(options: { cwd?: string; dirs?: CatalogDirs; refs?: readonly string[] } = {}): HistoryResult {
  const { cwd = process.cwd(), dirs = productionDirs, refs: wanted = publishedRefs } = options;
  const git = (...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (git('rev-parse', '--is-shallow-repository').trim() === 'true') throw new Error('Catalog immutability needs full Git history. Fetch with --unshallow before checking.');
  const { root, families: current } = readCatalog(dirs), content = relative(cwd, resolve(cwd, dirs.content)), file = `${content}/root.json`;
  const snapshots = publishedJson(file, cwd, wanted), published = new Set<string>();
  for (const { ref, commit, value: old } of snapshots) {
    const where = `${ref} (${commit.slice(0, 8)})`;
    if (!validRoot(old)) throw new Error(`Published root at ${where} is invalid.`);
    const at = (what: string, check: () => void) => { try { check(); } catch (e) { throw new Error(`${what} published at ${where}: ${e instanceof Error ? e.message : String(e)}`); } };
    at('Root', () => assertRootAppendOnly(old as RootIndex, root));
    for (const [id, asset] of old.families) {
      published.add(id);
      const path = `${content}/assets/${asset}.lipuzzle`, text = publishedFile(path, commit, cwd);
      if (text === null) throw new Error(`Family ${id} published at ${where} has no manifest ${path}.`);
      let manifest: unknown;
      try { manifest = JSON.parse(text); } catch { throw new Error(`Family ${id} manifest published at ${where} does not parse.`); }
      const next = current.get(id);
      if (!validFamily(manifest)) throw new Error(`Family ${id} manifest published at ${where} is invalid.`);
      if (!next) throw new Error(`Family ${id} published at ${where} is missing.`);
      at(`Family ${id}`, () => assertFamilyAppendOnly(manifest, next));
    }
  }
  const generations = git('log', '--full-history', '--format=%H', '--', file).trim().split('\n').filter(Boolean).length;
  return { generations, checked: snapshots.length, unpublished: [...current.keys()].filter(id => !published.has(id)).length, refs: [...wanted], published: [...published].sort() };
}
