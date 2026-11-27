/** All building coordinates use the room art's 800-unit coordinate system. */
export type Building = { columns:number; floors:number; width:number; height:number; roomHeight:number; roof:number; frame:number; gap:number; count:number; locations?:boolean; place?:number };
export function buildingLayout(count:number, wide=false):Building {
  const columns=Math.max(1,Math.min(count,wide?4:2)), floors=Math.max(1,Math.ceil(count/columns));
  return {columns,floors,count,width:columns*800+40,height:floors*560+(floors-1)*20+360,roomHeight:560,roof:120,frame:20,gap:20};
}
/** Room order fills the ground floor first, then extends upwards. */
export function roomOrigin(index:number,b:Building) {
  'worklet';
  if (b.place !== undefined) return index === b.place ? { x: 0, y: 0 } : { x: -10000, y: -10000 };
  if (b.locations && index >= 4) return { x: -10000, y: -10000 };
  return {x:b.frame+(index%b.columns)*800,y:b.roof+(b.floors-1-Math.floor(index/b.columns))*(b.roomHeight+b.gap)};
}
export function buildingRoomAt(x:number,y:number,b:Building) {
  'worklet';
  const column=Math.max(0,Math.min(b.columns-1,Math.floor((x-b.frame)/800)));
  const floor=Math.max(0,Math.min(b.floors-1,b.floors-1-Math.floor((y-b.roof)/(b.roomHeight+b.gap))));
  return Math.min(b.count-1,floor*b.columns+column);
}
export function zoomLimits(width:number,closeRoomWidth:number,height=Infinity,b=buildingLayout(4,true)) {
  return {min:Math.min(1,.9*Math.min(width/(b.width*closeRoomWidth/800),height/(b.height*closeRoomWidth/800))),max:1.4};
}
export function panRange(viewport:number,content:number):[number,number] {
  'worklet';
  return content<=viewport?[(viewport-content)/2,(viewport-content)/2]:[viewport-content,0];
}
export function boundedPan(value:number,viewport:number,content:number) {
  'worklet';
  const [min,max]=panRange(viewport,content);return Math.max(min,Math.min(max,value));
}
export function softPan(value:number,viewport:number,content:number) {
  'worklet';
  const bound=boundedPan(value,viewport,content);return bound+(value-bound)*.22;
}
export function roomCamera(index:number,b:Building,scale:number,width:number,height:number) {
  'worklet';
  const p=roomOrigin(index,b);
  return {x:boundedPan(width/2-(p.x+400)*scale,width,b.width*scale),y:boundedPan(height/2-(p.y+b.roomHeight/2)*scale,height,b.height*scale)};
}

/** House geometry remains exactly four rooms. Outdoor locations have their own 800 × 560 stage. */
export function locationBuilding(index: number, wide = false): Building {
  return index < 4 ? { ...buildingLayout(4, wide), count: 6, locations: true } : {
    columns: 1, floors: 1, width: 800, height: 560, roomHeight: 560, roof: 0, frame: 0, gap: 0, count: 6, place: index,
  };
}
