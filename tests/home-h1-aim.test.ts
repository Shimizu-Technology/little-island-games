import { readFileSync } from "node:fs";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { Pip } from "../src/islander/rig/Companions";
import { itemIds } from "../src/home/catalog";
import { moreCatalog } from "../src/home/catalogMore";
import { instance, starterHome, validHome, type HomeStateV2 } from "../src/home/model";
import { characterPoint, itemPoint } from "../src/home/geometry";
import { authoredHullIds, itemShapes } from "../src/home/art/silhouettes";
import { anchoredInPlay, capabilityOf } from "../src/home/world";
import { buildScene } from "../src/home/scene/graph";
import { apply, faceRadius, magnetRadius, resolve } from "../src/home/scene/proposal";
import { faceZone, handMagnet } from "../src/home/scene/resolve";
import { anchorsFor } from "../src/home/scene/species";
import { companionContacts, pipAnchors } from "../src/islander/rig/anchors";
import { roomPoint, type RoomPoint, type Scene, type SceneEntity } from "../src/home/scene/types";
import { pickEntity, prepareHits, shapeDistance } from "../src/home/runtime/pick";
import { carriedCentre, carryLift } from "../src/home/runtime/carry";
import { labFixtures } from "../src/home/runtime/lab";
import { withPortions } from "../src/home/runtime/portions";

vi.mock("react-native-svg", () => ({ default: "svg", G: "g", Circle: "circle", Ellipse: "ellipse", Path: "path" }));

const SCALE = 0.5025;
function indexOf(state: HomeStateV2, room: keyof HomeStateV2["rooms"]) {
  const scene = withPortions(buildScene(state));
  return { scene, index: { ...scene.rooms[room], entities: scene.entities } };
}
/** Anchor that puts a carried prop's art middle on `aim`, for the grip the child used. */
function anchorForAim(subject: SceneEntity, aim: RoomPoint, grip = { x: 0, y: -subject.bounds.height * 0.35 }) {
  const drawn = carriedCentre(subject, 0, 0, grip.x, grip.y, SCALE);
  return { anchor: roomPoint(aim.x - drawn.x, aim.y - drawn.y), grip };
}
function dropFood(state: HomeStateV2, foodId: string, aim: RoomPoint) {
  const { scene, index } = indexOf(state, "kitchen");
  const subject = scene.entities[foodId];
  const { anchor, grip } = anchorForAim(subject, aim);
  const drawn = carriedCentre(subject, anchor.x, anchor.y, grip.x, grip.y, SCALE);
  return resolve(index, subject, anchor, { scale: SCALE, aim: roomPoint(drawn.x, drawn.y), release: true });
}
const headPoints = (face: { x: number; y: number; headRadius: number }) => {
  const points: RoomPoint[] = [roomPoint(face.x, face.y)];
  for (const k of [0.4, 0.7, 0.98]) for (let a = 0; a < 12; a++)
    points.push(roomPoint(face.x + Math.cos((a / 12) * Math.PI * 2) * face.headRadius * k, face.y + Math.sin((a / 12) * Math.PI * 2) * face.headRadius * k));
  return points;
};

