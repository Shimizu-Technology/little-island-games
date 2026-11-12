import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { verifyHistory } from '../scripts/puzzles/history';
import { publishedHistory, publishedJson, publishedRefs, publishedTexts } from '../scripts/published-refs.mjs';
import { bakeFamily, type CatalogDirs } from '../scripts/puzzles/pipeline';
import { toyCore, toySpec } from './helpers/puzzle-toy';

/**
 * A throwaway repository with the real published ref names: `origin/main` and `origin/program/4.0`
 * are set with update-ref, as a fetch would; `work` stands for an unmerged slice branch.
 */
function repo() {
  const cwd = mkdtempSync(join(tmpdir(), 'puzzle-history-')), dirs: CatalogDirs = { content: join(cwd, 'content'), receipts: join(cwd, 'receipts') };
  const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  const commit = (message: string) => { git('add', '-A'); git('commit', '-q', '-m', message); return git('rev-parse', 'HEAD').trim(); };
  const publish = (ref: string, at: string) => git('update-ref', `refs/remotes/${ref}`, at);
  const check = () => verifyHistory({ cwd, dirs });
  return { cwd, dirs, git, commit, publish, check, done: () => rmSync(cwd, { recursive: true, force: true }) };
}
const family = (id: string, offset: number) => toySpec({ id, bands: [{ id: 'open', target: 8, floor: 1, advanced: false }], generate: seed => toyCore({ seed, payload: { goal: ((seed + offset) % 40) + 1 }, layout: seed % 2 ? 'a' : 'b', template: `t${seed % 4}` }) });
/** Takes a family out of the working root, as the G3 re-bake does before baking it again. */
const unlist = (dirs: CatalogDirs, id: string) => {
  const file = join(dirs.content, 'root.json'), root = JSON.parse(readFileSync(file, 'utf8'));
  writeFileSync(file, `${JSON.stringify({ ...root, families: root.families.filter((f: [string]) => f[0] !== id) })}\n`);
};
/** Re-bakes a family in place with different rows, so its old packs and counts disappear. */
const rebake = (r: ReturnType<typeof repo>, id: string, offset: number) => {
  unlist(r.dirs, id);
  rmSync(join(r.dirs.receipts, id), { recursive: true, force: true });
  bakeFamily(family(id, offset), { dirs: r.dirs, sourceSha: `rebake-${offset}` });
  return r.commit(`re-bake ${id}`);
};
/** Base `toy` on both published refs, then a work branch that adds `toy-two`. */
function published() {
  const r = repo();
  bakeFamily(family('toy', 0), { dirs: r.dirs, sourceSha: 'base' });
  const base = r.commit('published toy');
  r.publish('origin/main', base); r.publish('origin/program/4.0', base);
  r.git('checkout', '-q', '-b', 'work');
  bakeFamily(family('toy-two', 0), { dirs: r.dirs, sourceSha: 'first' });
  const first = r.commit('branch adds toy-two');
  return Object.assign(r, { base, first });
}

