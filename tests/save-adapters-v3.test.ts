import { storage as native } from '../src/state/storage.native';
import { storage as web } from '../src/state/storage.web';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { installFixture, session, moved } from './helpers/save-contract';
import { emptySave } from '../src/state/validation';
import { encodeSave, migrateProfiles } from '../src/state/profiles';
import { envelopeWrite, putProgress, parseDraft } from '../src/state/challengeDrafts';
// Actual SQLite SQL/transaction semantics under Node; Expo transport stays a separate device gate.
const sqlite=await vi.hoisted(async()=>{
 const {DatabaseSync}=await import('node:sqlite');const db=new DatabaseSync(':memory:');
 const state={fail:false,transactions:0};
 const tx={
  runAsync:async(sql:string,...args:(string|number)[])=>{if(state.fail&&sql.startsWith('INSERT INTO'))throw new Error('injected SQLite preservation failure');return db.prepare(sql).run(...args);},
  getFirstAsync:async(sql:string,...args:(string|number)[])=>db.prepare(sql).get(...args),
  getAllAsync:async(sql:string,...args:(string|number)[])=>db.prepare(sql).all(...args),
 };
 return {db,state,api:{...tx,execAsync:async(sql:string)=>db.exec(sql),withExclusiveTransactionAsync:async(fn:(t:typeof tx)=>Promise<void>)=>{state.transactions++;db.exec('BEGIN');try{await fn(tx);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}}}};
});
vi.mock('expo-sqlite',()=>({openDatabaseAsync:async()=>sqlite.api}));
installFixture();
const map=new Map<string,string>();let rejectKey='';
const local={getItem:(key:string)=>map.get(key)??null,setItem:(key:string,value:string)=>{if(key===rejectKey)throw new Error('quota exceeded');map.set(key,value);},removeItem:(key:string)=>{map.delete(key);},get length(){return map.size;},key:(index:number)=>[...map.keys()][index]??null};
const envelope=()=>encodeSave({...migrateProfiles(emptySave()),saveRevision:'base-one'});
const row=(revision=1,base='base-one')=>JSON.stringify({version:1,base,session:{...moved(session()),revision}});
beforeEach(async()=>{vi.stubGlobal('localStorage',local);map.clear();rejectKey='';sqlite.state.fail=false;await native.get();sqlite.db.exec('DELETE FROM app_data');});
afterEach(()=>vi.unstubAllGlobals());
for(const [name,adapter] of [['native',native],['web',web]] as const){
 it(`${name}: small row survives independently of envelope and obsolete bases cannot write`,async()=>{
  await adapter.set(envelope(),{revision:'base-one',folded:[]});await adapter.writeDraft!(row());expect(await adapter.get()).toBe(envelope());expect(await adapter.readDrafts!()).toEqual([row()]);
  await expect(adapter.writeDraft!(row(2,'wrong-base'))).rejects.toThrow(/earlier save/);
  await adapter.writeDraft!(row(3));await expect(adapter.writeDraft!(row(2))).rejects.toThrow(/replaced/);expect(parseDraft((await adapter.readDrafts!())[0]).session.revision).toBe(3);
 });
 it(`${name}: boundary commits coherent envelope, clears rows and preserves their exact bytes`,async()=>{
  await adapter.set(envelope(),{revision:'base-one',folded:[]});await adapter.writeDraft!(row());const next=encodeSave({...migrateProfiles(emptySave()),saveRevision:'base-two'});await adapter.set(next);
  expect(await adapter.get()).toBe(next);expect(await adapter.readDrafts!()).toEqual([]);
  const entries=await adapter.listRecovery();expect(entries).toHaveLength(1);expect(await adapter.readRecovery(entries[0].key)).toBe(row());
 });
}
it('native: failure after envelope update rolls the entire exclusive transaction back including draft rows',async()=>{
 await native.set(envelope(),{revision:'base-one',folded:[]});await native.writeDraft!(row());sqlite.state.fail=true;
 await expect(native.set(encodeSave({...migrateProfiles(emptySave()),saveRevision:'base-two'}))).rejects.toThrow(/preservation/);
 expect(await native.get()).toBe(envelope());expect(await native.readDrafts!()).toEqual([row()]);expect(await native.listRecovery()).toEqual([]);
});
it('web: quota on active replacement retains accepted envelope, draft and corrected head cache',async()=>{
 await web.set(envelope(),{revision:'base-one',folded:[]});await web.writeDraft!(row());rejectKey='little-island.save';
 await expect(web.set(encodeSave({...migrateProfiles(emptySave()),saveRevision:'base-two'}))).rejects.toThrow(/quota/);
 expect(await web.get()).toBe(envelope());expect(await web.readDrafts!()).toEqual([row()]);expect(map.get('little-island.draft-head')).toBe('base-one');
});
it('web: interrupted non-authoritative head update heals from the committed envelope on load',async()=>{
 await web.set(envelope(),{revision:'base-one',folded:[]});map.set('little-island.draft-head','wrong');await web.get();expect(map.get('little-island.draft-head')).toBe('base-one');
});

for(const [name,adapter] of [['native',native],['web',web]] as const){
 it(`${name}: P1-2 many routine boundaries retain zero folded recovery rows; discard ring and bytes are bounded`,async()=>{
  let save:import('../src/state/validation').Save={...migrateProfiles(emptySave()),saveRevision:'base-one'};await adapter.set(encodeSave(save),envelopeWrite(save));
  const original=encodeSave(save);await adapter.preserve(original);
  for(let i=0;i<40;i++){
   const s={...moved(session()),id:`round-${i}`,ordinal:i+1};
   const raw=JSON.stringify({version:1,base:save.saveRevision,session:s});await adapter.writeDraft!(raw);
   save=putProgress(save,'family',{...save.challenge!,nextOrdinal:i+2,paused:[s]});save={...save,saveRevision:`base-${i}`};
   await adapter.set(encodeSave(save),envelopeWrite(save));await adapter.discardSession!(JSON.stringify(s));
  }
  const entries=await adapter.listRecovery();expect(entries).toHaveLength(1);expect(await adapter.readRecovery(entries[0].key)).toBe(original);
  const discarded=name==='native'?sqlite.db.prepare("SELECT value FROM app_data WHERE key LIKE 'discarded-session-%'").all().map(r=>r.value as string):[...map].filter(([k])=>k.startsWith('little-island.discarded-session-')).map(([,v])=>v);
  expect(discarded).toHaveLength(8);expect(discarded.reduce((n,r)=>n+Buffer.byteLength(r),0)).toBeLessThanOrEqual(8*4096);
 });
 it(`${name}: P3-4 malformed/stale row quarantine preserves once and deletes the row`,async()=>{
  await adapter.set(envelope(),{revision:'base-one',folded:[]});await adapter.writeDraft!(row());
  await adapter.quarantineDraft!(row());expect(await adapter.readDrafts!()).toEqual([]);expect(await adapter.listRecovery()).toHaveLength(1);
 });
}

it('P2-5 native draft moves use the shared connection without a transaction connection per move',async()=>{
 await native.set(envelope(),{revision:'base-one',folded:[]});const count=sqlite.state.transactions;
 for(let i=1;i<=25;i++)await native.writeDraft!(row(i));
 expect(sqlite.state.transactions).toBe(count);expect(parseDraft((await native.readDrafts!())[0]).session.revision).toBe(25);
});
