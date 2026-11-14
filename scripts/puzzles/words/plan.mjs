#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {privatePath} from '../../words/paths.mjs';
import {requireThat} from '../../words/core.mjs';
import {audioFor} from './audio.mjs';
export function makePlan(input,packs) {
  requireThat(input.fixture===false && packs.schemaVersion===1,'Real W2 input required');
  const authored=JSON.parse(readFileSync(new URL('../../../src/puzzles/words/themes.json',import.meta.url))),themes=authored.themes;
  requireThat(authored.sourcePackIdsSha256===createHash('sha256').update(JSON.stringify(packs.packs.map(p=>p.id))).digest('hex'),'Theme source binding changed');
  requireThat(themes.length===packs.packs.length,'Theme label input changed; refresh authored labels with review');
  const pictures=JSON.parse(readFileSync(new URL('../../../content/pictures/manifest.json',import.meta.url))).pictures;
  const specs=[['paddling',6,4,2,120,'pictures'],['shallows',8,6,4,360,'words'],['lagoon',10,8,8,480,'words'],['reef',12,10,8,480,'words'],['deep',15,12,8,300,'words'],['trench',16,12,8,300,'hidden']];
  return {schemaVersion:1,banks:specs.map(([band,size,count,directionCount,total,list],j)=>{
    const eligible=packs.packs.map((p,themeIndex)=>({...p,theme:themes[themeIndex].id,wordIds:p.wordIds.filter(id=>{const w=input.words.find(w=>w.id===id);return w && w.spelling.length<=size && (list!=='pictures' || audioFor(w)!==null && pictures.some(p=>p.word===w.spelling.toUpperCase()));})})).filter(p=>p.wordIds.length>=count);
    requireThat(eligible.length>=4,'Not enough reviewed picture/audio or theme coverage for this band');
    const grids=Array.from({length:total},(_,i)=>{const p=eligible[i%eligible.length];return{id:`search-${band}-${i}`,family:p.family,wordIds:p.wordIds,theme:p.theme,seed:(j+1)*100000+i,size,count,directionCount,distractors:j>=4?2:0};});
    return{slot:80+j,id:`search-${band}`,band,tier:j+1,theme:band,list,wordIds:[...new Set(eligible.flatMap(p=>p.wordIds))],grids};
  })};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {const [input,packs,out]=process.argv.slice(2);privatePath(out);requireThat(!existsSync(out),'Output exists');const plan=makePlan(JSON.parse(readFileSync(input)),JSON.parse(readFileSync(packs)));writeFileSync(out,JSON.stringify(plan)+'\n',{mode:0o600,flag:'wx'});console.log(JSON.stringify({banks:plan.banks.length,grids:plan.banks.reduce((n,b)=>n+b.grids.length,0)}));}
  catch{console.error('Cannot prepare a real Word Search plan; review picture/audio and theme coverage.');process.exitCode=1;}
}
