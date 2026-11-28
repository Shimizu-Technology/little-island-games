import { describe, expect, it } from "vitest";
import { itemIds, itemSpec } from "../src/home/catalog";
import { roomIds } from "../src/home/catalogMore";
import { characterFrame, characterPoint } from "../src/home/geometry";
import { homeCharacterPose } from "../src/home/characterPose";
import { characterForSocket, socketsOf } from "../src/home/interactions";
import { homeReducer, instance, legacyStarterHome, migrateHome, starterHome, validHome } from "../src/home/model";
import { apply, faceRadius, magnetRadius, resolve } from "../src/home/scene/proposal";
import { buildScene, contained, itemEntity, translatedBounds } from "../src/home/scene/graph";
import { identityCamera, roomToScreen, screenToRoom } from "../src/home/scene/camera";
import { idleController, transition } from "../src/home/scene/controller";
import { characterEntityId, housePoint, itemEntityId, roomPoint, screenPoint } from "../src/home/scene/types";
import { editHistory } from "../src/home/useHomeStore";
import audit from "./fixtures/home-v3-audit.json";
import type { HomeStateV2, Instance } from "../src/home/model";
import type { DropProposal } from "../src/home/scene/proposal";

const starter = starterHome();
function legacyRooms(state: HomeStateV2): HomeStateV2 {
  return { ...state, rooms: Object.fromEntries(roomIds.map(id => [id, state.rooms[id]])) as HomeStateV2['rooms'] };
}
function empty(): HomeStateV2 {
  const state = structuredClone(starter);
  for (const room of roomIds) state.rooms[room] = { ...state.rooms[room], instances: [], characters: [] };
  return state;
}
function actors(): HomeStateV2 {
  const state = empty();
  state.rooms.home.characters = [
    { slot: 0, anchor: "floor", pose: "stand", x: 7, y: 8 },
    { slot: 1, anchor: "floor", pose: "stand", x: 12, y: 8 },
  ];
  state.rooms.home.instances = [instance("food", "mango", 3, 8), instance("toy", "teddy", 5, 8)];
  return state;
}
function committed(state: HomeStateV2, proposal: DropProposal): HomeStateV2 {
  const result = apply(state, proposal);
  expect(result, proposal.reason).toHaveProperty("state");
  if (!("state" in result)) throw new Error("Unexpected stale proposal");
  expect(validHome(result.state)).toBe(true);
  return result.state;
}

describe("scene camera and pointer ownership", () => {
  it("uses one invertible affine path with room origins at changing scale", () => {
    for (const scale of [0.2, 0.58, 1, 1.75]) {
      const camera = { a: scale, b: 0.02, c: -0.03, d: scale, tx: -248, ty: 53 };
      const origin = housePoint(800, 700);
      const point = roomPoint(412, 376);
      const result = screenToRoom(roomToScreen(point, camera, origin), camera, origin);
      expect(result.x).toBeCloseTo(point.x, 8);
      expect(result.y).toBeCloseTo(point.y, 8);
    }
    expect(() => screenToRoom(screenPoint(0, 0), { ...identityCamera, a: 0 }, housePoint(0, 0))).toThrow();
  });
  it("retains two separate object owners, ignores stealing and third objects, and preserves grip", () => {
    const camera = { ...identityCamera, a: 0.5, d: 0.5 };
    const origin = housePoint(800, 0);
    let result = transition(
      idleController,
      { type: "down", pointer: 1, entity: "a", contact: roomPoint(100, 400), point: screenPoint(460, 180), now: 0 },
      camera,
      origin
    );
    result = transition(
      result.state,
      { type: "down", pointer: 2, entity: "b", contact: roomPoint(300, 400), point: screenPoint(550, 200), now: 0 },
      camera,
      origin
    );
    const captured = result.state;
    expect(
      transition(captured, { type: "down", pointer: 3, entity: "a", point: screenPoint(0, 0), now: 0 }, camera, origin)
        .state
    ).toBe(captured);
    expect(
      transition(captured, { type: "down", pointer: 3, entity: "c", point: screenPoint(0, 0), now: 0 }, camera, origin)
        .state
    ).toBe(captured);
    result = transition(captured, { type: "move", pointer: 1, point: screenPoint(467, 180) }, camera, origin);
    expect(result.effects).toContainEqual({ type: "drag", entity: "a", anchor: roomPoint(114, 400) });
    const movedCamera = { ...camera, tx: -20 };
    result = transition(result.state, { type: "move", pointer: 1, point: screenPoint(467, 180) }, movedCamera, origin);
    expect(result.effects).toContainEqual({ type: "drag", entity: "a", anchor: roomPoint(154, 400) });
    expect(result.effects.some((e) => e.type === "pinch")).toBe(false);
    expect(transition(result.state, { type: "cancel", pointer: 1, now: 100 }, camera, origin).effects).toEqual([
      { type: "restore", entity: "a" },
    ]);
  });
  it("separates six-point drag from taps, long holds and background-only pinch", () => {
    const down = transition(
      idleController,
      { type: "down", pointer: 1, entity: "a", point: screenPoint(10, 10), now: 0 },
      identityCamera,
      housePoint(0, 0)
    );
    const still = transition(
      down.state,
      { type: "move", pointer: 1, point: screenPoint(16, 10) },
      identityCamera,
      housePoint(0, 0)
    );
    expect(still.state.phase).toBe("pending");
    expect(
      transition(still.state, { type: "up", pointer: 1, now: 100 }, identityCamera, housePoint(0, 0)).effects
    ).toEqual([{ type: "tap", entity: "a" }]);
    expect(
      transition(still.state, { type: "up", pointer: 1, now: 501 }, identityCamera, housePoint(0, 0)).effects
    ).toEqual([]);
    let camera = transition(
      down.state,
      { type: "down", pointer: 2, point: screenPoint(80, 80), now: 0 },
      identityCamera,
      housePoint(0, 0)
    );
    camera = transition(
      camera.state,
      { type: "move", pointer: 2, point: screenPoint(90, 80) },
      identityCamera,
      housePoint(0, 0)
    );
    expect(camera.effects.some((e) => e.type === "pinch")).toBe(false);
    camera = transition(
      camera.state,
      { type: "down", pointer: 3, point: screenPoint(100, 80), now: 0 },
      identityCamera,
      housePoint(0, 0)
    );
    camera = transition(
      camera.state,
      { type: "move", pointer: 3, point: screenPoint(110, 80) },
      identityCamera,
      housePoint(0, 0)
    );
    expect(camera.effects.some((e) => e.type === "pinch")).toBe(true);
  });
});

