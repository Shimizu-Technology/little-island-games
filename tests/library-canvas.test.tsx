import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Maker } from "../src/library/Maker";
import { createLibraryPage, normalizedPoint } from "../src/library/drawing";
import { newLibraryChild, validLibraryChild, type LibraryCreation } from "../src/library/state";

vi.mock("react-native-gesture-handler", async () => (await import("./helpers/maker-gestures")).gestureMock());
vi.mock("react-native", () => ({ View: "View", TextInput: "TextInput", Pressable: "Pressable" }));
vi.mock("react-native-svg", () => ({ default: "Svg", G: "G", Path: "Path", Rect: "Rect" }));
vi.mock("../src/components/Text", () => ({ Text: "Text" }));
vi.mock("../src/explore/ExploreArt", () => ({ Motif: "Motif" }));
vi.mock("../src/state/backup", () => ({ exportBackup: vi.fn() }));
vi.mock("../src/library/ui", () => ({ palette: {}, s: {}, Action: "Action" }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: ReactTestRenderer | undefined;
const changes = vi.fn((_next: LibraryCreation) => true);
const pan = () => root!.root.findByType("GestureDetector" as any).props.gesture.gestures[0];
const tool = (label: string) => root!.root.find(node => String(node.type) === "Pressable" && node.props.accessibilityLabel === label);
const validSaves = () => {
  for (const [page] of changes.mock.calls) {
    expect(validLibraryChild({ ...newLibraryChild(), creations: [page] })).toBe(true);
    expect(JSON.parse(JSON.stringify(page))).toEqual(page);
  }
};
beforeEach(async () => {
  changes.mockClear();
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  await act(async () => { root = create(<Maker creation={createLibraryPage()} draftKey="canvas-test"
    onChange={changes} saving={false} saveError={false} />); });
  await act(async () => root!.root.findByProps({ testID: "drawing-canvas" }).props.onLayout({
    nativeEvent: { layout: { width: 300, height: 400 } },
  }));
});
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  vi.unstubAllGlobals();
});
describe("Make touch ownership and completed-stroke saves", () => {
  it("owns horizontal movement from touch-down through release, independent of React rerenders", async () => {
    expect(pan().config).toMatchObject({ minDistance: 0, maxPointers: 1, shouldCancelWhenOutside: false, runOnJS: true });
    await act(async () => pan().handlers.onBegin({ x: 30, y: 100 }));
    await act(async () => {
      for (let x = 60; x <= 270; x += 30) pan().handlers.onUpdate({ x, y: 100 });
    });
    expect(changes).not.toHaveBeenCalled();
    await act(async () => pan().handlers.onFinalize({}, true));
    expect(changes).toHaveBeenCalledOnce();
    expect(changes.mock.calls[0][0].strokes[0].points).toEqual(
      Array.from({ length: 9 }, (_, i) => ({ x: (i + 1) / 10, y: .25 }))
    );
    validSaves();
  });
  it("keeps ownership outside the canvas and clamps ink to its edge", async () => {
    await act(async () => {
      pan().handlers.onBegin({ x: 150, y: 200 });
      pan().handlers.onUpdate({ x: 500, y: -100 });
      pan().handlers.onUpdate({ x: 250, y: 100 });
      pan().handlers.onFinalize({}, true);
    });
    expect(changes.mock.calls[0][0].strokes[0].points).toEqual([
      { x: .5, y: .5 }, { x: 1, y: 0 }, { x: .833, y: .25 },
    ]);
    validSaves();
  });
  it.each(["cancel", "unmount"])("ends a mid-stroke %s exactly once, keeping the completed prefix", async (end) => {
    await act(async () => {
      pan().handlers.onBegin({ x: 30, y: 100 });
      pan().handlers.onUpdate({ x: 150, y: 100 });
    });
    if (end === "cancel") await act(async () => { pan().handlers.onFinalize({}, false); pan().handlers.onFinalize({}, false); });
    else { await act(async () => root!.unmount()); root = undefined; }
    expect(changes).toHaveBeenCalledOnce();
    expect(changes.mock.calls[0][0].strokes[0].points).toHaveLength(2);
    validSaves();
  });
  it("autosaves text during a stroke using completed ink only, with immutable snapshots", async () => {
    await act(async () => { pan().handlers.onBegin({ x: 30, y: 100 }); pan().handlers.onFinalize(); });
    const first = structuredClone(changes.mock.calls[0][0]);
    await act(async () => pan().handlers.onBegin({ x: 30, y: 200 }));
    await act(async () => root!.root.findByProps({ accessibilityLabel: "Page title" }).props.onChangeText("My sea"));
    const during = changes.mock.calls.at(-1)![0];
    expect(during.strokes).toHaveLength(1);
    await act(async () => { pan().handlers.onUpdate({ x: 270, y: 200 }); pan().handlers.onFinalize(); });
    expect(changes.mock.calls.at(-1)![0]).toMatchObject({ title: "My sea", strokes: [{}, {}] });
    expect(during.strokes).toHaveLength(1);
    expect(changes.mock.calls[0][0]).toEqual(first);
    validSaves();
  });
  it("never admits incomplete native samples or non-finite coordinates", async () => {
    expect(normalizedPoint(NaN, 1, 300, 400)).toBeNull();
    expect(normalizedPoint(1, Infinity, 300, 400)).toBeNull();
    await act(async () => {
      pan().handlers.onBegin({ x: NaN, y: 100 });
      pan().handlers.onFinalize();
      pan().handlers.onBegin({ x: 30, y: 100 });
      pan().handlers.onUpdate({});
      pan().handlers.onUpdate({ x: Infinity, y: 0 });
      pan().handlers.onFinalize();
    });
    expect(changes).toHaveBeenCalledOnce();
    expect(changes.mock.calls[0][0].strokes[0].points).toEqual([{ x: .1, y: .25 }]);
    validSaves();
  });
  it("uses familiar color, brush, stamp and tool names", async () => {
    for (const color of ["dark green", "sky blue", "red", "sunny yellow", "leaf green", "purple"])
      expect(tool(`Draw with ${color}`)).toBeDefined();
    for (const name of ["Thin brush", "Medium brush", "Thick brush", "Eraser", "Undo", "Redo"])
      expect(tool(name)).toBeDefined();
    await act(async () => tool("Open stamps").props.onPress());
    for (const name of ["turtle", "moon", "coral", "seagrass"]) expect(tool(`Stamp ${name}`)).toBeDefined();
  });
});
