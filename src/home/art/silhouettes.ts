import type { Bounds, HitShape, SceneEntity } from "../scene/types";
import { itemIds, type ItemId } from "../catalog";

/**
 * One hull table for touch, occlusion and support planes. Everything here is read off the art
 * in its authored 150-wide box: `box` is the art's viewBox height (130 or 150).
 * Soft shadows, lamp glow and transparent padding are not shapes. A hull may sit up to 1.3× the
 * painted area, because a finger has to land on it.
 */
type Prim =
  | readonly ["r", number, number, number, number]
  | readonly ["e", number, number, number, number]
  | readonly ["c", number, number, number, number, number]
  | readonly ["p", ...number[]];
type Hull = { box: 130 | 150; shapes: readonly Prim[]; open?: readonly Prim[] };
const hull = (box: 130 | 150, ...shapes: Prim[]): Hull => ({ box, shapes });
const opened = (base: Hull, ...open: Prim[]): Hull => ({ ...base, open });
/** Hand props are 24-unit drawings placed by LivingShape's translate(30 28) scale(3.6). */
const px = (x: number) => 30 + 3.6 * x, py = (y: number) => 28 + 3.6 * y;
const poly = (...points: number[]): Prim => ["p", ...points.flatMap((v, i) => [i % 2 ? py(v) : px(v)])];
const pe = (cx: number, cy: number, rx: number, ry = rx): Prim => ["e", px(cx), py(cy), rx * 3.6, ry * 3.6];
const pc = (ax: number, ay: number, bx: number, by: number, r: number): Prim => ["c", px(ax), py(ay), px(bx), py(by), r * 3.6];
const pot: Prim = ["p", 47, 84, 102, 84, 96, 113, 75, 122, 55, 113];
/** Leaves curve past a straight outline; push their corners out from the middle. */
const grown = (prim: Prim, k = 1.14): Prim => {
  if (prim[0] !== "p") return prim;
  const coords = prim.slice(1) as number[], n = coords.length / 2;
  let cx = 0, cy = 0;
  for (let i = 0; i < n; i++) { cx += coords[i * 2]; cy += coords[i * 2 + 1]; }
  cx /= n; cy /= n;
  return ["p", ...coords.map((v, i) => (i % 2 ? cy + (v - cy) * k : cx + (v - cx) * k))];
};
const lampShape = (dx: number, dy: number, sx: number, sy: number): Prim[] => {
  const x = (v: number) => dx + v * sx, y = (v: number) => dy + v * sy;
  return [["p", x(49), y(20), x(101), y(20), x(122), y(68), x(75), y(87), x(28), y(68)],
    ["c", x(75), y(61), x(75), y(122), 4.5 * sx], ["e", x(75), y(126), 27 * sx, 7 * sy]];
};
const deskTop = (t: (x: number, y: number) => [number, number], drawer: boolean): Prim[] => {
  const p = (...pts: number[]) => ["p", ...pts.flatMap((_, i) => (i % 2 ? [] : t(pts[i], pts[i + 1])))] as unknown as Prim;
  const leg = (ax: number, ay: number, bx: number, by: number): Prim => ["c", ...t(ax, ay), ...t(bx, by), 4.5];
  return [p(19, 62, 111, 52, 136, 72, 136, 76, 43, 90, 19, 78), leg(33, 89, 29, 116), leg(115, 86, 120, 111),
    ...(drawer ? [p(86, 84, 125, 77, 125, 98, 86, 104)] : [])];
};
const seatBack = (legs = true): Prim[] => [["r", 15, 39, 120, 73], ...(legs ? [["c", 35, 102, 35, 131, 4], ["c", 115, 102, 115, 131, 4]] as Prim[] : [])];
const rug = (ry: number, cy: number): Prim => ["e", 75, cy, 69, ry];
const wallPicture: Prim = ["r", 20, 24, 112, 82];
const STICKER: Hull = hull(150, ["e", 75, 75, 67, 67]);

