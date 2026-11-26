import React, { createContext } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArcadeArt, StarDisplay } from "../src/arcade/Art";
import { OutfitCloset, StickerBook } from "../src/arcade/Collection";
import { StarReveal } from "../src/arcade/Juice";
import { LevelMap } from "../src/arcade/LevelMap";
import { ArcadeGameScreen } from "../src/arcade/ArcadeScreen";
import { arcadeGames } from "../src/arcade/registry";
import { emptyArcadeLearner, emptyGameProgress } from "../src/arcade/progress";
import { cargoLevels } from "../src/arcade/games/canoe-cargo/engine";
import { StoreProvider } from "../src/state/Store";
import { emptySave } from "../src/state/validation";
import { addLearner, selectLearner } from "../src/learn/learners";
import { theme } from "../src/ui/theme";

const viewport = vi.hoisted(() => ({ width: 390, height: 844, fontScale: 1 }));
const fonts = vi.hoisted(() => ({ loaded: false }));
const db = vi.hoisted(() => ({ raw: null as string | null }));

vi.mock("../src/state/storage", () => ({
  storage: {
    get: async () => db.raw,
    set: async (raw: string) => { db.raw = raw; },
    preserve: async () => {},
  },
}));
vi.mock("../src/ui/fonts", () => ({ useNunitoLoaded: () => fonts.loaded }));
vi.mock("react-native", () => {
  class Value { constructor(public value: number) {} setValue(v: number) { this.value = v; } }
  return {
    View: "View",
    Image: "Image",
    Text: "Text",
    TextInput: "TextInput",
    ScrollView: "ScrollView",
    Switch: "Switch",
    Pressable: "Pressable",
    Modal: "Modal",
    KeyboardAvoidingView: "KeyboardAvoidingView",
    StyleSheet: {
      create: (s: object) => s,
      absoluteFill: {},
      flatten: (s: unknown) => Array.isArray(s) ? Object.assign({}, ...s.flat(9).filter(Boolean)) : s,
    },
    PanResponder: { create: () => ({ panHandlers: {} }) },
    Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios },
    Animated: {
      createAnimatedComponent: (c: unknown) => c,
      View: "AnimatedView",
      Value,
      timing: () => ({ start: (cb?: (r: { finished: boolean }) => void) => cb?.({ finished: true }) }),
      spring: () => ({ start: () => {} }),
    },
    useWindowDimensions: () => viewport,
    AppState: { addEventListener: () => ({ remove() {} }) },
  };
});
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock("react-native-svg", () => ({
  default: "Svg",
  Circle: "Circle",
  Defs: "Defs",
  Ellipse: "Ellipse",
  G: "G",
  LinearGradient: "LinearGradient",
  Path: "Path",
  Rect: "Rect",
  Stop: "Stop",
}));
vi.mock("react-native-reanimated", () => ({
  default: { View: "AnimatedView" },
  useSharedValue: (v: unknown) => ({ value: v }),
  useAnimatedStyle: () => ({}),
  cancelAnimation: () => {},
  Easing: { inOut: () => {}, out: () => {}, sin: {}, quad: {} },
  withDelay: () => 0,
  withRepeat: () => 0,
  withSequence: () => 0,
  withSpring: () => 0,
  withTiming: () => 0,
}));
vi.mock("expo-router", () => ({ router: { replace: vi.fn(), push: vi.fn() } }));
vi.mock("../src/components/Audio", () => ({ AudioPreferences: createContext({}) }));
vi.mock("../src/components/motion", () => ({ easeOut: 0, nativeDriver: true, useReducedMotion: () => true }));
vi.mock("../src/components/Settings", () => ({ Settings: () => null }));
vi.mock("../src/components/SaveStatus", () => ({ SaveStatus: () => null }));
vi.mock("../src/islander/Companion", () => ({ Companion: "Companion" }));
vi.mock("../src/personalization/LearnerChip", () => ({ LearnerChip: () => null }));
vi.mock("../src/badges/ResultCard", () => ({ BadgeResultCard: () => null }));
vi.mock("../src/arcade/PlayScene", () => ({ PlayScene: "PlayScene" }));
vi.mock("../src/arcade/PlayTeaching", () => ({
  PlayTeaching: ({ onPlay }: { onPlay: () => void }) => <View testID="teach-play" onTouchEnd={onPlay} />,
}));
vi.mock("../src/arcade/Teaching", () => ({
  Teaching: ({ onPlay }: { onPlay: () => void }) => <View testID="teach-play" onTouchEnd={onPlay} />,
}));
vi.mock("../src/arcade/TreasureArt", () => ({ ChestArt: () => null }));
vi.mock("../src/arcade/audio", () => ({ useArcadeAudio: () => ({ say() {}, tone() {} }) }));
vi.mock("../src/arcade/breakClock", () => ({ markArcadePlaying() {}, arcadeBreakDue: () => false, acknowledgeArcadeBreak() {} }));
vi.mock("../src/arcade/loop", () => ({ useArcadeForeground: () => true }));
vi.mock("../src/arcade/games/fruit-bat-flight/Art", () => ({ ShellMedal: () => null }));
vi.mock("../src/arcade/plays", async () => {
  const { cargoLevel, cargoLevels: levels } = await import("../src/arcade/games/canoe-cargo/engine");
  return {
    arcadePlays: {
      "canoe-cargo": {
        level: cargoLevel,
        levels,
        speech: () => "",
        goal: () => "Pack full rows. Send the cargo sailing.",
        clearedTitle: "Cargo away, captain!",
        learningSkill: () => null,
        Board: (props: Record<string, unknown>) => React.createElement("mock-board", props),
        Scene: () => null,
      },
    },
  };
});

