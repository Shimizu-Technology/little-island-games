import React from "react";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultLook, type IslanderLook } from "../src/islander/look";
import { starterHome } from "../src/home/model";
import { buildingLayout, roomOrigin } from "../src/home/camera";
import { roomIds } from "../src/home/catalogMore";
import { buildScene } from "../src/home/scene/graph";
import { tracks, badgeInfo } from "../src/badges/engine";
import { lockedReason, styleCatalog } from "../src/personalization/catalog";
import { emptySave } from "../src/state/validation";
import { starterPerson } from "../src/personalization/model";
import { theme } from "../src/ui/theme";
import IslandHomeRoute from "../src/app/island-home";
import LockerRoute from "../src/app/locker";
import BadgesRoute from "../src/app/badges";
import { HomeClosetSheet, closetSheetMetrics, nextClosetTabIndex } from "../src/home/HomeClosetSheet";
import { HomeBadgesSheet } from "../src/home/HomeBadgesSheet";
import { closetAboveSheetHeight, closetCameraFor } from "../src/home/HomeScreen";

const env = vi.hoisted(() => ({
  os: "ios" as "ios" | "android" | "web",
  window: { width: 393, height: 852, fontScale: 1 },
  insets: { top: 44, bottom: 34, left: 0, right: 0 },
  reduced: false,
  params: {} as Record<string, string | string[] | undefined>,
  canGoBack: false,
  back: vi.fn(),
  replace: vi.fn(),
  dismissTo: undefined as undefined | ReturnType<typeof vi.fn>,
  push: vi.fn(),
  announce: vi.fn(),
  sendA11yFocus: vi.fn(),
  withTiming: vi.fn((v: number) => v),
  withSpring: vi.fn((v: number) => v),
  backHandlers: [] as (() => boolean)[],
  interactionOpts: null as any,
  animateCamera: vi.fn(),
  cameraSet: vi.fn(),
  dropZonesSet: vi.fn(),
  store: {
    ready: true,
    recovery: null as unknown,
    epoch: 1,
    saving: false,
    error: null as string | null,
    save: {} as any,
    personalize: vi.fn(),
  },
  sceneProps: null as any,
  saveStatusVisible: false,
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
  TextInput: "TextInput",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Modal: "Modal",
  FlatList: ({ data, renderItem }: any) => data.map((item: any) => renderItem({ item })),
  Platform: {
    get OS() {
      return env.os;
    },
  },
  BackHandler: {
    addEventListener: (event: string, handler: () => boolean) => {
      if (event === "hardwareBackPress") env.backHandlers.push(handler);
      return {
        remove: () => {
          const i = env.backHandlers.indexOf(handler);
          if (i >= 0) env.backHandlers.splice(i, 1);
        },
      };
    },
  },
  AppState: { addEventListener: () => ({ remove() {} }) },
  AccessibilityInfo: {
    announceForAccessibility: (...args: unknown[]) => env.announce(...args),
    sendAccessibilityEvent: (...args: unknown[]) => env.sendA11yFocus(...args),
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
  useSafeAreaInsets: () => env.insets,
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
    get dismissTo() {
      return env.dismissTo;
    },
    push: (...args: unknown[]) => env.push(...args),
  },
  useLocalSearchParams: () => env.params,
  useFocusEffect: () => {},
}));

