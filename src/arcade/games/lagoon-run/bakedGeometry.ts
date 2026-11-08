import type { SpritePose } from '../../poses';
import {projectTrack} from './camera';
import { matrix4, multiply3, quadHomography, type Quad } from './quad';
export type CanoeBake = {inverse:number[];width:number;height:number;depth:number};
export function canoeMatrix(q:Quad,meta:CanoeBake):number[] {
 'worklet';
 const width=q[1].x-q[0].x;
 // Upright cargo must not extrapolate a ground homography near the horizon.
 // Anchor the complete distant silhouette to its bow with a similarity transform.
 if(width < projectTrack(1.3,.35).x-projectTrack(.7,.35).x) {
  const scale=width/(projectTrack(1.3,meta.depth).x-projectTrack(.7,meta.depth).x);
  const [a,b,c,d,e,f]=meta.inverse,det=a*e-b*d;
  const x=(b*f-c*e)/det,y=(c*d-a*f)/det;
  return [scale,0,q[0].x-scale*x,0,scale,q[0].y-scale*y,0,0,1];
 }
 return multiply3(quadHomography(q),meta.inverse);
}
export function deckSide(q:readonly SpritePose[],side:'left'|'right',incline:boolean):Quad {
 'worklet';const a=q[side==='left'?0:1],b=q[side==='left'?3:2];
 const sign=side==='left'?-1:1;
 const bottom=(v:SpritePose)=>{ 'worklet';return {x:v.x+(incline?sign*(v.scale??0)*.5:0),y:v.y+(incline?Math.max(5,v.scale??0):5)};};
 return [a,b,bottom(b),bottom(a)];
}
export function deckShadow(q:readonly SpritePose[]):Quad {
 'worklet';return q.map((v,i)=>({x:v.x+(i===0||i===3?5:10),y:v.y+(v.scale??0)+5})) as unknown as Quad;
}
/** Flat skirts can be concave: two affine triangles have no projective pole. */
export function sideTriangles(q:Quad) {
 'worklet';
 const area=(a:{x:number;y:number},b:{x:number;y:number},c:{x:number;y:number})=>Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x));
 const [a,b,c,d]=q;
 const points=area(a,b,c)+area(a,c,d)<=area(a,b,d)+area(b,c,d)?[[a,b,c],[a,c,d]]:[[a,b,d],[b,c,d]];
 return points.map(([a,b,c])=>({points:[a,b,c],matrix:[b.x-a.x,c.x-a.x,a.x,b.y-a.y,c.y-a.y,a.y,0,0,1]}));
}

/** One materialized transform set per segment, shared by its six native faces. */
export function deckFrame(q:readonly SpritePose[],incline:boolean,topHeight:number) {
 'worklet';
 const left=sideTriangles(deckSide(q,'left',incline)),right=sideTriangles(deckSide(q,'right',incline));
 const planes=[quadHomography(deckShadow(q)),left[0].matrix,left[1].matrix,right[0].matrix,right[1].matrix,quadHomography(q as unknown as Quad)];
 return planes.map((h,i)=>{const w=i===0?16:i<5?32:128,ht=i<5?w:topHeight;return matrix4(multiply3(h,[1/w,0,0,0,1/ht,0,0,0,1]));});
}
