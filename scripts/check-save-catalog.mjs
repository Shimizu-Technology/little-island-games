import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { assertFrozenCatalog } from '../src/state/catalogManifest.ts';
import { publishedHistory } from './published-refs.mjs';
if (execFileSync('git',['rev-parse','--is-shallow-repository'],{encoding:'utf8'}).trim() === 'true') throw new Error('Save catalog validation needs full Git history. Fetch with --unshallow before checking.');
const file='src/state/save-catalog.json', current=JSON.parse(readFileSync(file,'utf8'));
// Every committed generation a published ref contains is a constraint, including additions after the
// first freeze. A branch-only generation may still be replaced by its branch (scripts/published-refs.mjs).
const history=publishedHistory();
const all=execFileSync('git',['log','--full-history','--format=%H','--',file],{encoding:'utf8'}).trim().split('\n').filter(Boolean), commits=all.filter(history.published);
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
for (const commit of commits) assertFrozenCatalog(JSON.parse(execFileSync('git',['show',`${commit}:${file}`],{encoding:'utf8'})),current,entries);
console.log(`Save catalog immutable history: ${commits.length} generations checked${all.length>commits.length?` (${all.length-commits.length} unpublished branch generations may still be replaced; published refs: ${history.refs.join(', ')})`:''}.`);
