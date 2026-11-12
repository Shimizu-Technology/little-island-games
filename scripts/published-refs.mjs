// Which committed generations of a catalog have reached a family. Shared by the puzzle catalog and
// save catalog history gates. A generation no published ref contains may still be replaced by the
// branch that alone added it; anything a published ref holds is checked in full. With no published
// ref present (an exported tree, a clone without these remotes), every generation counts as published.
import { execFileSync } from 'node:child_process';

export const publishedRefs = ['origin/program/4.0', 'origin/main'];
const succeeds = (cwd, args) => { try { execFileSync('git', args, { cwd, stdio: 'ignore' }); return true; } catch { return false; } };
/** The published refs present in this checkout, and a test for whether a commit is in any of them. */
export function publishedHistory(cwd = process.cwd(), wanted = publishedRefs) {
  const refs = wanted.filter(ref => succeeds(cwd, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]));
  return { refs, published: commit => !refs.length || refs.some(ref => succeeds(cwd, ['merge-base', '--is-ancestor', commit, ref])) };
}
/** A file's text at each published ref that has it. */
export function publishedTexts(file, cwd = process.cwd(), wanted = publishedRefs) {
  return publishedHistory(cwd, wanted).refs.flatMap(ref => { try { return [execFileSync('git', ['show', `${ref}:${file}`], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 })]; } catch { return []; } });
}
