import { housePoint, roomPoint, screenPoint } from "./types";
import type { HousePoint, RoomPoint, ScreenPoint } from "./types";

/** [a c tx; b d ty; 0 0 1], house units to logical screen points. */
export type CameraMatrix = Readonly<{ a: number; b: number; c: number; d: number; tx: number; ty: number }>;
export const identityCamera: CameraMatrix = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };

export function roomToHouse(point: RoomPoint, origin: HousePoint): HousePoint {
  "worklet";
  return housePoint(point.x + origin.x, point.y + origin.y);
}
export function houseToRoom(point: HousePoint, origin: HousePoint): RoomPoint {
  "worklet";
  return roomPoint(point.x - origin.x, point.y - origin.y);
}
export function roomToScreen(point: RoomPoint, camera: CameraMatrix, origin: HousePoint): ScreenPoint {
  "worklet";
  const world = roomToHouse(point, origin);
  return screenPoint(camera.a * world.x + camera.c * world.y + camera.tx, camera.b * world.x + camera.d * world.y + camera.ty);
}
/** Reject a singular camera at setup, rather than inventing pointer coordinates. */
export function screenToRoom(point: ScreenPoint, camera: CameraMatrix, origin: HousePoint): RoomPoint {
  "worklet";
  const det = camera.a * camera.d - camera.b * camera.c;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-9) {
    throw new Error("The scene camera must be invertible.");
  }
  const x = point.x - camera.tx;
  const y = point.y - camera.ty;
  return houseToRoom(housePoint((camera.d * x - camera.c * y) / det, (-camera.b * x + camera.a * y) / det), origin);
}
export function cameraScale(camera: CameraMatrix): number {
  "worklet";
  return Math.sqrt(Math.abs(camera.a * camera.d - camera.b * camera.c));
}
