import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { HomeChrome, largeNavigationHeight, navigationHeightFor } from "../src/home/runtime/HomeChrome";

const flat = (style: any): any =>
  typeof style === "function"
    ? flat(style({ pressed: false }))
    : Array.isArray(style)
      ? Object.assign({}, ...style.map(flat))
      : style || {};

vi.mock("react-native", () => ({
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
  Platform: { OS: "ios" },
  useWindowDimensions: () => ({ width: 393, height: 852, fontScale: 1 }),
  StyleSheet: { create: (v: unknown) => v, flatten: (s: unknown) => flat(s), absoluteFill: {} },
}));
vi.mock("react-native-svg", () => ({ default: "Svg", Circle: "Circle", Path: "Path" }));
vi.mock("react-native-reanimated", () => ({
  default: { View: "AnimatedView", createAnimatedComponent: (c: unknown) => c },
  ReduceMotion: { System: "system" },
  useSharedValue: (v: number) => ({ get: () => v, set: () => {} }),
  useAnimatedStyle: (fn: () => unknown) => fn(),
  withTiming: (v: number) => v,
}));
vi.mock("expo-haptics", () => ({ impactAsync: () => Promise.resolve(), ImpactFeedbackStyle: { Light: "light" } }));
vi.mock("../src/components/motion", () => ({ useReducedMotion: () => false }));
vi.mock("../src/ui/fonts", () => ({ useNunitoLoaded: () => false }));
vi.mock("../src/ui/icons", () => {
  const glyph = (name: string) => () => React.createElement("Glyph", { name });
  return Object.fromEntries(
    ["ArrowCounterClockwise", "ArrowLeft", "CaretLeft", "CaretRight", "Check", "CoatHanger", "Medal", "PencilSimple", "X"].map(
      (n) => [n, glyph(n)]
    )
  );
});
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function chrome(
  large: boolean,
  overrides: Partial<React.ComponentProps<typeof HomeChrome>> = {}
) {
  return (
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
      onRoom={() => {}}
      onCloset={() => {}}
      onBadges={() => {}}
      large={large}
      width={1024}
      {...overrides}
    />
  );
}

describe("Phase 3A Toca Boca room chrome", () => {
  it("shows back, room pill with arrows, no profile pill, Undo only while decorating, and 64 pt Closet/Badges/Decorate bottom bar", async () => {
    const onCloset = vi.fn(),
      onBadges = vi.fn(),
      onDesign = vi.fn(),
      onRoom = vi.fn();
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(chrome(false, { onCloset, onBadges, onDesign, onRoom }));
    });
    const bar = tree.root.findByProps({ testID: "home-bottom-bar" });
    const dockButtons = bar.findAll((n) => (n.type as unknown) === "Pressable");
    expect(dockButtons.map((n) => n.props.accessibilityLabel)).toEqual(["Closet", "Badges", "Decorate"]);
    for (const button of dockButtons) {
      const style = flat(button.props.style);
      expect(style.minWidth ?? style.width).toBeGreaterThanOrEqual(64);
      expect(style.minHeight ?? style.height).toBeGreaterThanOrEqual(64);
    }
    // Undo is hidden when not decorating.
    expect(tree.root.findAllByProps({ testID: "home-undo-button" })).toHaveLength(0);
    // Room pill walks to next/prev rooms.
    tree.root.findByProps({ testID: "home-room-next" }).props.onPress();
    expect(onRoom).toHaveBeenCalledWith("kitchen");
    tree.root.findByProps({ testID: "home-room-prev" }).props.onPress();
    expect(onRoom).toHaveBeenCalledWith("beach");
    bar.findByProps({ testID: "home-closet-button" }).props.onPress();
    bar.findByProps({ testID: "home-badges-button" }).props.onPress();
    bar.findByProps({ testID: "home-decorate-button" }).props.onPress();
    expect(onCloset).toHaveBeenCalledOnce();
    expect(onBadges).toHaveBeenCalledOnce();
    expect(onDesign).toHaveBeenCalledOnce();
    // Undo appears only while decorating.
    await act(async () => tree.update(chrome(false, { designing: true })));
    expect(tree.root.findAllByProps({ testID: "home-undo-button" }).length).toBeGreaterThan(0);
    await act(async () => tree.unmount());
  });

  it("in larger-target mode every button in top and bottom bars is at least 64 pt", async () => {
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(chrome(true, { designing: true }));
    });
    const buttons = tree.root.findAll((n) => (n.type as unknown) === "Pressable" && !!n.props.accessibilityLabel);
    expect(buttons.length).toBeGreaterThanOrEqual(7);
    for (const button of buttons) {
      const style = flat(button.props.style);
      const w = style.width ?? style.minWidth,
        h = style.height ?? style.minHeight;
      expect(w, button.props.accessibilityLabel).toBeGreaterThanOrEqual(64);
      expect(h, button.props.accessibilityLabel).toBeGreaterThanOrEqual(64);
    }
    expect(flat(tree.root.findByProps({ testID: "home-bottom-bar" }).props.style).height).toBe(largeNavigationHeight);
    expect(navigationHeightFor(true, 402)).toBe(largeNavigationHeight);
    await act(async () => tree.unmount());
  });
});
