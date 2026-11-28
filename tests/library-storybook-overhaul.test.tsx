import React from "react";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newLibraryChild } from "../src/library/state";
import { emptySave } from "../src/state/validation";
import type { CatalogItem } from "../src/library/catalog";
import type { LibraryItem, Rights, Sentence } from "../src/library/schema";

vi.mock("../src/atmosphere/AtmosphereHeader", () => ({ AtmosphereHeader: () => null }));
vi.mock("../src/atmosphere/GlobalWeatherLayer", () => ({ GlobalWeatherLayer: () => null, AtmosphereSky: () => null }));

const env = vi.hoisted(() => ({
  width: 768,
  height: 1024,
  fontScale: 1,
  params: { place: "wonder" } as Record<string, string>,
  store: {} as any,
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
  audioSpeak: vi.fn(() => true),
  audioSpeakSequence: vi.fn(() => true),
  audioStop: vi.fn(),
  audioWord: vi.fn(() => true),
  audioReadingSequence: false,
  audioSelected: "",
}));

vi.mock("react-native", () => ({
  View: "View",
  ScrollView: "ScrollView",
  TextInput: "TextInput",
  Pressable: "Pressable",
  Switch: "Switch",
  Image: Object.assign((props: any) => React.createElement("Image", props), {
    resolveAssetSource: () => ({ width: 800, height: 500 }),
  }),
  Modal: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => (visible ? <>{children}</> : null),
  FlatList: ({ ListHeaderComponent, data, renderItem, ListEmptyComponent, style }: any) => (
    <View style={style} data-items-count={data?.length ?? 0}>
      {ListHeaderComponent}
      {data?.length
        ? data.slice(0, 6).map((item: any) => <React.Fragment key={item.id}>{renderItem({ item })}</React.Fragment>)
        : ListEmptyComponent}
    </View>
  ),
  Keyboard: { dismiss: vi.fn() },
  PanResponder: { create: (handlers: object) => ({ panHandlers: handlers }) },
  AppState: { addEventListener: () => ({ remove() {} }) },
  Platform: { OS: "ios" },
  StyleSheet: { create: (v: any) => v, absoluteFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } },
  useWindowDimensions: () => ({ width: env.width, height: env.height, fontScale: env.fontScale }),
}));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));
vi.mock("react-native-svg", () => ({
  default: "Svg",
  Circle: "Circle",
  Ellipse: "Ellipse",
  G: "G",
  Path: "Path",
  Rect: "Rect",
  SvgXml: "SvgXml",
}));
vi.mock("expo-router", () => ({
  useIsFocused: () => true,
  useLocalSearchParams: () => env.params,
  router: {
    push: (...args: any[]) => env.routerPush(...args),
    replace: (...args: any[]) => env.routerReplace(...args),
    back: vi.fn(),
    dismissTo: vi.fn(),
    canGoBack: () => true,
  },
}));
vi.mock("../src/components/Text", () => ({ Text: "Text" }));
vi.mock("../src/components/ui", () => ({
  font: "System",
  C: { ink: "#3D2B24", teal: "#1E6B66", coral: "#B75C49", cream: "#FFF6E5", paper: "#FFFDF8" },
  Copy: "Copy",
  Heading: "Heading",
}));
vi.mock("../src/components/Recovery", () => ({ Recovery: () => null }));
vi.mock("../src/components/SaveStatus", () => ({ SaveStatus: () => null }));
vi.mock("../src/explore/ExploreArt", () => ({ Motif: "Motif", TopicArt: "TopicArt", EarthLabArt: "EarthLabArt" }));
vi.mock("../src/hub/Terrain", () => ({ Palm: "Palm" }));
vi.mock("../src/ui/fonts", () => ({ useNunitoLoaded: () => true }));
vi.mock("../src/state/Store", () => ({ useStore: () => env.store }));
vi.mock("../src/library/useLibraryAudio", () => ({
  useLibraryAudio: () => ({
    stop: env.audioStop,
    speak: env.audioSpeak,
    speakSequence: env.audioSpeakSequence,
    word: env.audioWord,
    selected: env.audioSelected,
    notice: "",
    readingSequence: env.audioReadingSequence,
  }),
}));
vi.mock("../src/library/assets.generated", () => ({ libraryAssets: { "page.png": { uri: "page.png" } } }));
vi.mock("../src/library/Maker", () => ({ Maker: "Maker", DrawingArt: "DrawingArt" }));
vi.mock("../src/library/catalog.generated.json", async () => {
  const fs = await import("node:fs");
  const real = JSON.parse(fs.readFileSync("src/library/catalog.generated.json", "utf8"));
  const items = JSON.parse(fs.readFileSync("content/library/items.json", "utf8"));
  return { default: { items, index: real.index } };
});

