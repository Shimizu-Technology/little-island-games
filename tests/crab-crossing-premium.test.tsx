import React, { Profiler, useRef } from "react";
import { readFileSync } from "node:fs";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import type { SharedValue } from "react-native-reanimated";
import { afterEach, expect, it, vi } from "vitest";
import { SHADOW, TRAFFIC_PER_ROW } from "../src/arcade/games/crab-crossing/CrabMotion";
import { CrabVehicle } from "../src/arcade/games/crab-crossing/CrabArt";
import { CrabBoard } from "../src/arcade/games/crab-crossing/View";
import { crabFraming } from "../src/arcade/games/crab-crossing/camera";
import { crabLanes, crabLevel, createCrab, laneObjects, supported, type CrabState } from "../src/arcade/games/crab-crossing/engine";
import { crabActorFrame, illustrated } from "../src/arcade/games/crab-crossing/illustrated";
import type { SpritePose } from "../src/arcade/poses";

type Mutable = { value: unknown; set(next: unknown): void };
const probe = vi.hoisted(() => ({
  poses: undefined as SharedValue<SpritePose[]> | undefined,
  reduced: vi.fn(() => false),
  timing: vi.fn(),
}));

vi.mock("react-native", () => ({ View: "View", Image: "Image", Platform: { OS: "android" } }));
vi.mock("react-native-svg", () => ({ default: "Svg", Circle: "Circle", Ellipse: "Ellipse", G: "G", Path: "Path", Rect: "Rect" }));
vi.mock("react-native-reanimated", () => ({
  default: { View: "AnimatedView" },
  useSharedValue: (value: unknown) => {
    const shared = useRef<Mutable>({ value, set(next) {
      // Keep the pulse at its first frame until the simulated animation clock advances.
      if (!(next && typeof next === "object" && "timing" in next)) this.value = next;
    } }).current;
    if (Array.isArray(value)) probe.poses = shared as SharedValue<SpritePose[]>;
    return shared;
  },
  useAnimatedStyle: (style: () => unknown) => style,
  useAnimatedReaction: () => {},
  useFrameCallback: () => {},
  cancelAnimation: () => {},
  withTiming: (timing: number, config: unknown) => { probe.timing(config); return { timing }; },
  withRepeat: () => 1,
  withSequence: () => 1,
}));
vi.mock("expo-router", () => ({ useFocusEffect: () => {} }));
vi.mock("../src/components/motion", () => ({ useReducedMotion: probe.reduced }));
vi.mock("../src/components/Text", () => ({ Text: "Text" }));
vi.mock("../src/components/ui", () => ({ Button: "Button", Copy: "Copy", PressableScale: "PressableScale" }));
vi.mock("../src/arcade/games/grid/Art", () => ({ GridObject: () => null }));
vi.mock("../src/arcade/games/grid/Controls", () => ({
  GridBudget: () => null, Shake: ({ children }: { children: React.ReactNode }) => children, useGridInput: () => ({}),
}));

