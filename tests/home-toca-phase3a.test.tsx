import React from "react";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultLook, type IslanderLook } from "../src/islander/look";
import { starterHome } from "../src/home/model";
import { roomIds } from "../src/home/catalogMore";
import { tracks, badgeInfo } from "../src/badges/engine";
import { lockedReason, styleCatalog } from "../src/personalization/catalog";
import { emptySave } from "../src/state/validation";
import { starterPerson } from "../src/personalization/model";
import { theme } from "../src/ui/theme";

const env = vi.hoisted(() => ({
  window: { width: 393, height: 852, fontScale: 1 },
  reduced: false,
  params: {} as Record<string, string | string[] | undefined>,
  canGoBack: false,
  back: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
  announce: vi.fn(),
  withTiming: vi.fn((v: number) => v),
  withSpring: vi.fn((v: number) => v),
  store: {
    ready: true,
    recovery: null as unknown,
    epoch: 1,
    save: {} as any,
    personalize: vi.fn(),
  },
  sceneProps: null as any,
}));

const flat = (style: unknown): Record<string, any> =>
  typeof style === "function"
    ? flat((style as (state: { pressed: boolean }) => unknown)({ pressed: false }))
    : Array.isArray(style)
      ? Object.assign({}, ...style.map(flat))
      : style && typeof style === "object"
        ? (style as Record<string, any>)
        : {};

vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Modal: "Modal",
  FlatList: ({ data, renderItem }: any) => data.map((item: any) => renderItem({ item })),
  Platform: { OS: "ios" },
  AppState: { addEventListener: () => ({ remove() {} }) },
  AccessibilityInfo: {
    announceForAccessibility: (...args: unknown[]) => env.announce(...args),
    sendAccessibilityEvent: () => {},
  },
  PanResponder: { create: (cfg: object) => ({ panHandlers: cfg }) },
  Animated: { createAnimatedComponent: (c: unknown) => c, Value: class { constructor(public v: number) {} }, timing: () => ({ start: () => {} }) },
  StyleSheet: {
    create: <T,>(s: T) => s,
    flatten: (s: unknown) => flat(s),
    absoluteFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  },
  useWindowDimensions: () => env.window,
}));

vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

vi.mock("react-native-svg", () => {
  const tags = ["G", "Circle", "Ellipse", "Rect", "Path", "Defs", "Filter", "FeColorMatrix", "Pattern", "LinearGradient", "Stop"];
  return { default: "Svg", ...Object.fromEntries(tags.map((t) => [t, t])) };
});

vi.mock("react-native-reanimated", () => ({
  default: { View: "AnimatedView", createAnimatedComponent: (c: unknown) => c },
  ReduceMotion: { System: "system", Never: "never" },
  useSharedValue: (v: any) => {
    const ref = React.useRef(v);
    return {
      get value() {
        return ref.current;
      },
      set value(n: any) {
        ref.current = n;
      },
      get: () => ref.current,
      set: (n: any) => {
        ref.current = n;
      },
    };
  },
  useAnimatedStyle: (fn: () => unknown) => fn(),
  withTiming: (...args: any[]) => env.withTiming(args[0]),
  withSpring: (...args: any[]) => env.withSpring(args[0]),
  runOnJS: (fn: any) => fn,
  runOnUI: (fn: any) => fn,
}));

vi.mock("react-native-gesture-handler", () => ({
  GestureDetector: "GestureDetector",
  Gesture: {
    Pan: () => {
      const b: any = new Proxy({}, { get: () => () => b });
      return b;
    },
  },
}));

vi.mock("expo-haptics", () => ({
  impactAsync: () => Promise.resolve(),
  ImpactFeedbackStyle: { Light: "light" },
}));

vi.mock("expo-router", () => ({
  router: {
    canGoBack: () => env.canGoBack,
    back: (...args: unknown[]) => env.back(...args),
    replace: (...args: unknown[]) => env.replace(...args),
    push: (...args: unknown[]) => env.push(...args),
  },
  useLocalSearchParams: () => env.params,
  useFocusEffect: () => {},
}));

