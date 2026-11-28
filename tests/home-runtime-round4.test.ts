import { describe, expect, it } from "vitest";
import { starterHome, migrateHome, validHome } from "../src/home/model";
import { buildScene, createSceneBuilder } from "../src/home/scene/graph";
import { overlaps } from "../src/home/scene/spatial";
import { paintedBounds } from "../src/home/art/silhouettes";
import { buildingLayout } from "../src/home/camera";
import { poseToken, poseVariants } from "../src/home/runtime/poseBank";
describe("runtime round4", () => {
 it("T3 every room's starter furniture silhouettes have clearance", () => {
  const world=starterHome(); expect(validHome(world)).toBe(true);
  const scene=buildScene(world);
  for(const room of Object.values(scene.rooms)) {
   const furniture=Object.values(room.entities).filter(e=>e.attachment.kind==='floor' && e.body?.layer==='furniture' && !e.body.small);
   for(const entity of furniture) expect(paintedBounds(entity),entity.id).toBeDefined();
   for(let i=0;i<furniture.length;i++)for(let j=i+1;j<furniture.length;j++)
    expect(overlaps(paintedBounds(furniture[i])!,paintedBounds(furniture[j])!),`${furniture[i].id} / ${furniture[j].id}`).toBe(false);
  }
 });
 it("T3 changing starters never migrates an already saved kitchen", () => {
  const saved=starterHome();const positions:Record<string,[number,number]>={fridge:[6,0],'sink-counter':[11,0],stove:[2,0],'fruit-bowl':[12,6],'kitchen-table':[11,6],stool:[9,9]};
  saved.rooms.kitchen.instances=saved.rooms.kitchen.instances.map(i=>i.in?{...i,x:positions.fridge[0],y:positions.fridge[1]}:({...i,x:i.id.endsWith('-6')?14:positions[i.item][0],y:i.id.endsWith('-6')?9:positions[i.item][1]}));
  expect(validHome(saved)).toBe(true);const original=JSON.stringify(saved);
  expect(migrateHome(saved)).toEqual(saved);expect(JSON.stringify(saved)).toBe(original);
 });
 it("T2 caches unrelated immutable rooms while keeping exact current proposal revisions", () => {
  const build=createSceneBuilder();const world=starterHome(), first=build(world);
  const next=structuredClone(world);next.rooms.home.characters[0].x=(next.rooms.home.characters[0].x ?? 8)+1;
  const scene=build(next);
  expect(scene.rooms.kitchen.floor).toBe(first.rooms.kitchen.floor);
  expect(scene.rooms.kitchen.entities).toBe(first.rooms.kitchen.entities);
  expect(scene.rooms.home.entities).not.toBe(first.rooms.home.entities);
  for(const room of Object.values(scene.rooms))expect(room.revision).toBe(scene.revision);
  expect(first.entities['character/0'].contact).not.toEqual(scene.entities['character/0'].contact);
 });
 it("T1 pre-mounts every supported pose and facing without depending on committed positions", () => {
  const source=buildScene(starterHome()).entities['character/0'];
  expect(poseVariants(source).map(v=>poseToken(v.base,v.facing,v.action))).toEqual([
   'stand:front:none','stand:left:none','sit:front:none','sit:left:none',
   'lie:front:none','lie:left:none','bathe:front:none','bathe:left:none']);
 });
 it("T6 the portrait inter-floor band occupies about3% of an874pt phone", () => {
  const house=buildingLayout(4);const band=(house.roomHeight-525+house.gap)*402/800;
  expect(band/874).toBeGreaterThan(.02);expect(band/874).toBeLessThan(.04);
 });
});