const View = "View" as any;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function textOf(node: any): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (!node || typeof node !== "object") return "";
  if (Array.isArray(node)) return node.map(textOf).join("");
  if ("children" in node && Array.isArray(node.children)) return node.children.map(textOf).join("");
  return "";
}

let root: ReactTestRenderer | undefined;

beforeEach(() => {
  env.width = 768;
  env.height = 1024;
  env.fontScale = 1;
  env.params = { place: "wonder" };
  env.routerPush.mockReset();
  env.routerReplace.mockReset();
  env.audioSpeak.mockClear();
  env.audioSpeakSequence.mockClear();
  env.audioStop.mockClear();
  env.audioWord.mockClear();
  env.audioReadingSequence = false;
  env.audioSelected = "";

  const child = newLibraryChild();
  env.store = {
    ready: true,
    recovery: null,
    error: null,
    saving: false,
    epoch: 1,
    save: { ...emptySave(), library: { version: 2, profiles: { family: child } } },
    libraryPatch: vi.fn((patch: any) => {
      Object.assign(env.store.save.library.profiles.family, patch);
      return true;
    }),
    libraryPolicy: vi.fn(),
    libraryFlush: vi.fn(async () => true),
    exploreUpdate: vi.fn(),
    selectLearner: vi.fn(),
    settings: vi.fn(),
  };
});

afterEach(async () => {
  vi.useRealTimers();
  if (root) await act(async () => root!.unmount());
  root = undefined;
});

describe("Painted Warm Island Storybook Library covers", () => {
  it("resolves all 11 category WebP covers on disk and through static thunks", async () => {
    const { LIBRARY_COVER_IDS, libraryCoverForCategory, libraryCoverForKind } = await import(
      "../src/library/illustratedCovers"
    );
    expect(LIBRARY_COVER_IDS).toHaveLength(11);
    for (const id of LIBRARY_COVER_IDS) {
      const filePath = resolve("assets/art/library", `${id}.webp`);
      expect(existsSync(filePath), filePath).toBe(true);
      const header = readFileSync(filePath).subarray(0, 12);
      expect(header.subarray(0, 4).toString("ascii")).toBe("RIFF");
      expect(header.subarray(8, 12).toString("ascii")).toBe("WEBP");
      expect(libraryCoverForCategory(id)).toBeDefined();
    }
    expect(libraryCoverForKind("turtle")).toBeDefined();
    expect(libraryCoverForKind("history")).toBeDefined();
    expect(libraryCoverForKind("faith")).toBeDefined();
  });

  it("renders painted WebP covers with SVG fallback on LibraryArt, category shelves, and exhibit cards", async () => {
    const { LibraryArt } = await import("../src/library/LibraryArt");
    await act(async () => {
      root = create(<LibraryArt kind="turtle" category="ocean" />);
    });
    expect(root!.root.findAll((node) => String(node.type) === "SvgXml")).toHaveLength(1);
    expect(root!.root.findAll((node) => String(node.type) === "Image")).toHaveLength(1);
    await act(async () => root!.unmount());
    root = undefined;

    const { default: LibraryScreen } = await import("../src/library/LibraryScreen");
    await act(async () => {
      root = create(<LibraryScreen />);
    });
    const oceanCategory = root!.root.findByProps({ testID: "library-category-ocean" });
    expect(oceanCategory.findAll((node) => String(node.type) === "Image").length).toBeGreaterThanOrEqual(1);
    const oceanLab = root!.root.findByProps({ testID: "library-lab-oceans" });
    expect(oceanLab.findAll((node) => String(node.type) === "Image").length).toBeGreaterThanOrEqual(1);
    expect(textOf(oceanLab)).toContain("Interactive Lab");
  });
});

