import React, { Profiler, useLayoutEffect, useRef } from "react";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { BallArt, Scene } from "../src/arcade/action/Art";
import { BeachBoard, PalmBoard } from "../src/arcade/action/Playfield";
import { BALL_RADIUS, PADDLE_HEIGHT } from "../src/arcade/action/arena";
import { beachLevel, beachLevels, createBeach, type BeachState } from "../src/arcade/games/beach-ball/engine";
import { beachIllustrated, BEACH_BALL_POSE_SIZE, type BeachActor } from "../src/arcade/games/beach-ball/illustrated";
import { createPalm, palmLevels } from "../src/arcade/games/palm-patrol/engine";

const runtime = vi.hoisted(() => ({
  frames: new Set<(delta: number, timestamp: number) => void>(),
  reactions: new Set<() => void>(),
  reduced: false,
}));

vi.mock("react-native", () => ({ View: "View", Image: "Image", Platform: { OS: "android" } }));
vi.mock("react-native-svg", () => ({
  default: "Svg", Circle: "Circle", Defs: "Defs", Ellipse: "Ellipse", G: "G",
  LinearGradient: "LinearGradient", Path: "Path", Rect: "Rect", Stop: "Stop",
}));
vi.mock("react-native-reanimated", () => ({
  default: { View: "AnimatedView", createAnimatedComponent: (component: unknown) => component },
  useSharedValue: (initial: unknown) => useRef({ value: initial, set(next: unknown) { this.value = next; } }).current,
  useDerivedValue: (build: () => unknown) => ({ get value() { return build(); } }),
  useAnimatedStyle: (build: () => unknown) => build,
  useAnimatedProps: (build: () => unknown) => build,
  runOnJS: (fn: unknown) => fn,
  useAnimatedReaction: <T,>(read: () => T, react: (next: T, before: T | null) => void) => {
    const before = useRef<T | null>(null);
    useLayoutEffect(() => {
      function run() {
        const next = read();
        react(next, before.current);
        before.current = next;
      }
      runtime.reactions.add(run);
      return () => { runtime.reactions.delete(run); };
    }, [read, react]);
  },
  useFrameCallback: (fn: (info: { timeSincePreviousFrame: number; timestamp: number }) => void) => {
    const subscription = useRef({ active: false, setActive(active: boolean) { this.active = active; } }).current;
    useLayoutEffect(() => {
      function run(timeSincePreviousFrame: number, timestamp: number) {
        if (subscription.active) fn({ timeSincePreviousFrame, timestamp });
      }
      runtime.frames.add(run);
      return () => { runtime.frames.delete(run); };
    }, [fn, subscription]);
    return subscription;
  },
}));
vi.mock("react-native-gesture-handler", () => {
  const builder = () => ({
    minDistance() { return this; },
    enabled() { return this; },
    onBegin(handler: unknown) { return Object.assign(this, { begin: handler }); },
    onUpdate(handler: unknown) { return Object.assign(this, { move: handler }); },
    onFinalize(handler: unknown) { return Object.assign(this, { release: handler }); },
    onTouchesDown(handler: unknown) { return Object.assign(this, { touchDown: handler }); },
    onTouchesMove(handler: unknown) { return Object.assign(this, { touchMove: handler }); },
    onTouchesUp(handler: unknown) { return Object.assign(this, { touchUp: handler }); },
    onTouchesCancelled(handler: unknown) { return Object.assign(this, { touchCancel: handler }); },
  });
  return {
    GestureDetector: "GestureDetector",
    Gesture: { Pan: builder, Manual: builder },
  };
});
vi.mock("../src/components/motion", () => ({ useReducedMotion: () => runtime.reduced }));
vi.mock("../src/components/feel", () => ({}));
vi.mock("../src/components/Text", () => ({ Text: "Text" }));
vi.mock("../src/components/ui", () => ({ Button: "Button", Heading: "Heading" }));

let tree: ReactTestRenderer | undefined;
afterEach(async () => {
  if (tree) await act(async () => tree?.unmount());
  tree = undefined;
  runtime.reduced = false;
  vi.unstubAllGlobals();
});