describe("HM-01 feeding uses what the child sees", () => {
  const fixtures = ["feed-stand", "feed-sit", "feed-bed"] as const;
  it.each(fixtures)("eats food released with its art anywhere over the head (%s, default zoom)", (fixture) => {
    const state = labFixtures[fixture]();
    const { scene, index } = indexOf(state, "kitchen");
    const mouth = index.targets.find((t) => t.kind === "mouth" && t.owner === "character/0")!;
    for (const food of ["mango", "banana"]) for (const aim of headPoints(mouth.face!)) {
      const proposal = dropFood(state, `kitchen/item/portion-bowl-${food}`, aim);
      expect(proposal.kind, `${food} at ${aim.x},${aim.y}`).toBe("mouth");
      expect(proposal.consume).toBe("food");
    }
    expect(Object.keys(scene.entities).length).toBeGreaterThan(1);
  });
  it("feeds at the audited failure: mango art on the mouth, banana art on the nose", () => {
    const state = labFixtures["feed-stand"]();
    const { index } = indexOf(state, "kitchen");
    const mouth = index.targets.find((t) => t.id === "character/0/mouth")!;
    expect(dropFood(state, "kitchen/item/portion-bowl-mango", mouth.contact).kind).toBe("mouth");
    expect(dropFood(state, "kitchen/item/portion-bowl-banana", roomPoint(mouth.face!.x, mouth.face!.y + 8)).kind).toBe("mouth");
  });
  it("does not eat food released well away from the head, or passing over it", () => {
    const state = labFixtures["feed-stand"]();
    const { scene, index } = indexOf(state, "kitchen");
    const mouth = index.targets.find((t) => t.id === "character/0/mouth")!;
    const away = roomPoint(mouth.face!.x + faceRadius(mouth.face!.headRadius, SCALE) + 40, mouth.face!.y);
    expect(dropFood(state, "kitchen/item/portion-bowl-mango", away).kind).not.toBe("mouth");
    const subject = scene.entities["kitchen/item/portion-bowl-mango"];
    expect(resolve(index, subject, mouth.contact, { scale: SCALE, aim: roomPoint(mouth.face!.x, mouth.face!.y) }).consume).toBe("food");
    expect(scene.entities["kitchen/item/portion-bowl-mango"]).toBe(subject);
  });
  it("the face beats a nearby hand for food but a non-food toy goes to the hand", () => {
    const state = labFixtures["feed-pip"]();
    state.rooms.kitchen.instances.push(instance("toy", "teddy", 15, 9));
    const { scene, index } = indexOf(state, "kitchen");
    const pipHand = index.targets.find((t) => t.id === "character/1/hand")!;
    const pipMouth = index.targets.find((t) => t.id === "character/1/mouth")!;
    const face = pipMouth.face!;
    expect(resolve(index, scene.entities["kitchen/item/portion-bowl-mango"], roomPoint(face.x, face.y + 60), { scale: SCALE, aim: roomPoint(face.x, face.y), release: true }).kind).toBe("mouth");
    expect(resolve(index, scene.entities["kitchen/item/toy"], roomPoint(pipHand.contact.x, pipHand.contact.y + 40), { scale: SCALE, aim: pipHand.contact, release: true }).kind).toBe("hand");
    expect(resolve(index, scene.entities["kitchen/item/portion-bowl-mango"], pipHand.contact, { scale: SCALE, aim: pipHand.contact, release: true }).kind).toBe("hand");
  });
  it("uses the lift the overlay draws, so aim equals paint", () => {
    const state = labFixtures["feed-stand"]();
    const mango = indexOf(state, "kitchen").scene.entities["kitchen/item/portion-bowl-mango"];
    expect(carryLift(mango, SCALE)).toBeCloseTo(Math.min(10 / SCALE, mango.bounds.height * 0.04) + 18 / SCALE);
  });
});

