import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { bakeFamily, verifyCatalog } from '../pipeline';
import { family } from './generate';
import { kinds } from '../../../src/puzzles/latin/core';
const root='src/puzzles/latin/banks';
export const dirs={content:root,receipts:'content/puzzles/latin-receipts'};
const requested=process.argv[2];
mkdirSync(dirs.content,{recursive:true});
const reports=[];
for(const kind of kinds.filter(k=>!requested||k===requested)){
 const spec=family(kind);
 const report=bakeFamily(spec,{dirs,sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),maxAttempts:Number(process.env.LATIN_ATTEMPTS??50000),deadlineMs:4*3600000});
 reports.push(report);console.log(JSON.stringify(report));writeFileSync(`${dirs.receipts}/bake-${kind}.json`,JSON.stringify(report,null,2)+'\n');
}
if(!requested){const v=verifyCatalog(dirs,kinds.map(family),{byteModel:false});console.log(JSON.stringify(v));if(v.errors.length)process.exitCode=1;}
