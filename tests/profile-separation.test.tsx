/** Regression acceptance derived from the 77a82ff8 profile audit. Synthetic fixtures only. */
import React, { createContext, useLayoutEffect } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { beforeEach, afterEach, afterAll, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import fixture25 from './fixtures/profile-2.5.json';
import { encodeSave, pendingAssignments } from '../src/state/profiles';
import { StoreProvider, useStore } from '../src/state/Store';
import { emptySave, parseSave, type Save } from '../src/state/validation';
import { addLearner, familyLearners, selectLearner, activeLearner, readyForNext, learnerPractice } from '../src/learn/learners';
import { startSession, validLearnSession } from '../src/learn/session';
import { learnIds, type LearnId, type LearnSession } from '../src/learn/types';
import { engines as learnEngines } from '../src/learn/engines';
import { optionsAtLevel } from '../src/learn/levels';
import { shelfLevel, homeContinue, dailySuggestions } from '../src/learn/home';
import { recordLevelRound } from '../src/learn/levelEvidence';
import { mathMove, questionOf, type MathRound } from '../src/learn/games/shell-math/round';
import { mathAnswer } from '../src/math/questions';
import { personFor, withoutLearner, type Person } from '../src/personalization/model';
import { badgesFor, grantsFor } from '../src/badges/engine';
import { gameIds, createGame } from '../src/games';
import { defaultOptions } from '../src/games/types';
import { createTic, ticMove } from '../src/games/tic';
import { createMemory, flipCard, memoryKey } from '../src/games/memory';
import { customWord, guessLetter } from '../src/games/words';
import { applyWarmup } from '../src/state/warmupAction';
import { freePlayBest } from '../src/arcade/presentation';
import { boardIds, createSession, engines as boardEngines } from '../src/board';
import { activityIds, type ActivityId, type ActivitySession, activityFinished } from '../src/state/activities';
import { createCardSession, cardAction, cardPublicView, chooseCardAction } from '../src/cards/engine';
import { createRaceSession, startRace, stepRace, raceBotInput } from '../src/racer/engine';
import { raceCourse } from '../src/racer/courses';
import { createPartySession, partyAction, partyActor } from '../src/party/engine';
import { createMysterySession, playSoloIntent, chooseMysteryBot, mysteryView } from '../src/mystery/engine';
import { arcadeIds } from '../src/arcade/types';
import { arcadeLearner, gameProgress, levelOpen } from '../src/arcade/progress';
import { createReef, reefLevel, reefTransition, legalReefMoves } from '../src/arcade/games/reef-builder/engine';
import { libraryChild, newLibraryChild, type LibraryChildState } from '../src/library/state';
import { newExploreProgress } from '../src/explore/progress';
import { labAction, FOOD_CHAIN, HABITATS, PLACES, type LabAction } from '../src/explore/activities';
import { useHomeStore } from '../src/home/useHomeStore';
import { homeReducer, type HomeStateV2 } from '../src/home/model';
import { defaultPracticeSettings } from '../src/practice/types';

const db = vi.hoisted(() => ({ raw: null as string | null, preserved: [] as string[] }));
vi.mock('../src/state/storage', () => ({ storage: { get: async () => db.raw, set: async (s: string) => { db.raw = s; }, preserve: async (s: string) => { db.preserved.push(s); } } }));
vi.mock('react-native', () => ({ AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock('../src/components/Audio', () => ({ AudioPreferences: createContext({}) }));
let store: ReturnType<typeof useStore>, root: ReturnType<typeof TestRenderer.create> | undefined;
const observations: Record<string, unknown> = {};
function Probe() { const s = useStore(); useLayoutEffect(() => { store = s; }, [s]); return null; }
const fixture = (): Save => ({ ...emptySave(), learning: selectLearner(addLearner(addLearner(familyLearners(), 'A', 'a'), 'B', 'b'), 'a') });
async function mount(save: Save = fixture()) { db.raw = JSON.stringify(save); await act(async () => { root = TestRenderer.create(<StoreProvider><Probe/></StoreProvider>); }); expect(store.recovery).toBeNull(); }
async function choose(id: string) { await act(async () => { store.selectLearner(id); }); }
function round(game: LearnId, owner: string, seed: number, level: 1|2|3|4|5 = 1): LearnSession {
  const engine = learnEngines[game];
  const r = startSession(game, { options: optionsAtLevel({ mode: engine.modes.includes('solo') ? 'solo' : engine.modes[0], pace: 'easy', ...(engine.languages ? { language: engine.languages[0] } : {}) }, level) }, {}, seed);
  r.learner = owner; expect(validLearnSession(r)).toBe(true); return r;
}
async function learn(r: LearnSession) { const old = store.save.learn?.[r.game]; await act(async () => { expect(store.learnUpdate(r.game, r, { id: old?.id ?? null, revision: old?.revision, epoch: store.epoch })).toBe(true); }); }
function mathFinish(s: MathRound) { while(s.index < s.questions.length) { while(s.steps < questionOf(s).b) s = mathMove(s,'shell-math',{type:'step'}); s = mathMove(s,'shell-math',{type:'answer',answer:mathAnswer(questionOf(s))}); s = mathMove(s,'shell-math',{type:'next'}); } return s; }
const expected = () => ({ learner: store.save.learning?.active ?? 'family', epoch: store.epoch });
async function arcade(action: Parameters<typeof store.arcade>[0]) { await act(async () => { expect(store.arcade(action, expected())).toBe(true); }); }
function activity(game: ActivityId, seed: number): ActivitySession {
  if(game === 'go-fish' || game === 'crazy-eights') return createCardSession(game,defaultOptions,seed,`${game}-${seed}`,{round:'quick'});
  if(game === 'racer') return createRaceSession('training','practice',seed,`racer-${seed}`);
  if(game === 'word-imposter') return createPartySession({players:['One','Two','Three'],seed,id:`party-${seed}`});
  return createMysterySession(undefined,seed,'crew',`mystery-${seed}`,1,'gentle');
}
async function saveActivity(r: ActivitySession) { const old = store.save.activities?.[r.game]; await act(async () => { expect(store.activityUpdate(r.game,r,{id:old?.id ?? null,...(old && 'revision' in old ? {revision:old.revision} : {}),epoch:store.epoch})).toBe(true); }); }
/** Holders of a badge receive catalog items added to it after they earned it; nothing else about them changes. */
const withAddedGrants = (p: Person): Person => { const added = grantsFor(badgesFor(p.milestones)).filter(id => !p.earned.includes(id)); return { ...p, earned: [...p.earned, ...added], unseen: [...p.unseen, ...added] }; };
beforeEach(() => { db.preserved=[]; vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true); });
afterEach(async () => { if(root) await act(async () => { root!.unmount(); }); root=undefined; vi.unstubAllGlobals(); });
afterAll(() => { if(process.env.AUDIT_OUTPUT) writeFileSync(process.env.AUDIT_OUTPUT, JSON.stringify(observations,null,2)+'\n'); });

it('L03 completed-round readiness stays per learner on different days', () => {
  let s=fixture();
  for(const day of [100,101]) { const a=round('shell-math','a',day); const before={...s,learn:{'shell-math':a}}; const after={...before,learn:{'shell-math':{...a,revision:1,state:mathFinish(a.state as MathRound)}}}; s=recordLevelRound(before,after,'shell-math',day); }
  expect(readyForNext(activeLearner(s.learning),'shell-math','easy')).toBe(true);
  expect(readyForNext(activeLearner(selectLearner(s.learning,'b')),'shell-math','easy')).toBe(false);
  observations.L03={aReady:true,bReady:false};
});
it('R01 all nine Arcade games have independent stars, worlds, bests, outfits and coaching', async () => {
  await mount(); const rows=[];
  for(const game of arcadeIds) {
    await choose('a'); for(let i=1;i<=8;i++) await arcade({type:'finish',game,level:`w1-${i}`,stars:3,score:i*10,round:`a-${game}-${i}`,name:'A'});
    await arcade({type:'coached',game}); await arcade({type:'outfit',game,outfit:'sunhat'});
    const p=gameProgress(arcadeLearner(store.save.arcade,'a'),game); expect(p.openWorlds).toContain('w2'); expect(p.best).toBe(80); expect(p.coached).toBe(true);
    await choose('b'); const b=gameProgress(arcadeLearner(store.save.arcade,'b'),game); expect(b.stars).toEqual({}); expect(levelOpen(b,'w1-2')).toBe(false); expect(b.best).toBe(0); expect(b.outfit).toBe('island'); expect(b.coached).toBe(false);
    rows.push({game,aStars:24,aWorld2:true,aBest:80,bStars:0,bBest:0,bWorld2:false});
  }
  expect(personFor(store.save,'a').milestones).toContain('arcade:reef-builder:w1-1'); expect(personFor(store.save,'b').milestones).not.toContain('arcade:reef-builder:w1-1'); observations.R01=rows;
});
it('R02 Reef paused rounds, helper, chests, stickers and stale callback guards are separate', async () => {
  await mount(); let reef=createReef(reefLevel('w1-1'),1); const m=legalReefMoves(reef)[0]; reef=reefTransition(reef,{type:'place',...m});
  await arcade({type:'save-round',session:{version:1,game:'reef-builder',round:'a-reef',state:reef}}); const oldExpected=expected(); await arcade({type:'helper',value:true});
  await choose('b'); expect(arcadeLearner(store.save.arcade,'b').session).toBeUndefined(); await arcade({type:'save-round',session:{version:1,game:'reef-builder',round:'b-reef',state:createReef(reefLevel('w1-1'),2)}});
  await act(async()=>{expect(store.arcade({type:'finish',game:'reef-builder',level:'w1-1',stars:3,score:100,round:'a-reef',name:'A'},oldExpected)).toBe(false);});
  expect(arcadeLearner(store.save.arcade,'a').session?.state).toEqual(reef); expect(arcadeLearner(store.save.arcade,'b').helper).toBe(false);
  await arcade({type:'finish',game:'reef-builder',level:'w1-1',stars:1,score:10,round:'b-reef',name:'B'}); await arcade({type:'claim-chest',round:'b-reef',result:{skill:'num.add-within-10',helped:false},config:defaultPracticeSettings});
  expect(arcadeLearner(store.save.arcade,'b').stickers).toHaveLength(1); expect(arcadeLearner(store.save.arcade,'a').stickers).toEqual([]); expect(personFor(store.save,'b').milestones).toContain('learn:quick-practice:1');
  observations.R02={aPausedRetained:true,bPausedSeparate:true,staleARejected:true,aStickers:0,bStickers:1,bChestLearningReward:true};
});
it('H01 Home, tray, Locker, unseen and undo histories are separate; history resets on remount', async () => {
  await mount(); const p=personFor(store.save,'a'), state=p.home as HomeStateV2;
  const instance=state.rooms[state.current].instances[0]; expect(instance).toBeDefined();
  const edited=homeReducer(state,{type:'theme',wallpaper:'cream'}).state;
  const tray={...edited,rooms:{...edited.rooms,[edited.current]:{...edited.rooms[edited.current],instances:edited.rooms[edited.current].instances.map(i=>i.id===instance.id?Object.fromEntries(Object.entries({...i,staged:true as const}).filter(([k])=>k!=='on' && k!=='in')) as typeof i:i)}}};
  await act(async()=>{expect(store.personalize({home:tray,look:{...p.look,hairColor:'auburn'},made:true},expected())).toBe(true);});
  const a=structuredClone(personFor(store.save,'a')); const oldExpected=expected(); await choose('b');
  expect(personFor(store.save,'b').look.hairColor).toBe('espresso'); expect((personFor(store.save,'b').home as HomeStateV2).rooms[state.current].instances.some(i=>i.staged)).toBe(false);
  await act(async()=>{expect(store.personalize({home:tray},oldExpected)).toBe(false);});
  await arcade({type:'finish',game:'reef-builder',level:'w1-1',stars:1,score:1,round:'b-home',name:'B'});
  const unseen=personFor(store.save,'b').unseen; expect(unseen.length).toBeGreaterThan(0); await act(async()=>{expect(store.personalize({unseen:[]},expected())).toBe(true);}); expect(personFor(store.save,'a')).toEqual(a);
  let home!: ReturnType<typeof useHomeStore>; function HomeProbe({initial}:{initial:HomeStateV2}) { const value=useHomeStore({},initial); useLayoutEffect(()=>{home=value;},[value]); return null; }
  let h!:ReturnType<typeof TestRenderer.create>; await act(async()=>{h=TestRenderer.create(<HomeProbe key="a:1" initial={state}/>);});
  await act(async()=>{home.dispatch({type:'theme',wallpaper:'cream'});});
  // Select a known change when a starter already uses cream.
  if(!home.canUndo) await act(async()=>{home.dispatch({type:'mirror',id:instance.id});}); expect(home.canUndo).toBe(true);
  await act(async()=>{h.update(<HomeProbe key="b:2" initial={personFor(store.save,'b').home as HomeStateV2}/>);}); expect(home.canUndo).toBe(false);
  await act(async()=>{h.update(<HomeProbe key="a:3" initial={tray}/>);}); expect(home.canUndo).toBe(false); await act(async()=>{h.unmount();});
  observations.H01={aHouseRetained:true,bOwnHouse:true,aTrayPersisted:true,bNoATray:true,aLockerRetained:true,staleRejected:true,unseenSeparate:true,undoShared:false,undoDurable:false};
});
it('W01 warm-up settings, notes, skills, readiness and rewards belong to active child', async () => {
  await mount(); const config={...defaultPracticeSettings,enabled:true,subject:'reading' as const};
  await act(async()=>{store.settings({practice:config});}); expect(learnerPractice(store.save.learning,store.save.settings.practice)).toEqual(config);
  const results=[1,2,3].map(()=>({skill:'read.short-a',helped:false})); const old=store.epoch;
  await act(async()=>{store.recordWarmup(results,config,'warm-a1',store.epoch);}); expect(personFor(store.save,'a').milestones).toContain('learn:which-one:1');
  await choose('b'); expect(learnerPractice(store.save.learning,store.save.settings.practice).enabled).toBe(false); const before=store.save;
  await act(async()=>{store.recordWarmup(results,config,'stale-warm',old);}); expect(store.save).toBe(before); expect(activeLearner(store.save.learning).notes).toEqual({});
  observations.W01={aEnabled:true,bEnabled:false,aReward:true,bNoReward:true,staleRejected:true};
});
it('Y01 Library all child fields and five exhibits are separate and rewarded to B only', async () => {
  await mount(); const a:LibraryChildState={...newLibraryChild(),saved:['moon'],recent:['moon'],bookPages:{book:3},layers:{moon:'deep'},query:'moon',category:'space',positions:{moon:123},current:'moon',onlyFavorites:true,creations:[{id:'page-a',title:'A',sourceId:'moon',sentences:'A page',updatedAt:1,strokes:[{color:'#abc',width:2,points:[{x:.1,y:.2}]}],stamps:[{id:'moon',x:.2,y:.3,size:.1}]}]};
  a.labs.space=labAction(a.labs.space,{type:'turn',by:1}); await act(async()=>{expect(store.libraryUpdate(a,store.epoch,'a')).toBe(true); store.libraryPolicy('a',{collections:['space'],hours:{enabled:true,start:100,end:101}});}); const originalA=structuredClone(libraryChild(store.save.library,'a')); const old=store.epoch;
  await choose('b'); expect(libraryChild(store.save.library,'b')).toEqual({...newLibraryChild(),policy:{...newLibraryChild().policy,collections:[...newLibraryChild().policy.collections,'faith','island-history']}});
  const actions: Record<string,LabAction[]>={space:Array.from({length:7},()=>({type:'turn',by:1})),oceans:FOOD_CHAIN.map(item=>({type:'chain',item})),animals:HABITATS.flatMap(h=>[{type:'habitat',choice:h.home},{type:'next-animal'}] as LabAction[]),world:PLACES.map(p=>({type:'place',id:p.id})),weather:['heat','cool','grow','soak','flow'].map(action=>({type:'water',action}))};
  for(const [world,seq] of Object.entries(actions)) { for(const action of seq) { const c=libraryChild(store.save.library,'b'); const labs={...c.labs,[world]:labAction(c.labs[world as keyof typeof c.labs],action)}; await act(async()=>{expect(store.libraryPatch({labs},store.epoch,'b')).toBe(true);}); } expect(personFor(store.save,'b').milestones).toContain(`explore:lab-${world}`); }
  expect(libraryChild(store.save.library,'a')).toEqual(originalA); expect(personFor(store.save,'a').milestones.filter(m=>m.startsWith('explore:'))).toEqual([]);
  await act(async()=>{expect(store.libraryUpdate(a,old,'a')).toBe(false);expect(store.libraryUpdate(a,store.epoch,'a')).toBe(false);});
  observations.Y01={aAllFieldsRetained:true,bOwnDefaults:true,bExhibitMilestones:personFor(store.save,'b').milestones.filter(m=>m.startsWith('explore:')),staleRejected:true,policiesSeparate:true};
});
it('R03 free-play Family board and headline best are shared, own best is separate; deletion keeps board', async () => {
  await mount(); for(let i=1;i<=8;i++) await arcade({type:'finish',game:'reef-builder',level:`w1-${i}`,stars:1,score:10,round:`score-a-${i}`,name:'A'});
  await arcade({type:'finish',game:'reef-builder',level:'endless',stars:0,score:1234,round:'score-a-endless',name:'A'}); await choose('b');
  expect(freePlayBest(store.save.arcade,'reef-builder')).toBe(1234); expect(gameProgress(arcadeLearner(store.save.arcade,'b'),'reef-builder').best).toBe(0);
  await act(async()=>{expect(await store.removeLearner('a')).toBe(true);}); expect(store.save.arcade?.scores).toContainEqual({game:'reef-builder',name:'A',score:1234}); observations.R03={familyBoardA:1234,bPersonalBest:0,scoreKeptAfterDeletingA:true};
});
it('L01 all 28 School games retain A/B paused rounds, choices and Continue independently', async () => {
  await mount();
  for (const [i,game] of learnIds.entries()) {
    await choose('a'); const a=round(game,'a',100+i,3); await learn(a);
    await choose('b'); expect(store.save.learn?.[game]).toBeUndefined(); expect(shelfLevel(store.save,game)).toBe(1); expect(homeContinue(store.save)).not.toBe(game);
    const b=round(game,'b',200+i); await learn(b);
    await choose('a'); expect(store.save.learn?.[game]).toEqual(a); expect(shelfLevel(store.save,game)).toBe(3);
    await choose('b'); expect(store.save.learn?.[game]).toEqual(b); expect(shelfLevel(store.save,game)).toBe(1);
  }
  observations.L01={games:learnIds.length,pausedRoundsPerGame:2};
});
it('L02 A/B each finish their own math round; other-owner writes and stale epochs earn nothing', async () => {
  await mount(); const a=round('shell-math','a',310); await learn(a);
  const stale={id:a.id,revision:a.revision,epoch:store.epoch}; await choose('b');
  const done={...a,revision:1,state:mathFinish(a.state as MathRound)};
  await act(async()=>{expect(store.learnUpdate('shell-math',done,{id:null,epoch:store.epoch})).toBe(false); store.practiceOwned('shell-math',stale,'num.add-within-10',true);});
  expect(personFor(store.save,'a').milestones).not.toContain('learn:shell-math:1');
  for (const [owner,seed] of [['b',311],['a',310]] as const) {
    await choose(owner); const r=owner==='a'?store.save.learn!['shell-math']!:round('shell-math',owner,seed); if(owner==='b') await learn(r);
    await learn({...r,revision:1,state:mathFinish(r.state as MathRound)});
    expect(personFor(store.save,owner).milestones).toContain('learn:shell-math:1'); expect(store.save.school?.['shell-math']?.[1]?.stars).toBe(2);
  }
  observations.L02={ownFinishes:true,foreignWritesRejected:true};
});
it('G01 favorites, Continue, recents and first teaching are scoped; suggestions use own skills', async () => {
  await mount(); await learn(round('shell-math','a',400));
  await act(async()=>{store.toggleGameFavorite('shell-math');store.markCoached('shell-math');});
  const a=structuredClone(store.save),staleFavorite=store.toggleGameFavorite; await choose('b');
  await act(async()=>staleFavorite('shell-math'));
  expect(store.save.favoriteGames ?? []).toEqual([]); expect(store.save.coached ?? []).toEqual([]); expect(homeContinue(store.save)).toBeNull();
  expect(dailySuggestions({...store.save,skills:{'num.add-within-10':{tries:99,right:99,box:5,day:20000}}},20000)).toEqual(dailySuggestions({...store.save,skills:{}},20000));
  await choose('a'); expect(store.save.favoriteGames).toEqual(a.favoriteGames); expect(store.save.coached).toEqual(a.coached); expect(homeContinue(store.save)).toBe('shell-math');
  observations.G01={favorites:true,continue:true,coaching:true,ownSuggestions:true};
});
it('C01 six classic slots coexist; stale A intents cannot play B; each finishes own Tic and CHamoru Memory', async () => {
  await mount();
  for (const game of gameIds) {
    await choose('a'); const a={...createGame(game,defaultOptions),id:`a-${game}`}; await act(async()=>store.update(game,a)); const staleAct=store.act, staleUpdate=store.update;
    await choose('b'); expect(store.save.sessions[game]).toBeUndefined(); const b={...createGame(game,defaultOptions),id:`b-${game}`}; await act(async()=>store.update(game,b));
    await act(async()=>{staleUpdate(game,a);staleAct(game,a.id,s=>s);}); expect(store.save.sessions[game]).toEqual(b);
    await choose('a'); expect(store.save.sessions[game]).toEqual(a);
  }
  for (const owner of ['a','b']) {
    await choose(owner); const tic={...createTic({...defaultOptions,mode:'together'}),id:`${owner}-tic-finish`}; await act(async()=>store.update('tic-tac-toe',tic));
    for (const cell of [0,3,1,4,2]) await act(async()=>store.act('tic-tac-toe',tic.id,s=>s.game==='tic-tac-toe'?ticMove(s,cell):s));
    expect(personFor(store.save,owner).milestones).toContain('classic:tic-tac-toe');
    const memory={...createMemory(defaultOptions,0,'chamoru'),id:`${owner}-memory-finish`}; await act(async()=>store.update('memory',memory));
    for (const key of new Set(memory.cards.map(memoryKey))) for (const index of memory.cards.flatMap((card,i)=>memoryKey(card)===key?[i]:[])) await act(async()=>store.act('memory',memory.id,r=>r.game==='memory'?flipCard(r,index):r));
    expect(personFor(store.save,owner).milestones).toContain('learn:chamoru-memory:1');
  }
  observations.C01={games:6,coexist:true,ownCredit:true};
});
it('B01 five board rounds coexist, each child sees teaching and finishes own Coconut Drop', async () => {
  await mount();
  for (const [i,game] of boardIds.entries()) {
    await choose('a'); const a={...createSession(game,{seed:500+i}),taught:true}; await act(async()=>{expect(store.boardUpdate(game,a,undefined,store.epoch)).toBe(true);});
    const oldEpoch=store.epoch; await choose('b'); expect(store.save.board?.[game]).toBeUndefined(); const b=createSession(game,{seed:600+i}); expect(b.taught).toBe(false);
    await act(async()=>{expect(store.boardUpdate(game,b,undefined,store.epoch)).toBe(true); expect(store.boardUpdate(game,a,a,oldEpoch)).toBe(false);});
    await choose('a'); expect(store.save.board?.[game]).toEqual(a); await choose('b'); expect(store.save.board?.[game]).toEqual(b);
  }
  for (const owner of ['a','b']) {
    await choose(owner); const r=createSession('coconut-drop',{mode:'together',seed:610}); await act(async()=>{expect(store.boardUpdate('coconut-drop',r,store.save.board?.['coconut-drop'],store.epoch)).toBe(true);});
    for(const move of [0,1,0,1,0,1,0]) { const old=store.save.board!['coconut-drop']!, next={...old,position:boardEngines['coconut-drop'].move(old.position,move)}; await act(async()=>{expect(store.boardUpdate('coconut-drop',next,old,store.epoch)).toBe(true);}); }
    expect(personFor(store.save,owner).milestones).toContain('classic:coconut-drop');
  }
  observations.B01={games:5,coexist:true,ownCredit:true,teachingSeparate:true};
});
function finishActivity(r:ActivitySession):ActivitySession {
  let done=r;
  if(done.game==='go-fish'||done.game==='crazy-eights') {let n=0;while(!done.result&&n++<3000)done=cardAction(done,chooseCardAction(cardPublicView(done)));}
  else if(done.game==='racer'){done=startRace(done);while(done.status==='running')done=stepRace(done,raceBotInput(done.runners[0],raceCourse(done.course),done.tick+1));}
  else if(done.game==='word-imposter'){let n=0;while(!done.result&&n++<50){const player=partyActor(done)!;done=partyAction(done,{sessionId:done.id,revision:done.revision,player,type:done.phase==='roles'?'role-done':done.phase==='clues'?'clue-done':'vote',target:player===0?1:0});}}
  else if(done.game==='island-mystery'){let n=0;while(!done.result&&n++<3000)done=playSoloIntent(done,chooseMysteryBot(mysteryView(done,done.players[0].id))??{type:'wait'});}
  expect(activityFinished(done)).toBe(true); return done;
}
it('A01 all five activities coexist and each learner finishes with own rewards and race records',async()=>{
  await mount();
  for(const [i,game] of activityIds.entries()) {
    await choose('a');const a=activity(game,700+i);await saveActivity(a);const captured={id:a.id,epoch:store.epoch};
    await choose('b');expect(store.save.activities?.[game]).toBeUndefined(); const b=activity(game,800+i);await saveActivity(b);
    await act(async()=>{expect(store.activityUpdate(game,finishActivity(a),captured)).toBe(false);});
    await choose('a');expect(store.save.activities?.[game]).toEqual(a);await saveActivity(finishActivity(a));expect(personFor(store.save,'a').milestones).toContain(`classic:${game}`);
    await choose('b');expect(store.save.activities?.[game]).toEqual(b);await saveActivity(finishActivity(b));expect(personFor(store.save,'b').milestones).toContain(`classic:${game}`);
    if(game==='racer'){expect(store.save.raceRecords?.['training:practice']?.sessionId).toBe(b.id);await choose('a');expect(store.save.raceRecords?.['training:practice']?.sessionId).toBe(a.id);}
  }
  observations.A01={games:5,coexist:true,ownCredit:true,recordsSeparate:true};
});
it('Y02 same Library topic credits each accepted child, including consecutive same-topic saves',async()=>{
  await mount();const p={...newExploreProgress(),location:{kind:'topic' as const,id:'moon'}},oldEpoch=store.epoch;
  await act(async()=>store.exploreUpdate(p,store.epoch,'moon','a'));await choose('b');
  await act(async()=>{store.exploreUpdate(p,oldEpoch,'moon','a');});expect(personFor(store.save,'b').milestones).not.toContain('explore:moon');
  await act(async()=>store.exploreUpdate(p,store.epoch,'moon','b'));expect(personFor(store.save,'a').milestones).toContain('explore:moon');expect(personFor(store.save,'b').milestones).toContain('explore:moon');observations.Y02={ownCredit:true};
});
it('D01 remove A preserves B Library and legacy lab projection, removes only A legacy topic entries',async()=>{
  await mount();await learn(round('shell-math','a',900));await act(async()=>store.exploreUpdate({...newExploreProgress(),location:{kind:'topic',id:'moon'}},store.epoch,'moon','a'));
  await choose('b');const c=libraryChild(store.save.library,'b');await act(async()=>{store.libraryPatch({labs:{...c.labs,space:labAction(c.labs.space,{type:'turn',by:1})},saved:['moon']},store.epoch,'b');});
  const b=structuredClone(libraryChild(store.save.library,'b')),personB=structuredClone(personFor(store.save,'b')),prior=db.raw!;
  await act(async()=>{expect(await store.removeLearner('a')).toBe(true);});expect(store.save.learning?.active).toBe('b');expect(libraryChild(store.save.library,'b')).toEqual(b);expect(personFor(store.save,'b')).toEqual(personB);expect(store.save.explore?.progress?.labs.space.turn).toBe(1);expect(store.save.profiles?.people.a).toBeUndefined();expect(db.preserved).toContain(prior);expect(withoutLearner(store.save,'family')).toBe(store.save);expect(parseSave(db.raw!)).toEqual(store.save);observations.D01={onlyOwnerRemoved:true};
});
it('D02 two same-game School and classic rounds survive reset and whole-device backup restore',async()=>{
  await mount();for(const [owner,seed] of [['a',1001],['b',1002]] as const){await choose(owner);await learn(round('shell-math',owner,seed));await act(async()=>store.update('maze',{...createGame('maze',defaultOptions),id:`${owner}-maze`}));await saveActivity(activity('go-fish',seed));await arcade({type:'save-round',session:{version:1,game:'reef-builder',round:`${owner}-round`,state:createReef(reefLevel('w1-1'),seed)}});await act(async()=>{store.libraryPatch({saved:[owner]},store.epoch,owner);store.personalize({made:true},expected());});}
  const backup=encodeSave(store.save),original=parseSave(backup),oldExpected=expected();await act(async()=>store.startFresh());const replaced=db.raw!;await act(async()=>store.restore(backup));expect(store.save).toEqual(original);expect(parseSave(db.raw!)).toEqual(original);expect(db.preserved).toContain(replaced);await act(async()=>{expect(store.personalize({made:false},oldExpected)).toBe(false);});for(const owner of ['a','b']){await choose(owner);expect(store.save.learn?.['shell-math']?.learner).toBe(owner);expect(store.save.sessions.maze?.id).toBe(`${owner}-maze`);}observations.D02={allProfilesRoundTrip:true,sameGameCoexist:true,staleRejected:true};
});
it('M01 grown-up assigns unowned Family learning, discoveries and signals once; never guesses from active child',async()=>{
  const legacy=round('shell-math','a',1100,3);delete legacy.learner;const old={...fixture(),learn:{'shell-math':legacy},skills:{'num.add-within-10':{tries:4,right:4,box:1,day:20000}},explore:{favorites:['moon'],progress:{...newExploreProgress(),query:'Old discoveries'}}};
  await mount(old);expect(db.preserved).toContain(JSON.stringify(old));expect(store.save.learn?.['shell-math']).toBeUndefined();expect(libraryChild(store.save.library,'a').saved).toEqual([]);expect(pendingAssignments(store.save).map(p=>p.key)).toContain('learn:shell-math');
  for(const key of ['learn:shell-math','explore','skills'])await act(async()=>{expect(await store.assignEarlier(key,'a',store.epoch)).toBe(true);});
  expect(store.save.learn?.['shell-math']?.learner).toBe('a');expect(libraryChild(store.save.library,'a').saved).toEqual(['moon']);expect(activeLearner(store.save.learning).skills['num.add-within-10'].tries).toBe(4);await choose('family');expect(store.save.learn?.['shell-math']).toBeUndefined();await act(async()=>{expect(await store.assignEarlier('learn:shell-math','b',store.epoch)).toBe(false);});observations.M01={explicitAssignment:true,oneOwner:true,originalPreserved:true};
});
it('C02 personal word records stay separate; earlier aggregate remains intact',async()=>{
  await mount({...fixture(),wordRecords:{wins:4,losses:2,assistedWins:1,bestWrong:0,counted:['old']}});
  for(const [owner,word] of [['a','SUN'],['b','CAT']] as const){await choose(owner);expect(store.save.wordRecords).toBeUndefined();const r={...customWord({...defaultOptions,wordRules:'challenge'},word)!,id:`word-${owner}`};await act(async()=>store.update('word-rescue',r));for(const letter of word)await act(async()=>store.act('word-rescue',r.id,s=>s.game==='word-rescue'?guessLetter(s,letter):s));expect(store.save.wordRecords?.wins).toBe(1);}
  await choose('a');expect(store.save.wordRecords?.wins).toBe(1);expect(store.save.profiles?.earlier.wordRecords?.wins).toBe(4);observations.C02={personalWins:1,earlierWins:4};
});
it('W02 warmups retain practice and rewards but never count as School rounds or readiness',()=>{
  let s=fixture();const now=vi.spyOn(Date,'now');try{for(const day of [21000,21001]){now.mockReturnValue(day*86400000);s=applyWarmup(s,[1,2,3].map(()=>({skill:'num.add-within-10',helped:false})),{...defaultPracticeSettings,enabled:true},`warmup-day-${day}`);}}finally{now.mockRestore();}
  expect(s.learn).toBeUndefined();expect(readyForNext(activeLearner(s.learning),'quick-practice','easy')).toBe(false);expect(personFor(s,'a').milestones).toContain('learn:quick-practice:1');expect(activeLearner(s.learning).skills['num.add-within-10'].tries).toBeGreaterThan(0);expect(s.school).toBeUndefined();observations.W02={practiceKept:true,noLevelCompletion:true};
});
it('M02 actual 2.5 engine fixture retains named progress and exact original; no unowned history copied',async()=>{
  const old=parseSave(JSON.stringify(fixture25)),oldA=structuredClone(old.personalization!.people.a);await mount(old);expect(store.save.learn?.['shell-math']).toEqual(old.learn?.['shell-math']);expect(shelfLevel(store.save,'shell-math')).toBe(3);expect(personFor(store.save,'a').milestones).toEqual(oldA.milestones);expect(personFor(store.save,'a').earned).toEqual(withAddedGrants(oldA).earned);expect(personFor(store.save,'a').look).toEqual(oldA.look);expect(personFor(store.save,'a').home.version).toBe(4);expect(store.save.arcade?.people.a).toEqual(old.arcade?.people.a);expect(libraryChild(store.save.library,'a').saved).toEqual([]);expect(pendingAssignments(store.save).some(p=>p.key==='explore')).toBe(true);expect(db.preserved).toContain(JSON.stringify(old));await choose('b');expect(shelfLevel(store.save,'shell-math')).toBe(1);expect(arcadeLearner(store.save.arcade,'b').games).toEqual({});observations.M02={realEngineFixture:true,ownedProgressRetained:true};
});
it('D03 deleting active A selects Family, retains all B canonical slots, and protects Family',async()=>{
  await mount();for(const [owner,seed] of [['a',1201],['b',1202]] as const){await choose(owner);await learn(round('shell-math',owner,seed));await act(async()=>{store.update('maze',{...createGame('maze',defaultOptions),id:`${owner}-maze`});store.boardUpdate('coconut-drop',createSession('coconut-drop',{seed}),undefined,store.epoch);store.libraryPatch({saved:[owner]},store.epoch,owner);});await saveActivity(activity('go-fish',seed));}
  const before=structuredClone(store.save);await choose('a');await act(async()=>{expect(await store.removeLearner('a')).toBe(true);});expect(store.save.learning?.active).toBe('family');expect(store.save.profiles?.people.b).toEqual(before.profiles?.people.b);expect(store.save.profiles?.people.a).toBeUndefined();expect(store.save.library?.profiles.b).toEqual(before.library?.profiles.b);expect(withoutLearner(store.save,'family')).toBe(store.save);await choose('b');expect(store.save.learn?.['shell-math']?.learner).toBe('b');expect(store.save.sessions.maze?.id).toBe('b-maze');expect(parseSave(db.raw!)).toEqual(store.save);observations.D03={onlyADeleted:true,familyProtected:true};
});
it('M03 last-active B never inherits old device Explore; grown-up merge preserves newer Library',async()=>{
  const old=parseSave(JSON.stringify(fixture25));old.learning=selectLearner(old.learning,'b');old.roundOwners={version:1,rounds:{...old.roundOwners?.rounds,'explore:moon':{round:'explore:moon',owner:'a'}}};await mount(old);expect(libraryChild(store.save.library,'b').saved).toEqual([]);expect(libraryChild(store.save.library,'a').saved).toEqual([]);expect(store.save.library?.archive?.explore).toEqual(old.explore);
  await act(async()=>{store.libraryPatch({saved:['sun'],query:'New B search'},store.epoch,'b');});const newer=structuredClone(libraryChild(store.save.library,'b'));await act(async()=>{expect(await store.assignEarlier('explore','b',store.epoch)).toBe(true);});expect(libraryChild(store.save.library,'b').saved).toEqual(['sun','moon']);expect(libraryChild(store.save.library,'b').query).toBe(newer.query);expect(libraryChild(store.save.library,'a').saved).toEqual([]);observations.M03={noGuess:true,newerPreserved:true,explicitMerge:true};
});

it('M04 real 77a82ff8 engine fixture upgrades Family plus A/B without losing any owned game, house, badge or Library',async()=>{
  const fixture30=(await import('./fixtures/profile-3.0.json')).default;
  const old=parseSave(JSON.stringify(fixture30)),raw=JSON.stringify(old);await mount(old);expect(db.preserved).toContain(raw);
  const expectedLearn={a:'shell-math',b:'number-hop',family:'quick-practice'} as const;
  const expectedClassic={a:'tic-tac-toe',b:'word-rescue',family:'maze'} as const;
  const expectedBoard={a:'coconut-drop',b:'shell-pits',family:'reef-sweep'} as const;
  const expectedActivity={a:'go-fish',b:'crazy-eights',family:'racer'} as const;
  for(const owner of ['a','b','family'] as const){await choose(owner);expect(store.save.learn?.[expectedLearn[owner]]).toEqual(old.learn?.[expectedLearn[owner]]);expect(store.save.sessions[expectedClassic[owner]]).toEqual(old.sessions[expectedClassic[owner]]);expect(store.save.board?.[expectedBoard[owner]]).toEqual(old.board?.[expectedBoard[owner]]);expect(store.save.activities?.[expectedActivity[owner]]).toEqual(old.activities?.[expectedActivity[owner]]);expect(store.save.library?.profiles[owner]).toEqual(old.library?.profiles[owner]);expect(personFor(store.save,owner)).toEqual(withAddedGrants(personFor(old,owner)));expect(store.save.arcade?.people[owner]).toEqual(old.arcade?.people[owner]);}
  const backup=encodeSave(store.save);await act(async()=>store.startFresh());await act(async()=>store.restore(backup));expect(encodeSave(store.save)).toBe(backup);observations.M04={producer:'77a82ff8',familyAndTwoChildren:true,wholeBackup:true};
});
it('assignment recovery failure preserves the entire before-save and all owners; stale assignment cannot run',async()=>{
  const r=round('shell-math','a',1301);delete r.learner;await mount({...fixture(),learn:{'shell-math':r}});const before=encodeSave(store.save),raw=db.raw!,oldEpoch=store.epoch;
  await choose('b');await act(async()=>{expect(await store.assignEarlier('learn:shell-math','a',oldEpoch)).toBe(false);});await choose('a');
  const {storage}=await import('../src/state/storage'),spy=vi.spyOn(storage,'preserve').mockRejectedValueOnce(new Error('disk full'));
  await act(async()=>{await expect(store.assignEarlier('learn:shell-math','a',store.epoch)).rejects.toThrow('disk full');});spy.mockRestore();expect(encodeSave(store.save)).toBe(before);expect(db.raw).toBe(raw);expect(pendingAssignments(store.save).some(p=>p.key==='learn:shell-math')).toBe(true);
});
it('A→B→A rejects captured classic intents even when the original A round is active again',async()=>{
  await mount();const r=createTic({...defaultOptions,mode:'together'});await act(async()=>store.update('tic-tac-toe',r));const stale=store.act,staleUpdate=store.update;
  await choose('b');await choose('a');await act(async()=>{stale('tic-tac-toe',r.id,s=>s.game==='tic-tac-toe'?ticMove(s,0):s);staleUpdate('tic-tac-toe',ticMove(r,0),r);});expect(store.save.sessions['tic-tac-toe']).toEqual(r);
});

it('2 MB admission rejects a larger all-profile save atomically and retains the last good round',async()=>{
  const { migrateProfiles, syncProfile }=await import('../src/state/profiles'),{ migrateLibrary }=await import('../src/library/state'),{ backfillRewards }=await import('../src/badges/transitions');
  const base=syncProfile(backfillRewards(migrateLibrary(migrateProfiles(fixture()))));
  // Unknown legacy metadata is retained by the existing envelope parser; reserve almost all remaining bytes.
  const padded={...base,legacyMetadata:'x'.repeat(1_999_800-encodeSave(base).length)};
  await mount(padded);const before=encodeSave(store.save),persisted=db.raw!,r=round('shell-math','a',1400);
  await act(async()=>{expect(store.learnUpdate('shell-math',r,{id:null,epoch:store.epoch})).toBe(false);});
  expect(encodeSave(store.save)).toBe(before);expect(store.save.learn?.['shell-math']).toBeUndefined();expect(store.error).toMatch(/save limit/);expect(db.raw).toBe(persisted);
});
it('produce a validated browser fixture from accepted real engine transitions',async()=>{
  const unowned=round('quick-practice','a',1500,3);delete unowned.learner;
  await mount({...fixture(),learn:{'quick-practice':unowned},explore:{favorites:['moon'],progress:{...newExploreProgress(),query:'Earlier family discoveries'}}});
  for(const [owner,seed,level] of [['a',1501,3],['b',1502,1]] as const){await choose(owner);const r=round('shell-math',owner,seed,level);await learn(r);await learn({...r,revision:1,levelHelped:owner==='b',state:mathFinish(r.state as MathRound)});await learn(round('shell-math',owner,seed+10,level));await act(async()=>{store.personalize({made:true},expected());});}
  await choose('a');const raw=encodeSave(store.save);expect(parseSave(raw)).toEqual(store.save);
  if(process.env.PROFILE_FIX_ARTIFACT)writeFileSync(process.env.PROFILE_FIX_ARTIFACT+'/browser-fixture.json',raw+'\n');
});
