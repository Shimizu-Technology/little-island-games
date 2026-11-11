import { storage, type StorageAdapter } from './storage';

/** A write that a newer load, restore or Store took over from. It never reached storage. */
export class SupersededWrite extends Error {
  constructor() { super('A newer save action took over, so this write was not made.'); this.name = 'SupersededWrite'; }
}

// Writes that change what the next launch reads. Shared by every Store instance, so a retried load,
// a restore, or a Store remounted by the root error boundary can wait for writes an earlier one began.
const changing = new Set<Promise<unknown>>();
/** Settles once every changing write started so far has finished, whether it succeeded or not. */
export const changingWritesSettled = async () => { await Promise.allSettled([...changing]); };

function guard<A extends unknown[]>(allowed: () => boolean, write: (...args: A) => Promise<void>, tracked: boolean) {
  return (...args: A): Promise<void> => {
    // Checked right before the call: a superseded owner never starts another write.
    if (!allowed()) return Promise.reject(new SupersededWrite());
    let pending: Promise<void>;
    try { pending = write(...args); } catch (error) { pending = Promise.reject(error); }
    if (tracked) { changing.add(pending); void pending.catch(() => {}).finally(() => changing.delete(pending)); }
    return pending;
  };
}

/**
 * The storage adapter as seen by one owner (a load attempt or a mounted Store). Reads pass through.
 * Once `allowed` turns false, every write is refused. Preserved copies are append-only, so only the
 * writes that replace the active save, drafts or notices are tracked for others to wait on.
 * Methods are looked up at call time, so the shared adapter stays the single source.
 */
export function fencedStorage(allowed: () => boolean): StorageAdapter {
  const s = storage;
  // Callers probe optional methods (`listRecovery?.()`), so a method exists here only if it exists there.
  return {
    get: () => s.get(),
    ...(s.listRecovery && { listRecovery: () => s.listRecovery() }),
    ...(s.readRecovery && { readRecovery: (key: string) => s.readRecovery(key) }),
    set: guard(allowed, (value: string, metadata?: Parameters<StorageAdapter['set']>[1]) => s.set(value, metadata), true),
    preserve: guard(allowed, (value: string) => s.preserve(value), false),
    ...(s.readDrafts && { readDrafts: () => s.readDrafts!() }),
    ...(s.readNotices && { readNotices: () => s.readNotices!() }),
    ...(s.logLaunch && { logLaunch: (entry: string) => s.logLaunch!(entry) }),
    ...(s.writeDraft && { writeDraft: guard(allowed, (row: string) => s.writeDraft!(row), true) }),
    ...(s.quarantineDraft && { quarantineDraft: guard(allowed, (raw: string) => s.quarantineDraft!(raw), true) }),
    ...(s.writeNotices && { writeNotices: guard(allowed, (raw: string | null) => s.writeNotices!(raw), true) }),
    ...(s.discardSession && { discardSession: guard(allowed, (raw: string) => s.discardSession!(raw), false) }),
  } as StorageAdapter;
}
