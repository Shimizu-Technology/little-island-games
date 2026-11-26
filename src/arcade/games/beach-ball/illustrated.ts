import { BALL_RADIUS, PADDLE_HEIGHT } from "../../action/arena";

type BeachActorArt = {
  source: () => number;
  pixels: readonly [width: number, height: number];
  /** Artwork bounds at 50% alpha, in source pixels. */
  ink: readonly [left: number, top: number, width: number, height: number];
};

// Metro resolves literal paths. The WebPs load only when a Beach Ball actor mounts.
export const beachIllustrated = {
  ball: {
    source: () => require("../../../../assets/arcade/beach-ball/ball.webp"),
    pixels: [320, 320],
    ink: [14, 14, 292, 292],
  },
  paddle: {
    source: () => require("../../../../assets/arcade/beach-ball/paddle.webp"),
    pixels: [320, 320],
    ink: [14, 120, 292, 80],
  },
} satisfies Record<string, BeachActorArt>;

export type BeachActor = keyof typeof beachIllustrated;

/** Pose box width/height used by `beachPoses` for each ball, in logical arena units. */
export const BEACH_BALL_POSE_SIZE = (BALL_RADIUS * 2) / 0.95;

/** Fit visible ink uniformly into a static box while keeping the complete decoded image. */
export function beachStillFrame(kind: BeachActor, width: number, height: number) {
  const art = beachIllustrated[kind];
  const [inkX, inkY, inkW, inkH] = art.ink;
  const pixel = Math.min(width / inkW, height / inkH);
  return {
    position: "absolute" as const,
    left: width / 2 - (inkX + inkW / 2) * pixel,
    top: height / 2 - (inkY + inkH / 2) * pixel,
    width: art.pixels[0] * pixel,
    height: art.pixels[1] * pixel,
  };
}

/** Uniformly scale the beach ball to exact engine diameter (`BALL_RADIUS * 2`) with Android-safe transform padding. */
export function beachBallLayout(unit: number) {
  const art = beachIllustrated.ball;
  const [inkX, inkY, inkW, inkH] = art.ink;
  const size = BEACH_BALL_POSE_SIZE * unit;
  const center = size / 2;
  const pixel = (BALL_RADIUS * 2 * unit) / inkW;
  const imgW = art.pixels[0] * pixel;
  const imgH = art.pixels[1] * pixel;
  const left = center - (inkX + inkW / 2) * pixel;
  const top = center - (inkY + inkH / 2) * pixel;
  const cornerX = Math.max(center - left, left + imgW - center);
  const cornerY = Math.max(center - top, top + imgH - center);
  // Android can clip transformed descendants at native view bounds. Budget for 360° rolling spin,
  // 1.18× bounce squash/stretch, and the full decoded 320×320 image bounds.
  const radius = Math.hypot(cornerX, cornerY) * 1.2 + 3 * unit;
  const inset = Math.max(0, Math.ceil(radius - center));
  return {
    size,
    padding: { left: inset, top: inset, right: inset, bottom: inset },
    canvas: size + inset * 2,
    image: {
      position: "absolute" as const,
      left: left + inset,
      top: top + inset,
      width: imgW,
      height: imgH,
    },
    inkDiameter: BALL_RADIUS * 2 * unit,
  };
}

/**
 * Uniformly scale the driftwood paddle to the engine's exact horizontal span (`logicalWidth`)
 * and align its contact face (`seat 0` top at y = 0, `seat 1` bottom at y = height) with Android-safe padding.
 */
export function beachPaddleLayout(logicalWidth: number, unit: number, seat: 0 | 1) {
  const art = beachIllustrated.paddle;
  const [inkX, inkY, inkW, inkH] = art.ink;
  const width = logicalWidth * unit;
  const height = PADDLE_HEIGHT * unit;
  const cx = width / 2;
  const cy = height / 2;
  const pixel = width / inkW;
  const imgW = art.pixels[0] * pixel;
  const imgH = art.pixels[1] * pixel;
  const imgLeft = cx - (inkX + inkW / 2) * pixel;
  const imgTop = seat === 0 ? -inkY * pixel : height - (inkY + inkH) * pixel;
  const maxDx = Math.max(cx - imgLeft, imgLeft + imgW - cx);
  const maxDy = Math.max(cy - imgTop, imgTop + imgH - cy);
  // Budget for cushioned impact dip (±4.2×unit), rebound compression/stretch, and ±0.06 rad hit tilt.
  const cos = Math.cos(0.06);
  const sin = Math.sin(0.06);
  const boundX = maxDx * 1.06 * cos + maxDy * 1.05 * sin + 2 * unit;
  const boundY = maxDx * 1.06 * sin + maxDy * 1.05 * cos + 5.5 * unit;
  const padX = Math.max(0, Math.ceil(boundX - cx));
  const padY = Math.max(0, Math.ceil(boundY - cy));
  return {
    width,
    height,
    padding: { left: padX, right: padX, top: padY, bottom: padY },
    canvasWidth: width + padX * 2,
    canvasHeight: height + padY * 2,
    image: {
      position: "absolute" as const,
      left: imgLeft + padX,
      top: imgTop + padY,
      width: imgW,
      height: imgH,
    },
    inkBox: {
      left: imgLeft + inkX * pixel + padX,
      top: imgTop + inkY * pixel + padY,
      width: inkW * pixel,
      height: inkH * pixel,
    },
  };
}
