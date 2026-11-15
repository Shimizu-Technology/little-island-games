/** Fresh certification receipts for this slice's unpublished packs, without changing any row bytes. */
import{createHash}from'node:crypto';
import{execFileSync}from'node:child_process';
import{readFileSync,writeFileSync}from'node:fs';
import{join}from'node:path';
import{parsePack}from'../../../src/puzzles/bank';
import{decodeRow}from'../../../src/puzzles/descriptor';
import{certify,type CertifyContext}from'../../../src/puzzles/checks';
import{readCatalog,readPackText,productionDirs}from'../pipeline';
import{receiptBody}from'../receipts';
import{klondike,freecell}from'./family';
const catalog=readCatalog(productionDirs),sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
for(const spec of[klondike,freecell]){
 const m=catalog.families.get(spec.id);if(!m)throw new Error(`Missing ${spec.id}.`);
 const hash=createHash('sha256');for(const file of spec.sources)hash.update(file).update(readFileSync(file));const familyHash=hash.digest('hex');
 const ctx:CertifyContext={budget:10000,seenExact:new Set(),seenSemantic:new Set()};
 for(const p of m.packs){
  if(p[0]<100||p[0]>109)throw new Error('Pack is outside the reserved G7a slots.');
  const published=execFileSync('git',['show','origin/program/4.0:src/content/puzzles/root.json'],{encoding:'utf8'});
  if(JSON.parse(published).families.some((f:unknown[])=>f[0]===spec.id))throw new Error('Published G7a receipts need the lead; refusing overwrite.');
  const text=readPackText(productionDirs,p[0]),pack=parsePack(text,p,m);if(!pack)throw new Error('Invalid pack.');
  const band=m.bands[p[5]],quota=spec.bands.find(b=>b.id===band);if(!quota)throw new Error('Unknown band.');
  const entries=pack.rows.map(row=>{const d=decodeRow(row,band,spec.adapter);if(!d)throw new Error('Bad row.');const result=certify(spec,quota,d,ctx);if(!result.ok)throw new Error(`${p[0]} ${d.seed}: ${result.reason}`);return result.entry;});
  const file=join(productionDirs.receipts,spec.id,`slot-${String(p[0]).padStart(4,'0')}.json`),old=JSON.parse(readFileSync(file,'utf8'));
  if(old.review.complete||old.native.length||old.allShippingGates)throw new Error('Preserve existing approval evidence; lead reconciliation required.');
  writeFileSync(file,receiptBody({family:spec.id,engine:spec.adapter.engine,slot:p[0],band,first:p[1],count:p[2],rules:p[6],text},entries,{catalogRevision:catalog.root.revision,kit:old.hashes.kit,family:familyHash,reviewIds:[],provenance:spec.provenance},{sourceSha,seedBase:old.seeds.base,attempts:old.seeds.attempts,rejects:old.rejects,budget:10000,budgetHits:old.solve.budgetExhausted,timedOut:old.solve.timedOut}));
  console.log(JSON.stringify({family:spec.id,slot:p[0],recertified:entries.length,sourceSha}));
 }
}