vi.mock("../src/components/motion", () => ({ useReducedMotion: () => env.reduced }));
vi.mock("../src/components/sheetPresence", () => ({ useSheetPresence: () => {} }));
vi.mock("../src/ui/fonts", () => ({ useNunitoLoaded: () => false }));
vi.mock("../src/ui/icons", () => {
  const glyph = (name: string) => () => React.createElement("Glyph", { name });
  return Object.fromEntries(
    [
      "ArrowCounterClockwise",
      "ArrowLeft",
      "BaseballCap",
      "Broom",
      "CaretLeft",
      "CaretRight",
      "Check",
      "CoatHanger",
      "DotsThree",
      "LockSimple",
      "Medal",
      "Pants",
      "PencilSimple",
      "Smiley",
      "Star",
      "Sunglasses",
      "TShirt",
      "X",
    ].map((n) => [n, glyph(n)])
  );
});
vi.mock("../src/components/SaveStatus", () => ({ SaveStatus: () => null }));
vi.mock("../src/components/Recovery", () => ({ Recovery: () => React.createElement("Recovery") }));
vi.mock("../src/state/Store", () => ({ useStore: () => env.store }));
vi.mock("../src/home/runtime/homeSound", () => ({
  useHomeFeedback: () => ({ play: () => false, haptic: () => false, stop: () => {}, setLive: () => {}, silence: () => {}, dispose: () => {} }),
}));
vi.mock("../src/home/runtime/useIdleCharacters", () => ({ useIdleCharacters: () => ({ sleeping: {}, wake: () => {} }) }));
vi.mock("../src/home/runtime/useInteraction", () => ({
  useInteraction: () => ({
    isCurrent: () => true,
    finish: () => {},
    camera: { get: () => ({ a: 0.5, b: 0, c: 0, d: 0.5, tx: 0, ty: 0 }), set: () => {} },
    slots: { get: () => [{}, {}] },
    cancelAll: () => {},
    animateCamera: () => {},
    showHint: () => {},
    dropZones: { set: () => {} },
    veil: { value: 0 },
  }),
}));
vi.mock("../src/home/runtime/SceneView", () => ({
  SceneView: (props: any) => {
    env.sceneProps = props;
    // Render the live Islander through renderCharacter so tests can inspect the live outfit in the room.
    return React.createElement(
      "SceneView",
      { testID: "live-room-scene", room: props.state.current },
      props.renderCharacter?.({
        slot: 0,
        base: "stand",
        action: null,
        face: "neutral",
        facing: "right",
        size: 132,
        tilt: 0,
        limbLag: 0,
        reduced: props.reduced,
      }) ?? null
    );
  },
}));
vi.mock("../src/home/characterRenderer", () => ({
  HomeCharacter: (props: { look?: IslanderLook }) =>
    React.createElement("LiveRoomIslander", { testID: "live-room-islander", look: props.look }),
}));
vi.mock("../src/islander", async () => ({
  IslanderShape: () => null,
  resolvePose: () => ({}),
  ...(await import("../src/islander/look")),
}));
vi.mock("../src/home/runtime/SetPieces", () => ({ SetPieces: () => null, pieceAt: () => undefined, pieceLength: {}, pieceSound: {} }));
vi.mock("../src/home/runtime/StagingTray", () => ({ StagingTray: () => null }));
vi.mock("../src/home/runtime/Destinations", () => ({ Destinations: () => null }));
vi.mock("../src/home/runtime/DebugOverlay", () => ({ DebugOverlay: () => null }));
vi.mock("../src/home/runtime/FriendDrawer", () => ({ FriendDrawer: () => null }));
vi.mock("../src/home/runtime/HomePanels", () => ({ HomePanels: () => null }));
vi.mock("../src/home/runtime/CapacityCue", () => ({ CapacityCue: () => null, CAPACITY_CUE_MS: 3200, CAPACITY_MESSAGE: "Put something away to make room." }));
vi.mock("../src/home/runtime/UndoNote", () => ({ UndoNote: () => null, UndoGonePicture: () => null }));
vi.mock("../src/home/art/Items", () => ({ ItemArt: () => null }));
vi.mock("../src/home/art/More", () => ({ MoreItemArt: () => null }));

import IslandHomeRoute from "../src/app/island-home";
import LockerRoute from "../src/app/locker";
import BadgesRoute from "../src/app/badges";
import { HomeClosetSheet } from "../src/home/HomeClosetSheet";
import { HomeBadgesSheet } from "../src/home/HomeBadgesSheet";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
vi.stubGlobal("requestAnimationFrame", () => 1);
vi.stubGlobal("cancelAnimationFrame", () => {});

let root: ReactTestRenderer | undefined;

