#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { privatePath as external } from './paths.mjs';
import { digest, sha256, requireThat } from './core.mjs';
import { prepareBatch, prepareWordBatch, prepareReadingBatch, validateReview, reconcile } from './review.mjs';
import { bakeBank } from './bake.mjs';
import { bakeReadingBank } from './bake-reading.mjs';
import { guardTree } from './guard.mjs';

const read = p => JSON.parse(readFileSync(p,'utf8'));
function write(path,value) {
  const target=external(path);
  requireThat(!existsSync(target),`Refusing to overwrite evidence: ${target}`);
  mkdirSync(dirname(target),{recursive:true});
  writeFileSync(target,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
}
const [command,...args]=process.argv.slice(2);
try {
  if (command === 'prepare' || command === 'prepare-words' || command === 'prepare-reading') {
    const [input,policyFile,out,id]=args;
    requireThat(input && policyFile && out && id, 'prepare <input.json> <private-policy.json> <new-output-directory> <batch-id>');
    external(out);requireThat(!existsSync(out),'Batch output already exists');
    const data=read(input), policy=read(policyFile), records=command === 'prepare' ? data.clues : command === 'prepare-reading' ? data.records : data.words;
    const prepared=(command === 'prepare' ? prepareBatch : command === 'prepare-reading' ? prepareReadingBatch : prepareWordBatch)(records,{id,fixture:data.fixture,vocabularySha256:digest(data.vocabulary ?? records),scanListSha256:digest([...policy.scan].sort()),canonicalTerms:data.canonicalTerms ?? []});
    for (const [name,value] of Object.entries({ 'batch.private.json':prepared.batch, 'review-a.packet.json':prepared.packets[0], 'review-b.packet.json':prepared.packets[1], 'reconcile.pending.json':prepared.sheet, 'receipt.private.json':prepared.receipt })) write(join(out,name),value);
    write(join(out,'prepared.private.json'),prepared);
    console.log(JSON.stringify({count:records.length,batchSha256:digest(prepared.batch),state:'awaiting-review',fixture:prepared.batch.fixture}));
  } else if (command === 'import') {
    const [packetFile,resultFile,transcriptFile,out]=args;
    requireThat(out,'import <packet.json> <result.json> <actual-transcript-file> <new-import.json>');
    const result=validateReview(read(packetFile),read(resultFile),sha256(readFileSync(transcriptFile)));
    write(out,result); console.log(JSON.stringify({reviewId:result.id,count:result.items.length,fixture:result.fixture}));
  } else if (command === 'reconcile') {
    const [preparedFile,aFile,bFile,out]=args;
    requireThat(out,'reconcile <prepared.private.json> <a.import.json> <b.import.json> <new-reconcile.json>');
    const sheet=reconcile(read(preparedFile),read(aFile),read(bFile));write(out,sheet);console.log(JSON.stringify(sheet.metrics));
  } else if (command === 'bake') {
    const [input,out]=args;requireThat(out,'bake <private-bank-input.json> <new-output-directory>');
    external(out);requireThat(!existsSync(out),'Bake output already exists');
    const {asset,receipt}=bakeBank(read(input));
    write(join(out,'bank.json'),asset);write(join(out,'receipt.private.json'),receipt);
    console.log(JSON.stringify(receipt.counts));
  } else if (command === 'bake-reading') {
    // Lead contract change: W1 reading records. Same detached admission, for Sound Boat word-parts records.
    const [input,out]=args;requireThat(out,'bake-reading <private-reading-input.json> <new-output-directory>');
    external(out);requireThat(!existsSync(out),'Bake output already exists');
    const {asset,receipt}=bakeReadingBank(read(input));
    write(join(out,'bank.json'),asset);write(join(out,'receipt.private.json'),receipt);
    console.log(JSON.stringify(receipt.counts));
  } else if (command === 'guard') {
    const [tree,policyFile,...receiptFiles]=args;requireThat(policyFile,'guard <bundle-or-staged-export-directory> <private-policy.json> [private-receipts...]');
    console.log(JSON.stringify(guardTree(tree,read(policyFile),receiptFiles.map(read))));
  } else throw new Error('Commands: prepare, prepare-words, prepare-reading, import, reconcile, bake, bake-reading, guard. See scripts/words/README.md.');
} catch (e) { console.error(e.message); process.exitCode=1; }
