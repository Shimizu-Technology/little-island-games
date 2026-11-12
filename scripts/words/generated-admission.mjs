import { existsSync, readFileSync, readdirSync, lstatSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { spawnSync } from 'node:child_process';
import { digest, requireThat, sha256 } from './core.mjs';
import { privatePath } from './paths.mjs';
import { normalizedText, wordTokens } from './density.mjs';

// Output tables cannot supply their own admission. Keep this inventory explicit;
// new generators must register their authored inputs and call admitGenerated.
const outputPath = /(?:\.generated\.|^src\/content\/(?:neuralAudio|audioSources|learnAudio\/)|^content\/pictures\/(?!README)|^content\/words\/|^content\/library\/search-index\.json$|^scripts\/learn\/(?:growth|arcade)\.json$)/;
const authoredRoots=['src','content/library','scripts/learn','scripts/art/pictures/defs'];
const authoredFiles=['scripts/explore-audio.json','scripts/lab-audio.json','scripts/quality-audio.json','scripts/arcade-speech.json','scripts/generate-audio.py'];
export const generatorInventory=[
  {id:'speech',paths:['src/content/audioSources.ts','src/content/neuralAudio.ts','src/content/learnAudio'],scripts:['scripts/generate-audio.py','scripts/generate-neural-audio.py','scripts/export-growth-audio.ts','scripts/export-arcade-audio.py']},
  {id:'pictures',paths:['src/content/pictures/assets.generated.ts','content/pictures/manifest.json'],scripts:['scripts/art/pictures/build.mjs','scripts/art/pictures/allowlist.mjs']},
  {id:'library',paths:['src/library/catalog.generated.json','src/library/assets.generated.ts','src/library/speech.generated.ts'],scripts:['scripts/library/build-index.mjs']},
  {id:'banks',paths:['content/words/banks'],scripts:['scripts/words/cli.mjs','scripts/words/bake.mjs','scripts/words/registry.mjs']},
];
function walk(root,path,visit) {
  if(!existsSync(path))return;
  requireThat(!lstatSync(path).isSymbolicLink(),'Symlink in generated admission source');
  if(lstatSync(path).isDirectory())for(const e of readdirSync(path))walk(root,join(path,e),visit);
  else if(/\.(?:[cm]?[jt]sx?|json|py)$/.test(path))visit(relative(root,path).replaceAll('\\','/'),readFileSync(path));
}
function literals(text,name) {
  if(/\.py$/.test(name)) {
    const result=spawnSync('python3',['-c',"import ast,json,sys; print(json.dumps([n.value for n in ast.walk(ast.parse(sys.stdin.read())) if isinstance(n,ast.Constant) and isinstance(n.value,str)]))"],{input:text,encoding:'utf8'});requireThat(result.status===0,'Cannot parse authored speech literals');return JSON.parse(result.stdout);
  }
  if(/\.json$/.test(name)) {
    const out=[];function visit(v){if(typeof v==='string')out.push(v);else if(v && typeof v==='object')for(const [key,value] of Object.entries(v)){if(!Array.isArray(v))out.push(key);visit(value);}}visit(JSON.parse(text));return out;
  }
  const tree=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true,/tsx$/.test(name)?ts.ScriptKind.TSX:ts.ScriptKind.TS),out=[];
  function visit(n){if(ts.isStringLiteralLike(n) && n.parent?.name===n)return;if(ts.isStringLiteralLike(n) && (ts.isImportDeclaration(n.parent) || ts.isExportDeclaration(n.parent) || ts.isCallExpression(n.parent) && (n.parent.expression.getText(tree)==='require' || n.parent.expression.kind===ts.SyntaxKind.ImportKeyword)))return;if(ts.isStringLiteralLike(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || ts.isJsxText(n))out.push(n.text);ts.forEachChild(n,visit);}visit(tree);return out;
}
export function admissionSources(root) {
  root=resolve(root);const words=new Map(),exact=new Map(),files=[];
  function add(path,bytes,values) {
    const source={path,sha256:sha256(bytes)};files.push(source);
    for(const value of values){const audio=value.match(/(?:^|\/)assets\/audio\/(?:calm\/)?([^/]+)\.m4a$/);if(audio && !exact.has(normalizedText(audio[1])))exact.set(normalizedText(audio[1]),source);const key=normalizedText(value);if(path==='content/words/legacy-word-rescue.ts' && /^[A-Z]+$/.test(value))exact.set('CLUE-'+key,source);if(!exact.has(key))exact.set(key,source);for(const word of [...wordTokens(value),...(normalizedText(value).match(/\p{N}+/gu)??[])])if(!words.has(word))words.set(word,source);}
  }
  for(const path of [...authoredRoots,...authoredFiles])walk(root,join(root,path),(name,bytes)=>{
    if(!/\.(?:[cm]?[jt]sx?|json|py)$/.test(name) || outputPath.test(name))return;
    add(name,bytes,literals(bytes.toString('utf8'),name));
  });
  // The inherited admitted bank is frozen by shipping.mjs as well as here.
  const legacy='content/words/legacy-word-rescue.ts';
  if(existsSync(join(root,legacy))) {
    const bytes=readFileSync(join(root,legacy));requireThat(sha256(bytes)==='973258bfb54566a992c340c5647f12cd8ff801d1fbbcb722efffbb60a0c8f3d6','Unadmitted inherited source');add(legacy,bytes,literals(bytes.toString('utf8'),legacy));
  }
  const manifest=join(root,'content/words/banks.manifest.json');
  if(existsSync(manifest))for(const bank of JSON.parse(readFileSync(manifest,'utf8')).banks) {
    requireThat(/^content\/words\/banks\/[^/]+\.json$/.test(bank.path),'Invalid admission bank path');const bytes=readFileSync(join(root,bank.path));requireThat(sha256(bytes)===bank.sha256,'Stale admitted bank');
    const data=JSON.parse(bytes);add(bank.path,bytes,[...data.words.map(w=>w.spelling),...data.accept]);
  }
  for(const name of ['growth','arcade']) {
    const path=`scripts/learn/${name}.json`;if(!existsSync(join(root,path)))continue;
    const bytes=readFileSync(join(root,path)),manifest=JSON.parse(bytes);
    for(const [key,text] of Object.entries(manifest)) {
      requireThat(typeof text==='string' && wordTokens(text).every(word=>words.has(word)), 'Speech manifest has no authored token source: '+name+' '+wordTokens(text).filter(word=>!words.has(word)).map(word=>word.length+':'+sha256(word).slice(0,10)).join(','));
      requireThat(!/^\p{L}+$/u.test(key) || wordTokens(text).includes(normalizedText(key)), 'Word speech key differs from admitted transcript');
    }
    add(path,bytes,Object.keys(manifest));
  }
  return {words,exact,files,sourceSha256:digest(files)};
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
    rows.push({word:key,source});
  }
  return {schemaVersion:1,generator,entries:rows,sourceSha256:sources.sourceSha256};
}
export function wordMapKeys(text,name='artifact.js') {
  const keys=[];
  if(/\.json$/.test(name)) {
    function visit(v){if(!v || typeof v!=='object')return;if(!Array.isArray(v)){const names=Object.keys(v);if(names.length>=3 && names.every(n=>/^\p{L}+$/u.test(n)) && Object.values(v).every(x=>x && typeof x==='object' || typeof x==='string' && /\.(?:m4a|mp3|wav|png|svg)$/.test(x)))keys.push(...names);}Object.values(v).forEach(visit);}visit(JSON.parse(text));return keys;
  }
  const tree=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true);
  function visit(n){if(ts.isObjectLiteralExpression(n) && n.properties.length>=3 && n.properties.every(p=>ts.isPropertyAssignment(p) && (ts.isStringLiteralLike(p.name)||ts.isIdentifier(p.name)) && /^\p{L}+$/u.test(p.name.text) && (ts.isCallExpression(p.initializer) || ts.isObjectLiteralExpression(p.initializer) || ts.isStringLiteralLike(p.initializer) && /\.(?:m4a|mp3|wav|png|svg)$/.test(p.initializer.text))))keys.push(...n.properties.map(p=>p.name.text));ts.forEachChild(n,visit);}visit(tree);return keys;
}
export function generatedReceipts(root,sources=admissionSources(root)) {
  const receipts=[];
  for(const generator of generatorInventory) {
    const entries=[];
    for(const path of generator.paths)walk(root,join(root,path),(name,bytes)=>{
      if(/\.[cm]?[jt]s$/.test(name)) {
        const text=bytes.toString('utf8');
        // require-table keys include ids and paths, as well as bare words.
        for(const m of text.matchAll(/["']([^"'\n]+)["']\s*:\s*(?:\(\)\s*=>\s*)?(?:require\(|libraryAssets\[)/g))entries.push(m[1]);
      } else if(name==='content/pictures/manifest.json')entries.push(...JSON.parse(bytes).pictures.map(p=>p.word));
      else if(name==='src/library/catalog.generated.json') {
        // Item-bound phonetic derivation is independently checked by library-source.
        const catalog=JSON.parse(bytes);for(const item of catalog.index??[])entries.push(...(item.terms??[]));
      } else if(/^content\/words\/banks\//.test(name))entries.push(...JSON.parse(bytes).words.map(w=>w.spelling));
    });
    // Paths are identifiers. Their exact authored literal must supply provenance.
    // Module paths are derived from an admitted audio key or authored asset path.
    const resolved=entries.map(entry=>{
      if(sources.exact.has(normalizedText(entry)) || sources.words.has(normalizedText(entry)))return entry;
      const audio=entry.match(/(?:^|\/)assets\/audio\/(?:calm\/)?([^/]+)\.m4a$/);
      return audio?audio[1]:entry;
    });
    receipts.push(admitGenerated(root,generator.id,[...new Set(resolved)],sources));
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
