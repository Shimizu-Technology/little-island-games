import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newLibraryChild } from "../src/library/state";
import { emptySave } from "../src/state/validation";
import type { CatalogItem } from "../src/library/catalog";

const env = vi.hoisted(() => ({
  width: 390,
  height: 844,
  fontScale: 1,
  nunitoLoaded: false,
  params: { place: "wonder" } as Record<string, string>,
  store: {} as any,
}));

vi.mock("react-native", () => ({
  View: "View",
  ScrollView: "ScrollView",
  TextInput: "TextInput",
  Pressable: "Pressable",
  Switch: "Switch",
  Image: "Image",
  FlatList: ({ ListHeaderComponent, data, renderItem, ListEmptyComponent, style, columnWrapperStyle }: any) => (
    <View style={style} data-column-wrapper={columnWrapperStyle}>
      {ListHeaderComponent}
      {data?.length ? data.slice(0, 2).map((item: any) => <React.Fragment key={item.id}>{renderItem({ item })}</React.Fragment>) : ListEmptyComponent}
    </View>
  ),
  Keyboard: { dismiss: vi.fn() },
  PanResponder: { create: (handlers: object) => ({ panHandlers: handlers }) },
  AppState: { addEventListener: () => ({ remove() {} }) },
  StyleSheet: { create: (v: any) => v, absoluteFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } },
  useWindowDimensions: () => ({ width: env.width, height: env.height, fontScale: env.fontScale }),
}));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));
vi.mock("react-native-svg", () => ({ default: "Svg", G: "G", SvgXml: "SvgXml" }));
vi.mock("expo-router", () => ({
  useIsFocused: () => true,
  useLocalSearchParams: () => env.params,
  router: { push: vi.fn(), replace: vi.fn(), back: vi.fn(), dismissTo: vi.fn(), canGoBack: () => true },
}));
vi.mock("../src/components/Text", () => ({ Text: "Text" }));
vi.mock("../src/components/ui", () => ({ font: "System" }));
vi.mock("../src/components/Recovery", () => ({ Recovery: () => null }));
vi.mock("../src/components/SaveStatus", () => ({ SaveStatus: () => null }));
vi.mock("../src/explore/ExploreArt", () => ({ Motif: "Motif", TopicArt: "TopicArt" }));
vi.mock("../src/ui/fonts", () => ({ useNunitoLoaded: () => env.nunitoLoaded }));
vi.mock("../src/state/Store", () => ({ useStore: () => env.store }));
vi.mock("../src/library/useLibraryAudio", () => ({
  useLibraryAudio: () => ({ stop: vi.fn(), speak: vi.fn(), word: vi.fn(), selected: "", notice: "" }),
}));
vi.mock("../src/library/LibraryGlyph", () => ({ LibraryGlyph: "LibraryGlyph" }));
vi.mock("../src/library/LibraryArt", () => ({ LibraryArt: "LibraryArt" }));
vi.mock("../src/library/SceneBackdrop", () => ({ SceneBackdrop: "SceneBackdrop" }));
vi.mock("../src/library/SoundSwitch", () => ({ SoundSwitch: "SoundSwitch" }));
vi.mock("../src/library/Reader", () => ({ Reader: "Reader", SentenceLine: "SentenceLine" }));
vi.mock("../src/library/Maker", () => ({ Maker: "Maker", DrawingArt: "DrawingArt" }));
vi.mock("../src/library/ReviewedNarration", () => ({ ReviewedNarration: "ReviewedNarration" }));
vi.mock("../src/library/Exhibit", () => ({ Exhibit: "Exhibit" }));

const View = "View" as any;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function flat(style: unknown): Record<string, any> {
  if (!style) return {};
  if (typeof style === "function") return flat(style({ pressed: false }));
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flat));
  return typeof style === "object" ? (style as Record<string, any>) : {};
}

function textOf(node: { children: unknown[] }): string {
  return node.children
    .map((child) => (typeof child === "string" || typeof child === "number" ? String(child) : child && typeof child === "object" && "children" in child ? textOf(child as { children: unknown[] }) : ""))
    .join("");
}

let root: ReactTestRenderer | undefined;

beforeEach(() => {
  env.width = 390;
  env.height = 844;
  env.fontScale = 1;
  env.nunitoLoaded = false;
  env.params = { place: "wonder" };
  env.store = {
    ready: true,
    recovery: null,
    error: null,
    saving: false,
    epoch: 1,
    save: { ...emptySave(), library: { version: 2, profiles: { family: newLibraryChild() } } },
    libraryPatch: vi.fn(() => true),
    libraryPolicy: vi.fn(),
    libraryFlush: vi.fn(async () => true),
    selectLearner: vi.fn(),
    settings: vi.fn(),
  };
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
});

