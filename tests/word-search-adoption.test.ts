import { expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
it('runs the entire synthetic plan → bake → check → install → puzzles:verify path in a disposable tree',()=>{
 const r=spawnSync(process.execPath,['--test','tests/helpers/word-search-adoption.mjs'],{encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024});
 expect(r.status,r.stdout+r.stderr).toBe(0);
},250000);
