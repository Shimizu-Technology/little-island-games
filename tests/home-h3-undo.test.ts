import { describe, expect, it } from "vitest";
import { homeReducer, instance, migrateHome, starterHome, validHome, type HomeAction, type HomeStateV2 } from "../src/home/model";
import { editHistory, type History } from "../src/home/useHomeStore";
import {
  HOME_UNDO_BYTES,
  HOME_UNDO_STEPS,
  applyUndoStep,
  undoAdmits,
  undoEntry,
  undoBytes,
  undoPast,
  undoStep,
  validUndoShape,
} from "../src/home/undoHistory";
import { savedHistory, restoredHistory } from "../src/home/useHomeStore";
import { furnitureIds } from "../src/home/catalog";

const canon = (v: unknown): unknown => Array.isArray(v) ? v.map(canon) : v && typeof v === "object"
  ? Object.fromEntries(Object.keys(v).sort().filter((k) => (v as any)[k] !== undefined && k !== "undo").map((k) => [k, canon((v as any)[k])])) : v;
const plain = (s: HomeStateV2) => canon(s);
/** A refused-in-place edit can leave two equal states in a row; the save keeps one of them. */
const distinct = (states: HomeStateV2[]) => states.filter((s, i) => i === 0 || JSON.stringify(plain({ ...s, current: "home" })) !== JSON.stringify(plain({ ...states[i - 1], current: "home" })));
function edits(): HomeAction[] {
  const actions: HomeAction[] = [];
  for (let n = 0; n < 90; n++) {
    const roomId = (["home", "kitchen", "treehouse", "beach"] as const)[n % 4];
    if (n % 5 === 0) actions.push({ type: "theme", wallpaper: (["cream", "lagoon", "peach"] as const)[n % 3], roomId } as HomeAction);
    else if (n % 5 === 1) actions.push({ type: "character", slot: (n % 3) as 0 | 1 | 2, anchor: "floor", x: 4 + (n % 9), y: 6, roomId } as HomeAction);
    else actions.push({ type: "place", instance: instance(`undo-${n}`, furnitureIds[n % furnitureIds.length], 2 + (n % 12), 4 + (n % 3)), roomId } as HomeAction);
  }
  return actions;
}
function play(): History {
  let history: History = { present: starterHome(), past: [], future: [] };
  for (const action of edits()) history = editHistory(history, action);
  return history;
}

describe("HM-18 saved undo history", () => {
  it("patches reproduce the exact earlier state, including array order", () => {
    const history = play();
    expect(history.past.length).toBeGreaterThan(HOME_UNDO_STEPS);
    const states = [...history.past, history.present];
    for (let i = 1; i < states.length; i++) {
      const step = undoStep(states[i - 1], states[i]);
      expect(plain(applyUndoStep(states[i], step))).toEqual(plain({ ...states[i - 1], current: states[i].current }));
    }
  });
  it("keeps only the newest 20 steps within the byte bound, newest first to survive", () => {
    const history = play();
    const saved = savedHistory(history);
    expect(saved.undo).toBeDefined();
    expect(saved.undo!.steps.length).toBeLessThanOrEqual(HOME_UNDO_STEPS);
    expect(undoBytes(saved.undo!)).toBeLessThanOrEqual(HOME_UNDO_BYTES);
    expect(validHome(saved)).toBe(true);
    const rebuilt = undoPast(history.present, saved.undo!);
    const chain = distinct([...history.past.slice(-HOME_UNDO_STEPS), history.present]);
    const kept = chain.slice(-rebuilt.length - 1, -1);
    rebuilt.forEach((state, i) => expect(plain(state)).toEqual(plain({ ...kept[i], current: history.present.current })));
  });
  it("survives a relaunch: undo after restore returns the removed thing (rule 57)", () => {
    let history: History = { present: starterHome(), past: [], future: [] };
    const plant = history.present.rooms.home.instances.find((i) => i.item === "plant")!;
    history = editHistory(history, { type: "put-away", id: plant.id, roomId: "home" } as HomeAction);
    expect(history.present.rooms.home.instances.some((i) => i.id === plant.id && !i.staged)).toBe(false);
    const saved = JSON.parse(JSON.stringify(savedHistory(history)));
    const reopened = restoredHistory(saved);
    expect(reopened.past.length).toBe(1);
    const undone = editHistory(reopened, { type: "undo" });
    expect(plain(undone.present)).toEqual(plain(starterHome()));
  });
  it("validates structure and every rebuilt state; never mutates the input", () => {
    const saved = savedHistory(play());
    const frozen = JSON.stringify(saved);
    expect(migrateHome(saved)).toBe(saved);
    expect(JSON.stringify(saved)).toBe(frozen);
    const broken = JSON.parse(frozen);
    broken.undo.steps[0] = { home: { room: { instances: "nope", characters: [], theme: saved.rooms.home.theme } } };
    expect(validHome(broken)).toBe(false);
    const forged = JSON.parse(frozen);
    forged.undo.steps.push({ kitchen: { theme: { wallpaper: "not-a-theme", floor: "sand" } } });
    expect(validHome(forged)).toBe(false);
    expect(validUndoShape({ version: 1, steps: [] })).toBe(false);
    expect(validUndoShape({ version: 2, steps: [{ home: { room: {} } }] })).toBe(false);
    const older = { ...saved, version: 3 };
    expect(validHome(older)).toBe(false);
  });
  it("an over-large single step is refused, never saved half-way (R1)", () => {
    const huge = { home: { room: { instances: Array.from({ length: 200 }, (_, n) => instance(`x${n}`, "plant", 0, 0)), characters: [], theme: starterHome().rooms.home.theme } } };
    const entry = undoEntry(huge as never, starterHome());
    expect(entry.removal).toBe(true);
    expect(undoAdmits([entry])).toBe(false);
    expect(undoAdmits([{ ...entry, removal: false }])).toBe(false);
  });
  it("redo is not saved, and navigation is not an undo step", () => {
    let history = play();
    history = editHistory(history, { type: "undo" });
    const before = savedHistory(history).undo!.steps.length;
    history = editHistory(history, { type: "room", room: "beach", roomId: "home" } as HomeAction);
    expect(savedHistory(history).undo!.steps.length).toBe(before);
    expect(savedHistory(history).current).toBe("beach");
  });
  it("five learners' worst-case undo fits the measured whole-save headroom", async () => {
    const { readFileSync } = await import("node:fs");
    const size = JSON.parse(readFileSync("docs/evidence/f1-save/SIZE.json", "utf8")) as { remainingBytes: number };
    expect(5 * (HOME_UNDO_BYTES + 32)).toBeLessThan(size.remainingBytes);
  });
  it("a reducer edit that is refused leaves the saved history alone", () => {
    const history = play();
    const refused = editHistory(history, { type: "move", id: "missing", x: 0, y: 0, roomId: "home" } as HomeAction);
    expect(refused).toBe(history);
    expect(homeReducer(history.present, { type: "toggle", id: "missing", roomId: "home" } as HomeAction).state).toBe(history.present);
  });
});