describe("HM-02 hull table and picking", () => {
  it("authors a hull for every catalog item", () => {
    expect(new Set(authoredHullIds())).toEqual(new Set(itemIds));
  });
  it("every polygon is convex and inside its art box, both facings", () => {
    for (const id of itemIds) for (const mirrored of [false, true]) {
      const item = { ...instance("x", id, 0, 0), mirrored };
      for (const shape of itemShapes(item, 150)) {
        if (shape.kind !== "polygon") continue;
        const n = shape.points.length / 2;
        let sign = 0;
        for (let i = 0; i < n; i++) {
          const a = i * 2, b = ((i + 1) % n) * 2, c = ((i + 2) % n) * 2;
          const cross = (shape.points[b] - shape.points[a]) * (shape.points[c + 1] - shape.points[b + 1]) - (shape.points[b + 1] - shape.points[a + 1]) * (shape.points[c] - shape.points[b]);
          if (cross !== 0) { expect(sign === 0 || sign === Math.sign(cross), `${id} polygon ${i}`).toBe(true); sign = Math.sign(cross); }
        }
      }
    }
  });
  it("mirrors the fridge door with its body", () => {
    const open = { ...instance("f", "fridge", 0, 0), powered: true };
    const right = itemShapes(open, 150), left = itemShapes({ ...open, mirrored: true }, 150);
    expect(right.length).toBe(left.length);
    expect(right[1]).not.toEqual(left[1]);
  });
  function crowded() {
    const state = labFixtures.crowded();
    const scene = buildScene(state);
    const hits = prepareHits(scene).home;
    const movable = Object.fromEntries(Object.values(scene.entities).map((e) => [e.id, !e.item || capabilityOf(e.item.item).moveInPlay]));
    return { state, scene, pick: (p: RoomPoint) => pickEntity(hits, p, SCALE, movable) };
  }
  const offset = (e: SceneEntity, x: number, y: number) => roomPoint(e.contact.x + x, e.contact.y + y);
  it("A1: twenty planned touches take the intended object", () => {
    const { scene, pick } = crowded();
    const hero = scene.entities["character/0"], pip = scene.entities["character/1"], crab = scene.entities["character/2"];
    const at = (id: string) => scene.entities[`home/item/${id}`];
    const m = (e: SceneEntity) => offset(e, e.visual!.x, e.visual!.y);
    const head = anchorsFor(0, "stand", hero.facing).head;
    const cases: [string, RoomPoint, string | undefined][] = [
      ["hero head", offset(hero, head.x, head.y), hero.id],
      ["hero shirt", offset(hero, 0, -100), hero.id],
      ["hero leg, in front of the mango behind her", offset(hero, 22, -39), hero.id],
      ["hero foot", offset(hero, 10, -10), hero.id],
      ["mango-behind where it shows past her", m(at("mango-behind")), at("mango-behind").id],
      ["pip body", offset(pip, -10, -50), pip.id],
      ["crab shell", offset(crab, 0, -32), crab.id],
      ["bed blanket", offset(at("bed"), 60, -120), at("bed").id],
      ["bed foot, not the rug", offset(at("bed"), 20, -40), at("bed").id],
      ["rug edge", offset(at("rug"), -92, -56), at("rug").id],
      ["rug middle", offset(at("rug"), 50, -68), at("rug").id],
      ["below the rug is floor", offset(at("rug"), 0, 60), undefined],
      ["toy chest", offset(at("toys"), 0, -70), at("toys").id],
      ["shelf", offset(at("shelf"), 40, -90), at("shelf").id],
      ["lamp shade", offset(at("lamp"), 0, -62), at("lamp").id],
      ["plant pot", offset(at("plant"), 0, -28), at("plant").id],
      ["plant leaf", offset(at("plant"), -24, -70), at("plant").id],
      ["beach towel", m(at("towel")), at("towel").id],
      ["cushion", m(at("cushion")), at("cushion").id],
      ["empty air past the rug", roomPoint(60, 525), undefined],
    ];
    expect(cases).toHaveLength(20);
    for (const [name, point, expected] of cases) expect(pick(point), name).toBe(expected);
  });
  it("gives a loose object forgiveness only in front of what stays put", () => {
    const { scene, pick } = crowded();
    const mango = scene.entities["home/item/mango-behind"];
    // Just off its art, over nothing else: within 8 pt the mango takes the touch.
    const shapes = mango.shapes!, edge = 8 / SCALE - 2;
    const p = roomPoint(mango.contact.x + mango.visual!.x - 28 - edge, mango.contact.y + mango.visual!.y - 70);
    const nearest = Math.min(...shapes.map((s) => shapeDistance(s, p.x - mango.contact.x, p.y - mango.contact.y)));
    if (nearest > 0 && nearest <= 8 / SCALE && pick(p) !== undefined) expect(pick(p)).toBe(mango.id);
  });
  it("reports hit area for the audited offenders: rug and towel are no longer boxes", () => {
    const { scene } = crowded();
    const rug = scene.entities["home/item/rug"], towel = scene.entities["home/item/towel"];
    expect(rug.shapes![0].kind).toBe("ellipse");
    expect(towel.shapes!.length).toBeGreaterThan(0);
  });
});

