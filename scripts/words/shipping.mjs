import { existsSync, readFileSync, readdirSync, lstatSync } from 'node:fs';
import { resolve, join, relative, posix } from 'node:path';
import ts from 'typescript';
import { digest, requireThat, sha256 } from './core.mjs';
import { bakeBank } from './bake.mjs';
import { registrySource } from './registry.mjs';

function dependencies(source,path) {
  const tree=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true),found=[];
  function visit(n) {
    if ((ts.isImportDeclaration(n)||ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteralLike(n.moduleSpecifier)) found.push(n.moduleSpecifier.text);
    if (ts.isImportEqualsDeclaration(n) && ts.isExternalModuleReference(n.moduleReference) && n.moduleReference.expression && ts.isStringLiteralLike(n.moduleReference.expression)) found.push(n.moduleReference.expression.text);
    if (ts.isCallExpression(n) && (n.expression.kind===ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text==='require') || (ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression) && n.expression.expression.text==='require' && ['context','resolve'].includes(n.expression.name.text)))) {
      requireThat(n.arguments.length>0 && ts.isStringLiteralLike(n.arguments[0]),`Unverifiable app dependency: ${path}`);
      found.push(n.arguments[0].text);
    }
    ts.forEachChild(n,visit);
  }
  visit(tree);return found.map(d=>posix.normalize(d.replaceAll('\\','/')));
}
function safeAsset(asset) {
  requireThat(asset?.schemaVersion===1 && JSON.stringify(Object.keys(asset).sort())===JSON.stringify(['accept','clues','schemaVersion','surfaces','words']) && Array.isArray(asset.words) && asset.words.length>0 && Array.isArray(asset.clues) && Array.isArray(asset.surfaces) && asset.surfaces.length>0 && Array.isArray(asset.accept),'Invalid word bank shape');
  const keys=(value,allowed,required=allowed)=>value && typeof value==='object' && !Array.isArray(value) && Object.keys(value).every(k=>allowed.includes(k)) && required.every(k=>k in value);
  const text=v=>typeof v==='string' && v.trim().length>0;
  const band=v=>Number.isInteger(v) && v>=1 && v<=4;
  const strings=v=>Array.isArray(v) && v.length>0 && v.every(text);
  for(const w of asset.words) requireThat(keys(w,['id','spelling','language','readerLevel','knownBand','readBand','spellBand','clueBand','theme','topic','guamFit','audio','canonicalId','fluentReaderChecked'],['id','spelling','language','readerLevel','knownBand','readBand','spellBand','clueBand','theme','topic','guamFit','audio']) && ['id','spelling','theme','topic'].every(k=>text(w[k])) && ['en','ch'].includes(w.language) && ['Little','Growing','Strong','Grown-up'].includes(w.readerLevel) && ['knownBand','readBand','spellBand','clueBand'].every(k=>band(w[k])) && Number.isFinite(w.guamFit) && w.guamFit>=0 && w.guamFit<=1 && (w.audio===null || text(w.audio)) && (w.language==='ch' ? text(w.canonicalId) && w.fluentReaderChecked===false : w.canonicalId===undefined && w.fluentReaderChecked===undefined),'Private/raw word fields in bank');
  for(const c of asset.clues) requireThat(keys(c,['id','wordId','text']) && ['id','wordId','text'].every(k=>text(c[k])),'Private/raw clue fields in bank');
  const fields={'word-search':['cells','listed'],crossword:['cells'],builder:['cells'],scramble:['shuffle'],wheel:['letters'],matching:[],ladder:[]};
  for(const s of asset.surfaces) {
    requireThat(Object.hasOwn(fields,s.kind) && keys(s,['id','kind','wordIds',...fields[s.kind]]) && text(s.id) && strings(s.wordIds),'Private/raw surface fields in bank');
    if(s.cells!==undefined) requireThat(Array.isArray(s.cells) && s.cells.length>0 && s.cells.every(row=>strings(row) && row.every(c=>c.length<=2)),'Private/invalid surface cells in bank');
    if(s.letters!==undefined || s.shuffle!==undefined) requireThat(text(s.letters??s.shuffle),'Private/invalid surface letters in bank');
    if(s.listed!==undefined) requireThat(Array.isArray(s.listed) && s.listed.every(e=>keys(e,['wordId','answer','cells']) && text(e.wordId) && text(e.answer) && Array.isArray(e.cells) && e.cells.length>0 && e.cells.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isInteger))),'Private/invalid listed path in bank');
  }
  requireThat(asset.accept.every(w=>typeof w==='string' && /^[A-Z]+(?: [A-Z]+)*$/.test(w)),'Invalid bank accept list');
}

