import { HAZARDS } from "../lagoon-run/course";
import { HIDDEN_POSE, type SpritePose } from "../../poses";
import { jumpHeight, runnerHeight, shellHeight, obstacleLane, runLearning, type RunState } from "../lagoon-run/engine";
import { projectTrack, trackSprite } from "../lagoon-run/camera";
import { runnerFrame, RUN_POSES } from "./character";
import { sceneryPose, groundTexturePose, SCENE_COUNT, SCENE_START, TEXTURE_START, TEXTURE_COUNT } from "./environmentPoses";
export const RUN_SLOTS = 179;
export function runPoses(s: RunState, reduced = false): SpritePose[] {
  "worklet";
  const p:SpritePose[]=Array(RUN_SLOTS).fill(HIDDEN_POSE),learn=runLearning(s),contact=projectTrack(s.poseLane,1),frame=runnerFrame(s,reduced),lift=runnerHeight(s)*85;
  // Root is bottom-centre; poses have their own authored contact/compression, never free limbs.
  p[0]={identity:s.lives.hit,x:contact.x-40,y:contact.y-130-lift,angle:reduced?0:(s.lane-s.poseLane)*.14};
  for(let i=0;i<RUN_POSES;i++)p[80+i]=i===frame?{x:0,y:0,snap:true}:HIDDEN_POSE;
  p[50]={x:contact.x-35,y:contact.y-7-Math.min(.85,s.elevation)*85,scale:1-jumpHeight(s)*.3};
  s.rows.forEach((row,i)=>{
    const visible=!learn&&row.z>0&&row.z<1.18;
    const height = row.surface === "sand" || row.surface === "ramp" ? 0 : .85;
    // Each obstacle uses its own kind for size, contact height and spin (a row can mix kinds).
    const hazardPose = (lane: number, kind: typeof row.kind) => { "worklet"; const a=trackSprite(lane,row.z,72,HAZARDS[kind]==="jump"?72:129.6); return {identity:row.serial,...a,y:a.y-height*85*a.scale,angle:kind === "coconut" ? s.time*3 : 0}; };
    p[1+i*2]=visible?hazardPose(obstacleLane(row,s.time),row.kind):HIDDEN_POSE;
    p[2+i*2]=visible&&row.second>=0?hazardPose(row.second,row.secondKind):HIDDEN_POSE;
    p[75+i]=visible&&row.third?hazardPose(row.shellLane,row.kind):HIDDEN_POSE;
    for(let c=0;c<3;c++){
      const z=row.z+c*.07,t=row.bursts[c]/.26;
      const a=trackSprite(row.shellLane,z,30,30),h=s.kite>0?2.7:shellHeight(row,c);
      const pull=s.magnet>0?Math.max(0,Math.min(1,(z-.65)/.35)):0;
      if(pull>0){a.x+=(contact.x-15-a.x)*pull;a.y+=(contact.y-70-a.y)*pull;}
      p[11+i*3+c]=!learn&&!(row.shellTaken&(1<<c))&&z>0&&z<1.18?{identity:row.serial,...a,y:a.y-h*85*a.scale}:HIDDEN_POSE;
      if(learn&&!row.passed&&row.z>0&&row.z<1.08)p[60+i*3+c]={identity:row.phase,...trackSprite(c,row.z,64,64)};
      if(!learn&&t>0){const a=projectTrack(row.shellLane,1);p[132+i*3+c]={identity:`${row.phase}-${c}`,x:a.x-24,y:a.y-45-(1-t)*28,scale:reduced?1:1+(1-t)*.55,opacity:t};}
    }
    const power=trackSprite(row.shellLane,row.z+.23,44,44);
    p[167+i]=!learn&&row.power!=="none"&&!row.powerDone?{identity:row.serial,...power,y:power.y-30*power.scale}:HIDDEN_POSE;
    if(!learn&&row.surface!=="sand"&&row.z>0&&row.z-row.length<1.18){
      const front=row.z+(row.surface==="ramp"?.18:0),back=row.z-row.length;
      const zf=row.surface==="gap"?front-.18:front;
      for(let j=0;j<4;j++){
        const z=j<2?zf:back, lane=row.shellLane+(j===0||j===3?-.43:.43), a=projectTrack(lane,z);
        const height=row.surface==="ramp"&&j<2?0:.85*85*a.scale;
        p[147+i*4+j]={identity:row.serial,x:a.x,y:a.y-height,scale:height,opacity:1};
      }
    }
  });
  p[172]={x:contact.x-36,y:contact.y-200-lift,opacity:s.kite>0?1:0};
  p[173]={x:contact.x-48,y:contact.y-134-lift,opacity:s.shield||s.protection>0?.7:0};
  for(let i=0;i<14;i++){const distance=s.travel+Math.floor(i/2)*.17,z=distance%1.18;p[35+i]={identity:Math.floor(distance/1.18),...trackSprite(i%2?1.5:.5,z,4,36)};}
  for(let i=0;i<SCENE_COUNT;i++)p[SCENE_START+i]=sceneryPose(s.travel,i);
  for(let i=0;i<TEXTURE_COUNT;i++)p[TEXTURE_START+i]=groundTexturePose(s.travel,i);
  const next=s.rows.filter(r=>!r.passed).sort((a,b)=>b.z-a.z)[0];
  const move=next?.action==="idle"?4:next?.action==="jump"?1:2;
  p[57]={x:140+(reduced?0:Math.sin(s.time*4)*5),y:558,opacity:!learn&&next&&next.z>.35&&(next.action!=="idle"||s.lane!==next.shellLane)&&!(s.learned&move)?1:0};
  const f=s.feedback/.45,scored=s.lastGain>0;
  p[56]={x:contact.x+42,y:396-(1-f)*25,opacity:scored&&s.cue!=="shell"?f:0};
  if(s.cue==="bump"&&!reduced)for(let i=0;i<6;i++){const a=i*Math.PI/3;p[26+i]={x:contact.x+Math.cos(a)*(1-f)*50,y:contact.y-60+Math.sin(a)*(1-f)*50,opacity:f};}
  return p;
}