function setupStore(overrides: {
  ready?: boolean;
  recovery?: unknown;
  look?: IslanderLook;
  earned?: string[];
  unseen?: string[];
  milestones?: string[];
} = {}) {
  const base = emptySave();
  const person = {
    ...starterPerson(true),
    home: starterHome(),
    look: overrides.look ?? { ...defaultLook },
    earned: overrides.earned ?? [],
    unseen: overrides.unseen ?? [],
    milestones: overrides.milestones ?? [],
  };
  env.store.ready = overrides.ready ?? true;
  env.store.recovery = overrides.recovery ?? null;
  env.store.epoch = 1;
  env.store.save = {
    ...base,
    personalization: { version: 1, catalogVersion: 1, people: { family: person } },
  };
  env.store.personalize = vi.fn((patch: Record<string, unknown>) => {
    const current = env.store.save.personalization.people.family;
    env.store.save = {
      ...env.store.save,
      personalization: {
        ...env.store.save.personalization,
        people: { family: { ...current, ...patch } },
      },
    };
    return true;
  });
}

const textOf = (n: ReactTestInstance): string =>
  n.children.map((c) => (typeof c === "string" ? c : textOf(c))).join("");
const hostById = (node: ReactTestInstance, testID: string) =>
  node.findAll((n) => typeof n.type === "string" && n.props.testID === testID);

beforeEach(() => {
  vi.useFakeTimers();
  env.window = { width: 393, height: 852, fontScale: 1 };
  env.reduced = false;
  env.params = {};
  env.canGoBack = false;
  env.back.mockReset();
  env.replace.mockReset();
  env.push.mockReset();
  env.announce.mockReset();
  env.withTiming.mockClear();
  env.withSpring.mockClear();
  env.sceneProps = null;
  setupStore();
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  vi.useRealTimers();
});

