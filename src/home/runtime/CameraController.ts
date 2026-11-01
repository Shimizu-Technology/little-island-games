import type { CameraMatrix } from '../scene/camera';
import { screenToRoom } from '../scene/camera';
import { housePoint, screenPoint } from '../scene/types';
import type { Building } from '../camera';
import { roomOrigin } from '../camera';

export type Viewport = { width: number; height: number };
export function fitCamera(view: Viewport, building: Building): CameraMatrix {
  'worklet';
  const scale = Math.min(view.width / building.width, view.height / building.height);
  return { a: scale, b: 0, c: 0, d: scale, tx: (view.width - building.width * scale) / 2, ty: (view.height - building.height * scale) / 2 };
}
export function boundCamera(camera: CameraMatrix, view: Viewport, building: Building): CameraMatrix {
  'worklet';
  const w = building.width * camera.a, h = building.height * camera.d;
  return { ...camera,
    tx: w <= view.width ? (view.width - w) / 2 : Math.min(0, Math.max(view.width - w, camera.tx)),
    ty: h <= view.height ? (view.height - h) / 2 : Math.min(0, Math.max(view.height - h, camera.ty)),
  };
}
export function focusCamera(index: number, view: Viewport, building: Building, at = { x: 400, y: 320 }): CameraMatrix {
  'worklet';
  const origin = roomOrigin(index, building);
  const scale = Math.min(view.width / 800, view.height / 560) * 1.08;
  return boundCamera({ a: scale, b: 0, c: 0, d: scale, tx: view.width / 2 - (origin.x + at.x) * scale, ty: view.height / 2 - (origin.y + at.y) * scale }, view, building);
}
export function zoomCamera(camera: CameraMatrix, ratio: number, x: number, y: number, view: Viewport, building: Building): CameraMatrix {
  'worklet';
  const minimum = fitCamera(view, building).a;
  const maximum = Math.min(view.width / 800, view.height / 560) * 1.75;
  const scale = Math.max(minimum, Math.min(maximum, camera.a * ratio));
  const factor = scale / camera.a;
  return boundCamera({ a: scale, b: 0, c: 0, d: scale, tx: x - (x - camera.tx) * factor, ty: y - (y - camera.ty) * factor }, view, building);
}
export function roomAtScreen(x: number, y: number, camera: CameraMatrix, building: Building): number {
  'worklet';
  const p = screenToRoom(screenPoint(x, y), camera, housePoint(0, 0));
  for (let i = 0; i < building.count; i++) {
    const origin = roomOrigin(i, building);
    if (p.x >= origin.x && p.x <= origin.x + 800 && p.y >= origin.y && p.y <= origin.y + 560) return i;
  }
  return -1;
}
export function edgeVelocity(x: number, width: number, elapsed: number): number {
  'worklet';
  if (elapsed < 180) return 0;
  const band = Math.max(24, Math.min(48, width * .06));
  if (x < band) return 360 * Math.min(1, (band - x) / band) ** 2;
  if (x > width - band) return -360 * Math.min(1, (x - width + band) / band) ** 2;
  return 0;
}