let tree: ReactTestRenderer | undefined;
afterEach(async () => {
  if (tree) await act(async () => tree!.unmount());
  tree = undefined;
  probe.poses = undefined;
  probe.reduced.mockReset().mockReturnValue(false);
  probe.timing.mockClear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function host(testID: string) {
  return tree!.root.find(node => typeof node.type === "string" && node.props.testID === testID);
}
function styles(node: ReactTestInstance) {
  return Object.assign({}, ...[node.props.style].flat().map(style => typeof style === "function" ? style() : style));
}

const expectedInk = {
  crab: [12, 32, 232, 191], log: [12, 42, 360, 171], turtle: [12, 29, 360, 197], canoe: [12, 45, 360, 166],
  island: [24, 12, 336, 232], bike: [25, 12, 333, 232], car: [31, 12, 322, 232], bus: [12, 15, 360, 226],
} as const;

it("resolves the eight shipped WebPs and fits their measured ink uniformly on the contact line in either direction", () => {
  for (const name of Object.keys(expectedInk) as (keyof typeof expectedInk)[]) {
    const art = illustrated[name], path = `assets/arcade/crab-crossing/${name}.webp`;
    expect(art.source()).toBe(path);
    const webp = readFileSync(path);
    expect(webp.toString("ascii", 8, 16)).toBe("WEBPVP8X");
    const pixels = [webp.readUIntLE(24, 3) + 1, webp.readUIntLE(27, 3) + 1];
    expect(pixels).toEqual(name === "crab" ? [256, 256] : [384, 256]);
    expect(art.pixels).toEqual(pixels);
    expect(art.ink).toEqual(expectedInk[name]);

    for (const [width, height] of [[45, 100], [205, 65]]) {
      for (const left of [false, true]) {
        const contact = height * 0.9;
        const frame = crabActorFrame(art, width, height, contact, left);
        const scale = frame.width / pixels[0];
        expect(frame.height / pixels[1]).toBeCloseTo(scale);
        expect(frame.transform).toEqual([{ scaleX: left ? -1 : 1 }]);
        const [x, y, inkWidth, inkHeight] = art.ink;
        const inkLeft = frame.left + scale * (left ? pixels[0] - x - inkWidth : x);
        const inkTop = frame.top + y * scale;
        expect(inkLeft).toBeGreaterThanOrEqual(-1e-8);
        expect(inkLeft + inkWidth * scale).toBeLessThanOrEqual(width + 1e-8);
        expect(inkLeft + inkWidth * scale / 2).toBeCloseTo(width / 2);
        expect(inkTop).toBeGreaterThanOrEqual(-1e-8);
        expect(inkTop + inkHeight * scale).toBeCloseTo(contact);
      }
    }
  }
});

it("mounts illustrated traffic for every engine actor and grounds floating decks across their full usable span", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const lanes = (["w5-1", "w6-1"] as const).flatMap(level => crabLanes(createCrab(crabLevel(level), 120)));
  await act(async () => {
    tree = create(<>{lanes.map((lane, i) => <CrabVehicle key={i} kind={lane.kind} width={lane.span * 48} height={56.64} left={lane.speed < 0}/>)}</>);
  });
  const images = tree!.root.findAll(node => String(node.type) === "Image");
  expect(images).toHaveLength(lanes.length);
  expect(new Set(images.map(image => image.props.source)).size).toBe(7);
  for (const [i, lane] of lanes.entries()) {
    const image = images[i], art = illustrated[lane.kind === "pickup" ? "car" : lane.kind], width = lane.span * 48;
    expect(image.props.source).toBe(art.source());
    expect(image.props.resizeMode).toBe("contain");
    expect(styles(image).transform).toEqual([{ scaleX: lane.speed < 0 ? -1 : 1 }]);
    if (["log", "turtle", "canoe", "island"].includes(lane.kind)) {
      const deck = image.parent!.children[1] as ReactTestInstance;
      expect(styles(deck).width).toBe(width);
      expect(styles(deck).left).toBe(0);
    }
  }
});

const viewport = { size: 393, height: 700, wide: false };
async function start(initial: CrabState, reduced = false) {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  probe.reduced.mockReturnValue(reduced);
  let now = 0, scheduled: FrameRequestCallback | undefined;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { scheduled = callback; return 1; });
  vi.stubGlobal("cancelAnimationFrame", () => { scheduled = undefined; });
  const frames = async (count: number) => act(async () => {
    for (let i = 0; i < count; i++) {
      now += 1000 / 60;
      scheduled?.(now);
    }
  });
  const commits = vi.fn(), onTone = vi.fn(), onResult = vi.fn();
  await act(async () => {
    tree = create(<Profiler id="crab" onRender={commits}>
      <CrabBoard initial={initial} active helper={initial.helper} outfit="sunhat" debug={false} onTone={onTone} onResult={onResult} {...viewport}/>
    </Profiler>);
  });
  await frames(1);
  return { frames, commits, onTone, onResult };
}

