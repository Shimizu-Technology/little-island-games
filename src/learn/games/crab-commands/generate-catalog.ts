/** Append-only catalog generator for the lead-approved Crab registration. */
import { readFileSync, writeFileSync } from 'node:fs';
import { crabPuzzles } from './challenge-content';
import { assertFrozenCatalog, type CatalogManifest } from '../../../state/catalogManifest';
import type { Bank, Dare } from '../../../state/challenge';
const file='src/state/save-catalog.json', previous=JSON.parse(readFileSync(file,'utf8')) as CatalogManifest;
const banks=new Map<number,Bank>(), dares: [number,Dare][]=[];
for(const p of [...crabPuzzles].sort((a,b)=>a.ref.bank-b.ref.bank||a.ref.puzzle-b.ref.puzzle)) {
 const prior=banks.get(p.ref.bank);
 if(prior && !('entries' in prior))throw new Error('Expected authored bank');
 banks.set(p.ref.bank,{slot:p.ref.bank,engine:'crab-commands',rules:1,entries:[...(prior?.entries??[]),{ordinal:p.ref.bank*1024+p.ref.puzzle,hash:p.ref.hash}],awards:[...(prior?.awards as number[]??[]),p.awards.reduce((bits,a,i)=>bits|(a?1<<i:0),0)],cove:false});
 dares.push(...p.dares.map(d=>[d.slot,{kind:d.rule.kind,help:d.help,bank:p.ref.bank,puzzle:p.ref.puzzle}] as [number,Dare]));
}
const next:CatalogManifest={version:2,banks:[...previous.banks.filter(b=>!banks.has(b.slot)),...banks.values()].sort((a,b)=>a.slot-b.slot),dares:[...previous.dares.filter(([slot])=>!dares.some(([s])=>s===slot)),...dares].sort((a,b)=>a[0]-b[0]),contexts:[...new Set([...previous.contexts,...crabPuzzles.map(p=>`crab-${p.tier}`)])]};
assertFrozenCatalog(previous,next);
writeFileSync(file,JSON.stringify(next,null,2)+'\n');
console.log(`Crab catalog generated: ${banks.size} authored banks, ${dares.length} retained dares.`);
