#!/usr/bin/env node
// Every mutant starts from passing synthetic bakes. Trace false predicates once,
// then run their exact negative cases; unrelated later gates cannot hide removal.
import ts from 'typescript';
import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const files=['bake','review','policy','shipping','guard','artifact-views','library-source','paths','core','scan','check','density','compiler','text-views','media-structure','generated-admission','puzzle-admission','preview','ci'];
const mutations=[],sources=new Map(),patches=new Map();
for(const file of files){const path=file==='ci'?'.github/workflows/ci.yml':file==='preview'?'scripts/ios-preview-bundle.mjs':`scripts/words/${file}.mjs`,source=readFileSync(path,'utf8'),tree=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true);sources.set(file,source);patches.set(file,[]);
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
custom('guard','original Hermes hard-term gate',sources.get('guard').replace('if(scanned.hardHermesFailure)','if(false)'),['R4 original Hermes hard term technical','R4 original Hermes hard term worklet','R4 original Hermes hard term vector','R4 original Hermes hard term short exact']);
custom('guard','individual blocked-literal detector',sources.get('guard').replace('if(literalHits.size)','if(false)'),['guard core','guard blocked visible string']);
custom('guard','private filename detector',sources.get('guard').replaceAll('bannedNames.test(name)','false'),['guard filename receipt.private.json']);
custom('guard','canary detector',sources.get('guard').replace('if(uppers.some(upper=>upper.includes(word.toUpperCase())))','if(false)').replace("if((policy.canaries??[]).some(word=>raw.uppers.some(upper=>upper.includes(word.toUpperCase()))))",'if(false)'),['guard canary']);
custom('guard','word-search grid detector',sources.get('guard').replace('if(grids.some(', 'if(false && grids.some('),['guard actual word grid','guard decoded packed word grid']);
custom('guard','private hash detector',sources.get('guard').replaceAll('[...hashes].some(h=>upper.includes(h.toUpperCase()))','false'),['guard scan-hash']);
custom('guard','private blob detector',sources.get('guard').replaceAll('blobs.some(b=>upper.includes(b.toUpperCase()))','false'),['guard private blob despite exceptions']);
custom('guard','non-list occurrence accounting',sources.get('guard').replace('if(hit.listShaped)seen.set(hit.sha256,occurrence);','seen.set(hit.sha256,occurrence);'),['R4 non-list view preserves reviewed occurrence 1']);
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
 ['text-views','replacement text remains scanned',"if(isUtf8(bytes))views.push(bytes.toString('utf8'));","if(isUtf8(bytes))views.push(bytes.toString('utf8').includes('\\ufffd')?'':bytes.toString('utf8'));",['R3 valid UTF8 replacement remains text']],
 ['text-views','invalid UTF8 text must not skip','if(kind)return [];','if(kind || !isUtf8(bytes))return [];',['R3 invalid UTF8 remains scanned text']],
 ['guard','only complete vectors get XML views','const vector=isSvgDocument;',"const vector=text=>/^\\s*<svg\\b/i.test(text);",['R3 SVG construction prefix']],
 ['density','CHamoru accent normalization',".normalize('NFD').replace(/\\p{M}/gu,'')",'',['R3 accented CHamoru sensitive surface']],
 ['guard','CHamoru glottal normalization',".replace(/['ʼ’]/g,'')",'',['R3 glottal CHamoru sensitive surface']],
 ['artifact-views','SVG attribute leak unit','parsed.keys.push(match[1]);','',['R3 SVG metadata list leak']],
 ['artifact-views','SVG comment leak unit',"for(const match of text.matchAll(/<!--([\\s\\S]*?)-->/g))parsed.keys.push(match[1]);",'',['R3 SVG comment list leak']],
 ['guard','SVG displayed labels','displayStrings.push(...parsed.strings);','',['R3 SVG visible core label']],
 ['guard','decoded SVG unconditional leak view','...originalStrings.map(text=>text.toUpperCase()),','',['R3 SVG decoded canary retained']],
 ['artifact-views','SVG language declaration','if(chamoru(language))parsed.sensitiveStrings.push(...parsed.strings);','',['R3 SVG CHamoru visible label']],
 ['guard','structured text file list unit','strings.push(...(lines.length>1?[text,...lines]:lines));','strings.push(...lines);',['R3 standalone TSV list']],
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
 ['guard','teaching source generated type',"!Object.keys(entry.fields).some(key=>['kind','cells','grid','board','rows','words','spelling'].includes(key))",'true',['R3 teaching source generated kind']],
 ['artifact-views','teaching exact exported fields','JSON.stringify(Object.entries(entry.fields).sort())===JSON.stringify(Object.entries(value).sort())','true',['R3 teaching new field']],
 ['artifact-views','singleton language presence','grid.languagePresent=languagePresent;','grid.languagePresent=false;',['R3 singleton unresolved language dynamic','R3 singleton unresolved language numeric']],
 ['guard','singleton puzzle boundary','!grid.puzzle','true',['R3 singleton puzzle still declares js']],
 ['artifact-views','singleton long-cell declaration'," || rows.length===1 && rows[0]?.length===1 && /^[\\p{L}ʼ’']+$/u.test(c)",'', ['R3 singleton matrix long cell js']],
 ['artifact-views','puzzle row classification','validLanguage(language)||puzzle','validLanguage(language)',['R3 unknown JS puzzle row container']],
 ['artifact-views','singleton exemption height','value.length===1 && Array.isArray(value[0])','value.length>=1 && Array.isArray(value[0])',['R3 singleton matrix vertical js']],
 ['artifact-views','singleton exemption width',"value[0].length===1 && typeof value[0][0]==='string' && /^\\p{L}$/u.test(value[0][0])","value[0].length>=1",['R3 singleton matrix digraph js','R3 singleton matrix horizontal json']],
 ['guard','untagged grid conservative sensitivity','sensitiveGrids.push(...grids.filter(grid=>!grid.languageDeclared && !grid.supplemental));','',['R3 untagged recognised sensitive grid']],
 ['ci','versioned secret mapping','secrets.LITTLE_ISLAND_WORD_POLICY_V2_GZIP_BASE64','secrets.LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64',['R3 CI versioned secret mapping']],
 ['artifact-views','odd entries','return values.flatMap(value=>{','if(!values.every(shortWords))return [];return values.flatMap(value=>{',['R4 legacy sparse odd array']],
 ['artifact-views','language recognizer',"/^(?:ch(?:-|$)|cha$|chamoru$|chamorro$)/i.test(value.trim())",'false',['R3 source constant','R3 source spread']],
 ['artifact-views','language characters',"/[åʼ]/iu.test(text.normalize('NFC'))",'false',['R3 characters 72 229']],
 ['guard','unknown extension fallback','for(const text of decodedViews)','for(const text of [])',['R3 text extension md']],
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
 ['density','threshold','densityThreshold = 15','densityThreshold = 16',['R4 density threshold 16']],
 ['density','window eviction','counts.delete(word)','counts.set(word,1)',['R4 density sliding boundary']],
 ['guard','density gate','if(scanned.densityMaximum>densityThreshold || scanned.shortDensityMaximum>shortDensityThreshold)','if(false)',['R4 density threshold 17']],
 ['guard','JSON teaching source','teachingJSON(JSON.parse(text))',"{strings:[],grids:[]}",['R4 teaching JSON source']],
 ['artifact-views','tuple flatten','if(Array.isArray(value))return compactEntries(value);','',['R4 fragment 5 tuples']],
 ['artifact-views','filename normalization',"if(/^\\p{L}+$/u.test(word))return [word];",'',['R4 fragment 5 filenames']],
 ['artifact-views','JSON strings',"if(decoded && typeof decoded==='object')return jsonUnits(decoded).some(unit=>unit.length>=3);",'',['R4 encoded object three']],
 ['artifact-views','string prose share','policyShare(words,excluded)<0.5','true',['R4 fragment 5 article']],
 ['artifact-views','tagged keys','...(tagged(value)||active||chamoruCharacters(key)?[key]:[])','',['R4 tagged keys']],
 ['check','Hermes receipt binding','r.iosJavaScript?.hermesStringsMatched===true','true',['R4 receipt requires Hermes binding']],
];
r4Edges.push(
 ['artifact-views','record columns','for(const unit of recordUnits(values))addCompact(unit,node);','',['R4 fragment 5 records']],
 ['artifact-views','record maps','if(ts.isObjectLiteralExpression(node))for(const unit of objectUnits(staticData(node)))addCompact(unit,node);','',['R4 fragment 5 keymap','R4 fragment 5 valuemap']],
 ['artifact-views','switch labels','if(ts.isCaseBlock(node))addCompact(node.clauses.filter(ts.isCaseClause).map(c=>staticData(c.expression)).filter(shortWords),node);','',['R4 fragment 5 switch']],
 ['artifact-views','comparison labels','comparisons(node);addCompact(labels,node);','comparisons(node);',['R4 fragment 5 equality']],
 ['artifact-views','enum labels','if(names.length)addCompact(names,node);','',['R4 fragment 5 enum']],
 ['artifact-views','template segments',"if(ts.isTemplateExpression(node))addCompact([[node.head.text,...node.templateSpans.map(span=>span.literal.text)].join(' ')],node);",'',['R4 fragment 5 template']],
 ['artifact-views','normalized short list',"if(typeof text==='string')text=text.normalize('NFKC').replace(/\\p{Default_Ignorable_Code_Point}/gu,'');",'',['R4 normalised broad list']],
 ['artifact-views','prose token splitting',"wordTokens(text.replace(/['’]s\\b/gi,'')).map(w=>w.toLowerCase())","text.toLowerCase().split(/\\s+/)",['R4 prose padding hyphens','R4 prose padding possessives']],
 ['artifact-views','curly marker rule'," || /\\p{L}’(?!(?:s|t|re|ll|ve|d|m)\\b)\\p{L}|(?!s)\\p{L}’(?!\\p{L})/iu.test(text.normalize('NFC'))",'', ['R4 narrow apostrophe middle','R4 narrow apostrophe final']],
 ['artifact-views','marker canonical composition',"text.normalize('NFC')",'text',['R4 decomposed marker']],
 ['artifact-views','flat tiles',"x.length>=3 && x.every(c=>typeof c==='string' && /^(?:CH|NG|[A-ZÅÑ])$/u.test(c))",'false',['R4 flat answer tiles']],
 ['artifact-views','row strings any key','active || supplemental ||','active ||',['R4 unknown row strings']]
);
r4Edges.push(
 ['density','long cap lower boundary','densityThreshold = 15','densityThreshold = 14',['R4 density threshold 15']],
 ['density','short cap upper boundary','shortDensityThreshold = 12','shortDensityThreshold = 13',['R4 short density boundary 13']],
 ['density','short cap lower boundary','shortDensityThreshold = 12','shortDensityThreshold = 11',['R4 short density boundary 12']],
 ['guard','short density independent gate','scanned.shortDensityMaximum>shortDensityThreshold','false',['R4 short density boundary 13']],
 ['guard','hard terms ignore length',"[...policy.core,...policy.exact,...policy.lemmas].map(normalizedText)","[...policy.core,...policy.exact,...policy.lemmas].filter(w=>w.length>=5).map(normalizedText)",['R4 short core normalised','R4 short exact normalised']],
 ['guard','decoded JSON views','strings.push(...decodedTextViews(strings));','',['R4 encoded JSON core','R4 encoded JSON unicode density']]
);
r4Edges.push(
 ['preview','validate before restoring', 'gateDelivery(cwd,{...env,EXPO_PUBLIC_LIBRARY_PREVIEW:"1"});\n    putBack();', 'putBack();\n    gateDelivery(cwd,{...env,EXPO_PUBLIC_LIBRARY_PREVIEW:"1"});',['native preview build and npm delivery scripts are gated']]
);
r4Edges.push(
 ['guard','JSON teaching shape'," || /src\\/learn\\//.test(name) && teachingRecordData(JSON.parse(text))",'', ['R4 teaching record shape words.json']],
 ['artifact-views','TS teaching shape',"teaching || /src\\/learn\\//.test(name) && ['term','english'].every(key=>n.properties.some(p=>p.name?.getText(tree).replace(/^['\\\"]|['\\\"]$/g,'')===key))",'teaching',['R4 teaching record shape words.ts','R5 shorthand teaching identity']]
);
r4Edges.push(
 ['guard','Hermes individual density entries','...densityEntries,...strings,...keys,',"...(isHermes?[]:densityEntries),...(isHermes?[]:strings),...keys,",['R4 Hermes entry density single list']],
 ['guard','Hermes artificial adjacency',"if(!isHermes && !isJavaScript)textViews.push([...strings,...keys].join(' '));","textViews.push([...strings,...keys].join(' '));",['R4 Hermes entry density separate strings']]
);
r4Edges.push(
 ['artifact-views','decoded source position view','sensitiveGrids, densitySource };','sensitiveGrids, densitySource:undefined };',['R4 decoded JavaScript source proximity']]
);
r4Edges.push(
 ['check','native compiler input names',"'--no-minify',",'', ['release gate requires Hermes and checks current receipt artifacts']]
);
r4Edges.push(
 ['artifact-views','prose before inline enumeration','if(sentence)return false;','',['R4 prose before inline enum']]
);
r4Edges.push(
 ['compiler','native version mismatch', 'digest(record.compiler)===digest(current)', 'digest({...record.compiler,packageVersion:current.packageVersion})===digest(current)', ['R4 native compiler mismatch packageVersion']],
 ['check','identifier entries cannot skip', 'hermesStrings(readFileSync(join(ios,file.path)))', 'hermesStrings(readFileSync(join(ios,file.path)),{identifiers:false})', ['R4 binding includes identifier entries']],
 ['check','scanned JS digest binding', 'r.iosJavaScript.scannedJsSha256===digest(r.iosJavaScript.scannedJs)', 'true', ['R4 scanned source hash in receipt']],
 ['check','receipt native compiler hash', 'r.nativeCompiler?.sha256===verifyCompilerCapture(root,ios,r.nativeCompiler?.path).sha256', 'true', ['R4 receipt compiler binding nativeCompiler.sha256']],
 ['check','receipt compiler identity', 'digest(r.iosJavaScript.compiler)===digest(compilerIdentity(root))', 'true', ['R4 receipt compiler binding iosJavaScript.compiler.packageVersion']]
);
r4Edges.push(
 ['text-views','UTF16 byte order',"if(bom==='feff')content.swap16();",'',['R4 UTF16 be density']]
);
const r5Edges=[
 ['generated-admission','lazy map admission',' || ts.isArrowFunction(p.initializer) || ts.isFunctionExpression(p.initializer)','',['R5 diluted lazy map']],
 ['generated-admission','dictionary map admission'," || ts.isStringLiteralLike(p.initializer)))"," || ts.isStringLiteralLike(p.initializer) && /\\.(?:m4a|mp3|wav|png|svg)$/.test(p.initializer.text)))",['R5 diluted dictionary map']],
 ['generated-admission','mixed map key admission',"(ts.isStringLiteralLike(p.name)||ts.isIdentifier(p.name)) && (ts.isCallExpression","(ts.isStringLiteralLike(p.name)||ts.isIdentifier(p.name)) && /^\\p{L}+$/u.test(p.name.text) && (ts.isCallExpression",['R5 diluted map with mixed ids']],
 ['text-views','lenient fallback',"else views.push(new TextDecoder('windows-1252').decode(bytes),bytes.toString('latin1'),bytes.toString('utf8'));","else views.push(bytes.toString('utf8'));",['R5 encoded Latin1 JSON literal','R5 encoded Latin1 text literal']],
 ['text-views','known magic only','const kind=binaryKind(bytes);',"const kind='media';",['R5 text CSV cp1252','R5 text XML latin1','R5 text ANSI core']],
 ['text-views','ANSI stripping',".replace(/\\x1b\\[[0-?]*[ -/]*[@-~]/g,'')",'', ['R5 ANSI middle word']],
 ['text-views','control stripping',".replace(/[\\x00-\\x08\\x0b-\\x1f\\x7f-\\x9f]/g,' ')",'',['R5 controls normalized']],
 ['artifact-views','record excludes fields only','keys.filter(key=>!excluded.has(key))',"(keys.some(key=>excluded.has(key))?[]:keys)",['R5 records 5 id data.json']],
 ['artifact-views','object record key unit',"values.every(v=>v && !Array.isArray(v) && typeof v==='object' && JSON.stringify(Object.keys(v).sort())===JSON.stringify(Object.keys(values[0]).sort()))",'false',['R5 object record key structure']],
 ['guard','compact mixed share','compactBroadShare(remaining,broad)>=(unit.catalog?0.5:0.25)','compactBroadShare(remaining,broad)>=0.5',['R5 mixed filenames','R5 mixed ids']],
 ['guard','export map provenance',"if(mapKeys.some(key=>broadNames(normalizedText(key)).size && !admitted(key)))","if(false)",['R5 diluted map 7600 plus 300']],
 ['guard','export file provenance',"if(broadNames(normalizedText(wordTokens(stem).join(' '))).size && !admitted(stem))","if(false)",['R5 diluted 300 audio files']],
 ['density','camel case tokens',"text.replace(/([a-z])([A-Z])/g,'$1 $2')",'text',['R5 camelCase density']],
 ['check','CI any truthy value',"!isCI(process.env.CI)","process.env.CI!=='true'",['R5 CI 1 missing policy']],
 ['generated-admission','exclude output sources',' || outputPath.test(name)','',['R5 generator rejects output self admission']],
 ['generated-admission','exclude word map property keys',"if(ts.isStringLiteralLike(n) && n.parent?.name===n)return;",'', ['R5 generator rejects unknown map self admission']],
 ['generated-admission','source required','!!source','true',['R5 generator rejects untraced word']],
];
for(const [file,label,before,after,tests] of r5Edges){const original=sources.get(file);if(!original.includes(before))throw new Error('Missing R5 mutation target '+label);custom(file,'R5 '+label,original.replace(before,after),tests);}
custom('text-views','R4 UTF16 text decoding',sources.get('text-views').replace("if(bom==='fffe'||bom==='feff')",'if(false)').replace('if(sample.length>=4 && Math.max(...zero)>sample.length/8)','if(false)'),['R4 UTF16 le density','R4 UTF16 core']);
for(const [file,label,before,after,tests] of r4Edges){const original=sources.get(file);if(!original.includes(before))throw new Error('Missing R4 mutation target '+label);custom(file,'R4 '+label,original.replace(before,after),tests);}
const r6Edges=[
 ['generated-admission','speech inputs cannot admit themselves',"const authoredRoots=['src'];", "const authoredRoots=['src','scripts/learn'];",['R6 speech input cannot admit scripts/learn/spelling.json']],
 ['generated-admission','reachable src only',"if(name.startsWith('src/') && !reachable.has(name))return;",'', ['R6 graph excludes unimported']],
 ['generated-admission','type-only import exclusion',"!n.importClause?.isTypeOnly",'true',['R6 graph excludes type-only']],
 ['generated-admission','sentence tokens cannot admit words',"// Add identifiers only after validation. Do not add transcript tokens.","tokens.forEach(word=>words.set(word,source));",['R6 sentence is prose but cannot donate vocabulary']],
 ['generated-admission','frozen key identity','row.keySha256===sha256(key)','true',['R6 published inherited key and word frozen']],
 ['generated-admission','frozen transcript identity','row.transcriptSha256===sha256(text)','true',['R6 published inherited key and word frozen']],
 ['guard','source literal check','if(view.literalHits.size || view.hardHermesFailure)','if(false)',['R6 source scan scripts/learn/spelling.json core','R6 source scan scripts/quality-audio.json exact']],
 ['guard','source list check',"if([...view.stringHits,...view.unitHits].some(hit=>hit.listShaped && new Set(hit.broad).size>=3))",'if(false)',['R6 source scan scripts/learn/spelling.json list']],
 ['guard','source density check','if(view.densityMaximum>densityThreshold || view.shortDensityMaximum>shortDensityThreshold)','if(false)',['R6 source scan scripts/learn/spelling.json density']],
 ['guard','camel word file tokens',"normalizedText(wordTokens(stem).join(' '))",'normalizedText(stem)',['R6 word asset camel']],
 ['text-views','validated font required','if(validFont(bytes))',"if(bytes.subarray(0,4).toString()==='true' || validFont(bytes))",['R6 debug dump regression']],
 ['media-structure','PNG CRC','crc32(b.subarray(at+4,end-4))!==b.readUInt32BE(end-4)','false',['R6 invalid media PNG CRC']],
 ['media-structure','PNG IHDR',"kind!=='IHDR'","false",['R6 invalid media PNG IHDR']],
 ['media-structure','RIFF length','b.readUInt32LE(4)+8!==b.length','false',['R6 invalid media RIFF size']],
 ['media-structure','MP4 box size','at+size>b.length','false',['R6 invalid media M4A size']],
 ['media-structure','ID3 version','[2,3,4].includes(b[3])','true',['R6 invalid media ID3 version']],
 ['media-structure','ID3 size','10+((b[6]<<21)|(b[7]<<14)|(b[8]<<7)|b[9])+(b[3]===4 && (b[5]&16)?10:0)<=b.length','true',['R6 invalid media ID3 size']],
 ['media-structure','sfnt table count','12+count*16>b.length','false',['R6 invalid media sfnt count']],
 ['media-structure','sfnt table range','offset+size>b.length','false',['R6 invalid media sfnt range']],
 ['puzzle-admission','word family coverage',"if(!wordFamily(family) && !wordFamily(engine))return undefined;",'return undefined;',['R6 word family pack word-search']],
];
for(const [file,label,before,after,tests] of r6Edges){const original=sources.get(file);if(!original.includes(before))throw new Error('Missing R6 mutation target '+label);custom(file,'R6 '+label,original.replace(before,after),tests);}
for(const m of mutations) {if(m.source===sources.get(m.file))throw new Error('Unchanged mutant '+m.message);if(m.file!=='ci' && ts.createSourceFile('mutant.mjs',m.source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length)throw new Error('Invalid mutant '+m.message);}
const scratch=mkdtempSync(join(tmpdir(),'li-word-mutation-suite-')),toolRoot=join(scratch,'scripts/words'),trace=join(scratch,'trace.jsonl');
mkdirSync(join(scratch,'scripts'),{recursive:true});cpSync('scripts/words',toolRoot,{recursive:true});
const harness=join(scratch,'word-pipeline-regressions.mjs');writeFileSync(harness,readFileSync('tests/helpers/word-pipeline-regressions.mjs'));
process.once('SIGTERM',()=>{rmSync(scratch,{recursive:true,force:true});process.exit(143);});
let failed=0;
try{
 // Freeze all source files for this run.
 for(const [file,source] of sources){let patched=source;for(const p of patches.get(file).sort((a,b)=>b.start-a.start))patched=patched.slice(0,p.start)+`(${source.slice(p.start,p.end)} || (globalThis.__wordRecordGate?.(${p.id}), false))`+patched.slice(p.end);writeFileSync(join(toolRoot,`${file}.mjs`),patched);}
 const run=(env,pattern)=>spawnSync(process.execPath,['--test',...(pattern?['--test-name-pattern',pattern]:[]),harness],{encoding:'utf8',env:{...process.env,...env,WORD_TEST_TOOL_ROOT:resolve(toolRoot),WORD_TEST_WORKFLOW_FILE:join(toolRoot,'ci.mjs'),WORD_TEST_PREVIEW_FILE:join(toolRoot,'preview.mjs')},timeout:process.env.LITTLE_ISLAND_SLOW_HOST==='1'?300000:120000,maxBuffer:8*1024*1024});
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
