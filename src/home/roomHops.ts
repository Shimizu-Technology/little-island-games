import type { HouseRoomId, RoomId } from './catalogMore';
import type { Bounds, Scene } from './scene/types';
import { storageOpen } from './storage';
/** Open appliance doors take precedence over room-hop cues. */
export function roomPortalsClear(scene: Pick<Scene, 'entities'>, room: RoomId): boolean {
  'worklet';
  return !Object.values(scene.entities).some(e => e.room === room && e.item?.item === 'fridge' && storageOpen(e.item));
}
export type RoomHop = { kind: 'ladder' | 'door'; room: HouseRoomId; box: Bounds };
/** Room-space portals share their exact geometry with the drop resolver and tap affordances. */
export function roomHops(room: RoomId): RoomHop[] {
  'worklet';
  if (room !== 'home' && room !== 'kitchen' && room !== 'treehouse' && room !== 'beach') return [];
  const upstairs = room === 'home' ? 'treehouse' : room === 'kitchen' ? 'beach' : room === 'treehouse' ? 'home' : 'kitchen';
  const beside = room === 'home' ? 'kitchen' : room === 'kitchen' ? 'home' : room === 'treehouse' ? 'beach' : 'treehouse';
  return [
    { kind: 'ladder', room: upstairs, box: { left: 710, top: 180, width: 88, height: 120 } },
    { kind: 'door', room: beside, box: { left: 710, top: 430, width: 88, height: 108 } },
  ];
}
export function roomHopAt(room: RoomId, at: { x: number; y: number }): RoomHop | undefined {
  'worklet';
  const hops = roomHops(room);
  // The painted ladder already runs along the house's left edge. The large cue is its tap alternative.
  if (at.x >= -20 && at.x <= 32 && at.y >= 0 && at.y <= 540) return hops.find(h => h.kind === 'ladder');
  return hops.find(({ box }) => at.x >= box.left && at.x <= box.left + box.width && at.y >= box.top && at.y <= box.top + box.height);
}
