import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { RunnerFrameArt, RunnerRig, CharacterPortrait } from '../src/arcade/games/scrolling/CharacterArt';
import { backPoses, runCycleFrames } from '../src/islander/rig/poses';
import { anchorsFor } from '../src/islander/rig/wardrobe';
import { defaultLook, hairStyles, hats, outfits, accessories, skinTones, hairColors, outfitPalettes } from '../src/islander/look';
import * as active from '../src/islander/active';
import { KITE_HANDS, KITE_STRINGS } from '../src/arcade/games/scrolling/runnerAnchors';
import { runPoses, spritePoint } from '../src/arcade/games/scrolling/render';
import { createRun, LANE_SECONDS, runLevels } from '../src/arcade/games/lagoon-run/engine';
import { projectTrack } from '../src/arcade/games/lagoon-run/camera';
import { RUNNER_KINETICS } from '../src/arcade/games/lagoon-run/kinetics';
import { RUN_EXTRA } from '../src/arcade/games/scrolling/character';
const { animatedView, view } = vi.hoisted(() => ({
 animatedView: vi.fn(({ children }: { children: React.ReactNode; style: Record<string, unknown>[] }) => <div>{children}</div>),
 view: vi.fn(({ children }: { children: React.ReactNode; style: { left: number; top: number } }) => <div>{children}</div>),
}));
vi.mock('../src/islander/active',async()=>{const {defaultLook}=await import('../src/islander/look');return {useActiveIslanderLook:()=>defaultLook};});
vi.mock('../src/arcade/Sprite',async(importOriginal)=>{
 const { ArcadeSprite } = await importOriginal<typeof import('../src/arcade/Sprite')>();
 return { ArcadeSprite: (props: React.ComponentProps<typeof ArcadeSprite>) =>
  <div data-sprite={props.index}><ArcadeSprite {...props}/></div> };
});
vi.mock('react-native',()=>({View:view}));
vi.mock('react-native-reanimated',()=>({
 default:{View:animatedView,createAnimatedComponent:(c:unknown)=>c},
 useAnimatedProps:()=>({}),
 useAnimatedStyle:(style:()=>unknown)=>style(),
 useSharedValue:(value:unknown)=>({value,set(next:unknown){this.value=next;}}),
 useAnimatedReaction:(read:()=>unknown,update:(value:unknown)=>void)=>update(read()),
}));
vi.mock('react-native-svg',()=>({default:'svg',G:'g',Path:'path',Circle:'circle',Ellipse:'ellipse',Rect:'rect',Text:'text'}));
describe('Lagoon Run Islander integration',()=>{
 it('renders all 24 static frames for every wardrobe geometry combination',()=>{
  let samples=0,maxPaths=0,maxPrimitives=0,maxStaticTransforms=0;
  const looks=[...hairStyles.map(hairStyle=>({...defaultLook,hairStyle})),...hats.map(hat=>({...defaultLook,hat})),...outfits.map(outfit=>({...defaultLook,outfit,...(outfit==='mix'?{top:'tee' as const,bottom:'shorts' as const}:{})})),...accessories.map(accessory=>({...defaultLook,accessory}))];
  for(const look of looks) for(let frame=0;frame<24;frame++){
   const markup=renderToStaticMarkup(<RunnerFrameArt frame={frame} look={look}/>);
   expect(markup).not.toMatch(/NaN|undefined|Infinity/);
   expect(markup).toContain('viewBox="-6 -6 92 144"');
   expect([...markup.matchAll(/data-limb=/g)]).toHaveLength(4);
   expect([...markup.matchAll(/data-mitten=/g)]).toHaveLength(2);
   expect(markup).not.toContain('#E88D7D'); // rear view has no face
   for(const point of Object.values(anchorsFor(backPoses[frame]))) expect(point.every(Number.isFinite)).toBe(true);
   maxPaths=Math.max(maxPaths,[...markup.matchAll(/<path\b/g)].length);
   maxPrimitives=Math.max(maxPrimitives,[...markup.matchAll(/<(?:path|circle|ellipse|rect)\b/g)].length);
   maxStaticTransforms=Math.max(maxStaticTransforms,[...markup.matchAll(/<g[^>]*transform=/g)].length);
   samples++;
  }
  expect(samples).toBe(looks.length * 24);
  console.info('Run wardrobe vector budget',JSON.stringify({maxPaths,maxPrimitives,maxStaticTransforms,samples}));
  expect(maxPaths).toBeLessThanOrEqual(40);
  expect(maxPrimitives).toBeLessThanOrEqual(65);
 },180000);
 it('renders each color selection across every frame without altering anchors',()=>{
  for(const [key, values] of Object.entries({skinTone:Object.keys(skinTones),hairColor:Object.keys(hairColors),palette:Object.keys(outfitPalettes)})) for(const value of values) for(let frame=0;frame<24;frame++){
   const markup=renderToStaticMarkup(<RunnerFrameArt frame={frame} look={{...defaultLook,[key]:value}}/>);
   expect(markup).not.toMatch(/NaN|undefined|Infinity/);
  }
 },180000);
 it('keeps exactly the existing root and 24 sprite wrappers and indices',()=>{
  const poses={value:[]} as unknown as React.ComponentProps<typeof RunnerRig>['poses'];
  const markup=renderToStaticMarkup(<RunnerRig poses={poses}/>);
  expect([...markup.matchAll(/data-sprite="(\d+)"/g)].map(m=>Number(m[1]))).toEqual([0,...backPoses.map((_,i)=>i<16?80+i:RUN_EXTRA+i-16)]);
  expect([...markup.matchAll(/<svg\b/g)]).toHaveLength(24);
 });
 it('keeps the full runner art viewport inside the Android root through the worst kinetic transforms',()=>{
  const start=createRun(runLevels[0],42);
  for(const direction of [-1,1])for(const hop of [-4,0]){
   const s={...start,lane:1+direction,laneFrom:1,laneTime:LANE_SECONDS/2};
   const poses=runPoses(s);
   // Exercise all extrema together, including combinations stronger than a real jump or landing.
   poses[RUNNER_KINETICS]={...poses[RUNNER_KINETICS],x:1.15,y:1.14,scale:hop};
   animatedView.mockClear();view.mockClear();
   const markup=renderToStaticMarkup(<RunnerRig poses={{value:poses} as React.ComponentProps<typeof RunnerRig>['poses']}/>);
   const [,left,top,width,height]=markup.match(/viewBox="(-?\d+) (-?\d+) (\d+) (\d+)"/)!.map(Number);
   const [root,motion]=animatedView.mock.calls.slice(0,2).map(([{style}])=>Object.assign({},...style));
   const origin=view.mock.calls[0][0].style;
   const [pivotX,pivotY]=motion.transformOrigin;
   const [{translateY},{scaleX},{scaleY}]=motion.transform;
   const angle=parseFloat(root.transform[2].rotate);
   expect(angle).toBeCloseTo(direction*11*Math.PI/180);
   expect(translateY).toBe(hop);expect(scaleX).toBe(1.15);expect(scaleY).toBe(1.14);
   expect(root.left+origin.left).toBe(0);expect(root.top+origin.top).toBe(0);
   expect(root.transformOrigin).toEqual([origin.left+40,origin.top+66,0]);
   expect(motion.width).toBe(root.width);expect(motion.height).toBe(root.height);
   for(const x of [left,left+width])for(const y of [top,top+height]){
    const dx=(origin.left+x-pivotX)*scaleX,dy=(origin.top+y-pivotY)*scaleY+translateY;
    const transformedX=pivotX+dx*Math.cos(angle)-dy*Math.sin(angle);
    const transformedY=pivotY+dx*Math.sin(angle)+dy*Math.cos(angle);
    expect(transformedX).toBeGreaterThan(0);expect(transformedX).toBeLessThan(root.width);
    expect(transformedY).toBeGreaterThan(0);expect(transformedY).toBeLessThan(root.height);
   }
   const foot=spritePoint(poses[0],80,132,40,130),track=projectTrack(s.poseLane,1);
   expect(foot.x).toBeCloseTo(track.x);expect(foot.y).toBeCloseTo(track.y);
  }
 });
 it('uses the active look on both runner and front map/result portraits',()=>{
  const selected={...defaultLook,hairColor:'lagoon' as const,hat:'sunhat' as const,accessory:'backpack' as const};
  const source=vi.spyOn(active,'useActiveIslanderLook').mockReturnValue(selected);
  const poses={value:[]} as unknown as React.ComponentProps<typeof RunnerRig>['poses'];
  expect(renderToStaticMarkup(<RunnerRig poses={poses}/>)).toContain(hairColors.lagoon);
  const idle=renderToStaticMarkup(<CharacterPortrait bat={false} size={120} outfit="starlight"/>);
  const clear=renderToStaticMarkup(<CharacterPortrait bat={false} size={120} outfit="island" happy/>);
  const loss=renderToStaticMarkup(<CharacterPortrait bat={false} size={120} outfit="island" dizzy/>);
  expect(new Set([idle,clear,loss]).size).toBe(3);
  for(const markup of [idle,clear,loss]){expect(markup).toContain('#E88D7D');expect(markup).toContain(hairColors.lagoon);}
  expect(idle).toBe(renderToStaticMarkup(<CharacterPortrait bat={false} size={120} outfit="island"/>));
  source.mockRestore();
 });
 it('swings both long hairstyles through the run cycle',()=>{
  for(const hairStyle of ['ponytail','braids'] as const){
   const hair=runCycleFrames.map(frame=>renderToStaticMarkup(<RunnerFrameArt frame={frame} look={{...defaultLook,hairStyle}}/>).split('data-layer="front-hair"')[1].split('data-layer="face"')[0]);
   // Compare same head height on opposite contacts: hair must still move.
   expect(hair[2]).not.toBe(hair[10]);
  }
 });
 it('attaches both kite strings to the apex hands in contact coordinates',()=>{
  const s={...createRun(runLevels[0],42),kite:1,poseLane:.6,lane:1};
  const p=runPoses(s);
  expect(p[0].angle).toBe(0);
  expect(KITE_STRINGS.match(/M36 72L/g)).toHaveLength(2);
  KITE_HANDS.forEach(([x,y],i)=>{
   const hand=i?backPoses[9].joints.rightHand:backPoses[9].joints.leftHand;
   // Both rigs scale by HERO_SCALE about the same foot, so the drawn string meets the drawn hand.
   const kite=spritePoint(p[172],72,110,x,y),body=spritePoint(p[0],80,132,hand[0],hand[1]);
   expect(kite.x).toBeCloseTo(body.x);
   expect(kite.y).toBeCloseTo(body.y);
  });
 });
});
