import { roomIds, locationIds, roomNames, type RoomId } from './catalogMore';
import { itemSpec } from './catalog';
import type { RoomState } from './model';

export const guamPlaceIds = ['tumon-beach', 'chamorro-village'] as const;
export type GuamPlaceId = typeof guamPlaceIds[number];
export type PlaceId = 'our-house' | GuamPlaceId;
export type LocationDefinition = { id: RoomId; place: PlaceId; name: string; outdoors: boolean };
export const locations: readonly LocationDefinition[] = locationIds.map(id => ({ id, name: roomNames[id],
  place: isGuamPlace(id) ? id : 'our-house', outdoors: isGuamPlace(id) }));
export const places = [
  { id: 'our-house', name: 'Our House', locations: roomIds },
  { id: 'tumon-beach', name: 'Tumon Beach & Reef', locations: ['tumon-beach'] },
  { id: 'chamorro-village', name: 'Chamorro Village Night Market', locations: ['chamorro-village'] },
] as const;
export function isGuamPlace(id: string): id is GuamPlaceId {
  return id === 'tumon-beach' || id === 'chamorro-village';
}
/** Give all six dolls their own arrival spot; the house keeps its familiar entrances. */
export function arrivalPoint(room: RoomId, slot: number): { x: number; y: number } {
  if (!isGuamPlace(room)) return { x: 230 + (slot % 4) * 130, y: 490 };
  return [{ x: 190, y: 485 }, { x: 280, y: 530 }, { x: 540, y: 535 },
    { x: 330, y: 485 }, { x: 470, y: 485 }, { x: 610, y: 485 }][slot];
}
/** Each location starts without dolls; Friends brings the child's own family here. */
export function defaultGuamRoom(id: GuamPlaceId): RoomState {
  const rows: readonly [string, number, number][] = id === 'tumon-beach' ? [
    ['beach-blanket', 8, 7], ['surfboard', 13, 3], ['coconut-drink', 6, 9],
    ['ball', 12, 10], ['shell', 3, 8], ['shell-pile', 14, 7],
  ] : [
    ['bbq-grill', 4, 3], ['shaved-ice', 12, 8], ['fiesta-platter', 8, 9],
    ['lantern', 14, 3], ['bench', 10, 0], ['coconut-drink', 14, 10],
  ];
  return { theme: { wallpaper: 'cream', floor: 'sand' }, characters: [],
    instances: rows.map(([item, x, y]) => ({ id: `place-${item}`, item, x, y,
      rotation: 0, mirrored: false, layer: itemSpec(item).layer, state: 'rest',
      ...(item === 'lantern' ? { powered: true } : {}),
    })),
  };
}
/** Only exact defaults can disappear. Missing, empty or changed rooms have different meaning. */
export function untouchedGuamRoom(id: GuamPlaceId, room: RoomState): boolean {
  const canonical = (v: unknown): unknown => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object'
    ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, value]) => [k, canonical(value)])) : v;
  return JSON.stringify(canonical(room)) === JSON.stringify(canonical(defaultGuamRoom(id)));
}
export type PlaceGame = { name: string; route: { pathname: '/arcade' | '/learn' | '/shelf'; params: { game: string } | { island: string } } };
/** Verified against app/arcade, app/learn and the classic shelf used by the map's Game Hall. */
export const gamesHere: Record<GuamPlaceId, readonly PlaceGame[]> = {
  'tumon-beach': [
    { name: 'Reef Race', route: { pathname: '/learn', params: { game: 'reef-race' } } },
    { name: 'Tide Pool Lab', route: { pathname: '/learn', params: { game: 'tide-pool' } } },
    { name: 'Float or Sink', route: { pathname: '/learn', params: { game: 'float-sink' } } },
    { name: 'Island Market', route: { pathname: '/learn', params: { game: 'island-market' } } },
  ],
  'chamorro-village': [
    { name: 'Håfa Adai', route: { pathname: '/learn', params: { game: 'hafa-adai' } } },
    { name: 'Island Market', route: { pathname: '/learn', params: { game: 'island-market' } } },
    { name: 'Sound Boat', route: { pathname: '/learn', params: { game: 'sound-boat' } } },
    { name: 'Game Hall', route: { pathname: '/shelf', params: { island: 'classic' } } },
  ],
};