describe("Island Library Clean 4.0 Warm Island Storybook polish", () => {
  it("uses warm sunlit cream canvas, espresso ink, warm secondary copy, and storybook cards", async () => {
    const { palette, s } = await import("../src/library/ui");
    expect(s.page.backgroundColor).toBe("#FFF6E5");
    expect(palette.ink).toBe("#3D2B24");
    expect(palette.muted).toBe("#665247");
    expect(s.card.backgroundColor).toBe("#FFFDF8");
    expect(s.card.borderColor).toBe("#E8D8BE");
    expect(s.action.minHeight).toBeGreaterThanOrEqual(44);
    expect(s.action.minWidth).toBeGreaterThanOrEqual(44);
  });

  it.each([
    [false, undefined, "800"],
    [true, "Nunito_800ExtraBold", "normal"],
  ])("guards bold Nunito headings cleanly when nunitoLoaded=%s", async (loaded, expectedFamily, expectedWeight) => {
    env.nunitoLoaded = loaded;
    const { default: LibraryScreen } = await import("../src/library/LibraryScreen");
    await act(async () => {
      root = create(<LibraryScreen />);
    });
    const texts = root!.root.findAll((node) => String(node.type) === "Text");
    for (const label of ["Island Library", "What do you wonder?", "Look & Listen"]) {
      const target = texts.find((t) => textOf(t) === label);
      expect(target, label).toBeDefined();
      const st = flat(target!.props.style);
      if (expectedFamily) expect(st.fontFamily).toBe(expectedFamily);
      expect(st.fontWeight).toBe(expectedWeight);
      expect(st.color).toBe("#3D2B24");
    }
  });

  it("keeps 44pt+ tap targets and clean stacked Look & Listen hero at 320x568 with 1.35x text", async () => {
    env.width = 320;
    env.height = 568;
    env.fontScale = 1.35;
    env.nunitoLoaded = true;
    const { default: LibraryScreen } = await import("../src/library/LibraryScreen");
    await act(async () => {
      root = create(<LibraryScreen />);
    });
    const hero = root!.root.find((node) => String(node.type) === "Pressable" && node.props.accessibilityLabel === "Look & Listen");
    expect(flat(hero.props.style).flexDirection).toBe("column");
    expect(flat(hero.props.style).backgroundColor).toBe("#FFFDF8");
    expect(flat(hero.props.style).borderColor).toBe("#E8D8BE");
    const safeArea = root!.root.find((node) => String(node.type) === "SafeAreaView");
    expect(flat(safeArea.props.style).backgroundColor).toBe("#FFF6E5");
  });

  it("applies warm storybook card surfaces to StudioCard, GrownUps, TopicPage, and LookListen", async () => {
    env.nunitoLoaded = true;
    const { StudioCard } = await import("../src/library/StudioCard");
    await act(async () => {
      root = create(<StudioCard open>{<View />}</StudioCard>);
    });
    const studioStyle = flat(root!.root.find((n) => String(n.type) === "ScrollView").props.style);
    expect(studioStyle.backgroundColor).toBe("#FFFDF8");
    expect(studioStyle.borderColor).toBe("#E8D8BE");
    await act(async () => root!.unmount());

    const { GrownUps } = await import("../src/library/GrownUps");
    await act(async () => {
      root = create(
        <GrownUps
          people={[{ id: "family", name: "Family" }]}
          selected="family"
          getPolicy={() => newLibraryChild().policy}
          onPolicy={vi.fn()}
          onExtend={vi.fn()}
          onDone={vi.fn()}
          onSelect={vi.fn()}
        />
      );
    });
    const grownTitle = root!.root.findAll((n) => String(n.type) === "Text").find((t) => textOf(t) === "Grown-ups")!;
    expect(flat(grownTitle.props.style).fontFamily).toBe("Nunito_800ExtraBold");
    expect(flat(grownTitle.props.style).fontWeight).toBe("normal");
    await act(async () => root!.unmount());

    const { LookListen } = await import("../src/library/LookListen");
    const { namingLabel } = await import("../src/library/catalog");
    const lookItem = { id: "turtle", title: "Turtle", category: "ocean", motif: "turtle" } as CatalogItem;
    await act(async () => {
      root = create(
        <LookListen
          items={[lookItem]}
          speak={vi.fn()}
          stop={vi.fn()}
          onExit={vi.fn()}
        />
      );
    });
    const word = root!.root.findAll((n) => String(n.type) === "Text").find((t) => textOf(t) === namingLabel(lookItem))!;
    expect(flat(word.props.style).fontFamily).toBe("Nunito_800ExtraBold");
    expect(flat(word.props.style).fontWeight).toBe("normal");
    const lockBtn = root!.root.find((n) => String(n.type) === "Pressable" && n.props.accessibilityLabel === "Grown-up exit. Hold to exit.");
    expect(flat(lockBtn.props.style).minWidth).toBeGreaterThanOrEqual(44);
    expect(flat(lockBtn.props.style).minHeight).toBeGreaterThanOrEqual(44);
    await act(async () => root!.unmount());

    const { TopicPage } = await import("../src/library/Topics");
    await act(async () => {
      root = create(
        <TopicPage
          record={{ id: "turtle-breath", title: "Sea Turtles", category: "ocean", motif: "turtle", legacy: { id: "turtles", title: "Sea Turtles", world: "oceans", illustration: "turtle", short: "Turtles swim.", deeper: "They breathe air.", question: "How long?", related: [], sources: [], review: { method: "Reviewed", checkedOn: "2026" } } } as unknown as CatalogItem}
          layer="tell"
          onLayer={vi.fn()}
          saved={false}
          toggleSaved={vi.fn()}
          collections={["ocean"]}
          selected=""
          speak={vi.fn()}
          go={vi.fn()}
          make={vi.fn()}
        />
      );
    });
    const topicTitle = root!.root.findAll((n) => String(n.type) === "Text").find((t) => textOf(t) === "Sea Turtles")!;
    expect(flat(topicTitle.props.style).fontFamily).toBe("Nunito_800ExtraBold");
    expect(flat(topicTitle.props.style).fontWeight).toBe("normal");
  });
});