function host(testID: string, within = tree!.root) {
  return within.find((node) => typeof node.type === "string" && node.props.testID === testID);
}
function hostParent(node: ReactTestInstance) {
  let parent = node.parent;
  while (parent && typeof parent.type !== "string") parent = parent.parent;
  return parent!;
}
function styles(node: ReactTestInstance) {
  return Object.assign({}, ...[node.props.style].flat().map((style) => (typeof style === "function" ? style() : style)));
}

const expected = {
  ball: [320, [14, 14, 292, 292], "90c164344e8e81b908b9ef1ea7869bd6d66eea6fcce1bce4051e99503ee7f474"],
  paddle: [320, [14, 120, 292, 80], "903d664fa2c1b20f3d13bf7df79d2308530cd90515653c4c3c01b25d2f4ac343"],
} as const;
const actors = Object.keys(expected) as BeachActor[];

it("loads each literal Beach Ball WebP only on demand and matches the verified source bytes", () => {
  const require = createRequire(import.meta.url);
  for (const kind of actors) {
    const [size, ink, sourceHash] = expected[kind];
    const art = beachIllustrated[kind];
    const path = `assets/arcade/beach-ball/${kind}.webp`;
    const resolved = require.resolve(`../${path}`);
    expect(require.cache[resolved]).toBeUndefined();
    expect(art.source()).toBe(path);
    expect(require.cache[resolved]).toBeDefined();
    const bytes = readFileSync(resolved);
    expect(bytes.toString("ascii", 8, 16)).toBe("WEBPVP8X");
    expect([bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1]).toEqual([size, size]);
    expect(art.pixels).toEqual([size, size]);
    expect(art.ink).toEqual(ink);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(sourceHash);
  }
});

const play = (id: Parameters<typeof beachLevel>[0] = "w1-1", helper = false, mode: "solo" | "together" = "solo") =>
  createBeach(beachLevel(id), 42, helper, mode, "gentle");

async function start(
  initial: BeachState,
  options: { reduced?: boolean; width?: number; height?: number; helper?: boolean; names?: [string, string] } = {}
) {
  const { reduced = false, width = 360, height = 600, helper = initial.helper, names = ["Stassie", "Bibi"] } = options;
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  runtime.reduced = reduced;
  const commits = vi.fn(), onTone = vi.fn(), onResult = vi.fn();
  await act(async () => {
    tree = create(
      <Profiler id="beach" onRender={commits}>
        <BeachBoard
          initial={initial}
          active
          helper={helper}
          debug={false}
          onTone={onTone}
          onResult={onResult}
          width={width}
          height={height}
          names={names}
        />
      </Profiler>
    );
  });
  let now = 0;
  const frames = (count: number) =>
    act(async () => {
      for (let i = 0; i < count; i++) {
        const delta = 1000 / 60;
        now += delta;
        for (const frame of runtime.frames) frame(delta, now);
        for (const reaction of runtime.reactions) reaction();
      }
    });
  for (const reaction of runtime.reactions) reaction();
  const gesture = tree!.root.find((node) => String(node.type) === "GestureDetector").props.gesture;
  const manager = { begin() {}, activate() {}, end() {}, fail() {} };
  const drag = (id: number, x: number, y: number, phase: "down" | "move" | "up" = "move") => {
    const touch = { id, x, y };
    const payload = { changedTouches: [touch], allTouches: [touch] };
    if (phase === "down") gesture.touchDown(payload, manager);
    else if (phase === "move") gesture.touchMove(payload);
    else gesture.touchUp(payload, manager);
    for (const reaction of runtime.reactions) reaction();
  };
  return { commits, frames, gesture, drag, onTone, onResult };
}

