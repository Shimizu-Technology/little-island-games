import {createContext} from 'react';
import type {Terminal} from '../../../state/challenge';
/** Presentation receives the accepted replay result; it never guesses a dare award from the plan. */
export const FinishResult=createContext<Terminal|null>(null);
