import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { Destinations } from "../src/home/runtime/Destinations";
import { restingVisible } from "../src/home/runtime/group";
import { labHome } from "../src/home/runtime/lab";
import { entityLabels } from "../src/home/scene/labels";
import { buildScene } from "../src/home/scene/graph";
import { instance, starterHome } from "../src/home/model";
vi.mock("react-native-svg", () => ({ default: "Svg", Path: "Path" }));
vi.mock("react-native", () => ({ Pressable: "Pressable", ScrollView: "ScrollView", Text: "Text", View: "View" }));
vi.mock("react-native-reanimated", () => ({ default: { View: "AnimatedView" }, useAnimatedStyle: () => ({}) }));
vi.mock("../src/home/runtime/EntityArt", () => ({ EntityArt: () => null, artFrame: () => ({ width: 1, height: 1 }) }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roomLabels = (state = starterHome()) => {
  const scene = buildScene(state);
  return { scene, labels: entityLabels(Object.values(scene.entities).filter((e) => e.item && restingVisible(e, scene))) };
};
describe("V2 same-name furniture gets distinct accessible names", () => {
  it("numbers the two starter floor cushions in the Tree house left to right", () => {
    const { scene, labels } = roomLabels();
    const cushions = Object.values(scene.entities)
      .filter((e) => e.room === "treehouse" && e.item?.item === "floor-cushion")
      .sort((a, b) => a.contact.x - b.contact.x);
    expect(cushions).toHaveLength(2);
    expect(cushions.map((e) => labels[e.id])).toEqual(["Floor cushion 1 of 2", "Floor cushion 2 of 2"]);
  });
  it("leaves a name that is unique in its room unnumbered, and numbers per room", () => {
    const state = starterHome();
    state.rooms.kitchen.instances.push(instance("lone-cushion", "floor-cushion", 3, 3));
    const { scene, labels } = roomLabels(state);
    const lone = Object.values(scene.entities).find((e) => e.item?.id === "lone-cushion")!;
    expect(labels[lone.id]).toBe("Floor cushion");
  });
  it("gives every entity in a room a different label, and is stable between renders", () => {
    const a = roomLabels(labHome()),
      b = roomLabels(labHome());
    expect(b.labels).toEqual(a.labels);
    const byRoom = new Map<string, string[]>();
    for (const [id, label] of Object.entries(a.labels)) {
      const room = a.scene.entities[id].room;
      byRoom.set(room, [...(byRoom.get(room) ?? []), label]);
    }
    for (const labels of byRoom.values()) expect(new Set(labels).size).toBe(labels.length);
  });
  it("tap destinations tell two stools apart and leave unique destinations plain", async () => {
    const state = starterHome();
    const scene = buildScene(state);
    const traveller = Object.values(scene.entities).find((e) => e.character)!;
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <Destinations scene={scene} selected={traveller.id} designing scale={1} bottom={0} onChoose={() => {}} onSelect={() => {}} />
      );
    });
    const labels = renderer.root
      .findAll((n) => String(n.type) === "Pressable" && typeof n.props.accessibilityLabel === "string")
      .map((n) => n.props.accessibilityLabel as string);
    expect(labels.length).toBeGreaterThan(0);
    expect(new Set(labels).size).toBe(labels.length);
    // Two kitchen stools would both read "Sit in Kitchen"; unique places stay plain.
    expect(labels).toContain("Sit in Kitchen, Stool 1 of 2");
    expect(labels).toContain("Sit in Kitchen, Stool 2 of 2");
    expect(labels).toContain("Lie in Tree house");
    await act(async () => renderer.unmount());
  });
});
