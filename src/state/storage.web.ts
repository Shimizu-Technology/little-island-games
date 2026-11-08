import { parseDraft, draftKey } from './challengeDrafts';
import type { StorageAdapter } from "./storage";
import { recoveryKey } from "./recoveryKey";
import { recoveryEntries } from "./recoveryHistory";
export const storage: StorageAdapter = {
  readDrafts: async () => {
    const rows: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('little-island.draft:')) { const raw = localStorage.getItem(key); if (raw !== null) rows.push(raw); }
    }
    return rows;
  },
  writeDraft: async raw => {
    const row = parseDraft(raw);
    if (localStorage.getItem('little-island.draft-head') !== row.base) throw new Error('This draft belongs to an earlier save.');
    const key = `little-island.${draftKey(row)}`, previous = localStorage.getItem(key);
    if (previous === raw) return;
    if (previous) { const old = parseDraft(previous); if (old.session.id !== row.session.id || old.session.ordinal !== row.session.ordinal || old.session.revision >= row.session.revision) throw new Error('This draft has been replaced.'); }
    localStorage.setItem(key,raw);
  },
  get: async () => {
    const raw = localStorage.getItem("little-island.save");
    // Heal the non-authoritative cache after a crash between the envelope commit and cache update.
    if (raw) { try { localStorage.setItem('little-island.draft-head',JSON.parse(raw).saveRevision ?? ''); } catch { /* Parser/recovery owns invalid data. */ } }
    return raw;
  },
  set: async (value) => {
    const revision = JSON.parse(value).saveRevision ?? '';
    const draftKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key?.startsWith('little-island.draft:')) draftKeys.push(key); }
    // Preservation can fail on quota. In that case the authoritative envelope is untouched.
    for (const key of draftKeys) { const row = localStorage.getItem(key); if (row !== null) localStorage.setItem(`little-island.${recoveryKey()}`,row); }
    // Stage the cache first. If the envelope write fails, roll it back; old rows remain untouched.
    const previous = localStorage.getItem('little-island.draft-head');
    localStorage.setItem('little-island.draft-head',revision);
    try { localStorage.setItem("little-island.save", value); }
    catch (error) { if (previous === null) localStorage.removeItem('little-island.draft-head'); else localStorage.setItem('little-island.draft-head',previous); throw error; }
    for (const key of draftKeys) localStorage.removeItem(key);
    // A crash before this cleanup leaves obsolete rows, already preserved and never applied to a new base.
  },
  preserve: async (value) => {
    localStorage.setItem(`little-island.${recoveryKey()}`, value);
  },
  listRecovery: async () => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("little-island.recovery-")) keys.push(key.slice("little-island.".length));
    }
    return recoveryEntries(keys);
  },
  readRecovery: async (key) => key.startsWith("recovery-") ? localStorage.getItem(`little-island.${key}`) : null,
};
