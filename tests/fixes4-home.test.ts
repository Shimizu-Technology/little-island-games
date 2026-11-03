import { describe, expect, it } from "vitest";
import nativeFixture from "./fixtures/fixes4-home.json";
import { buildScene, translatedBounds } from "../src/home/scene/graph";
import { apply, resolve } from "../src/home/scene/proposal";
import { idleController, transition } from "../src/home/scene/controller";
import { housePoint, roomPoint, screenPoint } from "../src/home/scene/types";
import { roomToScreen } from "../src/home/scene/camera";
import type { HomeStateV2 } from "../src/home/model";
import { editHistory } from "../src/home/useHomeStore";
const fixture = () => structuredClone(nativeFixture) as unknown as HomeStateV2;
describe("Q3 native release regressions with the QA saved room layout", () => {
  it("cushion 2: (235,315) → (290,315) stays right of x11/y9, previews and commits x14/y9, with exact Undo", () => {
    const world = fixture(), scene = buildScene(world);
    // This is the LIVE controller's index: global identities for carried groups.
    // A room-only resolver test missed the invisible furniture from other rooms.
    const index = { ...scene.rooms.treehouse, entities: scene.entities };
    const entity = scene.entities["treehouse/item/starter-floor-cushion-2"];
    expect(entity.item).toMatchObject({ x: 11, y: 9 });
    const origin = housePoint(20, 120), scale = 402 / 800;
    const camera = { a: scale, b: 0, c: 0, d: scale, tx: 235 - (20 + entity.contact.x) * scale, ty: 315 - (120 + entity.contact.y) * scale };
    const down = transition(idleController, { type: "down", pointer: 1, entity: entity.id, contact: entity.contact, point: screenPoint(235,315), now: 0 }, camera, origin);
    const move = transition(down.state, { type: "move", pointer: 1, point: screenPoint(290,315) }, camera, origin);
    const drag = move.effects.find(e => e.type === "drag")!;
    if (drag.type !== "drag") throw Error("No drag");
    expect(roomToScreen(drag.anchor, camera, origin).x).toBeCloseTo(290);
    expect(roomToScreen(drag.anchor, camera, origin).y).toBeCloseTo(315);
    const preview = resolve(index, entity, drag.anchor, { scale, avoidFurnitureOverlap: true });
    expect(preview.cell).toEqual({ x: 14, y: 9 }); // old runtime: x3/y10, reproduced from this fixture
    expect(preview.contact.x).toBeGreaterThan(entity.contact.x);
    const up = transition(move.state, { type: "up", pointer: 1, now: 1100, proposal: preview }, camera, origin);
    expect(up.effects).toContainEqual({ type: "commit", entity: entity.id, proposal: preview });
    const applied = apply(world, preview);
    if ("stale" in applied) throw Error("Rejected drop");
    expect(applied.state.rooms.treehouse.instances.find(i=>i.id===entity.item!.id)).toMatchObject({x:14,y:9});
    const history = { present: applied.state, past: [world], future: [] };
    expect(editHistory(history, {type:"undo"}, {}).present).toEqual(world);
  });
  it("Islander: (140,565) → (195,571) over the rug cannot be captured by a blanket touching only her upper body", () => {
    const world=fixture();
    for(const room of Object.values(world.rooms))room.characters=room.characters.filter(c=>c.slot!==0);
    // Standing feet near the rug; screen origin is derived from the recorded
    // down contact. The 55pt/6pt native path is converted at the recorded .5025 scale.
    world.rooms.home.characters.push({slot:0,anchor:"floor",pose:"stand",x:6,y:10,at:roomPoint(279,530)});
    const scene=buildScene(world), index={...scene.rooms.home,entities:scene.entities}, actor=scene.entities["character/0"];
    const scale=402/800,origin=housePoint(20,700),camera={a:scale,b:0,c:0,d:scale,tx:140-(20+279)*scale,ty:565-(700+530)*scale};
    const down=transition(idleController,{type:"down",pointer:1,entity:actor.id,contact:actor.contact,point:screenPoint(140,565),now:0},camera,origin);
    const move=transition(down.state,{type:"move",pointer:1,point:screenPoint(195,571)},camera,origin);
    const drag=move.effects.find(e=>e.type==="drag")!;
    if(drag.type!=="drag")throw Error("No drag");
    const silhouette=translatedBounds(actor.bounds,drag.anchor),bed=index.targets.find(t=>t.base==="lie"&&!t.pet)!;
    expect(silhouette.left).toBeLessThan(bed.activation!.left+bed.activation!.width);
    expect(drag.anchor.y).toBeGreaterThan(bed.activation!.top+bed.activation!.height);
    const pending=resolve(index,actor,drag.anchor,{scale,silhouette,contact:drag.anchor,now:0,previous:resolve(index,actor,bed.contact,{scale,release:true})});
    const preview=resolve(index,actor,drag.anchor,{scale,silhouette,contact:drag.anchor,now:80,previous:pending});
    expect(preview.kind).toBe("floor");
    expect(preview.target).toBeUndefined();
    expect(Math.hypot(preview.contact.x-drag.anchor.x,preview.contact.y-drag.anchor.y)).toBeLessThan(10);
    const result=apply(world,preview);
    if("stale" in result)throw Error("Rejected rug");
    expect(result.state.rooms.home.characters.find(c=>c.slot===0)?.at).toEqual(preview.contact);
    const rug=index.targets.find(t=>t.owner==="home/item/rug"&&!t.pet)!;
    expect(resolve(index,actor,rug.contact,{scale,release:true}).target).toBe(rug.id);
  });
});