describe("semantic resolver rules", () => {
  it("converts all four SPEC 29 radii through camera scale", () => {
    expect(magnetRadius("hand", 180, 1)).toBeCloseTo(25.2);
    // The mouth is a face zone now, sized by the head and never smaller than 32 pt on screen.
    expect(faceRadius(50, 1)).toBeCloseTo(55);
    expect(faceRadius(50, 0.5) * 0.5).toBeCloseTo(32);
    expect(magnetRadius("socket", 180, 1)).toBeCloseTo(39.6);
    expect(magnetRadius("container", 180, 1)).toBeCloseTo(18);
    expect(magnetRadius("hand", 180, 0.5) * 0.5).toBe(24);
  });
  it("protects mouth cores, filters occupied/reserved/incompatible targets and ignores people order (H11)", () => {
    const state = actors();
    const index = buildScene(state).rooms.home;
    const food = index.entities[itemEntityId("home", "food")];
    const mouth = index.targets.find((t) => t.kind === "mouth")!;
    const hand = index.targets.find((t) => t.kind === "hand")!;
    hand.contact = roomPoint(mouth.contact.x + 20, mouth.contact.y);
    hand.core = { left: hand.contact.x - 5, top: hand.contact.y - 5, width: 10, height: 10 };
    expect(resolve(index, food, mouth.contact, { scale: 1 }).kind).toBe("mouth");
    const reserved = resolve(index, food, mouth.contact, { scale: 1, reservations: { [mouth.id]: "other" } });
    expect(reserved.target).not.toBe(mouth.id);
    hand.occupied = "other";
    expect(resolve(index, food, hand.contact, { scale: 1 }).target).not.toBe(hand.id);
    expect(resolve(index, index.entities[itemEntityId("home", "toy")], mouth.contact, { scale: 1 }).kind).not.toBe(
      "mouth"
    );
    const before = buildScene(state).rooms.home;
    state.rooms.home.characters.reverse();
    const after = buildScene(state).rooms.home;
    for (let x = 150; x <= 600; x += 10) {
      const anchor = roomPoint(x, 360);
      const a = resolve(before, before.entities[food.id], anchor, { scale: 1 });
      const b = resolve(after, after.entities[food.id], anchor, { scale: 1 });
      expect({ ...a, revision: "" }).toEqual({ ...b, revision: "" });
    }
  });
  it("retains the previous magnet within 1.25 radius and switches immediately on explicit core", () => {
    const state = actors();
    const index = buildScene(state).rooms.home;
    const subject = index.entities[itemEntityId("home", "food")];
    const hands = index.targets.filter((t) => t.kind === "hand");
    const previous = resolve(index, subject, hands[0].contact, { scale: 1 });
    const radius = magnetRadius("hand", 224, 1);
    const near = roomPoint(hands[0].contact.x + radius * 1.2, hands[0].contact.y);
    expect(resolve(index, subject, near, { scale: 1, previous }).target).toBe(hands[0].id);
    expect(resolve(index, subject, hands[1].contact, { scale: 1, previous }).target).toBe(hands[1].id);
  });
  it("stages crowded existing furniture and never returns undefined, including invalid coordinates (H12/H21)", () => {
    const state = empty();
    for (let y = 0; y <= 10; y += 2)
      for (let x = 1; x <= 13; x += 2) state.rooms.home.instances.push(instance(`book-${x}-${y}`, "book", x, y));
    const index = buildScene(state).rooms.home;
    const subject = itemEntity("home", instance("bed", "bed", 0, 0));
    const proposal = resolve(index, subject, roomPoint(400, 460), { scale: 1 });
    expect(proposal.kind).toBe("staging");
    const next = committed(state, proposal);
    expect(next.rooms.home.instances.find((i) => i.id === "bed")?.staged).toBe(true);
    expect(resolve(index, subject, roomPoint(NaN, Infinity), { scale: 1 })).toBeDefined();
    state.rooms.home.instances = [instance("seat", "chair", 8, 4)];
    state.rooms.home.characters = [{ slot: 0, anchor: "floor", pose: "stand", x: 3, y: 8 }];
    const room = buildScene(state).rooms.home;
    const socket = room.sockets.find((t) => !t.pet)!;
    const actor = room.entities["character/0"];
    const far = roomPoint(socket.contact.x, socket.contact.y - 200);
    expect(resolve(room, actor, far, { scale: 1 }).kind).not.toBe("socket");
  });
});