const hulls: Record<string, Hull> = {
  // Beds, seats, baths (SeatArt, 150 box).
  bed: hull(150, ["p", 4, 37, 23, 31, 131, 31, 149, 48, 149, 112, 4, 112], ["c", 10, 110, 10, 117, 3], ["c", 142, 110, 142, 117, 3]),
  "bunk-bed": hull(150, ["r", 4, 8, 145, 134]),
  hammock: hull(150, ["p", 22, 92, 57, 59, 85, 49, 148, 45, 148, 101, 110, 122, 58, 124, 27, 107], ["p", 11, 48, 57, 74, 40, 100, 25, 100], ["e", 35, 76, 24, 25], ["c", 9, 27, 15, 130, 3.5], ["c", 141, 27, 135, 130, 3.5], ["c", 5, 130, 29, 130, 3.5], ["c", 121, 130, 145, 130, 3.5]),
  sofa: hull(150, ["r", 4, 39, 141, 75], ["c", 16, 112, 16, 124, 3.5], ["c", 133, 112, 133, 124, 3.5]),
  armchair: hull(150, ...seatBack()),
  chair: hull(150, ...seatBack()),
  beanbag: hull(150, ["r", 15, 39, 120, 74], ["p", 18, 104, 43, 101, 107, 101, 132, 104, 132, 122, 18, 122]),
  "rocking-chair": hull(150, ...seatBack(false), ["c", 39, 103, 39, 132, 3.5], ["c", 112, 103, 112, 132, 3.5], ["c", 19, 131, 75, 139, 4], ["c", 75, 139, 131, 131, 4]),
  stool: hull(150, ["e", 75, 94, 47, 13], ["c", 35, 100, 35, 131, 4], ["c", 115, 100, 115, 131, 4], ["c", 35, 119, 115, 119, 2.5]),
  bench: hull(150, ["e", 75, 100, 70, 13], ["r", 9, 98, 132, 10], ["c", 35, 102, 35, 131, 4], ["c", 115, 102, 115, 131, 4]),
  "floor-cushion": hull(150, ["e", 75, 118, 60, 16.5]),
  bathtub: hull(150, ["p", 13, 71, 75, 58, 137, 71, 138, 77, 130, 122, 75, 138, 20, 122, 12, 77], ["c", 119, 62, 119, 37, 4], ["c", 30, 127, 30, 136, 3], ["c", 120, 127, 120, 136, 3]),
  "bubble-bath": hull(150, ["p", 13, 66, 75, 58, 137, 66, 138, 77, 130, 122, 75, 138, 20, 122, 12, 77], ["c", 119, 62, 119, 37, 4], ["c", 30, 127, 30, 136, 3], ["c", 120, 127, 120, 136, 3]),
  lounger: hull(150, ["p", 8, 50, 20, 44, 46, 96, 33, 113], ["p", 40, 95, 135, 105, 125, 123, 33, 113], ["p", 16, 41, 28, 63, 12, 71, 0, 48], ["c", 38, 111, 29, 134, 4], ["c", 118, 120, 126, 134, 4]),
  "beach-towel": hull(150, ["p", 28, 76, 115, 71, 136, 118, 123, 131, 26, 131, 16, 125]),
  // Living art (150 box): hand props, lamps, kitchen fixtures.
  mango: hull(150, pe(11.5, 13, 10.4), pc(14, 6, 20, 2.2, 1.6)),
  banana: hull(150, pc(3.2, 4.8, 6.2, 14.6, 2.7), pc(6.2, 15.2, 17.6, 18.6, 3.2)),
  "rice-ball": hull(150, poly(12, .4, 15.6, 4, 23, 18, 21, 22.8, 3, 22.8, 1.2, 18, 8.4, 4)),
  cupcake: hull(150, pe(12.5, 8, 10.5, 7), poly(4.6, 13, 20.4, 13, 18.4, 23.4, 6.6, 23.4), pe(13, 3, 2.4)),
  "coconut-drink": hull(150, pe(12, 10, 8.6, 4.6), poly(2.6, 10, 21.4, 10, 21, 18, 16, 23.6, 8, 23.6, 3, 18), pc(13, 12, 15, 2.2, 1.2), pc(10, 2, 15, 2, 1.2)),
  juice: hull(150, poly(4.6, 7, 8, 2.6, 19, 2.6, 21.4, 7, 21.4, 23.4, 4.6, 23.4), pc(16, 11, 16, 1.2, 1), pc(10, 1, 16, 1, 1)),
  teddy: hull(150, pe(12, 9, 8.4), pe(5, 5, 4.4), pe(19, 5, 4.4), pe(12, 17, 8, 6.8), pc(4, 15, 2, 19, 2.4), pc(20, 15, 22, 19, 2.4), pc(7, 22, 4, 22, 1.6), pc(17, 22, 20, 22, 1.6)),
  ball: hull(150, pe(12, 12, 10.4)),
  book: hull(150, poly(2.6, 2.8, 20.4, .6, 20.4, 21.4, 2.6, 23.6)),
  shell: hull(150, poly(1.8, 7, 6, 4, 13, 1, 22, 5, 24, 14, 13, 22.4, 11, 22.4, 1, 13)),
  lamp: hull(150, ...lampShape(0, 0, 1, 1)),
  "floor-lamp": hull(150, ...lampShape(0, 0, 1, 1)),
  "table-lamp": hull(150, ...lampShape(15, 38, .8, .7)),
  "sink-counter": hull(150, ["r", 8, 58, 134, 81], ["c", 99, 57, 99, 28, 5], ["c", 99, 25, 83, 27, 4.5], ["c", 83, 27, 83, 40, 4.5]),
  // HD-07: the pan on the stove top and its handle.
  stove: hull(150, ["r", 9, 54, 132, 84], ["e", 75, 48, 32, 9], ["c", 104, 47, 134, 40, 4]),
  "kitchen-table": hull(150, ["r", 9, 58, 132, 15], ["c", 27, 71, 27, 137, 4.5], ["c", 123, 71, 123, 137, 4.5]),
  tv: hull(150, ["r", 9, 29, 132, 90], ["c", 60, 117, 52, 133, 4], ["c", 94, 117, 102, 133, 4]),
  radio: hull(150, ["r", 12, 47, 128, 80], ["c", 43, 46, 43, 30, 3], ["c", 43, 30, 75, 23, 3], ["c", 75, 23, 108, 30, 3], ["c", 108, 30, 108, 46, 3], ["c", 112, 48, 126, 20, 3]),
  fridge: opened(hull(150, ["r", 26, 7, 96, 134], ["c", 37, 140, 37, 144, 3], ["c", 111, 140, 111, 144, 3]), ["r", 26, 7, 96, 134], ["r", 119, 16, 29, 116], ["c", 37, 140, 37, 144, 3], ["c", 111, 140, 111, 144, 3]),
  "fruit-bowl": hull(150, ["p", 16, 76, 134, 76, 124, 112, 100, 127, 50, 127, 26, 112]),
  // ItemArt (130 box).
  rug: hull(130, ["e", 75, 91, 72, 28]),
  mat: hull(130, ["e", 75, 91, 72, 28]),
  table: hull(130, ["e", 75, 76, 63, 27], ["c", 33, 92, 31, 116, 5.5], ["c", 112, 92, 115, 116, 5.5]),
  checkers: hull(130, ["e", 75, 76, 63, 27], ["c", 33, 92, 31, 116, 5.5], ["c", 112, 92, 115, 116, 5.5]),
  shelf: hull(130, ["r", 21, 23, 108, 91]),
  books: hull(130, ["r", 21, 23, 108, 91]),
  trophies: hull(130, ["r", 21, 23, 108, 91]),
  plant: hull(130, pot, grown(["p", 73, 50, 44, 46, 33, 26, 58, 21]), grown(["p", 76, 37, 76, 17, 100, 11, 106, 28]), grown(["p", 83, 66, 91, 45, 122, 40, 122, 58]), grown(["p", 67, 71, 40, 71, 28, 53, 52, 48]), ["c", 58, 86, 74, 30, 3.5], ["c", 76, 86, 107, 50, 3.5]),
  "island-lamp": hull(130, ["p", 50, 18, 99, 18, 118, 64, 75, 81, 32, 64], ["c", 75, 55, 75, 107, 4.5], ["e", 75, 114, 26, 7]),
  "toy-box": opened(hull(130, ["p", 24, 66, 121, 60, 121, 110, 72, 122, 24, 111], ["p", 24, 66, 33, 51, 129, 48, 121, 62]), ["p", 24, 66, 121, 60, 121, 110, 72, 122, 24, 111], ["p", 24, 65, 36, 27, 129, 25, 121, 62]),
  blocks: hull(130, ["r", 28, 80, 44, 40], ["r", 73, 80, 44, 40], ["r", 51, 40, 44, 42]),
  abacus: hull(130, ["r", 36, 34, 69, 68], ["c", 23, 114, 23, 28, 4.5], ["c", 126, 28, 126, 114, 4.5], ["c", 26, 20, 122, 20, 4.5], ["c", 15, 117, 43, 117, 3], ["c", 108, 117, 137, 117, 3]),
  aquarium: hull(130, ["r", 19, 26, 114, 81], ["c", 34, 106, 34, 119, 4], ["c", 116, 106, 116, 119, 4]),
  telescope: hull(130, ["c", 30, 71, 124, 22, 16], ["c", 73, 67, 73, 86, 3.5], ["c", 73, 86, 43, 118, 3.5], ["c", 73, 86, 105, 118, 3.5], ["c", 73, 86, 72, 121, 3.5]),
  globe: hull(130, ["e", 77, 54, 38, 38], ["e", 75, 117, 29, 7], ["c", 75, 114, 75, 92, 4.5], ["c", 51, 22, 36, 55, 4.5], ["c", 36, 55, 60, 91, 4.5], ["c", 60, 91, 90, 97, 4.5], ["c", 90, 97, 116, 63, 4.5]),
  arcade: hull(130, ["p", 40, 14, 107, 14, 115, 75, 27, 80], ["p", 27, 80, 115, 75, 126, 110, 35, 120]),
  chime: hull(130, ["c", 75, 10, 75, 80, 2], ["c", 43, 43, 75, 30, 2.5], ["c", 75, 30, 107, 43, 2.5], ["c", 48, 42, 48, 66, 2], ["c", 103, 42, 103, 58, 2], ["e", 48, 77, 15, 15], ["e", 75, 89, 15, 15], ["e", 103, 70, 15, 15]),
  "robot-buddy": hull(130, ["r", 40, 38, 70, 70], ["c", 75, 39, 75, 23, 4.5], ["c", 51, 107, 51, 118, 4], ["c", 99, 107, 99, 118, 4]),
  "computer-desk": hull(130, ["r", 19, 80, 112, 18], ["c", 31, 96, 31, 119, 4.5], ["c", 119, 96, 119, 119, 4.5], ["r", 41, 22, 68, 56], ["r", 58, 76, 34, 11]),
  surfboard: hull(130, ["p", 74, 6, 95, 21, 104, 70, 101, 95, 84, 119, 73, 118, 51, 92, 47, 53, 55, 24]),
  // MoreItemArt (130 box).
  desk: hull(130, ...deskTop((x, y) => [x, y], true)),
  "side-table": hull(130, ...deskTop((x, y) => [20 + x * .73, y - 5], false)),
  "coffee-table": hull(130, ...deskTop((x, y) => [x, 32 + y * .73], false)),
  dresser: hull(130, ["p", 26, 24, 111, 16, 129, 28, 129, 102, 43, 115, 26, 104], ["c", 33, 100, 29, 116, 4], ["c", 115, 100, 120, 111, 4]),
  bookcase: hull(130, ["p", 26, 24, 111, 16, 129, 28, 129, 102, 43, 115, 26, 104], ["c", 33, 100, 29, 116, 4], ["c", 115, 100, 120, 111, 4]),
  "cake-stand": hull(130, ["e", 75, 112, 31, 8], ["c", 75, 110, 75, 83, 5.5], ["e", 75, 81, 50, 13], ["p", 41, 54, 75, 43, 109, 54, 109, 77, 75, 90, 41, 77], ["e", 76, 43, 7, 7]),
  teapot: hull(130, ["p", 45, 59, 75, 46, 105, 59, 114, 98, 92, 114, 58, 114, 41, 100], ["p", 46, 71, 20, 56, 28, 85, 50, 100], ["c", 103, 66, 131, 60, 6], ["c", 131, 60, 128, 90, 6], ["c", 128, 90, 106, 94, 6], ["e", 76, 47, 8, 8], ["e", 76, 59, 30, 9]),
  "potted-fern": hull(130, pot, ...[0, 20, 40].flatMap((d): Prim[] => [grown(["p", 75, 37 + d, 45, 40 + d, 29, 15 + d, 60, 9 + d]), grown(["p", 75, 37 + d, 88, 11 + d, 121, 17 + d, 113, 37 + d])])),
  cactus: hull(130, pot, ["c", 75, 88, 75, 30, 11], ["c", 90, 76, 104, 72, 8], ["c", 104, 72, 106, 50, 8], ["c", 60, 76, 44, 74, 8], ["c", 44, 74, 37, 50, 8]),
  "flower-vase": hull(130, pot, ["e", 48, 40, 20, 20], ["e", 76, 55, 20, 20], ["e", 102, 40, 20, 20], ["c", 75, 90, 48, 44, 2.5], ["c", 75, 90, 76, 60, 2.5], ["c", 75, 90, 102, 44, 2.5]),
  "banana-plant": hull(130, pot, grown(["p", 75, 34, 42, 31, 30, 7, 60, 4]), grown(["p", 77, 49, 87, 18, 120, 17, 123, 40]), grown(["p", 69, 62, 35, 68, 20, 46, 47, 41]), grown(["p", 86, 73, 105, 49, 133, 60, 122, 77]), ["c", 75, 89, 68, 50, 3.5], ["c", 68, 50, 75, 21, 3.5], ["c", 75, 69, 113, 34, 3.5]),
  "shell-pile": hull(130, ["e", 44, 87, 32, 24], ["e", 77, 100, 32, 24], ["e", 110, 87, 32, 24]),
  "string-lights": hull(130, ["c", 9, 32, 75, 63, 3], ["c", 75, 63, 142, 24, 3], ...[0, 1, 2, 3, 4, 5].map((n): Prim => ["e", 18 + n * 23, 55 + Math.sin(n / 5 * Math.PI) * 22 - n * 2, 8, 12])),
  lantern: hull(130, ["r", 47, 32, 58, 68], ["c", 75, 110, 75, 99, 4.5], ["e", 75, 115, 29, 7], ["c", 57, 30, 62, 11, 3.5], ["c", 62, 11, 88, 11, 3.5], ["c", 88, 11, 95, 30, 3.5]),
  dollhouse: hull(130, ["p", 17, 55, 75, 8, 138, 47, 131, 113, 24, 121]),
  easel: hull(130, ["r", 33, 24, 81, 71], ["c", 75, 17, 29, 119, 3.5], ["c", 75, 17, 125, 116, 3.5], ["c", 75, 17, 83, 119, 3.5], ["c", 28, 97, 122, 89, 4.5]),
  guitar: hull(130, ["e", 64, 96, 36, 36], ["e", 76, 69, 29, 27], ["c", 95, 21, 79, 60, 9.5]),
  kite: hull(130, ["p", 75, 14, 117, 56, 77, 95, 35, 55], ["c", 77, 94, 106, 105, 3], ["c", 106, 105, 83, 121, 3]),
  "round-rug": hull(130, rug(24.5, 87.5)),
  "striped-rug": hull(130, rug(24.5, 87.5)),
  "star-rug": hull(130, ["p", 62, 75, 88, 75, 95, 90, 75, 99, 55, 90], ["p", 75, 59, 88, 76, 62, 76], ["p", 117, 78, 95, 91, 87, 75], ["p", 100, 107, 75, 98, 95, 89], ["p", 50, 107, 55, 89, 75, 98], ["p", 33, 78, 63, 75, 55, 91]),
  "sea-picture": hull(130, wallPicture),
  "world-map": hull(130, wallPicture),
  mirror: hull(130, wallPicture),
  clock: hull(130, ["e", 75, 65, 45, 45]),
};

