#!/usr/bin/env node
// Every mutant starts from passing synthetic bakes. Trace false predicates once,
// then run their exact negative cases; unrelated later gates cannot hide removal.
import ts from 'typescript';
import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync, mkdirSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const files=['bake','bake-reading','registry','morphology','review','policy','shipping','guard','artifact-views','library-source','paths','core','scan','check','density','compiler','text-views','media-structure','generated-admission','puzzle-admission','preview','ci'];
const mutations=[],sources=new Map(),patches=new Map();
// The shared word-parts validator is app TypeScript under src/; the harness loads the copy named by WORD_TEST_MORPHOLOGY_FILE.
const toolFile=file=>file==='morphology'?'morphology.ts':`${file}.mjs`;
// Lead contract change: W1 reading records. Every top-level clause of a new reading gate predicate is mutated on its own,
// run against the cases that saw the whole predicate fail. Only those cases can observe one clause's removal.
const readingGate=(file,message)=>['bake-reading','registry'].includes(file) || /[Rr]eading|hash\/count mismatch|Invalid word bank manifest|manifest kind|Symlink in export/.test(message);
const leaves=n=>ts.isParenthesizedExpression(n)?leaves(n.expression):ts.isBinaryExpression(n) && n.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken?[...leaves(n.left),...leaves(n.right)]:ts.isConditionalExpression(n)?[...leaves(n.whenTrue),...leaves(n.whenFalse)]:[n];
for(const file of files){const path=file==='ci'?'.github/workflows/ci.yml':file==='preview'?'scripts/ios-preview-bundle.mjs':file==='morphology'?'src/learn/reading/morphology.ts':`scripts/words/${file}.mjs`,source=readFileSync(path,'utf8'),tree=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true);sources.set(file,source);patches.set(file,[]);
 function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(tree)==='requireThat'){
  const message=n.arguments[1].getText(tree);
  if(file==='check' && /release <|receipt </.test(message))return;
  const arg=n.arguments[0],id=mutations.length;
  mutations.push({id,file,message,source:source.slice(0,arg.getStart(tree))+'true'+source.slice(arg.end)});
  if(readingGate(file,message)){const parts=leaves(arg);if(parts.length>1)for(const leaf of parts)mutations.push({id:mutations.length,file,message:'R1a clause '+message+' :: '+leaf.getText(tree),source:source.slice(0,leaf.getStart(tree))+'true'+source.slice(leaf.end),coverageOf:id});}
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
 // A clause target must be unique: String.replace mutates only the first occurrence, so a duplicated clause would
 // leave its other copy untested (fix 1 duplicated the manifest hash clause and the Word Search mutant went blind).
 if(source.split(clause).length!==2)throw new Error('Ambiguous mutation target: '+clause);
 custom(file,'R2 clause '+clause,source.replace(clause,'true'),[test,...(clause==='entry.sha256===sha256(bytes)'?['reading clause manifest same-length edit hash']:[])]);
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
 ['guard','export map provenance',"if(mapKeys.some(key=>policyTokens(key).length && !admitted(key)))","if(false)",['R5 diluted map 7600 plus 300']],
 ['guard','export file provenance',"if(policyTokens(stem).length && !admittedFilename(stem))","if(false)",['R5 diluted 300 audio files']],
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
 ['generated-admission','Library item identity','items.find(item=>item.id===row.id && (!activeIds || activeIds.includes(item.id)))','items[0]',['R6 Library normalized token stays item bound']],
 ['generated-admission','speech inputs cannot admit themselves',"const authoredRoots=['src'];", "const authoredRoots=['src','scripts/learn'];",['R6 speech input cannot admit scripts/learn/spelling.json']],
 ['generated-admission','reachable src only',"if(name.startsWith('src/') && !reachable.has(name))return;",'', ['R6 graph excludes unimported']],
 ['generated-admission','type-only import exclusion',"!n.importClause?.isTypeOnly",'true',['R6 graph excludes type-only']],
 ['generated-admission','sentence tokens cannot admit words',"// Add identifiers only after validation. Do not add transcript tokens.","tokens.forEach(word=>words.set(word,source));",['R6 sentence is prose but cannot donate vocabulary']],
 ['generated-admission','frozen key identity','row.keySha256===sha256(key)','true',['R6 published inherited key and word frozen']],
 ['generated-admission','frozen transcript identity','row.transcriptSha256===sha256(text)','true',['R6 published inherited key and word frozen']],
 ['guard','source literal check','if(view.literalHits.size || view.hardHermesFailure)','if(false)',['R6 source scan scripts/learn/spelling.json core','R6 source scan scripts/quality-audio.json exact']],
 ['guard','source list check',"if([...view.stringHits,...view.unitHits].some(hit=>hit.listShaped && new Set(hit.broad).size>=3))",'if(false)',['R6 source scan scripts/learn/spelling.json list']],
 ['guard','source density check','if(view.densityMaximum>densityThreshold || view.shortDensityMaximum>shortDensityThreshold)','if(false)',['R6 source scan scripts/learn/spelling.json density']],
 ['guard','policy token vocabulary','tokens.every(token=>admission.sources.words.has(token))','true',['R7 identifier vocabulary clue file scan']],
 ['guard','camel word file tokens','policyTokens(stem).length',"policyNames(normalizedText(stem)).size",['R6 word asset camel']],
 ['text-views','Hermes header validation','try{hermesStrings(bytes);', 'try{', ['R6 Hermes magic needs header']],
 ['text-views','validated font required','if(validFont(bytes))',"if(bytes.subarray(0,4).toString()==='true' || validFont(bytes))",['R6 debug dump regression']],
 ['media-structure','PNG CRC','crc32(b.subarray(at+4,end-4))!==b.readUInt32BE(end-4)','false',['R6 invalid media PNG CRC']],
 ['media-structure','PNG IHDR',"kind!=='IHDR'","false",['R6 invalid media PNG IHDR']],
 ['media-structure','RIFF length','b.readUInt32LE(4)+8!==b.length','false',['R6 invalid media RIFF size']],
 ['media-structure','ID3 version','[2,3,4].includes(b[3])','true',['R6 invalid media ID3 version']],
 ['media-structure','ID3 size','10+((b[6]<<21)|(b[7]<<14)|(b[8]<<7)|b[9])+(b[3]===4 && (b[5]&16)?10:0)<=b.length','true',['R6 invalid media ID3 size']],
 ['media-structure','sfnt table count','!count || count>4096','count>4096',['R6 invalid media sfnt zero']],
 ['media-structure','sfnt table range','offset+size>b.length','false',['R6 invalid media sfnt range']],
 ['puzzle-admission','word family coverage',"if(!wordFamily(family) && !wordFamily(engine))return undefined;",'return undefined;',['R6 word family pack word-search']],
];
custom('guard','R6 decoded word pack admission',sources.get('guard').replace("admitPuzzlePack(sourceRoot,pack.metadata?.header?.family??'',pack.metadata?.engine??'',pack.rows??[])",'undefined'),['R6 guard word pack vocabulary admission']);
custom('media-structure','R6 MP4 complete box bounds',sources.get('media-structure').replace('at+size>b.length','false').replace('return ftyp && at===b.length;','return ftyp;'),['R6 invalid media M4A size']);
for(const [file,label,before,after,tests] of r6Edges){const original=sources.get(file);if(!original.includes(before))throw new Error('Missing R6 mutation target '+label);custom(file,'R6 '+label,original.replace(before,after),tests);}
custom('guard','R7 whole-key admission bypass',sources.get('guard').replace('const tokens=policyTokens(entry);',"if(admission.sources.exact.has(normalizedText(entry)))return true;const tokens=policyTokens(entry);"),['R7 identifier vocabulary clue file scan','R7 identifier vocabulary clue js scan','R7 identifier vocabulary clue registry scan']);
custom('guard','R7 every matching component required',sources.get('guard').replace('tokens.every(token=>admission.sources.words.has(token))','tokens.some(token=>admission.sources.words.has(token))'),['R7 every matching component file','R7 token control ordinary']);
custom('guard','R7 all policy groups in identifiers',sources.get('guard').replace('[...policy.scan,...policy.core,...policy.exact,...policy.lemmas].map(normalizedText)','policy.scan.map(normalizedText)'),['R7 camel policy group core js','R7 camel policy group exact js','R7 camel policy group lemmas js']);
custom('generated-admission','R7 preserve original identifier tokens',sources.get('generated-admission').replace('identifier:entry','identifier:key'),['R7 registry preserves camel token boundaries']);
// R1a fix 2, lead contract change: W1 reading records. Delegations, projections, detectors and the shared kit rules.
// Each target must occur exactly once. Equivalent mutants are named in FIX-REPORT-2, not counted as kills.
const readingEdges=[
 ['bake-reading','policy lock','const { lock, policy: held } = lockedPolicy(policy);','const held = policy, lock = { scanListSha256: digest([...policy.scan].sort()) };',['reading policy lock verified']],
 ['bake-reading','shared validator at bake','    validateReadingRecord(record);\n','',['reading bake runs the shared kit rules']],
 ['bake-reading','exact block of shown text','for (const upper of shown) requireThat(answerAllowed(','for (const upper of []) requireThat(answerAllowed(',['reading alternate pieces are checked']],
 ['bake-reading','scan of shown text','for (const upper of shown) if (upper.length >= 3)','for (const upper of []) if (upper.length >= 3)',['reading gloss scan-only text is checked']],
 ['bake-reading','tray constructions','const built = readingConstructions(record);','const built = [record.word];',['reading tray pieces that build a blocked term are refused','reading tray scan finds a scan-only term built forwards','reading tray scan reads built text backwards']],
 ['bake-reading','construction block uses exact terms','[...held.exact, ...held.lemmas]','[...held.lemmas]',['reading tray exact block on a shorter build']],
 ['bake-reading','construction block uses lemmas','[...held.exact, ...held.lemmas]','[...held.exact]',['reading tray lemma block on a shorter build']],
 ['bake-reading','shared detached review','verifiedEvidence[record.id] = requireShippingReview(record, ev, batchCache);',"verifiedEvidence[record.id] = { reviewIds: ['x'] };",['reading needs the family sample','reading transcript bytes required','reading needs the lead decision','reading family evidence hash required']],
 ['bake-reading','asset carries policy','const asset = { schemaVersion: 1, kind: READING_ASSET_KIND,','const asset = { policy, schemaVersion: 1, kind: READING_ASSET_KIND,',['reading records bake through the same detached admission, with an exact safe projection']],
 ['core','shared validator delegation','const issues = partsWordIssues(r);','const issues = [];',['reading rule compound two whole words','reading rule tray spells unaccepted','reading shipping shape runs the shared kit rules']],
 ['core','family is shown text',"...(r.family ? [r.family] : []), ",'',['reading family text is checked']],
 ['core','gloss is shown text',", ...(r.gloss ? r.gloss.split(' ') : [])",'',['reading gloss text is checked','reading gloss scan-only text is checked']],
 ['core','alternate pieces are shown text','...(r.alternates ?? []).flat(), ','',['reading alternate pieces are checked']],
 ['core','shorter builds are shown','    if (depth) out.add(text);','    if (depth === boxes) out.add(text);',['reading tray exact block on a shorter build','reading constructions use each tray piece once, up to the box count']],
 ['core','builds reach every box','    if (depth === boxes) return;','    if (depth === 1) return;',['reading tray pieces that build a blocked term are refused']],
 ['core','builds use wrong pieces','const tray = [...r.chunks, ...r.distractors], boxes','const tray = [...r.chunks], boxes',['reading tray pieces that build a blocked term are refused']],
 ['scan','built text read backwards',"[foldScan(text), [...foldScan(text)].reverse().join('')]",'[foldScan(text)]',['reading tray scan reads built text backwards']],
 ['scan','built text hits recorded','if (node.end) hits.push({ term: node.end });','if (false) hits.push({ term: node.end });',['reading tray scan finds a scan-only term built forwards']],
 ['review','reading packet projection',"batch.kind === 'reading' ? visibleReading : visibleWord",'visibleWord',['a reading packet shows the reviewer the pieces and the tray, not a family-word clue']],
 ['review','reading packet tray','distractors:c.distractors,','',['a reading packet shows the reviewer the pieces and the tray, not a family-word clue']],
 ['review','reading packet context',"context:batch.kind === 'reading' ? READING_REVIEW_CONTEXT : REVIEW_CONTEXT",'context:REVIEW_CONTEXT',['a reading packet shows the reviewer the pieces and the tray, not a family-word clue']],
 ['review','reading packet prompt',"promptVersion:batch.kind === 'reading' ? READING_PROMPT_VERSION : REVIEW_PROMPT_VERSION",'promptVersion:REVIEW_PROMPT_VERSION',['a reading packet shows the reviewer the pieces and the tray, not a family-word clue']],
 ['review','reading prepare validation',"kind === 'reading' ? validateReadingRecord(c) :","kind === 'reading' ? c :",['reading rule compound two whole words','a reading record cannot carry its own approval']],
 ['registry','kind routing',"(b.kind ?? 'words')===kind",'true',['the generated registry loads reading banks through their own table']],
 ['registry','reading type',"kind==='words'?'WordBank':'ReadingBank'","'WordBank'",['the generated registry loads reading banks through their own table']],
 ['shipping','reading JSON detector','  if(readingShaped(Object.keys(value)))return true;\n','',['reading stray JSON imported by a route fails shipping and export','reading stray JSON nested under another key fails shipping']],
 ['shipping','reading literal detector','      if(readingShaped(n.properties.map(propertyName)))found.push(n.getText(tree));\n','',['reading stray source literal fails shipping object','reading stray source literal fails shipping quoted keys','reading stray source literal fails shipping computed keys','reading stray source literal fails shipping nested']],
 ['shipping','computed reading keys','if(ts.isComputedPropertyName(name))return ts.isStringLiteralLike(name.expression)?name.expression.text:undefined;','if(ts.isComputedPropertyName(name))return undefined;',['reading stray source literal fails shipping computed keys']],
 ['shipping','two reading fields suffice','.length>=2;','.length>=3;',['reading stray source literal fails shipping quoted keys','reading stray source literal fails shipping computed keys','reading stray source literal fails shipping nested','reading stray JSON nested under another key fails shipping']],
 ['shipping','shared shape dispatch','(reading?safeReadingAsset:safeAsset)(asset);','(reading?()=>{}:safeAsset)(asset);',['reading shipping shape runs the shared kit rules','reading runtime shape rejects injected status']],
 ['shipping','JSON payload admission','if(readingShaped(Object.keys(value)))return admit(value,name);','if(readingShaped(Object.keys(value)))return;',['reading payload in exported JSON fails']],
 ['shipping','JS payload admission','return admit(value,name);}ts.forEachChild(n,visit);','return;}ts.forEachChild(n,visit);',['reading payload in an export fails even when the source tree is clean','reading payload in a release web export fails','reading payload in a release native JavaScript export fails']],
 ['shipping','unverifiable payload fails','catch{throw new Error(`Unverifiable reading payload in export: ${name}`);}','catch{return;}',['reading payload that cannot be read statically fails']],
 ['shipping','unreadable JSON fails','catch{throw new Error(`Unreadable JSON in export: ${name}`);}','catch{continue;}',['reading payload in malformed export JSON fails closed']],
 ['check','export payload backstop','  admission.readingPayloads=checkReadingPayloads(root,directory);\n','',['reading payload in an export fails even when the source tree is clean','reading payload in exported JSON fails']],
 ['check','release web payload backstop','  admission.readingPayloads=checkReadingPayloads(root,web);\n','',['reading payload in a release web export fails']],
 ['check','release native payload backstop','    checkReadingPayloads(root,temporary);\n','',['reading payload in a release native JavaScript export fails']],
 ['generated-admission','reading vocabulary','add(bank.path,bytes,bankVocabulary(bank.kind,JSON.parse(bytes)));','add(bank.path,bytes,[]);',['a registered reading bank passes the complete export gate with detached evidence']],
 ['generated-admission','reading generated entries',"entries.push(...((kind ?? 'words')==='reading-parts'?shown:data.words.map(w=>w.spelling)));",'entries.push();',['a registered reading bank passes the complete export gate with detached evidence']],
 ['morphology','id type','typeof r.id !== "string" || ','',['reading rule id type']],
 ['morphology','id slug','if (typeof r.id !== "string" || !slug.test(r.id)) no(','if (false) no(',['reading rule id slug']],
 ['morphology','word type','if (typeof r.word !== "string") return','if (false) return',['reading rule word type']],
 ['morphology','word length','if (!/^[a-z]{4,14}$/.test(r.word)) no(','if (false) no(',['reading rule word length']],
 ['morphology','kind','if (!["compound", "syllables", "ending", "prefix"].includes(r.kind)) return','if (false) return',['reading rule kind']],
 ['morphology','piece type','const piece = (p: unknown): p is string => typeof p === "string" && ','const piece = (p: unknown): p is string => ',['reading rule chunk type','reading rule family type']],
 ['morphology','chunk count','if (!pieces(r.chunks, 2, 4)) return','if (false) return',['reading rule chunk count']],
 ['morphology','chunks spell','if (r.chunks.join("") !== r.word) no(','if (false) no(',['reading rule chunks spell']],
 ['morphology','level','if (r.level !== level) no(','if (false) no(',['reading rule level']],
 ['morphology','compound whole words','if (r.kind === "compound" && (r.chunks.length !== 2 || r.chunks.some((c) => c.length < 3))) no(','if (false) no(',['reading rule compound two whole words']],
 ['morphology','syllable vowel','if (r.kind === "syllables" && !r.chunks.every(hasVowel)) no(','if (false) no(',['reading rule syllable vowel']],
 ['morphology','base and affix','if (typeof r.base !== "string" || !/^[a-z]{1,10}$/.test(r.base) || typeof r.affix !== "string" || !list.includes(r.affix)) no(','if (false) no(',['reading rule ending base','reading rule base type','reading rule affix known']],
 ['morphology','spelling change','if (applyAffix(r.base, r.affix, kind, change) !== r.word) no(','if (false) no(',['reading rule spelling change']],
 ['morphology','base piece and affix','if (r.chunks.join("|") !== want.join("|")) no(','if (false) no(',['reading rule base piece and affix']],
 ['morphology','unchanged base on tray','if (change !== "none" && !r.distractors?.includes(r.base)) no(','if (false) no(',['reading rule unchanged base on tray']],
 ['morphology','gloss','if (typeof r.gloss !== "string" || !/^[a-z ]{3,40}$/.test(r.gloss)) no(','if (false) no(',['reading rule gloss']],
 ['morphology','only endings carry cues','} else if (r.base || r.affix || r.change || r.gloss) no(','} else if (false) no(',['reading rule compound gloss']],
 ['morphology','family','if (r.family !== undefined && (typeof r.family !== "string" || !/^[a-z]{2,10}$/.test(r.family))) no(','if (false) no(',['reading rule family','reading rule family type']],
 ['morphology','family type','typeof r.family !== "string" || ','',['reading rule family type']],
 ['morphology','distractors','if (!pieces(r.distractors, 2, 4) || new Set(r.distractors).size !== r.distractors.length || r.distractors.some((d) => r.chunks.includes(d))) no(','if (false) no(',['reading rule distractor repeat','reading rule distractor is a chunk','reading rule distractor count']],
 ['morphology','alternates shape','else if (r.alternates !== undefined && (!Array.isArray(r.alternates) || !r.alternates.every((a) => pieces(a, 1, 8)))) no(','else if (false) no(',['reading rule alternates shape']],
 ['morphology','alternate differs','if (a.join("") !== r.word || a.join("|") === r.chunks.join("|")) no(','if (false) no(',['reading rule alternate repeats the answer','reading rule alternate spelling']],
 ['morphology','tray spellings accepted','if (!accepted.has(order.map((i) => tray[i]).join("|"))) no(','if (false) no(',['reading rule tray spells unaccepted']],
 // R1a fix 3 (R3-2): the tray scan starts at every offset, and the export backstop's traversal is complete.
 ['scan','built text scanned from every offset',"reverse().join('')]) for (let i = 0; i < s.length; i++) {","reverse().join('')]) for (let i = 0; i < Math.min(1, s.length); i++) {",['reading tray scan finds a scan-only term inside a build','reading tray scan reports a term at any offset, in both directions']],
 ['shipping','export JSON array descent','if(Array.isArray(value))return value.forEach(v=>json(v,name));','if(Array.isArray(value))return;',['reading payload in a top-level JSON array fails','reading payload in exported JSON fails']],
 ['shipping','export JSON object descent','    Object.values(value).forEach(v=>json(v,name));\n','',['reading payload nested in JSON objects fails','reading payload in exported JSON fails']],
 ['shipping','export directory recursion','if(e.isDirectory()){walk(p);continue;}','if(e.isDirectory())continue;',['reading payload in an export subdirectory fails','reading payload in exported JSON fails']],
 ['shipping','export JavaScript tree descent','return admit(value,name);}ts.forEachChild(n,visit);};','return admit(value,name);}};',['reading payload deep in a JavaScript tree fails','reading payload in an export fails even when the source tree is clean']],
 ['core','builds use each tray position once','tray.forEach((piece, i) => { if (!used.includes(i))','tray.forEach((piece, i) => { if (true)',['reading constructions use each tray piece once, up to the box count']],
];
for(const [file,label,before,after,tests] of readingEdges){const original=sources.get(file);if(original.split(before).length!==2)throw new Error('Missing or ambiguous R1a mutation target '+label);custom(file,'R1a '+label,original.replace(before,after),tests);}
// R1a fix 3, app side. The reading boundary is provenance (src/learn/reading/tasks.ts), checked again by every consumer;
// practice credit across the Sail on change; and the no-timer walk and its behavioural host test. Each mutant edits one
// app or test-helper file in a scratch copy of the app and runs the named Vitest cases there. Equivalent mutants are
// named in FIX-REPORT-3, not counted as kills.
const PROVENANCE='tests/sound-boat-provenance.test.tsx',HOSTS='tests/sound-boat-provenance-hosts.test.tsx',UNDO='tests/sound-boat-undo.test.tsx',CLOCK='tests/reading-no-timer.test.ts',FAKE='tests/reading-fake-clock.test.tsx';
const wrapper=readFileSync('src/learn/games/sound-boat/view.tsx','utf8').replace('  sound,\n  soundOn,\n  width,\n  height,\n  active,\n  coach,','  sound: originalSound,\n  soundOn,\n  width,\n  height,\n  active,\n  coach,').replace('    complete = boatComplete(s);\n\n  // Say each new word.','    complete = boatComplete(s);\n\n  const latest = useRef(s); latest.current = s;\n  function sound(...args: Parameters<typeof originalSound>) { originalSound(...args); update(boatMove(latest.current, {type: "next"})); }\n\n  // Say each new word.');
const appEdges=[
 ['src/learn/reading/tasks.ts','minted set membership','made.has(task)','true',[PROVENANCE],'refused|minted|copied'],
 ['src/learn/reading/tasks.ts','consumer check accepts only minted tasks','  if (isMinted(task)) return true;\n','  return true;\n',[PROVENANCE],'refused|development'],
 ['src/learn/reading/tasks.ts','development refusal throws','  if (dev()) throw new Error','  if (false) throw new Error',[PROVENANCE],'development|throws|digest'],
 ['src/learn/reading/tasks.ts','minted task frozen','  Object.freeze(t);\n','',[PROVENANCE],'frozen'],
 ['src/learn/reading/tasks.ts','minted pieces frozen','for (const part of [t.tiles, t.tray, ...t.alternates, t.alternates]) Object.freeze(part);','',[PROVENANCE],'frozen'],
 ['src/learn/reading/tasks.ts','minted only from a door','  made.add(t);\n','',[PROVENANCE],'control|frozen'],
 ['src/learn/reading/tasks.ts','inherited digest gate','if (inheritedIssues(inheritedWords, INHERITED_DIGEST).length)','if (false)',[PROVENANCE],'pinned digest'],
 ['src/learn/reading/admitted/index.ts','app loader closed record keys','!Object.keys(w).every((k) => KEYS.includes(k))','false',['tests/reading-parity.test.ts'],'fields shipping refuses'],
 ['src/learn/games/sound-boat/BuildBoat.tsx','word board check','  if (!admittedTask(p.task, "Sound Boat\'s word board")) return <RefusedTask />;\n','',[PROVENANCE],'word board'],
 ['src/learn/games/sound-boat/challenge-view.tsx','Challenge board check','  if (!admittedTask(s.task, "Sound Boat\'s Challenge board")) return <>{header}<RefusedTask />{footer}</>;\n','',[HOSTS],'Challenge board'],
 ['src/learn/games/sound-boat/parts-view.tsx','School parts board check','  if (!admittedTask(task, "Sound Boat\'s word-parts board")) return <RefusedTask />;\n','',[HOSTS],'parts board'],
 ['src/learn/games/sound-boat/parts.ts','round move check','  if (!admittedTask(task, "Sound Boat round")) return s;\n','',[PROVENANCE],'not a valid save'],
 ['src/learn/games/sound-boat/parts.ts','saved round ids admitted','partsTaskById(id)?.level === level','true',['tests/sound-boat-parts.test.ts'],'forged'],
 ['src/learn/games/sound-boat/challenge-engine.ts','replay opens only a minted descriptor','validInitial: (v, task): v is Initial => isMinted(task) && ','validInitial: (v, task): v is Initial => ',[PROVENANCE],'Challenge board'],
 ['src/learn/games/sound-boat/challenge-engine.ts','replay steps only a minted task','if (s.answer.solved || !isMinted(s.task)) return null;','if (s.answer.solved) return null;',[PROVENANCE],'Challenge board'],
 ['src/learn/games/sound-boat/challenge-engine.ts','replay solves only a minted task','solved: s.answer.solved && isMinted(s.task),','solved: s.answer.solved,',[PROVENANCE],'Challenge board'],
 ['src/learn/games/sound-boat/challenge-engine.ts','replay create check','    admittedTask(task, "Sound Boat Challenge");\n','',[PROVENANCE],'development it throws'],
 ['src/learn/games/sound-boat/challenge-content.ts','puzzles only from minted tasks','const minted = tasks.filter((t) => admittedTask(t, "Sound Boat Challenge puzzles"));','const minted = tasks;',[PROVENANCE],'Challenge puzzle'],
 ['src/learn/games/sound-boat/view.tsx','Sail on credits only a pending word','const credit = a.type === "next" && boatCredit(s) === "pending";','const credit = a.type === "next";',[UNDO],'older'],
 ['src/learn/games/sound-boat/view.tsx','the round moves on before the credit','    update(next);\n    if (credit) practice(word.skill, !s.assisted);','    if (credit) practice(word.skill, !s.assisted);\n    update(next);',[UNDO],'fresh play'],
 ['src/learn/games/sound-boat/engine.ts','an unmarked built word was credited','s.credit ?? (boatComplete(s) ? "done" : "pending")','s.credit ?? "pending"',[UNDO],'older'],
 ['src/learn/games/sound-boat/engine.ts','the marker is read before the fallback','s.credit ?? (boatComplete(s) ? "done" : "pending")','(boatComplete(s) ? "done" : "pending")',[UNDO],'fresh play|pending'],
 ['src/learn/games/sound-boat/engine.ts','moves keep the marker','credit: next.index > s.index ? "pending" : boatCredit(s)','credit: "pending"',[UNDO],'older|marker survives'],
 ['src/learn/games/sound-boat/engine.ts','saved marker values','if (marked && v.credit !== "pending" && v.credit !== "done") return false;','',[UNDO],'check the marker'],
 ['tests/helpers/reading-clock.ts','walk reads .mjs and .cjs modules','const SOURCE = /\\.(?:[cm]?[jt]sx?)$/;','const SOURCE = /\\.[jt]sx?$/;',[CLOCK],'mjs'],
 ['tests/helpers/reading-clock.ts','walk resolves an extensionless import to .mjs','const EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs"];','const EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".cjs"];',[CLOCK],'mjs'],
 ['tests/helpers/reading-clock.ts','walk reads platform directory indexes','PLATFORMS.flatMap((p) => EXTENSIONS.map((e) => `/index${p}${e}`))','EXTENSIONS.map((e) => `/index${e}`)',[CLOCK],'mjs'],
 ['tests/helpers/reading-clock.ts','clock aliases are references','        if (CLOCKS.has(n.text) && !calledAs(n)) push("reference", p);\n        else if','        if (false) push("reference", p);\n        else if',[CLOCK],'alias|other than a direct call'],
 ['tests/helpers/reading-clock.ts','computed clock lookups are references','if (ts.isElementAccessExpression(n) && ts.isStringLiteralLike(n.argumentExpression) && (CLOCKS.has(n.argumentExpression.text) || n.argumentExpression.text === "now")) push("reference", n);','',[CLOCK],'other than a direct call'],
 ['tests/helpers/reading-clock.ts','Date aliases are references','else if (n.text === "Date" && !((ts.isNewExpression(p)','else if (false && !((ts.isNewExpression(p)',[CLOCK],'other than a direct call'],
 ['tests/helpers/reading-clock.ts','keys bind the declarations a timer uses','if (!taken.some((t) => contains(t, u))) { taken.push(u); queue.push(u); }','',[CLOCK],'dependency is rewrapped'],
 ['src/learn/games/sound-boat/view.tsx','reviewer wrapper: speech advances the word (behaviour)',null,wrapper,[FAKE],'sound-boat: no word'],
];
const appMutations=[];
for(const [file,label,before,after,tests,pattern] of appEdges){const original=readFileSync(file,'utf8');if(before!==null && original.split(before).length!==2)throw new Error('Missing or ambiguous R1a app mutation target '+label);const source=before===null?after:original.replace(before,after);if(source===original)throw new Error('Unchanged mutant '+label);appMutations.push({file,message:'R1a app '+label,source,tests,pattern});}
for(const m of mutations) {if(m.source===sources.get(m.file))throw new Error('Unchanged mutant '+m.message);if(m.file!=='ci' && ts.createSourceFile(m.file==='morphology'?'mutant.ts':'mutant.mjs',m.source,ts.ScriptTarget.Latest,true,m.file==='morphology'?ts.ScriptKind.TS:ts.ScriptKind.JS).parseDiagnostics.length)throw new Error('Invalid mutant '+m.message);}
const scratch=mkdtempSync(join(tmpdir(),'li-word-mutation-suite-')),toolRoot=join(scratch,'scripts/words'),trace=join(scratch,'trace.jsonl');
mkdirSync(join(scratch,'scripts'),{recursive:true});cpSync('scripts/words',toolRoot,{recursive:true});
const harness=join(scratch,'word-pipeline-regressions.mjs');writeFileSync(harness,readFileSync('tests/helpers/word-pipeline-regressions.mjs'));
process.once('SIGTERM',()=>{rmSync(scratch,{recursive:true,force:true});process.exit(143);});
let failed=0;
try{
 // Freeze all source files for this run.
 for(const [file,source] of sources){let patched=source;for(const p of patches.get(file).sort((a,b)=>b.start-a.start))patched=patched.slice(0,p.start)+`(${source.slice(p.start,p.end)} || (globalThis.__wordRecordGate?.(${p.id}), false))`+patched.slice(p.end);writeFileSync(join(toolRoot,toolFile(file)),patched);}
 const run=(env,pattern)=>spawnSync(process.execPath,['--test',...(pattern?['--test-name-pattern',pattern]:[]),harness],{encoding:'utf8',env:{...process.env,...env,WORD_TEST_TOOL_ROOT:resolve(toolRoot),WORD_TEST_WORKFLOW_FILE:join(toolRoot,'ci.mjs'),WORD_TEST_PREVIEW_FILE:join(toolRoot,'preview.mjs'),WORD_TEST_MORPHOLOGY_FILE:join(toolRoot,'morphology.ts')},timeout:process.env.LITTLE_ISLAND_SLOW_HOST==='1'?300000:120000,maxBuffer:8*1024*1024});
 const baseline=run({WORD_MUTATION_TRACE:trace});
 if(baseline.status!==0){console.error(baseline.stdout+baseline.stderr);throw new Error('Instrumented unmutated baseline must pass');}
 for(const [file,source] of sources)writeFileSync(join(toolRoot,toolFile(file)),source);
 const coverage=new Map();for(const line of readFileSync(trace,'utf8').trim().split('\n')){const {id,test}=JSON.parse(line);if(!coverage.has(id))coverage.set(id,new Set());coverage.get(id).add(test);}
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');let count=0;
 for(const m of mutations){if(process.argv[2] && !`${m.file} ${m.message}`.includes(process.argv[2]))continue;count++;
  const tests=m.tests??[...(coverage.get(m.coverageOf??m.id)??[])];
  writeFileSync(join(toolRoot,toolFile(m.file)),m.source);
  const r=run({},tests.length?`^(?:${tests.map(escape).join('|')})$`:undefined);
  writeFileSync(join(toolRoot,toolFile(m.file)),sources.get(m.file));
  const killed=r.status!==0 && r.status!==null;failed+=!killed;
  console.log(JSON.stringify({id:m.id,file:m.file,message:m.message,tests,killed,status:r.status}));
 }
 // App mutants run in a scratch copy of the app with the real dependencies linked in, never in the working tree.
 const wanted=appMutations.filter(m=>!process.argv[2] || `${m.file} ${m.message}`.includes(process.argv[2]));
 if(wanted.length){
  const app=join(scratch,'app');mkdirSync(app);
  for(const dir of ['src','tests','content','scripts'])cpSync(dir,join(app,dir),{recursive:true});
  for(const file of ['package.json','tsconfig.json','vitest.config.mts','app.json','app.config.js'])if(existsSync(file))cpSync(file,join(app,file));
  for(const dir of ['node_modules','assets','modules'])if(existsSync(dir))symlinkSync(resolve(dir),join(app,dir));
  const vitest=(files,pattern)=>spawnSync(process.execPath,[resolve('node_modules/vitest/vitest.mjs'),'run','--reporter=dot',...files,...(pattern?['-t',pattern]:[])],{cwd:app,encoding:'utf8',env:{...process.env,CI:'1'},timeout:process.env.LITTLE_ISLAND_SLOW_HOST==='1'?600000:240000,maxBuffer:16*1024*1024});
  // Each mutant's own selection must run and pass unmutated, so a kill is never a pattern that matched nothing.
  const passed=r=>r.status===0 && /Tests\s+\d+ passed/.test(r.stdout+r.stderr) && !/\d+ failed/.test(r.stdout+r.stderr);
  for(const key of new Set(wanted.map(m=>JSON.stringify([m.tests,m.pattern])))){const [files,pattern]=JSON.parse(key),base=vitest(files,pattern);if(!passed(base)){console.error(base.stdout+base.stderr);throw new Error('Unmutated app baseline must pass: '+key);}}
  for(const m of wanted){count++;
   const target=join(app,m.file),original=readFileSync(target,'utf8');writeFileSync(target,m.source);
   const r=vitest(m.tests,m.pattern);writeFileSync(target,original);
   const killed=r.status!==0 && r.status!==null && /\d+ failed/.test(r.stdout+r.stderr);failed+=!killed;
   console.log(JSON.stringify({file:m.file,message:m.message,tests:m.tests,pattern:m.pattern,killed,status:r.status}));
  }
 }
 console.log(JSON.stringify({mutations:count,killed:count-failed,survived:failed,app:wanted.length}));process.exitCode=failed?1:0;
}finally{rmSync(scratch,{recursive:true,force:true});}