describe("canonical apply, migration and undo", () => {
  it("applies held release to another hand, mouth, surface and floor (H04)", () => {
    for (const kind of ["hand", "mouth", "surface", "floor"] as const) {
      let state = actors();
      state.rooms.home.instances.push(instance("table", "table", 10, 3));
      state = homeReducer(state, { type: "use-item", id: "food", slot: 0 }).state;
      expect(state.rooms.home.characters[0].holding).toBe("food");
      const index = buildScene(state).rooms.home;
      const target =
        kind === "floor"
          ? undefined
          : index.targets.find((t) => t.kind === kind && (kind === "surface" || t.owner === "character/1"));
      const point = target?.contact ?? roomPoint(600, 520);
      const proposal = resolve(index, index.entities["home/item/food"], point, {
        scale: 1,
        release: true,
        target: target?.id,
        floorOnly: kind === "floor",
      });
      expect(proposal.kind).toBe(kind);
      const next = committed(state, proposal);
      expect(next.rooms.home.characters[0].holding).toBeUndefined();
      if (kind === "mouth") expect(next.rooms.home.instances.some((i) => i.id === "food")).toBe(false);
      if (kind === "hand") expect(next.rooms.home.characters[1].holding).toBe("food");
      if (kind === "surface") expect(next.rooms.home.instances.find((i) => i.id === "food")?.on).toBe("table");
      expect(migrateHome(next)).toBe(next);
    }
  });
  it("keeps lying base and bounds under eat/drink and restores food with undo (H07)", () => {
    let state = empty();
    const bed = instance("bed", "bed", 6, 2);
    state.rooms.home.instances = [bed, instance("food", "mango", 12, 8), instance("cup", "juice", 13, 8)];
    state.rooms.home.characters = [
      characterForSocket({ slot: 0, anchor: "floor", pose: "stand", x: 10, y: 8 }, bed, socketsOf(bed)[0]),
    ];
    const frame = characterFrame(state.rooms.home, state.rooms.home.characters[0]);
    let history = { present: state, past: [] as HomeStateV2[], future: [] as HomeStateV2[] };
    for (const id of ["food", "cup"]) {
      history = editHistory(history, { type: "use-item", id, slot: 0, eat: true });
      expect(history.present.rooms.home.characters[0].pose).toBe("lie");
      expect(
        characterFrame(
          history.present.rooms.home,
          history.present.rooms.home.characters[0],
          id === "food" ? "eat" : "drink"
        )
      ).toEqual(frame);
      expect(homeCharacterPose("lie", id === "food" ? "eat" : "drink")).toBe("lie");
    }
    expect(history.present.rooms.home.instances.find((i) => i.id === "cup")?.empty).toBe(true);
    history = editHistory(editHistory(history, { type: "undo" }), { type: "undo" });
    expect(history.present).toEqual(state);
  });
  it("moves surface children as a contained group and reloads without repair (H05/H06)", () => {
    const state = empty();
    state.rooms.home.instances = [
      instance("table", "coffee-table", 7, 3),
      { ...instance("lamp", "lamp", 7, 3), on: "table" },
    ];
    const index = buildScene(state).rooms.home;
    for (const point of [roomPoint(0, 0), roomPoint(800, 560), roomPoint(400, 400)]) {
      const proposal = resolve(index, index.entities["home/item/table"], point, { scale: 1, floorOnly: true });
      const next = committed(state, proposal);
      expect(proposal.moves.map((m) => m.id)).toEqual(["home/item/table", "home/item/lamp"]);
      const rendered = buildScene(next);
      for (const move of proposal.moves) {
        const entity = rendered.entities[move.id];
        expect(entity.contact.x).toBeCloseTo(move.contact.x, 7);
        expect(entity.contact.y).toBeCloseTo(move.contact.y, 7);
        expect(contained(translatedBounds(entity.bounds, entity.contact))).toBe(true);
      }
      expect(migrateHome(JSON.parse(JSON.stringify(next)))).toEqual(next);
    }
    expect(audit.liveVsReload.live).not.toEqual(audit.liveVsReload.reloaded);
  });
  it("preserves cross-room socket intent and carries a prop through ID collision/capacity (H10)", () => {
    let state = actors();
    state = homeReducer(state, { type: "use-item", id: "toy", slot: 0 }).state;
    state.rooms.kitchen.instances = [instance("seat", "chair", 8, 4), instance("toy", "teddy", 12, 8)];
    const socket = socketsOf(state.rooms.kitchen.instances[0])[0];
    const next = homeReducer(state, {
      type: "transfer",
      slot: 0,
      room: "kitchen",
      x: 1,
      y: 1,
      seatId: "seat",
      socketId: socket.id,
    }).state;
    expect(next).not.toBe(state);
    expect(next.rooms.kitchen.characters[0].socket).toEqual({ itemId: "seat", socketId: socket.id });
    expect(next.rooms.kitchen.characters[0].holding).not.toBe("toy");
    expect(next.rooms.home.instances.some((i) => i.id === "toy")).toBe(false);
    expect(validHome(next)).toBe(true);
    expect(migrateHome(next)).toBe(next);
  });
  it("rejects stale previews, excludes navigation from history and retains sixty world steps", () => {
    const state = actors();
    const index = buildScene(state).rooms.home;
    const proposal = resolve(index, index.entities["character/0"], roomPoint(600, 520), { scale: 1, floorOnly: true });
    expect(apply({ ...state, current: "kitchen" }, proposal)).toHaveProperty("state");
    const changed = structuredClone(state);
    changed.rooms.home.instances[0].x += 1;
    expect(apply(changed, proposal)).toEqual({ stale: true });
    let history = { present: state, past: [] as HomeStateV2[], future: [] as HomeStateV2[] };
    for (let n = 0; n < 65; n++) history = editHistory(history, { type: "theme", floor: n % 2 ? "sand" : "honey" });
    expect(history.past).toHaveLength(60);
    history = editHistory(history, { type: "room", room: "kitchen" });
    expect(history.past).toHaveLength(60);
    history = editHistory(history, { type: "undo" });
    expect(history.present.current).toBe("kitchen");
    expect(history.future).toHaveLength(1);
  });
  it("migrates v1/v2/v3 immutably; accepted v4 contacts are never repaired", () => {
    for (const old of [
      legacyStarterHome(),
      (({ rosterVersion: _r, ...state }) => ({ ...state, version: 2 as const }))(legacyRooms(actors())),
      (({ rosterVersion: _r, ...state }) => ({ ...state, version: 3 as const }))(legacyRooms(actors())),
    ]) {
      const bytes = JSON.stringify(old);
      const next = migrateHome(old)!;
      expect(next.version).toBe(4);
      expect(JSON.stringify(old)).toBe(bytes);
      expect(migrateHome(next)).toBe(next);
    }
    const state = actors();
    const at = roomPoint(321.25, 480.75);
    state.rooms.home.characters[0].at = at;
    expect(migrateHome(state)).toBe(state);
    expect(characterPoint(state.rooms.home, state.rooms.home.characters[0])).toEqual(at);
  });
});

