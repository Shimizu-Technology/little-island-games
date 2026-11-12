import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { publishedBanks } from '../scripts/published-refs.mjs';

// Review round 2, Q2-2: both save-catalog writers run against published tips that are fixtures. Each
// tip is a commit holding only a save catalog; the packaged puzzle content is linked in read-only.
const packaged = readFileSync('src/state/save-catalog.json', 'utf8');
const changed = (slot: number) => { const c = JSON.parse(packaged); c.banks.find((b: { slot: number }) => b.slot === slot).packHash = '0'.repeat(64); return `${JSON.stringify(c, null, 2)}\n`; };
function tips(program: string, main: string, working: string) {
  const cwd = mkdtempSync(join(tmpdir(), 'li-save-writer-')), file = join(cwd, 'src/state/save-catalog.json');
  mkdirSync(join(cwd, 'src/state'), { recursive: true }); symlinkSync(resolve('src/content'), join(cwd, 'src/content'));
  const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=Save Test', '-c', 'user.email=save-test@invalid.local', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
  git('init', '-q', '-b', 'work');
  const tip = (text: string) => { writeFileSync(file, text); git('add', 'src/state/save-catalog.json'); git('commit', '-q', '--allow-empty', '-m', 'published catalog'); return git('rev-parse', 'HEAD'); };
  git('update-ref', 'refs/remotes/origin/program/4.0', tip(program)); git('update-ref', 'refs/remotes/origin/main', tip(main));
  writeFileSync(file, working);
  const run = (writer: string) => { try { execFileSync(process.execPath, ['--import', resolve('scripts/puzzles/register.mjs'), resolve(`scripts/puzzles/${writer}/save-catalog.ts`)], { cwd, encoding: 'utf8', stdio: 'pipe' }); return ''; } catch (e) { return String((e as { stderr?: string }).stderr ?? e); } };
  return { cwd, run, text: () => readFileSync(file, 'utf8'), done: () => rmSync(cwd, { recursive: true, force: true }) };
}
const slotOf = (family: string) => (JSON.parse(packaged).banks as { slot: number; family?: string }[]).find(b => b.family === family)!.slot;

for (const [writer, family] of [['edges', 'bridges'], ['latin', 'sudoku']] as const) {
  describe(`${writer} save-catalog writer: every published definition binds it`, () => {
    const slot = slotOf(family), other = changed(slot);
    it('control: tips that agree with the packaged banks leave the catalog byte-identical', () => {
      const r = tips(packaged, packaged, packaged);
      try { expect(r.run(writer)).toBe(''); expect(r.text()).toBe(packaged); } finally { r.done(); }
    });
    it('the review’s two-tip conflict: program/4.0 holds A, main holds the packaged B, working holds A — refuses, unchanged', () => {
      const r = tips(other, packaged, other);
      try { expect(r.run(writer)).toMatch(new RegExp(`Slot ${slot} is published differently at origin/program/4\\.0 .* and origin/main`)); expect(r.text()).toBe(other); } finally { r.done(); }
    });
    it('the same conflict the other way round refuses too, and the packaged working catalog is unchanged', () => {
      const r = tips(packaged, other, packaged);
      try { expect(r.run(writer)).toMatch(new RegExp(`Slot ${slot} is published differently`)); expect(r.text()).toBe(packaged); } finally { r.done(); }
    });
    it('a conflict on a slot this writer does not own still stops it', () => {
      const r = tips(changed(slotOf('slip-tide')), packaged, packaged);
      try { expect(r.run(writer)).toMatch(/is published differently/); expect(r.text()).toBe(packaged); } finally { r.done(); }
    });
    it('tips that agree with each other but not with the generated bank refuse, unchanged', () => {
      const r = tips(other, other, packaged);
      try { expect(r.run(writer)).toMatch(new RegExp(`Slot ${slot} is published at origin/program/4\\.0 .* and registered differently`)); expect(r.text()).toBe(packaged); } finally { r.done(); }
    });
  });
}

it('publishedBanks keeps one definition per tip for each slot', () => {
  const r = tips(packaged, packaged, packaged);
  try {
    const banks = publishedBanks('src/state/save-catalog.json', r.cwd);
    expect(banks.size).toBe(JSON.parse(packaged).banks.length);
    expect([...banks.values()].every(d => d.length === 2 && d[0].ref === 'origin/program/4.0' && d[1].ref === 'origin/main')).toBe(true);
  } finally { r.done(); }
});
