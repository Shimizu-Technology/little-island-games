#!/usr/bin/env node
// Every mutant starts from passing synthetic bakes. Trace false predicates once,
// then run their exact negative cases; unrelated later gates cannot hide removal.
import ts from 'typescript';
import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const files=['bake','review','policy','shipping','guard','artifact-views','library-source','paths','core','scan','check','density','ci'];
const mutations=[],sources=new Map(),patches=new Map();
for(const file of files){const path=file==='ci'?'.github/workflows/ci.yml':`scripts/words/${file}.mjs`,source=readFileSync(path,'utf8'),tree=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true);sources.set(file,source);patches.set(file,[]);
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
const clauseTests={
 "row.reviewerB.verdict === 'keep'":'clause reviewer B must keep',
 "familySample.decision === 'keep'":'clause family decision must keep',
 'lead.reconciliationSha256 === digest(reconciled)':'clause lead reconciliation hash',
 'lead.fixture === false':'clause lead fixture must be false',
 'a.runId !== b.runId':'clause distinct run IDs',
 'a.transcriptSha256 !== b.transcriptSha256':'clause distinct transcript hashes',
 "v.verdict === 'keep'":'clause variant verdict',
 "v.relation === 'spelling-variant'":'clause variant relation',
 's.ship === true':'clause source ship permission',
 "word.language === 'en'":'clause clue {"language":"ch"}',
 'clue.answer === word.spelling':'clause clue {"answer":"REED"}',
 "slots.every(text => answers.some(w => w.spelling.replaceAll(' ','') === text))":'clause crossword unreviewed runs beside a reviewed run',
 'lock.policySha256 === sha256(bytes)':'clause lock policySha256 without supplied policy',
 'lock.scanListSha256 === digest([...policy.scan].sort())':'clause lock scanListSha256 without supplied policy',
 'entry.sha256===sha256(bytes)':'clause manifest same-length edit hash',
};
for(const [file,clauses] of Object.entries(clauseSpecs)) for(const clause of clauses) {
 const source=sources.get(file);if(!source.includes(clause))throw new Error('Missing mutation target: '+clause);
 const test=clauseTests[clause]??(file==='check'?'clause release receipt '+({"r.source===execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()":'source','r.policySha256===lock.policySha256':'policySha256','r.scanListSha256===lock.scanListSha256':'scanListSha256','r.admission?.full===true':'admission.full','r.admission.passed===true':'admission.passed','r.web?.passed===true':'web.passed','r.ios?.passed===true':'ios.passed','r.ios.sha256===treeHash(ios)':'ios.sha256'}[clause]):undefined);
 if(!test)throw new Error('Missing clause regression');
 custom(file,'R2 clause '+clause,source.replace(clause,'true'),[test]);
}
custom('core','R2 sensitive headword rejection',sources.get('core').replace('if (sensitive.has(foldScan(word.spelling)) || sensitive.has(foldScan(word.lemma))) return false;','if (false) return false;'),['clause CHamoru sensitive spelling and lemma rejection']);
custom('bake','asset listed raw object',sources.get('bake').replace('listed:listed.map(({wordId,answer,cells})=>({wordId,answer,cells}))','listed'),['listed projection strips private fields']);
custom('bake','asset raw word object',sources.get('bake').replace('words.map(w => ({ id:w.id,','words.map(w => ({ ...w, id:w.id,'),['successful synthetic bake has exact safe asset projection']);
custom('bake','asset whole policy',sources.get('bake').replace('const asset = { schemaVersion:1,','const asset = { policy, schemaVersion:1,'),['successful synthetic bake has exact safe asset projection']);
custom('paths','symlink ancestor canonicalization',sources.get('paths').replace('realpathSync.native(parent)','parent'),['privatePath resolves symlink ancestors']);
custom('guard','partial-list detector',sources.get('guard').replaceAll('new Set(hit.broad).size>=3','false'),['guard partial-array','guard newlines','guard three broad JS words','guard packed metadata partial list']);
custom('guard','individual blocked-literal detector',sources.get('guard').replace('if(literalHits.size)','if(false)'),['guard core','guard blocked visible string']);
custom('guard','private filename detector',sources.get('guard').replaceAll('bannedNames.test(name)','false'),['guard filename receipt.private.json']);
custom('guard','canary detector',sources.get('guard').replace('if(uppers.some(upper=>upper.includes(word.toUpperCase())))','if(false)').replace("if((policy.canaries??[]).some(word=>raw.uppers.some(upper=>upper.includes(word.toUpperCase()))))",'if(false)'),['guard canary']);
custom('guard','word-search grid detector',sources.get('guard').replace('if(grids.some(', 'if(false && grids.some('),['guard actual word grid','guard decoded packed word grid']);
custom('guard','private hash detector',sources.get('guard').replaceAll('[...hashes].some(h=>upper.includes(h.toUpperCase()))','false'),['guard scan-hash']);
custom('guard','private blob detector',sources.get('guard').replaceAll('blobs.some(b=>upper.includes(b.toUpperCase()))','false'),['guard private blob despite exceptions']);
custom('guard','reviewed string occurrence cap',sources.get('guard').replace('occurrence<=item.occurrences','true'),['guard additional reviewed occurrence rejected','guard additional broad array despite reviewed words']);
custom('guard','reviewed string identity',sources.get('guard').replace('scoped.get(hit.sha256)??[]','[...scoped.values()].flat()'),['guard changed reviewed string rejected']);
custom('artifact-views','Hermes string content detector',sources.get('artifact-views').replace('  return strings;','  return [];'),['guard Hermes whole word','guard Hermes three broad words']);
custom('artifact-views','serialized worklet string extraction',sources.get('artifact-views').replace('const parsed=javascriptStrings(source),nested=workletStrings(parsed.strings,depth+1);','const parsed={strings:[],keys:[],units:[],grids:[],sensitiveStrings:[],sensitiveGrids:[]},nested=workletStrings(parsed.strings,depth+1);'),['guard serialized worklet user string']);
custom('artifact-views','regex fragment leak view',sources.get('artifact-views').replace('    if (ts.isRegularExpressionLiteral(node)) keys.push(node.text);',''),['guard regex partial list','guard HTML regex partial list']);
custom('guard','CHamoru tagged literal detector',sources.get('guard').replace('if(sensitiveStrings.some(text=>sensitive(sensitiveText(text)).size))','if(false)'),['guard CHamoru tagged label','guard CHamoru tagged speech','guard CHamoru matching label']);
custom('guard','CHamoru source detector',sources.get('guard').replace('if(view.strings.some(text=>sensitive(sensitiveText(text)).size) || view.grids.some(grid=>scanGrid(grid,(policy.chamoruSensitive??[]).map(foldScan)).length))','if(false)'),['guard CHamoru canonical term','guard CHamoru tagged source','guard CHamoru tagged speech source']);
custom('guard','CHamoru grid detector',sources.get('guard').replace('sensitiveGrids.some(grid=>scanGrid(grid,(policy.chamoruSensitive??[]).map(foldScan)).length)','false'),['guard CHamoru grid keeps sensitive term']);
custom('artifact-views','array leak unit extraction',sources.get('artifact-views').replace('addUnit(plainEntries(values),node)','addUnit([],node)'),['guard three broad JS words']);
custom('guard','decoded row leak unit extraction',sources.get('guard').replace('units=(decodedPack.rows??[]).map(row=>puzzleStrings(row).filter(shortWords));','units=[];'),['guard packed metadata partial list']);
custom('guard','private advisory writer',sources.get('guard').replace('if(advisories.length) {','if(false) {'),['guard advisory is private and does not fail build']);
custom('artifact-views','separator list classification',sources.get('artifact-views').replace('if(words.length<3)return false;','return false;'),['guard comma list fragment','guard pipe list fragment','guard newline list fragment','guard tab list fragment']);
custom('artifact-views','object list unit extraction',sources.get('artifact-views').replace('addUnit(node.properties.map(p=>p.name.text),node)','addUnit([],node)'),['guard broad unquoted keys']);
custom('artifact-views','prose advisory boundary',sources.get('artifact-views').replace('/tokens.length>=0.25','/tokens.length>=0.3'),['R3 prose quarter positive']);
custom('artifact-views','prose ratio threshold',sources.get('artifact-views').replace('/tokens.length>=0.25','/tokens.length>=0.2'),['R3 prose ratio negative']);
custom('artifact-views','prose minimum sample',sources.get('artifact-views').replace('tokens.length>=12','true'),['R3 prose minimum negative']);
custom('artifact-views','private function word disjointness',sources.get('artifact-views').replace('!forbidden.has(w)','true'),['R3 grammar excludes policy vocabulary']);
custom('artifact-views','Library every-token trace',sources.get('artifact-views').replace('tokens.every(token=>allowed.has(token))','true'),['R3 body trace every token classification']);
custom('artifact-views','Library item attachment',sources.get('artifact-views').replace("if(!unit.library?.scope || !['terms','sounds'].includes(unit.library.field))return false;",''),['R3 trace requires catalog attachment']);
custom('artifact-views','Library item identity',sources.get('artifact-views').replace('library.find(row=>row.id===id)','library[0]'),['R3 trace requires exact item']);
custom('library-source','Library tokenizer parity',sources.get('library-source').replace('source.some(s=>libraryNormalize(s)!==normalize(s))','false'),['guard Library tokenizer drift fails closed']);
custom('check','compressed policy expansion bound',sources.get('check').replace('{maxOutputLength:4*1024*1024}','{}'),['compressed CI policy is decoded, locked, used and bounded']);
// R3 protection-weakening edges, each tied to synthetic counterexamples.
const edges=[
 ['artifact-views','blank language array entry','entry.trim().length>0','true',['R3 blank language array entry fails closed']],
 ['artifact-views','empty language array is not a declaration','value.length>0 && value.every','value.every',['R3 empty language array fails closed']],
 ['artifact-views','blank language is not a declaration','value.trim().length>0','true',['R3 blank language fails closed']],
 ['artifact-views','trimmed CHamoru language tag','/i.test(value.trim())','/i.test(value)',['R3 spaced CHamoru language tag']],
 ['guard','valid replacement character remains text',"!/[\\x00-\\x08\\x0e-\\x1f]/.test(views[1])","!/[\\x00-\\x08\\x0e-\\x1f\\ufffd]/.test(views[1])",['R3 valid UTF8 replacement remains text']],
 ['guard','invalid UTF8 is binary','isUtf8(bytes)','true',['R3 invalid UTF8 binary remains binary']],
 ['guard','only complete vectors get XML views','const vector=isSvgDocument;',"const vector=text=>/^\\s*<svg\\b/i.test(text);",['R3 SVG construction prefix']],
 ['guard','CHamoru accent normalization',".normalize('NFD').replace(/\\p{M}/gu,'')",'',['R3 accented CHamoru sensitive surface']],
 ['guard','CHamoru glottal normalization',".replace(/['ʼ’]/g,'')",'',['R3 glottal CHamoru sensitive surface']],
 ['artifact-views','SVG attribute leak unit','parsed.keys.push(match[1]);','',['R3 SVG metadata list leak']],
 ['artifact-views','SVG comment leak unit',"for(const match of text.matchAll(/<!--([\\s\\S]*?)-->/g))parsed.keys.push(match[1]);",'',['R3 SVG comment list leak']],
 ['guard','SVG displayed labels','displayStrings.push(...parsed.strings);','',['R3 SVG visible core label']],
 ['guard','decoded SVG unconditional leak view','...originalStrings.map(text=>text.toUpperCase()),','',['R3 SVG decoded canary retained']],
 ['artifact-views','SVG language declaration','if(chamoru(language))parsed.sensitiveStrings.push(...parsed.strings);','',['R3 SVG CHamoru visible label']],
 ['guard','structured text file list unit','strings=lines.length>1?[views[1],...lines]:lines;','strings=lines;',['R3 standalone TSV list']],
 ['artifact-views','authored metadata keeps strict residual','return unit.filter(text=>{const entry=[text];entry.library=unit.library;return !tracedLibraryUnit(entry,library);});','return [];',['R3 authored aliases cannot contribute traced search tokens']],
 ['artifact-views','complete provenance required before body residual',"if(!unit.every(text=>libraryNormalize(text).split(' ').filter(Boolean).every(token=>all.has(token))))return unit;",'',['guard Library planted untraceable token']],
 ['library-source','only body supplies token provenance','strings(item,true,!authored.some(row=>row.id===id)).flatMap','source.flatMap',['R3 authored aliases cannot contribute traced search tokens']],
 ['check','native JavaScript receipt result','r.iosJavaScript?.passed===true','true',['clause release receipt iosJavaScript.passed']],
 ['check','native JavaScript receipt hash','/^[a-f0-9]{64}$/.test(r.iosJavaScript.sha256)','true',['R3 receipt native JavaScript digest format']],
 ['artifact-views','nearest JS item identity','ts.isObjectLiteralExpression(p) && !record','ts.isObjectLiteralExpression(p)',['R3 JS nearest identity structure']],
 ['artifact-views','nonletter grid blanks','[^\\p{L}]','[^\\p{L}\\p{N}]',['R3 digit blank cell']],
 ['core','modifier glottal folding',"/['ʼ’\\s-]/g","/['’\\s-]/g",['R3 modifier glottal scan folding']],
 ['guard','teaching allowance may filter only its own term','teachingFold(entry.term)!==teachingFold(term)','false',['R3 teaching extra policy term cannot widen fields']],
 ['artifact-views','parameter language binding',"if(ts.isParameter(n)&&ts.isIdentifier(n.name))declarations.set(n.name.text,null);",'',['R3 parameter language cannot borrow constant']],
 ['artifact-views','HTML grid propagation','grids.push(...parsed.grids,...worklets.grids);','',['R3 HTML embedded grid']],
 ['artifact-views','worklet grid propagation','grids.push(...parsed.grids,...nested.grids);','',['R3 serialized worklet grid']],
 ['guard','teaching source path',"name==='src/learn/content/chamoru.ts' && allowances.find",'allowances.find',['R3 teaching source path binding']],
 ['guard','teaching entry identity','rule.entryId===entry.id','true',['R3 teaching changed identity']],
 ['guard','teaching term identity','rule.terms.includes(entry.term)','true',['R3 teaching changed term']],
 ['guard','teaching source grid hard failure','entry.grids.some(grid=>scanGrid(grid,(policy.chamoruSensitive??[]).map(foldScan)).length)','false',['R3 teaching source isolated grid']],
 ['guard','teaching source generated type',"!Object.keys(entry.fields).some(key=>['kind','cells','grid','board','rows','words','spelling'].includes(key))",'true',['R3 teaching source generated kind']],
 ['artifact-views','teaching exact exported fields','JSON.stringify(Object.entries(entry.fields).sort())===JSON.stringify(Object.entries(value).sort())','true',['R3 teaching new field']],
 ['artifact-views','singleton language presence','grid.languagePresent=languagePresent;','grid.languagePresent=false;',['R3 singleton unresolved language dynamic','R3 singleton unresolved language numeric']],
 ['guard','singleton puzzle boundary','!grid.puzzle','true',['R3 singleton puzzle still declares js']],
 ['artifact-views','singleton long-cell declaration'," || rows.length===1 && rows[0]?.length===1 && /^[\\p{L}ʼ’']+$/u.test(c)",'', ['R3 singleton matrix long cell js']],
 ['artifact-views','puzzle row classification','validLanguage(language)||puzzle','validLanguage(language)',['R3 unknown JS puzzle row container']],
 ['artifact-views','singleton exemption height','value.length===1 && Array.isArray(value[0])','value.length>=1 && Array.isArray(value[0])',['R3 singleton matrix vertical js']],
 ['artifact-views','singleton exemption width',"value[0].length===1 && typeof value[0][0]==='string' && /^\\p{L}$/u.test(value[0][0])","value[0].length>=1",['R3 singleton matrix digraph js','R3 singleton matrix horizontal json']],
 ['guard','untagged grid conservative sensitivity','sensitiveGrids.push(...grids.filter(grid=>!grid.languageDeclared));','',['R3 untagged recognised sensitive grid']],
 ['ci','versioned secret mapping','secrets.LITTLE_ISLAND_WORD_POLICY_V2_GZIP_BASE64','secrets.LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64',['R3 CI versioned secret mapping']],
 ['artifact-views','odd entries','return values.flatMap(value=>{','if(!values.every(shortWords))return [];return values.flatMap(value=>{',['R3 odd empty js','R3 odd weights json','R3 odd records js']],
 ['artifact-views','language recognizer',"/^(?:ch(?:-|$)|cha$|chamoru$|chamorro$)/i.test(value.trim())",'false',['R3 source constant','R3 source spread']],
 ['artifact-views','language characters',"/[åʼ]/iu.test(text.normalize('NFC'))",'false',['R3 characters 72 229']],
 ['guard','unknown extension fallback',"if(isUtf8(bytes) && !/[\\x00-\\x08\\x0e-\\x1f]/.test(views[1]))",'if(false)',['R3 text extension md']],
 ['guard','technical list view'," || /^[A-Z0-9]+(?:_[A-Z0-9]+)+$/.test(text)",'',['R3 list snake']],
 ['guard','literal string scope','literal:contentStrings.has(text)','literal:false',['guard blocked visible string']],
 ['guard','source scan roots',"['src','content','scripts/learn']","['src']",['R3 source content root','R3 source speech root']],
 ['guard','source file selection',"const text=readFileSync(path,'utf8');","const text=readFileSync(path,'utf8');if(!name.endsWith('chamoru.ts'))continue;",['R3 source shorthand']],
 ['guard','authored arrays','[...item.source,...item.sourceUnits]','item.source',['R3 Library authored tags','R3 Library authored aliases']],
 ['artifact-views','authored field trace'," || !['terms','sounds'].includes(unit.library.field)",'',['R3 authored field trace classification']],
 ['artifact-views','nearest JSON id',"const ids=typeof value.id==='string'?[value.id]:context.ids;","const ids=typeof value.id==='string'?[...context.ids,value.id]:context.ids;",['R3 JSON nearest identity structure']],
 ['artifact-views','catalog shape',"['items','index','preview','bytes','fixtures'].every(key=>key in value)","'index' in value",['R3 catalog shape classification']],
 ['artifact-views','sounds token scope',"unit.library.field==='sounds'?source.sounds:source.tokens",'source.tokens',['R3 sounds trace classification']],
 ['artifact-views','JS grid path','grids.push(grid);','',['R3 grid vertical js']],
 ['artifact-views','grid case folding','/iu.test(c)', '/u.test(c)', ['R3 grid lower json']],
 ['artifact-views','sentence order','switches>=5','true',['R3 prose clustered grammar']],
 ['artifact-views','broad prose ratio','hits/Math.max(1,content.length)<0.2','true',['R3 prose padding affix']],
 ['check','native JavaScript scan','...guardTree(temporary,policy,[lock],{sourceRoot:root})','passed:true',['R3 Hermes native array probe','R3 Hermes native object probe']],
];
for(const [file,label,before,after,tests] of edges){const original=sources.get(file);if(!original.includes(before))throw new Error('Missing R3 mutation target '+label);custom(file,'R3 '+label,original.replace(before,after),tests);}
const r4Edges=[
 ['density','normalization NFKC',".normalize('NFKC')",'', ['R4 normalised core fullwidth']],
 ['density','normalization invisibles',".replace(/\\p{Default_Ignorable_Code_Point}/gu,'')",'', ['R4 normalised core soft hyphen','R4 normalised core zero width']],
 ['density','normalization diacritics',".normalize('NFD').replace(/\\p{M}/gu,'')",'', ['R4 normalised core decomposed']],
 ['density','threshold','densityThreshold = 25','densityThreshold = 26',['R4 density threshold 25']],
 ['density','window eviction','counts.delete(word)','counts.set(word,1)',['R4 density sliding boundary']],
 ['guard','density gate','if(scanned.densityMaximum>=densityThreshold)','if(false)',['R4 density threshold 25']],
 ['guard','JSON teaching source','teachingJSON(JSON.parse(text))',"{strings:[],grids:[]}",['R4 teaching JSON source']],
 ['artifact-views','tuple flatten','if(Array.isArray(value))return plainEntries(value);','',['R4 fragment 5 tuples']],
 ['artifact-views','filename normalization',"if(/^\\p{L}+$/u.test(word))return [word];",'',['R4 fragment 5 filenames']],
 ['artifact-views','JSON strings',"if(decoded && typeof decoded==='object')return jsonUnits(decoded).some(unit=>unit.length>=3);",'',['R4 fragment 5 encodedObject']],
 ['artifact-views','string prose share','policyShare(words,excluded)<0.5','true',['R4 fragment 5 article']],
 ['artifact-views','tagged keys','...(tagged(value)||active||chamoruCharacters(key)?[key]:[])','',['R4 tagged keys']],
 ['check','Hermes receipt binding','r.iosJavaScript?.hermesStringsMatched===true','true',['R4 receipt requires Hermes binding']],
];
r4Edges.push(
 ['artifact-views','record columns','for(const unit of recordUnits(values))addUnit(unit,node);','',['R4 fragment 5 records']],
 ['artifact-views','record maps','if(ts.isObjectLiteralExpression(node))for(const unit of objectUnits(staticData(node)))addUnit(unit,node);','',['R4 fragment 5 keymap','R4 fragment 5 valuemap']],
 ['artifact-views','switch labels','if(ts.isCaseBlock(node))addUnit(node.clauses.filter(ts.isCaseClause).map(c=>staticData(c.expression)).filter(shortWords),node);','',['R4 fragment 5 switch']],
 ['artifact-views','comparison labels','comparisons(node);addUnit(labels,node);','comparisons(node);',['R4 fragment 5 equality']],
 ['artifact-views','enum labels','if(names.length)addUnit(names,node);','',['R4 fragment 5 enum']],
 ['artifact-views','template segments',"if(ts.isTemplateExpression(node))addUnit([[node.head.text,...node.templateSpans.map(span=>span.literal.text)].join(' ')],node);",'',['R4 fragment 5 template']],
 ['artifact-views','normalized short list',"if(typeof text==='string')text=text.normalize('NFKC').replace(/\\p{Default_Ignorable_Code_Point}/gu,'');",'',['R4 normalised broad list']],
 ['artifact-views','prose token splitting',"wordTokens(text.replace(/['’]s\\b/gi,'')).map(w=>w.toLowerCase())","text.toLowerCase().split(/\\s+/)",['R4 prose padding hyphens','R4 prose padding possessives']],
 ['artifact-views','curly marker rule'," || /\\p{L}’(?!(?:s|t|re|ll|ve|d|m)\\b)\\p{L}|(?!s)\\p{L}’(?!\\p{L})/iu.test(text.normalize('NFC'))",'', ['R4 narrow apostrophe middle','R4 narrow apostrophe final']],
 ['artifact-views','marker canonical composition',"text.normalize('NFC')",'text',['R4 decomposed marker']],
 ['artifact-views','flat tiles',"x.length>=3 && x.every(c=>typeof c==='string' && /^(?:CH|NG|[A-ZÅÑ])$/iu.test(c))",'false',['R4 flat answer tiles']],
 ['artifact-views','row strings any key','active || supplemental ||','active ||',['R4 unknown row strings']]
);
for(const [file,label,before,after,tests] of r4Edges){const original=sources.get(file);if(!original.includes(before))throw new Error('Missing R4 mutation target '+label);custom(file,'R4 '+label,original.replace(before,after),tests);}
for(const m of mutations) {if(m.source===sources.get(m.file))throw new Error('Unchanged mutant '+m.message);if(m.file!=='ci' && ts.createSourceFile('mutant.mjs',m.source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length)throw new Error('Invalid mutant '+m.message);}
const scratch=mkdtempSync(join(tmpdir(),'li-word-mutation-suite-')),toolRoot=join(scratch,'scripts/words'),trace=join(scratch,'trace.jsonl');
mkdirSync(join(scratch,'scripts'),{recursive:true});cpSync('scripts/words',toolRoot,{recursive:true});
const harness=join(scratch,'word-pipeline-regressions.mjs');writeFileSync(harness,readFileSync('tests/helpers/word-pipeline-regressions.mjs'));
process.once('SIGTERM',()=>{rmSync(scratch,{recursive:true,force:true});process.exit(143);});
let failed=0;
try{
 // Freeze all source files for this run.
 for(const [file,source] of sources){let patched=source;for(const p of patches.get(file).sort((a,b)=>b.start-a.start))patched=patched.slice(0,p.start)+`(${source.slice(p.start,p.end)} || (globalThis.__wordRecordGate?.(${p.id}), false))`+patched.slice(p.end);writeFileSync(join(toolRoot,`${file}.mjs`),patched);}
 const run=(env,pattern)=>spawnSync(process.execPath,['--test',...(pattern?['--test-name-pattern',pattern]:[]),harness],{encoding:'utf8',env:{...process.env,...env,WORD_TEST_TOOL_ROOT:resolve(toolRoot),WORD_TEST_WORKFLOW_FILE:join(toolRoot,'ci.mjs')},timeout:120000,maxBuffer:8*1024*1024});
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
