import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newLibraryChild } from "../src/library/state";
import { emptySave } from "../src/state/validation";
import { DISCOVERY_LABS } from "../src/library/labs/registry";

vi.mock("../src/atmosphere/AtmosphereHeader", () => ({ AtmosphereHeader: () => null }));
vi.mock("../src/atmosphere/GlobalWeatherLayer", () => ({ GlobalWeatherLayer: () => null, AtmosphereSky: () => null }));

const env = vi.hoisted(() => ({
  width: 900,
  height: 1024,
  fontScale: 1,
  params: { place: "wonder" } as Record<string, string>,
  store: {} as any,
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
  routerBack: vi.fn(),
  routerDismissTo: vi.fn(),
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
    <View style={style}>
      {ListHeaderComponent}
      {data?.length
        ? data.slice(0, 4).map((item: any) => <React.Fragment key={item.id}>{renderItem({ item })}</React.Fragment>)
        : ListEmptyComponent}
    </View>
  ),
  Keyboard: { dismiss: vi.fn() },
  PanResponder: { create: (handlers: object) => ({ panHandlers: handlers }) },
  AppState: { addEventListener: () => ({ remove() {} }) },
  Platform: { OS: "web" },
  StyleSheet: { create: (v: any) => v, absoluteFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } },
  useWindowDimensions: () => ({ width: env.width, height: env.height, fontScale: env.fontScale }),
}));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));
vi.mock("react-native-svg", () => ({
  default: "Svg",
  Circle: "Circle",
  Ellipse: "Ellipse",
  G: "G",
  Line: "Line",
  Path: "Path",
  Polygon: "Polygon",
  Rect: "Rect",
  SvgXml: "SvgXml",
}));
vi.mock("expo-router", () => ({
  useIsFocused: () => true,
  useLocalSearchParams: () => env.params,
  router: {
    push: (...args: any[]) => env.routerPush(...args),
    replace: (...args: any[]) => env.routerReplace(...args),
    back: (...args: any[]) => env.routerBack(...args),
    dismissTo: (...args: any[]) => env.routerDismissTo(...args),
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
    stop: vi.fn(),
    speak: vi.fn(() => true),
    speakSequence: vi.fn(() => true),
    word: vi.fn(() => true),
    selected: "",
    notice: "",
    readingSequence: false,
  }),
}));
vi.mock("../src/library/assets.generated", () => ({ libraryAssets: {} }));
vi.mock("../src/library/Maker", () => ({ Maker: "Maker", DrawingArt: "DrawingArt" }));

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
  env.width = 900;
  env.height = 1024;
  env.fontScale = 1;
  env.params = { place: "wonder" };
  env.routerPush.mockReset();
  env.routerReplace.mockReset();
  env.routerBack.mockReset();
  env.routerDismissTo.mockReset();

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
  if (root) await act(async () => root!.unmount());
  root = undefined;
});

