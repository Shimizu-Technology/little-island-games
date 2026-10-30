/** Serializable, worklet-safe destination rules. Prepared once per settled room edit. */
export type DropBody = { id:string; x:number; y:number; w:number; h:number; layer:string; on?:string; small?:boolean; holdable?:boolean; edible?:'food'|'drink'; left:number; right:number; top:number; bottom:number };
export type DropSocket = { itemId:string; socketId:string; x:number; y:number; pose:'sit'|'lie'|'bathe'; occupied?:number };
export type DropWorld = { bodies:DropBody[]; sockets:DropSocket[]; surfaces:{id:string;x:number;y:number;w:number;sx:number;sy:number;radius:number}[]; people:{slot:number;x:number;y:number;holding?:string;handX?:number;handY?:number;mouthX?:number;mouthY?:number}[] };
export type DropResult = { kind:'floor'|'surface'|'socket'|'hand'|'mouth'; x:number;y:number;px:number;py:number;on?:string;itemId?:string;socketId?:string;slot?:number;pose?:'sit'|'lie'|'bathe' };
export function resolveDrop(world:DropWorld, subject:DropBody | {slot:number}, px:number, py:number):DropResult|undefined {
 'worklet';
 if(!Number.isFinite(px)||!Number.isFinite(py))return;
 const item='id' in subject?subject:undefined;
 if(item) {
  for(const person of world.people){
   const hx=person.handX??person.x+42,hy=person.handY??person.y-84,mx=person.mouthX??person.x,my=person.mouthY??person.y-160;
   if(item.holdable && (!person.holding||person.holding===item.id) && Math.hypot(px-hx,py-hy)<65)return {kind:'hand',slot:person.slot,x:0,y:0,px:hx,py:hy};
   if(item.edible && Math.hypot(px-mx,py-my)<58)return {kind:'mouth',slot:person.slot,x:0,y:0,px:mx,py:my};
  }
 } else {
  let best:DropSocket|undefined, distance=85;
  for(const socket of world.sockets){const d=Math.hypot(px-socket.x,py-socket.y);if((socket.occupied===undefined||socket.occupied===('slot' in subject?subject.slot:-1))&&d<distance){best=socket;distance=d;}}
  if(best)return {kind:'socket',...best,px:best.x,py:best.y};
 }
 if(item?.small){
  let best:DropResult|undefined,distance=Infinity;
  for(const s of world.surfaces){
   if(s.id===item.id||Math.abs(px-s.sx)>s.radius||Math.abs(py-s.sy)>=42)continue;
   if(world.bodies.filter(b=>b.on===s.id&&b.id!==item.id).length>=Math.min(3,s.w))continue;
   for(let x=s.x;x<s.x+s.w;x++){
    if(world.bodies.some(b=>b.id!==item.id&&b.on===s.id&&b.x===x))continue;
    const sx=s.sx+(x-s.x-(s.w-1)/2)*38,d=(sx-px)**2+(s.sy-py)**2;
    if(sx+item.left<8||sx+item.right>792||s.sy+item.top<8||s.sy+item.bottom>552)continue;
    if(d<distance){distance=d;best={kind:'surface',x,y:s.y,on:s.id,px:sx,py:s.sy};}
   }
  }
  if(best)return best;
 }
 let best:DropResult|undefined,distance=Infinity;
 const wall=item?.layer==='wall';
 for(let y=0;y<(wall?4:12);y++)for(let x=0;x<(item?16:20);x++){
  const sx=wall?54+x*46:43+x*37.5+y*1.5,sy=wall?124+y*56:386+y*14.4;
  const left=item?.left??-65,right=item?.right??65,top=item?.top??-224,bottom=item?.bottom??0;
  if(sx+left<8||sx+right>792||sy+top<8||sy+bottom>552)continue;
  const w=item?.w??1,h=item?.h??1,layer=item?.layer??'furniture';
  if(item&&(x+w>16||y+h>(wall?4:12)))continue;
  if(world.bodies.some(b=>b.id!==item?.id&&b.on===undefined&&b.layer===layer&&x<b.x+b.w&&b.x<x+w&&y<b.y+b.h&&b.y<y+h))continue;
  const d=(sx-px)**2+(sy-py)**2;
  if(d<distance){distance=d;best={kind:'floor',x,y,px:sx,py:sy};}
 }
 return best;
}
