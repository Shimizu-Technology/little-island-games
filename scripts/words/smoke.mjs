#!/usr/bin/env node
/** Synthetic transport calibration only. Never writes to the real review directory. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { privatePath } from './paths.mjs';
import { digest, sha256, requireThat } from './core.mjs';
import { requireShippingReview } from './review.mjs';
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const [input,policy,outArg]=process.argv.slice(2);
const read=p=>JSON.parse(readFileSync(p,'utf8'));
function write(p,data){writeFileSync(p,JSON.stringify(data,null,2)+'\n',{flag:'wx'});}
function run(args) {
  const r=spawnSync(process.execPath,[join(repo,'scripts/words/cli.mjs'),...args],{cwd:repo,encoding:'utf8'});
  requireThat(r.status===0,`Fixture CLI failed: ${r.stderr}`);return r.stdout.trim();
}
try {
  requireThat(outArg,'smoke.mjs <real-draft-input.json> <private-policy.json> <new-external-fixture-directory>');
  const out=privatePath(outArg);
  requireThat(!existsSync(out),'Refusing to overwrite fixture evidence');mkdirSync(out,{recursive:true});
  const data=read(input);requireThat(data.clues.length===250,'Exactly 250 clues required');
  write(join(out,'input.TEST-ONLY.json'),{...data,fixture:true,reviewState:'TEST FIXTURE ONLY; no actual reviewers or approvals'});
  const batch=join(out,'batch.TEST-ONLY');
  run(['prepare',join(out,'input.TEST-ONLY.json'),policy,batch,'TEST-ONLY-250-TRANSPORT']);
  const logs=[];
  for (const [slot,family] of [['a','openai'],['b','anthropic']]) {
    const packetPath=join(batch,`review-${slot}.packet.json`),packet=read(packetPath);
    const transcript=`TEST FIXTURE ONLY. Synthetic ${family} review result to exercise CLI import and reconciliation. No model was called. No review or approval took place.`;
    const transcriptFile=join(out,`transcript-${slot}.TEST-ONLY.txt`);writeFileSync(transcriptFile,transcript,{flag:'wx'});
    const result={schemaVersion:1,fixture:true,batchSha256:packet.batchSha256,packetSha256:digest(packet),slot,reviewer:{id:`TEST-ONLY-${family}`,family,model:'SYNTHETIC-TRANSPORT-FIXTURE'},runId:`TEST-ONLY-run-${slot}`,startedAt:'2026-11-08T00:00:00.000Z',finishedAt:slot==='a'?'2026-11-08T00:02:00.000Z':'2026-11-08T00:03:00.000Z',transcriptSha256:sha256(transcript),items:packet.items.map((item,i)=>({id:item.id,verdict:slot==='b' && i%5===0?'call':'keep',reason:'TEST FIXTURE ONLY: synthetic decision, no actual review'}))};
    const resultFile=join(out,`review-${slot}.TEST-ONLY.json`);write(resultFile,result);
    logs.push(run(['import',packetPath,resultFile,transcriptFile,join(out,`review-${slot}.import.TEST-ONLY.json`)]));
  }
  const sheetFile=join(out,'reconciled.TEST-ONLY.json');logs.push(run(['reconcile',join(batch,'prepared.private.json'),join(out,'review-a.import.TEST-ONLY.json'),join(out,'review-b.import.TEST-ONLY.json'),sheetFile]));
  const prepared=read(join(batch,'prepared.private.json')),reviews=['a','b'].map(slot=>read(join(out,`review-${slot}.import.TEST-ONLY.json`)));
  let blocked=false;
  try {requireShippingReview(data.clues[0],{prepared,reviews});} catch {blocked=true;}
  requireThat(blocked,'Fixture accidentally admitted to shipping');
  const sheet=read(sheetFile),result={schemaVersion:1,fixture:true,label:'SYNTHETIC TRANSPORT TEST ONLY; no actual reviews or approvals',passed:true,count:250,cliImportResults:logs,metrics:sheet.metrics,fixtureShippingRejected:blocked,realReviewerRuns:0,approvedRecords:0};
  write(join(out,'smoke.TEST-ONLY.receipt.json'),result);console.log(JSON.stringify(result));
} catch(e){console.error(e.message);process.exitCode=1;}
