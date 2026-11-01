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
export function HomeCharacter({ input, look, ...life }: { input: CharacterRenderInput; look?: IslanderLook } & RigLife) {
  return input.slot === 0 ? <Islander {...input} {...life} look={look}/> : input.slot === 1 ? <Pip {...input} {...life}/> : <RigCrab {...input} {...life}/>;
}
