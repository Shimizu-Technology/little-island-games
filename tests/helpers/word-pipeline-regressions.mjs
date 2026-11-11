import { Buffer } from 'node:buffer';
// Synthetic gate proof only. No content, reviewer or family approval is created.
import { test as nodeTest, after } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, cpSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
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
const root=join(scratch,'repo'), sources=join(scratch,'sources');
mkdirSync(join(root,'scripts'),{recursive:true});mkdirSync(join(root,'content/words'),{recursive:true});mkdirSync(sources);
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
const {guardTree}=await import(pathToFileURL(join(root,'scripts/words/guard.mjs')));
const {registrySource}=await import(pathToFileURL(join(root,'scripts/words/registry.mjs')));
const {checkShippingTree}=await import(pathToFileURL(join(root,'scripts/words/shipping.mjs')));
const {privatePath}=await import(pathToFileURL(join(root,'scripts/words/paths.mjs')));
const {isPrivateWordFile}=await import(pathToFileURL(resolve(process.env.WORD_TEST_EXPORT_FILE??'scripts/export-public.mjs')));
const {checkExport,checkRelease,verifyReleaseReceipt}=await import(pathToFileURL(join(root,'scripts/words/check.mjs')));
const {scanGrid,scanLetterWheel}=await import(pathToFileURL(join(root,'scripts/words/scan.mjs')));
const {hermesStrings}=await import(pathToFileURL(join(root,'scripts/words/artifact-views.mjs')));
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
for(const [name,contents] of [['partial-array','["ALPHANONSENSE","BETANONSENSE","GAMMANONSENSE"]'],['keys','{"ALPHANONSENSE":1,"BETANONSENSE":1,"GAMMANONSENSE":1}'],['newlines','ALPHANONSENSE\nBETANONSENSE\nGAMMANONSENSE'],['core','COLD'],['chamoru','SYNTHETICHEADWORD'],['canary','PRIVATECANARYNONWORD'],['scan-hash',lock.scanListSha256]])test(`guard ${name}`,()=>{const dir=join(scratch,'guard');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'app.bin'),contents);assert.throws(()=>guardTree(dir,policy),/leaked/);rmSync(dir,{recursive:true});});
for(const name of ['receipt.private.json','safety-policy.private.json','tiers.queue.json','reconcile.pending.json'])test(`guard filename ${name}`,()=>{const dir=join(scratch,'names');mkdirSync(dir);writeFileSync(join(dir,name),'{}');assert.throws(()=>guardTree(dir,policy),/leaked/);rmSync(dir,{recursive:true});});
const hermesPlatform={darwin:'osx-bin',linux:'linux64-bin',win32:'win64-bin'}[process.platform];
assert.ok(hermesPlatform,`Unsupported Hermes test platform: ${process.platform}`);
const hermesc=resolve('node_modules/hermes-compiler/hermesc',hermesPlatform,process.platform==='win32'?'hermesc.exe':'hermesc');
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
 ['identity',{sense:''},/identity\/sense/],['language',{language:'unknown'},/language/],['lemma',{lemma:''},/lemma\/reader/],['bands',{knownBand:0},/knownBand/],['tags',{theme:''},/word tags/],['audio',{audio:42},/audio field/],['source fields',{source:{}},/pinned source/],['form',{form:'unknown'},/spelling metadata/],['variant syntax',{british:['!']},/British variants/],['abbreviation',{abbreviation:true},/Abbreviations/],['child phrase',{spelling:'TRADE WIND'},/adult only/],['lengths',{spelling:'TRADE WIND',readerLevel:'Grown-up'},/multi-word lengths/],['child plural',{spelling:'REEFS',form:'plural'},/Child answers/],['proper noun',{spelling:'PARIS',properNoun:true},/proper noun/],['body label',{spelling:'FAT'},/Body labels/],['other faith',{topic:'other-faith'},/Other faiths/],['living person',{livingPerson:true},/living people/],['story sense',{spelling:'GHOST'},/Story sense/],['spooky tier',{spelling:'DEMON'},/Spooky word/],['hard sense',{spelling:'DEATH'},/Hard word/],['sword story',{spelling:'SWORD'},/Sword requires/],['American locale',{locale:'en-GB'},/American uppercase/]
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
test('term exceptions survive ordinary app edits but reject new terms and list blobs',()=>{const dir=join(scratch,'term-exceptions');mkdirSync(dir);const file=join(dir,'entry-first.bin');const p={...policy,artifactTermExceptions:[{path:'entry-*.bin',terms:[{term:'COLD',check:'literal',reason:'Synthetic ordinary app prose',evidence:'synthetic-reviewed-context'},{term:'ALPHANONSENSE',check:'broad',reason:'Synthetic baseline collision',evidence:'synthetic-reviewed-context'}]}]};writeFileSync(file,'COLD ALPHANONSENSE ordinary app text');assert.equal(guardTree(dir,p).passed,true);writeFileSync(file,'COLD ALPHANONSENSE ordinary app text changed');assert.equal(guardTree(dir,p).passed,true);writeFileSync(file,'COLD ALPHANONSENSE BETANONSENSE GAMMANONSENSE DELTANONSENSE');assert.throws(()=>guardTree(dir,p),/leaked/);writeFileSync(file,policy.canaries[0]);assert.throws(()=>guardTree(dir,p),/canary/);writeFileSync(file,JSON.stringify(policy.scan));assert.throws(()=>guardTree(dir,p),/leaked/);});
test('guard exceptions do not invalidate unchanged bank inputs',()=>{const d=input(),p={...policy,artifactTermExceptions:[],legacyArtifactSha256:['a'.repeat(64)],legacyArtifactSource:'changed inherited source, not word policy'};try{writeFileSync(policyFile,JSON.stringify(p));writeFileSync(lockFile,JSON.stringify({...lock,policySha256:sha256(readFileSync(policyFile))}));assert.equal(bakeBank(d).asset.words.length,1);}finally{writeFileSync(policyFile,JSON.stringify(policy));writeFileSync(lockFile,JSON.stringify(lock));}});
test('dropping a rejected record preserves retained record reviews and family sample',()=>{const records=[word(),word('REED')],d=input(records),ev=d.evidence.reef;for(let i=0;i<2;i++){ev.reviews[i].items.find(r=>r.id==='reed').verdict='reject';ev.reviews[i]=seal(ev.reviews[i]);}rebind(ev);ev.lead.items.find(r=>r.id==='reed').decision='reject';d.words=[records[0]];d.surfaces[0].wordIds=['reef'];delete d.evidence.reed;assert.equal(bakeBank(d).asset.words.length,1);});
test('separate batches bind their records in a larger bank',()=>{const d=input([word(),word('REED')]);d.evidence.reef=evidenceFor([d.words[0]]);d.evidence.reed=evidenceFor([d.words[1]]);assert.equal(bakeBank(d).asset.words.length,2);});
test('CLI separate vocabulary prepares and bakes 300 words in two batches',()=>{const words=Array.from({length:300},(_,i)=>word('R'+String.fromCharCode(65+Math.floor(i/676),65+Math.floor(i/26)%26,65+i%26))),d={fixture:false,words,surfaces:[{id:'match',kind:'matching',wordIds:words.map(w=>w.id)}],canonicalTerms,policy,sourceDirectory:sources,evidence:{},reviewBatches:{}};for(let i=0;i<2;i++){const records=words.slice(i*250,(i+1)*250),file=join(scratch,`cli-input-${i}.private.json`),out=join(scratch,`cli-prepared-${i}`);writeFileSync(file,JSON.stringify({fixture:false,words:records,vocabulary:words}));const r=spawnSync(process.execPath,[join(root,'scripts/words/cli.mjs'),'prepare-words',file,policyFile,out,`batch-${i}`],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const prepared=JSON.parse(readFileSync(join(out,'prepared.private.json')));assert.equal(prepared.batch.records.length,records.length);assert.equal(prepared.batch.vocabularySha256,digest(words));d.reviewBatches[`batch-${i}`]=evidenceFor(records,words,'word',prepared);for(const w of records)d.evidence[w.id]=`batch-${i}`;}assert.equal(bakeBank(d).asset.words.length,300);});
for(const field of ['source','policySha256','scanListSha256','admission.full','admission.passed','web.passed','ios.passed','ios.sha256'])test(`clause release receipt ${field}`,()=>{initGit();const web=join(scratch,'release-web'),ios=join(scratch,'release-ios'),file=join(scratch,`receipt-${field}.private.json`);checkRelease(root,web,ios,file);const r=JSON.parse(readFileSync(file));const keys=field.split('.');let target=r;for(const k of keys.slice(0,-1))target=target[k];const key=keys.at(-1);target[key]=typeof target[key]==='boolean'?false:'a'.repeat(64);writeFileSync(file,JSON.stringify(r));assert.throws(()=>verifyReleaseReceipt(root,file,web,ios),/receipt/);});
test('release and receipt refuse uncommitted source data',()=>{initGit();const file=join(root,'uncommitted.txt');writeFileSync(file,'Synthetic change');try{assert.throws(()=>checkRelease(root,join(scratch,'release-web'),join(scratch,'release-ios'),join(scratch,'dirty-receipt')),/clean source/);assert.throws(()=>verifyReleaseReceipt(root,join(scratch,'release-receipt.private.json'),join(scratch,'release-web'),join(scratch,'release-ios')),/clean source/);}finally{rmSync(file);}});
test('delivery commands call release then receipt immediately before action',async()=>{const {deliver}=await import(pathToFileURL(join(root,'scripts/words/delivery.mjs')));const env={LITTLE_ISLAND_WORD_WEB_ARTIFACT:'web',LITTLE_ISLAND_WORD_IOS_ARTIFACT:'ios',LITTLE_ISLAND_WORD_RELEASE_RECEIPT:'private-receipt'};for(const platform of ['web','ios']){const calls=[];assert.equal(deliver(platform,['synthetic-delivery'],root,env,(cmd,args)=>{calls.push([cmd,...args]);return {status:0};}),0);assert.deepEqual(calls,[['npm','run','check:words:release','--','web','ios','private-receipt'],['npm','run','check:words:receipt','--','private-receipt','web','ios'],['synthetic-delivery']]);for(const failed of ['check:words:release','check:words:receipt']){const rejected=[];assert.throws(()=>deliver(platform,['synthetic-delivery'],root,env,(cmd,args)=>{rejected.push(cmd);return {status:args.includes(failed)?1:0};}),/Delivery blocked/);assert.ok(!rejected.includes('synthetic-delivery'));}}});
test('native preview build and npm delivery scripts are gated',()=>{const scripts=JSON.parse(readFileSync(process.env.WORD_TEST_PACKAGE_FILE??resolve('package.json'))).scripts;assert.match(scripts['deliver:web'],/words\/delivery.mjs web/);assert.match(scripts['deliver:ios'],/words\/delivery.mjs ios/);const native=readFileSync(resolve('scripts/ios-preview-bundle.mjs'),'utf8');assert.match(native,/checkShippingTree\(cwd,env.LITTLE_ISLAND_WORD_RECEIPTS,\{full:true\}\)/);assert.match(native,/putBack\(\);\s*gateDelivery\(cwd,env\)/);});
test('unreviewed manifest bank fails export and actual delivery before action',()=>{const {dir}=stagedBank(),web=join(scratch,'release-web'),ios=join(scratch,'release-ios'),marker=join(scratch,'SHOULD-NOT-DELIVER');try{assert.throws(()=>checkExport(dir,web),/admission evidence/);cpSync(join(root,'scripts'),join(dir,'scripts'),{recursive:true});symlinkSync(resolve('node_modules'),join(dir,'node_modules'));writeFileSync(join(dir,'.gitignore'),'node_modules/\n');writeFileSync(join(dir,'package.json'),JSON.stringify({scripts:{'check:words:release':'node scripts/words/check.mjs release','check:words:receipt':'node scripts/words/check.mjs receipt','deliver:web':'node scripts/words/delivery.mjs web --','deliver:ios':'node scripts/words/delivery.mjs ios --'}}));spawnSync('git',['init','-q',dir]);spawnSync('git',['-C',dir,'add','.']);spawnSync('git',['-C',dir,'-c','user.name=Synthetic','-c','user.email=test@example.invalid','commit','-qm','Synthetic']);for(const platform of ['web','ios']){const r=spawnSync('npm',['run',`deliver:${platform}`,'--',process.execPath,'-e',`require('fs').writeFileSync(${JSON.stringify(marker)},'BAD')`],{cwd:dir,encoding:'utf8',env:{...process.env,LITTLE_ISLAND_WORD_RECEIPTS:'',LITTLE_ISLAND_WORD_WEB_ARTIFACT:web,LITTLE_ISLAND_WORD_IOS_ARTIFACT:ios,LITTLE_ISLAND_WORD_RELEASE_RECEIPT:join(scratch,`unreviewed-${platform}.private.json`)}});assert.notEqual(r.status,0);assert.match(r.stdout+r.stderr,/admission evidence/);assert.throws(()=>readFileSync(marker),/ENOENT/);}}finally{rmSync(dir,{recursive:true,force:true});}});
test('games must use the word registry and cannot replace its generated loaders',()=>{const {dir}=stagedBank();try{mkdirSync(join(dir,'src/games'),{recursive:true});writeFileSync(join(dir,'src/games/x.ts'),"import bank from '../../content/words/banks/test.json';");assert.throws(()=>checkShippingTree(dir),/must use the admitted registry/);rmSync(join(dir,'src/games/x.ts'));writeFileSync(join(dir,'content/words/registry.generated.ts'),'export const bankLoaders={};');assert.throws(()=>checkShippingTree(dir),/loader registry differs/);}finally{rmSync(dir,{recursive:true,force:true});}});
for(const field of ['cells','letters','shuffle'])test(`matching rejects irrelevant ${field}`,()=>{const d=input();d.surfaces[0][field]=field==='cells'?[['C','O','L','D']]:'COLD';assert.throws(()=>bakeBank(d),/Unexpected fields/);});
test('word-search rejects unscanned letters',()=>{const d=input();d.surfaces=[{id:'s',kind:'word-search',wordIds:['reef'],cells:[['R','E','E','F']],listed:[{wordId:'reef',answer:'REEF',cells:[[0,0],[0,1],[0,2],[0,3]]}],letters:'COLD'}];assert.throws(()=>bakeBank(d),/Unexpected fields/);});
for(const field of ['topic','cells'])test(`runtime rejects object-valued ${field}`,()=>{const {dir,name,asset}=stagedBank();try{if(field==='topic')asset.words[0].topic={core:['COLD']};else {asset.surfaces[0]={id:'search',kind:'word-search',wordIds:['reef'],cells:{scan:['COLD']},listed:[]};}const bytes=JSON.stringify(asset);writeFileSync(join(dir,name),bytes);const manifest=JSON.parse(readFileSync(join(dir,'content/words/banks.manifest.json')));manifest.banks[0].sha256=sha256(bytes);manifest.banks[0].bytes=Buffer.byteLength(bytes);writeFileSync(join(dir,'content/words/banks.manifest.json'),JSON.stringify(manifest));assert.throws(()=>checkShippingTree(dir),/Private/);}finally{rmSync(dir,{recursive:true,force:true});}});

test('split compressed CI secret is decoded as one bounded policy',async()=>{const {gzipSync}=await import('node:zlib');const encoded=gzipSync(Buffer.from(JSON.stringify(policy))).toString('base64');const dir=join(scratch,'split-secret-export');mkdirSync(dir);writeFileSync(join(dir,'app.js'),'hello');const r=spawnSync(process.execPath,[join(root,'scripts/words/check.mjs'),'export',dir],{cwd:root,encoding:'utf8',env:{...process.env,LITTLE_ISLAND_WORD_POLICY_LOCK:'',LITTLE_ISLAND_WORD_POLICY_JSON:'',LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64:encoded.slice(0,40),LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64_2:encoded.slice(40)}});assert.equal(r.status,0,r.stdout+r.stderr);assert.equal(JSON.parse(r.stdout).guard.policyDataChecked,true);});
for(const [name,value,rx] of [['array',{},/Invalid artifact term exceptions/],['path',[{path:'../app.js',terms:[]}],/exception path/],['review',[{path:'app.js',terms:[{term:'COLD',check:'literal',reason:'',evidence:''}]}],/Unreviewed artifact/]])test(`guard exception requires ${name}`,()=>{const dir=join(scratch,`invalid-exception-${name}`);mkdirSync(dir);writeFileSync(join(dir,'app.js'),'hello');assert.throws(()=>guardTree(dir,{...policy,artifactTermExceptions:value}),rx);});
test('frozen inherited pack cannot admit a changed record',()=>{const dir=join(scratch,'frozen-pack');mkdirSync(join(dir,'content/words'),{recursive:true});writeFileSync(join(dir,'content/words/legacy-word-rescue.ts'),"export const legacyWordRescue=[['COLD','Synthetic','Synthetic']];");assert.throws(()=>checkShippingTree(dir),/Unadmitted edit/);});
test('runtime wheel letters must be a string',()=>{const {dir,name,asset}=stagedBank();try{asset.surfaces=[{id:'wheel',kind:'wheel',wordIds:['reef'],letters:{scan:['COLD']}}];const bytes=JSON.stringify(asset);writeFileSync(join(dir,name),bytes);const manifest=JSON.parse(readFileSync(join(dir,'content/words/banks.manifest.json')));manifest.banks[0].sha256=sha256(bytes);manifest.banks[0].bytes=Buffer.byteLength(bytes);writeFileSync(join(dir,'content/words/banks.manifest.json'),JSON.stringify(manifest));assert.throws(()=>checkShippingTree(dir),/Private/);}finally{rmSync(dir,{recursive:true,force:true});}});

test('runtime listed entries reject private extras on a valid search surface',()=>{const {dir,name,asset}=stagedBank();try{asset.surfaces=[{id:'search',kind:'word-search',wordIds:['reef'],cells:[['R','E','E','F']],listed:[{wordId:'reef',answer:'REEF',cells:[[0,0],[0,1],[0,2],[0,3]],reviewNote:'PRIVATE'}]}];const bytes=JSON.stringify(asset);writeFileSync(join(dir,name),bytes);const manifest=JSON.parse(readFileSync(join(dir,'content/words/banks.manifest.json')));manifest.banks[0].sha256=sha256(bytes);manifest.banks[0].bytes=Buffer.byteLength(bytes);writeFileSync(join(dir,'content/words/banks.manifest.json'),JSON.stringify(manifest));assert.throws(()=>checkShippingTree(dir),/listed path/);}finally{rmSync(dir,{recursive:true,force:true});}});

test('artifact exceptions cannot exempt case-folded hashes or full lists',()=>{const dir=join(scratch,'folded-unconditional');mkdirSync(dir);const p={...policy,artifactTermExceptions:[{path:'app.js',terms:[{term:'COLD',check:'literal',reason:'Synthetic inherited text',evidence:'synthetic-context'}]}]};for(const text of [lock.scanListSha256.toUpperCase(),JSON.stringify(policy.core).toLowerCase()]){writeFileSync(join(dir,'app.js'),'globalThis.text='+JSON.stringify(text));assert.throws(()=>guardTree(dir,p),/leaked/);}});

// W-guard: placeholder terms only. These cases describe exported meanings,
// never the actual private lists or a content approval.
function exportCase(name, file, text, p=policy, rejected=false) {
 test(name,()=>{const dir=join(scratch,name.replaceAll(' ','-'));mkdirSync(dir);writeFileSync(join(dir,file),text);if(rejected)assert.throws(()=>guardTree(dir,p),/leaked/);else assert.equal(guardTree(dir,p).passed,true);});
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
exportCase('guard actual word grid','bank.json',JSON.stringify({cells:[['C','O','L','D']]}),policy,true);
exportCase('guard reversed word grid','bank.json',JSON.stringify({cells:[['D','L','O','C']]}),policy,true);
exportCase('guard vertical word grid','bank.json',JSON.stringify({cells:[['C'],['O'],['L'],['D']]}),policy,true);
exportCase('guard benign media encoding','picture.png',Buffer.from('noiseCOLDnoiseALPHANONSENSEnoiseBETANONSENSEnoiseGAMMANONSENSEnoise'));
exportCase('guard private blob despite exceptions','app.js','globalThis.leak='+JSON.stringify(JSON.stringify(policy.core).toLowerCase()),{...policy,artifactStringExceptions:[{path:'app.js',strings:[{sha256:sha256(JSON.stringify(policy.core).toLowerCase()),occurrences:1,terms:[{term:'COLD',check:'literal',reason:'Synthetic reviewed collision',evidence:'synthetic'}]}]}]},true);
for(const [name,source,fail] of [
 ['whole word','globalThis.label="COLD";',true],
 ['three broad words','globalThis.leak=["ALPHANONSENSE","BETANONSENSE","GAMMANONSENSE"];',true],
 ['separate storage boundaries','globalThis.words=["XCOL","D","ALPHANONSENSEB","BETANONSENSEB","GAMMANONSENSEB"];',false],
 ['UTF16 word','globalThis.label="COLD Å";',true],
 ['overflow word','globalThis.label='+JSON.stringify('Q'.repeat(300)+' COLD')+';',true],
 ['style substrings','globalThis.style={COLDColor:"blue",ALPHANONSENSEColor:1,BETANONSENSEColor:2,GAMMANONSENSEColor:3};',false],
]) test(`guard Hermes ${name}`,()=>{const dir=join(scratch,`hbc-${name.replaceAll(' ','-')}`);mkdirSync(dir);const input=join(scratch,'hbc-input.js');writeFileSync(input,source);const r=spawnSync(hermesc,['-emit-binary','-out',join(dir,'app.hbc'),input],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);if(fail)assert.throws(()=>guardTree(dir,policy),/leaked/);else assert.equal(guardTree(dir,policy).passed,true);});

// Synthetic codec uses the real row decoder, with isolated family bindings.
// Its symbol string stands for numeric cells, like cage IDs in numeric packs.
function packedCase(name,encoded,decoded,rejected=false) {
 test(name,()=>{
  const source=join(scratch,`pack-source-${name.replaceAll(' ','-')}`),dir=join(source,'dist');
  mkdirSync(join(source,'scripts/puzzles/families'),{recursive:true});mkdirSync(join(source,'src/puzzles'),{recursive:true});mkdirSync(join(source,'src/state'));mkdirSync(dir);
  symlinkSync(resolve('node_modules'),join(source,'node_modules'));
  for(const file of ['scripts/puzzles/register.mjs','scripts/puzzles/hooks.mjs','src/puzzles/descriptor.ts','src/puzzles/types.ts','src/state/saveBits.ts']) cpSync(resolve(file),join(source,file));
  writeFileSync(join(source,'scripts/puzzles/families/index.ts'),`export const families=[{id:'synthetic',adapter:{rules:1,decodePayload:x=>x===${JSON.stringify(encoded)}?${JSON.stringify(decoded)}:null,isPayload:x=>!!x}}];`);
  const header={format:1,family:'synthetic',slot:0,first:0,count:1,band:'a',rules:1,rng:1};
  writeFileSync(join(dir,'p0.lipuzzle'),JSON.stringify(header)+'\n'+JSON.stringify([1,'layout','template',encoded]));
  const original=process.cwd();try{process.chdir(source);if(rejected)assert.throws(()=>guardTree(dir,policy),/leaked/);else assert.equal(guardTree(dir,policy).passed,true);}finally{process.chdir(original);}
 });
}
packedCase('guard numeric encoded pack collision','COLD',{values:[2,14,11,3]});
packedCase('guard base64 numeric pack collision','XCOLDbXALPHANONSENSEBETANONSENSEGAMMANONSENSEZ==',{values:[1,2,3]});
packedCase('guard decoded packed word grid','numeric-code',{cells:[['C','O','L','D']]},true);
packedCase('guard decoded packed visible word','numeric-code',{clue:'COLD'},true);
exportCase('guard partial list comment','app.js','// ALPHANONSENSE BETANONSENSE GAMMANONSENSE\nglobalThis.label="safe";',policy,true);
exportCase('guard row string grid','bank.json',JSON.stringify({grid:['COLD']}),policy,true);
exportCase('guard word list is not a grid','bank.json',JSON.stringify({words:['XCOL','DXXX']}));
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
 assert.throws(()=>hermesStrings(bytes),/Invalid Hermes|Unsupported Hermes/);
});
function stringPolicy(texts) {
 return {...policy,artifactStringExceptions:[{path:'app.js',strings:texts.map(text=>({sha256:sha256(text),occurrences:1,terms:[...policy.scan.map(term=>({term,check:'broad',reason:'Synthetic inherited collision',evidence:'synthetic'})),{term:'COLD',check:'literal',reason:'Synthetic inherited collision',evidence:'synthetic'}]}))}]};
}
exportCase('guard exact reviewed string','app.js','globalThis.label="COLD safe";',stringPolicy(['COLD safe']));
exportCase('guard changed reviewed string rejected','app.js','globalThis.label="COLD new";',stringPolicy(['COLD safe']),true);
exportCase('guard additional reviewed occurrence rejected','app.js','globalThis.label="COLD safe";globalThis.another="COLD safe";',stringPolicy(['COLD safe']),true);
exportCase('guard legacy semantic term exception cannot hide word','app.js','globalThis.label="COLD new";',{...policy,artifactTermExceptions:[{path:'app.js',terms:[{term:'COLD',check:'literal',reason:'Synthetic inherited collision',evidence:'synthetic'}]}]},true);
exportCase('guard additional broad array despite reviewed words','app.js','globalThis.old=["ALPHANONSENSE","BETANONSENSE","GAMMANONSENSE"];globalThis.leak=["ALPHANONSENSE","BETANONSENSE","GAMMANONSENSE"];',stringPolicy(['ALPHANONSENSE','BETANONSENSE','GAMMANONSENSE']),true);
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
