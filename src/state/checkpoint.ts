import { jsonBytes, base64, exactKeys, plain, uint, unbase64, pack, unpack } from './saveBits';
/** Concrete storage primitives. Exact engine replay/terminal validation remains a codec requirement. */
export const checkpointKinds = {
  digits: { cells:81, bits:13, undo:256, deltaBytes:3 },
  paint: { cells:625, bits:2, undo:512, deltaBytes:0 },
  cells: { cells:225, bits:2, undo:256, deltaBytes:2 },
  letters: { cells:256, bits:6, undo:256, deltaBytes:2 },
  edges: { cells:480, bits:2, undo:256, deltaBytes:2 },
  table: { cells:144, bits:8, undo:1024, deltaBytes:2 },
  pieces: { cells:200, bits:0, undo:256, deltaBytes:5 },
} as const;
export type CheckpointKind = keyof typeof checkpointKinds;
export type Checkpoint = { version:1; kind:CheckpointKind; count:number; data:string; undo:string; undoCount:number; audit:number[] };
export function validCheckpoint(v: unknown): v is Checkpoint {
  if (!plain(v) || !exactKeys(v,['version','kind','count','data','undo','undoCount','audit']) || v.version !== 1 || typeof v.kind !== 'string' || !Object.hasOwn(checkpointKinds,v.kind)) return false;
  const spec = checkpointKinds[v.kind as CheckpointKind];
  return uint(v.count,spec.cells) && v.count > 0 && !!(spec.bits ? unpack(v.data,v.count,spec.bits) : unbase64(v.data,v.count * 4)) && uint(v.undoCount,spec.undo) && !!(v.kind === 'paint' ? paintRecords(v.undo,v.undoCount)?.every(r => (r.axis === 'row' ? r.line*25+r.start+r.length-1 : (r.start+r.length-1)*25+r.line) < (v.count as number)) : unbase64(v.undo,v.undoCount * spec.deltaBytes)) && Array.isArray(v.audit) && v.audit.length <= 128 && v.audit.every(n => uint(n,9999));
}
export function newCheckpoint(kind: CheckpointKind, count = checkpointKinds[kind].cells): Checkpoint {
  const spec = checkpointKinds[kind];
  if (!uint(count,spec.cells) || !count) throw new Error('Invalid board size.');
  return { version:1,kind,count,data:spec.bits ? pack(Array<number>(count).fill(0),spec.bits) : base64(Array<number>(count*4).fill(0)),undo:'',undoCount:0,audit:[] };
}
/** Delta supplied by exact adapter (cell index + previous value, or table/piece move). */
export function checkpointEdit(before: Checkpoint, data: string, delta: readonly number[]): Checkpoint {
  const spec = checkpointKinds[before.kind];
  if (before.kind === 'paint' || !validCheckpoint(before) || delta.length !== spec.deltaBytes || delta.some(n => !uint(n,255))) throw new Error('Invalid checkpoint edit.');
  const bytes = [...unbase64(before.undo,before.undoCount * spec.deltaBytes)!,...delta].slice(-spec.undo * spec.deltaBytes);
  const next = { ...before,data,undo:base64(bytes),undoCount:bytes.length/spec.deltaBytes };
  if (!validCheckpoint(next)) throw new Error('Invalid canonical draft.');
  return next;
}
/** Never drop Check/help/hint/reset. A full audit requires explicit preserved new attempt. */
export function checkpointAudit(before: Checkpoint, event: number): Checkpoint {
  if (!validCheckpoint(before) || !uint(event,9999) || before.audit.length === 128) throw new Error('Preserve this attempt before starting a new one.');
  return { ...before,audit:[...before.audit,event] };
}