/** Front-pass paint from SeatShape, in its 150-unit viewport. Other art has no front pass. */
const beddingFront = (dy: number): Prim[] => [
  ["p", 60, 67 + dy, 147, 67 + dy, 147, 96 + dy, 105, 104 + dy, 60, 98 + dy],
  ["r", 5, 103 + dy, 142, 7], ["c", 10, 110 + dy, 10, 117 + dy, 3], ["c", 142, 110 + dy, 142, 117 + dy, 3],
];
const bathFront: Prim[] = [["p", 12, 76, 138, 76, 130, 121, 75, 138, 20, 121], ["r", 15, 70, 120, 14],
  ["c", 30, 127, 30, 136, 3], ["c", 120, 127, 120, 136, 3]];
const frontHulls: Record<string, Prim[]> = {
  bed: beddingFront(0),
  "bunk-bed": [...beddingFront(29), ...beddingFront(-31), ["c", 121, 65, 121, 143, 2], ["c", 138, 65, 138, 143, 2],
    ...[86, 106, 126].map((y): Prim => ["c", 121, y, 138, y, 2])],
  hammock: [["p", 57, 65, 148, 60, 148, 101, 100, 126, 57, 115], ["p", 22, 95, 57, 101, 100, 115, 100, 126, 27, 107]],
  sofa: [["r", 58, 68, 74, 43], ["r", 7, 99, 136, 14], ["r", 129, 67, 15, 44]],
  armchair: [["r", 23, 72, 16, 40], ["r", 111, 72, 16, 40]],
  beanbag: [["p", 23, 95, 43, 101, 45, 119, 18, 122, 18, 104], ["p", 107, 101, 127, 95, 132, 104, 132, 122, 105, 119]],
  bathtub: bathFront, "bubble-bath": bathFront,
};
export function itemFrontShapes(item: NonNullable<SceneEntity["item"]>, size: number): HitShape[] {
  return (frontHulls[item.item] ?? []).map((prim) => rescale(prim, 150, size, item.mirrored !== (item.rotation >= 180)));
}

