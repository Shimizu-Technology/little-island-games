import { trackSprite } from './camera';
/** Paired tall shore props share track depth, with far bands providing haze. */
export function harborSceneryPose(travel:number,i:number) {
  'worklet';
  const band=Math.floor(i/4),span=[1.25,.9,.48][band],rate=[1,.6,.28][band];
  const distance=travel*rate+Math.floor(i%4/2)*span/2+(i%2)*.025,z=.035+distance%span;
  const lane=1+(i%2?1:-1)*[1.82,2.45,3.5][band];
  return {identity:Math.floor(distance/span),...trackSprite(lane,z,100,240),opacity:.3+.7*Math.min(1,z*1.5)};
}
