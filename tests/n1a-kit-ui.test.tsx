import React from "react";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Bridge } from "../src/math/kit/ui/Bridge";
import { NumberPad } from "../src/math/kit/ui/NumberPad";
import { TenFrame } from "../src/math/kit/ui/TenFrame";
import { Blocks } from "../src/math/kit/ui/Blocks";

vi.mock("react-native", () => ({ View: "div", Pressable: "pressable", Animated: { View: "div", createAnimatedComponent: (c: unknown) => c, Value: class { setValue() {} } }, Platform: { OS: "ios" }, StyleSheet: { create: (s: unknown) => s, flatten: (s: unknown) => s }, useWindowDimensions: () => ({ fontScale: 1 }) }));
vi.mock("react-native-svg", () => ({ default: "svg", Circle: "circle", Rect: "rect", Path: "path", G: "g", Line: "line", Text: "svgtext" }));
vi.mock("../src/components/Text", () => ({ Text: "span" }));
vi.mock("../src/components/ui", () => ({ PressableScale: "button", C: { ink: "#183F39", muted: "#64716C", paper: "#FFF", line: "#DBE3DA", teal: "#246858", soft: "#E5EFE5", coral: "#C56D50", error: "#9C432D" } }));

let root: ReactTestRenderer | undefined;
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; });
const text = (n: ReactTestInstance): string => n.children.map((c) => (typeof c === "string" ? c : text(c))).join("");
const mount = async (el: React.ReactElement) => { await act(async () => { root = create(el); }); };
const keys = () => root!.root.findAll((n) => (n.type as string) === "button" && typeof n.props.onPress === "function");
const key = (label: string) => keys().find((k) => k.props.accessibilityLabel === label)!;
const tap = async (label: string) => act(async () => { key(label).props.onPress(); });

describe("Bridge", () => {
  const labels = () => root!.root.findAll((n) => (n.type as string) === "svgtext").map(text);
  it("draws only the hops that have been made, so the line never shows an answer early", async () => {
    await mount(<Bridge width={320} start={9} hops={[10, 13]} ten={10} lo={0} hi={20} made={0} />);
    expect(root!.root.findAll((n) => (n.type as string) === "path")).toHaveLength(0);
    expect(labels()).not.toContain("13");
    expect(labels()).toContain("9");
    await act(async () => root!.update(<Bridge width={320} start={9} hops={[10, 13]} ten={10} lo={0} hi={20} made={1} />));
    expect(labels()).toContain("10");
    expect(labels()).not.toContain("13");
    expect(root!.root.findAll((n) => (n.type as string) === "path")).toHaveLength(2);
    await act(async () => root!.update(<Bridge width={320} start={9} hops={[10, 13]} ten={10} lo={0} hi={20} made={2} />));
    expect(labels()).toContain("13");
    expect(root!.root.findAll((n) => (n.type as string) === "path")).toHaveLength(4);
  });
});

describe("NumberPad", () => {
  it("types digits, deletes, and submits the whole number once, then clears", async () => {
    const submit = vi.fn();
    await mount(<NumberPad resetKey="a" width={340} onSubmit={submit} />);
    expect(key("Check my answer").props.disabled).toBe(true);
    await tap("4"); await tap("7");
    expect(text(root!.root)).toContain("47");
    await tap("Delete"); expect(text(root!.root)).not.toContain("47");
    await tap("2"); await tap("Check my answer");
    expect(submit).toHaveBeenCalledExactlyOnceWith(42);
    expect(key("Check my answer").props.disabled).toBe(true);
  });
  it("stops at its digit limit, ignores a leading zero, and the zero key still types a zero", async () => {
    const submit = vi.fn();
    await mount(<NumberPad resetKey="a" width={340} maxDigits={2} onSubmit={submit} />);
    await tap("0"); await tap("5"); await tap("9"); await tap("8");
    await tap("Check my answer");
    expect(submit).toHaveBeenCalledWith(59);
  });
  it("clears for a new step, prefills for the last stage of help, and a disabled pad does nothing", async () => {
    const submit = vi.fn();
    await mount(<NumberPad resetKey="a" width={340} onSubmit={submit} />);
    await tap("7");
    await act(async () => root!.update(<NumberPad resetKey="b" width={340} onSubmit={submit} />));
    expect(key("Check my answer").props.disabled).toBe(true);
    await act(async () => root!.update(<NumberPad resetKey="c" width={340} prefill={13} onSubmit={submit} />));
    await tap("Check my answer");
    expect(submit).toHaveBeenCalledWith(13);
    await act(async () => root!.update(<NumberPad resetKey="d" width={340} disabled onSubmit={submit} />));
    expect(keys().every((k) => k.props.disabled)).toBe(true);
  });
  it("keeps every key at least 44 points high, even on a narrow phone", async () => {
    await mount(<NumberPad resetKey="a" width={320} onSubmit={() => {}} />);
    for (const k of keys()) expect(Number((k.props.style as { minHeight: number }).minHeight)).toBeGreaterThanOrEqual(44);
  });
});

describe("TenFrame and Blocks", () => {
  it("counts shells in order: first group, second group, then the ones still waiting", async () => {
    await mount(<TenFrame cell={30} filled={3} second={2} ghost={1} label="frame" />);
    expect(root!.root.findAll((n) => (n.type as string) === "svg")).toHaveLength(6);
  });
  it("only makes shells touchable when asked, each with its own label", async () => {
    const pick = vi.fn();
    await mount(<TenFrame cell={30} filled={5} label="frame" onPick={pick} pickLabel={(k) => `Take ${k}`} />);
    const buttons = root!.root.findAll((n) => (n.type as string) === "pressable");
    expect(buttons).toHaveLength(5);
    await act(async () => buttons[2].props.onPress());
    expect(pick).toHaveBeenCalledWith(3);
    expect(buttons[0].props.accessibilityLabel).toBe("Take 1");
    await act(async () => root!.update(<TenFrame cell={30} filled={5} struck={2} label="frame" onPick={pick} />));
    expect(root!.root.findAll((n) => (n.type as string) === "pressable")).toHaveLength(3);
  });
  it("blocks name the count, and a trade is touchable only when offered", async () => {
    await mount(<Blocks unit={12} tens={3} ones={15} label="3 tens and 15 ones" />);
    expect(root!.root.findAll((n) => (n.type as string) === "pressable")).toHaveLength(0);
    await act(async () => root!.update(<Blocks unit={12} tens={3} ones={15} label="x" onTradeMake={() => {}} />));
    expect(root!.root.findAll((n) => (n.type as string) === "pressable").map((n) => n.props.accessibilityLabel)).toEqual(["Make a ten"]);
  });
});
