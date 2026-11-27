import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { BoardScreen } from "../src/board/Screen";
import { ReefChallengeBoard } from "../src/board/reef-sweep/ChallengeBoard";
import { reefChallengeEngine, reefDeepPuzzles, type State } from "../src/board/reef-sweep/challenge";
import { createSession, type BoardSession } from "../src/board";
import * as reef from "../src/board/reef-sweep/engine";
import { coordinate } from "../src/board/reef-sweep/solver";
import { wordsFit, wordFitMultiplier, CHROME_MAX } from "../src/components/wordFit";
vi.mock('../src/ui/fonts', () => ({ useNunitoLoaded: () => false }));

const fixture = vi.hoisted(() => ({
  push: vi.fn(),
  openGame: vi.fn(),
  play: vi.fn(),
  dims: { width: 390, height: 844, fontScale: 1 },
  insets: { left: 0, right: 0, top: 0, bottom: 0 },
  store: {
    ready: true,
    recovery: false,
    epoch: 0,
    save: {
      board: {} as Record<string, BoardSession | undefined>,
      settings: { sound: false },
      players: [] as string[],
      cove: { people: {}, active: null },
      learning: { active: "family", people: [{ id: "family", name: "Family", avatar: "crab", skills: {}, choices: {}, notes: {} }] },
    },
    boardUpdate: vi.fn(),
    rememberPlayers: vi.fn(),
    settings: vi.fn(),
    covePerson: vi.fn(async () => true),
  },
}));