describe("Library Discovery Labs shelf, search, Continue Reading, and navigation", () => {
  it("renders all 6 new Discovery Labs on the Interactive Labs shelf and opens them cleanly", async () => {
    const { default: LibraryScreen } = await import("../src/library/LibraryScreen");
    await act(async () => {
      root = create(<LibraryScreen />);
    });

    for (const lab of DISCOVERY_LABS) {
      const card = root!.root.findByProps({ testID: `library-discovery-lab-${lab.id}` });
      expect(textOf(card)).toContain(lab.title);
    }

    // Clicking Volcano & Island Builder navigates to discovery-lab and saves canonical destination
    const volcanoCard = root!.root.findByProps({ testID: "library-discovery-lab-volcano-island-lab" });
    await act(async () => volcanoCard.props.onPress());
    expect(env.routerPush).toHaveBeenCalledWith({
      pathname: "/library",
      params: { place: "discovery-lab", id: "volcano-island-lab" },
    });
    expect(env.store.save.library.profiles.family.recent).toContain("dlab-volcano-island-lab");
    expect(env.store.save.library.profiles.family.visited).toContain("dlab-volcano-island-lab");
  });

  it("finds Discovery Labs via Library Search and respects Grown-Ups collection permissions", async () => {
    const { default: LibraryScreen } = await import("../src/library/LibraryScreen");
    await act(async () => {
      root = create(<LibraryScreen />);
    });

    const input = root!.root.find((n) => String(n.type) === "TextInput" && n.props.accessibilityLabel === "Search the Library");
    await act(async () => input.props.onChangeText("hibiscus"));
    await act(async () => root!.update(<LibraryScreen />));

    expect(root!.root.findByProps({ testID: "library-discovery-lab-plant-growth-lab" })).toBeDefined();

    // Disabling plants collection hides Plant & Seed Growth Lab
    env.store.save.library.profiles.family.policy.collections =
      env.store.save.library.profiles.family.policy.collections.filter((c: string) => c !== "plants");
    await act(async () => root!.update(<LibraryScreen />));
    expect(root!.root.findAllByProps({ testID: "library-discovery-lab-plant-growth-lab" })).toHaveLength(0);
  });

  it("shows a recently visited Discovery Lab in Continue Reading and returns via Back", async () => {
    env.store.save.library.profiles.family.recent = ["dlab-color-light-lab"];
    const { default: LibraryScreen } = await import("../src/library/LibraryScreen");
    await act(async () => {
      root = create(<LibraryScreen />);
    });

    const hero = root!.root.findByProps({ testID: "library-continue-reading" });
    expect(textOf(hero)).toContain("Color & Light Mixing Studio");
    await act(async () => root!.root.findByProps({ testID: "library-continue-resume" }).props.onPress());
    expect(env.routerPush).toHaveBeenCalledWith({
      pathname: "/library",
      params: { place: "discovery-lab", id: "color-light-lab" },
    });

    // Opening a Discovery Lab and pressing Back calls router.back()
    await act(async () => root!.unmount());
    env.params = { place: "discovery-lab", id: "color-light-lab" };
    await act(async () => {
      root = create(<LibraryScreen />);
    });
    expect(root!.root.findByProps({ testID: "discovery-lab-color-light-lab" })).toBeDefined();
    const backBtn = root!.root.find((n) => String(n.type) === "Pressable" && n.props.accessibilityLabel === "Back");
    await act(async () => backBtn.props.onPress());
    expect(env.routerBack).toHaveBeenCalledOnce();
  });
});

