import { decodeProgram, encodeProgram, type Code } from './codec';
import type { Program } from './model';
/** Path: -1 main / 0..3 song, then index, branch (0 body / 1 yes / 2 no), index… . */
export type Path = number[];
/** Insert subtree, delete, move, set-repeat, add empty song, delete song, set-command. Never whole drafts. */
export type Operation = [0, Path, Code] | [1, Path] | [2, Path, Path] | [3 | 6, Path, number] | [4 | 5, number];
const dense = (v: unknown, max: number): v is unknown[] => Array.isArray(v) && v.length <= max && Object.keys(v).length === v.length;
const path = (v: unknown): v is Path => dense(v, 8) && v.length >= 2 && v.length % 2 === 0 && v.every((n, i) => Number.isInteger(n) && (n as number) >= (i === 0 ? -1 : 0) && (n as number) <= (i === 0 ? 3 : i % 2 === 0 ? 2 : 80));
export function validOperations(v: unknown): v is Operation[] {
  return dense(v, 160) && v.length > 0 && v.every(op => dense(op, 3) && (
    op[0] === 0 && op.length === 3 && path(op[1]) && [0,1,2,3,4].some(n=>!!decodeProgram([1,[op[2]],Array.from({length:n},()=>[])])) ||
    op[0] === 1 && op.length === 2 && path(op[1]) ||
    op[0] === 2 && op.length === 3 && path(op[1]) && path(op[2]) ||
    op[0] === 3 && op.length === 3 && path(op[1]) && Number.isInteger(op[2]) && (op[2] as number) >= 2 && (op[2] as number) <= 16 ||
    op[0] === 6 && op.length === 3 && path(op[1]) && Number.isInteger(op[2]) && (op[2] as number) >= 0 && (op[2] as number) <= 255 ||
    (op[0] === 4 || op[0] === 5) && op.length === 2 && Number.isInteger(op[1]) && (op[1] as number) >= 0 && (op[1] as number) < 4
  ));
}
function listAt(body: Code[], songs: Code[][], p: Path): Code[] | null {
  let list = p[0] === -1 ? body : songs[p[0]];
  for (let i = 1; list && i < p.length - 1; i += 2) {
    const node = list[p[i]], branch = p[i + 1];
    list = node?.[0] === 1 && branch === 0 ? node[1] : node?.[0] === 2 && branch === 0 ? node[2] : node?.[0] === 4 && branch === 1 ? node[2] : node?.[0] === 4 && branch === 2 ? node[3] : undefined!;
  }
  return list ?? null;
}
export function applyOperations(program: Program, operations: Operation[]): Program | null {
  if (!validOperations(operations)) return null;
  const [, body, songs] = encodeProgram(program);
  for (const op of operations) {
    if (op[0] === 4) { if (songs.length >= 4 || op[1] > songs.length) return null; songs.splice(op[1], 0, []); continue; }
    if (op[0] === 5) { if (!songs[op[1]]) return null; songs.splice(op[1], 1); continue; }
    const p = op[1] as Path, at = p.at(-1)!, list = listAt(body, songs, p);
    if (!list || at > list.length) return null;
    if (op[0] === 0) list.splice(at, 0, structuredCopy(op[2]));
    else if (!list[at]) return null;
    else if (op[0] === 1) list.splice(at, 1);
    else if (op[0] === 6) { if(list[at][0]!==0)return null;list[at]=[0,op[2]]; }
    else if (op[0] === 3) { if (list[at][0] !== 2) return null; (list[at] as [2, number, Code[]])[1] = op[2]; }
    else if (op[0] === 2) {
      const dest = listAt(body, songs, op[2]), before = op[2].at(-1)!;
      // Capturing a destination below the moved node would create a cycle.
      if (!dest || before > dest.length || p.every((n, i) => n === op[2][i]) && op[2].length > p.length) return null;
      const [node] = list.splice(at, 1); dest.splice(before - (dest === list && before > at ? 1 : 0), 0, node);
    }
  }
  return decodeProgram([1, body, songs]);
}
const structuredCopy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
/** Diff only the changed subtrees. Repeated count edits remain constant size at any plan size. */
export function programOperations(before: Program, after: Program): Operation[] {
  const [, old, songs] = encodeProgram(before), [, next, nextSongs] = encodeProgram(after), ops: Operation[] = [];
  const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const diff = (a: Code[], b: Code[], prefix: Path) => {
    // A real single move preserves the whole multiset. A replacement must never
    // cascade into moves simply because the new command exists farther along.
    const first=a.findIndex((node,i)=>!equal(node,b[i]));
    if(a.length===b.length&&first>=0){
      for(let j=first+1;j<a.length;j++)for(const [from,before] of [[j,first],[first,j+1]]){
        const candidate=[...a], [node]=candidate.splice(from,1);
        candidate.splice(before-(before>from?1:0),0,node);
        if(equal(candidate,b)){ops.push([2,[...prefix,from],[...prefix,before]]);a.splice(0,a.length,...candidate);return;}
      }
    }
    let i = 0;
    for (; i < b.length; i++) {
      const p = [...prefix, i], x = a[i], y = b[i];
      if (equal(x, y)) continue;
      if (!x) { ops.push([0, p, y]); a.push(y); continue; }
      if (x[0] === 0 && y[0] === 0) ops.push([6,p,y[1]]);
      else if (x[0] === 2 && y[0] === 2) { if (x[1] !== y[1]) ops.push([3, p, y[1]]); diff(x[2], y[2], [...p, 0]); }
      else if (x[0] === 1 && y[0] === 1) diff(x[1], y[1], [...p, 0]);
      else if (x[0] === 4 && y[0] === 4) { diff(x[2], y[2], [...p, 1]); diff(x[3], y[3], [...p, 2]); }
      else {
        const from = a.findIndex((node, at) => at > i && equal(node, y));
        if (from >= 0) { ops.push([2, [...prefix, from], p]); const [node] = a.splice(from, 1); a.splice(i, 0, node); }
        else { ops.push([1, p], [0, p, y]); a[i] = y; }
      }
    }
    while (a.length > b.length) { ops.push([1, [...prefix, b.length]]); a.splice(b.length, 1); }
  };
  while (songs.length < nextSongs.length) { ops.push([4, songs.length]); songs.push([]); }
  diff(old, next, [-1]);
  nextSongs.forEach((song, i) => diff(songs[i], song, [i]));
  while (songs.length > nextSongs.length) { ops.push([5, songs.length - 1]); songs.pop(); }
  return ops;
}
