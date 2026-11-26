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
const ART_ASPECT = 0.85;
const MAX_ART_WIDTH = 256;
const WIDE_POINTS: Record<PlaceId, readonly [number, number]> = {
  school: [.18, .40],
  library: [.50, .40],
  cove: [.82, .40],
  home: [.18, .88],
  arcade: [.50, .88],
  hall: [.82, .88],
};
/** Common geometry for the 6-door scene, paths, hit targets and guide. Labels get their own space with zero overlap. */
export function mapLayout(width: number, height: number, fontScale = 1) {
  const wide = width > height * 1.15;
  const scale = Math.max(1, fontScale);
  const labelHeight = Math.round(Math.max(width < 280 ? 44 : 34, (scale > 1.5 ? 28 : 26) * Math.min(scale, 2.5)));
  const edgePad = 6, topPad = 6, bottomPad = 8, gapX = width < 260 ? 6 : 10, gapY = 10;
  const positioned = places.map(item => {
    const point = wide ? WIDE_POINTS[item.id] : null;
    const x = point?.[0] ?? item.x, y = point?.[1] ?? item.y;
    return { ...item, x, y, baseline: Math.min(y * height, height - labelHeight - bottomPad) };
  });
  const rowBaselines = [...new Set(positioned.map(p => p.baseline))].sort((a, b) => a - b);
  const minEdgeX = Math.min(...positioned.map(p => Math.min(p.x, 1 - p.x))) * width;
  const minColDx = (wide ? .32 : .46) * width;
  const maxArtWidthFromWidth = Math.min(width * (wide ? .29 : .44), 2 * (minEdgeX - edgePad), minColDx - gapX, MAX_ART_WIDTH);
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
