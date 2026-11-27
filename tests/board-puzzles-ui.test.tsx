import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";







import { BoardScreen } from "../src/board/Screen";
import { TacticsBoard } from "../src/board/coconut-drop/TacticsBoard";
import { ChainsBoard } from "../src/board/fishing-nets/ChainsBoard";
import { ScenarioBoard } from "../src/board/hidden-canoes/ScenarioBoard";
import { coconutPuzzles, coconutTacticsEngine, type Action as CA, type State as CS } from "../src/board/coconut-drop/challenge";
import { answers, positionOf } from "../src/board/coconut-drop/tactics";
import { netsChainsEngine, netsPuzzles, type Action as NA, type State as NS } from "../src/board/fishing-nets/challenge";
import { canoesPuzzles, canoesScenarioEngine, type Action as HA, type State as HS } from "../src/board/hidden-canoes/challenge";
import { factsFor } from "../src/board/hidden-canoes/scenarios";
import * as coconutEngine from "../src/board/coconut-drop/engine";
import * as nets from "../src/board/fishing-nets/engine";
import { createSession, type BoardSession } from "../src/board";
import { registration as coconutRegistration } from "../src/challenge/registrations/drop-puzzles";
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
const labelled = (r: ReactTestRenderer, label: string) => r.root.find((n) => n.type === "button" && n.props.accessibilityLabel === label);
const opts = { supportOff: false, ownRead: false };
/** A board under a real replay engine: every dispatch runs the engine's step. */
function host<S, A>(Board: React.ComponentType<{ state: S; dispatch: (a: A) => void; active: boolean; width: number }>, engine: { step: (s: S, a: A, d: never) => { state: S } | null }, start: S, d: unknown) {
  let state = start,
    r!: ReactTestRenderer;
  const dispatch = (a: A) => {
    const next = engine.step(state, a, d as never);
    if (next) state = next.state;
    r.update(<Board state={state} dispatch={dispatch} active width={390} />);
  };
  r = create(<Board state={state} dispatch={dispatch} active width={390} />);
  return r;
}

