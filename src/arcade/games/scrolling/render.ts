import { HIDDEN_POSE, type SpritePose } from "../../poses";
import { jumpHeight, obstacleLane, runLearning, type RunState } from "../lagoon-run/engine";
import { projectTrack, trackSprite } from "../lagoon-run/camera";
import { runnerFrame, RUN_POSES } from "./character";
import { sceneryPose, groundTexturePose, SCENE_COUNT, SCENE_START, TEXTURE_START, TEXTURE_COUNT } from "./environmentPoses";
export const RUN_SLOTS = 147;
export function runPoses(s: RunState, reduced = false): SpritePose[] {
  "worklet";
  const p:SpritePose[]=Array(RUN_SLOTS).fill(HIDDEN_POSE),learn=runLearning(s),contact=projectTrack(s.poseLane,1),frame=runnerFrame(s,reduced),lift=jumpHeight(s)*105;
  // Root is bottom-centre; poses have their own authored contact/compression, never free limbs.
  p[0]={identity:s.lives.hit,x:contact.x-40,y:contact.y-130-lift,angle:reduced?0:(s.lane-s.poseLane)*.14};
  for(let i=0;i<RUN_POSES;i++)p[80+i]=i===frame?{x:0,y:0,snap:true}:HIDDEN_POSE;
  p[50]={x:contact.x-35,y:contact.y-7,scale:1-jumpHeight(s)*.3};
  s.rows.forEach((row,i)=>{
    const visible=!learn&&row.z>0&&row.z<1.18;
    p[1+i*2]=visible?{identity:row.phase,...trackSprite(obstacleLane(row,s.time),row.z,72,72)}:HIDDEN_POSE;
    p[2+i*2]=visible&&row.second>=0?{identity:row.phase,...trackSprite(row.second,row.z,72,72)}:HIDDEN_POSE;
    p[75+i]=visible&&row.third?{identity:row.phase,...trackSprite(row.shellLane,row.z,72,72)}:HIDDEN_POSE;
    for(let c=0;c<3;c++){
      const z=row.z+c*.07,t=row.bursts[c]/.26;
      p[11+i*3+c]=!learn&&!(row.shellTaken&(1<<c))&&z>0&&z<1.18?{identity:row.phase,...trackSprite(row.shellLane,z,30,30)}:HIDDEN_POSE;
      if(learn&&!row.passed&&row.z>0&&row.z<1.08)p[60+i*3+c]={identity:row.phase,...trackSprite(c,row.z,64,64)};
      if(!learn&&t>0){const a=projectTrack(row.shellLane,1);p[132+i*3+c]={identity:`${row.phase}-${c}`,x:a.x-24,y:a.y-45-(1-t)*28,scale:reduced?1:1+(1-t)*.55,opacity:t};}
    }
  });
  for(let i=0;i<14;i++){const distance=s.travel+Math.floor(i/2)*.17,z=distance%1.18;p[35+i]={identity:Math.floor(distance/1.18),...trackSprite(i%2?1.5:.5,z,4,36)};}
  for(let i=0;i<SCENE_COUNT;i++)p[SCENE_START+i]=sceneryPose(s.travel,i);
  for(let i=0;i<TEXTURE_COUNT;i++)p[TEXTURE_START+i]=groundTexturePose(s.travel,i);
  p[57]={x:140,y:576,opacity:reduced||learn?0:Math.max(0,1-s.time/4)};
  const f=s.feedback/.45,scored=s.lastGain>0;
  p[56]={x:contact.x+42,y:396-(1-f)*25,opacity:scored&&s.cue!=="shell"?f:0};
  if(s.cue==="bump"&&!reduced)for(let i=0;i<6;i++){const a=i*Math.PI/3;p[26+i]={x:contact.x+Math.cos(a)*(1-f)*50,y:contact.y-60+Math.sin(a)*(1-f)*50,opacity:f};}
  return p;
}
