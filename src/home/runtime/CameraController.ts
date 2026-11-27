import type { CameraMatrix } from "../scene/camera";
import { screenToRoom } from "../scene/camera";
import { housePoint, screenPoint, type Bounds } from "../scene/types";
import type { Building } from "../camera";
import { roomOrigin } from "../camera";

export type Viewport = { width: number; height: number };
export function fitCamera(view: Viewport, building: Building): CameraMatrix {
  "worklet";
  const scale = Math.min(view.width / building.width, view.height / building.height);
  return {
    a: scale,
    b: 0,
    c: 0,
    d: scale,
    tx: (view.width - building.width * scale) / 2,
    ty: (view.height - building.height * scale) / 2,
  };
}
export function boundCamera(camera: CameraMatrix, view: Viewport, building: Building): CameraMatrix {
  "worklet";
  const w = building.width * camera.a,
    h = building.height * camera.d;
  return {
    ...camera,
    tx: w <= view.width ? (view.width - w) / 2 : Math.min(0, Math.max(view.width - w, camera.tx)),
    ty: h <= view.height ? (view.height - h) / 2 : Math.min(0, Math.max(view.height - h, camera.ty)),
  };
}
export function portraitPhone(view: Viewport): boolean {
  "worklet";
  return view.width < 600 && view.height > view.width;
}
export function roomScale(view: Viewport): number {
  "worklet";
  return portraitPhone(view) ? view.width / 800 : view.height / 620;
}
export function focusCamera(index: number, view: Viewport, building: Building, at = { x: 400, y: 320 }): CameraMatrix {
  "worklet";
  const origin = roomOrigin(index, building);
  const scale = roomScale(view);
  // Legacy complete-room camera remains available to geometry fixtures and embedders.
  const centerX = portraitPhone(view) ? 400 : at.x;
  return boundCamera(
    {
      a: scale,
      b: 0,
      c: 0,
      d: scale,
      tx: view.width / 2 - (origin.x + centerX) * scale,
      ty: view.height / 2 - (origin.y + at.y) * scale,
    },
    view,
    building
  );
}
/** Pan only when a committed actor is actually clipped. Never change the zoom. */
export function includeBounds(camera: CameraMatrix, bounds: Bounds, view: Viewport, building: Building): CameraMatrix {
  "worklet";
  const left = bounds.left * camera.a + camera.tx,
    right = (bounds.left + bounds.width) * camera.a + camera.tx,
    top = bounds.top * camera.d + camera.ty,
    bottom = (bounds.top + bounds.height) * camera.d + camera.ty;
  const dx = left < 0 ? -left : right > view.width ? view.width - right : 0;
  const dy = top < 0 ? -top : bottom > view.height ? view.height - bottom : 0;
  if (!dx && !dy) return camera;
  return boundCamera({ ...camera, tx: camera.tx + dx, ty: camera.ty + dy }, view, building);
}
export function zoomCamera(
  camera: CameraMatrix,
  ratio: number,
  x: number,
  y: number,
  view: Viewport,
  building: Building
): CameraMatrix {
  "worklet";
  const minimum = fitCamera(view, building).a;
  const maximum = Math.max(view.width / 800, view.height / 560) * 1.75;
  const scale = Math.max(minimum, Math.min(maximum, camera.a * ratio));
  const factor = scale / camera.a;
  return boundCamera(
    { a: scale, b: 0, c: 0, d: scale, tx: x - (x - camera.tx) * factor, ty: y - (y - camera.ty) * factor },
    view,
    building
  );
}
export function roomAtScreen(x: number, y: number, camera: CameraMatrix, building: Building): number {
  "worklet";
  const p = screenToRoom(screenPoint(x, y), camera, housePoint(0, 0));
  for (let i = 0; i < building.count; i++) {
    const origin = roomOrigin(i, building);
    if (p.x >= origin.x && p.x <= origin.x + 800 && p.y >= origin.y && p.y <= origin.y + 560) return i;
  }
  return -1;
}
/** HM-15 / HC-02: the sand below a ground-floor room, or -1. */
export function shoreAtScreen(x: number, y: number, camera: CameraMatrix, building: Building): number {
  "worklet";
  if (building.place !== undefined) return -1;
  const p = screenToRoom(screenPoint(x, y), camera, housePoint(0, 0));
  for (let i = 0; i < Math.min(building.columns, building.count); i++) {
    const origin = roomOrigin(i, building);
    if (p.x >= origin.x && p.x <= origin.x + 800 && p.y > origin.y + 560 && p.y <= origin.y + 740) return i;
  }
  return -1;
}
export const EDGE_BAND = 48;
export function edgeVelocity(x: number, width: number, elapsed: number): number {
  "worklet";
  if (elapsed < 120) return 0;
  // HM-14 (Leon's D7): a 48 pt band on every device, matching the carry gate.
  const band = EDGE_BAND;
  if (x < band) return 520 * Math.min(1, (band - x) / band) ** 2;
  if (x > width - band) return -520 * Math.min(1, (x - width + band) / band) ** 2;
  return 0;
}

export function panInertia(velocity: number, dt: number, elapsed: number, reduced: boolean): number {
  "worklet";
  if (reduced || elapsed >= 500 || Math.abs(velocity) < 8) return 0;
  return Math.max(-1200, Math.min(1200, velocity)) * Math.exp(-dt / 140);
}

/** Room-first play camera. A portrait phone sees large actors and pans across one room. */
export function cozyRoomScale(view: Viewport): number {
  'worklet';
  return portraitPhone(view) ? Math.max(view.width / 560, view.height / 560) : Math.max(view.width / 800, view.height / 560);
}
export function cozyFocusCamera(index: number, view: Viewport, building: Building, at = { x: 400, y: view.width > view.height ? 390 : 280 }): CameraMatrix {
  'worklet';
  const origin = roomOrigin(index, building), scale = cozyRoomScale(view);
  return boundCamera({ a: scale, b: 0, c: 0, d: scale,
    tx: view.width / 2 - (origin.x + at.x) * scale,
    ty: view.height / 2 - (origin.y + at.y) * scale }, view, building);
}
