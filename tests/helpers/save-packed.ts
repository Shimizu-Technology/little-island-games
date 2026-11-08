import { migrateLibrary } from '../../src/library/state';
import { backfillRewards } from '../../src/badges/transitions';
import { createHash } from 'node:crypto';
import { type PackedBank } from '../../src/state/bankFacts';
import { emptyChallenge, type SaveCatalog, type ChallengeSession } from '../../src/state/challenge';
import { createBankLoader } from '../../src/puzzles/loader';
import { encodePack, manifestAsset, type FamilyManifest, type RootIndex } from '../../src/puzzles/bank';
import { emptySave } from '../../src/state/validation';
import { migrateProfiles, projectProfile } from '../../src/state/profiles';
import { addLearner } from '../../src/learn/learners';
const sha=(text:string)=>createHash('sha256').update(text).digest('hex');
export function fixture(){
 const files=new Map<string,string>(), banks=new Map<number,PackedBank>(), root:RootIndex={format:1,revision:1,nextSlot:108,nextOrdinal:800,families:[]};
 for(let i=0;i<8;i++){
  const slot=100+i, family=`packed-${i}`, engine=family, first=i*100, rules=i===0?2:1;
  const text=encodePack({format:1,family,slot,first,count:100,band:'open',rules,rng:1},Array.from({length:100},(_,n)=>JSON.stringify([n,'a','t',n+1])));
  files.set(`p${slot}`,text);
  const m:FamilyManifest={format:1,family,engine,bands:['open'],packs:[[slot,first,100,Buffer.byteLength(text),sha(text),0,rules,1]],retired:i===0?[slot]:[],daily:[],speech:{count:0,hash:null}};
  const t=JSON.stringify(m),hash=sha(t),asset=manifestAsset(family,hash);files.set(asset,t);root.families.push([family,asset,hash,100,1,Buffer.byteLength(text)+t.length]);
  banks.set(slot,{slot,engine,rules,first,count:100,family,packHash:sha(text),awards:3,cove:true});
 }
 const catalog:SaveCatalog={banks,codecs:new Map([...banks.values()].map(b=>[`${b.engine}-v${b.rules}`,{game:b.engine,cove:true,budget:{wrapper:700,draft:3396,undo:0,audit:0},validate:(s:ChallengeSession)=>s.payload===s.revision,evaluate:()=>null,canStart:()=>true,extends:(a:ChallengeSession,b:ChallengeSession)=>b.revision>a.revision}])),dares:new Map(),contexts:new Set()};
 const reads:string[]=[];
 const loader=createBankLoader({root,transport:{read:async name=>{reads.push(name);const text=files.get(name);if(text===undefined)throw new Error('read failed');return text;}}});
 const session=(owner='family',i=0,index=0):ChallengeSession=>{const bank=banks.get(100+i)!;return {version:1,owner,game:bank.engine,id:`${owner}-${i}`,ordinal:i+1,revision:0,puzzle:{bank:bank.slot,puzzle:index,engine:bank.engine,rules:bank.rules,hash:sha(files.get(`p${bank.slot}`)!.split('\n')[index+1])},codec:`${bank.engine}-v${bank.rules}`,payload:0,selectedDares:[],partner:null,result:null,credited:false};};
 return {files,banks,root,catalog,loader,reads,session};
}
export function envelope(f:ReturnType<typeof fixture>){
 let learning=addLearner(undefined,'A','a');for(const id of ['b','c','d'])learning=addLearner(learning,id,id);
 const save=migrateProfiles({...emptySave(),learning});
 for(const [owner,p] of Object.entries(save.profiles!.people))p.challenge={...emptyChallenge(),nextOrdinal:9,paused:Array.from({length:8},(_,i)=>f.session(owner,i))};
 save.cove={version:1,active:null,people:Object.fromEntries(Array.from({length:4},(_,i)=>{const owner=`cove-${i}`;return [owner,{name:owner,challenge:{...emptyChallenge(true),nextOrdinal:5,paused:Array.from({length:4},(_,j)=>f.session(owner,j))}}];}))};
 return backfillRewards(migrateLibrary(projectProfile(save),{existingLearners:true}));
}
