import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { poseAckKey } from "../src/home/runtime/poseAck";
import { poseToken } from "../src/home/runtime/poseBank";
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
  Platform: { OS: "ios" },
  useWindowDimensions: () => ({ width: 393, height: 852, fontScale: 1 }),
  StyleSheet: {
    create: (v: unknown) => v,
    flatten: (s: unknown) => (Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean)) : s || {}),
  },
}));
vi.mock("react-native-svg", () => ({ default: "Svg", Circle: "Circle", Path: "Path" }));
vi.mock("react-native-reanimated", () => ({
  default: { View: "AnimatedView", createAnimatedComponent: (c: unknown) => c },
  ReduceMotion: { System: "system" },
  useSharedValue: (v: number) => ({ get: () => v, set: () => {} }),
  useAnimatedStyle: (fn: () => unknown) => ({ evaluate: fn }),
  useDerivedValue: (fn: () => unknown) => ({ get value() { return fn(); } }),
  withTiming: (v: number) => v,
}));
vi.mock("expo-haptics", () => ({ impactAsync: () => Promise.resolve(), ImpactFeedbackStyle: { Light: "light" } }));
vi.mock("../src/components/motion", () => ({ useReducedMotion: () => false }));
vi.mock("../src/ui/fonts", () => ({ useNunitoLoaded: () => false }));
vi.mock("../src/ui/icons", () => {
  const glyph = (name: string) => {
    const MockGlyph = () => React.createElement("Glyph", { name });
    MockGlyph.displayName = name;
    return MockGlyph;
  };
  return Object.fromEntries(
    [
      "ArrowClockwise",
      "ArrowCounterClockwise",
      "ArrowLeft",
      "CaretLeft",
      "CaretRight",
      "Check",
      "CoatHanger",
      "DotsThree",
      "PencilSimple",
      "Star",
      "UsersThree",
      "X",
    ].map((n) => [n, glyph(n)])
  );
});
vi.mock("../src/home/runtime/CarriedCharacter", () => ({ CarriedCharacter: () => <div /> }));
vi.mock("../src/home/runtime/EntityArt", async () => ({
  EntityArt: () => <div />,
  artFrame: (entity: import("../src/home/scene/types").SceneEntity) => entity.bounds,
}));
vi.mock("../src/home/characterRenderer", () => ({ HomeCharacter: () => <div /> }));
vi.mock("../src/home/art/Items", () => ({ ItemArt: () => <div /> }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
describe("round 2 pose and chrome", () => {
  it("R5 swaps opaque poses during travel and keeps one opaque actor through delayed acknowledgment and pause", async () => {
    const source = buildScene(labHome()).entities["character/0"];
    const destination = { ...source, base: "lie" as const };
    const slot = { phase: "settling", settleAt: 1000, committed: true, pausedElapsed: 0, proposal: { base: "lie", facing: "front" } },
      clock = { value: 1000 };
    // R4/F1: the carry hands off once this actor's requested pose has its own acknowledgement.
    const lie = poseToken("lie", "front", destination.action);
    const interaction = { slots: { value: [slot] }, clock, poseLayouts: { value: { [poseAckKey(source.id, lie)]: 1 } } } as unknown as Interaction;
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
      for (const view of views) expect([0, 1]).toContain(view.props.style[1].evaluate().opacity);
    }
    expect(views[0].props.style[1].evaluate().opacity).toBe(0);
    expect(views.slice(1).filter((v) => v.props.style[1].evaluate().opacity === 1)).toHaveLength(1);
    expect(views[0].props.style[1].evaluate().transform[2].rotate).toBe("0deg");
    expect(views.slice(1).find((v) => v.props.style[1].evaluate().opacity === 1)!.props.style[1].evaluate().transform[2].rotate).toBe("0deg");
    slot.phase = "pending";
    slot.pausedElapsed = 170;
    expect(evaluate().opacity).toBe(1);
    expect(tree.root.findAllByType("AnimatedView" as never)).toHaveLength(9);
    await act(async () => tree.unmount());
  });
  it("R5 has one reserved bottom bar with Closet, Badges, Decorate and room arrow navigation", async () => {
    const onRoom = vi.fn(),
      onCloset = vi.fn();
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
          onFriends={() => {}}
          onOverview={() => {}}
          onDesign={() => {}}
          onRoom={onRoom}
          onCloset={onCloset}
          onBadges={() => {}}
        />
      );
    });
    const bar = tree.root.findByProps({ testID: "home-bottom-bar" });
    expect(bar.findAllByType("Pressable" as never).map((n) => n.props.accessibilityLabel)).toEqual([
      "Closet",
      "Badges",
      "Decorate",
    ]);
    expect(tree.root.findAllByProps({ accessibilityLabel: "Zoom in" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ accessibilityLabel: "Bring friends here" })).toHaveLength(0);
    tree.root.findByProps({ testID: "home-room-next" }).props.onPress();
    expect(onRoom).toHaveBeenCalledWith("kitchen");
    bar.findByProps({ testID: "home-closet-button" }).props.onPress();
    expect(onCloset).toHaveBeenCalledOnce();
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
    // HR-01: the friend picker is now the friends drawer (tests/home-h3-drawer.test.tsx); this panel stays More only.
    await act(async () => tree.update(<HomePanels {...props} friends />));
    expect(tree.toJSON()).toBeNull();
    await act(async () => tree.update(<HomePanels {...props} more />));
    tree.root.findByProps({ accessibilityLabel: "Friends drawer" });
    expect(onBring).not.toHaveBeenCalled();
    await act(async () => tree.unmount());
  });
});
