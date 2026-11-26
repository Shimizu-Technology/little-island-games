import React, { Profiler, useRef } from "react";
import { readFileSync } from "node:fs";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import type { SharedValue } from "react-native-reanimated";
import { afterEach, expect, it, vi } from "vitest";
import { RailArt, RailFern } from "../src/arcade/games/grid/RailArt";
import { COLLECT_MS, NEST_MS, RailCollectible } from "../src/arcade/games/rail-parade/RailMotion";
import { RailBoard } from "../src/arcade/games/rail-parade/View";
import { createRail, railLevel, type RailState } from "../src/arcade/games/rail-parade/engine";
import { illustrated, railActorFrame } from "../src/arcade/games/rail-parade/illustrated";
import type { SpritePose } from "../src/arcade/poses";
import type { Direction } from "../src/arcade/games/grid/rules";

type Mutable = { value: unknown; set(next: unknown): void };
const probe = vi.hoisted(() => ({
  poses: undefined as SharedValue<SpritePose[]> | undefined,
  reduced: vi.fn(() => false),
  timing: vi.fn(),
  move: undefined as ((d: Direction) => void) | undefined,
  screenReader: false,
  screenReaderListeners: new Set<(enabled: boolean) => void>(),
}));

vi.mock("react-native", () => ({
  View: "View",
  Image: "Image",
  Platform: { OS: "android" },
  AccessibilityInfo: {
    isScreenReaderEnabled: () => Promise.resolve(probe.screenReader),
    addEventListener: (_event: string, listener: (enabled: boolean) => void) => {
      probe.screenReaderListeners.add(listener);
      return {
        remove: () => {
          probe.screenReaderListeners.delete(listener);
        },
      };
    },
  },
}));
vi.mock("react-native-svg", () => ({ default: "Svg", Circle: "Circle", Ellipse: "Ellipse", G: "G", Path: "Path", Rect: "Rect" }));
vi.mock("react-native-reanimated", () => ({
  default: { View: "AnimatedView" },
  useSharedValue: (value: unknown) => {
    const shared = useRef<Mutable>({
      value,
      set(next) {
        // Keep one-shot bursts on their initial frame until simulated time advances.
        if (!(next && typeof next === "object" && "timing" in next)) this.value = next;
      },
    }).current;
    if (Array.isArray(value)) probe.poses = shared as SharedValue<SpritePose[]>;
    return shared;
  },
  useAnimatedStyle: (style: () => unknown) => style,
  useAnimatedReaction: () => {},
  useFrameCallback: () => {},
  cancelAnimation: () => {},
  withTiming: (timing: number, config: unknown) => {
    probe.timing(config);
    return { timing };
  },
  withRepeat: (value: unknown) => value,
  withSequence: (first: unknown) => first,
}));
vi.mock("expo-router", () => ({ useFocusEffect: () => {} }));
vi.mock("../src/components/motion", () => ({ useReducedMotion: probe.reduced }));
vi.mock("../src/components/Text", () => ({ Text: "Text" }));
vi.mock("../src/components/ui", () => ({ Button: "Button", Copy: "Copy" }));
vi.mock("../src/learn/art/Objects", () => ({ PictureObject: () => null }));
vi.mock("../src/arcade/Art", () => ({ StarDisplay: () => null }));
vi.mock("../src/arcade/games/grid/Art", () => ({ GridBackdrop: () => null, GridObject: () => null }));
vi.mock("../src/arcade/games/grid/Controls", () => ({
  DirectionPad: ({ onMove }: { onMove: (d: Direction) => void }) => {
    probe.move = onMove;
    return null;
  },
  GridBudget: () => null,
  Shake: ({ children }: { children: React.ReactNode }) => children,
  useGridInput: () => ({}),
}));

