import React, { lazy, Suspense } from 'react';
import { defineReplayGame } from '../replay';
import { challengeEngine, cardCodes, type Action, type State } from '../../learn/games/crab-commands/challenge-engine';
import { crabPuzzles } from '../../learn/games/crab-commands/challenge-content';
import { validChallengeSession } from '../../state/challenge';
import type { ChallengeViewProps } from '../types';
export type { Payload, Action, State } from '../../learn/games/crab-commands/challenge-engine';
// Loading the catalog never loads the native renderer, audio players or other School art.
const Board=lazy(()=>import('../../learn/games/crab-commands/challenge-view').then(m=>({default:m.ChallengeBoard})));
export const registration=defineReplayGame({
 game:'crab-commands',codec:'crab-proof-v1',context:'crab',cove:false,
 budget:{wrapper:700,draft:3396,undo:0,audit:0},puzzles:[...crabPuzzles].sort((a,b)=>a.ref.bank-b.ref.bank||a.ref.puzzle-b.ref.puzzle),engine:challengeEngine,
 planningDaresHideSupport:true,
 prefilledStart:payload=>payload.actions.length<=163&&payload.actions.every(a=>a[0]==='x'&&a[1]===0||a[0]==='a'||a[0]==='h'),
 Board:(props:ChallengeViewProps<State,Action>)=>React.createElement(Suspense,{fallback:null},React.createElement(Board,props)),
 controls:{help:():Action=>['h'],reset:():Action=>['z']},
});

// New attempts preserve the accepted plan. Never compact or mutate the original replay.
registration.puzzles=crabPuzzles;
// Retired Tide 6 progress stays valid even though the easy finish now opens at Tide 1.
registration.catalog.contexts=new Set([...registration.catalog.contexts,'crab-6']);
registration.animatedRuns=true;
registration.restart=(session,id,progress)=>{
 const puzzle=crabPuzzles.find(p=>p.ref.bank===session.puzzle.bank&&p.ref.puzzle===session.puzzle.puzzle);
 if(!puzzle||session.result||!validChallengeSession(session,session.owner,registration.catalog))throw new Error('Invalid Crab attempt.');
 const payload=session.payload as import('../../learn/games/crab-commands/challenge-engine').Payload;
 let state=challengeEngine.create(puzzle.descriptor,payload.initial,payload.options);
 for(const action of payload.actions){const next=challengeEngine.step(state,action,puzzle.descriptor);if(!next)throw new Error('Invalid Crab replay.');state=next.state;}
 let next=registration.start(session.puzzle,session.owner,id,progress,payload.options,session.selectedDares);
 const actions:Action[]=[...puzzle.descriptor.starter.map(()=>['x',0] as Action),...state.program.map(c=>['a',cardCodes.indexOf(c)] as Action),...Array.from({length:state.fullPlanShown?3:state.hints?1:0},()=>['h'] as Action)];
 for(const action of actions){const moved=registration.move(next,action);if(!moved)throw new Error('Plan could not fit a fresh attempt.');next=moved;}
 return {...next,revision:0};
};
