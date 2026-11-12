import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { verifyHistory } from '../scripts/puzzles/history';
import { publishedHistory, publishedTexts } from '../scripts/published-refs.mjs';
import { bakeFamily, type CatalogDirs } from '../scripts/puzzles/pipeline';
import { toyCore, toySpec } from './helpers/puzzle-toy';

/** A throwaway repository: `main` stands in for a published ref, `work` for an unmerged slice branch. */
function repo() {
  const cwd = mkdtempSync(join(tmpdir(), 'puzzle-history-')), dirs: CatalogDirs = { content: join(cwd, 'content'), receipts: join(cwd, 'receipts') };
  const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  const commit = (message: string) => { git('add', '-A'); git('commit', '-q', '-m', message); return git('rev-parse', 'HEAD').trim(); };
  return { cwd, dirs, git, commit, done: () => rmSync(cwd, { recursive: true, force: true }) };
}
const family = (id: string, offset: number) => toySpec({ id, bands: [{ id: 'open', target: 8, floor: 1, advanced: false }], generate: seed => toyCore({ seed, payload: { goal: ((seed + offset) % 40) + 1 }, layout: seed % 2 ? 'a' : 'b', template: `t${seed % 4}` }) });
/** Takes a family out of the working root, as the G3 re-bake does before baking it again. */
const unlist = (dirs: CatalogDirs, id: string) => {
  const file = join(dirs.content, 'root.json'), root = JSON.parse(readFileSync(file, 'utf8'));
  writeFileSync(file, `${JSON.stringify({ ...root, families: root.families.filter((f: [string]) => f[0] !== id) })}\n`);
};

describe('catalog history: unpublished branch generations may be replaced', () => {
  it('lets a branch re-bake a family no published ref contains, and still guards published packs', { timeout: 60_000 }, () => {
    const r = repo();
    try {
      bakeFamily(family('toy', 0), { dirs: r.dirs, sourceSha: 'main' });
      r.commit('published toy');
      r.git('checkout', '-q', '-b', 'work');
      bakeFamily(family('toy-two', 0), { dirs: r.dirs, sourceSha: 'first' });
      const first = r.commit('branch adds toy-two');
      expect(verifyHistory({ cwd: r.cwd, dirs: r.dirs, refs: ['main'] })).toMatchObject({ generations: 2, checked: 1, unpublished: 1 });

      // Replace the branch-only family in place: new rows, so its old packs and counts disappear.
      unlist(r.dirs, 'toy-two');
      rmSync(join(r.dirs.receipts, 'toy-two'), { recursive: true, force: true });
      bakeFamily(family('toy-two', 17), { dirs: r.dirs, sourceSha: 'second' });
      r.commit('branch re-bakes toy-two');
      expect(verifyHistory({ cwd: r.cwd, dirs: r.dirs, refs: ['main'] })).toMatchObject({ generations: 3, checked: 1, unpublished: 2 });

      // Had the first toy-two reached a published ref, the same replacement is refused.
      r.git('branch', 'released', first);
      expect(() => verifyHistory({ cwd: r.cwd, dirs: r.dirs, refs: ['main', 'released'] })).toThrow(/toy-two/);
      // With no published ref at all, every generation counts as published.
      expect(() => verifyHistory({ cwd: r.cwd, dirs: r.dirs, refs: ['origin/none'] })).toThrow(/toy-two/);

      // The save catalog gate and writer use the same test of what is published.
      const h = publishedHistory(r.cwd, ['main', 'origin/none']);
      expect(h.refs).toEqual(['main']);
      expect(h.published(first)).toBe(false);
      expect(h.published(r.git('rev-parse', 'main').trim())).toBe(true);
      expect(publishedTexts('content/root.json', r.cwd, ['main']).map(t => JSON.parse(t).families.map((f: [string]) => f[0]))).toEqual([['toy']]);

      // A published family is never replaceable from a branch.
      unlist(r.dirs, 'toy');
      rmSync(join(r.dirs.receipts, 'toy'), { recursive: true, force: true });
      bakeFamily(family('toy', 23), { dirs: r.dirs, sourceSha: 'third' });
      r.commit('branch tries to re-bake published toy');
      expect(() => verifyHistory({ cwd: r.cwd, dirs: r.dirs, refs: ['main'] })).toThrow(/toy/);
    } finally { r.done(); }
  });
});
