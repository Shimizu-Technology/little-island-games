import React from 'react';
import { describe, expect, it } from 'vitest';
import { mkdtempSync, cpSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { defineReplayGame } from '../src/challenge/replay';
import { engine, puzzle, solve, move, type Action } from './helpers/challenge-replay';
import { emptyChallenge, type SaveCatalog } from '../src/state/challenge';
import { challengeTransition, finishChallenge, progressFor } from '../src/state/challengeDrafts';
import { emptySave } from '../src/state/validation';
import { migrateProfiles } from '../src/state/profiles';
import { addLearner } from '../src/learn/learners';
import { completedSignal, rateSignal, resultOffer, defaultComfort } from '../src/challenge/offers';

it('P1-1/P3-7: registry checks an exported source tree with no registrations directory or git history',()=>{
 const dir=mkdtempSync(`${tmpdir()}/f2-registry-`);
 try{cpSync('src',`${dir}/src`,{recursive:true});mkdirSync(`${dir}/scripts`);cpSync('scripts/generate-game-registry.mjs',`${dir}/scripts/generate-game-registry.mjs`);rmSync(`${dir}/src/challenge/registrations`,{recursive:true,force:true});expect(()=>execFileSync('node',['scripts/generate-game-registry.mjs','--check'],{cwd:dir,stdio:'pipe'})).not.toThrow();}finally{rmSync(dir,{recursive:true,force:true});}
});
const makeEntry=(i:number, awards:unknown=puzzle.awards)=>defineReplayGame({game:`proof-${i}`,codec:`proof-${i}-v1`,context:`proof${i}`,cove:true,objectives:['shell'],budget:{wrapper:700,draft:3396,undo:0,audit:0},puzzles:[{...puzzle,ref:{...puzzle.ref,engine:`proof-${i}`,bank:400+i},source:{kind:'endless',bank:400+i,puzzle:0},dares:[],awards:awards as never}],engine,Board:()=> <div/>,controls:{help:()=>({type:'help'} as Action),reset:()=>({type:'reset'} as Action)}});
describe('bounded unfinished slots',()=>{
 it('P1-4: nine independently credited games never occupy paused slots',()=>{
  const entries=Array.from({length:9},(_,i)=>makeEntry(i));const catalog:SaveCatalog={banks:new Map(entries.flatMap(e=>[...e.catalog.banks])),dares:new Map(),codecs:new Map(entries.flatMap(e=>[...e.catalog.codecs])),contexts:new Set(entries.flatMap(e=>[...e.catalog.contexts]))};
  let save=migrateProfiles({...emptySave(),learning:addLearner(undefined,'A','a')});
  for(const [i,e] of entries.entries()){
   const p=progressFor(save,'a')!,s=e.start(e.puzzles[0].ref,'a',`round-${i}`,p,{supportOff:false,ownRead:false},[]);const guard={owner:'a',game:e.game,epoch:1,id:null,revision:null};save=challengeTransition(save,s,guard,1,catalog);expect(progressFor(save,'a')!.paused).toHaveLength(1);
   // Replay the fixture path through this entry's codec.
   const actions=solve({...s,game:'maze-proof',codec:'maze-proof-v1',puzzle:puzzle.ref}).payload as {actions:unknown[]};let terminal=s;for(const a of actions.actions){const before=terminal;terminal=e.move(terminal,a)!;if(!terminal.result)save=challengeTransition(save,terminal,{...guard,id:before.id,revision:before.revision},1,catalog);}
   save=finishChallenge(save,terminal,{...guard,id:s.id,revision:terminal.revision-1},1,catalog);expect(progressFor(save,'a')!.paused).toEqual([]);expect(progressFor(save,'a')!.banks).toHaveLength(i+1);
  }
 });
});
it.each(['pick-up','two-ways','par'] as const)('P2-2: helped and Together award %s respects its named policy',kind=>{
 const rule=kind==='pick-up'?{kind,objective:'shell'}:kind==='par'?{kind,metric:'steps',max:40}:{kind};
 const e=makeEntry(0,[null,{rule,help:'allowed'}]);
 for(const partner of [null,'b']){
  let s=e.start(e.puzzles[0].ref,'a','award', {...emptyChallenge(),solutions:[[400,0,'f'.repeat(64)]]},{supportOff:true,ownRead:true},[]);s={...s,partner};s=e.move(s,{type:'help'})!;
  const actions=(solve(move({...s,game:'maze-proof',codec:'maze-proof-v1',puzzle:puzzle.ref},{type:'read-aloud'})).payload as {actions:unknown[]}).actions.slice(1);
  for(const a of actions)s=e.move(s,a)!;expect(s.result?.awards).toBe(2);
 }
});
it('P1-3: a hard rating steers the next finish once',()=>{
 let p=emptyChallenge();for(let i=0;i<3;i++)p=completedSignal(p,'s0-2',true,true);p=rateSignal(p,'s0-2','hard');p=completedSignal(p,'s0-2',true,true);expect(resultOffer(p.signals[0],defaultComfort,{atPar:false,firstHigher:false,dare:false,harder:true})?.kind).toBe('easier');p=completedSignal(p,'s0-2',true,true);p=completedSignal(p,'s0-2',true,true);expect(p.signals[0][3]).toBeNull();
});
