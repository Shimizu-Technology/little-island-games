import type { StorageAdapter } from "./storage";
import { recoveryKey } from "./recoveryKey";
export const storage: StorageAdapter = {
  get: async () => localStorage.getItem("little-island.save"),
  set: async (value) => {
    localStorage.setItem("little-island.save", value);
  },
  preserve: async (value) => {
    localStorage.setItem(`little-island.${recoveryKey()}`, value);
  },
};
