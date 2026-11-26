import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { LookListen } from "../src/library/LookListen";
import type { CatalogItem } from "../src/library/catalog";
vi.mock("react-native", () => ({
  View: "View",
  Pressable: "Pressable",
  PanResponder: { create: (handlers: object) => ({ panHandlers: handlers }) },
}));
vi.mock("../src/components/Text", () => ({ Text: "Text" }));
vi.mock("../src/ui/fonts", () => ({ useNunitoLoaded: () => false }));
vi.mock("../src/library/ui", () => ({ ItemPicture: "Picture", LibraryIcon: "Icon", s: {} }));
vi.mock("../src/library/catalog", () => ({
  namingLabel: (record: { title: string }) => record.title,
  recordLabelSpeech: (record: { id: string }) => ({ key: record.id }),
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: ReactTestRenderer;
afterEach(async () => {
  if (root) await act(async () => root.unmount());
});
const items = [
  { id: "turtle", title: "Turtle" },
  { id: "sun", title: "Sun" },
] as CatalogItem[];
const button = (name: string) =>
  root.root.find((node) => String(node.type) === "Pressable" && node.props.accessibilityLabel === name);
it("hears the new picture once after a swipe, even when web also emits the old picture's click", async () => {
  const speak = vi.fn();
  await act(async () => {
    root = create(<LookListen items={items} speak={speak} stop={vi.fn()} onExit={vi.fn()} />);
  });
  const oldTap = button("Hear Turtle").props.onPress;
  const board = root.root.find((node) => String(node.type) === "View" && !!node.props.onPanResponderRelease);
  await act(async () => {
    board.props.onPanResponderRelease({}, { dx: -100 });
    oldTap();
  });
  expect(speak).toHaveBeenCalledExactlyOnceWith("sun", undefined);
  expect(button("Hear Sun")).toBeDefined();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await act(async () => button("Hear Sun").props.onPress());
  expect(speak).toHaveBeenCalledTimes(2);
  expect(speak).toHaveBeenLastCalledWith("sun", undefined);
});
it("keeps short lock taps friendly and permits exit only on the hold callback", async () => {
  const exit = vi.fn(),
    speak = vi.fn();
  await act(async () => {
    root = create(<LookListen items={items} speak={speak} stop={vi.fn()} onExit={exit} />);
  });
  const lock = button("Grown-up exit. Hold to exit.");
  expect(lock.props.delayLongPress).toBe(1200);
  await act(async () => lock.props.onPress());
  expect(exit).not.toHaveBeenCalled();
  expect(speak).toHaveBeenCalledWith("turtle", undefined);
  await act(async () => lock.props.onLongPress());
  expect(exit).toHaveBeenCalledOnce();
});
