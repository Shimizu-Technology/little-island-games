/** One scheduled worker per game/base. A newer complete draft subsumes every earlier move. */
export class DraftQueue {
  private pending = new Map<string, { raw: string; waiters: ((ok: boolean) => void)[] }>();
  enqueue(key: string, raw: string, handlers: {schedule:(work:()=>Promise<void>)=>void;write:(raw:string)=>Promise<void>;failed:()=>void}): Promise<boolean> {
    return new Promise(resolve => {
      const existing = this.pending.get(key);
      if (existing) { existing.raw = raw; existing.waiters.push(resolve); return; }
      const entry = { raw, waiters: [resolve] };
      this.pending.set(key, entry);
      handlers.schedule(async () => {
        let ok = true;
        try {
          // Keep the entry present during I/O so a burst updates it without another worker.
          let written: string;
          do { written = entry.raw; await handlers.write(written); } while (written !== entry.raw);
        } catch { ok = false; handlers.failed(); }
        this.pending.delete(key);
        for (const waiter of entry.waiters) waiter(ok);
      });
    });
  }
}
