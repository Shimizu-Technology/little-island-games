import { exactKeys, plain, uint } from '../../state/saveBits';
import { sha256Hex } from '../sha256';
import type { DescriptorCore, PuzzleAdapter } from '../types';
import { advise, publicView } from './publicSolver';
import { solve } from './solver';
import { apply, CARD_ALPHABET, legalMoves, modes, opening, positionKey, validDeal, validMove, validPosition, won, type Deal, type Move, type Position } from './solitaire';
export type TableState = { position: Position; edits: number };
export type Plan = readonly Move[];
export const validPlan = (x: unknown): x is Plan => Array.isArray(x) && x.length>0 && x.length<=8 && x.every(validMove);
export function semanticKey(d: Deal): string {
  const maps:number[][]=[];
  for(const blacks of [[0,2],[2,0]])for(const reds of [[1,3],[3,1]])for(const swap of [0,1]) {
    const map=[blacks[0],reds[0],blacks[1],reds[1]].map(s=>swap?s^1:s);
    maps.push(map);
  }
  const encoded=maps.map(map=>{const cards=[...d.cards].map(c=>{const n=CARD_ALPHABET.indexOf(c);return CARD_ALPHABET[map[Math.floor(n/13)]*13+n%13];}).join('');return d.mode==='freecell'?opening({...d,cards}).piles.slice(0,8).map(p=>p.map(c=>CARD_ALPHABET[c]).join('')).sort().join('|'):cards;});
  return `${d.mode}|${encoded.sort()[0]}`;
}
export function solitaireAdapter(hidden: boolean): PuzzleAdapter<Deal, TableState, Plan> {
  const adapter: PuzzleAdapter<Deal, TableState, Plan> = {
    engine:'solitaire',rules:1,needsCheck:false,isPayload:validDeal,isAction:validPlan,
    encodePayload:d=>[modes.indexOf(d.mode),d.cards],
    decodePayload:x=>{if(!Array.isArray(x)||x.length!==2||!uint(x[0],2))return null;const d={mode:modes[x[0]],cards:x[1]};return validDeal(d)?d:null;},
    create:d=>({position:opening(d.payload),edits:0}),
    validState:(x,d): x is TableState=>plain(x)&&exactKeys(x,['position','edits'])&&uint(x.edits,2147483647)&&validPosition(x.position,d.payload.mode),
    reduce:(s,plan,d)=>{let p=s.position;for(const a of plan){const next=apply(p,d.payload.mode,a);if(next===p)return s;p=next;}return {position:p,edits:s.edits+plan.length};},
    actions:(s,d)=>legalMoves(s.position,d.payload.mode).map(a=>[a]),
    solved:s=>won(s.position),metrics:s=>({turns:s.edits}),
    solve:(d,budget)=>{const r=solve(d.payload,undefined,Math.min(10000,budget));return r.status==='solved'?{status:'solved',witness:r.moves.map(a=>[a]),metric:'turns',lower:52,upper:r.moves.length,exact:r.moves.length===52}:r.status==='unsolved'?{status:'unsolved'}:r;},
    hint:(s,d)=>{const r=advise(s.position,d.payload,10000);return r.kind==='move'?r.plan:null;},
    semanticKey:d=>semanticKey(d.payload),
    progress:s=>s.position.piles.slice(8,12).reduce((a,p)=>a+p.length,0),
    solutionHash:s=>sha256Hex(positionKey(s.position)),
  };
  if(hidden) adapter.hidden={
    view:(s,d)=>publicView(s.position,d.payload),
    twins:(s,d)=>{
      const unknown=s.position.piles.flat().filter(c=>!s.position.known[c]);if(unknown.length<2)return [];
      const [a,b]=unknown,swap=(c:number)=>c===a?b:c===b?a:c;
      const other: DescriptorCore<Deal>={...d,payload:{...d.payload,cards:[...d.payload.cards].map(c=>CARD_ALPHABET[swap(CARD_ALPHABET.indexOf(c))]).join('')}};
      return [{descriptor:other,state:{...s,position:{...s.position,piles:s.position.piles.map(p=>p.map(swap))}}}];
    },
  };
  return adapter;
}
