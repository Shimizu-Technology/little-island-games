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
 for name,data in [('english-words.10','reef\\nreed\\ncolor\\ncharm\\ntrade wind\\n'),('british-words.10','colour\\n')]:
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
const {checkShippingTree}=await import(pathToFileURL(join(root,'scripts/words/shipping.mjs')));
const policy={scan:['COLD','ALPHANONSENSE','BETANONSENSE','GAMMANONSENSE'],core:['COLD'],exact:['COLD'],lemmas:['COLD'],chamoruSensitive:['SYNTHETICHEADWORD'],canaries:['PRIVATECANARYNONWORD']};
const policyFile=join(scratch,'policy.private.json'),lockFile=join(scratch,'policy-lock.private.json');
writeFileSync(policyFile,JSON.stringify(policy));
const lock={schemaVersion:1,policyFile,policySha256:sha256(readFileSync(policyFile)),scanListSha256:digest([...policy.scan].sort())};
writeFileSync(lockFile,JSON.stringify(lock));process.env.LITTLE_ISLAND_WORD_POLICY_LOCK=lockFile;
const word=(spelling='REEF')=>({schemaVersion:1,id:spelling.toLowerCase(),spelling,lemma:spelling,language:'en',sense:'Synthetic test meaning',readerLevel:'Little',knownBand:1,readBand:1,spellBand:1,clueBand:1,theme:'test',topic:'nature',guamFit:1,audio:null,source:sourceRecords[0],form:'lemma',properNoun:false,abbreviation:false,british:[],locale:'en-US',uses:['matching','word-search','crossword','scramble','builder','wheel','ladder']});
const canonicalTerms=JSON.parse(readFileSync(join(sources,'canonical-vocabulary.json'))).entries;
function seal(r){const {id,elapsedSeconds,...raw}=r;return {...raw,id:digest(raw),elapsedSeconds:60};}
function evidenceFor(records,words=records,kind='word'){
 const prepare=kind==='word'?review.prepareWordBatch:review.prepareBatch;
 const prepared=prepare(records,{id:'SYNTHETIC-ONLY',fixture:false,vocabularySha256:digest(words),scanListSha256:lock.scanListSha256,canonicalTerms});
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
fails('batch vocabulary digest bound',d=>{d.evidence.reef.prepared.batch.vocabularySha256='e'.repeat(64);},/vocabulary.*(binding|hash)/i);
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
const hermesc=resolve('node_modules/hermes-compiler/hermesc/osx-bin/hermesc');
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
const {privatePath}=await import(pathToFileURL(join(root,'scripts/words/paths.mjs')));
test('privatePath resolves symlink ancestors',()=>{const link=join(scratch,'repo-link');symlinkSync(root,link);assert.throws(()=>privatePath(join(link,'new-output')),/outside/);});
test('privatePath denies differently-cased repository ancestor',()=>{const alternate=root.replace('/repo','/REPO');try{if(readFileSync(join(alternate,'scripts/words/bake.mjs')))assert.throws(()=>privatePath(join(alternate,'new-output')),/outside/);}catch(e){if(e.code!=='ENOENT')throw e;}});
function stagedBank(){const dir=join(scratch,'registered'),data=input(),{asset}=bakeBank(data),name='content/words/banks/test.json',bytes=JSON.stringify(asset);mkdirSync(join(dir,'content/words/banks'),{recursive:true});writeFileSync(join(dir,name),bytes);writeFileSync(join(dir,'content/words/banks.manifest.json'),JSON.stringify({schemaVersion:1,banks:[{path:name,sha256:sha256(bytes),bytes:Buffer.byteLength(bytes),words:asset.words.length,clues:asset.clues.length,surfaces:asset.surfaces.length}]}));return {dir,data,name,asset};}
test('CI admission needs only committed manifest and shape, local gate rebakes',()=>{const {dir,data}=stagedBank();try{assert.equal(checkShippingTree(dir).banks,1);const ev=join(scratch,'admission-evidence');mkdirSync(ev);writeFileSync(join(ev,'test.json'),JSON.stringify(data));assert.equal(checkShippingTree(dir,ev,{full:true}).banks,1);}finally{rmSync(dir,{recursive:true,force:true});}});
test('full rebake compares admitted asset',()=>{const {dir,data}=stagedBank();try{const ev=join(scratch,'bad-admission-evidence');mkdirSync(ev);data.surfaces[0].id='different';writeFileSync(join(ev,'test.json'),JSON.stringify(data));assert.throws(()=>checkShippingTree(dir,ev,{full:true}),/differs from reviewed/);}finally{rmSync(dir,{recursive:true,force:true});}});
for(const field of ['policy','rawRecord','listed'])test(`runtime shape rejects injected ${field}`,()=>{const {dir,name,asset}=stagedBank();try{if(field==='policy')asset.policy=policy;else if(field==='rawRecord')asset.words[0].source=sourceRecords[0];else asset.surfaces[0].listed=[{wordId:'reef',answer:'REEF',cells:[[0,0]],reviewNote:'PRIVATE'}];const bytes=JSON.stringify(asset);writeFileSync(join(dir,name),bytes);const m=JSON.parse(readFileSync(join(dir,'content/words/banks.manifest.json')));m.banks[0].sha256=sha256(bytes);m.banks[0].bytes=Buffer.byteLength(bytes);writeFileSync(join(dir,'content/words/banks.manifest.json'),JSON.stringify(m));assert.throws(()=>checkShippingTree(dir),/shape|Private/);}finally{rmSync(dir,{recursive:true,force:true});}});
test('manifest hash is verified',()=>{const {dir,name}=stagedBank();try{writeFileSync(join(dir,name),readFileSync(join(dir,name),'utf8')+' ');assert.throws(()=>checkShippingTree(dir),/manifest hash/);}finally{rmSync(dir,{recursive:true,force:true});}});
test('batch references bake without duplicating batch evidence',()=>{const d=input();d.reviewBatches={batch:d.evidence.reef};d.evidence.reef='batch';assert.equal(bakeBank(d).asset.words.length,1);});
const {isPrivateWordFile}=await import(pathToFileURL(resolve(process.env.WORD_TEST_EXPORT_FILE??'scripts/export-public.mjs')));
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
const {checkExport,checkRelease,verifyReleaseReceipt}=await import(pathToFileURL(join(root,'scripts/words/check.mjs')));
test('real-export gate checks bytes and requires policy once a bank exists',()=>{const dir=join(scratch,'real-export');mkdirSync(dir);writeFileSync(join(dir,'app.js'),'PRIVATECANARYNONWORD');assert.throws(()=>checkExport(root,dir),/leaked/);const staged=stagedBank();delete process.env.LITTLE_ISLAND_WORD_POLICY_LOCK;try{assert.throws(()=>checkExport(staged.dir,dir),/policy lock/);}finally{process.env.LITTLE_ISLAND_WORD_POLICY_LOCK=lockFile;rmSync(staged.dir,{recursive:true,force:true});}});
test('release gate requires Hermes and checks current receipt artifacts',()=>{const web=join(scratch,'release-web'),ios=join(scratch,'release-ios');mkdirSync(web);mkdirSync(ios);writeFileSync(join(web,'index.html'),'hello');writeFileSync(join(ios,'main.js'),'hello');assert.throws(()=>checkRelease(root,web,ios,join(scratch,'bad-receipt')),/Hermes/);const r=spawnSync(hermesc,['-emit-binary','-out',join(ios,'main.hbc'),join(ios,'main.js')],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const receipt=join(scratch,'release-receipt.private.json');const git=spawnSync('git',['init','-q',root]);assert.equal(git.status,0);spawnSync('git',['-C',root,'-c','user.name=Synthetic','-c','user.email=test@example.invalid','commit','--allow-empty','-qm','Synthetic gate fixture']);assert.equal(checkRelease(root,web,ios,receipt).ios.passed,true);assert.equal(verifyReleaseReceipt(root,receipt,web,ios).passed,true);writeFileSync(join(web,'index.html'),'changed');assert.throws(()=>verifyReleaseReceipt(root,receipt,web,ios),/receipt/);});
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
const {scanGrid,scanLetterWheel}=await import(pathToFileURL(join(root,'scripts/words/scan.mjs')));
test('invalid grid shape',()=>assert.throws(()=>scanGrid([['RR']],['COLD']),/Invalid grid cells/));
test('invalid private scan term',()=>assert.throws(()=>scanGrid([['A','B']],['AB']),/private scan entry/));
for(const [name,cells,rx] of [['path shape',[[0,0,1]],/Invalid listed path/],['repeated',[[0,0],[0,0]],/Repeated listed cell/],['out of bounds',[[9,0]],/outside grid/],['nonadjacent',[[0,0],[0,2]],/must be straight/],['bent',[[0,0],[0,1],[1,1]],/must be straight/],['spelling',[[0,0],[0,1]],/spelling mismatch/]])test(`listed validation ${name}`,()=>assert.throws(()=>scanGrid([['C','O','L','D'],['A','B','C','D']],['COLD'],[{wordId:'cold',answer:'COLD',cells}]),rx));
test('invalid wheel letters',()=>assert.throws(()=>scanLetterWheel('12!',policy.core),/Invalid wheel letters/));
for(const [name,spelling,language,rx] of [['empty','', 'en',/Missing spelling/],['English glyph','Å','en',/English spelling/],['unknown language','A','other',/Unknown language/],['CHamoru alphabet','V','ch',/Invalid CHamoru/]])test(`cells ${name}`,()=>assert.throws(()=>core.cellsFor(spelling,language),rx));
function draft(){return {schemaVersion:1,id:'clue',wordId:'reef',answer:'REEF',meaning:'Synthetic',tier:'Little',text:'Synthetic one.',candidates:['Synthetic one.','Synthetic two.','Synthetic three.'],provenance:{model:'SYNTHETIC',date:'2026-11-08T00:00:00Z',promptVersion:'SYNTHETIC',promptSha256:'a'.repeat(64),webUsed:false,inputs:'answer,meaning,tier,tone'}};}
for(const [name,mutate,rx] of [['identity',c=>c.id='',/Invalid clue/],['candidates',c=>c.candidates.pop(),/three distinct/],['provenance',c=>c.provenance.model='',/drafting provenance/],['clean room',c=>c.provenance.webUsed=true,/Clean-room/]])test(`clue ${name}`,()=>{const c=draft();mutate(c);assert.throws(()=>core.validateClue(c),rx);});
test('legacy heuristic exceptions bind exact bytes and cannot exempt canaries or full lists',()=>{const dir=join(scratch,'legacy');mkdirSync(dir);const file=join(dir,'app.js'),old='old public text COLD';writeFileSync(file,old);const p={...policy,legacyArtifactSha256:[sha256(Buffer.from(old))]};assert.equal(guardTree(dir,p).passed,true);writeFileSync(file,old+' changed');assert.throws(()=>guardTree(dir,p),/leaked/);const canary=policy.canaries[0];writeFileSync(file,canary);assert.throws(()=>guardTree(dir,{...p,legacyArtifactSha256:[sha256(Buffer.from(canary))]}),/leaked/);const list=JSON.stringify(policy.scan);writeFileSync(file,list);assert.throws(()=>guardTree(dir,{...p,legacyArtifactSha256:[sha256(Buffer.from(list))]}),/leaked/);});
test('private directory names rejected',()=>{const dir=join(scratch,'private-names');mkdirSync(join(dir,'private'),{recursive:true});writeFileSync(join(dir,'private','safe.txt'),'hello');assert.throws(()=>guardTree(dir,policy),/leaked/);});
test('release tree hashes reject symlinks',async()=>{const {treeHash}=await import(pathToFileURL(join(root,'scripts/words/check.mjs')));const dir=join(scratch,'release-tree-link');mkdirSync(dir);symlinkSync(policyFile,join(dir,'link'));assert.throws(()=>treeHash(dir),/Symlink/);assert.throws(()=>checkRelease(root,dir,dir,join(scratch,'unused-receipt')),/Symlink/);});
test('private output refuses a dangling symlink into the repo',()=>{const link=join(scratch,'dangling');symlinkSync(join(root,'not-yet-created'),link);assert.throws(()=>privatePath(join(link,'new-output')),/dangling symlink/);});
for(const name of ['calibration.draft.tsv','sources.lock.json'])test(`guard tooling filename ${name}`,()=>{const dir=join(scratch,'tooling-names');mkdirSync(dir);writeFileSync(join(dir,name),'{}');assert.throws(()=>guardTree(dir,policy),/leaked/);rmSync(dir,{recursive:true});});
test('shared family evidence objects still bind each distinct batch',()=>{const d=input(),c={...draft(),meaning:d.words[0].sense};d.clues=[c];const clueEvidence=evidenceFor([c],d.words,'clue');clueEvidence.familySample=d.evidence.reef.familySample;d.evidence[c.id]=clueEvidence;assert.throws(()=>bakeBank(d),/Actual family sample/);});
test('two-word batch is stored once and fully bakes',()=>{const d=input([word(),word('REED')]);const originalBytes=Buffer.byteLength(JSON.stringify(d));d.reviewBatches={batch:d.evidence.reef};d.evidence={reef:'batch',reed:'batch'};assert.ok(Buffer.byteLength(JSON.stringify(d))<originalBytes);assert.equal(bakeBank(d).asset.words.length,2);});
test('package and CI run guard on the actual export',()=>{const packageFile=process.env.WORD_TEST_PACKAGE_FILE??resolve('package.json'),ciFile=process.env.WORD_TEST_CI_FILE??resolve('.github/workflows/ci.yml');const p=JSON.parse(readFileSync(packageFile));assert.match(p.scripts.check,/npm run check:words:export/);assert.match(p.scripts['check:words:export'],/words\/check.mjs export/);assert.match(readFileSync(ciFile,'utf8'),/run: npm run check:words:export/);});
test('compressed CI policy is decoded, locked, used and bounded',async()=>{const {gzipSync}=await import('node:zlib');const dir=join(scratch,'ci-export');mkdirSync(dir);writeFileSync(join(dir,'app.js'),'hello');const env={...process.env,LITTLE_ISLAND_WORD_POLICY_LOCK:'',LITTLE_ISLAND_WORD_POLICY_JSON:'',LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64:gzipSync(Buffer.from(JSON.stringify(policy))).toString('base64')};const command=join(root,'scripts/words/check.mjs');const ok=spawnSync(process.execPath,[command,'export',dir],{cwd:root,env,encoding:'utf8'});assert.equal(ok.status,0,ok.stdout+ok.stderr);assert.equal(JSON.parse(ok.stdout).guard.policyDataChecked,true);const bad=spawnSync(process.execPath,[command,'export',dir],{cwd:root,env:{...env,LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64:'not-a-gzip'},encoding:'utf8'});assert.equal(bad.status,1);const huge=gzipSync(Buffer.from(JSON.stringify({...policy,padding:'X'.repeat(5*1024*1024)}))).toString('base64');const capped=spawnSync(process.execPath,[command,'export',dir],{cwd:root,env:{...env,LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64:huge},encoding:'utf8'});assert.equal(capped.status,1);});
test('guard counts overlapping distinct raw broad terms',()=>{const dir=join(scratch,'overlap');mkdirSync(dir);writeFileSync(join(dir,'app.bin'),'ALPHANONSENSEBC');assert.throws(()=>guardTree(dir,{...policy,scan:['ALPHANONSENSE','ALPHANONSENSEB','ALPHANONSENSEBC']}),/leaked/);});
