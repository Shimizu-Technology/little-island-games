// Metro selects storage.native.ts on native platforms and storage.web.ts on web.
export type StorageAdapter = {
  get: () => Promise<string | null>;
  set: (value: string) => Promise<void>;
  preserve: (value: string) => Promise<void>;
};
export const storage: StorageAdapter = { get: async () => null, set: async () => {}, preserve: async () => {} };
