import { storage as native } from '../src/state/storage.native';
import { storage as web } from '../src/state/storage.web';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { installFixture, session, moved } from './helpers/save-contract';
import { emptySave } from '../src/state/validation';
import { encodeSave, migrateProfiles } from '../src/state/profiles';
import { parseDraft } from '../src/state/challengeDrafts';
// Actual SQLite SQL/transaction semantics under Node; Expo transport stays a separate device gate.
const sqlite=await vi.hoisted(async()=>{
 const {DatabaseSync}=await import('node:sqlite');const db=new DatabaseSync(':memory:');
 const state={fail:false};
 const tx={
  runAsync:async(sql:string,...args:(string|number)[])=>{if(state.fail&&sql.startsWith('INSERT INTO'))throw new Error('injected SQLite preservation failure');return db.prepare(sql).run(...args);},
  getFirstAsync:async(sql:string,...args:(string|number)[])=>db.prepare(sql).get(...args),
  getAllAsync:async(sql:string,...args:(string|number)[])=>db.prepare(sql).all(...args),
 };
 return {db,state,api:{...tx,execAsync:async(sql:string)=>db.exec(sql),withExclusiveTransactionAsync:async(fn:(t:typeof tx)=>Promise<void>)=>{db.exec('BEGIN EXCLUSIVE');try{await fn(tx);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}}}};
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
  await adapter.set(envelope());await adapter.writeDraft!(row());expect(await adapter.get()).toBe(envelope());expect(await adapter.readDrafts!()).toEqual([row()]);
  await expect(adapter.writeDraft!(row(2,'wrong-base'))).rejects.toThrow(/earlier save/);
  await adapter.writeDraft!(row(3));await expect(adapter.writeDraft!(row(2))).rejects.toThrow(/replaced/);expect(parseDraft((await adapter.readDrafts!())[0]).session.revision).toBe(3);
 });
 it(`${name}: boundary commits coherent envelope, clears rows and preserves their exact bytes`,async()=>{
  await adapter.set(envelope());await adapter.writeDraft!(row());const next=encodeSave({...migrateProfiles(emptySave()),saveRevision:'base-two'});await adapter.set(next);
  expect(await adapter.get()).toBe(next);expect(await adapter.readDrafts!()).toEqual([]);
  const entries=await adapter.listRecovery();expect(entries).toHaveLength(1);expect(await adapter.readRecovery(entries[0].key)).toBe(row());
 });
}
it('native: failure after envelope update rolls the entire exclusive transaction back including draft rows',async()=>{
 await native.set(envelope());await native.writeDraft!(row());sqlite.state.fail=true;
 await expect(native.set(encodeSave({...migrateProfiles(emptySave()),saveRevision:'base-two'}))).rejects.toThrow(/preservation/);
 expect(await native.get()).toBe(envelope());expect(await native.readDrafts!()).toEqual([row()]);expect(await native.listRecovery()).toEqual([]);
});
it('web: quota on active replacement retains accepted envelope, draft and corrected head cache',async()=>{
 await web.set(envelope());await web.writeDraft!(row());rejectKey='little-island.save';
 await expect(web.set(encodeSave({...migrateProfiles(emptySave()),saveRevision:'base-two'}))).rejects.toThrow(/quota/);
 expect(await web.get()).toBe(envelope());expect(await web.readDrafts!()).toEqual([row()]);expect(map.get('little-island.draft-head')).toBe('base-one');
});
it('web: interrupted non-authoritative head update heals from the committed envelope on load',async()=>{
 await web.set(envelope());map.set('little-island.draft-head','wrong');await web.get();expect(map.get('little-island.draft-head')).toBe('base-one');
});
