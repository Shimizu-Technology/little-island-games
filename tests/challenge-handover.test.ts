import { expect, it } from 'vitest';
import { engines } from '../src/learn/engines';
import type { LearnEngine, LearnId } from '../src/learn/types';
import { createGrowth, growthMove, growthProgress, growthQuestions, isGrowth, withGrowth } from '../src/learn/growth/engine';
import { optionsAtLevel } from '../src/learn/levels';
import { independentRound } from '../src/learn/schoolProgress';
import { validLearnSession } from '../src/learn/session';
import { random } from '../src/games/types';
const boardGames:LearnId[]=['crab-commands','number-hop','shell-math','reef-race','island-market','tide-pool','float-sink','sound-boat','which-one','turtle-tales','quick-practice','hafa-adai'];
it.each(boardGames)('%s: paused Level 4/5 board survives a new native-stage implementation, without flipping ownLevels',game=>{
  const before=engines[game];expect(before.ownLevels).not.toBe(true);
  for(const level of [4,5] as const){
    const options=optionsAtLevel({mode:'solo',pace:'easy'},level),ctx={skills:{},rng:random(41),starter:0 as const,today:1};
    let state=createGrowth(game,options,ctx);const raw=JSON.stringify(state);
    // This stands in for the game's later replacement; it must not need to understand archived board data.
    const replacement:LearnEngine<unknown>={...before,nativeStages:true,create:()=>({type:'native-board'}),validate:(v):v is unknown=>!!v&&typeof v==='object'&&(v as {type?:string}).type==='native-board',outcome:()=>null};
    const dispatch=withGrowth(replacement);
    expect(dispatch.create(options,ctx)).toEqual({type:'native-board'});expect(dispatch.validate(state,options)).toBe(true);expect(dispatch.outcome(state,options)).toBeNull();
    expect(isGrowth(JSON.parse(raw))).toBe(true);expect(JSON.stringify(state)).toBe(raw);
    let qs=growthQuestions(game,options,state);
    while(growthProgress(state,qs).index<state.ids.length){const p=growthProgress(state,qs);state=growthMove(state,{type:'answer',value:qs[p.index].answer},qs);state=growthMove(state,{type:'next'},qs);qs=growthQuestions(game,options,state);}
    expect(dispatch.outcome(state,options)).toBe('done');
    const round={version:1 as const,game,id:`saved-${game}`,revision:5,learner:'a',levelHelped:false,options,state};expect(validLearnSession(round)).toBe(true);expect(independentRound(round)).toBe(true);
  }
});
it('no caller can cast native state onto a board-only stage',()=>{
  const game='crab-commands',o=optionsAtLevel({mode:'solo',pace:'easy'},4),base=engines[game];
  expect(base.validate({type:'native-board'},o)).toBe(false);
});