const flat = (style: unknown) => StyleSheet.flatten(style as never) as Record<string, unknown> | undefined;
const textOf = (n: ReactTestInstance): string => n.children.map(c => (typeof c === "string" ? c : textOf(c))).join("");
let root: ReturnType<typeof TestRenderer.create> | undefined;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("__DEV__", false);
  fonts.loaded = false;
  Object.assign(viewport, { width: 390, height: 844, fontScale: 1 });
  db.raw = JSON.stringify({ ...emptySave(), learning: selectLearner(addLearner(undefined, "Stassie", "stassie"), "stassie") });
});
afterEach(async () => {
  if (root) await act(async () => { root!.unmount(); });
  root = undefined;
  vi.unstubAllGlobals();
});

describe("Wave 1A Clean 4.0 Arcade shell overhaul", () => {
  it("renders illustrated WebP medallions for all 9 games and preserves outfit badges", async () => {
    for (const game of arcadeGames) {
      await act(async () => { root = TestRenderer.create(<ArcadeArt game={game.id} size={96} outfit="sunhat" />); });
      const img = root!.root.findByType(Image);
      expect(img.props.source).toBe(`assets/art/arcade/${game.id}.webp`);
      expect(root!.root.findByProps({ testID: "outfit-badge-sunhat" })).toBeDefined();
      await act(async () => { root!.unmount(); });
      root = undefined;
    }
  });

  it("uses glossy golden stars and warm cream unearned stars (never flat muddy grey)", async () => {
    await act(async () => {
      root = TestRenderer.create(
        <>
          <StarDisplay stars={2} size={20} />
          <StarReveal stars={1} onTone={() => {}} active={false} />
        </>,
      );
    });
    const serialized = JSON.stringify(root!.toJSON());
    expect(serialized).toContain("#FFCE45");
    expect(serialized).toContain("#F5B425");
    expect(serialized).toContain("#E8DCC8");
    expect(serialized).not.toContain("#779AA0");
    expect(serialized).not.toContain("#E8E9E2");
  });

  it("renders LevelMap, StartCard, and ResultScreen on a sunlit #FFF6E5 canvas with zero dark #24536A boxes", async () => {
    fonts.loaded = true;
    const canoe = arcadeGames.find(g => g.id === "canoe-cargo")!;
    await act(async () => {
      root = TestRenderer.create(<StoreProvider><ArcadeGameScreen game={canoe} /></StoreProvider>);
    });

    // LevelMap checks
    const header = root!.root.findByProps({ testID: "arcade-header" });
    expect(flat(header.props.style)?.backgroundColor).toBe("#FFF6E5");
    const worldTabs = root!.root.findByProps({ testID: "arcade-world-tabs" });
    expect(worldTabs.type).toBe(ScrollView);
    expect(worldTabs.props.horizontal).toBe(true);
    const heroBanner = root!.root.findByProps({ testID: "arcade-hero-banner" });
    expect(heroBanner.findByType(Image).props.source).toBe("assets/art/arcade/canoe-cargo.webp");
    expect(JSON.stringify(root!.toJSON())).not.toContain("#24536A");
    expect(JSON.stringify(root!.toJSON())).not.toContain("#1E4D60");

    // Open W1-1 Start Card
    await act(async () => {
      root!.root.findByProps({ testID: "level-w1-1" }).props.onPress();
    });
    const startCard = root!.root.findByProps({ testID: "arcade-start-card" });
    expect(flat(startCard.props.style)?.backgroundColor).toBe("#FFFDF8");
    const startDock = root!.root.findByProps({ testID: "arcade-start-dock" });
    const startBtn = startDock.findAll(n => textOf(n) === "Show me & play")[0];
    expect(startBtn).toBeDefined();
    expect(JSON.stringify(root!.toJSON())).not.toContain("#24536A");

    // Start round via Teach -> Board -> Result Screen
    await act(async () => {
      startDock.findAll(n => typeof n.props.onPress === "function")[0].props.onPress();
    });
    await act(async () => {
      root!.root.findByProps({ testID: "teach-play" }).props.onTouchEnd();
    });
    const board = root!.root.findAll(n => String(n.type) === "mock-board")[0];
    await act(async () => {
      board.props.onResult({ cleared: true, stars: 3, score: 420, detail: "5 canoes sailed · 17 loads packed" });
    });

    const resultCard = root!.root.findByProps({ testID: "arcade-result-card" });
    expect(flat(resultCard.props.style)?.backgroundColor).toBe("#FFFDF8");
    const resultJson = JSON.stringify(root!.toJSON());
    expect(resultJson).toContain("assets/art/arcade/canoe-cargo.webp");
    expect(resultJson).toContain("5 canoes sailed · 17 loads packed");
    expect(resultJson).not.toContain("#24536A");
    expect(resultJson).not.toContain("#1E4D60");

    // Nunito ExtraBold applied without synthetic bold
    const heading = resultCard.find(n => n.type === Text && n.props.accessibilityRole === "header");
    expect(flat(heading.props.style)?.fontFamily).toBe(theme.fontFamily["800"]);
    expect(flat(heading.props.style)?.fontWeight).toBe("normal");
  });

  it("renders OutfitCloset and StickerBook with warm storybook cards, illustrated medallions, and Nunito headings", async () => {
    fonts.loaded = true;
    const canoe = arcadeGames.find(g => g.id === "canoe-cargo")!;
    const person = emptyArcadeLearner();
    person.stickers = ["moon-canoe"];
    person.games["canoe-cargo"] = { ...emptyGameProgress(), unlockedOutfits: ["island", "sunhat"], outfit: "sunhat" };
    await act(async () => {
      root = TestRenderer.create(
        <View>
          <OutfitCloset game={canoe} person={person} onSelect={() => {}} />
          <StickerBook person={person} />
        </View>,
      );
    });
    expect(root!.root.findAllByType(Image).every(img => img.props.source === "assets/art/arcade/canoe-cargo.webp")).toBe(true);
    expect(root!.root.findAllByType(Image)).toHaveLength(4);
    const dressHeading = root!.root.find(n => n.type === Text && textOf(n) === "Dress Poko");
    expect(flat(dressHeading.props.style)?.fontFamily).toBe(theme.fontFamily["800"]);
    expect(flat(dressHeading.props.style)?.fontWeight).toBe("normal");
  });

  it("renders LevelMap compactly at 320×568 with a single coral Play · W1-1 primary CTA", async () => {
    Object.assign(viewport, { width: 320, height: 568 });
    const canoe = arcadeGames.find(g => g.id === "canoe-cargo")!;
    await act(async () => {
      root = TestRenderer.create(
        <LevelMap
          game={canoe}
          person={emptyArcadeLearner()}
          levels={cargoLevels}
          onLevel={() => {}}
          onOutfits={() => {}}
          onChest={() => {}}
          active={false}
        />,
      );
    });
    const heroBanner = root!.root.findByProps({ testID: "arcade-hero-banner" });
    expect(heroBanner.findAll(n => n.type === Text && textOf(n) === "Play · W1-1")).toHaveLength(1);
    const plaque = root!.root.findByProps({ testID: "world-header-plaque" });
    expect(flat(plaque.props.style)?.backgroundColor).toBe("rgba(255, 253, 248, 0.94)");
  });
});
