import { createContext, useContext } from 'react';
import { stageLayout, type StageLayout } from './camera';
/** The arena's measured stage; presentation only. Engine state and contact projection never read it. */
export const StageContext = createContext<StageLayout>(stageLayout(390, 660));
export function useStage() { return useContext(StageContext); }
