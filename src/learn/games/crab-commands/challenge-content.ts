import authored from './challenge-content.json';
import legacyMud from './legacy-mud.json';
import legacyMud2 from './legacy-mud-2.json';
import deepWater from './deep-content.json';
import { decodeProgram, type PackedProgram } from '../../program/codec';
import type { Program } from '../../program/model';
import type { Descriptor } from './challenge-engine';
import type { Puzzle, RegisteredDare } from '../../../challenge/types';
import { sha256Hex } from '../../../puzzles/sha256';
const descriptor=(value:unknown)=>value as Descriptor;
const clean={rule:{kind:'clean' as const},help:'independent' as const};
export const proofContent=authored;
const replayDare=(i:number,cards:number):RegisteredDare=>{
 const slot=129+i*2, id=`crab-${authored.replays[i].descriptor.level.id}-stretch`;
 if([0,2].includes(i))return {slot,id,label:'Footprints off',retired:true,rule:{kind:'blind'},help:'allowed'};
 if([4,6,11].includes(i))return {slot,id,label:'Two runs only',rule:{kind:'plan',max:2},help:'allowed'};
 const max=cards+(i<4?2:0);
 return {slot,id,label:i<4?'Two extra cards at most':i<8?'Shortest plan':'Use Again to save cards',rule:{kind:'par',metric:'cards',max},help:'allowed'};
};
const beachNames=['Shell corner','Shell inlet','Twin-shell bay','Sandcastle channel','Home around the bend','Hidden shell cove','Winding shore','Sandcastle passage','Long shell beach','Faraway home','Two-shell journey','Three-shell crossing'];
const replays: Puzzle<Descriptor>[]=authored.replays.map((p,i)=>{
 const d=descriptor(p.descriptor), level=d.level.pace==='easy'?1:d.level.pace==='medium'?2:3;
 return {ref:{bank:7,puzzle:i,engine:'crab-commands',rules:1,hash:sha256Hex(JSON.stringify(d))},source:{kind:'school',game:'crab-commands',level,puzzle:d.level.id},path:'endless',tier:level,title:`Level ${level} dare · ${beachNames[i]}`,descriptor:d,dares:[{slot:128+i*2,id:`crab-${d.level.id}-clean`,label:'No help and no missed run',...clean},replayDare(i,p.cards),...([3,7].includes(i)?[{slot:i===3?152:153,id:`crab-${d.level.id}-blind-long`,label:'Footprints off',rule:{kind:'blind' as const},help:'allowed' as const}]:[])],awards:[clean,null],par:{metric:'cards',lower:p.cards,upper:p.cards}};
});
const debug: Puzzle<Descriptor>[]=authored.debug.map((p,i)=>{
 const d=descriptor(p.descriptor);
 return {ref:{bank:8,puzzle:i,engine:'crab-commands',rules:1,hash:sha256Hex(JSON.stringify(d))},source:{kind:'deep-water',collection:8,puzzle:i},path:'deep-water',tier:4,title:`Fix a bug ${i+1} · ${['Wrong turn','Missing card','Extra card','Swapped pair'][i]}`,descriptor:d,dares:[],awards:[clean,{rule:{kind:'edits',max:i===3?2:1},help:'independent'}],par:{metric:'cards',lower:p.cards,upper:p.cards}};
});
const mud: Puzzle<Descriptor>[]=authored.mud.map((p,i)=>{
 const d=descriptor(p.descriptor);
 return {ref:{bank:[2,5].includes(i)?11:9,puzzle:[2,5].includes(i)?[2,5].indexOf(i):i,engine:'crab-commands',rules:1,hash:sha256Hex(JSON.stringify(d))},source:{kind:'deep-water',collection:9,puzzle:i},path:'deep-water',tier:i===6?1:i<1?1:i<3?2:i<4?3:i<5?4:5,title:`Mud ${i+1} of 7 · ${['Try a patch','Walk around','Shell stop','Dry crossing','Cards or steps?','Shell and sandcastles','Home stretch'][i]}`,descriptor:d,dares:[],awards:[clean,null],par:{metric:'steps',lower:p.minimumSteps,upper:p.minimumSteps}};
});
// Keep immutable earlier Mud 3 and Mud 6 entries available to saved refs, outside the picker:
// the pre-fix bank 9 pair, then the C1 bank 10 pair that C1b replaced (bank 11).
const retire=(entries:typeof legacyMud,bank:number,puzzle:(i:number,j:number)=>number):Puzzle<Descriptor>[]=>entries.map((p,j)=>{
 const i=[2,5][j],d=descriptor(p.descriptor),current=mud[i];
 return {...current,retired:true,ref:{...current.ref,bank,puzzle:puzzle(i,j),hash:sha256Hex(JSON.stringify(d))},descriptor:d,par:{metric:'steps',lower:p.minimumSteps,upper:p.minimumSteps}};
});
const legacy=[...retire(legacyMud,9,i=>i),...retire(legacyMud2,10,(_,j)=>j)];
/** C1d Deep Water: five ideas of five, each teach, develop, twist, short hard, easy finish (banks 12–16).
 * Proofs are re-run on this engine in tests/c1d-crab-deep.test.ts. */
