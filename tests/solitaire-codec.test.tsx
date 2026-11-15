import React from 'react';
import {describe,it,expect,vi} from 'vitest';
import {defineSolitaire,type BankFacts, type TableView} from '../src/puzzles/table/registration';
import {construct} from '../scripts/puzzles/solitaire/generate';
import {fresh,readTable,type TablePayload} from '../src/puzzles/table/checkpoint';
import {emptyChallenge,validChallengeSession} from '../src/state/challenge';
import {legalMoves,opening,won} from '../src/puzzles/table/solitaire';
import {solve} from '../src/puzzles/table/solver';
const fixture=vi.hoisted(()=>({descriptor:null as unknown}));
vi.mock('../src/puzzles/catalog',()=>({bankLoader:()=>({entry:async()=>fixture.descriptor,savedHash:async()=> 'a'.repeat(64)})}));
vi.mock('react-native',()=>({}));
async function launch(){
 const deal=construct('freecell',4,1).deal,ref={bank:100,puzzle:0,engine:'solitaire',rules:1,hash:'a'.repeat(64)};
 fixture.descriptor={format:1,seed:4,rng:1,band:'f1',layout:'steady',template:'steady',payload:deal,objectives:[],limits:[],par:null,teaches:['search-1'],speech:null,ref};
 const fact:BankFacts={family:'freecell',slot:100,first:102400,count:1,packHash:'b'.repeat(64),rules:1,band:'f1',tier:1,title:'FreeCell · Paddling',summary:'Foundation building'};
 const entry=defineSolitaire([fact]);await entry.packed!.prepare(ref);
 return {entry,deal,ref,session:entry.start(ref,'family','cove-family-1',emptyChallenge(),{supportOff:false,ownRead:false},[])};
}
describe('Solitaire exact table codec',()=>{
 it('starts only a prepared immutable deal, rejects forged terminal claims, and retains help through undo and reset',async()=>{
  const {entry,deal,session}=await launch(),catalog=entry.catalog;
  expect(validChallengeSession(session,'family',catalog)).toBe(true);
  expect(validChallengeSession({...session,result:{event:'independent',awards:0,dares:[],cost:null,solution:null}},'family',catalog)).toBe(false);
  const help=entry.move(session,{type:'help'})!,move=entry.move(help,{type:'move',move:legalMoves(opening(deal),deal.mode)[0]})!;
  const resumed=JSON.parse(JSON.stringify(move));await entry.packed!.prepare(resumed.puzzle);
  expect(validChallengeSession(resumed,'family',catalog)).toBe(true);
  const undo=entry.move(resumed,{type:'undo'})!;
  expect(readTable(undo.payload,deal)!.position.piles).toEqual(opening(deal).piles);
  expect((undo.payload as TablePayload).audit).toEqual([1]);
  const reset=entry.move(move,{type:'reset'})!;
  expect((reset.payload as TablePayload).audit).toEqual([1,2]);
  expect(catalog.codecs.get(entry.codec)!.extends(help,{...help,payload:fresh(deal)})).toBe(false);
  expect(entry.move(session,{type:'move',move:[0,12,2]})).toBeNull();
  expect(entry.move(session,{type:'help',extra:true})).toBeNull();
  expect(validChallengeSession(session,'another-person',catalog)).toBe(false);
 });
 it('derives helped and Together results from the real final arrangement, with no score or par award',async()=>{
  const {entry,deal,session}=await launch(),r=solve(deal,undefined,500);expect(r.status).toBe('solved');if(r.status!=='solved')return;
  for(const partner of [null,'cove-advisor']){
   let s=entry.move({...session,partner},{type:'help'})!;
   for(const move of r.moves){s=entry.move(s,{type:'move',move})!;expect(s).not.toBeNull();}
   expect(won(readTable(s.payload,deal)!.position)).toBe(true);
   expect(s.result?.event).toBe(partner?'together':'helped');
   expect(s.result?.cost).toBeNull();expect(s.result?.awards).toBe(0);
   expect(entry.move(s,{type:'undo'})).toBeNull();
   const el=entry.render(s,()=>{},false,353) as React.ReactElement<{view:TableView}>;
   expect(el.props.view.payload).toEqual(s.payload);
  }
 });
 it('keeps ordinary play and all undo available after the retained help log is full',async()=>{
  const {entry,deal,session}=await launch();let s=session;
  for(let i=0;i<128;i++)s=entry.move(s,{type:'help'})!;
  expect(entry.move(s,{type:'help'})).toBeNull();
  const moved=entry.move(s,{type:'move',move:legalMoves(opening(deal),deal.mode)[0]})!;
  expect(moved).not.toBeNull();const undo=entry.move(moved,{type:'undo'})!;
  expect((undo.payload as TablePayload).audit).toHaveLength(128);
  expect(readTable(undo.payload,deal)!.position.piles).toEqual(opening(deal).piles);
 });
});