describe('catalog history: published by contents at the published tips', () => {
  it('the configured refs are program/4.0 and main', () => expect(publishedRefs).toEqual(['origin/program/4.0', 'origin/main']));

  it("lets a branch re-bake a family no published tip holds (G3's own re-bake)", { timeout: 60_000 }, () => {
    const r = published();
    try {
      expect(r.check()).toMatchObject({ checked: 2, unpublished: 1, published: ['toy'], refs: ['origin/program/4.0', 'origin/main'] });
      rebake(r, 'toy-two', 17);
      expect(r.check()).toMatchObject({ checked: 2, unpublished: 1, published: ['toy'] });
      rebake(r, 'toy-two', 29);
      expect(r.check()).toMatchObject({ checked: 2, unpublished: 1 });
    } finally { r.done(); }
  });

  it('never lets a branch re-bake a published family', { timeout: 60_000 }, () => {
    const r = published();
    try {
      rebake(r, 'toy', 23);
      expect(() => r.check()).toThrow(/Family toy .*published at origin\/program\/4\.0/);
    } finally { r.done(); }
  });

  it('rejects a published-pack change when either ref is missing (review 2 probe A)', { timeout: 60_000 }, () => {
    const r = published();
    try {
      // program/4.0 publishes toy-two by ordinary merge; main does not have it.
      r.publish('origin/program/4.0', r.first);
      rebake(r, 'toy-two', 17);
      expect(() => r.check()).toThrow(/toy-two/);
      // Lose only the ref that holds it: the check must stop, not treat toy-two as unpublished.
      r.git('update-ref', '-d', 'refs/remotes/origin/program/4.0');
      expect(() => r.check()).toThrow(/origin\/program\/4\.0 cannot be resolved.*git fetch origin \+refs\/heads\/program\/4\.0:refs\/remotes\/origin\/program\/4\.0 \+refs\/heads\/main:refs\/remotes\/origin\/main/);
      r.publish('origin/program/4.0', r.first); r.git('update-ref', '-d', 'refs/remotes/origin/main');
      expect(() => r.check()).toThrow(/origin\/main cannot be resolved/);
      // The shared helper stops for every caller, the save gate, writer and unpublish tool included.
      expect(() => publishedHistory(r.cwd)).toThrow(/cannot be resolved/);
      expect(() => publishedTexts('content/root.json', r.cwd)).toThrow(/cannot be resolved/);
      expect(() => publishedHistory(r.cwd, [])).toThrow(/No published ref/);
    } finally { r.done(); }
  });

  it('rejects a published-pack change published by squash, outside HEAD ancestry (review 2 probe B)', { timeout: 60_000 }, () => {
    const r = published();
    try {
      // main publishes the branch's snapshot with a squash commit: the branch commit is never its ancestor.
      r.git('checkout', '-q', 'main'); r.git('merge', '-q', '--squash', 'work');
      const squash = r.commit('publish toy-two by squash');
      r.publish('origin/main', squash);
      r.git('checkout', '-q', 'work');
      expect(() => r.git('merge-base', '--is-ancestor', r.first, 'origin/main')).toThrow();
      expect(r.check()).toMatchObject({ published: ['toy', 'toy-two'], unpublished: 0 });
      rebake(r, 'toy-two', 17);
      expect(() => r.check()).toThrow(/Family toy-two .*published at origin\/main/);
    } finally { r.done(); }
  });

  it('rejects a change published on a divergent branch the work branch never saw', { timeout: 60_000 }, () => {
    const r = published();
    try {
      // program/4.0 gets its own toy-two (a cherry-pick elsewhere), unrelated to this branch's commits.
      r.git('checkout', '-q', '-b', 'elsewhere', r.base);
      bakeFamily(family('toy-two', 5), { dirs: r.dirs, sourceSha: 'elsewhere' });
      r.publish('origin/program/4.0', r.commit('program publishes toy-two'));
      r.git('checkout', '-q', 'work');
      expect(() => r.check()).toThrow(/Family toy-two .*published at origin\/program\/4\.0/);
    } finally { r.done(); }
  });

  it('fails closed when a published tip cannot be parsed or lacks a manifest its root lists', { timeout: 60_000 }, () => {
    const r = published();
    try {
      const good = readFileSync(join(r.dirs.content, 'root.json'), 'utf8'), asset = JSON.parse(good).families[0][1] as string;
      r.git('checkout', '-q', '-b', 'broken', r.base);
      writeFileSync(join(r.dirs.content, 'root.json'), '{ not json');
      r.publish('origin/main', r.commit('broken root'));
      r.git('checkout', '-q', 'work');
      expect(() => r.check()).toThrow(/root\.json at origin\/main .* does not parse/);
      expect(() => publishedJson('content/root.json', r.cwd)).toThrow(/does not parse/);
      r.git('checkout', '-q', 'broken'); writeFileSync(join(r.dirs.content, 'root.json'), good); rmSync(join(r.dirs.content, 'assets', `${asset}.lipuzzle`));
      r.publish('origin/main', r.commit('root without its manifest'));
      r.git('checkout', '-q', 'work');
      expect(() => r.check()).toThrow(/has no manifest/);
    } finally { r.done(); }
  });

  it('a tip without a catalog publishes nothing through it, and a shallow checkout is refused', { timeout: 60_000 }, () => {
    const r = published();
    try {
      r.git('checkout', '-q', '--orphan', 'empty'); r.git('rm', '-rq', '--cached', '.');
      writeFileSync(join(r.cwd, 'README'), 'no catalog yet\n'); r.git('add', 'README'); r.git('commit', '-q', '-m', 'no catalog');
      r.publish('origin/main', r.git('rev-parse', 'HEAD').trim());
      r.git('checkout', '-q', '-f', 'work');
      expect(r.check()).toMatchObject({ checked: 1, published: ['toy'] });
      writeFileSync(join(r.cwd, '.git', 'shallow'), `${r.base}\n`);
      expect(() => r.check()).toThrow(/full Git history/);
    } finally { r.done(); }
  });
});