let tree: ReactTestRenderer | undefined;
afterEach(async () => {
  if (tree) await act(async () => tree!.unmount());
  tree = undefined;
  probe.poses = undefined;
  probe.move = undefined;
  probe.screenReader = false;
  probe.screenReaderListeners.clear();
  probe.reduced.mockReset().mockReturnValue(false);
  probe.timing.mockClear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function host(testID: string) {
  return tree!.root.find((node) => typeof node.type === "string" && node.props.testID === testID);
}
function styles(node: ReactTestInstance) {
  return Object.assign({}, ...[node.props.style].flat().map((style) => (typeof style === "function" ? style() : style)));
}

const expectedInk = {
  rail: [12, 22, 232, 211],
  chick: [22, 12, 211, 232],
  mango: [12, 17, 232, 221],
  fern: [12, 24, 232, 208],
  nest: [12, 36, 232, 183],
} as const;

it("resolves all five shipped WebPs lazily with exact ink bounds and uniform contact-line framing", () => {
  for (const name of Object.keys(expectedInk) as (keyof typeof expectedInk)[]) {
    const art = illustrated[name];
    const path = `assets/arcade/rail-parade/${name}.webp`;
    expect(typeof art.source).toBe("function");
    expect(art.source()).toBe(path);
    const webp = readFileSync(path);
    expect(webp.toString("ascii", 8, 16)).toBe("WEBPVP8X");
    const pixels = [webp.readUIntLE(24, 3) + 1, webp.readUIntLE(27, 3) + 1];
    expect(pixels).toEqual([256, 256]);
    expect(art.pixels).toEqual(pixels);
    expect(art.ink).toEqual(expectedInk[name]);

    for (const [width, height] of [
      [38, 38],
      [64, 48],
      [44, 72],
    ]) {
      for (const left of [false, true]) {
        const contact = height * 0.92;
        const frame = railActorFrame(art, width, height, contact, left);
        const scale = frame.width / pixels[0];
        expect(frame.height / pixels[1]).toBeCloseTo(scale);
        expect(frame.transform).toEqual([{ scaleX: left ? -1 : 1 }]);
        const [x, y, inkWidth, inkHeight] = art.ink;
        const inkLeft = frame.left + scale * (left ? pixels[0] - x - inkWidth : x);
        const inkTop = frame.top + y * scale;
        expect(inkLeft).toBeGreaterThanOrEqual(-1e-8);
        expect(inkLeft + inkWidth * scale).toBeLessThanOrEqual(width + 1e-8);
        expect(inkLeft + (inkWidth * scale) / 2).toBeCloseTo(width / 2);
        expect(inkTop).toBeGreaterThanOrEqual(-1e-8);
        expect(inkTop + inkHeight * scale).toBeCloseTo(contact);
      }
    }
  }
});

it("renders illustrated RailArt, outfit badges, RailFern, and RailCollectible actors", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  await act(async () => {
    tree = create(
      <>
        <RailArt size={44} chick={false} outfit="sunhat" />
        <RailArt size={36} chick outfit="island" />
        <RailFern size={40} />
        <RailCollectible kind="mango" size={38} active reduced />
        <RailCollectible kind="nest" size={42} active reduced />
      </>
    );
  });
  expect(host("rail-rilla-art").props.source).toBe(illustrated.rail.source());
  expect(host("rail-rilla-art").props.resizeMode).toBe("contain");
  expect(host("rail-outfit-sunhat")).toBeDefined();
  expect(host("rail-chick-art").props.source).toBe(illustrated.chick.source());
  expect(host("rail-fern-art").props.source).toBe(illustrated.fern.source());
  expect(host("rail-mango-art").props.source).toBe(illustrated.mango.source());
  expect(host("rail-nest-art").props.source).toBe(illustrated.nest.source());
});

const viewport = { size: 393, height: 740, wide: false };
async function start(initial: RailState, reduced = false) {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  probe.reduced.mockReturnValue(reduced);
  let now = 0;
  let scheduled: FrameRequestCallback | undefined;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    scheduled = callback;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    scheduled = undefined;
  });
  const frames = async (count: number) =>
    act(async () => {
      for (let i = 0; i < count; i++) {
        now += 1000 / 60;
        scheduled?.(now);
      }
    });
  const commits = vi.fn();
  const onTone = vi.fn();
  const onResult = vi.fn();
  await act(async () => {
    tree = create(
      <Profiler id="rail" onRender={commits}>
        <RailBoard
          initial={initial}
          active
          helper={initial.helper}
          outfit="explorer"
          debug={false}
          onTone={onTone}
          onResult={onResult}
          {...viewport}
        />
      </Profiler>
    );
  });
  await frames(1);
  return { frames, commits, onTone, onResult };
}

