import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { validChallengeSession, emptyChallenge, creditProgress, mergeProgressFacts } from '../src/state/challenge';
import { completedSignal, dismissSignal, rateSignal, ratingDue, resultOffer, defaultComfort } from '../src/challenge/offers';
import { challengeEntries } from '../src/challenge/registry.generated';
import { registeredDestinations, bridgeFor } from '../src/learn/destinations';
import { shelfGames } from '../src/learn/home';
import { learnIds } from '../src/learn/types';
import { rules, launch, solve, move, puzzle, registration, type Payload } from './helpers/challenge-replay';
import { allLevelIds, arcadeIds } from '../src/arcade/types';
import { arcadeTransition, arcadeLearner, emptyGameProgress, endlessOpen, levelOpen, validArcade } from '../src/arcade/progress';
import { terminalBelongs, validTerminalResult } from '../src/arcade/terminal';
import { emptySave, learningComfort, parseSave } from '../src/state/validation';
import { familyLearners, addLearner } from '../src/learn/learners';
import { encodeSave, migrateProfiles } from '../src/state/profiles';
import { finishChallenge, challengeTransition } from '../src/state/challengeDrafts';
import { catalogManifest } from '../src/state/catalogManifest';
import { registerSaveContent } from '../src/state/challenge';

describe('replay evidence, never caller results',()=>{
  it.each(rules.map((rule,i)=>[rule.kind,i] as const))('%s earns only its registered evidence',(_kind,i)=>{
    const s=solve(launch([3000+i]));expect(validChallengeSession(s,'a',registration.catalog)).toBe(true);expect(s.result?.dares).toEqual([3000+i]);
    const forged={...s,result:{...s.result!,dares:[3000+(i+1)%9]}};expect(validChallengeSession(forged,'a',registration.catalog)).toBe(false);
  });
  it('keeps failed runs, help, checks and resets across edits, reload and reset',()=>{
    let s=move(launch([3001,3002,3004]),{type:'check'});s=move(s,{type:'help'});s=move(s,{type:'reset'});
    s=solve(JSON.parse(JSON.stringify(s)));expect(s.result).toMatchObject({event:'helped',dares:[],awards:0});
    const erased={...s,payload:{...s.payload as Payload,actions:(s.payload as Payload).actions.slice(3)}};
    expect(registration.catalog.codecs.get('maze-proof-v1')!.extends(s,erased)).toBe(false);
  });
  it('launch support and first solutions cannot be changed or borrowed after play',()=>{
    const s=launch([3003,3005,3007]);const q=move(s,{type:'read-aloud'});
    expect(solve(q).result?.dares).toEqual([3003,3005]);
    expect(solve(launch([3003],{supportOff:false,ownRead:true})).result?.dares).toEqual([]);
    const first=solve(launch([3005]));expect(solve(launch([3005],undefined,[first.result!.solution!])).result?.dares).toEqual([]);
    const changed={...q,payload:{...q.payload as Payload,options:{supportOff:false,ownRead:false}}};
    expect(registration.catalog.codecs.get('maze-proof-v1')!.extends(q,changed)).toBe(false);
  });
  it('rejects illegal, no-op, unknown, sparse, oversized and forged payloads',()=>{
    const s=launch();expect(registration.move(s,{type:'move',cell:0})).toBeNull();expect(registration.move(s,{type:'award',value:true})).toBeNull();
    for(const payload of [{...s.payload as Payload,awards:3},{...s.payload as Payload,initial:{seed:2}},{...s.payload as Payload,actions:Array(2)},{...s.payload as Payload,actions:Array(513).fill({type:'help'})}])expect(validChallengeSession({...s,payload},'a',registration.catalog)).toBe(false);
    expect(registration.move(solve(s),{type:'help'})).toBeNull();
  });
  it('Together cannot earn clean, whole or own-read; permanent facts and marks never regress',()=>{
    const s=launch([3001,3004,3007]), together=solve({...s,partner:'b'});expect(together.result?.dares).toEqual([]);expect(together.result?.event).toBe('together');
    const win=solve(launch([3000])), p=creditProgress(emptyChallenge(),puzzle.ref,win.result!,registration.catalog);
    const helped=creditProgress(p,puzzle.ref,{event:'helped',awards:0,dares:[],cost:null,solution:null},registration.catalog);
    expect(helped.banks).toEqual(p.banks);expect(helped.dares).toBe(p.dares);expect(mergeProgressFacts(p,helped,registration.catalog).banks).toEqual(p.banks);
  });
  it('uses the frozen Store transition contract for start, terminal, credit and duplicate rejection',()=>{
    registerSaveContent(registration.catalog,catalogManifest(registration.catalog));
    let save=migrateProfiles({...emptySave(),learning:addLearner(familyLearners(),'A','a')});
    const s=launch([3000]);const expected={owner:'a',game:s.game,epoch:1,id:null,revision:null};
    save=challengeTransition(save,s,expected,1,registration.catalog);expect(save.challenge?.paused[0]).toEqual(s);
    let current=s;
    const solved=solve(s), actions=(solved.payload as Payload).actions;
    for(const action of actions){const next=move(current,action), guard={...expected,id:current.id,revision:current.revision};save=next.result?finishChallenge(save,next,guard,1,registration.catalog):challengeTransition(save,next,guard,1,registration.catalog);current=next;}
    expect(save.challenge?.paused[0].credited).toBe(true);expect(finishChallenge(save,current,{...expected,id:current.id,revision:current.revision},1,registration.catalog)).toBe(save);
    expect(parseSave(encodeSave(save)).profiles?.people.a.challenge).toEqual(save.challenge);
  });
});

