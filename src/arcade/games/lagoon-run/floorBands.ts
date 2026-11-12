import { projectTrack } from './camera';
import { multiply3, quadHomography, matrix4 } from './quad';

/**
 * Scrolling deck (LG-S3). The planks are one periodic world-space texture (u = lanes, w = track
 * depth). The camera's depth curve is not a single homography, so the visible deck is split into
 * camera-fixed bands; each band maps its own baked slice with one projective matrix whose
 * corners are exact. Seams stay locked to track depth (hazards never slide on the boards), the
 * band boundaries are exact, and the interior error stays under 0.7 camera units
 * (tests/arcade-lagoon-look.test.ts). Each frame updates one transform per band: no full-frame
 * flipbook, so the texture costs about one deck of memory instead of twelve.
 */
export const BOARD = .065;
/** Two boards: joints alternate and lane cue dashes are painted on every other board. */
export const FLOOR_PERIOD = BOARD * 2;
/** Beyond this depth the far deck is a static, hazed slice. */
export const FLOOR_FAR = -.6;
/** The deck to the bottom of the tallest phone stage, with shake margin. */
export const FLOOR_NEAR = 1.62;
export const FLOOR_EDGES = [-.6, -.52, -.41, -.3, -.18, -.06, .06, .18, .3, .42, .54, .66, .78, .9, 1.01, 1.12, 1.23, 1.33, 1.43, 1.53, 1.62] as const;
/** Deck edge trim, just inside the rail posts at lanes 1 ± 1.55. */
export const DECK_U0 = -.56, DECK_U1 = 2.56;
/** Bands are baked @3x of their zoomed on-screen size at the band's nearest (largest) edge. */
export const FLOOR_DENSITY = 3;
/** Pre-zoom half-width that can ever be on screen: wide iPad stage, lane follow and shake. */
const VISIBLE_HALF = 252;
export type FloorBand = { index: number; far: number; near: number; u0: number; u1: number; width: number; height: number; top: number; bottom: number };
export const FLOOR_BANDS: FloorBand[] = FLOOR_EDGES.slice(0, -1).map((far, index) => {
  const near = FLOOR_EDGES[index + 1], a = projectTrack(1, near), b = projectTrack(1, far);
  // Only the lanes that can ever be on screen at this depth are baked.
  const reach = Math.min(DECK_U1 - 1, VISIBLE_HALF / (390 * (2 / 3) * .46 * a.scale));
  const u0 = Math.max(DECK_U0, 1 - reach), u1 = Math.min(DECK_U1, 1 + reach);
  const nearWidth = projectTrack(u1, near).x - projectTrack(u0, near).x;
  // Texture is uniform in track depth: size it by the nearest (most magnified) rows.
  const rate = (a.y - projectTrack(1, near - .005).y) / .005;
  return { index, far, near, u0, u1, width: Math.ceil(nearWidth * 1.25), height: Math.ceil((near - far + FLOOR_PERIOD) * rate * 1.25), top: b.y, bottom: a.y };
});

/** The band's native matrix for this travel. View origin is the clip container's top-left. */
export function floorBandMatrix(band: FloorBand, travel: number, clipLeft: number, clipTop: number): number[] {
  'worklet';
  const phase = ((travel % FLOOR_PERIOD) + FLOOR_PERIOD) % FLOOR_PERIOD;
  const length = band.near - band.far, total = length + FLOOR_PERIOD;
  // Image rows: top is track depth far - period, bottom is near. Screen near edge shows near - phase.
  const yNear = (length + FLOOR_PERIOD - phase) / total * band.height, span = length / total * band.height;
  const q = [projectTrack(band.u0, band.near), projectTrack(band.u1, band.near), projectTrack(band.u1, band.far), projectTrack(band.u0, band.far)].map(p => ({ x: p.x - clipLeft, y: p.y - clipTop }));
  const h = quadHomography(q as unknown as Parameters<typeof quadHomography>[0]);
  return matrix4(multiply3(h, [1 / band.width, 0, 0, 0, -1 / span, yNear / span, 0, 0, 1]));
}
