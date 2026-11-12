import React from 'react';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { defaultLook, hats } from '../src/islander/look';
import { RunnerFrameArt } from '../src/arcade/games/scrolling/CharacterArt';
import { createRun, rowSafe, SLIDE_SECONDS } from '../src/arcade/games/lagoon-run/engine';
import { DUCK_MAX_ELEVATION } from '../src/arcade/games/lagoon-run/geometry';
import { runnerFrame } from '../src/arcade/games/scrolling/character';
import { runLevels } from '../src/arcade/games/scrolling/content';
import { runPoses } from '../src/arcade/games/scrolling/render';
import { HAZARDS, hazardBox } from '../src/arcade/games/lagoon-run/course';
import { HAZARD_ART, HAZARD_FRAMES, actorSvgDocument } from '../scripts/art/lagoon-art';
import { decodePng, duckClearance, obstructionProfile, runtimeHazardFiles, type Png } from './helpers/lagoon-baked';
vi.mock('../src/islander/active',async()=>{const {defaultLook}=await import('../src/islander/look');return {useActiveIslanderLook:()=>defaultLook};});
vi.mock('../src/arcade/Sprite',()=>({ArcadeSprite:()=>null}));
vi.mock('react-native',()=>({View:()=>null}));
vi.mock('react-native-reanimated',()=>({default:{createAnimatedComponent:(c:unknown)=>c},useAnimatedProps:()=>({})}));
vi.mock('react-native-svg',()=>({default:'svg',G:'g',Path:'path',Circle:'circle',Ellipse:'ellipse',Rect:'rect',Text:'text'}));
// Conservative Bezier control hull: every point of a quadratic or cubic stays inside it.
// Fail on unsupported commands rather than silently accepting newly authored art.
function pathYs(d:string){
 const tokens=d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/g)!;
 let i=0,cmd='',x=0,y=0,sx=0,sy=0;const ys:number[]=[];
 while(i<tokens.length){
  if(/^[a-zA-Z]$/.test(tokens[i]))cmd=tokens[i++];
  const relative=cmd===cmd.toLowerCase(),op=cmd.toUpperCase();
  if(op==='Z'){x=sx;y=sy;cmd='';continue;}
  const count=op==='M'||op==='L'?2:op==='Q'?4:op==='C'?6:op==='H'||op==='V'?1:0;
  if(!count)throw new Error(`Unsupported SVG command ${cmd}`);
  const n=tokens.slice(i,i+count).map(Number);i+=count;
  if(op==='H'){x=(relative?x:0)+n[0];continue;}
  if(op==='V'){y=(relative?y:0)+n[0];ys.push(y);continue;}
  const originX=relative?x:0,originY=relative?y:0;
  for(let k=1;k<n.length;k+=2)ys.push(originY+n[k]);
  x=originX+n[n.length-2];y=originY+n[n.length-1];
  if(op==='M'){sx=x;sy=y;cmd=relative?'l':'L';}
 }
 return ys;
}
function attr(tag:string,name:string){return tag.match(new RegExp(` ${name}="([^"]+)"`))?.[1];}
function artTop(markup:string){
 let top=Infinity; const offsets=[0];
 for(const match of markup.matchAll(/<\/?(?:g|path|circle|ellipse|rect)\b[^>]*>/g)){
  const tag=match[0];
  if(tag.startsWith('</g')){offsets.pop();continue;}
  if(tag.startsWith('</'))continue;
  const y=offsets[offsets.length-1];
  if(tag.startsWith('<g')){const t=attr(tag,'transform')?.match(/translate\(([-\d.]+) ([-\d.]+)\)/);offsets.push(y+(t?Number(t[2]):0));continue;}
  const op=tag.match(/^<(\w+)/)![1],padding=Math.max(3,Number(attr(tag,'stroke-width')??2))/2;
  const local=op==='path'?Math.min(...pathYs(attr(tag,'d')!)):op==='rect'?Number(attr(tag,'y')):Number(attr(tag,'cy')??0)-Number(attr(tag,op==='circle'?'r':'ry'));
  top=Math.min(top,y+local-padding);
 }
 return top;
}
const manifest=JSON.parse(readFileSync('assets/arcade/lagoon/manifest.json','utf8')) as {assets:Record<string,{width:number;height:number;sha256:string}>};
const files=runtimeHazardFiles(), duckKinds=(Object.keys(HAZARDS) as (keyof typeof HAZARDS)[]).filter(k=>HAZARDS[k]==='duck');
const shipped=(kind:string)=>decodePng(readFileSync(files[kind]));
const hasRsvg=(()=>{try{execFileSync('rsvg-convert',['--version']);return true;}catch{return false;}})();