describe("attachment transactions and contention", () => {
  it("reserves the first preview claimant and cannot commit another captured entity", () => {
    const state = actors();
    state.rooms.home.instances.push(instance("second", "mango", 13, 10));
    const index = buildScene(state).rooms.home;
    const target = index.targets.find((t) => t.kind === "hand")!;
    const a = index.entities["home/item/food"];
    const b = index.entities["home/item/second"];
    const proposal = resolve(index, a, target.contact, { scale: 1, target: target.id });
    const second = { ...resolve(index, b, target.contact, { scale: 1, target: target.id }), target: target.id };
    let interaction = transition(
      idleController,
      { type: "down", pointer: 1, entity: a.id, point: screenPoint(100, 100), now: 0 },
      identityCamera,
      housePoint(0, 0)
    );
    interaction = transition(
      interaction.state,
      { type: "down", pointer: 2, entity: b.id, point: screenPoint(150, 100), now: 0 },
      identityCamera,
      housePoint(0, 0)
    );
    interaction = transition(
      interaction.state,
      { type: "move", pointer: 1, point: screenPoint(120, 100), proposal },
      identityCamera,
      housePoint(0, 0)
    );
    expect(interaction.state.reservations[target.id]).toBe(a.id);
    expect(
      resolve(index, b, target.contact, { scale: 1, reservations: interaction.state.reservations }).target
    ).not.toBe(target.id);
    interaction = transition(
      interaction.state,
      { type: "move", pointer: 2, point: screenPoint(170, 100), proposal: second },
      identityCamera,
      housePoint(0, 0)
    );
    expect(interaction.state.pointers.find((p) => p.pointer === 2)?.proposal).toBeUndefined();
    const wrong = transition(
      interaction.state,
      { type: "up", pointer: 2, now: 100, proposal },
      identityCamera,
      housePoint(0, 0)
    );
    expect(wrong.effects).toEqual([{ type: "restore", entity: b.id }]);
    const cancelled = transition(
      wrong.state,
      { type: "cancel", pointer: 1, now: 100 },
      identityCamera,
      housePoint(0, 0)
    );
    expect(cancelled.state.reservations).toEqual({});
  });
  it("keeps occupants, held props and children inside the room through moves and orientation changes", () => {
    for (const mirrored of [false, true]) {
      let state = empty();
      const bed = { ...instance("bed", "bed", 7, 2), mirrored };
      state.rooms.home.instances = [bed, instance("toy", "teddy", 12, 8)];
      state.rooms.home.characters = [
        {
          ...characterForSocket({ slot: 0, anchor: "floor", pose: "stand", x: 8, y: 8 }, bed, socketsOf(bed)[0]),
          holding: "toy",
        },
      ];
      const index = buildScene(state).rooms.home;
      for (const point of [roomPoint(0, 0), roomPoint(800, 560), roomPoint(400, 440)]) {
        const proposal = resolve(index, index.entities["home/item/bed"], point, { scale: 1, floorOnly: true });
        const next = committed(state, proposal);
        const rendered = buildScene(next);
        expect(proposal.moves.map((m) => m.id)).toEqual(["home/item/bed", "character/0", "home/item/toy"]);
        for (const move of proposal.moves) {
          const entity = rendered.entities[move.id];
          expect(entity.contact.x).toBeCloseTo(move.contact.x, 7);
          expect(entity.contact.y).toBeCloseTo(move.contact.y, 7);
          expect(contained(translatedBounds(entity.bounds, entity.contact))).toBe(true);
        }
      }
      state = homeReducer(state, { type: "mirror", id: "bed" }).state;
      const graph = buildScene(state);
      for (const entity of Object.values(graph.rooms.home.entities))
        expect(contained(translatedBounds(entity.bounds, entity.contact))).toBe(true);
      expect(migrateHome(state)).toBe(state);
    }
  });
  it("keeps a filled closed container together, detaches only a child and refuses cycles", () => {
    const state = empty();
    state.rooms.home.instances = [
      instance("fridge", "fridge", 7, 2),
      { ...instance("food", "mango", 1, 1), in: "fridge" },
    ];
    expect(validHome(state)).toBe(true);
    const scene = buildScene(state),
      index = scene.rooms.home;
    // HS-01: a shut door still offers a landing cue; only capacity closes admission.
    expect(index.targets.find((t) => t.kind === "container")?.closed).toBe(false);
    const proposal = resolve(index, index.entities["home/item/fridge"], roomPoint(600, 500), {
      scale: 1,
      floorOnly: true,
    });
    const next = committed(state, proposal);
    expect(next.rooms.home.instances.find((i) => i.id === "food")?.in).toBe("fridge");
    const again = buildScene(next),
      child = again.entities["home/item/food"];
    const detached = committed(
      next,
      resolve(again.rooms.home, child, roomPoint(600, 520), { scale: 1, floorOnly: true })
    );
    expect(detached.rooms.home.instances.find((i) => i.id === "food")?.in).toBeUndefined();
    const cyclic = structuredClone(state);
    cyclic.rooms.home.instances[0].in = "food";
    expect(validHome(cyclic)).toBe(false);
  });
  it("carries a prop into a 48-instance destination without losing it or duplicating it", () => {
    let state = actors();
    state = homeReducer(state, { type: "use-item", id: "toy", slot: 0 }).state;
    for (let y = 0; y <= 10; y += 2)
      for (let x = 1; x <= 13; x += 2) state.rooms.kitchen.instances.push(instance(`book-${x}-${y}`, "book", x, y));
    for (let x = 1; x <= 11; x += 2) state.rooms.kitchen.instances.push(instance(`wall-${x}`, "sea-picture", x, 0));
    const next = homeReducer(state, { type: "transfer", slot: 0, room: "kitchen", x: 18, y: 8 }).state;
    expect(next.rooms.kitchen.instances).toHaveLength(49);
    expect(next.rooms.kitchen.characters[0].holding).toBe("toy");
    expect(next.rooms.home.instances.some((i) => i.id === "toy")).toBe(false);
    expect(validHome(next)).toBe(true);
  });
  it("publishes displaced friends in preview and dispatches the exact proposal through the reducer", () => {
    const state = empty();
    state.rooms.home.instances = [instance("bed", "bed", 10, 2)];
    state.rooms.home.characters = [{ slot: 0, anchor: "floor", pose: "stand", x: 4, y: 0 }];
    const index = buildScene(state).rooms.home;
    const proposal = resolve(index, index.entities["home/item/bed"], roomPoint(196, 414.8), {
      scale: 1,
      floorOnly: true,
    });
    expect(proposal.moves.some((m) => m.id === "character/0")).toBe(true);
    const next = homeReducer(state, { type: "apply-proposal", proposal }).state;
    const charMove = proposal.moves.find((m) => m.id === "character/0")!;
    expect(characterPoint(next.rooms.home, next.rooms.home.characters[0])).toEqual(charMove.contact);
  });
});