type DeepEntry={role:string;descriptor:unknown;cards:number;solutions?:unknown[]};
const ideas:[key:keyof typeof deepWater,bank:number,name:string,tiers:number[],parts:string[]][]=[
 ['tide',12,'Rising tide',[1,2,3,4,1],['Dry crossing','Just in time','Which shell first?','Fast tide','Easy crossing']],
 ['key',13,'Key and gate',[2,3,4,5,2],['Key on the way','Fetch the key','Shells and a gate','Key away','Key, gate, home']],
 ['songs',14,'Songs',[3,4,5,6,3],['Call it twice','Three times','Between the groups','Tight tray','One more song']],
 ['fog',15,'Foggy beach',[3,4,5,6,3],['Two beaches','Walk or turn','Different castles','Tight tray','Foggy finish']],
 ['two',16,'Two crabs',[2,3,5,6,2],['Walk together','Hold one still','Castle hold','Who waits?','Home together']],
];
/** Dares only on the tier-6 rungs, which no earlier Deep Water idea uses: a dare in a shared tier would change what
 * the finish card offers after Mud. First run, and for card plans the shortest plan. Slots from 154. */
let dareSlot=154;
export const deepPuzzles:Puzzle<Descriptor>[]=ideas.flatMap(([key,bank,name,tiers,parts])=>(deepWater[key] as DeepEntry[]).map((p,i)=>{
 const d=descriptor(p.descriptor), blocks=d.tray!==undefined, hard=tiers[i]===6;
 const dares:RegisteredDare[]=hard?[{slot:dareSlot++,id:`crab-${String(key)}-${i+1}-first`,label:'First run works',rule:{kind:'plan',max:1},help:'allowed'},...(blocks?[]:[{slot:dareSlot++,id:`crab-${String(key)}-${i+1}-par`,label:'Shortest plan',rule:{kind:'par' as const,metric:'cards' as const,max:p.cards},help:'allowed' as const}])]:[];
 return {ref:{bank,puzzle:i,engine:'crab-commands',rules:1,hash:sha256Hex(JSON.stringify(d))},source:{kind:'deep-water',collection:bank,puzzle:i},path:'deep-water',tier:tiers[i] as Puzzle<Descriptor>['tier'],title:`${name} ${i+1} of 5 · ${parts[i]}`,descriptor:d,dares,awards:[clean,null],...(blocks?{}:{par:{metric:'cards' as const,lower:p.cards,upper:p.cards}})};
}));
const certified=new Map(ideas.flatMap(([key])=>(deepWater[key] as DeepEntry[]).map(p=>[JSON.stringify(p.descriptor),(p.solutions??[]) as PackedProgram[]] as const)));
/** Certified block winners for a tray puzzle, used by its block hint. */
export const blockSolutions=(d:Descriptor):Program[]=>(certified.get(JSON.stringify(d))??[]).map(p=>decodeProgram(p)).filter((p):p is Program=>!!p);
// Small authored proof sets use the replay kit. Bulk Endless banks are a later slice.
export const crabPuzzles:readonly Puzzle<Descriptor>[]=[...mud,...debug,...replays,...legacy,...deepPuzzles];
