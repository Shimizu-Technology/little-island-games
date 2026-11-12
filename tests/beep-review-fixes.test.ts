import {expect,it} from 'vitest';
import {advance,bank,engine,initialProgram,tick,type BotState,type Arrow} from '../src/learn/games/beep-bot/engine';
import {advance as legacyAdvance,engine as legacy,tick as legacyTick,initialProgram as legacyStarter} from '../src/learn/games/beep-bot/legacy';
import {optionsAtLevel,type LearningLevel} from '../src/learn/levelOptions';
import {nearestHint,nearestHintSliced} from '../src/learn/games/beep-bot/solver';
import {solves} from '../src/learn/games/beep-bot/movement';
import {beepPuzzles} from '../src/learn/games/beep-bot/challenge-content';
import {codes,type Action} from '../src/learn/games/beep-bot/challenge-engine';
import {registration} from '../src/learn/games/beep-bot/challenge';
import {emptyChallenge} from '../src/state/challenge';
const opts=(l:number)=>optionsAtLevel({mode:'solo',pace:'easy'},l as LearningLevel);
it('P2-1/P3-6 real v1 validation, tick, advance and Reset preserve legacy behavior and inputs',()=>{
 for(let level=1;level<=5;level++)for(let seed=0;seed<10000;seed+=137){
  const o=opts(level);let s:BotState=legacy.create(o,{skills:{},rng:()=>seed/10000,starter:0,today:1});
  while(s.done<4){const frozen=JSON.stringify(s);expect(engine.validate(s,o)).toBe(true);expect(JSON.stringify(s)).toBe(frozen);
   const p=s.puzzles[s.done];s={...s,program:[...p.answer],running:true};
   while(s.running){const before=JSON.stringify(s),next=tick(s);expect(next).toEqual(legacyTick(s as Parameters<typeof legacyTick>[0]));expect(JSON.stringify(s)).toBe(before);s=next;}
   const original=s,before=JSON.stringify(s),expected=legacyAdvance(s as Parameters<typeof legacyAdvance>[0]);s=advance(s);expect(s).toEqual(expected);expect(engine.validate(s,o)).toBe(true);expect(JSON.stringify(original)).toBe(before);
   if(s.done<4)expect(s.program).toEqual(legacyStarter(s.puzzles[s.done],level));
  }
 }
});
it('P2-2 all maps plain-arrow winners get no edit, including sliced Help',async()=>{
 for(let l=1;l<=5;l++)for(const row of bank[l-1]){
  const plain:Arrow[]=[];let previous:Arrow='right';for(const c of row.proof.winners[0]){if(c.startsWith('repeat'))plain.push(...Array(Number(c.at(-1))-1).fill(previous));else{plain.push(c);previous=c;}}
  expect(solves(row.puzzle,plain)).toBe(true);
  expect(nearestHint(row.proof.winners,plain,false,row.puzzle)).toMatchObject({edit:null,distance:0,plan:plain});
  expect(await nearestHintSliced(row.proof.winners,plain,()=>false,false,row.puzzle)).toMatchObject({edit:null,distance:0});
 }
});
it('P2-5 every round varies rotations and needs at least three directions at L2–5',()=>{
 for(let l=1;l<=5;l++)for(let seed=0;seed<10000;seed++){
  const s=engine.create(opts(l),{skills:{},rng:()=>seed/10000,starter:0,today:1});
  expect(new Set(s.puzzles.map(p=>p.start)).size).toBe(4);
  if(l>=2)expect(new Set(s.puzzles.flatMap(p=>p.answer.filter(c=>!c.startsWith('repeat')))).size).toBeGreaterThanOrEqual(3);
 }
});
it('P3-1 Level 4 has 16 geometries distinct from every Level 3 map',()=>{
 const geometry=(p:typeof bank[number][number]['puzzle'])=>JSON.stringify([p.start,p.shell,p.rocks]);
 const old=new Set(bank[2].map(r=>geometry(r.puzzle)));expect(bank[3]).toHaveLength(16);
 for(const r of bank[3])expect(old.has(geometry(r.puzzle))).toBe(false);
});
it('P3-2 Level 4 dare bugs are balanced within each plan length',()=>{
 const lengths=new Map<number,number[]>();for(const p of beepPuzzles.filter(p=>p.descriptor.level===4)){
  const d=p.descriptor,n=d.puzzle.answer.length,counts=lengths.get(n)??Array(n).fill(0),bug=d.starter.findIndex((c,i)=>c!==d.puzzle.answer[i]);counts[bug]++;lengths.set(n,counts);
  expect(solves(d.puzzle,d.starter)).toBe(false);expect(d.starter).toEqual(initialProgram(d.puzzle,4));
 }for(const counts of lengths.values())expect(Math.max(...counts)-Math.min(...counts)).toBeLessThanOrEqual(1);
});
it('P3-3 L4 awards and dares both require one edit, one Go, no Help',()=>{
 for(const p of beepPuzzles.filter(p=>p.descriptor.level===4))for(const extra of [false,true]){
  let s=registration.start(p.ref,'a','review-fix',emptyChallenge(),{supportOff:true,ownRead:false},[p.dares[0].slot]);
  const h=nearestHint(p.descriptor.winners,p.descriptor.starter);const actions:Action[]=extra?[['a',0],['x',p.descriptor.starter.length]]:[];
  actions.push(['r',h.edit!.at,codes.indexOf(h.edit!.card!)],['g']);
  for(const a of actions){const n=registration.move(s,a);expect(n).not.toBeNull();s=n!;}
  expect(s.result?.awards).toBe(extra?0:1);expect(s.result?.dares).toEqual(extra?[]:[p.dares[0].slot]);
 }
});
it('P3-7 L4/5 dare labels and staged speech state first try and no Help',async()=>{
 const speech=(await import('../scripts/learn/c2a-beep.json')).default;
 for(const p of beepPuzzles.filter(p=>p.descriptor.level>=4)){expect(p.dares[0].label).toMatch(/first try/i);expect(p.dares[0].label).toMatch(/no Help/i);}
 for(const k of ['c2a-beep-dare-four','c2a-beep-dare-five'] as const){expect(speech[k]).toMatch(/first try/i);expect(speech[k]).toMatch(/no Help/i);}
});

it('P3-2 every plan length includes its final-card bug even when there are fewer dares than cards',()=>{
 const positions=new Map<number,Set<number>>();for(const p of beepPuzzles.filter(p=>p.descriptor.level===4)){
  const d=p.descriptor,n=d.starter.length,set=positions.get(n)??new Set<number>();set.add(d.starter.findIndex((c,i)=>c!==d.puzzle.answer[i]));positions.set(n,set);
 }for(const [length,set] of positions)expect(set.has(length-1)).toBe(true);
});
