import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { admitGenerated } from './generated-admission.mjs';
import { requireThat } from './core.mjs';
export const wordFamily = id => /(?:^|-)(?:word-search|crossword|fill-in|word-ladder|word-scramble|word-builder)(?:$|-)/.test(id);
export function admitPuzzlePack(root,family,engine,cores) {
  if(!wordFamily(family) && !wordFamily(engine))return undefined;
  const words=[];
  function visit(value) {
    if(typeof value==='string')words.push(value);
    else if(Array.isArray(value))value.forEach(visit);
    else if(value && typeof value==='object')for(const [key,child] of Object.entries(value))if(!['cells','grid','board'].includes(key))visit(child);
  }
  for(const core of cores){visit(core.payload);visit(core.speech?.terms);}
  requireThat(words.length>0,'Word puzzle family must expose decoded vocabulary for admission');
  return admitGenerated(root,'puzzles',[...new Set(words)]);
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try{const {family,engine,cores}=JSON.parse(readFileSync(0,'utf8'));admitPuzzlePack(process.cwd(),family,engine,cores);}
  catch{console.error('Puzzle vocabulary admission failed');process.exitCode=1;}
}
