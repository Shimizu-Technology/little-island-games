#!/usr/bin/env node
// Every mutant starts from passing synthetic bakes. Trace false predicates once,
// then run their exact negative cases; unrelated later gates cannot hide removal.
import ts from 'typescript';
import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const files=['bake','review','policy','shipping','guard','artifact-views','paths','core','scan','check'];
const mutations=[],sources=new Map(),patches=new Map();
for(const file of files){const path=`scripts/words/${file}.mjs`,source=readFileSync(path,'utf8'),tree=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true);sources.set(file,source);patches.set(file,[]);
 function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(tree)==='requireThat'){
  const message=n.arguments[1].getText(tree);
  if(file==='check' && /release <|receipt </.test(message))return;
  const arg=n.arguments[0],id=mutations.length;
  mutations.push({id,file,message,source:source.slice(0,arg.getStart(tree))+'true'+source.slice(arg.end)});
  patches.get(file).push({start:arg.getStart(tree),end:arg.end,id});
 }ts.forEachChild(n,visit);}visit(tree);
}
function custom(file,message,source,tests){mutations.push({id:mutations.length,file,message,source,tests});}
// Single-clause mutants for the material gaps in review R2. These complement
// whole-predicate removal, and redundant clauses are not counted as proof.
const clauseSpecs = {
 review:["row.reviewerB.verdict === 'keep'", "familySample.decision === 'keep'", 'lead.reconciliationSha256 === digest(reconciled)', 'lead.fixture === false', 'a.runId !== b.runId', 'a.transcriptSha256 !== b.transcriptSha256', "v.verdict === 'keep'", "v.relation === 'spelling-variant'"],
 bake:['s.ship === true', "word.language === 'en'", 'clue.answer === word.spelling', "slots.every(text => answers.some(w => w.spelling.replaceAll(' ','') === text))"],
 policy:['lock.policySha256 === sha256(bytes)', 'lock.scanListSha256 === digest([...policy.scan].sort())'],
 shipping:['entry.sha256===sha256(bytes)'],
 check:["r.source===execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()", 'r.policySha256===lock.policySha256','r.scanListSha256===lock.scanListSha256','r.admission?.full===true','r.admission.passed===true','r.web?.passed===true','r.ios?.passed===true','r.ios.sha256===treeHash(ios)'],
};
for(const [file,clauses] of Object.entries(clauseSpecs)) for(const clause of clauses) {
 const source=sources.get(file);if(!source.includes(clause))throw new Error('Missing mutation target: '+clause);
 custom(file,'R2 clause '+clause,source.replace(clause,'true'));
}
custom('core','R2 sensitive headword rejection',sources.get('core').replace('if (sensitive.has(foldScan(word.spelling)) || sensitive.has(foldScan(word.lemma))) return false;','if (false) return false;'),['clause CHamoru sensitive spelling and lemma rejection']);
custom('bake','asset listed raw object',sources.get('bake').replace('listed:listed.map(({wordId,answer,cells})=>({wordId,answer,cells}))','listed'),['listed projection strips private fields']);
custom('bake','asset raw word object',sources.get('bake').replace('words.map(w => ({ id:w.id,','words.map(w => ({ ...w, id:w.id,'),['successful synthetic bake has exact safe asset projection']);
custom('bake','asset whole policy',sources.get('bake').replace('const asset = { schemaVersion:1,','const asset = { policy, schemaVersion:1,'),['successful synthetic bake has exact safe asset projection']);
custom('paths','symlink ancestor canonicalization',sources.get('paths').replace('realpathSync.native(parent)','parent'),['privatePath resolves symlink ancestors']);
custom('guard','partial-list detector',sources.get('guard').replace('if(broadHits.size>=(allowed.broad.size ? 1 : 3))','if(false)'),['guard partial-array','guard keys','guard newlines']);
custom('guard','individual blocked-literal detector',sources.get('guard').replace('if(literalHits.size)','if(false)'),['guard core','guard chamoru']);
custom('guard','private filename detector',sources.get('guard').replaceAll('bannedNames.test(name)','false'),['guard filename receipt.private.json']);
custom('guard','canary detector',sources.get('guard').replace('if(uppers.some(upper=>upper.includes(word.toUpperCase())))','if(false)').replace("if((policy.canaries??[]).some(word=>raw.uppers.some(upper=>upper.includes(word.toUpperCase()))))",'if(false)'),['guard canary']);
custom('guard','word-search grid detector',sources.get('guard').replace('if(grids.some(', 'if(false && grids.some('),['guard actual word grid','guard decoded packed word grid']);
custom('guard','private hash detector',sources.get('guard').replaceAll('[...hashes].some(h=>upper.includes(h.toUpperCase()))','false'),['guard scan-hash']);
custom('guard','private blob detector',sources.get('guard').replaceAll('blobs.some(b=>upper.includes(b.toUpperCase()))','false'),['guard private blob despite exceptions']);
custom('check','compressed policy expansion bound',sources.get('check').replace('{maxOutputLength:4*1024*1024}','{}'),['compressed CI policy is decoded, locked, used and bounded']);
const scratch=mkdtempSync(join(tmpdir(),'li-word-mutation-suite-')),toolRoot=join(scratch,'scripts/words'),trace=join(scratch,'trace.jsonl');
mkdirSync(join(scratch,'scripts'),{recursive:true});cpSync('scripts/words',toolRoot,{recursive:true});
let failed=0;
try{
 // Freeze all source files for this run.
 for(const [file,source] of sources){let patched=source;for(const p of patches.get(file).sort((a,b)=>b.start-a.start))patched=patched.slice(0,p.start)+`(${source.slice(p.start,p.end)} || (globalThis.__wordRecordGate?.(${p.id}), false))`+patched.slice(p.end);writeFileSync(join(toolRoot,`${file}.mjs`),patched);}
 const run=(env,pattern)=>spawnSync(process.execPath,['--test',...(pattern?['--test-name-pattern',pattern]:[]),'tests/helpers/word-pipeline-regressions.mjs'],{encoding:'utf8',env:{...process.env,...env,WORD_TEST_TOOL_ROOT:resolve(toolRoot)},timeout:120000,maxBuffer:8*1024*1024});
 const baseline=run({WORD_MUTATION_TRACE:trace});
 if(baseline.status!==0){console.error(baseline.stdout+baseline.stderr);throw new Error('Instrumented unmutated baseline must pass');}
 for(const [file,source] of sources)writeFileSync(join(toolRoot,`${file}.mjs`),source);
 const coverage=new Map();for(const line of readFileSync(trace,'utf8').trim().split('\n')){const {id,test}=JSON.parse(line);if(!coverage.has(id))coverage.set(id,new Set());coverage.get(id).add(test);}
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');let count=0;
 for(const m of mutations){if(process.argv[2] && !`${m.file} ${m.message}`.includes(process.argv[2]))continue;count++;
  const tests=m.tests??[...(coverage.get(m.id)??[])];
  writeFileSync(join(toolRoot,`${m.file}.mjs`),m.source);
  const r=run({},tests.length?`^(?:${tests.map(escape).join('|')})$`:undefined);
  writeFileSync(join(toolRoot,`${m.file}.mjs`),sources.get(m.file));
  const killed=r.status!==0 && r.status!==null;failed+=!killed;
  console.log(JSON.stringify({id:m.id,file:m.file,message:m.message,tests,killed,status:r.status}));
 }
 console.log(JSON.stringify({mutations:count,killed:count-failed,survived:failed}));process.exitCode=failed?1:0;
}finally{rmSync(scratch,{recursive:true,force:true});}
