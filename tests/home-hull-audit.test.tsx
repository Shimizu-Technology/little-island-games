import React, { createElement as nativeElement } from 'react';
import { describe, it, vi, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ItemArt } from "../src/home/art/Items";
import { MoreItemArt } from "../src/home/art/More";
import { itemIds } from "../src/home/catalog";
import { moreCatalog } from "../src/home/catalogMore";
import { instance } from "../src/home/model";
import { itemShapes } from "../src/home/art/silhouettes";
import type { HitShape } from "../src/home/scene/types";
import { HomeCharacter } from "../src/home/characterRenderer";
import { anchorsFor, species } from "../src/home/scene/species";
import { characterSize } from "../src/home/geometry";
vi.mock("react-native-reanimated", () => ({ default: { createAnimatedComponent: (c: unknown) => c }, useSharedValue: (value: number) => ({ value }), useAnimatedProps: () => ({}), cancelAnimation: () => {}, withRepeat: () => 0, withSequence: () => 0, withTiming: () => 0, Easing: { inOut: () => 0, sin: 0 } }));
vi.mock("react-native-svg", () => {
  const tags = { default: "svg", Circle: "circle", Ellipse: "ellipse", G: "g", Path: "path", Rect: "rect", Defs: "defs", Filter: "filter", FeColorMatrix: "feColorMatrix", ClipPath: "clipPath", Pattern: "pattern", Text: "text", LinearGradient: "linearGradient", Stop: "stop" };
  return Object.fromEntries(Object.entries(tags).map(([name, tag]) => [name, ({ children, accessible: _accessible, ...props }: Record<string, unknown>) => React.createElement(tag, props, children as React.ReactNode)]));
});

vi.mock("../src/home/art/Room", () => ({ wallColors: { cream: "#F5E6C8", lagoon: "#C5DED3" }, floorColors: { sand: "#EBD7B2", honey: "#DDAE7D" } }));
vi.mock("../src/arcade/Art", () => ({ StickerArt: () => null }));

