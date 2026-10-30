/** Pure camera math: the entire dollhouse fits at minimum; close-up stays life sized. */
export function zoomLimits(viewportWidth: number, closeRoomWidth: number) {
  return { min: Math.min(1, viewportWidth / (4 * closeRoomWidth)), max: 1.4 };
}
export function boundedPan(x: number, viewportWidth: number, houseWidth: number) {
  'worklet';
  return Math.max(Math.min(0, viewportWidth-houseWidth), Math.min(0,x));
}
export function roomAt(x: number, roomWidth: number) {
  'worklet';
  return Math.max(0,Math.min(3,Math.floor(x/roomWidth)));
}
export function roomPan(index: number, roomWidth: number, viewportWidth: number) {
  'worklet';
  return boundedPan((roomWidth > viewportWidth ? 0 : (viewportWidth-roomWidth)/2)-index*roomWidth,viewportWidth,roomWidth*4);
}
