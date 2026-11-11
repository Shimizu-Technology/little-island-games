// Metro selects storage.native.ts on native platforms and storage.web.ts on web.
import type { RecoveryEntry } from "./recoveryHistory";
export type EnvelopeWrite = { revision: string; folded: readonly { owner:string; game:string; id:string; ordinal:number; revision:number }[];
  /** When present, replaces the set-aside notices row in the same write as the save (null clears it). */
  notices?: string | null };
export type StorageAdapter = {
  quarantineDraft?: (raw: string) => Promise<void>;
  /** Small local ring of launch problems for a grown-up or developer to read later. Never sent anywhere. */
  logLaunch?: (entry: string) => Promise<void>;
  discardSession?: (raw: string) => Promise<void>;
  /** Set-aside notices a learner or Cove person hasn't put away yet. */
  readNotices?: () => Promise<string | null>;
  writeNotices?: (raw: string | null) => Promise<void>;
  /** Small rows are checked against the committed envelope revision. */
  readDrafts?: () => Promise<string[]>;
  writeDraft?: (row: string) => Promise<void>;
  get: () => Promise<string | null>;
  set: (value: string, metadata?: EnvelopeWrite) => Promise<void>;
  preserve: (value: string) => Promise<void>;
  listRecovery: () => Promise<RecoveryEntry[]>;
  readRecovery: (key: string) => Promise<string | null>;
};
export const storage: StorageAdapter = {
  get: async () => null, set: async () => {}, preserve: async () => {},
  listRecovery: async () => [], readRecovery: async () => null,
};