describe("Upgraded Wonder browsing, Continue Reading, Surprise Me!, and Quick Filters", () => {
  it("renders Continue Reading hero when recent items exist and opens on Resume tap", async () => {
    const child = env.store.save.library.profiles.family;
    child.recent = ["dolphins"];
    child.saved = ["dolphins"];

    const { default: LibraryScreen } = await import("../src/library/LibraryScreen");
    await act(async () => {
      root = create(<LibraryScreen />);
    });

    const hero = root!.root.findByProps({ testID: "library-continue-reading" });
    expect(textOf(hero)).toContain("Pick Up Where You Left Off");
    expect(textOf(hero).toLowerCase()).toContain("dolphin");

    const resumeBtn = root!.root.findByProps({ testID: "library-continue-resume" });
    await act(async () => resumeBtn.props.onPress());
    expect(env.routerPush).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: "/library", params: expect.objectContaining({ id: "dolphins" }) })
    );
  });

  it("shows category item counts and saved/explored progress indicators", async () => {
    const child = env.store.save.library.profiles.family;
    child.saved = ["dolphins"];
    child.recent = ["turtle-breath"];

    const { default: LibraryScreen } = await import("../src/library/LibraryScreen");
    await act(async () => {
      root = create(<LibraryScreen />);
    });

    const animalsCard = root!.root.findByProps({ testID: "library-category-animals" });
    expect(textOf(animalsCard)).toContain("1 saved");
    const oceanCard = root!.root.findByProps({ testID: "library-category-ocean" });
    expect(textOf(oceanCard)).toContain("1 explored");
  });

  it("opens fresh discoveries via Surprise Me! without getting stuck on the same item", async () => {
    const { default: LibraryScreen } = await import("../src/library/LibraryScreen");
    await act(async () => {
      root = create(<LibraryScreen />);
    });

    const surprise = root!.root.findByProps({ testID: "library-surprise-me" });
    await act(async () => surprise.props.onPress());
    await act(async () => surprise.props.onPress());
    expect(env.routerPush).toHaveBeenCalledTimes(2);
    const firstId = env.routerPush.mock.calls[0][0].params.id;
    const secondId = env.routerPush.mock.calls[1][0].params.id;
    expect(firstId).toBeTruthy();
    expect(secondId).toBeTruthy();
    expect(secondId).not.toBe(firstId);
  });

  it("supports 1-tap quick filter chips (All, Books, Interactive Labs, Saved)", async () => {
    const { default: LibraryScreen } = await import("../src/library/LibraryScreen");
    await act(async () => {
      root = create(<LibraryScreen />);
    });

    const booksChip = root!.root.findByProps({ testID: "library-filter-books" });
    const labsChip = root!.root.findByProps({ testID: "library-filter-labs" });
    const savedChip = root!.root.findByProps({ testID: "library-filter-saved" });
    const allChip = root!.root.findByProps({ testID: "library-filter-all" });

    await act(async () => booksChip.props.onPress());
    expect(textOf(root!.toJSON())).toContain("Picture books");

    await act(async () => labsChip.props.onPress());
    expect(textOf(root!.toJSON())).toContain("Interactive Labs");

    await act(async () => savedChip.props.onPress());
    expect(env.store.libraryPatch).toHaveBeenCalledWith(expect.objectContaining({ onlyFavorites: true }), 1, "family");

    await act(async () => allChip.props.onPress());
    expect(env.store.libraryPatch).toHaveBeenCalledWith(
      expect.objectContaining({ category: "all", query: "", onlyFavorites: false }),
      1,
      "family"
    );
  });
});

