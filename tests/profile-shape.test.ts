import { describe, expect, it } from 'vitest';
import { emptySave, parseSave, withinSaveLimit, MAX_SAVE_BYTES } from '../src/state/validation';
import { migrateProfiles, encodeSave, syncProfile, projectProfile, assignEarlier, pendingAssignments, validProfiles } from '../src/state/profiles';
import { addLearner, selectLearner, recordLearning, activeLearner, readyForNext } from '../src/learn/learners';
import { startSession, finished } from '../src/learn/session';
import { creditSchool, backfillSchool, validSchool, independentRound, roundStars } from '../src/learn/schoolProgress';
import { recordLevelRound } from '../src/learn/levelEvidence';
import { finishMathRound } from './helpers/shell-rounds';
import { shellMove, type ShellRound } from '../src/learn/games/shell-math/round2';
import { createGame, gameIds } from '../src/games';
import { defaultOptions } from '../src/games/types';
import { migrateLibrary, libraryChild, newLibraryChild } from '../src/library/state';
import type { Save } from '../src/state/validation';
import fixture25 from './fixtures/profile-2.5.json';
const learning = () => selectLearner(addLearner(addLearner(undefined,'A','a'),'B','b'),'a');
function complete(round: ReturnType<typeof startSession>) {
  const s=finishMathRound(round.state);
  return {...round,revision:round.revision+1,state:s};
}
it('migrates known owners immutably, buckets unknowns, never infers ownership from active/name',()=>{
  const a={...startSession('shell-math',{options:{mode:'solo',pace:'hard'}},{},1),learner:'a'}, family=startSession('number-hop',{options:{mode:'solo',pace:'easy'}},{},2);
  const tic=createGame('tic-tac-toe',defaultOptions),maze=createGame('maze',defaultOptions);
  const old:Save={...emptySave(),learning:learning(),learn:{'shell-math':a,'number-hop':family},sessions:{'tic-tac-toe':tic,maze},roundOwners:{version:1,rounds:{'classic:tic-tac-toe':{round:tic.id,owner:'b'},'classic:maze':{round:'not-matching',owner:'a'}}}};
  const raw=JSON.stringify(old),next=migrateProfiles(old);
  expect(JSON.stringify(old)).toBe(raw);expect(next.profiles?.people.a.learn?.['shell-math']).toEqual(a);expect(next.profiles?.people.family.learn?.['number-hop']).toEqual(family);expect(next.profiles?.people.b.sessions['tic-tac-toe']).toEqual(tic);expect(next.profiles?.unassigned.rounds.sessions.maze).toEqual(maze);expect(next.profiles?.people.a.sessions.maze).toBeUndefined();expect(validProfiles(next.profiles,learning())).toBe(true);
  expect(migrateProfiles(next)).toEqual(next);expect(parseSave(encodeSave(next))).toEqual(next);
});
it('rejects partial, unknown-version, cross-owner and invalid nested profile input through normal recovery parser',()=>{
  const next=migrateProfiles({...emptySave(),learning:learning()}),raw=JSON.parse(encodeSave(next));
  for(const alter of [(v:typeof raw)=>{delete v.profiles;},(v:typeof raw)=>{v.version=1;},(v:typeof raw)=>{v.profiles.version=3;},(v:typeof raw)=>{delete v.profiles.people.b;},(v:typeof raw)=>{v.profiles.people.a.sessions.maze={game:'maze'};},(v:typeof raw)=>{v.profiles.unassigned.rounds=null;},(v:typeof raw)=>{v.profiles.people.a.learn={'shell-math':{...startSession('shell-math',{options:{mode:'solo',pace:'easy'}},{},2),learner:'b'}};},(v:typeof raw)=>{v.profiles.people.extra={sessions:{},recent:null};}]) {
    const bad=structuredClone(raw);alter(bad);expect(()=>parseSave(JSON.stringify(bad))).toThrow(/original has been kept/);
  }
});
it('School stars use completed independent work; never choice, warm-up totals or time',()=>{
  const round={...startSession('shell-math',{options:{mode:'solo',pace:'easy'}},{},7),learner:'a'},done=complete(round);expect(finished(done)).toBe(true);
  let progress=creditSchool({}, {...done,levelHelped:true},100);expect(progress['shell-math']?.[1]?.stars).toBe(1);
  const clean={...done,id:'clean-1'};progress=creditSchool(progress,clean,100);expect(progress['shell-math']?.[1]?.stars).toBe(2);
  progress=creditSchool(progress,{...clean,id:'same-day'},100);expect(progress['shell-math']?.[1]?.stars).toBe(2);
  progress=creditSchool(progress,{...clean,id:'another-day'},101);expect(progress['shell-math']?.[1]?.stars).toBe(3);expect(validSchool(progress)).toBe(true);expect(creditSchool(progress,{...clean,id:'another-day'},102)).toBe(progress);
  const p=activeLearner(learning());p.choices['shell-math']={mode:'solo',pace:'hard'};let l=recordLearning({active:'a',people:[{...p,id:'family',name:'Family'},p]},'a','shell-math','easy','think.level-round','warmup-complete','old-warmup',false,1);l=recordLearning(l,'a','shell-math','easy','think.level-round','warmup-complete','old-warmup-2',false,2);expect(readyForNext(activeLearner(l),'shell-math','easy')).toBe(false);expect(backfillSchool(activeLearner(l),{})).toEqual({});
  const before={...emptySave(),learning:learning(),learn:{'shell-math':round}},after={...before,learn:{'shell-math':{...done,levelHelped:true}}};expect(recordLevelRound(before,after,'shell-math',100).school?.['shell-math']?.[1]?.stars).toBe(1);
  const legacyBefore={...before,learn:{'shell-math':{...round,levelHelped:undefined}}};expect(recordLevelRound(legacyBefore,{...before,learn:{'shell-math':done}},'shell-math',100).school?.['shell-math']?.[1]?.stars).toBe(1);
});
it('older aggregate notes cannot invent independent stars or third-star dates; exact completed notes backfill only provable evidence',()=>{
  let l=learning();l=recordLearning(l,'a','shell-math','hard','think.level-round','completed-round','real',false,10);l=recordLearning(l,'a','shell-math','hard','think.level-round','warmup-complete','warmup',false,11);
  const progress=backfillSchool(activeLearner(l),{});expect(progress['shell-math']?.[3]).toMatchObject({stars:2,completed:1,independent:1,days:[],rounds:['real']});
  l=recordLearning(l,'a','shell-math','hard','think.level-round','warmup-complete','helped-warmup',true,12);expect(backfillSchool(activeLearner(l),{})['shell-math']?.[3]?.stars).toBe(1);
});
it('explicit assignment refuses to replace a newer round, preserves exact input and never assigns twice',()=>{
  const r=startSession('shell-math',{options:{mode:'solo',pace:'easy'}},{},5);let next=migrateProfiles(migrateLibrary({...emptySave(),learning:learning(),learn:{'shell-math':r}}));
  next=syncProfile({...next,learn:{'shell-math':{...r,id:'new-a',learner:'a'}}});const raw=encodeSave(next);expect(assignEarlier(next,'learn:shell-math','a')).toBe(next);expect(encodeSave(next)).toBe(raw);
  next=assignEarlier(next,'learn:shell-math','b');expect(next.profiles?.people.b.learn?.['shell-math']?.learner).toBe('b');expect(next.profiles?.people.family.learn?.['shell-math']).toBeUndefined();expect(pendingAssignments(next)).toEqual([]);expect(assignEarlier(next,'learn:shell-math','a')).toBe(next);expect(parseSave(encodeSave(next))).toEqual(next);
});
it('already migrated Library v2 is never overwritten when old archived discoveries are assigned',()=>{
  const old=parseSave(JSON.stringify(fixture25));let next=migrateProfiles(migrateLibrary(old));const b={...libraryChild(next.library,'b'),saved:['sun'],query:'B newer search',bookPages:{book:4}};next={...next,library:{...next.library!,profiles:{...next.library!.profiles,b}}};const before=structuredClone(b);next=assignEarlier(next,'explore','b');expect(libraryChild(next.library,'b')).toMatchObject({...before,saved:['sun','moon']});expect(next.library?.archive).toEqual(migrateLibrary(old).library.archive);
});
it('five profiles keep independent canonical rounds inside the 2 MB budget without an active-view duplicate',()=>{
  let l=addLearner(addLearner(learning(),'C','c'),'D','d'),save=migrateProfiles({...emptySave(),learning:l});
  for(const p of l.people){save=projectProfile(save,selectLearner(l,p.id));for(const game of gameIds)save={...save,sessions:{...save.sessions,[game]:{...createGame(game,defaultOptions),id:`${p.id}-${game}`}}};save=syncProfile(save);l=save.learning!;}
  const raw=encodeSave(save),encoded=JSON.parse(raw);expect(encoded.sessions).toEqual({});expect(Object.keys(encoded.profiles.people)).toHaveLength(5);expect(raw.length).toBeLessThan(MAX_SAVE_BYTES);expect(withinSaveLimit(raw)).toBe(true);expect(parseSave(raw)).toEqual(projectProfile(save));expect(()=>parseSave(' '.repeat(MAX_SAVE_BYTES+1))).toThrow(/too large/);
});