describe('bounded invitations, no speed/day inference',()=>{
  it('offers from two clean finishes, a clean first higher go, and helped rounds',()=>{
    let p=completedSignal(emptyChallenge(),'s0-1',true,true);const facts={atPar:false,firstHigher:false,dare:false,harder:true};
    expect(resultOffer(p.signals[0],defaultComfort,facts)).toBeNull();
    p=completedSignal(p,'s0-1',true,true);expect(resultOffer(p.signals[0],defaultComfort,facts)?.kind).toBe('harder');
    expect(resultOffer(p.signals[0],defaultComfort,{...facts,atPar:true,dare:true})?.kind).toBe('dare');
    expect(resultOffer(completedSignal(emptyChallenge(),'s0-1',true,true).signals[0],defaultComfort,{...facts,firstHigher:true})?.kind).toBe('harder');
    for(let i=0;i<3;i++)p=completedSignal(p,'s0-1',false,true);expect(resultOffer(p.signals[0],defaultComfort,facts)?.kind).toBe('easier');
  });
  it('asks at most every third completion; rating overrides the next invitation and dismissal survives reload',()=>{
    let p=emptyChallenge();for(let i=1;i<=9;i++){p=completedSignal(p,'s0-1',true,true);expect(ratingDue(p,'s0-1')).toBe(i%3===0);}
    p=rateSignal(p,'s0-1','hard');expect(resultOffer(p.signals[0],defaultComfort,{atPar:false,firstHigher:false,dare:true,harder:true})?.kind).toBe('easier');
    p=dismissSignal(p,'s0-1');expect(resultOffer(JSON.parse(JSON.stringify(p)).signals[0],defaultComfort,{atPar:true,firstHigher:true,dare:true,harder:true})).toBeNull();
    expect(completedSignal(p,'s0-1',true,true,false,false).signals[0][4]).toBe(true);
    expect(completedSignal(p,'s0-1',true,true).signals[0][4]).toBe(false);
  });
  it('never uses Family/cooperative outcomes, protects marks while bounding signals, and honors comfort switches',()=>{
    const p=emptyChallenge();expect(completedSignal(p,'s0-1',true,false)).toBe(p);
    let q=p;for(let i=0;i<40;i++)q=completedSignal(q,`s${i}-1`,true,true);expect(q.signals).toHaveLength(32);expect(q.signals[0][0]).toBe('s8-1');expect(q.banks).toBe(p.banks);expect(q.dares).toBe(p.dares);
    const facts={atPar:true,firstHigher:true,dare:true,harder:true};for(const comfort of [{...defaultComfort,offers:false},{...defaultComfort,youngChild:true}])expect(resultOffer(q.signals[0],comfort,facts)).toBeNull();
    expect(readFileSync('src/challenge/offers.ts','utf8')).not.toMatch(/Date|performance|duration|dayNumber/);
  });
});

