import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { SettleArt } from "../src/home/runtime/SettleArt";
import { labHome } from "../src/home/runtime/lab";
import { buildScene } from "../src/home/scene/graph";
import { settleProgress } from "../src/home/runtime/settle";
import { poseHandoff, supportEntry } from "../src/home/runtime/poseHandoff";
import { anchorsFor } from "../src/home/scene/species";
import { carryBinding, renderAnchors, limbBottom } from "../src/home/runtime/rigGeometry";
import { artFrame } from "../src/home/runtime/EntityArt";
import { paintedBounds } from "../src/home/art/silhouettes";
import type { Interaction } from "../src/home/runtime/useInteraction";
vi.mock("react-native-svg",()=>({G:"G"}));
vi.mock("react-native", () => ({ View: "View" }));
vi.mock("react-native-reanimated", () => ({ default: { View: "AnimatedView", createAnimatedComponent:()=>"AnimatedGroup" }, useAnimatedProps:(fn:()=>unknown)=>({evaluate:fn}), useSharedValue:(v:any)=>React.useRef({value:v,set(n:any){this.value=n;},get(){return this.value;}}).current,
 useAnimatedReaction:()=>{},runOnJS:(fn:any)=>fn,runOnUI:(fn:any)=>fn,useFrameCallback:()=>React.useRef({setActive:()=>{}}).current,
 useAnimatedStyle: (fn: () => unknown) => ({ evaluate: fn }), useDerivedValue: (fn: () => unknown) => ({ get value() { return fn(); } }) }));
vi.mock("../src/home/runtime/EntityArt", async () => {
 // Keep geometry independent of native SVG rendering.
 const geometry = await import("../src/home/runtime/rigGeometry");
 return { EntityArt: () => null, artFrame: (e: any) => e.character ? geometry.renderAnchors(e).bounds :
   { left: -e.bounds.width / 2, top: -e.bounds.width * .85, width: e.bounds.width, height: e.bounds.width } };
});
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const journeys = [ ["bed", "lie"], ["chair", "sit"], ["tub", "bathe"], ["rug", "sit"], ["floor", "stand"] ] as const;
describe("round5 opaque pose handoff", () => {
 it.each(journeys.flatMap(([id, base]) => [false, true].map(reduced => ({ id, base, reduced }))))(
  "$id reduced=$reduced: rendered carry and destination alpha are binary at every settle sample", async ({ id, base, reduced }) => {
   const scene = buildScene(labHome()), source = scene.entities["character/0"], clock = { value: 1000 };
   const owner = Object.values(scene.entities).find(e => e.item?.id === id);
   const target = Object.values(scene.rooms).flatMap(r => r.targets).find(t => t.owner === owner?.id && t.kind === "socket" && t.base === base);
   const contact = target?.contact ?? { x: 300, y: 480 }, frame = owner && artFrame(owner);
   const hull = owner && (paintedBounds(owner) ?? { left: owner.contact.x + frame!.left, top: owner.contact.y + frame!.top, width: frame!.width, height: frame!.height });
   const support = hull && { ...hull, base: hull.top + hull.height };
   const slot = { phase: "settling", settleAt: 1000, releaseX: contact.x, releaseY: contact.y + 60,
     targetX: contact.x, targetY: contact.y, proposal: { base, facing: target?.facing ?? "front", attachment: owner ? { kind: "socket", item: owner.id } : { kind: "floor" } } };
   // Every mounted pose has its native layout (R4 gates the carry on it).
   const interaction = { slots: { value: [slot] }, clock, acknowledgePose: () => {}, poseLayouts: { value: new Proxy({}, { get: (_t: object, k: string | symbol) => String(k).split(':').slice(1).join(':') }) } } as unknown as Interaction;
   let tree!: TestRenderer.ReactTestRenderer;
   await act(async () => { tree = TestRenderer.create(<SettleArt source={source} interaction={interaction} index={0} reduced={reduced}
     supportPlanes={owner && support ? { [owner.id]: support } : undefined}/>); });
   const layers = tree.root.findAll(n => String(n.type) === "AnimatedView" && n.props.style?.[1]?.evaluate);
   // Carry root + 9 carry frames + 8 target variants; evaluate actual styles.
   for (let ms = 0; ms <= 600; ms += 4) {
     clock.value = 1000 + ms;
     const values = layers.map(n => n.props.style[1].evaluate().opacity);
     expect(values.every(alpha => alpha === 0 || alpha === 1), `${id}@${ms}: ${values}`).toBe(true);
     expect(values[0] + values.slice(-8).reduce((a, b) => a + b, 0)).toBe(1);
   }
   await act(async () => tree.unmount());
  });
 it.each([0, 1, 2] as const)("slot %s: support footprint contact has no limbs below the visible base", slot => {
   const scene = buildScene(labHome()), source = scene.entities[`character/${slot}`];
   for (const [id, base] of journeys.slice(0, 3)) {
     if (slot === 2 && base === "bathe") continue;
     const owner = Object.values(scene.entities).find(e => e.item?.id === id)!;
     const target = Object.values(scene.rooms).flatMap(r => r.targets).find(t => t.owner === owner.id && t.kind === "socket" && t.base === base && !t.pet)!;
     const frame = artFrame(owner), hull = paintedBounds(owner) ?? { left: owner.contact.x + frame.left, top: owner.contact.y + frame.top, width: frame.width, height: frame.height };
     const support = { ...hull, base: hull.top + hull.height };
     const anchors = anchorsFor(slot, base, target.facing ?? "front"), carry = renderAnchors(source, true), binding = carryBinding(source, { x: 0, y: 0 });
     for (const offset of [{ x: 0, y: 60 }, { x: -120, y: 0 }, { x: 120, y: -100 }, { x: 0, y: 0 }]) {
       const from = { x: target.contact.x + offset.x, y: target.contact.y + offset.y }, to = target.contact;
       for (const reduced of [false, true]) for (let ms = 0; ms <= 300; ms += 4) {
         const p = settleProgress(ms, reduced), sample = poseHandoff(p, from, to,
           { x: carry.head.x + binding.x, y: carry.head.y + binding.y }, anchors.head, limbBottom({ ...source, base, facing: target.facing ?? "front" }), base === "lie" ? -90 : 0, support);
         if (p >= supportEntry(from, to, support)) {
           expect(sample.carryOpacity).toBe(0); expect(sample.rotation).toBe(0);
           const lowest = from.y + (to.y - from.y) * p + sample.y + limbBottom({ ...source, base, facing: target.facing ?? "front" });
           expect(lowest, `${id} slot${slot}@${ms}`).toBeLessThanOrEqual(support.base + .001);
         }
         if (p === 1) expect(sample.y, `${id} slot${slot} resting handoff`).toBeCloseTo(0);
       }
     }
   }
 });
});
