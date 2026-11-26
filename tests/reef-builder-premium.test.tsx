import React, { useRef } from "react";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createReef, reefLevel } from "../src/arcade/games/reef-builder/engine";
import {
  illustrated,
  reefArt,
  reefArts,
  reefImageFrame,
  reefSpriteMetrics,
  type ReefArtId,
} from "../src/arcade/games/reef-builder/illustrated";
import { computeReefBoardLayout, Coral, ReefArtSprite, ReefBoard } from "../src/arcade/games/reef-builder/View";

const probe = vi.hoisted(() => ({
  reduced: vi.fn(() => false),
  timing: vi.fn(),
  spring: vi.fn(),
  repeat: vi.fn(),
  sequence: vi.fn(),
  delay: vi.fn(),
}));

vi.mock("react-native", () => ({
  View: "View",
  Image: "Image",
  Platform: { OS: "android" },
  StyleSheet: {
    absoluteFill: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
    flatten: (style: unknown) => style,
  },
}));

vi.mock("react-native-svg", () => ({
  default: "Svg",
  Circle: "Circle",
  Defs: "Defs",
  Ellipse: "Ellipse",
  G: "G",
  LinearGradient: "LinearGradient",
  Path: "Path",
  Rect: "Rect",
  Stop: "Stop",
}));

