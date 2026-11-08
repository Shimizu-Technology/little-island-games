import authored from './challenge-content.json';
import legacyMud from './legacy-mud.json';
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
 return {ref:{bank:[2,5].includes(i)?10:9,puzzle:[2,5].includes(i)?[2,5].indexOf(i):i,engine:'crab-commands',rules:1,hash:sha256Hex(JSON.stringify(d))},source:{kind:'deep-water',collection:9,puzzle:i},path:'deep-water',tier:i===6?1:i<1?1:i<3?2:i<4?3:i<5?4:5,title:`Mud ${i+1} of 7 · ${['Try a patch','Walk around','Shell stop','Dry crossing','Cards or steps?','Shell and sandcastles','Home stretch'][i]}`,descriptor:d,dares:[],awards:[clean,null],par:{metric:'steps',lower:p.minimumSteps,upper:p.minimumSteps}};
});
// Keep immutable pre-fix bank 9 entries available to saved refs, outside the picker.
const legacy: Puzzle<Descriptor>[]=legacyMud.map((p,j)=>{
 const i=[2,5][j],d=descriptor(p.descriptor),current=mud[i];
 return {...current,retired:true,ref:{...current.ref,bank:9,puzzle:i,hash:sha256Hex(JSON.stringify(d))},descriptor:d};
});
// Small authored proof sets use the replay kit. Bulk Endless banks are a later slice.
export const crabPuzzles:readonly Puzzle<Descriptor>[]=[...mud,...debug,...replays,...legacy];