function press(label: string) {
  tree!.root.find(node => String(node.type) === "PressableScale" && node.props.accessibilityLabel === label).props.onPress();
}

it("animates accepted and buffered hops, shadow lift and the landing puff with zero React commits", async () => {
  const initial = createCrab(crabLevel("w2-2"), 7);
  const { frames, commits, onTone } = await start(initial);
  const count = commits.mock.calls.length;
  const idle = probe.poses!.value[0];
  const shadow = probe.poses!.value[SHADOW];
  const world = host("crab-world");
  const forward = tree!.root.find(node => typeof node.type === "string" && typeof node.props.onAccessibilityTap === "function");
  await act(async () => {
    world.props.onTouchStart();
    forward.props.onAccessibilityTap();
    world.props.onTouchEnd();
    press("Move left");
    press("Move right");
    press("Move right"); // The engine has only two buffer slots.
  });
  expect(onTone.mock.calls).toEqual([["crab-hop", true]]);
  expect(styles(host("crab-kiko-body")).transform[1].scaleY).toBeLessThan(1);
  await frames(4);
  expect(probe.poses!.value[0].angle).not.toBe(0);
  expect(probe.poses!.value[SHADOW].scale!).toBeLessThan(shadow.scale!);
  expect(probe.poses!.value[0].y).toBeLessThan(idle.y);
  expect(styles(host("crab-kiko-body")).transform[1].scaleY).toBeGreaterThan(1);
  await frames(4);
  expect(styles(host("crab-sand-burst")).opacity).toBeGreaterThan(0);
  expect(styles(host("crab-water-burst")).opacity).toBe(0);
  expect(styles(host("crab-kiko-body")).transform[0].scaleX).toBeLessThan(0);
  await frames(64);
  expect(onTone.mock.calls).toEqual(Array.from({ length: 3 }, () => ["crab-hop", true]));
  expect(styles(host("crab-hint").find(node => String(node.type) === "AnimatedView")).opacity).toBe(0);
  expect(commits).toHaveBeenCalledTimes(count);
});

it("pads the full Android hero canvas for the worst hop, tilt and mirrored poses", async () => {
  const initial = createCrab(crabLevel("w6-1"), 120);
  await start(initial);
  const image = host("crab-kiko-art"), body = host("crab-kiko-body"), wrapper = body.parent!;
  expect(image.props.source).toBe(illustrated.crab.source());
  expect(host("crab-outfit-sunhat")).toBeDefined();

  const box = styles(wrapper), inner = styles(body), art = styles(image);
  const [cx, cy] = box.transformOrigin, [ox, oy] = inner.transformOrigin;
  expect(box.width).toBeGreaterThan(inner.width);
  expect(box.height).toBeGreaterThan(inner.height);
  // Exercise the full decoded image, including transparent margins, with the extrema of the motion.
  for (const scaleX of [-1.144, -0.847, 0.847, 1.144]) {
    for (const scaleY of [0.84, 1.17]) {
      for (const angle of [-0.14, 0.14]) {
        for (const x of [art.left, art.left + art.width]) {
          for (const y of [art.top, art.top + art.height]) {
            const dx = inner.left + ox + (x - ox) * scaleX - cx;
            const dy = inner.top + oy + (y - oy) * scaleY - cy;
            const px = cx + 1.045 * (dx * Math.cos(angle) - dy * Math.sin(angle));
            const py = cy + 1.045 * (dx * Math.sin(angle) + dy * Math.cos(angle));
            expect(px).toBeGreaterThan(0);
            expect(px).toBeLessThan(box.width);
            expect(py).toBeGreaterThan(0);
            expect(py).toBeLessThan(box.height);
          }
        }
      }
    }
  }

  const bike = crabLanes(initial).find(lane => lane.row === 9)!;
  expect(bike.kind).toBe("bike");
  const slot = probe.poses!.value[1 + 9 * TRAFFIC_PER_ROW];
  const { unit } = crabFraming(viewport.size, viewport.height);
  expect(slot.opacity).toBe(1);
  expect(slot.x).toBeCloseTo((laneObjects(bike, initial.travel)[0] - bike.span / 2 + 0.5) * unit);
});

