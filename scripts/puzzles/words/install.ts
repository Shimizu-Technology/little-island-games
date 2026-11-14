/** Lead-only adoption after the real family sample. This never manufactures approval. */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { checkSearch } from './check.mjs';
import { registrySource } from '../../words/registry.mjs';
import { sha256 } from '../../words/core.mjs';
import { checkShippingTree } from '../../words/shipping.mjs';
import { wordSearch } from '../families/word-search';
import { bakeFamily, generatedAssets, readCatalog, readPackText, saveCatalogBanks } from '../pipeline';
import { emptyRoot, catalogIssues, packAsset } from '../../../src/puzzles/bank';
import type { DescriptorCore, FamilySpec } from '../../../src/puzzles/types';
import type { SearchPuzzle } from '../../../src/puzzles/words/core';
import type { SearchBank } from '../../../src/puzzles/words/registration';
import { verifyByteModel } from '../byte-model';
import { pictureBindings, pictureBindingsSource } from './picture-bindings.mjs';

const out = resolve(process.argv[2] ?? '');
try {
  const checked = checkSearch(out), rows = checked.puzzles as {bank:number;band:string;tier:SearchBank['tier'];title:string;id:string;family:string;seed:number;payload:SearchPuzzle}[];
  const existing = readCatalog({content:'src/content/puzzles',receipts:'content/puzzles/receipts'});
  if (existing.families.has('word-search')) throw Error('Existing immutable Word Search banks require a new append plan.');
  if ([...existing.families.values()].some(f=>f.packs.some(p=>p[0]>=80 && p[0]<=99))) throw Error('G6 slots already occupied.');
  const manifestFile='content/words/banks.manifest.json', registryFile='content/words/registry.generated.ts';
  const beforeManifest=readFileSync(manifestFile);
  const changed=new Map<string,Buffer|null>();
  const put=(path:string,bytes:string|Buffer)=>{if(!changed.has(path))changed.set(path,existsSync(path)?readFileSync(path):null);writeFileSync(path,bytes);};
  const copy=(from:string,to:string)=>put(to,readFileSync(from));
  const manifest=JSON.parse(beforeManifest.toString());
  try {
    mkdirSync('content/words/banks',{recursive:true});
    for(const {id,asset,bytes} of checked.banks) {
      const path=`content/words/banks/${id}.json`;if(existsSync(path))throw Error('Refusing to overwrite a word bank.');
      put(path,bytes);
      manifest.banks.push({path,sha256:sha256(bytes),bytes:bytes.length,words:asset.words.length,clues:asset.clues.length,surfaces:asset.surfaces.length});
    }
    put(manifestFile,JSON.stringify(manifest)+'\n');put(registryFile,registrySource(manifest));
    // Admission uses the actual repository registry and detached W1 inputs, never a fixture source.
    const receipts=join(out,'admission');mkdirSync(receipts,{recursive:true});
    for(const b of checked.banks)copyFileSync(join(out,'private',`${b.id}.input.private.json`),join(receipts,`${b.id}.json`));
    checkShippingTree(process.cwd(),receipts,{full:true});
    const dirs={content:join(out,'catalog'),receipts:join(out,'catalog-receipts')};
    if(existsSync(dirs.content))throw Error('Catalog output exists; use a fresh bake output.');
    mkdirSync(dirs.content);writeFileSync(join(dirs.content,'root.json'),JSON.stringify({...emptyRoot(),nextSlot:80,nextOrdinal:80*1024}));
    const bands=[...new Set(rows.map(p=>p.band))].map(id=>({id,target:rows.filter(p=>p.band===id).length,floor:rows.filter(p=>p.band===id).length,advanced:false}));
    const spec:FamilySpec<SearchPuzzle>={...wordSearch,adapter:wordSearch.adapter as FamilySpec<SearchPuzzle>['adapter'],bands,
      generate:(seed,band)=> {const candidates=rows.filter(p=>p.band===band.id),r=candidates[seed-1-bands.findIndex(b=>b.id===band.id)*0x1000000];return r?{format:1,seed:r.seed,rng:1,band:r.band,layout:r.family,template:r.family,payload:r.payload,objectives:[],limits:[],par:null,teaches:['scan'],speech:null} satisfies DescriptorCore<SearchPuzzle>:null;}};
    const report=bakeFamily(spec,{dirs,maxAttempts:Math.max(...bands.map(b=>b.target)),sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()});
    if(!report.published || report.slots.some(s=>s<80 || s>99))throw Error('Packed bake did not fit the reserved slots.');
    const baked=readCatalog(dirs),family=baked.families.get('word-search')!;
    const rowBytes=family.packs.reduce((n,p)=>n+Buffer.byteLength(readPackText(dirs,p[0]).split('\n').slice(1).join('\n')),0);
    if(verifyByteModel([{family:'word-search',entries:rows.length,rowBytes}]).length)throw Error('The real bank exceeds the existing byte model; lead must resolve before adoption.');
    const root={...existing.root,revision:existing.root.revision+1,nextSlot:Math.max(existing.root.nextSlot,baked.root.nextSlot),nextOrdinal:Math.max(existing.root.nextOrdinal,baked.root.nextOrdinal),families:[...existing.root.families,...baked.root.families]};
    const families=new Map([...existing.families,...baked.families]);if(catalogIssues(root,families.values()).length)throw Error('Combined catalog collision.');
    const facts:SearchBank[]=family.packs.map(p=>{const band=family.bands[p[5]],r=rows.find(r=>r.band===band)!;return{slot:p[0],first:p[1],count:p[2],packHash:p[4],rules:p[6],band,title:band[0].toUpperCase()+band.slice(1),tier:r.tier};});
    // All checks above run before packed assets, refs or the catalog are adopted.
    for(const name of [...baked.root.families.map(f=>f[1]),...family.packs.map(p=>packAsset(p[0]))])copy(join(dirs.content,'assets',name+'.lipuzzle'),join('src/content/puzzles/assets',name+'.lipuzzle'));
    mkdirSync('content/puzzles/receipts/word-search',{recursive:true});
    for(const p of family.packs){const name=`slot-${String(p[0]).padStart(4,'0')}.json`;copy(join(dirs.receipts,'word-search',name),join('content/puzzles/receipts/word-search',name));}
    const frozen=JSON.parse(readFileSync('src/state/save-catalog.json','utf8'));frozen.banks.push(...saveCatalogBanks(dirs,()=>({awards:0,cove:true})));frozen.contexts=[...new Set([...frozen.contexts,...facts.map(f=>`word-search-${f.tier}`)])];
    put('src/puzzles/words/packs.generated.json',JSON.stringify(facts,null,2)+'\n');
    put('src/puzzles/words/pictures.generated.ts',pictureBindingsSource(pictureBindings(rows.map(r=>r.payload))));
    put('src/content/puzzles/assets.generated.ts',generatedAssets(root,families));put('src/state/save-catalog.json',JSON.stringify(frozen,null,2)+'\n');put('src/content/puzzles/root.json',JSON.stringify(root)+'\n');
    console.log(JSON.stringify({published:true,puzzles:rows.length,slots:report.slots,detachedEvidence:receipts}));
  } catch(e) {for(const [path,bytes] of [...changed].reverse()){if(bytes===null)rmSync(path,{force:true});else writeFileSync(path,bytes);}throw e;}
} catch {console.error('Word Search adoption stopped. No approval was invented; inspect the bake, slot and byte gates.');process.exitCode=1;}
