/** Exact ordered selection, freshly certified through the lead's slot-claim path. */
import {execFileSync} from 'node:child_process';
import {copyFileSync,existsSync,mkdirSync,mkdtempSync,readFileSync,renameSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {decodeRow} from '../../../src/puzzles/descriptor';
import {sha256Hex} from '../../../src/puzzles/sha256';
import {bakeFamily,generatedAssets,productionDirs,readCatalog,readPackText,sweepOrphans,type CatalogDirs} from '../pipeline';
import {parseRange,slotClaim,slotRangesFile} from '../slots';
import {freecell,klondike} from './family';
import selection from './selected-rows.json';

/** Carries unrelated families and monotonic counters; published slots are never replaceable. */
export function installSelected(dirs:CatalogDirs,rangeText:string,owner:string,sourceSha:string){
 const range=parseRange(rangeText);
 if(range.first!==100||range.last!==109||owner!=='g7a-solitaire')throw new Error('Exact selection needs --range 100-109 --owner g7a-solitaire.');
 const before=readCatalog(dirs),other=new Map([...before.families].filter(([id])=>id!=='solitaire'&&id!=='freecell'));
 for(const id of ['solitaire','freecell'])for(const p of before.families.get(id)?.packs??[]){
  const bank=selection.banks.find(b=>b.slot===p[0]&&b.family===id);
  if(!bank||JSON.stringify(readPackText(dirs,p[0]).trimEnd().split('\n').slice(1))!==JSON.stringify(bank.rows))throw new Error('Existing family is not the authorized 9532ba72 selection.');
 }
 // Uses the real catalog paths for published-tip/inline guards, before creating staging.
 const claim=slotClaim(dirs,other.values(),range,owner);
 for(const bank of selection.banks){
  if(sha256Hex(bank.rows.join('\n')+'\n')!==bank.rowsSha256)throw new Error(`Selection ${bank.slot} was edited.`);
  const path=join(dirs.receipts,bank.family,`slot-${String(bank.slot).padStart(4,'0')}.json`);
  if(existsSync(path)){const old=JSON.parse(readFileSync(path,'utf8'));if(old.review.complete||old.native.length||old.allShippingGates)throw new Error('Preserve approval evidence; ask the lead.');}
 }
 const scratch=mkdtempSync(join(tmpdir(),'li4-g7a-exact-')),stage={content:join(scratch,'content'),receipts:join(scratch,'receipts')};
 try{
  mkdirSync(join(stage.content,'assets'),{recursive:true});
  for(const id of ['solitaire','freecell'])mkdirSync(join(stage.receipts,id),{recursive:true});
  for(const [id,asset] of before.root.families)if(other.has(id)){
   copyFileSync(join(dirs.content,'assets',asset+'.lipuzzle'),join(stage.content,'assets',asset+'.lipuzzle'));
   for(const p of other.get(id)!.packs)copyFileSync(join(dirs.content,'assets',`p${p[0]}.lipuzzle`),join(stage.content,'assets',`p${p[0]}.lipuzzle`));
  }
  copyFileSync(slotRangesFile(dirs),slotRangesFile(stage));
  writeFileSync(join(stage.content,'root.json'),JSON.stringify({...before.root,families:before.root.families.filter(([id])=>other.has(id))})+'\n');
  const reports=[];
  for(const spec of [klondike,freecell]){
   const banks=selection.banks.filter(b=>b.family===spec.id),cores=banks.map(b=>b.rows.map(row=>{const core=decodeRow(row,b.band,spec.adapter);if(!core)throw new Error('Invalid selected row.');return core;}));
   const exact={...spec,bands:spec.bands.map((b,i)=>({...b,target:cores[i].length})),
    provenance:{source:'original' as const,note:spec.provenance.note+' Exact ordered install of 9532ba72 via scripts/puzzles/solitaire/install.ts. Curation scripts, source pool/checkpoint hashes and every selected row in scripts/puzzles/solitaire/selected-rows.json (sha256 '+sha256Hex(JSON.stringify(selection))+'). '+(spec.id==='freecell'?'106: recurate-paddling.ts, 0x7000000+i; 107–109: recurate-advanced.ts, original/regraded rows + regenerated advanced-pools checkpoint + new 0x400000-offset candidates. Historical search totals unavailable. ':'')+'Receipt attempts/rejects describe this exact-row certification, not historical candidate curation.'},
    generate:(seed:number,band:{id:string})=>{const i=spec.bands.findIndex(b=>b.id===band.id);return cores[i]?.[seed-1-i*0x1000000]??null;}};
   const report=bakeFamily(exact,{dirs:stage,claim:{...claim,range:{first:banks[0].slot,last:banks.at(-1)!.slot}},budget:10000,seedBase:1,maxAttempts:Math.max(...cores.map(c=>c.length)),sourceSha});
   if(!report.published||report.status!=='complete')throw new Error(JSON.stringify(report));reports.push(report);
  }
  // bakeFamily still owns ordering/caps. Refuse publication if any row changed place or bytes.
  for(const b of selection.banks){const after=readPackText(stage,b.slot).trimEnd().split('\n').slice(1);if(JSON.stringify(after)!==JSON.stringify(b.rows))throw new Error(`Exact rows changed in ${b.slot}.`);}
  const result=readCatalog(stage);
  for(const [id,asset]of result.root.families){copyFileSync(join(stage.content,'assets',asset+'.lipuzzle'),join(dirs.content,'assets',asset+'.lipuzzle'));for(const p of result.families.get(id)!.packs)copyFileSync(join(stage.content,'assets',`p${p[0]}.lipuzzle`),join(dirs.content,'assets',`p${p[0]}.lipuzzle`));}
  for(const b of selection.banks){mkdirSync(join(dirs.receipts,b.family),{recursive:true});copyFileSync(join(stage.receipts,b.family,`slot-${String(b.slot).padStart(4,'0')}.json`),join(dirs.receipts,b.family,`slot-${String(b.slot).padStart(4,'0')}.json`));}
  writeFileSync(join(dirs.content,'assets.generated.ts'),generatedAssets(result.root,result.families));
  writeFileSync(join(dirs.content,'root.json.tmp'),JSON.stringify(result.root)+'\n');renameSync(join(dirs.content,'root.json.tmp'),join(dirs.content,'root.json'));sweepOrphans(dirs);
  return{reports,rows:selection.banks.reduce((n,b)=>n+b.rows.length,0),before:{nextSlot:before.root.nextSlot,nextOrdinal:before.root.nextOrdinal},after:{nextSlot:result.root.nextSlot,nextOrdinal:result.root.nextOrdinal}};
 }finally{rmSync(scratch,{recursive:true,force:true});}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const arg=(key:string)=>{const i=process.argv.indexOf(key);if(i<0||!process.argv[i+1])throw new Error(`Missing ${key}.`);return process.argv[i+1];};
 console.log(JSON.stringify(installSelected(productionDirs,arg('--range'),arg('--owner'),execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim())));
}
