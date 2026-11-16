import {readFileSync,writeFileSync} from 'node:fs';
import {readCatalog,productionDirs} from '../pipeline';
import {rungs} from './family';
import type {BankFacts} from '../../../src/puzzles/table/registration';
const freeGuides:Record<number,string>={1:'All cards are face up. Make a few space-making moves, then build each suit from its low cards.',3:'All cards are face up. Use free cells and columns to plan your next moves.',5:'All cards are face up. Look past the next move and keep useful spaces open.',6:'All cards are face up. Compare longer plans before using your free spaces.'};
const catalog=readCatalog(productionDirs),facts:BankFacts[]=[];
for(const family of ['solitaire','freecell']){const m=catalog.families.get(family);if(!m)continue;for(const p of m.packs){const r=rungs.find(r=>r.id===m.bands[p[5]]);if(!r)throw new Error('Unknown Solitaire rung.');facts.push({family,slot:p[0],first:p[1],count:p[2],packHash:p[4],rules:p[6],band:r.id,tier:r.tier,title:r.title,summary:r.mode==='freecell'?freeGuides[r.tier]:`${r.tier===1?'Direct foundation building':r.tier===3?'Short visible plans':'Longer visible plans and stock decisions'}. A winning line exists; hidden cards still require exploration.`});}}
const text=JSON.stringify(facts,null,1)+'\n',path='src/puzzles/table/packs.generated.json';
if(process.argv.includes('--check')){if(readFileSync(path,'utf8')!==text)throw new Error('Stale Solitaire facts.');}else writeFileSync(path,text);