describe("HM-03 what stays put in Play", () => {
  it("freezes the anchored list and leaves decor and props free", () => {
    for (const id of ["bed", "bunk-bed", "table", "kitchen-table", "shelf", "bookcase", "dresser", "toy-box", "rug", "fridge", "stove", "sink-counter", "stool", "chair", "sofa", "clock"])
      expect(capabilityOf(id).moveInPlay, id).toBe(false);
    for (const id of ["floor-cushion", "beanbag", "plant", "potted-fern", "banana-plant", "lamp", "floor-lamp", "table-lamp", "island-lamp", "teddy", "ball", "mango", "juice", "book", "radio", "guitar", "blocks"])
      expect(capabilityOf(id).moveInPlay, id).toBe(true);
  });
  it("keeps every anchored id real and every catalog id classified once", () => {
    for (const id of anchoredInPlay) expect(itemIds.includes(id), id).toBe(true);
    for (const id of itemIds) expect(typeof capabilityOf(id).moveInPlay, id).toBe("boolean");
  });
  it("answers drops: an anchored chair still seats, a table still holds a mango", () => {
    const state = starterHome();
    const kitchen = state.rooms.kitchen;
    kitchen.characters = [{ slot: 0, anchor: "floor", pose: "stand", x: 7, y: 7 }];
    const { scene, index } = indexOf(state, "kitchen");
    const stool = index.targets.find((t) => t.kind === "socket" && !t.pet)!;
    expect(resolve(index, scene.entities["character/0"], stool.contact, { scale: SCALE, contact: stool.contact, release: true }).kind).toBe("socket");
  });
});

describe("HM-08 hidden hands", () => {
  it("never reports a visible hand hidden across every legal standing spot in the starter rooms", () => {
    const state = starterHome();
    let spots = 0, wrong = 0, hidden = 0;
    for (const room of ["home", "kitchen", "treehouse", "beach"] as const) {
      const scene = buildScene(state), index = scene.rooms[room];
      for (const location of index.floor.filter((l) => l.occlusion[0] <= 0.25)) {
        const roomState = JSON.parse(JSON.stringify(state)) as HomeStateV2;
        roomState.rooms[room].characters = [{ slot: 0, anchor: "floor", pose: "stand", x: location.cell.x, y: location.cell.y, at: { ...location.contact } } as never];
        for (const other of Object.keys(roomState.rooms) as (keyof HomeStateV2["rooms"])[]) if (other !== room) roomState.rooms[other].characters = [];
        const placed = buildScene(roomState).rooms[room];
        const hand = placed.targets.find((t) => t.id === "character/0/hand")!;
        spots++;
        if (!hand.hidden) continue;
        hidden++;
        const inFront = Object.values(placed.entities).filter((e) => e.item?.layer === "furniture" && !e.parent && e.depth > placed.entities["character/0"].depth);
        const covered = inFront.some((e) => e.shapes!.some((s) => shapeDistance(s, hand.contact.x - e.contact.x, hand.contact.y - e.contact.y) === 0));
        if (!covered) wrong++;
      }
    }
    expect(spots).toBeGreaterThan(400);
    expect(wrong).toBe(0);
    expect(hidden).toBeLessThan(22);
  });
});

