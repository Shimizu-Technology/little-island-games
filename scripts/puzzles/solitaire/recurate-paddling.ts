/** Lead-authorized replacement of unpublished bank 106 for G7a fix round 1. */
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {certify,type CertifyContext} from '../../../src/puzzles/checks';
import {encodePack,manifestAsset,type PackHeader,type RootFamily} from '../../../src/puzzles/bank';
import {sha256Hex} from '../../../src/puzzles/sha256';
import {generatedAssets,readCatalog,productionDirs} from '../pipeline';
import {judge,freecell,rungs,type Candidate} from './family';
import {orderCandidates} from './order';
const out=process.env.SOLITAIRE_LOGS;if(!out)throw new Error('Set SOLITAIRE_LOGS to external evidence.');
for(const ref of ['origin/program/4.0','origin/main']){
 execFileSync('git',['rev-parse','--verify',ref],{stdio:'ignore'});
 const path='src/content/puzzles/root.json';
 if(ref==='origin/main'&&!execFileSync('git',['ls-tree',ref,'--',path],{encoding:'utf8'}).trim())continue;
 const published=JSON.parse(execFileSync('git',['show',`${ref}:${path}`],{encoding:'utf8'}));
 if(published.families.some((f:unknown[])=>f[0]==='freecell'))throw new Error('FreeCell has been published. Lead reconciliation required.');
}
const catalog=readCatalog(productionDirs),m=catalog.families.get('freecell')!,pack=m.packs.find(p=>p[0]===106)!;
if(!pack||pack[2]!==32||m.bands[pack[5]]!=='f1')throw new Error('Unexpected bank 106.');
const oldReceipt=JSON.parse(readFileSync('content/puzzles/receipts/freecell/slot-0106.json','utf8'));
if(oldReceipt.review.complete||oldReceipt.native.length||oldReceipt.allShippingGates)throw new Error('Preserve approval evidence.');
const pool:Candidate[]=[],rung=rungs.find(r=>r.id==='f1')!,per=new Map<string,number>();
for(let i=0;i<20000&&pool.length<96;i++){
 const c=judge(0x7000000+i,rung);if(!c||(per.get(c.template)??0)>=24)continue;
 pool.push(c);per.set(c.template,(per.get(c.template)??0)+1);
 if(pool.length%8===0)console.log(JSON.stringify({candidates:pool.length,tries:i+1}));
}
if(pool.length<96)throw new Error('Candidate pool below floor.');
const selected=orderCandidates(pool,32);if(selected.length!==32)throw new Error('Gentle order below floor.');
const ctx:CertifyContext={budget:10000,seenExact:new Set(),seenSemantic:new Set()};
const entries=selected.map(c=>{const r=certify(freecell,freecell.bands[0],c.core,ctx);if(!r.ok)throw new Error(`Certification failed: ${r.reason}`);return r.entry;});
const oldText=readFileSync('src/content/puzzles/assets/p106.lipuzzle','utf8'),header=JSON.parse(oldText.split('\n')[0])as PackHeader;
const text=encodePack(header,entries.map(e=>e.row)),oldAsset=catalog.root.families.find(f=>f[0]==='freecell')![1];
const manifest={...m,packs:m.packs.map(p=>p[0]===106?[p[0],p[1],p[2],Buffer.byteLength(text),sha256Hex(text),...p.slice(5)]as typeof p:p)};
const manifestText=JSON.stringify(manifest),hash=sha256Hex(manifestText),asset=manifestAsset('freecell',hash);
const row:RootFamily=['freecell',asset,hash,256,4,manifest.packs.reduce((n,p)=>n+p[3],Buffer.byteLength(manifestText))];
const root={...catalog.root,revision:catalog.root.revision+1,families:catalog.root.families.map(f=>f[0]==='freecell'?row:f)};
catalog.families.set('freecell',manifest);
writeFileSync(join(out,'bank-106-replacement.json'),JSON.stringify({sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),before:oldReceipt.seeds.kept,after:selected.map(c=>({seed:c.seed,recipe:c.template,nodes:c.nodes,moves:c.moves})),oldHash:pack[4],newHash:sha256Hex(text)},null,2)+'\n');
writeFileSync('src/content/puzzles/assets/p106.lipuzzle',text);
writeFileSync(`src/content/puzzles/assets/${asset}.lipuzzle`,manifestText);
writeFileSync('src/content/puzzles/assets.generated.ts',generatedAssets(root,catalog.families));
writeFileSync('src/content/puzzles/root.json',JSON.stringify(root)+'\n');
if(asset!==oldAsset)unlinkSync(`src/content/puzzles/assets/${oldAsset}.lipuzzle`);
console.log(JSON.stringify({replaced:106,deals:32,hash:sha256Hex(text),manifest:asset}));
