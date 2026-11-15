import { describe, expect, it } from 'vitest';
import { apply, CARD_ALPHABET, columns, DRAW, legalMoves, makeDeal, opening, RECYCLE, validDeal, validPosition, won } from '../src/puzzles/table/solitaire';
import { decodeBoard, fresh, history, moveTable, readTable, undoTable } from '../src/puzzles/table/checkpoint';
import { solve } from '../src/puzzles/table/solver';
import { advise, publicView } from '../src/puzzles/table/publicSolver';
import { jsonBytes } from '../src/state/saveBits';

describe('Solitaire table feasibility', () => {
 it('deals all 52 cards once with standard Klondike and FreeCell layouts', () => {
  for(const mode of ['draw-one','draw-three','freecell'] as const) {
   const d=makeDeal(mode,4), s=opening(d);
   expect(validDeal(d)).toBe(true); expect(validPosition(s,mode)).toBe(true);
   expect(s.piles.slice(0,columns(mode)).map(p=>p.length)).toEqual(mode==='freecell'?[7,7,7,7,6,6,6,6]:[1,2,3,4,5,6,7]);
   expect(new Set(s.piles.flat()).size).toBe(52);
  }
  expect(validDeal({mode:'freecell',cards:'A'.repeat(52)})).toBe(false);
  expect(validDeal({mode:'freecell',cards:CARD_ALPHABET,extra:1})).toBe(false);
 });
 it('draws three, handles the last short draw, recycles in exact order, and undoes each operation', () => {
  const d=makeDeal('draw-three',1), start=fresh(d);let p=start;
  for(let i=0;i<8;i++)p=moveTable(d,p,DRAW)!;
  const s=decodeBoard(p.board,d)!; expect(s.piles[12]).toHaveLength(0);expect(s.piles[13]).toHaveLength(24);
  p=moveTable(d,p,RECYCLE)!;expect(decodeBoard(p.board,d)!.piles[12]).toEqual(opening(d).piles[12]);
  for(let i=0;i<9;i++)p=undoTable(d,p)!;
  expect(decodeBoard(p.board,d)!.piles).toEqual(opening(d).piles);
  expect(p.audit).toEqual([]);
 });
 it('retains all 1,024 reversible moves and a full audit inside the frozen session budget', () => {
  const d=makeDeal('draw-three',1);let p=fresh(d);
  for(let i=0;i<1024;i++){const s=decodeBoard(p.board,d)!; p=moveTable(d,p,s.piles[12].length?DRAW:RECYCLE)!;}
  p={...p,audit:Array<number>(128).fill(9999)};
  expect(history(p.undo)).toHaveLength(1024);expect(readTable(p,d)).not.toBeNull();
  const session={version:1,owner:'cove-'+'x'.repeat(35),game:'solitaire',id:'cove-'+'x'.repeat(40)+'-2147483646',ordinal:2147483646,revision:2147483647,puzzle:{bank:109,puzzle:1023,engine:'solitaire',rules:1,hash:'a'.repeat(64)},codec:'solitaire-v1',payload:p,selectedDares:[],partner:'cove-'+'x'.repeat(35),result:{event:'together',awards:0,dares:[],cost:null,solution:'a'.repeat(64)},credited:false};
  expect(jsonBytes(session)).toBeLessThanOrEqual(4096);
  for(let i=0;i<1024;i++) {p=undoTable(d,p)!;expect(p).not.toBeNull();}
  expect(p.audit).toHaveLength(128);expect(history(p.undo)).toHaveLength(0);
 });
 it('rejects forged history and illegal transfers without changing the accepted arrangement', () => {
  const d=makeDeal('freecell',4),p=fresh(d),s=opening(d);
  expect(apply(s,d.mode,[0,0,1])).toBe(s);expect(apply(s,d.mode,[0,12,2])).toBe(s);
  expect(readTable({...p,board:p.board.slice(0,-3)},d)).toBeNull();
  expect(readTable({...p,undo:'////'},d)).toBeNull();
  for(const a of legalMoves(s,d.mode)) {const q=moveTable(d,p,a)!;expect(readTable(q,d)).not.toBeNull(); expect(decodeBoard(undoTable(d,q)!.board,d)!.piles).toEqual(s.piles);}
 });
 it('solves an ordinary full FreeCell deal with legal moves and truthful nonoptimal bounds', () => {
  const d=makeDeal('freecell',4),r=solve(d,undefined,3000);expect(r.status).toBe('solved');
  if(r.status!=='solved')return;let s=opening(d);
  for(const a of r.moves){const next=apply(s,d.mode,a);expect(next).not.toBe(s);expect(validPosition(next,d.mode)).toBe(true);s=next;}
  expect(won(s)).toBe(true);expect(r.nodes).toBeGreaterThan(r.moves.length);
 });
 it('gives the same public Klondike hint when unknown cards are swapped', () => {
  const d=makeDeal('draw-three',1),s=opening(d),unknown=s.piles.flat().filter(c=>!s.known[c]),a=unknown[0],b=unknown[1];
  const swap=(c:number)=>c===a?b:c===b?a:c;
  const twin={...s,piles:s.piles.map(p=>p.map(swap))};
  const other={...d,cards:[...d.cards].map(c=>CARD_ALPHABET[swap(CARD_ALPHABET.indexOf(c))]).join('')};
  expect(publicView(s,d)).toEqual(publicView(twin,other)); expect(advise(s,d)).toEqual(advise(twin,other));
 });
});

