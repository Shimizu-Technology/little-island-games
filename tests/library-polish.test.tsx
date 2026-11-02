import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Reader, SentenceLine } from "../src/library/Reader";
import { DrawingArt, Maker } from "../src/library/Maker";
import type { LibraryCreation } from "../src/library/state";
import { createLibraryPage } from "../src/library/drawing";
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
vi.mock("../src/state/backup", () => ({ exportBackup: vi.fn() }));
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
    image: { path: "page.png", alt: "Sea picture", rights },
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
const button = (name: string) => root.root.findAllByType("button").find((node) => node.props["aria-label"] === name)!;

describe("Library reading presentation", () => {
  it("deduplicates credits on title/end pages and keeps them off story pages", async () => {
    await renderReader(0);
    expect(JSON.stringify(root.toJSON()).match(/Unique book credit/g)).toHaveLength(1);
    await act(async () => root.unmount());
    await renderReader(1);
    expect(JSON.stringify(root.toJSON())).not.toContain("Unique book credit");
    await act(async () => root.unmount());
    await renderReader(2);
    expect(JSON.stringify(root.toJSON()).match(/Unique book credit/g)).toHaveLength(1);
  });
  it("keeps page arrows and swipe bounds equivalent", async () => {
    const onPage = await renderReader(1);
    await act(async () => button("Next page").props.onClick());
    expect(onPage).toHaveBeenLastCalledWith(2);
    const art = root.root.find((node) => !!node.props.onPanResponderRelease);
    await act(async () => art.props.onPanResponderRelease({}, { dx: 120 }));
    expect(onPage).toHaveBeenLastCalledWith(0);
    await act(async () => root.unmount());
    const first = await renderReader(0);
    expect(button("Previous page").props.disabled).toBe(true);
    await act(async () =>
      root.root.find((node) => !!node.props.onPanResponderRelease).props.onPanResponderRelease({}, { dx: 120 })
    );
    expect(first).toHaveBeenLastCalledWith(0);
  });
  it("exposes complete credits and a working close action in the information sheet", async () => {
    const close = vi.fn();
    await renderReader(1, { showInfo: true, onCloseInfo: close });
    expect(JSON.stringify(root.toJSON())).toContain("Unique book credit");
    await act(async () => button("Close book information").props.onClick());
    expect(close).toHaveBeenCalledOnce();
  });
  it("keeps sentence replay and word playback separate", async () => {
    const replay = vi.fn(),
      word = vi.fn(),
      stop = vi.fn();
    await act(async () => {
      root = create(<SentenceLine sentence={sentence} selected onSentence={replay} onWord={word} />);
    });
    await act(async () =>
      root.root
        .find((node) => node.props.accessibilityLabel === "Hear word: See")
        .props.onPress({ stopPropagation: stop })
    );
    expect(word).toHaveBeenCalledWith("See");
    expect(stop).toHaveBeenCalledOnce();
    expect(replay).not.toHaveBeenCalled();
    await act(async () => root.root.find((node) => String(node.type) === "Pressable").props.onPress());
    expect(replay).toHaveBeenCalledOnce();
    expect(JSON.stringify(root.toJSON())).not.toContain("↺");
  });
});

describe("Library art studio", () => {
  it("keeps stamps round and centered in a tall canvas", async () => {
    const viewport = { width: 374, height: 493 };
    await act(async () => {
      root = create(
        <DrawingArt
          viewport={viewport}
          drawing={{ strokes: [], stamps: [{ id: "moon", x: 0.5, y: 0.4, size: 0.17 }] }}
        />
      );
    });
    const transform = root.root.find((node) => String(node.type) === "G").props.transform as string;
    const [x, y, sx, sy] = transform.match(/-?[\d.]+/g)!.map(Number);
    expect((sx * viewport.width) / 1000).toBeCloseTo((sy * viewport.height) / 650);
    expect(((x + sx * 60) * viewport.width) / 1000).toBeCloseTo(viewport.width * 0.5);
    expect(((y + sy * 60) * viewport.height) / 650).toBeCloseTo(viewport.height * 0.4);
  });
  it("starts with a folded story card and keeps the same canvas when opened", async () => {
    await act(async () => {
      root = create(
        <Maker
          creation={createLibraryPage()}
          draftKey="polish-card"
          onChange={() => true}
          saving={false}
          saveError={false}
          wide
        />
      );
    });
    const card = () =>
      root.root.find(
        (node) => String(node.type) === "Pressable" && node.props.accessibilityLabel === "Picture title and story"
      );
    expect(card().props.accessibilityState.expanded).toBe(false);
    const canvas = root.root.find((node) => !!node.props.onPanResponderGrant);
    await act(async () => card().props.onPress());
    expect(card().props.accessibilityState.expanded).toBe(true);
    expect(root.root.find((node) => !!node.props.onPanResponderGrant)).toBe(canvas);
  });
  it("keeps icon tool names, brush selection and undo/redo operable", async () => {
    const changes = vi.fn((_next: LibraryCreation) => true);
    await act(async () => {
      root = create(
        <Maker
          creation={createLibraryPage()}
          draftKey="polish-tools"
          onChange={changes}
          saving={false}
          saveError={false}
        />
      );
    });
    const tool = (label: string) =>
      root.root.find((node) => String(node.type) === "Pressable" && node.props.accessibilityLabel === label);
    await act(async () => tool("Brush size 22").props.onPress());
    await act(async () => tool("Eraser").props.onPress());
    const canvas = root.root.find((node) => !!node.props.onPanResponderGrant);
    await act(async () => {
      canvas.props.onLayout({ nativeEvent: { layout: { width: 100, height: 200 } } });
      canvas.props.onPanResponderGrant({ nativeEvent: { locationX: 25, locationY: 100 } });
      canvas.props.onPanResponderRelease();
    });
    expect(changes.mock.calls.at(-1)?.[0]).toMatchObject({
      strokes: [{ width: 22, color: "#FFFFFF", points: [{ x: 0.25, y: 0.5 }] }],
    });
    await act(async () => tool("Undo").props.onPress());
    expect(changes.mock.calls.at(-1)?.[0]).toMatchObject({ strokes: [] });
    await act(async () => tool("Redo").props.onPress());
    expect(changes.mock.calls.at(-1)?.[0].strokes).toHaveLength(1);
  });
});
