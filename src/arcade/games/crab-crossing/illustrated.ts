type ActorArt = {
  source: () => number;
  pixels: readonly [width: number, height: number];
  /** Bounds of the artwork at 50% alpha, in source pixels. */
  ink: readonly [left: number, top: number, width: number, height: number];
};

// Metro resolves each literal require while the board loads only the actors it uses.
export const illustrated = {
  crab: { source: () => require("../../../../assets/arcade/crab-crossing/crab.webp"), pixels: [256, 256], ink: [12, 32, 232, 191] },
  log: { source: () => require("../../../../assets/arcade/crab-crossing/log.webp"), pixels: [384, 256], ink: [12, 42, 360, 171] },
  turtle: { source: () => require("../../../../assets/arcade/crab-crossing/turtle.webp"), pixels: [384, 256], ink: [12, 29, 360, 197] },
  canoe: { source: () => require("../../../../assets/arcade/crab-crossing/canoe.webp"), pixels: [384, 256], ink: [12, 45, 360, 166] },
  island: { source: () => require("../../../../assets/arcade/crab-crossing/island.webp"), pixels: [384, 256], ink: [24, 12, 336, 232] },
  bike: { source: () => require("../../../../assets/arcade/crab-crossing/bike.webp"), pixels: [384, 256], ink: [25, 12, 333, 232] },
  car: { source: () => require("../../../../assets/arcade/crab-crossing/car.webp"), pixels: [384, 256], ink: [31, 12, 322, 232] },
  bus: { source: () => require("../../../../assets/arcade/crab-crossing/bus.webp"), pixels: [384, 256], ink: [12, 15, 360, 226] },
} satisfies Record<string, ActorArt>;

/** Centre the visible ink across the span and plant it on the contact line.
 * The full image is allowed to extend past the span where it has transparent margins.
 */
export function crabActorFrame(art: ActorArt, width: number, height: number, bottom = height, left = false) {
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
