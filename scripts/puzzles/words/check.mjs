#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { audioFor } from './audio.mjs';
import { bakeBank } from '../../words/bake.mjs';
import { digest, requireThat } from '../../words/core.mjs';
import { privatePath } from '../../words/paths.mjs';
export function checkSearch(out) {
  privatePath(out);const receipt=JSON.parse(readFileSync(join(out,'receipt.json'))),banks=[];
  const plan=JSON.parse(readFileSync(join(out,'plan.json')));requireThat(digest(plan)===receipt.planSha256,'Plan binding mismatch');requireThat(receipt.fixture===false,'Fixtures cannot ship');
  for(const file of readdirSync(join(out,'banks'))) {
    requireThat(/^[a-z0-9-]+\.json$/.test(file),'Unknown bank file');const id=file.slice(0,-5);
    const admission=JSON.parse(readFileSync(join(out,'private',`${id}.input.private.json`)));
    const {asset}=bakeBank(admission),bytes=readFileSync(join(out,'banks',file));
    requireThat(digest(asset)===digest(JSON.parse(bytes)),'Bank differs from fresh W1 bake');banks.push({id,asset,bytes});
  }
  requireThat(receipt.bankCount===banks.length,'Incomplete bake');
  const puzzles=JSON.parse(readFileSync(join(out,'puzzles.json')));
  requireThat(Array.isArray(puzzles) && puzzles.length===receipt.puzzles && puzzles.length>=512 && puzzles.length<=2048,'Incomplete puzzle projection');
  for(const row of puzzles) {
    const bank=banks.find(b=>b.asset.surfaces.some(s=>s.id===row.id)),s=bank?.asset.surfaces.find(s=>s.id===row.id);
    requireThat(s && receipt.slots.includes(row.bank),'Puzzle has no admitted surface');
    const bankPlan=plan.banks.find(b=>b.slot===row.bank),gridPlan=bankPlan?.grids.find(g=>g.id===row.id);requireThat(gridPlan && row.seed===gridPlan.seed && row.band===bankPlan.band && row.tier===bankPlan.tier && row.family===gridPlan.family,'Grid plan mismatch');
    const expected={language:bank.asset.words[0].language,cells:s.cells,words:s.listed.map(w=>({id:w.answer,spelling:w.answer,cells:w.cells.map(([y,x])=>y*s.cells[0].length+x),audio:audioFor(bank.asset.words.find(a=>a.id===w.wordId))})),theme:gridPlan.theme??bankPlan.theme,list:bankPlan.list,message:gridPlan.message??null};
    requireThat(digest(expected)===digest(row.payload),'Puzzle differs from admitted cells and answers');
  }
  requireThat(new Set(puzzles.map(p=>digest(p.payload))).size===puzzles.length,'Duplicate semantic grids');
  return {receipt,banks,puzzles};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {const result=checkSearch(resolve(process.argv[2]));console.log(JSON.stringify({passed:true,banks:result.banks.length,puzzles:result.puzzles.length,implementations:2}));}
  catch{console.error('Word Search verification failed; no content was published.');process.exitCode=1;}
}