export const PAINT_UNDO_BYTES = 1960;
type PaintRecord = { axis:'row'|'column'; line:number; start:number; length:number; previous:number[]; bytes:number[] };
function paintRecords(raw: unknown, count: unknown): PaintRecord[] | null {
  if (typeof raw !== 'string' || !uint(count,512)) return null;
  const padding = raw.endsWith('==') ? 2 : raw.endsWith('=') ? 1 : 0;
  const bytes = unbase64(raw,raw.length / 4 * 3 - padding);
  if (!bytes || bytes.length > PAINT_UNDO_BYTES) return null;
  const records:PaintRecord[]=[];
  for (let at=0;at<bytes.length;) {
    const begin=at, header=bytes[at++] | bytes[at++] << 8;
    if (at > bytes.length || header >= 32500) return null;
    const uniform=header % 2, position=Math.floor(header/2), axis=position >= 8125 ? 'column' : 'row';
    const line=Math.floor(position/325)%25;
    let interval=position%325,start=0;
    while (interval >= 25-start) interval -= 25-start++;
    const length=interval+1, size=uniform ? 1 : Math.ceil(length/4);
    if (at+size > bytes.length) return null;
    const encoded=bytes.slice(at,at+size);at+=size;
    const previous=uniform ? Array<number>(length).fill(encoded[0]) : unpack(base64(encoded),length,2);
    if (!previous || previous.some(n=>n>3) || !uniform && previous.every(n=>n===previous[0])) return null;
    records.push({axis,line,start,length,previous,bytes:bytes.slice(begin,at)});
  }
  return records.length === count ? records : null;
}
/** Axis-locked strokes of at most one 25-cell line, including exact previous values. */
export function checkpointPaint(before: Checkpoint, axis:'row'|'column', line:number, start:number, length:number, value:number): Checkpoint {
  if (!validCheckpoint(before) || before.kind !== 'paint' || !['row','column'].includes(axis) || !uint(line,24) || !uint(start,24) || !uint(length,25-start) || !length || !uint(value,3)) throw new Error('Invalid axis-locked stroke.');
  const cells=unpack(before.data,before.count,2)!;
  const indices=Array.from({length},(_,i)=>axis === 'row' ? line*25+start+i : (start+i)*25+line);
  if (indices.some(i=>i>=before.count)) throw new Error('Stroke outside board.');
  const previous=indices.map(i=>cells[i]),uniform=previous.every(n=>n===previous[0]);
  const interval=start*25-start*(start-1)/2+length-1;
  const header=(((axis === 'column' ? 25 : 0)+line)*325+interval)*2+Number(uniform);
  const record=[header&255,header>>>8,...(uniform ? [previous[0]] : unbase64(pack(previous,2),Math.ceil(length/4))!)];
  const records=[...paintRecords(before.undo,before.undoCount)!.map(r=>r.bytes),record];
  let bytes=records.reduce((n,r)=>n+r.length,0);
  while (bytes > PAINT_UNDO_BYTES || records.length > 512) bytes-=records.shift()!.length;
  indices.forEach(i=>{cells[i]=value;});
  return {...before,data:pack(cells,2),undo:base64(records.flat()),undoCount:records.length};
}
export function checkpointPaintUndo(before: Checkpoint): Checkpoint {
  if (!validCheckpoint(before) || before.kind !== 'paint') throw new Error('Invalid paint draft.');
  const records=paintRecords(before.undo,before.undoCount)!,last=records.pop();
  if (!last) return before;
  const cells=unpack(before.data,before.count,2)!;
  last.previous.forEach((n,i)=>{cells[last.axis === 'row' ? last.line*25+last.start+i : (last.start+i)*25+last.line]=n;});
  return {...before,data:pack(cells,2),undo:base64(records.flatMap(r=>r.bytes)),undoCount:records.length};
}

/** Worst encoding sizes, including base64 quotes, full audit and maximum undoCount digits. */
export function checkpointBudget(kind: CheckpointKind, wrapper: number): import('./challenge').SessionBudget {
  const spec=checkpointKinds[kind], draft={...newCheckpoint(kind),undoCount:spec.undo};
  const bytes=kind==='paint'?PAINT_UNDO_BYTES:spec.undo*spec.deltaBytes;
  return {wrapper,draft:jsonBytes(draft)-4,undo:2+4*Math.ceil(bytes/3),audit:jsonBytes(Array<number>(128).fill(9999))};
}
