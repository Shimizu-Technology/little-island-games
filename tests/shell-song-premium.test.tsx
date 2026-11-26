import React, { useRef } from "react";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSong, songLevel, songStep, type SongState } from "../src/arcade/games/shell-song/engine";
import {
  illustrated,
  shellArt,
  shellArts,
  shellImageFrame,
  shellStageMetrics,
  type ShellId,
} from "../src/arcade/games/shell-song/illustrated";
import { computeSongBoardLayout, SingingShell, SongBoard } from "../src/arcade/games/shell-song/View";

const probe = vi.hoisted(() => ({
  reduced: vi.fn(() => false),
  timing: vi.fn(),
  spring: vi.fn(),
  repeat: vi.fn(),
  sequence: vi.fn(),
  window: { width: 390, height: 844 },
}));

vi.mock("react-native", () => ({
  View: "View",
  Image: "Image",
  Platform: { OS: "android" },
  StyleSheet: {
    absoluteFill: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
    flatten: (style: unknown) => style,
  },
  useWindowDimensions: () => probe.window,
}));
vi.mock("react-native-svg", () => ({
  default: "Svg",
  Circle: "Circle",
  Ellipse: "Ellipse",
  Path: "Path",
  Rect: "Rect",
}));
vi.mock("react-native-reanimated", () => ({
  default: { View: "AnimatedView" },
  Easing: {
    quad: "quad",
    cubic: "cubic",
    sin: "sin",
    out: (fn: unknown) => fn,
    inOut: (fn: unknown) => fn,
  },
  useSharedValue: (value: unknown) => useRef({ value }).current,
  useAnimatedStyle: (style: () => unknown) => style,
  cancelAnimation: () => {},
  withTiming: (toValue: number, config?: unknown) => {
    probe.timing(toValue, config);
    return toValue;
  },
  withSpring: (toValue: number, config?: unknown) => {
    probe.spring(toValue, config);
    return toValue;
  },
  withRepeat: (animation: unknown, count?: number, reverse?: boolean) => {
    probe.repeat(animation, count, reverse);
    return animation;
  },
  withSequence: (...animations: unknown[]) => {
    probe.sequence(animations);
    return animations[0];
  },
}));
vi.mock("expo-router", () => ({ useFocusEffect: () => {} }));
vi.mock("../src/components/motion", () => ({ useReducedMotion: probe.reduced }));
vi.mock("../src/components/Icon", () => ({ Icon: "Icon" }));
vi.mock("../src/components/ui", () => ({
  Button: "Button",
  Copy: "Copy",
  Heading: "Heading",
  PressableScale: "PressableScale",
}));
vi.mock("../src/learn/art/Objects", () => ({ PictureObject: "PictureObject" }));
vi.mock("../src/arcade/Juice", () => ({
  Hero: "Hero",
  HudPill: "HudPill",
  MiniStars: "MiniStars",
}));
vi.mock("../src/arcade/LivesHud", () => ({
  HeartsHud: "HeartsHud",
  HitReaction: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("../src/arcade/Input", () => ({
  PressControl: "PressControl",
  PlayButton: "PlayButton",
}));

let tree: ReactTestRenderer | undefined;
afterEach(async () => {
  if (tree) await act(async () => tree!.unmount());
  tree = undefined;
  probe.reduced.mockReset().mockReturnValue(false);
  probe.timing.mockClear();
  probe.spring.mockClear();
  probe.repeat.mockClear();
  probe.sequence.mockClear();
  probe.window = { width: 390, height: 844 };
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function host(testID: string) {
  return tree!.root.find(node => typeof node.type === "string" && node.props.testID === testID);
}

function findAllByTestID(testID: string) {
  return tree!.root.findAll(node => typeof node.type === "string" && node.props.testID === testID);
}

function styles(node: ReactTestInstance) {
  return Object.assign(
    {},
    ...[node.props.style]
      .flat()
      .filter(Boolean)
      .map(style => (typeof style === "function" ? style() : style)),
  );
}

function finishWatch(initial: SongState) {
  let s = initial;
  for (let i = 0; i < 6000 && s.phase === "watch"; i++) {
    s = songStep(s, { type: "tick" }, 1 / 60);
  }
  return s;
}

const EXPECTED_SHELLS: readonly {
  id: ShellId;
  file: string;
  bytes: number;
  sha256: string;
  ink: readonly [number, number, number, number];
  glow: string;
}[] = [
  {
    id: "coral",
    file: "assets/arcade/shell-song/shell-coral.webp",
    bytes: 15584,
    sha256: "35dae0e38753196d86aff41ae53014e43d58a620d9f844f6066c04c0ab7ab19e",
    ink: [12, 17, 296, 285],
    glow: "#FF9E8A",
  },
  {
    id: "gold",
    file: "assets/arcade/shell-song/shell-gold.webp",
    bytes: 16208,
    sha256: "2509bed0892f357eccdbbdefc03e7fb75151e171e7d1209e7c07ace3b32173a8",
    ink: [12, 31, 296, 257],
    glow: "#FFD972",
  },
  {
    id: "lagoon",
    file: "assets/arcade/shell-song/shell-lagoon.webp",
    bytes: 16182,
    sha256: "1b124d8a87d41a6fd61a3f4f04e263479e27aea9a591d5ce4a03b24ab06520c2",
    ink: [12, 37, 296, 246],
    glow: "#6CE3DF",
  },
  {
    id: "violet",
    file: "assets/arcade/shell-song/shell-violet.webp",
    bytes: 13926,
    sha256: "3c7bb79f49b4168160df7817e3e7ca40639a3906eec4245779dd6975d6d8e8af",
    ink: [12, 34, 296, 251],
    glow: "#D9B6FF",
  },
  {
    id: "mint",
    file: "assets/arcade/shell-song/shell-mint.webp",
    bytes: 13428,
    sha256: "9223c558fe72fcde4c7ed514c47daf7755f959e85816f787758cb3e1e1caebe9",
    ink: [12, 27, 296, 265],
    glow: "#7CF0C4",
  },
  {
    id: "sunset",
    file: "assets/arcade/shell-song/shell-sunset.webp",
    bytes: 18080,
    sha256: "704b3212bc976472039c20c27bb1a131c6a0cd57133bba33f0321bfd05f2f130",
    ink: [12, 16, 296, 288],
    glow: "#FF9566",
  },
];

describe("Shell Song premium illustrated assets & layout", () => {
  it("ships all 6 pearlescent shell WebPs byte-for-byte with verified bounds and lazy Metro-safe thunks", () => {
    expect(shellArts).toHaveLength(6);
    const symbols = new Set<string>();
    for (const [index, expected] of EXPECTED_SHELLS.entries()) {
      const art = shellArt(index);
      expect(art).toBe(illustrated[expected.id]);
      expect(shellArt(index + 6)).toBe(art);
      expect(art.source()).toBe(expected.file);
      expect(art.ink).toEqual(expected.ink);
      expect(art.glow).toBe(expected.glow);
      symbols.add(art.symbol);

      const webp = readFileSync(expected.file);
      expect(webp.length).toBe(expected.bytes);
      expect(createHash("sha256").update(webp).digest("hex")).toBe(expected.sha256);
      expect(webp.toString("ascii", 8, 16)).toBe("WEBPVP8X");
      const pixels = [webp.readUIntLE(24, 3) + 1, webp.readUIntLE(27, 3) + 1];
      expect(pixels).toEqual([320, 320]);
      expect(art.pixels).toEqual(pixels);
    }
    expect(symbols.size).toBe(6);
  });

  it("preserves aspect ratio and keeps full decoded WebP bounds inside the Android-safe padded canvas under peak bounce and shake", () => {
    for (const size of [32, 40, 48, 84, 110, 148, 170]) {
      const metrics = shellStageMetrics(size);
      const ox = metrics.canvas / 2;
      const oy = metrics.bottom;
      for (const art of shellArts) {
        const frame = shellImageFrame(art, size);
        const scale = frame.width / art.pixels[0];
        expect(frame.height / art.pixels[1]).toBeCloseTo(scale);

        const [inkLeft, inkTop, inkWidth, inkHeight] = art.ink;
        const inkCenterX = frame.left + (inkLeft + inkWidth / 2) * scale;
        const inkBottom = frame.top + (inkTop + inkHeight) * scale;
        expect(inkCenterX).toBeCloseTo(metrics.canvas / 2);
        expect(inkBottom).toBeCloseTo(metrics.bottom);

        // Check all 4 corners of the complete decoded image canvas (including transparent margin)
        // across peak bounce pop, spring settle, and wrong-shell wobble/tilt.
        const poses = [
          { tx: 0, ty: -metrics.lift, sx: 1.095, sy: 1.095, deg: 0 },
          { tx: 0, ty: 0, sx: 1.006, sy: 0.992, deg: 0 },
          { tx: -metrics.shakeAmp, ty: 0, sx: 1, sy: 1, deg: -metrics.maxTiltDeg },
          { tx: metrics.shakeAmp, ty: 0, sx: 1, sy: 1, deg: metrics.maxTiltDeg },
        ];
        for (const pose of poses) {
          const rad = (pose.deg * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          for (const x of [frame.left, frame.left + frame.width]) {
            for (const y of [frame.top, frame.top + frame.height]) {
              const sx = (x - ox) * pose.sx;
              const sy = (y - oy) * pose.sy;
              const px = ox + pose.tx + (sx * cos - sy * sin);
              const py = oy + pose.ty + (sx * sin + sy * cos);
              expect(px).toBeGreaterThan(0);
              expect(px).toBeLessThan(metrics.canvas);
              expect(py).toBeGreaterThan(0);
              expect(py).toBeLessThan(metrics.canvas);
            }
          }
        }
      }
    }
  });
});

describe("SingingShell & SongBoard rendering and Reduce Motion", () => {
  it.each([false, true])(
    "renders SingingShell with illustrated WebP, grounded shadow, colorblind emblem, outfit charm, and Reduce Motion=%s",
    async reduced => {
      vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
      probe.reduced.mockReturnValue(reduced);
      await act(async () => {
        tree = create(
          <SingingShell index={2} lit cue="tap-1" size={110} outfit="sunhat" wrong={false} />,
        );
      });

      const image = host("shell-art-2");
      expect(image.props.source).toBe(illustrated.lagoon.source());
      expect(image.props.resizeMode).toBe("contain");
      expect(image.props.fadeDuration).toBe(0);
      expect(image.props.accessible).toBe(false);

      expect(host("shell-shadow-2")).toBeDefined();
      expect(host("shell-symbol-2")).toBeDefined();
      expect(host("shell-outfit-sunhat")).toBeDefined();
      expect(host("shell-notes-2")).toBeDefined();

      const halo = styles(host("shell-halo-2"));
      expect(halo.opacity).toBeGreaterThan(0);

      if (reduced) {
        expect(findAllByTestID("shell-ripple-2")).toHaveLength(0);
        expect(probe.spring).not.toHaveBeenCalled();
        expect(probe.repeat).not.toHaveBeenCalled();
        expect(probe.timing).not.toHaveBeenCalled();
        expect(styles(host("shell-notes-2")).opacity).toBe(1);
      } else {
        expect(findAllByTestID("shell-ripple-2")).toHaveLength(1);
        expect(probe.spring).toHaveBeenCalled();
        expect(probe.repeat).toHaveBeenCalled();
        expect(probe.timing).toHaveBeenCalled();
      }
    },
  );

  it("applies gentle wrong-shell wobble only when Reduce Motion is off", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    probe.reduced.mockReturnValue(false);
    await act(async () => {
      tree = create(
        <SingingShell index={0} lit={false} cue="wrong-1" size={96} outfit="island" wrong />,
      );
    });
    expect(styles(host("shell-body-0")).opacity).toBeLessThan(1);
    expect(probe.sequence).toHaveBeenCalled();
    expect(findAllByTestID("shell-outfit-sunhat")).toHaveLength(0);

    await act(async () => tree!.unmount());
    tree = undefined;
    probe.sequence.mockClear();
    probe.reduced.mockReturnValue(true);

    await act(async () => {
      tree = create(
        <SingingShell index={0} lit={false} cue="wrong-2" size={96} outfit="island" wrong />,
      );
    });
    expect(styles(host("shell-body-0")).opacity).toBeLessThan(1);
    expect(probe.sequence).not.toHaveBeenCalled();
  });

  it.each([
    { id: "w1-1" as const, expectedShells: 3, width: 320, height: 568 },
    { id: "w2-1" as const, expectedShells: 4, width: 320, height: 568 },
    { id: "w3-1" as const, expectedShells: 5, width: 390, height: 844 },
    { id: "w3-8" as const, expectedShells: 6, width: 320, height: 568 },
    { id: "w5-1" as const, expectedShells: 6, width: 1024, height: 768 },
    { id: "learn-1" as const, expectedShells: 3, width: 320, height: 568 },
  ])(
    "renders SongBoard cleanly for $id ($expectedShells shells) at $width×$height",
    async ({ id, expectedShells, width, height }) => {
      vi.useFakeTimers();
      vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
      vi.stubGlobal("requestAnimationFrame", () => 1);
      vi.stubGlobal("cancelAnimationFrame", () => {});
      probe.window = { width, height };
      const initial = finishWatch(createSong(songLevel(id), 42, id === "learn-1"));
      const onTone = vi.fn();
      const onSay = vi.fn(() => false);
      const onResult = vi.fn();

      await act(async () => {
        tree = create(
          <SongBoard
            initial={initial}
            active
            helper={id === "learn-1"}
            outfit="starlight"
            onResult={onResult}
            onTone={onTone}
            onSay={onSay}
            width={width}
            height={height - 62}
          />,
        );
      });

      const images = tree!.root.findAll(node => String(node.type) === "Image");
      expect(images).toHaveLength(expectedShells);
      for (let i = 0; i < expectedShells; i++) {
        expect(host(`shell-art-${i}`).props.source).toBe(shellArt(i).source());
        expect(host(`shell-symbol-${i}`)).toBeDefined();
      }
      expect(host("shell-outfit-starlight")).toBeDefined();
      expect(host("shell-shore-stage")).toBeDefined();

      const shellButtons = tree!.root.findAll(
        node =>
          String(node.type) === "PressControl" &&
          typeof node.props.accessibilityLabel === "string" &&
          node.props.accessibilityLabel.startsWith("Shell "),
      );
      expect(shellButtons).toHaveLength(expectedShells);

      if (id === "learn-1") {
        expect(shellButtons[0].props.accessibilityLabel).toContain(", sound ");
        expect(shellButtons[0].props.accessibilityLabel).toContain(", Helper suggests this shell");
      }

      // Tapping the correct first shell lights it up and triggers audio feedback.
      const targetIndex = initial.pattern[0];
      await act(async () => {
        shellButtons[targetIndex].props.onPress();
      });
      expect(host(`shell-notes-${targetIndex}`)).toBeDefined();
      expect(onTone).toHaveBeenCalledWith(`shell-${targetIndex}`, false);

      // World 5/6 preserves the short-phrases chunks helper button.
      if (id === "w5-1") {
        const chunksButton = tree!.root.find(
          node =>
            String(node.type) === "Button" && node.props.children === "Listen in short phrases",
        );
        await act(async () => {
          chunksButton.props.onPress();
        });
        expect(
          tree!.root.find(
            node =>
              String(node.type) === "Button" && node.props.children === "Back to the whole song",
          ),
        ).toBeDefined();
      }
    },
  );

  it("respects Reduce Motion on SongBoard during demo playback and wrong-shell feedback", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    let now = 0;
    let scheduled: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      scheduled = cb;
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {
      scheduled = undefined;
    });
    probe.reduced.mockReturnValue(true);

    const initial = createSong(songLevel("w1-1"), 42, false);
    const onTone = vi.fn();
    await act(async () => {
      tree = create(
        <SongBoard
          initial={initial}
          active
          helper={false}
          outfit="explorer"
          onResult={vi.fn()}
          onTone={onTone}
          onSay={() => false}
          width={390}
          height={782}
        />,
      );
    });

    // Advance past the 450ms lead-in so the first demo note lights up.
    await act(async () => {
      for (let i = 0; i < 36; i++) {
        now += 1000 / 60;
        scheduled?.(now);
      }
    });

    const first = initial.pattern[0];
    expect(host(`shell-notes-${first}`)).toBeDefined();
    expect(styles(host(`shell-halo-${first}`)).opacity).toBeGreaterThan(0);
    expect(findAllByTestID(`shell-ripple-${first}`)).toHaveLength(0);
    expect(probe.spring).not.toHaveBeenCalled();
    expect(probe.repeat).not.toHaveBeenCalled();
  });
});

describe("SongBoard compact viewport & short-phrase layout budget", () => {
  it.each([
    { label: "320×568 portrait (default arena)", width: 320, arenaHeight: 506 },
    { label: "320×568 portrait (short safe-area)", width: 320, arenaHeight: 450 },
    { label: "844×390 landscape (default arena)", width: 844, arenaHeight: 328 },
    { label: "844×390 landscape (short safe-area)", width: 844, arenaHeight: 290 },
    { label: "390×844 portrait", width: 390, arenaHeight: 782 },
    { label: "1024×768 tablet", width: 1024, arenaHeight: 706 },
  ])(
    "fits HUD, header, progress, 3/4/5/6 shells, Replay, and short-phrase controls inside $label",
    ({ width, arenaHeight }) => {
      const cases = [
        { levelId: "w1-1" as const, shells: 3, hasShortPhrases: false, chunksOpen: false, hasTwist: false, patternLength: 4 },
        { levelId: "w2-1" as const, shells: 4, hasShortPhrases: false, chunksOpen: false, hasTwist: false, patternLength: 6 },
        { levelId: "w3-1" as const, shells: 5, hasShortPhrases: false, chunksOpen: false, hasTwist: false, patternLength: 7 },
        { levelId: "w3-8" as const, shells: 6, hasShortPhrases: false, chunksOpen: false, hasTwist: false, patternLength: 9 },
        { levelId: "w5-1" as const, shells: 6, hasShortPhrases: true, chunksOpen: false, hasTwist: true, patternLength: 10 },
        { levelId: "w5-1" as const, shells: 6, hasShortPhrases: true, chunksOpen: true, hasTwist: true, patternLength: 10 },
      ];

      for (const scenario of cases) {
        const layout = computeSongBoardLayout({
          width,
          arenaHeight,
          shells: scenario.shells,
          patternLength: scenario.patternLength,
          learning: false,
          hasShortPhrases: scenario.hasShortPhrases,
          chunksOpen: scenario.chunksOpen,
          hasTwist: scenario.hasTwist,
          isEndless: false,
        });

        expect(layout.totalHeight).toBeLessThanOrEqual(arenaHeight);
        expect(layout.stageMaxWidth).toBeLessThanOrEqual(width);
        expect(layout.shellCardWidth).toBeGreaterThanOrEqual(44);
        expect(layout.shellCardHeight).toBeGreaterThanOrEqual(44);
        expect(layout.shellCanvas).toBeGreaterThanOrEqual(32);
        expect(layout.controlsHeight).toBeGreaterThanOrEqual(44);

        if (width === 844 && arenaHeight <= 328) {
          expect(layout.wide).toBe(true);
          expect(layout.columns).toBe(scenario.shells);
          expect(layout.rows).toBe(1);
          expect(layout.inlineControls).toBe(true);
        }
      }
    },
  );

  it("re-budgets shells when onLayout reports a wrapped HUD on narrow portrait", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("requestAnimationFrame", () => 1);
    vi.stubGlobal("cancelAnimationFrame", () => {});
    probe.window = { width: 320, height: 568 };
    const initial = createSong(songLevel("w5-1"), 42, true);

    await act(async () => {
      tree = create(
        <SongBoard
          initial={initial}
          active
          helper
          outfit="island"
          onResult={vi.fn()}
          onTone={vi.fn()}
          onSay={() => false}
          width={320}
          height={450}
        />,
      );
    });

    // Simulate a real wrapped HUD measurement (2 rows = 96px) and verify board avoids center-clipping.
    await act(async () => {
      host("shell-song-hud").props.onLayout({ nativeEvent: { layout: { width: 320, height: 96 } } });
    });

    const shellButtons = tree!.root.findAll(
      node =>
        String(node.type) === "PressControl" &&
        typeof node.props.accessibilityLabel === "string" &&
        node.props.accessibilityLabel.startsWith("Shell "),
    );
    expect(shellButtons).toHaveLength(6);
    for (const button of shellButtons) {
      const style = styles(button);
      expect(style.width).toBeGreaterThanOrEqual(44);
      expect(style.minHeight).toBeGreaterThanOrEqual(44);
    }

    // Open short-phrase helper and confirm all three helper actions render with compact touch targets.
    const openHelper = tree!.root.find(
      node => String(node.type) === "Button" && node.props.children === "Listen in short phrases",
    );
    await act(async () => {
      openHelper.props.onPress();
    });

    for (const label of ["Listen to this phrase", "Next phrase", "Back to the whole song"]) {
      const btn = tree!.root.find(
        node => String(node.type) === "Button" && node.props.children === label,
      );
      expect(btn.props.compact).toBe(true);
    }
  });

  it("arranges short-phrase helper controls in a single horizontal bar on 844×390 landscape", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("requestAnimationFrame", () => 1);
    vi.stubGlobal("cancelAnimationFrame", () => {});
    probe.window = { width: 844, height: 390 };
    const initial = finishWatch(createSong(songLevel("w5-1"), 42, false));

    await act(async () => {
      tree = create(
        <SongBoard
          initial={initial}
          active
          helper={false}
          outfit="island"
          onResult={vi.fn()}
          onTone={vi.fn()}
          onSay={() => false}
          width={844}
          height={328}
        />,
      );
    });

    const controlsRegular = styles(host("shell-song-controls"));
    expect(controlsRegular.flexDirection).toBe("row");

    const openHelper = tree!.root.find(
      node => String(node.type) === "Button" && node.props.children === "Listen in short phrases",
    );
    await act(async () => {
      openHelper.props.onPress();
    });

    const helperButtons = ["Listen to this phrase", "Next phrase", "Back to the whole song"].map(
      label =>
        tree!.root.find(node => String(node.type) === "Button" && node.props.children === label),
    );
    // All three buttons share the same single-row parent View in landscape.
    expect(helperButtons[0].parent).toBe(helperButtons[1].parent);
    expect(helperButtons[1].parent).toBe(helperButtons[2].parent);
    expect(styles(helperButtons[0].parent!).flexDirection).toBe("row");
  });
});
