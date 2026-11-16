import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {certify,type CertifyContext} from '../../../src/puzzles/checks';
import {slotClaim,parseRange} from '../slots';
import {orderCandidates} from './order';
import {recipes} from './generate';
import {bakeFamily,productionDirs,readCatalog} from '../pipeline';
import {judge,rungs,klondike,freecell,type Candidate} from './family';

const log=process.env.SOLITAIRE_LOGS;if(!log)throw new Error('Set SOLITAIRE_LOGS to an external evidence directory.');mkdirSync(log,{recursive:true});
const spec=process.argv[2]==='freecell'?freecell:klondike,own=rungs.filter(r=>spec.bands.some(b=>b.id===r.id));
const ctx:CertifyContext={budget:10000,seenExact:new Set(),seenSemantic:new Set()},pools:Candidate[][]=[];
const max=Number(process.env.SOLITAIRE_TRIES??20000), useTargets=process.env.SOLITAIRE_TARGET==='1',refresh=process.env.SOLITAIRE_REFRESH==='1';
for(let band=0;band<own.length;band++){
 const r=own[band],want=useTargets?r.target:r.floor,kept:Candidate[]=[],per=new Map<string,number>(),rejects:Record<string,number>={},attempted=new Set<number>();const t=Date.now();
 const cached=join(log,`pool-${r.id}.json`);let poolWant=want*Number(process.env.SOLITAIRE_POOL??3);
 // Cached pools are seed proposals only: every selected deal is regenerated and certified by this source.
 if(existsSync(cached)){const prior=JSON.parse(readFileSync(cached,'utf8'));let seeds=prior.kept as Candidate[];if(refresh&&seeds.length>=want){try{const chosen=orderCandidates(seeds,want);if(chosen.length===want){seeds=chosen;poolWant=want;}}catch{/* Keep a partial candidate pool and collect more. */}}for(const old of seeds){attempted.add(old.core.seed);const c=judge(old.core.seed,r);if(!c||!certify(spec,spec.bands[band],c.core,ctx).ok)continue;kept.push(c);per.set(c.core.template,(per.get(c.core.template)??0)+1);}}
 if(poolWant===want&&kept.length<want)poolWant=want*Number(process.env.SOLITAIRE_POOL??3);
 if(!useTargets&&kept.length>=want){try{if(orderCandidates(kept,want).length>=r.floor)poolWant=kept.length;}catch{/* A wider pool may be needed. */}}
 for(let i=0;i<max&&kept.length<poolWant;i++) {
  const seed=((rungs.indexOf(r)+1)*0x1000000+i)>>>0;
  if(attempted.has(seed)||(per.get(recipes[seed%4])??0)>=Math.floor(poolWant/4))continue;
  const c=judge(seed,r);
  if(!c)continue;
  if((per.get(c.core.template)??0)>=Math.floor(poolWant/4))continue;
  const proof=certify(spec,spec.bands[band],c.core,ctx);
  if(!proof.ok){rejects[proof.reason]=(rejects[proof.reason]??0)+1;continue;}
  kept.push(c);per.set(c.core.template,(per.get(c.core.template)??0)+1);
  if(kept.length%4===0){writeFileSync(cached,JSON.stringify({rung:r.id,kept,rejects}));console.log(JSON.stringify({band:r.id,tried:i+1,kept:kept.length,want:poolWant,seconds:Math.round((Date.now()-t)/1000)}));
   if(!useTargets&&kept.length>=want){try{if(orderCandidates(kept,want).length>=r.floor)break;}catch{/* A wider pool may give all recipes a gentle shared range. */}}
  }
 }
 writeFileSync(join(log,`pool-${r.id}.json`),JSON.stringify({rung:r.id,kept,rejects}));
 if(kept.length<want)throw new Error(`${r.id}: ${kept.length}/${want}; below promised floor. Nothing published.`);
 const arranged=orderCandidates(kept,want);if(arranged.length<r.floor)throw new Error(`${r.id}: gentle order is below floor.`);pools.push(arranged);
}
if(process.env.SOLITAIRE_POOL_ONLY==='1'){console.log(JSON.stringify({family:spec.id,curated:pools.reduce((n,p)=>n+p.length,0),published:false}));process.exit(0);}
const arg=(key:string)=>{const i=process.argv.indexOf(key);if(i<0||!process.argv[i+1])throw new Error(`Missing ${key}.`);return process.argv[i+1];};
const catalog=readCatalog(productionDirs),range=parseRange(arg('--range')),owner=arg('--owner');
if(range.first!==100||range.last!==109||owner!=='g7a-solitaire')throw new Error('Use --range 100-109 --owner g7a-solitaire.');
const claim=slotClaim(productionDirs,catalog.families.values(),range,owner),base=spec.id==='solitaire'?100:106;
const listed={...spec,bands:spec.bands.map((b,i)=>({...b,target:pools[i].length})),generate:(seed:number,band:{id:string})=>{const i=spec.bands.findIndex(b=>b.id===band.id),index=seed-1-i*0x1000000;return pools[i]?.[index]?.core??null;}};
const result=bakeFamily(listed,{dirs:productionDirs,claim:{...claim,range:{first:base,last:spec.id==='solitaire'?105:109}},budget:10000,seedBase:1,maxAttempts:Math.max(...pools.map(p=>p.length)),sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()});
console.log(JSON.stringify(result));if(!result.published||result.slots.some(s=>s<base||s>109))throw new Error('Bake did not publish in reserved slots.');
