import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { assertFrozenCatalog } from '../src/state/catalogManifest.ts';
if (execFileSync('git',['rev-parse','--is-shallow-repository'],{encoding:'utf8'}).trim() === 'true') throw new Error('Save catalog validation needs full Git history. Fetch with --unshallow before checking.');
const file='src/state/save-catalog.json', current=JSON.parse(readFileSync(file,'utf8'));
// Every committed generation in this branch is a constraint, including additions after the first freeze.
const commits=execFileSync('git',['log','--format=%H','--',file],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
for (const commit of commits) assertFrozenCatalog(JSON.parse(execFileSync('git',['show',`${commit}:${file}`],{encoding:'utf8'})),current);
console.log(`Save catalog immutable history: ${commits.length} generations checked.`);