describe("board puzzles on screen", () => {
  it("each board's setup links its Challenge puzzles", async () => {
    for (const [game, label, id] of [
      ["coconut-drop", "Puzzles · win, block and fork", "drop-puzzles"],
      ["fishing-nets", "Chain endings · keep control of the nets", "fishing-nets"],
      ["hidden-canoes", "Chart puzzles · find canoes by thinking", "hidden-canoes"],
    ] as const) {
      let r!: ReactTestRenderer;
      await act(() => {
        r = create(<BoardScreen game={game} />);
      });
      await act(() => button(r, label).props.onPress());
      expect(fixture.push).toHaveBeenLastCalledWith({ pathname: "/challenge", params: { game: id } });
      await act(() => r.unmount());
    }
  });
  it("Coconut Drop: the goal, Help's column, a solve, and a lost try that names Ray's drop", async () => {
    const block = coconutPuzzles.find((p) => p.descriptor.kind === "block")!.descriptor;
    let r!: ReactTestRenderer;
    await act(() => {
      r = host<CS, CA>(TacticsBoard, coconutTacticsEngine as never, coconutTacticsEngine.create(block, { version: 1 }, opts), block);
    });
    expect(text(r)).toContain("You are the brown circle coconuts. Ray could finish four next turn. Drop one coconut to stop it.");
    const answer = answers(block)[0],
      wrong = coconutEngine.legal(positionOf(block)).find((c) => c !== answer)!;
    await act(() => labelled(r, `Drop in column ${wrong + 1}`).props.onPress());
    expect(text(r)).toContain(`Ray finished four in column ${answer + 1}. Undo a drop or start again.`);
    await act(() => button(r, "Undo a drop").props.onPress());
    await act(() => labelled(r, `Drop in column ${answer + 1}`).props.onPress());
    expect(text(r)).toContain(`You blocked Ray's four in column ${answer + 1}!`);
    await act(() => r.unmount());
    const fork = coconutPuzzles.find((p) => p.descriptor.kind === "fork")!.descriptor;
    await act(() => {
      r = host<CS, CA>(TacticsBoard, coconutTacticsEngine as never, coconutTacticsEngine.create(fork, { version: 1 }, opts), fork);
    });
    expect(text(r)).toContain("Your drops: 0 · Fewest that win: 2");
    await act(() => labelled(r, `Drop in column ${answers(fork)[0] + 1}`).props.onPress());
    expect(text(r)).toMatch(/Ray dropped in column \d\. Your turn\./);
    // Ray's coconut is ringed and the legend says who is who.
    expect(r.root.findAll((n) => n.props.style?.borderColor === "#9A641A" && n.props.style?.borderWidth === 3).length).toBe(1);
    expect(text(r)).toContain("You: brown circle coconuts · Ray: teal leaf coconuts · Ray's last drop has a ring");
    await act(() => r.unmount());
  });
  it("Fishing Nets: the goal, then Help shows the gold rope and the idea", async () => {
    const d = netsPuzzles[0].descriptor;
    let r!: ReactTestRenderer;
    await act(() => {
      r = host<NS, NA>(ChainsBoard, netsChainsEngine as never, netsChainsEngine.create(d, { version: 1 }, opts), d);
    });
    expect(text(r)).toContain("Win from here: finish with more boxes than Ray.");
    expect(text(r)).not.toContain("The idea:");
    let s = netsChainsEngine.create(d, { version: 1 }, opts);
    s = netsChainsEngine.step(s, ["h"], d)!.state;
    await act(() => r.update(<ChainsBoard state={s} dispatch={() => {}} active width={390} />));
    expect(text(r)).toContain("Help suggests the gold rope.");
    expect(text(r)).toContain("The idea: Don't take the last two boxes of this chain.");
    while (s.position.outcome === null) s = netsChainsEngine.step(netsChainsEngine.step(s, ["h"], d)!.state, ["r", netsChainsEngine.step(s, ["h"], d)!.state.hint!], d)!.state;
    await act(() => r.update(<ChainsBoard state={s} dispatch={() => {}} active width={390} />));
    expect(text(r)).toMatch(/You won the ending, \d+ boxes to \d+!/);
    await act(() => r.unmount());
  });
  it("Hidden Canoes: the question, a wrong tap explained from the chart, then the answer", async () => {
    const d = canoesPuzzles[0].descriptor,
      [answer] = factsFor(d).answers,
      wrong = d.chart.findIndex((v, i) => !v && i !== answer);
    let r!: ReactTestRenderer;
    await act(() => {
      r = host<HS, HA>(ScenarioBoard, canoesScenarioEngine as never, canoesScenarioEngine.create(d, { version: 1 }, opts), d);
    });
    expect(text(r)).toContain("Find the space that must hold a canoe.");
    expect(text(r)).toContain("Canoes: one 3 long, two 2 long.");
    const col = (i: number) => `${"ABCDEF"[i % 6]}${Math.floor(i / 6) + 1}`;
    await act(() => labelled(r, `${col(wrong)}, not searched`).props.onPress());
    expect(text(r)).toContain(`${col(wrong)} might be open water`);
    await act(() => labelled(r, `${col(answer)}, not searched`).props.onPress());
    expect(text(r)).toContain(`You worked it out! ${col(answer)} must hold a canoe: there's no way to fit the canoes without it.`);
    await act(() => r.unmount());
  });
  it("native QA fixes: the question shows once, a box-taking miss says why, one net is singular, praise fits the puzzle", async () => {
    const d = canoesPuzzles[0].descriptor;
    let r!: ReactTestRenderer;
    await act(() => {
      r = host<HS, HA>(ScenarioBoard, canoesScenarioEngine as never, canoesScenarioEngine.create(d, { version: 1 }, opts), d);
    });
    expect(text(r).split("Find the space that must hold a canoe.").length - 1).toBe(1);
    await act(() => r.unmount());
    // Chain 2: taking the box on offer keeps the turn but loses the ending.
    const n = netsPuzzles[1].descriptor;
    let s = netsChainsEngine.create(n, { version: 1 }, opts);
    const take = nets.scoring(s.position)[0];
    s = netsChainsEngine.step(s, ["r", take], n)!.state;
    expect(s.missed).toBe(true);
    expect(s.line.at(-1)!.replies).toEqual([]);
    await act(() => {
      r = create(<ChainsBoard state={s} dispatch={() => {}} active width={390} />);
    });
    expect(text(r)).toContain("Taking that box lets Ray win, whatever you tie next.");
    expect(text(r)).toContain("Ray ■ teal ropes: 1 box");
    await act(() => r.unmount());
    const praise = (kind: string) => {
      const p = coconutPuzzles.find((x) => x.descriptor.kind === kind)!;
      return coconutRegistration.completionText!(p.ref, { event: "independent", awards: 1, dares: [], cost: 1, solution: null }, { helpUsed: false, failed: false });
    };
    expect([praise("win"), praise("block"), praise("fork")]).toEqual(["You found the winning drop.", "You stopped Ray's four.", "You made two fours at once."]);
  });
  it("Fishing Nets Help shows the idea only beside the rope it is about", async () => {
    // Chain 5 starts with a box to close; the pair comes later in the line.
    const d = netsPuzzles[4].descriptor;
    let s = netsChainsEngine.step(netsChainsEngine.create(d, { version: 1 }, opts), ["h"], d)!.state;
    expect(nets.move(s.position, s.hint!).turn).toBe(0);
    let r!: ReactTestRenderer;
    await act(() => {
      r = create(<ChainsBoard state={s} dispatch={() => {}} active width={390} />);
    });
    expect(text(r)).toContain("Help suggests the gold rope. It closes a box, so you get another turn.");
    expect(text(r)).not.toContain("The idea:");
    // Follow Help until it points at a rope that passes the turn: the idea's rope.
    while (nets.move(s.position, s.hint!).turn === 0) s = netsChainsEngine.step(netsChainsEngine.step(s, ["r", s.hint!], d)!.state, ["h"], d)!.state;
    await act(() => r.update(<ChainsBoard state={s} dispatch={() => {}} active width={390} />));
    expect(text(r)).toContain("The idea: Every rope gives Ray something.");
    await act(() => r.unmount());
  });
  it("after a different winning route, Help's idea describes the board in front of the child (review P2-1)", async () => {
    // Chain 6 teaches the middle-rope pair on its best line. Ropes 14 then 12 still win, but reach a board where the
    // right rope (9) leaves two boxes instead, so the middle-rope advice would be false here.
    const d = netsPuzzles[5].descriptor;
    let s = netsChainsEngine.create(d, { version: 1 }, opts);
    for (const rope of [14, 12]) {
      s = netsChainsEngine.step(s, ["r", rope], d)!.state;
      expect(s.missed).toBe(false);
    }
    s = netsChainsEngine.step(s, ["h"], d)!.state;
    expect(s.hint).toBe(9);
    let r!: ReactTestRenderer;
    await act(() => {
      r = create(<ChainsBoard state={s} dispatch={() => {}} active width={390} />);
    });
    expect(text(r)).not.toContain("Give Ray two boxes by tying the rope between them");
    expect(text(r)).toContain("The idea: Don't take the last two boxes of this chain.");
    await act(() => r.unmount());
  });
  it("a Hidden Canoes round against the computer has no pass-the-device screen; two players still do", async () => {
    const solo: BoardSession = { ...createSession("hidden-canoes", { seed: 4, strength: "challenge", starter: 0, names: ["You", "Ray"] }), taught: true };
    fixture.store.save.board = { "hidden-canoes": solo };
    let r!: ReactTestRenderer;
    await act(() => {
      r = create(<BoardScreen game="hidden-canoes" />);
    });
    expect(text(r)).not.toContain("Keep the lagoon private");
    expect(text(r)).not.toContain("Pass to You");
    expect(text(r)).toContain("Search the other lagoon");
    await act(() => r.unmount());
    const together: BoardSession = { ...createSession("hidden-canoes", { seed: 4, mode: "together", starter: 0, names: ["Ana", "Leo"] }), taught: true };
    fixture.store.save.board = { "hidden-canoes": together };
    await act(() => {
      r = create(<BoardScreen game="hidden-canoes" />);
    });
    expect(text(r)).toContain("Keep the lagoon private");
    expect(text(r)).toContain("Pass to Ana");
    await act(() => r.unmount());
    fixture.store.save.board = {};
  });
});
