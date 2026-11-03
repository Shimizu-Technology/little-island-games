import React from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import Layout from "../src/app/_layout";
vi.mock("react-native-gesture-handler", () => ({ GestureHandlerRootView: "Root" }));
vi.mock("expo-router", () => ({ Stack: Object.assign(({ children }: { children: React.ReactNode }) => <>{children}</>, { Screen: "Screen" }) }));
vi.mock("expo-status-bar", () => ({ StatusBar: "StatusBar" }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaProvider: "SafeAreaProvider" }));
vi.mock("../src/components/Text", () => ({ TextLayoutProvider: "TextLayoutProvider" }));
vi.mock("../src/components/motion", () => ({ useReducedMotion: () => false }));
vi.mock("../src/state/Store", () => ({ StoreProvider: "StoreProvider" }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
describe("native Library drawing navigation", () => {
  it("disables the ancestor UIKit pop recognizer before the editor can receive touches", async () => {
    let root: ReturnType<typeof create>;
    await act(async () => { root = create(<Layout />); });
    const options = root!.root.findByProps({ name: "library" }).props.options;
    expect(options({ route: { params: { place: "make", id: "page-owned" } } })).toEqual({ gestureEnabled: false });
    // Baby Look & Listen: no swipe may bypass the hold-to-exit lock.
    expect(options({ route: { params: { place: "little" } } })).toEqual({ gestureEnabled: false });
    // Keep left-edge back on the chooser, reader and other routes.
    for (const params of [undefined, {}, { place: "make" }, { place: "reader", id: "book" }, { place: "wonder" }])
      expect(options({ route: { params } })).toEqual({ gestureEnabled: true });
    await act(async () => root!.unmount());
  });
  it("turns off iOS 26 full-screen swipe-to-pop for every screen", async () => {
    let root: ReturnType<typeof create>;
    await act(async () => { root = create(<Layout />); });
    const stack = root!.root.find((node) => node.props.screenOptions !== undefined);
    // Undefined would let react-native-screens fall back to YES on iOS 26.
    expect(stack.props.screenOptions.fullScreenGestureEnabled).toBe(false);
    await act(async () => root!.unmount());
  });
});
