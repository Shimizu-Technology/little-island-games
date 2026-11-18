import React from 'react';
import type { MealPlayback } from './character';
/** Playback supplies the native layer; static rig consumers need no animation runtime. */
export function MealLayer({ playback, index, children }: { playback: MealPlayback; index: number; children: React.ReactNode }) {
  return playback.renderLayer(index, children);
}