it('assignment moves the latest Family revision of unowned work instead of reverting to its older recovery copy',()=>{
  const round=startSession('shell-math',{options:{mode:'solo',pace:'easy'}},{},71);
  let save=migrateLibrary(migrateProfiles({...emptySave(),learning:learning(),learn:{'shell-math':round}}));
  const later={...round,revision:(round.revision??0)+1};
  save=syncProfile({...projectProfile(save,selectLearner(save.learning,'family')),learn:{'shell-math':later}}) as typeof save;
  expect(save.profiles!.unassigned.rounds.learn!['shell-math']!.revision).toBe(round.revision);
  const assigned=assignEarlier(save,'learn:shell-math','b');
  expect(assigned.profiles!.people.b.learn!['shell-math']).toEqual({...later,learner:'b'});
  expect(assigned.profiles!.people.family.learn!['shell-math']).toBeUndefined();
  expect(parseSave(encodeSave(assigned))).toEqual(assigned);
});

it('legacy unknown assistance stays unknown through ordinary saves and cannot earn independent level stars',async()=>{
  const { applyLearnSave }=await import('../src/state/learnAction');
  const original={...startSession('shell-math',{options:{mode:'solo',pace:'easy'}},{},91),learner:'a',levelHelped:undefined};
  const before={...emptySave(),learning:learning(),learn:{'shell-math':original}};
  const step={...original,revision:1,levelHelped:false,state:shellMove(original.state as ShellRound,['c'])};
  const middle=applyLearnSave(before,'shell-math',step,{id:original.id,revision:0,epoch:1},1);
  expect(middle.learn!['shell-math']!.levelHelped).toBeUndefined();
  const done={...complete(middle.learn!['shell-math']!),levelHelped:false};
  const after=applyLearnSave(middle,'shell-math',done,{id:original.id,revision:1,epoch:1},1);
  expect(after.learn!['shell-math']!.levelHelped).toBeUndefined();
  const recorded=recordLevelRound(middle,after,'shell-math',100);
  expect(recorded.school?.['shell-math']?.[1]?.stars).toBe(1);
  expect(readyForNext(activeLearner(recorded.learning),'shell-math','easy')).toBe(false);
});

