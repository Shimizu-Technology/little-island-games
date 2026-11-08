import type { SpritePose } from '../../src/arcade/poses';
export function canoePath(p: SpritePose[],index:number,part:string) {
  'worklet';
  const a=p[index],b=p[index+1],c=p[index+2],d=p[index+3];
  if(!a||a.opacity===0||!b||!c||!d)return 'M0 0';
  const near=(a.x+b.x)/2,far=(c.x+d.x)/2,ns=a.scale??1,fs=d.scale??1,ny=a.y-34*ns,fy=d.y-23*fs;
  if(part==='shadow')return `M${a.x-3*ns} ${a.y+4*ns}Q${near} ${a.y+15*ns} ${b.x+16*ns} ${b.y+4*ns}L${c.x+15*fs} ${c.y+3*fs}L${d.x} ${d.y}Z`;
  if(part==='hull')return `M${a.x} ${ny}Q${near} ${ny+21*ns} ${b.x} ${ny}L${c.x} ${fy}L${far} ${fy-16*fs}L${d.x} ${fy}Z M${a.x} ${ny}Q${near} ${a.y+12*ns} ${b.x} ${ny}L${b.x-6*ns} ${b.y-3*ns}Q${near} ${a.y+10*ns} ${a.x+6*ns} ${a.y-3*ns}Z`;
  if(part==='inside')return `M${a.x+5*ns} ${ny}Q${near} ${ny+12*ns} ${b.x-5*ns} ${ny}L${c.x-3*fs} ${fy+3*fs}L${far} ${fy-8*fs}L${d.x+3*fs} ${fy+3*fs}Z`;
  if(part==='rail')return `M${a.x} ${ny}Q${near} ${ny+21*ns} ${b.x} ${ny}L${c.x} ${fy}L${far} ${fy-16*fs}L${d.x} ${fy}Z M${a.x+7*ns} ${ny+12*ns}L${d.x+4*fs} ${fy+7*fs} M${b.x-6*ns} ${ny+14*ns}L${c.x-4*fs} ${fy+7*fs}`;
  if(part==='cargo') {
    const x=near+(far-near)*.4,y=ny+(fy-ny)*.4,w=19*ns,h=24*ns;
    return `M${x-w} ${y}v${-h}l${w*1.5} ${-6*ns}l${w*.5} ${7*ns}v${h}l${-w*1.5} ${6*ns}Z M${x-w} ${y-h}l${w*.5} ${7*ns}l${w*1.5} ${-6*ns} M${x-w*.5} ${y-h+7*ns}v${h} M${x-w*.8} ${y-h+8*ns}l${w*1.1} ${h*.6} M${x+w*.3} ${y-h+7*ns}l${-w*1.1} ${h*.7}`;
  }
  if(part==='float')return `M${b.x-2*ns} ${ny+4*ns}L${b.x+17*ns} ${ny+8*ns} M${c.x-2*fs} ${fy+8*fs}L${c.x+14*fs} ${fy+13*fs} M${b.x+16*ns} ${a.y-8*ns}Q${b.x+30*ns} ${a.y-4*ns} ${b.x+25*ns} ${a.y-19*ns}L${c.x+18*fs} ${fy+12*fs}Q${c.x+12*fs} ${fy+4*fs} ${c.x+11*fs} ${fy+17*fs}Z`;
  return `M${a.x-8*ns} ${a.y-5*ns}Q${a.x-18*ns} ${a.y+2*ns} ${a.x-10*ns} ${a.y+13*ns} M${b.x+30*ns} ${b.y-9*ns}q${18*ns} ${8*ns} ${7*ns} ${22*ns} M${a.x-10*ns} ${a.y-48*ns}l${-4*ns} ${25*ns} M${b.x+37*ns} ${b.y-50*ns}l${5*ns} ${26*ns}`;
}
