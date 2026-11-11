/** A single pinhole camera in the uniform 390×660 arena. z=-1.2 is the horizon, z=1 contact. */
export const TRACK_WIDTH = 390, TRACK_HEIGHT = 660, HORIZON = .44, CONTACT = .87, ROAD_HALF = .46;
export function projectTrack(lane: number, z: number) {
  "worklet";
  // Perspective grows slowly at the horizon, rapidly near the runner.
  const depth = Math.max(0, (z + 1.2) / 2.2), scale = depth / (2 - Math.min(1.3, depth));
  return { x: TRACK_WIDTH * (.5 + (lane - 1) * (2 / 3) * ROAD_HALF * scale), y: TRACK_HEIGHT * (HORIZON + (CONTACT - HORIZON) * scale), scale };
}
export function roadEdge(z: number, right: boolean) { "worklet"; return projectTrack(right ? 2.5 : -.5, z); }
/** Approach fraction 0 at the horizon, 1 at contact. */
export function approach(z: number) { "worklet"; return Math.max(0, Math.min(1, (z + 1.2) / 2.2)); }
/** Hazard fade rule: actors fade in over the first 15% of the approach only, then stay solid. */
export const FADE_IN = .15;
export function arrivalOpacity(z: number) { "worklet"; return Math.min(1, approach(z) / FADE_IN); }
/** Sprite scale is around its centre; compensate so its visible foot stays on the camera point. */
export function trackSprite(lane: number, z: number, width: number, height: number) {
  "worklet";
  const p = projectTrack(lane, z);
  return { x: p.x - width / 2, y: p.y - height / 2 - height * p.scale / 2, scale: p.scale, opacity: z > -1.2 && z < 1.16 ? 1 : 0 };
}

/** Presentation-only slot, after the existing 311 actor/geometry slots. */
export const CAMERA_SLOT = 311;

/** One optical zoom keeps runner, duck clearance, ramps and shadows in the same camera.
 * LG-S3: 1.25 (was 1.7), so the child sees the lane ahead and the sky. */
export const HERO_ZOOM = 1.25;
/** The runner is drawn 28% smaller than the track scale, so it never hides the next hazard in its lane. */
export const HERO_SCALE = .72;
/** Speed widens the view slightly: at most 3.5% wider at full speed (none with Reduce Motion). */
export const FOV_KICK = .035;
/** Camera-frame x span for full-width washes (deck haze, near light). It must cover the widest
 * stage (iPhone landscape, iPad) at the widest FOV kick and lane follow, or their edges show. */
export const WASH_SPAN = { x: -2000, width: 4390 };
/** Horizon sits at 34% of the visible stage height on every screen. */
export const SKY_LINE = .34;
export type StageLayout = {
  /** Points per logical unit. */
  scale: number;
  /** Logical stage size: at least 390×660, extended to fill the arena (no letterbox). */
  width: number; height: number;
  /** Offset of the 390×660 camera frame inside the stage. */
  x: number; y: number;
  /** Stage y of the horizon after zoom. */
  horizon: number;
};
/** Fit the 390-wide track to the arena and extend the world to fill it: never letterbox. */
export function stageLayout(arenaWidth: number, arenaHeight: number): StageLayout {
  const w = arenaWidth > 0 ? arenaWidth : TRACK_WIDTH, h = arenaHeight > 0 ? arenaHeight : TRACK_HEIGHT;
  const scale = Math.min(w / TRACK_WIDTH, h / TRACK_HEIGHT);
  const width = Math.max(TRACK_WIDTH, w / scale), height = Math.max(TRACK_HEIGHT, h / scale);
  const contact = TRACK_HEIGHT * CONTACT, zoomedHorizon = contact - (contact - TRACK_HEIGHT * HORIZON) * HERO_ZOOM;
  const horizon = SKY_LINE * height;
  return { scale, width, height, x: (width - TRACK_WIDTH) / 2, y: horizon - zoomedHorizon, horizon };
}
/** Where a camera-frame point lands on the stage, before shake and follow. */
export function stagePoint(layout: StageLayout, x: number, y: number) {
  const cx = TRACK_WIDTH / 2, cy = TRACK_HEIGHT * CONTACT;
  return { x: layout.x + cx + (x - cx) * HERO_ZOOM, y: layout.y + cy + (y - cy) * HERO_ZOOM };
}
