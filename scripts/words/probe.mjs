#!/usr/bin/env node
/** Small build-time scan proof. These are unapproved QA boards, never app content. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { privatePath } from './paths.mjs';
import { digest, requireThat, answerAllowed } from './core.mjs';
import { scanGrid, countOccurrences } from './scan.mjs';
import { independentlyVerify } from './bake.mjs';
const [policyFile,outArg]=process.argv.slice(2);
try {
  requireThat(outArg,'probe.mjs <private-policy.json> <new-external-evidence-directory>');
  const out=privatePath(outArg);requireThat(!existsSync(out),'Refusing to overwrite probe evidence');
  const policy=JSON.parse(readFileSync(policyFile,'utf8')),probe=JSON.parse(readFileSync(new URL('./faith-probe.json',import.meta.url),'utf8'));
  const protectedWords=['faith','family','nature','guam','body'].flatMap(k=>probe[k].split(' '));
  requireThat(protectedWords.length===87 && protectedWords.every(spelling=>answerAllowed({spelling,lemma:spelling},policy)) && answerAllowed({spelling:'MAMA',lemma:'MAMA'},policy),'Actual private answer policy overblocked the family probe');
  let seed=0x5710;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ',grids=[];
  const listed=[{wordId:'TEST-ONLY-reef',answer:'REEF',cells:[[0,0],[0,1],[0,2],[0,3]]}];
  let rejected=0,repairEdits=0;const started=performance.now();
  for (let n=0;n<32;n++) {
    let cells;
    for (let attempt=0;attempt<5000;attempt++) {
      cells=Array.from({length:12},()=>Array.from({length:12},()=>alphabet[Math.floor(random()*alphabet.length)]));
      [...'REEF'].forEach((c,i)=>{cells[0][i]=c;});
      for (let repair=0;repair<2000;repair++) {
        const hits=scanGrid(cells,policy.scan,listed);
        if (!hits.length)break;
        const editable=hits[0].cells.filter(([r,c])=>r!==0 || c>3);
        requireThat(editable.length>0,'QA listed answer would need replacement');
        const [r,c]=editable[Math.floor(random()*editable.length)];
        let letter;do {letter=alphabet[Math.floor(random()*alphabet.length)];}while(letter===cells[r][c]);
        cells[r][c]=letter;repairEdits++;
      }
      if (countOccurrences(cells,[...'REEF'])===1 && scanGrid(cells,policy.scan,listed).length===0)break;
      rejected++;cells=null;
    }
    requireThat(cells,'Probe could not create a scan-clean board');grids.push({id:`TEST-ONLY-${n}`,cells,listed});
  }
  const primaryMilliseconds=performance.now()-started,independentStart=performance.now();
  const independent=independentlyVerify(grids,policy.scan);
  const receipt={schemaVersion:1,fixture:true,label:'UNAPPROVED QA GRIDS ONLY',count:32,scanTerms:policy.scan.length,scanListSha256:digest([...policy.scan].sort()),gridsSha256:digest(grids),rejectedCandidates:rejected,repairEdits,primaryMilliseconds,independentMilliseconds:performance.now()-independentStart,primary:{passed:true,hits:0},independent,actualPolicyFamilyProbe:{count:87,passed:true,mamaPassed:true},approvedRecords:0,limits:'No listed strings after listed-answer exemption, not proof against unlisted words. This is not the audit 600,000-grid experiment or a shipped bank.'};
  mkdirSync(out,{recursive:true});writeFileSync(join(out,'grids.TEST-ONLY.private.json'),JSON.stringify({fixture:true,grids},null,2)+'\n',{flag:'wx'});writeFileSync(join(out,'receipt.TEST-ONLY.private.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(receipt));
}catch(e){console.error(e.message);process.exitCode=1;}