describe("Interactive UI tests for all 6 Discovery Labs", () => {
  it("Color & Light Mixing Studio mixes paints and switches to Rainbow Prism", async () => {
    const { DiscoveryLabView } = await import("../src/library/labs/DiscoveryLabView");
    await act(async () => {
      root = create(<DiscoveryLabView labId="color-light-lab" sound={false} />);
    });

    await act(async () => root!.root.findByProps({ testID: "paint-drop-yellow" }).props.onPress());
    await act(async () => root!.root.findByProps({ testID: "paint-drop-blue" }).props.onPress());
    expect(textOf(root!.root.findByProps({ testID: "lab-discovery-color-light-lab" }))).toContain("Palm Green");
    expect(textOf(root!.root.findByProps({ testID: "lab-challenge-color-light-lab" }))).toContain("You discovered it!");

    await act(async () => root!.root.findByProps({ testID: "color-mode-light" }).props.onPress());
    await act(async () => root!.root.findByProps({ testID: "light-sunlight-prism" }).props.onPress());
    expect(textOf(root!.root.findByProps({ testID: "lab-discovery-color-light-lab" }))).toContain("Rainbow Spectrum!");
  });

  it("Sound & Island Rhythm Waves plays bamboo bars, changes loudness, and steps the 4-beat rhythm", async () => {
    const { DiscoveryLabView } = await import("../src/library/labs/DiscoveryLabView");
    await act(async () => {
      root = create(<DiscoveryLabView labId="sound-rhythm-lab" sound={false} />);
    });

    await act(async () => root!.root.findByProps({ testID: "sound-loudness-loud" }).props.onPress());
    await act(async () => root!.root.findByProps({ testID: "sound-pad-xylo-c5" }).props.onPress());
    expect(textOf(root!.root.findByProps({ testID: "lab-discovery-sound-rhythm-lab" }))).toContain("523 Hz");

    await act(async () => root!.root.findByProps({ testID: "rhythm-step-beat" }).props.onPress());
    expect(textOf(root!.root.findByProps({ testID: "lab-discovery-sound-rhythm-lab" }))).toContain("Beat 2");
  });

  it("Volcano & Island Builder erupts, cools rock, grows coral reef, and sprouts Guam palms", async () => {
    const { DiscoveryLabView } = await import("../src/library/labs/DiscoveryLabView");
    await act(async () => {
      root = create(<DiscoveryLabView labId="volcano-island-lab" sound={false} />);
    });

    await act(async () => root!.root.findByProps({ testID: "volcano-erupt-btn" }).props.onPress());
    await act(async () => root!.root.findByProps({ testID: "volcano-erupt-btn" }).props.onPress());
    await act(async () => root!.root.findByProps({ testID: "volcano-cool-btn" }).props.onPress());
    await act(async () => root!.root.findByProps({ testID: "volcano-reef-btn" }).props.onPress());
    await act(async () => root!.root.findByProps({ testID: "volcano-palms-btn" }).props.onPress());
    expect(textOf(root!.root.findByProps({ testID: "lab-discovery-volcano-island-lab" }))).toContain("Tropical Island Like Guam!");
  });

  it("Ramp & Balance Physics Lab balances the seesaw and rolls down the friction ramp", async () => {
    const { DiscoveryLabView } = await import("../src/library/labs/DiscoveryLabView");
    await act(async () => {
      root = create(<DiscoveryLabView labId="ramp-balance-lab" sound={false} />);
    });

    // Starts with Pineapple (2) on Left 2 => torque 4. Place Coconut (1) on Right 4 => torque 4!
    await act(async () => root!.root.findByProps({ testID: "seesaw-slot-right-4" }).props.onPress());
    expect(textOf(root!.root.findByProps({ testID: "lab-discovery-ramp-balance-lab" }))).toContain("Perfect Balance!");

    await act(async () => root!.root.findByProps({ testID: "physics-mode-ramp" }).props.onPress());
    await act(async () => root!.root.findByProps({ testID: "ramp-surface-ice" }).props.onPress());
    await act(async () => root!.root.findByProps({ testID: "ramp-roll-btn" }).props.onPress());
    expect(textOf(root!.root.findByProps({ testID: "lab-discovery-ramp-balance-lab" }))).toContain("Slippery Ice");
  });

  it("Plant & Seed Growth Lab grows a plant day-by-day and resets cleanly", async () => {
    const { DiscoveryLabView } = await import("../src/library/labs/DiscoveryLabView");
    await act(async () => {
      root = create(<DiscoveryLabView labId="plant-growth-lab" sound={false} />);
    });

    await act(async () => root!.root.findByProps({ testID: "plant-species-mango-tree" }).props.onPress());
    for (let i = 0; i < 4; i++) {
      await act(async () => root!.root.findByProps({ testID: "plant-next-day-btn" }).props.onPress());
    }
    expect(textOf(root!.root.findByProps({ testID: "lab-discovery-plant-growth-lab" }))).toContain("Day 4");

    await act(async () => root!.root.findByProps({ testID: "lab-reset-plant-growth-lab" }).props.onPress());
    expect(textOf(root!.root.findByProps({ testID: "lab-discovery-plant-growth-lab" }))).toContain("Day 0");
  });

  it("Heartbeat & Calm Breath Lab updates BPM across activities and steps the Calm Breath Bubble", async () => {
    const { DiscoveryLabView } = await import("../src/library/labs/DiscoveryLabView");
    await act(async () => {
      root = create(<DiscoveryLabView labId="heartbeat-breath-lab" sound={false} />);
    });

    await act(async () => root!.root.findByProps({ testID: "body-activity-running" }).props.onPress());
    expect(textOf(root!.root.findByProps({ testID: "lab-discovery-heartbeat-breath-lab" }))).toContain("148 Beats / Min");

    const bubbleBtn = root!.root.findByProps({ testID: "breath-next-step-btn" });
    await act(async () => bubbleBtn.props.onPress());
    expect(textOf(root!.root.findByProps({ testID: "calm-breath-bubble-card" }))).toContain("Hold Gently");
    await act(async () => bubbleBtn.props.onPress());
    expect(textOf(root!.root.findByProps({ testID: "calm-breath-bubble-card" }))).toContain("Breathe Out");
  });
});