describe("HM-10 seats and landing", () => {
  it("nobody new can sit inside the toy shelf, and a saved friend keeps their seat", () => {
    const state = starterHome();
    const { index } = indexOf(state, "home");
    expect(index.targets.some((t) => t.owner === "home/item/shelf" && t.kind === "socket")).toBe(false);
    const seated = JSON.parse(JSON.stringify(state)) as HomeStateV2;
    seated.rooms.home.characters = [{ slot: 2, anchor: "seat", pose: "sit", seatId: "shelf", socket: { itemId: "shelf", socketId: "pet-legacy-seat" } }];
    expect(validHome(seated)).toBe(true);
    expect(buildScene(seated).entities["character/2"].attachment.kind).toBe("socket");
  });
  it("lands within 4 pt of the release on open floor, for a character and a loose prop", () => {
    const state = starterHome();
    state.rooms.home.instances = [];
    state.rooms.home.characters = [{ slot: 0, anchor: "floor", pose: "stand", x: 8, y: 8 }];
    const propState: HomeStateV2 = JSON.parse(JSON.stringify(state));
    propState.rooms.home.instances = [instance("plant", "plant", 2, 10)];
    propState.rooms.home.characters = [];
    const hero = indexOf(state, "home"), prop = indexOf(propState, "home");
    for (let y = 440; y <= 530; y += 11) for (let x = 180; x <= 610; x += 23) {
      const point = roomPoint(x, y);
      const drop = resolve(hero.index, hero.scene.entities["character/0"], point, { scale: SCALE, release: true });
      expect(drop.kind).toBe("floor");
      expect(Math.hypot(drop.contact.x - x, drop.contact.y - y) * SCALE, `${x},${y}`).toBeLessThanOrEqual(4);
      const plant = resolve(prop.index, prop.scene.entities["home/item/plant"], point, { scale: SCALE, release: true });
      expect(plant.kind).toBe("floor");
      expect(Math.hypot(plant.contact.x - x, plant.contact.y - y) * SCALE, `plant ${x},${y}`).toBeLessThanOrEqual(4);
    }
  });
  it("saves the exact point so the preview is the result after reload", () => {
    const state = starterHome();
    state.rooms.home.instances = [instance("cushion", "floor-cushion", 2, 10)];
    const { scene, index } = indexOf(state, "home");
    const proposal = resolve(index, scene.entities["home/item/cushion"], roomPoint(333.3, 487.7), { scale: SCALE, release: true });
    const applied = apply(state, proposal);
    if ("stale" in applied) throw new Error("stale");
    const saved = applied.state.rooms.home.instances.find((i) => i.id === "cushion")!;
    expect(saved.at).toEqual({ x: 333.3, y: 487.7 });
    expect(itemPoint(saved, applied.state.rooms.home.instances)).toEqual(proposal.contact);
    expect(validHome(JSON.parse(JSON.stringify(applied.state)))).toBe(true);
  });
  it("keeps anchored furniture on its grid, even when moved in Design", () => {
    const state = starterHome();
    const { scene, index } = indexOf(state, "home");
    const proposal = resolve(index, scene.entities["home/item/toys"], roomPoint(420.4, 500.2), { scale: SCALE, release: true, avoidFurnitureOverlap: true });
    const applied = apply(state, proposal);
    if ("stale" in applied) throw new Error("stale");
    expect(applied.state.rooms.home.instances.find((i) => i.id === "toys")!.at).toBeUndefined();
  });
  it("tells the child a rug is a seat before release", () => {
    const { index } = indexOf(starterHome(), "home");
    const rugSeats = index.targets.filter((t) => t.owner === "home/item/rug" && t.kind === "socket");
    expect(rugSeats.length).toBeGreaterThan(0);
    for (const seat of rugSeats) expect(seat.rim).toBeDefined();
    expect(index.targets.find((t) => t.owner === "home/item/bed" && t.kind === "socket")?.rim).toBeUndefined();
  });
  it("floor picks still respect characterPoint for saved exact spots", () => {
    const state = starterHome();
    const c = { slot: 0 as const, anchor: "floor" as const, pose: "stand" as const, x: 8, y: 8, at: roomPoint(400.5, 500) };
    expect(characterPoint(state.rooms.home, c)).toEqual({ x: 400.5, y: 500 });
  });
});