it.each([
  [360, 600, false],
  [390, 844, false],
  [844, 390, false],
  [1024, 768, true],
])("preserves ink contact and pads transformed Android ball & paddle sprites at %i × %i (helper=%s)", async (width, height, helper) => {
  await start(play("w3-1", helper, "together"), { width, height, helper });
  const unit = Math.min(width / 360, height / 600);

  // Verify both illustrated beach balls
  for (const i of [0, 1]) {
    const motion = host(`beach-ball-${i}`);
    const image = host(`beach-ball-${i}-image`, motion);
    const wrapper = hostParent(motion);
    const art = styles(image), box = styles(wrapper);
    const [cx, cy] = box.transformOrigin;
    expect(image.props.source).toBe(beachIllustrated.ball.source());
    expect(image.props.resizeMode).toBe("contain");
    expect(art.width / 320).toBeCloseTo(art.height / 320, 10);
    expect(box.width).toBeGreaterThan(BEACH_BALL_POSE_SIZE * unit);
    expect(box.height).toBeGreaterThan(BEACH_BALL_POSE_SIZE * unit);
    expect(cx + box.left).toBeCloseTo((BEACH_BALL_POSE_SIZE * unit) / 2, 10);
    expect(cy + box.top).toBeCloseTo((BEACH_BALL_POSE_SIZE * unit) / 2, 10);

    const [inkX, inkY, inkW, inkH] = beachIllustrated.ball.ink;
    const pixel = art.width / 320;
    expect(inkW * pixel).toBeCloseTo(BALL_RADIUS * 2 * unit, 10);
    expect(inkH * pixel).toBeCloseTo(BALL_RADIUS * 2 * unit, 10);
    expect(art.left + (inkX + inkW / 2) * pixel).toBeCloseTo(cx, 10);
    expect(art.top + (inkY + inkH / 2) * pixel).toBeCloseTo(cy, 10);

    // Every corner of the full 320×320 image stays inside the padded Android canvas under spin + paddle/wall squash.
    const squashes: [number, number][] = [[1, 1], [1.16, 0.84], [0.85, 1.15]];
    for (const [sx, sy] of squashes) {
      for (let step = 0; step < 36; step++) {
        const angle = (step * Math.PI) / 18;
        for (const x of [art.left, art.left + art.width]) {
          for (const y of [art.top, art.top + art.height]) {
            const dx = x - cx, dy = y - cy;
            const rx = cx + (dx * Math.cos(angle) - dy * Math.sin(angle)) * sx;
            const ry = cy + (dx * Math.sin(angle) + dy * Math.cos(angle)) * sy;
            expect(rx).toBeGreaterThan(0);
            expect(rx).toBeLessThan(box.width);
            expect(ry).toBeGreaterThan(0);
            expect(ry).toBeLessThan(box.height);
          }
        }
      }
    }
  }

  // Verify both illustrated driftwood paddles
  const logicalWidth = helper ? 116 : 86;
  for (const seat of [0, 1] as const) {
    const motion = host(`beach-paddle-${seat}`);
    const image = host(`beach-paddle-${seat}-image`, motion);
    const wrapper = hostParent(motion);
    const art = styles(image), box = styles(wrapper);
    const [cx, cy] = box.transformOrigin;
    expect(image.props.source).toBe(beachIllustrated.paddle.source());
    expect(image.props.resizeMode).toBe("contain");
    expect(art.width / 320).toBeCloseTo(art.height / 320, 10);
    expect(cx + box.left).toBeCloseTo((logicalWidth * unit) / 2, 10);
    expect(cy + box.top).toBeCloseTo((PADDLE_HEIGHT * unit) / 2, 10);

    const [inkX, inkY, inkW, inkH] = beachIllustrated.paddle.ink;
    const pixel = art.width / 320;
    expect(inkW * pixel).toBeCloseTo(logicalWidth * unit, 10);
    expect(art.left + (inkX + inkW / 2) * pixel).toBeCloseTo(cx, 10);
    if (seat === 0) {
      // Bottom paddle top wood edge aligns to the exact ball contact plane (cy - PADDLE_HEIGHT/2).
      expect(art.top + inkY * pixel).toBeCloseTo(cy - (PADDLE_HEIGHT * unit) / 2, 10);
    } else {
      // Top paddle bottom wood edge aligns to the exact ball contact plane (cy + PADDLE_HEIGHT/2).
      expect(art.top + (inkY + inkH) * pixel).toBeCloseTo(cy + (PADDLE_HEIGHT * unit) / 2, 10);
    }

    const dir = seat === 0 ? 1 : -1;
    for (const dip of [-0.22, 0, 1]) {
      for (const tilt of [-0.055, 0, 0.055]) {
        for (const x of [art.left, art.left + art.width]) {
          for (const y of [art.top, art.top + art.height]) {
            const dx = (x - cx) * (1 + dip * 0.045);
            const dy = (y - cy) * (1 - dip * 0.11);
            const rx = cx + dx * Math.cos(tilt) - dy * Math.sin(tilt);
            const ry = cy + dx * Math.sin(tilt) + dy * Math.cos(tilt) + dip * dir * 4.2 * unit;
            expect(rx).toBeGreaterThan(0);
            expect(rx).toBeLessThan(box.width);
            expect(ry).toBeGreaterThan(0);
            expect(ry).toBeLessThan(box.height);
          }
        }
      }
    }
  }
});

