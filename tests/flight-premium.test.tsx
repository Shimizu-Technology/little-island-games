import React from "react";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SharedValue } from "react-native-reanimated";
import { interpolatePoses, type SpritePose } from "../src/arcade/poses";
import { flightArt } from "../src/arcade/games/fruit-bat-flight/assets";
import { FlightPalm, FlightWideSky, Fruit } from "../src/arcade/games/fruit-bat-flight/Art";
import { createFlight, flightGap, flightStep, flightTransition } from "../src/arcade/games/fruit-bat-flight/engine";
import { batAngle, FLIGHT_H, FLIGHT_W, GROUND, TRUNK_HALF } from "../src/arcade/games/fruit-bat-flight/hull";
import { BAT_X, FLIGHT_SLOT, PALM_CAP_HEIGHT, PALM_WIDTH, PORTAL_HEIGHTS, batArtMotion, flightAward, flightPoses, impactVisual } from "../src/arcade/games/fruit-bat-flight/presentation";
import { flightLevels } from "../src/arcade/games/scrolling/content";
import { BatRig } from "../src/arcade/games/scrolling/FeelArt";

vi.mock("react-native", () => ({ View: "View", Image: "Image", StyleSheet: { absoluteFill: {} } }));
vi.mock("react-native-svg", () => ({
  default: "Svg", Circle: "Circle", Defs: "Defs", Ellipse: "Ellipse", G: "G",
  LinearGradient: "Gradient", Path: "Path", Rect: "Rect", Stop: "Stop",
}));
vi.mock("react-native-reanimated", () => ({
  default: { View: "AnimatedView" },
  useAnimatedStyle: (style: () => unknown) => style(),
}));
vi.mock("../src/components/motion", () => ({ useReducedMotion: () => false }));
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

  it("keeps width and gap edges tied to the hull at a moving, eased-open gate", async () => {
    const state = { ...createFlight(flightLevels.find(l => l.rank === 4)!, 17, true), time: .4 };
    const before = flightPoses(state, false);
    const next = flightStep(flightTransition(state, { type: "flap" }), { type: "idle" }, 1 / 60);
    const now = flightPoses(next, false);
    const fraction = .6, midpoint = interpolatePoses(before, now, fraction);
    const x = (state.gates[0].x + (next.gates[0].x - state.gates[0].x) * fraction) * FLIGHT_W;
    const center = state.gates[0].center + (next.gates[0].center - state.gates[0].center) * fraction;
    const gap = flightGap(state) + (flightGap(next) - flightGap(state)) * fraction;
    const [top, bottom] = midpoint.slice(FLIGHT_SLOT.palm, FLIGHT_SLOT.palm + 2);
    expect(top.x).toBeCloseTo(x - TRUNK_HALF, 10);
    expect(bottom.x + PALM_WIDTH).toBeCloseTo(x + TRUNK_HALF, 10);
    expect(top.y + FLIGHT_H).toBeCloseTo((center - gap / 2) * FLIGHT_H, 10);
    expect(bottom.y).toBeCloseTo((center + gap / 2) * FLIGHT_H, 10);

    await act(async () => { tree = create(<><FlightPalm/><FlightPalm bottom/></>); });
    const images = tree!.root.findAll(node => String(node.type) === "Image");
    const [upper, lower] = images.filter(node => node.props.source === "palm-top.webp").map(node => node.props.style);
    expect(upper.top + upper.height).toBe(FLIGHT_H);
    expect(upper.transform).toEqual([{ scaleY: -1 }]);
    expect(lower.top).toBe(0);
    expect(lower.height).toBe(PALM_CAP_HEIGHT);
    expect(lower.transform).toEqual([{ scaleY: 1 }]);
    expect(images.every(node => node.props.style.width === 2 * TRUNK_HALF)).toBe(true);
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
