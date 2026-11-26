import { harborSceneryPose } from '../lagoon-run/scenery';
import { CANOE_DEPTH, isCanoe, visualRunHeight } from "../lagoon-run/geometry";
import { hazardBox, POWER_SECONDS } from "../lagoon-run/course";
import { runnerKinetics, RUNNER_KINETICS } from "../lagoon-run/kinetics";
import { HIDDEN_POSE, rankPainterPoses, type SpritePose } from "../../poses";
import { runSpeed, runnerHeight, shellHeight, obstacleLane, runLearning, type RunState } from "../lagoon-run/engine";
import { RAMP_DEPTH, RAMP_SECTIONS, surfaceProfile, surfaceSpan } from "../lagoon-run/surface";
import { CAMERA_SLOT, HERO_SCALE, TRACK_WIDTH, arrivalOpacity, projectTrack, trackSprite } from "../lagoon-run/camera";
import { runnerFrame, RUN_POSES, RUN_EXTRA } from "./character";
import { SCENE_COUNT, SCENE_START } from "./environmentPoses";
export const INCLINE_START = 179, INCLINE_STRIDE = RAMP_SECTIONS * 4, POWER_AURA = INCLINE_START + 5 * INCLINE_STRIDE, CANOE_START = RUN_EXTRA + 8, NEAR_START=37, RUN_SLOTS = CANOE_START+15*4+1;
/** Where a pose's local point lands, for a w×h sprite scaled about its centre (as native draws it). */
export function spritePoint(p: SpritePose, w: number, h: number, x: number, y: number) {
  "worklet";
  const k = p.scale ?? 1;
  return { x: p.x + w / 2 + (x - w / 2) * k, y: p.y + h / 2 + (y - h / 2) * k };
}
/** The runner's drawn contact: its 80×132 frame's planted-shoe line (y 130), after HERO_SCALE. */
export function heroContactY(p: SpritePose) { "worklet"; return spritePoint(p, 80, 132, 40, 130).y; }
export function runPoses(s: RunState, reduced = false): SpritePose[] {
  "worklet";
  const p:SpritePose[]=Array(RUN_SLOTS).fill(HIDDEN_POSE),learn=runLearning(s),contact=projectTrack(s.poseLane,1),frame=runnerFrame(s,reduced),lift=visualRunHeight(runnerHeight(s))*85;
  // Root is bottom-centre; poses have their own authored contact/compression, never free limbs.
  // The runner is drawn HERO_SCALE of track scale, scaled about its foot so contact never moves.
  const foot=contact.y-lift,hero=(x:number,y:number,w:number,h:number,extra?:Partial<SpritePose>):SpritePose=>{ "worklet";
    return {x:contact.x+(x+w/2-contact.x)*HERO_SCALE-w/2,y:foot+(y+h/2-foot)*HERO_SCALE-h/2,scale:HERO_SCALE,...extra}; };
  p[0]=hero(contact.x-40+(reduced?0:Math.sin((1-s.edgeTime/.12)*Math.PI)*s.edge*6),contact.y-130-lift,80,132,{identity:s.lives.hit});
  p[RUNNER_KINETICS] = runnerKinetics(s, reduced);
  for(let i=0;i<RUN_POSES;i++)p[i<16?80+i:RUN_EXTRA+i-16]=i===frame?{x:0,y:0,snap:true}:HIDDEN_POSE;
  p[50]={x:contact.x-35,y:contact.y-7,scale:HERO_SCALE*(1-Math.min(2.7,runnerHeight(s))*.18),opacity:.8};
  s.rows.forEach((row,i)=>{
    const visible=!learn&&row.z> -1.2;
    // Each obstacle uses its own kind for size, contact height and spin (a row can mix kinds).
    const hazardPose = (lane: number, kind: typeof row.kind, actor: number) => { "worklet";
      if(lane<0 || row.z >= (isCanoe(kind)?1.18+CANOE_DEPTH:1.18))return HIDDEN_POSE;
      if(isCanoe(kind)) {
        for(let j=0;j<4;j++) {
          const a=projectTrack(lane+(j===0||j===3?-.30:.30),row.z-(j<2?0:CANOE_DEPTH));
          p[CANOE_START+actor*4+j]={identity:row.serial,x:a.x,y:a.y,scale:a.scale};
        }
        return {identity:row.serial,x:0,y:0,painterDepth:projectTrack(1,row.z).scale,painterKey:row.serial*7+actor%3,opacity:1};
      }
      const box=hazardBox(kind),a=trackSprite(lane,row.z,box.width,box.height),height=surfaceProfile(row,row.surface==="gap"?RAMP_DEPTH:0,lane); return {identity:row.serial,...a,painterDepth:a.scale,painterKey:row.serial*7+actor%3,opacity:a.opacity===0?0:arrivalOpacity(row.z),y:a.y-height*85*a.scale,angle:kind === "coconut" && !reduced ? s.time*3 : 0}; };
    p[1+i*2]=visible?hazardPose(obstacleLane(row,s.time),row.kind,i*3):HIDDEN_POSE;
    p[2+i*2]=visible&&row.second>=0?hazardPose(row.second,row.secondKind,i*3+1):HIDDEN_POSE;
    p[75+i]=visible&&row.third?hazardPose(row.shellLane,row.kind,i*3+2):HIDDEN_POSE;
    for(let c=0;c<3;c++){
      const z=row.z+c*.07;
      const a=trackSprite(row.shellLane,z,30,30),h=s.kite>0?2.7:shellHeight(row,c);
      const pull=s.magnet>0?Math.max(0,Math.min(1,(z-.65)/.35)):0;
      if(pull>0){a.x+=(contact.x-15-a.x)*pull;a.y+=(contact.y-70-a.y)*pull;}
      p[11+i*3+c]=!learn&&!(row.shellTaken&(1<<c))&&z> -1.2&&z<1.18?{identity:row.serial,...a,painterDepth:a.scale,painterKey:row.serial*7+3+c,y:a.y-visualRunHeight(h)*85*a.scale}:HIDDEN_POSE;
      if(learn&&!row.passed&&row.z> -1.2&&row.z<1.08)p[60+i*3+c]={identity:row.phase,...trackSprite(c,row.z,64,64)};
    }
    const power=trackSprite(row.shellLane,row.z+.23,44,44);
    p[167+i]=!learn&&row.power!=="none"&&!row.powerDone?{identity:row.serial,...power,painterDepth:power.scale,painterKey:row.serial*7+6,y:power.y-(30+surfaceProfile(row,-.23)*85)*power.scale}:HIDDEN_POSE;
    if(!learn&&row.surface!=="sand"&&row.z> -1.2&&row.z-row.length<1.18){
      for(let segment=-1;segment<(row.surface==="ramp"?RAMP_SECTIONS:0);segment++){
        const span=surfaceSpan(row,segment),start=segment>=0?INCLINE_START+i*INCLINE_STRIDE+segment*4:147+i*4;
        for(let j=0;j<4;j++){
          const behind=span[j<2?0:1],lane=row.shellLane+(j===0||j===3?-.43:.43),a=projectTrack(lane,row.z-behind);
          const height=surfaceProfile(row,behind)*85*a.scale;
          p[start+j]={identity:row.serial,x:a.x,y:a.y-height,scale:height,opacity:1};
        }
      }
    }
  });
  const aura=hero(contact.x-56,contact.y-144-lift,112,154,{opacity:s.magnet>0?.65:0});
  p[POWER_AURA]={...aura,scale:HERO_SCALE*(reduced?1:1+Math.sin(s.time*5)*.025)};
  const powered = s.kite > 0 || s.sandals > 0;
  const boost = Math.max(powerEnvelope(s.kite, POWER_SECONDS.kite), powerEnvelope(s.sandals, POWER_SECONDS.sandals));
  p[POWER_AURA+1]=hero(contact.x-43,contact.y-20-lift,86,28,{opacity:s.sandals>0?1:0});
  p[POWER_AURA+2] = hero(contact.x - 52, foot - 122, 104, 132, {
    opacity: powered ? (reduced ? .32 : boost * (.58 + Math.sin(s.time * 10) * .14)) : 0,
  });
  p[172]=hero(contact.x-36,contact.y-200-lift,72,110,{opacity:s.kite>0?1:0});
  p[173]=hero(contact.x-48,contact.y-134-lift,96,142,{opacity:s.shield||s.protection>0?.7:0});
  // Always-visible travel carrier: never infer phase from a clipped decorative sprite.
  p[35]={x:s.travel,y:0,opacity:1};
  p[36]={identity:s.lives.hit,x:reduced?0:Math.max(0,(s.cooldown-.20)/.10)*.45,y:0,scale:reduced?(s.lives.invulnerable>0?.65:1):s.lives.invulnerable>0&&Math.floor(s.time*16)%2?.38:1,snap:true};
  for(let i=0;i<SCENE_COUNT;i++)p[SCENE_START+i]=harborSceneryPose(s.travel,i);
  const lean = reduced ? 0 : s.lane-s.poseLane;
  // Camera is always visible. Its scale field carries speed-line intensity, not zoom.
  p[CAMERA_SLOT]={x:-(contact.x-195)*.3-lean*5,y:reduced?0:Math.sin(s.travel*32)*1.1,angle:lean*.018,opacity:1,scale:reduced?0:Math.min(.65,.09+Math.max(0,(runSpeed(s)-.42)*1.15)+boost*.31)};
  const next=s.rows.filter(r=>!r.passed).sort((a,b)=>b.z-a.z)[0];
  const move=next?.action==="idle"?4:next?.action==="jump"?1:2;
  // The cue's move rides in frame (same rule as runHud.teaching): pre-mounted variants switch by opacity, no render.
  const cue=next?.action==="jump"?0:next?.action==="duck"?1:next&&next.shellLane<s.lane?2:3;
  p[57]={x:260,y:78,frame:cue,opacity:!learn&&next&&next.z>.35&&(next.action!=="idle"||s.lane!==next.shellLane)&&!(s.learned&move)?1:0};
  const f=s.feedback/.45,scored=s.lastGain>0;
  // +10 floats just above the runner's head and never sits on the track ahead.
  p[56]={x:Math.max(8,Math.min(TRACK_WIDTH-72,contact.x-32)),y:contact.y-lift-132*HERO_SCALE-36-(1-f)*18,opacity:scored&&s.cue!=="shell"?f:0};
  for(const [start,lifetime] of [[26,s.cooldown],[NEAR_START,s.nearMiss]])if(lifetime>0&&!reduced)for(let i=0;i<6;i++){
    const t=Math.min(1,lifetime/.3),a=i*Math.PI/3;
    p[start+i]={x:contact.x+Math.cos(a)*(1-t)*50,y:contact.y-60+Math.sin(a)*(1-t)*50,opacity:t};
  }
  // Inactive slots retain one canonical object and never send hidden native transforms.
  for(let i=0;i<p.length;i++)if(p[i].opacity===0)p[i]=HIDDEN_POSE;
  return rankPainterPoses(p);
}

function powerEnvelope(remaining: number, duration: number) {
  "worklet";
  return Math.max(0, Math.min(1, (duration - remaining) / .16, remaining / .26));
}
