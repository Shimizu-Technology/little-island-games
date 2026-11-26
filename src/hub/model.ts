import { shelfGames, type ShelfGame } from '../learn/home';

export const places = [
  { id: 'school', name: 'School', hint: 'Six ways to wonder', x: .27, y: .27 },
  { id: 'library', name: 'Library', hint: 'Explore our world', x: .73, y: .27 },
  { id: 'arcade', name: 'Arcade', hint: 'Little adventures', x: .26, y: .57 },
  { id: 'hall', name: 'Game Hall', hint: 'Play together', x: .74, y: .57 },
  { id: 'home', name: 'Home', hint: 'Room, closet and badges', x: .27, y: .88 },
  { id: 'cove', name: 'Puzzle Cove', hint: 'Think as long as you like', x: .73, y: .88 },
] as const;
export type PlaceId = typeof places[number]['id'];
export const subjects = [
  { id: 'reading', name: 'Reading', color: '#E8EFF9' },
  { id: 'numbers', name: 'Numbers', color: '#F7EBD0' },
  { id: 'science', name: 'Science', color: '#DDEFF5' },
  { id: 'thinking', name: 'Thinking', color: '#FBE6DC' },
  { id: 'coding', name: 'Coding', color: '#E3E9F7' },
  { id: 'chamoru', name: 'CHamoru', color: '#F5DCCC' },
] as const;
export type SubjectId = typeof subjects[number]['id'];
export function subjectGames(subject: SubjectId): ShelfGame[] {
  return shelfGames.filter(game => subject === 'chamoru' ? game.id === 'hafa-adai' : game.island === subject && game.id !== 'hafa-adai');
}
export function placeGames(place: PlaceId): ShelfGame[] {
  return shelfGames.filter(game => place === 'arcade' ? game.island === 'arcade' : place === 'hall' ? game.island === 'classic' : place === 'school' ? game.island !== 'arcade' && game.island !== 'classic' : false);
}
/** Direct Expo Router paths. `/locker` and `/badges` stay compatible and open Home's Closet and Badge Wall sheets. */
export const directRoutes = { home: '/island-home', library: '/library', locker: '/locker', badges: '/badges', cove: '/cove' } as const;
export type RoutePlaceId = PlaceId | 'locker' | 'badges';
export const homeShortcuts = [
  { id: 'locker', name: 'Closet', hint: 'Outfits and looks inside Home', route: directRoutes.locker },
  { id: 'badges', name: 'Badge Wall', hint: 'Things you have tried inside Home', route: directRoutes.badges },
] as const;
export type Point = { x: number; y: number };
export type PathSegment = readonly [Point, Point];
export const TERRAIN_VIEWBOX = { width: 400, height: 660 } as const;
export const SAND_PATH_STROKE_WIDTH = 21;
export const SAND_PATH_RADIUS = SAND_PATH_STROKE_WIDTH / 2;
const ART_ASPECT = 0.85;
const MAX_ART_WIDTH = 256;
/** Common geometry for the 6-door scene, paths, hit targets and guide. Labels get their own space with zero overlap. */
export function mapLayout(width: number, height: number, fontScale = 1) {
  const wide = width > height * 1.15;
  const scale = Math.max(1, fontScale);
  const labelHeight = Math.round(
    Math.max(
      48,
      scale >= 1.25 ? Math.max(62, 28 * Math.min(scale, 2.5)) : 26 * Math.min(scale, 2.5),
    ),
  );
  const edgePad = 6, topPad = 6, bottomPad = 8, gapX = width < 260 ? 6 : 10, gapY = 10;
  const imageWidth = wide ? 1280 : 720, imageHeight = wide ? 720 : 1280;
  const imageScale = Math.max(width / imageWidth, height / imageHeight);
  const paintedPoints: Record<PlaceId, readonly [number, number]> = wide ? {
    school: [.30, .36], library: [.505, .36], cove: [.715, .36],
    home: [.30, .65], arcade: [.505, .65], hall: [.715, .65],
  } : {
    school: [.355, .31], library: [.66, .31], arcade: [.355, .50],
    hall: [.66, .50], home: [.355, .69], cove: [.66, .69],
  };
  const positioned = places.map(item => {
    const point = paintedPoints[item.id];
    const x = Math.max(28 / width, Math.min(1 - 28 / width, (.5 * width + (point[0] - .5) * imageWidth * imageScale) / width));
    const y = (.5 * height + (point[1] - .5) * imageHeight * imageScale) / height + .07;
    return { ...item, x, y, baseline: Math.min(y * height, height - labelHeight - bottomPad) };
  });
  const rowBaselines = [...new Set(positioned.map(p => p.baseline))].sort((a, b) => a - b);
  const minEdgeX = Math.min(...positioned.map(p => Math.min(p.x, 1 - p.x))) * width;
  const minColDx = (wide ? .205 * imageWidth : .305 * imageWidth) * imageScale;
  const maxArtWidthFromWidth = Math.min(imageWidth * imageScale * (wide ? .17 : .26), 2 * (minEdgeX - edgePad), minColDx - gapX, MAX_ART_WIDTH);
  const verticalLimits = [rowBaselines[0] - topPad];
  for (let i = 1; i < rowBaselines.length; i++) verticalLimits.push(rowBaselines[i] - rowBaselines[i - 1] - labelHeight - gapY);
  const maxArtHeight = Math.max(44, Math.min(...verticalLimits));
  const artWidth = Math.max(44, Math.min(maxArtWidthFromWidth, maxArtHeight / ART_ASPECT));
  const artHeight = artWidth * ART_ASPECT;
  return { wide, artWidth, artHeight, labelHeight, targets: positioned.map(place => ({ ...place,
    left: place.x * width - artWidth / 2, top: place.baseline - artHeight,
    width: artWidth, height: artHeight + labelHeight,
    door: { x: place.x * width, y: place.baseline - artHeight * .09 },
  })) };
}
export type MapLayout = ReturnType<typeof mapLayout>;
/** Default guide rest position on the central sandy spine, always clamped between top and bottom door rows. */
export function guideStartPoint(layout: MapLayout, width: number, height: number): Point {
  const ys = layout.targets.map(target => target.door.y);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  if (layout.wide) {
    const left = layout.targets.find(target => target.id === 'school')!.door.x;
    const center = layout.targets.find(target => target.id === 'library')!.door.x;
    return { x: (left + center) / 2, y: (minY + maxY) / 2 };
  }
  const preferredY = height * .60;
  return { x: width * .5, y: Math.min(maxY, Math.max(minY, preferredY)) };
}
/** Shared sandy path centerlines in scene coordinates (pt), derived directly from actual door positions. */
export function terrainBranches(layout: MapLayout, width: number, _height?: number): PathSegment[] {
  const spineX = width * .5;
  const ys = layout.targets.map(target => target.door.y);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  if (layout.wide) {
    const spineY = (minY + maxY) / 2;
    const xs = layout.targets.map(target => target.door.x);
    return [
      [{ x: Math.min(...xs), y: spineY }, { x: Math.max(...xs), y: spineY }],
      ...layout.targets.map(target => [target.door, { x: target.door.x, y: spineY }] as PathSegment),
    ];
  }
  const segments: PathSegment[] = [[{ x: spineX, y: minY }, { x: spineX, y: maxY }]];
  const rows = new Map<number, { y: number; xs: number[] }>();
  for (const target of layout.targets) {
    const key = Math.round(target.door.y * 100);
    const row = rows.get(key) ?? { y: target.door.y, xs: [spineX] };
    row.xs.push(target.door.x);
    rows.set(key, row);
  }
  for (const { y, xs } of rows.values()) {
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    if (maxX > minX) segments.push([{ x: minX, y }, { x: maxX, y }]);
  }
  return segments;
}
/** SVG path string for `terrainBranches` projected into Terrain's 400×660 viewBox. */
export function terrainPathData(layout: MapLayout, width: number, height: number): string {
  const sx = TERRAIN_VIEWBOX.width / width, sy = TERRAIN_VIEWBOX.height / height;
  const fmt = (value: number) => Math.round(value * 100) / 100;
  return terrainBranches(layout, width, height)
    .map(([a, b]) => `M${fmt(a.x * sx)} ${fmt(a.y * sy)}L${fmt(b.x * sx)} ${fmt(b.y * sy)}`)
    .join('');
}
/** Ordered polyline waypoints for the walking guide; every segment lies directly on `terrainBranches`. */
export function guideWaypoints(from: Point, to: Point, layout: MapLayout, width: number, _height?: number): Point[] {

  const spineX = width * .5;
  const points: Point[] = [from];
  const push = (pt: Point) => {
    const prev = points[points.length - 1];
    if (Math.hypot(pt.x - prev.x, pt.y - prev.y) > 0.01) points.push(pt);
  };
  if (layout.wide) {
    const ys = layout.targets.map(target => target.door.y);
    const spineY = (Math.min(...ys) + Math.max(...ys)) / 2;
    if (Math.abs(from.x - to.x) <= .01) push(to);
    else {
      push({ x: from.x, y: spineY });
      push({ x: to.x, y: spineY });
      push(to);
    }
    return points;
  }
  if (Math.abs(from.y - to.y) <= 0.01) {
    push(to);
  } else {
    push({ x: spineX, y: from.y });
    push({ x: spineX, y: to.y });
    push(to);
  }
  return points;
}
export const WALK_MS = 380, ZOOM_MS = 160;
/** One cancellable boundary timer. The second activation always wins immediately. */
export function createJourney(open: (place: PlaceId) => void, schedule = (fn: () => void, ms: number) => setTimeout(fn, ms), cancel = (id: ReturnType<typeof setTimeout>) => clearTimeout(id)) {
  let timer: ReturnType<typeof setTimeout> | undefined, pending: PlaceId | null = null;
  const clear = () => { if (timer !== undefined) cancel(timer); timer = undefined; pending = null; };
  return {
    visit(place: PlaceId, reduced: boolean) {
      const immediate = reduced || pending !== null;
      clear();
      if (immediate) { open(place); return false; }
      pending = place;
      timer = schedule(() => { clear(); open(place); }, WALK_MS + ZOOM_MS);
      return true;
    },
    cancel: clear,
  };
}
