import { existsSync, readFileSync, readdirSync, lstatSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import ts from 'typescript';
import { digest, requireThat, sha256 } from './core.mjs';
import { bakeBank } from './bake.mjs';

function dependencies(source,path) {
  const tree=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true),found=[];
  function visit(n) {
    if ((ts.isImportDeclaration(n)||ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteralLike(n.moduleSpecifier)) found.push(n.moduleSpecifier.text);
    if (ts.isImportEqualsDeclaration(n) && ts.isExternalModuleReference(n.moduleReference) && n.moduleReference.expression && ts.isStringLiteralLike(n.moduleReference.expression)) found.push(n.moduleReference.expression.text);
    if (ts.isCallExpression(n) && (n.expression.kind===ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text==='require'))) {
      requireThat(n.arguments.length>0 && ts.isStringLiteralLike(n.arguments[0]),`Unverifiable app dependency: ${path}`);
      found.push(n.arguments[0].text);
    }
    ts.forEachChild(n,visit);
  }
  visit(tree);return found;
}
function safeAsset(asset) {
  requireThat(asset?.schemaVersion===1 && JSON.stringify(Object.keys(asset).sort())===JSON.stringify(['accept','clues','schemaVersion','surfaces','words']) && Array.isArray(asset.words) && asset.words.length>0 && Array.isArray(asset.clues) && Array.isArray(asset.surfaces) && asset.surfaces.length>0 && Array.isArray(asset.accept),'Invalid word bank shape');
  const keys=(value,allowed,required=allowed)=>value && Object.keys(value).every(k=>allowed.includes(k)) && required.every(k=>k in value);
  for(const w of asset.words) requireThat(keys(w,['id','spelling','language','readerLevel','knownBand','readBand','spellBand','clueBand','theme','topic','guamFit','audio','canonicalId','fluentReaderChecked'],['id','spelling','language','readerLevel','knownBand','readBand','spellBand','clueBand','theme','topic','guamFit','audio']),'Private/raw word fields in bank');
  for(const c of asset.clues) requireThat(keys(c,['id','wordId','text']),'Private/raw clue fields in bank');
  for(const s of asset.surfaces) {
    requireThat(keys(s,['id','kind','wordIds','cells','listed','shuffle','letters'],['id','kind','wordIds']),'Private/raw surface fields in bank');
    for(const e of s.listed??[]) requireThat(keys(e,['wordId','answer','cells']) && Array.isArray(e.cells) && e.cells.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isInteger)),'Private/invalid listed path in bank');
  }
  requireThat(asset.accept.every(w=>typeof w==='string' && /^[A-Z]+(?: [A-Z]+)*$/.test(w)),'Invalid bank accept list');
}

/** CI checks only committed manifest hashes and runtime shape. Private rebake is explicit. */
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
  for(const path of files) {
    const name=relative(root,path).replaceAll('\\','/');
    if (/\.[cm]?[jt]sx?$/i.test(path)) for(const dep of dependencies(readFileSync(path,'utf8'),name)) requireThat(!/(?:scripts\/words|\.private|\.draft|sources\.lock)/i.test(dep),`Private word dependency in app: ${name}`);
    if(name=== 'content/words/supplement.draft.json' || name==='content/words/banks.manifest.json') continue;
    const bankLocation=/(?:^|\/)(?:banks?)(?:\/|\.)|^content\/clues\/|^(?:assets|src\/games)\/words\/.*\.json$/i.test(name);
    let candidate=bankLocation;
    if(/\.json$/i.test(name)) {
      const value=JSON.parse(readFileSync(path,'utf8'));
      candidate ||= (Array.isArray(value?.words) && value.words.some(w=>typeof w==='object' && w && ('spelling' in w || 'lemma' in w))) || (Array.isArray(value?.clues) && value.clues.some(c=>c?.wordId));
    }
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
