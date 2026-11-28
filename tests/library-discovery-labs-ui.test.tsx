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
  focused: true,
  params: { place: "wonder" } as Record<string, string>,
  store: {} as any,
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
  routerBack: vi.fn(),
  routerDismissTo: vi.fn(),
  appStateListeners: new Set<(state: string) => void>(),
  reduceMotion: false,
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
  AccessibilityInfo: {
    isReduceMotionEnabled: vi.fn(async () => env.reduceMotion),
    addEventListener: vi.fn(() => ({ remove() {} })),
  },
  AppState: {
    currentState: "active",
    addEventListener: (_event: string, cb: (state: string) => void) => {
      env.appStateListeners.add(cb);
      return {
        remove() {
          env.appStateListeners.delete(cb);
        },
      };
    },
  },
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
  useIsFocused: () => env.focused,
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
  env.focused = true;
  env.reduceMotion = false;
  env.appStateListeners.clear();
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

function findRawTextOutsideTextNodes(node: any, parentType = "ROOT", out: Array<{ parentType: string; value: string }> = []) {
  if (node === null || node === undefined) return out;
  if (Array.isArray(node)) {
    for (const child of node) findRawTextOutsideTextNodes(child, parentType, out);
    return out;
  }
  if (typeof node === "string" || typeof node === "number") {
    const str = String(node);
    if (str.trim().length > 0 && parentType !== "Text" && parentType !== "Copy" && parentType !== "Heading") {
      out.push({ parentType, value: str });
    }
    return out;
  }
  if (typeof node === "object" && "type" in node) {
    const nextParent = String(node.type);
    if (Array.isArray(node.children)) {
      for (const child of node.children) findRawTextOutsideTextNodes(child, nextParent, out);
    }
  }
  return out;
}

function flattenStyle(style: any): Record<string, any> {
  if (!style) return {};
  if (typeof style === "function") return flattenStyle(style({ pressed: false }));
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  if (typeof style === "object") return style;
  return {};
}

function installManualRaf() {
  const origRaf = globalThis.requestAnimationFrame;
  const origCancel = globalThis.cancelAnimationFrame;
  let nextId = 1;
  let now = 1000;
  const pending = new Map<number, FrameRequestCallback>();
  const cancelled: number[] = [];

  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    const id = nextId++;
    pending.set(id, cb);
    return id;
  }) as typeof requestAnimationFrame;

  globalThis.cancelAnimationFrame = ((id: number) => {
    cancelled.push(id);
    pending.delete(id);
  }) as typeof cancelAnimationFrame;

  return {
    pending,
    cancelled,
    async step(dtMs: number) {
      now += dtMs;
      const batch = [...pending.entries()];
      pending.clear();
      for (const [, cb] of batch) {
        await act(async () => {
          cb(now);
        });
      }
    },
    restore() {
      globalThis.requestAnimationFrame = origRaf;
      globalThis.cancelAnimationFrame = origCancel;
    },
  };
}

