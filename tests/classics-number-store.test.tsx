import React, { createContext, useLayoutEffect } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { StoreProvider, useStore } from "../src/state/Store";
import { emptySave, parseSave } from "../src/state/validation";
import { addLearner, familyLearners, selectLearner } from "../src/learn/learners";
import { createNumbers, rollNumbers, numberChoices, numberTarget, selectNumber, closeNumbers, numbersStatus, remainingTotal, type NumbersState } from "../src/games/numbers";
import { defaultOptions } from "../src/games/types";
const db = vi.hoisted(() => ({ raw: null as string | null }));
vi.mock("../src/state/storage", () => ({ storage: { get: async () => db.raw, set: async (s: string) => { db.raw = s; }, preserve: async () => {} } }));
vi.mock("react-native", () => ({ AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock("../src/components/Audio", () => ({ AudioPreferences: createContext({}) }));
let store!: ReturnType<typeof useStore>, root: ReactTestRenderer | undefined;
function Probe() { const s = useStore(); useLayoutEffect(() => { store = s; }, [s]); return null; }
async function mount() { await act(async () => { root = create(<StoreProvider><Probe/></StoreProvider>); }); expect(store.recovery).toBeNull(); }
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; vi.unstubAllGlobals(); });
function finish(s: NumbersState) {
  for (let i = 0; i < 100 && numbersStatus(s) === "playing"; i++) {
    s = rollNumbers(s); const choice = numberChoices(s.available, numberTarget(s))[0];
    if (choice) { for (const n of choice) s = selectNumber(s, n); s = closeNumbers(s); }
  }
  expect(numbersStatus(s)).not.toBe("playing"); return s;
}
it("Store persists finished bests, replays without loss, and rejects stale learner writes", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  db.raw = JSON.stringify({ ...emptySave(), learning: selectLearner(addLearner(addLearner(familyLearners(), "A", "a"), "B", "b"), "a") });
  await mount();
  const before = { ...createNumbers({ ...defaultOptions, difficulty: "medium" }), id: "a-numbers", seed: 42 }, done = finish(before);
  await act(async () => store.update("numbers", before));
  await act(async () => store.update("numbers", done, before));
  const best = remainingTotal(done);
  expect(store.save.numberRecords?.bestRemaining[9]).toBe(best);
  const replay = { ...createNumbers(before.options), id: "a-replay" };
  await act(async () => store.update("numbers", replay, done));
  const stale = store.update;
  await act(async () => store.selectLearner("b"));
  expect(store.save.numberRecords).toBeUndefined();
  await act(async () => stale("numbers", done, replay));
  expect(store.save.sessions.numbers).toBeUndefined();
  expect(store.save.numberRecords).toBeUndefined();
  await act(async () => store.selectLearner("a"));
  expect(store.save.numberRecords?.bestRemaining[9]).toBe(best);
  expect(store.save.sessions.numbers?.id).toBe("a-replay");
  await act(async () => root!.unmount()); root = undefined;
  await mount();
  expect(store.save.numberRecords?.bestRemaining[9]).toBe(best);
  const decoded = parseSave(db.raw!);
  expect(decoded.profiles?.people.a.numberRecords?.bestRemaining[9]).toBe(best);
  expect(decoded.profiles?.people.b.numberRecords).toBeUndefined();
});
