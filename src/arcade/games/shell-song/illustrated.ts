export type ShellId = "coral" | "gold" | "lagoon" | "violet" | "mint" | "sunset";
export type ShellSymbol = "circle" | "triangle" | "diamond" | "square" | "star" | "crescent";

export type ShellArt = {
  readonly id: ShellId;
  readonly source: () => number;
  readonly pixels: readonly [width: number, height: number];
  /** Bounds of the artwork at 50% alpha, in source pixels. */
  readonly ink: readonly [left: number, top: number, width: number, height: number];
  /** Luminous musical accent glow color for this shell. */
  readonly glow: string;
  /** Colorblind-friendly geometric emblem paired with this shell slot. */
  readonly symbol: ShellSymbol;
};

// Metro resolves each literal require statically while keeping image loading lazy.
export const shellArts: readonly ShellArt[] = [
  {
    id: "coral",
    source: () => require("../../../../assets/arcade/shell-song/shell-coral.webp"),
    pixels: [320, 320],
    ink: [12, 17, 296, 285],
    glow: "#FF9E8A",
    symbol: "circle",
  },
  {
    id: "gold",
    source: () => require("../../../../assets/arcade/shell-song/shell-gold.webp"),
    pixels: [320, 320],
    ink: [12, 31, 296, 257],
    glow: "#FFD972",
    symbol: "triangle",
  },
  {
    id: "lagoon",
    source: () => require("../../../../assets/arcade/shell-song/shell-lagoon.webp"),
    pixels: [320, 320],
    ink: [12, 37, 296, 246],
    glow: "#6CE3DF",
    symbol: "diamond",
  },
  {
    id: "violet",
    source: () => require("../../../../assets/arcade/shell-song/shell-violet.webp"),
    pixels: [320, 320],
    ink: [12, 34, 296, 251],
    glow: "#D9B6FF",
    symbol: "square",
  },
  {
    id: "mint",
    source: () => require("../../../../assets/arcade/shell-song/shell-mint.webp"),
    pixels: [320, 320],
    ink: [12, 27, 296, 265],
    glow: "#7CF0C4",
    symbol: "star",
  },
  {
    id: "sunset",
    source: () => require("../../../../assets/arcade/shell-song/shell-sunset.webp"),
    pixels: [320, 320],
    ink: [12, 16, 296, 288],
    glow: "#FF9566",
    symbol: "crescent",
  },
] as const;

export const illustrated = {
  coral: shellArts[0],
  gold: shellArts[1],
  lagoon: shellArts[2],
  violet: shellArts[3],
  mint: shellArts[4],
  sunset: shellArts[5],
} satisfies Record<ShellId, ShellArt>;

export function shellArt(index: number): ShellArt {
  const count = shellArts.length;
  return shellArts[((index % count) + count) % count];
}

/**
 * Android-safe padded geometry for one SingingShell canvas of `size x size`.
 * Reserves enough inner margin around the full decoded WebP (including transparent edges)
 * so peak musical bounce, spring pop, wrong-shell wobble, and glow rings never clip.
 */
export function shellStageMetrics(size: number) {
  const safeSize = Math.max(32, size);
  const artWidth = safeSize * 0.68;
  const artHeight = safeSize * 0.62;
  const bottom = safeSize * 0.865;
  const lift = Math.min(11, safeSize * 0.095);
  const shakeAmp = Math.min(6.5, safeSize * 0.065);
  return {
    canvas: safeSize,
    artWidth,
    artHeight,
    bottom,
    lift,
    shakeAmp,
    maxScale: 1.1,
    maxTiltDeg: 3,
  };
}

/**
 * Centre the visible shell ink horizontally inside `canvas` and plant its base on `bottom`,
 * preserving uniform source aspect ratio.
 */
export function shellImageFrame(art: ShellArt, size: number) {
  const { canvas, artWidth, artHeight, bottom } = shellStageMetrics(size);
  const [inkLeft, inkTop, inkWidth, inkHeight] = art.ink;
  const [pixelWidth, pixelHeight] = art.pixels;
  const scale = Math.min(artWidth / inkWidth, artHeight / inkHeight);
  return {
    position: "absolute" as const,
    left: (canvas - inkWidth * scale) / 2 - inkLeft * scale,
    top: bottom - (inkTop + inkHeight) * scale,
    width: pixelWidth * scale,
    height: pixelHeight * scale,
  };
}
