import { describe, expect, it } from "vitest";
import { labHome } from "../src/home/runtime/lab";
import { buildScene } from "../src/home/scene/graph";
import { resolve, apply } from "../src/home/scene/proposal";
import { anchorsFor } from "../src/home/scene/species";
import { carryBinding, renderAnchors, carrySample } from "../src/home/runtime/rigGeometry";
import { withPortions } from "../src/home/runtime/portions";
import { prepareHits } from "../src/home/runtime/pick";
import { restingVisible } from "../src/home/runtime/group";
import { instance, validHome } from "../src/home/model";
import { roomPoint } from "../src/home/scene/types";

describe("combined CORE/RIG runtime boundary", () => {
  it("binds head pickup to the same visible point when a lying actor becomes upright carry", () => {
    const actor = { ...buildScene(labHome()).entities["character/0"], base: "lie" as const };
    const head = renderAnchors(actor).head,
      binding = carryBinding(actor, head),
      carry = renderAnchors(actor, true);
    expect(binding.marker).toBe("head");
    expect(carry.head.x + binding.x).toBeCloseTo(head.x);
    expect(carry.head.y + binding.y).toBeCloseTo(head.y);
    expect(renderAnchors(actor, true).bounds.height).toBeGreaterThan(renderAnchors(actor, true).bounds.width);
    expect(anchorsFor(0, "stand", "right", "hold").head).toEqual(anchorsFor(0, "stand", "right").head);
  });
  it("provides real edible dispenser metadata to the shared resolver without inserting into the world", () => {
    const state = labHome();
    state.rooms.kitchen.instances.find((i) => i.id === "fridge")!.powered = true;
    const scene = withPortions(buildScene(state));
    const portion = scene.entities["kitchen/item/portion-fridge-banana"];
    expect(portion.body?.edible).toBe("food");
    const target = scene.rooms.home.targets.find((t) => t.owner === "character/0" && t.kind === "mouth")!;
    const proposal = resolve(scene.rooms.home, portion, target.contact, { scale: 1, release: true, target: target.id });
    expect(proposal.kind).toBe("mouth");
    expect(proposal.consume).toBe("food");
    expect(state.rooms.kitchen.instances.some((i) => i.id.startsWith("portion-"))).toBe(false);
  });
  it("keeps stored descendants out of resting art and hit testing", () => {
    const scene = buildScene(labHome()),
      lamp = scene.entities["home/item/lamp"],
      table = scene.entities["home/item/table"];
    lamp.attachment = { kind: "container", parent: table.id };
    lamp.parent = table.id;
    expect(restingVisible(lamp, scene)).toBe(false);
    expect(prepareHits(scene).home.some((p) => p.id === lamp.id)).toBe(false);
    expect(restingVisible(table, scene)).toBe(true);
  });
  it("uses bounded authored lag frames with zero drift at rest", () => {
    expect(carrySample(0)).toEqual({ tilt: 0, limbLag: 0 });
    expect(carrySample(-4)).toEqual({ tilt: 6, limbLag: 1 });
    expect(carrySample(4)).toEqual({ tilt: -6, limbLag: 1 });
    const actor = buildScene(labHome()).entities["character/0"];
    const before = actor.contact;
    renderAnchors(actor, true, 6, 1);
    expect(actor.contact).toEqual(before);
    expect(before).toEqual(roomPoint(before.x, before.y));
  });
  it("transfers the complete held group and returns exact renamed identities", () => {
    const state = labHome();
    state.rooms.home.characters[0].holding = "cup";
    state.rooms.kitchen.instances.push(instance("cup", "teddy", 10, 10));
    expect(validHome(state)).toBe(true);
    const scene = buildScene(state),
      hero = scene.entities["character/0"];
    const proposal = resolve({ ...scene.rooms.kitchen, entities: scene.entities }, hero, roomPoint(600, 500), {
      scale: 1,
      floorOnly: true,
      release: true,
    });
    expect(proposal.moves.some((move) => move.id === "home/item/cup")).toBe(true);
    const result = apply(state, proposal);
    expect("state" in result).toBe(true);
    if ("state" in result) {
      expect(result.identities["home/item/cup"]).toBe("kitchen/item/carry-1-cup");
      const next = buildScene(result.state);
      expect(next.entities[result.identities["home/item/cup"]].parent).toBe("character/0");
      expect(next.entities["kitchen/item/cup"].item?.item).toBe("teddy");
    }
  });
  it("stages by explicit intent even with legal floor, keeping visible attachments in its overlay", () => {
    const state = labHome();
    state.rooms.home.characters[0].holding = "cup";
    const scene = buildScene(state),
      hero = scene.entities["character/0"];
    const proposal = resolve({ ...scene.rooms.home, entities: scene.entities }, hero, hero.contact, {
      scale: 1,
      intent: "staging",
      release: true,
    });
    expect(proposal.kind).toBe("staging");
    const result = apply(state, proposal);
    expect("state" in result).toBe(true);
    if ("state" in result) {
      const next = buildScene(result.state),
        cup = next.entities["home/item/cup"];
      expect(restingVisible(cup, next)).toBe(false);
      expect(restingVisible(cup, next, hero.id)).toBe(true);
    }
  });
});