describe("Elevated Picture Book Reader", () => {
  const rights: Rights = {
    license: "CC BY 4.0",
    creator: "Artist",
    credit: "Storybook credit",
    changes: "Unchanged",
    sourceUrl: "https://example.org",
  };
  const sentences: Sentence[] = [
    { id: "s1", text: "First wave rolls in.", speechKey: "k1", audio: { status: "pending", reason: "test" } },
    { id: "s2", text: "Second shell shines bright.", speechKey: "k2", audio: { status: "pending", reason: "test" } },
  ];
  const book = {
    id: "reef-tale",
    type: "book",
    title: "Reef Tale",
    category: "books",
    edition: { language: "en", isbn: "", originalTitle: "Reef Tale", rights },
    rights,
    pages: [
      { image: { path: "page.png", alt: "Page 1 art", rights }, sentences },
      { image: { path: "page.png", alt: "Page 2 art", rights }, sentences: [sentences[0]] },
      { image: { path: "page.png", alt: "Page 3 art", rights }, sentences: [sentences[1]] },
    ],
  } as unknown as Extract<LibraryItem, { type: "book" }>;

  it("renders visual page progress bar, sequential Read page playback, and clean stop on page turn", async () => {
    vi.useFakeTimers();
    const { Reader } = await import("../src/library/Reader");
    const onPage = vi.fn();
    const speak = vi.fn();
    const onStopReading = vi.fn();

    await act(async () => {
      root = create(
        <Reader
          book={book}
          page={0}
          onPage={onPage}
          selected=""
          speak={speak}
          word={vi.fn()}
          onStopReading={onStopReading}
        />
      );
    });

    const bar = root!.root.findByProps({ testID: "reader-progress-bar" });
    expect(bar.props.accessibilityValue).toEqual({ min: 1, max: 3, now: 1 });

    const readBtn = root!.root.findByProps({ testID: "reader-read-page" });
    expect(readBtn.props.accessibilityLabel).toBe("Read page");

    await act(async () => readBtn.props.onPress());
    expect(speak).toHaveBeenCalledWith(sentences[0]);
    expect(root!.root.findByProps({ testID: "reader-read-page" }).props.accessibilityLabel).toBe("Stop reading");

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    expect(speak).toHaveBeenCalledWith(sentences[1]);

    // Turning the page stops sequential reading cleanly.
    const nextBtn = root!.root.find((n) => String(n.type) === "Pressable" && n.props.accessibilityLabel === "Next page");
    await act(async () => nextBtn.props.onPress());
    expect(onStopReading).toHaveBeenCalled();
    expect(onPage).toHaveBeenCalledWith(1);
  });

  it("renders celebratory End-of-Book card on the final page with Read Again, Draw About It, and More to Read", async () => {
    const { Reader } = await import("../src/library/Reader");
    const onPage = vi.fn();
    const onDrawAbout = vi.fn();
    const onOpenBook = vi.fn();
    const related: CatalogItem[] = [
      { id: "book-a", title: "Island Breeze", category: "books", motif: "globe" },
      { id: "book-b", title: "Coral Song", category: "books", motif: "turtle" },
    ];

    await act(async () => {
      root = create(
        <Reader
          book={book}
          page={2}
          onPage={onPage}
          selected=""
          speak={vi.fn()}
          word={vi.fn()}
          onDrawAbout={onDrawAbout}
          relatedBooks={related}
          onOpenBook={onOpenBook}
        />
      );
    });

    const endCard = root!.root.findByProps({ testID: "reader-end-of-book" });
    expect(textOf(endCard)).toContain("You finished Reef Tale!");
    expect(textOf(endCard)).toContain("More to Read");

    await act(async () => root!.root.findByProps({ testID: "reader-read-again" }).props.onPress());
    expect(onPage).toHaveBeenCalledWith(0);

    await act(async () => root!.root.findByProps({ testID: "reader-draw-about" }).props.onPress());
    expect(onDrawAbout).toHaveBeenCalledOnce();

    await act(async () => root!.root.findByProps({ testID: "reader-related-book-a" }).props.onPress());
    expect(onOpenBook).toHaveBeenCalledWith("book-a");
  });

  it("stops sequential narration on unmount and toggles bookmark heart in Reader header", async () => {
    const { Reader } = await import("../src/library/Reader");
    const onStopReading = vi.fn();
    await act(async () => {
      root = create(
        <Reader
          book={book}
          page={0}
          onPage={vi.fn()}
          selected=""
          speak={vi.fn()}
          word={vi.fn()}
          readingPage
          onReadPage={vi.fn()}
          onStopReading={onStopReading}
        />
      );
    });
    expect(root!.root.findByProps({ testID: "reader-read-page" }).props.accessibilityLabel).toBe("Stop reading");
    await act(async () => root!.unmount());
    root = undefined;
    expect(onStopReading).toHaveBeenCalled();

    // Verify bookmark toggle in LibraryScreen reader header
    const items = JSON.parse(readFileSync(resolve("content/library/items.json"), "utf8"));
    const firstBook = items.find((i: any) => i.type === "book");
    expect(firstBook).toBeDefined();
    env.params = { place: "reader", id: firstBook.id };
    const { default: LibraryScreen } = await import("../src/library/LibraryScreen");
    await act(async () => {
      root = create(<LibraryScreen />);
    });
    const saveBtn = root!.root.find((n) => String(n.type) === "Pressable" && n.props.accessibilityLabel === "Save book");
    await act(async () => saveBtn.props.onPress());
    expect(env.store.libraryPatch).toHaveBeenCalledWith(
      expect.objectContaining({ saved: expect.arrayContaining([firstBook.id]) }),
      1,
      "family"
    );
  });
});