/** Developer tool, not a gate: it needs rsvg-convert and ImageMagick. Set LI_HULL_AUDIT to an output folder. */
const out = process.env.LI_HULL_AUDIT;
const pixels = 600;
function inside(shape: HitShape, x: number, y: number): boolean {
  if (shape.kind === "box") return x >= shape.left && x <= shape.left + shape.width && y >= shape.top && y <= shape.top + shape.height;
  if (shape.kind === "ellipse") return ((x - shape.x) / shape.rx) ** 2 + ((y - shape.y) / shape.ry) ** 2 <= 1;
  if (shape.kind === "capsule") {
    const vx = shape.bx - shape.ax, vy = shape.by - shape.ay, t = Math.max(0, Math.min(1, ((x - shape.ax) * vx + (y - shape.ay) * vy) / (vx * vx + vy * vy || 1)));
    return Math.hypot(x - shape.ax - vx * t, y - shape.ay - vy * t) <= shape.r;
  }
  let pos = false, neg = false; const n = shape.points.length / 2;
  for (let i = 0; i < n; i++) { const ax = shape.points[i * 2], ay = shape.points[i * 2 + 1], bx = shape.points[((i + 1) % n) * 2], by = shape.points[((i + 1) % n) * 2 + 1]; const c = (bx - ax) * (y - ay) - (by - ay) * (x - ax); if (c > 0) pos = true; if (c < 0) neg = true; }
  return !(pos && neg);
}
describe.skipIf(!out)("hull raster audit", () => {
  it("keeps raster coverage when rectangular catalog art is mirrored or rotated", () => {
    const dir = join(out!, "transforms"); mkdirSync(dir, { recursive: true });
    const report: Record<string, unknown>[] = [];
    for (const id of ["shelf", "fridge", "armchair", "stove", "tv", "blocks", "aquarium", "computer-desk"] as const) for (const active of [false, true]) {
      let baseline = 0;
      for (const rotation of [0, 90, 180, 270] as const) for (const mirrored of [false, true]) {
        const props = { size: 150, active, rotation, mirrored };
        const svg = renderToStaticMarkup(moreCatalog[id] ? <MoreItemArt id={id} {...props} /> : <ItemArt item={id} {...props} />).replaceAll("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
        const base = join(dir, `${id}-${Number(active)}-${rotation}-${Number(mirrored)}`);
        writeFileSync(`${base}.svg`, svg);
        execFileSync("rsvg-convert", ["-w", "200", "-h", "200", "-b", "none", "-o", `${base}.png`, `${base}.svg`]);
        execFileSync("magick", [`${base}.png`, "-alpha", "extract", "-depth", "8", `gray:${base}.raw`]);
        const alpha = readFileSync(`${base}.raw`);
        const shapes = itemShapes({ ...instance("x", id, 5, 5), rotation, mirrored, powered: active }, 150);
        let painted = 0, missed = 0;
        for (let y = 0; y < 200; y++) for (let x = 0; x < 200; x++) {
          if (alpha[y * 200 + x] <= 200) continue;
          painted++;
          if (!shapes.some((shape) => inside(shape, (x + .5) / 200 * 150 - 75, (y + .5) / 200 * 150 - 127.5))) missed++;
        }
        const fraction = missed / painted;
        if (rotation === 0 && !mirrored) baseline = fraction;
        report.push({ id, active, rotation, mirrored, painted, missed: fraction, baseline });
        writeFileSync(join(dir, "coverage.json"), JSON.stringify(report, null, 1));
        expect(fraction, `${id}/${active}/${rotation}/${mirrored}`).toBeLessThanOrEqual(baseline + .005);
      }
    }
    expect(report).toHaveLength(128);
  }, 600000);
  it("compares every hull with its painted alpha", () => {
    mkdirSync(out!, { recursive: true });
    const report: Record<string, unknown>[] = [];
    for (const id of itemIds) for (const active of [false, true]) {
      if (id.startsWith("sticker:") && active) continue;
      const svg = renderToStaticMarkup(moreCatalog[id] ? <MoreItemArt id={id} size={150} active={active} /> : id.startsWith("sticker:") ? <svg /> : <ItemArt item={id} size={150} active={active} />).replaceAll("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
      if (id.startsWith("sticker:")) continue;
      const base = join(out!, `${id}${active ? ".on" : ""}`);
      writeFileSync(`${base}.svg`, svg);
      execFileSync("rsvg-convert", ["-w", String(pixels), "-h", String(pixels), "-b", "none", "-o", `${base}.png`, `${base}.svg`]);
      execFileSync("magick", [`${base}.png`, "-alpha", "extract", "-depth", "8", `gray:${base}.raw`]);
      const alpha = readFileSync(`${base}.raw`);
      const size = 150, item = { ...instance("x", id, 0, 0), ...(active ? { state: "active" as const } : {}) };
      const shapes = itemShapes(item, size);
      let painted = 0, hullArea = 0, missed = 0;
      for (let py = 0; py < pixels; py++) for (let px = 0; px < pixels; px++) {
        const a = alpha[py * pixels + px] > 200;
        const x = (px + .5) / pixels * size - size / 2, y = (py + .5) / pixels * size - size * .85;
        const hit = shapes.some((s) => inside(s, x, y));
        if (a) painted++; if (hit) hullArea++; if (a && !hit) missed++;
      }
      const toX = (v: number) => (v + size / 2) * 4, toY = (v: number) => (v + size * .85) * 4;
      const draw = shapes.map((s) => s.kind === "box" ? `<rect x="${toX(s.left)}" y="${toY(s.top)}" width="${s.width * 4}" height="${s.height * 4}"/>` : s.kind === "ellipse" ? `<ellipse cx="${toX(s.x)}" cy="${toY(s.y)}" rx="${s.rx * 4}" ry="${s.ry * 4}"/>` : s.kind === "capsule" ? `<line x1="${toX(s.ax)}" y1="${toY(s.ay)}" x2="${toX(s.bx)}" y2="${toY(s.by)}" stroke-width="${s.r * 8}" stroke-linecap="round" stroke-opacity=".35"/>` : `<polygon points="${s.points.map((v, i) => (i % 2 ? toY(v) : toX(v))).join(" ")}"/>`).join("");
      writeFileSync(`${base}.hull.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${pixels}" height="${pixels}"><g fill="#E0303A" fill-opacity=".28" stroke="#C0202A" stroke-width="3">${draw}</g></svg>`);
      execFileSync("rsvg-convert", ["-w", String(pixels), "-h", String(pixels), "-b", "none", "-o", `${base}.hull.png`, `${base}.hull.svg`]);
      execFileSync("magick", [`${base}.png`, `${base}.hull.png`, "-background", "#F4E7CF", "-layers", "flatten", "-resize", "200x200", `${base}.sheet.png`]);
      report.push({ id, active, painted, ratio: +(hullArea / Math.max(1, painted)).toFixed(3), missed: +(missed / Math.max(1, painted)).toFixed(3) });
    }
    for (const slot of [0, 1, 2] as const) for (const base of ["stand", "sit", "lie"] as const) {
      const unit = species[slot].unit, shapes = anchorsFor(slot, base, "front").shapes;
      const markup = renderToStaticMarkup(<HomeCharacter input={{ slot, base, action: null, face: null, facing: "right", size: characterSize(slot), tilt: 0, limbLag: 0, reduced: true }} />).replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
      const vb = /viewBox="([-\d. ]+)"/.exec(markup)![1].split(" ").map(Number);
      const b = join(out!, `character-${slot}-${base}`);
      const px = 800, h = Math.round(px * vb[3] / vb[2]);
      writeFileSync(`${b}.svg`, markup);
      execFileSync("rsvg-convert", ["-w", String(px), "-h", String(h), "-b", "none", "-o", `${b}.png`, `${b}.svg`]);
      execFileSync("magick", [`${b}.png`, "-alpha", "extract", "-depth", "8", `gray:${b}.raw`]);
      const alpha = readFileSync(`${b}.raw`);
      let painted = 0, hullArea = 0, missed = 0;
      for (let py = 0; py < h; py++) for (let x = 0; x < px; x++) {
        const a = alpha[py * px + x] > 200;
        const rx = (vb[0] + (x + .5) / px * vb[2]) * unit, ry = (vb[1] + (py + .5) / h * vb[3]) * unit;
        const hit = shapes.some((s) => inside(s, rx, ry));
        if (a) painted++; if (hit) hullArea++; if (a && !hit) missed++;
      }
      report.push({ id: `character-${slot}-${base}`, painted, ratio: +(hullArea / Math.max(1, painted)).toFixed(3), missed: +(missed / Math.max(1, painted)).toFixed(3) });
    }
    writeFileSync(join(out!, "audit.json"), JSON.stringify(report, null, 1));
    const bad = report.filter((r) => (r.ratio as number) > 1.3 || (r.missed as number) > .1);
    console.log(`items ${report.length}; over limit ${bad.length}\n` + bad.map((r) => `${r.id}${r.active ? " on" : ""} ratio ${r.ratio} missed ${r.missed}`).join("\n"));
    expect(report.length).toBeGreaterThan(70);
  }, 600000);
});

vi.mock('react-native', () => ({
  View: ({children, ...p}: any) => nativeElement('div', p, children),
  Image: ({source, ...p}: any) => nativeElement('img', {...p, src: typeof source === 'string' ? source : source?.uri}),
}));
