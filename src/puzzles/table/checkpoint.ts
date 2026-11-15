import { base64, exactKeys, plain, uint, unbase64, pack, unpack } from '../../state/saveBits';
import {deepFreeze} from '../descriptor';
import { apply, opening, validPosition, type Deal, type Move, type Position } from './solitaire';

/** The table session: 52 cards, a compact arrangement, 1,024 reversible moves, a retained audit. */
export type TablePayload = { version: 1; board: string; undo: string; audit: number[]; edits: number };
type Read={payload:TablePayload;position:Position;history:number[];path:readonly string[]};
const accepted=new WeakMap<object,{deal:string;fingerprint:string;read:Read}>();
const pathIndexes=new WeakMap<Read,ReadonlyMap<string,number>>();
const stamp=(p:TablePayload)=>`${p.board}|${p.undo}|${p.edits}|${p.audit.join('.')}`;
const dealKey=(d:Deal)=>`${d.mode}:${d.cards}`;
/** Derived data is frozen; caller-owned payloads are neither frozen nor mutated. */
function remember(d:Deal,payload:TablePayload,position:Position,list:number[],path:readonly string[]):TablePayload{
 const read=Object.freeze({payload,position:deepFreeze(position),history:deepFreeze(list),path:Object.freeze([...path])});
 const index=new Map<string,number>();path.forEach((key,i)=>{if(!index.has(key))index.set(key,i);});pathIndexes.set(read,index);
 accepted.set(payload,{deal:dealKey(d),fingerprint:stamp(payload),read});return payload;
}
export const encodeBoard = (s: Position) => base64([...s.piles.map(p => p.length), ...s.hidden, ...s.piles.flat(), ...unbase64(pack(s.known,1),7)!]);
export function decodeBoard(raw: unknown, d: Deal): Position | null {
  const bytes = unbase64(raw, 83);
  if (!bytes || bytes.slice(0, 16).reduce((a, n) => a + n, 0) !== 52) return null;
  let at = 24;
  const piles = bytes.slice(0, 16).map(n => { const p = bytes.slice(at, at + n); at += n; return p; });
  const s = { piles, hidden: bytes.slice(16, 24), known: unpack(base64(bytes.slice(76)),52,1)! };
  return validPosition(s, d.mode) ? s : null;
}
/** 14 bits: from(4), to(4), count(5), turned-face-up(1). Stock moves retain their actual count. */
const record = (s: Position, next: Position, a: Move) => a[0] | a[1] << 4 | (a[2] || Math.abs(next.piles[12].length - s.piles[12].length)) << 8 | Number(a[0] < 8 && next.hidden[a[0]] < s.hidden[a[0]]) << 13;
const decodeUndo = (raw: unknown) => { if (typeof raw !== 'string' || raw.length % 4 || raw.length > 2392) return null; const pad = raw.endsWith('==') ? 2 : raw.endsWith('=') ? 1 : 0, len = raw.length * 3 / 4 - pad; if (len % 7 && len !== 0) return null; return unpack(raw, len / 7 * 4, 14); };
// Four moves occupy exactly seven bytes. Pad with reserved zero records; zero is never a legal move.
export const history = (raw: unknown): number[] | null => { const list = decodeUndo(raw); if (!list) return null; const end = list.indexOf(0), out = end < 0 ? list : list.slice(0, end); return out.length <= 1024 && (end < 0 || list.slice(end).every(n => n === 0)) ? out : null; };
const encodeUndo = (list: readonly number[]) => pack([...list, ...Array<number>((4 - list.length % 4) % 4).fill(0)], 14);
function backwards(s: Position, d: Deal, code: number): Position | null {
  const from = code & 15, to = code >> 4 & 15, count = code >> 8 & 31, flipped = code >> 13;
  if (!count || from === to) return null;
  const piles = s.piles.map(p => [...p]), hidden = [...s.hidden];
  if (d.mode !== 'freecell' && from === 13 && to === 12) {
    if (flipped || count !== piles[12].length || piles[13].length) return null;
    piles[13] = piles[12].splice(0).reverse();
  } else if (d.mode !== 'freecell' && from === 12 && to === 13) {
    if (flipped || count > (d.mode === 'draw-one' ? 1 : 3) || piles[13].length < count) return null;
    for (let i = 0; i < count; i++) piles[12].push(piles[13].pop()!);
  } else {
    if (count > piles[to].length || flipped && from >= 8) return null;
    piles[from].push(...piles[to].splice(-count));
    if (flipped) hidden[from]++;
  }
  const before = { piles, hidden, known: [...s.known] };
  if (!validPosition(before, d.mode)) return null;
  const action: Move = [from, to, d.mode !== 'freecell' && from >= 12 && to >= 12 ? 0 : count];
  const forward = apply(before, d.mode, action);
  return forward !== before && encodeBoard(forward) === encodeBoard(s) && record(before, forward, action) === code ? before : null;
}
export const fresh = (d: Deal): TablePayload => {const position=opening(d),board=encodeBoard(position);return remember(d,{version:1,board,undo:'',audit:[],edits:0},position,[],[board]);};
export function readTable(x: unknown, d: Deal): Read | null {
  if (!plain(x) || !exactKeys(x, ['version', 'board', 'undo', 'audit', 'edits']) || x.version !== 1 || !uint(x.edits, 2147483647) || !Array.isArray(x.audit) || x.audit.length > 128 || !x.audit.every(n => uint(n, 9999))) return null;
  if(typeof x.board!=='string'||x.board.length!==112||typeof x.undo!=='string'||x.undo.length>2392)return null;
  const cached=accepted.get(x);if(cached&&cached.deal===dealKey(d)&&cached.fingerprint===stamp(x as TablePayload))return cached.read;
  const position = decodeBoard(x.board, d), list = history(x.undo);
  if (!position || !list || x.edits < list.length) return null;
  let earlier = position;
  for (let i = list.length - 1; i >= 0; i--) { const prev = backwards(earlier, d, list[i]); if (!prev) return null; earlier = prev; }
  // Every accepted cold checkpoint proves its complete path from this immutable deal.
  const initial=opening(d);
  if (JSON.stringify(earlier.piles) !== JSON.stringify(initial.piles) || JSON.stringify(earlier.hidden) !== JSON.stringify(initial.hidden)) return null;
  // Replay gives a conservative knowledge history: remembered cards from undone
  // moves may be absent, so they can prevent a match but can never invent one.
  // The current endpoint is exact. Every loop key includes all known flags.
  let forward=initial;const path=[encodeBoard(initial)];
  for(const code of list){const from=code&15,to=code>>4&15,count=code>>8&31;forward=apply(forward,d.mode,[from,to,d.mode!=='freecell'&&from>=12&&to>=12?0:count]);path.push(encodeBoard(forward));}
  path[path.length-1]=encodeBoard(position);
  remember(d,x as TablePayload,position,list,path);return accepted.get(x)!.read;
}
export function moveTable(d: Deal, p: TablePayload, a: Move): TablePayload | null {
  const read = readTable(p, d); if (!read || p.edits === 2147483647) return null;
  const next = apply(read.position, d.mode, a); if (next === read.position) return p;
  const board=encodeBoard(next),loop=pathIndexes.get(read)!.get(board);
  if(loop===undefined&&read.history.length===1024)return null;
  const list=loop===undefined?[...read.history,record(read.position,next,a)]:read.history.slice(0,loop);
  const path=loop===undefined?[...read.path,board]:read.path.slice(0,loop+1);
  return remember(d,{...p,board,undo:encodeUndo(list),edits:p.edits+1},next,list,path);
}
export function undoTable(d: Deal, p: TablePayload): TablePayload | null {
  const read = readTable(p, d); if (!read || !read.history.length || p.edits === 2147483647) return null;
  const next = backwards(read.position, d, read.history.at(-1)!); if (!next) return null;
  const list=read.history.slice(0,-1),board=encodeBoard(next),path=read.path.slice(0,-1);path[path.length-1]=board;
  return remember(d,{...p,board,undo:encodeUndo(list),edits:p.edits+1},next,list,path);
}
