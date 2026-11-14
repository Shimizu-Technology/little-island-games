import {readFileSync,statSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {expect,it} from 'vitest';
import {engines} from '../src/learn/engines';
// Owner: lead — Slip Tide help audio. Remove the entry as soon as audio ships.
const knownMissing = ['slip-help'];
/** Inspect the shipped require table without loading native audio assets into Node. */
it('P2-6 every learning engine helpAudio resolves to a shipped source in both voices',()=>{
 const file=resolve('src/content/neuralAudio.ts'),text=readFileSync(file,'utf8');
 const sources=[...text.matchAll(/["']([^"']+)["']:\s*require\(["']([^"']+)["']\)/g)];
 for(const key of knownMissing)expect(sources.some(m=>m[1]===key),`${key} now resolves; remove its known-missing entry`).toBe(false);
 for(const e of Object.values(engines)){if(!e.helpAudio||knownMissing.includes(e.helpAudio))continue;const hits=sources.filter(m=>m[1]===e.helpAudio);expect(hits.length,e.id).toBe(2);for(const hit of hits)expect(statSync(resolve(dirname(file),hit[2])).size,e.id).toBeGreaterThan(0);}
});