describe("Phase 3A: Route compatibility & cold-link safety", () => {
  it("cold-link waits for save to load and shows Recovery when needed across all 3 routes", async () => {
    setupStore({ ready: false });
    await act(async () => { root = create(<LockerRoute />); });
    expect(textOf(root!.root)).toContain("Opening your Closet");
    await act(async () => root!.unmount());

    setupStore({ ready: true, recovery: { message: "corrupt" } });
    await act(async () => { root = create(<BadgesRoute />); });
    expect(root!.root.findAllByType("Recovery" as never)).toHaveLength(1);
    await act(async () => root!.unmount());

    setupStore({ ready: true, recovery: { message: "corrupt" } });
    await act(async () => { root = create(<IslandHomeRoute />); });
    expect(root!.root.findAllByType("Recovery" as never)).toHaveLength(1);
  });

  it("/island-home?item=bed opens decorating with bed; unknown item lands calmly on My Home", async () => {
    env.params = { item: "bed" };
    await act(async () => { root = create(<IslandHomeRoute />); });
    expect(hostById(root!.root, "design-drawer")).toHaveLength(1);
    expect(hostById(root!.root, "home-undo-button")).toHaveLength(1);
    await act(async () => root!.unmount());

    env.params = { item: "not-a-real-item" };
    await act(async () => { root = create(<IslandHomeRoute />); });
    expect(root!.root.findAllByProps({ testID: "design-drawer" })).toHaveLength(0);
    expect(root!.root.findAllByProps({ testID: "home-closet-sheet" })).toHaveLength(0);
    expect(root!.root.findAllByProps({ testID: "home-badges-sheet" })).toHaveLength(0);
  });

  it("/locker lands on My Home with Closet open; closing returns to Home room first, then Back returns to Map", async () => {
    await act(async () => { root = create(<LockerRoute />); });
    expect(root!.root.findAllByProps({ testID: "live-room-scene" })).toHaveLength(1);
    expect(root!.root.findAllByProps({ testID: "home-closet-sheet" })).toHaveLength(1);

    // Dismissing the landed Closet sheet returns to the Home room first (does not navigate away).
    const closeBtn = root!.root.findByProps({ accessibilityLabel: "Close closet" });
    await act(async () => closeBtn.props.onPress());
    await act(async () => { vi.advanceTimersByTime(250); });
    expect(root!.root.findAllByProps({ testID: "home-closet-sheet" })).toHaveLength(0);
    expect(root!.root.findAllByProps({ testID: "live-room-scene" })).toHaveLength(1);
    expect(env.back).not.toHaveBeenCalled();
    expect(env.replace).not.toHaveBeenCalled();

    // Back from the Home room returns to the Map.
    await act(async () => root!.root.findByProps({ testID: "home-back-button" }).props.onPress());
    expect(env.replace).toHaveBeenCalledWith("/");
  });

  it("/locker?item=<id> opens Closet on that item's tab, tries it on live without wearing, and marks it seen", async () => {
    setupStore({
      earned: ["hat:captain-cap"],
      unseen: ["hat:captain-cap"],
    });
    env.params = { item: "hat:captain-cap" };
    await act(async () => { root = create(<LockerRoute />); });

    // Hats tab is selected.
    expect(root!.root.findByProps({ testID: "closet-tab-hats" }).props.accessibilityState.selected).toBe(true);
    // Live Islander in the room is trying on captain-cap right away.
    const liveIslander = root!.root.findByProps({ testID: "live-room-islander" });
    expect(liveIslander.props.look.hat).toBe("captain-cap");
    // Item was marked seen, NOT worn (no look write yet!).
    expect(env.store.personalize).toHaveBeenCalledWith({ unseen: [] }, { learner: "family", epoch: 1 });
    expect(env.store.save.personalization.people.family.look.hat).toBe(defaultLook.hat);
    // Wear this is enabled.
    expect(root!.root.findByProps({ testID: "closet-wear-button" }).props.disabled).toBe(false);
  });

  it("/locker?item=<unknown> lands calmly on My Home with Closet open and nothing preselected", async () => {
    env.params = { item: "hat:definitely-missing" };
    await act(async () => { root = create(<LockerRoute />); });
    expect(root!.root.findAllByProps({ testID: "home-closet-sheet" })).toHaveLength(1);
    expect(root!.root.findByProps({ testID: "closet-tab-hair" }).props.accessibilityState.selected).toBe(true);
    expect(root!.root.findByProps({ testID: "closet-wear-button" }).props.disabled).toBe(true);
  });

  it("/badges lands on My Home with Badge Wall open and nothing preselected; /badges?badge=<id> selects & announces it", async () => {
    setupStore({ milestones: ["learn:shell-math:1"] });
    await act(async () => { root = create(<BadgesRoute />); });
    expect(root!.root.findAllByProps({ testID: "home-badges-sheet" })).toHaveLength(1);
    expect(root!.root.findByProps({ testID: "badge-math-1" }).props.accessibilityState.selected).toBe(false);
    expect(env.announce).not.toHaveBeenCalled();
    await act(async () => root!.unmount());

    env.params = { badge: "math-1" };
    await act(async () => { root = create(<BadgesRoute />); });
    expect(root!.root.findByProps({ testID: "badge-math-1" }).props.accessibilityState.selected).toBe(true);
    expect(textOf(root!.root.findByProps({ testID: "badge-detail" }))).toContain(badgeInfo("math-1").name);
    expect(env.announce).toHaveBeenCalledWith(expect.stringContaining(badgeInfo("math-1").name));
    await act(async () => root!.unmount());

    // Unknown badge ID lands cleanly with nothing preselected.
    env.announce.mockReset();
    env.params = { badge: "unknown-9" };
    await act(async () => { root = create(<BadgesRoute />); });
    expect(root!.root.findAllByProps({ testID: "home-badges-sheet" })).toHaveLength(1);
    expect(root!.root.findAll((n) => n.props.accessibilityState?.selected === true && String(n.props.testID ?? "").startsWith("badge-"))).toHaveLength(0);
    expect(env.announce).not.toHaveBeenCalled();
  });
});