describe('registrations and D1',()=>{
  it('has no unfinished game or Challenge tab, and every registered game has a shelf and real route in <=3 taps',()=>{
    expect(challengeEntries.map(e=>e.game)).toEqual(JSON.parse(readFileSync('src/challenge/registered-ids.json','utf8')));expect(learnIds).toEqual(JSON.parse(readFileSync('src/learn/registered-ids.json','utf8')));
    const ids=shelfGames.map(g=>g.id);expect(new Set(ids).size).toBe(ids.length);
    expect(registeredDestinations.map(d=>d.id).sort()).toEqual([...ids].sort());
    for(const d of registeredDestinations){expect(d.taps).toBeLessThanOrEqual(3);expect(existsSync(`src/app${d.route.pathname}.tsx`)).toBe(true);expect(shelfGames.find(g=>g.id===d.id)).toBeDefined();}
    expect(bridgeFor('beep-bot',5,false)?.route).toEqual({pathname:'/learn',params:{game:'crab-commands'}});expect(bridgeFor('beep-bot',4,false)).toBeNull();expect(bridgeFor('letter-lagoon',1,false)?.route).toEqual({pathname:'/learn',params:{game:'sound-boat'}});expect(bridgeFor('logic-lagoon',1,false)).toBeNull();expect(bridgeFor('logic-lagoon',1,true)?.route.pathname).toBe('/cove');
  });
  it('the generated registry is current and has no untyped adapters',()=>{
    expect(()=>execFileSync('node',['scripts/generate-game-registry.mjs','--check'])).not.toThrow();
    expect(readFileSync('src/challenge/replay.tsx','utf8')+readFileSync('src/challenge/types.ts','utf8')).not.toMatch(/\bany\b/);
  });
  it('opens every Arcade level and Endless with zero stars, accepting valid high-world finishes',()=>{
    for(const game of arcadeIds){expect(endlessOpen(emptyGameProgress())).toBe(true);for(const level of allLevelIds){expect(levelOpen(emptyGameProgress(),level)).toBe(true);const a=arcadeTransition(undefined,'family',{type:'finish',game,level,stars:3,score:100,round:`${game}-${level}`,name:'Family'});expect(arcadeLearner(a).games[game]?.stars[level]).toBe(3);expect(validArcade(a)).toBe(true);}}
    expect(levelOpen(emptyGameProgress(),'w6-9')).toBe(false);
  });
  it('rejects malformed terminal results and callbacks from another round',()=>{
    const result={cleared:true,stars:3,score:10,detail:'Home'};expect(terminalBelongs('r','r',result)).toBe(true);expect(terminalBelongs('new','old',result)).toBe(false);
    for(const patch of [{score:NaN},{stars:4},{score:-1},{cleared:false},{outcome:'stopped'},{stars:0}])expect(validTerminalResult({...result,...patch})).toBe(false);
  });
  it('round-trips per-learner grown-up choices, rejects malformed policy and keeps stars unchanged',()=>{
    const save=migrateProfiles({...emptySave(),learning:addLearner(undefined,'A','a')});save.settings.learningComfort={a:{offers:false,youngChild:true,opening:4}};
    expect(learningComfort(parseSave(encodeSave(save)),'a')).toEqual({offers:false,youngChild:true,opening:4});expect(learningComfort(save,'family')).toEqual(defaultComfort);
    expect(()=>parseSave(encodeSave({...save,settings:{...save.settings,learningComfort:{a:{...defaultComfort,opening:6 as 1}}}}))).toThrow();expect(save.school).toEqual({});
  });
});
