import React from 'react';
import type { MealPlayback, MealPose } from './character';
/** Playback supplies the native layer; static rig consumers need no animation runtime. */
export function MealLayer({ playback, index, children }: { playback: MealPlayback; index: number | readonly number[]; children: React.ReactNode }) {
  return playback.renderLayer(index, children);
}

const banks = new WeakMap<MealPlayback['frames'], Map<string, {frame: MealPose; indices: number[]}[]>>();
/** Equal authored poses share one native group; the original timeline stays intact. */
export function mealGroups(playback: MealPlayback, identity: (frame: MealPose) => string | number) {
  const identities=playback.frames.map(identity), signature=identities.map(k=>`${typeof k}:${k}`).join('|');
  let cached=banks.get(playback.frames);
  if(cached?.has(signature))return cached.get(signature)!;
  const groups = new Map<string | number, { frame: MealPose; indices: number[] }>();
  playback.frames.forEach((frame,index) => {
    const key=identities[index],group=groups.get(key);
    if(group)group.indices.push(index);else groups.set(key,{frame,indices:[index]});
  });
  const result=[...groups.values()];
  if(!cached){cached=new Map();banks.set(playback.frames,cached);}
  cached.set(signature,result);
  return result;
}

/** Native Home can change path data within a mounted limb; static clients keep layers. */
export function MealMorph({playback,children}:{playback:MealPlayback;children:(frame:MealPose)=>React.ReactNode}) {
  const nodes=playback.frames.map(children);
  return playback.renderMorph?.(nodes) ?? <>{nodes.map((node,index)=><MealLayer key={index} playback={playback} index={index}>{node}</MealLayer>)}</>;
}
