import type { DescriptorCore, FamilySpec } from '../../../src/puzzles/types';
import { solitaireAdapter, type Plan } from '../../../src/puzzles/table/adapter';
import { gradePublic } from '../../../src/puzzles/table/grading';
import { solve } from '../../../src/puzzles/table/solver';
import { type Deal, type Mode } from '../../../src/puzzles/table/solitaire';
import {construct} from './generate';
import { verifyLine } from './independent';

export type Rung = {id:string; mode:Mode; tier:1|2|3|4|5|6; target:number; floor:number; title:string};
export const rungs: Rung[] = [
 ...(['draw-one','draw-three'] as const).flatMap((mode,i)=>[
  {id:`${i?'t':'o'}1`,mode,tier:1 as const,target:128,floor:16,title:`Klondike ${i?'draw 3':'draw 1'} · Paddling`},
  {id:`${i?'t':'o'}3`,mode,tier:3 as const,target:192,floor:48,title:`Klondike ${i?'draw 3':'draw 1'} · Lagoon`},
  {id:`${i?'t':'o'}6`,mode,tier:6 as const,target:192,floor:64,title:`Klondike ${i?'draw 3':'draw 1'} · Trench`},
 ]),
 ...([{id:'f1',tier:1,target:128,floor:32,title:'Paddling'},{id:'f3',tier:3,target:256,floor:64,title:'Lagoon'},{id:'f5',tier:5,target:320,floor:64,title:'Deep'},{id:'f6',tier:6,target:320,floor:96,title:'Trench'}] as const).map(r=>({...r,mode:'freecell' as const,title:`FreeCell · ${r.title}`})),
];
export type Candidate = { seed:number; template:string; core:DescriptorCore<Deal>; nodes:number; branches:number; moves:number; depth:number; workload:number };
/** No hidden answer is used along the hinted route. A cycle is rejected, never labelled difficult. */
export function judge(seed:number,r:Rung):Candidate|null {
 const built=construct(r.mode,seed,r.tier),d=built.deal,solved=solve(d,undefined,10000);
 if(solved.status!=='solved'||!verifyLine(d.cards,d.mode,solved.moves))return null;
 const gradedPublic=r.mode==='freecell'?null:gradePublic(d);if(gradedPublic&&!gradedPublic.complete)return null;const depth=gradedPublic?.depth??1;
 const tier=r.mode==='freecell'?(solved.nodes<400?1:solved.nodes<1500?3:solved.nodes<4000?5:6):(depth<=1?1:depth<=3?3:6);
 if(tier!==r.tier)return null;
 const t=built.template,teaches=r.mode==='freecell'?`search-${r.tier}`:`plan-${depth}`;
 const core:DescriptorCore<Deal>={format:1,seed,rng:1,band:r.id,layout:t,template:t,payload:d,objectives:[],limits:[{metric:'turns',max:1024}],par:null,teaches:[teaches],speech:null};
 return {core,seed,template:t,nodes:solved.nodes,branches:solved.branches,moves:solved.moves.length,depth,workload:r.mode==='freecell'?solved.nodes:depth};
}
export const family=(free:boolean):FamilySpec<Deal>=>({
 id:free?'freecell':'solitaire',adapter:solitaireAdapter(!free),bands:rungs.filter(r=>(r.mode==='freecell')===free).map(r=>({id:r.id,target:r.target,floor:r.floor,advanced:r.tier>=3})),
 sources:['src/puzzles/table/solitaire.ts','src/puzzles/table/solver.ts','src/puzzles/table/publicSolver.ts','src/puzzles/table/grading.ts','src/puzzles/table/adapter.ts','scripts/puzzles/solitaire/family.ts','scripts/puzzles/solitaire/generate.ts','scripts/puzzles/solitaire/independent.ts'],
 provenance:{source:'original',note:'Original shuffled deals, bounded search witness, independent rules replay. Winning-line promise only; solver effort is not a calibrated human rating.'},review:{ids:[],complete:false},maxRowBytes:128,requiresUnique:false,requiresTrace:false,hiddenInformation:!free,
 generate:(seed,band)=>{const r=rungs.find(r=>r.id===band.id);return r?judge(seed,r)?.core??null:null;},
});
export const klondike=family(false),freecell=family(true);
export type {Plan};
