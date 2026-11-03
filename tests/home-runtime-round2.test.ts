import { describe, expect, it } from "vitest";
import { starterHome, instance } from "../src/home/model";
import { labHome } from "../src/home/runtime/lab";
import { buildScene } from "../src/home/scene/graph";
import { resolve, apply } from "../src/home/scene/proposal";
import { paintEntries } from "../src/home/runtime/group";
import { buildingLayout, roomOrigin } from "../src/home/camera";
import { focusCamera, fitCamera, includeBounds, roomScale } from "../src/home/runtime/CameraController";
import { roomToScreen, screenToRoom } from "../src/home/scene/camera";
import { roomIds } from "../src/home/catalogMore";
import { housePoint, roomPoint } from "../src/home/scene/types";
import { translatedBounds } from "../src/home/scene/spatial";
import { carryBinding, renderAnchors } from "../src/home/runtime/rigGeometry";

describe("native round 2 regressions", () => {
  it("R1 renders every ground covering before every actor and furniture in every room fixture", () => {
    for (const state of [starterHome(), labHome()]) {
      for (const room of roomIds) state.rooms[room].instances.push(instance(`depth-rug-${room}`, "rug", 10, 10));
      const scene = buildScene(state);
      for (const room of roomIds) {
        const entries = paintEntries(Object.values(scene.rooms[room].entities), scene);
        const ground = entries.map((e, i) => (e.entity.item?.layer === "ground" ? i : -1)).filter((i) => i >= 0);
        const raised = entries
          .map((e, i) => (e.entity.character || e.entity.item?.layer === "furniture" ? i : -1))
          .filter((i) => i >= 0);
        expect(ground.length).toBeGreaterThan(0);
        for (const g of ground) for (const r of raised) expect(g).toBeLessThan(r);
      }
    }
  });
  it("R2 fits all 800 room units in portrait without limiting landscape/iPad close-ups", () => {
    const building = buildingLayout(4);
    for (const view of [
      { width: 390, height: 720 },
      { width: 320, height: 500 },
    ]) {
      for (let i = 0; i < 4; i++) {
        const camera = focusCamera(i, view, building),
          origin = roomOrigin(i, building);
        expect(origin.x * camera.a + camera.tx).toBeCloseTo(0);
        expect((origin.x + 800) * camera.a + camera.tx).toBeCloseTo(view.width);
      }
    }
    expect(roomScale({ width: 1024, height: 644 })).toBeCloseTo(644 / 620);
    expect(roomScale({ width: 768, height: 900 })).toBeCloseTo(900 / 620);
  });
  it("R2 only pans a clipped committed actor, preserving zoom and fully visible drops", () => {
    const building = buildingLayout(4),
      view = { width: 390, height: 720 };
    const camera = focusCamera(0, view, building),
      origin = roomOrigin(0, building);
    const inside = { left: origin.x + 200, top: origin.y + 200, width: 120, height: 224 };
    expect(includeBounds(camera, inside, view, building)).toBe(camera);
    const clipped = { ...inside, left: origin.x + 100 };
    const zoomed = { ...camera, tx: camera.tx - 90 };
    const next = includeBounds(zoomed, clipped, view, building);
    expect(next.a).toBe(camera.a);
    expect(clipped.left * next.a + next.tx).toBeCloseTo(0);
  });
  for (const shifted of [false, true])
    it(`R3 default portrait blanket-centre release lies down${shifted ? " after edge pan" : ""}`, () => {
      const state = starterHome(),
        scene = buildScene(state),
        hero = scene.entities["character/0"];
      const building = buildingLayout(4),
        view = { width: 390, height: 720 };
      const focused = focusCamera(0, view, building);
      const camera = shifted ? { ...focused, tx: focused.tx - 28 } : focused;
      const origin = roomOrigin(0, building),
        offset = housePoint(origin.x, origin.y);
      const target = scene.rooms.home.targets.find(
        (t) => t.owner === "home/item/bed" && t.kind === "socket" && !t.pet
      )!;
      const area = target.activation!;
      const blanket = roomPoint(area.left + area.width * 0.7, area.top + area.height * 0.55);
      // Head grip is released directly on the visible blanket, not at a calculated foot/socket point.
      const grip = renderAnchors(hero).head;
      const finger = roomToScreen(blanket, camera, offset);
      const underFinger = screenToRoom(finger, camera, offset);
      const anchor = roomPoint(underFinger.x - grip.x, underFinger.y - grip.y);
      const binding = carryBinding(hero, grip),
        box = renderAnchors(hero, true).bounds;
      const silhouette = translatedBounds({ ...box, left: box.left + binding.x, top: box.top + binding.y }, anchor);
      const proposal = resolve({ ...scene.rooms.home, entities: scene.entities }, hero, anchor, {
        scale: camera.a,
        release: true,
        contact: underFinger,
        silhouette,
      });
      expect(proposal.kind).toBe("socket");
      expect(proposal.target).toBe(target.id);
      expect(proposal.base).toBe("lie");
      const result = apply(state, proposal);
      expect("state" in result).toBe(true);
      if ("state" in result) expect(result.state.rooms.home.characters[0].pose).toBe("lie");
    });
  it("R7 centers the whole house on both axes in the reserved scene area", () => {
    for (const view of [
      { width: 390, height: 720 },
      { width: 1024, height: 644 },
    ]) {
      const building = buildingLayout(4),
        camera = fitCamera(view, building);
      expect(camera.tx).toBeCloseTo(view.width - camera.tx - building.width * camera.a);
      expect(camera.ty).toBeCloseTo(view.height - camera.ty - building.height * camera.a);
      expect(camera.ty).toBeGreaterThanOrEqual(0);
    }
  });
});
