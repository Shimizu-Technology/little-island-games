import {readFileSync} from 'node:fs';
import {describe,expect,it,vi} from 'vitest';
import {apply,DECK,DRAW,legalMoves,makeDeal,opening,RECYCLE,validPosition,type Deal} from '../src/puzzles/table/solitaire';
import {advise,adviseAsync,publicView} from '../src/puzzles/table/publicSolver';
import {decodeBoard,encodeBoard,fresh,moveTable,readTable,undoTable} from '../src/puzzles/table/checkpoint';
import {lineFromProof} from '../src/puzzles/table/proof';
import {solve} from '../src/puzzles/table/solver';
import {solitaireAdapter} from '../src/puzzles/table/adapter';
import {decodeRow} from '../src/puzzles/descriptor';
const rows=(slot:number)=>readFileSync(`src/content/puzzles/assets/p${slot}.lipuzzle`,'utf8').trim().split('\n').slice(1).map(l=>JSON.parse(l));
const deal=(row:ReturnType<typeof rows>[number]):Deal=>({mode:'freecell',cards:row[3][1],proof:row[3][2]});
describe('Solitaire review regressions',()=>{
 it('hints off the certified FreeCell line wherever the 10,000-node engine solves the reviewer sample',()=>{
  let solved=0;
  for(const slot of [107,108,109])for(const row of rows(slot).slice(0,12)){
   const d=deal(row),line=lineFromProof(d)!;let s=opening(d);for(const a of line.slice(0,3))s=apply(s,d.mode,a);
   const off=legalMoves(s,d.mode).find(a=>a[0]!==line[3][0]||a[1]!==line[3][1]);if(!off)continue;s=apply(s,d.mode,off);
   // Ask before running solve: a successful solve primes the hint cache.
   const hint=advise(s,d,10000),full=solve(d,s,10000);
   if(full.status==='solved'){solved++;expect(hint.kind,`${slot}/${row[0]}`).toBe('move');}
  }
  expect(solved).toBeGreaterThanOrEqual(28);
 });
 it('uses a wall-clock bound and leaves a cancelled search unknown',async()=>{
  const d=makeDeal('freecell',4),clock=vi.spyOn(performance,'now');let ms=0;clock.mockImplementation(()=>ms+=1000);
  try{expect(await adviseAsync(opening(d),d,new AbortController().signal,10000)).toEqual({kind:'unknown'});}finally{clock.mockRestore();}
  const abort=new AbortController();abort.abort();expect(await adviseAsync(opening(d),d,abort.signal,10000)).toEqual({kind:'unknown'});
 });
 it.each(['draw-one','draw-three']as const)('stops cycling a fully public stuck %s stock',mode=>{
  const tops=[1,2,3,4,5,6,7];
  const stock=DECK.filter(c=>!tops.includes(c)&&c%13>0&&(Math.floor(c/13)%2===0||c%13>=7)).slice(0,24);
  const covered=DECK.filter(c=>!tops.includes(c)&&!stock.includes(c));
  const piles=Array.from({length:7},(_,i)=>[...covered.splice(0,i),tops[i]]),cards:number[]=[];
  for(let row=0;row<7;row++)for(let col=row;col<7;col++)cards.push(piles[col][row]);cards.push(...stock.slice().reverse());
  const d:Deal={mode,cards};let s=opening(d);while(s.piles[12].length)s=apply(s,mode,DRAW);s=apply(s,mode,RECYCLE);
  expect(validPosition(s,mode)).toBe(true);
  expect(advise(s,d,10000)).toEqual({kind:'unknown'});
  const unseen={...s,known:s.known.map((k,c)=>s.piles[12].includes(c)?0:k)};
  expect(publicView(unseen,d).piles[12]).toContain(-1);expect(advise(unseen,d,10000).kind).toBe('move');
 });
 it('still draws when a foundation return makes the known waste useful',()=>{
  const s={piles:Array.from({length:16},():number[]=>[]),hidden:Array<number>(8).fill(0),known:Array<number>(52).fill(1)};
  s.piles[2]=[25];for(let i=0;i<4;i++)s.piles[8+i]=DECK.slice(i*13,i*13+(i===1?10:13));s.piles[12]=[24,23];
  const d=makeDeal('draw-three',1);expect(validPosition(s,d.mode)).toBe(true);expect(advise(s,d,10000)).toMatchObject({kind:'move',move:DRAW});
 });
 it('rejects all-52-known cold forgery and preserves the original payload',()=>{
  const d=makeDeal('draw-one',1),p=moveTable(d,fresh(d),DRAW)!,s=decodeBoard(p.board,d)!;
  const forged={...p,board:encodeBoard({...s,known:Array<number>(52).fill(1)})},before=JSON.stringify(forged);
  expect(readTable(JSON.parse(before),d)).toBeNull();expect(JSON.stringify(forged)).toBe(before);
 });
 it('undo persists exactly replay-proven knowledge, including a cold resume',()=>{
  const d=makeDeal('draw-one',1),p=undoTable(d,moveTable(d,fresh(d),DRAW)!)!;
  expect(decodeBoard(p.board,d)!.known).toEqual(opening(d).known);expect(readTable(JSON.parse(JSON.stringify(p)),d)).not.toBeNull();
 });
 it('allows the family foundation-to-column variant, forbids foundation-to-cell',()=>{
  const d=makeDeal('freecell',4),s=opening(d),ace=s.piles.flat().find(c=>c===0)!;
  s.piles=s.piles.map(p=>p.filter(c=>c!==ace));s.piles[8]=[ace];expect(validPosition(s,d.mode)).toBe(true);
  expect(apply(s,d.mode,[8,12,1])).toBe(s);s.piles[0].push(...s.piles[1].splice(0));expect(apply(s,d.mode,[8,1,1])).not.toBe(s);
 });
 it('gives every bank a real technique trace',()=>{
  for(const slot of [100,101,102,103,104,105,106,107,108,109]){
   const free=slot>=106,adapter=solitaireAdapter(!free),band=free?['f1','f3','f5','f6'][slot-106]:`${slot<103?'o':'t'}${[1,3,6][slot%3]}`,d=decodeRow(JSON.stringify(rows(slot)[0]),band,adapter)!;
   const trace=adapter.technique?.(d,10000);expect(trace?.status).toBe('complete');
   if(trace?.status==='complete'){expect(trace.ceiling).toMatch(free?/^search-/:/^plan-/);expect(trace.steps).toBeGreaterThan(0);expect(JSON.parse(trace.trace)).toHaveProperty(free?'observed':'depth');}
  }
 });
 it('every Paddling certificate needs a few tableau decisions while remaining easy',()=>{
  for(const row of rows(106)){const d=deal(row),line=lineFromProof(d)!;expect(line.filter(a=>a[1]<8||a[1]>=12).length,`${row[0]}`).toBeGreaterThanOrEqual(3);expect(line.filter(a=>a[1]<8||a[1]>=12).length).toBeLessThanOrEqual(12);const r=solve(d,undefined,10000);expect(r.status).toBe('solved');if(r.status==='solved')expect(r.nodes).toBeLessThan(400);}
 });
});
