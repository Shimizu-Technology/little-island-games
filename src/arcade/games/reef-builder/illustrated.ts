export type ReefArtId = "fish" | "pearl";

export type ReefSpriteMode = "stage" | "badge";

export type ReefArt = {
  readonly id: ReefArtId;
  readonly source: () => number;
  readonly pixels: readonly [width: number, height: number];
  /** Bounds of the artwork at 50% alpha, in source pixels. */
  readonly ink: readonly [left: number, top: number, width: number, height: number];
  /** Luminous storybook aura color paired with this illustration. */
  readonly glow: string;
  /** Warm secondary accent used for badges and sparkles. */
  readonly accent: string;
};

// Metro resolves each literal require statically while keeping image loading lazy.
export const reefArts: readonly ReefArt[] = [
  {
    id: "fish",
    source: () => require("../../../../assets/arcade/reef-builder/fish.webp"),
    pixels: [320, 320],
    ink: [14, 45, 292, 230],
    glow: "#FFD56B",
    accent: "#4AC4BC",
  },
  {
    id: "pearl",
    source: () => require("../../../../assets/arcade/reef-builder/pearl.webp"),
    pixels: [320, 320],
    ink: [23, 14, 273, 292],
    glow: "#FFF0B8",
    accent: "#F59C82",
  },
] as const;

export const illustrated = {
  fish: reefArts[0],
  pearl: reefArts[1],
} satisfies Record<ReefArtId, ReefArt>;

export function reefArt(id: ReefArtId): ReefArt {
  return illustrated[id];
}

/**
 * Android-safe padded framing metrics for an illustrated Reef Builder sprite inside a `size x size`
 * container. Reserves enough inner margin around the full decoded 320x320 WebP canvas (including
 * transparent edges) so peak swim/pop scale, bob, and playful tilt never clip on Android or web.
 */
export function reefSpriteMetrics(size: number, mode: ReefSpriteMode = "stage") {
  const safeSize = Math.max(20, size);
  const artFraction = mode === "badge" ? 0.78 : 0.64;
  const artWidth = safeSize * artFraction;
  const artHeight = safeSize * artFraction;
  const bobAmp = mode === "badge" ? 0 : safeSize * 0.045;
  const maxScale = mode === "badge" ? 1.05 : 1.12;
  const maxTiltDeg = mode === "badge" ? 0 : 5;
  return {
    canvas: safeSize,
    artWidth,
    artHeight,
    centerX: safeSize / 2,
    centerY: safeSize / 2,
    bobAmp,
    maxScale,
    maxTiltDeg,
  };
}

/**
 * Center the visible illustration ink uniformly inside `canvas`, preserving exact source aspect ratio
 * while keeping the complete decoded 320x320 image inside the Android-safe padded bounds.
 */
export function reefImageFrame(art: ReefArt, size: number, mode: ReefSpriteMode = "stage") {
  const { artWidth, artHeight, centerX, centerY } = reefSpriteMetrics(size, mode);
  const [inkLeft, inkTop, inkWidth, inkHeight] = art.ink;
  const [pixelWidth, pixelHeight] = art.pixels;
  const scale = Math.min(artWidth / inkWidth, artHeight / inkHeight);
  return {
    position: "absolute" as const,
    left: centerX - (inkLeft + inkWidth / 2) * scale,
    top: centerY - (inkTop + inkHeight / 2) * scale,
    width: pixelWidth * scale,
    height: pixelHeight * scale,
  };
}
