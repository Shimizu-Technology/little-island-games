import { BUG_RADIUS_X, BUG_RADIUS_Y, HUSK_RADIUS, PALM_ACTOR_SIZE } from "../../action/arena";

type ActorArt = {
  source: () => number;
  pixels: readonly [width: number, height: number];
  /** Artwork bounds at 50% alpha, in source pixels. */
  ink: readonly [left: number, top: number, width: number, height: number];
};

// Metro resolves literal paths. The WebPs load only when a Palm Patrol actor mounts.
export const illustrated = {
  beetle: { source: () => require("../../../../assets/arcade/palm-patrol/beetle.webp"), pixels: [256, 256], ink: [12, 43, 232, 169] },
  boss: { source: () => require("../../../../assets/arcade/palm-patrol/boss.webp"), pixels: [320, 320], ink: [12, 70, 296, 179] },
  launcher: { source: () => require("../../../../assets/arcade/palm-patrol/launcher.webp"), pixels: [256, 256], ink: [28, 12, 200, 232] },
  coconut: { source: () => require("../../../../assets/arcade/palm-patrol/coconut.webp"), pixels: [192, 192], ink: [23, 12, 146, 168] },
} satisfies Record<string, ActorArt>;
export type PalmActor = keyof typeof illustrated;

/** Fit visible ink uniformly to the target and keep the complete decoded image. */
export function palmActorFrame(art: ActorArt, centerX: number, bottom: number, width: number, height: number) {
  const [inkX, inkY, inkWidth, inkHeight] = art.ink;
  const scale = Math.min(width / inkWidth, height / inkHeight);
  return {
    position: "absolute" as const,
    left: centerX - (inkX + inkWidth / 2) * scale,
    top: bottom - (inkY + inkHeight) * scale,
    width: art.pixels[0] * scale,
    height: art.pixels[1] * scale,
  };
}

export function palmActorLayout(kind: PalmActor, size: number) {
  const unit = size / PALM_ACTOR_SIZE[kind], center = size / 2, crown = kind === "boss" ? 1.5 : 1;
  const target = kind === "launcher"
    ? { halfWidth: 24, height: 53.8, bottom: 29 }
    : kind === "coconut"
      ? { halfWidth: HUSK_RADIUS, height: HUSK_RADIUS * 2, bottom: HUSK_RADIUS }
      // A shot enters the beetle's rectangle from below. Match that face and the full horizontal span.
      : { halfWidth: BUG_RADIUS_X * crown, height: BUG_RADIUS_Y * 2 * crown, bottom: BUG_RADIUS_Y * crown };
  const image = palmActorFrame(illustrated[kind], center, center + target.bottom * unit, target.halfWidth * 2 * unit, target.height * unit);
  const cornerX = Math.max(center - image.left, image.left + image.width - center);
  const cornerY = Math.max(center - image.top, image.top + image.height - center);
  // Android can clip transformed descendants at native view bounds. Budget for full rotation,
  // the 1.042× recoil rebound, and the recoil's translation, including transparent pixels.
  const radius = Math.hypot(cornerX, cornerY) * 1.05 + 4 * unit;
  const inset = Math.max(0, Math.ceil(radius - center));
  return {
    padding: { left: inset, top: inset, right: inset, bottom: inset },
    canvas: size + inset * 2,
    image: { ...image, left: image.left + inset, top: image.top + inset },
  };
}
