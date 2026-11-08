import {it,expect} from 'vitest';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
it('P2-7 build gate rejects changes to a committed bank length, hash or order and allows a new slot',()=>{
 const root=mkdtempSync(join(tmpdir(),'li-catalog-freeze-'));
 try{
  mkdirSync(join(root,'scripts'));mkdirSync(join(root,'src/state'),{recursive:true});
  for(const file of ['scripts/check-save-catalog.mjs','src/state/catalogManifest.ts'])writeFileSync(join(root,file),readFileSync(file));
  const file=join(root,'src/state/save-catalog.json');
  const bank={slot:0,engine:'proof',rules:1,cove:true,awards:[3,3],entries:[{ordinal:0,hash:'a'.repeat(64)},{ordinal:1,hash:'b'.repeat(64)}]};
  const snapshot={version:1,banks:[bank],dares:[],contexts:[]};const write=(v:unknown)=>writeFileSync(file,JSON.stringify(v));write(snapshot);
  const git=(...args:string[])=>execFileSync('git',args,{cwd:root,stdio:'pipe'});git('init','-q');git('add','.');git('-c','user.name=Save Test','-c','user.email=save-test@invalid.local','commit','-qm','Freeze catalog');
  const check=()=>execFileSync(process.execPath,['--experimental-strip-types','scripts/check-save-catalog.mjs'],{cwd:root,stdio:'pipe'});
  expect(()=>check()).not.toThrow();
  for(const entries of [[...bank.entries,{ordinal:2,hash:'c'.repeat(64)}],[...bank.entries].reverse(),bank.entries.map((e,i)=>i?e:{...e,hash:'c'.repeat(64)})]){write({...snapshot,banks:[{...bank,entries}]});expect(()=>check()).toThrow();}
  write({...snapshot,banks:[bank,{...bank,slot:1,entries:bank.entries.map(e=>({...e,ordinal:e.ordinal+2}))}]});expect(()=>check()).not.toThrow();
 }finally{rmSync(root,{recursive:true,force:true});}
});
it('P2-6 frozen corpus contains advanced game state and rewards beyond fresh constructors',()=>{
 const receipt='tests/fixtures/save-v3/FIX_RECEIPT.json';expect(existsSync(receipt)).toBe(true);
 const s=JSON.parse(readFileSync('tests/fixtures/save-v3/fix-advanced-envelope-2.json','utf8'));
 expect(s.arcade.people.family.session.state.board.some(Boolean)).toBe(true);expect(s.profiles.people.family.learn['shell-math'].revision).toBeGreaterThan(0);
 expect(s.personalization.people.family.earned.length).toBeGreaterThan(0);expect(s.library.profiles.family.creations.length).toBeGreaterThan(0);expect(s.profiles.unassigned.rounds.sessions['word-rescue']).toBeTruthy();
});