it("shows water landing and splash feedback on the corresponding actual rule outcomes", async () => {
  const level = crabLevel("w1-1"), initial = createCrab(level, 120);
  const log = crabLanes(initial).find(lane => lane.row === 4)!;
  const safe = [0, 1, 2, 3, 4, 5, 6, 7, 8].find(x => supported(log, x, 0) && supported(log, x, 0.2))!;
  const { frames, onTone } = await start({ ...initial, x: safe, y: 5 });
  await act(async () => press("Move forward"));
  await frames(8);
  expect(styles(host("crab-water-burst")).opacity).toBeGreaterThan(0);
  expect(styles(host("crab-sand-burst")).opacity).toBe(0);
  expect(onTone.mock.calls).toEqual([["crab-hop", true]]);

  await act(async () => tree!.unmount());
  tree = undefined;
  const gap = [0, 1, 2, 3, 4, 5, 6, 7, 8].find(x => !supported(log, x, 0) && !supported(log, x, 0.2))!;
  const splash = await start({ ...initial, x: gap, y: 5 });
  await act(async () => press("Move forward"));
  await splash.frames(8);
  expect(splash.onTone.mock.calls).toEqual([["crab-hop", true], ["crab-splash", true]]);
  expect(styles(host("crab-water-burst")).opacity).toBe(0);
});

it.each([false, true])("scores the goal and waits for finger-up with Reduce Motion %s", async reduced => {
  const level = crabLevel("w1-1"), state = createCrab(level, 120), crossed = level.target - 1;
  const { frames, onTone, onResult } = await start({ ...state, y: 1, furthest: 1, crossed, score: crossed * 100 }, reduced);
  await act(async () => { host("crab-world").props.onTouchStart(); press("Move forward"); });
  await frames(4);
  expect(probe.poses!.value[0].angle === 0).toBe(reduced);
  expect(styles(host("crab-kiko-body")).transform[1].scaleY === 1).toBe(reduced);
  await frames(4);
  expect(onTone.mock.calls).toEqual([["crab-hop", true], ["crab-goal", true]]);
  if (reduced) {
    expect(tree!.root.findAll(node => typeof node.props.testID === "string" && node.props.testID.endsWith("-burst"))).toHaveLength(0);
    expect(probe.timing).not.toHaveBeenCalledWith({ duration: 290 });
  } else {
    expect(styles(host("crab-goal-burst")).opacity).toBeGreaterThan(0);
    expect(probe.timing).toHaveBeenCalledWith({ duration: 290 });
  }
  await act(async () => { await vi.advanceTimersByTimeAsync(310); });
  expect(onResult).not.toHaveBeenCalled();
  await act(async () => host("crab-world").props.onTouchEnd());
  await act(async () => { await vi.advanceTimersByTimeAsync(310); });
  expect(onResult).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ cleared: true }));
});

it("ships three compact 22050 Hz, 16-bit mono PCM cues", () => {
  let total = 0;
  for (const cue of ["hop", "splash", "goal"]) {
    const wav = readFileSync(`assets/arcade/crab-sfx/${cue}.wav`);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 16)).toBe("WAVEfmt ");
    expect(wav.readUInt16LE(20)).toBe(1);
    expect(wav.readUInt16LE(22)).toBe(1);
    expect(wav.readUInt32LE(24)).toBe(22_050);
    expect(wav.readUInt16LE(34)).toBe(16);
    expect(wav.readUInt32LE(40)).toBe(wav.length - 44);
    total += wav.length;
  }
  expect(total).toBeGreaterThan(25_000);
  expect(total).toBeLessThan(45_000);
});
