import { syncBuiltinESMExports } from 'node:module';
import { Buffer } from 'node:buffer';
// Synthetic gate proof only. No content, reviewer or family approval is created.
import { test as nodeTest, after } from 'node:test';
import assert from 'node:assert/strict';
import fs, { appendFileSync, cpSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
function test(name,fn) {
  return nodeTest(name,(...args)=>{
    globalThis.__wordGateTest=name;
    return fn(...args);
  });
}
if(process.env.WORD_MUTATION_TRACE) globalThis.__wordRecordGate=id=>appendFileSync(process.env.WORD_MUTATION_TRACE,JSON.stringify({id,test:globalThis.__wordGateTest})+'\n');
const scratch=mkdtempSync(join(tmpdir(),'li-word-SYNTHETIC-'));
after(()=>rmSync(scratch,{recursive:true,force:true}));
process.env.LITTLE_ISLAND_WORD_ADVISORY_DIR=join(scratch,'advisories');
const root=join(scratch,'repo'), sources=join(scratch,'sources');
mkdirSync(join(root,'scripts'),{recursive:true});mkdirSync(join(root,'content/words'),{recursive:true});mkdirSync(sources);
mkdirSync(join(root,'src/learn/content'),{recursive:true});
writeFileSync(join(root,'src/learn/content/chamoru.ts'),'export const chamoruWords=[];');
symlinkSync(resolve('node_modules'),join(root,'node_modules'));
cpSync(resolve(process.env.WORD_TEST_TOOL_ROOT ?? 'scripts/words'),join(root,'scripts/words'),{recursive:true});
writeFileSync(join(root,'content/words/supplement.draft.json'),'{"entries":[]}');
const python=spawnSync('python3',['-c',`import io,tarfile,pathlib,json
p=pathlib.Path(${JSON.stringify(sources)})
with tarfile.open(p/'scowl-release.tar.gz','w:gz') as t:
 for name,data in [('english-words.10','reef\\nreed\\ncolor\\ncharm\\ntrade wind\\n'+'\\n'.join('R'+chr(65+i//676)+chr(65+i//26%26)+chr(65+i%26) for i in range(300))+'\\n'),('british-words.10','colour\\n')]:
  b=data.encode();m=tarfile.TarInfo('scowl/final/'+name);m.size=len(b);t.addfile(m,io.BytesIO(b))
(p/'canonical-vocabulary.json').write_text(json.dumps({'entries':[{'id':'ch-test','review_status':'source_backed','recommended_teaching_term':'Chotda'}]}))`],{encoding:'utf8'});
assert.equal(python.status,0,python.stderr);
const core=await import(pathToFileURL(join(root,'scripts/words/core.mjs')));
const {digest,sha256}=core;
const sourceRecords=['scowl','hafagpt-canonical'].map((id,i)=>{const file=i?'canonical-vocabulary.json':'scowl-release.tar.gz',bytes=readFileSync(join(sources,file));return {id,file,revision:'SYNTHETIC-ONLY',sha256:sha256(bytes),bytes:bytes.length,ship:true,notice:null};});
writeFileSync(join(root,'scripts/words/sources.lock.json'),JSON.stringify({sources:sourceRecords}));
const {bakeBank,checkSurfaces,independentlyVerify}=await import(pathToFileURL(join(root,'scripts/words/bake.mjs')));
const review=await import(pathToFileURL(join(root,'scripts/words/review.mjs')));
const {guardTree:rawGuardTree}=await import(pathToFileURL(join(root,'scripts/words/guard.mjs')));
const testWorkingDirectory=process.cwd();
const guardTree=(directory,p,receipts=[],options={})=>rawGuardTree(directory,p,receipts,{sourceRoot:process.cwd()===testWorkingDirectory?root:process.cwd(),...options});
const {registrySource}=await import(pathToFileURL(join(root,'scripts/words/registry.mjs')));
const {checkShippingTree}=await import(pathToFileURL(join(root,'scripts/words/shipping.mjs')));
const {privatePath}=await import(pathToFileURL(join(root,'scripts/words/paths.mjs')));
const {isPrivateWordFile}=await import(pathToFileURL(resolve(process.env.WORD_TEST_EXPORT_FILE??'scripts/export-public.mjs')));
const {checkExport,checkRelease:rawCheckRelease,verifyReleaseReceipt}=await import(pathToFileURL(join(root,'scripts/words/check.mjs')));
const {prepareCompilerCapture,compilerIdentity,bytecodeFiles,verifyCompilerCapture,captureNativeBuild}=await import(pathToFileURL(join(root,'scripts/words/compiler.mjs')));
const compilerCapture=prepareCompilerCapture(root);after(()=>compilerCapture.cleanup());let nativeFixture=0;
function realCheckRelease(...args) {
 if(bytecodeFiles(args[2]).length){const file=join(scratch,`compiler-${nativeFixture++}.private.json`);compilerCapture.finish(args[2],file);process.env.LITTLE_ISLAND_WORD_NATIVE_COMPILER_RECEIPT=file;}
 return rawCheckRelease(...args);
}
function syntheticIOSExport(command,args,options) {
 assert.equal(command,process.execPath);assert.deepEqual(args.slice(1,7),['export','--platform','ios','--no-bytecode','--no-minify','--output-dir']);assert.equal(options.cwd,root);
 writeFileSync(join(args.at(-1),'native.js'),'var global; hello; globalThis.safe="Native platform fixture";');
}
const checkRelease=(...args)=>realCheckRelease(...args,syntheticIOSExport);
const {scanGrid,scanLetterWheel}=await import(pathToFileURL(join(root,'scripts/words/scan.mjs')));
const {hermesStrings,proseTokens:classifyProse}=await import(pathToFileURL(join(root,'scripts/words/artifact-views.mjs')));
const densityTools=await import(pathToFileURL(join(root,'scripts/words/density.mjs')));
const policy={scan:['COLD','ALPHANONSENSE','BETANONSENSE','GAMMANONSENSE'],core:['COLD'],exact:['COLD'],lemmas:['COLD'],chamoruSensitive:['SYNTHETICHEADWORD'],canaries:['PRIVATECANARYNONWORD']};
const policyFile=join(scratch,'policy.private.json'),lockFile=join(scratch,'policy-lock.private.json');
writeFileSync(policyFile,JSON.stringify(policy));
const lock={schemaVersion:1,policyFile,policySha256:sha256(readFileSync(policyFile)),scanListSha256:digest([...policy.scan].sort())};
writeFileSync(lockFile,JSON.stringify(lock));process.env.LITTLE_ISLAND_WORD_POLICY_LOCK=lockFile;
const word=(spelling='REEF')=>({schemaVersion:1,id:spelling.toLowerCase(),spelling,lemma:spelling,language:'en',sense:'Synthetic test meaning',readerLevel:'Little',knownBand:1,readBand:1,spellBand:1,clueBand:1,theme:'test',topic:'nature',guamFit:1,audio:null,source:sourceRecords[0],form:'lemma',properNoun:false,abbreviation:false,british:[],locale:'en-US',uses:['matching','word-search','crossword','scramble','builder','wheel','ladder']});
const canonicalTerms=JSON.parse(readFileSync(join(sources,'canonical-vocabulary.json'))).entries;
function seal(r){const {id,elapsedSeconds,...raw}=r;return {...raw,id:digest(raw),elapsedSeconds:60};}
function evidenceFor(records,words=records,kind='word',fromCLI){
 const prepare=kind==='word'?review.prepareWordBatch:review.prepareBatch;
 const prepared=fromCLI??prepare(records,{id:'SYNTHETIC-ONLY',fixture:false,vocabularySha256:digest(words),scanListSha256:lock.scanListSha256,canonicalTerms});
 const transcriptPaths=['a','b'].map(s=>{const p=join(scratch,`transcript-${kind}-${s}.txt`);writeFileSync(p,`SYNTHETIC gate test; no actual review: ${s}`);return p;});
 const reviews=prepared.packets.map((packet,i)=>{const raw={schemaVersion:1,batchSha256:packet.batchSha256,packetSha256:digest(packet),slot:packet.slot,fixture:false,reviewer:{id:`SYNTHETIC-${i}`,family:i?'anthropic':'openai',model:'TEST-ONLY'},runId:`SYNTHETIC-${i}`,startedAt:'2026-11-08T00:00:00Z',finishedAt:'2026-11-08T00:01:00Z',transcriptSha256:sha256(readFileSync(transcriptPaths[i])),items:records.map(w=>({id:w.id,verdict:'keep',reason:'SYNTHETIC test only',variants:(w.british??[]).map(spelling=>({spelling,verdict:'keep',relation:'spelling-variant',reason:'SYNTHETIC test only'}))}))};return review.validateReview(packet,raw,raw.transcriptSha256);});
 const reconciled=review.reconcile(prepared,...reviews);
 const familyFile=join(scratch,'family-evidence.txt');writeFileSync(familyFile,'SYNTHETIC test only; no family approval');
 return {prepared,reviews,transcriptPaths,lead:{schemaVersion:1,fixture:false,reconciliationSha256:digest(reconciled),reviewer:'SYNTHETIC',startedAt:'2026-11-08T00:02:00Z',finishedAt:'2026-11-08T00:03:00Z',items:records.map(w=>({id:w.id,decision:'keep',reason:'SYNTHETIC test only'}))},familySample:{fixture:false,batchSha256:digest(prepared.batch),decision:'keep',reviewer:'SYNTHETIC',date:'2026-11-08T00:04:00Z',evidence:familyFile,evidenceSha256:sha256(readFileSync(familyFile))}};
}
function input(words=[word()],surfaces=[{id:'match',kind:'matching',wordIds:words.map(w=>w.id)}]){const ev=evidenceFor(words);return {fixture:false,words,surfaces,canonicalTerms,policy:structuredClone(policy),sourceDirectory:sources,evidence:Object.fromEntries(words.map(w=>[w.id,ev]))};}
function rebind(ev){ev.lead.reconciliationSha256=digest(review.reconcile(ev.prepared,...ev.reviews));}
function fails(name,change,message){test(name,()=>{const data=input();change(data);assert.throws(()=>bakeBank(data),message);});}
test('successful synthetic bake has exact safe asset projection',()=>{
 const data=input();const {asset,receipt}=bakeBank(data);
 assert.deepEqual(Object.keys(asset).sort(),['accept','clues','schemaVersion','surfaces','words']);
 assert.deepEqual(Object.keys(asset.words[0]).sort(),['audio','clueBand','guamFit','id','knownBand','language','readBand','readerLevel','spellBand','spelling','theme','topic']);
 const bytes=JSON.stringify(asset);for(const s of [...policy.scan,...policy.core,...policy.chamoruSensitive,lock.scanListSha256,'source','review','policy'])assert.ok(!bytes.includes(s),s);
 assert.equal(receipt.independent.passed,true);
});
fails('policy substitution rejected',d=>{d.policy={...policy,scan:['ZZZ'],core:['ZZZ'],exact:['ZZZ'],lemmas:['ZZZ']};},/policy.*lock/i);
fails('policy byte lock verified',()=>{writeFileSync(policyFile,JSON.stringify({...policy,extra:true}));},/policy.*lock/i);
test('restore policy bytes',()=>writeFileSync(policyFile,JSON.stringify(policy)));
fails('batch scan digest bound',d=>{d.evidence.reef.prepared.batch.scanListSha256='e'.repeat(64);},/scan.*(binding|hash)/i);
fails('batch vocabulary digest bound',d=>{d.evidence.reef.prepared.batch.vocabularySha256='e'.repeat(64);},/projection/i);
fails('explicit fixture boolean required',d=>delete d.fixture,/fixture/i);
fails('fixture shipping denied',d=>d.fixture=true,/fixtures/i);
fails('unpinned source rejected',d=>d.words[0].source={...d.words[0].source,revision:'different'},/source/i);
fails('membership bytes required',d=>d.sourceDirectory=join(scratch,'missing'),/membership/i);
fails('answer block enforced',d=>{d.words[0].lemma='COLD';d.evidence.reef=evidenceFor(d.words);},/blocked answer/i);
fails('current content review binding',d=>{d.evidence.reef.prepared.batch.records=[{...d.words[0],sense:'Other'}];},/current content/i);
fails('lead gate required',d=>delete d.evidence.reef.lead,/lead reconciliation/i);
fails('both reviewers must keep',d=>{const ev=d.evidence.reef;ev.reviews[0].items[0].verdict='call';ev.reviews[0]=seal(ev.reviews[0]);rebind(ev);},/fresh blind review/i);
fails('lead must keep',d=>d.evidence.reef.lead.items[0].decision='call',/fresh blind review/i);
fails('family gate required',d=>delete d.evidence.reef.familySample,/family sample/i);
fails('transcript bytes required',d=>d.evidence.reef.transcriptPaths[0]=join(scratch,'absent'),/transcript/i);
fails('transcript hash required',d=>{const ev=d.evidence.reef;const p=join(scratch,'changed-transcript');writeFileSync(p,'Changed');ev.transcriptPaths[0]=p;},/transcript/i);
fails('family evidence bytes required',d=>d.evidence.reef.familySample.evidence=join(scratch,'absent'),/family.*evidence/i);
fails('family evidence hash required',d=>d.evidence.reef.familySample.evidenceSha256='f'.repeat(64),/family.*evidence/i);
fails('distinct reviewer family alone',d=>{const ev=d.evidence.reef;ev.reviews[1].reviewer.family='openai';ev.reviews[1]=seal(ev.reviews[1]);},/independent/i);
fails('distinct reviewer identity alone',d=>{const ev=d.evidence.reef;ev.reviews[1].reviewer.id=ev.reviews[0].reviewer.id;ev.reviews[1]=seal(ev.reviews[1]);},/independent/i);
test('British variants visible with judging metadata',()=>{const w={...word('COLOR'),british:['COLOUR']},ev=evidenceFor([w]);for(const k of ['british','lemma','form','properNoun','canonicalId','uses','audio'])assert.ok(k in ev.prepared.packets[0].items[0],k);});
test('reviewed British-only variant successfully bakes',()=>{assert.deepEqual(bakeBank(input([{...word('COLOR'),british:['COLOUR']}])).asset.accept,['COLOR','COLOUR']);});
test('American unrelated variant rejected',()=>assert.throws(()=>bakeBank(input([{...word(),british:['REED']} ])),/British/));
test('variant exact and lemma block enforced',()=>{for(const key of ['exact','lemmas']){const d=input([{...word('COLOR'),british:['COLOUR']}]);d.policy[key].push('COLOUR');writeFileSync(policyFile,JSON.stringify(d.policy));writeFileSync(lockFile,JSON.stringify({...lock,policySha256:sha256(readFileSync(policyFile))}));assert.throws(()=>bakeBank(d),/blocked answer/);}writeFileSync(policyFile,JSON.stringify(policy));writeFileSync(lockFile,JSON.stringify(lock));});
test('variant requires a per-variant relationship judgment',()=>{const d=input([{...word('COLOR'),british:['COLOUR']}]);const ev=d.evidence.color;ev.reviews[0].items[0].variants=[];ev.reviews[0]=seal(ev.reviews[0]);rebind(ev);assert.throws(()=>bakeBank(d),/variant.*review/i);});
test('listed projection strips private fields',()=>{const d=input();d.surfaces=[{id:'s',kind:'word-search',wordIds:['reef'],cells:[['R','E','E','F']],listed:[{wordId:'reef',answer:'REEF',cells:[[0,0],[0,1],[0,2],[0,3]],reviewNote:'PRIVATE',scanHits:['PRIVATE']}]}];assert.deepEqual(Object.keys(bakeBank(d).asset.surfaces[0].listed[0]).sort(),['answer','cells','wordId']);});
for(const [name,surface,rx] of [
 ['JS grid scan',{id:'s',kind:'word-search',wordIds:['reef'],cells:[['R','E','E','F','C','O','L','D']],listed:[{wordId:'reef',answer:'REEF',cells:[[0,0],[0,1],[0,2],[0,3]]}]},/Grid scan hit/],
 ['scramble scan',{id:'s',kind:'scramble',wordIds:['cold'],shuffle:'DLOC'},/scramble/],
 ['ladder length',{id:'s',kind:'ladder',wordIds:['toolong']},/ladder/],
 ['ladder connectivity',{id:'s',kind:'ladder',wordIds:['reef','color']},/Ladder must be connected$/],
 ['unchanged scramble',{id:'s',kind:'scramble',wordIds:['reef'],shuffle:'REEF'},/scramble/],
 ['English alphabet',{id:'s',kind:'word-search',wordIds:['reef'],cells:[['R','E','E','F','Å']],listed:[{wordId:'reef',answer:'REEF',cells:[[0,0],[0,1],[0,2],[0,3]]}]},/alphabet/],
 ])test(name,()=>{const words=surface.wordIds.map(w=>word(w.toUpperCase()));assert.throws(()=>checkSurfaces({words,surfaces:[surface],policy}),rx);});
test('surface uses honored',()=>assert.throws(()=>checkSurfaces({words:[{...word(),uses:['matching']}],surfaces:[{id:'s',kind:'wheel',wordIds:['reef'],letters:'REEF'}],policy}),/uses/));
test('independent bent and wheel verifier',()=>{for(const board of [{id:'b',kind:'builder',cells:[['C','Q','D'],['Q','O','L']]},{id:'w',kind:'wheel',letters:'DLOCQ'}])assert.throws(()=>independentlyVerify([board],policy.scan,policy.core),/verification failed/);});
for(const [name,contents] of [['partial-array','["ALPHANONSENSE","BETANONSENSE","GAMMANONSENSE"]'],['newlines','ALPHANONSENSE BETANONSENSE GAMMANONSENSE'],['core','COLD'],['canary','PRIVATECANARYNONWORD'],['scan-hash',lock.scanListSha256]])test(`guard ${name}`,()=>{const dir=join(scratch,'guard');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'app.bin'),contents);assert.throws(()=>guardTree(dir,policy),/leaked/);rmSync(dir,{recursive:true});});
for(const name of ['receipt.private.json','safety-policy.private.json','tiers.queue.json','reconcile.pending.json'])test(`guard filename ${name}`,()=>{const dir=join(scratch,'names');mkdirSync(dir);writeFileSync(join(dir,name),'{}');assert.throws(()=>guardTree(dir,policy),/leaked/);rmSync(dir,{recursive:true});});
const hermesc=compilerCapture.executable;
test('Hermes bytecode raw string scan',()=>{const dir=join(scratch,'hbc');mkdirSync(dir);writeFileSync(join(scratch,'leak.js'),'globalThis.leak='+JSON.stringify(policy.scan));const r=spawnSync(hermesc,['-emit-binary','-out',join(dir,'main.hbc'),join(scratch,'leak.js')],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.throws(()=>guardTree(dir,policy),/leaked/);});
for(const path of ['content/words/banks/x.ts','content/words/banks/x.JSON','content/words/bank.json','content/clues/x.json','src/games/words/bank.json','assets/words/bank.json'])test(`admission ${path}`,()=>{const dir=join(scratch,'admission');mkdirSync(join(dir,path,'..'),{recursive:true});writeFileSync(join(dir,path),'{}');assert.throws(()=>checkShippingTree(dir),/bank|admi|manifest/i);rmSync(dir,{recursive:true});});
for(const source of ["import '../../scripts/words/core.mjs';","const x=require(`../../scripts/words/core.mjs`);","export * from '../../scripts/words/core.mjs';"])for(const prefix of ['src','modules','content/library'])test(`private import ${prefix} ${source}`,()=>{const dir=join(scratch,'imports');mkdirSync(join(dir,prefix),{recursive:true});writeFileSync(join(dir,prefix,'x.ts'),source);assert.throws(()=>checkShippingTree(dir),/Private word dependency/);rmSync(dir,{recursive:true});});
test('guard symlinks denied',()=>{const dir=join(scratch,'links');mkdirSync(dir);symlinkSync(policyFile,join(dir,'link'));assert.throws(()=>guardTree(dir,policy),/Symlink/);});
test('admission symlink directories denied',()=>{const dir=join(scratch,'sym');mkdirSync(join(dir,'content/words/banks'),{recursive:true});symlinkSync(sources,join(dir,'content/words/banks/link'));assert.throws(()=>checkShippingTree(dir),/Symlink/);});
test('word bank fixture evidence cannot ship',()=>{const d=input();d.evidence.reef.prepared.batch.fixture=true;assert.throws(()=>bakeBank(d),/real review evidence/);});
test('independent receipt implementation hash is verified',()=>{const file=join(root,'scripts/words/verify.py'),before=readFileSync(file);try{writeFileSync(file,"import json\nprint(json.dumps({'passed':True,'grids':0,'hits':[],'implementationSha256':'forged'}))\n");assert.throws(()=>independentlyVerify([],[]),/receipt mismatch/);}finally{writeFileSync(file,before);}});
test('CHamoru empty sensitive policy rejected',()=>{const w={...word(),id:'ch-test',spelling:'Chotda',lemma:'Chotda',language:'ch',canonicalId:'ch-test',uses:['matching'],fluentReaderChecked:false,source:sourceRecords[1]},d=input([w]);d.policy.chamoruSensitive=[];writeFileSync(policyFile,JSON.stringify(d.policy));writeFileSync(lockFile,JSON.stringify({...lock,policySha256:sha256(readFileSync(policyFile))}));assert.throws(()=>bakeBank(d),/sensitive-headword/);writeFileSync(policyFile,JSON.stringify(policy));writeFileSync(lockFile,JSON.stringify(lock));});
test('CHamoru forbidden surface rejected independently of uses',()=>{const w={...word(),language:'ch',spelling:'Chotda',uses:undefined};assert.throws(()=>checkSurfaces({words:[w],surfaces:[{id:'s',kind:'scramble',wordIds:['reef'],shuffle:'adhtoC'}],policy}),/CHamoru surface/);});
test('mixed language word search rejected',()=>{const w={...word('REED'),language:'ch'};assert.throws(()=>checkSurfaces({words:[word(),w],surfaces:[{id:'s',kind:'word-search',wordIds:['reef','reed'],cells:[['R','E','E','F'],['R','E','E','D']],listed:[{wordId:'reef',answer:'REEF',cells:[[0,0],[0,1],[0,2],[0,3]]},{wordId:'reed',answer:'REED',cells:[[1,0],[1,1],[1,2],[1,3]]}]}],policy}),/mix languages/);});
test('listed CHamoru paths preserve digraph cells',()=>{const w={...word(),language:'ch',spelling:'Hunggan',uses:['word-search']};assert.throws(()=>checkSurfaces({words:[w],surfaces:[{id:'s',kind:'word-search',wordIds:['reef'],cells:[['H','U','N','G','G','A','N'],['H','U','NG','G','A','N','Q']],listed:[{wordId:'reef',answer:'Hunggan',cells:[[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6]]}]}],policy}),/exactly once/);});
test('clue tier and meaning must match an English word',()=>{const w=word(),c={schemaVersion:1,id:'clue-test',wordId:w.id,answer:w.spelling,meaning:w.sense,tier:'Little',text:'A synthetic clue.',candidates:['A synthetic clue.','Another synthetic clue.','Third synthetic clue.'],provenance:{model:'SYNTHETIC',date:'2026-11-08T00:00:00Z',promptVersion:'TEST',promptSha256:'a'.repeat(64),webUsed:false,inputs:'answer,meaning,tier,tone'}};for(const patch of [{tier:'Strong'},{meaning:'Other'}]){const d=input([w]);d.clues=[{...c,...patch}];d.evidence[c.id]=evidenceFor(d.clues,[w],'clue');assert.throws(()=>bakeBank(d),/Clue answer mismatch/);}});
test('privatePath resolves symlink ancestors',()=>{const link=join(scratch,'repo-link');symlinkSync(root,link);assert.throws(()=>privatePath(join(link,'new-output')),/outside/);});
test('privatePath denies differently-cased repository ancestor',()=>{const alternate=root.replace('/repo','/REPO');try{if(readFileSync(join(alternate,'scripts/words/bake.mjs')))assert.throws(()=>privatePath(join(alternate,'new-output')),/outside/);}catch(e){if(e.code!=='ENOENT')throw e;}});
function stagedBank(){const dir=join(scratch,'registered'),data=input(),{asset}=bakeBank(data),name='content/words/banks/test.json',bytes=JSON.stringify(asset);mkdirSync(join(dir,'content/words/banks'),{recursive:true});writeFileSync(join(dir,name),bytes);writeFileSync(join(dir,'content/words/banks.manifest.json'),JSON.stringify({schemaVersion:1,banks:[{path:name,sha256:sha256(bytes),bytes:Buffer.byteLength(bytes),words:asset.words.length,clues:asset.clues.length,surfaces:asset.surfaces.length}]}));writeFileSync(join(dir,'content/words/registry.generated.ts'),registrySource(JSON.parse(readFileSync(join(dir,'content/words/banks.manifest.json')))));return {dir,data,name,asset};}
test('CI admission needs only committed manifest and shape, local gate rebakes',()=>{const {dir,data}=stagedBank();try{assert.equal(checkShippingTree(dir).banks,1);const ev=join(scratch,'admission-evidence');mkdirSync(ev);writeFileSync(join(ev,'test.json'),JSON.stringify(data));assert.equal(checkShippingTree(dir,ev,{full:true}).banks,1);}finally{rmSync(dir,{recursive:true,force:true});}});
test('full rebake compares admitted asset',()=>{const {dir,data}=stagedBank();try{const ev=join(scratch,'bad-admission-evidence');mkdirSync(ev);data.surfaces[0].id='different';writeFileSync(join(ev,'test.json'),JSON.stringify(data));assert.throws(()=>checkShippingTree(dir,ev,{full:true}),/differs from reviewed/);}finally{rmSync(dir,{recursive:true,force:true});}});
for(const field of ['policy','rawRecord','listed'])test(`runtime shape rejects injected ${field}`,()=>{const {dir,name,asset}=stagedBank();try{if(field==='policy')asset.policy=policy;else if(field==='rawRecord')asset.words[0].source=sourceRecords[0];else asset.surfaces[0].listed=[{wordId:'reef',answer:'REEF',cells:[[0,0]],reviewNote:'PRIVATE'}];const bytes=JSON.stringify(asset);writeFileSync(join(dir,name),bytes);const m=JSON.parse(readFileSync(join(dir,'content/words/banks.manifest.json')));m.banks[0].sha256=sha256(bytes);m.banks[0].bytes=Buffer.byteLength(bytes);writeFileSync(join(dir,'content/words/banks.manifest.json'),JSON.stringify(m));assert.throws(()=>checkShippingTree(dir),/shape|Private/);}finally{rmSync(dir,{recursive:true,force:true});}});
test('manifest hash is verified',()=>{const {dir,name}=stagedBank();try{writeFileSync(join(dir,name),readFileSync(join(dir,name),'utf8')+' ');assert.throws(()=>checkShippingTree(dir),/manifest hash/);}finally{rmSync(dir,{recursive:true,force:true});}});
test('batch references bake without duplicating batch evidence',()=>{const d=input();d.reviewBatches={batch:d.evidence.reef};d.evidence.reef='batch';assert.equal(bakeBank(d).asset.words.length,1);});
test('public source export excludes private tools, source hashes, drafts and their tests',()=>{for(const name of ['scripts/words/sources.lock.json','scripts/words/prepare-data.py','scripts/words/calibration.draft.tsv','content/words/supplement.draft.json','tests/word-pipeline.test.ts','tests/helpers/word-pipeline-regressions.mjs'])assert.equal(isPrivateWordFile(name),true,name);assert.equal(isPrivateWordFile('content/words/runtime.ts'),false);});
test('legacy calibration padding cannot masquerade as three authored drafts',()=>{const r=spawnSync(process.execPath,[join(root,'scripts/words/make-calibration.mjs'),'not-read',join(scratch,'calibration')],{encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stderr,/alternate drafts missing/);});
test('dictionary schema changes fail; short and multiword sensitive headwords survive',()=>{const r=spawnSync('python3',['-I','-c',`import runpy
m=runpy.run_path(${JSON.stringify(join(root,'scripts/words/prepare-data.py'))})
assert m['dictionary_definition']({'df':'A definition'},'df')=='A definition'
for record,key in [({},'df'),({'df':None},'df'),({'df':42},'df'),({'df':'X'},None)]:
 try:m['dictionary_definition'](record,key)
 except ValueError:pass
 else:raise AssertionError('Missing schema rejection')
assert m['sensitive_headword']('AB')=='AB'
assert m['sensitive_headword']('AB CD')=='ABCD'
`],{encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);});
test('runtime accepts adult multiword spelling exactly',()=>{const runtime=process.env.WORD_TEST_RUNTIME ?? resolve('content/words/runtime.ts');const r=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',`import {acceptsWord} from ${JSON.stringify(pathToFileURL(runtime).href)};if(!acceptsWord(' trade wind ',['TRADE WIND'])||acceptsWord('TRADE  WIND',['TRADE WIND']))process.exit(1);`],{encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);});
function initGit(){spawnSync('git',['init','-q',root]);writeFileSync(join(root,'.gitignore'),'node_modules/\n');spawnSync('git',['-C',root,'add','.']);const r=spawnSync('git',['-C',root,'-c','user.name=Synthetic','-c','user.email=test@example.invalid','commit','--allow-empty','-qm','Synthetic gate fixture']);assert.equal(r.status,0,r.stderr);}
test('real-export gate checks bytes and requires policy once a bank exists',()=>{const dir=join(scratch,'real-export');mkdirSync(dir);writeFileSync(join(dir,'app.js'),'PRIVATECANARYNONWORD');assert.throws(()=>checkExport(root,dir),/leaked/);const staged=stagedBank();delete process.env.LITTLE_ISLAND_WORD_POLICY_LOCK;try{assert.throws(()=>checkExport(staged.dir,dir),/policy lock|admission evidence/);}finally{process.env.LITTLE_ISLAND_WORD_POLICY_LOCK=lockFile;rmSync(staged.dir,{recursive:true,force:true});}});
test('release gate requires Hermes and checks current receipt artifacts',()=>{const web=join(scratch,'release-web'),ios=join(scratch,'release-ios');mkdirSync(web);mkdirSync(ios);writeFileSync(join(web,'index.html'),'hello');writeFileSync(join(ios,'main.js'),'hello');initGit();assert.throws(()=>checkRelease(root,web,ios,join(scratch,'bad-receipt')),/Hermes/);const r=spawnSync(hermesc,['-emit-binary','-out',join(ios,'main.hbc'),join(ios,'main.js')],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const receipt=join(scratch,'release-receipt.private.json');const git=spawnSync('git',['init','-q',root]);assert.equal(git.status,0);writeFileSync(join(root,'.gitignore'),'node_modules/\n');spawnSync('git',['-C',root,'add','.']);spawnSync('git',['-C',root,'-c','user.name=Synthetic','-c','user.email=test@example.invalid','commit','--allow-empty','-qm','Synthetic gate fixture']);assert.equal(checkRelease(root,web,ios,receipt).ios.passed,true);assert.equal(verifyReleaseReceipt(root,receipt,web,ios).passed,true);writeFileSync(join(web,'index.html'),'changed');assert.throws(()=>verifyReleaseReceipt(root,receipt,web,ios),/receipt/);});
fails('empty bank denied',d=>{d.words=[];d.surfaces=[];},/Empty bank/);
fails('duplicate bank IDs denied',d=>d.surfaces.push({...d.surfaces[0]}),/Duplicate\/empty bank IDs/);
fails('typed source workspace required',d=>delete d.sourceDirectory,/Pinned source workspace required/);
fails('two imported reviews required',d=>d.evidence.reef.reviews=[],/Two imported reviews/);
fails('transcript path pair required',d=>delete d.evidence.reef.transcriptPaths,/transcript paths/);
fails('lead must cover every row',d=>d.evidence.reef.lead.items.push({id:'extra',decision:'keep',reason:'Synthetic'}),/Lead must reconcile every row/);
fails('clue IDs may not collide with word IDs',d=>d.clues=[{id:'reef'}],/Duplicate\/colliding clue IDs/);
fails('absent trusted policy lock rejected',()=>delete process.env.LITTLE_ISLAND_WORD_POLICY_LOCK,/Private policy lock required/);
test('restore trusted policy lock',()=>{process.env.LITTLE_ISLAND_WORD_POLICY_LOCK=lockFile;});
test('nonempty policy arrays required',()=>{const d=input();d.policy.canaries=[];writeFileSync(policyFile,JSON.stringify(d.policy));writeFileSync(lockFile,JSON.stringify({...lock,policySha256:sha256(readFileSync(policyFile))}));try{assert.throws(()=>bakeBank(d),/lock missing canaries/);}finally{writeFileSync(policyFile,JSON.stringify(policy));writeFileSync(lockFile,JSON.stringify(lock));}});
for(const [name,surface,rx] of [
 ['unknown surface',{id:'s',kind:'unknown',wordIds:['reef']},/Unknown word surface/],
 ['unknown surface word',{id:'s',kind:'matching',wordIds:['other']},/Surface has unreviewed word/],
 ['listed outside word search',{id:'s',kind:'matching',wordIds:['reef'],listed:[]},/Listed paths only/],
 ['missing listed path',{id:'s',kind:'word-search',wordIds:['reef'],cells:[['R','E','E','F']]},/Each listed word/],
 ['repeated listed occurrence',{id:'s',kind:'word-search',wordIds:['reef'],cells:[['R','E','E','F','R','E','E','F']],listed:[{wordId:'reef',answer:'REEF',cells:[[0,0],[0,1],[0,2],[0,3]]}]},/exactly once/],
 ['missing builder answer',{id:'s',kind:'builder',wordIds:['reef'],cells:[['A','B','C','D']]},/Builder answer cannot be traced/],
 ['unsafe bent builder',{id:'s',kind:'builder',wordIds:['cod'],cells:[['C','Q','D'],['Q','O','L']]},/Unsafe builder grid/],
 ['unsafe wheel',{id:'s',kind:'wheel',wordIds:['cod'],letters:'DLOC'},/Unsafe builder wheel/],
 ['missing wheel answer',{id:'s',kind:'wheel',wordIds:['reef'],letters:'ABCD'},/Wheel answer cannot be formed/],
 ['unreviewed crossword run',{id:'s',kind:'crossword',wordIds:['reef'],cells:[['A','B','C','D']]},/Crossword has an unreviewed run/]
])test(name,()=>{const words=[word(surface.wordIds[0]==='cod'?'COD':'REEF')];assert.throws(()=>checkSurfaces({words,surfaces:[surface],policy}),rx);});
test('review metadata fixture must be explicit',()=>assert.throws(()=>review.prepareWordBatch([word()],{id:'test',vocabularySha256:'a'.repeat(64),scanListSha256:'b'.repeat(64)}),/Invalid batch metadata/));
function reviewFailure(name,change,rx){test(name,()=>{const ev=evidenceFor([word()]),packet=ev.prepared.packets[0],r=structuredClone(ev.reviews[0]);change(r);assert.throws(()=>review.validateReview(packet,r,ev.reviews[0].transcriptSha256),rx);});}
reviewFailure('review wrong packet',r=>r.packetSha256='a'.repeat(64),/stale/);
reviewFailure('review missing identity',r=>r.reviewer.model='',/identity/);
reviewFailure('review invalid timing',r=>r.finishedAt=r.startedAt,/timing/);
reviewFailure('review missing transcript hash',r=>r.transcriptSha256='f'.repeat(64),/transcript required/);
reviewFailure('review duplicate IDs',r=>r.items.push(r.items[0]),/duplicate IDs/);
reviewFailure('review incomplete coverage',r=>r.items[0].id='other',/cover every packet item/);
reviewFailure('review invalid verdict',r=>r.items[0].verdict='approved',/verdict needs a reason/);
reviewFailure('review missing revision',r=>r.items[0].verdict='revise',/Revision needs replacement/);
fails('blind projections are recomputed',d=>d.evidence.reef.prepared.packets[0].items[0].meaning='Different',/projection/);
fails('review batch slot is checked',d=>d.evidence.reef.reviews[0].slot='b',/Wrong review batch/);
fails('import review integrity checked',d=>d.evidence.reef.reviews[0].id='a'.repeat(64),/integrity/);
test('guard root symlink rejected',()=>{const dir=join(scratch,'root-symlink'),target=join(scratch,'empty');mkdirSync(target);symlinkSync(target,dir);assert.throws(()=>guardTree(dir,policy),/Symlink/);});
test('shipping root symlink rejected',()=>{const dir=join(scratch,'root-app-link');mkdirSync(dir);symlinkSync(sources,join(dir,'src'));assert.throws(()=>checkShippingTree(dir),/Symlink/);});
test('computed imports rejected',()=>{const dir=join(scratch,'dynamic');mkdirSync(join(dir,'src'),{recursive:true});writeFileSync(join(dir,'src/x.ts'),'const x=require(name);');assert.throws(()=>checkShippingTree(dir),/Unverifiable app dependency/);});
test('missing manifest entry file rejected',()=>{const {dir,name}=stagedBank();try{rmSync(join(dir,name));assert.throws(()=>checkShippingTree(dir),/manifest entry missing/);}finally{rmSync(dir,{recursive:true,force:true});}});
test('duplicate manifest entries rejected',()=>{const {dir}=stagedBank();try{const file=join(dir,'content/words/banks.manifest.json'),m=JSON.parse(readFileSync(file));m.banks.push(m.banks[0]);writeFileSync(file,JSON.stringify(m));assert.throws(()=>checkShippingTree(dir),/Invalid word bank manifest/);}finally{rmSync(dir,{recursive:true,force:true});}});
test('full admission needs evidence directory and matching input',()=>{const {dir}=stagedBank();try{assert.throws(()=>checkShippingTree(dir,undefined,{full:true}),/Full word check requires detached/);assert.throws(()=>checkShippingTree(dir,join(scratch,'missing-evidence'),{full:true}),/Missing detached word-bank admission/);}finally{rmSync(dir,{recursive:true,force:true});}});
for(const field of ['clues','surfaces','accept'])test(`runtime projection rejects private ${field}`,()=>{const {dir,name,asset}=stagedBank();try{if(field==='clues')asset.clues=[{id:'c',wordId:'reef',text:'Synthetic',source:'PRIVATE'}];if(field==='surfaces')asset.surfaces[0].policy=policy;if(field==='accept')asset.accept=['PRIVATE!'];const bytes=JSON.stringify(asset),file=join(dir,'content/words/banks.manifest.json'),m=JSON.parse(readFileSync(file));writeFileSync(join(dir,name),bytes);Object.assign(m.banks[0],{sha256:sha256(bytes),bytes:Buffer.byteLength(bytes),clues:asset.clues.length});writeFileSync(file,JSON.stringify(m));assert.throws(()=>checkShippingTree(dir),/Private|Invalid bank accept/);}finally{rmSync(dir,{recursive:true,force:true});}});
for(const [name,patch,rx] of [
 ['identity',{sense:''},/identity\/sense/],['language',{language:'unknown'},/Invalid word language/],['lemma',{lemma:''},/lemma\/reader/],['bands',{knownBand:0},/knownBand/],['tags',{theme:''},/word tags/],['audio',{audio:42},/audio field/],['source fields',{source:{}},/pinned source/],['form',{form:'unknown'},/spelling metadata/],['variant syntax',{british:['!']},/British variants/],['abbreviation',{abbreviation:true},/Abbreviations/],['child phrase',{spelling:'TRADE WIND'},/adult only/],['lengths',{spelling:'TRADE WIND',readerLevel:'Grown-up'},/multi-word lengths/],['child plural',{spelling:'REEFS',form:'plural'},/Child answers/],['proper noun',{spelling:'PARIS',properNoun:true},/proper noun/],['body label',{spelling:'FAT'},/Body labels/],['other faith',{topic:'other-faith'},/Other faiths/],['living person',{livingPerson:true},/living people/],['story sense',{spelling:'GHOST'},/Story sense/],['spooky tier',{spelling:'DEMON'},/Spooky word/],['hard sense',{spelling:'DEATH'},/Hard word/],['sword story',{spelling:'SWORD'},/Sword requires/],['American locale',{locale:'en-GB'},/American uppercase/]
])test(`word validation ${name}`,()=>assert.throws(()=>core.validateWord({...word(),...patch}),rx));
const chWord=()=>({...word(),spelling:'Chotda',language:'ch',canonicalId:'ch-test',uses:['matching'],fluentReaderChecked:false});
test('word validation canonical spelling',()=>assert.throws(()=>core.validateWord(chWord(),[]),/source-backed/));
test('word validation CHamoru uses',()=>assert.throws(()=>core.validateWord({...chWord(),uses:['crossword']},canonicalTerms),/limited to word search/));
test('word validation CHamoru fluent status honest',()=>assert.throws(()=>core.validateWord({...chWord(),fluentReaderChecked:true},canonicalTerms),/not checked/));
test('pack duplicate identity',()=>assert.throws(()=>core.validatePack([word(),word()]),/Duplicate record/));
test('pack duplicate lemma',()=>assert.throws(()=>core.validatePack([word(),{...word('REED'),lemma:'REEF'}]),/inflection cannot share/));
test('pack adult inflection cap',()=>assert.throws(()=>core.validatePack([{...word('REEFS'),readerLevel:'Grown-up',form:'plural'}]),/inflection cap/));
test('invalid grid shape',()=>assert.throws(()=>scanGrid([['RR']],['COLD']),/Invalid grid cells/));
test('invalid private scan term',()=>assert.throws(()=>scanGrid([['A','B']],['AB']),/private scan entry/));
for(const [name,cells,rx] of [['path shape',[[0,0,1]],/Invalid listed path/],['repeated',[[0,0],[0,0]],/Repeated listed cell/],['out of bounds',[[9,0]],/outside grid/],['nonadjacent',[[0,0],[0,2]],/must be straight/],['bent',[[0,0],[0,1],[1,1]],/must be straight/],['spelling',[[0,0],[0,1]],/spelling mismatch/]])test(`listed validation ${name}`,()=>assert.throws(()=>scanGrid([['C','O','L','D'],['A','B','C','D']],['COLD'],[{wordId:'cold',answer:'COLD',cells}]),rx));
test('invalid wheel letters',()=>assert.throws(()=>scanLetterWheel('12!',policy.core),/Invalid wheel letters/));
for(const [name,spelling,language,rx] of [['empty','', 'en',/Missing spelling/],['English glyph','Å','en',/English spelling/],['unknown language','A','other',/Unknown language/],['CHamoru alphabet','V','ch',/Invalid CHamoru/]])test(`cells ${name}`,()=>assert.throws(()=>core.cellsFor(spelling,language),rx));
function draft(){return {schemaVersion:1,id:'clue',wordId:'reef',answer:'REEF',meaning:'Synthetic',tier:'Little',text:'Synthetic one.',candidates:['Synthetic one.','Synthetic two.','Synthetic three.'],provenance:{model:'SYNTHETIC',date:'2026-11-08T00:00:00Z',promptVersion:'SYNTHETIC',promptSha256:'a'.repeat(64),webUsed:false,inputs:'answer,meaning,tier,tone'}};}
for(const [name,mutate,rx] of [['identity',c=>c.id='',/Invalid clue/],['candidates',c=>c.candidates.pop(),/three distinct/],['provenance',c=>c.provenance.model='',/drafting provenance/],['clean room',c=>c.provenance.webUsed=true,/Clean-room/]])test(`clue ${name}`,()=>{const c=draft();mutate(c);assert.throws(()=>core.validateClue(c),rx);});
test('legacy whole-file hashes cannot exempt any checks',()=>{const dir=join(scratch,'legacy');mkdirSync(dir);const file=join(dir,'app.js'),old='globalThis.text="old public text COLD"';writeFileSync(file,old);const p={...policy,legacyArtifactSha256:[sha256(Buffer.from(old))]};assert.throws(()=>guardTree(dir,p),/leaked/);writeFileSync(file,old+'; globalThis.changed=true');assert.throws(()=>guardTree(dir,p),/leaked/);const canary=policy.canaries[0];writeFileSync(file,canary);assert.throws(()=>guardTree(dir,{...p,legacyArtifactSha256:[sha256(Buffer.from(canary))]}),/leaked/);const list=JSON.stringify(policy.scan);writeFileSync(file,list);assert.throws(()=>guardTree(dir,{...p,legacyArtifactSha256:[sha256(Buffer.from(list))]}),/leaked/);});
test('private directory names rejected',()=>{const dir=join(scratch,'private-names');mkdirSync(join(dir,'private'),{recursive:true});writeFileSync(join(dir,'private','safe.txt'),'hello');assert.throws(()=>guardTree(dir,policy),/leaked/);});
test('release tree hashes reject symlinks',async()=>{const {treeHash}=await import(pathToFileURL(join(root,'scripts/words/check.mjs')));const dir=join(scratch,'release-tree-link');mkdirSync(dir);symlinkSync(policyFile,join(dir,'link'));assert.throws(()=>treeHash(dir),/Symlink/);initGit();assert.throws(()=>checkRelease(root,dir,dir,join(scratch,'unused-receipt')),/Symlink/);});
test('private output refuses a dangling symlink into the repo',()=>{const link=join(scratch,'dangling');symlinkSync(join(root,'not-yet-created'),link);assert.throws(()=>privatePath(join(link,'new-output')),/dangling symlink/);});
for(const name of ['calibration.draft.tsv','sources.lock.json'])test(`guard tooling filename ${name}`,()=>{const dir=join(scratch,'tooling-names');mkdirSync(dir);writeFileSync(join(dir,name),'{}');assert.throws(()=>guardTree(dir,policy),/leaked/);rmSync(dir,{recursive:true});});
test('shared family evidence objects still bind each distinct batch',()=>{const d=input(),c={...draft(),meaning:d.words[0].sense};d.clues=[c];const clueEvidence=evidenceFor([c],d.words,'clue');clueEvidence.familySample=d.evidence.reef.familySample;d.evidence[c.id]=clueEvidence;assert.throws(()=>bakeBank(d),/Actual family sample/);});
test('two-word batch is stored once and fully bakes',()=>{const d=input([word(),word('REED')]);const originalBytes=Buffer.byteLength(JSON.stringify(d));d.reviewBatches={batch:d.evidence.reef};d.evidence={reef:'batch',reed:'batch'};assert.ok(Buffer.byteLength(JSON.stringify(d))<originalBytes);assert.equal(bakeBank(d).asset.words.length,2);});
test('package and CI run guard on the actual export',()=>{const packageFile=process.env.WORD_TEST_PACKAGE_FILE??resolve('package.json'),ciFile=process.env.WORD_TEST_CI_FILE??resolve('.github/workflows/ci.yml');const p=JSON.parse(readFileSync(packageFile));assert.match(p.scripts.check,/npm run check:words:export/);assert.match(p.scripts['check:words:export'],/words\/check.mjs export/);assert.match(readFileSync(ciFile,'utf8'),/run: npm run check:words:export/);});
test('compressed CI policy is decoded, locked, used and bounded',async()=>{const {gzipSync}=await import('node:zlib');const dir=join(scratch,'ci-export');mkdirSync(dir);writeFileSync(join(dir,'app.js'),'hello');const env={...process.env,LITTLE_ISLAND_WORD_POLICY_LOCK:'',LITTLE_ISLAND_WORD_POLICY_JSON:'',LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64_2:'',LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64:gzipSync(Buffer.from(JSON.stringify(policy))).toString('base64')};const command=join(root,'scripts/words/check.mjs');const ok=spawnSync(process.execPath,[command,'export',dir],{cwd:root,env,encoding:'utf8'});assert.equal(ok.status,0,ok.stdout+ok.stderr);assert.equal(JSON.parse(ok.stdout).guard.policyDataChecked,true);const bad=spawnSync(process.execPath,[command,'export',dir],{cwd:root,env:{...env,LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64:'not-a-gzip'},encoding:'utf8'});assert.equal(bad.status,1);const huge=gzipSync(Buffer.from(JSON.stringify({...policy,padding:'X'.repeat(5*1024*1024)}))).toString('base64');const capped=spawnSync(process.execPath,[command,'export',dir],{cwd:root,env:{...env,LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64:huge},encoding:'utf8'});assert.equal(capped.status,1);});
test('guard allows broad substrings inside one longer word',()=>{const dir=join(scratch,'overlap');mkdirSync(dir);writeFileSync(join(dir,'app.bin'),'ALPHANONSENSEBC');assert.equal(guardTree(dir,{...policy,scan:['ALPHANONSENSE','ALPHANONSENSEB','ALPHANONSENSEBC']}).passed,true);});

// Round 2: individual clauses, changing artifacts, and record-scoped review.
for (const [name,change,rx] of [
 ['reviewer B must keep',ev=>{ev.reviews[1].items[0].verdict='reject';ev.reviews[1]=seal(ev.reviews[1]);rebind(ev);},/fresh blind review/],
 ['family decision must keep',ev=>ev.familySample.decision='reject',/family sample/],
 ['lead reconciliation hash',ev=>ev.lead.reconciliationSha256='a'.repeat(64),/lead reconciliation/],
 ['lead fixture must be false',ev=>ev.lead.fixture=true,/lead reconciliation/],
 ['distinct run IDs',ev=>{ev.reviews[1].runId=ev.reviews[0].runId;ev.reviews[1]=seal(ev.reviews[1]);},/independent/],
 ['distinct transcript hashes',ev=>{ev.reviews[1].transcriptSha256=ev.reviews[0].transcriptSha256;ev.reviews[1]=seal(ev.reviews[1]);ev.transcriptPaths[1]=ev.transcriptPaths[0];},/independent/],
]) fails(`clause ${name}`,d=>change(d.evidence.reef),rx);
for(const [field,value] of [['verdict','reject'],['relation','unrelated']])test(`clause variant ${field}`,()=>{const d=input([{...word('COLOR'),british:['COLOUR']}]),ev=d.evidence.color;ev.reviews[1].items[0].variants[0][field]=value;ev.reviews[1]=seal(ev.reviews[1]);rebind(ev);assert.throws(()=>bakeBank(d),/variant.*review/i);});
test('clause source ship permission',()=>{const file=join(root,'scripts/words/sources.lock.json'),original=readFileSync(file),d=input();try{const l=JSON.parse(original);l.sources[0].ship=false;writeFileSync(file,JSON.stringify(l));assert.throws(()=>bakeBank(d),/source/);}finally{writeFileSync(file,original);}});
for(const patch of [{answer:'REED'},{language:'ch'}])test(`clause clue ${JSON.stringify(patch)}`,()=>{const w={...word(),...('language' in patch?{...chWord(),id:'reef'}:{})},d=input([w]),c={...draft(),meaning:w.sense,answer:w.spelling,...('answer' in patch?patch:{})};d.clues=[c];d.evidence[c.id]=evidenceFor([c],[w],'clue');assert.throws(()=>bakeBank(d),/Clue answer mismatch/);});
test('clause crossword unreviewed runs beside a reviewed run',()=>assert.throws(()=>checkSurfaces({words:[word()],surfaces:[{id:'s',kind:'crossword',wordIds:['reef'],cells:[['R','E','E','F'],['#','#','#','#'],['C','O','L','D']]}],policy}),/unreviewed run/));
for(const key of ['policySha256','scanListSha256'])test(`clause lock ${key} without supplied policy`,async()=>{const {lockedPolicy}=await import(pathToFileURL(join(root,'scripts/words/policy.mjs')));try{writeFileSync(lockFile,JSON.stringify({...lock,[key]:'a'.repeat(64)}));assert.throws(()=>lockedPolicy(),/lock mismatch/);}finally{writeFileSync(lockFile,JSON.stringify(lock));}});
test('clause manifest same-length edit hash',()=>{const {dir,name}=stagedBank();try{const file=join(dir,name);writeFileSync(file,readFileSync(file,'utf8').replace('nature','natures'.slice(1)));assert.throws(()=>checkShippingTree(dir),/manifest hash/);}finally{rmSync(dir,{recursive:true,force:true});}});
test('clause CHamoru sensitive spelling and lemma rejection',()=>{for(const patch of [{spelling:'SYNTHETICHEADWORD'},{lemma:'SYNTHETICHEADWORD'}])assert.equal(core.answerAllowed({...chWord(),...patch},policy),false);});
for(const [name,contents] of [
 ['strings',{words:['COLD','REEF']}],['top-level',[{spelling:'COLD'}]],['nested',{pack:{words:[{spelling:'COLD'}]}}],['clues',{clues:[{answer:'COLD',text:'Synthetic'}]}],
])for(const prefix of ['src/games/wordsearch','content/words','assets/wordsearch'])test(`round2 admission ${prefix} ${name}`,()=>{const dir=join(scratch,'shape-admission');mkdirSync(join(dir,prefix),{recursive:true});writeFileSync(join(dir,prefix,'puzzles.json'),JSON.stringify(contents));try{assert.throws(()=>checkShippingTree(dir),/Unadmitted/);}finally{rmSync(dir,{recursive:true});}});
for(const [file,text] of [['content/words/puzzles.ts',"export const puzzles = ['COLD', 'REEF'];"],['content/words/puzzles.txt','COLD\nREEF']])test(`round2 admission ${file}`,()=>{const dir=join(scratch,'literal-admission');mkdirSync(join(dir,file,'..'),{recursive:true});writeFileSync(join(dir,file),text);try{assert.throws(()=>checkShippingTree(dir),/Unadmitted/);}finally{rmSync(dir,{recursive:true});}});
for(const source of ["require.context('../scripts/words')","require.resolve('../scripts/words/core.mjs')","import '../scripts/./words/core.mjs';","import '../scripts//words/core.mjs';"])test(`round2 dependency ${source}`,()=>{const dir=join(scratch,'dependency');mkdirSync(join(dir,'src'),{recursive:true});writeFileSync(join(dir,'src/x.ts'),source);try{assert.throws(()=>checkShippingTree(dir),/Private word dependency/);}finally{rmSync(dir,{recursive:true});}});
test('Hermes UTF16 string scan catches unconditional canary',()=>{const dir=join(scratch,'hbc-utf16');mkdirSync(dir);const source=join(scratch,'leak-utf16.js');writeFileSync(source,'globalThis.leak='+JSON.stringify([...policy.scan,policy.canaries[0]].join(' ')+' Å'));const r=spawnSync(hermesc,['-emit-binary','-out',join(dir,'main.hbc'),source],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.throws(()=>guardTree(dir,policy),/canary/);});
test('term exceptions are rejected after migration',()=>{const dir=join(scratch,'term-exception-migration');mkdirSync(dir);writeFileSync(join(dir,'data.txt'),'Synthetic');assert.throws(()=>guardTree(dir,{...policy,artifactTermExceptions:[]}),/Legacy artifact term exceptions/);});
test('guard exceptions do not invalidate unchanged bank inputs',()=>{const d=input(),p={...policy,artifactTermExceptions:[],legacyArtifactSha256:['a'.repeat(64)],legacyArtifactSource:'changed inherited source, not word policy'};try{writeFileSync(policyFile,JSON.stringify(p));writeFileSync(lockFile,JSON.stringify({...lock,policySha256:sha256(readFileSync(policyFile))}));assert.equal(bakeBank(d).asset.words.length,1);}finally{writeFileSync(policyFile,JSON.stringify(policy));writeFileSync(lockFile,JSON.stringify(lock));}});
test('dropping a rejected record preserves retained record reviews and family sample',()=>{const records=[word(),word('REED')],d=input(records),ev=d.evidence.reef;for(let i=0;i<2;i++){ev.reviews[i].items.find(r=>r.id==='reed').verdict='reject';ev.reviews[i]=seal(ev.reviews[i]);}rebind(ev);ev.lead.items.find(r=>r.id==='reed').decision='reject';d.words=[records[0]];d.surfaces[0].wordIds=['reef'];delete d.evidence.reed;assert.equal(bakeBank(d).asset.words.length,1);});
test('separate batches bind their records in a larger bank',()=>{const d=input([word(),word('REED')]);d.evidence.reef=evidenceFor([d.words[0]]);d.evidence.reed=evidenceFor([d.words[1]]);assert.equal(bakeBank(d).asset.words.length,2);});
test('CLI separate vocabulary prepares and bakes 300 words in two batches',()=>{const words=Array.from({length:300},(_,i)=>word('R'+String.fromCharCode(65+Math.floor(i/676),65+Math.floor(i/26)%26,65+i%26))),d={fixture:false,words,surfaces:[{id:'match',kind:'matching',wordIds:words.map(w=>w.id)}],canonicalTerms,policy,sourceDirectory:sources,evidence:{},reviewBatches:{}};for(let i=0;i<2;i++){const records=words.slice(i*250,(i+1)*250),file=join(scratch,`cli-input-${i}.private.json`),out=join(scratch,`cli-prepared-${i}`);writeFileSync(file,JSON.stringify({fixture:false,words:records,vocabulary:words}));const r=spawnSync(process.execPath,[join(root,'scripts/words/cli.mjs'),'prepare-words',file,policyFile,out,`batch-${i}`],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const prepared=JSON.parse(readFileSync(join(out,'prepared.private.json')));assert.equal(prepared.batch.records.length,records.length);assert.equal(prepared.batch.vocabularySha256,digest(words));d.reviewBatches[`batch-${i}`]=evidenceFor(records,words,'word',prepared);for(const w of records)d.evidence[w.id]=`batch-${i}`;}assert.equal(bakeBank(d).asset.words.length,300);});
for(const field of ['iosJavaScript.passed','source','policySha256','scanListSha256','admission.full','admission.passed','web.passed','ios.passed','ios.sha256'])test(`clause release receipt ${field}`,()=>{initGit();const web=join(scratch,'release-web'),ios=join(scratch,'release-ios'),file=join(scratch,`receipt-${field}.private.json`);checkRelease(root,web,ios,file);const r=JSON.parse(readFileSync(file));const keys=field.split('.');let target=r;for(const k of keys.slice(0,-1))target=target[k];const key=keys.at(-1);target[key]=typeof target[key]==='boolean'?false:'a'.repeat(64);writeFileSync(file,JSON.stringify(r));assert.throws(()=>verifyReleaseReceipt(root,file,web,ios),/receipt/);});
test('release and receipt refuse uncommitted source data',()=>{initGit();const file=join(root,'uncommitted.txt');writeFileSync(file,'Synthetic change');try{assert.throws(()=>checkRelease(root,join(scratch,'release-web'),join(scratch,'release-ios'),join(scratch,'dirty-receipt')),/clean source/);assert.throws(()=>verifyReleaseReceipt(root,join(scratch,'release-receipt.private.json'),join(scratch,'release-web'),join(scratch,'release-ios')),/clean source/);}finally{rmSync(file);}});
test('delivery commands call release then receipt immediately before action',async()=>{const {deliver}=await import(pathToFileURL(join(root,'scripts/words/delivery.mjs')));const env={LITTLE_ISLAND_WORD_WEB_ARTIFACT:'web',LITTLE_ISLAND_WORD_IOS_ARTIFACT:'ios',LITTLE_ISLAND_WORD_RELEASE_RECEIPT:'private-receipt'};for(const platform of ['web','ios']){const calls=[];assert.equal(deliver(platform,['synthetic-delivery'],root,env,(cmd,args)=>{calls.push([cmd,...args]);return {status:0};}),0);assert.deepEqual(calls,[['npm','run','check:words:release','--','web','ios','private-receipt'],['npm','run','check:words:receipt','--','private-receipt','web','ios'],['synthetic-delivery']]);for(const failed of ['check:words:release','check:words:receipt']){const rejected=[];assert.throws(()=>deliver(platform,['synthetic-delivery'],root,env,(cmd,args)=>{rejected.push(cmd);return {status:args.includes(failed)?1:0};}),/Delivery blocked/);assert.ok(!rejected.includes('synthetic-delivery'));}}});
test('native preview build and npm delivery scripts are gated',()=>{const scripts=JSON.parse(readFileSync(process.env.WORD_TEST_PACKAGE_FILE??resolve('package.json'))).scripts;assert.match(scripts['deliver:web'],/words\/delivery.mjs web/);assert.match(scripts['deliver:ios'],/words\/delivery.mjs ios/);const native=readFileSync(process.env.WORD_TEST_PREVIEW_FILE??resolve('scripts/ios-preview-bundle.mjs'),'utf8');assert.match(native,/checkShippingTree\(cwd,env.LITTLE_ISLAND_WORD_RECEIPTS,\{full:true\}\)/);assert.match(native,/gateDelivery\(cwd,\{\.\.\.env,EXPO_PUBLIC_LIBRARY_PREVIEW:"1"\}\);\s*putBack\(\);/);});
test('unreviewed manifest bank fails export and actual delivery before action',()=>{const {dir}=stagedBank(),web=join(scratch,'release-web'),ios=join(scratch,'release-ios'),marker=join(scratch,'SHOULD-NOT-DELIVER');try{assert.throws(()=>checkExport(dir,web),/admission evidence/);cpSync(join(root,'scripts'),join(dir,'scripts'),{recursive:true});symlinkSync(resolve('node_modules'),join(dir,'node_modules'));writeFileSync(join(dir,'.gitignore'),'node_modules/\n');writeFileSync(join(dir,'package.json'),JSON.stringify({scripts:{'check:words:release':'node scripts/words/check.mjs release','check:words:receipt':'node scripts/words/check.mjs receipt','deliver:web':'node scripts/words/delivery.mjs web --','deliver:ios':'node scripts/words/delivery.mjs ios --'}}));spawnSync('git',['init','-q',dir]);spawnSync('git',['-C',dir,'add','.']);spawnSync('git',['-C',dir,'-c','user.name=Synthetic','-c','user.email=test@example.invalid','commit','-qm','Synthetic']);for(const platform of ['web','ios']){const r=spawnSync('npm',['run',`deliver:${platform}`,'--',process.execPath,'-e',`require('fs').writeFileSync(${JSON.stringify(marker)},'BAD')`],{cwd:dir,encoding:'utf8',env:{...process.env,LITTLE_ISLAND_WORD_RECEIPTS:'',LITTLE_ISLAND_WORD_WEB_ARTIFACT:web,LITTLE_ISLAND_WORD_IOS_ARTIFACT:ios,LITTLE_ISLAND_WORD_RELEASE_RECEIPT:join(scratch,`unreviewed-${platform}.private.json`)}});assert.notEqual(r.status,0);assert.match(r.stdout+r.stderr,/admission evidence/);assert.throws(()=>readFileSync(marker),/ENOENT/);}}finally{rmSync(dir,{recursive:true,force:true});}});
test('games must use the word registry and cannot replace its generated loaders',()=>{const {dir}=stagedBank();try{mkdirSync(join(dir,'src/games'),{recursive:true});writeFileSync(join(dir,'src/games/x.ts'),"import bank from '../../content/words/banks/test.json';");assert.throws(()=>checkShippingTree(dir),/must use the admitted registry/);rmSync(join(dir,'src/games/x.ts'));writeFileSync(join(dir,'content/words/registry.generated.ts'),'export const bankLoaders={};');assert.throws(()=>checkShippingTree(dir),/loader registry differs/);}finally{rmSync(dir,{recursive:true,force:true});}});
for(const field of ['cells','letters','shuffle'])test(`matching rejects irrelevant ${field}`,()=>{const d=input();d.surfaces[0][field]=field==='cells'?[['C','O','L','D']]:'COLD';assert.throws(()=>bakeBank(d),/Unexpected fields/);});
test('word-search rejects unscanned letters',()=>{const d=input();d.surfaces=[{id:'s',kind:'word-search',wordIds:['reef'],cells:[['R','E','E','F']],listed:[{wordId:'reef',answer:'REEF',cells:[[0,0],[0,1],[0,2],[0,3]]}],letters:'COLD'}];assert.throws(()=>bakeBank(d),/Unexpected fields/);});
for(const field of ['topic','cells'])test(`runtime rejects object-valued ${field}`,()=>{const {dir,name,asset}=stagedBank();try{if(field==='topic')asset.words[0].topic={core:['COLD']};else {asset.surfaces[0]={id:'search',kind:'word-search',wordIds:['reef'],cells:{scan:['COLD']},listed:[]};}const bytes=JSON.stringify(asset);writeFileSync(join(dir,name),bytes);const manifest=JSON.parse(readFileSync(join(dir,'content/words/banks.manifest.json')));manifest.banks[0].sha256=sha256(bytes);manifest.banks[0].bytes=Buffer.byteLength(bytes);writeFileSync(join(dir,'content/words/banks.manifest.json'),JSON.stringify(manifest));assert.throws(()=>checkShippingTree(dir),/Private/);}finally{rmSync(dir,{recursive:true,force:true});}});

test('split compressed CI secret is decoded as one bounded policy',async()=>{const {gzipSync}=await import('node:zlib');const encoded=gzipSync(Buffer.from(JSON.stringify(policy))).toString('base64');const dir=join(scratch,'split-secret-export');mkdirSync(dir);writeFileSync(join(dir,'app.js'),'hello');const r=spawnSync(process.execPath,[join(root,'scripts/words/check.mjs'),'export',dir],{cwd:root,encoding:'utf8',env:{...process.env,LITTLE_ISLAND_WORD_POLICY_LOCK:'',LITTLE_ISLAND_WORD_POLICY_JSON:'',LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64:encoded.slice(0,40),LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64_2:encoded.slice(40)}});assert.equal(r.status,0,r.stdout+r.stderr);assert.equal(JSON.parse(r.stdout).guard.policyDataChecked,true);});
for(const [name,value,rx] of [['array',{},/Legacy artifact term exceptions/],['path',[{path:'../app.js',terms:[]}],/Legacy artifact term exceptions/],['review',[{path:'app.js',terms:[{term:'COLD',check:'literal',reason:'',evidence:''}]}],/Legacy artifact term exceptions/]])test(`guard exception requires ${name}`,()=>{const dir=join(scratch,`invalid-exception-${name}`);mkdirSync(dir);writeFileSync(join(dir,'app.js'),'hello');assert.throws(()=>guardTree(dir,{...policy,artifactTermExceptions:value}),rx);});
test('frozen inherited pack cannot admit a changed record',()=>{const dir=join(scratch,'frozen-pack');mkdirSync(join(dir,'content/words'),{recursive:true});writeFileSync(join(dir,'content/words/legacy-word-rescue.ts'),"export const legacyWordRescue=[['COLD','Synthetic','Synthetic']];");assert.throws(()=>checkShippingTree(dir),/Unadmitted edit/);});
test('runtime wheel letters must be a string',()=>{const {dir,name,asset}=stagedBank();try{asset.surfaces=[{id:'wheel',kind:'wheel',wordIds:['reef'],letters:{scan:['COLD']}}];const bytes=JSON.stringify(asset);writeFileSync(join(dir,name),bytes);const manifest=JSON.parse(readFileSync(join(dir,'content/words/banks.manifest.json')));manifest.banks[0].sha256=sha256(bytes);manifest.banks[0].bytes=Buffer.byteLength(bytes);writeFileSync(join(dir,'content/words/banks.manifest.json'),JSON.stringify(manifest));assert.throws(()=>checkShippingTree(dir),/Private/);}finally{rmSync(dir,{recursive:true,force:true});}});

test('runtime listed entries reject private extras on a valid search surface',()=>{const {dir,name,asset}=stagedBank();try{asset.surfaces=[{id:'search',kind:'word-search',wordIds:['reef'],cells:[['R','E','E','F']],listed:[{wordId:'reef',answer:'REEF',cells:[[0,0],[0,1],[0,2],[0,3]],reviewNote:'PRIVATE'}]}];const bytes=JSON.stringify(asset);writeFileSync(join(dir,name),bytes);const manifest=JSON.parse(readFileSync(join(dir,'content/words/banks.manifest.json')));manifest.banks[0].sha256=sha256(bytes);manifest.banks[0].bytes=Buffer.byteLength(bytes);writeFileSync(join(dir,'content/words/banks.manifest.json'),JSON.stringify(manifest));assert.throws(()=>checkShippingTree(dir),/listed path/);}finally{rmSync(dir,{recursive:true,force:true});}});

test('artifact exceptions cannot exempt case-folded hashes or full lists',()=>{const dir=join(scratch,'folded-unconditional');mkdirSync(dir);const p={...policy,artifactTermExceptions:[{path:'app.js',terms:[{term:'COLD',check:'literal',reason:'Synthetic inherited text',evidence:'synthetic-context'}]}]};for(const text of [lock.scanListSha256.toUpperCase(),JSON.stringify(policy.core).toLowerCase()]){writeFileSync(join(dir,'app.js'),'globalThis.text='+JSON.stringify(text));assert.throws(()=>guardTree(dir,p),/leaked|Legacy artifact term exceptions/);}});

// W-guard: placeholder terms only. These cases describe exported meanings,
// never the actual private lists or a content approval.
function exportCase(name, file, text, p=policy, rejected=false) {
 test(name,()=>{const dir=join(scratch,name.replaceAll(' ','-'));mkdirSync(dir);writeFileSync(join(dir,file),text);if(rejected)assert.throws(()=>guardTree(dir,p,[],{sourceRoot:root}),/leaked|forbidden|exception|language|UTF-16/);else assert.equal(guardTree(dir,p,[],{sourceRoot:root}).passed,true);});
}
exportCase('guard longer visible word','app.js','globalThis.label="COLDER";');
exportCase('guard minified identifiers','app.js','function COLD(a){const ALPHANONSENSE=1,BETANONSENSE=2,GAMMANONSENSE=3;return a+ALPHANONSENSE+BETANONSENSE+GAMMANONSENSE;}');
exportCase('guard style key substrings','app.js','globalThis.style={COLDColor:1,ALPHANONSENSEColor:2,BETANONSENSEColor:3,GAMMANONSENSEColor:4};');
exportCase('guard encoded string substrings','app.js','globalThis.bytes="XCOLDbXALPHANONSENSEBETANONSENSEGAMMANONSENSEZ==";');
exportCase('guard blocked visible string','app.js','globalThis.label="Hear COLD today";',policy,true);
exportCase('guard escaped blocked visible string','app.js','globalThis.label="Hear \\u0043OLD today";',policy,true);
exportCase('guard template blocked visible string','app.js','globalThis.label=`Hear COLD ${name} today`;',policy,true);
exportCase('guard three broad JS words','app.js','globalThis.words=["ALPHANONSENSE","BETANONSENSE","GAMMANONSENSE"];',policy,true);
exportCase('guard broad unquoted keys','app.js','globalThis.words={ALPHANONSENSE:1,BETANONSENSE:2,GAMMANONSENSE:3};',policy,true);
exportCase('guard broad JSON words','bank.json','["ALPHANONSENSE","BETANONSENSE","GAMMANONSENSE"]',policy,true);
exportCase('guard Unicode letter boundaries','app.js','globalThis.label="éCOLD COLDñ";');
exportCase('guard punctuation boundaries','app.js','globalThis.label="(cold)!";',policy,true);
exportCase('guard actual word grid','bank.json',JSON.stringify({language:'en',cells:[['C','O','L','D']]}),policy,true);
exportCase('guard reversed word grid','bank.json',JSON.stringify({language:'en',cells:[['D','L','O','C']]}),policy,true);
exportCase('guard vertical word grid','bank.json',JSON.stringify({language:'en',cells:[['C'],['O'],['L'],['D']]}),policy,true);
exportCase('guard benign media encoding','picture.png',Buffer.from('noiseCOLDnoiseALPHANONSENSEnoiseBETANONSENSEnoiseGAMMANONSENSEnoise'));
exportCase('guard private blob despite exceptions','app.js','globalThis.leak='+JSON.stringify(JSON.stringify(policy.chamoruSensitive).toLowerCase()),{...policy,artifactStringExceptions:[]},true);
for(const [name,source,fail] of [
 ['whole word','globalThis.label="COLD";',true],
 ['regex fragment','globalThis.pattern=/ALPHANONSENSE|BETANONSENSE|GAMMANONSENSE/;',true],
 ['three broad words','globalThis.leak="ALPHANONSENSE BETANONSENSE GAMMANONSENSE";',true],
 ['separate storage boundaries','globalThis.words=["XCOL","D","ALPHANONSENSEB","BETANONSENSEB","GAMMANONSENSEB"];',false],
 ['UTF16 word','globalThis.label="COLD Å";',true],
 ['overflow word','globalThis.label='+JSON.stringify('Q'.repeat(300)+' COLD')+';',true],
 ['style substrings','globalThis.style={COLDColor:"blue",ALPHANONSENSEColor:1,BETANONSENSEColor:2,GAMMANONSENSEColor:3};',false],
]) test(`guard Hermes ${name}`,()=>{const dir=join(scratch,`hbc-${name.replaceAll(' ','-')}`);mkdirSync(dir);const input=join(scratch,'hbc-input.js');writeFileSync(input,source);const r=spawnSync(hermesc,['-emit-binary','-out',join(dir,'app.hbc'),input],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);if(fail)assert.throws(()=>guardTree(dir,policy),/leaked/);else assert.equal(guardTree(dir,policy).passed,true);});

// Synthetic codec uses the real row decoder, with isolated family bindings.
// Its symbol string stands for numeric cells, like cage IDs in numeric packs.
function packedCase(name,encoded,decoded,rejected=false,objectives=0,family='synthetic',authored=[]) {
 test(name,()=>{
  const source=join(scratch,`pack-source-${name.replaceAll(' ','-')}`),dir=join(source,'dist');
  mkdirSync(join(source,'scripts/puzzles/families'),{recursive:true});mkdirSync(join(source,'src/puzzles'),{recursive:true});mkdirSync(join(source,'src/state'));mkdirSync(dir);
  symlinkSync(resolve('node_modules'),join(source,'node_modules'));
  for(const file of ['scripts/puzzles/register.mjs','scripts/puzzles/hooks.mjs','src/puzzles/descriptor.ts','src/puzzles/bank.ts','src/puzzles/types.ts','src/state/saveBits.ts']) cpSync(resolve(file),join(source,file));
  writeFileSync(join(source,'scripts/puzzles/families/index.ts'),`export const families=[{id:${JSON.stringify(family)},bands:[{id:'a'}],adapter:{rules:1,decodePayload:x=>x===${JSON.stringify(encoded)}?${JSON.stringify(decoded)}:null,isPayload:x=>!!x}}];`);
  if(authored.length){mkdirSync(join(source,'src/app'),{recursive:true});writeFileSync(join(source,'src/app/index.ts'),'export const words='+JSON.stringify(authored)+';');}
  const header={format:1,family,slot:0,first:0,count:1,band:'a',rules:1,rng:1};
  writeFileSync(join(dir,'p0.lipuzzle'),JSON.stringify(header)+'\n'+JSON.stringify([1,'layout','template',encoded,0,objectives]));
  const original=process.cwd();try{process.chdir(source);if(rejected)assert.throws(()=>guardTree(dir,policy),/leaked|no admitted authored source/);else assert.equal(guardTree(dir,policy).passed,true);}finally{process.chdir(original);}
 });
}
packedCase('guard numeric encoded pack collision','COLD',{values:[2,14,11,3]});
packedCase('guard base64 numeric pack collision','XCOLDbXALPHANONSENSEBETANONSENSEGAMMANONSENSEZ==',{values:[1,2,3]});
packedCase('guard decoded packed word grid','numeric-code',{language:'en',cells:[['C','O','L','D']]},true);
packedCase('guard decoded packed visible word','numeric-code',{clue:'COLD'},true);
exportCase('guard partial list comment','app.js','// ALPHANONSENSE BETANONSENSE GAMMANONSENSE\nglobalThis.label="safe";',policy,true);
exportCase('guard row string grid','bank.json',JSON.stringify({grid:['COLD']}),policy,true);
exportCase('guard word list is not a grid','bank.json',JSON.stringify({language:'en',words:['XCOL','DXXX']}));
test('guard malformed JavaScript fails closed',()=>{const dir=join(scratch,'invalid-js');mkdirSync(dir);writeFileSync(join(dir,'app.js'),'globalThis.x="unterminated');assert.throws(()=>guardTree(dir,policy),/Cannot parse exported JavaScript/);});
test('guard malformed JSON fails closed',()=>{const dir=join(scratch,'invalid-json');mkdirSync(dir);writeFileSync(join(dir,'bank.json'),'{');assert.throws(()=>guardTree(dir,policy),/Cannot parse exported JSON/);});
for(const kind of ['header','version','file length','tables','overflow','string range'])test(`guard Hermes invalid ${kind}`,()=>{
 const path=join(scratch,`invalid-hbc-${kind}`),input=join(scratch,'invalid-hbc.js');
 writeFileSync(input,'globalThis.label='+JSON.stringify(kind==='overflow'?'Q'.repeat(300):'HELLO'));
 const r=spawnSync(hermesc,['-emit-binary','-out',path,input],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
 let bytes=readFileSync(path);
 if(kind==='header')bytes=bytes.subarray(0,30);
 if(kind==='version')bytes.writeUInt32LE(99,8);
 if(kind==='file length')bytes.writeUInt32LE(0,32);
 if(kind==='tables')bytes.writeUInt32LE(0xffffffff,52);
 if(kind==='overflow'||kind==='string range') {
  const table=128+bytes.readUInt32LE(40)*12+bytes.readUInt32LE(44)*4+bytes.readUInt32LE(48)*4;
  bytes.writeUInt32LE(kind==='overflow'?0xfffffffe:0x0afffffe,table);
 }
 const messages={header:'Invalid Hermes header',version:'Unsupported Hermes bytecode version','file length':'Invalid Hermes file length',tables:'Invalid Hermes string tables',overflow:'Invalid Hermes overflow string','string range':'Invalid Hermes string range'};
 assert.throws(()=>hermesStrings(bytes),e=>e.message===messages[kind]);
});
function stringPolicy(texts) {
 return {...policy,artifactStringExceptions:[{path:'app.js',strings:texts.map(text=>({sha256:sha256(text),occurrences:1,terms:policy.scan.filter(term=>!policy.core.includes(term)).map(term=>({term,check:'broad',reason:'Synthetic inherited collision',evidence:'synthetic'}))}))}]};
}
exportCase('guard exact reviewed string','app.js','globalThis.label="ALPHANONSENSE BETANONSENSE GAMMANONSENSE";',stringPolicy(['ALPHANONSENSE BETANONSENSE GAMMANONSENSE']));
exportCase('guard changed reviewed string rejected','app.js','globalThis.label="ALPHANONSENSE BETANONSENSE GAMMANONSENSE extra";',stringPolicy(['ALPHANONSENSE BETANONSENSE GAMMANONSENSE']),true);
exportCase('guard additional reviewed occurrence rejected','app.js','globalThis.label="ALPHANONSENSE BETANONSENSE GAMMANONSENSE";globalThis.another="ALPHANONSENSE BETANONSENSE GAMMANONSENSE";',stringPolicy(['ALPHANONSENSE BETANONSENSE GAMMANONSENSE']),true);
exportCase('guard legacy semantic term exception cannot hide word','app.js','globalThis.label="COLD new";',{...policy,artifactTermExceptions:[{path:'app.js',terms:[{term:'COLD',check:'literal',reason:'Synthetic inherited collision',evidence:'synthetic'}]}]},true);
exportCase('guard additional broad array despite reviewed words','app.js','globalThis.old=["ALPHANONSENSE","BETANONSENSE","GAMMANONSENSE"];globalThis.leak=["ALPHANONSENSE","BETANONSENSE","GAMMANONSENSE"];',stringPolicy(['ALPHANONSENSE','BETANONSENSE','GAMMANONSENSE',JSON.stringify(['ALPHANONSENSE','BETANONSENSE','GAMMANONSENSE'])]),true);
for(const [name,value,rx] of [
 ['array',{},/Invalid artifact string exceptions/],
 ['path',[{path:'../app.js',strings:[]}],/string exception path/],
 ['hash',[{path:'app.js',strings:[{sha256:'bad',occurrences:1,terms:[{}]}]}],/Invalid artifact string exception/],
 ['count',[{path:'app.js',strings:[{sha256:'a'.repeat(64),occurrences:0,terms:[{}]}]}],/Invalid artifact string exception/],
 ['review',[{path:'app.js',strings:[{sha256:'a'.repeat(64),occurrences:1,terms:[{check:'literal',term:'COLD',reason:'',evidence:''}]}]}],/Unreviewed artifact string exception/],
])test(`guard string exception requires ${name}`,()=>{const dir=join(scratch,`invalid-string-${name}`);mkdirSync(dir);writeFileSync(join(dir,'app.js'),'hello');assert.throws(()=>guardTree(dir,{...policy,artifactStringExceptions:value}),rx);});
test('string exceptions do not invalidate unchanged bank inputs',()=>{const d=input(),p={...policy,artifactStringExceptions:[]};try{writeFileSync(policyFile,JSON.stringify(p));writeFileSync(lockFile,JSON.stringify({...lock,policySha256:sha256(readFileSync(policyFile))}));assert.equal(bakeBank(d).asset.words.length,1);}finally{writeFileSync(policyFile,JSON.stringify(policy));writeFileSync(lockFile,JSON.stringify(lock));}});
test('guard refuses an undecodable pack',()=>{const dir=join(scratch,'unknown-pack');mkdirSync(dir);writeFileSync(join(dir,'p0.lipuzzle'),JSON.stringify({format:1,family:'unknown',count:1})+'\n[1,"layout","template",0]');assert.throws(()=>guardTree(dir,policy),/Cannot decode exported puzzle packs/);});
exportCase('guard generated asset paths are technical','sw.js','globalThis.assets=["/assets/assets/COLD.ALPHANONSENSE.0123456789abcdef0123456789abcdef.m4a","/assets/assets/BETANONSENSE.0123456789abcdef0123456789abcdef.m4a","/assets/assets/GAMMANONSENSE.0123456789abcdef0123456789abcdef.m4a"];');
exportCase('guard canary inside technical path','sw.js','globalThis.assets=["/assets/assets/PRIVATECANARYNONWORD.0123456789abcdef0123456789abcdef.m4a"];',policy,true);
exportCase('guard HTML visible word','index.html','<html><title>COLD</title></html>',policy,true);
exportCase('guard HTML accessible label','index.html','<img alt="COLD" src="/assets/safe.png">',policy,true);
exportCase('guard HTML inline array leak','index.html','<script>globalThis.words=["ALPHANONSENSE","BETANONSENSE","GAMMANONSENSE"];</script>',policy,true);
exportCase('guard serialized worklet identifiers','app.js','globalThis.code='+JSON.stringify('function f(COLD){const ALPHANONSENSE=1,BETANONSENSE=2,GAMMANONSENSE=3;return COLD+ALPHANONSENSE+BETANONSENSE+GAMMANONSENSE;}')+';');
exportCase('guard serialized worklet user string','app.js','globalThis.code='+JSON.stringify('function f(){return "COLD";}')+';',policy,true);
test('multiple bounded CI policy chunks decode together',async()=>{const {gzipSync}=await import('node:zlib');const encoded=gzipSync(Buffer.from(JSON.stringify(policy))).toString('base64'),dir=join(scratch,'multi-secret-export');mkdirSync(dir);writeFileSync(join(dir,'app.js'),'hello');const r=spawnSync(process.execPath,[join(root,'scripts/words/check.mjs'),'export',dir],{cwd:root,encoding:'utf8',env:{...process.env,LITTLE_ISLAND_WORD_POLICY_LOCK:'',LITTLE_ISLAND_WORD_POLICY_JSON:'',LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64:encoded.slice(0,40),LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64_2:encoded.slice(40,80),LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64_3:encoded.slice(80)}});assert.equal(r.status,0,r.stdout+r.stderr);assert.equal(JSON.parse(r.stdout).guard.policyDataChecked,true);});

packedCase('guard packed metadata partial list','numeric-code',{values:[1,2,3]},true,['alphanonsense','betanonsense','gammanonsense']);
exportCase('guard regexp comment delimiters are code','app.js','globalThis.r=/[//]/; const ALPHANONSENSE=1,BETANONSENSE=2,GAMMANONSENSE=3;');

exportCase('guard property key is not displayed text','app.js','globalThis.fields={COLD:1};');
exportCase('guard regex partial list','app.js','globalThis.pattern=/ALPHANONSENSE|BETANONSENSE|GAMMANONSENSE/;',policy,true);
exportCase('guard regex single term is code','app.js','globalThis.pattern=/COLD/;');
exportCase('guard HTML regex partial list','index.html','<script>globalThis.pattern=/ALPHANONSENSE|BETANONSENSE|GAMMANONSENSE/;</script>',policy,true);
exportCase('guard HTML key map partial list','index.html','<script>globalThis.words={ALPHANONSENSE:1,BETANONSENSE:2,GAMMANONSENSE:3};</script>',policy,true);

// Round 2 uses only placeholder terms. Scope is part of the safety contract.
exportCase('guard independent UI strings are advisory','app.js','globalThis.a="ALPHANONSENSE";globalThis.b="BETANONSENSE";globalThis.c="GAMMANONSENSE";');
exportCase('guard independent objects do not aggregate','app.js','globalThis.a={label:"ALPHANONSENSE"};globalThis.b={label:"BETANONSENSE"};globalThis.c={label:"GAMMANONSENSE"};');
exportCase('guard independent JSON records do not aggregate','bank.json','[{"label":"ALPHANONSENSE","id":1},{"label":"BETANONSENSE","id":2},{"label":"GAMMANONSENSE","id":3}]');
exportCase('guard single string partial list','app.js','globalThis.a="ALPHANONSENSE BETANONSENSE GAMMANONSENSE";',policy,true);
exportCase('guard English sensitive headword allowed','app.js','globalThis.label="SYNTHETICHEADWORD";');
exportCase('guard CHamoru tagged label','bank.json','{"language":"ch","label":"SYNTHETICHEADWORD"}',policy,true);
exportCase('guard CHamoru tagged speech','bank.json','{"language":"ch","speech":["SYNTHETICHEADWORD"]}',policy,true);
exportCase('guard English tagged label','bank.json','{"language":"en","label":"SYNTHETICHEADWORD"}');
exportCase('guard CHamoru matching label','bank.json','{"language":"ch","words":[{"spelling":"SYNTHETICHEADWORD"}]}',policy,true);
const sensitiveGridPolicy={...policy,scan:[...policy.scan,'ZORPLE'],chamoruSensitive:['ZORPLE']};
exportCase('guard English grid skips sensitive-only term','bank.json','{"language":"en","cells":[["Z","O","R","P","L","E"]]}',sensitiveGridPolicy);
exportCase('guard CHamoru grid keeps sensitive term','bank.json','{"language":"ch","cells":[["Z","O","R","P","L","E"]]}',sensitiveGridPolicy,true);
for(const [name,source] of [
 ['canonical term','export const chamoruWords=[{term:"SYNTHETICHEADWORD",english:"Safe"}];'],
 ['tagged source','export const records=[{language:"ch",label:"SYNTHETICHEADWORD"}];'],
 ['tagged speech source','export const records=[{language:"ch",speech:["SYNTHETICHEADWORD"]}];']
])test(`guard CHamoru ${name}`,()=>{
 const sourceRoot=join(scratch,`ch-source-${name.replaceAll(' ','-')}`),dir=join(sourceRoot,'dist');
 mkdirSync(join(sourceRoot,'src/learn/content'),{recursive:true});mkdirSync(dir);
 writeFileSync(join(sourceRoot,'src/learn/content/chamoru.ts'),source);writeFileSync(join(dir,'app.js'),'globalThis.label="Safe";');
 assert.throws(()=>guardTree(dir,policy,[],{sourceRoot}),/blocked-chamoru-source|plain string literals/);
});
test('guard missing source companion fails closed',()=>{
 const sourceRoot=join(scratch,'missing-ch-source'),dir=join(sourceRoot,'dist');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'app.js'),'globalThis.a="SYNTHETICHEADWORD";');
 assert.throws(()=>guardTree(dir,policy,[],{sourceRoot}),/source companion required/);
});
test('guard advisory is private and does not fail build',()=>{
 const dir=join(scratch,'advisory-case');mkdirSync(dir);writeFileSync(join(dir,'app.js'),'globalThis.a="ALPHANONSENSE";');
 const result=guardTree(dir,policy);assert.equal(result.passed,true);assert.equal(result.advisoryCount,1);
 const receipt=JSON.parse(readFileSync(result.advisoryFile));assert.deepEqual(receipt.advisories[0].terms,['ALPHANONSENSE']);
 assert.ok(!result.advisoryFile.startsWith(dir));
});

test('guard source tree symlink rejected',()=>{
 const sourceRoot=join(scratch,'source-dir-link'),dir=join(sourceRoot,'dist');mkdirSync(dir,{recursive:true});
 symlinkSync(resolve('src'),join(sourceRoot,'src'));writeFileSync(join(dir,'app.js'),'globalThis.safe=1;');
 assert.throws(()=>guardTree(dir,policy,[],{sourceRoot}),/Symlink in CHamoru source tree/);
});
test('guard source file symlink rejected',()=>{
 const sourceRoot=join(scratch,'source-file-link'),dir=join(sourceRoot,'dist');mkdirSync(join(sourceRoot,'src/learn/content'),{recursive:true});mkdirSync(dir);
 symlinkSync(resolve('src/learn/content/chamoru.ts'),join(sourceRoot,'src/learn/content/chamoru.ts'));writeFileSync(join(dir,'app.js'),'globalThis.safe=1;');
 assert.throws(()=>guardTree(dir,policy,[],{sourceRoot}),/Symlink in CHamoru source tree/);
});
test('guard malformed CHamoru source fails closed',()=>{
 const sourceRoot=join(scratch,'source-invalid'),dir=join(sourceRoot,'dist');mkdirSync(join(sourceRoot,'src/learn/content'),{recursive:true});mkdirSync(dir);
 writeFileSync(join(sourceRoot,'src/learn/content/chamoru.ts'),'export const words=[{term:"unterminated');writeFileSync(join(dir,'app.js'),'globalThis.safe=1;');
 assert.throws(()=>guardTree(dir,policy,[],{sourceRoot}),/Cannot parse CHamoru content source/);
});
test('guard separate Hermes entries are advisory',()=>{
 const dir=join(scratch,'separate-hbc');mkdirSync(dir);const source=join(scratch,'separate-hbc.js');writeFileSync(source,'globalThis.a="ALPHANONSENSE";globalThis.b="BETANONSENSE";globalThis.c="GAMMANONSENSE";');
 const r=spawnSync(hermesc,['-emit-binary','-out',join(dir,'app.hbc'),source],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.equal(guardTree(dir,policy).passed,true);
});

exportCase('guard sentence with broad words is advisory','app.js','globalThis.label="The ALPHANONSENSE crosses a quiet shoreline while BETANONSENSE watches distant waves and GAMMANONSENSE rests beside smooth stones.";');
exportCase('guard prose array is advisory','app.js','globalThis.labels=["The ALPHANONSENSE is here.","The BETANONSENSE is there.","The GAMMANONSENSE is ready."];');
exportCase('guard mixed UI object is advisory','app.js','globalThis.card={id:"ALPHANONSENSE",label:"BETANONSENSE",description:"GAMMANONSENSE"};');
exportCase('guard comma list fragment','app.js','globalThis.leak="ALPHANONSENSE, BETANONSENSE, GAMMANONSENSE";',policy,true);
exportCase('guard pipe list fragment','app.js','globalThis.leak="ALPHANONSENSE|BETANONSENSE|GAMMANONSENSE";',policy,true);
exportCase('guard newline list fragment','app.js','globalThis.leak="ALPHANONSENSE\\nBETANONSENSE\\nGAMMANONSENSE";',policy,true);
exportCase('guard tab list fragment','app.js','globalThis.leak="ALPHANONSENSE\\tBETANONSENSE\\tGAMMANONSENSE";',policy,true);
exportCase('guard short phrase array fragment','app.js','globalThis.leak=["ALPHANONSENSE berry","BETANONSENSE fruit","GAMMANONSENSE flower"];',policy,true);
exportCase('guard long short word array fragment','app.js','globalThis.leak='+JSON.stringify([...Array(50).fill('NEUTRAL'),'ALPHANONSENSE','BETANONSENSE','GAMMANONSENSE'])+';',policy,true);
exportCase('guard English sensitive list is advisory','app.js','globalThis.labels=["ZORPLE","ZORPLETWO","ZORPLETHREE"];',{...policy,scan:['ZORPLE','ZORPLETWO','ZORPLETHREE','UNUSEDMARKER'],chamoruSensitive:['ZORPLE','ZORPLETWO','ZORPLETHREE','OTHERPRIVATE']});

test('guard dynamic CHamoru teaching term fails closed',()=>{
 const sourceRoot=join(scratch,'source-dynamic'),dir=join(sourceRoot,'dist');mkdirSync(join(sourceRoot,'src/learn/content'),{recursive:true});mkdirSync(dir);
 writeFileSync(join(sourceRoot,'src/learn/content/chamoru.ts'),'export const words=[{term:makeTerm()}];');writeFileSync(join(dir,'app.js'),'globalThis.safe=1;');
 assert.throws(()=>guardTree(dir,policy,[],{sourceRoot}),/teaching term must be static text/);
});

exportCase('guard comma prose without final stop is advisory','app.js','globalThis.label="The ALPHANONSENSE crosses a quiet shoreline, while BETANONSENSE watches distant waves with GAMMANONSENSE resting beside smooth stones";');
exportCase('guard comma list with connective word','app.js','globalThis.leak="ALPHANONSENSE, BETANONSENSE, the, GAMMANONSENSE";',policy,true);

const boundaryTokens=['the','and','of','ALPHANONSENSE','BETANONSENSE','GAMMANONSENSE',...Array(6).fill('NEUTRAL')];
exportCase('guard tokenized prose at quarter threshold','app.js','globalThis.tokens='+JSON.stringify(boundaryTokens)+';',policy,true);
exportCase('guard padded list below quarter threshold','app.js','globalThis.tokens='+JSON.stringify([...boundaryTokens,'NEUTRAL'])+';',policy,true);
exportCase('guard short list with one function word remains strict','app.js','globalThis.tokens=["the","ALPHANONSENSE","BETANONSENSE","GAMMANONSENSE"];',policy,true);
exportCase('guard private function word overlap cannot excuse list','app.js','globalThis.tokens='+JSON.stringify(boundaryTokens)+';',{...policy,scan:[...policy.scan,'THE','AND','OF']},true);

const listUnit=JSON.stringify(['ALPHANONSENSE','BETANONSENSE','GAMMANONSENSE']);
exportCase('guard exact reviewed list unit','app.js','globalThis.words=["ALPHANONSENSE","BETANONSENSE","GAMMANONSENSE"];',stringPolicy([listUnit]));
exportCase('guard changed reviewed list unit','app.js','globalThis.words=["ALPHANONSENSE","BETANONSENSE","GAMMANONSENSE","NEUTRAL"];',stringPolicy([listUnit]),true);
exportCase('guard list exception path is anchored','other.js','globalThis.words=["ALPHANONSENSE","BETANONSENSE","GAMMANONSENSE"];',stringPolicy([listUnit]),true);

function libraryTraceCase(name,source,rejected=false,sourceTitle='ALPHANONSENSE BETANONSENSE GAMMANONSENSE',indexOnly=false) {
 test(name,()=>{
  const sourceRoot=join(scratch,name.replaceAll(' ','-')),dir=join(sourceRoot,'dist');
  mkdirSync(join(sourceRoot,'src/library'),{recursive:true});mkdirSync(join(sourceRoot,'content/library'),{recursive:true});mkdirSync(join(sourceRoot,'src/learn/content'),{recursive:true});mkdirSync(dir);
  writeFileSync(join(sourceRoot,'src/learn/content/chamoru.ts'),'export const chamoruWords=[];');
  cpSync(resolve('src/library/search.ts'),join(sourceRoot,'src/library/search.ts'));
  const authored=[{language:'en',id:'synthetic-item',title:sourceTitle,aliases:[],tags:[]}];
  writeFileSync(join(sourceRoot,'content/library/items.json'),JSON.stringify(authored));
  if(indexOnly)writeFileSync(join(sourceRoot,'src/library/catalog.generated.json'),JSON.stringify({items:[],preview:true,bytes:0,fixtures:[],index:[{id:'other-item',terms:['alphanonsense','betanonsense','gammanonsense']}]}));
  writeFileSync(join(dir,source.startsWith('globalThis')?'data.js':'data.json'),source);
  if(rejected)assert.throws(()=>guardTree(dir,policy,[],{sourceRoot}),/leaked|derive Library|language declaration|no admitted authored source/);else assert.equal(guardTree(dir,policy,[],{sourceRoot}).passed,true);
 });
}
const tracedRecord=JSON.stringify({items:[],preview:true,bytes:0,fixtures:[],index:[{id:'synthetic-item',terms:['alphanonsense','betanonsense','gammanonsense']}]});
libraryTraceCase('guard Library traced tokens advisory',tracedRecord,false,'The ALPHANONSENSE crosses a quiet shoreline while BETANONSENSE watches distant waves and GAMMANONSENSE rests beside smooth stones.');
libraryTraceCase('guard Library planted untraceable token',tracedRecord,true,'The ALPHANONSENSE is BETANONSENSE rather than NEUTRAL.');
libraryTraceCase('guard Library unattached token array',JSON.stringify({items:[],preview:true,bytes:0,fixtures:[],index:[{language:'en',id:'synthetic-item',terms:['neutral']}],stray:{id:'synthetic-item',terms:['alphanonsense','betanonsense','gammanonsense']}}),true,'The ALPHANONSENSE crosses a quiet shoreline while BETANONSENSE watches distant waves and GAMMANONSENSE rests beside smooth stones.');
libraryTraceCase('guard Library other item cannot provide tokens',JSON.stringify({items:[],preview:true,bytes:0,fixtures:[],index:[{id:'other-item',terms:['alphanonsense','betanonsense','gammanonsense']}]}),true,'The ALPHANONSENSE crosses a quiet shoreline while BETANONSENSE watches distant waves and GAMMANONSENSE rests beside smooth stones.');
libraryTraceCase('guard Library generated terms are not their own source',JSON.stringify({items:[],preview:true,bytes:0,fixtures:[],index:[{id:'other-item',terms:['alphanonsense','betanonsense','gammanonsense']}]}),true,'A neutral source.',true);
libraryTraceCase('guard Library authored list string remains strict',tracedRecord,true);
libraryTraceCase('guard Library core word remains blocked',JSON.stringify({items:[],preview:true,bytes:0,fixtures:[],index:[{id:'synthetic-item',terms:['cold']}]}),true,'The COLD word remains blocked.');
test('guard Library malformed provenance fails closed',()=>{
 const sourceRoot=join(scratch,'library-invalid'),dir=join(sourceRoot,'dist');mkdirSync(join(sourceRoot,'src/library'),{recursive:true});mkdirSync(join(sourceRoot,'content/library'),{recursive:true});mkdirSync(dir);
 cpSync(resolve('src/library/search.ts'),join(sourceRoot,'src/library/search.ts'));writeFileSync(join(sourceRoot,'content/library/items.json'),'{');writeFileSync(join(dir,'data.json'),'{"items":[],"preview":true,"bytes":0,"fixtures":[],"index":[]}');assert.throws(()=>guardTree(dir,policy,[],{sourceRoot}),/Cannot derive Library token provenance/);
});

libraryTraceCase('guard Library JS traced tokens advisory','globalThis.catalog='+tracedRecord+';',false,'The ALPHANONSENSE crosses a quiet shoreline while BETANONSENSE watches distant waves and GAMMANONSENSE rests beside smooth stones.');
libraryTraceCase('guard Library JS planted untraceable token','globalThis.catalog='+tracedRecord+';',true,'The ALPHANONSENSE is BETANONSENSE rather than NEUTRAL.');
libraryTraceCase('guard Library JS unattached token array','globalThis.data='+JSON.stringify({items:[],preview:true,bytes:0,fixtures:[],index:[{language:'en',id:'synthetic-item',terms:['neutral']}],stray:{id:'synthetic-item',terms:['alphanonsense','betanonsense','gammanonsense']}})+';',true,'The ALPHANONSENSE crosses a quiet shoreline while BETANONSENSE watches distant waves and GAMMANONSENSE rests beside smooth stones.');
test('guard Library tokenizer drift fails closed',()=>{
 const sourceRoot=join(scratch,'library-tokenizer-drift'),dir=join(sourceRoot,'dist');mkdirSync(join(sourceRoot,'src/library'),{recursive:true});mkdirSync(join(sourceRoot,'content/library'),{recursive:true});mkdirSync(dir);
 writeFileSync(join(sourceRoot,'src/library/search.ts'),'export const normalize=s=>s.toUpperCase();export const phonetic=s=>s;');writeFileSync(join(sourceRoot,'content/library/items.json'),JSON.stringify([{id:'one',title:'Plain source prose.'}]));writeFileSync(join(dir,'data.json'),'{"items":[],"preview":true,"bytes":0,"fixtures":[],"index":[]}');assert.throws(()=>guardTree(dir,policy,[],{sourceRoot}),/Cannot derive Library token provenance/);
});

// Round 3: review-derived negative fixtures contain synthetic vocabulary only.
const r3words=['ALPHANONSENSE','BETANONSENSE','GAMMANONSENSE'];
for(const [shape,value] of [
 ['empty',[...r3words,'']],['weights',[r3words[0],1,r3words[1],2,r3words[2],3]],
 ['null',[...r3words,null]],['long',[...r3words,'a longer odd entry']],
 ['records',r3words.map(w=>({w}))],
])for(const kind of ['js','json'])exportCase(`R3 odd ${shape} ${kind}`,`data.${kind}`,kind==='js'?`globalThis.words=${JSON.stringify(value)};`:JSON.stringify({words:value}),policy,true);
for(const [shape,value] of [
 ['encoded',JSON.stringify(r3words)],['csv',r3words.join(', ')+'.'],
 ['tsv',r3words.map((w,i)=>w+'\t'+i).join('\n')],['numbered',r3words.map((w,i)=>`${i+1}. ${w}`).join('\n')],
 ['pipe',r3words.join('|')+'|12'],['snake',r3words.join('_')],
])exportCase(`R3 list ${shape}`,'data.js',`globalThis.words=${JSON.stringify(value)};`,policy,true);
for(const [name,tokens] of [['cluster',[...r3words,...Array(6).fill('NEUTRAL'),'the','of','and']],['affix',r3words.flatMap(w=>[`${w} the`,`${w} the`])]])exportCase(`R3 prose padding ${name}`,'data.js',`globalThis.words=${JSON.stringify(tokens)};`,policy,true);
const sentenceTokens='the plain bird is on the wide branch and a quiet wind is in the garden with our small family'.split(' ');
exportCase('R3 readable interleaving','data.js',`globalThis.tokens=${JSON.stringify(sentenceTokens)};`);
for(const extension of ['md','csv','tsv','map','yml','htm','jsx','unknown','png'])exportCase(`R3 text extension ${extension}`,`data.${extension}`,'Tap COLD now',policy,true);
exportCase('R3 actual binary media','data.png',Buffer.from([137,80,78,71,0,13,10,26,10]));
for(const attribute of ['content','value'])exportCase(`R3 HTML ${attribute}`,'data.html',`<meta ${attribute}="Tap COLD now">`,policy,true);
const sensitivePolicy={...policy,chamoruSensitive:['KAPSENSE','UNUSEDCHAMORU']};
for(const text of ['Håfa KAPSENSE','aʼa KAPSENSE'])exportCase(`R3 characters ${text.codePointAt(0)} ${text.codePointAt(1)}`,'data.js',`globalThis.label=${JSON.stringify(text)};`,sensitivePolicy,true);
for(const tag of [{locale:'ch-GU'},{languages:['en','cha']},{language:'chamoru'}])exportCase(`R3 tag ${JSON.stringify(tag)}`,'data.json',JSON.stringify({...tag,label:'KAPSENSE'}),sensitivePolicy,true);
function r3source(name,code,rejected=true,path='src/learn/content/phrases.ts') {
 test(name,()=>{
  const sourceRoot=join(scratch,name.replaceAll(' ','-')),dir=join(sourceRoot,'dist');mkdirSync(join(sourceRoot,'src/learn/content'),{recursive:true});mkdirSync(dir);
  writeFileSync(join(sourceRoot,'src/learn/content/chamoru.ts'),'export const words=[];');
  mkdirSync(join(sourceRoot,path,'..'),{recursive:true});writeFileSync(join(sourceRoot,path),code);writeFileSync(join(dir,'data.js'),'globalThis.safe=1;');
  if(rejected)assert.throws(()=>guardTree(dir,sensitivePolicy,[],{sourceRoot}),/blocked-chamoru|Unresolved|static text/);else assert.equal(guardTree(dir,sensitivePolicy,[],{sourceRoot}).passed,true);
 });
}
r3source('R3 source constant','const CH="ch";export const rows=[{language:CH,label:"KAPSENSE"}];');
r3source('R3 source shorthand','const language="ch";export const rows=[{language,label:"KAPSENSE"}];');
r3source('R3 source spread','const tag={locale:"ch-GU"};export const rows=[{...tag,label:"KAPSENSE"}];');
r3source('R3 source unresolved','export const rows=[{language:choose(),label:"KAPSENSE"}];');
r3source('R3 source unresolved spread','export const rows=[{language:"ch",...choose(),label:"Safe"}];');
r3source('R3 teaching example','export const rows=[{term:"Plain",example:"KAPSENSE"}];',true,'src/learn/content/chamoru.ts');
r3source('R3 teaching sibling','export const rows=[{term:"KAPSENSE"}];',true,'src/learn/content/chamoru-phrases.ts');
r3source('R3 teaching type','import type {ChamoruWord} from "./types";export const rows:ChamoruWord[]=[{term:"KAPSENSE"}];');
r3source('R3 source content root','export const rows=[{language:"ch",label:"KAPSENSE"}];',true,'content/phrases.ts');
r3source('R3 source speech root','export const rows=[{language:"ch",label:"KAPSENSE"}];',true,'scripts/learn/phrases.ts');
r3source('R3 source English','export const rows=[{language:"en",label:"KAPSENSE"}];',false);
for(const [name,grid] of [
 ['lower',[['c','o','l','d']]],['empty',[['c','o','l','d','']]],['dot',[['c','o','l','d','.']]],['rows',['cold']],['vertical',[['c'],['o'],['l'],['d']]],
])for(const kind of ['js','json'])exportCase(`R3 grid ${name} ${kind}`,`data.${kind}`,kind==='js'?`globalThis.grid=${JSON.stringify(grid)};`:JSON.stringify({language:'en',rows:grid}),policy,true);
exportCase('R3 missing grid language','data.json',JSON.stringify({odd:[['r','e','e','f']]}),policy,true);
for(const check of ['literal','broad'])test(`R3 core exception forbidden ${check}`,()=>{
 const dir=join(scratch,`core-exception-${check}`);mkdirSync(dir);writeFileSync(join(dir,'data.js'),'globalThis.label="Tap COLD now";');
 assert.throws(()=>guardTree(dir,{...policy,artifactStringExceptions:[{path:'data.js',strings:[{sha256:sha256('Tap COLD now'),occurrences:1,terms:[{term:'COLD',check,reason:'Synthetic',evidence:'Synthetic'}]}]}]}),/Unreviewed artifact string exception/);
});
test('R3 legacy fallback exception forbidden',()=>{const dir=join(scratch,'legacy-fallback');mkdirSync(dir);writeFileSync(join(dir,'data.txt'),'COLD');assert.throws(()=>guardTree(dir,{...policy,artifactTermExceptions:[{path:'*',terms:[{term:'COLD',check:'literal',reason:'Synthetic',evidence:'Synthetic'}]}]}),/Legacy artifact term exceptions/);});
for(const kind of ['array','object'])test(`R3 Hermes native ${kind} probe`,()=>{
 initGit();const web=join(scratch,'release-web'),ios=join(scratch,'release-ios');
 const code=`globalThis.w=${kind==='array'?JSON.stringify(r3words):'{ALPHANONSENSE:1,BETANONSENSE:1,GAMMANONSENSE:1}'};`;
 const input=join(scratch,`native-${kind}.js`);writeFileSync(input,code);
 const r=spawnSync(hermesc,['-emit-binary','-out',join(ios,'native.hbc'),input],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
 assert.throws(()=>realCheckRelease(root,web,ios,join(scratch,`native-${kind}-receipt`),(cmd,args,opts)=>{syntheticIOSExport(cmd,args,opts);writeFileSync(join(args.at(-1),'native.js'),code);}),/partial-list/);
 rmSync(join(ios,'native.hbc'));
});
test('R3 native export failure closes gate',()=>{initGit();assert.throws(()=>realCheckRelease(root,join(scratch,'release-web'),join(scratch,'release-ios'),join(scratch,'native-export-failure'),()=>{throw new Error('Synthetic exporter failure');}),/exporter failure/);});
test('R3 prose quarter positive',()=>assert.equal(classifyProse(['the','bird','is','near','a','garden',...Array(6).fill('neutral')],policy.scan),true));
test('R3 prose ratio negative',()=>assert.equal(classifyProse(['the','bird','is','near','a','garden',...Array(7).fill('neutral')],policy.scan),false));
test('R3 prose minimum negative',()=>assert.equal(classifyProse(['the','bird','is','near','a','garden','is','green','and','wide'],policy.scan),false));
for(const [field,value] of [['tags',r3words],['aliases',r3words]])test(`R3 Library authored ${field}`,()=>{
 const sourceRoot=join(scratch,`authored-${field}`),dir=join(sourceRoot,'dist');mkdirSync(join(sourceRoot,'src/library'),{recursive:true});mkdirSync(join(sourceRoot,'content/library'),{recursive:true});mkdirSync(dir);
 cpSync(resolve('src/library/search.ts'),join(sourceRoot,'src/library/search.ts'));
 writeFileSync(join(sourceRoot,'content/library/items.json'),JSON.stringify([{id:'one',title:'A safe source.',[field]:value}]));
 writeFileSync(join(dir,'data.json'),JSON.stringify({items:[],index:[{id:'one',terms:value}],preview:true,bytes:0,fixtures:[]}));
 assert.throws(()=>guardTree(dir,policy,[],{sourceRoot}),/blocked-source-text/);
});
libraryTraceCase('R3 Library authored field no trace',JSON.stringify({items:[],index:[{id:'synthetic-item',tags:r3words.map(w=>w.toLowerCase())}],preview:true,bytes:0,fixtures:[]}),true,'The ALPHANONSENSE crosses a quiet shoreline while BETANONSENSE watches distant waves and GAMMANONSENSE rests beside smooth stones.');
libraryTraceCase('R3 Library nearest id',JSON.stringify({items:[],index:[{id:'synthetic-item',nested:{id:'other',terms:r3words.map(w=>w.toLowerCase())}}],preview:true,bytes:0,fixtures:[]}),true,'The ALPHANONSENSE crosses a quiet shoreline while BETANONSENSE watches distant waves and GAMMANONSENSE rests beside smooth stones.');
libraryTraceCase('R3 Library foreign catalog shape',JSON.stringify({index:[{id:'synthetic-item',terms:r3words.map(w=>w.toLowerCase())}]}),true,'The ALPHANONSENSE crosses a quiet shoreline while BETANONSENSE watches distant waves and GAMMANONSENSE rests beside smooth stones.');
libraryTraceCase('R3 Library sounds use phonetic trace',JSON.stringify({items:[],index:[{id:'synthetic-item',sounds:r3words.map(w=>w.toLowerCase())}],preview:true,bytes:0,fixtures:[]}),true,'The ALPHANONSENSE crosses a quiet shoreline while BETANONSENSE watches distant waves and GAMMANONSENSE rests beside smooth stones.');

test('R3 CI versioned secret mapping',()=>{
 const workflow=readFileSync(process.env.WORD_TEST_WORKFLOW_FILE??resolve('.github/workflows/ci.yml'),'utf8');
 assert.match(workflow,/LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64: \$\{\{ secrets\.LITTLE_ISLAND_WORD_POLICY_V2_GZIP_BASE64 \}\}/);
 assert.doesNotMatch(workflow,/secrets\.LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64/);
});
test('R3 prose clustered grammar',()=>assert.equal(classifyProse([...Array(9).fill('neutral'),'the','of','and'],policy.scan),false));
test('R3 grammar excludes policy vocabulary',()=>assert.equal(classifyProse(sentenceTokens,['THE','IS','A']),false));
test('R3 JSON nearest identity structure',async()=>{const {jsonUnits}=await import(pathToFileURL(join(root,'scripts/words/artifact-views.mjs')));const unit=jsonUnits({id:'outer',nested:{id:'inner',terms:r3words}}).find(unit=>unit.length===3);assert.deepEqual(unit.library.ids,['inner']);});
test('R3 advisory deduplicates content and excludes keys',()=>{
 const dir=join(scratch,'advisory-dedupe');mkdirSync(dir);writeFileSync(join(dir,'data.js'),'globalThis.a="ALPHANONSENSE";globalThis.b="ALPHANONSENSE";globalThis.c={BETANONSENSE:1};');
 const r=guardTree(dir,policy);assert.equal(r.advisoryCount,1);
});

exportCase('R3 English curly apostrophe','data.js','globalThis.label="It’s KAPSENSE today";',sensitivePolicy);
exportCase('R3 English speech contraction','growth.json',JSON.stringify({line:'It’s KAPSENSE today'}),sensitivePolicy);
test('R3 native export must contain JavaScript',()=>{initGit();assert.throws(()=>realCheckRelease(root,join(scratch,'release-web'),join(scratch,'release-ios'),join(scratch,'native-empty'),()=>{}),/Native platform JavaScript export required/);});
test('R3 authored field trace classification',async()=>{const {tracedLibraryUnit}=await import(pathToFileURL(join(root,'scripts/words/artifact-views.mjs')));const unit=[...r3words];unit.library={scope:true,field:'tags',ids:['one']};assert.equal(tracedLibraryUnit(unit,[{id:'one',tokens:r3words.map(w=>w.toLowerCase())}]),false);});
test('R3 catalog shape classification',async()=>{const {jsonUnits}=await import(pathToFileURL(join(root,'scripts/words/artifact-views.mjs')));const units=jsonUnits({index:[{id:'one',terms:r3words}]});assert.equal(units.find(unit=>unit.length===3).library.scope,false);});
test('R3 sounds trace classification',async()=>{const {tracedLibraryUnit}=await import(pathToFileURL(join(root,'scripts/words/artifact-views.mjs')));const unit=[...r3words];unit.library={scope:true,field:'sounds',ids:['one']};assert.equal(tracedLibraryUnit(unit,[{id:'one',tokens:r3words.map(w=>w.toLowerCase()),sounds:['different']}]),false);});
function teachingCase(name,change={},rejected=false) {
 test(name,()=>{
  const sourceRoot=join(scratch,name.replaceAll(' ','-')),dir=join(sourceRoot,'dist');mkdirSync(join(sourceRoot,'src/learn/content'),{recursive:true});mkdirSync(dir);
  const entry={id:'food.synthetic',term:'KAPSENSE',english:'Plain gloss',sourceNote:'Håfa KAPSENSE'};
  const p={...sensitivePolicy,chamoruTeachingAllowances:[{entryId:entry.id,terms:[entry.term],reason:'Synthetic reviewed teaching entry only'}]};
  Object.assign(p,change.policy);const sourceEntry={...entry,...change.entry};
  writeFileSync(join(sourceRoot,'src/learn/content/chamoru.ts'),`export const words=[${JSON.stringify(sourceEntry)}];`);
  writeFileSync(join(dir,change.file??'data.js'),change.code??`globalThis.words=[${JSON.stringify(sourceEntry)}];`);
  if(rejected)assert.throws(()=>guardTree(dir,p,[],{sourceRoot}),/blocked|allowance/);else assert.equal(guardTree(dir,p,[],{sourceRoot}).passed,true);
 });
}
teachingCase('R3 exact reviewed teaching entry');
teachingCase('R3 teaching changed identity',{entry:{id:'other'}},true);
teachingCase('R3 teaching changed term',{entry:{term:'kapsense'}},true);
teachingCase('R3 teaching unbound text',{code:'globalThis.label="Håfa KAPSENSE";'},true);
teachingCase('R3 teaching new field',{code:'globalThis.words=[{id:"food.synthetic",term:"KAPSENSE",english:"Plain gloss",sourceNote:"Håfa KAPSENSE",label:"Håfa KAPSENSE"}];'},true);
teachingCase('R3 teaching JSON own fields',{file:'data.json',code:JSON.stringify({id:'food.synthetic',term:'KAPSENSE',english:'Plain gloss',sourceNote:'Håfa KAPSENSE'})});
teachingCase('R3 teaching cannot exempt word search',{file:'data.json',code:JSON.stringify({language:'ch',kind:'word-search',words:['KAPSENSE']})},true);
teachingCase('R3 teaching cannot exempt grid',{file:'data.json',code:JSON.stringify({language:'ch',cells:[...'KAPSENSE'].map(c=>[c])})},true);
teachingCase('R3 teaching cannot exempt JS grid',{code:'globalThis.data='+JSON.stringify({language:'ch',cells:[...'KAPSENSE'].map(c=>[c])})+';'},true);
test('R3 teaching not admitted to generated word search',()=>{
 const p={...policy,chamoruSensitive:['CHOTDA'],chamoruTeachingAllowances:[{entryId:'food.synthetic',terms:['Chotda'],reason:'Synthetic teaching only'}]};
 const data=input();data.policy=p;data.words=[{...word('Chotda'),language:'ch',canonicalId:'ch-test',uses:['word-search'],fluentReaderChecked:false}];data.surfaces=[{id:'s',kind:'word-search',wordIds:['chotda'],cells:[['CH','O','T','D','A']],listed:[{wordId:'chotda',answer:'Chotda',cells:[[0,0],[0,1],[0,2],[0,3],[0,4]]}]}];
 assert.equal(core.answerAllowed(data.words[0],p),false);
 try {writeFileSync(policyFile,JSON.stringify(p));writeFileSync(lockFile,JSON.stringify({...lock,policySha256:sha256(readFileSync(policyFile))}));assert.throws(()=>bakeBank(data),/Exact\/lemma-blocked answer/);}finally {writeFileSync(policyFile,JSON.stringify(policy));writeFileSync(lockFile,JSON.stringify(lock));}
});
teachingCase('R3 teaching own grid remains forbidden',{entry:{cells:[...'KAPSENSE'].map(c=>[c])},code:'globalThis.safe=1;'},true);
test('R3 teaching source path binding',()=>{
 const sourceRoot=join(scratch,'teaching-path'),dir=join(sourceRoot,'dist');mkdirSync(join(sourceRoot,'src/learn/content'),{recursive:true});mkdirSync(dir);
 const entry={id:'food.synthetic',term:'KAPSENSE',english:'Plain',sourceNote:'Håfa KAPSENSE'};
 writeFileSync(join(sourceRoot,'src/learn/content/chamoru.ts'),'export const words=[];');writeFileSync(join(sourceRoot,'src/learn/content/chamoru-other.ts'),`export const words=[${JSON.stringify(entry)}];`);writeFileSync(join(dir,'data.js'),'globalThis.safe=1;');
 assert.throws(()=>guardTree(dir,{...sensitivePolicy,chamoruTeachingAllowances:[{entryId:entry.id,terms:[entry.term],reason:'Synthetic'}]},[],{sourceRoot}),/blocked-chamoru-source|plain string literals/);
});
exportCase('R3 flat equal technical words stay lists','data.js','globalThis.events=["eventa","eventb"];');
exportCase('R3 undeclared nested matrix','data.js','globalThis.payload=[["r","e","e","f"]];',policy,true);
exportCase('R3 declared nested matrix','data.js','globalThis.payload={language:"en",cells:[["r","e","e","f"]]};');
exportCase('R3 declared odd row container','data.json',JSON.stringify({language:'en',odd:['cold']}),policy,true);
exportCase('R3 unknown puzzle grid container fails closed','data.json',JSON.stringify({kind:'word-search',odd:['reef']}),policy,true);
exportCase('R3 recognised puzzle grid declares its shape','data.json',JSON.stringify({kind:'word-search',rows:['reef']}));
exportCase('R3 declared puzzle grid source','data.json',JSON.stringify({kind:'word-search',language:'en',rows:['reef']}));
r3source('R3 ambiguous constant fails closed','const CH="ch";function other(){const CH="en";}export const rows=[{language:CH,label:"KAPSENSE"}];');
teachingCase('R3 teaching own word bank remains forbidden',{entry:{words:['KAPSENSE']}},true);
teachingCase('R3 teaching source generated kind',{entry:{kind:'word-search'},code:'globalThis.safe=1;'},true);
teachingCase('R3 teaching source isolated grid',{entry:{term:'Neutral',sourceNote:'Plain source',cells:[...'KAPSENSE'].map(c=>[c])},code:'globalThis.safe=1;'},true);
test('R3 invalid teaching allowance rejected',()=>{const dir=join(scratch,'bad-teaching-policy');mkdirSync(dir);writeFileSync(join(dir,'data.js'),'globalThis.safe=1;');assert.throws(()=>guardTree(dir,{...policy,chamoruTeachingAllowances:[{entryId:'synthetic',terms:[],reason:''}]}),/Invalid CHamoru teaching allowance/);});
exportCase('R3 untagged recognised sensitive grid','data.json',JSON.stringify({rows:['KAPSENSE']}),sensitivePolicy,true);
exportCase('R3 declared English homograph grid','data.json',JSON.stringify({language:'en',rows:['KAPSENSE']}),sensitivePolicy);
r3source('R3 parameter language cannot borrow constant','const language="en";function make(language){return {language,label:"KAPSENSE"};}');
exportCase('R3 invalid JSON language tag','data.json',JSON.stringify({language:42,label:'KAPSENSE'}),sensitivePolicy,true);
exportCase('R3 HTML embedded grid','data.html','<script>globalThis.data={language:"en",cells:[["c","o","l","d"]]};</script>',policy,true);
exportCase('R3 serialized worklet grid','data.js','globalThis.code='+JSON.stringify('function f(){return {language:"en",cells:[["c","o","l","d"]]};}')+';',policy,true);
teachingCase('R3 teaching extra policy term cannot widen fields',{policy:{chamoruSensitive:['KAPSENSE','KAPOTHER'],chamoruTeachingAllowances:[{entryId:'food.synthetic',terms:['KAPSENSE','KAPOTHER'],reason:'Synthetic'}]},entry:{sourceNote:'Håfa KAPOTHER'},code:'globalThis.safe=1;'},true);
exportCase('R3 digit blank cell','data.json',JSON.stringify({language:'en',cells:[['c','o','l','d','0']]}),policy,true);
exportCase('R3 modifier glottal grid','data.json',JSON.stringify({language:'ch',cells:[['c','o','ʼ','l','d']]}),policy,true);
test('R3 modifier glottal scan folding',()=>assert.equal(core.foldScan('CʼOLD'),'COLD'));
libraryTraceCase('R3 Library JS nearest identity','globalThis.catalog='+JSON.stringify({items:[],index:[{id:'synthetic-item',nested:{id:'other',terms:r3words.map(w=>w.toLowerCase())}}],preview:true,bytes:0,fixtures:[]})+';',true,'The ALPHANONSENSE crosses a quiet shoreline while BETANONSENSE watches distant waves and GAMMANONSENSE rests beside smooth stones.');
test('R3 receipt native JavaScript digest format',()=>{initGit();const web=join(scratch,'release-web'),ios=join(scratch,'release-ios'),file=join(scratch,'native-js-receipt.private.json');checkRelease(root,web,ios,file);const receipt=JSON.parse(readFileSync(file));receipt.iosJavaScript.sha256='bad';writeFileSync(file,JSON.stringify(receipt));assert.throws(()=>verifyReleaseReceipt(root,file,web,ios),/receipt/);});
test('R3 authored aliases cannot contribute traced search tokens',()=>{
 const sourceRoot=join(scratch,'alias-derived'),dir=join(sourceRoot,'dist');mkdirSync(join(sourceRoot,'src/library'),{recursive:true});mkdirSync(join(sourceRoot,'content/library'),{recursive:true});mkdirSync(dir);
 cpSync(resolve('src/library/search.ts'),join(sourceRoot,'src/library/search.ts'));
 writeFileSync(join(sourceRoot,'content/library/items.json'),JSON.stringify([{id:'one',title:'A safe source.',aliases:['ALPHANONSENSE','BETANONSENSE'],tags:['GAMMANONSENSE']}]));
 writeFileSync(join(dir,'data.json'),JSON.stringify({items:[],index:[{id:'one',terms:r3words.map(w=>w.toLowerCase())}],preview:true,bytes:0,fixtures:[]}));
 assert.throws(()=>guardTree(dir,policy,[],{sourceRoot}),/partial-list/);
});

test('R3 JS nearest identity structure',async()=>{const {javascriptStrings}=await import(pathToFileURL(join(root,'scripts/words/artifact-views.mjs')));const source='globalThis.catalog='+JSON.stringify({items:[],index:[{id:'outer',nested:{id:'inner',terms:r3words}}],preview:true,bytes:0,fixtures:[]})+';';assert.deepEqual(javascriptStrings(source).units.find(unit=>unit.length===3).library.ids,['inner']);});
test('R3 body trace every token classification',async()=>{const {tracedLibraryUnit}=await import(pathToFileURL(join(root,'scripts/words/artifact-views.mjs')));const unit=[...r3words];unit.library={scope:true,field:'terms',ids:['one']};assert.equal(tracedLibraryUnit(unit,[{id:'one',tokens:[]}]),false);});
test('R3 trace requires catalog attachment',async()=>{const {tracedLibraryUnit}=await import(pathToFileURL(join(root,'scripts/words/artifact-views.mjs')));const unit=[...r3words];unit.library={scope:false,field:'terms',ids:['one']};assert.equal(tracedLibraryUnit(unit,[{id:'one',tokens:r3words.map(w=>w.toLowerCase())}]),false);});
test('R3 trace requires exact item',async()=>{const {tracedLibraryUnit}=await import(pathToFileURL(join(root,'scripts/words/artifact-views.mjs')));const unit=[...r3words];unit.library={scope:true,field:'terms',ids:['other']};assert.equal(tracedLibraryUnit(unit,[{id:'one',tokens:r3words.map(w=>w.toLowerCase())}]),false);});
for(const [name,file,text] of [['TSV','words.tsv',r3words.map((word,i)=>word+'\t'+i).join('\n')],['CSV','words.csv',r3words.join(',\n')+','],['numbered','words.md',r3words.map((word,i)=>`${i+1}. ${word}`).join('\n')]])exportCase(`R3 standalone ${name} list`,file,text,policy,true);
const svgTechnical='<svg xmlns="http://www.w3.org/2000/svg" data-a="ALPHANONSENSE" data-b="BETANONSENSE" data-c="GAMMANONSENSE"><path d="M0 0L1 1"/></svg>';
exportCase('R3 inline SVG separate technical attributes','data.js','globalThis.vector='+JSON.stringify(svgTechnical)+';');
exportCase('R3 SVG separate technical attributes','data.svg',svgTechnical);
exportCase('R3 SVG visible core label','data.js','globalThis.vector='+JSON.stringify('<svg><text>Tap COLD now</text></svg>')+';',policy,true);
exportCase('R3 SVG metadata list leak','data.js','globalThis.vector='+JSON.stringify('<svg data-words="ALPHANONSENSE,BETANONSENSE,GAMMANONSENSE"></svg>')+';',policy,true);
exportCase('R3 SVG comment list leak','data.js','globalThis.vector='+JSON.stringify('<svg><!-- ALPHANONSENSE BETANONSENSE GAMMANONSENSE --></svg>')+';',policy,true);
exportCase('R3 SVG decoded canary retained','data.js','globalThis.vector='+JSON.stringify('<svg data-marker="PRIVATECANARYNONWORD"></svg>').replace('PRIVATECANARYNONWORD','\\u0050RIVATECANARYNONWORD')+';',policy,true);
exportCase('R3 SVG CHamoru visible label','data.js','globalThis.vector='+JSON.stringify('<svg lang="ch"><text>KAPSENSE</text></svg>')+';',sensitivePolicy,true);
test('R3 malformed embedded SVG fails closed',()=>{const dir=join(scratch,'malformed-svg');mkdirSync(dir);writeFileSync(join(dir,'data.svg'),'<svg><text>Safe</text>');assert.throws(()=>guardTree(dir,policy),/Cannot parse embedded SVG/);});
exportCase('R3 accented CHamoru sensitive surface','data.js','globalThis.label="KÅPSENSE";',sensitivePolicy,true);
exportCase('R3 glottal CHamoru sensitive surface','data.js','globalThis.label="KAPʼSENSE";',sensitivePolicy,true);
teachingCase('R3 exact accented teaching allowance',{policy:{chamoruTeachingAllowances:[{entryId:'food.synthetic',terms:['KÅPSENSE'],reason:'Synthetic teaching only'}]},entry:{term:'KÅPSENSE'}});

exportCase('R3 SVG construction prefix','data.js','globalThis.prefix='+JSON.stringify('<svg xmlns="http://www.w3.org/2000/svg">')+';');
exportCase('R3 self-closing SVG','data.js','globalThis.vector="<svg/>";');
exportCase('R3 valid UTF8 replacement remains text','data.unknown','Tap COLD \uFFFD now',policy,true);
exportCase('R3 invalid UTF8 remains scanned text','data.unknown',Buffer.concat([Buffer.from([255]),Buffer.from('Tap COLD now')]),policy,true);
exportCase('R3 empty language array fails closed','data.json',JSON.stringify({languages:[],rows:['KAPSENSE']}),sensitivePolicy,true);
exportCase('R3 blank language fails closed','data.json',JSON.stringify({language:'  ',rows:['KAPSENSE']}),sensitivePolicy,true);
exportCase('R3 spaced CHamoru language tag','data.json',JSON.stringify({language:' ch-GU ',rows:['KAPSENSE']}),sensitivePolicy,true);
exportCase('R3 blank language array entry fails closed','data.json',JSON.stringify({languages:[' '],rows:['KAPSENSE']}),sensitivePolicy,true);
r3source('R3 JSON source unresolved language',JSON.stringify({language:42,label:'KAPSENSE'}),true,'content/phrases.json');

// Lead-approved native boundary: declaration relief only for one letter in one cell.
for(const kind of ['js','json'])for(const [label,value,rejected] of [
 ['single letter',[['Z']],false],['digraph',[['CH']],true],['long cell',[['REEF']],true],['horizontal',[['R','E']],true],['vertical',[['R'],['E']],true],
])exportCase(`R3 singleton matrix ${label} ${kind}`,`data.${kind}`,kind==='js'?`globalThis.payload=${JSON.stringify(value)};`:JSON.stringify({payload:value}),policy,rejected);
for(const kind of ['js','json'])exportCase(`R3 singleton puzzle still declares ${kind}`,`data.${kind}`,kind==='js'?'globalThis.payload={kind:"word-search",odd:[["Z"]]};':JSON.stringify({kind:'word-search',odd:[['Z']]}),policy,true);
exportCase('R3 singleton literal still scanned','data.js','globalThis.payload=[["Z"]];globalThis.label="COLD";',policy,true);

const reviewedTableKeys=[...r3words,...Array.from({length:147},(_,i)=>'SAFE'+String.fromCharCode(65+Math.floor(i/26),65+i%26))];
const reviewedTable=Object.fromEntries(reviewedTableKeys.map(key=>[key,1]));
const nativeTablePolicy={...policy,artifactStringExceptions:['web','ios'].map(platform=>({path:`_expo/static/js/${platform}/entry-*.js`,strings:[{sha256:sha256(JSON.stringify(reviewedTableKeys)),occurrences:1,terms:r3words.map(term=>({term,check:'broad',reason:'Synthetic reviewed library table',evidence:'Synthetic exact table'}))}]}))};
for(const [name,path,code,rejected] of [
 ['web','_expo/static/js/web/entry-test.js',`globalThis.table=${JSON.stringify(reviewedTable)};`,false],
 ['ios','_expo/static/js/ios/entry-test.js',`globalThis.table=${JSON.stringify(reviewedTable)};`,false],
 ['changed','_expo/static/js/ios/entry-test.js',`globalThis.table=${JSON.stringify({...reviewedTable,EXTRA:1})};`,true],
 ['second occurrence','_expo/static/js/ios/entry-test.js',`globalThis.table=${JSON.stringify(reviewedTable)};globalThis.other=${JSON.stringify(reviewedTable)};`,true],
 ['other platform','_expo/static/js/android/entry-test.js',`globalThis.table=${JSON.stringify(reviewedTable)};`,true],
 ['nested path','_expo/static/js/ios/nested/entry-test.js',`globalThis.table=${JSON.stringify(reviewedTable)};`,true],
 ['other basename','_expo/static/js/ios/other-test.js',`globalThis.table=${JSON.stringify(reviewedTable)};`,true],
])test(`R3 native reviewed table ${name}`,()=>{const dir=join(scratch,'native-table-'+name.replaceAll(' ','-'));mkdirSync(join(dir,path,'..'),{recursive:true});writeFileSync(join(dir,path),code);if(rejected)assert.throws(()=>guardTree(dir,nativeTablePolicy),/partial-list/);else assert.equal(guardTree(dir,nativeTablePolicy).passed,true);});

exportCase('R3 unknown JS puzzle row container','data.js','globalThis.payload={kind:"word-search",odd:["reef"]};',policy,true);
exportCase('R3 singleton JS puzzle row still declares','data.js','globalThis.payload={kind:"word-search",odd:["Z"]};',policy,true);

exportCase('R3 singleton cell literal still scanned','data.js','globalThis.payload=[["Z"]];',{...policy,core:[...policy.core,'Z']},true);
for(const [label,tag] of [['dynamic','choose()'],['numeric','42']])exportCase(`R3 singleton unresolved language ${label}`,'data.js',`globalThis.payload={language:${tag},odd:[["Z"]]};`,policy,true);

exportCase('R3 singleton recognised grid invalid language','data.js','globalThis.payload={language:choose(),grid:[["Z"]]};',policy,true);

exportCase('R3 invalid JSON metadata tag','data.json',JSON.stringify({language:42,payload:'Plain'}),policy,true);

// Round 4 uses invented words exclusively. Density is independent of data shape;
// small fragments retain structural checks below the measured density threshold.
const r4words=Array.from({length:25},(_,i)=>'ZORBLEX'+String.fromCharCode(65+i));
const r4policy={...policy,scan:[...policy.scan,...r4words]};
const r4shapes={
 tuples:w=>JSON.stringify(w.map((word,i)=>[word,i+1])),
 map:w=>'new Map('+JSON.stringify(w.map(word=>[word,'clue']))+')',
 singletons:w=>JSON.stringify(w.map(word=>[word])),
 filenames:w=>JSON.stringify(w.map(word=>word.toLowerCase()+'.m4a')),
 ids:w=>JSON.stringify(w.map((word,i)=>word.toLowerCase()+(i+1))),
 prefixes:w=>JSON.stringify(w.map(word=>'w:'+word)),
 regex:w=>'/\\b(?:'+w.join('|')+')\\b/i',
 constructor:w=>'new RegExp('+JSON.stringify('\\b(?:'+w.join('|')+')\\b')+',"i")',
 encodedObject:w=>JSON.stringify(JSON.stringify({w})),
 encodedTuples:w=>JSON.stringify(JSON.stringify(w.map(word=>[word]))),
 keymap:w=>JSON.stringify(Object.fromEntries(w.map(word=>[word,'a clue']))),
 valuemap:w=>JSON.stringify(Object.fromEntries(w.map((word,i)=>['level'+i,word]))),
 records:w=>JSON.stringify(w.map((word,i)=>({w:word,n:i}))),
 article:w=>JSON.stringify('the '+w.join(' and the ')),
 conjunction:w=>JSON.stringify(w.join(' or ')),
 switch:w=>'(()=>{switch(w){'+w.map(word=>'case '+JSON.stringify(word)+':').join('')+'break;}})()',
 equality:w=>w.map(word=>'w==='+JSON.stringify(word)).join('||'),
 enum:w=>'(()=>{'+w.map((word,i)=>'e[e['+JSON.stringify(word)+']='+i+']='+JSON.stringify(word)+';').join('')+'})()',
 template:w=>'`'+w.join(' ${w} ')+'`',
};
for(const size of [5,10,25])for(const [shape,encode] of Object.entries(r4shapes))exportCase(`R4 fragment ${size} ${shape}`,'data.js','globalThis.value='+encode(r4words.slice(0,size))+';',r4policy,true);
for(const shape of Object.keys(r4shapes))test(`R4 density 25 ${shape}`,()=>assert.ok(densityTools.densityScanner(r4words)(r4shapes[shape](r4words))>=densityTools.densityThreshold));
for(const size of [5,10,15,16,17,25])test(`R4 density threshold ${size}`,()=>{
 const dir=join(scratch,'density-'+size);mkdirSync(dir);
 // Each term lives in a separate statement; no structure-aware list unit exists.
 writeFileSync(join(dir,'data.js'),r4words.slice(0,size).map((word,i)=>`globalThis.x${i}=${JSON.stringify(word)};`+'globalThis.padding='+JSON.stringify('filler '.repeat(30))+';').join('\n'));
 if(size>15)assert.throws(()=>guardTree(dir,r4policy),/broad-density/);else assert.equal(guardTree(dir,r4policy).passed,true);
});
test('R4 density distinct count',()=>assert.equal(densityTools.densityScanner(r4words)(Array(100).fill(r4words[0]).join(' ')),1));
test('R4 density sliding boundary',()=>assert.equal(densityTools.densityScanner(r4words)(r4words.slice(0,15).join(' ')+' filler'.repeat(1000)+' '+r4words.slice(15).join(' ')),15));
test('R4 density late window',()=>assert.equal(densityTools.densityScanner(r4words)('filler '.repeat(2000)+r4words.join(' ')),25));
for(const [label,text] of [['soft hyphen','CO\u00adLD'],['zero width','CO\u200bLD'],['fullwidth','ＣＯＬＤ'],['diacritics','CÖLD'],['decomposed','CO\u030aLD']])exportCase(`R4 normalised core ${label}`,'data.js','globalThis.label='+JSON.stringify(text),policy,true);
exportCase('R4 normalised broad list','data.json',JSON.stringify(r3words.map(word=>word.slice(0,3)+'\u200b'+word.slice(3))),policy,true);
exportCase('R4 normalised density','data.txt',r4words.map(word=>word.slice(0,3)+'\u00ad'+word.slice(3)).join(' / '),r4policy,true);
exportCase('R4 flat answer tiles','data.json',JSON.stringify({letters:[...'COLD']}),policy,true);
exportCase('R4 unknown row strings','data.json',JSON.stringify({layout:['QCOLDQ','QQQQQQ']}),policy,true);
exportCase('R4 tagged keys','data.json',JSON.stringify({language:'ch',items:{KAPSENSE:1}}),sensitivePolicy,true);
exportCase('R4 decomposed marker','data.js','globalThis.label="Ha\u030afa KAPSENSE";',sensitivePolicy,true);
exportCase('R4 narrow apostrophe middle','data.js','globalThis.label="Mu’na KAPSENSE";',sensitivePolicy,true);
exportCase('R4 narrow apostrophe final','data.js','globalThis.label="Si’ KAPSENSE";',sensitivePolicy,true);
exportCase('R4 English contractions','data.js','globalThis.label="She’s said they’re here, we’ll see, can’t wait, we’ve asked, I’d say, I’m here and dogs’ bowls.";',sensitivePolicy);
for(const [kind,field] of [['concat','"Hu KAP"+"SENSE"'],['template','`Hu KAP${suffix}`'],['constant','sentence'],['call','sentence()'],['spread','"Plain"']])test(`R4 teaching expression ${kind}`,()=>{
 const dir=join(scratch,'teaching-expression-'+kind),sourceRoot=join(dir,'source');mkdirSync(join(sourceRoot,'src/learn/content'),{recursive:true});mkdirSync(join(dir,'dist'));
 writeFileSync(join(sourceRoot,'src/learn/content/chamoru.ts'),'const suffix="SENSE",sentence="Hu KAPSENSE";export const rows=[{id:"x",term:"Plain",english:"Safe",example:'+field+(kind==='spread'?',...other':'')+'}];');
 writeFileSync(join(dir,'dist/data.js'),'globalThis.label="Hu KAPSENSE";');
 assert.throws(()=>guardTree(join(dir,'dist'),sensitivePolicy,[],{sourceRoot}),/plain string literals/);
});
test('R4 teaching JSON source',()=>{
 const sourceRoot=join(scratch,'teaching-json'),dir=join(sourceRoot,'dist');mkdirSync(join(sourceRoot,'src/learn/content'),{recursive:true});mkdirSync(dir);
 writeFileSync(join(sourceRoot,'src/learn/content/chamoru.ts'),'export const words=[];');writeFileSync(join(sourceRoot,'src/learn/content/chamoru-extra.json'),JSON.stringify([{id:'x',term:'KAPSENSE'}]));writeFileSync(join(dir,'data.js'),'globalThis.safe=1;');assert.throws(()=>guardTree(dir,sensitivePolicy,[],{sourceRoot}),/blocked-chamoru-source|plain string literals/);
});
for(const supplied of [undefined,''])test(`R4 CI missing policy ${String(supplied)}`,()=>{
 const dir=join(scratch,'ci-policy-'+String(supplied));mkdirSync(dir);writeFileSync(join(dir,'data.txt'),'COLD');
 const env={...process.env,CI:'true'};for(const key of Object.keys(env))if(key.startsWith('LITTLE_ISLAND_WORD_POLICY_'))delete env[key];if(supplied!==undefined)env.LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64=supplied;
 const result=spawnSync(process.execPath,[join(root,'scripts/words/check.mjs'),'export',dir],{cwd:root,env,encoding:'utf8'});assert.notEqual(result.status,0);assert.match(result.stderr,/CI export requires a nonempty private policy/);
});
test('R4 local missing policy explicit',()=>{
 const env={...process.env,CI:'false'};for(const key of Object.keys(env))if(key.startsWith('LITTLE_ISLAND_WORD_POLICY_'))delete env[key];const dir=join(scratch,'local-policy');mkdirSync(dir);writeFileSync(join(dir,'data.txt'),'Plain safe fixture');
 const result=spawnSync(process.execPath,[join(root,'scripts/words/check.mjs'),'export',dir],{cwd:root,env,encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.match(result.stderr,/policy not checked/);
});
test('R4 Hermes divergence closes release',()=>{
 initGit();const ios=join(scratch,'divergent-ios');mkdirSync(ios);const input=join(scratch,'divergent.js');writeFileSync(input,'globalThis.label="Preview only content";');const compiled=spawnSync(hermesc,['-emit-binary','-out',join(ios,'main.hbc'),input],{encoding:'utf8'});assert.equal(compiled.status,0,compiled.stderr);
 assert.throws(()=>realCheckRelease(root,join(scratch,'release-web'),ios,join(scratch,'divergent-receipt'),syntheticIOSExport),/Hermes strings diverge/);
});
test('R4 receipt requires Hermes binding',()=>{initGit();const web=join(scratch,'release-web'),ios=join(scratch,'release-ios'),file=join(scratch,'hermes-binding.private.json');checkRelease(root,web,ios,file);const receipt=JSON.parse(readFileSync(file));delete receipt.iosJavaScript.hermesStringsMatched;writeFileSync(file,JSON.stringify(receipt));assert.throws(()=>verifyReleaseReceipt(root,file,web,ios),/receipt/);});
const syntheticDefaultGenerated=file=>file.endsWith('.json')?JSON.stringify({items:[],index:[],preview:false,bytes:0,fixtures:false}):'export const generated="Default fixture";';
for(const changed of [false,true])test(`R4 preview generated reproducibility ${changed}`,async()=>{
 const {requireCleanSource,previewGeneratedFiles}=await import(pathToFileURL(join(root,'scripts/words/check.mjs')));
 const generator=join(root,'scripts/library/build-index.mjs');mkdirSync(join(root,'scripts/library'),{recursive:true});mkdirSync(join(root,'src/library'),{recursive:true});
 const values=Object.fromEntries(previewGeneratedFiles.map(file=>[file.split('/').at(-1),file.endsWith('.json')?JSON.stringify({preview:true,items:[]}):'export const generated="Preview";']));
 writeFileSync(generator,'import {writeFileSync} from "node:fs";import {join} from "node:path";const output=process.argv.at(-1);for(const [file,text] of Object.entries('+JSON.stringify(values)+'))writeFileSync(join(output,file),text);');
 for(const file of previewGeneratedFiles)writeFileSync(join(root,file),syntheticDefaultGenerated(file));initGit();
 try {
  for(const file of previewGeneratedFiles)writeFileSync(join(root,file),values[file.split('/').at(-1)]);
  if(changed){writeFileSync(join(root,previewGeneratedFiles[0]),'Changed fixture');assert.throws(()=>requireCleanSource(root,true),/differ from reproducible source/);}else assert.doesNotThrow(()=>requireCleanSource(root,true));
 }finally{for(const file of previewGeneratedFiles)writeFileSync(join(root,file),syntheticDefaultGenerated(file));}
});
test('R4 preview-only list checked before restore',async()=>{
 const {previewGeneratedFiles}=await import(pathToFileURL(join(root,'scripts/words/check.mjs'))),old=process.env.EXPO_PUBLIC_LIBRARY_PREVIEW;
 const file=join(root,previewGeneratedFiles[0]),preview=JSON.stringify({preview:true,w:r3words});
 writeFileSync(join(root,'scripts/library/build-index.mjs'),'import {writeFileSync} from "node:fs";import {join} from "node:path";for(const file of '+JSON.stringify(previewGeneratedFiles.map(file=>file.split('/').at(-1)))+')writeFileSync(join(process.argv.at(-1),file),file.endsWith(".json")?'+JSON.stringify(preview)+':\'export const generated="Preview";\');');initGit();
 const previewIOS=join(scratch,'preview-only-ios'),previewInput=join(scratch,'preview-only.js');mkdirSync(previewIOS);writeFileSync(previewInput,'globalThis.words='+JSON.stringify(r3words)+';');
 const compiled=spawnSync(hermesc,['-emit-binary','-out',join(previewIOS,'main.hbc'),previewInput],{encoding:'utf8'});assert.equal(compiled.status,0,compiled.stderr);assert.equal(guardTree(previewIOS,policy).passed,true);
 try {
  for(const name of previewGeneratedFiles)writeFileSync(join(root,name),name.endsWith('.json')?preview:'export const generated="Preview";');process.env.EXPO_PUBLIC_LIBRARY_PREVIEW='1';
  assert.throws(()=>realCheckRelease(root,join(scratch,'release-web'),previewIOS,join(scratch,'preview-only-receipt'),(cmd,args,opts)=>{assert.equal(opts.env.EXPO_PUBLIC_LIBRARY_PREVIEW,'1');const value=JSON.parse(readFileSync(file));assert.equal(value.preview,true);writeFileSync(join(args.at(-1),'native.js'),'globalThis.words='+JSON.stringify(value.w)+';');}),/partial-list/);
 }finally{for(const name of previewGeneratedFiles)writeFileSync(join(root,name),syntheticDefaultGenerated(name));if(old===undefined)delete process.env.EXPO_PUBLIC_LIBRARY_PREVIEW;else process.env.EXPO_PUBLIC_LIBRARY_PREVIEW=old;}
});
for(const field of ['overflow','coverage'])test(`R4 Hermes kind ${field}`,()=>{
 const input=join(scratch,'kind.js'),out=join(scratch,'kind.hbc');writeFileSync(input,'globalThis.label="Fixture";');const r=spawnSync(hermesc,['-emit-binary','-out',out,input],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const bytes=readFileSync(out),offset=128+bytes.readUInt32LE(40)*12,run=bytes.readUInt32LE(offset),count=bytes.readUInt32LE(52);bytes.writeUInt32LE((run&0x80000000)+(field==='overflow'?count+1:0),offset);assert.throws(()=>hermesStrings(bytes),/Invalid Hermes string kind/);
});
test('R4 Hermes identifier filtering',()=>{
 const input=join(scratch,'identifiers.js'),out=join(scratch,'identifiers.hbc');writeFileSync(input,'globalThis.identifierOnly="Displayed fixture";');const r=spawnSync(hermesc,['-emit-binary','-out',out,input],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const bytes=readFileSync(out);assert.ok(hermesStrings(bytes).includes('identifierOnly'));assert.ok(!hermesStrings(bytes,{identifiers:false}).includes('identifierOnly'));assert.ok(hermesStrings(bytes,{identifiers:false}).includes('Displayed fixture'));
});
test('R4 teaching non-entry field fails closed',()=>{
 const sourceRoot=join(scratch,'teaching-non-entry'),dir=join(sourceRoot,'dist');mkdirSync(join(sourceRoot,'src/learn/content'),{recursive:true});mkdirSync(dir);writeFileSync(join(sourceRoot,'src/learn/content/chamoru.ts'),'export const examples={greeting:makeSentence()};');writeFileSync(join(dir,'data.js'),'globalThis.safe=1;');assert.throws(()=>guardTree(dir,sensitivePolicy,[],{sourceRoot}),/plain string literals/);
});
for(const kind of ['hyphens','possessives'])test(`R4 prose padding ${kind}`,()=>{
 const words=r4words.slice(0,10),values=kind==='hyphens'?Array.from({length:5},(_,i)=>words[i*2]+'-'+words[i*2+1]):words.slice(0,6).map(word=>word+"’s");
 const unit=values.flatMap((word,i)=>[word,i%2?'and':'the']);assert.equal(classifyProse(unit,r4policy.scan),false);
});
exportCase('R4 encoded JSON unicode density','data.js','globalThis.data='+JSON.stringify(JSON.stringify(r4words).replace(/[A-Z]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')))+';',r4policy,true);
exportCase('R4 exact asset basename','COLD.m4a',Buffer.from([0,1,2,3]),policy,true);
exportCase('R4 encoded JSON core','data.js','globalThis.data='+JSON.stringify('{"value":"\\u0043OLD"}')+';',policy,true);
for(const size of [12,13])test(`R4 short density boundary ${size}`,()=>{
 const dir=join(scratch,'short-density-'+size);mkdirSync(dir);writeFileSync(join(dir,'data.js'),r4words.slice(0,size).map((word,i)=>`globalThis.x${i}=${JSON.stringify(word)};`).join('\n'));
 if(size===13)assert.throws(()=>guardTree(dir,r4policy),/broad-density/);else assert.equal(guardTree(dir,r4policy).passed,true);
});
const shortHardPolicy={scan:[],core:['XO'],exact:['ZIP'],lemmas:[],chamoruSensitive:[],canaries:[]};
exportCase('R4 short core normalised','data.js','globalThis.label="ＸＯ";',shortHardPolicy,true);
exportCase('R4 short exact normalised','data.js','globalThis.label="Z\u00adIP";',shortHardPolicy,true);
exportCase('R4 short hard boundaries','data.js','globalThis.label="AXOB ZIPPY";',shortHardPolicy);
exportCase('R4 supplemental English tiles stay English','data.json',JSON.stringify({letters:['C','A','T']}),{...policy,scan:['CAT'],chamoruSensitive:['CAT']});
exportCase('R4 supplemental lowercase prose stays prose','data.json',JSON.stringify({labels:['waves','shore']}),{...policy,scan:['WAV'],core:['WAV']});
exportCase('R4 encoded object three','data.js','globalThis.data='+JSON.stringify(JSON.stringify({w:r3words}))+';',policy,true);
test('R4 teaching JSON non-literal field',()=>{
 const sourceRoot=join(scratch,'teaching-json-field'),dir=join(sourceRoot,'dist');mkdirSync(join(sourceRoot,'src/learn/content'),{recursive:true});mkdirSync(dir);writeFileSync(join(sourceRoot,'src/learn/content/chamoru.ts'),'export const words=[];');writeFileSync(join(sourceRoot,'src/learn/content/chamoru-extra.json'),JSON.stringify([{id:'x',term:'Plain',example:{text:'Safe'}}]));writeFileSync(join(dir,'data.js'),'globalThis.safe=1;');assert.throws(()=>guardTree(dir,sensitivePolicy,[],{sourceRoot}),/plain string literals/);
});
exportCase('R4 legacy sparse odd array','data.js','globalThis.words='+JSON.stringify([...r3words,...Array(10).fill('NEUTRAL'),null])+';',policy,true);
for(const file of ['words.json','words.ts'])test(`R4 teaching record shape ${file}`,()=>{
 const sourceRoot=join(scratch,'teaching-shape-'+file),dir=join(sourceRoot,'dist');mkdirSync(join(sourceRoot,'src/learn/content'),{recursive:true});mkdirSync(dir);writeFileSync(join(sourceRoot,'src/learn/content/chamoru.ts'),'export const words=[];');const data=JSON.stringify([{id:'x',term:'KAPSENSE',english:'Safe gloss'}]);writeFileSync(join(sourceRoot,'src/learn/content',file),file.endsWith('.json')?data:'export const rows='+data+';');writeFileSync(join(dir,'data.js'),'globalThis.safe=1;');assert.throws(()=>guardTree(dir,sensitivePolicy,[],{sourceRoot}),/blocked-chamoru-source/);
});
for(const single of [false,true])test(`R4 Hermes entry density ${single?'single list':'separate strings'}`,()=>{
 const dir=join(scratch,'hermes-entry-'+single);mkdirSync(dir);const input=join(scratch,'hermes-entry-'+single+'.js');const code=single?'globalThis.label='+JSON.stringify('There is '+r4words.join(' and there is '))+';':r4words.map((word,i)=>`globalThis.x${i}=${JSON.stringify(word)};`).join('\n');writeFileSync(input,code);const compiled=spawnSync(hermesc,['-emit-binary','-out',join(dir,'main.hbc'),input],{encoding:'utf8'});assert.equal(compiled.status,0,compiled.stderr);
 if(single)assert.throws(()=>guardTree(dir,r4policy),/broad-density/);else assert.equal(guardTree(dir,r4policy).passed,true);
});
exportCase('R4 decoded JavaScript source proximity','data.js',r4words.map((word,i)=>`globalThis.x${i}="${[...word].map(c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')).join('')}";`).join('\n'),r4policy,true);
exportCase('R4 prose before inline enum','data.js','/** Use one of API.{ALPHANONSENSE, BETANONSENSE, GAMMANONSENSE}.\n * The operation is available on the device and it does return a value. */\nglobalThis.safe=1;',policy);
exportCase('R4 comment list remains strict','data.js','/*\nALPHANONSENSE\nBETANONSENSE\nGAMMANONSENSE\n*/\nglobalThis.safe=1;',policy,true);
for(const field of ['packageVersion','packagePath','executableSha256'])test(`R4 native compiler mismatch ${field}`,()=>{
 initGit();const ios=join(scratch,'release-ios'),file=join(scratch,'compiler-mismatch-'+field+'.private.json');const record=structuredClone(compilerCapture.finish(ios,file));record.compiler[field]='SYNTHETIC-MISMATCH';writeFileSync(file,JSON.stringify(record));assert.throws(()=>verifyCompilerCapture(root,ios,file),/identity\/version mismatch/);
});
test('R4 compiler artifact binding',()=>{const ios=join(scratch,'release-ios'),file=join(scratch,'compiler-artifact.private.json'),record=compilerCapture.finish(ios,file);record.bytecodeFiles[0].sha256='e'.repeat(64);writeFileSync(file,JSON.stringify(record));assert.throws(()=>verifyCompilerCapture(root,ios,file),/artifact mismatch/);});
test('R4 compiler capture required',()=>{const saved=process.env.LITTLE_ISLAND_WORD_NATIVE_COMPILER_RECEIPT;delete process.env.LITTLE_ISLAND_WORD_NATIVE_COMPILER_RECEIPT;try{assert.throws(()=>verifyCompilerCapture(root,join(scratch,'release-ios')),/capture required/);}finally{process.env.LITTLE_ISLAND_WORD_NATIVE_COMPILER_RECEIPT=saved;}});
test('R4 compiler override fails closed',()=>{const saved=process.env.REACT_NATIVE_OVERRIDE_HERMES_DIR;process.env.REACT_NATIVE_OVERRIDE_HERMES_DIR=join(scratch,'override');try{assert.throws(()=>compilerIdentity(root),/pinned package/);}finally{if(saved===undefined)delete process.env.REACT_NATIVE_OVERRIDE_HERMES_DIR;else process.env.REACT_NATIVE_OVERRIDE_HERMES_DIR=saved;}});
test('R4 native build metadata required',()=>assert.throws(()=>captureNativeBuild(['SYNTHETIC'],root,{},()=>({status:0})),/Native build requires/));
test('R4 native capture cannot attest an unobserved compiler',()=>{
 const ios=join(scratch,'uncaptured-ios');mkdirSync(ios);writeFileSync(join(ios,'main.hbc'),readFileSync(join(scratch,'release-ios/main.hbc')));
 assert.throws(()=>captureNativeBuild(['SYNTHETIC'],root,{LITTLE_ISLAND_WORD_IOS_ARTIFACT:ios,LITTLE_ISLAND_WORD_NATIVE_COMPILER_RECEIPT:join(scratch,'uncaptured.private.json')},()=>({status:0})),/lacks matching compiler capture/);
});
test('R4 compiler capture rejects symlinks',()=>{const ios=join(scratch,'compiler-symlink');mkdirSync(ios);symlinkSync(join(scratch,'release-ios/main.hbc'),join(ios,'main.hbc'));assert.throws(()=>bytecodeFiles(ios),/Symlink/);});
test('R4 binding includes identifier entries',()=>{
 initGit();const ios=join(scratch,'identifier-only-ios');mkdirSync(ios);const input=join(scratch,'identifier-only.js');writeFileSync(input,'globalThis.nativeOnlyIdentifier=1;');assert.equal(spawnSync(hermesc,['-emit-binary','-out',join(ios,'main.hbc'),input],{encoding:'utf8'}).status,0);assert.throws(()=>realCheckRelease(root,join(scratch,'release-web'),ios,join(scratch,'identifier-only-receipt'),syntheticIOSExport),/Hermes strings diverge/);
});
test('R4 scanned source hash in receipt',()=>{
 initGit();const file=join(scratch,'scanned-source.private.json');const receipt=checkRelease(root,join(scratch,'release-web'),join(scratch,'release-ios'),file);assert.equal(receipt.iosJavaScript.scannedJs[0].sha256,sha256('var global; hello; globalThis.safe="Native platform fixture";'));receipt.iosJavaScript.scannedJs[0].sha256='e'.repeat(64);writeFileSync(file,JSON.stringify(receipt));assert.throws(()=>verifyReleaseReceipt(root,file,join(scratch,'release-web'),join(scratch,'release-ios')),/receipt/);
});
test('R4 compiled bytes must match scanned bytes',()=>{
 initGit();assert.throws(()=>realCheckRelease(root,join(scratch,'release-web'),join(scratch,'release-ios'),join(scratch,'changed-compiled-source'),syntheticIOSExport,(command,args,options)=>{const r=spawnSync(command,args,{...options,encoding:'utf8'});assert.equal(r.status,0,r.stderr);writeFileSync(args[3],'globalThis.changed="Different fixture";');}),/Compiled JavaScript differs from scanned bytes/);
});
test('R4 scanned bytes cannot change before compilation',()=>{
 initGit();const original=fs.readFileSync;let reads=0;
 fs.readFileSync=function(path,...args){const bytes=original.call(this,path,...args);if(String(path).endsWith('/native.js')&&++reads===2)fs.writeFileSync(path,'globalThis.changed="Different fixture";');return bytes;};syncBuiltinESMExports();
 try{assert.throws(()=>checkRelease(root,join(scratch,'release-web'),join(scratch,'release-ios'),join(scratch,'changed-before-compilation')),/Scanned JavaScript changed before compilation/);}finally{fs.readFileSync=original;syncBuiltinESMExports();}
});
for(const field of ['nativeCompiler.sha256','iosJavaScript.scannedJsSha256','iosJavaScript.compiler.packageVersion'])test(`R4 receipt compiler binding ${field}`,()=>{
 initGit();const web=join(scratch,'release-web'),ios=join(scratch,'release-ios'),file=join(scratch,'compiler-receipt-'+field+'.private.json'),r=checkRelease(root,web,ios,file),keys=field.split('.');let target=r;for(const key of keys.slice(0,-1))target=target[key];target[keys.at(-1)]='e'.repeat(64);writeFileSync(file,JSON.stringify(r));assert.throws(()=>verifyReleaseReceipt(root,file,web,ios),/receipt|compiler|identity/);
});
test('R4 compiler cannot change during verification',()=>{
 initGit();const original=fs.readFileSync,packageFile=join(compilerCapture.compiler.packagePath,'package.json');
 try{assert.throws(()=>realCheckRelease(root,join(scratch,'release-web'),join(scratch,'release-ios'),join(scratch,'changed-compiler'),syntheticIOSExport,(command,args,options)=>{const r=spawnSync(command,args,{...options,encoding:'utf8'});assert.equal(r.status,0,r.stderr);fs.readFileSync=function(path,...rest){if(String(path)===packageFile){const value=JSON.parse(original.call(this,path,'utf8'));value.version='SYNTHETIC-MISMATCH';return JSON.stringify(value);}return original.call(this,path,...rest);};syncBuiltinESMExports();}),/Hermes compiler changed during verification/);}finally{fs.readFileSync=original;syncBuiltinESMExports();}
});
test('R4 native JavaScript export rejects symlinks',()=>{
 initGit();const source=join(scratch,'linked-native.js');writeFileSync(source,'var global;hello;');assert.throws(()=>realCheckRelease(root,join(scratch,'release-web'),join(scratch,'release-ios'),join(scratch,'native-js-symlink'),(_command,args)=>symlinkSync(source,join(args.at(-1),'native.js'))),/Symlink in native JavaScript export/);
});
for(const endian of ['le','be']){
 const text=Buffer.from(r4words.join(' '),'utf16le');if(endian==='be')text.swap16();exportCase(`R4 UTF16 ${endian} density`,'data.txt',Buffer.concat([Buffer.from(endian==='le'?'fffe':'feff','hex'),text]),r4policy,true);
}
exportCase('R4 UTF16 core','data.txt',Buffer.concat([Buffer.from('fffe','hex'),Buffer.from('Tap COLD now','utf16le')]),policy,true);
exportCase('R4 malformed UTF16','data.txt',Buffer.from([255,254,0]),policy,true);
test('R4 compiler capture rejects root symlink',()=>{const dir=join(scratch,'compiler-root-symlink');symlinkSync(join(scratch,'release-ios'),dir);assert.throws(()=>bytecodeFiles(dir),/Symlink/);});
for(const [label,text] of [
 ['technical','COLD_LABEL'],
 ['worklet','function(){ COLD(); }'],
 ['vector','<svg id="COLD"><text>Safe</text></svg>'],
 ['short exact','ZIP_LABEL'],
])test(`R4 original Hermes hard term ${label}`,()=>{
 const dir=join(scratch,'hermes-hard-'+label.replaceAll(' ','-'));mkdirSync(dir);const input=join(dir,'input.js'),output=join(dir,'main.hbc');writeFileSync(input,'globalThis.label='+JSON.stringify(text)+';');assert.equal(spawnSync(hermesc,['-emit-binary','-out',output,input],{encoding:'utf8'}).status,0);rmSync(input);assert.throws(()=>guardTree(dir,{...policy,exact:[...policy.exact,'ZIP']}),/blocked-literal/);
});
for(const copies of [1,2])test(`R4 non-list view preserves reviewed occurrence ${copies}`,()=>{
 const dir=join(scratch,'non-list-occurrence-'+copies),path='_expo/static/js/ios/entry-test.js';mkdirSync(join(dir,path,'..'),{recursive:true});const branches='switch(value){'+reviewedTableKeys.map(key=>'case '+JSON.stringify(key)+':break;').join('')+'}';writeFileSync(join(dir,path),branches+Array.from({length:copies},(_,i)=>`globalThis.table${i}=${JSON.stringify(reviewedTable)};`).join(''));if(copies===1)assert.equal(guardTree(dir,nativeTablePolicy).passed,true);else assert.throws(()=>guardTree(dir,nativeTablePolicy),/partial-list/);
});

// Round 5: placeholders only. These are accidental generator/export shapes.
for(const [kind,bytes] of [
 ['CSV cp1252',Buffer.from(r4words.join(',\n')+',café','latin1')],
 ['XML latin1',Buffer.from('<?xml version="1.0" encoding="ISO-8859-1"?><words>'+r4words.join(' ')+' COLD café</words>','latin1')],
 ['ANSI log',Buffer.from('\x1b[32m'+r4words.join('\n')+'\x1b[0m')],
 ['ANSI yaml',Buffer.from('words: [\x1b[32m'+r4words.join(', ')+'\x1b[0m]')],
 ['ANSI core',Buffer.from('Tap \x1b[32mCOLD\x1b[0m now')],
 ['OSC core',Buffer.from('\x1b]0;terminal\x07Tap COLD now')],
 ['control core',Buffer.from('Tap COLD now\x01')],
 ['latin1 core',Buffer.from('Tap COLD now. Café','latin1')],
 ['UTF16 no BOM',Buffer.from(r4words.join(' '),'utf16le')],
 ['UTF16BE no BOM',Buffer.from(r4words.join(' '),'utf16le').swap16()],
])exportCase('R5 text '+kind,'words.'+(kind.startsWith('XML')?'xml':kind.includes('CSV')?'csv':'txt'),bytes,r4policy,true);
for(const ext of ['zip','gz'])test('R5 reject archive '+ext,()=>{const dir=join(scratch,'archive-'+ext);mkdirSync(dir);writeFileSync(join(dir,'words.'+ext),ext==='gz'?Buffer.from('1f8b0800000000000003','hex'):Buffer.from('504b030400000000','hex'));assert.throws(()=>guardTree(dir,r4policy),/archives are forbidden/);});
for(const [format,magic] of Object.entries({png:'89504e470d0a1a0a',jpeg:'ffd8ff',gif:'474946383961',webp:'524946460000000057454250',wav:'524946460000000057415645',mp3:'494433',mp4:'0000002066747970',ogg:'4f676753',ttf:'00010000',otf:'4f54544f',woff:'774f4646',woff2:'774f4632'}))exportCase('R5 binary magic '+format,'media.unknown',Buffer.concat([Buffer.from(magic,'hex'),Buffer.from(' COLD ')]),policy,true);
for(const size of [5,6,7,8,9,10,11,12])for(const field of ['id','label'])for(const file of ['data.json','data.js']) {
 const rows=r4words.slice(0,size).map((word,i)=>({[field]:'card'+i,word,level:1}));
 exportCase(`R5 records ${size} ${field} ${file}`,file,(file.endsWith('js')?'globalThis.bank=':'')+JSON.stringify({words:rows}),r4policy,true);
}
for(const size of [16,60])for(const file of ['cards.json','cards.js']) {
 const words=Array.from({length:size},(_,i)=>'ZQ'+String.fromCharCode(65+Math.floor(i/26),65+i%26)+'WORDX'),p={...policy,scan:words};
 const rows=words.map((word,i)=>({id:'w'+i,word,definition:'filler '.repeat(size===60?65:20),example:'filler '.repeat(20),hint:'filler '.repeat(12),image:'image'+i,audio:'audio'+i}));
 exportCase(`R5 rich cards ${size} ${file}`,file,(file.endsWith('js')?'globalThis.cards=':'')+JSON.stringify(rows),p,true);
}
for(const size of [5,10])exportCase(`R5 object records ${size}`,'data.json',JSON.stringify(Object.fromEntries(r4words.slice(0,size).map(word=>[word,{level:1,category:'plain'}]))),r4policy,true);
exportCase('R5 mixed filenames','data.json',JSON.stringify([...r4words.slice(0,4).map(w=>w+'.m4a'),...Array.from({length:6},(_,i)=>'plain'+String.fromCharCode(65+i)+'.m4a')]),r4policy,true);
exportCase('R5 mixed ids','data.json',JSON.stringify([...r4words.slice(0,4).map(w=>'w:'+w),...Array.from({length:6},(_,i)=>'plain'+String.fromCharCode(65+i))]),r4policy,true);
test('R5 camelCase density',()=>assert.equal(densityTools.densityScanner(r4words)(r4words.map(w=>w.toLowerCase()+'Audio').join(' ')),25));
for(const value of ['1','yes','TRUE',' true ','false','0','',undefined])test('R5 CI '+String(value),async()=>{const {isCI}=await import(pathToFileURL(join(root,'scripts/words/check.mjs')));assert.equal(isCI(value),['1','yes','TRUE',' true '].includes(value));});
test('R5 duplicate teaching identity',()=>{
 const sourceRoot=join(scratch,'duplicate-teaching'),dir=join(sourceRoot,'dist');mkdirSync(join(sourceRoot,'src/learn/content'),{recursive:true});mkdirSync(dir);
 writeFileSync(join(sourceRoot,'src/learn/content/chamoru.ts'),'export const rows=[{id:"same",term:"Plain",english:"Safe"},{id:"same",term:"Plain",english:"Other"}];');writeFileSync(join(dir,'data.js'),'globalThis.safe=1;');
 assert.throws(()=>guardTree(dir,sensitivePolicy,[],{sourceRoot}),/Duplicate CHamoru teaching id/);
});
test('R5 shorthand teaching identity',()=>{
 const sourceRoot=join(scratch,'shorthand-teaching'),dir=join(sourceRoot,'dist');mkdirSync(join(sourceRoot,'src/learn/content'),{recursive:true});mkdirSync(dir);
 writeFileSync(join(sourceRoot,'src/learn/content/chamoru.ts'),'export const rows=[];');writeFileSync(join(sourceRoot,'src/learn/content/fino.ts'),'const term="KAPSENSE",english="Safe";export const rows=[{id:"x",term,english}];');writeFileSync(join(dir,'data.js'),'globalThis.safe=1;');
 assert.throws(()=>guardTree(dir,sensitivePolicy,[],{sourceRoot}),/plain string literals|blocked-chamoru-source/);
});
const letters='abcdefghijklmnopqrstuvwxyz';
const dilutedWords=Array.from({length:300},(_,i)=>'zq'+letters[Math.floor(i/26)]+letters[i%26]+'wordx');
const plainWords=Array.from({length:7600},(_,i)=>'plain'+letters[Math.floor(i/676)]+letters[Math.floor(i/26)%26]+letters[i%26]);
const diluted=plainWords.flatMap((word,i)=>[word,...(i%25===0 && i/25<300?[dilutedWords[i/25]]:[])]),dilutedPolicy={...policy,scan:dilutedWords,chamoruSensitive:[]};
// A generated map and asset registry at Metro scale. The terms are dispersed.
test('R5 diluted map 7600 plus 300',()=>{
 const dir=join(scratch,'diluted-map');mkdirSync(dir);writeFileSync(join(dir,'entry.js'),'__d(function(g,r,i,a,m,e,d){m.exports={'+diluted.map((w,i)=>JSON.stringify(w)+':r(d['+i+'])').join(',')+'}},1,[]);');
 assert.throws(()=>guardTree(dir,dilutedPolicy),/untraced-word-map/);
});
test('R5 diluted 300 audio files',()=>{
 const dir=join(scratch,'diluted-files');mkdirSync(dir);for(const word of dilutedWords)writeFileSync(join(dir,word+'.'+'a'.repeat(32)+'.m4a'),Buffer.from('00000020667479704d3441200001','hex'));
 assert.throws(()=>guardTree(dir,dilutedPolicy),/untraced-word-file/);
});
async function admissionFixture(name) {
 const module=await import(pathToFileURL(join(root,'scripts/words/generated-admission.mjs'))),dir=join(scratch,'admission-'+name);mkdirSync(join(dir,'src/content'),{recursive:true});writeFileSync(join(dir,'src/content/authored.ts'),'export const label="Plain reef beach";');mkdirSync(join(dir,'src/learn/content'),{recursive:true});writeFileSync(join(dir,'src/learn/content/chamoru.ts'),'export const words=[];');mkdirSync(join(dir,'src/app'));writeFileSync(join(dir,'src/app/index.ts'),'import "../content/authored";import "../content/accidental";import "../content/neuralAudio";');return {module,dir};
}
test('R5 generator admits authored source',async()=>{const {module,dir}=await admissionFixture('positive');const r=module.admitGenerated(dir,'speech',['REEF']);assert.equal(r.entries[0].source.path,'src/content/authored.ts');assert.equal(r.entries[0].source.sha256,sha256(readFileSync(join(dir,'src/content/authored.ts'))));});
test('R5 generator rejects untraced word',async()=>{const {module,dir}=await admissionFixture('unknown');assert.throws(()=>module.admitGenerated(dir,'speech',['ZQUNKNOWNX']),/no admitted authored source/);});
test('R5 generator rejects output self admission',async()=>{const {module,dir}=await admissionFixture('self');writeFileSync(join(dir,'src/content/neuralAudio.ts'),'const hidden="ZQUNKNOWNX";export const bank={"ZQUNKNOWNX":require("../../assets/audio/ZQUNKNOWNX.m4a")};');assert.throws(()=>module.generatedReceipts(dir),/no admitted authored source/);});
test('R5 generator rejects unknown map self admission',async()=>{const {module,dir}=await admissionFixture('unknown-self');writeFileSync(join(dir,'src/content/accidental.ts'),'export const bank={"ZQUNKNOWNX":require("../../assets/audio/ZQUNKNOWNX.m4a")};');assert.throws(()=>module.admitGenerated(dir,'speech',['ZQUNKNOWNX']),/no admitted authored source/);});
test('R5 generator rejects unknown generator',async()=>{const {module,dir}=await admissionFixture('bad-generator');assert.throws(()=>module.admitGenerated(dir,'unknown',['REEF']),/Unknown word generator/);});
test('R5 generator rejects empty word',async()=>{const {module,dir}=await admissionFixture('empty');assert.throws(()=>module.admitGenerated(dir,'speech',['']),/Invalid generated word/);});
test('R5 guard admits traced word assets',async()=>{const {dir}=await admissionFixture('guard');const out=join(dir,'dist');mkdirSync(out);writeFileSync(join(out,'reef.'+'a'.repeat(32)+'.m4a'),Buffer.from('00000020667479704d3441200001','hex'));const p={...policy,scan:['REEF'],chamoruSensitive:[]};assert.equal(guardTree(out,p,[],{sourceRoot:dir}).passed,true);});

exportCase('R5 ANSI middle word','data.txt','Tap CO\x1b[32mLD now',policy,true);
test('R5 CI 1 missing policy',()=>{const env={...process.env,CI:'1'};for(const key of Object.keys(env))if(key.startsWith('LITTLE_ISLAND_WORD_POLICY_'))delete env[key];const dir=join(scratch,'ci-one-policy');mkdirSync(dir);const result=spawnSync(process.execPath,[join(root,'scripts/words/check.mjs'),'export',dir],{cwd:root,env,encoding:'utf8'});assert.notEqual(result.status,0);assert.match(result.stderr,/CI export requires a nonempty private policy/);});
test('R5 controls normalized',async()=>{const {exportTextViews}=await import(pathToFileURL(join(root,'scripts/words/text-views.mjs')));assert.deepEqual(exportTextViews(Buffer.from('one\x01two\nthree')),['one two\nthree']);});
test('R5 admission rejects source symlink',async()=>{const {module,dir}=await admissionFixture('symlink');symlinkSync(join(dir,'src/content/authored.ts'),join(dir,'src/content/linked.ts'));assert.throws(()=>module.admissionSources(dir),/Symlink/);});
test('R5 admission rejects malformed Python',async()=>{const {module,dir}=await admissionFixture('python');mkdirSync(join(dir,'scripts'));writeFileSync(join(dir,'scripts/generate-audio.py'),'this = (');assert.throws(()=>module.admissionSources(dir),/Cannot parse authored speech literals/);});
test('R5 admission rejects modified inherited bank',async()=>{const {module,dir}=await admissionFixture('legacy');mkdirSync(join(dir,'content/words'),{recursive:true});writeFileSync(join(dir,'content/words/legacy-word-rescue.ts'),'export const words=["REEF"];');assert.throws(()=>module.admissionSources(dir),/Unadmitted inherited source/);});
for(const bad of ['path','hash'])test('R5 admission rejects bank '+bad,async()=>{const {module,dir}=await admissionFixture('bank-'+bad);mkdirSync(join(dir,'content/words/banks'),{recursive:true});writeFileSync(join(dir,'content/words/banks/sample.json'),'{"words":[],"accept":[]}');writeFileSync(join(dir,'content/words/banks.manifest.json'),JSON.stringify({banks:[{path:bad==='path'?'../sample.json':'content/words/banks/sample.json',sha256:'0'.repeat(64)}]}));assert.throws(()=>module.admissionSources(dir),bad==='path'?/Invalid admission bank path/:/Stale admitted bank/);});
for(const bad of ['text','key'])test('R5 admission rejects generated speech '+bad,async()=>{const {module,dir}=await admissionFixture('speech-'+bad);mkdirSync(join(dir,'scripts/learn'),{recursive:true});writeFileSync(join(dir,'scripts/learn/growth.json'),JSON.stringify(bad==='text'?{'id-1':'ZQUNKNOWNX'}:{beach:'reef'}));assert.throws(()=>module.admissionSources(dir),bad==='text'?/no authored token source/:/key differs/);});

test('R5 object record key structure',async()=>{const {jsonUnits}=await import(pathToFileURL(join(root,'scripts/words/artifact-views.mjs')));const keys=r4words.slice(0,5);assert.ok(jsonUnits(Object.fromEntries(keys.map(word=>[word,{level:1,category:'plain'}]))).some(unit=>JSON.stringify(unit)===JSON.stringify(keys)));});
exportCase('R5 encoded Latin1 JSON literal','data.json',Buffer.from('{"label":"Café"}','latin1'),{...policy,core:['CAFÉ'],exact:[],lemmas:[]},true);
exportCase('R5 encoded Latin1 text literal','data.txt',Buffer.from('Tap Café now','latin1'),{...policy,core:['CAFÉ'],exact:[],lemmas:[]},true);
test('R5 malformed BOMless UTF16',async()=>{const {exportTextViews}=await import(pathToFileURL(join(root,'scripts/words/text-views.mjs')));assert.throws(()=>exportTextViews(Buffer.concat([Buffer.from('Plain','utf16le'),Buffer.from('X')])),/Malformed BOM-less UTF-16/);});
test('R5 authored numeric search tokens',async()=>{const {module,dir}=await admissionFixture('numeric');writeFileSync(join(dir,'src/content/authored.ts'),'export const label="In 1944, on 21 July";');assert.equal(module.admitGenerated(dir,'library',['1944','21']).entries.length,2);});

test('R5 diluted map with mixed ids',()=>{const dir=join(scratch,'diluted-mixed-map');mkdirSync(dir);writeFileSync(join(dir,'entry.js'),'globalThis.audio={"instructions-plain":require("safe.m4a"),'+diluted.map((w,i)=>JSON.stringify(w)+':r(d['+i+'])').join(',')+'};');assert.throws(()=>guardTree(dir,dilutedPolicy),/untraced-word-map/);});

for(const shape of ['lazy','dictionary'])test('R5 diluted '+shape+' map',()=>{const dir=join(scratch,'diluted-'+shape);mkdirSync(dir);writeFileSync(join(dir,'entry.js'),'globalThis.words={'+diluted.map((word,i)=>JSON.stringify(word)+':'+(shape==='lazy'?'()=>r(d['+i+'])':JSON.stringify('Safe authored explanation.'))).join(',')+'};');assert.throws(()=>guardTree(dir,dilutedPolicy),/untraced-word-map/);});

// R6: generator inputs cannot attest their own vocabulary.
for(const path of ['scripts/learn/spelling.json','scripts/quality-audio.json','scripts/explore-audio.json','scripts/lab-audio.json','scripts/arcade-speech.json'])test('R6 speech input cannot admit '+path,async()=>{
 const {module,dir}=await admissionFixture('r6-input-'+path.replaceAll('/','-'));mkdirSync(join(dir,path,'..'),{recursive:true});writeFileSync(join(dir,path),JSON.stringify({'spell-ZQUNKNOWNX':'ZQUNKNOWNX'}));
 assert.ok(!module.vocabularySources(dir).words.has('ZQUNKNOWNX'));assert.throws(()=>module.admissionSources(dir),/no authored token source/);
});
for(const text of ['ZQUNKNOWNX','ZQUNKNOWNX.','ZQ-UNKNOWNX'])test('R6 word-like speech '+text,async()=>{const {module,dir}=await admissionFixture('r6-token-'+sha256(text));mkdirSync(join(dir,'scripts/learn'),{recursive:true});writeFileSync(join(dir,'scripts/learn/spelling.json'),JSON.stringify({'spell-ZQUNKNOWNX':text}));assert.throws(()=>module.admissionSources(dir),/no authored token source/);});
test('R6 spell key cannot hide behind sentence',async()=>{const {module,dir}=await admissionFixture('r6-key');mkdirSync(join(dir,'scripts/learn'),{recursive:true});writeFileSync(join(dir,'scripts/learn/spelling.json'),JSON.stringify({'spell-ZQUNKNOWNX':'Say this invented word.'}));assert.throws(()=>module.admissionSources(dir),/key differs/);});
test('R6 sentence is prose but cannot donate vocabulary',async()=>{const {module,dir}=await admissionFixture('r6-prose');mkdirSync(join(dir,'scripts/learn'),{recursive:true});writeFileSync(join(dir,'scripts/learn/lines.json'),JSON.stringify({'line-one':'This is authored ZQUNKNOWNX prose.'}));const s=module.admissionSources(dir);assert.ok(s.exact.has('LINE-ONE'));assert.ok(!s.words.has('ZQUNKNOWNX'));assert.throws(()=>module.admitGenerated(dir,'speech',['ZQUNKNOWNX'],s),/no admitted/);});
for(const edge of ['import','export','require','dynamic'])test('R6 reachable graph '+edge,async()=>{const {module,dir}=await admissionFixture('r6-graph-'+edge);writeFileSync(join(dir,'src/content/edge.ts'),'export const label="ZQAUTHOREDX";');writeFileSync(join(dir,'src/app/index.ts'),({import:'import "../content/edge";',export:'export * from "../content/edge";',require:'require("../content/edge");',dynamic:'import("../content/edge");'})[edge]);assert.ok(module.admissionSources(dir).words.has('ZQAUTHOREDX'));});
for(const edge of ['unimported','type-only'])test('R6 graph excludes '+edge,async()=>{const {module,dir}=await admissionFixture('r6-graph-'+edge);writeFileSync(join(dir,'src/content/unused.ts'),'export const words=["ZQUNKNOWNX"];');if(edge==='type-only')writeFileSync(join(dir,'src/app/index.ts'),'import type { Word } from "../content/unused";');assert.ok(!module.admissionSources(dir).words.has('ZQUNKNOWNX'));});
for(const path of ['scripts/learn/spelling.json','scripts/quality-audio.json','scripts/generate-audio.py','src/content/unimported.json','src/content/unused.ts'])for(const kind of ['core','exact','list','density'])test('R6 source scan '+path+' '+kind,async()=>{
 const {dir}=await admissionFixture('r6-scan-'+sha256(path+kind)),out=join(dir,'dist');mkdirSync(out);mkdirSync(join(dir,path,'..'),{recursive:true});writeFileSync(join(out,'entry.js'),'globalThis.safe=1;');
 const words=kind==='core'?['COLD']:kind==='exact'?['ZQEXACTX']:kind==='list'?r4words.slice(0,5):r4words.slice(0,16).map(w=>'This is a sentence about '+w+' and it has enough ordinary words to be prose. '+Array(45).fill('safe').join(' '));
 writeFileSync(join(dir,path),path.endsWith('py')?'speech={};speech.update('+JSON.stringify(Object.fromEntries(words.map((w,i)=>['line-'+i,w])))+')':path.endsWith('ts')?'export const data='+JSON.stringify(words)+';':JSON.stringify(path.startsWith('scripts/')?Object.fromEntries(words.map((w,i)=>['line-'+i,w])):words));
 assert.throws(()=>guardTree(out,{...r4policy,exact:['ZQEXACTX']},[],{sourceRoot:dir}),kind==='list'?/blocked-source-list/:kind==='density'?/blocked-source-density/:/blocked-source-literal/);
});
for(const [ordinary,count] of [[200,10],[500,20],[1000,40]])for(const prefix of ['','spell-'])test(`R6 realistic speech slice ${ordinary}+${count} ${prefix}`,async()=>{
 const {dir}=await admissionFixture('r6-slice-'+ordinary+prefix),out=join(dir,'dist');mkdirSync(out);mkdirSync(join(dir,'scripts/learn'),{recursive:true});
 const alphabet='abcdefghijklmnopqrstuvwxyz',plain=i=>alphabet[i%26]+alphabet[Math.floor(i/26)%26]+'plain'+alphabet[Math.floor(i/676)%26],bad=dilutedWords.slice(0,count).map((word,i)=>alphabet[(i*7)%26]+word.toLowerCase()),all=[...Array.from({length:ordinary},(_,i)=>plain(i)),...bad];
 const backdrop=[...readFileSync(resolve('src/content/neuralAudio.ts'),'utf8').matchAll(/"([^"\n]+)"\s*:\s*require/g)].map(m=>m[1]);
 const keys=[...new Set([...backdrop,...all.map(word=>prefix+word)])].sort();
 writeFileSync(join(dir,'scripts/learn/spelling.json'),JSON.stringify(Object.fromEntries(all.map(w=>[prefix+w,w]))));
 const map='__d(function(g,r,i,a,m,e,d){m.exports={'+keys.map((w,i)=>JSON.stringify(w)+':r(d['+i+'])').join(',')+'}},1,[]);';
 const assets=keys.map((w,i)=>'__d(function(g,r,i,a,m,e,d){m.exports=r(d[0]).registerAsset({"__packager_asset":true,"httpServerLocation":"/assets/assets/audio","scales":[1],"hash":"'+'a'.repeat(32)+'","name":'+JSON.stringify(w)+',"type":"m4a","fileHashes":["'+'a'.repeat(32)+'"]})},'+(i+2)+',[0]);').join('\n');
 writeFileSync(join(out,'entry.js'),map+'\n'+assets);assert.throws(()=>guardTree(out,{...r4policy,scan:bad},[],{sourceRoot:dir}),/no authored token source|key differs|leaked/);
});
for(const path of ['scripts/learn/spelling.json','scripts/quality-audio.json','src/content/spelling-source.json'])test('R6 diluted 7600 source '+path,async()=>{
 const {dir}=await admissionFixture('r6-7600-'+sha256(path)),out=join(dir,'dist');mkdirSync(out);mkdirSync(join(dir,path,'..'),{recursive:true});writeFileSync(join(dir,path),JSON.stringify(path.startsWith('src/')?diluted:Object.fromEntries(diluted.map(w=>[w,w]))));writeFileSync(join(out,'entry.js'),'globalThis.map={'+diluted.map((w,i)=>JSON.stringify(w)+':r(d['+i+'])').join(',')+'};');assert.throws(()=>guardTree(out,dilutedPolicy,[],{sourceRoot:dir}),/no authored token source|key differs|untraced-word-map/);
});
test('R6 generated receipt rejects speech self admission',async()=>{const {module,dir}=await admissionFixture('r6-receipt');mkdirSync(join(dir,'scripts/learn'),{recursive:true});writeFileSync(join(dir,'scripts/learn/spelling.json'),'{"ZQUNKNOWNX":"ZQUNKNOWNX"}');writeFileSync(join(dir,'src/content/neuralAudio.ts'),'export const map={"ZQUNKNOWNX":require("unknown.m4a")};');assert.throws(()=>module.generatedReceipts(dir),/no authored token source/);});
for(const prefix of ['true ','OTTO\n','ID3 tags\n','OggS\n','GIF89a\n','abc ftyp\n'])exportCase('R6 media tag text '+sha256(prefix),'debug.log',prefix+"[ 'ALPHANONSENSE', 'BETANONSENSE', 'GAMMANONSENSE' ] COLD",policy,true);
test('R6 debug dump regression',()=>{const dir=join(scratch,'r6-debug');mkdirSync(dir);writeFileSync(join(dir,'debug.log'),"true [ 'ALPHANONSENSE', 'BETANONSENSE', 'GAMMANONSENSE' ] COLD");assert.throws(()=>guardTree(dir,policy),/blocked-literal/);});
function mediaChunk(type,data){const body=Buffer.concat([Buffer.from(type),data]),size=Buffer.alloc(4),crc=Buffer.alloc(4);size.writeUInt32BE(data.length);let value=0xffffffff;for(const n of body){value^=n;for(let i=0;i<8;i++)value=(value>>>1)^((value&1)?0xedb88320:0);}crc.writeUInt32BE((value^0xffffffff)>>>0);return Buffer.concat([size,body,crc]);}
const pngHeader=Buffer.from('00000001000000010806000000','hex'),validPng=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),mediaChunk('IHDR',pngHeader),mediaChunk('IDAT',Buffer.from('789c6300010000050001','hex')),mediaChunk('IEND',Buffer.alloc(0))]);
const validM4a=Buffer.from('00000014667479704d344120000000004d344120','hex');
const validWav=Buffer.from('524946462600000057415645666d74201000000001000100401f0000803e00000200100064617461020000000000','hex');
const validTtf=Buffer.from('74727565000100100000000068656164000000000000001c0000000400000000','hex');
for(const [kind,bytes,want] of [['PNG',validPng,'image'],['RIFF',validWav,'media'],['M4A',validM4a,'audio'],['ID3',Buffer.from('49443304000000000000','hex'),'audio'],['sfnt',validTtf,'font']])test('R6 structured media '+kind,async()=>{const {binaryKind}=await import(pathToFileURL(join(root,'scripts/words/text-views.mjs')));assert.equal(binaryKind(bytes),want);assert.equal(binaryKind(bytes.subarray(0,Math.min(9,bytes.length-1))),undefined);});
for(const [kind,bytes] of [['PNG CRC',Buffer.from(validPng)],['PNG IHDR',Buffer.from(validPng)],['RIFF size',Buffer.from(validWav)],['M4A size',Buffer.from(validM4a)],['ID3 version',Buffer.from('494433ff000000000000','hex')],['ID3 size',Buffer.from('4944330400007f7f7f7f','hex')],['sfnt zero',Buffer.from(validTtf)],['sfnt count',Buffer.from(validTtf)],['sfnt range',Buffer.from(validTtf)]])test('R6 invalid media '+kind,async()=>{if(kind==='PNG CRC')bytes[29]^=1;if(kind==='PNG IHDR'){mediaChunk('JUNK',pngHeader).copy(bytes,8);}if(kind==='RIFF size')bytes[4]=0;if(kind==='M4A size')bytes[3]=24;if(kind==='sfnt count')bytes[5]=255;if(kind==='sfnt zero')bytes[5]=0;if(kind==='sfnt range')bytes[23]=255;const {binaryKind}=await import(pathToFileURL(join(root,'scripts/words/text-views.mjs')));assert.equal(binaryKind(bytes),undefined);});
for(const [name,file] of [['camel','zqunknownxClip.m4a']])test('R6 word asset '+name,async()=>{const {dir}=await admissionFixture('r6-asset-'+name),out=join(dir,'dist');mkdirSync(join(out,file,'..'),{recursive:true});writeFileSync(join(out,file),validM4a);assert.throws(()=>guardTree(out,{...policy,scan:['ZQUNKNOWNX']},[],{sourceRoot:dir}),/untraced-word/);});
for(const family of ['word-search','crossword','fill-in','word-ladder','word-scramble','word-builder'])test('R6 word family pack '+family,async()=>{const {dir}=await admissionFixture('r6-pack-'+family),{admitPuzzlePack}=await import(pathToFileURL(join(root,'scripts/words/puzzle-admission.mjs')));assert.throws(()=>admitPuzzlePack(dir,family,'engine',[{payload:{answers:['ZQUNKNOWNX']}}]),/no admitted/);assert.equal(admitPuzzlePack(dir,family,'engine',[{payload:{answers:['REEF'],cells:[['Z','Q']]}}]).entries.length,1);assert.throws(()=>admitPuzzlePack(dir,family,'engine',[{payload:{cells:[['Z','Q']]}}]),/expose decoded vocabulary/);});
test('R6 published inherited key and word frozen',async()=>{
 const {module,dir}=await admissionFixture('r6-published'),snapshot=readFileSync(join(root,'scripts/words/published-speech.json'));mkdirSync(join(dir,'scripts/words'),{recursive:true});writeFileSync(join(dir,'scripts/words/published-speech.json'),snapshot);
 const bank=JSON.parse(snapshot),row=bank.entries.find(r=>{try{return Object.entries(JSON.parse(readFileSync(resolve(r.path)))).some(([k,t])=>sha256(k)===r.keySha256 && sha256(t)===r.transcriptSha256);}catch{return false;}});assert.ok(row);
 const [key,text]=Object.entries(JSON.parse(readFileSync(resolve(row.path)))).find(([k])=>sha256(k)===row.keySha256);mkdirSync(join(dir,row.path,'..'),{recursive:true});writeFileSync(join(dir,row.path),JSON.stringify({[key]:text}));const admitted=module.admissionSources(dir);assert.equal(admitted.inheritedEntries.length,1);assert.match(admitted.exact.get(densityTools.normalizedText(key)).path,/^published:/);
 for(const [k,t] of [[key+'-changed',text],[key,'ZQUNKNOWNX']]){writeFileSync(join(dir,row.path),JSON.stringify({[k]:t}));assert.throws(()=>module.admissionSources(dir),/no authored token source|key differs/);}
});
test('R6 frozen inherited snapshot cannot change',async()=>{const {module,dir}=await admissionFixture('r6-published-change');mkdirSync(join(dir,'scripts/words'),{recursive:true});writeFileSync(join(dir,'scripts/words/published-speech.json'),'{}');assert.throws(()=>module.admissionSources(dir),/Changed frozen/);});
test('R6 Hermes magic needs header',async()=>{const {binaryKind}=await import(pathToFileURL(join(root,'scripts/words/text-views.mjs')));assert.equal(binaryKind(Buffer.concat([Buffer.from('c61fbc03c103191f','hex'),Buffer.from(' COLD ')])),undefined);const input=join(scratch,'r6-valid-hermes.js'),out=join(scratch,'r6-valid-hermes.hbc');writeFileSync(input,'globalThis.label="Safe fixture";');assert.equal(spawnSync(hermesc,['-emit-binary','-out',out,input]).status,0);assert.equal(binaryKind(readFileSync(out)),'hermes');});
test('R6 custom entry symlink rejects',async()=>{const {module,dir}=await admissionFixture('r6-entry-symlink');writeFileSync(join(dir,'package.json'),'{"main":"entry.ts"}');symlinkSync(join(dir,'src/content/authored.ts'),join(dir,'entry.ts'));assert.throws(()=>module.admissionSources(dir),/Symlink/);});
for(const [kind,value] of [['array',[]],['null',null],['non-string',{'line-one':3}]])test('R6 invalid speech shape '+kind,async()=>{const {module,dir}=await admissionFixture('r6-shape-'+kind);mkdirSync(join(dir,'scripts/learn'),{recursive:true});writeFileSync(join(dir,'scripts/learn/spelling.json'),JSON.stringify(value));assert.throws(()=>module.admissionSources(dir),/Invalid speech input map/);});
test('R6 invalid picture allowlist',async()=>{const {module,dir}=await admissionFixture('r6-allowlist');mkdirSync(join(dir,'content/pictures'),{recursive:true});writeFileSync(join(dir,'content/pictures/allowlist.json'),'{"schemaVersion":1,"words":[]}');assert.throws(()=>module.admissionSources(dir),/Invalid picture vocabulary allowlist/);});
test('R6 Library normalized token stays item bound',async()=>{const {module,dir}=await admissionFixture('r6-library-normalized');mkdirSync(join(dir,'content/library'),{recursive:true});writeFileSync(join(dir,'content/library/items.json'),JSON.stringify([{id:'one',title:'ZQcamelCaseX'},{id:'two',title:'Plain reef'}]));assert.equal(module.admitLibraryIndex(dir,[{id:'one',terms:['zqcamelcasex']}]).entries[0].itemId,'one');assert.throws(()=>module.admitLibraryIndex(dir,[{id:'two',terms:['zqcamelcasex']}]),/no source in its authored item/);});

packedCase('R6 guard registered word family pack','numeric-code',{language:'en',answers:['COLD']},true,0,'word-search');
test('R6 Library catalog binds active authored items',async()=>{const {module,dir}=await admissionFixture('r6-library-active');mkdirSync(join(dir,'content/library'),{recursive:true});writeFileSync(join(dir,'content/library/items.json'),'[{"id":"one","title":"ZQotherTermX"}]');const sources=module.admissionSources(dir);assert.equal(module.admitLibraryIndex(dir,[{id:'one',terms:['reef']}],sources,[]).entries.length,1);assert.throws(()=>module.admitLibraryIndex(dir,[{id:'one',terms:['reef']}],sources,['one']),/no source in its authored item/);});

packedCase('R6 guard word pack vocabulary admission','numeric-code',{language:'en',answers:['ZQUNKNOWNX']},true,0,'word-search');
packedCase('R6 guard word pack authored control','numeric-code',{language:'en',answers:['REEF']},false,0,'word-search',['REEF']);
