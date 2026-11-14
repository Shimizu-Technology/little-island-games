import { describe, expect, it } from "vitest";
import { createNumbers, type NumbersState } from "../src/games/numbers";
import { defaultOptions } from "../src/games/types";
import { recordNumberRound, validNumberRecords, migrateNumberRecords } from "../src/state/numberRecords";
import { emptySave, parseSave } from "../src/state/validation";
import { assignEarlier, encodeSave, migrateProfiles, projectProfile, syncProfile } from "../src/state/profiles";
import { addLearner } from "../src/learn/learners";

const round = (id: string, maxNumber: 6 | 9 | 12, available: number[], dice: number[]): NumbersState => ({
  ...createNumbers({ ...defaultOptions, difficulty: maxNumber === 6 ? "easy" : maxNumber === 9 ? "medium" : "hard" }),
  id, maxNumber, available, dice,
});
describe("Number Island learner records", () => {
  it("records finished totals by board size, preserves zero and never worsens", () => {
    const before = round("a", 9, [9], []), after = { ...before, dice: [1, 1] };
    const records = recordNumberRound(before, after);
    expect(records).toEqual({ version: 1, bestRemaining: { 9: 9 } });
    expect(recordNumberRound(undefined, after, records)).toBe(records);
    const hard = round("b", 12, [12], []);
    const both = recordNumberRound(hard, { ...hard, dice: [1, 1] }, records);
    expect(both?.bestRemaining).toEqual({ 9: 9, 12: 12 });
    const win = recordNumberRound(before, { ...before, available: [] }, both);
    expect(win?.bestRemaining[9]).toBe(0);
    expect(recordNumberRound(before, after, win)).toBe(win);
  });
  it("rejects malformed and future records", () => {
    for (const value of [{ version: 2, bestRemaining: {} }, { version: 1, bestRemaining: { 7: 1 } }, { version: 1, bestRemaining: { 9: 46 } }, { version: 1, bestRemaining: { 12: -1 } }, { version: 1, bestRemaining: {}, extra: 1 }]) expect(validNumberRecords(value)).toBe(false);
    expect(validNumberRecords({ version: 1, bestRemaining: { 6: 0, 9: 45, 12: 78 } })).toBe(true);
  });
  it("migrates only known owners, without input mutation, and round-trips independently", () => {
    let save = migrateProfiles(emptySave());
    const learning = addLearner(save.learning!, "Child A", "child-a");
    save = projectProfile({ ...syncProfile(save), profiles: { ...save.profiles!, people: { ...save.profiles!.people, [learning.active]: { sessions: {}, recent: null, challenge: save.profiles!.people.family.challenge } } } }, learning);
    const s = round("owned", 9, [9], [1, 1]);
    save = { ...save, sessions: { numbers: { ...s, bestRemaining: 9 } } };
    const input = JSON.stringify(save), migrated = migrateNumberRecords(syncProfile(save));
    expect(JSON.stringify(save)).toBe(input);
    expect(migrated.profiles?.people[learning.active].numberRecords?.bestRemaining[9]).toBe(9);
    expect(migrated.profiles?.people.family.numberRecords).toBeUndefined();
    expect(migrateNumberRecords(migrated)).toEqual(migrated);
    const loaded = parseSave(encodeSave(migrated));
    expect(loaded.numberRecords?.bestRemaining[9]).toBe(9);
    expect(projectProfile(loaded, { ...learning, active: "family" }).numberRecords).toBeUndefined();
    const unowned = migrateProfiles({ ...emptySave(), sessions: { numbers: s } });
    expect(unowned.numberRecords).toBeUndefined();
    expect(unowned.profiles?.unassigned.rounds.sessions.numbers).toEqual(s);
  });
});

it("assigns a finished earlier round with an immediate record and accepts missing optional records", () => {
  const s = round("earlier", 9, [9], [1, 1]);
  const old = migrateProfiles({ ...emptySave(), sessions: { numbers: s } });
  const original = JSON.stringify(old);
  expect(parseSave(encodeSave(old)).profiles?.people.family.numberRecords).toBeUndefined();
  const assigned = assignEarlier(old, "sessions:numbers", "family");
  expect(assigned.numberRecords?.bestRemaining[9]).toBe(9);
  expect(JSON.stringify(old)).toBe(original);
});