it('an independent rule implementation accepts each constructed mode and rejects a forged line', async()=>{
 const {construct}=await import('../scripts/puzzles/solitaire/generate');
 const {verifyLine}=await import('../scripts/puzzles/solitaire/independent');
 for(const mode of ['draw-one','draw-three','freecell'] as const)for(let recipe=0;recipe<4;recipe++){
  const {deal}=construct(mode,recipe,1),r=solve(deal,undefined,500);
  expect(r.status).toBe('solved');if(r.status!=='solved')continue;
  expect(verifyLine(deal.cards,mode,r.moves)).toBe(true);
  expect(verifyLine(deal.cards,mode,[[0,12,2],...r.moves])).toBe(false);
  expect(verifyLine(deal.cards,mode,r.moves.slice(1))).toBe(false);
 }
});

it('counts equivalent FreeCell column orders as one semantic deal',async()=>{
 const {semanticKey}=await import('../src/puzzles/table/adapter');
 const d=makeDeal('freecell',4),s=opening(d),deck:number[]=[];
 [s.piles[0],s.piles[1]]=[s.piles[1],s.piles[0]];
 for(let row=0;row<7;row++)for(let col=0;col<8;col++)if(row<s.piles[col].length)deck.push(s.piles[col][row]);
 expect(semanticKey({...d,cards:deck.map(c=>CARD_ALPHABET[c]).join('')})).toBe(semanticKey(d));
});

it('proves a public FreeCell dead end and keeps an exhausted budget unknown',async()=>{
 const {advise}=await import('../src/puzzles/table/publicSolver');
 const d=makeDeal('freecell',4),tops=Array.from({length:8},(_,i)=>i+1),seconds=tops.map(c=>c+26),cells=[9,10,11,12],used=new Set([...tops,...seconds,...cells]);
 const rest=Array.from({length:52},(_,i)=>i).filter(c=>!used.has(c));
 const piles=Array.from({length:16},():number[]=>[]);for(let i=0;i<8;i++)piles[i]=[...rest.splice(0,4),seconds[i],tops[i]];for(let i=0;i<4;i++)piles[12+i]=[cells[i]];
 const position={piles,hidden:Array<number>(8).fill(0),known:Array<number>(52).fill(1)};
 expect(validPosition(position,d.mode)).toBe(true);expect(legalMoves(position,d.mode)).toHaveLength(0);
 expect(solve(d,position,10).status).toBe('unsolved');expect(advise(position,d)).toEqual({kind:'dead-end'});
 expect(solve(d,opening(d),0).status).toBe('budget-exhausted');
});
