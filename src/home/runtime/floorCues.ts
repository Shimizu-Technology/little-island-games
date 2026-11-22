import type { Scene, SceneEntity } from '../scene/types';
import { paintedBounds } from '../art/silhouettes';
import { anchorsFor, species } from '../scene/species';
import { faceZone } from '../scene/resolve';
import { restingVisible } from './group';

export function floorCueMask(scene?:Pick<Scene,'entities'>) {
  const actors=Object.values(scene?.entities ?? {}).filter(e=>e.character && scene && restingVisible(e,scene));
  return actors.map(e=>{
    const head=anchorsFor(e.character!.slot,e.base,e.facing,e.action).head;
    return {room:e.room,bounds:paintedBounds(e) ?? {...e.bounds,left:e.contact.x+e.bounds.left,top:e.contact.y+e.bounds.top},
      x:e.contact.x+head.x,y:e.contact.y+head.y,headRadius:species[e.character!.slot].headRadius};
  });
}
/** The outline and the carry shadow use the same exclusion zone. A footprint
 * whose edge overlaps a friend is hidden too, not just one whose centre does. */
export function floorCueHidden(mask:ReturnType<typeof floorCueMask>,source:SceneEntity,room:string,contact:{x:number;y:number},aim:{x:number;y:number},scale:number,footprint:{width:number;height:number}) {
  'worklet';
  for(const actor of mask) {
    if(actor.room!==room)continue;
    const b=actor.bounds;
    if(b && contact.x+footprint.width/2>=b.left && contact.x-footprint.width/2<=b.left+b.width &&
      contact.y+footprint.height/2>=b.top && contact.y-footprint.height/2<=b.top+b.height)return true;
    if(source.body?.edible && Math.hypot(aim.x-actor.x,aim.y-actor.y)<=
      Math.max(faceZone.minPt/Math.max(.1,scale),actor.headRadius*faceZone.headFactor)+16)return true;
  }
  return false;
}
