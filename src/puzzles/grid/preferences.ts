import { createContext, type ComponentType } from 'react';
import { defaults } from '../../cove/local';
export const GridPreferences = createContext(defaults());

export const GridFeedback = createContext<() => void>(() => {});
/**
 * Optional board feel a host adds (Puzzles rounds do): `Pop` marks a just-placed cell, drawn over it at board
 * coordinates and re-run for each `nonce`; `select` is a selection tick. Without a host a board draws and ticks nothing.
 */
export type GridFeelValue = { Pop: ComponentType<{ left: number; top: number; size: number; nonce: number }>; select: () => void };
export const GridFeel = createContext<GridFeelValue | null>(null);

/** A grid owns the page scroll from touch-down through release/cancel. */
export const GridInteraction = createContext<(held: boolean) => void>(() => {});
export const GridAdult = createContext(false);