it("drags paddle, flies ball, bounces off wall and paddle with spin/dip/glow and zero React commits", async () => {
  const base = play("w1-1");
  const initial: BeachState = {
    ...base,
    balls: [{ x: 344, y: 430, vx: 220, vy: 280, wait: 0, spin: 0, squash: 0, rally: 0 }],
    paddles: [180, 180],
  };
  const { commits, frames, drag, onTone } = await start(initial);
  await frames(1);
  const baseline = commits.mock.calls.length;

  // Move bottom paddle toward the incoming ball path after the right-wall bounce.
  await act(async () => {
    drag(1, 275, 540, "down");
    drag(1, 290, 540, "move");
  });
  await frames(2);
  // Ball hits the right wall first -> wall tone + spin advances with zero commits.
  expect(onTone).toHaveBeenCalledWith("wall", false);
  const spinBefore = styles(host("beach-ball-spin-0")).transform[0].rotate;
  expect(spinBefore).not.toBe("0rad");

  // Position paddle directly under the ball's landing path and advance until paddle impact.
  await act(async () => drag(1, 286, 540, "move"));
  await frames(16);
  expect(onTone).toHaveBeenCalledWith("shell-0", false);

  // Immediately after impact: ball squashes & glows, paddle dips & shines, spin keeps rolling.
  const ballSquash = styles(host("beach-ball-0")).transform;
  expect(ballSquash[0].scaleX).toBeGreaterThan(1);
  expect(ballSquash[1].scaleY).toBeLessThan(1);
  expect(styles(host("beach-ball-glow-0")).opacity).toBeGreaterThan(0);
  expect(styles(host("beach-ball-spin-0")).transform[0].rotate).not.toBe(spinBefore);

  const paddleTransform = styles(host("beach-paddle-0")).transform;
  expect(paddleTransform[0].translateY).not.toBe(0);
  expect(styles(host("beach-paddle-shine-0")).opacity).toBeGreaterThan(0.22);

  // Let the cushioned dip settle cleanly back to rest.
  await frames(15);
  expect(styles(host("beach-paddle-0")).transform[0].translateY).toBe(0);
  expect(styles(host("beach-paddle-0")).transform[3].scaleY).toBe(1);
  expect(styles(host("beach-ball-glow-0")).opacity).toBe(0);
  expect(commits).toHaveBeenCalledTimes(baseline);
});

it.each([false, true])("respects Reduce Motion %s on ball spin, paddle dip, turtle bump, and splash sparks", async (reduced) => {
  const base = play("w2-1");
  const initial: BeachState = {
    ...base,
    balls: [{ x: 180, y: 508, vx: 60, vy: 280, wait: 0, spin: 0, squash: 0, rally: 0 }],
    paddles: [180, 180],
  };
  const { frames, onTone } = await start(initial, { reduced });
  await frames(2);
  expect(onTone).toHaveBeenCalledWith("shell-0", false);

  const spin = styles(host("beach-ball-spin-0")).transform[0].rotate;
  const ballScaleX = styles(host("beach-ball-0")).transform[0].scaleX;
  const glow = styles(host("beach-ball-glow-0")).opacity;
  const dipY = styles(host("beach-paddle-0")).transform[0].translateY;
  const shine = styles(host("beach-paddle-shine-0")).opacity;

  expect(spin === "0rad").toBe(reduced);
  expect(ballScaleX === 1).toBe(reduced);
  expect(glow === 0).toBe(reduced);
  expect(dipY === 0).toBe(reduced);
  expect(shine === 0.22).toBe(reduced);
  expect(
    tree!.root.findAll((node) => typeof node.type === "string" && node.props.testID?.startsWith("beach-spark-")).length > 0
  ).toBe(!reduced);

  // Advance until the ball bumps the central sea turtle.
  await frames(38);
  const turtleTransform = styles(host("beach-turtle")).transform;
  if (reduced) {
    expect(turtleTransform[0].rotate).toBe("0rad");
    expect(turtleTransform[1].scaleX).toBe(1);
  } else {
    expect(onTone).toHaveBeenCalledWith("shell-1", false);
  }
});

