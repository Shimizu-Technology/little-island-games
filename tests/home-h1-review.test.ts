import { describe, expect, it } from "vitest";
import { itemIds } from "../src/home/catalog";
import { instance, migrateHome, starterHome, validHome, homeReducer, type HomeStateV2 } from "../src/home/model";
import { floorPoint, itemPoint } from "../src/home/geometry";
import { itemFrontShapes, itemShapes, occluderBounds, shapeBounds } from "../src/home/art/silhouettes";
import { buildScene } from "../src/home/scene/graph";
import { apply, resolve } from "../src/home/scene/proposal";
import { standingContact, contained, translatedBounds } from "../src/home/scene/spatial";
import { anchorsFor } from "../src/home/scene/species";
import { paintEntries } from "../src/home/runtime/group";
import { pickEntity, prepareHits, shapeDistance } from "../src/home/runtime/pick";
import { roomPoint, type HitShape } from "../src/home/scene/types";

function empty(): HomeStateV2 {
  const state = migrateHome(starterHome())!;
  for (const room of Object.values(state.rooms)) { room.instances = []; room.characters = []; }
  return state;
}
function reflection(s: HitShape): HitShape {
  switch (s.kind) {
    case "box": return { ...s, left: -s.left - s.width };
    case "ellipse": return { ...s, x: -s.x };
    case "capsule": return { ...s, ax: -s.ax, bx: -s.bx };
    case "polygon": return { ...s, points: s.points.map((v, i) => i % 2 ? v : -v) };
  }
}
const scale = .5025;
describe("H1 independent review regressions", () => {
  it("reflects every catalog primitive exactly once in both states and every orientation", () => {
    const kinds = new Set<string>();
    for (const id of itemIds) for (const active of [false, true]) {
      const base = { ...instance("x", id, 5, 5), powered: active };
      const normal = itemShapes(base, 150);
      for (const s of normal) kinds.add(s.kind);
      for (const rotation of [0, 90, 180, 270] as const) for (const mirrored of [false, true]) {
        const flipped = mirrored !== (rotation >= 180);
        const actual = itemShapes({ ...base, mirrored, rotation }, 150);
        expect(JSON.stringify(actual, (_k, v) => typeof v === "number" ? +v.toFixed(8) : v), `${id}/${active}/${rotation}/${mirrored}`).toBe(JSON.stringify(normal.map((s) => flipped ? reflection(s) : s), (_k, v) => typeof v === "number" ? +v.toFixed(8) : v));
      }
    }
    expect(kinds).toEqual(new Set(["box", "ellipse", "capsule", "polygon"]));
  });
  it.each([0, 90, 180, 270] as const)("picks the painted shelf centre at rotation %i, both mirrors", (rotation) => {
    for (const mirrored of [false, true]) {
      const state = empty();
      state.rooms.home.instances = [{ ...instance("s", "shelf", 8, 8), mirrored, rotation }];
      const scene = buildScene(state), shelf = scene.entities["home/item/s"];
      const hits = prepareHits(scene).home;
      expect(pickEntity(hits, roomPoint(shelf.contact.x, shelf.contact.y - 70), scale)).toBe(shelf.id);
      expect(pickEntity(hits, roomPoint(shelf.contact.x + shelf.bounds.width * .9, shelf.contact.y - 70), scale)).toBeUndefined();
    }
  });
  it("keeps every catalog occlusion rectangle inside its painted primitive", () => {
    for (const id of itemIds) for (const mirrored of [false, true]) {
      for (const shape of itemShapes({ ...instance("x", id, 8, 8), mirrored }, 150)) {
        const b = occluderBounds(shape);
        if (!b) continue;
        for (const x of [b.left + 1e-7, b.left + b.width - 1e-7]) for (const y of [b.top + 1e-7, b.top + b.height - 1e-7])
          expect(shapeDistance(shape, x, y), `${id}/${shape.kind}/${x},${y}`).toBeLessThan(1e-6);
      }
    }
  });
  it("never marks a clear hand hidden across catalog furniture and diagonal hulls", () => {
    let checked = 0;
    for (const id of itemIds) for (const mirrored of [false, true]) {
      const state = empty();
      state.rooms.home.instances = [{ ...instance("f", id, 8, 8), mirrored }];
      const furniture = buildScene(state).entities["home/item/f"];
      if (furniture.item?.layer !== "furniture") continue;
      const anchor = anchorsFor(0, "stand", "front").hand;
      for (const dx of [-100, -50, 0, 50, 100]) for (const dy of [-100, -50, 0]) {
        const at = standingContact(roomPoint(furniture.contact.x + dx - anchor.x, furniture.contact.y + dy - anchor.y), 0);
        state.rooms.home.characters = [{ slot: 0, anchor: "floor", pose: "stand", x: 5, y: 5, at }];
        const scene = buildScene(state), hand = scene.rooms.home.targets.find((t) => t.id === "character/0/hand")!;
        const gap = Math.min(...furniture.shapes!.map((s) => shapeDistance(s, hand.contact.x - furniture.contact.x, hand.contact.y - furniture.contact.y)));
        if (gap > 15) { expect(hand.hidden, `${id}/${mirrored}/${dx},${dy}`).toBe(false); checked++; }
      }
    }
    expect(checked).toBeGreaterThan(500);
  });
  it("uses convex mirrored front-pass hulls for seat furniture", () => {
    for (const id of itemIds) for (const mirrored of [false, true]) for (const shape of itemFrontShapes({ ...instance("x", id, 5, 5), mirrored }, 150)) {
      if (shape.kind !== "polygon") continue;
      let positive = false, negative = false;
      const p = shape.points, n = p.length / 2;
      for (let i = 0; i < n; i++) {
        const a = i * 2, b = ((i + 1) % n) * 2, c = ((i + 2) % n) * 2;
        const cross = (p[b] - p[a]) * (p[c + 1] - p[b + 1]) - (p[b + 1] - p[a + 1]) * (p[c] - p[b]);
        if (cross > 1e-7) positive = true;
        if (cross < -1e-7) negative = true;
      }
      expect(positive && negative, id).toBe(false);
    }
  });
  it("leaves the visibly clear hand beside the diagonal telescope eligible", () => {
    const state = empty();
    state.rooms.home.instances = [instance("t", "telescope", 8, 8), instance("toy", "teddy", 2, 8)];
    state.rooms.home.characters = [{ slot: 0, anchor: "floor", pose: "stand", x: 6, y: 5, at: roomPoint(280.2297114683297, 456.16737609111317) }];
    expect(validHome(state)).toBe(true);
    const scene = buildScene(state), index = scene.rooms.home;
    const hand = index.targets.find((t) => t.id === "character/0/hand")!;
    const telescope = scene.entities["home/item/t"];
    expect(Math.min(...telescope.shapes!.map((s) => shapeDistance(s, hand.contact.x - telescope.contact.x, hand.contact.y - telescope.contact.y)))).toBeGreaterThan(28);
    expect(hand.hidden).toBe(false);
    expect(resolve(index, scene.entities["home/item/toy"], hand.contact, { scale, release: true, kinds: ["hand"] }).kind).toBe("hand");
  });
  it("keeps exact legal drops across the full open floor, including its upper strip and boundaries", () => {
    const state = empty();
    state.rooms.home.characters = [{ slot: 0, anchor: "floor", pose: "stand", x: 5, y: 5 }];
    state.rooms.home.instances = [instance("p", "plant", 2, 8)];
    const scene = buildScene(state), index = scene.rooms.home;
    for (const id of ["character/0", "home/item/p"]) {
      const subject = scene.entities[id];
      const bounds = subject.bounds;
      for (const x of [8 - bounds.left, 200, 333.3, 400, 570, 610, 792 - bounds.left - bounds.width]) for (const y of [350, 352, 355, 370, 386, 440, 487.7, 525, 552 - bounds.top - bounds.height]) {
        const point = subject.character ? standingContact(roomPoint(x, y), 0) : roomPoint(x, y);
        if (!contained(translatedBounds(bounds, point))) continue;
        const p = resolve(index, subject, point, { scale, release: true, floorOnly: true });
        expect(p.kind).toBe("floor");
        expect(Math.hypot(p.contact.x - point.x, p.contact.y - point.y) * scale, `${id}/${x},${y}`).toBeLessThanOrEqual(4);
      }
    }
  });
  it("does not keep an exact point when its collision cell is occupied", () => {
    const state = empty();
    state.rooms.home.instances = [instance("p", "plant", 2, 8), instance("q", "plant", 8, 8)];
    const scene = buildScene(state);
    const point = roomPoint(...Object.values(floorPoint(8, 8)) as [number, number]);
    const p = resolve(scene.rooms.home, scene.entities["home/item/p"], point, { scale, release: true, floorOnly: true });
    expect(p.contact).not.toEqual(point);
  });
  it("moves an exact-dropped plant to the requested grid destination and survives save/reload", () => {
    const state = empty(); state.rooms.home.instances = [instance("p", "plant", 2, 8)];
    const scene = buildScene(state), point = roomPoint(333.3, 487.7);
    const proposal = resolve(scene.rooms.home, scene.entities["home/item/p"], point, { scale, release: true, floorOnly: true });
    const dropped = apply(state, proposal);
    if (!("state" in dropped)) throw new Error("stale");
    expect(itemPoint(dropped.state.rooms.home.instances[0])).toEqual(point);
    const mirrored = homeReducer(dropped.state, { type: "mirror", id: "p" });
    expect(mirrored.message).toBeUndefined();
    expect(itemPoint(mirrored.state.rooms.home.instances[0])).toEqual(point);
    const moved = homeReducer(dropped.state, { type: "move", id: "p", x: 12, y: 9 });
    expect(moved.message).toBeUndefined();
    expect(itemPoint(moved.state.rooms.home.instances[0])).toEqual(floorPoint(12, 9));
    const loaded = migrateHome(JSON.parse(JSON.stringify(moved.state)))!;
    expect(validHome(loaded)).toBe(true);
    expect(itemPoint(loaded.rooms.home.instances[0])).toEqual(floorPoint(12, 9));
    expect(itemPoint(dropped.state.rooms.home.instances[0])).toEqual(point);
  });
  it("picks the last painted equal-depth prop even when the covered centre is closer", () => {
    for (const offset of [0, 8]) {
      const state = empty();
      state.rooms.home.instances = [{ ...instance("a", "mango", 5, 5), at: { x: 400, y: 500 } }, { ...instance("z", "mango", 8, 8), at: { x: 400 + offset, y: 500 } }];
      expect(validHome(state)).toBe(true);
      const scene = buildScene(state), a = scene.entities["home/item/a"];
      const entries = paintEntries(Object.values(scene.rooms.home.entities), scene);
      expect(entries.at(-1)!.entity.id).toBe("home/item/z");
      const b = shapeBounds(a.shapes![0]);
      expect(pickEntity(prepareHits(scene).home, roomPoint(a.contact.x + b.left + b.width / 2, a.contact.y + b.top + b.height / 2), scale)).toBe("home/item/z");
    }
  });
  it("picks a bed front blanket above its occupant but leaves the visible head touchable", () => {
    const state = empty(); state.rooms.home.instances = [instance("bed", "bed", 5, 5)];
    state.rooms.home.characters = [{ slot: 0, anchor: "seat", pose: "lie", seatId: "bed", socket: { itemId: "bed", socketId: "pillow" } }];
    const scene = buildScene(state), bed = scene.entities["home/item/bed"], hero = scene.entities["character/0"];
    const entries = paintEntries(Object.values(scene.rooms.home.entities), scene);
    expect(entries.at(-1)!.front).toBe(true);
    const size = bed.bounds.width;
    expect(pickEntity(prepareHits(scene).home, roomPoint(bed.contact.x + (95 / 150 - .5) * size, bed.contact.y + (80 / 150 - .85) * size), scale)).toBe(bed.id);
    const head = scene.rooms.home.targets.find((t) => t.id === `${hero.id}/mouth`)!.face!;
    expect(pickEntity(prepareHits(scene).home, roomPoint(head.x, head.y), scale)).toBe(hero.id);
  });
});
