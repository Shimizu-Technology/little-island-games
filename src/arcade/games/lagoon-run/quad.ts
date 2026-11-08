/** Four-corner projective texture mapping. All camera/contact points come from runPoses. */
export type Point = { x:number; y:number };
export type Quad = readonly [Point,Point,Point,Point];
export function quadHomography(q:Quad):number[] {
  'worklet';
  // Unit square order: near-left, near-right, far-right, far-left.
  let [a,b,c,d]=q;
  // Camera clips both far corners to the horizon. A subpixel edge is the finite
  // projective limit of that triangle and avoids a singular native matrix.
  if(Math.hypot(c.x-d.x,c.y-d.y)<.001 && Math.hypot(b.x-a.x,b.y-a.y)>.001) {c={x:c.x+.001,y:c.y};d={x:d.x-.001,y:d.y};}
  const dx1=b.x-c.x,dx2=d.x-c.x,dx3=a.x-b.x+c.x-d.x,dy1=b.y-c.y,dy2=d.y-c.y,dy3=a.y-b.y+c.y-d.y;
  const det=dx1*dy2-dx2*dy1;
  if(Math.abs(det)<1e-8)return [0,0,a.x,0,0,a.y,0,0,1];
  const g=(dx3*dy2-dx2*dy3)/det,h=(dx1*dy3-dx3*dy1)/det;
  return [b.x-a.x+g*b.x,d.x-a.x+h*d.x,a.x,b.y-a.y+g*b.y,d.y-a.y+h*d.y,a.y,g,h,1];
}
export function multiply3(a:number[],b:number[]):number[] {
  'worklet';
  const out:number[]=[];
  for(let r=0;r<3;r++)for(let c=0;c<3;c++)out.push(a[r*3]*b[c]+a[r*3+1]*b[3+c]+a[r*3+2]*b[6+c]);
  return out;
}
export function inverse3(a:number[]):number[] {
  const [a0,b,c,d,e,f,g,h,i]=a,det=a0*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);
  return [(e*i-f*h)/det,(c*h-b*i)/det,(b*f-c*e)/det,(f*g-d*i)/det,(a0*i-c*g)/det,(c*d-a0*f)/det,(d*h-e*g)/det,(b*g-a0*h)/det,(a0*e-b*d)/det];
}
export function matrix4(h:number[]):number[] {
  'worklet';
  return [h[0],h[3],0,h[6],h[1],h[4],0,h[7],0,0,1,0,h[2],h[5],0,h[8]];
}
export function mapPoint(h:number[],x:number,y:number):Point {
  const w=h[6]*x+h[7]*y+h[8];return {x:(h[0]*x+h[1]*y+h[2])/w,y:(h[3]*x+h[4]*y+h[5])/w};
}