it("moves, turns, flips left, and waddles with zero React commits", async () => {
  const initial: RailState = {
    ...createRail(railLevel("w2-1"), 120),
    food: { x: 9, y: 0 },
  };
  const { frames, commits, onTone } = await start(initial);
  const baseline = commits.mock.calls.length;
  const ferns = tree!.root.findAll((node) => typeof node.type === "string" && node.props.testID === "rail-fern-art");
  expect(ferns).toHaveLength(2);
  for (const fern of ferns) expect(fern.props.source).toBe(illustrated.fern.source());
  expect(host("rail-mango-art").props.source).toBe(illustrated.mango.source());
  expect(host("rail-outfit-explorer")).toBeDefined();
  expect(styles(host("rail-ready-prompt")).opacity).toBe(1);

  const world = host("rail-world");
  await act(async () => {
    world.props.onTouchStart();
    probe.move!("up");
    probe.move!("left");
    world.props.onTouchEnd();
  });
  expect(onTone.mock.calls).toEqual([
    ["rail-step", false],
    ["rail-step", false],
  ]);

  // Step through multiple grid ticks (up then left) without collecting or bumping.
  await frames(40);
  expect(styles(host("rail-ready-prompt")).opacity).toBe(0);
  expect(probe.poses!.value[0].angle).not.toBe(0);
  expect(styles(host("rail-rilla-body")).transform[0].scaleX).toBeLessThan(0);
  expect(commits).toHaveBeenCalledTimes(baseline);
});

it("pads the full Android canvas for Rilla and chicks under worst-case bounce, tilt, and left mirror", async () => {
  const initial = createRail(railLevel("w2-1"), 120);
  await start(initial);

  for (const [artId, bodyId] of [
    ["rail-rilla-art", "rail-rilla-body"],
    ["rail-chick-art-1", "rail-chick-body-1"],
  ] as const) {
    const image = host(artId);
    const body = host(bodyId);
    const wrapper = body.parent!;
    const box = styles(wrapper);
    const inner = styles(body);
    const art = styles(image);
    const [cx, cy] = box.transformOrigin;
    const [ox, oy] = inner.transformOrigin;
    expect(box.width).toBeGreaterThan(inner.width);
    expect(box.height).toBeGreaterThan(inner.height);

    for (const scaleX of [-1.03, -0.97, 0.97, 1.03]) {
      for (const scaleY of [1, 1.05]) {
        for (const angle of [-0.135, 0.135]) {
          for (const x of [art.left, art.left + art.width]) {
            for (const y of [art.top, art.top + art.height]) {
              const dx = inner.left + ox + (x - ox) * scaleX - cx;
              const dy = inner.top + oy + (y - oy) * scaleY - cy;
              const px = cx + 1.04 * (dx * Math.cos(angle) - dy * Math.sin(angle));
              const py = cy + 1.04 * (dx * Math.sin(angle) + dy * Math.cos(angle));
              expect(px).toBeGreaterThan(0);
              expect(px).toBeLessThan(box.width);
              expect(py).toBeGreaterThan(0);
              expect(py).toBeLessThan(box.height);
            }
          }
        }
      }
    }
  }
});