// New word data has one admission and loader boundary, regardless of encoding.
function wordData(value,wordLocation=false) {
  if(Array.isArray(value)) return (wordLocation && value.some(v=>typeof v==='string')) || value.some(v=>wordData(v,wordLocation));
  if(!value || typeof value!=='object')return false;
  if('spelling' in value || 'lemma' in value || ('answer' in value && 'text' in value))return true;
  return Object.entries(value).some(([k,v])=>wordData(v,wordLocation || ['words','clues','answers','accept'].includes(k)));
}
export function wordDataFragments(source,path,wordLocation) {
  const tree=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true);const found=[];
  function visit(n) {
    if(ts.isObjectLiteralExpression(n)) {
      const names=n.properties.map(p=>p.name?.getText(tree).replaceAll(/['"]/g,''));
      if((names.includes('spelling') || names.includes('lemma') || (names.includes('answer') && names.includes('text'))) && ts.isArrayLiteralExpression(n.parent))found.push(n.getText(tree));
      if(n.properties.some(p=>ts.isPropertyAssignment(p) && ['words','clues','answers','accept'].includes(p.name.getText(tree).replaceAll(/['"]/g,'')) && ts.isArrayLiteralExpression(p.initializer) && p.initializer.elements.length>0))found.push(n.getText(tree));
    }
    if(wordLocation && ts.isArrayLiteralExpression(n) && n.elements.some(e=>ts.isStringLiteralLike(e)))found.push(n.getText(tree));
    ts.forEachChild(n,visit);
  }
  visit(tree);return found;
}

// Existing reading, science and party inputs are frozen by data fragment, so
// unrelated engine edits do not need new exceptions. No new data is admitted.
const inheritedFragments = {
  "src/learn/content/reading/ladders.ts": "65ddbfc00154cc19a4fa9daa388143a0e061ffd1fdaa46edffc11ff63ba0070b",
  "src/learn/games/tide-pool/engine.ts": "3b675ad5e72330b8b970dddba15bc9b0aaedd0fd3f452a88e6a2e24bf4c1e8dc",
  "src/party/content.ts": "82cd5b9ae9cd02e01749bc2e700303aa1e84cd225fd594e550635772fdd5cdcc"
};

/** Structural admission is supplemented by detached rebake at every shipping gate. */
export function checkShippingTree(root, evidenceDirectory, {full=false}={}) {
  root=resolve(root);const files=[];
  function walk(path) {
    if (!existsSync(path)) return;
    requireThat(!lstatSync(path).isSymbolicLink(),'Symlink in app content tree');
    for(const e of readdirSync(path,{withFileTypes:true})) {
      const p=join(path,e.name);requireThat(!e.isSymbolicLink(),'Symlink in app content tree');
      if(e.isDirectory()) walk(p);else files.push(p);
    }
  }
  for(const dir of ['src','content','assets','modules']) walk(join(root,dir));
  const manifestPath=join(root,'content/words/banks.manifest.json');
  const manifest=existsSync(manifestPath)?JSON.parse(readFileSync(manifestPath,'utf8')):{schemaVersion:1,banks:[]};
  requireThat(manifest.schemaVersion===1 && Array.isArray(manifest.banks) && new Set(manifest.banks.map(b=>b.path)).size===manifest.banks.length,'Invalid word bank manifest');
  const registered=new Map(manifest.banks.map(b=>[b.path,b])),assets=[];
  const registryPath=join(root,'content/words/registry.generated.ts');
  if(registered.size || existsSync(registryPath)) requireThat(existsSync(registryPath) && readFileSync(registryPath,'utf8')===registrySource(manifest),'Word bank loader registry differs from manifest');
  for(const path of files) {
    const name=relative(root,path).replaceAll('\\','/');
    const sourceFile=/\.[cm]?[jt]sx?$/i.test(path),source=sourceFile?readFileSync(path,'utf8'):'';
    if(sourceFile) for(const dep of dependencies(source,name)) {
      requireThat(!/(?:scripts\/words|\.private|\.draft|sources\.lock)/i.test(dep),`Private word dependency in app: ${name}`);
      const target=posix.normalize(posix.join(posix.dirname(name),dep));
      if(/(?:^|\/)words\/(?:banks\/|legacy-word-rescue)/.test(target)) requireThat(['content/words/registry.ts','content/words/registry.generated.ts'].includes(name),`Word data must use the admitted registry: ${name}`);
    }
    if(name=== 'content/words/supplement.draft.json' || name==='content/words/banks.manifest.json' || name==='content/words/registry.generated.ts') continue;
    if(name==='content/words/legacy-word-rescue.ts') {
      // Frozen inherited pack is reachable only through the registry. It cannot
      // be extended as a way around review of new records.
      requireThat(sha256(readFileSync(path))==='973258bfb54566a992c340c5647f12cd8ff801d1fbbcb722efffbb60a0c8f3d6','Unadmitted edit to inherited word pack');continue;
    }
    const wordLocation=/^content\/(?:words|clues)\/|^(?:src\/games|assets)\/(?:words?|wordsearch|word-search)(?:\/|\.)/i.test(name);
    const bankLocation=/(?:^|\/)(?:banks?)(?:\/|\.)|^content\/clues\//i.test(name);
    let candidate=bankLocation || (wordLocation && /\.(?:txt|csv|tsv)$/i.test(name));
    if(/\.json$/i.test(name)) candidate ||= wordData(JSON.parse(readFileSync(path,'utf8')),wordLocation);
    if(sourceFile) {const fragments=wordDataFragments(source,name,wordLocation);candidate ||= fragments.length>0 && digest(fragments)!==inheritedFragments[name];}
    if(candidate) {
      requireThat(/^content\/words\/banks\/[^/]+\.json$/i.test(name) && registered.has(name),`Unadmitted word/clue bank: ${name}; committed manifest required`);
      assets.push(path);
    }
  }
  requireThat(assets.length===registered.size,'Word bank manifest entry missing');
  for(const path of assets) {
    const name=relative(root,path).replaceAll('\\','/'),bytes=readFileSync(path),asset=JSON.parse(bytes),entry=registered.get(name);
    safeAsset(asset);
    requireThat(entry.sha256===sha256(bytes) && entry.bytes===bytes.length && entry.words===asset.words.length && entry.clues===asset.clues.length && entry.surfaces===asset.surfaces.length,'Word bank manifest hash/count mismatch');
    if(full) {
      requireThat(evidenceDirectory,'Full word check requires detached admission evidence in LITTLE_ISLAND_WORD_RECEIPTS');
      const inputPath=join(resolve(evidenceDirectory),relative(join(root,'content/words/banks'),path));
      requireThat(existsSync(inputPath),'Missing detached word-bank admission evidence');
      const {asset:baked}=bakeBank(JSON.parse(readFileSync(inputPath,'utf8')));
      requireThat(digest(baked)===digest(asset),'Shipped word bank differs from reviewed, scanned bake');
    }
  }
  return {passed:true,files:files.length,banks:assets.length,full};
}
