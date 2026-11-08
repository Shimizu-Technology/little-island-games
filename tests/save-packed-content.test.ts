import { describe, expect, it } from 'vitest';
import { bankSize, type PackedBank } from '../src/state/bankFacts';
import { catalogManifest, assertFrozenCatalog } from '../src/state/catalogManifest';
import { registerSaveContent, saveCatalog, emptyChallenge, validChallengeProgress, validChallengeSession, creditProgress, type ChallengeSession } from '../src/state/challenge';
import { ContentPendingError, prepareSessionContent, prepareSaveContent, retainSessionContent, sessionContentSize } from '../src/state/sessionContent';
import { BankError } from '../src/puzzles/loader';
import { parseSaveWithContent, parseSave } from '../src/state/validation';
import { encodeSave } from '../src/state/profiles';
import { recoverChallengeDrafts } from '../src/state/challengeDrafts';
import { fixture, envelope } from './helpers/save-packed';
describe('range-based save catalog',()=>{
 it('loads no entries for completion, award bounds or ordinal metadata',()=>{
  const f=fixture(), bank=f.banks.get(100)!;
  const p=creditProgress(emptyChallenge(),f.session().puzzle,{event:'independent',awards:3,dares:[],cost:2,solution:null},f.catalog);
  expect(bankSize(bank)).toBe(100);expect(validChallengeProgress(p,'family',f.catalog)).toBe(true);expect(f.reads).toEqual([]);
  const invalid={...p,banks:[[100,p.banks[0][1]+'AAAA',p.banks[0][2]]]};expect(validChallengeProgress(invalid,'family',f.catalog)).toBe(false);
 });
 it('distinguishes not-loaded from invalid; resolves exact rows in old-rules retired packs',async()=>{
  const f=fixture(),s=f.session();expect(()=>validChallengeSession(s,'family',f.catalog)).toThrow(ContentPendingError);
  await prepareSessionContent(s,f.catalog,{loader:f.loader});expect(validChallengeSession(s,'family',f.catalog)).toBe(true);
  expect(validChallengeSession({...s,puzzle:{...s.puzzle,hash:'f'.repeat(64)}},'family',f.catalog)).toBe(false);
  expect(validChallengeSession({...s,puzzle:{...s.puzzle,rules:1}},'family',f.catalog)).toBe(false);
  const wrongRow={...s,puzzle:{...s.puzzle,puzzle:1}};await prepareSessionContent(wrongRow,f.catalog,{loader:f.loader});expect(validChallengeSession(wrongRow,'family',f.catalog)).toBe(false);
  expect(validChallengeSession({...s,payload:999},'family',f.catalog)).toBe(false);
 });
 it('hydrates and re-exports all 56 paused slots without changing saves or ordinals',async()=>{
  const f=fixture();registerSaveContent(f.catalog,catalogManifest(f.catalog));const raw=encodeSave(envelope(f));
  const save=await parseSaveWithContent(raw,{loader:f.loader});expect(encodeSave(save)).toBe(raw);
  retainSessionContent(save,saveCatalog);f.loader.release();expect(encodeSave(parseSave(raw))).toBe(raw);
  expect(sessionContentSize(saveCatalog).pinned).toBe(8);expect(f.loader.decodedPacks()).toEqual([]);
  expect(f.reads.filter(n=>n.startsWith('p'))).toHaveLength(8);
 });
 it('pins accepted refs across bounded transient eviction and never retains every opened pack',async()=>{
  const f=fixture(),s=f.session();await prepareSessionContent(s,f.catalog,{loader:f.loader});
  const value={profiles:{people:{family:{challenge:{paused:[s]}}}}};retainSessionContent(value,f.catalog);
  for(let i=1;i<100;i++)await prepareSessionContent(f.session('family',0,i),f.catalog,{loader:f.loader});
  f.loader.release();expect(validChallengeSession(s,'family',f.catalog)).toBe(true);expect(sessionContentSize(f.catalog)).toEqual({pinned:1,recent:64});
 });
 it('checks all 56 distinct refs sequentially within the two-pack LRU',async()=>{
  const f=fixture(),v=envelope(f);let n=0;
  for(const p of [...Object.values(v.profiles!.people),...Object.values(v.cove!.people)])for(const s of p.challenge!.paused)s.puzzle=f.session(s.owner,Number(s.game.slice(-1)),n++).puzzle;
  await prepareSaveContent(v,f.catalog,{loader:f.loader});expect(sessionContentSize(f.catalog).recent).toBe(56);expect(f.loader.decodedPacks().length).toBeLessThanOrEqual(2);
 });
 it.each(['read','cancel','identity'] as const)('preserves input and admits no hashes on %s failure',async kind=>{
  const f=fixture(),s=f.session(),before=JSON.stringify(s);let live=true;
  const loader={savedHash:async(bank:PackedBank,index:number)=>{if(kind==='read')throw new BankError('read-failed','read failed');if(kind==='cancel')live=false;return f.loader.savedHash(kind==='identity'?{...bank,first:1}:bank,index);}};
  await expect(prepareSessionContent(s,f.catalog,{loader,live:()=>live})).rejects.toBeInstanceOf(BankError);
  expect(JSON.stringify(s)).toBe(before);expect(sessionContentSize(f.catalog)).toEqual({pinned:0,recent:0});
 });
 it('cancels the final continuation even for an already warm row',async()=>{
  const f=fixture();registerSaveContent(f.catalog,catalogManifest(f.catalog));const raw=encodeSave(envelope(f));let live=true;
  let armed=false;const p=parseSaveWithContent(raw,{loader:f.loader,live:()=>{if(!armed){armed=true;queueMicrotask(()=>{live=false;});}return live;}});await expect(p).rejects.toMatchObject({kind:'cancelled'});
 });
 it('draft recovery folds structurally without reading content; cancellation never quarantines',async()=>{
  const f=fixture(),s=f.session(),base=envelope(f);let preserved=0;
  const row=JSON.stringify({version:1,base:base.saveRevision,session:{...s,revision:1,payload:1}});
  const storage={readDrafts:async()=>[row],get:async()=>null,set:async()=>{},listRecovery:async()=>[],readRecovery:async()=>null,preserve:async()=>{preserved++;}};
  const recovered=await recoverChallengeDrafts(base,storage,f.catalog,{loader:{savedHash:async()=>{throw new BankError('read-failed','retry');}}});expect(recovered.profiles!.people.family.challenge!.paused[0].revision).toBe(1);expect(preserved).toBe(0);
  await expect(recoverChallengeDrafts(base,storage,f.catalog,{live:()=>false})).rejects.toMatchObject({kind:'cancelled'});expect(preserved).toBe(0);
 });
 it('folds valid drafts structurally, and quarantines a changed slot identity without changing accepted work',async()=>{
  const f=fixture(),s=f.session(),base=envelope(f);await prepareSaveContent(base,f.catalog,{loader:f.loader});
  let preserved=0;const moved={...s,revision:1,payload:1},row=(session:ChallengeSession)=>JSON.stringify({version:1,base:base.saveRevision,session});
  const storage={readDrafts:async()=>[row(moved)],get:async()=>null,set:async()=>{},listRecovery:async()=>[],readRecovery:async()=>null,preserve:async()=>{preserved++;}};
  const recovered=await recoverChallengeDrafts(base,storage,f.catalog,{loader:f.loader});expect(recovered.profiles!.people.family.challenge!.paused[0].revision).toBe(1);
  storage.readDrafts=async()=>[row({...moved,puzzle:{...s.puzzle,hash:'f'.repeat(64)}})];
  const unchanged=await recoverChallengeDrafts(base,storage,f.catalog,{loader:f.loader});expect(unchanged.profiles!.people.family.challenge!.paused[0].revision).toBe(0);expect(preserved).toBe(1);
 });
 it('requires verified original hashes for the one-way catalog representation revision',()=>{
  const f=fixture(),b=f.banks.get(100)!,entries=Array.from({length:b.count},(_,i)=>({ordinal:b.first+i,hash:f.session('family',0,i).puzzle.hash}));
  const old={version:1 as const,banks:[{slot:b.slot,engine:b.engine,rules:b.rules,cove:b.cove,awards:Array(100).fill(3),entries}],contexts:[],dares:[]};
  const next={version:2 as const,banks:[b],contexts:[],dares:[]};
  expect(()=>assertFrozenCatalog(old,next)).toThrow(/Immutable/);expect(()=>assertFrozenCatalog(old,next,()=>entries)).not.toThrow();
  for(const changed of [{...b,first:1},{...b,count:99},{...b,rules:1},{...b,cove:false},{...b,awards:1}])expect(()=>assertFrozenCatalog(old,{...next,banks:[changed]},()=>entries)).toThrow(/Immutable/);
  expect(()=>assertFrozenCatalog(old,next,()=>entries.map(e=>({...e,hash:'f'.repeat(64)})))).toThrow(/Immutable/);
 });
});
