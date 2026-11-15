import React, { lazy, Suspense } from 'react';
import { defineReplayGame } from '../replay';
import { challengeEngine, cardCodes, type Action, type Initial, type Payload, type State } from '../../learn/games/crab-commands/challenge-engine';
import { crabPuzzles } from '../../learn/games/crab-commands/challenge-content';
import { validChallengeSession, type ChallengeSession } from '../../state/challenge';
import { jsonBytes } from '../../state/saveBits';
import type { ChallengeViewProps } from '../types';
export type { Payload, Action, State } from '../../learn/games/crab-commands/challenge-engine';
// Loading the catalog never loads the native renderer, audio players or other School art.
const Board=lazy(()=>import('../../learn/games/crab-commands/challenge-view').then(m=>({default:m.ChallengeBoard})));
/** Certified in tests/crab-review-2.test.ts: from the ordinary-edit ceiling, the whole ladder
 * (three Help presses) plus a winning Go and the largest result still fit in 4 KiB. */
export const crabAssistance={bytes:192,actions:4,idempotentHelp:false,isAction:(a:Action)=>a[0]==='h'};
/** Longest compact action (`,["i",79,7]`) plus one revision digit. */
const largestMove=13;
export const registration=defineReplayGame({
 game:'crab-commands',codec:'crab-proof-v1',context:'crab',cove:false,
 budget:{wrapper:700,draft:3396,undo:0,audit:0},puzzles:[...crabPuzzles].sort((a,b)=>a.ref.bank-b.ref.bank||a.ref.puzzle-b.ref.puzzle),engine:challengeEngine,
 planningDaresHideSupport:true,
 // The board owns its Help ladder; each press reveals more, so none is coalesced.
 helpUI:'board',assistance:crabAssistance,
 completionText:(ref,result,facts)=>{
  const p=crabPuzzles.find(p=>p.ref.bank===ref.bank&&p.ref.puzzle===ref.puzzle);
  if(result.event==='together')return 'You guided the crab home together.';
  if(facts?.helpUsed)return 'You used help and guided the crab home.';
  if(facts?.failed)return 'You kept changing your plan until the crab got home.';
  return p?.descriptor.budget!==null&&p?.descriptor.budget!==undefined?'You found a route within the walking steps.':p?.descriptor.starter.length?'You found the bug and fixed it.':'Your plan collected every shell and reached home.';
 },
 prefilledStart:payload=>payload.actions.length<=163&&payload.actions.every(a=>a[0]==='x'&&a[1]===0||a[0]==='a'||a[0]==='h'),
 Board:(props:ChallengeViewProps<State,Action>)=>React.createElement(Suspense,{fallback:null},React.createElement(Board,props)),
 controls:{help:():Action=>['h'],reset:():Action=>['z']},
});

// New attempts preserve the accepted plan. Never compact or mutate the original replay.
registration.puzzles=crabPuzzles;
// Retired Tide 6 progress stays valid even though the easy finish now opens at Tide 1.
registration.catalog.contexts=new Set([...registration.catalog.contexts,'crab-6']);
registration.animatedRuns=true;
registration.dareHelp='Help can show you two steps and still earn a dare mark. A third step, or the whole plan, keeps your finish but earns no dare mark.';
registration.full=(s,action)=>{const payload=s.payload as Payload;const bytes=action?jsonBytes({...s,revision:s.revision+1,payload:{...payload,actions:[...payload.actions,action]}}):jsonBytes(s)+largestMove;return bytes>4096-crabAssistance.bytes||payload.actions.length+1>512-crabAssistance.actions;};
registration.restart=(session,id,progress)=>{
 const puzzle=crabPuzzles.find(p=>p.ref.bank===session.puzzle.bank&&p.ref.puzzle===session.puzzle.puzzle);
 if(!puzzle||session.result||!validChallengeSession(session,session.owner,registration.catalog))throw new Error('Invalid Crab attempt.');
 const payload=session.payload as Payload;
 let state=challengeEngine.create(puzzle.descriptor,payload.initial,payload.options), missed=payload.initial.prior?.failed??false;
 for(const action of payload.actions){const next=challengeEngine.step(state,action,puzzle.descriptor);if(!next)throw new Error('Invalid Crab replay.');if(next.correct===false)missed=true;state=next.state;}
 const help=state.fullPlanShown?3:state.hints?1:0;
 // Carry the evidence, not just the help: runs, misses and hinted steps all continue.
 const prior={runs:Math.min(65535,(payload.initial.prior?.runs??0)+state.runs),failed:missed,steps:Math.min(255,Math.max(0,state.steps-(help?1:0)))};
 const initial:Initial={version:1,...(prior.runs||prior.failed||prior.steps?{prior}:{}),...(state.blockDraft?{draft:state.blockDraft}:{})};
 const started=registration.start(session.puzzle,session.owner,id,progress,payload.options,session.selectedDares.filter(slot=>!puzzle.dares.find(d=>d.slot===slot)?.retired));
 let next:ChallengeSession={...started,payload:{...(started.payload as Payload),initial}};
 const actions:Action[]=[...(state.blockDraft?[]:puzzle.descriptor.starter.map(()=>['x',0] as Action)),...(state.blockDraft?[]:state.program.map(c=>['a',cardCodes.indexOf(c)] as Action)),...Array.from({length:help},()=>['h'] as Action)];
 for(const action of actions){const moved=registration.move(next,action);if(!moved)throw new Error('Plan could not fit a fresh attempt.');next=moved;}
 return {...next,revision:0};
};
