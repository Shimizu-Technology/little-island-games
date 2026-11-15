import { describe, expect, it } from 'vitest';
import { apply, DECK, columns, DRAW, legalMoves, makeDeal, opening, RECYCLE, validDeal, validPosition, won } from '../src/puzzles/table/solitaire';
import { decodeBoard, encodeBoard, fresh, history, moveTable, readTable, undoTable } from '../src/puzzles/table/solitaireCheckpoint';
import { solve } from '../src/puzzles/table/solver';
import { advise, publicView } from '../src/puzzles/table/publicSolver';
import {capFixture,tallFixture} from '../scripts/puzzles/solitaire/qa-fixtures';
import { jsonBytes } from '../src/state/saveBits';

describe('Solitaire table feasibility', () => {
 it('deals all 52 cards once with standard Klondike and FreeCell layouts', () => {
  for(const mode of ['draw-one','draw-three','freecell'] as const) {
   const d=makeDeal(mode,4), s=opening(d);
   expect(validDeal(d)).toBe(true); expect(validPosition(s,mode)).toBe(true);
   expect(s.piles.slice(0,columns(mode)).map(p=>p.length)).toEqual(mode==='freecell'?[7,7,7,7,6,6,6,6]:[1,2,3,4,5,6,7]);
   expect(new Set(s.piles.flat()).size).toBe(52);
  }
  expect(validDeal({mode:'freecell',cards:Array<number>(52).fill(0)})).toBe(false);
  expect(validDeal({mode:'freecell',cards:DECK,extra:1})).toBe(false);
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
  const d=makeDeal('freecell',4);let p=capFixture(d).payload;
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
  const other={...d,cards:d.cards.map(swap)};
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
 expect(semanticKey({...d,cards:deck})).toBe(semanticKey(d));
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

it('validates cold resumes and invalidates cached validation when a caller changes the payload',()=>{
 const d=makeDeal('draw-three',1),p=fresh(d),before=JSON.stringify(p),read=readTable(p,d)!;
 expect(Object.isFrozen(read.position.piles[0])).toBe(true);expect(Object.isFrozen(p)).toBe(false);expect(JSON.stringify(p)).toBe(before);
 p.board='';expect(readTable(p,d)).toBeNull();
 const moved=moveTable(d,fresh(d),DRAW)!,undone=undoTable(d,moved)!;
 expect(readTable(JSON.parse(JSON.stringify(undone)),d)!.position.piles).toEqual(opening(d).piles);
});

it('draw-three records and exactly undoes a final one-card or two-card draw',()=>{
 for(const removed of [1,2]){
  const reserved=new Map([[0,39],[50,13],[51,0]]),rest=DECK.filter(c=>![39,13,0].includes(c)),d={mode:'draw-three'as const,cards:Array.from({length:52},(_,i)=>reserved.get(i)??rest.shift()!)};let p=fresh(d);
  for(let i=0;i<8;i++)p=moveTable(d,p,DRAW)!;p=moveTable(d,p,[13,8,1])!;if(removed===2)p=moveTable(d,p,[13,9,1])!;
  p=moveTable(d,p,RECYCLE)!;
  // A newly homed tableau Ace makes the final draw distinct from the prior stock-empty state.
  p=moveTable(d,p,[0,11,1])!;while(readTable(p,d)!.position.piles[12].length>3)p=moveTable(d,p,DRAW)!;
  const before=p;expect(readTable(before,d)!.position.piles[12]).toHaveLength(3-removed);
  const after=moveTable(d,before,DRAW)!;expect(readTable(after,d)!.position.piles[12]).toHaveLength(0);expect(history(after.undo)!.length).toBe(history(before.undo)!.length+1);
  expect(undoTable(d,after)!.board).toBe(before.board);
 }
});

it('backs the Klondike planning grade with a shorter-plan counterfactual',async()=>{
 const {gradePublic,progressWithin}=await import('../src/puzzles/table/grading');
 const d=makeDeal('draw-three',10),g=gradePublic(d);expect(g.complete).toBe(true);expect(g.depth).toBe(8);
 expect(progressWithin(g.bottleneck!,d,7).status).toBe('blocked');
 expect(progressWithin(g.bottleneck!,d,7,0).status).toBe('budget-exhausted');
});

it('loads each FreeCell winning certificate with its own deal, validates all steps, and rejects extra choices',async()=>{
 const {construct}=await import('../scripts/puzzles/solitaire/generate'),{proofForLine,lineFromProof}=await import('../src/puzzles/table/proof'),{solitaireAdapter}=await import('../src/puzzles/table/adapter');
 const adapter=solitaireAdapter(false);
 for(const d of [construct('freecell',4,1).deal,makeDeal('freecell',4)]){
  const r=solve(d,undefined,3000);expect(r.status).toBe('solved');if(r.status!=='solved')return;
  const certified={...d,proof:proofForLine(d,r.moves)};
  expect(lineFromProof(certified)).toEqual(r.moves);expect(adapter.isPayload(certified)).toBe(true);
  expect(adapter.decodePayload(adapter.encodePayload(certified))).toEqual(certified);
  expect(lineFromProof({...certified,proof:certified.proof+'00'})).toBeNull();
  expect(lineFromProof({...certified,proof:'ff0000'})).toBeNull();
  certified.proof+='00';expect(lineFromProof(certified)).toBeNull();
 }
 expect(adapter.isPayload(makeDeal('freecell',1))).toBe(false);
 expect(validDeal({mode:'draw-one',cards:DECK,proof:''})).toBe(false);
 expect(validDeal({mode:'draw-one',cards:Array(52)})).toBe(false);
});

it('rejects malformed move coordinates and retains a valid arrangement along wandering play',async()=>{
 const{canMove}=await import('../src/puzzles/table/solitaire');
 for(const mode of ['draw-one','draw-three','freecell'] as const){
  const d=makeDeal(mode,4);let s=opening(d);
  for(let i=0;i<50;i++){
   const moves=legalMoves(s,mode);for(const a of moves)expect(canMove(s,mode,a)).toBe(true);
   for(const a of [[0,1,-1],[0,1,1.5],[-1,1,1],[0,16,1],[0,0,1]] as const){expect(canMove(s,mode,a)).toBe(false);expect(apply(s,mode,a)).toBe(s);}
   if(!moves.length)break;s=apply(s,mode,moves[i%moves.length]);expect(validPosition(s,mode)).toBe(true);
  }
 }
});

it('FreeCell supermoves use only spare cells and spare columns other than their destination',()=>{
 const make=(cells:number,empty:number[])=>{
  const piles=Array.from({length:16},():number[]=>[]),used=[3,15,1,17],rest=DECK.filter(c=>!used.includes(c));piles[0]=[3,15,1];piles[1]=[17];
  for(let i=0;i<cells;i++)piles[12+i]=[rest.pop()!];for(let i=2;i<8;i++)if(!empty.includes(i))piles[i]=[rest.pop()!];piles[7].push(...rest);
  return {piles,hidden:Array<number>(8).fill(0),known:Array<number>(52).fill(1)};
 };
 for(const cells of [4,3,2]){const s=make(cells,[]);expect(validPosition(s,'freecell')).toBe(true);expect(apply(s,'freecell',[0,1,3])!==s).toBe(cells===2);}
 const s=make(4,[2]);expect(apply(s,'freecell',[0,1,3])).toBe(s);
 const more=make(4,[2,3]);expect(apply(more,'freecell',[0,1,3])).not.toBe(more);
 const destination=make(4,[]);destination.piles[7].push(...destination.piles[1].splice(0));expect(apply(destination,'freecell',[0,1,3])).toBe(destination);
 const spare=make(4,[2,3]);spare.piles[7].push(...spare.piles[1].splice(0));expect(apply(spare,'freecell',[0,1,3])).not.toBe(spare);
});

// Cold storage must not treat an edit counter as evidence of an omitted opening path.
it('rejects an unproved completed arrangement even when its edit counter claims prior play',()=>{
 const d=makeDeal('freecell',4),p=fresh(d),piles=Array.from({length:16},():number[]=>[]);
 for(let i=0;i<4;i++)piles[8+i]=DECK.slice(i*13,i*13+13);
 const board=encodeBoard({piles,hidden:Array<number>(8).fill(0),known:Array<number>(52).fill(1)});
 for(const edits of [1,1025])expect(readTable({...p,board,edits},d)).toBeNull();
});

it('reaches the 19-card Klondike maximum layout through 24 legal moves and cold replays it',()=>{
 const{deal:d,payload:p}=tallFixture();expect(validDeal(d)).toBe(true);
 const cold=readTable(JSON.parse(JSON.stringify(p)),d)!;expect(cold).not.toBeNull();expect(cold.position.piles[6]).toHaveLength(19);expect(cold.position.hidden[6]).toBe(6);expect(cold.history).toHaveLength(24);
 const moved=moveTable(d,p,[6,8,1])!;expect(readTable(moved,d)!.position.piles[8]).toEqual([0]);
});

it('accepts record 1,024, refuses a distinct 1,025th, and accepts another move after undo',()=>{
 const{deal:d,payload:p,last,next}=capFixture(makeDeal('freecell',4));
 expect(history(p.undo)).toHaveLength(1024);expect(readTable(JSON.parse(JSON.stringify(p)),d)).not.toBeNull();
 const audited={...p,audit:[1,2]};expect(moveTable(d,audited,next)).toBeNull();expect(audited.audit).toEqual([1,2]);
 const undo=undoTable(d,audited)!;expect(history(undo.undo)).toHaveLength(1023);
 const again=moveTable(d,undo,last)!;expect(history(again.undo)).toHaveLength(1024);expect(again.edits).toBe(p.edits+2);expect(again.audit).toEqual([1,2]);
 expect(readTable(JSON.parse(JSON.stringify(again)),d)).not.toBeNull();
});

it('100 complete stock cycles truncate only exact known-card positions and retain edits and audit',()=>{
 for(const mode of ['draw-one','draw-three']as const){
  const d=makeDeal(mode,1),cycle=mode==='draw-one'?25:9;let p={...fresh(d),audit:[1,2]};
  for(let n=0;n<100;n++){
   for(let i=0;i<cycle-1;i++)p=moveTable(d,p,DRAW)!;p=moveTable(d,p,RECYCLE)!;
   expect(history(p.undo)).toHaveLength(cycle);expect(p.audit).toEqual([1,2]);expect(p.edits).toBe((n+1)*cycle);
   p=JSON.parse(JSON.stringify(p));expect(readTable(p,d)).not.toBeNull();
  }
  const undo=undoTable(d,p)!;expect(history(undo.undo)).toHaveLength(cycle-1);expect(readTable(undo,d)!.position.piles[12]).toEqual([]);expect(undo.audit).toEqual([1,2]);
 }
});