it.each([false, true])("triggers mango sparkle burst and nest celebration pop respecting Reduce Motion (%s)", async (reduced) => {
  const level = railLevel("w1-1");
  const base = createRail(level, 120);
  const nearCollect: RailState = {
    ...base,
    food: { x: 3, y: 7 },
    collected: 0,
    score: 0,
  };
  const run = await start(nearCollect, reduced);
  await act(async () => probe.move!("right"));
  await run.frames(18);
  expect(run.onTone).toHaveBeenCalledWith("rail-chirp", true);
  if (reduced) {
    expect(probe.poses!.value[0].angle).toBe(0);
    expect(styles(host("rail-rilla-body")).transform[1].scaleY).toBe(1);
    expect(tree!.root.findAll((node) => typeof node.props.testID === "string" && node.props.testID.endsWith("-burst"))).toHaveLength(0);
    expect(probe.timing).not.toHaveBeenCalledWith({ duration: COLLECT_MS });
  } else {
    expect(styles(host("rail-collect-burst")).opacity).toBeGreaterThan(0);
    expect(probe.timing).toHaveBeenCalledWith({ duration: COLLECT_MS });
  }

  await act(async () => tree!.unmount());
  tree = undefined;
  probe.timing.mockClear();

  const atGoalNest: RailState = {
    ...base,
    collected: level.target - 1,
    score: (level.target - 1) * 40,
    moves: 10,
    food: { x: 3, y: 7 },
  };
  const goal = await start(atGoalNest, reduced);
  expect(host("rail-nest-art").props.source).toBe(illustrated.nest.source());
  await act(async () => {
    host("rail-world").props.onTouchStart();
    probe.move!("right");
  });
  await goal.frames(18);
  expect(goal.onTone).toHaveBeenCalledWith("rail-nest", true);
  if (reduced) {
    expect(probe.poses!.value[0].angle).toBe(0);
    expect(probe.timing).not.toHaveBeenCalledWith({ duration: NEST_MS });
  } else {
    expect(styles(host("rail-nest-burst")).opacity).toBeGreaterThan(0);
    expect(probe.timing).toHaveBeenCalledWith({ duration: NEST_MS });
  }
  await act(async () => {
    await vi.advanceTimersByTimeAsync(350);
  });
  expect(goal.onResult).not.toHaveBeenCalled();
  await act(async () => host("rail-world").props.onTouchEnd());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(350);
  });
  expect(goal.onResult).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ cleared: true }));
});

