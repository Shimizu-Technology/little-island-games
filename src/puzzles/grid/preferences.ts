import { createContext } from 'react';
import { defaults } from '../../cove/local';
export const GridPreferences = createContext(defaults());

export const GridFeedback = createContext<() => void>(() => {});

/** A grid owns the page scroll from touch-down through release/cancel. */
export const GridInteraction = createContext<(held: boolean) => void>(() => {});
export const GridAdult = createContext(false);