describe("Phase 3A: Folded Closet try-on, Wear this, cancel-restore, and undimmed live room", () => {
  it("opens undimmed at ~45% height on phones / bottom card on iPad with 5 picture-only tabs", async () => {
    await act(async () => { root = create(<LockerRoute />); });
    // Undimmed: no Modal, no scrim, box-none wrapper so room above stays live & touchable.
    expect(root!.root.findAllByType("Modal" as never)).toHaveLength(0);
    expect(root!.root.findAllByProps({ testID: "sheet-backdrop" })).toHaveLength(0);
    const panel = root!.root.findByProps({ testID: "sheet" });
    expect(panel.props.accessibilityViewIsModal).toBe(false);
    expect(flat(panel.props.style).height).toBe(Math.floor(852 * 0.45));

    // 5 picture-only tabs (no visible Text children inside the tab buttons).
    const tabs = root!.root.findByProps({ testID: "closet-tabs" }).findAllByProps({ accessibilityRole: "tab" });
    expect(tabs.map((t) => t.props.testID)).toEqual([
      "closet-tab-hair",
      "closet-tab-tops",
      "closet-tab-bottoms",
      "closet-tab-hats",
      "closet-tab-extras",
    ]);
    for (const tab of tabs) {
      expect(tab.props.accessibilityLabel).toBeTruthy();
      expect(tab.findAllByType("Text" as never)).toHaveLength(0);
    }

    // iPad width renders a centered bottom card capped at sheet.maxWidth.
    env.window = { width: 1024, height: 768, fontScale: 1 };
    await act(async () => { root!.update(<LockerRoute />); });
    expect(flat(root!.root.findByProps({ testID: "sheet" }).props.style).width).toBe(theme.sheet.maxWidth);
  });

  it("trying an earned item updates live Islander; closing without Wear restores old look; Wear this keeps it", async () => {
    setupStore({ earned: ["hat:captain-cap"] });
    await act(async () => { root = create(<IslandHomeRoute />); });
    const liveLook = () => root!.root.findByProps({ testID: "live-room-islander" }).props.look as IslanderLook;
    expect(liveLook().hat).toBe(defaultLook.hat);

    // Open Closet from the bottom bar.
    await act(async () => root!.root.findByProps({ testID: "home-closet-button" }).props.onPress());
    await act(async () => root!.root.findByProps({ testID: "closet-tab-hats" }).props.onPress());

    // Tap earned hat -> live Islander updates immediately, but save is NOT modified yet.
    await act(async () => root!.root.findByProps({ testID: "closet-item-hat:captain-cap" }).props.onPress());
    expect(liveLook().hat).toBe("captain-cap");
    expect(env.store.personalize).not.toHaveBeenCalled();

    // Closing without tapping Wear this restores the previous outfit cleanly!
    await act(async () => root!.root.findByProps({ accessibilityLabel: "Close closet" }).props.onPress());
    await act(async () => { vi.advanceTimersByTime(250); });
    expect(liveLook().hat).toBe(defaultLook.hat);
    expect(env.store.personalize).not.toHaveBeenCalled();

    // Reopen Closet, try on again, and tap coral Wear this to keep it.
    await act(async () => root!.root.findByProps({ testID: "home-closet-button" }).props.onPress());
    await act(async () => root!.root.findByProps({ testID: "closet-tab-hats" }).props.onPress());
    await act(async () => root!.root.findByProps({ testID: "closet-item-hat:captain-cap" }).props.onPress());
    const wearButton = hostById(root!.root, "closet-wear-button")[0];
    expect(flat(wearButton.props.style).backgroundColor).toBe(theme.colors.coral);
    await act(async () => wearButton.props.onPress());

    expect(env.store.personalize).toHaveBeenCalledWith(
      { look: expect.objectContaining({ hat: "captain-cap" }), made: true },
      { learner: "family", epoch: 1 }
    );
    // Rerender with updated Store state and close sheet -> new look stays!
    await act(async () => root!.update(<IslandHomeRoute />));
    await act(async () => root!.root.findByProps({ accessibilityLabel: "Close closet" }).props.onPress());
    await act(async () => { vi.advanceTimersByTime(250); });
    expect(liveLook().hat).toBe("captain-cap");
  });

  it("unearned items render as soft outlines and explain how to earn them when tapped without wearing", async () => {
    const lockedHat = styleCatalog.find((i) => i.id === "hat:captain-cap")!;
    const onTryOn = vi.fn(),
      onWear = vi.fn(() => true);
    await act(async () => {
      root = create(
        <HomeClosetSheet
          visible
          onClose={() => {}}
          look={defaultLook}
          equipped={defaultLook}
          earned={[]}
          unseen={[]}
          onTryOn={onTryOn}
          onWear={onWear}
        />
      );
    });
    await act(async () => root!.root.findByProps({ testID: "closet-tab-hats" }).props.onPress());
    const lockedTile = root!.root.findByProps({ testID: "closet-item-hat:captain-cap" });
    expect(flat(lockedTile.props.style).borderStyle).toBe("dashed");
    expect(root!.root.findAllByProps({ testID: "closet-lock-hat:captain-cap" })).toHaveLength(1);

    await act(async () => lockedTile.props.onPress());
    expect(onTryOn).not.toHaveBeenCalled();
    expect(textOf(root!.root.findByProps({ testID: "closet-locked-rule" }))).toContain(lockedReason(lockedHat, []));
    expect(root!.root.findByProps({ testID: "closet-wear-button" }).props.disabled).toBe(true);
  });
});