function hullOf(id: ItemId): Hull | undefined {
  return id.startsWith("sticker:") ? STICKER : hulls[id];
}
/** Every catalog id, so an item with no hull fails a test instead of silently getting a square. */
export const authoredHullIds = (): string[] => itemIds.filter((id) => !!hullOf(id));

function rescale(prim: Prim, box: number, size: number, flip: boolean): HitShape {
  const scale = size / 150, x = (v: number) => ((flip ? 150 - v : v) / 150 - 0.5) * size;
  const y = (v: number) => (v + (150 - box) / 2) * scale - 0.85 * size;
  switch (prim[0]) {
    case "r": {
      const left = Math.min(x(prim[1]), x(prim[1] + prim[3]));
      return { kind: "box", left, top: y(prim[2]), width: prim[3] * scale, height: prim[4] * scale };
    }
    case "e":
      return { kind: "ellipse", x: x(prim[1]), y: y(prim[2]), rx: prim[3] * scale, ry: prim[4] * scale };
    case "c":
      return { kind: "capsule", ax: x(prim[1]), ay: y(prim[2]), bx: x(prim[3]), by: y(prim[4]), r: prim[5] * scale };
    default: {
      const points: number[] = [];
      for (let i = 1; i < prim.length; i += 2) points.push(x(prim[i] as number), y(prim[i + 1] as number));
      return { kind: "polygon", points };
    }
  }
}

