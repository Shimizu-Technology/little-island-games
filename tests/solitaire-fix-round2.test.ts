import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import {apply,opening,positionKey,won,type Deal,type Move,type Position} from '../src/puzzles/table/solitaire';
import {advise,type PreviousMove} from '../src/puzzles/table/publicSolver';
import {decodeBoard,fresh,moveTable,readTable} from '../src/puzzles/table/solitaireCheckpoint';
import {decodeRow} from '../src/puzzles/descriptor';
import {solitaireAdapter} from '../src/puzzles/table/adapter';
import selection from '../scripts/puzzles/solitaire/selected-rows.json';
const baselineRowsHashes=["3c0f65bb8673fa419b9e89677d2dfe060a5e5e8efd2dbb1d4eb5f701239e47cc", "57505f7f714878032a034ed6b8671ea9be235fae068f65a39b9362144cecf553", "4d66a229e04c7c64dd7256cdffce43fe5660fa647d2727483ce959f0b5d008c8", "5ba7a0c6a38c8480f7a9b8a8551c48bba74f4c0113ae6f8f8a549dbffb2c89a4", "075e07a17ae274054f7629f8a608be4d56f088dc697228a6dcdf3d16f29f63a3", "d7c54542f0687618409e2b561cd1d4dc7619707e8f3523c664489c5a6243f942", "a398505da94b4e542c738ff34ae42a3c4ca4017e94d805a91791505661d6bfc6", "921da26f93c9325258d8e12ac47892442021e7063e067b199ddd9b903b309229", "83eac4c4cfe4f85ac1e646e329c85a8a9e2ddcbfe552cfc89acdb7296de9d20d", "56d105b041ac31c6f1ba97c74776ca13952ba2f2e05ef16d13772571476fa694"];
const key=(s:Position)=>`${positionKey(s)}#${s.known}`;
const descriptor=(slot:number,row:string)=>decodeRow(row,selection.banks.find(b=>b.slot===slot)!.band,solitaireAdapter(slot<106))!;
it('keeps all 512 selected rows byte-identical to 9532ba72 and in their original order after the claim',()=>{
 let count=0;
 for(const b of selection.banks){
  // Pinned before-claim bytes remain available after a squash merge or shallow
  // checkout; CI must not depend on an unpublished ancestor's git object.
  const old=b.rows;expect(selection.sourceSha).toBe('9532ba722c86609da6b67a05507b98a7a7ceb229');
  expect(createHash('sha256').update(old.join('\n')+'\n').digest('hex')).toBe(baselineRowsHashes[b.slot-100]);
  const installed=readFileSync(`src/content/puzzles/assets/p${b.slot}.lipuzzle`,'utf8').trimEnd().split('\n');
  expect(installed.slice(1),`installed ${b.slot}`).toEqual(old);
  expect(JSON.parse(installed[0]).first).toBe(b.slot*1024);count+=old.length;
 }
 expect(count).toBe(512);
 const root=JSON.parse(readFileSync('src/content/puzzles/root.json','utf8'));expect(root.nextSlot).toBeGreaterThanOrEqual(110);expect(root.nextOrdinal).toBeGreaterThanOrEqual(111712);
 const slots=root.families.flatMap((f:string[])=>JSON.parse(readFileSync(`src/content/puzzles/assets/${f[1]}.lipuzzle`,'utf8')).packs.map((p:number[])=>p[0]));
 expect(new Set(slots).size).toBe(slots.length);expect(slots.filter((n:number)=>n>=100&&n<=109).sort((a:number,b:number)=>a-b)).toEqual(Array.from({length:10},(_,i)=>100+i));
});
it('re-asking after every single hint step wins all 256 Klondike deals, including the reviewer\'s 45 cycles',()=>{
 let wins=0;
 for(const b of selection.banks.filter(b=>b.slot<106))for(const row of b.rows){
  const d=descriptor(b.slot,row).payload;let s=opening(d),previous:PreviousMove|undefined;const seen=new Set<string>();
  for(let step=0;step<800&&!won(s);step++){
   const h=advise(s,d,10000,previous),routeKey=key(s)+'|'+JSON.stringify(h);
   // A proved multi-step transfer can revisit a board once, with a different
   // remaining plan. Repeating the same board AND advice is the actual cycle.
   expect(seen.has(routeKey),`${b.slot}/${JSON.parse(row)[0]} cycle at ${step}`).toBe(false);seen.add(routeKey);
   expect(h.kind,`${b.slot}/${JSON.parse(row)[0]} at ${step}`).toBe('move');if(h.kind!=='move')break;
   const n=apply(s,d.mode,h.move);expect(n).not.toBe(s);
   if(previous&&positionKey(n)===positionKey(previous.before)){
    expect(h.plan.length).toBeGreaterThan(1);let end=s;for(const m of h.plan)end=apply(end,d.mode,m);
    expect(end.hidden.some((v,i)=>v<s.hidden[i])||end.piles.slice(8,12).reduce((n,p)=>n+p.length,0)>Math.max(s.piles.slice(8,12).reduce((n,p)=>n+p.length,0),previous.before.piles.slice(8,12).reduce((n,p)=>n+p.length,0))||end.known.some((v,i)=>v>s.known[i])).toBe(true);
   }
   previous={before:s,move:h.move};s=n;
  }
  expect(won(s),`${b.slot}/${JSON.parse(row)[0]}`).toBe(true);wins++;
 }
 expect(wins).toBe(256);
});
it('rebuilds a public foundation-return continuation after a truly cold checkpoint and deal object',async()=>{
 const b=selection.banks.find(b=>b.slot===101)!,row=b.rows.find(row=>JSON.parse(row)[0]===33554601)!;
 const d=descriptor(b.slot,row).payload;let p=fresh(d);let found=false;
 for(let i=0;i<256;i++){
  const r=readTable(p,d)!,h=advise(r.position,d,10000);expect(h.kind).toBe('move');if(h.kind!=='move')break;
  if(h.plan.length>1&&h.move[0]>=8&&h.move[0]<12){
   p=moveTable(d,p,h.move)!;const coldDeal=JSON.parse(JSON.stringify(d)) as Deal,cold=readTable(JSON.parse(JSON.stringify(p)),coldDeal)!;
   const previous={before:decodeBoard(cold.path.at(-2)!,coldDeal)!,move:h.move};
   vi.resetModules();const {advise:coldAdvise}=await import('../src/puzzles/table/publicSolver');
   const next=coldAdvise(cold.position,coldDeal,10000,previous);expect(next.kind).toBe('move');
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
it('cached public continuations give identical advice in hidden-card twin worlds',()=>{
 const b=selection.banks.find(b=>b.slot===105)!,core=descriptor(105,b.rows[0]),adapter=solitaireAdapter(true);let state=adapter.create(core),compared=0;
 for(let i=0;i<100&&!adapter.solved(state,core);i++){
  const shown=adapter.hint!(state,core);if(!shown)break;
  for(const twin of adapter.hidden!.twins(state,core)){expect(adapter.hidden!.view(twin.state,twin.descriptor)).toEqual(adapter.hidden!.view(state,core));expect(adapter.hint!(twin.state,twin.descriptor)).toEqual(shown);compared++;}
  state=adapter.reduce(state,shown,core);
 }
 expect(compared).toBeGreaterThan(20);
});
