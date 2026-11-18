import React, { type ReactNode } from 'react';
import { Islander } from '../islander/rig/Islander';
import { Pip, RigCrab } from '../islander/rig/Companions';
import type { IslanderLook } from '../islander/look';
import type { CharacterRenderInput, RigLife } from '../islander/rig/character';
import type { Pose } from './model';

export type CharacterRenderer = (input: CharacterRenderInput) => ReactNode;
export type LegacyCharacterRenderer = (slot: 0 | 1 | 2, pose: Pose, reaction?: string, size?: number, held?: ReactNode, reduced?: boolean) => ReactNode;
/** The old screen's reaction vocabulary stops at this boundary. */
export function homeRenderInput(slot: 0 | 1 | 2, base: Pose, reaction: string | undefined, size: number, held?: ReactNode, reduced = false): CharacterRenderInput {
  return { slot, base, action: reaction === 'eat' || reaction === 'drink' || reaction === 'hold' ? reaction : null, face: reaction === 'lie-asleep' && base === 'lie' ? 'sleepy' : reaction === 'eat' || reaction === 'drink' ? 'anticipate' : reaction === 'wave' ? 'happy' : 'neutral', facing: 'right', size, held, tilt: 0, limbLag: 0, reduced };
}
/** Explicit adapter for older embedders; no fragile function-arity detection. */
export function adaptLegacyCharacterRenderer(renderer: LegacyCharacterRenderer): CharacterRenderer {
  return input => renderer(input.slot, input.base === 'carry' ? 'stand' : input.base, input.action ?? (input.face === 'sleepy' && input.base === 'lie' ? 'lie-asleep' : input.face === 'happy' ? 'wave' : undefined), input.size, input.held, input.reduced);
}
/** Canonical renderer for RUNTIME. Size is rig scale: Islander /132, crab /120,
 * Pip /160. Position this SVG at anchor + bounds.left/top times that scale. */
type HomeCharacterProps={ input: CharacterRenderInput; look?: IslanderLook } & RigLife;
function RigCharacter({ input, look, ...life }: HomeCharacterProps) {
  return input.slot === 0 ? <Islander {...input} {...life} look={look}/> : input.slot === 1 ? <Pip {...input} {...life}/> : <RigCrab {...input} {...life}/>;
}
function mealBodySignature({input,look,...life}:HomeCharacterProps){
  const playback=input.mealPlayback!;
  // The built-in rigs use held only to close the fingers/fin. Actual food is
  // painted by MealArt; external renderers still receive every real food frame.
  return JSON.stringify({look,life,input:{...input,held:!!input.held,carryGrip:undefined,
    mealPlayback:playback.frames.map(({held,...frame})=>({...frame,held:!!held}))}});
}
const MealCharacter=React.memo(RigCharacter,(a,b)=>{
  const x=a.input.mealPlayback!,y=b.input.mealPlayback!;
  return x.progress===y.progress && x.renderLayer===y.renderLayer && x.renderMorph===y.renderMorph &&
    a.input.carryGrip===b.input.carryGrip && mealBodySignature(a)===mealBodySignature(b);
});
export function HomeCharacter({input,...props}:HomeCharacterProps){
  // Meal playback owns the expression. Idle notice/gaze changes must not rebuild
  // a hidden prepared rig, or its first visible SVG, at the release boundary.
  return input.mealPlayback
    ? <MealCharacter {...props} blink={false} input={{...input,face:null,gaze:{x:0,y:0}}}/>
    : <RigCharacter {...props} input={input}/>;
}
