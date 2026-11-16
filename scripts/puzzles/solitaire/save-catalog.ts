import {readFileSync,writeFileSync} from 'node:fs';
import {publishedBanks} from '../../published-refs.mjs';
import type {BankFacts} from '../../../src/puzzles/table/registration';
import rawFacts from '../../../src/puzzles/table/packs.generated.json';
const facts=rawFacts as BankFacts[];
const path='src/state/save-catalog.json',catalog=JSON.parse(readFileSync(path,'utf8')),published=publishedBanks(path);
for(const b of facts){
 const bank={slot:b.slot,engine:'solitaire',rules:b.rules,first:b.first,count:b.count,family:b.family,packHash:b.packHash,awards:0,cove:true},text=JSON.stringify(bank);
 if((published.get(b.slot)??[]).some(p=>p.text!==text))throw new Error('Cannot replace a published Solitaire bank.');
 const i=catalog.banks.findIndex((x:{slot:number})=>x.slot===b.slot);if(i>=0)catalog.banks[i]=bank;else catalog.banks.push(bank);
 const context=`solitaire-${b.tier}`;if(!catalog.contexts.includes(context))catalog.contexts.push(context);
}
catalog.banks.sort((a:{slot:number},b:{slot:number})=>a.slot-b.slot);writeFileSync(path,JSON.stringify(catalog,null,2)+'\n');