it("ships three compact 22050 Hz, 16-bit mono PCM cues", () => {
  let total = 0;
  for (const cue of ["step", "chirp", "nest"]) {
    const wav = readFileSync(`assets/arcade/rail-sfx/${cue}.wav`);
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

it("updates the star HUD when crossing par in W1-1 while keeping within-tier steps at zero commits", async () => {
  const level = railLevel("w1-1");
  const initial: RailState = {
    ...createRail(level, 120),
    food: { x: 9, y: 0 },
    moves: level.par - 1,
    direction: "right",
  };
  const { frames, commits } = await start(initial);
  const baseline = commits.mock.calls.length;
  expect(host("rail-star-hud").props.accessibilityLabel).toBe("Star goal 3 of 3, score 0");

  // Step 1: moves goes from par - 1 to par (still 3 stars -> 0 commits).
  await frames(16);
  expect(commits).toHaveBeenCalledTimes(baseline);
  expect(host("rail-star-hud").props.accessibilityLabel).toBe("Star goal 3 of 3, score 0");

  // Step 2: moves goes from par to par + 1 (crosses par into 2 stars -> publishes immediately).
  await frames(16);
  expect(commits).toHaveBeenCalledTimes(baseline + 1);
  expect(host("rail-star-hud").props.accessibilityLabel).toBe("Star goal 2 of 3, score 0");

  // Step 3: moves goes from par + 1 to par + 2 (stays in 2-star tier -> 0 additional commits).
  await frames(16);
  expect(commits).toHaveBeenCalledTimes(baseline + 1);
  expect(host("rail-star-hud").props.accessibilityLabel).toBe("Star goal 2 of 3, score 0");
});

it.each(["onTouchEnd", "onTouchCancel"] as const)(
  "defers clear result when a touch is held across the 320 ms delay and fires once on %s",
  async (releaseEvent) => {
    const level = railLevel("w1-1");
    const atGoalNest: RailState = {
      ...createRail(level, 120),
      collected: level.target - 1,
      score: (level.target - 1) * 40,
      moves: 10,
      food: { x: 3, y: 7 },
    };
    const { frames, onResult } = await start(atGoalNest);

    // Clear the level with no finger held down so the 320 ms celebration timer starts.
    await act(async () => probe.move!("right"));
    await frames(18);
    expect(onResult).not.toHaveBeenCalled();

    // Press and hold during the 320 ms delay, then let the timer elapse while held.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120);
      host("rail-world").props.onTouchStart();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(onResult).not.toHaveBeenCalled();

    // Release or cancel delivers the stashed result immediately and exactly once.
    await act(async () => host("rail-world").props[releaseEvent]());
    expect(onResult).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ cleared: true }));

    // Subsequent release/cancel or elapsed timers must not duplicate onResult.
    await act(async () => {
      host("rail-world").props.onTouchCancel();
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(onResult).toHaveBeenCalledTimes(1);
  }
);

it("exposes live playfield coordinates for screen readers and clears Learn feedback messages immediately", async () => {
  // Learn mode (screen reader off): decoy warning appears and clears on the next clean step.
  const learnInitial: RailState = {
    ...createRail(railLevel("learn-1"), 120),
    food: { x: 9, y: 0 },
    decoy: { x: 3, y: 7 },
  };
  const learnRun = await start(learnInitial);
  expect(host("rail-playfield").props.accessibilityLabel).toContain("Rilla at column 3, row 8.");
  expect(host("rail-playfield").props.accessibilityLabel).toContain("Tile 1 at column 10, row 1.");
  expect(host("rail-playfield").props.accessibilityLabel).toContain("0 steps");

  await act(async () => probe.move!("right"));
  expect(host("rail-playfield").props.accessibilityLabel).toContain("Find 1 first");

  await act(async () => probe.move!("up"));
  const clearedLabel = host("rail-playfield").props.accessibilityLabel as string;
  expect(clearedLabel).not.toContain("Find 1 first");
  expect(clearedLabel).toContain("Rilla at column 3, row 7.");
  expect(clearedLabel).toContain("1 steps");

  const afterClearCommits = learnRun.commits.mock.calls.length;
  await act(async () => probe.move!("up"));
  expect(learnRun.commits).toHaveBeenCalledTimes(afterClearCommits);

  await act(async () => tree!.unmount());
  tree = undefined;

  // Scored mode with screen reader enabled: live coordinates update on every grid step.
  probe.screenReader = true;
  const scoredInitial: RailState = {
    ...createRail(railLevel("w2-1"), 120),
    food: { x: 9, y: 0 },
  };
  const scoredRun = await start(scoredInitial);
  expect(host("rail-playfield").props.accessibilityLabel).toContain("Rilla at column 3, row 8.");
  expect(host("rail-playfield").props.accessibilityLabel).toContain("Mango at column 10, row 1.");

  await act(async () => probe.move!("up"));
  await scoredRun.frames(16);
  const liveLabel = host("rail-playfield").props.accessibilityLabel as string;
  expect(liveLabel).toContain("Rilla at column 3, row 7.");
  expect(liveLabel).toContain("1 steps");
});

it.each([false, true])(
  "keeps Rilla unclipped at legal edge columns (col 1 and col 10) while clipping the rounded backdrop (%s)",
  async (reduced) => {
    const level = railLevel("w1-1");
    const boardSize = viewport.size - 12;
    const unit = (boardSize - 6) / 10;
    const stageLeftInWorld = (viewport.size - boardSize) / 2 + 3;
    const [inkX, inkY, inkW, inkH] = illustrated.rail.ink;
    const [pxW, pxH] = illustrated.rail.pixels;

    for (const edge of [
      {
        body: [
          { x: 0, y: 7 },
          { x: 1, y: 7 },
          { x: 2, y: 7 },
        ],
        direction: "left" as const,
      },
      {
        body: [
          { x: 9, y: 7 },
          { x: 8, y: 7 },
          { x: 7, y: 7 },
        ],
        direction: "right" as const,
      },
    ]) {
      const initial: RailState = {
        ...createRail(level, 120),
        body: edge.body,
        previous: edge.body,
        direction: edge.direction,
        food: { x: 5, y: 3 },
      };
      await start(initial, reduced);

      const frameStyle = styles(host("rail-playfield-frame"));
      expect(frameStyle.overflow).toBe("hidden");
      expect(frameStyle.borderRadius).toBe(25);

      const stageStyle = styles(host("rail-playfield-stage"));
      expect(stageStyle.left).toBe(3);
      expect(stageStyle.top).toBe(3);
      expect(stageStyle.width).toBe(boardSize - 6);
      expect(stageStyle.height).toBe(boardSize - 6);
      expect(stageStyle.overflow).toBe("visible");

      // Walk every ancestor of Rilla up to rail-world and confirm none clips overflow.
      const image = host("rail-rilla-art");
      let cursor: ReactTestInstance | null = image.parent;
      while (cursor) {
        if (typeof cursor.type === "string" && cursor.props.style) {
          expect(styles(cursor).overflow).not.toBe("hidden");
        }
        if (cursor.props?.testID === "rail-world") break;
        cursor = cursor.parent;
      }

      const pose = probe.poses!.value[0];
      const body = host("rail-rilla-body");
      const wrapper = body.parent!;
      const box = styles(wrapper);
      const inner = styles(body);
      const art = styles(image);
      const [cx, cy] = box.transformOrigin;
      const [ox, oy] = inner.transformOrigin;
      const artScaleX = art.width / pxW;
      const artScaleY = art.height / pxH;
      const inkLeft = art.left + inkX * artScaleX;
      const inkRight = inkLeft + inkW * artScaleX;
      const inkTop = art.top + inkY * artScaleY;
      const inkBottom = inkTop + inkH * artScaleY;

      const scalesX = reduced ? [-1, 1] : [-1.03, -0.97, 0.97, 1.03];
      const scalesY = reduced ? [1] : [1, 1.05];
      const angles = reduced ? [0] : [-0.135, 0.135];
      const outerScale = reduced ? 1 : 1.04;

      for (const scaleX of scalesX) {
        for (const scaleY of scalesY) {
          for (const angle of angles) {
            for (const x of [inkLeft, inkRight]) {
              for (const y of [inkTop, inkBottom]) {
                const dx = inner.left + ox + (x - ox) * scaleX - cx;
                const dy = inner.top + oy + (y - oy) * scaleY - cy;
                const px = cx + outerScale * (dx * Math.cos(angle) - dy * Math.sin(angle));
                const py = cy + outerScale * (dx * Math.sin(angle) + dy * Math.cos(angle));
                // Unclipped inside the padded Android sprite box.
                expect(px).toBeGreaterThan(0);
                expect(px).toBeLessThan(box.width);
                expect(py).toBeGreaterThan(0);
                expect(py).toBeLessThan(box.height);
                // Unclipped inside the horizontal viewport bounds at col 1 and col 10.
                const worldX = stageLeftInWorld + pose.x + box.left + px;
                expect(worldX).toBeGreaterThan(0);
                expect(worldX).toBeLessThan(viewport.size);
              }
            }
          }
        }
      }

      expect(Math.abs(pose.x + inner.width / 2 - (edge.body[0].x + 0.5) * unit)).toBeLessThan(1e-6);

      await act(async () => tree!.unmount());
      tree = undefined;
    }
  }
);
