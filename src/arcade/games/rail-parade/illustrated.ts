export type RailActorArt = {
  source: () => number;
  pixels: readonly [width: number, height: number];
  /** Bounds of the artwork at 50% alpha, in source pixels. */
  ink: readonly [left: number, top: number, width: number, height: number];
};

// Metro resolves each literal require while the board loads only the actors it uses.
export const illustrated = {
  rail: { source: () => require("../../../../assets/arcade/rail-parade/rail.webp"), pixels: [256, 256], ink: [12, 22, 232, 211] },
  chick: { source: () => require("../../../../assets/arcade/rail-parade/chick.webp"), pixels: [256, 256], ink: [22, 12, 211, 232] },
  mango: { source: () => require("../../../../assets/arcade/rail-parade/mango.webp"), pixels: [256, 256], ink: [12, 17, 232, 221] },
  fern: { source: () => require("../../../../assets/arcade/rail-parade/fern.webp"), pixels: [256, 256], ink: [12, 24, 232, 208] },
  nest: { source: () => require("../../../../assets/arcade/rail-parade/nest.webp"), pixels: [256, 256], ink: [12, 36, 232, 183] },
} satisfies Record<string, RailActorArt>;

/** Uniformly scale and center the visible ink horizontally, grounded on the contact line.
 * Transparent margins may extend beyond the slot without distorting aspect ratio.
 */
export function railActorFrame(art: RailActorArt, width: number, height: number, bottom = height, left = false) {
  const [inkLeft, inkTop, inkWidth, inkHeight] = art.ink;
  const [pixelWidth, pixelHeight] = art.pixels;
  const scale = Math.min(width / inkWidth, Math.min(height, bottom) / inkHeight);
  const leadingMargin = left ? pixelWidth - inkLeft - inkWidth : inkLeft;
  return {
    position: "absolute" as const,
    left: (width - inkWidth * scale) / 2 - leadingMargin * scale,
    top: bottom - (inkTop + inkHeight) * scale,
    width: pixelWidth * scale,
    height: pixelHeight * scale,
    transform: [{ scaleX: left ? -1 : 1 }],
  };
}
