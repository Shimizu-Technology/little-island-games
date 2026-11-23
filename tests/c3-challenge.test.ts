import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { registration } from '../src/learn/games/code-lab/challenge';
import { labPuzzles } from '../src/learn/games/code-lab/challenge-content';
import { FREE_EDITS, initialAttempt, nearest, hint, sourceFor, step, validAttempt, validAction, type Action } from '../src/learn/games/code-lab/attempt';
import { schoolPrograms, type LabProgram } from '../src/learn/games/code-lab/content';
import { engine, programAt, selectPrograms, type ModernState } from '../src/learn/games/code-lab/engine';
import { emptyChallenge, validChallengeSession, type ChallengeSession } from '../src/state/challenge';
import { jsonBytes } from '../src/state/saveBits';
vi.mock('../src/challenge/registry.generated', () => ({ challengeEntries: [] }));
const options = { supportOff: false, ownRead: false };
const start = (p = labPuzzles[0]) => registration.start(p.ref, 'learner-1', 'lab-round', emptyChallenge(), options, p.dares.map(d => d.slot));
const finish = (s: ChallengeSession, d: LabProgram) => {
  if (d.mode === 'predict') { s = registration.move(s, ['p', d.answer]) ?? s; }
  else for (let i = 0; i < d.slots.length; i++) s = registration.move(s, ['e', i, d.slots[i].answer]) ?? s;
  return registration.move(s, ['c'])!;
};
it('registers only reserved banks/dares, immutable hashes and exact committed catalog facts', () => {
  expect(labPuzzles).toHaveLength(440); const slots = labPuzzles.flatMap(p => p.dares.map(d => d.slot)); expect(slots).toHaveLength(140); expect(Math.min(...slots)).toBe(500); expect(Math.max(...slots)).toBe(639); expect(new Set(slots).size).toBe(140);
  const catalog = JSON.parse(readFileSync('src/state/save-catalog.json','utf8'));
  for (const [slot, bank] of registration.catalog.banks) { expect(slot).toBeGreaterThanOrEqual(230); expect(slot).toBeLessThanOrEqual(244); expect(catalog.banks.find((b: { slot: number }) => b.slot === slot)).toEqual(bank); }
  for (const p of labPuzzles) { const s = finish(start(p), p.descriptor); expect(s?.result?.event, p.descriptor.id).toBe('independent'); expect(validChallengeSession(s,'learner-1',registration.catalog)).toBe(true); expect(jsonBytes(s)).toBeLessThanOrEqual(4096); expect(registration.move(s,['h',3])).toBeNull(); }
});
describe('reserve: 500 abusive interactions never prevent completion', () => {
  for (const mode of ['build','predict'] as const) it(`${mode}: repeated misses, saturated Look/One step/Clear, Undo, clear and save/reload retain a solution`, () => {
    // Largest slot count makes the edit witness and payload worst-case.
    const p = labPuzzles.find(p => p.descriptor.mode === mode && p.descriptor.slots.length === 4)!, d = p.descriptor;
    let s = start(p);
    const act = (a: Action) => { const next = registration.move(s,a); if (next) { s = JSON.parse(JSON.stringify(next)); expect(validChallengeSession(s,'learner-1',registration.catalog)).toBe(true); } };
    for (let i = 0; i < 500; i++) {
      if (mode === 'build') { for (let j=0;j<d.slots.length;j++) act(['e',j,1+i%2]); act(['c']); act(['u']); if (i%3===0) act(['z']); }
      else { const wrong = [0,1,2,3].filter(i=>i!==d.answer); act(['p',wrong[i%3]]); act(['c']); act(['u']); }
      act(['h',1]);act(['h',2]);act(['h',3]);
    }
    const before = s.payload as {actions: Action[]}; expect(before.actions.length).toBeLessThan(240);
    s=finish(s,d); expect(s).not.toBeNull(); expect(s.result?.event).toBe('helped'); expect(s.result?.dares).toEqual([]); expect(jsonBytes(s)).toBeLessThanOrEqual(4096); expect(validChallengeSession(s,'learner-1',registration.catalog)).toBe(true);
  });
  it('bounds switching predictions as well as misses', () => { const p = labPuzzles.find(p=>p.descriptor.mode==='predict')!, d=p.descriptor;let s=start(p);for(let i=0;i<600;i++)s=registration.move(s,['p',i%4])??s; expect((s.payload as {actions:Action[]}).actions.length).toBeLessThanOrEqual(FREE_EDITS+1); expect(finish(s,d).result).not.toBeNull(); });
});
it('Help reports exact minimum token edits from the interpreter and stays monotonic across edit/undo/reset', () => {
  for(const d of schoolPrograms.flat().filter(d=>d.mode==='build')){
    let s=initialAttempt(d); const near=nearest(d,s.picks); expect(near.distance).toBe(d.slots.length);
    s=step(s,['h',2],d)!;expect(hint(d,s)).toContain(`line ${d.slots[near.slot].line+1}`);
    const next=step(s,['e',near.slot,near.winner[near.slot]],d)!;expect(nearest(d,next.picks).distance).toBe(near.distance-1);expect(next.help).toBe(2);expect(step(next,['u'],d)?.help).toBe(2);expect(step(next,['h',1],d)).toBeNull();
    expect(sourceFor(d,d.slots.map(s=>s.answer))).toEqual(d.lines);
  }
});
it('validates saved School rounds, selects 4 of 16 without repeats and preserves prior round avoidance', () => {
  for(let level=1;level<=5;level++){
    const opts={mode:'solo' as const,pace:(['easy','medium','hard'] as const)[Math.min(level,3)-1],...(level===4?{stage:'stretch' as const}:level===5?{stage:'deep' as const}:{})};
    for(let seed=0;seed<40;seed++){const a=selectPrograms(level,seed),b=selectPrograms(level,seed,a);expect(new Set([...a,...b]).size).toBe(8);expect(selectPrograms(level,seed)).toEqual(a);}
    let s=engine.create(opts,{rng:()=>.3,skills:{},starter:0,today:0}) as ModernState;
    for(let i=0;i<4;i++){const d=programAt(s);expect(engine.validate(JSON.parse(JSON.stringify(s)),opts)).toBe(true);let attempt=s.attempt;if(d.mode==='predict')attempt=step(attempt,['p',d.answer],d)!;else d.slots.forEach((_,j)=>{attempt=step(attempt,['e',j,d.slots[j].answer],d)!;});attempt=step(attempt,['c'],d)!;s={...s,attempt};expect(engine.validate(s,opts)).toBe(true);s=i<3?{...s,index:i+1,attempt:initialAttempt(programAt({...s,index:i+1}))}:{...s,index:4};}
    expect(engine.outcome(s,opts)).toBe('done');expect(engine.validate({...s,programs:[0,0,1,3]},opts)).toBe(false);
  }
  expect(validAttempt({...initialAttempt(schoolPrograms[0][0]),edits:1000},schoolPrograms[0][0])).toBe(false);expect(validAction(['e',0,99])).toBe(false);
});

it('automatic reserve guidance records assistance even with no misses and no explicit Help', () => {
  const p = labPuzzles.find(p => p.descriptor.mode === 'build')!, d=p.descriptor;
  let s = start(p);
  for(let i=0;i<96;i++) { const next = registration.move(s,['e',0,i%2]);expect(next).not.toBeNull();s=next!; }
  const finished = finish(s,d);expect(finished.result?.event).toBe('helped');expect(finished.result?.awards).toBe(0);
  expect(registration.completionFacts?.(finished)?.helpUsed).toBe(true);
});
