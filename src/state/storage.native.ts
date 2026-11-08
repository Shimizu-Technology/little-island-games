import { parseDraft, draftKey } from './challengeDrafts';
import { openDatabaseAsync } from "expo-sqlite";
import type { StorageAdapter } from "./storage";
import { recoveryKey } from "./recoveryKey";
import { recoveryEntries } from "./recoveryHistory";
const database = (async () => {
  const db = await openDatabaseAsync("little-island.db");
  await db.execAsync(
    "PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);"
  );
  return db;
})();
export const storage: StorageAdapter = {
  readDrafts: async () => (await (await database).getAllAsync<{value:string}>("SELECT value FROM app_data WHERE key LIKE ?", 'draft:%')).map(row => row.value),
  writeDraft: async (raw) => {
    const row = parseDraft(raw), db = await database;
    await db.withExclusiveTransactionAsync(async tx => {
      const head = await tx.getFirstAsync<{value:string}>("SELECT value FROM app_data WHERE key = ?", 'draft-head');
      if (head?.value !== row.base) throw new Error('This draft belongs to an earlier save.');
      const previous = await tx.getFirstAsync<{value:string}>("SELECT value FROM app_data WHERE key = ?",draftKey(row));
      if (previous?.value === raw) return;
      if (previous) { const old = parseDraft(previous.value); if (old.session.id !== row.session.id || old.session.ordinal !== row.session.ordinal || old.session.revision >= row.session.revision) throw new Error('This draft has been replaced.'); }
      await tx.runAsync("INSERT OR REPLACE INTO app_data (key,value) VALUES (?,?)", draftKey(row), raw);
    });
  },
  get: async () => {
    const db = await database;
    return (
      (await db.getFirstAsync<{ value: string }>("SELECT value FROM app_data WHERE key = ?", "save"))?.value ?? null
    );
  },
  set: async (value) => {
    const db = await database;
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync("INSERT OR REPLACE INTO app_data (key,value) VALUES (?,?)", "save", value);
      await tx.runAsync("INSERT OR REPLACE INTO app_data (key,value) VALUES (?,?)", "draft-head", JSON.parse(value).saveRevision ?? '');
      const rows = await tx.getAllAsync<{value:string}>("SELECT value FROM app_data WHERE key LIKE ?", 'draft:%');
      for (const row of rows) await tx.runAsync("INSERT INTO app_data (key,value) VALUES (?,?)",recoveryKey(),row.value);
      await tx.runAsync("DELETE FROM app_data WHERE key LIKE ?", 'draft:%');
    });
  },
  preserve: async (value) => {
    const db = await database;
    await db.runAsync("INSERT INTO app_data (key,value) VALUES (?,?)", recoveryKey(), value);
  },
  listRecovery: async () => {
    const db = await database;
    const rows = await db.getAllAsync<{ key: string }>("SELECT key FROM app_data WHERE key LIKE ?", "recovery-%");
    return recoveryEntries(rows.map((row) => row.key));
  },
  readRecovery: async (key) => {
    if (!key.startsWith("recovery-")) return null;
    const db = await database;
    return (await db.getFirstAsync<{ value: string }>("SELECT value FROM app_data WHERE key = ?", key))?.value ?? null;
  },
};
