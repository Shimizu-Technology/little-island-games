import { shelfGames, type ShelfGame } from '../learn/home';

export const places = [
  { id: 'school', name: 'School', hint: 'Six ways to wonder', x: .27, y: .24 },
  { id: 'library', name: 'Library', hint: 'Explore our world', x: .73, y: .24 },
  { id: 'arcade', name: 'Arcade', hint: 'Little adventures', x: .25, y: .48 },
  { id: 'hall', name: 'Game Hall', hint: 'Play together', x: .75, y: .48 },
  { id: 'home', name: 'Home', hint: 'Your stories live here', x: .26, y: .72 },
  { id: 'locker', name: 'Locker', hint: 'Come as yourself', x: .27, y: .95 },
  { id: 'badges', name: 'Badges', hint: 'Things you have tried', x: .76, y: .72 },
  { id: 'cove', name: 'Puzzle Cove', hint: 'Think as long as you like', x: .73, y: .95 },
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
export const directRoutes = { home: '/island-home', library: '/library', locker: '/locker', badges: '/badges', cove: '/cove' } as const;
export type Point = { x: number; y: number };
/** Common geometry for scene, paths, hit targets and guide. Labels get their own space. */
export function mapLayout(width: number, height: number, fontScale = 1) {
  const wide = width > height * 1.15;
  const labelHeight = Math.max(width < 280 ? 48 : 30, (fontScale > 1.5 ? 50 : 25) * fontScale);
  const artWidth = Math.min(width * (wide ? .245 : .405), (height * (wide ? .29 : .225)-labelHeight-10)/.79, wide ? 232 : (height*.28-labelHeight*2-14)/.79, 232);
  const artHeight = artWidth * .79;
  const points = wide ? { school: [.17, .29], library: [.50, .29], cove: [.83, .29], arcade: [.17, .62], hall: [.50, .62], badges: [.83, .62], home: [.33, .95], locker: [.67, .95] } : null;
  return { artWidth, artHeight, labelHeight, targets: places.map(item => { const point = points?.[item.id]; const place = { ...item, x: point?.[0] ?? item.x, y: point?.[1] ?? item.y }; const baseline = Math.min(place.y * height, height-labelHeight-8); return ({ ...place,
    left: place.x * width - artWidth / 2, top: baseline - artHeight,
    width: artWidth, height: artHeight + labelHeight,
    door: { x: place.x * width, y: baseline - artHeight * .09 },
  }); }) };
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
