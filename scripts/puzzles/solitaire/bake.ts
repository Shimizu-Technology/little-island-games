import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {certify,type CertifyContext} from '../../../src/puzzles/checks';
import {validRoot} from '../../../src/puzzles/bank';
import {arrangeBy} from '../order';
import {bakeFamily,productionDirs} from '../pipeline';
import {solve} from '../../../src/puzzles/table/solver';
import {judge,rungs,klondike,freecell,type Candidate} from './family';

const log=process.env.SOLITAIRE_LOGS;if(!log)throw new Error('Set SOLITAIRE_LOGS to an external evidence directory.');mkdirSync(log,{recursive:true});
const spec=process.argv[2]==='freecell'?freecell:klondike,own=rungs.filter(r=>spec.bands.some(b=>b.id===r.id));
const ctx:CertifyContext={budget:10000,seenExact:new Set(),seenSemantic:new Set()},pools:Candidate[][]=[];
const max=Number(process.env.SOLITAIRE_TRIES??20000), useTargets=process.env.SOLITAIRE_TARGET==='1';
for(let band=0;band<own.length;band++){
 const r=own[band],want=useTargets?r.target:r.floor,poolWant=want*Number(process.env.SOLITAIRE_POOL??3),kept:Candidate[]=[],per=new Map<string,number>(),rejects:Record<string,number>={};const t=Date.now();
 const cached=join(log,`pool-${r.id}.json`);
 if(existsSync(cached)){const prior=JSON.parse(readFileSync(cached,'utf8'));for(const old of prior.kept){const c=judge(old.core.seed,r);if(!c||JSON.stringify(c.core)!==JSON.stringify(old.core)||!certify(spec,spec.bands[band],c.core,ctx).ok)continue;kept.push(c);per.set(c.core.template,(per.get(c.core.template)??0)+1);}}
 for(let i=0;i<max&&kept.length<poolWant;i++) {
  const seed=((rungs.indexOf(r)+1)*0x1000000+i)>>>0,c=judge(seed,r);
  if(!c)continue;
  if((per.get(c.core.template)??0)>=Math.floor(poolWant/4))continue;
  const proof=certify(spec,spec.bands[band],c.core,ctx);
  if(!proof.ok){rejects[proof.reason]=(rejects[proof.reason]??0)+1;continue;}
  kept.push(c);per.set(c.core.template,(per.get(c.core.template)??0)+1);
  if(kept.length%4===0)console.log(JSON.stringify({band:r.id,tried:i+1,kept:kept.length,want:poolWant,seconds:Math.round((Date.now()-t)/1000)}));
 }
 writeFileSync(join(log,`pool-${r.id}.json`),JSON.stringify({rung:r.id,kept,rejects}));
 if(kept.length<want)throw new Error(`${r.id}: ${kept.length}/${want}; below promised floor. Nothing published.`);
 const arranged=arrangeBy(c=>c.workload,kept,want);if(arranged.length<r.floor)throw new Error(`${r.id}: gentle order is below floor.`);pools.push(arranged);
}
const witnesses=JSON.parse(readFileSync('src/puzzles/table/witnesses.generated.json','utf8'));for(const c of pools.flat()){if(c.core.payload.mode!=='freecell')continue;const r=solve(c.core.payload,undefined,10000);if(r.status!=='solved')throw new Error('Lost winning line.');witnesses[c.core.payload.cards]=r.moves;}writeFileSync('src/puzzles/table/witnesses.generated.json',JSON.stringify(witnesses)+'\n');
const path=join(productionDirs.content,'root.json'),root:unknown=JSON.parse(readFileSync(path,'utf8'));if(!validRoot(root))throw new Error('Invalid root.');
const base=spec.id==='solitaire'?100:106;if(root.nextSlot>base)throw new Error('Reserved slots are behind catalog cursor.');
writeFileSync(path,JSON.stringify({...root,nextSlot:base,nextOrdinal:Math.max(root.nextOrdinal,base*1024)})+'\n');
const listed={...spec,bands:spec.bands.map((b,i)=>({...b,target:pools[i].length})),generate:(seed:number,band:{id:string})=>{const i=spec.bands.findIndex(b=>b.id===band.id),index=seed-1-i*0x1000000;return pools[i]?.[index]?.core??null;}};
const result=bakeFamily(listed,{dirs:productionDirs,budget:10000,seedBase:1,maxAttempts:Math.max(...pools.map(p=>p.length)),sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()});
console.log(JSON.stringify(result));if(!result.published||result.slots.some(s=>s<base||s>109))throw new Error('Bake did not publish in reserved slots.');
