import { validProgram, type Node, type Program } from './model';
export type Location = { song: number | null; path: (number | 'body' | 'yes' | 'no')[] };
export const main: Location = { song: null, path: [] };
/** Pure structural edits; callers admit the whole candidate before publishing or recording undo. */
export function listAt(program: Program, location: Location): Node[] | null {
  let list = location.song === null ? program.body : program.songs[location.song];
  if (!list) return null;
  for (let i = 0; i < location.path.length; i += 2) {
    const node = list[location.path[i] as number], branch = location.path[i + 1];
    if (!node) return null;
    if (branch === 'body' && (node.kind === 'repeat' || node.kind === 'sequence')) list = node.body;
    else if ((branch === 'yes' || branch === 'no') && node.kind === 'if') list = node[branch];
    else return null;
  }
  return list;
}
export const address = (location: Location, at?: number): string => `${location.song === null ? 'main' : `song${location.song}`}${location.path.length ? `.${location.path.join('.')}` : ''}${at === undefined ? '' : `.${at}`}`;
export const clone = (program: Program): Program => JSON.parse(JSON.stringify(program));
export function insertNode(program: Program, location: Location, at: number, node: Node): Program | null {
  const next = clone(program), list = listAt(next, location);
  if (!list || at < 0 || at > list.length) return null;
  list.splice(at, 0, JSON.parse(JSON.stringify(node)) as Node);
  return validProgram(next) ? next : null;
}
export function removeNode(program: Program, location: Location, at: number): Program | null {
  const next = clone(program), list = listAt(next, location);
  if (!list || !list[at]) return null;
  list.splice(at, 1);
  return validProgram(next) ? next : null;
}
export function replaceNode(program: Program, location: Location, at: number, node: Node): Program | null {
  const next = clone(program), list = listAt(next, location);
  if (!list || !list[at]) return null;
  list[at] = JSON.parse(JSON.stringify(node)) as Node;
  return validProgram(next) ? next : null;
}
export function moveNode(program: Program, source: Location, at: number, target: Location, before: number): Program | null {
  const from = address(source, at), to = address(target);
  if (to === from || to.startsWith(`${from}.`)) return null;
  const next = clone(program), old = listAt(next, source), dest = listAt(next, target);
  if (!old?.[at] || !dest || before < 0 || before > dest.length) return null;
  const [node] = old.splice(at, 1);
  dest.splice(before - (dest === old && before > at ? 1 : 0), 0, node);
  return validProgram(next) ? next : null;
}
export type EditHistory = { past: Program[]; future: Program[] };
export const historyEdit = (history: EditHistory, old: Program): EditHistory => ({ past: [...history.past.slice(-15), clone(old)], future: [] });

/** A whole-draft replay edit cannot claim that replacing several executable cards was one
 * repair. Shape-only edits still count once; current flat-game edit dares keep their meaning. */
export function projectionEdits<T>(before: readonly T[], after: readonly T[]): number {
  let row = Array.from({ length: after.length + 1 }, (_, i) => i);
  for (let i = 0; i < before.length; i++) {
    const next = [i + 1];
    for (let j = 0; j < after.length; j++) next.push(before[i] === after[j] ? row[j] : 1 + Math.min(row[j], row[j + 1], next[j]));
    row = next;
  }
  return Math.max(1, row[after.length]);
}
