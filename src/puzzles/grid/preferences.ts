import { createContext } from 'react';
import { defaults } from '../../cove/local';
export const GridPreferences = createContext(defaults());

export const GridFeedback = createContext<() => void>(() => {});
