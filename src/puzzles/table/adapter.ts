import { exactKeys, plain, uint } from '../../state/saveBits';
import { sha256Hex } from '../sha256';
import type { DescriptorCore, PuzzleAdapter } from '../types';
import { gradePublic, progressWithin } from './grading';
import { advise, publicView } from './publicSolver';
import {lineFromProof} from './proof';
import { solve } from './solver';
import { apply, legalMoves, modes, opening, positionKey, validDeal, validMove, validPosition, won, type Deal, type Move, type Position } from './solitaire';
export type TableState = { position: Position; edits: number };
export type Plan = readonly Move[];
export const validPlan = (x: unknown): x is Plan => Array.isArray(x) && x.length>0 && x.length<=8 && x.every(validMove);
export function semanticKey(d: Deal): string {
  const maps:number[][]=[];
  for(const blacks of [[0,2],[2,0]])for(const reds of [[1,3],[3,1]])for(const swap of [0,1]) {
    const map=[blacks[0],reds[0],blacks[1],reds[1]].map(s=>swap?s^1:s);
    maps.push(map);
  }
  const encoded=maps.map(map=>{const cards=d.cards.map(n=>map[Math.floor(n/13)]*13+n%13);return d.mode==='freecell'?opening({...d,cards}).piles.slice(0,8).map(p=>p.map(c=>String(c).padStart(2,'0')).join('.')).sort().join('|'):cards.map(c=>String(c).padStart(2,'0')).join('.');});
  return `${d.mode}|${encoded.sort()[0]}`;
}
export function solitaireAdapter(hidden: boolean): PuzzleAdapter<Deal, TableState, Plan> {
  const adapter: PuzzleAdapter<Deal, TableState, Plan> = {
    engine:'solitaire',rules:1,needsCheck:false,isPayload:(x):x is Deal=>validDeal(x)&&(hidden?x.mode!=='freecell':x.mode==='freecell'&&lineFromProof(x)!==null),isAction:validPlan,
    encodePayload:d=>[modes.indexOf(d.mode),d.cards,...(d.proof!==undefined?[d.proof]:[])],
    decodePayload:x=>{if(!Array.isArray(x)||(x.length!==2&&x.length!==3)||!uint(x[0],2))return null;const d={mode:modes[x[0]],cards:x[1],...(x.length===3?{proof:x[2]}:{})};return validDeal(d)?d:null;},
    create:d=>({position:opening(d.payload),edits:0}),
    validState:(x,d): x is TableState=>plain(x)&&exactKeys(x,['position','edits'])&&uint(x.edits,2147483647)&&validPosition(x.position,d.payload.mode),
    reduce:(s,plan,d)=>{let p=s.position;for(const a of plan){const next=apply(p,d.payload.mode,a);if(next===p)return s;p=next;}return {position:p,edits:s.edits+plan.length};},
    actions:(s,d)=>legalMoves(s.position,d.payload.mode).map(a=>[a]),
    solved:s=>won(s.position),metrics:s=>({turns:s.edits}),
    solve:(d,budget)=>{const proof=lineFromProof(d.payload);if(proof)return{status:'solved',witness:proof.map(a=>[a]),metric:'turns',lower:52,upper:proof.length,exact:proof.length===52};const r=solve(d.payload,undefined,Math.min(10000,budget));return r.status==='solved'?{status:'solved',witness:r.moves.map(a=>[a]),metric:'turns',lower:52,upper:r.moves.length,exact:r.moves.length===52}:r.status==='unsolved'?{status:'unsolved'}:r;},
    hint:(s,d)=>{const r=advise(s.position,d.payload,10000);return r.kind==='move'?r.plan:null;},
    technique:(d,budget)=>{
      if(d.payload.mode==='freecell'){
        const r=solve(d.payload,undefined,Math.min(10000,budget));if(r.status!=='solved')return{status:'stalled'};
        return{status:'complete',ceiling:[...r.techniques].sort().join(" + "),steps:r.moves.length,trace:JSON.stringify({nodes:r.nodes,branches:r.branches,moves:r.moves,observed:r.techniques})};
      }
      const g=gradePublic(d.payload);return g.complete?{status:'complete',ceiling:`plan-${g.depth}`,steps:g.steps,trace:JSON.stringify({depth:g.depth,steps:g.steps})}:{status:'stalled'};
    },
    claims:(d,budget)=>{
      const mode=d.payload.mode,prefix=mode==='freecell'?'f':mode==='draw-one'?'o':'t',tier=Number(d.band.slice(1));
      if(mode==='freecell'){const r=solve(d.payload,undefined,Math.min(10000,budget));if(r.status!=='solved')return[{id:'solver-grade',proven:false,evidence:r.status}];const graded=r.nodes<400?1:r.nodes<1500?3:r.nodes<4000?5:6;return[{id:'solver-grade',proven:d.band[0]===prefix&&tier===graded&&d.teaches.join()===`search-${graded}`,evidence:JSON.stringify({nodes:r.nodes,branches:r.branches,moves:r.moves.length,observed:r.techniques})}];}
      const g=gradePublic(d.payload),graded=g.depth<=1?1:g.depth<=3?3:6,proof=g.bottleneck?progressWithin(g.bottleneck,d.payload,g.depth-1,Math.max(40000,budget)):null;
      return[{id:'public-plan',proven:g.complete&&d.band[0]===prefix&&tier===graded&&d.teaches.join()===`plan-${g.depth}`&&proof?.status==='blocked',evidence:JSON.stringify({depth:g.depth,steps:g.steps,counterfactual:proof,publicState:g.bottleneck?sha256Hex(positionKey(publicView(g.bottleneck,d.payload))):null})}];
    },
    semanticKey:d=>semanticKey(d.payload),
    progress:s=>s.position.piles.slice(8,12).reduce((a,p)=>a+p.length,0),
    solutionHash:s=>sha256Hex(positionKey(s.position)),
  };
  if(hidden) adapter.hidden={
    view:(s,d)=>publicView(s.position,d.payload),
    twins:(s,d)=>{
      const unknown=s.position.piles.flat().filter(c=>!s.position.known[c]);if(unknown.length<2)return [];
      const [a,b]=unknown,swap=(c:number)=>c===a?b:c===b?a:c;
      const other: DescriptorCore<Deal>={...d,payload:{...d.payload,cards:d.payload.cards.map(swap)}};
      return [{descriptor:other,state:{...s,position:{...s.position,piles:s.position.piles.map(p=>p.map(swap))}}}];
    },
  };
  return adapter;
}
