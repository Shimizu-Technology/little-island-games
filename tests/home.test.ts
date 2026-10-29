import { floorPoint, spotFromPoint } from "../src/home/geometry";
import { describe, expect, it } from "vitest";
import { badgeIds, catalog, furnitureIds, itemSpec, starterItems, type ItemId } from "../src/home/catalog";
import {
  anchors,
  homeReducer,
  instance,
  MAX_INSTANCES,
  starterHome,
  validBadges,
  validHome,
  validPlacement,
  type HomeState,
} from "../src/home/model";
import { editHistory, type History } from "../src/home/useHomeStore";
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const ownedItems = [...furnitureIds, "sticker:reef-fish"] as ItemId[];
const empty = (): HomeState => ({ ...starterHome(), instances: [], characters: [] });
describe("Island Home strict versioned save contract", () => {
  it("begins furnished with all eight free items, three friends and a clear door", () => {
    const state = starterHome();
    expect(validHome(state)).toBe(true);
    expect(state.instances.map((i) => i.item).sort()).toEqual([...starterItems].sort());
    expect(state.characters).toHaveLength(3);
    expect(validHome(clone(state))).toBe(true);
  });
  it.each([
    null,
    [],
    {},
    { ...starterHome(), version: 2 },
    { ...starterHome(), scene: "room-2" },
    { ...starterHome(), extra: true },
    { ...starterHome(), theme: { wallpaper: "oops", floor: "honey" } },
  ])("rejects invalid root %j without mutation", (v) => {
    const before = clone(v);
    expect(validHome(v)).toBe(false);
    expect(v).toEqual(before);
  });
  it.each([
    { x: NaN },
    { x: Infinity },
    { y: 1.2 },
    { x: -1 },
    { x: 9 },
    { item: "unknown" },
    { layer: "wall" },
    { state: "broken" },
    { state: "active" },
    { rotation: 45 },
    { rotation: 90 },
    { mirrored: 1 },
    { id: "__bad id" },
    { extra: 1 },
  ])("rejects malformed instance %j", (patch) => {
    const state = empty();
    state.instances = [{ ...instance("a", "plant", 0, 0), ...patch } as never];
    expect(validHome(state)).toBe(false);
  });
  it("rejects duplicate instance IDs, overlapping footprints and unsupported sticker transforms", () => {
    const state = empty();
    state.instances = [instance("a", "bed", 0, 0), instance("b", "plant", 1, 1)];
    expect(validHome(state)).toBe(false);
    state.instances = [instance("a", "plant", 0, 0), instance("a", "plant", 2, 0)];
    expect(validHome(state)).toBe(false);
    state.instances = [{ ...instance("a", "sticker:reef-fish", 0, 0), mirrored: true }];
    expect(validHome(state)).toBe(false);
  });
  it("validates character caps, unique slots, supported anchors and matching poses", () => {
    for (const characters of [
      [{ slot: 0, anchor: "bed", pose: "sit" }],
      [{ slot: 4, anchor: "hello", pose: "stand" }],
      [{ slot: 0, anchor: "oops", pose: "stand" }],
      [{ slot: 0, anchor: "hello", pose: "sit" }],
      [null],
      [...starterHome().characters, starterHome().characters[0]],
    ])
      expect(validHome({ ...empty(), characters })).toBe(false);
    expect(validBadges(badgeIds)).toBe(true);
    expect(validBadges(["math", "math"])).toBe(false);
    expect(validBadges(["unknown"])).toBe(false);
  });
});
describe("deterministic room reducer", () => {
  it("places owned items only; free starter kit is always owned", () => {
    const state = empty();
    const a = homeReducer(state, { type: "place", instance: instance("a", "plant", 0, 0) });
    expect(a.state.instances).toHaveLength(1);
    expect(homeReducer(state, { type: "place", instance: instance("a", "globe", 0, 0) }).state).toBe(state);
    const action = { type: "place" as const, instance: instance("a", "globe", 0, 0) };
    expect(homeReducer(state, action, { ownedItems })).toEqual(homeReducer(clone(state), action, { ownedItems }));
    expect(state).toEqual(empty());
    expect(homeReducer(state, action, { ownedItems }).state.instances).toHaveLength(1);
  });
  it("rejects moves into footprints or doorway, preserving the original layout", () => {
    const state = starterHome();
    for (const [x, y] of [
      [0, 0],
      [8, 3],
      [NaN, 2],
    ])
      expect(homeReducer(state, { type: "move", id: "plant", x, y }).state).toBe(state);
    expect(
      homeReducer(state, { type: "move", id: "plant", x: 7, y: 5 }).state.instances.find((i) => i.id === "plant")?.x
    ).toBe(7);
    expect(homeReducer(state, { type: "move", id: "missing", x: 0, y: 0 }).state).toBe(state);
  });
  it("cycles supported rotation steps, mirrors only supported art, toggles interactive states", () => {
    let state = starterHome();
    state = homeReducer(state, { type: "rotate", id: "bed" }).state;
    expect(state.instances[0].rotation).toBe(180);
    state = homeReducer(state, { type: "rotate", id: "bed" }).state;
    expect(state.instances[0].rotation).toBe(0);
    state = homeReducer(state, { type: "mirror", id: "bed" }).state;
    expect(state.instances[0].mirrored).toBe(true);
    for (const id of furnitureIds.filter((id) => itemSpec(id).interactive)) {
      const s = { ...empty(), instances: [instance("a", id, 0, 0)] };
      const active = homeReducer(s, { type: "toggle", id: "a" }).state;
      expect(active.instances[0].state).toBe("active");
      expect(homeReducer(active, { type: "toggle", id: "a" }).state).toEqual(s);
    }
    const s = { ...empty(), instances: [instance("a", "chime", 0, 0)] };
    expect(homeReducer(s, { type: "mirror", id: "a" }).state).toBe(s);
  });
  it("keeps ownership on put away, and safely stands characters when their final seat is removed", () => {
    let state = homeReducer(starterHome(), { type: "character", slot: 0, anchor: "bed" }).state;
    state = homeReducer(state, { type: "put-away", id: "bed" }).state;
    expect(state.characters[0]).toEqual({ slot: 0, anchor: "hello", pose: "stand" });
    expect(
      homeReducer(state, { type: "place", instance: instance("bed2", "bed", 0, 0) }).state.instances.some(
        (i) => i.id === "bed2"
      )
    ).toBe(true);
    for (const anchor of anchors)
      expect(validHome(homeReducer(starterHome(), { type: "character", slot: 0, anchor }).state)).toBe(true);
  });
  it("reuses owned stickers, checks wall anchors, allows rugs beneath furniture", () => {
    let state = empty();
    for (let n = 0; n < 16; n++)
      state = homeReducer(
        state,
        { type: "place", instance: instance(`s${n}`, "sticker:reef-fish", n % 8, Math.floor(n / 8)) },
        { ownedItems }
      ).state;
    expect(state.instances).toHaveLength(16);
    expect(
      homeReducer(state, { type: "place", instance: instance("extra", "sticker:reef-fish", 0, 0) }, { ownedItems })
        .state
    ).toBe(state);
    expect(validPlacement([instance("rug", "rug", 0, 0)], instance("table", "table", 0, 0))).toBe(true);
  });
  it("caps 32 instances with a helpful message and never silently deletes items", () => {
    let state = empty();
    for (let n = 0; n < 32; n++)
      state = homeReducer(state, {
        type: "place",
        instance: instance(`p${n}`, "plant", n % 8, Math.floor(n / 8)),
      }).state;
    expect(state.instances).toHaveLength(MAX_INSTANCES);
    const movedAtCap = homeReducer(state, { type: "move", id: "p31", x: 7, y: 5 }).state;
    expect(movedAtCap.instances).toHaveLength(MAX_INSTANCES);
    expect(movedAtCap.instances.find((i) => i.id === "p31")?.y).toBe(5);
    expect(validHome(state)).toBe(true);
    const result = homeReducer(state, { type: "place", instance: instance("extra", "plant", 0, 5) });
    expect(result.state).toBe(state);
    expect(result.message).toBe("Put something away to make room.");
    expect(validHome({ ...state, instances: [...state.instances, instance("extra", "plant", 0, 5)] })).toBe(false);
  });
  it("sets only free or earned themes, and reset returns an exact pre-reset snapshot", () => {
    const state = starterHome();
    expect(homeReducer(state, { type: "theme", wallpaper: "night" }).state).toBe(state);
    const next = homeReducer(
      state,
      { type: "theme", wallpaper: "night", floor: "rose" },
      { ownedWallpapers: ["night"], ownedFloors: ["rose"] }
    ).state;
    expect(next.theme).toEqual({ wallpaper: "night", floor: "rose" });
    const reset = homeReducer(next, { type: "reset" });
    expect(reset.snapshot).toBe(next);
    expect(reset.state).toEqual(starterHome());
  });
  it("has original art catalog metadata for 8 starter and 14 earnable objects", () => {
    expect(furnitureIds).toHaveLength(22);
    expect(starterItems).toHaveLength(8);
    for (const id of furnitureIds) expect(catalog[id].name.length).toBeGreaterThan(3);
  });
});
describe("session history stays outside persisted state", () => {
  it("undoes/redoes, snapshots resets, clears redo on a new edit and bounds history", () => {
    const initial: History = { present: starterHome(), past: [], future: [] };
    let h = editHistory(initial, { type: "toggle", id: "lamp" });
    h = editHistory(h, { type: "reset" });
    h = editHistory(h, { type: "undo" });
    expect(h.present.instances.find((i) => i.id === "lamp")?.state).toBe("active");
    h = editHistory(h, { type: "redo" });
    expect(h.present).toEqual(initial.present);
    h = editHistory(h, { type: "undo" });
    h = editHistory(h, { type: "mirror", id: "bed" });
    expect(h.future).toHaveLength(0);
    for (let n = 0; n < 60; n++) h = editHistory(h, { type: "toggle", id: "lamp" });
    expect(h.past).toHaveLength(40);
    expect(validHome(h.present)).toBe(true);
    expect("past" in h.present).toBe(false);
    expect(editHistory(initial, { type: "move", id: "bed", x: 9, y: 0 })).toBe(initial);
    expect(editHistory(initial, { type: "undo" })).toBe(initial);
  });
});

describe("room tap projection", () => {
  it("round-trips every floor and wall spot at phone, tablet and landscape scales", () => {
    for (const scale of [366 / 800, 678 / 800, 228 / 800]) {
      for (let y = 0; y < 6; y++)
        for (let x = 0; x < 10; x++) {
          const p = floorPoint(x, y);
          expect(spotFromPoint(p.x * scale, p.y * scale, scale, false)).toEqual({ x, y });
        }
      for (let y = 0; y < 2; y++)
        for (let x = 0; x < 8; x++)
          expect(spotFromPoint((205 + x * 46) * scale, (224 + y * 39) * scale, scale, true)).toEqual({ x, y });
    }
    expect(spotFromPoint(NaN, 1, 1, false)).toBeUndefined();
    expect(spotFromPoint(1, 1, 0, false)).toBeUndefined();
  });
});