/** Painted shapes for an item, relative to its contact, in room units. */
export function itemShapes(item: NonNullable<SceneEntity["item"]>, size: number): HitShape[] {
  const entry = hullOf(item.item);
  if (!entry) return [];
  const flip = item.mirrored !== item.rotation >= 180, active = item.powered ?? item.state === "active";
  return (active && entry.open ? entry.open : entry.shapes).map((prim) => rescale(prim, entry.box, size, flip));
}

export function shapeBounds(shape: HitShape): Bounds {
  switch (shape.kind) {
    case "box":
      return { left: shape.left, top: shape.top, width: shape.width, height: shape.height };
    case "ellipse":
      return { left: shape.x - shape.rx, top: shape.y - shape.ry, width: shape.rx * 2, height: shape.ry * 2 };
    case "capsule": {
      const left = Math.min(shape.ax, shape.bx) - shape.r, top = Math.min(shape.ay, shape.by) - shape.r;
      return { left, top, width: Math.abs(shape.ax - shape.bx) + shape.r * 2, height: Math.abs(shape.ay - shape.by) + shape.r * 2 };
    }
    default: {
      const xs = shape.points.filter((_, i) => i % 2 === 0), ys = shape.points.filter((_, i) => i % 2 === 1);
      return { left: Math.min(...xs), top: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
    }
  }
}
export function unionBounds(shapes: readonly HitShape[]): Bounds | undefined {
  if (!shapes.length) return undefined;
  const boxes = shapes.map(shapeBounds);
  const left = Math.min(...boxes.map((b) => b.left)), top = Math.min(...boxes.map((b) => b.top));
  return { left, top, width: Math.max(...boxes.map((b) => b.left + b.width)) - left, height: Math.max(...boxes.map((b) => b.top + b.height)) - top };
}

/** Outer paint rectangle in absolute room coordinates, for support planes and overlap QA. */
export function paintedBounds(entity: SceneEntity): Bounds | undefined {
  const item = entity.item;
  if (!item) return;
  const bounds = unionBounds(entity.attachment.kind === "hand" && entity.shapes ? entity.shapes : itemShapes(item, entity.bounds.width));
  return bounds && { ...bounds, left: bounds.left + entity.contact.x, top: bounds.top + entity.contact.y };
}

/** Largest axis-aligned rectangle known to be painted, so occlusion never reports a false hide. */
export function occluderBounds(shape: HitShape): Bounds | undefined {
  const b = shapeBounds(shape);
  switch (shape.kind) {
    case "box":
      return b;
    case "ellipse": {
      const k = Math.SQRT1_2;
      return { left: shape.x - shape.rx * k, top: shape.y - shape.ry * k, width: shape.rx * 2 * k, height: shape.ry * 2 * k };
    }
    case "capsule": {
      // A capsule is convex: all four corners inside proves the entire rectangle is painted.
      // An inset of its bounding box alone is not safe for diagonal bars.
      if (shape.r * 2 < 26) return undefined;
      const cx = (shape.ax + shape.bx) / 2, cy = (shape.ay + shape.by) / 2;
      const vx = shape.bx - shape.ax, vy = shape.by - shape.ay, length = vx * vx + vy * vy;
      for (let k = 1; k > 0; k -= .04) {
        const halfW = b.width * k / 2, halfH = b.height * k / 2;
        const corners = [[cx - halfW, cy - halfH], [cx + halfW, cy - halfH], [cx + halfW, cy + halfH], [cx - halfW, cy + halfH]];
        if (corners.every(([x, y]) => {
          const t = length ? Math.max(0, Math.min(1, ((x - shape.ax) * vx + (y - shape.ay) * vy) / length)) : 0;
          return Math.hypot(x - shape.ax - vx * t, y - shape.ay - vy * t) <= shape.r;
        })) return { left: cx - halfW, top: cy - halfH, width: halfW * 2, height: halfH * 2 };
      }
      return undefined;
    }
    default: {
      // Shrink the bounding box about the centroid until every corner is inside.
      const n = shape.points.length / 2;
      let cx = 0, cy = 0;
      for (let i = 0; i < n; i++) { cx += shape.points[i * 2]; cy += shape.points[i * 2 + 1]; }
      cx /= n; cy /= n;
      for (let k = 1; k > 0.1; k -= 0.08) {
        const left = cx + (b.left - cx) * k, right = cx + (b.left + b.width - cx) * k;
        const top = cy + (b.top - cy) * k, bottom = cy + (b.top + b.height - cy) * k;
        const corners = [[left, top], [right, top], [right, bottom], [left, bottom]] as const;
        if (corners.every(([x, y]) => insidePolygon(shape.points, x, y)))
          return { left, top, width: right - left, height: bottom - top };
      }
      return undefined;
    }
  }
}
function insidePolygon(points: readonly number[], x: number, y: number): boolean {
  let positive = false, negative = false;
  const n = points.length / 2;
  for (let i = 0; i < n; i++) {
    const ax = points[i * 2], ay = points[i * 2 + 1], bx = points[((i + 1) % n) * 2], by = points[((i + 1) % n) * 2 + 1];
    const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (cross > 0) positive = true;
    if (cross < 0) negative = true;
  }
  return !(positive && negative);
}