describe("R1-01, R1-02, R1-04, R1-05, R1-06, R1-07 UI regressions", () => {
  it("R1-01: renders zero raw text nodes outside <Text> across all 6 Discovery Labs and LabButton primitive arrays", async () => {
    const { DiscoveryLabView } = await import("../src/library/labs/DiscoveryLabView");
    const { LabButton } = await import("../src/library/labs/LabShell");

    // LabButton directly given a mixed primitive array child
    await act(async () => {
      root = create(
        <LabButton onPress={vi.fn()}>
          {"Coconut"} ({1})
        </LabButton>
      );
    });
    expect(findRawTextOutsideTextNodes(root!.toJSON())).toEqual([]);
    await act(async () => root!.unmount());

    for (const lab of DISCOVERY_LABS) {
      await act(async () => {
        root = create(<DiscoveryLabView labId={lab.id} sound={false} saved={false} onToggleSaved={vi.fn()} />);
      });
      expect(findRawTextOutsideTextNodes(root!.toJSON()), `${lab.id} default mode`).toEqual([]);

      // Also check secondary modes
      if (lab.id === "color-light-lab") {
        await act(async () => root!.root.findByProps({ testID: "color-mode-light" }).props.onPress());
        expect(findRawTextOutsideTextNodes(root!.toJSON()), "color-light-lab light mode").toEqual([]);
      } else if (lab.id === "sound-rhythm-lab") {
        await act(async () => root!.root.findByProps({ testID: "sound-mode-drums" }).props.onPress());
        expect(findRawTextOutsideTextNodes(root!.toJSON()), "sound-rhythm-lab drums mode").toEqual([]);
        await act(async () => root!.root.findByProps({ testID: "sound-mode-strings" }).props.onPress());
        expect(findRawTextOutsideTextNodes(root!.toJSON()), "sound-rhythm-lab strings mode").toEqual([]);
      } else if (lab.id === "ramp-balance-lab") {
        await act(async () => root!.root.findByProps({ testID: "physics-mode-ramp" }).props.onPress());
        expect(findRawTextOutsideTextNodes(root!.toJSON()), "ramp-balance-lab ramp mode").toEqual([]);
      }

      await act(async () => root!.unmount());
      root = undefined;
    }
  });

  it("R1-02: cancels rAF and pauses active lab loops on navigation blur without unmounting, and resumes cleanly", async () => {
    const raf = installManualRaf();
    try {
      const { default: LibraryScreen } = await import("../src/library/LibraryScreen");

      // 1. Sound & Rhythm Lab inside LibraryScreen
      env.params = { place: "discovery-lab", id: "sound-rhythm-lab" };
      env.focused = true;
      await act(async () => {
        root = create(<LibraryScreen />);
      });
      await act(async () => root!.root.findByProps({ testID: "rhythm-play-toggle" }).props.onPress());
      expect(raf.pending.size).toBeGreaterThan(0);

      // Blur without unmounting
      env.focused = false;
      await act(async () => root!.update(<LibraryScreen />));
      expect(raf.pending.size).toBe(0);
      expect(raf.cancelled.length).toBeGreaterThan(0);

      // Resume focus cleanly
      env.focused = true;
      await act(async () => root!.update(<LibraryScreen />));
      expect(raf.pending.size).toBeGreaterThan(0);

      await act(async () => root!.unmount());
      root = undefined;

      // 2. Heartbeat & Calm Breath Lab inside LibraryScreen
      env.params = { place: "discovery-lab", id: "heartbeat-breath-lab" };
      env.focused = true;
      await act(async () => {
        root = create(<LibraryScreen />);
      });
      expect(raf.pending.size).toBeGreaterThan(0);

      env.focused = false;
      await act(async () => root!.update(<LibraryScreen />));
      expect(raf.pending.size).toBe(0);

      await act(async () => root!.unmount());
      root = undefined;
    } finally {
      raf.restore();
    }
  });

  it("R1-04: animates lungs smoothly with activity breathing rate, visibly faster when Running than Sleeping", async () => {
    const raf = installManualRaf();
    try {
      const { DiscoveryLabView } = await import("../src/library/labs/DiscoveryLabView");
      await act(async () => {
        root = create(<DiscoveryLabView labId="heartbeat-breath-lab" sound={false} />);
      });

      const readLungScale = () => {
        const g = root!.root.findByProps({ testID: "heartbeat-lungs-group" });
        const match = /scale\(([0-9.]+)\)/.exec(String(g.props.transform));
        expect(match).not.toBeNull();
        return Number(match![1]);
      };

      // Switch to Sleeping (12 breaths/min) and measure total scale change over 2000ms (40 x 50ms)
      await act(async () => root!.root.findByProps({ testID: "body-activity-sleeping" }).props.onPress());
      await raf.step(16); // seed initial timestamp
      let prev = readLungScale();
      let sleepMotion = 0;
      for (let i = 0; i < 40; i++) {
        await raf.step(50);
        const cur = readLungScale();
        sleepMotion += Math.abs(cur - prev);
        prev = cur;
      }
      expect(sleepMotion).toBeGreaterThan(0.05);

      // Reset & switch to Running (34 breaths/min) and measure over the same 2000ms (40 x 50ms)
      await act(async () => root!.root.findByProps({ testID: "lab-reset-heartbeat-breath-lab" }).props.onPress());
      await act(async () => root!.root.findByProps({ testID: "body-activity-running" }).props.onPress());
      prev = readLungScale();
      let runMotion = 0;
      for (let i = 0; i < 40; i++) {
        await raf.step(50);
        const cur = readLungScale();
        runMotion += Math.abs(cur - prev);
        prev = cur;
      }
      expect(runMotion).toBeGreaterThan(sleepMotion * 2);

      await act(async () => root!.unmount());
      root = undefined;
    } finally {
      raf.restore();
    }
  });

  it("R1-05: animates the first ramp race after Reset both after a completed run and after an interrupted run", async () => {
    const raf = installManualRaf();
    try {
      const { DiscoveryLabView } = await import("../src/library/labs/DiscoveryLabView");
      await act(async () => {
        root = create(<DiscoveryLabView labId="ramp-balance-lab" sound={false} />);
      });

      const readCarX = () => {
        const rects = root!.root.findAll((n) => String(n.type) === "Rect" && n.props.fill === "#E05A47");
        expect(rects.length).toBeGreaterThan(0);
        return Number(rects[0].props.x);
      };

      // 1. Complete first ramp run
      await act(async () => root!.root.findByProps({ testID: "physics-mode-ramp" }).props.onPress());
      const startX = readCarX();
      await act(async () => root!.root.findByProps({ testID: "ramp-roll-btn" }).props.onPress());
      expect(raf.pending.size).toBeGreaterThan(0);
      await raf.step(16);
      await raf.step(1000);
      const finishedX = readCarX();
      expect(finishedX).toBeGreaterThan(startX + 100);

      // Reset after completed run, switch back to ramp, and roll again!
      await act(async () => root!.root.findByProps({ testID: "lab-reset-ramp-balance-lab" }).props.onPress());
      await act(async () => root!.root.findByProps({ testID: "physics-mode-ramp" }).props.onPress());
      expect(readCarX()).toBeCloseTo(startX, 1);
      await act(async () => root!.root.findByProps({ testID: "ramp-roll-btn" }).props.onPress());
      expect(raf.pending.size).toBeGreaterThan(0);
      await raf.step(16);
      await raf.step(400);
      const midX = readCarX();
      expect(midX).toBeGreaterThan(startX + 20);
      expect(midX).toBeLessThan(finishedX);

      // 2. Interrupt mid-flight with Reset, then roll again cleanly!
      await act(async () => root!.root.findByProps({ testID: "lab-reset-ramp-balance-lab" }).props.onPress());
      expect(raf.pending.size).toBe(0);
      await act(async () => root!.root.findByProps({ testID: "physics-mode-ramp" }).props.onPress());
      await act(async () => root!.root.findByProps({ testID: "ramp-roll-btn" }).props.onPress());
      expect(raf.pending.size).toBeGreaterThan(0);
      await raf.step(16);
      await raf.step(1000);
      expect(readCarX()).toBeGreaterThan(startX + 100);

      await act(async () => root!.unmount());
      root = undefined;
    } finally {
      raf.restore();
    }
  });

  it("R1-06: stacks 4-beat rhythm tracks on compact 320px/375px phones while keeping >=48px beat touch targets", async () => {
    const { DiscoveryLabView } = await import("../src/library/labs/DiscoveryLabView");

    for (const phoneWidth of [320, 375]) {
      env.width = phoneWidth;
      await act(async () => {
        root = create(<DiscoveryLabView labId="sound-rhythm-lab" sound={false} />);
      });
      const row = root!.root.findByProps({ testID: "rhythm-track-row-drum" });
      expect(flattenStyle(row.props.style).flexDirection, `width=${phoneWidth}`).toBe("column");
      for (let beat = 0; beat < 4; beat++) {
        const cell = root!.root.findByProps({ testID: `rhythm-cell-drum-${beat}` });
        const st = flattenStyle(cell.props.style);
        expect(st.minWidth).toBeGreaterThanOrEqual(48);
        expect(st.minHeight).toBeGreaterThanOrEqual(48);
      }
      await act(async () => root!.unmount());
      root = undefined;
    }

    // Wide tablet keeps horizontal row layout
    env.width = 900;
    await act(async () => {
      root = create(<DiscoveryLabView labId="sound-rhythm-lab" sound={false} />);
    });
    const wideRow = root!.root.findByProps({ testID: "rhythm-track-row-drum" });
    expect(flattenStyle(wideRow.props.style).flexDirection).toBe("row");
  });

  it("R1-07: renders LabStepper indicator pills as non-interactive Views and keeps +/- targets >= 48px", async () => {
    const { LabStepper } = await import("../src/library/labs/LabShell");
    const onChange = vi.fn();
    await act(async () => {
      root = create(<LabStepper label="Magma Heat" value={3} min={1} max={5} onChange={onChange} testIDPrefix="test-step" />);
    });

    const pressables = root!.root.findAll((n) => String(n.type) === "Pressable");
    expect(pressables).toHaveLength(2);
    for (const p of pressables) {
      const st = flattenStyle(p.props.style);
      expect(st.minWidth).toBeGreaterThanOrEqual(48);
      expect(st.minHeight).toBeGreaterThanOrEqual(48);
    }

    await act(async () => root!.root.findByProps({ testID: "test-step-plus" }).props.onPress());
    expect(onChange).toHaveBeenCalledWith(4);
    await act(async () => root!.root.findByProps({ testID: "test-step-minus" }).props.onPress());
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("R2-02: resets breathing phase timer on manual Next Breath Step, pause/resume, and Reset during auto mode", async () => {
    const raf = installManualRaf();
    try {
      const { DiscoveryLabView } = await import("../src/library/labs/DiscoveryLabView");
      await act(async () => {
        root = create(<DiscoveryLabView labId="heartbeat-breath-lab" sound={false} />);
      });

      const bubbleText = () => textOf(root!.root.findByProps({ testID: "calm-breath-bubble-card" }));

      // Enable Follow Calm Bubble (starts in Inhale, 3600ms)
      await act(async () => root!.root.findByProps({ testID: "breath-auto-toggle" }).props.onPress());
      expect(bubbleText()).toContain("Breathe In");

      // Advance 3,000 ms into Inhale (60 x 50ms)
      await raf.step(16);
      for (let i = 0; i < 60; i++) {
        await raf.step(50);
      }
      expect(bubbleText()).toContain("Breathe In");

      // Tap Next Breath Step -> advances to Hold Gently (2200ms) and resets elapsed timer
      await act(async () => root!.root.findByProps({ testID: "breath-next-step-btn" }).props.onPress());
      expect(bubbleText()).toContain("Hold Gently");

      // Next 20ms frame must NOT skip Hold Gently straight to Breathe Out!
      await raf.step(20);
      expect(bubbleText()).toContain("Hold Gently");

      // Stay in Hold Gently across 2,000 ms (40 x 50ms -> 2020ms < 2200ms)
      for (let i = 0; i < 40; i++) {
        await raf.step(50);
      }
      expect(bubbleText()).toContain("Hold Gently");

      // Crossing 2,200 ms cleanly transitions to Breathe Out
      for (let i = 0; i < 5; i++) {
        await raf.step(50);
      }
      expect(bubbleText()).toContain("Breathe Out");

      // Advance 3,000 ms into Breathe Out (4200ms), then manual Next -> back to Breathe In with fresh clock
      for (let i = 0; i < 60; i++) {
        await raf.step(50);
      }
      await act(async () => root!.root.findByProps({ testID: "breath-next-step-btn" }).props.onPress());
      expect(bubbleText()).toContain("Breathe In");
      await raf.step(20);
      expect(bubbleText()).toContain("Breathe In");

      // Pause & resume resets elapsed clock; Reset restores defaults
      await act(async () => root!.root.findByProps({ testID: "breath-auto-toggle" }).props.onPress());
      await act(async () => root!.root.findByProps({ testID: "breath-auto-toggle" }).props.onPress());
      await raf.step(20);
      expect(bubbleText()).toContain("Breathe In");

      await act(async () => root!.root.findByProps({ testID: "lab-reset-heartbeat-breath-lab" }).props.onPress());
      expect(bubbleText()).toContain("Follow Calm Bubble");

      await act(async () => root!.unmount());
      root = undefined;
    } finally {
      raf.restore();
    }
  });
});
