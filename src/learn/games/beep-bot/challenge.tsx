import { jsonBytes } from '../../../state/saveBits';
import { validChallengeSession, type ChallengeSession } from '../../../state/challenge';
import React,{lazy,Suspense} from 'react';
import { defineReplayGame } from '../../../challenge/replay';
import { challengeEngine, type State,type Action,type Payload,type Initial } from './challenge-engine';
import { beepPuzzles } from './challenge-content';
import type { ChallengeViewProps } from '../../../challenge/types';
export type {Payload,Action,State} from './challenge-engine';
const Board=lazy(()=>import('./challenge-view').then(m=>({default:m.ChallengeBoard})));
export const registration=defineReplayGame({game:'beep-bot',codec:'beep-proof-v1',context:'beep',cove:false,budget:{wrapper:700,draft:3396,undo:0,audit:0},puzzles:beepPuzzles,engine:challengeEngine,helpUI:'board',assistance:{bytes:192,actions:4,idempotentHelp:false,isAction:(a:Action)=>a[0]==='h'},Board:(p:ChallengeViewProps<State,Action>)=><Suspense fallback={null}><Board {...p}/></Suspense>,controls:{help:():Action=>['h'],reset:():Action=>['z']},completionText:(_ref,result)=>result.event==='independent'?'Your plan brought Beep to the shell.':'You kept trying and brought Beep to the shell.'});
registration.animatedRuns=true;
registration.dareHelp='Picture dares are optional. Help keeps your finish, without a dare mark.';

registration.full=(s,action)=>{
 const puzzle=beepPuzzles.find(p=>p.ref.bank===s.puzzle.bank&&p.ref.puzzle===s.puzzle.puzzle);
 if(!puzzle?.descriptor.blockEditor)return false;
 const payload=s.payload as Payload;
 return jsonBytes({...s,revision:s.revision+1,payload:{...payload,actions:[...payload.actions,action??['a',0]]}})>4096-192||payload.actions.length+1>512-4;
};
registration.restart=(session,id,progress)=>{
 const puzzle=beepPuzzles.find(p=>p.ref.bank===session.puzzle.bank&&p.ref.puzzle===session.puzzle.puzzle);
 if(!puzzle?.descriptor.blockEditor||session.result||!validChallengeSession(session,session.owner,registration.catalog))throw new Error('Invalid Beep attempt.');
 const payload=session.payload as Payload;
 let state=challengeEngine.create(puzzle.descriptor,payload.initial,payload.options),failed=payload.initial.prior?.failed??false;
 for(const action of payload.actions){const next=challengeEngine.step(state,action,puzzle.descriptor);if(!next)throw new Error('Invalid Beep replay.');if(next.correct===false)failed=true;state=next.state;}
 const prior={runs:Math.min(65535,(payload.initial.prior?.runs??0)+state.runs),failed,edits:Math.min(65535,state.edits),hints:Math.min(65535,state.hints)};
 const initial:Initial={version:1,prior,...(state.blockDraft?{draft:state.blockDraft}:{})};
 const started=registration.start(session.puzzle,session.owner,id,progress,payload.options,session.selectedDares);
 let next:ChallengeSession={...started,payload:{...(started.payload as Payload),initial}};
 if(!state.blockDraft){for(const action of [...puzzle.descriptor.starter.map(()=>['x',0] as Action),...state.program.map(c=>['a',['up','right','down','left','repeat2','repeat3'].indexOf(c)] as Action)]){const moved=registration.move(next,action);if(!moved)throw new Error('Plan could not fit a fresh attempt.');next=moved;}}
 return {...next,revision:0};
};