// These sweeps assert visible contact independently through geometry, not resolve against itself.
describe("audit property sweeps", () => {
  it("matches preview/commit for every item orientation, socket, species and room", () => {
    let samples = 0;
    for (const room of roomIds)
      for (const id of itemIds)
        for (const rotation of itemSpec(id).rotations)
          for (const mirrored of itemSpec(id).mirror ? [false, true] : [false]) {
            const state = empty();
            const item: Instance = { ...instance("a", id, 7, 3), rotation, mirrored };
            state.rooms[room].instances = [item];
            const index = buildScene(state).rooms[room];
            for (const target of index.sockets)
              for (const slot of target.pet ? ([2] as const) : ([0, 1] as const)) {
                const actor = { slot, anchor: "floor" as const, pose: "stand" as const, x: 15, y: 8 };
                state.rooms[room].characters = [actor];
                const scene = buildScene(state);
                const prepared = scene.rooms[room];
                const subject = prepared.entities[characterEntityId(slot)];
                const proposal = resolve(prepared, subject, target.contact, {
                  scale: 1,
                  target: target.id,
                  release: true,
                });
                const next = committed(state, proposal);
                const character = next.rooms[room].characters[0];
                expect(characterPoint(next.rooms[room], character)).toEqual(proposal.contact);
                const frame = characterFrame(next.rooms[room], character);
                expect(contained({ left: frame.left, top: frame.top, width: frame.width, height: frame.height })).toBe(
                  true
                );
                samples++;
              }
          }
    // The toy shelf no longer accepts new seats (HM-10); that is its 48 samples.
    expect(samples).toBe(1216);
  }, 120000);
  it("has no undefined or contact mismatch over the audit's dense starter-room grid (H15)", () => {
    let samples = 0;
    const base = starterHome();
    for (const room of roomIds)
      for (const slot of [0, 1, 2] as const) {
        const state = structuredClone(base);
        for (const id of roomIds)
          state.rooms[id].characters = state.rooms[id].characters.filter((c) => c.slot !== slot);
        state.rooms[room].characters.push({ slot, anchor: "floor", pose: "stand", x: 8, y: 8 });
        const index = buildScene(state).rooms[room];
        for (let y = 80; y <= 560; y += 24)
          for (let x = 0; x <= 800; x += 25) {
            const proposal = resolve(index, index.entities[characterEntityId(slot)], roomPoint(x, y), {
              scale: 1,
              release: true,
            });
            const next = committed(state, proposal);
            const c = next.rooms[room].characters.find((c) => c.slot === slot)!;
            expect(characterPoint(next.rooms[room], c)).toEqual(proposal.contact);
            expect(
              resolve(index, index.entities[characterEntityId(slot)], roomPoint(x, y), { scale: 1, release: true })
            ).toEqual(proposal);
            samples++;
          }
      }
    expect(samples).toBe(8316);
    expect(audit.dropMismatch.total).toBe(570);
  }, 120000);
});

