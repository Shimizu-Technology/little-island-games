import {it,expect} from 'vitest';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
it('P2-7 build gate rejects changes to a committed bank length, hash or order and allows a new slot',()=>{
 const root=mkdtempSync(join(tmpdir(),'li-catalog-freeze-'));
 try{
  mkdirSync(join(root,'scripts'));mkdirSync(join(root,'src/state'),{recursive:true});
  for(const file of ['scripts/check-save-catalog.mjs','scripts/published-refs.mjs','src/state/catalogManifest.ts'])writeFileSync(join(root,file),readFileSync(file));
  const file=join(root,'src/state/save-catalog.json');
  const bank={slot:0,engine:'proof',rules:1,cove:true,awards:[3,3],entries:[{ordinal:0,hash:'a'.repeat(64)},{ordinal:1,hash:'b'.repeat(64)}]};
  const snapshot={version:1,banks:[bank],dares:[],contexts:[]};const write=(v:unknown)=>writeFileSync(file,JSON.stringify(v));write(snapshot);
  const git=(...args:string[])=>execFileSync('git',args,{cwd:root,stdio:'pipe'});git('init','-q');git('add','.');git('-c','user.name=Save Test','-c','user.email=save-test@invalid.local','commit','-qm','Freeze catalog');
  const check=()=>execFileSync(process.execPath,['--experimental-strip-types','scripts/check-save-catalog.mjs'],{cwd:root,stdio:'pipe'});
  expect(()=>check()).not.toThrow();
  for(const entries of [[...bank.entries,{ordinal:2,hash:'c'.repeat(64)}],[...bank.entries].reverse(),bank.entries.map((e,i)=>i?e:{...e,hash:'c'.repeat(64)})]){write({...snapshot,banks:[{...bank,entries}]});expect(()=>check()).toThrow();}
  write({...snapshot,banks:[bank,{...bank,slot:1,entries:bank.entries.map(e=>({...e,ordinal:e.ordinal+2}))}]});expect(()=>check()).not.toThrow();
  // A shallow clone cannot prove that an earlier immutable meaning was retained.
  writeFileSync(join(root,'.git/shallow'),git('rev-parse','HEAD'));expect(()=>check()).toThrow();
 }finally{rmSync(root,{recursive:true,force:true});}
});
it('P2-6 frozen corpus contains advanced game state and rewards beyond fresh constructors',()=>{
 const receipt='tests/fixtures/save-v3/FIX_RECEIPT.json';expect(existsSync(receipt)).toBe(true);
 const s=JSON.parse(readFileSync('tests/fixtures/save-v3/fix-advanced-envelope-2.json','utf8'));
 expect(s.arcade.people.family.session.state.board.some(Boolean)).toBe(true);expect(s.profiles.people.family.learn['shell-math'].revision).toBeGreaterThan(0);
 expect(s.personalization.people.family.earned.length).toBeGreaterThan(0);expect(s.library.profiles.family.creations.length).toBeGreaterThan(0);expect(s.profiles.unassigned.rounds.sessions['word-rescue']).toBeTruthy();
});

it('history verifies the packaged chain before converting inline hashes to ranges',async()=>{
 const {fixture}=await import('./helpers/save-packed'),f=fixture(),b=f.banks.get(100)!;
 const root=mkdtempSync(join(tmpdir(),'li-packed-history-'));
 try{
  mkdirSync(join(root,'scripts'));mkdirSync(join(root,'src/state'),{recursive:true});mkdirSync(join(root,'src/content/puzzles/assets'),{recursive:true});
  for(const file of ['scripts/check-save-catalog.mjs','scripts/published-refs.mjs','src/state/catalogManifest.ts'])writeFileSync(join(root,file),readFileSync(file));
  writeFileSync(join(root,'src/content/puzzles/root.json'),JSON.stringify(f.root));
  for(const [asset,text] of f.files)writeFileSync(join(root,'src/content/puzzles/assets',`${asset}.lipuzzle`),text);
  const entries=Array.from({length:b.count},(_,i)=>({ordinal:b.first+i,hash:f.session('family',0,i).puzzle.hash}));
  const old={version:1,banks:[{slot:b.slot,engine:b.engine,rules:b.rules,cove:b.cove,awards:Array(100).fill(3),entries}],dares:[],contexts:[]};
  const file=join(root,'src/state/save-catalog.json'),write=(v:unknown)=>writeFileSync(file,JSON.stringify(v));write(old);
  const git=(...args:string[])=>execFileSync('git',args,{cwd:root,stdio:'pipe'});git('init','-q');git('add','.');git('-c','user.name=Save Test','-c','user.email=save-test@invalid.local','commit','-qm','Freeze inline catalog');
  const next={...old,version:2,banks:[b]};write(next);
  const check=()=>execFileSync(process.execPath,['--experimental-strip-types','scripts/check-save-catalog.mjs'],{cwd:root,stdio:'pipe'});
  expect(()=>check()).not.toThrow();git('add','.');git('-c','user.name=Save Test','-c','user.email=save-test@invalid.local','commit','-qm','Freeze packed catalog');
  for(const bank of [{...b,count:99},{...b,cove:false},{...b,awards:1},{...b,packHash:'f'.repeat(64)}]){write({...next,banks:[bank]});expect(()=>check()).toThrow();}
  write(next);const pack=join(root,'src/content/puzzles/assets/p100.lipuzzle');writeFileSync(pack,readFileSync(pack,'utf8').replace('"a"','"b"'));expect(()=>check()).toThrow();
 }finally{rmSync(root,{recursive:true,force:true});}
});
