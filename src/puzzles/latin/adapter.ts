import { exactKeys, plain, uint } from '../../state/saveBits';
import { relabel, smallest, squareSymmetries } from '../semantic';
import { sha256Hex } from '../sha256';
import type { DescriptorCore, PuzzleAdapter } from '../types';
import { cellsOf, decodePuzzle, encodePuzzle, solved, validPuzzle, type LatinPuzzle } from './core';
import { independentCount } from './independent';
import { grade, search, singleton, valuesOf } from './solver';
export type LatinAction = readonly [cell:number,value:number];
export type LatinState = { values:number[]; edits:number };
export type LatinDescriptor = DescriptorCore<LatinPuzzle>;
/** Mirrors/rotations and arbitrary digit renamings are not extra Sudoku supply. Arithmetic retains numeric meaning. */
export function semanticKey(p:LatinPuzzle):string{
  const maps=squareSymmetries(p.size).filter((_,i)=>!p.box||p.box*p.box===p.size||[0,2,4,5].includes(i));
  return p.kind==='sudoku'?`${p.size}:${smallest(maps.map(map=>{const a=p.givens.map(()=>0);p.givens.forEach((v,i)=>{a[map[i]]=v;});return relabel(a).join('');}))}`:smallest(maps.map(map=>{
    const givens=p.givens.map(()=>0),mask=p.mask.map(()=>0);p.givens.forEach((v,i)=>{givens[map[i]]=v;mask[map[i]]=p.mask[i];});
    const cages=p.cages.map(c=>[c.cells.map(i=>map[i]).sort((a,b)=>a-b),c.op,c.target]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
    const less=p.less.map(([a,b])=>[map[a],map[b]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    // Encode sight lines by their ordered mapped cell list, preserving the observation direction.
    const n=p.size,sights=p.sights.map(([id,clue])=>{const side=Math.floor(id/n),line=id%n;return [Array.from({length:n},(_,i)=>map[side===0?i*n+line:side===1?line*n+n-1-i:side===2?(n-1-i)*n+line:line*n+i]),clue];}).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return JSON.stringify([p.kind,p.size,p.box,givens,cages,less,sights,mask]);
  }));
}
/** Hints use only givens and the current public board. An inconsistent draft is cleared one entry at a time. */
export function logicalHint(p:LatinPuzzle, values:readonly number[]):LatinAction|null{
  const g=grade(p,200000,values);
  if(g.status==='contradiction'||g.status==='stalled'){
    // A unique bank puzzle has a complete opening trace; recover to it without consulting a hidden answer.
    const opening=grade(p);if(opening.status!=='complete')return null;
    const wrong=cellsOf(p).find(i=>!p.givens[i]&&values[i]&&singleton(opening.domains[i])&&values[i]!==valuesOf(opening.domains[i])[0]);
    if(wrong!==undefined)return [wrong,0];
  }
  const i=cellsOf(p).find(i=>!values[i]&&singleton(g.domains[i]));return i===undefined?null:[i,valuesOf(g.domains[i])[0]];
}
export function latinAdapter(engine:LatinPuzzle['kind']):PuzzleAdapter<LatinPuzzle,LatinState,LatinAction>{return {
  engine,rules:1,needsCheck:false,isPayload:(x):x is LatinPuzzle=>validPuzzle(x)&&x.kind===engine,
  isAction:(x):x is LatinAction=>Array.isArray(x)&&x.length===2&&uint(x[0],80)&&uint(x[1],9),
  encodePayload:encodePuzzle,decodePayload:x=>{const p=decodePuzzle(x);return p?.kind===engine?p:null;},
  create:d=>({values:[...d.payload.givens],edits:0}),
  validState:(x,d):x is LatinState=>plain(x)&&exactKeys(x,['values','edits'])&&uint(x.edits,2147483647)&&Array.isArray(x.values)&&x.values.length===d.payload.givens.length&&x.values.every((v,i)=>uint(v,d.payload.kind==='cross-sums'?9:d.payload.size)&&(!d.payload.givens[i]||v===d.payload.givens[i])&&(!d.payload.mask[i]||v===0)),
  reduce:(s,[cell,value],d)=>{const p=d.payload;if(cell>=s.values.length||p.mask[cell]||p.givens[cell]||s.values[cell]===value||value>(p.kind==='cross-sums'?9:p.size))return s;const values=[...s.values];values[cell]=value;return {values,edits:s.edits+1};},
  actions:(s,d)=>cellsOf(d.payload).filter(i=>!d.payload.givens[i]).flatMap(i=>Array.from({length:d.payload.kind==='cross-sums'?9:d.payload.size},(_,v)=>[i,v+1] as const)),
  solved:(s,d)=>solved(d.payload,s.values),metrics:s=>({placements:s.edits}),
  solve:(d,budget)=>{const r=search(d.payload,1,budget);if(r.status==='budget-exhausted')return {status:'budget-exhausted',nodes:r.nodes};if(!r.first)return {status:'unsolved'};const witness=r.first.flatMap((v,i)=>!d.payload.mask[i]&&!d.payload.givens[i]?[[i,v] as const]:[]);return {status:'solved',witness,metric:'placements',lower:witness.length,upper:witness.length,exact:true};},
  count:(d,cap,budget)=>search(d.payload,cap,budget),independentCount:(d,cap,budget)=>independentCount(d.payload,cap,budget),
  technique:(d,budget)=>{const r=grade(d.payload,budget);return r.status==='complete'?{status:'complete',ceiling:r.ceiling,steps:r.steps.length,trace:JSON.stringify(r.steps)}:{status:'stalled'};},
  hint:(s,d)=>logicalHint(d.payload,s.values),progress:s=>s.values.filter(Boolean).length,
  semanticKey:d=>semanticKey(d.payload),solutionHash:s=>sha256Hex(s.values.join('')),
};}
