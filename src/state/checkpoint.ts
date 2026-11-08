import { base64, exactKeys, plain, uint, unbase64, pack, unpack } from './saveBits';
/** Concrete storage primitives. Exact engine replay/terminal validation remains a codec requirement. */
export const checkpointKinds = {
  digits: { cells:81, bits:13, undo:256, deltaBytes:3 },
  paint: { cells:625, bits:2, undo:512, deltaBytes:2 },
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
  return uint(v.count,spec.cells) && v.count > 0 && !!(spec.bits ? unpack(v.data,v.count,spec.bits) : unbase64(v.data,v.count * 4)) && uint(v.undoCount,spec.undo) && !!unbase64(v.undo,v.undoCount * spec.deltaBytes) && Array.isArray(v.audit) && v.audit.length <= 128 && v.audit.every(n => uint(n,65535));
}
export function newCheckpoint(kind: CheckpointKind, count = checkpointKinds[kind].cells): Checkpoint {
  const spec = checkpointKinds[kind];
  if (!uint(count,spec.cells) || !count) throw new Error('Invalid board size.');
  return { version:1,kind,count,data:spec.bits ? pack(Array<number>(count).fill(0),spec.bits) : base64(Array<number>(count*4).fill(0)),undo:'',undoCount:0,audit:[] };
}
/** Delta supplied by exact adapter (cell index + previous value, or table/piece move). */
export function checkpointEdit(before: Checkpoint, data: string, delta: readonly number[]): Checkpoint {
  const spec = checkpointKinds[before.kind];
  if (!validCheckpoint(before) || delta.length !== spec.deltaBytes || delta.some(n => !uint(n,255))) throw new Error('Invalid checkpoint edit.');
  const bytes = [...unbase64(before.undo,before.undoCount * spec.deltaBytes)!,...delta].slice(-spec.undo * spec.deltaBytes);
  const next = { ...before,data,undo:base64(bytes),undoCount:bytes.length/spec.deltaBytes };
  if (!validCheckpoint(next)) throw new Error('Invalid canonical draft.');
  return next;
}
/** Never drop Check/help/hint/reset. A full audit requires explicit preserved new attempt. */
export function checkpointAudit(before: Checkpoint, event: number): Checkpoint {
  if (!validCheckpoint(before) || !uint(event,65535) || before.audit.length === 128) throw new Error('Preserve this attempt before starting a new one.');
  return { ...before,audit:[...before.audit,event] };
}
