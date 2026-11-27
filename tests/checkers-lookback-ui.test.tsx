import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { checkersMove, checkersMoves, createCheckers } from "../src/games/checkers";
import { defaultOptions } from "../src/games/types";
import { CheckersBoard } from "../src/screens/classics/CheckersBoard";

vi.mock("react-native", () => ({
  View: "div",
  Platform: { OS: "ios" },
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1, absoluteFill: {} },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
}));
vi.mock("react-native-svg", () => ({ default: "svg", Circle: "circle", Line: "line", Rect: "rect", Path: "path" }));
vi.mock("../src/components/ui", () => ({
  C: { ink: "#000", teal: "#0aa", sand: "#eee", paper: "#fff", muted: "#666", gold: "#c90" },
  Button: "button",
  Copy: "p",
  Heading: "h2",
  Controls: "div",
  PressableScale: "button",
  Status: ({ title, detail }: { title: string; detail?: string }) => <p>{`${title} | ${detail ?? ""}`}</p>,
}));
vi.mock("../src/components/Text", () => ({ Text: "span" }));
vi.mock("../src/components/Match", () => ({ Scoreboard: () => null }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Node = ReturnType<ReactTestRenderer["toJSON"]>;
const flat = (n: Node | string | Node[] | null): string =>
  n === null ? "" : typeof n === "string" ? n : Array.isArray(n) ? n.map(flat).join("") : (n.children ?? []).map((c) => flat(c as Node | string)).join("");
type Instance = ReactTestRenderer["root"];
const words = (n: Instance | string): string => (typeof n === "string" ? n : n.children.map(words).join(""));

describe("Checkers look-back on screen", () => {
  it("labels the earlier board as the past and points at it correctly", async () => {
    let s = createCheckers({ ...defaultOptions, difficulty: "hard" });
    for (let i = 0; i < 400 && !s.position.outcome; i++) s = checkersMove(s, checkersMoves(s.position, "classic")[0]);
    expect(s.position.outcome).not.toBeNull();
    let r!: ReactTestRenderer;
    await act(() => {
      r = create(<CheckersBoard state={s} commit={() => {}} width={360} sound={() => {}} help active />);
    });
    const press = r.root.find((n) => n.type === "button" && words(n) === "See the best move");
    await act(() => press.props.onPress());
    const text = flat(r.toJSON());
    expect(text).toContain("Looking back: the board before that move");
    expect(text).toContain("The game is still over.");
    expect(text).toContain("The board above shows that moment.");
    expect(text).not.toContain("board below");
    await act(() => r.unmount());
  });
});
