import {describe,it,expect} from 'vitest';
import {catalogCommit,clearCatalogSeed} from '../src/home/runtime/catalogCapture';
import {labHome} from '../src/home/runtime/lab';
import {instance} from '../src/home/model';
import {buildScene} from '../src/home/scene/graph';
import {apply,resolve} from '../src/home/scene/proposal';
import {catalogCovered,translatedBounds} from '../src/home/scene/spatial';
import {roomPoint} from '../src/home/scene/types';

describe('H2 catalog review',()=>{
 function capture(){const seed=labHome();seed.rooms.home.instances.push(instance('catalog-x','chair',0,0));const scene=buildScene(seed),id='home/item/catalog-x';
  const proposal=resolve(scene.rooms.home,scene.entities[id],roomPoint(600,500),{scale:.5,release:true,catalog:true});return {seed,scene,id,proposal};}
 it.each([false,true])('P1-1/P2-3 re-resolves against synchronous latest state (React published %s)',published=>{
  const c=capture(),latest=labHome();latest.rooms.kitchen.instances.push(instance('just-saved','plant',1,1));
  const pending=catalogCommit(latest,{seed:c.seed,revision:'R0'},c.id,c.proposal,published?'R1':'R0');
  expect(pending).toBeDefined();const result=apply(pending!.seed,pending!.proposal);
  expect('state' in result).toBe(true);if('state' in result)expect(result.state.rooms.kitchen.instances.some(i=>i.id==='just-saved')).toBe(true);
  expect(latest.rooms.home.instances.some(i=>i.id==='catalog-x')).toBe(false);
 });
 it('P2-4 clearing one slot preserves a catalog capture waiting for its UI down',()=>{
  const c=capture(),pending={seed:c.seed,revision:'R0'},seeds={first:pending,second:pending};
  clearCatalogSeed(seeds,'first',[]);expect(seeds).toEqual({second:pending});
 });
 it('P2-2 new furniture leaves at least half of every neighbouring painted hull visible',()=>{
  const c=capture(),subject=c.scene.entities[c.id];let placed=0;
  for(let x=50;x<=750;x+=50)for(let y=350;y<=530;y+=30){
   const p=resolve(c.scene.rooms.home,subject,roomPoint(x,y),{scale:.5,release:true,catalog:true,avoidFurnitureOverlap:true});
   if(p.kind==='staging')continue;placed++;
   const bands=[{id:subject.id,depth:p.contact.y,bounds:translatedBounds(subject.bounds,p.contact),shapes:subject.shapes,contact:p.contact}];
   for(const other of Object.values(c.scene.entities).filter(e=>e.room==='home'&&e.id!==c.id&&e.body?.layer==='furniture'&&!e.body.small&&e.attachment.kind==='floor')) {
    const existing=c.scene.rooms.home.occlusionBands.filter(b=>b.id!==subject.id);
    const before=catalogCovered(other,other.contact,other.depth,existing);
    expect(catalogCovered(other,other.contact,other.depth,[...existing,...bands]),`${x},${y} over ${other.id}`).toBeLessThanOrEqual(Math.max(.5,before));
   }
  }expect(placed).toBeGreaterThan(0);
 });
});

it('P1-1/P2-3 two catalog drags released before React publishes preserve both landings',()=>{
 const initial=labHome();
 function captured(id:string,x:number){const seed=labHome();seed.rooms.home.instances.push(instance(id,'chair',0,0));const scene=buildScene(seed),key=`home/item/${id}`;
  return {key,catalog:{seed,revision:'R0'},proposal:resolve(scene.rooms.home,scene.entities[key],roomPoint(x,515),{scale:.5,release:true,catalog:true,avoidFurnitureOverlap:true})};}
 const first=captured('catalog-first',540),second=captured('catalog-second',720);
 const a=catalogCommit(initial,first.catalog,first.key,first.proposal,'R0');expect(a).toBeDefined();
 const result=apply(a!.seed,a!.proposal);expect('state'in result).toBe(true);if(!('state'in result))return;
 const b=catalogCommit(result.state,second.catalog,second.key,second.proposal,'R0');expect(b).toBeDefined();
 const final=apply(b!.seed,b!.proposal);expect('state'in final).toBe(true);if('state'in final){const items=Object.values(final.state.rooms).flatMap(r=>r.instances);
 expect(items.filter(i=>i.id==='catalog-first')).toHaveLength(1);expect(items.filter(i=>i.id==='catalog-second')).toHaveLength(1);}
});
it('P3-4 admission follows the destination capacity, including an adjacent room',()=>{
 const latest=labHome();latest.rooms.home.instances=Array.from({length:48},(_,n)=>instance(`full-${n}`,'banana',0,0));
 const seed={...latest,rooms:{...latest.rooms,home:{...latest.rooms.home,instances:[...latest.rooms.home.instances,instance('adjacent','chair',0,0)]}}};
 const scene=buildScene(seed),id='home/item/adjacent',catalog={seed,revision:'R0'};
 const p=resolve(scene.rooms.kitchen,scene.entities[id],roomPoint(600,515),{scale:.5,release:true,catalog:true,avoidFurnitureOverlap:true});
 expect(catalogCommit(latest,catalog,id,p,'R0')).toBeDefined();
 const full={...latest,rooms:{...latest.rooms,kitchen:{...latest.rooms.kitchen,instances:Array.from({length:48},(_,n)=>instance(`dest-${n}`,'banana',0,0))}}};
 expect(catalogCommit(full,catalog,id,p,'R0')).toBeUndefined();
});
