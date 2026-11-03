import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Reader } from "../src/library/Reader";
import type { LibraryItem, Rights, Sentence } from "../src/library/schema";

vi.mock("react-native", () => ({
  View: "View",
  TextInput: "TextInput",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Image: "Image",
  Modal: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => (visible ? <>{children}</> : null),
  PanResponder: { create: (handlers: object) => ({ panHandlers: handlers }) },
  useWindowDimensions: () => ({ width: 1133, height: 744, fontScale: 1 }),
}));
vi.mock("react-native-svg", () => ({ default: "Svg", G: "G", Path: "Path", Rect: "Rect" }));
vi.mock("../src/components/Text", () => ({ Text: "Text" }));
vi.mock("../src/explore/ExploreArt", () => ({ Motif: "Motif" }));
vi.mock("../src/library/assets.generated", () => ({ libraryAssets: { "page.png": 1 } }));
vi.mock("../src/library/ui", () => ({
  palette: { ink: "#254E4B", paper: "#FFFBEF" },
  s: { body: { fontSize: 22 } },
  LibraryIcon: "Icon",
  Action: ({
    children,
    label,
    onPress,
    disabled,
  }: {
    children: React.ReactNode;
    label?: string;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <button aria-label={label} disabled={disabled} onClick={onPress}>
      {children}
    </button>
  ),
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: ReactTestRenderer;
afterEach(async () => {
  if (root) await act(async () => root.unmount());
});
const rights: Rights = {
  license: "CC BY 4.0",
  creator: "Artist",
  credit: "Unique book credit",
  changes: "Unchanged",
  sourceUrl: "https://example.org",
};
const sentence: Sentence = {
  id: "one",
  text: "See the sea.",
  speechKey: "one",
  audio: { status: "pending", reason: "fixture" },
};
const book = {
  type: "book",
  title: "Sea",
  edition: { rights },
  rights,
  pages: Array.from({ length: 3 }, () => ({
    image: { path: "page.png", alt: "Sea picture", rights: { ...rights, sourceUrl: "https://example.org/page-image" } },
    sentences: [sentence],
  })),
} as Extract<LibraryItem, { type: "book" }>;
const renderReader = async (page: number, extra = {}) => {
  const onPage = vi.fn();
  await act(async () => {
    root = create(
      <Reader book={book} page={page} onPage={onPage} selected="" speak={vi.fn()} word={vi.fn()} {...extra} />
    );
  });
  return onPage;
};

const surfaces = () => root.root.findAll((node) => !!node.props.onPanResponderRelease && typeof node.type === "string");
const text = (node: { children: unknown[] }): string => JSON.stringify(node);
describe("L2 one swipe surface for the whole reader page", () => {
  it("wraps the art, the sentence band and the paper below in a single pan surface", async () => {
    const onPage = await renderReader(1);
    const [surface] = surfaces();
    expect(surfaces()).toHaveLength(1);
    expect(surface.props.testID).toBe("reader-swipe-surface");
    // The paper below the text: the surface grows to fill the scroll content.
    expect(surface.props.style.flexGrow).toBe(1);
    const scroll = root.root.find((node) => String(node.type) === "ScrollView" && node.props.contentContainerStyle);
    expect(scroll.props.contentContainerStyle.flexGrow).toBe(1);
    expect(scroll.findAll((node) => node === surface)).toHaveLength(1);
    // Art and the sentence band both live inside it.
    expect(surface.findAll((node) => String(node.type) === "Image")).toHaveLength(1);
    const band = surface.findAll((node) => node.props.accessibilityLabel === "Replay sentence: See the sea.");
    expect(band.length).toBeGreaterThan(0);
    // The art no longer owns a private pan handler.
    const art = surface.find((node) => String(node.props.accessibilityLabel).startsWith("Book art, page 2"));
    expect(art.props.onPanResponderRelease).toBeUndefined();
    await act(async () => surface.props.onPanResponderRelease({}, { dx: -120, dy: 3 }));
    expect(onPage).toHaveBeenLastCalledWith(2);
  });
  it("lets a mostly vertical drag over the text band scroll instead of turning the page", async () => {
    const onPage = await renderReader(1);
    const [surface] = surfaces();
    expect(surface.props.onMoveShouldSetPanResponder({}, { dx: 12, dy: 90 })).toBe(false);
    expect(surface.props.onMoveShouldSetPanResponder({}, { dx: 80, dy: 10 })).toBe(true);
    expect(onPage).not.toHaveBeenCalled();
  });
  it("keeps sentence and word taps working inside the swipe surface", async () => {
    const speak = vi.fn(),
      word = vi.fn();
    await renderReader(1, { speak, word });
    const stop = vi.fn();
    await act(async () =>
      root.root.find((node) => String(node.type) === "Text" && node.props.accessibilityLabel === "Hear word: sea.").props.onPress({ stopPropagation: stop })
    );
    expect(word).toHaveBeenCalledWith("sea.");
    expect(speak).not.toHaveBeenCalled();
    await act(async () =>
      root.root.find((node) => String(node.type) === "Pressable" && node.props.accessibilityLabel === "Replay sentence: See the sea.").props.onPress()
    );
    expect(speak).toHaveBeenCalledOnce();
    expect(text(root.toJSON() as never)).toContain("Replay sentence");
  });
});
