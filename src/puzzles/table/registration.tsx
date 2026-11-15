import React from 'react';
import type { ChallengeCard, PackedBand, TypedRegistration } from '../../challenge/types';
import type { PackedOpen } from '../../cove/catalog';
import type { ChallengeSession, PuzzleRef, SaveCatalog, Terminal } from '../../state/challenge';
import { validChallengeSession } from '../../state/challenge';
import { prepareSessionContent } from '../../state/sessionContent';
import { packedBank } from '../../state/bankFacts';
import { exactKeys, jsonBytes, plain, uint, unpack } from '../../state/saveBits';
import { bankLoader } from '../catalog';
import type { PuzzleDescriptor } from '../types';
import { sha256Hex } from '../sha256';
import { solitaireAdapter } from './adapter';
import { fresh, moveTable, readTable, undoTable, type TablePayload } from './checkpoint';
import { positionKey, validMove, won, type Deal, type Move } from './solitaire';
import { LazySolitaireBoard } from './LazyBoard';
export type TableAction = {type:'move'|'hint';move:Move}|{type:'undo'|'help'|'reset'};
export type BankFacts={family:string;slot:number;first:number;count:number;packHash:string;rules:number;band:string;tier:1|2|3|4|5|6;title:string;summary:string};
export type TableView={deal:Deal;payload:TablePayload;title:string;summary:string};
const key=(r:PuzzleRef)=>`${r.bank}:${r.puzzle}:${r.hash}`;
const validAction=(x:unknown):x is TableAction=>plain(x)&&(['undo','help','reset'].includes(x.type as string)&&exactKeys(x,['type'])||(x.type==='move'||x.type==='hint')&&exactKeys(x,['type','move'])&&validMove(x.move));
export function defineSolitaire(facts:readonly BankFacts[]):TypedRegistration<TablePayload,TableAction,TableView>{
 const game='solitaire',codecId='solitaire-v1',resident=new Map<string,PuzzleDescriptor<Deal>>();
 const fact=(bank:number)=>facts.find(b=>b.slot===bank);
 const descriptor=(s:ChallengeSession)=>resident.get(key(s.puzzle));
 const read=(s:ChallengeSession)=>{const d=descriptor(s);const r=d?readTable(s.payload,d.payload):null;return r&&r.payload.audit.every(n=>n===1||n===2)?r:null;};
 const evaluate=(s:ChallengeSession):Terminal|null=>{const r=read(s);return r&&won(r.position)?{event:s.partner?'together':r.payload.audit.includes(1)?'helped':'independent',awards:0,dares:[],cost:null,solution:sha256Hex(positionKey(r.position))}:null;};
 const codec={game,cove:true,budget:{wrapper:696,draft:230,undo:2392,audit:641},validate:(s:ChallengeSession)=>!!read(s),evaluate,
 canStart:(s:ChallengeSession)=>{const d=descriptor(s);return !!d&&s.result===null&&JSON.stringify(s.payload)===JSON.stringify(fresh(d.payload));},
 extends:(a:ChallengeSession,b:ChallengeSession)=>{const x=a.payload,y=b.payload;return plain(x)&&plain(y)&&uint(x.edits)&&uint(y.edits)&&y.edits>=x.edits&&Array.isArray(x.audit)&&Array.isArray(y.audit)&&y.audit.length>=x.audit.length&&x.audit.every((v,i)=>v===(y.audit as unknown[])[i]);}};
 const bands:PackedBand[]=facts.map(b=>({kind:'band',bank:b.slot,path:'endless',tier:b.tier,title:b.title,count:b.count}));
 const catalog:SaveCatalog={banks:new Map(facts.map(b=>[b.slot,{slot:b.slot,engine:game,rules:1,first:b.first,count:b.count,family:b.family,packHash:b.packHash,awards:0,cove:true}])),dares:new Map(),codecs:new Map([[codecId,codec]]),contexts:new Set(facts.map(b=>`solitaire-${b.tier}`))};
 const card=(ref:PuzzleRef):ChallengeCard|undefined=>{const b=fact(ref.bank);return b&&ref.engine===game&&ref.rules===1&&uint(ref.puzzle,b.count-1)?{ref,source:{kind:'endless',bank:b.slot,puzzle:ref.puzzle},path:'endless',tier:b.tier,title:`${b.title} ${ref.puzzle+1}`,dares:[]}:undefined;};
 async function resolve(ref:PuzzleRef|{bank:number;puzzle:number}):Promise<PuzzleRef>{
  const b=fact(ref.bank);if(!b||!uint(ref.puzzle,b.count-1))throw new Error('Unknown Solitaire deal.');
  const d=await bankLoader().entry(solitaireAdapter(b.family==='solitaire'),b.family,b.first+ref.puzzle);
  if('hash'in ref&&(d.ref.hash!==ref.hash||d.ref.engine!==ref.engine||d.ref.rules!==ref.rules))throw new Error('The saved deal does not match its bank.');
  await prepareSessionContent({puzzle:d.ref},catalog);resident.set(key(d.ref),d);while(resident.size>16)resident.delete(resident.keys().next().value!);return d.ref;
 }
 const pick=async(bank:number,progress:Parameters<NonNullable<import('../../challenge/types').PackedChallenge>['choose']>[1],skip:ReadonlySet<number>,avoid?:PuzzleRef)=>{
  const b=fact(bank);if(!b)throw new Error('Unknown Solitaire bank.');const marks=unpack(progress.banks.find(([s])=>s===bank)?.[1]??'',b.count,3)??Array<number>(b.count).fill(0),last=progress.recent.filter(([s])=>s===bank).at(-1)?.[1]??-1;
  const all=Array.from({length:b.count},(_,i)=>(i+last+1)%b.count).filter(i=>b.count===1||avoid?.bank!==bank||avoid.puzzle!==i),visible=all.filter(i=>!skip.has(i)),order=visible.length?visible:all;
  return resolve({bank,puzzle:order.find(i=>!marks[i])??order.find(i=>marks[i]===1)??order[0]});
 };
 const packed:NonNullable<import('../../challenge/types').PackedChallenge>&PackedOpen={bands,card,prepare:async ref=>{await resolve(ref);},open:(bank,puzzle)=>resolve({bank,puzzle}),describe:bank=>{const b=fact(bank);return b?{size:b.family==='freecell'?'8 columns · 52 cards':'7 columns · 52 cards',summary:b.summary}:undefined;},teaches:ref=>resident.get(key(ref))?.teaches[0],choose:(bank,p,avoid)=>pick(bank,p,new Set(),avoid),chooseVisible:(bank,p,skip,avoid)=>pick(bank,p,skip,avoid),hiddenRows:async(bank,hidden)=>{const b=catalog.banks.get(bank);if(!b||!packedBank(b))return new Set();const out=new Set<number>(),want=new Set(hidden);for(let i=0;i<fact(bank)!.count;i++)if(want.has(await bankLoader().savedHash(b,i)))out.add(i);return out;}};
 return {game,codec:codecId,cove:true,puzzles:[],catalog,packed,helpUI:'board',contextFor:ref=>`solitaire-${fact(ref.bank)?.tier??1}`,
 controls:{help:()=>({type:'help'}),reset:()=>({type:'reset'})},completionFacts:s=>{const r=read(s);return r?{helpUsed:r.payload.audit.includes(1),failed:false}:null;},completionText:(_ref,result)=>result.event==='together'?'You brought every card home together.':result.event==='helped'?'Every card is home, with a little help.':'Every card is home.',
 start:(ref,owner,id,progress,_options,dares)=>{const d=resident.get(key(ref));if(!d||dares.length)throw new Error('Open a verified deal first.');const s:ChallengeSession={version:1,owner,game,id,ordinal:progress.nextOrdinal,revision:0,puzzle:ref,codec:codecId,payload:fresh(d.payload),selectedDares:[],partner:null,result:null,credited:false};if(!validChallengeSession(s,owner,catalog,owner.startsWith('cove-')))throw new Error('Invalid deal launch.');return s;},
 move:(s,action)=>{
  if(!validAction(action)||s.result||s.credited||!validChallengeSession(s,s.owner,catalog,s.owner.startsWith('cove-')))return null;
  const d=descriptor(s)!,r=read(s)!;let p=r.payload;
  if(action.type==='move'||action.type==='hint'){if(action.type==='hint'&&p.audit.length===128)return null;const next=moveTable(d.payload,p,action.move);if(!next||next===p)return null;p=action.type==='hint'?{...next,audit:[...next.audit,1]}:next;}
  else if(action.type==='undo')p=undoTable(d.payload,p)??p;
  else {if(p.audit.length===128)return null;
   if(action.type==='reset')p={...fresh(d.payload),audit:[...p.audit,2],edits:p.edits+1};
   else p={...p,audit:[...p.audit,1]};
  }
  if(p===r.payload)return null;const next={...s,payload:p,revision:s.revision+1},done={...next,result:evaluate(next)};return jsonBytes(done)<=4096&&validChallengeSession(done,s.owner,catalog,s.owner.startsWith('cove-'))?done:null;
 },render:(s,dispatch,active,width)=>{const d=descriptor(s),r=read(s),b=fact(s.puzzle.bank);return d&&r&&b?<LazySolitaireBoard key={`${s.owner}:${s.id}`} view={{deal:d.payload,payload:r.payload,title:card(s.puzzle)!.title,summary:b.summary}} dispatch={dispatch} active={active} width={width}/>:null;}};
}
