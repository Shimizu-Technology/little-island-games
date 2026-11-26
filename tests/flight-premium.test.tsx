import React from "react";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SharedValue } from "react-native-reanimated";
import { HIT_SECONDS, stepLives } from "../src/arcade/lives";
import { interpolatePoses, type SpritePose } from "../src/arcade/poses";
import { flightArt } from "../src/arcade/games/fruit-bat-flight/assets";
import { FlightForest, FlightPalm, FlightShore, FlightWideSky, Fruit } from "../src/arcade/games/fruit-bat-flight/Art";
import { createFlight, flightGap, flightStep, flightTransition } from "../src/arcade/games/fruit-bat-flight/engine";
import { batAngle, FLIGHT_H, FLIGHT_W, GROUND, TRUNK_HALF } from "../src/arcade/games/fruit-bat-flight/hull";
import { BAT_X, FLIGHT_SLOT, PALM_WIDTH, PORTAL_HEIGHTS, batArtMotion, flightAward, flightPoses, impactVisual } from "../src/arcade/games/fruit-bat-flight/presentation";
import { flightLevels } from "../src/arcade/games/scrolling/content";
import { BatRig } from "../src/arcade/games/scrolling/FeelArt";

vi.mock("react-native", () => ({ View: "View", Image: "Image", StyleSheet: { absoluteFill: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 } } }));
vi.mock("react-native-svg", () => ({
  default: "Svg", Circle: "Circle", Defs: "Defs", Ellipse: "Ellipse", G: "G",
  Image: "SvgImage", LinearGradient: "Gradient", Mask: "Mask", Path: "Path", Rect: "Rect", Stop: "Stop",
}));
vi.mock("react-native-reanimated", () => ({
  default: { View: "AnimatedView" },
  useAnimatedStyle: (style: () => unknown) => style(),
}));
vi.mock("../src/components/motion", () => ({ useReducedMotion: () => false }));
vi.mock("../src/arcade/Sprite", () => ({ ArcadeSprite: "ArcadeSprite" }));
vi.mock("../src/arcade/games/scrolling/CharacterArt", () => ({ RunnerRig: () => null }));
vi.mock("../src/arcade/games/scrolling/Art", () => ({ palette: () => [] }));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
const extensions = createRequire(import.meta.url).extensions;
const previousWebp = extensions[".webp"];
let tree: ReactTestRenderer | undefined;
beforeEach(() => {
  extensions[".webp"] = (module, path) => {
    const bytes = readFileSync(path);
    if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") throw new Error(`Invalid WebP: ${path}`);
    module.exports = basename(path);
  };
});
afterEach(async () => {
  if (tree) await act(async () => tree?.unmount());
  tree = undefined;
  if (previousWebp) extensions[".webp"] = previousWebp;
  else delete extensions[".webp"];
});