describe('review fixes: earlier work and School stars', () => {
  const fresh = () => startSession('shell-math', { options: { mode: 'solo', pace: 'easy' } }, {}, 1);
  const upgraded = (round: ReturnType<typeof fresh>) => migrateProfiles(parseSave(JSON.stringify({ version: 1, settings: { sound: true, help: true }, sessions: {}, recent: null, learn: { 'shell-math': round }, learning: { active: 'family', people: [{ ...activeLearner(learning()), id: 'family', name: 'Family' }, { ...activeLearner(learning()), id: 'a', name: 'A' }] } })));
  it('offers an old round only while Family still has it unfinished', () => {
    const round = fresh(), save = upgraded(round);
    expect(pendingAssignments(save).map(r => r.key)).toContain('learn:shell-math');
    const replaced = syncProfile({ ...save, learn: { 'shell-math': { ...round, id: 'newer' } } });
    expect(pendingAssignments(replaced).map(r => r.key)).not.toContain('learn:shell-math');
    expect(assignEarlier(replaced, 'learn:shell-math', 'a')).toBe(replaced);
  });
  it('stops offering a round Family has finished, so School never credits it twice', () => {
    const round = fresh(), save = upgraded(round), done = syncProfile({ ...save, learn: { 'shell-math': complete(round) } });
    expect(pendingAssignments(done).map(r => r.key)).not.toContain('learn:shell-math');
    expect(assignEarlier(done, 'learn:shell-math', 'a')).toBe(done);
  });
  it('restores old discoveries newest first, with their shelf and filter', () => {
    const places = { sun: { kind: 'topic', id: 'sun' }, moon: { kind: 'topic', id: 'moon' }, rain: { kind: 'topic', id: 'rain' } };
    const base = migrateLibrary(upgraded(fresh())), child = newLibraryChild();
    const explore = { favorites: ['moon'], progress: { version: 1, location: { kind: 'world', world: 'space' }, history: [places.sun, places.rain], query: 'old', onlyFavorites: true, labs: child.labs, positions: {} } };
    const save = { ...base, profiles: { ...base.profiles!, unassigned: { ...base.profiles!.unassigned, explore, exploreUntouched: ['a'] } } } as typeof base;
    const a = libraryChild(assignEarlier(save, 'explore', 'a').library, 'a');
    expect(a.recent).toEqual(['rain', 'sun']);
    expect(a).toMatchObject({ category: 'space', onlyFavorites: true, query: 'old', saved: ['moon'] });
  });
  it("keeps Continue on the known owner's round, and leaves unowned pointers for a grown-up", () => {
    const owned = { ...fresh(), learner: 'a' }, base = upgraded(fresh());
    const save = migrateProfiles(parseSave(JSON.stringify({ version: 1, settings: { sound: true, help: true }, sessions: {}, recent: null, recentLearn: 'shell-math', learn: { 'shell-math': owned }, learning: base.learning })));
    expect(save.profiles?.people.a.recentLearn).toBe('shell-math');
    expect(save.profiles?.people.family.recentLearn).toBeUndefined();
    const unowned = migrateProfiles(parseSave(JSON.stringify({ version: 1, settings: { sound: true, help: true }, sessions: {}, recent: null, recentLearn: 'shell-math', learn: { 'shell-math': fresh() }, learning: base.learning })));
    expect(unowned.profiles?.people.a.recentLearn).toBeUndefined();
    expect(unowned.profiles?.unassigned.preferences?.recentLearn).toBe('shell-math');
  });
  it('sets an item aside without touching Family work', () => {
    const save = upgraded(fresh()), next = assignEarlier(save, 'learn:shell-math', null);
    expect(pendingAssignments(next).map(r => r.key)).not.toContain('learn:shell-math');
    expect(next.profiles?.people.family.learn?.['shell-math']?.id).toBe(save.learn?.['shell-math']?.id);
  });
  it('never counts Family practice as independent work, and keeps few round ids', () => {
    const round = { ...fresh(), levelHelped: false };
    expect(independentRound(round)).toBe(false);
    expect(independentRound({ ...round, learner: 'a' })).toBe(true);
    expect(roundStars(round, 3)).toBe(1);
    expect(roundStars({ ...round, learner: 'a' }, 3)).toBe(3);
  });
});
