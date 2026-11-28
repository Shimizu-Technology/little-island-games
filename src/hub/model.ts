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
/** Responsive hero scale for the Islander guide on the map, independent of narrow inter-column gaps. */
export function guideSizeFor(wide: boolean, width: number, height: number): number {
  if (wide) return Math.round(Math.max(58, Math.min(90, width * .10, height * .305)) * 10) / 10;
  return Math.round(Math.max(54, Math.min(92, width * .19, height * .145)) * 10) / 10;
}
/** Common geometry for the 6-door scene, paths, hit targets and guide. Labels get their own space with zero overlap. */
export function mapLayout(width: number, height: number, fontScale = 1) {
  const wide = width > height * 1.15;
  const scale = Math.max(1, fontScale);
  const edgePad = 6, topPad = 6, bottomPad = 8, gapX = width < 260 ? 6 : 10, gapY = wide ? 6 : 4;
  const imageWidth = wide ? 1280 : 720, imageHeight = wide ? 720 : 1280;
  const imageScale = Math.max(width / imageWidth, height / imageHeight);
  // Calibrated to the 6 golden sand clearings of the stylized Guam portrait & landscape maps.
  const paintedPoints: Record<PlaceId, readonly [number, number]> = wide ? {
    school: [.295, .365], library: [.503, .365], cove: [.710, .365],
    home: [.295, .655], arcade: [.503, .655], hall: [.710, .655],
  } : {
    school: [.338, .312], library: [.678, .312], arcade: [.322, .508],
    hall: [.678, .508], home: [.324, .704], cove: [.676, .704],
  };
  const yOffset = wide ? .065 : .060;
  // Reserve enough horizontal space inside tall, narrow viewports for readable labels and >=48pt hit targets.
  const maxColWidth = Math.max(0, (width - 2 * edgePad - (wide ? 2 : 1) * gapX) / (wide ? 3 : 2));
  const reservedColWidth = Math.min(maxColWidth, wide ? 72 : 96);
  const minEdge = Math.min(width / 2, Math.max(28, edgePad + reservedColWidth / 2));
  const basePoints = places.map(item => {
    const point = paintedPoints[item.id];
    const x = Math.max(minEdge / width, Math.min(1 - minEdge / width, (.5 * width + (point[0] - .5) * imageWidth * imageScale) / width));
    const y = (.5 * height + (point[1] - .5) * imageHeight * imageScale) / height + yOffset;
    return { ...item, x, y };
  });
  const minEdgeX = Math.min(...basePoints.map(p => Math.min(p.x, 1 - p.x))) * width;
  const rowXs = new Map<number, number[]>();
  for (const p of basePoints) {
    const key = Math.round(p.y * 100);
    const xs = rowXs.get(key) ?? [];
    xs.push(p.x * width);
    rowXs.set(key, xs);
  }
  let minColDx = Infinity;
  for (const xs of rowXs.values()) {
    xs.sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) minColDx = Math.min(minColDx, xs[i] - xs[i - 1]);
  }
  const baseGuideSize = guideSizeFor(wide, width, height);
  const maxArtWidthFromWidth = Math.min(
    imageWidth * imageScale * (wide ? .21 : .35),
    2 * (minEdgeX - edgePad),
    minColDx - gapX,
    MAX_ART_WIDTH,
  );
  const horizontalBudget = wide
    ? Math.min(maxArtWidthFromWidth, minColDx - baseGuideSize * .607 - 8)
    : maxArtWidthFromWidth;
  const labelFontSize = width < 360 || horizontalBudget < 108 ? 12 : 14;
  const minSingleLineLabel = labelFontSize <= 12 ? 96 : 113;
  const needsTwoLinesAtDefault = horizontalBudget < minSingleLineLabel;
  const defaultMinLabelHeight = needsTwoLinesAtDefault ? (labelFontSize <= 12 ? 42 : 46) : 34;
  const labelHeight = Math.round(
    scale >= 1.25
      ? Math.max(62, 28 * Math.min(scale, 2.5))
      : Math.max(defaultMinLabelHeight, 28 * Math.min(scale, 2.5)),
  );
  const positioned = basePoints.map(item => ({
    ...item,
    baseline: Math.min(item.y * height, height - labelHeight - bottomPad),
  }));
  // Balance rows on compact or large-text viewports so buildings and labels never clip or overlap.
  const rawRows = [...new Set(positioned.map(p => p.baseline))].sort((a, b) => a - b);
  if (!wide && rawRows.length === 3) {
    const minStep = 44 * ART_ASPECT + labelHeight + gapY;
    let [r0, r1, r2] = rawRows;
    r0 = Math.min(r0, r1 - minStep);
    r2 = Math.max(r2, r1 + minStep);
    const maxR2 = height - labelHeight - bottomPad;
    if (r2 > maxR2) {
      r2 = maxR2;
      r1 = Math.min(r1, r2 - minStep);
      r0 = Math.min(r0, r1 - minStep);
    }
    const minR0 = topPad + 44 * ART_ASPECT;
    if (r0 < minR0) {
      r0 = minR0;
      r1 = Math.max(r1, r0 + minStep);
      r2 = Math.max(r2, r1 + minStep);
    }
    const remap = new Map([[rawRows[0], r0], [rawRows[1], r1], [rawRows[2], r2]]);
    for (const p of positioned) p.baseline = remap.get(p.baseline) ?? p.baseline;
  } else if (wide && rawRows.length === 2) {
    let [r0, r1] = rawRows;
    const maxR1 = height - labelHeight - bottomPad;
    r1 = Math.min(r1, maxR1);
    const idealArtH = (maxR1 - topPad - labelHeight - gapY) / 2;
    const targetR0 = Math.min(topPad + Math.max(44 * ART_ASPECT, idealArtH), r1 - (idealArtH + labelHeight + gapY));
    if (targetR0 > r0) r0 = targetR0;
    const remap = new Map([[rawRows[0], r0], [rawRows[1], r1]]);
    for (const p of positioned) p.baseline = remap.get(p.baseline) ?? p.baseline;
  }
  const rowBaselines = [...new Set(positioned.map(p => p.baseline))].sort((a, b) => a - b);
  const verticalLimits = [rowBaselines[0] - topPad];
  for (let i = 1; i < rowBaselines.length; i++) verticalLimits.push(rowBaselines[i] - rowBaselines[i - 1] - labelHeight - gapY);
  const maxArtHeight = Math.max(44 * ART_ASPECT, Math.min(...verticalLimits));
  const artWidth = Math.max(44, Math.min(horizontalBudget, maxArtHeight / ART_ASPECT));
  const artHeight = artWidth * ART_ASPECT;
  const maxLabelWidth = scale >= 1.25 ? Math.max(artWidth, 148) : 148;
  const labelWidth = Math.max(Math.min(48, maxColWidth), Math.min(horizontalBudget, Math.max(artWidth * .96, minSingleLineLabel), maxLabelWidth));
  // Keep portrait guide cleanly below Row 1's label pill and above Row 2's label pill even on compact large-text viewports.
  let guideSize = baseGuideSize;
  if (!wide && rowBaselines.length === 3) {
    const midLabelBottom = rowBaselines[1] + labelHeight;
    const botDoorY = rowBaselines[2] - artHeight * .09;
    const corridorHeight = botDoorY - midLabelBottom;
    if (corridorHeight > 0 && corridorHeight < guideSize) {
      guideSize = Math.round(Math.max(40, corridorHeight) * 10) / 10;
    }
  }
  return { wide, artWidth, artHeight, labelHeight, guideSize, targets: positioned.map(place => ({ ...place,
    left: place.x * width - artWidth / 2, top: place.baseline - artHeight,
    width: artWidth, labelWidth, labelFontSize, height: artHeight + labelHeight,
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
  const rows = [...new Set(layout.targets.map(target => target.baseline))].sort((a, b) => a - b);
  if (rows.length === 3) {
    const midLabelBottom = rows[1] + layout.labelHeight;
    const centeredY = (midLabelBottom + maxY + layout.guideSize) / 2;
    return { x: width * .5, y: Math.min(maxY, Math.max(minY, centeredY)) };
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
export type MapExcursionId = 'tumon-beach' | 'cocos-island';
export type MapHotspotRect = {
  x: number;
  y: number;
  left: number;
  top: number;
  width: number;
  height: number;
};
export type MapExtrasLayout = {
  ocean: MapHotspotRect;
  cocos: MapHotspotRect;
  sailboat: MapHotspotRect;
  dolphinReef: MapHotspotRect;
  northernIslet: MapHotspotRect;
  nightMoon: MapHotspotRect;
};
/** Exact cover-transform projection matching `mapLayout` for painted Guam portrait/landscape coordinates. */
export function mapImagePoint(normX: number, normY: number, width: number, height: number, wide: boolean): Point {
  const imageWidth = wide ? 1280 : 720;
  const imageHeight = wide ? 720 : 1280;
  const imageScale = Math.max(width / imageWidth, height / imageHeight);
  return {
    x: 0.5 * width + (normX - 0.5) * imageWidth * imageScale,
    y: 0.5 * height + (normY - 0.5) * imageHeight * imageScale,
  };
}
type RectBox = { left: number; top: number; width: number; height: number };
function rectsOverlap(a: RectBox, b: RectBox, pad = 2): boolean {
  return (
    a.left < b.left + b.width + pad &&
    a.left + a.width + pad > b.left &&
    a.top < b.top + b.height + pad &&
    a.top + a.height + pad > b.top
  );
}
function targetBoxes(layout: MapLayout): RectBox[] {
  return layout.targets.map((place) => {
    const boxWidth = Math.max(48, place.width, place.labelWidth);
    return {
      left: place.left + (place.width - boxWidth) / 2,
      top: place.top,
      width: boxWidth,
      height: place.height,
    };
  });
}
function placeClearHotspot(
  preferred: Point,
  size: number,
  targets: readonly RectBox[],
  width: number,
  height: number
): MapHotspotRect {
  const clampLeft = (l: number) => Math.max(4, Math.min(Math.max(4, width - size - 4), l));
  const clampTop = (t: number) => Math.max(4, Math.min(Math.max(4, height - size - 4), t));
  const initial: RectBox = { left: clampLeft(preferred.x - size / 2), top: clampTop(preferred.y - size / 2), width: size, height: size };
  if (!targets.some((t) => rectsOverlap(initial, t))) {
    return { ...initial, x: initial.left + size / 2, y: initial.top + size / 2 };
  }
  // Search nearby clear water spots radiating outward, preferring the closest non-overlapping rect.
  let best: RectBox | undefined;
  let bestDist = Infinity;
  const candidates: RectBox[] = [];
  for (const t of targets) {
    candidates.push(
      { left: clampLeft(t.left - size - 4), top: initial.top, width: size, height: size },
      { left: clampLeft(t.left + t.width + 4), top: initial.top, width: size, height: size },
      { left: initial.left, top: clampTop(t.top - size - 4), width: size, height: size },
      { left: initial.left, top: clampTop(t.top + t.height + 4), width: size, height: size },
    );
  }
  for (const step of [24, 48, 72, 104, 140]) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      candidates.push({ left: clampLeft(initial.left + dx * step), top: clampTop(initial.top + dy * step), width: size, height: size });
    }
  }
  for (const cand of candidates) {
    if (targets.some((t) => rectsOverlap(cand, t))) continue;
    const cx = cand.left + size / 2;
    const cy = cand.top + size / 2;
    const d = Math.hypot(cx - preferred.x, cy - preferred.y);
    if (d < bestDist) {
      bestDist = d;
      best = cand;
    }
  }
  const chosen = best ?? initial;
  return { ...chosen, x: chosen.left + size / 2, y: chosen.top + size / 2 };
}
/** Calibrated interactive water, Secret Cocos Island, sailboat, and Easter-egg hotspots (>=48pt, clear of the 6 buildings). */
export function mapExtrasLayout(width: number, height: number, layout = mapLayout(width, height)): MapExtrasLayout {
  const wide = layout.wide;
  const boxes = targetBoxes(layout);
  const oceanRaw = mapImagePoint(wide ? 0.24 : 0.175, wide ? 0.88 : 0.703, width, height, wide);
  const cocosRaw = mapImagePoint(wide ? 0.085 : 0.29, wide ? 0.875 : 0.905, width, height, wide);
  const sailboatRaw = wide
    ? { x: Math.min(width - 36, Math.max(82, cocosRaw.x + 62)), y: Math.min(height - 32, cocosRaw.y + 2) }
    : { x: width * 0.03 + 24, y: height * 0.90 + 28 };
  const dolphinRaw = mapImagePoint(wide ? 0.92 : 0.88, wide ? 0.28 : 0.50, width, height, wide);
  const northernRaw = mapImagePoint(wide ? 0.12 : 0.145, wide ? 0.14 : 0.165, width, height, wide);
  const moonRaw = { x: width * 0.84, y: height * 0.105 };
  const ocean = placeClearHotspot(oceanRaw, 52, boxes, width, height);
  const cocos = placeClearHotspot(cocosRaw, 56, [...boxes, ocean], width, height);
  const sailboat = placeClearHotspot(sailboatRaw, 48, [...boxes, ocean, cocos], width, height);
  const dolphinReef = placeClearHotspot(dolphinRaw, 52, [...boxes, ocean, cocos], width, height);
  const northernIslet = placeClearHotspot(northernRaw, 52, [...boxes, ocean, cocos], width, height);
  const nightMoon = placeClearHotspot(moonRaw, 52, boxes, width, height);
  return { ocean, cocos, sailboat, dolphinReef, northernIslet, nightMoon };
}
export const WALK_MS = 110, ZOOM_MS = 50;
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
