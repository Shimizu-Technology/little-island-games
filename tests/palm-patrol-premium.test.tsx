import React, { Profiler, useLayoutEffect, useRef } from "react";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { Scene } from "../src/arcade/action/Art";
import { PalmBoard } from "../src/arcade/action/Playfield";
import { BUG_RADIUS_X, BUG_RADIUS_Y, HUSK_RADIUS, PALM_ACTOR_SIZE } from "../src/arcade/action/arena";
import { createPalm, palmLevels, type PalmState } from "../src/arcade/games/palm-patrol/engine";
import { illustrated, type PalmActor } from "../src/arcade/games/palm-patrol/illustrated";

const runtime = vi.hoisted(() => ({
  frames: new Set<(delta: number, timestamp: number) => void>(),
  reactions: new Set<() => void>(),
  reduced: false,
}));

vi.mock("react-native", () => ({ View: "View", Image: "Image", Platform: { OS: "android" } }));
vi.mock("react-native-svg", () => ({
  default: "Svg", Circle: "Circle", ClipPath: "ClipPath", Defs: "Defs", Ellipse: "Ellipse", G: "G",
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
vi.mock("react-native-gesture-handler", () => ({
  GestureDetector: "GestureDetector",
  Gesture: {
    Pan: () => ({
      minDistance() { return this; },
      enabled() { return this; },
      onBegin(handler: unknown) { return Object.assign(this, { begin: handler }); },
      onUpdate(handler: unknown) { return Object.assign(this, { move: handler }); },
      onFinalize(handler: unknown) { return Object.assign(this, { release: handler }); },
      onTouchesDown(handler: unknown) { return Object.assign(this, { touch: handler }); },
    }),
  },
}));
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
  return within.find(node => typeof node.type === "string" && node.props.testID === testID);
}
function styles(node: ReactTestInstance) {
  return Object.assign({}, ...[node.props.style].flat().map(style => typeof style === "function" ? style() : style));
}

const expected = {
  beetle: [256, [12, 43, 232, 169], "870737b0859e8489ac8b4023f6f4dfe1a96957792f6a65dd887997a53e1a0de3"],
  boss: [320, [12, 70, 296, 179], "b8775bc578c6ca7446968592c5995ef7edbc122f9c462fa2a065738b09481a44"],
  launcher: [256, [28, 12, 200, 232], "062ccfebcdfa9eca177f5bfaa1f4f35a99bd1b80772ebd41e65ff336c6243155"],
  coconut: [192, [23, 12, 146, 168], "c0daf007b0154be6879ef82aa1f1dd791b21e75495b59dacc3bb2d9c0da8b0fa"],
} as const;
const actors = Object.keys(expected) as PalmActor[];

it("loads each literal WebP only on demand and matches the approved source bytes", () => {
  const require = createRequire(import.meta.url);
  for (const kind of actors) {
    const [size, ink, sourceHash] = expected[kind];
    const art = illustrated[kind], path = `assets/arcade/palm-patrol/${kind}.webp`;
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

const play = () => createPalm(palmLevels[0], 42);
async function start(initial: PalmState, reduced = false, width = 360, height = 600) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  runtime.reduced = reduced;
  const commits = vi.fn(), onTone = vi.fn(), onResult = vi.fn();
  await act(async () => {
    tree = create(<Profiler id="palm" onRender={commits}>
      <PalmBoard initial={initial} active helper={false} outfit="sunhat" debug={false} onTone={onTone} onResult={onResult} width={width} height={height} />
    </Profiler>);
  });
  let now = 0;
  const frames = (count: number) => act(async () => {
    for (let i = 0; i < count; i++) {
      const delta = 1000 / 60;
      now += delta;
      for (const frame of runtime.frames) frame(delta, now);
      for (const reaction of runtime.reactions) reaction();
    }
  });
  for (const reaction of runtime.reactions) reaction();
  const gesture = tree!.root.find(node => String(node.type) === "GestureDetector").props.gesture;
  const press = (x: number) => { gesture.touch(); gesture.begin({ x, y: 550 }); };
  return { commits, frames, gesture, press, onTone, onResult };
}

function mountedActor(kind: PalmActor) {
  const id = kind === "launcher" ? "palm-launcher" : `palm-${kind}-0`;
  const actor = host(id);
  return { image: host(`palm-${kind}-image`, actor), wrapper: actor.parent! };
}

it.each([[360, 600], [393, 560], [880, 410]])("preserves ink contact and pads transformed Android sprites at %i × %i", async (width, height) => {
  await start(play(), false, width, height);
  const unit = Math.min(width / 360, height / 600);
  for (const kind of actors) {
    const { image, wrapper } = mountedActor(kind);
    const art = styles(image), box = styles(wrapper);
    const [cx, cy] = box.transformOrigin;
    expect(image.props.source).toBe(illustrated[kind].source());
    expect(image.props.resizeMode).toBe("contain");
    expect(art.width / illustrated[kind].pixels[0]).toBeCloseTo(art.height / illustrated[kind].pixels[1], 10);
    expect(box.width).toBeGreaterThan(PALM_ACTOR_SIZE[kind] * unit);
    expect(box.height).toBeGreaterThan(PALM_ACTOR_SIZE[kind] * unit);
    expect(cx + box.left).toBeCloseTo(PALM_ACTOR_SIZE[kind] * unit / 2, 10);
    expect(cy + box.top).toBeCloseTo(PALM_ACTOR_SIZE[kind] * unit / 2, 10);

    const [inkX, inkY, inkW, inkH] = illustrated[kind].ink;
    const pixel = art.width / illustrated[kind].pixels[0], inkBottom = art.top + (inkY + inkH) * pixel;
    expect(art.left + (inkX + inkW / 2) * pixel).toBeCloseTo(cx, 10);
    if (kind === "beetle" || kind === "boss") {
      const crown = kind === "boss" ? 1.5 : 1;
      expect(inkW * pixel).toBeCloseTo(BUG_RADIUS_X * 2 * crown * unit, 10);
      expect(inkBottom - cy).toBeCloseTo(BUG_RADIUS_Y * crown * unit, 10);
    }
    if (kind === "coconut") {
      expect(inkH * pixel).toBeCloseTo(HUSK_RADIUS * 2 * unit, 10);
      expect(inkBottom - cy).toBeCloseTo(HUSK_RADIUS * unit, 10);
    }

    const angles = kind === "coconut" ? Array.from({ length: 72 }, (_, i) => i * Math.PI / 36) : [-0.41, 0, 0.41];
    for (const recoil of kind === "launcher" ? [-0.35, 0, 1] : [0]) {
      for (const angle of angles) {
        for (const x of [art.left, art.left + art.width]) {
          for (const y of [art.top, art.top + art.height]) {
            const dx = (x - cx) * (1 + recoil * 0.032);
            const dy = (y - cy) * (1 - recoil * 0.12) + recoil * 3.2 * unit;
            const rx = cx + dx * Math.cos(angle) - dy * Math.sin(angle);
            const ry = cy + dx * Math.sin(angle) + dy * Math.cos(angle);
            expect(rx).toBeGreaterThan(0);
            expect(rx).toBeLessThan(box.width);
            expect(ry).toBeGreaterThan(0);
            expect(ry).toBeLessThan(box.height);
          }
        }
      }
    }
  }
  expect(host("palm-outfit-sunhat")).toBeDefined();
});

it("moves, tosses repeatedly, plays each sound, and settles the recoil with zero React commits", async () => {
  const { commits, frames, gesture, press, onTone } = await start(play());
  await frames(1);
  const baseline = commits.mock.calls.length;
  await act(async () => press(28));
  await frames(1);
  const launcher = () => styles(mountedActor("launcher").wrapper).transform[0].translateX;
  const recoil = () => styles(host("palm-recoil")).transform[2].scaleY;
  expect(launcher()).toBeCloseTo(28 - PALM_ACTOR_SIZE.launcher / 2, 5);
  expect(recoil()).toBeLessThan(0.91);
  const coconut = () => styles(mountedActor("coconut").wrapper);
  expect(coconut().opacity).toBe(1);
  const rotation = coconut().transform[2].rotate;
  await frames(6);
  expect(recoil()).toBeGreaterThan(1);
  expect(coconut().transform[2].rotate).not.toBe(rotation);
  await act(async () => gesture.move({ x: 34, y: 550 }));
  await frames(24);
  expect(launcher()).toBeCloseTo(34 - PALM_ACTOR_SIZE.launcher / 2, 5);
  expect(onTone.mock.calls).toEqual([["coral", false], ["coral", false], ["coral", false]]);
  await act(async () => gesture.release());
  await frames(15);
  expect(recoil()).toBe(1);
  expect(commits).toHaveBeenCalledTimes(baseline);
  expect(onTone.mock.calls).toHaveLength(3);
});

it.each([false, true])("keeps boss damage feedback with Reduce Motion %s", async reduced => {
  const state = play();
  const boss = { ...state.beetles[0], x: 180, base: 180, y: 120, boss: true, hp: 2 };
  const { frames, press, onTone } = await start({
    ...state,
    beetles: [boss],
    husks: [{ x: 180, y: 164, bounced: false }],
  }, reduced);
  await frames(2);
  expect(onTone.mock.calls).toEqual([["shell-2", true]]);
  expect(tree!.root.findAll(node => String(node.type) === "Text" && node.props.children === "Bonk!")).toHaveLength(1);
  const flash = () => styles(host("palm-boss-flash")).opacity;
  const angle = () => styles(mountedActor("boss").wrapper).transform[2].rotate;
  expect(flash() > 0).toBe(!reduced);
  expect(angle() === "0rad").toBe(reduced);
  if (reduced) {
    expect(tree!.root.findAll(node => String(node.type) === "View" && node.props.testID?.startsWith("palm-spark-"))).toHaveLength(0);
  } else {
    expect(styles(host("palm-spark-1").parent!).opacity).toBeGreaterThan(0);
  }
  await frames(12);
  expect(flash()).toBe(0);
  await act(async () => press(180));
  await frames(1);
  expect(styles(host("palm-recoil")).transform[2].scaleY === 1).toBe(reduced);
  expect(styles(mountedActor("coconut").wrapper).transform[2].rotate === "0rad").toBe(reduced);
});

it.each([false, true])("nets the last beetle and reports the result with Reduce Motion %s", async reduced => {
  const state = play();
  const beetle = { ...state.beetles[0], x: 180, base: 180, y: 120 };
  const { frames, onTone, onResult } = await start({
    ...state,
    beetles: [beetle],
    husks: [{ x: 180, y: 147, bounced: false }],
  }, reduced);
  await frames(2);
  const transform = () => styles(mountedActor("beetle").wrapper).transform;
  const hitPosition = transform()[1].translateY;
  expect(onTone.mock.calls).toEqual([["clear", true]]);
  await frames(5);
  expect(transform()[1].translateY < hitPosition).toBe(!reduced);
  expect(transform()[2].rotate === "0rad").toBe(reduced);
  await frames(30);
  expect(onResult).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ cleared: true, score: 40 }), false);
});

it("shows Number Grove answers over the beetles and keeps wrong-answer feedback", async () => {
  const learn = createPalm(palmLevels.find(level => level.world === "learn")!, 42);
  const wrong = learn.beetles.find(beetle => beetle.value !== learn.answer)!;
  const { frames, onTone } = await start({ ...learn, husks: [{ x: wrong.x, y: 181, bounced: false }] }, true);
  await frames(2);
  for (const b of learn.beetles) {
    const badge = host(`palm-answer-${b.id}`);
    expect(styles(badge).backgroundColor).toBe("#17382D");
    const heading = badge.find(node => String(node.type) === "Text");
    expect(heading.props.children).toBe(b.value);
    expect(styles(heading).color).toBe("#FFF4CD");
    expect(styles(badge.parent!).height - styles(badge).top).toBeGreaterThan(styles(heading).fontSize * heading.props.maxFontSizeMultiplier);
  }
  expect(tree!.root.findAll(node => String(node.type) === "Text" && node.props.children === "Try another")).toHaveLength(1);
  expect(onTone.mock.calls).toEqual([["shell-2", true]]);
});


it.each([[390, 844], [844, 390], [1024, 768], [700, 430]])("fills Palm Grove backdrops at %i × %i and restores Moonlit Grove stars", async (width, height) => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  await act(async () => { tree = create(<Scene palm world="w3" width={width} height={height} />); });
  const svg = tree!.root.find(node => String(node.type) === "Svg");
  expect(svg.props.preserveAspectRatio).toBe("xMidYMid slice");
  expect(tree!.root.findAll(node => String(node.type) === "Path" && node.props.fill === "#FFF2CB")).toHaveLength(5);
});

it("keeps learn-8 two-digit answers on one line with large-text clearance in compact landscape", async () => {
  const level = palmLevels.find(level => level.id === "learn-8")!;
  const learn = Array.from({ length: 100 }, (_, seed) => createPalm(level, seed * 104729))
    .find(state => state.beetles.some(beetle => beetle.value === 21))!;
  expect(learn.beetles.some(beetle => beetle.value === 21)).toBe(true);
  await start(learn, false, 844, 328);
  const scale = 328 / 600;
  for (const beetle of learn.beetles) {
    const badge = host(`palm-answer-${beetle.id}`), box = styles(badge);
    const text = badge.find(node => String(node.type) === "Text");
    expect(text.props.children).toBe(beetle.value);
    expect(box.width).toBeCloseTo(50 * scale);
    expect(box.left).toBeCloseTo(4 * scale);
    expect(text.props.numberOfLines).toBe(1);
    expect(text.props.adjustsFontSizeToFit).toBe(true);
    expect(text.props.maxFontSizeMultiplier).toBe(1.3);
    expect(styles(badge.parent!).height - box.top).toBeGreaterThan(styles(text).lineHeight * 1.3 + 2 * box.borderWidth);
  }
});
