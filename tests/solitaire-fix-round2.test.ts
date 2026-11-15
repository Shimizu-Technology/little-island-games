import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {apply,opening,positionKey,won,type Deal,type Move,type Position} from '../src/puzzles/table/solitaire';
import {advise,type PreviousMove} from '../src/puzzles/table/publicSolver';
import {decodeBoard,fresh,moveTable,readTable} from '../src/puzzles/table/solitaireCheckpoint';
import {decodeRow} from '../src/puzzles/descriptor';
import {solitaireAdapter} from '../src/puzzles/table/adapter';
import selection from '../scripts/puzzles/solitaire/selected-rows.json';
const key=(s:Position)=>`${positionKey(s)}#${s.known}`;
const descriptor=(slot:number,row:string)=>decodeRow(row,selection.banks.find(b=>b.slot===slot)!.band,solitaireAdapter(slot<106))!;
it('keeps all 512 selected rows byte-identical to 9532ba72 and in their original order after the claim',()=>{
 let count=0;
 for(const b of selection.banks){
  const old=execFileSync('git',['show',`${selection.sourceSha}:src/content/puzzles/assets/p${b.slot}.lipuzzle`],{encoding:'utf8'}).trimEnd().split('\n').slice(1);
  const installed=readFileSync(`src/content/puzzles/assets/p${b.slot}.lipuzzle`,'utf8').trimEnd().split('\n');
  expect(b.rows,`source selection ${b.slot}`).toEqual(old);expect(installed.slice(1),`installed ${b.slot}`).toEqual(old);
  expect(JSON.parse(installed[0]).first).toBe(b.slot*1024);count+=old.length;
 }
 expect(count).toBe(512);
});
it('re-asking after every single hint step wins all 256 Klondike deals, including the reviewer\'s 45 cycles',()=>{
 let wins=0;
 for(const b of selection.banks.filter(b=>b.slot<106))for(const row of b.rows){
  const d=descriptor(b.slot,row).payload;let s=opening(d),previous:PreviousMove|undefined;const seen=new Set<string>();
  for(let step=0;step<800&&!won(s);step++){
   expect(seen.has(key(s)),`${b.slot}/${JSON.parse(row)[0]} cycle at ${step}`).toBe(false);seen.add(key(s));
   const h=advise(s,d,10000,previous);expect(h.kind,`${b.slot}/${JSON.parse(row)[0]} at ${step}`).toBe('move');if(h.kind!=='move')break;
   const n=apply(s,d.mode,h.move);expect(n).not.toBe(s);
   if(previous)expect(positionKey(n),`immediate reversal ${b.slot}/${JSON.parse(row)[0]}`).not.toBe(positionKey(previous.before));
   previous={before:s,move:h.move};s=n;
  }
  expect(won(s),`${b.slot}/${JSON.parse(row)[0]}`).toBe(true);wins++;
 }
 expect(wins).toBe(256);
});
it('rebuilds a public foundation-return continuation after a truly cold checkpoint and deal object',()=>{
 const b=selection.banks.find(b=>b.slot===101)!,row=b.rows.find(row=>JSON.parse(row)[0]===33554601)!;
 const d=descriptor(b.slot,row).payload;let p=fresh(d);let found=false;
 for(let i=0;i<256;i++){
  const r=readTable(p,d)!,h=advise(r.position,d,10000);expect(h.kind).toBe('move');if(h.kind!=='move')break;
  if(h.plan.length>1&&h.move[0]>=8&&h.move[0]<12){
   p=moveTable(d,p,h.move)!;const coldDeal=JSON.parse(JSON.stringify(d)) as Deal,cold=readTable(JSON.parse(JSON.stringify(p)),coldDeal)!;
   const previous={before:decodeBoard(cold.path.at(-2)!,coldDeal)!,move:h.move};
   const next=advise(cold.position,coldDeal,10000,previous);expect(next.kind).toBe('move');
   if(next.kind==='move'){expect(next.move).toEqual(h.plan[1]);expect(apply(cold.position,coldDeal.mode,next.move).piles).not.toEqual(previous.before.piles);}
   found=true;break;
  }
  for(const m of h.plan)p=moveTable(d,p,m)!;
 }
 expect(found).toBe(true);
});
it('does not immediately reverse a player foundation return that was not the previous hint',()=>{
 const d:Deal={mode:'draw-one',cards:Array.from({length:52},(_,i)=>i)},before=opening(d);
 // A valid late visible position with a low card deliberately moved out by the player.
 before.piles=Array.from({length:16},()=>[]);before.hidden.fill(0);before.known.fill(1);
 before.piles[8]=[0];before.piles[1]=[14];before.piles[0]=Array.from({length:51},(_,i)=>i+1).filter(c=>c!==14);
 const move:Move=[8,1,1],s=apply(before,d.mode,move);expect(s).not.toBe(before);
 const h=advise(s,d,10000,{before,move});
 if(h.kind==='move')expect(apply(s,d.mode,h.move).piles).not.toEqual(before.piles);
});
it('FreeCell receipt techniques name actual observed operations and provenance identifies the exact selection',()=>{
 for(const b of selection.banks.filter(b=>b.slot>=106)){
  const r=JSON.parse(readFileSync(`content/puzzles/receipts/freecell/slot-${String(b.slot).padStart(4,'0')}.json`,'utf8'));
  expect(r.provenance.note).toContain('selected-rows.json');expect(r.provenance.note).toContain('Historical search totals unavailable');
  expect(Object.keys(r.histograms.technique).every(k=>!k.startsWith('search-'))).toBe(true);
  expect(Object.keys(r.histograms.technique).join()).toContain('build-and-uncover');
  expect(b.curation.script).toContain(b.slot===106?'recurate-paddling':'recurate-advanced');expect(b.curation.sourcePools.length).toBeGreaterThan(0);
 }
});