describe("independent review reproductions", () => {
  it("stages a held prop when furniture covers every floor footprint, and staging preview equals rebuild", () => {
    const state = empty();
    state.rooms.home.instances = [instance("blocked", "bed", 7, 2), instance("toy", "teddy", 0, 0)];
    state.rooms.home.characters = [{ slot: 0, anchor: "floor", pose: "stand", x: 18, y: 8, holding: "toy" }];
    expect(validHome(state)).toBe(true);
    const index = buildScene(state).rooms.home;
    // An authored room can mark a support plane unavailable without changing item art.
    // Ensure the no-support path never treats furniture occupancy as harmless prop overlap.
    for (let y = 0; y < 12; y++)
      for (let x = 0; x < 16; x++) index.occupancy[`furniture:${x}:${y}`] = ["home/item/blocked"];
    const proposal = resolve(index, index.entities["home/item/toy"], roomPoint(400, 480), {
      scale: 1,
      floorOnly: true,
    });
    expect(proposal.kind).toBe("staging");
    const next = committed(state, proposal);
    expect(buildScene(next).entities["home/item/toy"].contact).toEqual(proposal.contact);
  });
  it("projects the resulting carry hand for giving and the retained empty cup after drinking", () => {
    const state = actors();
    state.rooms.home.instances.push(instance("cup", "juice", 13, 10));
    const index = buildScene(state).rooms.home;
    for (const [id, kind] of [
      ["toy", "hand"],
      ["cup", "mouth"],
    ] as const) {
      const target = index.targets.find((t) => t.owner === "character/0" && t.kind === kind)!;
      const proposal = resolve(index, index.entities[`home/item/${id}`], target.contact, {
        scale: 1,
        target: target.id,
        release: true,
      });
      expect(proposal.kind).toBe(kind);
      const next = committed(state, proposal);
      expect(buildScene(next).entities[`home/item/${id}`].contact).toEqual(proposal.contact);
    }
  });
  it("persists facing when leaving mirrored furniture and keeps the held transform exact", () => {
    const state = empty(),
      bed = { ...instance("bed", "bed", 7, 2), mirrored: true };
    state.rooms.home.instances = [bed, instance("toy", "teddy", 12, 8)];
    state.rooms.home.characters = [
      {
        ...characterForSocket({ slot: 0, anchor: "floor", pose: "stand", x: 8, y: 8 }, bed, socketsOf(bed)[0]),
        holding: "toy",
      },
    ];
    const index = buildScene(state).rooms.home;
    const proposal = resolve(index, index.entities["character/0"], roomPoint(650, 500), { scale: 1, floorOnly: true });
    const next = committed(state, proposal),
      rendered = buildScene(next);
    expect(rendered.entities["character/0"].facing).toBe(proposal.facing);
    for (const move of proposal.moves) {
      expect(rendered.entities[move.id].contact.x).toBeCloseTo(move.contact.x, 7);
      expect(rendered.entities[move.id].contact.y).toBeCloseTo(move.contact.y, 7);
    }
  });
  it("retains pending magnet timing across intermediate floor proposals for the full sixty milliseconds", () => {
    const state = actors(),
      index = buildScene(state).rooms.home;
    const hands = index.targets.filter((t) => t.kind === "hand");
    for (const [i, hand] of hands.entries()) {
      hand.contact = roomPoint(300 + i * 100, 400);
      hand.projectedContact = hand.contact;
      hand.core = { left: hand.contact.x - 5, top: 395, width: 10, height: 10 };
      hand.hidden = false;
    }
    // Rebuild the test's broad-phase buckets for its authored hand positions.
    const query = { ...index, buckets: { ...index.buckets, ["3:3"]: index.targets.map((_, i) => i) } };
    const subject = index.entities["home/item/toy"];
    const previous = resolve(query, subject, hands[0].contact, { scale: 1 });
    const first = resolve(query, subject, roomPoint(420, 400), { scale: 1, previous, now: 10 });
    expect(first.pending?.since).toBe(10);
    const second = resolve(query, subject, roomPoint(420, 400), { scale: 1, previous: first, now: 20 });
    expect(second.target).not.toBe(hands[1].id);
    expect(second.pending?.since).toBe(10);
    const final = resolve(query, subject, roomPoint(420, 400), { scale: 1, previous: second, now: 70 });
    expect(final.target).toBe(hands[1].id);
    expect(
      resolve(query, subject, roomPoint(420, 400), { scale: 1, previous: first, now: 20, release: true }).target
    ).toBe(hands[1].id);
  });
  it("stages a held release at the placed-instance cap and rejects permanently clipped v4 contacts", () => {
    let state = actors();
    state = homeReducer(state, { type: "use-item", id: "toy", slot: 0 }).state;
    state.rooms.home.instances = state.rooms.home.instances.filter((i) => i.id === "toy");
    for (let y = 0; y <= 10; y += 2)
      for (let x = 1; x <= 13; x += 2) state.rooms.home.instances.push(instance(`book-${x}-${y}`, "book", x, y));
    for (let x = 1; x <= 11; x += 2) state.rooms.home.instances.push(instance(`wall-${x}`, "sea-picture", x, 0));
    expect(validHome(state)).toBe(true);
    const next = homeReducer(state, { type: "release-held", slot: 0, x: 6, y: 8 }).state;
    expect(next.rooms.home.instances.find((i) => i.id === "toy")?.staged).toBe(true);
    expect(next.rooms.home.characters[0].holding).toBeUndefined();
    const bad = actors();
    bad.rooms.home.characters[0].at = roomPoint(8, 350);
    expect(validHome(bad)).toBe(false);
    expect(migrateHome(bad)).toBeUndefined();
  });
});

