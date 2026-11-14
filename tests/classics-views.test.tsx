import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { TicForkBoard } from "../src/screens/classics/TicForkBoard";
import { MemoryDareBoard } from "../src/screens/classics/MemoryDareBoard";
import { CheckersTacticsBoard } from "../src/screens/classics/CheckersTacticsBoard";
import { wordWidth } from "../src/components/wordFit";
import { chamoruWords } from "../src/learn/content/chamoru";
import { MemoryCards } from "../src/screens/classics/MemoryCards";
import { ticForkDescriptors, ticForkEngine } from "../src/games/classics/ticForks";
import { checkersTacticsDescriptors, checkersTacticsEngine } from "../src/games/classics/checkersTactics";
import { memoryDareDescriptors, memoryDareEngine } from "../src/games/classics/memoryDares";
vi.mock("react-native", () => ({
  View: "div", useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 3.1 }),
  Animated: { View: "div", Value: class { interpolate() { return 0; } }, timing: () => ({ start() {}, stop() {} }) },
}));
vi.mock("../src/components/ui", () => ({ Button: "button", Copy: "p", C: { ink: "#123", teal: "#156", paper: "#fff", line: "#888" } }));
vi.mock("../src/components/Text", () => ({ Text: "span" }));
vi.mock("../src/components/Art", () => ({ TicMark: "mark", Symbol: "picture" }));
vi.mock("../src/learn/games/hafa-adai/pictures", () => ({ WordPicture: "picture" }));
vi.mock("../src/components/motion", () => ({ useReducedMotion: () => true, easeOut: undefined, nativeDriver: false }));
vi.mock("../src/screens/classics/shared", () => ({
  coords: (i: number) => `${String.fromCharCode(65 + i % 8)}${8 - Math.floor(i / 8)}`,
  Cell: ({ label, ...props }: { label: string }) => React.createElement("button", { ...props, accessibilityLabel: label }),
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const words = (n: ReactTestRenderer["root"] | string): string => typeof n === "string" ? n : n.children.map(words).join("");
const button = (r: ReactTestRenderer, label: string) => r.root.find(n => n.type === "button" && (n.props.accessibilityLabel === label || words(n) === label));
const options = { supportOff: false, ownRead: false };
describe("Classics native view controls", () => {
  it("Tic retains a failed selected square and checks the new fork", async () => {
    const d = ticForkDescriptors[0]; let s = ticForkEngine.create(d, { version: 1 }, options), r!: ReactTestRenderer;
    const dispatch = (a: Parameters<typeof ticForkEngine.step>[1]) => { s = ticForkEngine.step(s, a, d)!.state; r.update(render()); };
    const render = () => <TicForkBoard state={s} dispatch={dispatch} active width={320}/>;
    await act(() => { r = create(render()); });
    await act(() => button(r, "Square 4, empty").props.onPress());
    await act(() => button(r, "Check your fork").props.onPress());
    expect(words(r.root)).toContain("Your choice stays here");
    expect(button(r, "Square 4, empty, selected").props.selected).toBe(true);
    await act(() => button(r, "Square 7, empty").props.onPress());
    await act(() => button(r, "Check your fork").props.onPress());
    expect(words(r.root)).toContain("A fork!");
    await act(() => r.unmount());
  });
  it("Memory preview has no deadline, supports skip, and reading faces can grow at largest text", async () => {
    const d = memoryDareDescriptors[6]; let s = memoryDareEngine.create(d, { version: 1 }, options), r!: ReactTestRenderer;
    const dispatch = (a: Parameters<typeof memoryDareEngine.step>[1]) => { s = memoryDareEngine.step(s, a, d)!.state; r.update(render()); };
    const render = () => <MemoryDareBoard state={s} dispatch={dispatch} active width={320}/>;
    await act(() => { r = create(render()); });
    expect(button(r, "Play without preview")).toBeTruthy();
    await act(() => button(r, "Preview this deal").props.onPress());
    expect(words(r.root)).toContain("as long as you like");
    expect(button(r, "Hide cards and play")).toBeTruthy();
    const cards = r.root.findAll(n => n.type === "button" && /^Card /.test(n.props.accessibilityLabel ?? ""));
    expect(cards).toHaveLength(12);
    expect(cards[0].props.style.height).toBeUndefined();
    expect(cards[0].props.style.minHeight).toBeGreaterThan(100);
    await act(() => button(r, "Hide cards and play").props.onPress());
    expect(words(r.root)).toContain("Turns used: 0");
    expect(cards[0].props.accessibilityLabel).toContain("face down");
    await act(() => r.unmount());
  });
  it("Checkers taps every hop of a chain before dispatching the complete turn", async () => {
    const d: (typeof checkersTacticsDescriptors)[number] = { version: 1, pieces: [[17,1],[26,-1],[44,-1]], turn: 1, title: "Chain control fixture" }, state = checkersTacticsEngine.create(d, { version: 1 }, options), dispatch = vi.fn(); let r!: ReactTestRenderer;
    await act(() => { r = create(<CheckersTacticsBoard state={state} dispatch={dispatch} active width={320} sessionKey="capture-session"/>); });
    expect(words(r.root)).toContain("ABCDEFGH");
    await act(() => button(r, "B6, red piece").props.onPress());
    await act(() => button(r, "D4, empty, legal destination").props.onPress());
    expect(dispatch).not.toHaveBeenCalled();
    // Rotation/parent updates replay the same accepted session into a fresh state object.
    await act(() => r.update(<CheckersTacticsBoard state={structuredClone(state)} dispatch={dispatch} active width={520} sessionKey="capture-session"/>));
    await act(() => button(r, "F2, empty, legal destination").props.onPress());
    expect(dispatch).toHaveBeenCalledWith(["m", 17, [35, 53]]);
    await act(() => button(r, "B6, red piece").props.onPress());
    await act(() => button(r, "D4, empty, legal destination").props.onPress());
    const reset = checkersTacticsEngine.step(state, ["z"], d)!.state;
    await act(() => r.update(<CheckersTacticsBoard state={reset} dispatch={dispatch} active width={520} sessionKey="capture-session"/>));
    expect(r.root.findAll(n => n.type === "button" && n.props.accessibilityLabel === "F2, empty, legal destination")).toHaveLength(0);
    await act(() => button(r, "B6, red piece").props.onPress());
    await act(() => button(r, "D4, empty, legal destination").props.onPress());
    await act(() => r.update(<CheckersTacticsBoard state={structuredClone(reset)} dispatch={dispatch} active width={520} sessionKey="another-session"/>));
    expect(r.root.findAll(n => n.type === "button" && n.props.accessibilityLabel === "F2, empty, legal destination")).toHaveLength(0);
    await act(() => r.unmount());
  });
  it("face-down cross-modal cards do not expose their hidden words", async () => {
    let r!: ReactTestRenderer;
    await act(() => { r = create(<MemoryCards cards={["en:shell:picture", "en:shell:word"]} pack="words" matched={[]} open={[]} width={320} disabled={false} onFlip={() => {}}/>); });
    expect(words(r.root)).not.toContain("shell");
    const labels = r.root.findAll(n => n.type === "button").map(n => n.props.accessibilityLabel);
    expect(labels).toEqual(["Card 1, face down", "Card 2, face down"]);
    await act(() => r.unmount());
  });
  it("retries a wrong Checkers capture without taking help", async () => {
    const d = checkersTacticsDescriptors[11]; let s = checkersTacticsEngine.create(d, { version: 1 }, options), r!: ReactTestRenderer;
    const events: string[] = [];
    const dispatch = (a: Parameters<typeof checkersTacticsEngine.step>[1]) => { const next = checkersTacticsEngine.step(s, a, d)!; events.push(next.event!); s = next.state; r.update(render()); };
    const render = () => <CheckersTacticsBoard state={s} dispatch={dispatch} active width={320} sessionKey="retry"/>;
    s = checkersTacticsEngine.step(s, ["m", 8, [26, 40]], d)!.state;
    await act(() => { r = create(render()); });
    expect(words(r.root)).toContain("Start again and try a different route");
    await act(() => button(r, "Start again").props.onPress());
    expect(s.tried).toBe(false);
    expect(s.hint).toBeNull();
    expect(s.position).toEqual(checkersTacticsEngine.create(d, { version: 1 }, options).position);
    await act(() => button(r, "E5, red king").props.onPress());
    await act(() => button(r, "C3, empty, legal destination").props.onPress());
    await act(() => button(r, "A5, empty, legal destination").props.onPress());
    await act(() => button(r, "C7, empty, legal destination").props.onPress());
    expect(s.correct).toBe(true);
    expect(events).toEqual(["reset", "check"]);
    await act(() => r.unmount());
  });
  it("offers Memory Start again and keeps spent reveals", async () => {
    const d = memoryDareDescriptors[7]; let s = memoryDareEngine.create(d, { version: 1 }, options), r!: ReactTestRenderer;
    const dispatch = (a: Parameters<typeof memoryDareEngine.step>[1]) => { s = memoryDareEngine.step(s, a, d)!.state; r.update(render()); };
    const render = () => <MemoryDareBoard state={s} dispatch={dispatch} active width={320}/>;
    await act(() => { r = create(render()); });
    await act(() => button(r, "Card 1, face down").props.onPress());
    expect(s.spent).toBe(1);
    await act(() => button(r, "Start again").props.onPress());
    expect(s.spent).toBe(1);
    expect(s.round.open).toEqual([]);
    expect(button(r, "Card 1, face down").props.disabled).toBe(false);
    await act(() => r.unmount());
  });
  it("keeps every reading-card word intact at maximum text size", async () => {
    let r!: ReactTestRenderer;
    const cards = [...chamoruWords.map(w => `ch:${w.id}:word`), "en:shell:word"];
    await act(() => { r = create(<MemoryCards cards={cards} pack="chamoru" matched={[]} open={[]} peek width={680} disabled={false} onFlip={() => {}}/>); });
    const faces = r.root.findAll(n => n.type === "span" && typeof n.children[0] === "string");
    expect(faces.length).toBeGreaterThan(20);
    for (const face of faces) {
      const text = words(face), size = face.props.style.fontSize;
      const scale = Math.min(3.1, face.props.maxFontSizeMultiplier ?? 3.1);
      const longest = Math.max(...text.split(/\s+/).map(wordWidth));
      expect(longest * size * scale, text).toBeLessThanOrEqual(128);
    }
    await act(() => r.unmount());
  });

});
