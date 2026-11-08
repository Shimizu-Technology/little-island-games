#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { privatePath } from './paths.mjs';
import { digest, sha256, requireThat, validateClue } from './core.mjs';
import { lintClue } from './lint.mjs';
const [queueFile,output,provenanceFile]=process.argv.slice(2);
try {
  requireThat(output,'Usage: make-calibration.mjs <tiers.queue.json> <new-external-output-directory>');
  const out=privatePath(output);
  requireThat(!existsSync(out),'Refusing to overwrite calibration');
  const source=readFileSync(new URL('./calibration.draft.tsv',import.meta.url),'utf8');
  const rows=source.trim().split('\n').map(line=>line.split('|'));
  requireThat(rows.every(r=>r.length===5 && r.every(x=>x.trim())), 'Authored alternate drafts missing; legacy generated padding does not count');
  requireThat(rows.length===250 && new Set(rows.map(r=>r[0])).size===250,'Exactly 250 distinct answers required');
  const queue=JSON.parse(readFileSync(queueFile,'utf8'));
  const local=JSON.parse(readFileSync(join(dirname(queueFile),'local.queue.json'),'utf8'));
  const wordByKey=new Map([...queue.words,...local.words].map(w=>[w.spelling,w]));
  requireThat(rows.every(([answer])=>wordByKey.has(answer)), 'Every calibration answer needs an actual source-backed word record');
  const vocabulary=[...wordByKey.values(), 'A','I','AN','AS','AT','BE','BY','DO','GO','HE','IF','IN','IS','IT','ME','MY','NO','OF','ON','OR','SO','TO','UP','US','WE'];
  requireThat(provenanceFile,'Actual authoring provenance JSON required: model, date, promptFile, webUsed, inputs');
  const provenance=JSON.parse(readFileSync(privatePath(provenanceFile),'utf8'));
  const prompt=readFileSync(privatePath(provenance.promptFile),'utf8');
  const {date,model,webUsed,inputs}=provenance;
  const clues=rows.map(([answer,meaning,text,alternateA,alternateB],i)=>{
    requireThat(answer && meaning && text,'Malformed authored calibration row');
    const tier=wordByKey.get(answer)?.readerLevel ?? (answer.length<=6?'Little':answer.length<=8?'Growing':'Strong');
    const c={schemaVersion:1,id:`w1-cal-${String(i+1).padStart(3,'0')}`,wordId:`en-${answer.toLowerCase()}`,answer,meaning,tier,text,candidates:[text,alternateA,alternateB],provenance:{model,date,promptVersion:'clean-room-calibration-v1',promptSha256:sha256(prompt),webUsed,inputs,authoringSourceSha256:sha256(source)}};
    validateClue(c);return c;
  });
  const vocabularyWords=clues.map(c=>({...wordByKey.get(c.answer),sense:c.meaning}));
  const input={schemaVersion:1,fixture:false,reviewState:'draft; awaiting two real blind reviewers and lead reconciliation',clues,vocabulary:vocabularyWords};
  mkdirSync(out,{recursive:true});
  for (const [name,data] of Object.entries({'clues.input.private.json':input,'lint.private.json':{schemaVersion:1,clues:clues.map(c=>({id:c.id,flags:lintClue(c,vocabulary)}))},'draft-receipt.private.json':{schemaVersion:1,count:clues.length,cluesSha256:digest(clues),authoringSourceSha256:sha256(source),prompt,promptSha256:sha256(prompt),model,date,reviewIds:[],approvedRecords:0}}))writeFileSync(join(out,name),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({count:clues.length,approvedRecords:0,fixture:false}));
} catch(e){console.error(e.message);process.exitCode=1;}