it("ports every recorded Pip socket-boundary fixture and the shared bunk group", () => {
  for (const sample of audit.socketFailures.examples) {
    const state = empty();
    state.rooms.home.instances = [sample.inst as Instance];
    state.rooms.home.characters = [{ slot: 1, anchor: "floor", pose: "stand", x: 17, y: 8 }];
    delete state.rosterVersion; const canonical = migrateHome({...legacyRooms(state),version:3})!;
    const index = buildScene(canonical).rooms.home;
    const target = index.sockets.find((t) => t.attachment.kind === "socket" && t.attachment.socket === sample.socket)!;
    const proposal = resolve(index, index.entities["character/1"], target.contact, {
      scale: 1,
      target: target.id,
      release: true,
    });
    const next = committed(canonical, proposal);
    const frame = characterFrame(next.rooms.home, next.rooms.home.characters[0]);
    expect(contained({ left: frame.left, top: frame.top, width: frame.width, height: frame.height })).toBe(true);
  }
  const state = empty(),
    bunk = instance("bunk", "bunk-bed", 7, 1);
  state.rooms.home.instances = [bunk];
  state.rooms.home.characters = socketsOf(bunk)
    .filter((s) => !s.id.startsWith("pet-"))
    .map((socket, slot) =>
      characterForSocket({ slot: slot as 0 | 1, anchor: "floor", pose: "stand", x: 8, y: 8 }, bunk, socket)
    );
  const index = buildScene(state).rooms.home;
  const proposal = resolve(index, index.entities["home/item/bunk"], roomPoint(0, 0), { scale: 1, floorOnly: true });
  const next = committed(state, proposal),
    rendered = buildScene(next);
  expect(proposal.moves.map((m) => m.id)).toEqual(["home/item/bunk", "character/0", "character/1"]);
  for (const move of proposal.moves) {
    const entity = rendered.entities[move.id];
    expect(entity.contact.x).toBeCloseTo(move.contact.x, 7);
    expect(entity.contact.y).toBeCloseTo(move.contact.y, 7);
    expect(contained(translatedBounds(entity.bounds, entity.contact))).toBe(true);
  }
});

