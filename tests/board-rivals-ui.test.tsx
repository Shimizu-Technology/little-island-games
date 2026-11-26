import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSession, undo, type BoardSession } from "../src/board";
import { rng } from "../src/board/types";
import * as coconut from "../src/board/coconut-drop/engine";
import * as nets from "../src/board/fishing-nets/engine";
import * as canoes from "../src/board/hidden-canoes/engine";
import * as pits from "../src/board/shell-pits/engine";
import { computerTask } from "../src/playPolicies/decide";
import { BoardScreen } from "../src/board/Screen";
vi.mock('../src/ui/fonts', () => ({ useNunitoLoaded: () => false }));

const fixture = vi.hoisted(() => ({
  push: vi.fn(),
  store: {
    ready: true,
    recovery: false,
    epoch: 0,
    save: { board: {} as Record<string, unknown>, settings: { sound: false }, players: [] as string[] },
    boardUpdate: vi.fn(),
    rememberPlayers: vi.fn(),
    settings: vi.fn(),
  },
}));
vi.mock("react-native", () => ({
  View: "div",
  ScrollView: "section",
  AppState: { addEventListener: () => ({ remove() {} }) },
  Platform: { OS: "ios" },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
}));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: "main", useSafeAreaInsets: () => ({ left: 0, right: 0, top: 0, bottom: 0 }) }));
vi.mock("expo-router", () => ({ router: { push: fixture.push, back: vi.fn(), canGoBack: () => true, replace: vi.fn() }, useFocusEffect: () => {} }));
vi.mock("react-native-svg", () => ({ default: "svg", Circle: "circle", Line: "line", Rect: "rect" }));
vi.mock("../src/components/ui", () => ({
  C: { ink: "#000", teal: "#0aa", sand: "#eee", paper: "#fff", muted: "#666", gold: "#c90" },
  Button: "button",
  Chip: "button",
  Copy: "p",
  Heading: "h2",
  Label: "label",
  PressableScale: "button",
  GameHeader: () => null,
  ToggleRow: () => null,
  Status: ({ title, detail }: { title: string; detail?: string }) => <p>{`${title} | ${detail ?? ""}`}</p>,
  Sheet: ({ visible, children, footer }: { visible: boolean; children: React.ReactNode; footer: React.ReactNode }) => (visible ? <aside>{children}{footer}</aside> : null),
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
vi.mock("../src/components/Audio", () => ({ useSounds: () => () => {} }));
vi.mock("../src/state/Store", () => ({ useStore: () => fixture.store }));
vi.mock("../src/practice/useRoundPractice", () => ({ useRoundPractice: () => ({ request: (f: () => void) => f(), panel: null }) }));
vi.mock("../src/board/Art", () => ({ BoardArt: () => null, Piece: () => null }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Node = ReturnType<ReactTestRenderer["toJSON"]>;
const flat = (n: Node | string | Node[] | null): string =>
  n === null ? "" : typeof n === "string" ? n : Array.isArray(n) ? n.map(flat).join("") : (n.children ?? []).map((c) => flat(c as Node | string)).join("");
const text = (r: ReactTestRenderer) => flat(r.toJSON());
type Instance = ReactTestRenderer["root"];
const words = (n: Instance | string): string => (typeof n === "string" ? n : n.children.map(words).join(""));
const button = (r: ReactTestRenderer, label: string) => r.root.find((n) => n.type === "button" && words(n).includes(label));
afterEach(() => {
  vi.useRealTimers();
  fixture.store.boardUpdate.mockReset();
  fixture.store.save.board = {};
});

describe("board rivals on screen", () => {
  it("setup names each rival and its way of playing, offers a declared head start, and links the endgames", async () => {
    let r!: ReactTestRenderer;
    await act(() => {
      r = create(<BoardScreen game="shell-pits" />);
    });
    for (const label of ["Choose a rival", "Pebble · Gentle", "Coral · Growing", "Ray · Challenge", "Even game", "4 shells ahead", "8 shells ahead", "Endgame puzzles"])
      expect(text(r)).toContain(label);
    await act(() => button(r, "Ray · Challenge").props.onPress());
    expect(text(r)).toContain("Looks eight sows ahead");
    await act(() => button(r, "8 shells ahead").props.onPress());
    expect(text(r)).toContain("still plays its best");
    fixture.store.boardUpdate.mockReturnValue(true);
    await act(() => button(r, "Start Shell Pits").props.onPress());
    const started = fixture.store.boardUpdate.mock.calls[0][1] as BoardSession;
    expect(started.match.names).toEqual(["You", "Ray"]);
    expect(started.position.edge).toEqual([8, 0]);
    expect(started.policy).toBe("shell-pits/challenge@2");
    await act(() => button(r, "Endgame puzzles").props.onPress());
    expect(fixture.push).toHaveBeenLastCalledWith({ pathname: "/challenge", params: { game: "shell-pits" } });
    await act(() => r.unmount());
  });
  it("a round shows its head start and the rival's name, and the rival moves under its frozen policy", async () => {
    vi.useFakeTimers();
    const base = createSession("shell-pits", { seed: 3, strength: "challenge", starter: 1, edge: [4, 0], names: ["You", "Ray"] });
    const s: BoardSession = { ...base, taught: true };
    fixture.store.save.board = { "shell-pits": s };
    fixture.store.boardUpdate.mockReturnValue(true);
    let r!: ReactTestRenderer;
    await act(() => {
      r = create(<BoardScreen game="shell-pits" />);
    });
    expect(text(r)).toContain("Head start for You: 4 shells ahead.");
    expect(text(r)).toContain("Ray is thinking");
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    const moved = fixture.store.boardUpdate.mock.calls[0][1] as BoardSession;
    expect(moved.position.moves).toHaveLength(1);
    const task = computerTask(s)!;
    while (!task.step(4096));
    expect(moved.position.moves).toEqual([task.move()]);
    // A version 1 round keeps the 3.0 search exactly.
    const { policy: _p, salt: _s, ...rest } = s;
    const v1: BoardSession = { ...rest, version: 1, position: pits.create(3, 6, 1) };
    fixture.store.boardUpdate.mockClear();
    fixture.store.save.board = { "shell-pits": v1 };
    await act(() => r.unmount());
    await act(() => {
      r = create(<BoardScreen game="shell-pits" />);
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect((fixture.store.boardUpdate.mock.calls[0][1] as BoardSession).position.moves).toEqual([pits.choose(v1.position, "challenge")]);
    await act(() => r.unmount());
  });
  it("after the game, See the best move shows the moment and its move, then goes back", async () => {
    let position = coconut.create(1, 7, 0);
    for (const m of [0, 5, 1, 5, 2, 5, 6, 5]) position = coconut.move(position, m);
    expect(position.outcome).toBe(1);
    const s: BoardSession = { ...createSession("coconut-drop", { seed: 1, strength: "growing", names: ["You", "Coral"] }), position, taught: true };
    fixture.store.save.board = { "coconut-drop": s };
    let r!: ReactTestRenderer;
    await act(() => {
      r = create(<BoardScreen game="coconut-drop" />);
    });
    expect(text(r)).toContain("Coral wins this time.");
    await act(async () => {
      button(r, "See the best move").props.onPress();
      await Promise.resolve();
    });
    expect(text(r)).toContain("The winning move");
    expect(text(r)).toContain("Dropping in column 4 would have finished four in a line right away.");
    await act(() => button(r, "Back to the final board").props.onPress());
    expect(text(r)).not.toContain("The winning move");
    await act(() => r.unmount());
  });
  it("in progress, no look-back is offered, so nothing hidden can be shown early", async () => {
    const s: BoardSession = { ...createSession("hidden-canoes", { seed: 2, strength: "growing", names: ["You", "Coral"] }), taught: true };
    fixture.store.save.board = { "hidden-canoes": s };
    let r!: ReactTestRenderer;
    await act(() => {
      r = create(<BoardScreen game="hidden-canoes" />);
    });
    expect(text(r)).not.toContain("See the best move");
    await act(() => r.unmount());
    fixture.store.save.board = { "hidden-canoes": { ...s, position: canoes.create(2, 6, 0, [1, 0]) } };
    await act(() => {
      r = create(<BoardScreen game="hidden-canoes" />);
    });
    expect(text(r)).toContain("Find 6 canoe spaces.");
    expect(text(r)).not.toContain("Find all seven");
    await act(() => r.unmount());
  });
  it("P2-3: undo after a look-back, then a different finish, never shows the old look-back", async () => {
    let position = coconut.create(1, 7, 0);
    for (const m of [0, 5, 1, 5, 2, 5, 6, 5]) position = coconut.move(position, m);
    const s: BoardSession = { ...createSession("coconut-drop", { seed: 1, names: ["You", "Coral"] }), position, taught: true };
    fixture.store.save.board = { "coconut-drop": s };
    let r!: ReactTestRenderer;
    await act(() => {
      r = create(<BoardScreen game="coconut-drop" />);
    });
    await act(async () => {
      button(r, "See the best move").props.onPress();
      await Promise.resolve();
    });
    expect(text(r)).toContain("Dropping in column 4 would have finished four in a line right away.");
    // Undo back to the opening under the same round, then win another way: column 1, straight up.
    let back = s;
    while (undo(back) !== back) back = undo(back);
    expect(back.id).toBe(s.id);
    expect(back.position.moves).toEqual([]);
    fixture.store.save.board = { "coconut-drop": back };
    await act(() => r.update(<BoardScreen game="coconut-drop" />));
    expect(text(r)).not.toContain("Dropping in column 4");
    let won = back.position;
    for (const m of [0, 6, 0, 6, 0, 5, 0]) won = coconut.move(won, m);
    expect(won.outcome).toBe(0);
    fixture.store.save.board = { "coconut-drop": { ...back, position: won } };
    await act(() => r.update(<BoardScreen game="coconut-drop" />));
    expect(text(r)).toContain("You win!");
    expect(text(r)).not.toContain("Dropping in column 4");
    expect(text(r)).not.toContain("The winning move");
    // The new finish gets its own look-back.
    await act(async () => {
      button(r, "See the best move").props.onPress();
      await Promise.resolve();
    });
    expect(text(r)).toContain("Your winning move");
    expect(text(r)).toContain("Dropping in column 1 finished four in a line.");
    await act(() => r.unmount());
  });
  it("P2-3: an analysis still running when Undo is pressed is cancelled and never attaches to a later finish", async () => {
    // Real clock, held timers: the look-back runs one 8 ms slice, then waits.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    // A Shell Pits game the player loses, so the look-back searches over several slices.
    let final = pits.create(5, 6, 0);
    for (let seed = 11; final.outcome !== 1; seed++) {
      const random = rng(seed);
      final = pits.create(5, 6, 0);
      while (final.outcome === null) {
        const legal = pits.legal(final);
        final = pits.move(final, legal[Math.floor(random() * legal.length)]);
      }
    }
    const s: BoardSession = { ...createSession("shell-pits", { seed: 5, strength: "growing", starter: 0, names: ["You", "Coral"] }), position: final, taught: true };
    fixture.store.save.board = { "shell-pits": s };
    let r!: ReactTestRenderer;
    await act(() => {
      r = create(<BoardScreen game="shell-pits" />);
    });
    await act(async () => {
      button(r, "See the best move").props.onPress();
      await Promise.resolve();
    });
    expect(text(r)).toContain("Looking back over the game…");
    // Undo (three times) while it is still searching.
    const back = undo(undo(undo(s)));
    expect(back.position.outcome).toBeNull();
    fixture.store.save.board = { "shell-pits": back };
    await act(() => r.update(<BoardScreen game="shell-pits" />));
    expect(text(r)).not.toContain("Looking back over the game…");
    // Finish along a different line under the same round; the old answer must not appear.
    let other = back.position;
    while (other.outcome === null) other = pits.move(other, pits.legal(other).at(-1)!);
    expect(other.moves).not.toEqual(final.moves);
    fixture.store.save.board = { "shell-pits": { ...back, position: other } };
    await act(() => r.update(<BoardScreen game="shell-pits" />));
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(text(r)).not.toContain("Looking back over the game…");
    expect(text(r)).not.toContain("A better sow");
    expect(text(r)).not.toContain("No single turning point");
    expect(button(r, "See the best move")).toBeDefined();
    await act(() => r.unmount());
  });
  it("P2-2 on screen: the Fishing Nets look-back names only the box the rope closes, with no play instructions", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let position = nets.create(0, 3, 0);
    for (const m of [5, 9, 13, 17, 1, 10, 19, 14, 0, 16, 6, 11, 18, 22, 4, 23, 20, 7, 15, 8, 2, 3, 12, 21]) position = nets.move(position, m);
    const s: BoardSession = { ...createSession("fishing-nets", { seed: 0, size: 3, strength: "challenge", starter: 0, names: ["You", "Ray"] }), position, taught: true };
    fixture.store.save.board = { "fishing-nets": s };
    let r!: ReactTestRenderer;
    await act(() => {
      r = create(<BoardScreen game="fishing-nets" />);
    });
    await act(async () => {
      button(r, "See the best move").props.onPress();
      await Promise.resolve();
    });
    // The exact check runs in slices.
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(text(r)).toContain("A box was waiting");
    expect(text(r)).toContain("Tying B2 to C2 would have closed B1 and kept your turn.");
    expect(text(r)).not.toContain("Tap a dot, then its neighbor");
    await act(() => r.unmount());
  });
});