describe('baked hazard source, output and runtime mapping', ()=>{
 it('every hazard: committed SVG is the bake source, the PNG is the manifest entry, and the runtime maps the kind to it at the same box', ()=>{
  for(const kind of Object.keys(HAZARDS).filter(k=>k!=='canoe'&&k!=='moving-canoe')){
   const art=HAZARD_ART[kind],frame=HAZARD_FRAMES[art.action],box=hazardBox(kind);
   expect({width:frame.width,height:frame.height},kind).toEqual(box);
   expect(readFileSync(`assets/arcade/lagoon/actors/${kind}.svg`,'utf8'),kind).toBe(actorSvgDocument(frame.width,frame.height,frame.vb,art.svg()));
   expect(files[kind],kind).toBe(`assets/arcade/lagoon/actors/${kind}.png`);
   const entry=manifest.assets[`actors/${kind}`];
   expect({width:entry.width,height:entry.height},kind).toEqual(box);
   expect(createHash('sha256').update(readFileSync(files[kind])).digest('hex'),kind).toBe(entry.sha256);
  }
 });
 it.skipIf(!hasRsvg)('rsvg-convert reproduces each shipped duck PNG from its committed SVG', ()=>{
  const dir=mkdtempSync(join(tmpdir(),'lagoon-duck-'));
  try{
   for(const kind of duckKinds){
    const {width,height}=hazardBox(kind),out=join(dir,`${kind}.png`);
    execFileSync('rsvg-convert',['-w',String(Math.ceil(width*4)),'-h',String(Math.ceil(height*4)),'-o',out,`assets/arcade/lagoon/actors/${kind}.svg`]);
    expect(readFileSync(out).equals(readFileSync(files[kind])),kind).toBe(true);
   }
  }finally{rmSync(dir,{recursive:true,force:true});}
 });
});

/** Runner art tops by frame and hat (the 80×132 frame), measured from the real rig markup. */
const tops=new Map<string,number>();
function heroTop(frame:number,hat:(typeof hats)[number]){
 const key=`${frame}:${hat}`;
 if(!tops.has(key))tops.set(key,artTop(renderToStaticMarkup(<RunnerFrameArt frame={frame} look={{...defaultLook,hat}}/>)));
 return tops.get(key)!;
}
/** Smallest clearance over every 120 Hz safe entry/recovery sample, lane, contact depth and hat. */
function certify(kind:keyof typeof HAZARDS,png:Png){
 const profile=obstructionProfile(png,kind),base=createRun(runLevels[0],42),seen=new Set<number>();
 let margin=Infinity;
 for(const lane of [0,1,2]) for(const z of [.97,1,1.03]) for(let sample=0;sample<72;sample++){
  const row={...base.rows[0],z,kind,secondKind:kind,lane,second:-1,third:false,shellLane:lane,surface:'sand' as const,power:'none' as const};
  const state={...base,lane,poseLane:lane,duck:SLIDE_SECONDS-sample/120,elevation:DUCK_MAX_ELEVATION-1e-6,rows:base.rows.map((r,i)=>i?{...r,z:-3}:row)};
  if(!rowSafe(state,row))continue;
  const frame=runnerFrame(state),p=runPoses(state);seen.add(frame);
  for(const hat of hats)margin=Math.min(margin,duckClearance(profile,p[1],p[0],heroTop(frame,hat)));
 }
 expect([...seen].sort()).toEqual([11,12,13]);
 return margin;
}
describe('shipped duck hazards against the drawn runner', ()=>{
 for(const kind of duckKinds)it(`${kind}: the baked PNG clears every safe roll through the full runner transform`,()=>{
  const margin=certify(kind,shipped(kind));console.info('Lagoon duck clearance (camera units)',kind,margin.toFixed(2));
  expect(margin).toBeGreaterThan(1);
 }, 60000);
 it('fails when an obstructed image is swapped in for the net (reviewer probe)',()=>{
  const margin=certify('net',decodePng(readFileSync('assets/arcade/lagoon/actors/wall.png')));console.info('Lagoon duck clearance, wall as net',margin.toFixed(2));
  expect(margin).toBeLessThan(0);
 }, 60000);
 it('fails when the net’s roll-under gap is filled',()=>{
  const net=shipped('net'),filled={...net,rgba:net.rgba.slice()};
  // Paint an opaque band across the middle of the gap (box y 95–105 of 129.6).
  for(let y=Math.floor(net.height*95/129.6);y<Math.ceil(net.height*105/129.6);y++)for(let x=0;x<net.width;x++)filled.rgba[(y*net.width+x)*4+3]=255;
  const margin=certify('net',filled);console.info('Lagoon duck clearance, filled net gap',margin.toFixed(2));
  expect(margin).toBeLessThan(0);
 }, 60000);
});
