import { roomPoint, type Target } from './scene/types';
/** A permanent pedal bin belongs to the room, never to the child's movable inventory. */
export const trashCan = { id: 'kitchen/trash-can', x: 62, y: 485, size: 100 };
export function trashTarget(): Target {
  'worklet';
  const contact = roomPoint(trashCan.x, trashCan.y);
  return { id: trashCan.id, owner: trashCan.id, kind: 'surface', trash: true,
    attachment: { kind: 'floor', room: 'kitchen', at: contact }, contact,
    core: { left: 18, top: 414, width: 88, height: 110 },
    support: { left: 18, top: 414, width: 88, height: 110 }, base: 'stand', facing: 'front' };
}
