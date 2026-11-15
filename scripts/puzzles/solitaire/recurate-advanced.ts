/** Re-grade/re-curate unpublished advanced FreeCell packs after the family rules fix. */
import{execFileSync}from'node:child_process';
import{readFileSync,writeFileSync,unlinkSync}from'node:fs';
import{join}from'node:path';
import{certify,type CertifyContext}from'../../../src/puzzles/checks';
import{decodeRow}from'../../../src/puzzles/descriptor';
import{encodePack,manifestAsset,type PackHeader,type RootFamily}from'../../../src/puzzles/bank';
import{sha256Hex}from'../../../src/puzzles/sha256';
import{solve}from'../../../src/puzzles/table/solver';
import{generatedAssets,readCatalog,productionDirs}from'../pipeline';
import{judge,freecell,rungs,type Candidate}from'./family';
import{recipes}from'./generate';
import{orderCandidates}from'./order';
const out=process.env.SOLITAIRE_LOGS;if(!out)throw new Error('Set external SOLITAIRE_LOGS.');
for(const ref of['origin/program/4.0','origin/main']){
 execFileSync('git',['rev-parse','--verify',ref],{stdio:'ignore'});const path='src/content/puzzles/root.json';
 if(ref==='origin/main'&&!execFileSync('git',['ls-tree',ref,'--',path],{encoding:'utf8'}).trim())continue;
 if(JSON.parse(execFileSync('git',['show',`${ref}:${path}`],{encoding:'utf8'})).families.some((f:unknown[])=>f[0]==='freecell'))throw new Error('FreeCell published; lead reconciliation required.');
}
const catalog=readCatalog(productionDirs),manifest=catalog.families.get('freecell')!,pools=new Map<string,Candidate[]>([['f3',[]],['f5',[]],['f6',[]]]),changes:unknown[]=[],discarded:unknown[]=[],allSeeds=new Set<number>();
for(const p of manifest.packs.filter(p=>p[0]>=107)){
 const old=JSON.parse(readFileSync(`content/puzzles/receipts/freecell/slot-${String(p[0]).padStart(4,'0')}.json`,'utf8'));if(old.review.complete||old.native.length||old.allShippingGates)throw new Error('Preserve approval evidence.');
 for(const row of readFileSync(`src/content/puzzles/assets/p${p[0]}.lipuzzle`,'utf8').trim().split('\n').slice(1)){
  const core=decodeRow(row,manifest.bands[p[5]],freecell.adapter)!;if(!core)throw new Error('Invalid old row.');allSeeds.add(core.seed);
  const r=solve(core.payload,undefined,10000);if(r.status!=='solved'){discarded.push({slot:p[0],seed:core.seed,reason:r.status});continue;}
  const tier=r.nodes<400?1:r.nodes<1500?3:r.nodes<4000?5:6,band=`f${tier}`,pool=pools.get(band);
  if(!pool){discarded.push({slot:p[0],seed:core.seed,reason:'now-introductory',nodes:r.nodes});continue;}
  pool.push({core:{...core,band,teaches:[`search-${tier}`]},seed:core.seed,template:core.template,nodes:r.nodes,branches:r.branches,moves:r.moves.length,depth:1,workload:r.nodes});
 }
}
const selected=new Map<string,ReturnType<typeof certify>[]>(),ctx:CertifyContext={budget:10000,seenExact:new Set(),seenSemantic:new Set()};
for(const band of['f3','f5','f6']){
 const rung=rungs.find(r=>r.id===band)!,pool=pools.get(band)!,want=rung.floor;let attempt=0;
 for(;;){
  let ordered:Candidate[]=[];try{ordered=orderCandidates(pool,want);}catch{/* Add a wider, balanced pool. */}
  if(ordered.length===want){
   const testCtx:CertifyContext={budget:10000,seenExact:new Set(ctx.seenExact),seenSemantic:new Set(ctx.seenSemantic)},entries:ReturnType<typeof certify>[]=[];let bad:Candidate|null=null;
   for(const c of ordered){const r=certify(freecell,freecell.bands.find(b=>b.id===band)!,c.core,testCtx);if(!r.ok){discarded.push({seed:c.seed,band,reason:r.reason});bad=c;break;}entries.push(r);}
   if(!bad){selected.set(band,entries);ctx.seenExact=testCtx.seenExact;ctx.seenSemantic=testCtx.seenSemantic;console.log(JSON.stringify({band,selected:want,pool:pool.length,attempts:attempt}));break;}
   pool.splice(pool.indexOf(bad),1);continue;
  }
  if(attempt>=20000)throw new Error(`${band} cannot meet its floor.`);
  const counts=recipes.map(t=>pool.filter(c=>c.template===t).length),need=recipes[counts.indexOf(Math.min(...counts))];
  const seed=((rungs.indexOf(rung)+1)*0x1000000+0x400000+attempt++)>>>0;if(allSeeds.has(seed)||recipes[seed%4]!==need)continue;allSeeds.add(seed);
  const c=judge(seed,rung);if(!c)continue;pool.push(c);if(pool.length%8===0)console.log(JSON.stringify({band,pool:pool.length,attempts:attempt}));
 }
}
const packs=manifest.packs.map(p=>{
 if(p[0]<107)return p;const path=`src/content/puzzles/assets/p${p[0]}.lipuzzle`,old=readFileSync(path,'utf8'),band=manifest.bands[p[5]],entries=selected.get(band)!.map(r=>{if(!r.ok)throw new Error('Uncertified entry.');return r.entry;});
 const text=encodePack(JSON.parse(old.split('\n')[0])as PackHeader,entries.map(e=>e.row));
 changes.push({slot:p[0],oldHash:p[4],newHash:sha256Hex(text),before:old.trim().split('\n').slice(1).map(r=>JSON.parse(r)[0]),after:entries.map(e=>({seed:e.core.seed,nodes:pools.get(band)!.find(c=>c.seed===e.core.seed)!.nodes,recipe:e.core.template}))});
 writeFileSync(path,text);return[p[0],p[1],p[2],Buffer.byteLength(text),sha256Hex(text),...p.slice(5)]as typeof p;
});
const next={...manifest,packs},text=JSON.stringify(next),hash=sha256Hex(text),asset=manifestAsset('freecell',hash),oldAsset=catalog.root.families.find(f=>f[0]==='freecell')![1];
const row:RootFamily=['freecell',asset,hash,256,4,packs.reduce((n,p)=>n+p[3],Buffer.byteLength(text))],root={...catalog.root,revision:catalog.root.revision+1,families:catalog.root.families.map(f=>f[0]==='freecell'?row:f)};catalog.families.set('freecell',next);
writeFileSync(join(out,'advanced-replacement.json'),JSON.stringify({sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),discarded,changes},null,2)+'\n');
writeFileSync(`src/content/puzzles/assets/${asset}.lipuzzle`,text);writeFileSync('src/content/puzzles/assets.generated.ts',generatedAssets(root,catalog.families));writeFileSync('src/content/puzzles/root.json',JSON.stringify(root)+'\n');if(asset!==oldAsset)unlinkSync(`src/content/puzzles/assets/${oldAsset}.lipuzzle`);
