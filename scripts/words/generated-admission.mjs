import { Buffer } from 'node:buffer';
import { existsSync, readFileSync, readdirSync, lstatSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { spawnSync } from 'node:child_process';
import { digest, requireThat, sha256, readingStrings } from './core.mjs';
import { privatePath } from './paths.mjs';
import { libraryNormalize } from './artifact-views.mjs';
import { normalizedText, wordTokens } from './density.mjs';

// Output tables cannot supply their own admission. Keep this inventory explicit;
// new generators must register their authored inputs and call admitGenerated.
const outputPath = /(?:\.generated\.|^src\/content\/(?:neuralAudio|audioSources|learnAudio\/)|^content\/pictures\/(?!README)|^content\/words\/|^content\/library\/search-index\.json$|^scripts\/learn\/(?:growth|arcade)\.json$)/;
const authoredRoots=['src'];
const authoredFiles=['content/library/items.json','content/library/search-aliases.json'];
export const speechFiles=['scripts/explore-audio.json','scripts/lab-audio.json','scripts/quality-audio.json','scripts/arcade-speech.json'];
export const generatorInventory=[
  {id:'speech',paths:['src/content/audioSources.ts','src/content/neuralAudio.ts','src/content/learnAudio'],scripts:['scripts/generate-audio.py','scripts/generate-neural-audio.py','scripts/export-growth-audio.ts','scripts/export-arcade-audio.py']},
  {id:'pictures',paths:['src/content/pictures/assets.generated.ts','content/pictures/manifest.json'],scripts:['scripts/art/pictures/build.mjs','scripts/art/pictures/allowlist.mjs']},
  {id:'library',paths:['src/library/catalog.generated.json','src/library/assets.generated.ts','src/library/speech.generated.ts'],scripts:['scripts/library/build-index.mjs']},
  {id:'puzzles',paths:['src/content/puzzles/assets'],scripts:['scripts/puzzles/pipeline.ts'],rule:'Word families must admit decoded answers before publishing any pack.'},
  {id:'banks',paths:['content/words/banks'],scripts:['scripts/words/cli.mjs','scripts/words/bake.mjs','scripts/words/bake-reading.mjs','scripts/words/registry.mjs']},
];
// Lead contract change: W1 reading records. A bank supplies the text its runtime projection shows, read by its
// manifest kind: Word Search spellings and accepted answers, or every string a reading record can show.
export function bankVocabulary(kind,data) {
  if((kind ?? 'words')==='reading-parts') {
    requireThat(data?.kind==='reading-parts' && Array.isArray(data.words),'Reading bank differs from its manifest kind');
    return data.words.flatMap(readingStrings);
  }
  requireThat(data?.kind===undefined && Array.isArray(data?.words) && Array.isArray(data.accept),'Word bank differs from its manifest kind');
  return [...data.words.map(w=>w.spelling),...data.accept];
}
function bankKinds(root) {
  const manifest=join(root,'content/words/banks.manifest.json');
  return new Map(existsSync(manifest)?JSON.parse(readFileSync(manifest,'utf8')).banks.map(b=>[b.path,b.kind]):[]);
}
function walk(root,path,visit) {
  if(!existsSync(path))return;
  requireThat(!lstatSync(path).isSymbolicLink(),'Symlink in generated admission source');
  if(lstatSync(path).isDirectory())for(const e of readdirSync(path))walk(root,join(path,e),visit);
  else if(/\.(?:[cm]?[jt]sx?|json|py)$/.test(path))visit(relative(root,path).replaceAll('\\','/'),readFileSync(path));
}
function literals(text,name) {
  if(/\.json$/.test(name)) {
    const out=[];function visit(v){if(typeof v==='string')out.push(v);else if(v && typeof v==='object')for(const [key,value] of Object.entries(v)){if(!Array.isArray(v))out.push(key);visit(value);}}visit(JSON.parse(text));return out;
  }
  const tree=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true,/tsx$/.test(name)?ts.ScriptKind.TSX:ts.ScriptKind.TS),out=[];
  function visit(n){if(ts.isStringLiteralLike(n) && n.parent?.name===n)return;if(ts.isStringLiteralLike(n) && (ts.isImportDeclaration(n.parent) || ts.isExportDeclaration(n.parent) || ts.isCallExpression(n.parent) && (n.parent.expression.getText(tree)==='require' || n.parent.expression.kind===ts.SyntaxKind.ImportKeyword)))return;if(ts.isStringLiteralLike(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || ts.isJsxText(n))out.push(n.text);ts.forEachChild(n,visit);}visit(tree);return out;
}
// Expo Router's entry imports the route context; each route module is an entry.
// Follow runtime imports/exports, literal require and dynamic import edges only.
export function reachableAppModules(root) {
  const seen=new Set(),queue=[];
  const packagePath=join(root,'package.json');
  const main=existsSync(packagePath)?JSON.parse(readFileSync(packagePath,'utf8')).main:undefined;
  function enqueue(path) {
    const suffixes=['','.ios.tsx','.native.tsx','.web.tsx','.tsx','.ios.ts','.native.ts','.web.ts','.ts','.jsx','.js','.mjs','.cjs','.json','/index.tsx','/index.ts','/index.js'];
    for(const suffix of suffixes) {
      const candidate=resolve(path+suffix);
      if(!candidate.startsWith(resolve(root)+'/') || !existsSync(candidate))continue;
      requireThat(!lstatSync(candidate).isSymbolicLink(),'Symlink in generated admission source');
      if(lstatSync(candidate).isFile() && /\.(?:[cm]?[jt]sx?|json)$/.test(candidate) && !seen.has(candidate)){seen.add(candidate);queue.push(candidate);}
    }
  }
  if(main && main!=='expo-router/entry')enqueue(join(root,main));
  else walk(root,join(root,'src/app'),name=>enqueue(join(root,name)));
  for(let i=0;i<queue.length;i++) {
    const path=queue[i];if(/\.json$/.test(path))continue;
    const tree=ts.createSourceFile(path,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true);
    function edge(dep) {
      if(dep.startsWith('.'))enqueue(resolve(path,'..',dep));
      else if(dep.startsWith('@/'))enqueue(join(root,'src',dep.slice(2)));
    }
    function visit(n) {
      if((ts.isImportDeclaration(n) && !n.importClause?.isTypeOnly || ts.isExportDeclaration(n) && !n.isTypeOnly) && n.moduleSpecifier && ts.isStringLiteralLike(n.moduleSpecifier))edge(n.moduleSpecifier.text);
      if(ts.isImportEqualsDeclaration(n) && !n.isTypeOnly && ts.isExternalModuleReference(n.moduleReference) && ts.isStringLiteralLike(n.moduleReference.expression))edge(n.moduleReference.expression.text);
      if(ts.isCallExpression(n) && (n.expression.kind===ts.SyntaxKind.ImportKeyword || ts.isIdentifier(n.expression) && n.expression.text==='require') && ts.isStringLiteralLike(n.arguments[0]))edge(n.arguments[0].text);
      ts.forEachChild(n,visit);
    }
    visit(tree);
  }
  return new Set([...seen].map(path=>relative(root,path).replaceAll('\\','/')));
}
export function admissionSourceFiles(root) {
  const files=new Map();
  for(const path of [...authoredRoots,...authoredFiles,'scripts/learn',...speechFiles,'scripts/generate-audio.py'])walk(root,join(root,path),(name,bytes)=>{if(!outputPath.test(name))files.set(name,bytes);});
  return files;
}
export function speechInputs(root) {
  const inputs=[];
  for(const path of ['scripts/learn',...speechFiles])walk(root,join(root,path),(name,bytes)=>{
    if(!/\.json$/.test(name))return;
    const value=JSON.parse(bytes);
    requireThat(value && !Array.isArray(value) && typeof value==='object' && Object.values(value).every(text=>typeof text==='string'),'Invalid speech input map');
    inputs.push({path:name,bytes,entries:Object.entries(value)});
  });
  const path='scripts/generate-audio.py';
  if(existsSync(join(root,path))) {
    const bytes=readFileSync(join(root,path));
    const result=spawnSync('python3',['-c',"import ast,json,sys; t=ast.parse(sys.stdin.read()); print(json.dumps([(k.value,v.value) for n in ast.walk(t) if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute) and isinstance(n.func.value,ast.Name) and n.func.value.id=='speech' and n.func.attr=='update' for d in n.args if isinstance(d,ast.Dict) for k,v in zip(d.keys,d.values) if isinstance(k,ast.Constant) and isinstance(k.value,str) and isinstance(v,ast.Constant) and isinstance(v.value,str)]))"],{input:bytes,encoding:'utf8'});
    requireThat(result.status===0,'Cannot parse authored speech literals');
    inputs.push({path,bytes,entries:JSON.parse(result.stdout)});
  }
  return inputs;
}
export function vocabularySources(root) {
  root=resolve(root);const words=new Map(),exact=new Map(),files=[],reachable=reachableAppModules(root);
  function add(path,bytes,values) {
    const source={path,sha256:sha256(bytes)};files.push(source);
    for(const value of values){const audio=value.match(/(?:^|\/)assets\/audio\/(?:calm\/)?([^/]+)\.m4a$/);if(audio && !exact.has(normalizedText(audio[1])))exact.set(normalizedText(audio[1]),source);const key=normalizedText(value);if(path==='content/words/legacy-word-rescue.ts' && /^[A-Z]+$/.test(value))exact.set('CLUE-'+key,source);if(!exact.has(key))exact.set(key,source);for(const word of [...wordTokens(value),...(normalizedText(value).match(/\p{N}+/gu)??[])])if(!words.has(word))words.set(word,source);}
  }
  for(const path of [...authoredRoots,...authoredFiles])walk(root,join(root,path),(name,bytes)=>{
    if(!/\.(?:[cm]?[jt]sx?|json|py)$/.test(name) || outputPath.test(name))return;
    if(name.startsWith('src/') && !reachable.has(name))return;
    add(name,bytes,literals(bytes.toString('utf8'),name));
  });
  const allowlist='content/pictures/allowlist.json';
  if(existsSync(join(root,allowlist))) {
    const bytes=readFileSync(join(root,allowlist)),value=JSON.parse(bytes);
    requireThat(value.schemaVersion===1 && value.words && !Array.isArray(value.words),'Invalid picture vocabulary allowlist');
    add(allowlist,bytes,Object.keys(value.words));
  }
  // The inherited admitted bank is frozen by shipping.mjs as well as here.
  const legacy='content/words/legacy-word-rescue.ts';
  if(existsSync(join(root,legacy))) {
    const bytes=readFileSync(join(root,legacy));requireThat(sha256(bytes)==='973258bfb54566a992c340c5647f12cd8ff801d1fbbcb722efffbb60a0c8f3d6','Unadmitted inherited source');add(legacy,bytes,literals(bytes.toString('utf8'),legacy));
  }
  const manifest=join(root,'content/words/banks.manifest.json');
  if(existsSync(manifest))for(const bank of JSON.parse(readFileSync(manifest,'utf8')).banks) {
    requireThat(/^content\/words\/banks\/[^/]+\.json$/.test(bank.path),'Invalid admission bank path');const bytes=readFileSync(join(root,bank.path));requireThat(sha256(bytes)===bank.sha256,'Stale admitted bank');
    add(bank.path,bytes,bankVocabulary(bank.kind,JSON.parse(bytes)));
  }
  return {words,exact,files,sourceSha256:digest(files)};
}
// Hash-only snapshot read from the published main commit, never generated from
// this branch's speech inputs. The pinned digest freezes both key and transcript.
function inheritedSpeech(root) {
  const path=join(root,'scripts/words/published-speech.json');
  if(!existsSync(path))return [];
  const bytes=readFileSync(path);
  requireThat(sha256(bytes)==='bd25e81a40284b327b92b0f3499fd21564340614fec34ddd5e9b75091df9bddb','Changed frozen published speech bank');
  return JSON.parse(bytes).entries;
}
export function admissionSources(root) {
  root=resolve(root);
  const {words,exact,files}=vocabularySources(root),inherited=inheritedSpeech(root),inheritedEntries=[],inheritedWords=new Map();
  // Vocabulary must trace to the admitted banks or reachable authored app text.
  // Sentence transcripts are authored prose, never a token source for other entries.
  for(const {path,bytes,entries} of speechInputs(root)) {
    const source={path,sha256:sha256(bytes)};files.push(source);
    for(const [key,text] of entries) {
      const tokens=wordTokens(text),single=!/\s/.test(text.trim()) || tokens.length===1;
      const keyWord=key.match(/^(?:spell-)?(\p{L}+)$/u)?.[1];
      const published=single && inherited.find(row=>row.path===path && row.keySha256===sha256(key) && row.transcriptSha256===sha256(text));
      if(published && !tokens.every(word=>words.has(word)))inheritedEntries.push({path,keySha256:sha256(key),transcriptSha256:sha256(text),sourceSha256:published.sourceSha256});
      if(single || /(?:growth|arcade)\.json$/.test(path))requireThat(!!published || tokens.every(word=>words.has(word)),'Speech manifest has no authored token source: '+sha256(path)+':'+sha256(key));
      if(keyWord)requireThat(!!published || words.has(normalizedText(keyWord)) && tokens.includes(normalizedText(keyWord)), 'Word speech key differs from admitted transcript');
      if(published)for(const word of tokens)inheritedWords.set(word,{path:'published:0f428c2fef43a821bbea782823f7548b5d514971:'+path,sha256:published.sourceSha256});
      // Add identifiers only after validation. Do not add transcript tokens.
      exact.set(normalizedText(key),published?{path:'published:0f428c2fef43a821bbea782823f7548b5d514971:'+path,sha256:published.sourceSha256}:source);
    }
  }
  // Donate only frozen transcript vocabulary, after every entry was validated
  // against independent sources. A key can never donate its own components.
  for(const [word,source] of inheritedWords)if(!words.has(word))words.set(word,source);
  return {words,exact,files,inheritedEntries,sourceSha256:digest(files)};
}
export function admitGenerated(root,generator,entries,sources=admissionSources(root)) {
  requireThat(generatorInventory.some(row=>row.id===generator),'Unknown word generator');
  const rows=[];
  for(const entry of entries) {
    requireThat(typeof entry==='string' && entry.trim().length>0,'Invalid generated word');
    const key=normalizedText(entry),source=sources.exact.get(key)??sources.words.get(key);
    // Multi-word/id entries must themselves be authored; joining arbitrary tokens
    // from unrelated files cannot mint a new key or file name.
    requireThat(!!source,'Generated word has no admitted authored source: '+generator+' '+entry.length+':'+sha256(entry).slice(0,10));
    // Preserve camelCase boundaries for the policy-aware identifier token check.
    rows.push({word:key,identifier:entry,source});
  }
  return {schemaVersion:1,generator,entries:rows,inheritedSpeechCount:sources.inheritedEntries?.length??0,sourceSha256:sources.sourceSha256};
}
// Library search normalization differs from display-word tokenization (notably
// camelCase). Bind derived search tokens to that exact authored item, not a pool.
export function admitLibraryIndex(root,index,sources=admissionSources(root),activeIds=null) {
  const path='content/library/items.json',file=join(root,path),bytes=existsSync(file)?readFileSync(file):Buffer.from('[]'),items=JSON.parse(bytes),entries=[];
  function strings(value){if(typeof value==='string')return [value];if(value && typeof value==='object')return Object.entries(value).filter(([key])=>!['terms','sounds'].includes(key)).flatMap(([,child])=>strings(child));return [];}
  for(const row of index) {
    const item=items.find(item=>item.id===row.id && (!activeIds || activeIds.includes(item.id))),tokens=new Set(item?strings(item).flatMap(text=>libraryNormalize(text).split(' ')):[]);
    for(const term of row.terms??[]) {
      requireThat(!item || tokens.has(term),'Library search token has no source in its authored item');
      if(item)entries.push({word:normalizedText(term),itemId:row.id,source:{path,sha256:sha256(bytes)}});
      else entries.push(...admitGenerated(root,'library',[term],sources).entries);
    }
  }
  return {schemaVersion:1,generator:'library',entries,inheritedSpeechCount:sources.inheritedEntries?.length??0,sourceSha256:sources.sourceSha256};
}
export function wordMapKeys(text,name='artifact.js') {
  const keys=[];
  if(/\.json$/.test(name)) {
    function visit(v){if(!v || typeof v!=='object')return;if(!Array.isArray(v)){const names=Object.keys(v);if(names.length>=3 && Object.values(v).every(x=>x && typeof x==='object' || typeof x==='string') && !Object.values(v).every(x=>typeof x==='string' && /^#[a-f0-9]{3,8}$/i.test(x)))keys.push(...names);}Object.values(v).forEach(visit);}visit(JSON.parse(text));return keys;
  }
  const tree=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true);
  function visit(n){if(ts.isObjectLiteralExpression(n) && n.properties.length>=3 && n.properties.every(p=>ts.isPropertyAssignment(p) && (ts.isStringLiteralLike(p.name)||ts.isIdentifier(p.name)) && (ts.isCallExpression(p.initializer) || ts.isArrowFunction(p.initializer) || ts.isFunctionExpression(p.initializer) || ts.isObjectLiteralExpression(p.initializer) || ts.isStringLiteralLike(p.initializer))) && !n.properties.every(p=>ts.isStringLiteralLike(p.initializer) && /^#[a-f0-9]{3,8}$/i.test(p.initializer.text)))keys.push(...n.properties.map(p=>p.name.text));ts.forEachChild(n,visit);}visit(tree);return keys;
}
export function generatedReceipts(root,sources=admissionSources(root)) {
  const receipts=[],kinds=bankKinds(root);
  for(const generator of generatorInventory) {
    const entries=[];let libraryIndex,libraryActiveIds;
    for(const path of generator.paths)walk(root,join(root,path),(name,bytes)=>{
      if(/\.[cm]?[jt]s$/.test(name)) {
        const text=bytes.toString('utf8');
        // require-table keys include ids and paths, as well as bare words.
        for(const m of text.matchAll(/["']([^"'\n]+)["']\s*:\s*(?:\(\)\s*=>\s*)?(?:require\(|libraryAssets\[)/g))entries.push(m[1]);
      } else if(name==='content/pictures/manifest.json')entries.push(...JSON.parse(bytes).pictures.map(p=>p.word));
      else if(name==='src/library/catalog.generated.json') {
        // Item-bound phonetic derivation is independently checked by library-source.
        const catalog=JSON.parse(bytes);libraryIndex=catalog.index??[];libraryActiveIds=(catalog.items??[]).map(item=>item.id);
      } else if(/^content\/words\/banks\//.test(name)) {
        // Kind-checked: a reading bank's entries are its shown strings, a word bank's its spellings.
        const kind=kinds.get(name),data=JSON.parse(bytes),shown=bankVocabulary(kind,data);
        entries.push(...((kind ?? 'words')==='reading-parts'?shown:data.words.map(w=>w.spelling)));
      }
    });
    // Paths are identifiers. Their exact authored literal must supply provenance.
    // Module paths are derived from an admitted audio key or authored asset path.
    const resolved=entries.map(entry=>{
      if(sources.exact.has(normalizedText(entry)) || sources.words.has(normalizedText(entry)))return entry;
      const audio=entry.match(/(?:^|\/)assets\/audio\/(?:calm\/)?([^/]+)\.m4a$/);
      return audio?audio[1]:entry;
    });
    receipts.push(generator.id==='library' && libraryIndex?admitLibraryIndex(root,libraryIndex,sources,libraryActiveIds):admitGenerated(root,generator.id,[...new Set(resolved)],sources));
  }
  return receipts;
}
// CLI receives data on stdin; failures contain no entry text.
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const entries=JSON.parse(readFileSync(0,'utf8'));
    const receipt=admitGenerated(process.cwd(),process.argv[2],entries);
    if(process.argv[3])writeFileSync(privatePath(process.argv[3]),JSON.stringify(receipt)+'\n',{flag:'wx',mode:0o600});
    console.log(JSON.stringify({passed:true,entries:receipt.entries.length}));
  } catch {console.error('Generated word admission failed');process.exitCode=1;}
}
