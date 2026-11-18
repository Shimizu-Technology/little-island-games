import {itemShapes,unionBounds} from './silhouettes';
import type {Instance} from '../model';
import type {HitShape} from '../scene/types';
/** Same 24-unit HandProp scale in the meal, real container, aim and picking. */
export const heldDrinkScale=(unit:number,slot:number)=>unit*(slot===1?1.25:1);
export function heldDrinkGeometry(item:Instance,unit:number,longStraw:boolean){
 const x=(v:number)=>((v+45)/3.6-12)*unit, y=(v:number)=>((v+99.5)/3.6-12)*unit;
 const k=unit/3.6;
 const shapes:HitShape[]=itemShapes({...item,rotation:0,mirrored:false},150).map(s=>{
  switch(s.kind){
   case 'box':return {...s,left:x(s.left),top:y(s.top),width:s.width*k,height:s.height*k};
   case 'ellipse':return {...s,x:x(s.x),y:y(s.y),rx:s.rx*k,ry:s.ry*k};
   case 'capsule':return {...s,ax:x(s.ax),ay:y(s.ay),bx:x(s.bx),by:y(s.by),r:s.r*k};
   default:return {...s,points:s.points.map((v,i)=>i%2?y(v):x(v))};
  }
 });
 if(longStraw)shapes.push({kind:'capsule',ax:unit,ay:0,bx:6*unit,by:-22*unit,r:unit});
 return {bounds:unionBounds(shapes)!,shapes,visual:{x:0,y:0},occluders:[]};
}
