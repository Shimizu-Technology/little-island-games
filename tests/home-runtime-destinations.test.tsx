import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { Destinations } from "../src/home/runtime/Destinations";
import { labHome } from "../src/home/runtime/lab";
import { withPortions } from "../src/home/runtime/portions";
import { buildScene } from "../src/home/scene/graph";
import { apply } from "../src/home/scene/proposal";
vi.mock("react-native-svg", () => ({ default: "Svg", Path: "Path" }));
vi.mock("react-native", () => ({ Pressable: "Pressable", ScrollView: "ScrollView", Text: "Text", View: "View" }));
vi.mock("react-native-reanimated", () => ({ default: { View: "AnimatedView" }, useAnimatedStyle: () => ({}) }));
vi.mock("../src/home/runtime/EntityArt", () => ({ EntityArt: () => null, artFrame: () => ({ width: 1, height: 1 }) }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
describe("tap tray destinations", () => {
  it("commits an ordinary prop to the recoverable tray through its explicit proposal", async () => {
    const state = labHome(),
      scene = buildScene(state),
      choose = vi.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <Destinations
          scene={scene}
          selected="home/item/cup"
          scale={1}
          bottom={0}
          onChoose={choose}
          onSelect={() => {}}
        />
      );
    });
    renderer.root.findByProps({ accessibilityLabel: "Put in tray" }).props.onPress();
    const proposal = choose.mock.calls[0][0];
    expect(proposal.kind).toBe("staging");
    const result = apply(state, proposal);
    expect("state" in result).toBe(true);
    if ("state" in result) expect(result.state.rooms.home.instances.find((i) => i.id === "cup")?.staged).toBe(true);
    await act(async () => renderer.unmount());
  });
  it.each(["fridge", "sink-counter", "stove"])("S5 a Play tap on %s cannot show a destination or storage panel", async (item) => {
    const state = labHome();
    const fixture = { ...state.rooms.kitchen.instances[0], id: "fixture", item };
    state.rooms.kitchen.instances = [fixture];
    const scene = withPortions(buildScene(state));
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<Destinations scene={scene}
      selected="kitchen/item/fixture" scale={1} bottom={0} onChoose={() => {}} onSelect={() => {}} />); });
    expect(renderer.toJSON()).toBe(null);
    await act(async () => renderer.unmount());
  });
  it("keeps virtual source portions on compatible destinations without offering storage", async () => {
    const state = labHome();
    state.rooms.kitchen.instances.find((i) => i.id === "fridge")!.powered = true;
    const scene = withPortions(buildScene(state));
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <Destinations
          scene={scene}
          selected="kitchen/item/portion-fridge-banana"
          scale={1}
          bottom={0}
          onChoose={() => {}}
          onSelect={() => {}}
        />
      );
    });
    expect(renderer.root.findAllByProps({ accessibilityLabel: "Put in tray" })).toHaveLength(0);
    // Several mouths share a room, so each label also names its owner ("Eat or drink in My room, Pip").
    const eat = renderer.root.findAll((n) => String(n.type) === "Pressable" && String(n.props.accessibilityLabel).startsWith("Eat or drink in My room"));
    expect(eat.length).toBeGreaterThan(0);
    expect(new Set(eat.map((n) => n.props.accessibilityLabel)).size).toBe(eat.length);
    expect(state.rooms.kitchen.instances.some((i) => i.id.startsWith("portion-"))).toBe(false);
    await act(async () => renderer.unmount());
  });
});