it.each([[390, 844], [844, 390], [1024, 768], [700, 430]])(
  "fills Beach Cove backdrops with xMidYMid slice at %i × %i and renders w3 moonlit stars",
  async (width, height) => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    await act(async () => {
      tree = create(<Scene palm={false} world="w3" width={width} height={height} />);
    });
    const svg = tree!.root.find((node) => String(node.type) === "Svg");
    expect(svg.props.preserveAspectRatio).toBe("xMidYMid slice");
    expect(tree!.root.findAll((node) => String(node.type) === "Path" && node.props.fill === "#FFF2CB")).toHaveLength(5);
  }
);

it("keeps Learn count badge and two-digit score pills single-line with 1.3× font-scale safety in compact landscape", async () => {
  const learn = beachLevels.find((level) => level.id === "learn-8")!;
  const state = { ...createBeach(learn, 42), points: [4, 3] as [number, number] };
  await start(state, { width: 844, height: 328, names: ["Stassie-May", "Bibi"] });

  const badge = host("beach-learn-badge");
  const badgeText = badge.find((node) => String(node.type) === "Text");
  expect(badgeText.props.numberOfLines).toBe(1);
  expect(badgeText.props.adjustsFontSizeToFit).toBe(true);
  expect(badgeText.props.maxFontSizeMultiplier).toBe(1.3);
  expect(styles(badge).maxWidth).toBeGreaterThanOrEqual(96);

  for (const i of [0, 1]) {
    const pill = host(`beach-score-pill-${i}`);
    const pillText = pill.find((node) => String(node.type) === "Text");
    expect(pillText.props.numberOfLines).toBe(1);
    expect(pillText.props.adjustsFontSizeToFit).toBe(true);
    expect(pillText.props.maxFontSizeMultiplier).toBe(1.3);
    expect(styles(pill).maxWidth).toBeGreaterThanOrEqual(120);
    // In compact landscape (844×328), player pills move to the wide side margin clear of court paddles & bottom edge.
    const slot = styles(hostParent(pill));
    expect(slot.right).toBe(10);
    expect(i ? slot.top : slot.bottom).toBe(10);
  }

  const popText = host("beach-pop-0").find((node) => String(node.type) === "Text");
  expect(popText.props.numberOfLines).toBe(1);
  expect(popText.props.adjustsFontSizeToFit).toBe(true);
  expect(popText.props.maxFontSizeMultiplier).toBe(1.3);
});

it("renders the verified illustrated ball in BallArt and does not regress Palm Patrol", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  await act(async () => {
    tree = create(<BallArt size={60} />);
  });
  const ballImg = host("beach-ball-image");
  expect(ballImg.props.source).toBe(beachIllustrated.ball.source());

  await act(async () => {
    tree!.update(<Scene palm world="w3" width={700} height={430} />);
  });
  const palmSvg = tree!.root.find((node) => String(node.type) === "Svg");
  expect(palmSvg.props.preserveAspectRatio).toBe("xMidYMid slice");
  expect(tree!.root.findAll((node) => String(node.type) === "Path" && node.props.fill === "#FFF2CB")).toHaveLength(5);

  await act(async () => {
    tree!.update(
      <PalmBoard
        initial={createPalm(palmLevels[0], 42)}
        active
        helper={false}
        outfit="island"
        debug={false}
        onTone={vi.fn()}
        onResult={vi.fn()}
      />
    );
  });
  expect(host("palm-launcher")).toBeDefined();
  expect(host("palm-beetle-0")).toBeDefined();
});
