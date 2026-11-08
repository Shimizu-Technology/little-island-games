import { describe, expect, it } from 'vitest';
import { createRun, runStep, runTransition, type RunState } from '../src/arcade/games/lagoon-run/engine';
import { runLevels } from '../src/arcade/games/scrolling/content';
const idle={type:'idle'} as const;
const clear=(s:RunState):RunState=>({...s,rows:s.rows.map(r=>({...r,z:-3,passed:true,surface:'sand',power:'none'}))});
describe('L1 forgiving controls',()=>{
 it('buffers a jump in the final 120 ms and consumes it once on landing',()=>{
  let s=clear(createRun(runLevels[7],771));
  s=runTransition(s,{type:'jump'});s={...s,jump:.09};
  s=runTransition(s,{type:'jump'});
  for(let i=0;i<7;i++)s=runStep(s,idle,1/60);
  expect(s.jump).toBeGreaterThan(.45);
  const event=s.event;
  for(let i=0;i<50;i++)s=runStep(s,idle,1/60);
  expect(s.jump).toBe(0);expect(s.event).toBe(event);
 });
 it('expires an early request instead of jumping much later',()=>{
  let s=clear(createRun(runLevels[7],771));s=runTransition(s,{type:'jump'});s=runTransition(s,{type:'jump'});
  for(let i=0;i<40;i++)s=runStep(s,idle,1/60);
  expect(s.jump).toBe(0);
 });
 it('accepts a jump within 80 ms after leaving a deck and rejects a late one',()=>{
  let s=clear(createRun(runLevels[7],771));s.rows[0]={...s.rows[0],surface:'boardwalk',shellLane:1,z:1.5,length:.5};s.elevation=.85;
  s=runStep(s,idle,1/60);s.rows[0]={...s.rows[0],z:1.54};
  const off=runStep(s,idle,1/60);
  expect(runTransition(off,{type:'jump'}).jump).toBeGreaterThan(0);
  let late=off;for(let i=0;i<6;i++)late=runStep(late,idle,1/60);
  expect(runTransition(late,{type:'jump'}).jump).toBe(0);
 });
 it('acknowledges a blocked edge move with an event and visible nudge',()=>{
  const s={...clear(createRun(runLevels[7],771)),lane:0,poseLane:0,laneFrom:0};
  const next=runTransition(s,{type:'left'});
  expect(next.lane).toBe(0);expect(next.event).toBeGreaterThan(s.event);
 });
 it('cannot lose W1-1 before trying all three taught moves',()=>{
  let s=createRun(runLevels[0],771);
  for(let i=0;i<3600&&s.status==='playing';i++)s=runStep(s,idle,1/60);
  expect(s.status).not.toBe('stumbled');expect(s.helped).toBe(true);
 });
});

describe('L1 reactions and score integrity',()=>{
 it('buffers the last 120 ms of a roll without extending the original action',()=>{
  let s=clear(createRun(runLevels[7],771));s=runTransition(s,{type:'duck'});s={...s,duck:.08};s=runTransition(s,{type:'duck'});
  for(let i=0;i<6;i++)s=runStep(s,idle,1/60);
  expect(s.duck).toBeGreaterThan(.5);for(let i=0;i<45;i++)s=runStep(s,idle,1/60);expect(s.duck).toBe(0);
 });
 it('marks a tight dodge for presentation and adds exactly the ordinary marker score',()=>{
  const s=clear(createRun(runLevels[7],771));s.lane=0;s.laneFrom=1;s.laneTime=.12*Math.cbrt(.5)+1/60;s.poseLane=(s.laneTime/.12)**3;
  s.rows[0]={...s.rows[0],z:.999,passed:false,lane:1,second:-1,third:false,kind:'wall',shellLane:2,shellDone:7};
  const next=runStep(s,idle,1/60);
  expect(next.nearMissEvent).toBe(1);expect(next.nearMiss).toBe(.3);expect(next.score-s.score).toBe(10);expect(next.shells).toBe(s.shells);expect(next.bumps).toBe(0);
 });
 it('publishes the hit flash and stumble in the contact pose, respecting reduced motion',async()=>{
  const {runPoses}=await import('../src/arcade/games/scrolling/render');
  const s=clear(createRun(runLevels[7],771));s.learned=7;s.rows[0]={...s.rows[0],z:.999,passed:false,lane:1,second:-1,third:false,kind:'wall',shellDone:7};
  const next=runStep(s,idle,1/60),pose=runPoses(next),quiet=runPoses(next,true);
  expect(next.lives.hit).toBe(1);expect(pose[36].x).toBeGreaterThan(0);expect(pose[36].snap).toBe(true);expect(quiet[36].x).toBe(0);expect(quiet[36].scale).toBe(.65);
 });
});

it('carries continuous world travel while decorative stripes would be clipped at the camera',async()=>{
 const {runPoses}=await import('../src/arcade/games/scrolling/render');
 const s=createRun(runLevels[7],771);
 for(const travel of [0,.065,.52,1.149,1.16,1.17,1.18,1.19,2.35,2.36,10.001]) {
  const p=runPoses({...s,travel});expect(p[35].opacity).toBe(1);expect(p[35].x).toBe(travel);
 }
});

it('gives splash and near-miss sparkle distinct complete lifetimes',async()=>{
 const {runPoses,NEAR_START}=await import('../src/arcade/games/scrolling/render');
 const s=clear(createRun(runLevels[7],771));
 const splash=runPoses({...s,cooldown:.01,feedback:.15}),near=runPoses({...s,nearMiss:.01,feedback:.15});
 expect(splash[26].opacity).toBeCloseTo(.01/.3);expect(splash[NEAR_START].opacity).toBe(0);
 expect(near[NEAR_START].opacity).toBeCloseTo(.01/.3);expect(near[26].opacity).toBe(0);
});
