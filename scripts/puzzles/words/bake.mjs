#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bakeBank, checkSurfaces } from '../../words/bake.mjs';
import { lockedPolicy } from '../../words/policy.mjs';
import { digest, requireThat } from '../../words/core.mjs';
import { privatePath } from '../../words/paths.mjs';
import { audioFor } from './audio.mjs';
import { generateSurface } from './generate.mjs';

/** Never changes review evidence, familySample, policy, or W1 admission rules. */
export function bakeSearch(input, plan, out) {
  privatePath(out);requireThat(!existsSync(out),'Bake output must be new');
  requireThat(input.fixture===false && plan.schemaVersion===1 && Array.isArray(plan.banks) && plan.banks.length>0 && plan.banks.length<=20,'A real W2 input and bank plan are required');
  lockedPolicy(input.policy);
  const used=new Set(),bankIds=new Set(),usedSurface=new Set(),results=[];
  for(const bank of plan.banks) {
    requireThat(Number.isInteger(bank.slot) && bank.slot>=80 && bank.slot<=99 && !used.has(bank.slot),'G6 bank slot must be unique and within 80–99');used.add(bank.slot);
    requireThat(!bankIds.has(bank.id) && /^[a-z][a-z0-9-]{0,23}$/.test(bank.id) && typeof bank.theme==='string' && bank.theme.length>0 && ['paddling','shallows','lagoon','reef','deep','trench'].includes(bank.band) && Number.isInteger(bank.tier) && bank.tier>=1 && bank.tier<=6 && ['pictures','words','hidden'].includes(bank.list) && Array.isArray(bank.grids) && bank.grids.length>0 && bank.grids.length<=1024,'Invalid bank plan');bankIds.add(bank.id);
    const records=bank.wordIds.map(id=>input.words.find(w=>w.id===id));requireThat(records.length>0 && records.every(Boolean),'Unknown reviewed answer ID');
    const surfaces=bank.grids.map(g=> {
      requireThat(typeof g.id==='string' && !usedSurface.has(g.id),'Grid IDs must be unique');usedSurface.add(g.id);
      const selected=g.wordIds ? records.filter(w=>g.wordIds.includes(w.id)) : records;requireThat(selected.length>0,'Grid needs reviewed answers');const made=generateSurface({...g,words:selected,policy:input.policy});return {...made,meta:{message:g.message??null}};
    });
    const ids=new Set(surfaces.flatMap(s=>s.surface.wordIds)), words=records.filter(w=>ids.has(w.id));
    // Both implementations run on every candidate that will be packed, even before family admission.
    checkSurfaces({words,surfaces:surfaces.map(s=>s.surface),policy:input.policy});
    const admission={...input,words,clues:[],surfaces:surfaces.map(s=>s.surface)};
    const baked=bakeBank(admission); // Includes the unchanged real-family-sample gate.
    if(bank.list==='pictures') {
      const pictures=JSON.parse(readFileSync(new URL('../../../content/pictures/manifest.json',import.meta.url))).pictures;
      requireThat(words.every(w=>audioFor(w)!==null && pictures.some(p=>p.word===w.spelling.toUpperCase())),'Picture banks need dictionary pictures and real recordings');
    }
    results.push({bank,admission,baked,surfaces});
  }
  // Write only after every W1 bank passes. Nothing is staged in the repository by this command.
  const staging=resolve(dirname(out),`.g6-bake-${process.pid}`);requireThat(!existsSync(staging),'Staging exists');
  try {
    mkdirSync(staging,{recursive:true,mode:0o700});mkdirSync(join(staging,'banks'));mkdirSync(join(staging,'private'),{mode:0o700});
    for(const r of results) {
      writeFileSync(join(staging,'banks',`${r.bank.id}.json`),JSON.stringify(r.baked.asset)+'\n',{mode:0o600});
      writeFileSync(join(staging,'private',`${r.bank.id}.input.private.json`),JSON.stringify(r.admission)+'\n',{mode:0o600});
      writeFileSync(join(staging,'private',`${r.bank.id}.receipt.private.json`),JSON.stringify(r.baked.receipt)+'\n',{mode:0o600});
    }
    const project=results.flatMap(r=>r.baked.asset.surfaces.map((s,i)=>({bank:r.bank.slot,band:r.bank.band,tier:r.bank.tier,title:r.bank.theme,family:r.bank.grids[i].family,id:s.id,seed:r.bank.grids[i].seed,payload:{language:r.baked.asset.words[0].language,cells:s.cells,words:s.listed.map(w=>({id:w.answer,spelling:w.answer,cells:w.cells.map(([y,x])=>y*s.cells[0].length+x),audio:audioFor(r.baked.asset.words.find(a=>a.id===w.wordId))})),theme:r.bank.grids[i].theme??r.bank.theme,list:r.bank.list,message:r.surfaces[i].meta.message}})));
    requireThat(project.length>=512 && project.length<=2048 && new Set(project.map(p=>digest(p.payload))).size===project.length,'Word Search needs 512–2048 distinct grids');
    for(const band of new Set(project.map(p=>p.band))) {
      const rows=project.filter(p=>p.band===band), families=new Set(rows.map(p=>p.family));
      requireThat([...families].every(f=>typeof f==='string' && /^[a-z][a-z0-9-]{0,23}$/.test(f) && rows.filter(p=>p.family===f).length<=Math.floor(rows.length/4)),'Theme family exceeds one quarter of a band');
    }
    writeFileSync(join(staging,'plan.json'),JSON.stringify(plan)+'\n',{mode:0o600});
    writeFileSync(join(staging,'puzzles.json'),JSON.stringify(project)+'\n',{mode:0o600});
    writeFileSync(join(staging,'receipt.json'),JSON.stringify({schemaVersion:1,fixture:false,bankCount:results.length,puzzles:project.length,distinctPayloads:new Set(project.map(p=>digest(p.payload))).size,slots:[...used],inputSha256:digest(input),planSha256:digest(plan),scannedBy:['js-trie-v1','python-rays'],familySample:'validated by W1; evidence retained privately'})+'\n',{mode:0o600});
    renameSync(staging,out);
    return {banks:results.length,puzzles:project.length,slots:[...used]};
  } catch(e) {rmSync(staging,{recursive:true,force:true});throw e;}
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try { const [input,plan,out]=process.argv.slice(2);requireThat(out,'bake <W2-input.private.json> <plan.json> <new-external-output>');console.log(JSON.stringify(bakeSearch(JSON.parse(readFileSync(input,'utf8')),JSON.parse(readFileSync(plan,'utf8')),resolve(out)))); }
  catch(e) { if(e.message==='Actual family sample required before shipping') console.error(e.message);console.error('Word Search bake stopped. No content was published. See the unchanged W1 gates and private input evidence.');process.exitCode=1; }
}
