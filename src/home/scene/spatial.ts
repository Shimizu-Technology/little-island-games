import { onShapes } from "./hitShapes";
// Worklet primitives stay independent of legacy geometry and reducer imports.
import { anchorsFor } from "./species";
import { roomPoint } from "./types";
import type { Bounds, RoomIndex, RoomPoint, SceneEntity, SceneState } from "./types";
import type { Character } from "../model";

/** Exact revision token; navigation is deliberately excluded. */
export function worldRevision(state: SceneState): string {
  return JSON.stringify(state.rooms);
}
export function translatedBounds(bounds: Bounds, contact: RoomPoint): Bounds {
  "worklet";
  return { ...bounds, left: bounds.left + contact.x, top: bounds.top + contact.y };
}
export function overlaps(a: Bounds, b: Bounds): boolean {
  "worklet";
  return a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
}
export function contains(bounds: Bounds, point: RoomPoint): boolean {
  "worklet";
  return (
    point.x >= bounds.left &&
    point.x <= bounds.left + bounds.width &&
    point.y >= bounds.top &&
    point.y <= bounds.top + bounds.height
  );
}
export function contained(bounds: Bounds): boolean {
  "worklet";
  return (
    bounds.left >= 8 - 1e-7 &&
    bounds.top >= 8 - 1e-7 &&
    bounds.left + bounds.width <= 792 + 1e-7 &&
    bounds.top + bounds.height <= 552 + 1e-7
  );
}
export function standingContact(point: RoomPoint, slot: Character["slot"]): RoomPoint {
  "worklet";
  const bounds = anchorsFor(slot, "stand", "front").bounds;
  return roomPoint(
    Math.max(8 - bounds.left, Math.min(792 - bounds.left - bounds.width, point.x)),
    Math.max(350, Math.min(540, 552 - bounds.top - bounds.height, point.y))
  );
}
/** Acyclic descendants, stable across source-array reordering. */
export function movingGroup(index: Pick<RoomIndex, "entities">, subject: SceneEntity): SceneEntity[] {
  "worklet";
  const result: SceneEntity[] = [];
  const pending = [subject];
  const visited: Record<string, boolean> = {};
  while (pending.length) {
    const entity = pending.shift()!;
    if (visited[entity.id]) continue;
    visited[entity.id] = true;
    result.push(entity);
    for (const id of [...entity.children].sort()) {
      if (index.entities[id]) pending.push(index.entities[id]);
    }
  }
  return result;
}
/** A dropped thing's bounds. `occludedFraction` subtracts only what is really painted in front. */
export function occludedFraction(bounds: Bounds, depth: number, bands: RoomIndex["occlusionBands"]): number {
  "worklet";
  const clipped = bands
    .filter((b) => b.depth > depth && overlaps(b.bounds, bounds))
    .map(({ bounds: b }) => ({
      left: Math.max(b.left, bounds.left),
      right: Math.min(b.left + b.width, bounds.left + bounds.width),
      top: Math.max(b.top, bounds.top),
      bottom: Math.min(b.top + b.height, bounds.top + bounds.height),
    }));
  const edges = [...new Set(clipped.flatMap((b) => [b.left, b.right]))].sort((a, b) => a - b);
  let area = 0;
  for (let i = 1; i < edges.length; i++) {
    let end = bounds.top;
    let height = 0;
    for (const b of clipped.filter((b) => b.left < edges[i] && b.right > edges[i - 1]).sort((a, b) => a.top - b.top)) {
      height += Math.max(0, b.bottom - Math.max(end, b.top));
      end = Math.max(end, b.bottom);
    }
    area += (edges[i] - edges[i - 1]) * height;
  }
  return area / (bounds.width * bounds.height);
}

/** Bounded painted-hull sampling, only for catalog candidates. Transparent box corners never count as visible art. */
export function catalogCovered(entity: SceneEntity, contact: RoomPoint, depth: number, bands: RoomIndex["occlusionBands"]): number {
  "worklet";
  const bounds = entity.bounds;
  const front = bands.filter(b => b.id !== entity.id && b.depth > depth && overlaps(b.bounds, translatedBounds(bounds, contact)));
  if (!front.length) return 0;
  let painted = 0, covered = 0;
  for (let row = 0; row < 12; row++) for (let col = 0; col < 12; col++) {
    const x = bounds.left + (col + .5) * bounds.width / 12;
    const y = bounds.top + (row + .5) * bounds.height / 12;
    if (entity.shapes?.length && !onShapes(entity.shapes, x, y)) continue;
    painted++;
    if (front.some(b => x + contact.x >= b.bounds.left && x + contact.x <= b.bounds.left + b.bounds.width &&
      y + contact.y >= b.bounds.top && y + contact.y <= b.bounds.top + b.bounds.height &&
      (!b.shapes?.length || !b.contact || onShapes(b.shapes, x + contact.x - b.contact.x, y + contact.y - b.contact.y)))) covered++;
  }
  return painted ? covered / painted : 1;
}
