// What has been published, decided by contents rather than commit ancestry. Shared by the puzzle
// catalog and save catalog history gates, the Latin save-catalog writer and the unpublish tool.
// The published set is the union of each catalog file as it stands at the tip of every published
// ref (`git show <ref>:<path>`). An entry any tip holds is immutable however it got there (merge,
// squash or rebase). Anything else is a branch's own work and may still be replaced by it.
// Every configured ref must resolve and every file it has must read and parse; otherwise this throws,
// because nothing can then be shown to be unpublished. A tip whose tree has no such file publishes
// nothing through it (origin/main before the puzzle catalog existed).
import { execFileSync } from 'node:child_process';

export const publishedRefs = ['origin/program/4.0', 'origin/main'];
const fetchHint = refs => {
  const remote = refs.filter(ref => ref.startsWith('origin/')).map(ref => `+refs/heads/${ref.slice(7)}:refs/remotes/${ref}`);
  return remote.length === refs.length ? `Fetch them first: git fetch origin ${remote.join(' ')}` : 'Fetch or create them first.';
};
/** Every published ref resolved to its tip commit. Throws, with the fetch to run, if any is missing. */
export function publishedHistory(cwd = process.cwd(), wanted = publishedRefs) {
  if (!wanted.length) throw new Error('No published ref is configured, so nothing can be shown to be unpublished.');
  const missing = [], commits = wanted.map(ref => {
    try { return execFileSync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { missing.push(ref); return ''; }
  });
  if (missing.length) throw new Error(`Published ref${missing.length > 1 ? 's' : ''} ${missing.join(' and ')} cannot be resolved, so published puzzles and saves cannot be protected. ${fetchHint(wanted)}`);
  return { refs: [...wanted], commits };
}
/** The blob text at `commit:path`, or null when that tree has no such path. Paths are from the repository root. */
export function publishedFile(path, commit, cwd = process.cwd()) {
  const run = args => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28 });
  let listing;
  try { listing = run(['ls-tree', '--full-tree', commit, '--', path]).trim(); } catch (e) { throw new Error(`Cannot list ${path} at published ${commit.slice(0, 8)}: ${e instanceof Error ? e.message : String(e)}`); }
  if (!listing) return null;
  if (!/^100(644|755) blob /.test(listing)) throw new Error(`${path} at published ${commit.slice(0, 8)} is not a regular file.`);
  try { return run(['cat-file', 'blob', `${commit}:${path}`]); } catch (e) { throw new Error(`Cannot read ${path} at published ${commit.slice(0, 8)}: ${e instanceof Error ? e.message : String(e)}`); }
}
/** `path` at the tip of each published ref: text is null where that tip has no such file. */
export function publishedSnapshots(path, cwd = process.cwd(), wanted = publishedRefs) {
  const { refs, commits } = publishedHistory(cwd, wanted);
  return refs.map((ref, i) => ({ ref, commit: commits[i], text: publishedFile(path, commits[i], cwd) }));
}
/** Parsed JSON of `path` at each published tip that has it. Throws if any of them does not parse. */
export function publishedJson(path, cwd = process.cwd(), wanted = publishedRefs) {
  return publishedSnapshots(path, cwd, wanted).flatMap(({ ref, commit, text }) => {
    if (text === null) return [];
    try { return [{ ref, commit, value: JSON.parse(text) }]; } catch (e) { throw new Error(`${path} at ${ref} (${commit.slice(0, 8)}) does not parse: ${e instanceof Error ? e.message : String(e)}`); }
  });
}
/** A file's text at each published tip that has it. */
export function publishedTexts(path, cwd = process.cwd(), wanted = publishedRefs) {
  return publishedSnapshots(path, cwd, wanted).flatMap(s => s.text === null ? [] : [s.text]);
}
