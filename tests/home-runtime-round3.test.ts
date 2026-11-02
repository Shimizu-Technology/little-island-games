import { describe, expect, it } from "vitest";
import { starterHome, instance } from "../src/home/model";
import { buildScene, itemEntity } from "../src/home/scene/graph";
import { roomPoint } from "../src/home/scene/types";
import { translatedBounds, overlaps } from "../src/home/scene/spatial";
import { resolve } from "../src/home/scene/proposal";
import { withPortions, isPortion } from "../src/home/runtime/portions";
import { paintEntries } from "../src/home/runtime/group";
import { prepareHits, pickEntity } from "../src/home/runtime/pick";
import { capabilityOf } from "../src/home/world";

describe("native round 3 regressions", () => {
  it("S1 every visible shelf portion beats the fixture behind it, in both facings", () => {
    for (const mirrored of [false, true]) {
      const world = starterHome();
      const fridge = world.rooms.kitchen.instances.find((i) => i.item === "fridge")!;
      fridge.powered = true; fridge.mirrored = mirrored;
      const scene = withPortions(buildScene(world)), hits = prepareHits(scene).kitchen;
      const portions = Object.values(scene.entities).filter((e) => e.room === "kitchen" && isPortion(e.id));
      expect(portions.length).toBeGreaterThanOrEqual(4);
      for (const e of portions) {
        const bounds = e.bounds;
        const entries = paintEntries(Object.values(scene.rooms.kitchen.entities), scene);
        const source = e.id.includes("portion-starter-fridge") ? scene.entities["kitchen/item/starter-fridge"] : undefined;
        if (source) expect(entries.findIndex((p) => p.entity.id === e.id)).toBeGreaterThan(entries.findIndex((p) => p.entity.id === source.id));
        // The centre and four inset corners of the actual EntityArt frame.
        for (const [u, v] of [[.5,.5],[.25,.25],[.75,.25],[.25,.75],[.75,.75]]) {
          expect(pickEntity(hits, roomPoint(e.contact.x + bounds.left + bounds.width*u,
            e.contact.y + bounds.top + bounds.height*v), .5)).toBe(e.id);
        }
      }
    }
  });
  it.each(["fridge", "stove", "sink-counter"])("S1 %s is a Play fixture", (item) => {
    expect(capabilityOf(item).moveInPlay).toBe(false);
  });
  it("S1 Design furniture proposals cannot overlap another furniture silhouette", () => {
    const world = starterHome(), scene = buildScene(world), index = scene.rooms.kitchen;
    const source = Object.values(index.entities).find((e) => e.item?.item === "fridge")!;
    const sink = Object.values(index.entities).find((e) => e.item?.item === "sink-counter")!;
    const proposal = resolve(index, source, sink.contact, { scale: .5, release: true, avoidFurnitureOverlap: true });
    expect(["floor", "staging"]).toContain(proposal.kind);
    if (proposal.kind === "staging") return; // full kitchen safely uses recoverable staging
    const placed = translatedBounds(source.bounds, proposal.contact);
    for (const other of Object.values(index.entities)) {
      if (other.id === source.id || other.body?.layer !== "furniture" || other.body.small || other.attachment.kind !== "floor") continue;
      expect(overlaps(placed, translatedBounds(other.bounds, other.contact))).toBe(false);
    }
  });
  it("S4 floor furniture paints in ground-anchor order for every nonoverlapping pair", () => {
    // Exhaust the grid rows and mixed footprint sizes, including the old inversion:
    // a deep table at a rear anchor versus a shallow fridge at a nearer anchor.
    const scene = buildScene(starterHome());
    for (let y = 0; y < 12; y++) for (let y2 = 0; y2 < 12; y2++) {
      for (const item of ["fridge", "kitchen-table", "stool", "bed"]) {
        const a = itemEntity("home", instance("a", item, 2, y));
        const b = itemEntity("home", instance("b", "stool", 12, y2));
        const entries = paintEntries([a,b], scene).filter((e) => !e.front);
        if (a.contact.y === b.contact.y) continue;
        expect(entries[1].entity.contact.y).toBe(Math.max(a.contact.y, b.contact.y));
      }
    }
  });
  it("S6 the starter Islander is clear of the toy chest", () => {
    const scene = buildScene(starterHome()), actor = scene.entities["character/0"];
    for (const e of Object.values(scene.rooms.home.entities)) {
      if (e.item?.item !== "toy-box") continue;
      expect(overlaps(translatedBounds(actor.bounds, actor.contact), translatedBounds(e.bounds, e.contact)), e.id).toBe(false);
    }
  });
});
