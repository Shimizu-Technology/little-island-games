import React from 'react';
import { createHash } from 'node:crypto';
import { defineReplayGame } from '../../src/challenge/replay';
import type { DareRule, ReplayEngine, ReplayPayload } from '../../src/challenge/types';
import { createMaze, mazeDone, mazeMove, mazeRoute, type MazeState } from '../../src/games/maze';
import { defaultOptions } from '../../src/games/types';
import { exactKeys, plain, uint } from '../../src/state/saveBits';
import { emptyChallenge, type ChallengeSession } from '../../src/state/challenge';
export type Action = {type:'move';cell:number}|{type:'check'|'run'|'help'|'read-aloud'|'reset'};
export type State = {board:MazeState;solved:boolean;edits:number};
export type Initial = {seed:number};
export type Descriptor = {seed:number};
export type Payload = ReplayPayload<Initial,Action>;
const makeBoard=(d:Descriptor)=>createMaze(defaultOptions,d.seed);
export const engine:ReplayEngine<Descriptor,Initial,Action,State> = {
  initial:d=>({seed:d.seed}),validInitial:(v,d):v is Initial=>plain(v)&&exactKeys(v,['seed'])&&v.seed===d.seed,
  create:d=>({board:makeBoard(d),solved:false,edits:0}),
  validAction:(v):v is Action=>plain(v) && (v.type==='move'?exactKeys(v,['type','cell'])&&uint(v.cell,24):exactKeys(v,['type'])&&['check','run','help','read-aloud','reset'].includes(v.type as string)),
  step:(s,a,d)=>{
    if(a.type==='move'){const board=mazeMove(s.board,a.cell);return board===s.board?null:{state:{...s,board,edits:s.edits+1},event:'edit'};}
    if(a.type==='reset')return {state:{board:makeBoard(d),solved:false,edits:s.edits+1},event:'reset'};
    if(a.type==='check'||a.type==='run')return {state:{...s,solved:mazeDone(s.board)},event:a.type,correct:mazeDone(s.board)};
    return {state:s,event:a.type as 'help'|'read-aloud'};
  },
  inspect:s=>({solved:s.solved,edits:s.edits,metrics:{steps:s.board.path.length-1},solution:s.solved?createHash('sha256').update(JSON.stringify(s.board.path)).digest('hex'):null,objectives:mazeDone(s.board)?['shell']:[]}),
};
export const rules:DareRule[]=[{kind:'par',metric:'steps',max:40},{kind:'clean'},{kind:'plan',max:1},{kind:'blind'},{kind:'whole'},{kind:'two-ways'},{kind:'pick-up',objective:'shell'},{kind:'own-read'},{kind:'edits',max:40}];
export const puzzle={ref:{bank:400,puzzle:0,engine:'maze-proof',rules:1,hash:'a'.repeat(64)},source:{kind:'endless' as const,bank:400,puzzle:0},path:'endless' as const,tier:1 as const,title:'A test maze',descriptor:{seed:1},dares:rules.map((rule,slot)=>({slot:3000+slot,id:`maze-dare-${slot}`,label:rule.kind,rule,help:['clean','whole','own-read'].includes(rule.kind)?'independent' as const:'allowed' as const})),awards:[{rule:rules[0],help:'independent' as const},{rule:rules[1],help:'independent' as const}] as const,par:{metric:'steps' as const,lower:10,upper:40}};
export const registration=defineReplayGame({game:'maze-proof',codec:'maze-proof-v1',context:'maze',cove:true,budget:{wrapper:700,draft:3396,undo:0,audit:0},puzzles:[puzzle],engine,Board:()=> <div/>,controls:{help:()=>({type:'help'} as Action),reset:()=>({type:'reset'} as Action)}});
export function launch(slots:number[]=rules.map((_,i)=>3000+i).slice(0,3), options={supportOff:true,ownRead:true}, prior:string[]=['f'.repeat(64)]) {
  return registration.start(puzzle.ref,'a','proof-a',{...emptyChallenge(),solutions:prior.map(hash=>[400,0,hash])},options,slots);
}
export function move(s:ChallengeSession,a:Action):ChallengeSession {const next=registration.move(s,a);if(!next)throw new Error(`Invalid test action: ${JSON.stringify(a)}`);return next;}
export function solve(s:ChallengeSession,check:'check'|'run'='check') {
  const board=engine.create(puzzle.descriptor,{seed:1},{supportOff:true,ownRead:true}).board;
  for(const cell of mazeRoute(board).slice(1))s=move(s,{type:'move',cell});
  return move(s,{type:check});
}