describe("Interactive Topics Wonder Cards & Category Banner", () => {
  it("expands and collapses Wonder Question cards, plays audio, and keeps navigation intact", async () => {
    const { TopicPage } = await import("../src/library/Topics");
    const speak = vi.fn();
    const go = vi.fn();
    const make = vi.fn();
    const record = {
      id: "turtle-breath",
      title: "How does a sea turtle breathe?",
      category: "ocean",
      motif: "turtle",
      legacy: {
        id: "turtles",
        title: "How does a sea turtle breathe?",
        world: "oceans",
        illustration: "turtle",
        short: "Sea turtles swim to the surface to take a breath.",
        deeper: "Their lungs hold lots of air so they can glide underwater.",
        question: "Why do sea turtles come up to the top of the lagoon?",
        related: [],
        sources: [],
        review: { method: "Reviewed", checkedOn: "2026" },
      },
    } as unknown as CatalogItem;

    await act(async () => {
      root = create(
        <TopicPage
          record={record}
          layer="tell"
          onLayer={vi.fn()}
          saved={false}
          toggleSaved={vi.fn()}
          collections={["ocean"]}
          selected=""
          speak={speak}
          go={go}
          make={make}
        />
      );
    });

    expect(root!.root.findByProps({ testID: "topic-category-banner" })).toBeDefined();
    expect(root!.root.findAllByProps({ testID: "topic-wonder-card-answer" })).toHaveLength(0);

    const toggle = root!.root.find((n) => String(n.props.testID).startsWith("wonder-card-toggle-"));
    expect(toggle.props.accessibilityState.expanded).toBe(false);
    await act(async () => toggle.props.onPress());
    expect(toggle.props.accessibilityState.expanded).toBe(true);
    expect(root!.root.findAllByProps({ testID: "topic-wonder-card-answer" })).toHaveLength(1);

    const hearBtn = root!.root.find((n) => String(n.props.testID).startsWith("wonder-card-hear-"));
    await act(async () => hearBtn.props.onPress());
    expect(speak).toHaveBeenCalled();

    // Collapse cleanly.
    await act(async () => toggle.props.onPress());
    expect(toggle.props.accessibilityState.expanded).toBe(false);
    expect(root!.root.findAllByProps({ testID: "topic-wonder-card-answer" })).toHaveLength(0);

    // Draw About This and Try Exhibit navigation remain intact.
    const drawBtn = root!.root.find((n) => String(n.type) === "Pressable" && n.props.accessibilityLabel === "Draw About This");
    await act(async () => drawBtn.props.onPress());
    expect(make).toHaveBeenCalledOnce();
  });
});
