import React from "react";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { SettledCargo } from "../src/arcade/games/canoe-cargo/View";
import { ROWS } from "../src/arcade/games/canoe-cargo/engine";
import { CargoTile } from "../src/arcade/games/canoe-cargo/Art";
import { illustrated, cargoArtFrame } from "../src/arcade/games/canoe-cargo/illustrated";
vi.mock("react-native", () => ({ Image: "Image", View: "View", Text: "Text", StyleSheet: { absoluteFill: {}, create: (s: unknown) => s }, Platform: { OS: "web" }, Pressable: "Pressable" }));
vi.mock("react-native-svg", () => ({ default: "Svg", Circle: "Circle", Defs: "Defs", Ellipse: "Ellipse", G: "G", LinearGradient: "LinearGradient", Path: "Path", Rect: "Rect", Stop: "Stop", Text: "SvgText" }));
const hashes = { crate: "f4d1334d348aaa905e8b2255ebdb9042b01a41033eae16a301829ddaeed96920", coconut: "3a6742edddc2c3960ec0becf761fc1d3170e68477be8256adbd6632028fc2883", fish: "e5161df9e6c4cebe250438bfd69b8c0710376b5a62959e761a97f38595906a1f", taro: "b8db1868817a8c9f0152928edfcd3c808f2a1eb43d1f84957e9bd47a4a8fc654" };
for (const kind of Object.keys(hashes) as (keyof typeof hashes)[]) {
  it(`${kind} preserves verified pixels, lazy source and padded uniform framing`, () => {
    const art = illustrated[kind], path = `assets/arcade/canoe-cargo/${kind}.webp`;
    expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(hashes[kind]);
    expect(art.source()).toBe(path);
    expect(art.pixels).toEqual([320, 320]);
    // ImageMagick is optional on CI; the immutable hash also guards every alpha pixel.
    if (spawnSync("magick", ["-version"]).status === 0) {
      const geometry = execFileSync("magick", [path, "-alpha", "extract", "-threshold", "0", "-format", "%@", "info:"], { encoding: "utf8" });
      const [w, h, x, y] = geometry.match(/\d+/g)!.map(Number);
      expect(art.ink).toEqual([x, y, w, h]);
    }
    for (const size of [12, 18, 32, 43]) {
      const f = cargoArtFrame(art, size);
      expect(f.width / f.height).toBe(1);
      expect(f.left).toBeGreaterThan(0);
      expect(f.left + f.width).toBeLessThan(size);
    }
    expect(readFileSync("src/arcade/games/canoe-cargo/illustrated.ts", "utf8")).toContain(`source: () => require("../../../../assets/arcade/canoe-cargo/${kind}.webp")`);
  });
  it(`${kind} renders number and locked cues without altering image framing`, async () => {
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(<CargoTile kind={kind} size={32} value={9} stuck/>); });
    const image = tree.root.findByType("Image" as never);
    expect(image.props.resizeMode).toBe("contain"); expect(image.props.fadeDuration).toBe(0);
    expect(image.props.style).toEqual(cargoArtFrame(illustrated[kind], 32));
    expect(tree.root.findByType("SvgText" as never).children).toEqual(["9"]);
    expect(tree.root.findByProps({ testID: "cargo-stuck" })).toBeTruthy();
    await act(async () => tree.update(<CargoTile kind={kind} size={18}/>));
    expect(tree.root.findByType("Image" as never).props.style).toEqual(cargoArtFrame(illustrated[kind], 18));
    expect(tree.root.findAllByType("SvgText" as never)).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "cargo-stuck" })).toHaveLength(0);
    await act(async () => tree.unmount());
  });
}
it("keeps settle on the UI thread, suppresses displacement under Reduce Motion, and uses ordered worklets", () => {
  const source = readFileSync("src/arcade/games/canoe-cargo/View.tsx", "utf8");
  expect(source).toContain("if (event && !reduced)");

  expect(source).toContain("useAnimatedStyle");
  expect(source).not.toContain("transform: `");
  // No explicit top-level worklets are introduced; the shared AST suite checks capture order.
  expect(source).not.toContain('"worklet"');
});

const animation = vi.hoisted(() => ({ value: 1.5, timing: vi.fn(), set: vi.fn() }));
vi.mock("react-native-reanimated", () => ({
  default: { View: "AnimatedView" },
  useSharedValue: () => ({ get value() { return animation.value; }, set: animation.set }),
  useAnimatedStyle: (callback: () => unknown) => callback(),
  withTiming: animation.timing, withSequence: vi.fn(),
  Easing: { out: () => undefined, quad: undefined },
}));
vi.mock("../src/islander/Companion", () => ({ Companion: "Companion" }));
vi.mock("react-native-gesture-handler", () => ({ GestureDetector: "GestureDetector" }));
vi.mock("../src/components/Text", () => ({ Text: "Text" }));
vi.mock("../src/components/motion", () => ({ useReducedMotion: () => false }));
vi.mock("../src/arcade/Input", () => ({ PressControl: "PressControl", uiThreadDrag: vi.fn() }));
vi.mock("../src/arcade/Sprite", () => ({ ArcadeSprite: "ArcadeSprite" }));
vi.mock("../src/arcade/loop", () => ({ useArcadeLoop: vi.fn() }));
vi.mock("../src/arcade/games/canoe-cargo/Touch", () => ({ CargoTouch: "CargoTouch" }));

it("keeps SVG digits within their pill and lock bounds separate at every tile size", async () => {
  for (let size = 12; size <= 43; size++) {
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(<CargoTile kind="crate" size={size} value={2} stuck/>); });
    const number = tree.root.findByProps({ testID: "cargo-number" }).props;
    const lock = tree.root.findByProps({ testID: "cargo-stuck" }).props.style;
    const digit = tree.root.findByType("SvgText" as never).props;
    expect(number.viewBox).toBe("0 0 60 56");
    expect(digit.y).toBeLessThan(54);
    expect(digit.y - digit.fontSize).toBeGreaterThanOrEqual(0);
    // Their vertical bounding boxes have a positive gap; independent of OS font scale.
    expect(number.style.top + number.height).toBeLessThan(size - lock.bottom - lock.height);
    expect(number.style.left + number.width).toBeLessThanOrEqual(size);
    await act(async () => tree.unmount());
  }
});

it("suppresses settle scheduling and displacement even with a nonzero shared value", async () => {
  let tree!: ReturnType<typeof create>;
  animation.timing.mockClear();
  await act(async () => { tree = create(<SettledCargo board={[]} cell={32} learning event={1} reduced/>); });
  expect(animation.timing).not.toHaveBeenCalled();
  expect(tree.root.findByType("AnimatedView" as never).props.style[1].transform).toEqual([{ translateY: 0 }, { scaleY: 1 }]);
  await act(async () => tree.update(<SettledCargo board={[]} cell={32} learning event={2} reduced={false}/>));
  expect(animation.timing).toHaveBeenCalledTimes(2);
  const transform = tree.root.findByType("AnimatedView" as never).props.style[1].transform;
  expect(transform[1].scaleY).toBeLessThan(1);
  // The compensating translation keeps the bottom of the board anchored.
  expect(transform[0].translateY + ROWS * 32 / 2 * transform[1].scaleY).toBeCloseTo(ROWS * 32 / 2);
  await act(async () => tree.update(<SettledCargo board={[]} cell={32} learning event={3} reduced/>));
  expect(animation.timing).toHaveBeenCalledTimes(2);
  expect(tree.root.findByType("AnimatedView" as never).props.style[1].transform).toEqual([{ translateY: 0 }, { scaleY: 1 }]);
  await act(async () => tree.unmount());
});
