import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Maker } from "../src/library/Maker";
import type { LibraryCreation } from "../src/library/state";
import { createLibraryPage } from "../src/library/drawing";
import { discardPageDraft } from "../src/library/drafts";
const exported = vi.hoisted(() => vi.fn(async (_text: string) => {}));
vi.mock("../src/state/backup", () => ({ exportBackup: exported }));
vi.mock("react-native", () => ({
  View: "View",
  TextInput: "TextInput",
  Pressable: "Pressable",
  PanResponder: { create: (handlers: object) => ({ panHandlers: handlers }) },
}));
vi.mock("react-native-svg", () => ({ default: "Svg", G: "G", Path: "Path", Rect: "Rect" }));
vi.mock("../src/components/Text", () => ({ Text: "Text" }));
vi.mock("../src/explore/ExploreArt", () => ({ Motif: "Motif" }));
vi.mock("../src/library/ui", () => ({
  palette: {},
  s: {},
  Action: ({ children, onPress, disabled }: { children: React.ReactNode; onPress: () => void; disabled?: boolean }) => (
    <button disabled={disabled} onClick={onPress}>
      {children}
    </button>
  ),
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: ReactTestRenderer | undefined;
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  discardPageDraft("rejected-test");
  exported.mockClear();
});
describe("Rejected Library drawing drafts", () => {
  it("keeps a rejected stroke through text edits, navigation/remount and export until accepted", async () => {
    const original = createLibraryPage();
    const onChange = vi.fn((_next: LibraryCreation) => false);
    const render = () => (
      <Maker draftKey="rejected-test" creation={original} onChange={onChange} saving={false} saveError={false} />
    );
    await act(async () => {
      root = create(render());
    });
    const canvas = root!.root.find((node) => !!node.props.onPanResponderGrant);
    await act(async () => {
      canvas.props.onLayout({ nativeEvent: { layout: { width: 100, height: 100 } } });
      canvas.props.onPanResponderGrant({ nativeEvent: { locationX: 20, locationY: 30 } });
      canvas.props.onPanResponderRelease();
    });
    await act(async () =>
      root!.root.find((node) => node.props.accessibilityLabel === "Page title").props.onChangeText("Still here")
    );
    expect(onChange.mock.calls.at(-1)?.[0]).toMatchObject({
      title: "Still here",
      strokes: [{ points: [{ x: 0.2, y: 0.3 }] }],
    });
    await act(async () => root!.unmount());
    root = undefined;
    await act(async () => {
      root = create(render());
    });
    expect(root!.root.find((node) => node.props.accessibilityLabel === "Page title").props.value).toBe("Still here");
    await act(async () =>
      root!.root
        .findAllByType("button")
        .find((node) => node.children.includes("Export my page"))!
        .props.onClick()
    );
    expect(JSON.parse(exported.mock.calls.at(-1)![0]).page).toMatchObject({
      title: "Still here",
      strokes: [{ points: [{ x: 0.2, y: 0.3 }] }],
    });
    onChange.mockReturnValue(true);
    await act(async () =>
      root!.root
        .findAllByType("button")
        .find((node) => node.children.includes("Retry saving this page"))!
        .props.onClick()
    );
    expect(onChange.mock.calls.at(-1)?.[0]).toMatchObject({
      title: "Still here",
      strokes: [{ points: [{ x: 0.2, y: 0.3 }] }],
    });
  });
});