it("counts the same forty-seven placed objects through the proposal and legacy creation adapters", () => {
  const state = empty();
  state.rooms.home.instances = [instance("held", "teddy", 0, 0)];
  state.rooms.home.characters = [{ slot: 0, anchor: "floor", pose: "stand", x: 18, y: 8, holding: "held" }];
  for (let y = 0; y <= 10; y += 2)
    for (let x = 1; x <= 13; x += 2) state.rooms.home.instances.push(instance(`book-${x}-${y}`, "book", x, y));
  for (let x = 1; x <= 9; x += 2) state.rooms.home.instances.push(instance(`wall-${x}`, "sea-picture", x, 0));
  expect(validHome(state)).toBe(true);
  const index = buildScene(state).rooms.home,
    created = instance("created", "juice", 0, 0);
  const proposal = resolve(index, itemEntity("home", created), roomPoint(600, 500), { scale: 1, floorOnly: true });
  expect(proposal.kind).toBe("floor");
  expect(homeReducer(state, { type: "apply-proposal", proposal }).state).toEqual(committed(state, proposal));
});

it("rejects clipped v4 furniture while repairing the same historical v3 geometry without mutation", () => {
  const state = empty();
  state.rooms.home.instances = [instance("bed", "bed", 0, 0)];
  expect(validHome(state)).toBe(false);
  expect(migrateHome(state)).toBeUndefined();
  state.version = 3; delete state.rosterVersion; state.rooms = legacyRooms(state).rooms;
  const bytes = JSON.stringify(state),
    migrated = migrateHome(state)!;
  expect(validHome(migrated)).toBe(true);
  expect(JSON.stringify(state)).toBe(bytes);
  const bed = buildScene(migrated).entities["home/item/bed"];
  expect(contained(translatedBounds(bed.bounds, bed.contact))).toBe(true);
});

it("preserves a prop's own facing when attaching it to a mirrored recipient", () => {
  const state = actors();
  state.rooms.home.characters[0].facing = "left";
  state.rooms.home.instances.push(instance("cup", "juice", 14, 9));
  const index = buildScene(state).rooms.home,
    target = index.targets.find((t) => t.owner === "character/0" && t.kind === "hand")!;
  const subject = index.entities["home/item/cup"],
    proposal = resolve(index, subject, target.contact, { scale: 1, target: target.id, release: true });
  expect(proposal.facing).toBe(subject.facing);
  const next = committed(state, proposal),
    rendered = buildScene(next).entities["home/item/cup"];
  expect(rendered.facing).toBe(proposal.facing);
  expect(rendered.contact).toEqual(proposal.contact);
});
