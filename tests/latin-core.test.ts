import { describe, expect, it } from 'vitest';
import { cageOK, decodePuzzle, encodePuzzle, solved, validPuzzle } from '../src/puzzles/latin/core';
import { independentCount } from '../src/puzzles/latin/independent';
import { grade, search } from '../src/puzzles/latin/solver';
import { latinAdapter, logicalHint, semanticKey } from '../src/puzzles/latin/adapter';
import { blank, descriptor, generatePuzzle } from '../scripts/puzzles/latin/generate';
import { certify } from '../src/puzzles/checks';
import { family } from '../scripts/puzzles/latin/generate';

describe('Latin family pure rules',()=>{
  it('exhaustively counts all 288 4×4 Sudoku boards in both independent implementations',()=>{
    const p=blank('sudoku',4);expect(search(p,1000,200000).count).toBe(288);expect(independentCount(p,1000,200000).count).toBe(288);
    expect(search(p,2,0).status).toBe('budget-exhausted');expect(independentCount(p,2,0).status).toBe('budget-exhausted');
  });
  it('checks all arithmetic operators including unordered subtraction and exact division',()=>{
    const c={cells:[0,1],target:2};expect(cageOK({...c,op:'-'},[1,3])).toBe(true);expect(cageOK({...c,op:'/'},[6,3])).toBe(true);expect(cageOK({...c,op:'/'},[3,6])).toBe(true);expect(cageOK({...c,op:'/'},[5,2])).toBe(false);
    expect(cageOK({...c,op:'*',target:12},[3,4])).toBe(true);expect(cageOK({...c,op:'+',target:7},[3,4])).toBe(true);
  });
  it('rejects malformed/oversized descriptors and incompatible modes',()=>{
    const p=blank('sudoku',4);expect(validPuzzle(p)).toBe(true);expect(validPuzzle({...p,size:99})).toBe(false);expect(validPuzzle({...p,box:0})).toBe(false);expect(decodePuzzle([0,4,2,'x',[],[],[],'0'])).toBeNull();expect(decodePuzzle(encodePuzzle(p))).toEqual(p);
  });
  it('counts random original small-grid clue subsets without mutating either input',()=>{
    const full=search(blank('sudoku',4),1).first!;
    for(let seed=0;seed<80;seed++){const p={...blank('sudoku',4),givens:full.map((v,i)=>(seed*17+i*13)%7<3?v:0)},original=JSON.stringify(p);expect(search(p,2).count).toBe(independentCount(p,2).count);expect(JSON.stringify(p)).toBe(original);}
  });
  it.each(['sudoku','cage-math','greater-than','skyline','killer'] as const)('certifies %s through real kit replay, second count, public hint route and traces',kind=>{
    const spec=family(kind);spec.bands[0].advanced=false;let p=null;for(let i=1;i<20&&!p;i++)p=generatePuzzle(kind,i,0);expect(p).not.toBeNull();const d=descriptor(p!,1,'paddling');const result=certify(spec,spec.bands[0],d,{budget:200000,seenExact:new Set(),seenSemantic:new Set()});expect(result).toMatchObject({ok:true});
    const a=latinAdapter(kind);let s=a.create(d);let turns=0;while(!a.solved(s,d)&&turns++<100){const h=a.hint!(s,d);expect(h).not.toBeNull();s=a.reduce(s,h!,d);}expect(a.solved(s,d)).toBe(true);expect(solved(p!,s.values)).toBe(true);expect(grade(p!).status).toBe('complete');
    const empty=p!.givens.findIndex(v=>!v);if(empty>=0){const bad=[...s.values];bad[empty]=bad[empty]%p!.size+1;const h=logicalHint(p!,bad);expect(h).toEqual([empty,0]);}
  });
  it('deduplicates symbol swaps and mirrors rather than counting cosmetic Sudoku variants',()=>{
    const p=generatePuzzle('sudoku',8,0)!;const q={...p,givens:p.givens.map(v=>v?5-v:0)};expect(semanticKey(p)).toBe(semanticKey(q));
    expect(semanticKey(p)).toBe(semanticKey({...p,givens:p.givens.map((_,i)=>p.givens[Math.floor(i/4)*4+3-i%4])}));
  });
  it('never upgrades a stall to an adult label',()=>expect(grade(blank('sudoku',9))).toMatchObject({status:'stalled'}));
});