vi.mock("../src/components/motion", () => ({ useReducedMotion: () => env.reduced }));
vi.mock("../src/components/sheetPresence", () => ({ useSheetPresence: () => {} }));
vi.mock("../src/ui/fonts", () => ({ useNunitoLoaded: () => false }));
vi.mock("../src/ui/icons", () => {
  const glyph = (name: string) => {
    const MockGlyph = () => React.createElement("Glyph", { name });
    MockGlyph.displayName = name;
    return MockGlyph;
  };
  return Object.fromEntries(
    [
      "ArrowClockwise",
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
      "Pants",
      "PencilSimple",
      "Smiley",
      "Star",
      "Sunglasses",
      "TShirt",
      "UsersThree",
      "X",
    ].map((n) => [n, glyph(n)])
  );
});
vi.mock("../src/components/SaveStatus", () => ({
  SaveStatus: () =>
    env.saveStatusVisible
      ? React.createElement("Pressable", { testID: "save-retry-button", accessibilityLabel: "Try saving again" }, "Try saving again")
      : null,
}));
vi.mock("../src/components/Recovery", () => ({ Recovery: () => React.createElement("Recovery") }));
vi.mock("../src/state/Store", () => ({ useStore: () => env.store }));
vi.mock("../src/home/runtime/homeSound", () => ({
  useHomeFeedback: () => ({ play: () => false, haptic: () => false, stop: () => {}, setLive: () => {}, silence: () => {}, dispose: () => {} }),
}));
vi.mock("../src/home/runtime/useIdleCharacters", () => ({ useIdleCharacters: () => ({ sleeping: {}, wake: () => {} }) }));
vi.mock("../src/home/runtime/useInteraction", () => ({
  useInteraction: (options: any) => {
    env.interactionOpts = options;
    return {
      isCurrent: () => true,
      finish: () => {},
      camera: { get: () => options.initialCamera ?? { a: 0.5, b: 0, c: 0, d: 0.5, tx: 0, ty: 0 }, set: (...args: unknown[]) => env.cameraSet(...args) },
      slots: { get: () => [{}, {}] },
      cancelAll: () => {},
      animateCamera: (...args: unknown[]) => env.animateCamera(...args),
      showHint: () => {},
      dropZones: { set: (...args: unknown[]) => env.dropZonesSet(...args) },
      veil: { value: 0 },
    };
  },
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
vi.mock("../src/home/runtime/FriendDrawer", () => ({ FriendDrawer: (props: any) => (props.open ? React.createElement("FriendDrawer", { testID: "friend-drawer" }) : null) }));
vi.mock("../src/home/runtime/CapacityCue", () => ({ CapacityCue: () => null, CAPACITY_CUE_MS: 3200, CAPACITY_MESSAGE: "Put something away to make room." }));
vi.mock("../src/home/runtime/UndoNote", () => ({ UndoNote: () => null, UndoGonePicture: () => null }));
vi.mock("../src/home/art/Items", () => ({ ItemArt: () => null }));
vi.mock("../src/home/art/More", () => ({ MoreItemArt: () => null }));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
  cb(0);
  return 1;
});
vi.stubGlobal("cancelAnimationFrame", () => {});

let root: ReactTestRenderer | undefined;

function setupStore(overrides: {
  ready?: boolean;
  recovery?: unknown;
  look?: IslanderLook;
  earned?: string[];
  unseen?: string[];
  milestones?: string[];
  currentRoom?: "home" | "kitchen" | "treehouse" | "beach";
  activeLearner?: string;
  epoch?: number;
  saving?: boolean;
  error?: string | null;
} = {}) {
  const base = emptySave();
  const home = starterHome();
  if (overrides.currentRoom) home.current = overrides.currentRoom;
  const person = {
    ...starterPerson(true),
    home,
    look: overrides.look ?? { ...defaultLook },
    earned: overrides.earned ?? [],
    unseen: overrides.unseen ?? [],
    milestones: overrides.milestones ?? [],
  };
  const active = overrides.activeLearner ?? "family";
  env.store.ready = overrides.ready ?? true;
  env.store.recovery = overrides.recovery ?? null;
  env.store.epoch = overrides.epoch ?? 1;
  env.store.saving = overrides.saving ?? false;
  env.store.error = overrides.error ?? null;
  env.store.save = {
    ...base,
    learning: { version: 1, active, people: [{ id: active, name: active }] },
    personalization: { version: 1, catalogVersion: 1, people: { [active]: person } },
  };
  env.store.personalize = vi.fn((patch: Record<string, unknown>) => {
    const owner = env.store.save.learning?.active ?? "family";
    const current = env.store.save.personalization.people[owner];
    env.store.save = {
      ...env.store.save,
      personalization: {
        ...env.store.save.personalization,
        people: { ...env.store.save.personalization.people, [owner]: { ...current, ...patch } },
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
  env.os = "ios";
  env.window = { width: 393, height: 852, fontScale: 1 };
  env.insets = { top: 44, bottom: 34, left: 0, right: 0 };
  env.reduced = false;
  env.params = {};
  env.canGoBack = false;
  env.dismissTo = undefined;
  env.back.mockReset();
  env.replace.mockReset();
  env.push.mockReset();
  env.announce.mockReset();
  env.sendA11yFocus.mockReset();
  env.withTiming.mockClear();
  env.withSpring.mockClear();
  env.animateCamera.mockReset();
  env.cameraSet.mockReset();
  env.dropZonesSet.mockReset();
  env.backHandlers.length = 0;
  env.interactionOpts = null;
  env.sceneProps = null;
  env.saveStatusVisible = false;
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

  it("/locker lands on My Home with Closet open; first Back closes Closet, second Back reaches Map (never back to a game)", async () => {
    env.canGoBack = true; // e.g., Reward "Try it on" pushed from a game.
    env.dismissTo = vi.fn();
    await act(async () => { root = create(<LockerRoute />); });
    expect(root!.root.findAllByProps({ testID: "live-room-scene" })).toHaveLength(1);
    expect(root!.root.findAllByProps({ testID: "home-closet-sheet" })).toHaveLength(1);

    // P1-1: First top-left Back closes the active Closet sheet and keeps the user on Home.
    await act(async () => root!.root.findByProps({ testID: "home-back-button" }).props.onPress());
    await act(async () => { vi.advanceTimersByTime(250); });
    expect(root!.root.findAllByProps({ testID: "home-closet-sheet" })).toHaveLength(0);
    expect(root!.root.findAllByProps({ testID: "live-room-scene" })).toHaveLength(1);
    expect(env.back).not.toHaveBeenCalled();
    expect(env.dismissTo).not.toHaveBeenCalled();
    expect(env.replace).not.toHaveBeenCalled();

    // P1-1: Second Back routes cleanly to "/" (Map), never calling router.back() into a game.
    await act(async () => root!.root.findByProps({ testID: "home-back-button" }).props.onPress());
    expect(env.dismissTo).toHaveBeenCalledWith("/");
    expect(env.back).not.toHaveBeenCalled();
  });

  it("P1-1: Android BackHandler and Web popstate survive viewport rotation/refit and handle double Back on cold, map, and game entries", async () => {
    // Android BackHandler: first Back closes Closet, second Back reaches "/" even from a game-origin alias (canGoBack=true).
    env.os = "android";
    env.canGoBack = true;
    env.dismissTo = vi.fn();
    await act(async () => { root = create(<LockerRoute />); });
    expect(env.backHandlers).toHaveLength(1);
    let handled = false;
    await act(async () => { handled = env.backHandlers[0](); });
    await act(async () => { vi.advanceTimersByTime(250); });
    expect(handled).toBe(true);
    expect(root!.root.findAllByProps({ testID: "home-closet-sheet" })).toHaveLength(0);
    expect(env.dismissTo).not.toHaveBeenCalled();
    // Second hardware Back routes to "/" (Map), never falling through to router.back() into a game!
    await act(async () => { handled = env.backHandlers[0](); });
    expect(handled).toBe(true);
    expect(env.dismissTo).toHaveBeenCalledWith("/");
    expect(env.back).not.toHaveBeenCalled();
    await act(async () => root!.unmount());

    // Android BackHandler on /badges from a game: Modal onRequestClose closes Badges, second Back routes to "/".
    env.dismissTo = vi.fn();
    await act(async () => { root = create(<BadgesRoute />); });
    expect(root!.root.findAllByProps({ testID: "home-badges-sheet" })).toHaveLength(1);
    const modal = root!.root.findByType("Modal" as never);
    await act(async () => modal.props.onRequestClose());
    await act(async () => { vi.advanceTimersByTime(250); });
    expect(root!.root.findAllByProps({ testID: "home-badges-sheet" })).toHaveLength(0);
    expect(env.dismissTo).not.toHaveBeenCalled();
    await act(async () => { handled = env.backHandlers[0](); });
    expect(handled).toBe(true);
    expect(env.dismissTo).toHaveBeenCalledWith("/");
    expect(env.back).not.toHaveBeenCalled();
    await act(async () => root!.unmount());

    // Web browser Back (popstate): model a real browser history stack (entries + cursor + replaceState/pushState/back).
    env.os = "web";
    const installBrowserHistoryWindow = (initialEntries: { url: string; state?: unknown }[]) => {
      const entries: { url: string; state: unknown }[] = initialEntries.map((entry) => ({
        url: entry.url,
        state: entry.state ?? null,
      }));
      let cursor = entries.length - 1;
      const popListeners: ((e: any) => void)[] = [];
      const resolveUrl = (url?: string) => {
        if (!url) return entries[cursor].url;
        if (url.startsWith("http://") || url.startsWith("https://")) return url;
        return new URL(url, entries[cursor].url).href;
      };
      const location = {
        get href() {
          return entries[cursor].url;
        },
        get pathname() {
          return new URL(entries[cursor].url).pathname;
        },
      };
      const pushState = vi.fn((data: unknown, _unused: string, url?: string) => {
        entries.splice(cursor + 1);
        entries.push({ url: resolveUrl(url), state: data });
        cursor = entries.length - 1;
      });
      const replaceState = vi.fn((data: unknown, _unused: string, url?: string) => {
        entries[cursor] = { url: resolveUrl(url), state: data };
      });
      const historyBack = vi.fn(() => {
        if (cursor <= 0) return;
        cursor -= 1;
        const stopImmediatePropagation = vi.fn();
        for (const fn of [...popListeners]) {
          fn({ state: entries[cursor].state, stopImmediatePropagation });
        }
      });
      const addEventListener = vi.fn((type: string, fn: (e: any) => void) => {
        if (type === "popstate") popListeners.push(fn);
      });
      const removeEventListener = vi.fn((type: string, fn: (e: any) => void) => {
        const i = popListeners.indexOf(fn);
        if (type === "popstate" && i >= 0) popListeners.splice(i, 1);
      });
      const history = {
        get length() {
          return entries.length;
        },
        get state() {
          return entries[cursor].state;
        },
        pushState,
        replaceState,
        back: historyBack,
      };
      vi.stubGlobal("window", { history, location, addEventListener, removeEventListener });
      const browserBack = async () => {
        await act(async () => {
          history.back();
        });
        await act(async () => {
          vi.advanceTimersByTime(250);
        });
      };
      return {
        entries,
        getCursor: () => cursor,
        location,
        history,
        pushState,
        replaceState,
        historyBack,
        addEventListener,
        removeEventListener,
        browserBack,
      };
    };

    try {
      // 1) Cold /locker + viewport rotation/refit to 844×390 while Closet is open + two real window.history.back() steps.
      env.canGoBack = false;
      env.dismissTo = undefined;
      env.replace.mockReset();
      const coldWin = installBrowserHistoryWindow([
        { url: "http://localhost/locker?item=hat:sunhat", state: { id: "entry-1" } },
      ]);
      await act(async () => { root = create(<LockerRoute />); });
      // Clean 2-step sequence seeded: [ "/" (map), "/island-home" (home), "/locker?item=hat:sunhat" (sheet) ]
      expect(coldWin.entries.map((e) => new URL(e.url).pathname)).toEqual(["/", "/island-home", "/locker"]);
      expect(coldWin.location.href).toBe("http://localhost/locker?item=hat:sunhat");
      expect(coldWin.getCursor()).toBe(2);
      expect(coldWin.history.state).toEqual(expect.objectContaining({ __homeSentinel: "sheet", __homeSheet: "closet" }));
      expect(coldWin.addEventListener).toHaveBeenCalledTimes(1);

      // Rotate viewport portrait -> 844×390 landscape while Closet is open -> NO double-push, NO listener reset!
      env.window = { width: 844, height: 390, fontScale: 1 };
      await act(async () => { root!.update(<LockerRoute />); });
      expect(coldWin.removeEventListener).not.toHaveBeenCalled();
      expect(coldWin.addEventListener).toHaveBeenCalledTimes(1);
      expect(coldWin.entries).toHaveLength(3);
      expect(coldWin.getCursor()).toBe(2);

      // 1st browser Back: closes Closet to Home at /island-home (does NOT navigate to Map yet).
      await coldWin.browserBack();
      expect(coldWin.getCursor()).toBe(1);
      expect(coldWin.location.pathname).toBe("/island-home");
      expect(root!.root.findAllByProps({ testID: "home-closet-sheet" })).toHaveLength(0);
      expect(env.replace).not.toHaveBeenCalled();

      // 2nd browser Back: lands on "/" Map via goToMap()!
      await coldWin.browserBack();
      expect(coldWin.getCursor()).toBe(0);
      expect(coldWin.location.pathname).toBe("/");
      expect(env.replace).toHaveBeenCalledWith("/");
      expect(env.back).not.toHaveBeenCalled();
      await act(async () => root!.unmount());

      // 2) Cold /locker WITHOUT rotation + StrictMode-style already-seeded remount never double-pushes.
      env.window = { width: 393, height: 852, fontScale: 1 };
      env.canGoBack = false;
      env.dismissTo = undefined;
      env.replace.mockReset();
      const coldNoRotateWin = installBrowserHistoryWindow([{ url: "http://localhost/locker", state: { id: "entry-2" } }]);
      await act(async () => { root = create(<LockerRoute />); });
      expect(coldNoRotateWin.entries).toHaveLength(3);
      await act(async () => root!.unmount());
      // Remount while history already rests on __homeSentinel: "sheet" -> zero extra pushes!
      await act(async () => { root = create(<LockerRoute />); });
      expect(coldNoRotateWin.entries).toHaveLength(3);
      expect(coldNoRotateWin.getCursor()).toBe(2);
      await coldNoRotateWin.browserBack();
      expect(coldNoRotateWin.location.pathname).toBe("/island-home");
      expect(root!.root.findAllByProps({ testID: "home-closet-sheet" })).toHaveLength(0);
      expect(env.replace).not.toHaveBeenCalled();
      await coldNoRotateWin.browserBack();
      expect(coldNoRotateWin.location.pathname).toBe("/");
      expect(env.replace).toHaveBeenCalledWith("/");
      await act(async () => root!.unmount());

      // 3) Cold /badges -> 1st browser Back closes Badge Wall to Home, 2nd browser Back reaches "/" Map.
      env.window = { width: 844, height: 390, fontScale: 1 };
      env.canGoBack = false;
      env.dismissTo = undefined;
      env.replace.mockReset();
      const coldBadgesWin = installBrowserHistoryWindow([{ url: "http://localhost/badges?badge=math-1", state: { id: "entry-3" } }]);
      await act(async () => { root = create(<BadgesRoute />); });
      expect(coldBadgesWin.entries.map((e) => new URL(e.url).pathname)).toEqual(["/", "/island-home", "/badges"]);
      await coldBadgesWin.browserBack();
      expect(coldBadgesWin.location.pathname).toBe("/island-home");
      expect(root!.root.findAllByProps({ testID: "home-badges-sheet" })).toHaveLength(0);
      expect(env.replace).not.toHaveBeenCalled();
      await coldBadgesWin.browserBack();
      expect(coldBadgesWin.location.pathname).toBe("/");
      expect(env.replace).toHaveBeenCalledWith("/");
      await act(async () => root!.unmount());

      // 4) Map "/" -> /island-home, open Closet from dock, rotate to 844×390, then two browser Backs -> "/" Map.
      env.window = { width: 393, height: 852, fontScale: 1 };
      env.canGoBack = true;
      env.dismissTo = vi.fn();
      const mapWin = installBrowserHistoryWindow([
        { url: "http://localhost/", state: { id: "map-0" } },
        { url: "http://localhost/island-home", state: { id: "home-1" } },
      ]);
      await act(async () => { root = create(<IslandHomeRoute />); });
      expect(mapWin.pushState).not.toHaveBeenCalled();
      expect(mapWin.entries).toHaveLength(2);
      await act(async () => root!.root.findByProps({ testID: "home-closet-button" }).props.onPress());
      expect(mapWin.pushState).toHaveBeenCalledTimes(1);
      expect(mapWin.entries).toHaveLength(3);
      env.window = { width: 844, height: 390, fontScale: 1 };
      await act(async () => { root!.update(<IslandHomeRoute />); });
      expect(mapWin.entries).toHaveLength(3);
      await mapWin.browserBack();
      expect(mapWin.getCursor()).toBe(1);
      expect(root!.root.findAllByProps({ testID: "home-closet-sheet" })).toHaveLength(0);
      expect(env.dismissTo).not.toHaveBeenCalled();
      await mapWin.browserBack();
      expect(mapWin.getCursor()).toBe(0);
      expect(mapWin.location.pathname).toBe("/");
      expect(env.dismissTo).toHaveBeenCalledWith("/");
      await act(async () => root!.unmount());

      // 5) Game-origin /badges alias (canGoBack=true): 1st Back closes Badge Wall to Home, 2nd Back reaches "/" (never game).
      env.window = { width: 393, height: 852, fontScale: 1 };
      env.canGoBack = true;
      env.dismissTo = vi.fn();
      const gameWin = installBrowserHistoryWindow([
        { url: "http://localhost/", state: { id: "map-0" } },
        { url: "http://localhost/play?game=sudoku", state: { id: "game-1" } },
        { url: "http://localhost/badges?badge=math-1", state: { id: "badges-2" } },
      ]);
      await act(async () => { root = create(<BadgesRoute />); });
      expect(gameWin.history.state).toEqual(expect.objectContaining({ __homeSentinel: "sheet", __homeSheet: "badges" }));
      await gameWin.browserBack();
      expect(gameWin.location.pathname).toBe("/island-home");
      expect(root!.root.findAllByProps({ testID: "home-badges-sheet" })).toHaveLength(0);
      expect(env.dismissTo).not.toHaveBeenCalled();
      await gameWin.browserBack();
      expect(gameWin.location.pathname).toBe("/");
      expect(env.dismissTo).toHaveBeenCalledWith("/");
      expect(env.back).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
      vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      });
      vi.stubGlobal("cancelAnimationFrame", () => {});
    }
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

  it("P2-5: refused deep-link onSeen keeps acknowledgement pending until accepted", async () => {
    setupStore({
      earned: ["hat:captain-cap"],
      unseen: ["hat:captain-cap"],
    });
    env.store.personalize = vi.fn(() => false);
    env.params = { item: "hat:captain-cap" };
    await act(async () => { root = create(<LockerRoute />); });
    expect(env.store.personalize).toHaveBeenCalledTimes(1);
    expect(root!.root.findAllByProps({ testID: "closet-new-hat:captain-cap" })).toHaveLength(1);

    // Retry on a subsequent render (e.g. Store recovers) succeeds and clears unseen.
    env.store.personalize = vi.fn((patch: Record<string, unknown>) => {
      const current = env.store.save.personalization.people.family;
      env.store.save = {
        ...env.store.save,
        personalization: { ...env.store.save.personalization, people: { family: { ...current, ...patch } } },
      };
      return true;
    });
    await act(async () => { root!.update(<LockerRoute />); });
    expect(env.store.personalize).toHaveBeenCalledWith({ unseen: [] }, { learner: "family", epoch: 1 });
  });

  it("P2-5: Mark all seen shows when unseen unlocked items exist, respects refusal, and clears all unseen on accept", async () => {
    // Hidden when there are no unseen unlocked items.
    setupStore({ earned: ["hat:captain-cap"], unseen: [] });
    await act(async () => { root = create(<LockerRoute />); });
    expect(hostById(root!.root, "closet-mark-all-seen")).toHaveLength(0);
    await act(async () => root!.unmount());

    // Shown when unseen unlocked items exist; refused write keeps button & New badges intact.
    setupStore({
      earned: ["hat:captain-cap", "hat:sunhat"],
      unseen: ["hat:captain-cap", "hat:sunhat"],
    });
    env.store.personalize = vi.fn(() => false);
    await act(async () => { root = create(<LockerRoute />); });
    expect(hostById(root!.root, "closet-mark-all-seen")).toHaveLength(1);
    await act(async () => root!.root.findByProps({ testID: "closet-tab-hats" }).props.onPress());
    expect(hostById(root!.root, "closet-new-hat:captain-cap")).toHaveLength(1);

    await act(async () => hostById(root!.root, "closet-mark-all-seen")[0].props.onPress());
    expect(env.store.personalize).toHaveBeenCalledWith({ unseen: [] }, { learner: "family", epoch: 1 });
    // Store refused -> still visible!
    expect(hostById(root!.root, "closet-mark-all-seen")).toHaveLength(1);
    expect(hostById(root!.root, "closet-new-hat:captain-cap")).toHaveLength(1);

    // Accepted write clears unseen and hides Mark all seen.
    env.store.personalize = vi.fn((patch: Record<string, unknown>) => {
      const current = env.store.save.personalization.people.family;
      env.store.save = {
        ...env.store.save,
        personalization: { ...env.store.save.personalization, people: { family: { ...current, ...patch } } },
      };
      return true;
    });
    await act(async () => hostById(root!.root, "closet-mark-all-seen")[0].props.onPress());
    await act(async () => root!.update(<LockerRoute />));
    expect(hostById(root!.root, "closet-mark-all-seen")).toHaveLength(0);
    expect(hostById(root!.root, "closet-new-hat:captain-cap")).toHaveLength(0);
  });

  it("P2-1: dismissed /locker or /badges alias never replays after learner switch or save-epoch remount", async () => {
    setupStore({ earned: ["hat:captain-cap"], unseen: ["hat:captain-cap"] });
    env.params = { item: "hat:captain-cap" };
    await act(async () => { root = create(<LockerRoute />); });
    expect(root!.root.findAllByProps({ testID: "home-closet-sheet" })).toHaveLength(1);

    // Dismiss the sheet.
    await act(async () => root!.root.findByProps({ accessibilityLabel: "Close closet" }).props.onPress());
    await act(async () => { vi.advanceTimersByTime(250); });
    expect(root!.root.findAllByProps({ testID: "home-closet-sheet" })).toHaveLength(0);

    // Switch learner & bump epoch (remounting HomeScreen with the same URL params).
    env.store.personalize.mockClear();
    const secondPerson = {
      ...starterPerson(true),
      home: starterHome(),
      earned: ["hat:captain-cap"],
      unseen: ["hat:captain-cap"],
    };
    env.store.epoch = 2;
    env.store.save = {
      ...env.store.save,
      learning: { version: 1, active: "kid-2", people: [{ id: "family", name: "Family" }, { id: "kid-2", name: "Kid 2" }] },
      personalization: {
        ...env.store.save.personalization,
        people: { ...env.store.save.personalization.people, "kid-2": secondPerson },
      },
    };
    await act(async () => { root!.update(<LockerRoute />); });

    // Sheet stays closed and does NOT touch the second learner's unseen state!
    expect(root!.root.findAllByProps({ testID: "home-closet-sheet" })).toHaveLength(0);
    expect(env.store.personalize).not.toHaveBeenCalled();
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
    expect(root!.root.findByProps({ testID: "badge-math-1" }).props["aria-pressed"]).toBe(false);
    expect(env.announce).not.toHaveBeenCalled();
    await act(async () => root!.unmount());

    env.params = { badge: "math-1" };
    await act(async () => { root = create(<BadgesRoute />); });
    expect(root!.root.findByProps({ testID: "badge-math-1" }).props.accessibilityState.selected).toBe(true);
    expect(root!.root.findByProps({ testID: "badge-math-1" }).props["aria-pressed"]).toBe(true);
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

describe("Phase 3A: Closet camera framing, landscape layout, try-on, honest persistence, and accessibility", () => {
  it("P1-3: cold /locker link switches to Islander room and frames full Islander inside [headerBottom, sheetTop] across 320×568, 390×844, 1024×768, and 844×390 landscape", async () => {
    // Saved room is kitchen while Islander is in My room ("home").
    setupStore({ currentRoom: "kitchen", earned: ["hat:sunhat"] });
    env.params = { item: "hat:sunhat" };
    await act(async () => { root = create(<LockerRoute />); });
    expect(root!.root.findByProps({ testID: "live-room-scene" }).props.room).toBe("home");

    // Verify TRUE room-space head-to-feet screen bounds (hero.contact + hero.bounds) stay strictly inside [headerBottom, sheetTop]
    // across all viewports including 844×390 (60 pt header, sheetTop=137), for both cold /locker and dock-open Closet after rotation!
    const scene = buildScene(starterHome());
    const hero = scene.entities["character/0"];
    const heroRoomTop = hero.contact.y + hero.bounds.top;
    const heroRoomBottom = heroRoomTop + hero.bounds.height;
    const heroRoomLeft = hero.contact.x + hero.bounds.left;
    const heroRoomRight = heroRoomLeft + hero.bounds.width;
    const assertHeroFramed = (
      camera: { a: number; d: number; tx: number; ty: number },
      roomId: (typeof roomIds)[number],
      width: number,
      height: number,
      headerHeight: number,
      label: string
    ) => {
      const building = buildingLayout(roomIds.length, width / height > 1.8);
      const metrics = closetSheetMetrics(height);
      const sheetTop = height - metrics.sheetHeight;
      const origin = roomOrigin(roomIds.indexOf(roomId), building);
      const heroTopWindow = headerHeight + (origin.y + heroRoomTop) * camera.d + camera.ty;
      const heroBottomWindow = headerHeight + (origin.y + heroRoomBottom) * camera.d + camera.ty;
      const heroLeftWindow = (origin.x + heroRoomLeft) * camera.a + camera.tx;
      const heroRightWindow = (origin.x + heroRoomRight) * camera.a + camera.tx;
      expect(heroTopWindow, `${label} head >= headerBottom`).toBeGreaterThanOrEqual(headerHeight);
      expect(heroBottomWindow, `${label} feet <= sheetTop`).toBeLessThanOrEqual(sheetTop);
      expect(heroLeftWindow, `${label} left >= 0`).toBeGreaterThanOrEqual(0);
      expect(heroRightWindow, `${label} right <= width`).toBeLessThanOrEqual(width);
    };

    for (const [width, height] of [
      [320, 568],
      [390, 844],
      [1024, 768],
      [844, 390],
    ] as const) {
      const building = buildingLayout(roomIds.length, width / height > 1.8);
      const headerHeight = 60;
      const metrics = closetSheetMetrics(height);
      const sheetTop = height - metrics.sheetHeight;
      const aboveHeight = closetAboveSheetHeight(height, headerHeight);
      expect(aboveHeight, `${width}x${height} actual visible band`).toBe(Math.max(0, sheetTop - headerHeight));

      const framed = closetCameraFor(hero, "kitchen", { width, height: height - headerHeight - 76 }, height, headerHeight, building);
      expect(framed.room).toBe("home");
      assertHeroFramed(framed.camera, framed.room, width, height, headerHeight, `${width}x${height}`);
    }

    // Live route check at 844×390 (60 pt header, sheetTop=137): cold /locker entry AND dock-open Closet after rotation.
    await act(async () => root!.unmount());
    env.window = { width: 844, height: 390, fontScale: 1 };
    env.insets = { top: 0, bottom: 21, left: 0, right: 0 };
    env.params = {};
    env.cameraSet.mockReset();
    await act(async () => { root = create(<LockerRoute />); });
    // Trigger measured 60 pt header layout as in Chromium at 844×390.
    const coldHeader = root!.root.findByProps({ testID: "home-top-bar" });
    await act(async () => coldHeader.props.onLayout({ nativeEvent: { layout: { height: 60 } } }));
    const coldCamera = env.cameraSet.mock.calls.at(-1)?.[0] ?? env.interactionOpts.initialCamera;
    assertHeroFramed(coldCamera, "home", 844, 390, 60, "cold /locker 844x390");
    await act(async () => root!.unmount());

    // Start portrait on /island-home, rotate to 844×390, then open Closet from dock.
    env.window = { width: 390, height: 844, fontScale: 1 };
    env.insets = { top: 44, bottom: 34, left: 0, right: 0 };
    env.animateCamera.mockReset();
    env.cameraSet.mockReset();
    await act(async () => { root = create(<IslandHomeRoute />); });
    env.window = { width: 844, height: 390, fontScale: 1 };
    env.insets = { top: 0, bottom: 21, left: 0, right: 0 };
    await act(async () => { root!.update(<IslandHomeRoute />); });
    await act(async () => root!.root.findByProps({ testID: "home-top-bar" }).props.onLayout({ nativeEvent: { layout: { height: 60 } } }));
    await act(async () => root!.root.findByProps({ testID: "home-closet-button" }).props.onPress());
    const dockCamera = env.animateCamera.mock.calls.at(-1)?.[0];
    assertHeroFramed(dockCamera, "home", 844, 390, 60, "dock Closet after 844x390 rotation");
  });

  it("P1-3: switching rooms via arrows or canvas swipe while Closet is open cancels try-on draft and closes Closet", async () => {
    setupStore({ earned: ["hat:captain-cap"] });
    await act(async () => { root = create(<IslandHomeRoute />); });
    const liveLook = () => root!.root.findByProps({ testID: "live-room-islander" }).props.look as IslanderLook;

    // Open Closet and try on captain-cap.
    await act(async () => root!.root.findByProps({ testID: "home-closet-button" }).props.onPress());
    await act(async () => root!.root.findByProps({ testID: "closet-tab-hats" }).props.onPress());
    await act(async () => root!.root.findByProps({ testID: "closet-item-hat:captain-cap" }).props.onPress());
    expect(liveLook().hat).toBe("captain-cap");

    // Switching rooms via top room arrow cancels try-on & closes Closet.
    await act(async () => hostById(root!.root, "home-room-next")[0].props.onPress());
    await act(async () => { vi.advanceTimersByTime(250); });
    expect(root!.root.findAllByProps({ testID: "home-closet-sheet" })).toHaveLength(0);
    expect(liveLook().hat).toBe(defaultLook.hat);

    // Reopen Closet, try on again, then swipe camera to another room -> cancels try-on & closes Closet.
    await act(async () => root!.root.findByProps({ testID: "home-closet-button" }).props.onPress());
    await act(async () => root!.root.findByProps({ testID: "closet-tab-hats" }).props.onPress());
    await act(async () => root!.root.findByProps({ testID: "closet-item-hat:captain-cap" }).props.onPress());
    expect(liveLook().hat).toBe("captain-cap");

    await act(async () => env.interactionOpts.onCameraChange(false, roomIds.indexOf("kitchen")));
    await act(async () => { vi.advanceTimersByTime(250); });
    expect(root!.root.findAllByProps({ testID: "home-closet-sheet" })).toHaveLength(0);
    expect(liveLook().hat).toBe(defaultLook.hat);
  });

  it("P1-4: 844×390 phone landscape Closet budget keeps Wear this 100% unclipped even with 21 pt bottom inset and locked-item banner", async () => {
    env.window = { width: 844, height: 390, fontScale: 1 };
    env.insets = { top: 0, bottom: 21, left: 0, right: 0 };

    const plain = closetSheetMetrics(390, { bottomInset: 21 });
    const withLocked = closetSheetMetrics(390, { bottomInset: 21, hasLockedBanner: true });
    const withLockedAndError = closetSheetMetrics(390, { bottomInset: 21, hasLockedBanner: true, hasStatusLine: true });
    for (const [label, m] of [
      ["21pt inset", plain],
      ["21pt inset + locked banner", withLocked],
      ["21pt inset + locked banner + error", withLockedAndError],
    ] as const) {
      expect(m.shortViewport, label).toBe(true);
      expect(m.footerFits, label).toBe(true);
      expect(m.fixedChromeHeight, label).toBeLessThanOrEqual(m.sheetHeight);
      expect(m.availableGridHeight, label).toBeGreaterThan(0);
    }

    await act(async () => { root = create(<LockerRoute />); });
    // Tap a locked hat so closet-locked-rule is rendered inside the 844×390 sheet.
    await act(async () => root!.root.findByProps({ testID: "closet-tab-hats" }).props.onPress());
    await act(async () => root!.root.findByProps({ testID: "closet-item-hat:captain-cap" }).props.onPress());
    expect(hostById(root!.root, "closet-locked-rule")).toHaveLength(1);

    const panel = root!.root.findByProps({ testID: "sheet" });
    expect(flat(panel.props.style).height).toBe(withLocked.sheetHeight);
    // Scrollable grid must flex cleanly with NO rigid minHeight that overflows the footer.
    const grid = root!.root.findByProps({ testID: "closet-grid" });
    expect(flat(grid.props.style)).toMatchObject({ flex: 1, minHeight: 0 });
    const footer = root!.root.findByProps({ testID: "closet-wear-bar" });
    expect(flat(footer.props.style).flexShrink).toBe(0);
    const wearButton = hostById(root!.root, "closet-wear-button")[0];
    expect(flat(wearButton.props.style).minHeight).toBeGreaterThanOrEqual(theme.target.min);
  });

  it("opens undimmed at ~45% height on phones / bottom card on iPad with 5 picture-only tabs and W3C Web tabs ARIA", async () => {
    await act(async () => { root = create(<LockerRoute />); });
    // Undimmed: no Modal, no scrim, box-none wrapper so room above stays live & touchable.
    expect(root!.root.findAllByType("Modal" as never)).toHaveLength(0);
    expect(root!.root.findAllByProps({ testID: "sheet-backdrop" })).toHaveLength(0);
    const panel = root!.root.findByProps({ testID: "sheet" });
    expect(panel.props.accessibilityViewIsModal).toBe(false);
    expect(flat(panel.props.style).height).toBe(Math.floor(852 * 0.45));

    // P2-3: W3C Tabs ARIA (role=tablist, role=tab, aria-selected, roving tabIndex, role=tabpanel, keyboard arrows).
    const tablist = root!.root.findByProps({ testID: "closet-tabs" });
    expect(tablist.props.role).toBe("tablist");
    const tabs = tablist.findAllByProps({ accessibilityRole: "tab" });
    expect(tabs.map((t) => t.props.testID)).toEqual([
      "closet-tab-hair",
      "closet-tab-tops",
      "closet-tab-bottoms",
      "closet-tab-hats",
      "closet-tab-extras",
    ]);
    expect(tabs.map((t) => t.props["aria-selected"])).toEqual([true, false, false, false, false]);
    expect(tabs.map((t) => t.props.tabIndex)).toEqual([0, -1, -1, -1, -1]);
    for (const tab of tabs) {
      expect(tab.props.accessibilityLabel).toBeTruthy();
      expect(tab.props["aria-controls"]).toBe("closet-tabpanel");
      expect(tab.findAllByType("Text" as never)).toHaveLength(0);
    }
    const grid = root!.root.findByProps({ testID: "closet-grid" });
    expect(grid.props.role).toBe("tabpanel");
    expect(grid.props["aria-labelledby"]).toBe("closet-tab-hair");

    // ArrowRight moves selection and focus from Hair -> Tops.
    const focus = vi.fn();
    const preventDefault = vi.fn();
    await act(async () => {
      tablist.props.onKeyDown({
        key: "ArrowRight",
        preventDefault,
        currentTarget: { querySelectorAll: () => [{ focus: vi.fn() }, { focus }] },
      });
    });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(focus).toHaveBeenCalledOnce();
    expect(root!.root.findByProps({ testID: "closet-tab-tops" }).props["aria-selected"]).toBe(true);
    expect(root!.root.findByProps({ testID: "closet-grid" }).props["aria-labelledby"]).toBe("closet-tab-tops");
    expect([nextClosetTabIndex("ArrowLeft", 0, 5), nextClosetTabIndex("End", 0, 5), nextClosetTabIndex("Home", 3, 5)]).toEqual([4, 4, 0]);

    // iPad width renders a centered bottom card capped at sheet.maxWidth.
    env.window = { width: 1024, height: 768, fontScale: 1 };
    await act(async () => { root!.update(<LockerRoute />); });
    expect(flat(root!.root.findByProps({ testID: "sheet" }).props.style).width).toBe(theme.sheet.maxWidth);
  });

  it("P1-5: SaveStatus Retry and Sheet Close have zero overlap and stay independently reachable in both Closet and Badge Wall at 844×390", async () => {
    env.window = { width: 844, height: 390, fontScale: 1 };
    env.insets = { top: 0, bottom: 21, left: 0, right: 0 };
    setupStore({ earned: ["hat:captain-cap"] });
    env.saveStatusVisible = true;
    await act(async () => { root = create(<IslandHomeRoute />); });
    await act(async () => root!.root.findByProps({ testID: "home-top-bar" }).props.onLayout({ nativeEvent: { layout: { height: 60 } } }));

    // When no sheet is open, SaveStatus renders normally on Home (single banner).
    expect(hostById(root!.root, "home-save-status")).toHaveLength(1);
    expect(hostById(root!.root, "save-retry-button")).toHaveLength(1);

    // Open Badge Wall -> SaveStatus renders IN-FLOW inside Sheet directly BELOW the header bar (never absolute over Close!).
    await act(async () => root!.root.findByProps({ testID: "home-badges-button" }).props.onPress());
    const modal = root!.root.findByType("Modal" as never);
    expect(hostById(modal, "save-retry-button")).toHaveLength(1);
    expect(hostById(root!.root, "home-save-status")).toHaveLength(1); // zero duplicate banners!
    const badgeSheetPanel = modal.findByProps({ testID: "sheet" });
    const badgeSaveWrap = hostById(badgeSheetPanel, "home-save-status")[0];
    expect(flat(badgeSaveWrap.props.style).position).not.toBe("absolute");
    // In-flow child order inside Sheet panel: [0] header (contains sheet-close), [1] banner (contains home-save-status), [2] body.
    const panelChildren = badgeSheetPanel.children.filter((c): c is ReactTestInstance => typeof c !== "string");
    const headerIdx = panelChildren.findIndex((c) => hostById(c, "sheet-close").length > 0);
    const bannerIdx = panelChildren.findIndex((c) => c.props.testID === "home-save-status");
    expect(headerIdx).toBeGreaterThanOrEqual(0);
    expect(bannerIdx).toBeGreaterThan(headerIdx);
    // Close button stays independently reachable and closes Badge Wall while save error is active.
    await act(async () => hostById(modal, "sheet-close")[0].props.onPress());
    await act(async () => { vi.advanceTimersByTime(250); });
    expect(root!.root.findAllByProps({ testID: "home-badges-sheet" })).toHaveLength(0);

    // Open Closet -> SaveStatus stays strictly inside [headerHeight + 4, sheetTop - 4] ABOVE Closet (zero intersection with sheet/Close!).
    await act(async () => root!.root.findByProps({ testID: "home-closet-button" }).props.onPress());
    expect(hostById(root!.root, "home-save-status")).toHaveLength(1); // zero duplicate banners!
    const statusWrap = root!.root.findByProps({ testID: "home-save-status" });
    const statusStyle = flat(statusWrap.props.style);
    const closetMetrics = closetSheetMetrics(390, { bottomInset: 21 });
    const sheetTop = 390 - closetMetrics.sheetHeight; // 137
    expect(statusStyle.zIndex).toBe(100);
    expect(statusStyle.top).toBe(64);
    expect(statusStyle.bottom).toBe(closetMetrics.sheetHeight + 4);
    const statusBottomWindow = 390 - statusStyle.bottom; // 133
    expect(statusBottomWindow).toBeLessThan(sheetTop);
    expect(statusBottomWindow - statusStyle.top).toBeGreaterThanOrEqual(52); // enough height for compact SaveStatus Retry (44pt button)
    expect(hostById(root!.root, "save-retry-button")).toHaveLength(1);
    expect(hostById(root!.root, "sheet-close")).toHaveLength(1);

    await act(async () => root!.root.findByProps({ testID: "closet-tab-hats" }).props.onPress());
    await act(async () => root!.root.findByProps({ testID: "closet-item-hat:captain-cap" }).props.onPress());

    // Case 1: personalize returns false synchronously -> keep preview, show error, never announce success.
    env.store.personalize = vi.fn(() => false);
    env.announce.mockClear();
    await act(async () => hostById(root!.root, "closet-wear-button")[0].props.onPress());
    expect(root!.root.findByProps({ testID: "live-room-islander" }).props.look.hat).toBe("captain-cap");
    expect(hostById(root!.root, "closet-wear-error")).toHaveLength(1);
    expect(hostById(root!.root, "closet-wear-saved")).toHaveLength(0);
    expect(env.announce).not.toHaveBeenCalledWith("Wearing your new look.");

    // Case 2: personalize returns true, Store starts async write (saving: true), then fails with store.error!
    env.store.personalize = vi.fn(() => {
      env.store.saving = true;
      return true;
    });
    env.announce.mockClear();
    await act(async () => hostById(root!.root, "closet-wear-button")[0].props.onPress());
    await act(async () => root!.update(<IslandHomeRoute />));
    expect(hostById(root!.root, "closet-wear-saving")).toHaveLength(1);
    expect(hostById(root!.root, "closet-wear-saved")).toHaveLength(0);

    // Disk write fails.
    env.store.saving = false;
    env.store.error = "Your latest changes could not be saved. Keep the app open and try again.";
    await act(async () => root!.update(<IslandHomeRoute />));
    expect(hostById(root!.root, "closet-wear-error")).toHaveLength(1);
    expect(hostById(root!.root, "closet-wear-saved")).toHaveLength(0);
    expect(env.announce).not.toHaveBeenCalledWith("Wearing your new look.");

    // Retry succeeds -> Store clears error, Closet clears closet-wear-error cleanly and shows saved confirmation!
    env.store.error = null;
    env.store.saving = false;
    await act(async () => root!.update(<IslandHomeRoute />));
    expect(hostById(root!.root, "closet-wear-error")).toHaveLength(0);
    expect(hostById(root!.root, "closet-wear-saved")).toHaveLength(1);
    expect(env.announce).toHaveBeenCalledWith("Wearing your new look.");

    // Close button on Closet works cleanly even while SaveStatus is visible!
    await act(async () => hostById(root!.root, "sheet-close")[0].props.onPress());
    await act(async () => { vi.advanceTimersByTime(250); });
    expect(root!.root.findAllByProps({ testID: "home-closet-sheet" })).toHaveLength(0);
  });

  it("P2-2 & P3-1: sends native VoiceOver focus to an accessible header node on open & opener on close, and reserves 'trying on' for unsaved drafts", async () => {
    setupStore({ earned: ["hat:captain-cap"] });
    const nodes: Record<string, object> = {};
    const createNodeMock = (element: React.ReactElement) => {
      const id = (element.props as { testID?: string }).testID;
      if (!id) return { measureInWindow: () => {} };
      nodes[id] ??= { id, measureInWindow: () => {} };
      return nodes[id];
    };
    await act(async () => {
      root = create(<IslandHomeRoute />, { createNodeMock });
    });

    // Open Closet -> native accessibility focus moves to sheet-title which MUST be accessible with role="header".
    await act(async () => root!.root.findByProps({ testID: "home-closet-button" }).props.onPress());
    await act(async () => { vi.advanceTimersByTime(20); });
    const sheetTitle = root!.root.findByProps({ testID: "sheet-title" });
    expect(sheetTitle.props.accessible).toBe(true);
    expect(sheetTitle.props.accessibilityRole).toBe("header");
    expect(env.sendA11yFocus).toHaveBeenCalledWith(nodes["sheet-title"], "focus");

    // P3-1: Equipped default hat ("None") says "wearing" WITHOUT "trying on".
    await act(async () => root!.root.findByProps({ testID: "closet-tab-hats" }).props.onPress());
    const noneTile = root!.root.findByProps({ testID: "closet-item-hat:none" });
    expect(noneTile.props.accessibilityLabel).toContain("wearing");
    expect(noneTile.props.accessibilityLabel).not.toContain("trying on");

    // Try on captain-cap -> captain-cap says "trying on" (not "wearing"), while "None" stays "wearing" (not "trying on").
    await act(async () => root!.root.findByProps({ testID: "closet-item-hat:captain-cap" }).props.onPress());
    const capTile = root!.root.findByProps({ testID: "closet-item-hat:captain-cap" });
    expect(capTile.props.accessibilityLabel).toContain("trying on");
    expect(capTile.props.accessibilityLabel).not.toContain("wearing");

    // Close Closet -> native accessibility focus returns to home-closet-button opener!
    env.sendA11yFocus.mockClear();
    await act(async () => root!.root.findByProps({ accessibilityLabel: "Close closet" }).props.onPress());
    await act(async () => { vi.advanceTimersByTime(250); });
    expect(env.sendA11yFocus).toHaveBeenCalledWith(nodes["home-closet-button"], "focus");
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

describe("Phase 3A: Badge Wall stability, room hotspots, More controls, Tidy up, and Reduce Motion", () => {
  it("P2-4: Badge Wall keeps manual child selection and does not repeat link announcement on Store array recomputes", async () => {
    await act(async () => {
      root = create(<HomeBadgesSheet visible onClose={() => {}} badges={["classic-4"]} milestones={[]} initialBadge="classic-4" />);
    });
    expect(env.announce).toHaveBeenCalledTimes(1);
    expect(textOf(root!.root.findByProps({ testID: "badge-detail" }))).toContain(badgeInfo("classic-4").name);

    // Child manually chooses a different frame.
    await act(async () => root!.root.findByProps({ testID: "badge-math-1" }).props.onPress());
    expect(textOf(root!.root.findByProps({ testID: "badge-detail" }))).toContain(badgeInfo("math-1").name);
    expect(env.announce).toHaveBeenCalledTimes(2);

    // Store re-renders with brand-new badges & milestones array references -> manual choice MUST stay and NOT re-announce!
    await act(async () => {
      root!.update(
        <HomeBadgesSheet
          visible
          onClose={() => {}}
          badges={["classic-4", "math-1"]}
          milestones={["learn:shell-math:1"]}
          initialBadge="classic-4"
        />
      );
    });
    expect(root!.root.findByProps({ testID: "badge-math-1" }).props.accessibilityState.selected).toBe(true);
    expect(root!.root.findByProps({ testID: "badge-math-1" }).props["aria-pressed"]).toBe(true);
    expect(textOf(root!.root.findByProps({ testID: "badge-detail" }))).toContain(badgeInfo("math-1").name);
    expect(textOf(root!.root.findByProps({ testID: "badge-detail" }))).toContain("Earned");
    expect(env.announce).toHaveBeenCalledTimes(2);
  });

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

  it("P1-2: Play More omits Tidy up; Decorate More exposes Tidy up behind F3 confirmation", async () => {
    await act(async () => { root = create(<IslandHomeRoute />); });
    // Tidy up is NOT on the top-level chrome.
    expect(root!.root.findAllByProps({ accessibilityLabel: "Tidy up" })).toHaveLength(0);

    // Open Friends drawer directly from top bar.
    await act(async () => hostById(root!.root, "home-friends-button")[0].props.onPress());
    expect(root!.root.findAllByProps({ testID: "friend-drawer" })).toHaveLength(1);

    // Open Play More panel from top bar -> exposes Whole house, Find, Zoom, Friends, For grown-ups, and NO Tidy up.
    await act(async () => hostById(root!.root, "home-more-button")[0].props.onPress());
    const panel = root!.root.findByProps({ testID: "more-home-controls" });
    expect(panel.findAllByProps({ accessibilityLabel: "Whole house" })).toHaveLength(1);
    expect(panel.findAllByProps({ accessibilityLabel: "Find my Islander" })).toHaveLength(1);
    expect(panel.findAllByProps({ accessibilityLabel: "Zoom in" })).toHaveLength(1);
    expect(panel.findAllByProps({ accessibilityLabel: "Zoom out" })).toHaveLength(1);
    expect(panel.findAllByProps({ accessibilityLabel: "Friends drawer" })).toHaveLength(1);
    expect(panel.findAllByProps({ testID: "home-grown-ups" })).toHaveLength(1);
    expect(panel.findAllByProps({ accessibilityLabel: "Tidy up" })).toHaveLength(0);
    expect(panel.findAllByProps({ testID: "more-tidy-up-button" })).toHaveLength(0);

    // Open Decorate -> Decorate's More sheet exposes Tidy up behind confirmation without resetting immediately.
    await act(async () => hostById(root!.root, "home-decorate-button")[0].props.onPress());
    await act(async () => root!.root.findByProps({ accessibilityLabel: "More decorating" }).props.onPress());
    expect(hostById(root!.root, "decorate-more-sheet")).toHaveLength(1);
    await act(async () => hostById(root!.root, "decorate-tidy-up-button")[0].props.onPress());
    expect(textOf(root!.root)).toContain("Tidy up this room? Undo can bring it back.");
    expect(env.store.personalize).not.toHaveBeenCalled();
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

    // Open Decorate -> Undo & Redo appear in top bar, and Tidy up is tucked inside Decorate's More sheet.
    await act(async () => hostById(root!.root, "home-decorate-button")[0].props.onPress());
    expect(hostById(root!.root, "home-undo-button")).toHaveLength(1);
    expect(hostById(root!.root, "home-redo-button")).toHaveLength(1);
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
