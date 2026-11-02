import { restingVisible, paintDepth } from "./group";
import { capabilityOf } from "../world";
import { decorSpec } from "../catalog";
import type { Bounds, RoomPoint, Scene } from "../scene/types";
export type PickProxy = { id: string; bounds: Bounds; depth: number; priority: number };
export function prepareHits(scene: Scene): Record<string, PickProxy[]> {
  return Object.fromEntries(
    Object.entries(scene.rooms).map(([room, index]) => [
      room,
      index.hitProxies
        .filter((proxy) => scene.entities[proxy.id] && restingVisible(scene.entities[proxy.id], scene))
        .map((proxy) => {
          const e = scene.entities[proxy.id];
          const priority = e.character
            ? 2
            : e.item && (capabilityOf(e.item.item).holdable || decorSpec(e.item.item).small)
              ? 3
              : 1;
          return { ...proxy, depth: paintDepth(e, scene), priority };
        }),
    ])
  );
}
/** Exact visible shapes win before expansion. Expanded overlaps choose the nearest. */
export function pickEntity(proxies: readonly PickProxy[], point: RoomPoint, scale: number): string | undefined {
  "worklet";
  let winner: string | undefined,
    bestTier = -1,
    bestDepth = -Infinity,
    bestDistance = Infinity;
  for (const p of proxies) {
    const b = p.bounds,
      dx = Math.max(b.left - point.x, 0, point.x - b.left - b.width),
      dy = Math.max(b.top - point.y, 0, point.y - b.top - b.height);
    const exact = dx === 0 && dy === 0;
    const outside = Math.hypot(dx, dy);
    const expansion = Math.min(8 / scale, Math.max(0, 22 / scale - Math.min(b.width, b.height) / 2));
    if (!exact && outside > expansion) continue;
    const tier = exact ? p.priority + 1 : 0;
    const distance = exact ? Math.hypot(point.x - b.left - b.width / 2, point.y - b.top - b.height / 2) : outside;
    const depth = exact ? p.depth : 0;
    if (
      tier > bestTier ||
      (tier === bestTier &&
        (depth > bestDepth ||
          (depth === bestDepth && (distance < bestDistance || (distance === bestDistance && p.id < (winner ?? "~"))))))
    ) {
      winner = p.id;
      bestTier = tier;
      bestDepth = depth;
      bestDistance = distance;
    }
  }
  return winner;
}
