import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { layoutToken } from "../src/home/runtime/layout";
import { SettleArt } from "../src/home/runtime/SettleArt";
import { HomeChrome } from "../src/home/runtime/HomeChrome";
import { HomePanels } from "../src/home/runtime/HomePanels";
import { buildScene } from "../src/home/scene/graph";
import { labHome } from "../src/home/runtime/lab";
import type { Interaction } from "../src/home/runtime/useInteraction";
vi.mock("react-native", () => ({
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
  StyleSheet: { create: (v: unknown) => v },
}));
vi.mock("react-native-svg", () => ({ default: "Svg", Circle: "Circle", Path: "Path" }));
vi.mock("react-native-reanimated", () => ({
  default: { View: "AnimatedView" },
  useAnimatedStyle: (fn: () => unknown) => ({ evaluate: fn }),
}));
vi.mock("../src/home/runtime/CarriedCharacter", () => ({ CarriedCharacter: () => <div /> }));
vi.mock("../src/home/runtime/EntityArt", async () => ({
  EntityArt: () => <div />,
  artFrame: (entity: import("../src/home/scene/types").SceneEntity) => entity.bounds,
}));
vi.mock("../src/home/characterRenderer", () => ({ HomeCharacter: () => <div /> }));
vi.mock("../src/home/art/Items", () => ({ ItemArt: () => <div /> }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
describe("round 2 pose and chrome", () => {
  it("R4 starts the pose blend at release and keeps one opaque actor through delayed acknowledgment and pause", async () => {
    const source = buildScene(labHome()).entities["character/0"];
    const destination = { ...source, base: "lie" as const };
    const slot = { phase: "settling", settleAt: 1000, committed: true, pausedElapsed: 0, proposal: { base: "lie", facing: "front" } },
      clock = { value: 1000 };
    const interaction = { slots: { value: [slot] }, clock, poseLayouts: { value: { 0: layoutToken(destination) } } } as unknown as Interaction;
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(
        <SettleArt source={source} destination={destination} interaction={interaction} index={0} reduced={false} />
      );
    });
    const views = tree.root.findAllByType("AnimatedView" as never);
    const evaluate = () => ({ opacity: views.reduce((sum, v) => sum + v.props.style[1].evaluate().opacity, 0) });
    for (let elapsed = 0; elapsed <= 700; elapsed++) {
      clock.value = 1000 + elapsed;
      expect(evaluate().opacity).toBe(1);
    }
    expect(views[0].props.style[1].evaluate().opacity).toBe(0);
    expect(views.slice(1).filter((v) => v.props.style[1].evaluate().opacity === 1)).toHaveLength(1);
    expect(views[0].props.style[1].evaluate().transform[2].rotate).toBe("-90deg");
    slot.phase = "pending";
    slot.pausedElapsed = 170;
    expect(evaluate().opacity).toBe(1);
    expect(tree.root.findAllByType("AnimatedView" as never)).toHaveLength(9);
    await act(async () => tree.unmount());
  });
  it("R5 has one reserved bottom bar with Whole house first; zoom and friends are explicit", async () => {
    const onRoom = vi.fn(),
      onFriends = vi.fn();
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(
        <HomeChrome
          room="home"
          overview={false}
          designing={false}
          canUndo
          canRedo={false}
          top={0}
          bottom={0}
          onMore={() => {}}
          onHeaderLayout={() => {}}
          onBack={() => {}}
          onUndo={() => {}}
          onRedo={() => {}}
          onFind={() => {}}
          onFriends={onFriends}
          onOverview={() => {}}
          onDesign={() => {}}
          onRoom={onRoom}
        />
      );
    });
    const bar = tree.root.findByProps({ testID: "home-bottom-bar" });
    expect(bar.findAllByType("Pressable" as never)[0].props.accessibilityLabel).toBe("Whole house");
    expect(tree.root.findAllByProps({ accessibilityLabel: "Zoom in" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ accessibilityLabel: "Bring friends here" })).toHaveLength(0);
    const kitchen = tree.root.findByProps({ accessibilityLabel: "Go to Kitchen" });
    kitchen.props.onPress();
    expect(onRoom).toHaveBeenCalledWith("kitchen");
    expect(onFriends).not.toHaveBeenCalled();
    kitchen.props.onLongPress();
    expect(onFriends).toHaveBeenCalledOnce();
    await act(async () => tree.unmount());
  });
  it("R6 opens a clearly labelled pictorial friend picker only when explicitly requested", async () => {
    const onBring = vi.fn();
    let tree!: TestRenderer.ReactTestRenderer;
    const props = {
      scene: buildScene(labHome()),
      more: false,
      friends: false,
      bottom: 60,
      onClose: () => {},
      onFriends: () => {},
      onZoom: () => {},
      onBring,
    };
    await act(async () => {
      tree = TestRenderer.create(<HomePanels {...props} />);
    });
    expect(tree.toJSON()).toBeNull();
    await act(async () => tree.update(<HomePanels {...props} friends />));
    const button = tree.root.findByProps({ accessibilityLabel: "Bring Islander here" });
    button.props.onPress();
    expect(onBring).toHaveBeenCalledWith("character/0", 0);
    expect(JSON.stringify(tree.toJSON())).toContain("↓ here");
    await act(async () => tree.unmount());
  });
});