vi.mock("react-native-gesture-handler", () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("react-native-reanimated", () => ({
  default: { View: "AnimatedView" },
  Easing: {
    linear: "linear",
    quad: "quad",
    cubic: "cubic",
    sin: "sin",
    out: (fn: unknown) => fn,
    inOut: (fn: unknown) => fn,
  },
  useSharedValue: (value: unknown) =>
    useRef({
      value,
      set(next: unknown) {
        this.value = next;
      },
    }).current,
  useAnimatedRef: () => useRef(null),
  useAnimatedReaction: () => {},
  useAnimatedStyle: (style: () => unknown) => style,
  measure: () => null,
  runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
  cancelAnimation: () => {},
  withDelay: (ms: number, animation: unknown) => {
    probe.delay(ms, animation);
    return animation;
  },
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
vi.mock("../src/components/Text", () => ({ Text: "Text" }));
vi.mock("../src/components/ui", () => ({
  Button: "Button",
  Copy: "Copy",
}));
vi.mock("../src/islander/Companion", () => ({ Companion: "Companion" }));
vi.mock("../src/arcade/Juice", () => ({ MiniStars: "MiniStars" }));
vi.mock("../src/arcade/Input", () => {
  const chain = () => {
    const api = {
      enabled: () => api,
      onBegin: () => api,
      onUpdate: () => api,
      onEnd: () => api,
      onFinalize: () => api,
    };
    return api;
  };
  return {
    PressControl: "PressControl",
    PlayButton: "PlayButton",
    uiThreadDrag: () => chain(),
  };
});

let tree: ReactTestRenderer | undefined;
afterEach(async () => {
  if (tree) await act(async () => tree!.unmount());
  tree = undefined;
  probe.reduced.mockReset().mockReturnValue(false);
  probe.timing.mockClear();
  probe.spring.mockClear();
  probe.repeat.mockClear();
  probe.sequence.mockClear();
  probe.delay.mockClear();
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

const EXPECTED_ASSETS: readonly {
  id: ReefArtId;
  file: string;
  bytes: number;
  sha256: string;
  ink: readonly [number, number, number, number];
}[] = [
  {
    id: "fish",
    file: "assets/arcade/reef-builder/fish.webp",
    bytes: 17686,
    sha256: "2096f5a8fd3ecc4ed3c4903e7401905fc32a7e160bc499cd84e021cff9011f18",
    ink: [14, 45, 292, 230],
  },
  {
    id: "pearl",
    file: "assets/arcade/reef-builder/pearl.webp",
    bytes: 21242,
    sha256: "28fcdd7f258f761ccf0055bf6aab698c76d20b776d1426d88d3c0526005ea7fb",
    ink: [23, 14, 273, 292],
  },
];

describe("Reef Builder premium illustrated assets & framing", () => {
  it("ships fish.webp and pearl.webp byte-for-byte with verified bounds and lazy static Metro-safe thunks", () => {
    expect(reefArts).toHaveLength(2);

    const manifestSource = readFileSync("src/arcade/games/reef-builder/illustrated.ts", "utf8");
    expect(manifestSource).toContain('require("../../../../assets/arcade/reef-builder/fish.webp")');
    expect(manifestSource).toContain('require("../../../../assets/arcade/reef-builder/pearl.webp")');

    for (const expected of EXPECTED_ASSETS) {
      const art = reefArt(expected.id);
      expect(art).toBe(illustrated[expected.id]);
      expect(typeof art.source).toBe("function");
      expect(art.source()).toBe(expected.file);
      expect(art.ink).toEqual(expected.ink);

      const webp = readFileSync(expected.file);
      expect(webp.length).toBe(expected.bytes);
      expect(createHash("sha256").update(webp).digest("hex")).toBe(expected.sha256);
      expect(webp.toString("ascii", 8, 16)).toBe("WEBPVP8X");
      const pixels = [webp.readUIntLE(24, 3) + 1, webp.readUIntLE(27, 3) + 1];
      expect(pixels).toEqual([320, 320]);
      expect(art.pixels).toEqual(pixels);
    }
  });

  it("preserves uniform aspect ratio and keeps full decoded 320x320 bounds inside Android-safe padded containers", () => {
    for (const mode of ["stage", "badge"] as const) {
      for (const size of [20, 24, 28, 36, 48, 64, 96]) {
        const metrics = reefSpriteMetrics(size, mode);
        const ox = metrics.centerX;
        const oy = metrics.centerY;

        for (const art of reefArts) {
          const frame = reefImageFrame(art, size, mode);
          const scaleX = frame.width / art.pixels[0];
          const scaleY = frame.height / art.pixels[1];
          expect(scaleY).toBeCloseTo(scaleX);

          const [inkLeft, inkTop, inkWidth, inkHeight] = art.ink;
          const inkCenterX = frame.left + (inkLeft + inkWidth / 2) * scaleX;
          const inkCenterY = frame.top + (inkTop + inkHeight / 2) * scaleY;
          expect(inkCenterX).toBeCloseTo(metrics.centerX);
          expect(inkCenterY).toBeCloseTo(metrics.centerY);

          const poses = [
            { tx: 0, ty: -metrics.bobAmp, sx: metrics.maxScale, sy: metrics.maxScale, deg: -metrics.maxTiltDeg },
            { tx: 0, ty: metrics.bobAmp, sx: metrics.maxScale, sy: metrics.maxScale, deg: metrics.maxTiltDeg },
            { tx: 0, ty: 0, sx: 1, sy: 1, deg: 0 },
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
    }
  });

  it("fits HUD, framed 8x8 board, and all 3 >=44x44 tray cards without clipping across all target viewports", () => {
    const viewports = [
      { name: "320x568", width: 320, height: 506 },
      { name: "390x844", width: 390, height: 782 },
      { name: "844x390", width: 844, height: 328 },
      { name: "1024x768", width: 1024, height: 706 },
    ];
    for (const vp of viewports) {
      for (const helper of [false, true]) {
        for (const endless of [false, true]) {
          const layout = computeReefBoardLayout({
            width: vp.width,
            height: vp.height,
            helper,
            endless,
          });
          expect(layout.totalHeight).toBeLessThanOrEqual(vp.height);
          expect(layout.boardSize % 8).toBe(0);
          expect(layout.boardSize).toBeGreaterThanOrEqual(128);
          expect(layout.cardWidth).toBeGreaterThanOrEqual(44);
          expect(layout.cardHeight).toBeGreaterThanOrEqual(44);

          if (!layout.side) {
            const trayRowWidth = layout.cardWidth * 3 + layout.trayGap * 2 + layout.outerPadH * 2;
            expect(trayRowWidth).toBeLessThanOrEqual(vp.width);
            const framedBoardWidth = layout.boardSize + layout.framePad * 2 + 5 + layout.outerPadH * 2;
            expect(framedBoardWidth).toBeLessThanOrEqual(vp.width);
          } else {
            const framedBoardWidth = layout.boardSize + layout.framePad * 2 + 5;
            const totalRowWidth =
              framedBoardWidth + layout.sideColumnWidth + (layout.short ? 12 : 18) + layout.outerPadH * 2;
            expect(totalRowWidth).toBeLessThanOrEqual(vp.width);
          }
        }
      }
    }
  });
});

describe("ReefBoard rendering, interactions, illustrated celebrations, and Reduce Motion", () => {
  it("renders Coral with glazed storybook frame and illustrated trapped fish.webp bubble", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    await act(async () => {
      tree = create(<Coral color="#F47B7B" variant={0} fish size={44} />);
    });
    expect(host("reef-trapped-fish")).toBeDefined();
    const images = tree!.root.findAll(node => String(node.type) === "Image");
    expect(images).toHaveLength(1);
    expect(images[0].props.source).toBe(illustrated.fish.source());
    expect(images[0].props.resizeMode).toBe("contain");
    expect(images[0].props.fadeDuration).toBe(0);
  });

  it("renders ReefArtSprite with exact source and non-accessible image metadata", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    await act(async () => {
      tree = create(<ReefArtSprite id="pearl" size={48} mode="stage" testID="test-pearl" />);
    });
    const img = host("test-pearl");
    expect(img.props.source).toBe(illustrated.pearl.source());
    expect(img.props.accessible).toBe(false);
    expect(styles(host("test-pearl-stage"))).toMatchObject({ width: 48, height: 48 });
  });

  it("renders regular mode (w1-1) with illustrated pearl HUD, trapped fish, and 3 tactile piece cards", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const onTone = vi.fn();
    const onResult = vi.fn();
    await act(async () => {
      tree = create(
        <ReefBoard
          initial={createReef(reefLevel("w1-1"), 42, false)}
          active
          helper={false}
          onResult={onResult}
          onTone={onTone}
          width={390}
          height={782}
        />,
      );
    });

    expect(host("reef-board")).toBeDefined();
    expect(styles(host("reef-board")).borderWidth).toBe(0);
    expect(host("reef-board-frame")).toBeDefined();
    expect(host("reef-hud-emblem").props.source).toBe(illustrated.pearl.source());
    expect(host("reef-hero-fish").props.source).toBe(illustrated.fish.source());
    expect(findAllByTestID("reef-trapped-fish")).toHaveLength(1);

    for (const slot of [0, 1, 2]) {
      const card = host(`coral-piece-${slot}`);
      const cardStyle = styles(card);
      expect(cardStyle.width).toBeGreaterThanOrEqual(44);
      expect(cardStyle.height).toBeGreaterThanOrEqual(44);
    }

    // Tap piece 1 then tap an open reef cell (row 0, col 0) to place cleanly.
    await act(async () => {
      host("coral-piece-1").props.onPress();
    });
    const cell00 = tree!.root.find(
      node =>
        String(node.type) === "PressControl" &&
        typeof node.props.accessibilityLabel === "string" &&
        node.props.accessibilityLabel.startsWith("Reef row 1, column 1,"),
    );
    await act(async () => {
      cell00.props.onPress();
    });
    expect(onTone).toHaveBeenCalledWith("coral");
    expect(host("coral-slot-empty-1")).toBeDefined();
  });

  it("renders numbers mode (learn-1), previews Show a fit, and celebrates a line clear with illustrated fish.webp and pearl.webp", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const onTone = vi.fn();
    const onResult = vi.fn();
    await act(async () => {
      tree = create(
        <ReefBoard
          initial={createReef(reefLevel("learn-1"), 42, true)}
          active
          helper
          onResult={onResult}
          onTone={onTone}
          width={390}
          height={782}
        />,
      );
    });

    // Helper "Show a fit" previews a legal move.
    const showFit = tree!.root.find(
      node => String(node.type) === "PlayButton" && node.props.children === "Show a fit",
    );
    await act(async () => {
      showFit.props.onPress();
    });
    expect(onTone).toHaveBeenCalledWith("coral");

    // Place the opening "6" beside "4" at row 8, col 2 (0-indexed row 7, col 1) to make 10 & rescue the fish!
    await act(async () => {
      host("coral-piece-0").props.onPress();
    });
    const targetCell = tree!.root.find(
      node =>
        String(node.type) === "PressControl" &&
        typeof node.props.accessibilityLabel === "string" &&
        node.props.accessibilityLabel.startsWith("Reef row 8, column 2,"),
    );
    await act(async () => {
      targetCell.props.onPress();
    });

    expect(onTone).toHaveBeenCalledWith("clear");
    expect(host("reef-clear-effects")).toBeDefined();
    expect(host("reef-clear-fish-0").props.source).toBe(illustrated.fish.source());
    expect(host("reef-clear-pearl").props.source).toBe(illustrated.pearl.source());
  });

  it("strictly honors Reduce Motion during idle, selection, line clear, and invalid bump", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    probe.reduced.mockReturnValue(true);
    const onTone = vi.fn();

    await act(async () => {
      tree = create(
        <ReefBoard
          initial={createReef(reefLevel("learn-1"), 42, false)}
          active
          helper={false}
          onResult={vi.fn()}
          onTone={onTone}
          width={390}
          height={782}
        />,
      );
    });

    expect(probe.timing).not.toHaveBeenCalled();
    expect(probe.spring).not.toHaveBeenCalled();
    expect(probe.repeat).not.toHaveBeenCalled();
    expect(probe.sequence).not.toHaveBeenCalled();

    // Invalid bump on occupied cell (row 8, col 1 has value 4)
    const occupiedCell = tree!.root.find(
      node =>
        String(node.type) === "PressControl" &&
        typeof node.props.accessibilityLabel === "string" &&
        node.props.accessibilityLabel.startsWith("Reef row 8, column 1,"),
    );
    await act(async () => {
      occupiedCell.props.onPress();
    });
    expect(onTone).toHaveBeenCalledWith("bump");
    expect(probe.sequence).not.toHaveBeenCalled();
    expect(probe.timing).not.toHaveBeenCalled();

    // Valid line clear at row 8, col 2 still renders illustrated fish & pearl with zero motion timers
    const clearCell = tree!.root.find(
      node =>
        String(node.type) === "PressControl" &&
        typeof node.props.accessibilityLabel === "string" &&
        node.props.accessibilityLabel.startsWith("Reef row 8, column 2,"),
    );
    await act(async () => {
      clearCell.props.onPress();
    });
    expect(host("reef-clear-fish-0").props.source).toBe(illustrated.fish.source());
    expect(host("reef-clear-pearl").props.source).toBe(illustrated.pearl.source());
    expect(probe.timing).not.toHaveBeenCalled();
    expect(probe.spring).not.toHaveBeenCalled();
    expect(probe.repeat).not.toHaveBeenCalled();
    expect(probe.sequence).not.toHaveBeenCalled();
    expect(probe.delay).not.toHaveBeenCalled();
  });

  it("replaces programmatic ReefFish with illustrated WebP assets and avoids animated SVG props", () => {
    const viewSource = readFileSync("src/arcade/games/reef-builder/View.tsx", "utf8");
    expect(viewSource).not.toContain("ReefFish");
    expect(viewSource).not.toContain("useAnimatedProps");
    expect(viewSource).toContain('testID="reef-board"');
    expect(viewSource).toContain("borderWidth: 0");
  });
});