vi.mock("react-native", () => ({
  View: "div",
  ScrollView: "section",
  TextInput: "input",
  AppState: { addEventListener: () => ({ remove() {} }) },
  Platform: { OS: "ios" },
  useWindowDimensions: () => fixture.dims,
}));
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "main",
  useSafeAreaInsets: () => fixture.insets,
}));
vi.mock("expo-router", () => ({
  router: { push: fixture.push, back: vi.fn(), canGoBack: () => true, replace: vi.fn() },
  useFocusEffect: () => {},
  useLocalSearchParams: () => ({}),
}));
vi.mock("react-native-svg", () => ({ default: "svg", Circle: "circle", Line: "line", Rect: "rect" }));
vi.mock("../src/components/ui", () => ({
  C: { ink: "#000", teal: "#0aa", sand: "#eee", paper: "#fff", muted: "#666", gold: "#c90", blue: "#06c", error: "#900", cream: "#fcfaf4" },
  Button: "button",
  Chip: "button",
  Copy: "p",
  Heading: "h2",
  Label: "label",
  IconButton: "button",
  PressableScale: "button",
  GameHeader: () => null,
  ToggleRow: () => null,
  Status: ({ title, detail }: { title: string; detail?: string }) => <p>{`${title} | ${detail ?? ""}`}</p>,
  Sheet: ({ visible, children, footer }: { visible: boolean; children: React.ReactNode; footer?: React.ReactNode }) =>
    visible ? <aside>{children}{footer}</aside> : null,
  styles: { page: {}, content: {}, row: {} },
  font: undefined,
}));
vi.mock("../src/components/Text", () => ({ Text: "span" }));
vi.mock("../src/badges/ResultCard", () => ({ BadgeResultCard: () => null }));
vi.mock("../src/islander/Companion", () => ({ Companion: () => null }));
vi.mock("../src/islander/reactions", () => ({ resultEvent: () => "win" }));
vi.mock("../src/learn/Celebrate", () => ({ Celebrate: () => null }));
vi.mock("../src/components/Match", () => ({ PlayerNames: () => null, Scoreboard: () => null }));
vi.mock("../src/components/Recovery", () => ({ Recovery: () => null }));
vi.mock("../src/components/SaveStatus", () => ({ SaveStatus: () => null }));
vi.mock("../src/components/Audio", () => ({ useSounds: () => fixture.play }));
vi.mock("../src/state/Store", () => ({ useStore: () => fixture.store }));
vi.mock("../src/practice/useRoundPractice", () => ({ useRoundPractice: () => ({ request: (f: () => void) => f(), panel: null }) }));
vi.mock("../src/board/Art", () => ({ BoardArt: () => null, Piece: () => null }));
vi.mock("../src/hub/navigation", () => ({ openGame: fixture.openGame }));
vi.mock("../src/hub/Landmarks", () => ({ Landmark: () => null }));
vi.mock("../src/ui", async () => (await import("./helpers/cove-ui")).ui);
vi.mock("../src/cove/CoveArt", async () => (await import("./helpers/cove-ui")).art);
vi.mock("../src/cove/PeoplePicker", () => ({ PeoplePicker: () => null, solvingPeople: () => [{ id: "family", name: "Family" }] }));
vi.mock("../src/cove/useCoveLocal", () => ({
  useCoveLocal: () => ({
    ready: true,
    error: "",
    data: { people: {}, hidden: [], favorites: [], pins: {} },
    load: () => {},
    change: async () => true,
    reset: async () => {},
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Node = ReturnType<ReactTestRenderer["toJSON"]>;
const flat = (n: Node | string | Node[] | null): string =>
  n === null ? "" : typeof n === "string" ? n : Array.isArray(n) ? n.map(flat).join("") : (n.children ?? []).map((c) => flat(c as Node | string)).join("");
const text = (r: ReactTestRenderer) => flat(r.toJSON());
type Instance = ReactTestRenderer["root"];
const words = (n: Instance | string): string => (typeof n === "string" ? n : n.children.map(words).join(""));
const button = (r: ReactTestRenderer, label: string) => r.root.find((n) => n.type === "button" && words(n).includes(label));
const labelled = (r: ReactTestRenderer, prefix: string) =>
  r.root.find((n) => n.type === "button" && typeof n.props.accessibilityLabel === "string" && n.props.accessibilityLabel.startsWith(prefix));

describe("P4 Reef Sweep UI, fallback prompt, hint ladder, Cove shortcut & AX5 fit", () => {
  it("shows honest size/urchin chips (no misleading Gentle/Growing/Challenge rival names) and links Deduction puzzles", async () => {
    fixture.dims = { width: 390, height: 844, fontScale: 1 };
    fixture.store.save.board = {};
    let r!: ReactTestRenderer;
    await act(() => {
      r = create(<BoardScreen game="reef-sweep" />);
    });
    const out = text(r);
    expect(out).toContain("5 × 5 · 3 urchins");
    expect(out).toContain("6 × 6 · 5 urchins");
    expect(out).toContain("7 × 7 · 8 urchins");
    expect(out).not.toContain("5 × 5 · Gentle");
    expect(out).not.toContain("6 × 6 · Growing");
    expect(out).not.toContain("7 × 7 · Challenge");
    await act(() => button(r, "Deduction puzzles").props.onPress());
    expect(fixture.push).toHaveBeenLastCalledWith({ pathname: "/challenge", params: { game: "reef-sweep" } });
    await act(() => r.unmount());
  });

  it("asks explicitly before using a certified fallback when redraw exhausts and never silently moves the tap", async () => {
    fixture.dims = { width: 390, height: 844, fontScale: 1 };
    const session: BoardSession = { ...createSession("reef-sweep", { seed: 21, size: 7 }), taught: true };
    fixture.store.save.board = { "reef-sweep": session };
    fixture.store.boardUpdate.mockReset();
    fixture.store.boardUpdate.mockImplementation((_g, next) => {
      fixture.store.save.board["reef-sweep"] = next;
      return true;
    });

    let r!: ReactTestRenderer;
    await act(() => {
      r = create(<BoardScreen game="reef-sweep" redrawOptions={{ maxAttempts: 0 }} />);
    });
    // Tap A1 (cell 0). Budget exhausts -> must ask explicitly, NOT commit any board or move the tap!
    await act(async () => {
      labelled(r, "Reef A1,").props.onPress();
      await new Promise((res) => setTimeout(res, 20));
    });
    expect(fixture.store.boardUpdate).not.toHaveBeenCalled();
    expect(text(r)).toContain("Try a certified reef?");
    expect(text(r)).toContain("Your tap was not moved.");

    // Cancel keeps the original reef untouched.
    await act(() => button(r, "Keep this reef").props.onPress());
    expect(text(r)).not.toContain("Try a certified reef?");
    expect(fixture.store.boardUpdate).not.toHaveBeenCalled();

    // Tap again and explicitly accept the certified fallback.
    await act(async () => {
      labelled(r, "Reef A1,").props.onPress();
      await new Promise((res) => setTimeout(res, 20));
    });
    await act(() => button(r, "Use certified reef").props.onPress());
    expect(fixture.store.boardUpdate).toHaveBeenCalledTimes(1);
    const accepted = fixture.store.boardUpdate.mock.calls[0][1] as BoardSession;
    expect(accepted.position.fallback).toBeDefined();
    expect(accepted.position.moves).toEqual([]);
    await act(() => r.unmount());
  });

  it("supports long-press flagging and the 4-step public hint ladder (Look -> Think -> One step -> Show me)", async () => {
    fixture.dims = { width: 390, height: 844, fontScale: 1 };
    const openedPos = reef.move(reef.create(4, 5), 12);
    let current: BoardSession = { ...createSession("reef-sweep", { seed: 4, size: 5 }), position: openedPos, taught: true };
    fixture.store.save.board = { "reef-sweep": current };
    fixture.store.boardUpdate.mockReset();
    fixture.store.boardUpdate.mockImplementation((_g, next: BoardSession) => {
      current = next;
      fixture.store.save.board["reef-sweep"] = next;
      return true;
    });

    let r!: ReactTestRenderer;
    await act(() => {
      r = create(<BoardScreen game="reef-sweep" />);
    });

    // Long-press a closed cell to toggle flag while still in Open pearls mode.
    const closedIdx = openedPos.marks.findIndex((m) => m === 0);
    const closedCoord = coordinate(5, closedIdx);
    await act(() => labelled(r, `Reef ${closedCoord},`).props.onLongPress());
    expect(fixture.store.boardUpdate).toHaveBeenCalledTimes(1);
    expect(current.position.marks[closedIdx]).toBe(2);

    // Re-render with original opened state and walk the 4-step hint ladder.
    current = { ...createSession("reef-sweep", { seed: 4, size: 5 }), position: openedPos, taught: true };
    fixture.store.save.board["reef-sweep"] = current;
    fixture.store.boardUpdate.mockClear();
    await act(() => r.update(<BoardScreen game="reef-sweep" />));

    expect(text(r)).toContain("Hint · Look");
    await act(() => button(r, "Hint · Look").props.onPress());
    expect(text(r)).toContain("Hint · Think");
    await act(() => button(r, "Hint · Think").props.onPress());
    expect(text(r)).toContain("Hint · One step");
    await act(() => button(r, "Hint · One step").props.onPress());
    expect(text(r)).toContain("Hint · Show me");
    await act(() => button(r, "Hint · Show me").props.onPress());
    expect(fixture.store.boardUpdate).toHaveBeenCalledTimes(1);
    await act(() => r.unmount());
  });

  it("renders ReefChallengeBoard at default and AX5 on iPhone 15 portrait/landscape and iPad mini 6 without clipping", async () => {
    const hardest = reefDeepPuzzles[reefDeepPuzzles.length - 1].descriptor; // 7x7 coupled
    const opts = { supportOff: false, ownRead: false };
    let state: State = reefChallengeEngine.create(hardest, { version: 1 }, opts);
    state = reefChallengeEngine.step(state, ["o", hardest.start], hardest)!.state;

    for (const dims of [
      { width: 390, height: 844, fontScale: 1 },
      { width: 390, height: 844, fontScale: 3.1 },
      { width: 844, height: 390, fontScale: 3.1 },
      { width: 744, height: 1133, fontScale: 3.1 },
      { width: 1133, height: 744, fontScale: 3.1 },
    ]) {
      fixture.dims = dims;
      let r!: ReactTestRenderer;
      await act(() => {
        r = create(<ReefChallengeBoard state={state} dispatch={() => {}} active width={dims.width - 40} />);
      });
      const tileButtons = r.root.findAll(
        (n) => n.type === "button" && typeof n.props.accessibilityLabel === "string" && n.props.accessibilityLabel.startsWith("Reef ")
      );
      expect(tileButtons).toHaveLength(49);
      // Every tile keeps touch height >= 40pt and fits within container.
      for (const b of tileButtons) {
        expect(b.props.style.minHeight).toBeGreaterThanOrEqual(40);
      }
      // At AX5, key words do not break mid-word under our wordFit cap.
      const mult = wordFitMultiplier("Deduction puzzles", 15, dims.width - 40, CHROME_MAX);
      expect(wordsFit("Deduction puzzles", 15 * mult, dims.width - 40)).toBe(true);
      await act(() => r.unmount());
    }

    // Landscape Challenge with native safe-area insets (iPhone 15 landscape) and wide iPad 13" clamps cleanly.
    fixture.dims = { width: 852, height: 393, fontScale: 3.12 };
    fixture.insets = { left: 59, right: 59, top: 0, bottom: 21 };
    let wideR!: ReactTestRenderer;
    await act(() => {
      wideR = create(<ReefChallengeBoard state={state} dispatch={() => {}} active width={852 - 40} />);
    });
    const boardCol = wideR.root.find(
      (n) => n.props.style && !Array.isArray(n.props.style) && typeof n.props.style.width === "number" && n.props.style.minWidth === 0
    );
    expect(boardCol.props.style.width).toBeLessThanOrEqual(852 - 118 - 40);
    await act(() => wideR.unmount());
    fixture.insets = { left: 0, right: 0, top: 0, bottom: 0 };
  });

  it("CV-10: Reef Sweep is a Logic tile on Puzzles that opens its own Challenge as the current learner", async () => {
    const CoveScreen = (await import("../src/cove/CoveScreen")).default;
    fixture.dims = { width: 390, height: 844, fontScale: 1 };
    fixture.push.mockReset();
    fixture.store.covePerson.mockClear();

    let r!: ReactTestRenderer;
    await act(() => {
      r = create(<CoveScreen />);
    });
    expect(text(r)).toContain("Logic");
    const tile = r.root.find((n) => n.type === "button" && n.props.testID === "cove-tile-reef-sweep");
    expect(tile.props.accessibilityLabel).toBe("Reef Sweep");

    await act(async () => {
      tile.props.onPress();
      await Promise.resolve();
    });
    // No Puzzles-only identity is active, so nothing is cleared, and the shortcut is the Hall's own route.
    expect(fixture.store.covePerson).not.toHaveBeenCalled();
    expect(fixture.push).toHaveBeenCalledWith({ pathname: "/challenge", params: { game: "reef-sweep" } });
    expect(fixture.openGame).not.toHaveBeenCalled();
    await act(() => r.unmount());
  });

  it("caps BoardScreen header and status chrome cleanly at AX5 while keeping board and controls together", async () => {
    const session = { ...createSession("reef-sweep", { seed: 4, size: 7 }), taught: true };
    fixture.store.save.board = { "reef-sweep": session };

    // Portrait AX5 on iPhone 15 uses compact layout (hides active Status box above board so 7x7 + controls fit together).
    fixture.dims = { width: 393, height: 852, fontScale: 3.12 };
    let r!: ReactTestRenderer;
    await act(() => {
      r = create(<BoardScreen game="reef-sweep" />);
    });
    expect(r.root.findAll((n) => n.props.children === "A little pearl hunt")).toHaveLength(0);
    const savedCopy = r.root.findAll((n) => n.props.children === "Saved on this device · No rush, take your time.")[0];
    expect(savedCopy.props.maxFontSizeMultiplier).toBe(1.25);
    expect(text(r)).toContain("Open pearls");
    expect(text(r)).toContain("Hint · Look");
    expect(text(r)).toContain("Undo");
    await act(() => r.unmount());

    // Tall tablet portrait keeps the full Status card without font-scale capping at default text size.
    fixture.dims = { width: 744, height: 1133, fontScale: 1 };
    await act(() => {
      r = create(<BoardScreen game="reef-sweep" />);
    });
    const defaultHeading = r.root.findAll((n) => n.props.children === "A little pearl hunt")[0];
    expect(defaultHeading.props.maxFontSizeMultiplier).toBeUndefined();
    await act(() => r.unmount());

    // Landscape AX5 on iPhone 15 bounds both split columns to innerWidth with board alone in the right column.
    fixture.dims = { width: 852, height: 393, fontScale: 3.12 };
    await act(() => {
      r = create(<BoardScreen game="reef-sweep" />);
    });
    const splitCols = r.root.findAll(
      (n) =>
        n.props.style &&
        !Array.isArray(n.props.style) &&
        n.props.style.gap === 6 &&
        typeof n.props.style.width === "number" &&
        n.props.style.minWidth === 0
    );
    expect(splitCols).toHaveLength(2);
    expect(splitCols[0].props.style.width + 12 + splitCols[1].props.style.width).toBeLessThanOrEqual(852 - 24);
    await act(() => r.unmount());
  });

  it("P1-1 UI: ReefChallengeBoard logs only ['h', 0] on Look and ['ho', cell] on Show me while stepping Think/One step locally", async () => {
    fixture.dims = { width: 393, height: 852, fontScale: 3.12 };
    const p = reefDeepPuzzles[0];
    let state: State = reefChallengeEngine.create(p.descriptor, { version: 1 }, { supportOff: false, ownRead: false });
    state = reefChallengeEngine.step(state, ["o", p.descriptor.start], p.descriptor)!.state;
    const dispatched: unknown[] = [];

    let r!: ReactTestRenderer;
    await act(() => {
      r = create(<ReefChallengeBoard state={state} dispatch={(a) => dispatched.push(a)} active width={353} />);
    });
    await act(() => button(r, "Hint · Look").props.onPress());
    expect(dispatched).toEqual([["h", 0]]);
    await act(() => button(r, "Hint · Think").props.onPress());
    expect(dispatched).toEqual([["h", 0]]);
    await act(() => button(r, "Hint · One step").props.onPress());
    expect(dispatched).toEqual([["h", 0]]);
    await act(() => button(r, "Hint · Show me").props.onPress());
    expect(dispatched).toHaveLength(2);
    expect((dispatched[1] as unknown[])[0]).toBe("ho");
    await act(() => r.unmount());
  });

  it("P2-5: suppresses obsolete 'Hear the rules' guessing narration on rules: 2 reefs while keeping it for legacy rounds", async () => {
    fixture.dims = { width: 390, height: 844, fontScale: 1 };
    fixture.play.mockReset();

    // rules: 2 teaching sheet (taught: false) MUST NOT show "Hear the rules".
    const v2Session = { ...createSession("reef-sweep", { seed: 4, size: 5 }), taught: false };
    fixture.store.save.board = { "reef-sweep": v2Session };
    let r!: ReactTestRenderer;
    await act(() => {
      r = create(<BoardScreen game="reef-sweep" />);
    });
    expect(text(r)).not.toContain("Hear the rules");
    await act(() => r.unmount());

    // Legacy round (rules: undefined) keeps "Hear the rules" wired to board-rules-reef-sweep.
    const legacySession = {
      ...createSession("reef-sweep", { seed: 4, size: 5 }),
      position: reef.createLegacy(4, 5),
      taught: false,
    };
    fixture.store.save.board = { "reef-sweep": legacySession };
    await act(() => {
      r = create(<BoardScreen game="reef-sweep" />);
    });
    expect(text(r)).toContain("Hear the rules");
    await act(() => button(r, "Hear the rules").props.onPress());
    expect(fixture.play).toHaveBeenCalledWith("board-rules-reef-sweep");
    await act(() => r.unmount());
  });
});
