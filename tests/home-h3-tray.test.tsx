import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { Destinations } from "../src/home/runtime/Destinations";
import { trayLift } from "../src/home/runtime/PosePicture";
import { labHome } from "../src/home/runtime/lab";
import { buildScene } from "../src/home/scene/graph";
vi.mock("react-native-svg", () => ({ default: "Svg", Path: "Path" }));
vi.mock("react-native", () => ({ Pressable: "Pressable", ScrollView: "ScrollView", Text: "Text", View: "View" }));
vi.mock("react-native-reanimated", () => ({ default: { View: "AnimatedView" }, useAnimatedStyle: (fn: () => unknown) => fn() }));
vi.mock("../src/home/runtime/EntityArt", () => ({ EntityArt: "EntityArt", artFrame: () => ({ left: -20, top: -60, width: 40, height: 60 }) }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const textOf = (node: TestRenderer.ReactTestInstance): string =>
  node.children.map((c) => (typeof c === "string" ? c : textOf(c))).join("");
describe("HM-17 the tray shows pictures and never covers the object", () => {
  it("each choice draws the destination with the friend already in the resolved pose, and no symbols", async () => {
    const state = labHome(), scene = buildScene(state);
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Destinations scene={scene} selected="character/0" scale={1} bottom={0} onChoose={() => {}} onSelect={() => {}} />);
    });
    const choices = renderer.root.findAll((n) => (n.type as unknown) === "Pressable" && /^(Sit|Lie|Bathe|Give|Eat|Put on)/.test(n.props.accessibilityLabel ?? ""));
    expect(choices.length).toBeGreaterThan(0);
    for (const choice of choices) {
      expect(textOf(choice)).toBe("");
      const art = choice.findAll((n) => (n.type as unknown) === "EntityArt");
      const verb = choice.props.accessibilityLabel.split(" ")[0];
      const friend = art.find((n) => n.props.entity.id === "character/0");
      expect(friend, choice.props.accessibilityLabel).toBeDefined();
      if (verb === "Sit") expect(friend!.props.entity.base).toBe("sit");
      if (verb === "Lie") expect(friend!.props.entity.base).toBe("lie");
      // The place itself is in the picture too.
      expect(art.length).toBeGreaterThanOrEqual(2);
    }
    expect(textOf(renderer.root)).not.toMatch(/[✋◡◠▱▣]/);
    await act(async () => renderer.unmount());
  });
  it("a prop's choices show it in the friend's hand or on the table", async () => {
    const state = labHome(), scene = buildScene(state);
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Destinations scene={scene} selected="home/item/cup" scale={1} bottom={0} onChoose={() => {}} onSelect={() => {}} />);
    });
    const give = renderer.root.findAll((n) => (n.type as unknown) === "Pressable" && /^(Give|Put on|Eat)/.test(n.props.accessibilityLabel ?? ""));
    expect(give.length).toBeGreaterThan(0);
    for (const choice of give) expect(choice.findAll((n) => (n.type as unknown) === "EntityArt").some((n) => n.props.entity.id === "home/item/cup")).toBe(true);
    await act(async () => renderer.unmount());
  });
  it("the tray moves up off the thing, wherever the thing is on screen", () => {
    const canvasTop = 100, canvasBottom = 760, tray = { top: canvasBottom - 84, height: 76 };
    let lifted = 0;
    for (let top = canvasTop; top <= canvasBottom - 40; top += 4) {
      for (const height of [40, 120, 260, 400]) {
        const thing = { top, bottom: Math.min(canvasBottom, top + height) };
        const shift = trayLift(tray, thing, canvasTop);
        expect(shift).toBeLessThanOrEqual(0);
        const at = tray.top + shift;
        expect(at).toBeGreaterThanOrEqual(canvasTop);
        const roomAbove = thing.top - canvasTop - 4 >= tray.height + 8;
        const roomBelow = canvasBottom - thing.bottom >= tray.height + 16;
        if (roomAbove || roomBelow) expect(at + tray.height <= thing.top || at >= thing.bottom, `${top}/${height}`).toBe(true);
        if (shift < 0) lifted++;
      }
    }
    expect(lifted).toBeGreaterThan(0);
    // Nothing near: the tray stays where it always is.
    expect(trayLift(tray, { top: 120, bottom: 300 }, canvasTop)).toBe(0);
  });
  it("the rendered tray reads the camera for its lift", async () => {
    const state = labHome(), scene = buildScene(state);
    const { buildingLayout } = await import("../src/home/camera");
    const camera = { value: { a: 0.4875, b: 0, c: 0, d: 0.4875, tx: -9.75, ty: -500 } } as never;
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Destinations scene={scene} selected="character/0" scale={1} bottom={70} camera={camera}
        building={buildingLayout(4, false)} canvasTop={100} windowHeight={844} onChoose={() => {}} onSelect={() => {}} />);
    });
    const tray = renderer.root.findByProps({ testID: "tap-destinations" });
    const shift = tray.props.style[1].transform[0].translateY;
    expect(typeof shift).toBe("number");
    await act(async () => renderer.unmount());
  });
});
