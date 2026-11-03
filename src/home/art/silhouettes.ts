import type { Bounds, SceneEntity } from "../scene/types";
/** Conservative outer paint hulls in the authored SVG coordinates, with stroke.
 * Transparent square padding is not furniture. Shared by picking and starter QA. */
const hulls: Record<string, readonly [number, number, number, number, number?]> = {
  bed: [0, 30, 150, 120], chair: [28, 14, 129, 143], shelf: [12, 26, 138, 121, 130], "toy-box": [22, 47, 130, 123, 130],
  fridge: [25, 6, 123, 147], "sink-counter": [5, 18, 145, 141], stove: [7, 29, 143, 140],
  "kitchen-table": [7, 56, 143, 142], stool: [27, 80, 123, 136],
  hammock: [2, 23, 150, 134], "floor-cushion": [16, 101, 134, 138],
  "bubble-bath": [8, 24, 142, 140], lounger: [3, 35, 139, 139],
  "banana-plant": [17, 0, 136, 128, 130],
};
export function paintedBounds(entity: SceneEntity): Bounds | undefined {
  const item = entity.item, hull = item && hulls[item.item];
  if (!item || !hull) return;
  const [left, top, right, bottom, height = 150] = hull, size = entity.bounds.width;
  const flipped = item.mirrored !== (item.rotation >= 180);
  // Fridge door opens to x149; reflect together with its body.
  const x2 = item.item === "fridge" && (item.powered ?? item.state === "active") ? 150 : right;
  return { left: entity.contact.x + ((flipped ? 150 - x2 : left) / 150 - .5) * size,
    top: entity.contact.y - .85 * size + (150 - height) / 300 * size + top / 150 * size,
    width: (x2 - left) / 150 * size, height: (bottom - top) / 150 * size };
}