describe("illustrated flight", () => {
  it("resolves each bundled WebP and picks day for learning and sunset for storm", async () => {
    expect(Object.values(flightArt).map(load => load())).toEqual([
      "bat-up.webp", "bat-down.webp", "bat-bonk.webp", "golden-mango.webp",
      "palm-top.webp", "palm-shaft.webp", "backdrop-day.webp", "backdrop-sunset.webp",
    ]);
    await act(async () => { tree = create(<><FlightWideSky world="learn"/><FlightWideSky world="w4" storm/><Fruit/></>); });
    const images = tree!.root.findAll(node => String(node.type) === "Image");
    expect(images.map(node => node.props.source)).toEqual(["backdrop-day.webp", "backdrop-sunset.webp", "golden-mango.webp"]);
  });

  it("keeps all three bat frames mounted on a shared pivot through glide, flap and bonk", async () => {
    const idle = createFlight("endless", 17), flap = flightTransition(idle, { type: "flap" });
    const states = [idle, flap, { ...flap, cue: "bump", feedback: .45 }, { ...flap, status: "bumped" }] as const;
    const poses = { value: flightPoses(idle, false) } as SharedValue<SpritePose[]>;
    await act(async () => { tree = create(<BatRig poses={poses} outfit="island"/>); });
    const frameNodes = () => tree!.root.findAll(node => String(node.type) === "Image");
    const mounted = frameNodes();
    for (const [index, state] of states.entries()) {
      poses.value = flightPoses(state, false);
      await act(async () => tree!.update(<BatRig poses={poses} outfit="island" debug={index % 2 > 0}/>));
      const frames = frameNodes();
      expect(frames).toHaveLength(3);
      frames.forEach((frame, i) => expect(frame).toBe(mounted[i]));
      expect(frames.map(frame => frame.parent!.props.style[1].opacity)).toEqual(index === 0 ? [1, 0, 0] : index === 1 ? [0, 1, 0] : [0, 0, 1]);
    }
    expect(batArtMotion(flap, false).angle).toBe(batAngle(flap.vy));
    expect(batArtMotion(flap, false).kick).toBeGreaterThan(0);
    expect(batArtMotion({ ...flap, flap: 0 }, false).frame).toBe(0);
  });

  it("keeps every nontransparent bat pixel inside both wrappers and preserves the torso pivot", async () => {
    const state = createFlight("endless", 17);
    const poses = { value: flightPoses(state, true) } as SharedValue<SpritePose[]>;
    await act(async () => { tree = create(<BatRig poses={poses} outfit="sunhat" debug/>); });
    // Measured with alpha > 0. The far edges are exclusive.
    const bounds = [
      { left: 24, top: 13, right: 233, bottom: 243, torso: [139, 191] },
      { left: 24, top: 13, right: 232, bottom: 243, torso: [113, 131] },
      { left: 13, top: 43, right: 243, bottom: 213, torso: [126, 152] },
    ];
    const frames = tree!.root.findAll(node => String(node.type) === "Image");
    const [rig, impulse] = tree!.root.findAll(node => String(node.type) === "AnimatedView");
    const rigBox = rig.props.style[0];
    expect(impulse.props.style[0]).toMatchObject({ left: 0, top: 0, bottom: 0, right: 0 });
    expect(frames).toHaveLength(bounds.length);
    frames.forEach((frame, i) => {
      const frameBox = frame.parent!.props.style[0];
      const { left, top, right, bottom, torso } = bounds[i];
      const scale = frameBox.width / 256;
      expect(frameBox.left + left * scale).toBeGreaterThan(0);
      expect(frameBox.top + top * scale).toBeGreaterThan(0);
      expect(frameBox.left + right * scale).toBeLessThan(rigBox.width);
      expect(frameBox.top + bottom * scale).toBeLessThan(rigBox.height);
      expect(poses.value[FLIGHT_SLOT.bat].x + frameBox.left + torso[0] * scale).toBeCloseTo(BAT_X, 10);
      expect(poses.value[FLIGHT_SLOT.bat].y + frameBox.top + torso[1] * scale).toBeCloseTo(state.y * FLIGHT_H, 10);
    });
  });

  it("aligns both solid palm lips to a moving gate and covers the shaft with native-ratio tiles", async () => {
    const state = { ...createFlight(flightLevels.find(l => l.rank === 4)!, 17, true), time: .4 };
    const before = flightPoses(state, false);
    const next = flightStep(flightTransition(state, { type: "flap" }), { type: "idle" }, 1 / 60);
    const now = flightPoses(next, false);
    const fraction = .6, midpoint = interpolatePoses(before, now, fraction);
    const x = (state.gates[0].x + (next.gates[0].x - state.gates[0].x) * fraction) * FLIGHT_W;
    const center = state.gates[0].center + (next.gates[0].center - state.gates[0].center) * fraction;
    const gap = flightGap(state) + (flightGap(next) - flightGap(state)) * fraction;
    const [top, bottom] = midpoint.slice(FLIGHT_SLOT.palm, FLIGHT_SLOT.palm + 2);
    await act(async () => { tree = create(<><FlightPalm/><FlightPalm bottom/></>); });
    const images = tree!.root.findAll(node => String(node.type) === "Image");
    const caps = images.filter(node => node.props.source === "palm-top.webp");
    expect(caps).toHaveLength(2);
    caps.forEach((image, i) => {
      const column = image.parent!;
      const [firstTile, ...tiles] = column.findAll(node => node.props.source === "palm-shaft.webp");
      const shaft = firstTile.parent!.props.style, cap = image.props.style;
      const pose = i === 0 ? top : bottom;
      expect(cap.transform).toEqual([{ scaleY: i === 0 ? -1 : 1 }]);
      expect(cap.width).toBe(column.props.style.width);
      expect(pose.x + shaft.left).toBeCloseTo(x - TRUNK_HALF, 10);
      expect(pose.x + shaft.left + shaft.width).toBeCloseTo(x + TRUNK_HALF, 10);

      // The alpha >= 128 collar base covers [46, 210), and the shaft covers [1, 191).
      expect(cap.left + cap.width * 46 / 256).toBeLessThanOrEqual(shaft.left + shaft.width / 192);
      expect(cap.left + cap.width * 210 / 256).toBeGreaterThanOrEqual(shaft.left + shaft.width * 191 / 192);
      expect(cap.height / cap.width).toBeCloseTo(174 / 256, 10);
      const solidLip = cap.height * 58 / 174;
      const drawnLip = pose.y + cap.top + (i === 0 ? cap.height - solidLip : solidLip);
      const collisionLip = (center + (i === 0 ? -1 : 1) * gap / 2) * FLIGHT_H;
      expect(drawnLip - collisionLip).toBeCloseTo(0, 10);

      let previousBottom = 0;
      expect(firstTile.props.style.top).toBe(0);
      for (const [j, tile] of [firstTile, ...tiles].entries()) {
        const { width, height, top } = tile.props.style;
        expect(width).toBe(PALM_WIDTH);
        expect((height / width) / (280 / 192)).toBeCloseTo(1, 10);
        if (j > 0) {
          expect(previousBottom - top).toBeGreaterThanOrEqual(1);
          expect(previousBottom - top).toBeLessThanOrEqual(2);
        }
        previousBottom = top + height;
      }
      expect(previousBottom).toBeGreaterThanOrEqual(shaft.height);
      expect(shaft.overflow).toBe("hidden");
    });
  });

  it("blinks only while flying with post-hit protection, with a steady reduced-motion cue", async () => {
    const initial = { ...createFlight(flightLevels[0], 17), waiting: false, y: .02 };
    const hit = flightStep(initial, { type: "idle" }, 1 / 60);
    expect(hit.waiting).toBe(true);
    expect(hit.lives.invulnerable).toBe(HIT_SECONDS);
    const resumed = flightTransition(hit, { type: "flap" });
    const later = { ...resumed, lives: { ...resumed.lives, invulnerable: HIT_SECONDS - .15 } };
    let lives = resumed.lives;
    for (let i = 0; i < 12; i++) lives = stepLives(lives, .1);
    const expired = { ...resumed, lives: stepLives(lives, .01) };
    const opacity = (s: typeof resumed, reduced = false) => flightPoses(s, reduced)[FLIGHT_SLOT.bat].opacity;
    expect(opacity(hit)).toBe(1);
    expect(opacity(resumed)).toBe(.45);
    expect(opacity(later)).toBe(1);
    expect(opacity(resumed, true)).toBe(.72);
    expect(opacity(later, true)).toBe(.72);
    expect(expired.lives.invulnerable).toBe(0);
    expect(opacity(expired)).toBe(1);
    expect(opacity(expired, true)).toBe(1);
    const poses = { value: flightPoses(resumed, true) } as SharedValue<SpritePose[]>;
    await act(async () => { tree = create(<BatRig poses={poses} outfit="island"/>); });
    expect(tree!.root.findAll(node => String(node.type) === "AnimatedView")[0].props.style[1].opacity).toBe(.72);
  });

  it.each([[768, 920], [1024, 660], [852, 320]])("keeps the full backdrop height at %i × %i", async (width, height) => {
    await act(async () => { tree = create(<FlightWideSky world="w4" width={width} height={height}/>); });
    const image = tree!.root.find(node => String(node.type) === "SvgImage");
    expect(image.props).toMatchObject({ href: "backdrop-sunset.webp", y: 0, height, preserveAspectRatio: "none" });
    expect(image.props.x).toBeGreaterThan(0);
    expect(image.props.x + image.props.width / 2).toBe(width / 2);
    const gradient = tree!.root.findAll(node => String(node.type) === "Gradient")[0];
    expect(gradient.props.y2).toBe("100%");
    expect(image.props.mask).toMatch(/^url\(#.+-art\)$/);
  });

  it("continues moving shore and clouds beyond the central lane with one whole wrap tile", async () => {
    const poses = { value: flightPoses(createFlight("endless", 17), false) } as SharedValue<SpritePose[]>;
    await act(async () => { tree = create(<><FlightForest poses={poses} storm tiles={3}/><FlightShore poses={poses} tiles={3}/></>); });
    const bands = tree!.root.findAll(node => String(node.type) === "ArcadeSprite");
    expect(bands.map(node => node.props.width)).toEqual([4 * FLIGHT_W, 4 * FLIGHT_W, 4 * FLIGHT_W + 2]);
    const shoreTiles = tree!.root.findAll(node => String(node.type) === "Rect");
    expect(shoreTiles).toHaveLength(4);
    expect(shoreTiles.every(node => node.props.width === FLIGHT_W + 2)).toBe(true);
  });

  it("reduces decorative motion while preserving flap and bonk frames, gate positions and the warm flash", () => {
    const idle = { ...createFlight("endless", 17), hover: .4, travel: 2, time: .3 };
    const flap = flightTransition(idle, { type: "flap" });
    const bonk = { ...flap, cue: "bump", feedback: .36 } as const;
    expect(batArtMotion(idle, true).y).toBe(idle.y * FLIGHT_H);
    expect(batArtMotion(idle, false).y).not.toBe(idle.y * FLIGHT_H);
    expect(batArtMotion(flap, true)).toMatchObject({ frame: 1, kick: 0, angle: batAngle(flap.vy) });
    expect(batArtMotion(bonk, true)).toMatchObject({ frame: 2, kick: 0, angle: batAngle(bonk.vy) });
    const still = flightPoses(idle, true), moving = flightPoses(idle, false);
    expect(still[FLIGHT_SLOT.clouds].x).toBe(0);
    expect(still[FLIGHT_SLOT.shore]).toEqual({ x: 0, y: GROUND });
    expect(still[FLIGHT_SLOT.palm]).toEqual(moving[FLIGHT_SLOT.palm]);
    expect(still[FLIGHT_SLOT.fruit].scale).toBe(1);
    expect(impactVisual(.24, true)).toMatchObject({ x: 0, y: 0 });
    expect(impactVisual(.24, true).flash).toBeGreaterThan(0);
    expect(impactVisual(.24, false).x).not.toBe(0);
  });

  it("anchors a pickup at the cleared gate and reports only the certified point gain", () => {
    const idle = createFlight("endless", 17);
    const before = { ...idle, gates: idle.gates.map((gate, i) => i === 0 ? { ...gate, x: (BAT_X - 37) / FLIGHT_W, center: .5, base: .5 } : gate) };
    const after = flightStep(flightTransition(before, { type: "flap" }), { type: "idle" }, 1 / 60);
    const point = flightAward(before, after);
    expect(point).toEqual({ x: after.gates[0].x * FLIGHT_W, y: after.gates[0].center * FLIGHT_H, mango: true, gain: 1 });
    expect(flightAward(before, before)).toBeNull();
    const learn = createFlight(flightLevels.find(l => l.world === "learn")!, 17);
    const portal = flightPoses(learn, false)[FLIGHT_SLOT.portal + 2];
    expect(portal.y + 32).toBe(PORTAL_HEIGHTS[2]);
  });
});
