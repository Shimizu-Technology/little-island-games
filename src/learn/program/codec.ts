import { validProgram, type Node, type Program } from './model';

/** Compact, versioned draft. The surrounding envelope, profiles and replay versions stay put. */
export type Code = [0, number] | [1, Code[]] | [2, number, Code[]] | [3, number] | [4, Code[], Code[]];
export type PackedProgram = [1, Code[], Code[][]];
const pack = (nodes: Node[]): Code[] => nodes.map(n => n.kind === 'command' ? [0, n.command] : n.kind === 'sequence' ? [1, pack(n.body)] : n.kind === 'repeat' ? [2, n.times, pack(n.body)] : n.kind === 'call' ? [3, n.song] : [4, pack(n.yes), pack(n.no)]);
export function encodeProgram(program: Program): PackedProgram {
  if (!validProgram(program)) throw new Error('Invalid block program.');
  return [1, pack(program.body), program.songs.map(pack)];
}
export function decodeProgram(value: unknown, validCommand?: (command: number) => boolean): Program | null {
  let count = 0;
  const dense = (v: unknown, max: number): v is unknown[] => Array.isArray(v) && v.length <= max && Object.keys(v).length === v.length;
  const read = (v: unknown, depth: number): Node[] | null => {
    if (depth > 4 || !dense(v, 80)) return null;
    const nodes: Node[] = [];
    for (const row of v) {
      if (++count > 80 || !dense(row, 3)) return null;
      if (row[0] === 0 && row.length === 2 && Number.isInteger(row[1])) nodes.push({ kind: 'command', command: row[1] as number });
      else if (row[0] === 3 && row.length === 2 && Number.isInteger(row[1])) nodes.push({ kind: 'call', song: row[1] as number });
      else if (row[0] === 1 && row.length === 2) {
        const body = read(row[1], depth + 1); if (!body) return null;
        nodes.push({ kind: 'sequence', body });
      } else if (row[0] === 2 && row.length === 3 && Number.isInteger(row[1])) {
        const body = read(row[2], depth + 1); if (!body) return null;
        nodes.push({ kind: 'repeat', times: row[1] as number, body });
      } else if (row[0] === 4 && row.length === 3) {
        const yes = read(row[1], depth + 1), no = read(row[2], depth + 1); if (!yes || !no) return null;
        nodes.push({ kind: 'if', yes, no });
      } else return null;
    }
    return nodes;
  };
  if (!dense(value, 3) || value.length !== 3 || value[0] !== 1 || !dense(value[2], 4)) return null;
  const body = read(value[1], 1), songs = value[2].map(song => read(song, 1));
  if (!body || songs.some(song => song === null)) return null;
  const program: Program = { version: 1, body, songs: songs as Node[][] };
  return validProgram(program, validCommand) ? program : null;
}

/** UTF-8 admission, shared by School edits as well as the existing Challenge boundary. */
export function sessionBytes(value: unknown): number {
  let text: string;
  try { text = JSON.stringify(value); if (typeof text !== 'string') return Infinity; } catch { return Infinity; }
  let bytes = 0;
  for (const c of text) { const cp = c.codePointAt(0)!; bytes += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4; }
  return bytes;
}