describe("HC-03 companion anchors", () => {
  it("Pip's mouth and fin anchors are the drawn mouth and fin", () => {
    type Props = { children?: React.ReactNode; [key: string]: unknown };
    const nodes = (node: React.ReactNode): React.ReactElement<Props>[] => React.Children.toArray(node).flatMap(child => {
      if (!React.isValidElement<Props>(child)) return [];
      return [child, ...nodes(child.props.children)];
    });
    // Inspect the rendered contact inputs, independent of JSX prop order.
    for (const action of [null, "eat", "drink"] as const) for (const reach of [0, 1]) {
      const meal = { reach, bite: !!reach, chew: false };
      const contacts = companionContacts("pip", "stand", action, meal);
      const art = nodes(Pip({ action, meal, reduced: true }));
      const mouthNode = art.find(n => typeof n.type === "function" && n.type.name === "PetMouth")!;
      const heldNode = art.find(n => typeof n.type === "function" && n.type.name === "Held")!;
      const fin = art.find(n => n.props["data-joint"] === "fin")!;
      expect([mouthNode.props.x, mouthNode.props.y]).toEqual(contacts.mouth);
      expect(heldNode.props.at).toEqual(contacts.hand);
      expect(String(fin.props.d)).toContain(`${contacts.hand[0]} ${contacts.hand[1]}`);
    }
    const { mouth, hand } = companionContacts("pip", "stand", null);
    expect(hand).toEqual([65, 116]);
    expect(hand[1]).toBeGreaterThan(mouth[1] + 20);
    const a = pipAnchors("stand");
    expect(a.mouth.x).toBeCloseTo(mouth[0] - 75);
    expect(a.mouth.y).toBeCloseTo(mouth[1] - 117);
  });
  it("the provisional note is gone from the scene contract", () => {
    expect(readFileSync("docs/ISLAND_HOME_3.md", "utf8")).not.toMatch(/provisional/);
  });
});

describe("HM-SP constants in the contract match the code", () => {
  const doc = readFileSync("docs/ISLAND_HOME_3.md", "utf8");
  it("records the face zone and hand magnet numbers", () => {
    expect(doc).toContain(`Face zone: radius max(${faceZone.minPt} pt, ${faceZone.headFactor} × head radius)`);
    expect(doc).toContain(`Hand magnet: clamp(${handMagnet.minPt}, ${handMagnet.heightFactor} × h, ${handMagnet.maxPt}) pt`);
    expect(magnetRadius("hand", 180, 0.5) * 0.5).toBe(handMagnet.minPt);
  });
});

describe("lab fixtures", () => {
  it.each(Object.keys(labFixtures))("%s is a valid home", (name) => {
    expect(validHome(JSON.parse(JSON.stringify(labFixtures[name]())))).toBe(true);
  });
});

describe("HM-S0 trace stays local and out of family builds", () => {
  it("has no network path", () => {
    for (const file of ["trace.ts", "traceFile.ts", "traceFile.native.ts", "HullOverlay.tsx"]) {
      const source = readFileSync(`src/home/runtime/${file}`, "utf8");
      expect(source, file).not.toMatch(/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|http:|https:/);
    }
  });
  it("is reachable only through the build-time lab branch", () => {
    const screen = readFileSync("src/home/HomeScreen.tsx", "utf8");
    expect(screen).toMatch(/__DEV__ \|\| process\.env\.EXPO_PUBLIC_HOME_LAB === "1"\s*\n\s*\? \{ trace: require\("\.\/runtime\/trace"\)/);
    expect(screen.match(/^import (?!type).*runtime\/trace"/m)).toBeNull();
    expect(screen).toMatch(/import type \{ HomeTrace \} from "\.\/runtime\/trace"/);
  });
});
