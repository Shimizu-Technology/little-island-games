import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { HomeChrome, largeNavigationHeight, navigationHeightFor } from "../src/home/runtime/HomeChrome";
vi.mock("react-native", () => ({ Pressable: "Pressable", ScrollView: "ScrollView", Text: "Text", View: "View", StyleSheet: { create: (v: unknown) => v, absoluteFill: {} } }));
vi.mock("react-native-svg", () => ({ default: "Svg", Circle: "Circle", Path: "Path" }));
vi.mock("react-native-reanimated", () => ({ default: { View: "AnimatedView" }, useAnimatedStyle: (fn: () => unknown) => fn() }));
vi.mock("../src/home/art/Items", () => ({ ItemArt: () => null }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const flat = (style: any): any => typeof style === "function" ? flat(style({ pressed: false })) : Array.isArray(style) ? Object.assign({}, ...style.map(flat)) : style || {};
function chrome(large: boolean, onFriends = () => {}, width = 1024) {
  return <HomeChrome room="home" overview={false} designing={false} canUndo canRedo={false} top={0} bottom={0} onMore={() => {}}
    onHeaderLayout={() => {}} onBack={() => {}} onUndo={() => {}} onRedo={() => {}} onFind={() => {}} onFriends={onFriends}
    onOverview={() => {}} onDesign={() => {}} onRoom={() => {}} large={large} width={width} />;
}
describe("HR-01 / HR-03 chrome", () => {
  it("the Friends button sits beside Find, and More moves up to the header", async () => {
    const onFriends = vi.fn();
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => { tree = TestRenderer.create(chrome(false, onFriends)); });
    const bar = tree.root.findByProps({ testID: "home-bottom-bar" });
    const labels = bar.findAll((n) => (n.type as unknown) === "Pressable").map((n) => n.props.accessibilityLabel);
    expect(labels.slice(-2)).toEqual(["Find my Islander", "Friends"]);
    expect(labels).not.toContain("More home controls");
    expect(tree.root.findAllByProps({ accessibilityLabel: "More home controls" }).length).toBeGreaterThan(0);
    bar.findByProps({ testID: "friends-button" }).props.onPress();
    expect(onFriends).toHaveBeenCalledOnce();
    await act(async () => tree.unmount());
  });
  it("in larger-target mode every button a child uses is at least 64 pt", async () => {
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => { tree = TestRenderer.create(chrome(true)); });
    const buttons = tree.root.findAll((n) => (n.type as unknown) === "Pressable" && !!n.props.accessibilityLabel);
    expect(buttons.length).toBeGreaterThanOrEqual(10);
    for (const button of buttons) {
      const style = flat(button.props.style);
      const w = style.width ?? style.minWidth, h = style.height ?? style.minHeight;
      expect(w, button.props.accessibilityLabel).toBeGreaterThanOrEqual(64);
      expect(h, button.props.accessibilityLabel).toBeGreaterThanOrEqual(64);
    }
    expect(flat(tree.root.findByProps({ testID: "home-bottom-bar" }).props.style).height).toBe(largeNavigationHeight);
    // On an iPhone the 64 pt bar wraps to two rows, so Find and Friends are never scrolled away.
    await act(async () => tree.update(chrome(true, () => {}, 402)));
    expect(tree.root.findAllByProps({ testID: "home-bottom-bar-wrapped" })).toHaveLength(1);
    expect(tree.root.findAllByType("ScrollView" as never)).toHaveLength(0);
    expect(flat(tree.root.findByProps({ testID: "home-bottom-bar" }).props.style).height).toBe(navigationHeightFor(true, 402));
    expect(navigationHeightFor(true, 402)).toBeGreaterThanOrEqual(2 * 64);
    expect(navigationHeightFor(true, 744)).toBe(largeNavigationHeight);
    await act(async () => tree.update(chrome(false)));
    const room = tree.root.findByProps({ accessibilityLabel: "Go to Kitchen" });
    expect(flat(room.props.style).width).toBe(48);
    await act(async () => tree.unmount());
  });
});
