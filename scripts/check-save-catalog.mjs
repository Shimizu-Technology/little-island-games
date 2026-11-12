import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { assertFrozenCatalog } from '../src/state/catalogManifest.ts';
import { publishedJson } from './published-refs.mjs';
if (execFileSync('git',['rev-parse','--is-shallow-repository'],{encoding:'utf8'}).trim() === 'true') throw new Error('Save catalog validation needs full Git history. Fetch with --unshallow before checking.');
const file='src/state/save-catalog.json', current=JSON.parse(readFileSync(file,'utf8'));
// The catalog at the tip of every published ref is a constraint, however its commits got there
// (merge, squash or rebase). A bank no published tip holds may still be replaced by its branch.
// A missing ref or an unreadable published catalog stops the check (scripts/published-refs.mjs).
const published=publishedJson(file);
const sha=text=>createHash('sha256').update(text).digest('hex');
const entries=bank=>{
 if('entries' in bank)return bank.entries;
 const root=JSON.parse(readFileSync('src/content/puzzles/root.json','utf8'));
 const family=root.families.find(f=>f[0]===bank.family);
 if(!family)throw new Error('Missing compatibility family.');
 const manifestText=readFileSync(`src/content/puzzles/assets/${family[1]}.lipuzzle`,'utf8');
 if(sha(manifestText)!==family[2])throw new Error('Family hash mismatch.');
 const manifest=JSON.parse(manifestText), row=manifest.packs.find(p=>p[0]===bank.slot);
 if(manifest.engine!==bank.engine || !row || row[1]!==bank.first || row[2]!==bank.count || row[4]!==bank.packHash || row[6]!==bank.rules)throw new Error('Packed bank facts mismatch.');
 const text=readFileSync(`src/content/puzzles/assets/p${bank.slot}.lipuzzle`,'utf8');
 if(sha(text)!==row[4] || Buffer.byteLength(text)!==row[3])throw new Error('Pack hash mismatch.');
 const [header,...lines]=text.trimEnd().split('\n'), h=JSON.parse(header);
 if(h.slot!==bank.slot || h.first!==bank.first || h.count!==bank.count || h.rules!==bank.rules || lines.length!==bank.count)throw new Error('Pack header mismatch.');
 return lines.map((line,i)=>({ordinal:bank.first+i,hash:sha(line)}));
};
// Resolve every packed bank at build time as well as any old inline-to-range conversion.
for(const bank of current.banks)entries(bank);
const slots=new Set();
for (const {ref,commit,value} of published){
 try{assertFrozenCatalog(value,current,entries);}catch(e){throw new Error(`Save catalog published at ${ref} (${commit.slice(0,8)}): ${e instanceof Error?e.message:String(e)}`);}
 for(const bank of value.banks)slots.add(bank.slot);
}
const own=current.banks.filter(b=>!slots.has(b.slot)).length;
console.log(`Save catalog immutable: ${published.length} published catalog${published.length===1?"":"s"} checked (${published.map(p=>p.ref).join(', ')}; ${slots.size} published banks)${own?`; ${own} unpublished banks may still be replaced`:''}.`);
