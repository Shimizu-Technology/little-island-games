import React from "react";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { CargoTile } from "../src/arcade/games/canoe-cargo/Art";
import { illustrated, cargoArtFrame } from "../src/arcade/games/canoe-cargo/illustrated";
vi.mock("react-native", () => ({ Image: "Image", View: "View", Text: "Text" }));
vi.mock("react-native-svg", () => ({ default: "Svg", Circle: "Circle", Defs: "Defs", Ellipse: "Ellipse", G: "G", LinearGradient: "LinearGradient", Path: "Path", Rect: "Rect", Stop: "Stop" }));
const hashes = { crate: "f4d1334d348aaa905e8b2255ebdb9042b01a41033eae16a301829ddaeed96920", coconut: "3a6742edddc2c3960ec0becf761fc1d3170e68477be8256adbd6632028fc2883", fish: "e5161df9e6c4cebe250438bfd69b8c0710376b5a62959e761a97f38595906a1f", taro: "b8db1868817a8c9f0152928edfcd3c808f2a1eb43d1f84957e9bd47a4a8fc654" };
for (const kind of Object.keys(hashes) as (keyof typeof hashes)[]) {
  it(`${kind} preserves verified pixels, lazy source and padded uniform framing`, () => {
    const art = illustrated[kind], path = `assets/arcade/canoe-cargo/${kind}.webp`;
    expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(hashes[kind]);
    expect(art.source()).toBe(path);
    expect(art.pixels).toEqual([320, 320]);
    // ImageMagick is optional on CI; the immutable hash also guards every alpha pixel.
    if (process.platform === "darwin") {
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
    expect(tree.root.findByType("Text" as never).props.numberOfLines).toBe(1);
    expect(tree.root.findByProps({ testID: "cargo-stuck" })).toBeTruthy();
    await act(async () => tree.update(<CargoTile kind={kind} size={18}/>));
    expect(tree.root.findAllByType("Text" as never)).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "cargo-stuck" })).toHaveLength(0);
    await act(async () => tree.unmount());
  });
}
it("keeps settle on the UI thread, suppresses displacement under Reduce Motion, and uses ordered worklets", () => {
  const source = readFileSync("src/arcade/games/canoe-cargo/View.tsx", "utf8");
  expect(source).toContain("if (event && !reduced)");
  expect(source).toContain("scaleY: reduced ? 1 : 1 - settle.value * .006");
  expect(source).toContain("useAnimatedStyle");
  expect(source).not.toContain("transform: `");
  // No explicit top-level worklets are introduced; the shared AST suite checks capture order.
  expect(source).not.toContain('"worklet"');
});
