import { parseDraft, draftKey, isFolded } from './challengeDrafts';
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
    // A single guarded statement on the shared connection; no per-move native connection.
    const result = await db.runAsync(`INSERT INTO app_data (key,value)
      SELECT ?,? WHERE EXISTS (SELECT 1 FROM app_data WHERE key = 'draft-head' AND value = ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
      WHERE app_data.value = excluded.value OR (
        json_extract(app_data.value,'$.session.id') = ? AND
        json_extract(app_data.value,'$.session.ordinal') = ? AND
        json_extract(app_data.value,'$.session.revision') < ?
      )`,draftKey(row),raw,row.base,row.session.id,row.session.ordinal,row.session.revision);
    if (!result.changes) throw new Error('This draft belongs to an earlier save or has been replaced.');
  },
  get: async () => {
    const db = await database;
    return (
      (await db.getFirstAsync<{ value: string }>("SELECT value FROM app_data WHERE key = ?", "save"))?.value ?? null
    );
  },
  set: async (value, metadata) => {
    const db = await database;
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync("INSERT OR REPLACE INTO app_data (key,value) VALUES (?,?)", "save", value);
      await tx.runAsync("INSERT OR REPLACE INTO app_data (key,value) VALUES (?,?)", "draft-head", metadata?.revision ?? '');
      const rows = await tx.getAllAsync<{value:string}>("SELECT value FROM app_data WHERE key LIKE ?", 'draft:%');
      for (const row of rows) if (!isFolded(row.value,metadata)) await tx.runAsync("INSERT INTO app_data (key,value) VALUES (?,?)",recoveryKey(),row.value);
      await tx.runAsync("DELETE FROM app_data WHERE key LIKE ?", 'draft:%');
    });
  },
  discardSession: async raw => {
    const db = await database;
    await db.withExclusiveTransactionAsync(async tx => {
      const counter = await tx.getFirstAsync<{value:string}>("SELECT value FROM app_data WHERE key = ?",'discard-cursor');
      const index = Number(counter?.value ?? 0) % 8;
      await tx.runAsync("INSERT OR REPLACE INTO app_data (key,value) VALUES (?,?)",`discarded-session-${index}`,raw);
      await tx.runAsync("INSERT OR REPLACE INTO app_data (key,value) VALUES (?,?)",'discard-cursor',String(index+1));
    });
  },
  quarantineDraft: async raw => {
    const db = await database;
    await db.withExclusiveTransactionAsync(async tx => {
      await tx.runAsync("INSERT INTO app_data (key,value) VALUES (?,?)",recoveryKey(),raw);
      await tx.runAsync("DELETE FROM app_data WHERE key LIKE 'draft:%' AND value = ?",raw);
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
