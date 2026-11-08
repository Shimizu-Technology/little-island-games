import React, { lazy, Suspense } from 'react';
import { defineReplayGame } from '../replay';
import { challengeEngine, type Action, type State } from '../../learn/games/crab-commands/challenge-engine';
import { crabPuzzles } from '../../learn/games/crab-commands/challenge-content';
import type { ChallengeViewProps } from '../types';
export type { Payload, Action, State } from '../../learn/games/crab-commands/challenge-engine';
// Loading the catalog never loads the native renderer, audio players or other School art.
const Board=lazy(()=>import('../../learn/games/crab-commands/challenge-view').then(m=>({default:m.ChallengeBoard})));
export const registration=defineReplayGame({
 game:'crab-commands',codec:'crab-proof-v1',context:'crab',cove:false,
 budget:{wrapper:700,draft:3396,undo:0,audit:0},puzzles:crabPuzzles,engine:challengeEngine,
 Board:(props:ChallengeViewProps<State,Action>)=>React.createElement(Suspense,{fallback:null},React.createElement(Board,props)),
 controls:{help:():Action=>['h'],reset:():Action=>['z']},
});
