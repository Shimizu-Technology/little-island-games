import {it,expect} from 'vitest';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
/** Publishes HEAD on both published refs, as a fetch of program/4.0 and main would. */
const publish=(git:(...args:string[])=>unknown)=>{for(const ref of ['refs/remotes/origin/main','refs/remotes/origin/program/4.0'])git('update-ref',ref,'HEAD');};
it('P2-7 build gate rejects changes to a committed bank length, hash or order and allows a new slot',()=>{
 const root=mkdtempSync(join(tmpdir(),'li-catalog-freeze-'));
 try{
  mkdirSync(join(root,'scripts'));mkdirSync(join(root,'src/state'),{recursive:true});
  for(const file of ['scripts/check-save-catalog.mjs','scripts/published-refs.mjs','src/state/catalogManifest.ts'])writeFileSync(join(root,file),readFileSync(file));
  const file=join(root,'src/state/save-catalog.json');
  const bank={slot:0,engine:'proof',rules:1,cove:true,awards:[3,3],entries:[{ordinal:0,hash:'a'.repeat(64)},{ordinal:1,hash:'b'.repeat(64)}]};
  const snapshot={version:1,banks:[bank],dares:[],contexts:[]};const write=(v:unknown)=>writeFileSync(file,JSON.stringify(v));write(snapshot);
  const git=(...args:string[])=>execFileSync('git',args,{cwd:root,stdio:'pipe'});git('init','-q');git('add','.');git('-c','user.name=Save Test','-c','user.email=save-test@invalid.local','commit','-qm','Freeze catalog');publish(git);
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
  const git=(...args:string[])=>execFileSync('git',args,{cwd:root,stdio:'pipe'});git('init','-q');git('add','.');git('-c','user.name=Save Test','-c','user.email=save-test@invalid.local','commit','-qm','Freeze inline catalog');publish(git);
  const next={...old,version:2,banks:[b]};write(next);
  const check=()=>execFileSync(process.execPath,['--experimental-strip-types','scripts/check-save-catalog.mjs'],{cwd:root,stdio:'pipe'});
  expect(()=>check()).not.toThrow();git('add','.');git('-c','user.name=Save Test','-c','user.email=save-test@invalid.local','commit','-qm','Freeze packed catalog');publish(git);
  for(const bank of [{...b,count:99},{...b,cove:false},{...b,awards:1},{...b,packHash:'f'.repeat(64)}]){write({...next,banks:[bank]});expect(()=>check()).toThrow();}
  write(next);const pack=join(root,'src/content/puzzles/assets/p100.lipuzzle');writeFileSync(pack,readFileSync(pack,'utf8').replace('"a"','"b"'));expect(()=>check()).toThrow();
 }finally{rmSync(root,{recursive:true,force:true});}
});

/** A published base on both refs, then a work branch that adds slot 1 (review 2, probes D and E). */
function published(){
 const cwd=mkdtempSync(join(tmpdir(),'li-save-published-'));
 mkdirSync(join(cwd,'scripts'));mkdirSync(join(cwd,'src/state'),{recursive:true});
 for(const file of ['scripts/check-save-catalog.mjs','scripts/published-refs.mjs','src/state/catalogManifest.ts'])writeFileSync(join(cwd,file),readFileSync(file));
 const bank=(slot:number,hash:string)=>({slot,engine:'proof',rules:1,cove:true,awards:[3],entries:[{ordinal:slot,hash:hash.repeat(64)}]});
 const write=(hash?:string)=>writeFileSync(join(cwd,'src/state/save-catalog.json'),JSON.stringify({version:1,banks:[bank(0,'a'),...(hash?[bank(1,hash)]:[])],dares:[],contexts:[]}));
 const git=(...args:string[])=>execFileSync('git',['-c','user.name=Save Test','-c','user.email=save-test@invalid.local','-c','commit.gpgsign=false',...args],{cwd,encoding:'utf8',stdio:'pipe'});
 const commit=(msg:string)=>{git('add','-A');git('commit','-qm',msg);return git('rev-parse','HEAD').trim();};
 git('init','-q','-b','main');write();commit('published base');publish(git);git('checkout','-q','-b','work');write('b');const first=commit('branch adds slot 1');
 const check=()=>execFileSync(process.execPath,['--experimental-strip-types','scripts/check-save-catalog.mjs'],{cwd,encoding:'utf8',stdio:'pipe'});
 return {write,git,commit,first,check,done:()=>rmSync(cwd,{recursive:true,force:true})};
}
it('a branch may still replace a bank no published catalog holds',()=>{
 const r=published();try{
  expect(r.check()).toContain('2 published catalogs checked');
  r.write('c');r.commit('branch re-bakes slot 1');expect(r.check()).toContain('1 unpublished banks may still be replaced');
  r.write('d');expect(()=>r.check()).not.toThrow();
 }finally{r.done();}
});
it('rejects a changed published bank when either published ref is missing (probe D)',()=>{
 const r=published();try{
  r.git('update-ref','refs/remotes/origin/program/4.0',r.first);r.write('c');r.commit('replace published slot 1');
  expect(()=>r.check()).toThrow(/Immutable catalog bank 1 changed/);
  r.git('update-ref','-d','refs/remotes/origin/program/4.0');
  expect(()=>r.check()).toThrow(/origin\/program\/4\.0 cannot be resolved/);
  r.git('update-ref','refs/remotes/origin/program/4.0',r.first);r.git('update-ref','-d','refs/remotes/origin/main');
  expect(()=>r.check()).toThrow(/origin\/main cannot be resolved/);
 }finally{r.done();}
});
it('rejects a changed bank published by squash, outside the branch ancestry (probe E)',()=>{
 const r=published();try{
  r.git('checkout','-q','main');r.git('merge','-q','--squash','work');r.commit('publish slot 1 by squash');r.git('update-ref','refs/remotes/origin/main','HEAD');
  r.git('checkout','-q','work');r.write('c');r.commit('replace published slot 1');
  expect(()=>r.check()).toThrow(/published at origin\/main .*Immutable catalog bank 1 changed/);
 }finally{r.done();}
});
it('fails closed when a published catalog does not parse',()=>{
 const r=published();try{
  r.git('checkout','-q','main');writeFileSync(join(r.git('rev-parse','--show-toplevel').trim(),'src/state/save-catalog.json'),'{ broken');r.commit('broken catalog');r.git('update-ref','refs/remotes/origin/main','HEAD');
  r.git('checkout','-q','work');expect(()=>r.check()).toThrow(/save-catalog\.json at origin\/main .* does not parse/);
 }finally{r.done();}
});