describe("Phase 3A: Badge Wall sheet, room hotspots, Tidy up placement, and Reduce Motion", () => {
  it("Badge Wall renders all 28 frames in fixed positions across 7 tracks; earning adds color without shifting frames", async () => {
    await act(async () => {
      root = create(<HomeBadgesSheet visible onClose={() => {}} badges={[]} milestones={[]} />);
    });
    const orderBefore = root!.root
      .findAll((n) => (n.type as unknown) === "Pressable" && String(n.props.testID ?? "").startsWith("badge-"))
      .map((n) => n.props.testID);
    expect(orderBefore).toHaveLength(tracks.length * 4);
    expect(flat(root!.root.findByProps({ testID: "badge-math-1" }).props.style).borderStyle).toBe("dashed");

    await act(async () => {
      root!.update(<HomeBadgesSheet visible onClose={() => {}} badges={["math-1"]} milestones={["learn:shell-math:1"]} />);
    });
    const orderAfter = root!.root
      .findAll((n) => (n.type as unknown) === "Pressable" && String(n.props.testID ?? "").startsWith("badge-"))
      .map((n) => n.props.testID);
    expect(orderAfter).toEqual(orderBefore);
    expect(flat(root!.root.findByProps({ testID: "badge-math-1" }).props.style).borderStyle).toBeUndefined();

    // Tapping a frame selects and announces it with picture + short line.
    await act(async () => root!.root.findByProps({ testID: "badge-reading-2" }).props.onPress());
    expect(textOf(root!.root.findByProps({ testID: "badge-detail" }))).toContain(badgeInfo("reading-2").name);
    expect(env.announce).toHaveBeenCalledWith(expect.stringContaining(badgeInfo("reading-2").name));
  });

  it("wall badge board shortcut opens the exact same Badge Wall sheet inside My Home, and every room keeps the 3 bottom buttons without Tidy up", async () => {
    await act(async () => { root = create(<IslandHomeRoute />); });
    // Tidy up is NOT on the top-level chrome.
    expect(root!.root.findAllByProps({ accessibilityLabel: "Tidy up" })).toHaveLength(0);
    // Wall badge board hotspot opens the folded Badge Wall sheet (never pushes a route).
    await act(async () => env.sceneProps.onBadges());
    expect(root!.root.findAllByProps({ testID: "home-badges-sheet" })).toHaveLength(1);
    expect(env.push).not.toHaveBeenCalled();
    await act(async () => root!.root.findByProps({ accessibilityLabel: "Close badge wall" }).props.onPress());
    await act(async () => { vi.advanceTimersByTime(250); });

    // Walk across all 4 rooms using the top room pill arrows; bottom bar stays present in every room.
    for (let i = 0; i < roomIds.length; i++) {
      const dock = hostById(root!.root, "home-bottom-bar")[0];
      expect(hostById(dock, "home-closet-button")).toHaveLength(1);
      expect(hostById(dock, "home-badges-button")).toHaveLength(1);
      expect(hostById(dock, "home-decorate-button")).toHaveLength(1);
      await act(async () => hostById(root!.root, "home-room-next")[0].props.onPress());
    }

    // Open Decorate -> Undo appears in top bar, and Tidy up is tucked inside Decorate's More sheet.
    await act(async () => hostById(root!.root, "home-decorate-button")[0].props.onPress());
    expect(hostById(root!.root, "home-undo-button")).toHaveLength(1);
    await act(async () => root!.root.findByProps({ accessibilityLabel: "More decorating" }).props.onPress());
    expect(hostById(root!.root, "decorate-more-sheet")).toHaveLength(1);
    expect(hostById(root!.root, "decorate-tidy-up-button")).toHaveLength(1);
  });

  it("respects Reduce Motion on both Closet and Badge Wall sheets (fades without spring)", async () => {
    env.reduced = true;
    await act(async () => { root = create(<LockerRoute />); });
    expect(env.withSpring).not.toHaveBeenCalled();
    expect(env.withTiming).toHaveBeenCalled();
    await act(async () => root!.unmount());

    env.withSpring.mockClear();
    env.withTiming.mockClear();
    await act(async () => { root = create(<BadgesRoute />); });
    expect(env.withSpring).not.toHaveBeenCalled();
    expect(env.withTiming).toHaveBeenCalled();
  });
});
