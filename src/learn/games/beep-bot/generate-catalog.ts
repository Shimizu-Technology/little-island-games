import {publishedJson} from '../../../../scripts/published-refs.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {beepPuzzles} from './challenge-content';
import {assertFrozenCatalog,type CatalogManifest} from '../../../state/catalogManifest';
import type {Bank,Dare} from '../../../state/challenge';
const file='src/state/save-catalog.json',previous=JSON.parse(readFileSync(file,'utf8')) as CatalogManifest;
const banks:Bank[]=[200,201,202].map(slot=>{const rows=beepPuzzles.filter(p=>p.ref.bank===slot);return {slot,engine:'beep-bot',rules:1,entries:rows.map(p=>({ordinal:slot*1024+p.ref.puzzle,hash:p.ref.hash})),awards:rows.map(()=>1),cove:false};});
const dares:[number,Dare][]=beepPuzzles.flatMap(p=>p.dares.map(d=>[d.slot,{kind:d.rule.kind,help:d.help,bank:p.ref.bank,puzzle:p.ref.puzzle}] as [number,Dare]));
const next:CatalogManifest={...previous,banks:[...previous.banks.filter(b=>![200,201,202].includes(b.slot)),...banks].sort((a,b)=>a.slot-b.slot),dares:[...previous.dares.filter(([slot])=>!dares.some(([s])=>slot===s)),...dares].sort((a,b)=>a[0]-b[0]),contexts:[...new Set([...previous.contexts,'beep-3','beep-4','beep-5'])]};
// An unpublished branch bank may be rebaked; every published tip stays immutable.
for(const {value} of publishedJson(file))assertFrozenCatalog(value as CatalogManifest,next);
assertFrozenCatalog({...previous,banks:previous.banks.filter(b=>![200,201,202].includes(b.slot))},next);writeFileSync(file,JSON.stringify(next,null,2)+'\n');
