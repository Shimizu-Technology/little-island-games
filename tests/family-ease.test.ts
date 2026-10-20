import { afterEach, expect, it, vi } from "vitest";
import { emptySave, parseSave } from "../src/state/validation";
import { recoveryEntries } from "../src/state/recoveryHistory";
import { storage } from "../src/state/storage.web";
import { preserveAndReplace } from "../src/state/replacement";

afterEach(() => vi.unstubAllGlobals());
it("accepts old saves and transfers only unique known game favorites", () => {
  const save = emptySave();
  expect(parseSave(JSON.stringify(save)).favoriteGames).toBeUndefined();
  expect(parseSave(JSON.stringify({ ...save, favoriteGames: ["memory", "racer"] })).favoriteGames).toEqual(["memory", "racer"]);
  for (const favoriteGames of [["memory", "memory"], ["unknown"], "memory", [null]]) {
    expect(() => parseSave(JSON.stringify({ ...save, favoriteGames }))).toThrow("invalid");
  }
});
it("orders preservation dates numerically and keeps earlier unknown-date originals", () => {
  expect(recoveryEntries(["save", "recovery-old", "recovery-1792500000000-b", "recovery-1792400000000-a"]).map((entry) => entry.key))
    .toEqual(["recovery-1792500000000-b", "recovery-1792400000000-a", "recovery-old"]);
});
it("can recover a replaced valid save and retain both versions and an invalid original", async () => {
  const rows = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    get length() { return rows.size; }, key: (index: number) => [...rows.keys()][index] ?? null,
    getItem: (key: string) => rows.get(key) ?? null,
    setItem: (key: string, value: string) => { rows.set(key, value); },
  });
  const a = JSON.stringify({ ...emptySave(), favoriteGames: ["memory"] });
  const b = JSON.stringify({ ...emptySave(), favoriteGames: ["racer"] });
  await storage.set(a);
  await storage.preserve("{invalid original");
  await preserveAndReplace(storage, b, a);
  const copies = await storage.listRecovery();
  const raws = await Promise.all(copies.map((entry) => storage.readRecovery(entry.key)));
  expect(raws).toContain(a);
  expect(raws).toContain("{invalid original");
  expect(await storage.readRecovery("save")).toBeNull();
  await preserveAndReplace(storage, a, b);
  expect(await storage.get()).toBe(a);
  const all = await Promise.all((await storage.listRecovery()).map((entry) => storage.readRecovery(entry.key)));
  expect(all).toContain(b);
  expect(all).toContain("{invalid original");
});
