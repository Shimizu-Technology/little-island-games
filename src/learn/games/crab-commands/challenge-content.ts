import authored from './challenge-content.json';
import type { Descriptor } from './challenge-engine';
import type { Puzzle, RegisteredDare } from '../../../challenge/types';
import { sha256Hex } from '../../../puzzles/sha256';
const descriptor=(value:unknown)=>value as Descriptor;
const clean={rule:{kind:'clean' as const},help:'independent' as const};
export const proofContent=authored;
const replayDare=(i:number,cards:number):RegisteredDare=>{
 const slot=129+i*2, id=`crab-${authored.replays[i].descriptor.level.id}-stretch`;
 if([0,2].includes(i))return {slot,id,label:'Footprints off',rule:{kind:'blind'},help:'allowed'};
 if([4,6,11].includes(i))return {slot,id,label:'Two runs only',rule:{kind:'plan',max:2},help:'allowed'};
 const max=cards+(i<4?1:0);
 return {slot,id,label:i<4?'One extra card at most':i<8?'No extra turns':'Use Again to save cards',rule:{kind:'par',metric:'cards',max},help:'allowed'};
};
const replays: Puzzle<Descriptor>[]=authored.replays.map((p,i)=>{
 const d=descriptor(p.descriptor), level=d.level.pace==='easy'?1:d.level.pace==='medium'?2:3;
 return {ref:{bank:7,puzzle:i,engine:'crab-commands',rules:1,hash:sha256Hex(JSON.stringify(d))},source:{kind:'school',game:'crab-commands',level,puzzle:d.level.id},path:'endless',tier:level,title:`Level ${level} dare · Beach ${d.level.id}`,descriptor:d,dares:[{slot:128+i*2,id:`crab-${d.level.id}-clean`,label:'No help and no missed run',...clean},replayDare(i,p.cards)],awards:[clean,null],par:{metric:'cards',lower:p.cards,upper:p.cards}};
});
const debug: Puzzle<Descriptor>[]=authored.debug.map((p,i)=>{
 const d=descriptor(p.descriptor);
 return {ref:{bank:8,puzzle:i,engine:'crab-commands',rules:1,hash:sha256Hex(JSON.stringify(d))},source:{kind:'deep-water',collection:8,puzzle:i},path:'deep-water',tier:4,title:`Fix a bug ${i+1} · ${['Wrong turn','Missing card','Extra card','Swapped pair'][i]}`,descriptor:d,dares:[],awards:[clean,{rule:{kind:'edits',max:i===3?2:1},help:'independent'}],par:{metric:'cards',lower:p.cards,upper:p.cards}};
});
const mud: Puzzle<Descriptor>[]=authored.mud.map((p,i)=>{
 const d=descriptor(p.descriptor);
 return {ref:{bank:9,puzzle:i,engine:'crab-commands',rules:1,hash:sha256Hex(JSON.stringify(d))},source:{kind:'deep-water',collection:9,puzzle:i},path:'deep-water',tier:i<1?1:i<3?2:i<4?3:i<5?4:i<6?5:6,title:`Mud ${i+1} of 7 · ${['Try a patch','Walk around','Shell stop','Dry crossing','Cards or steps?','Shell and sandcastles','Home stretch'][i]}`,descriptor:d,dares:[],awards:[clean,null],par:{metric:'steps',lower:p.minimumSteps,upper:d.budget!}};
});
// Small authored proof sets use the replay kit. Bulk Endless banks are a later slice.
export const crabPuzzles:readonly Puzzle<Descriptor>[]=[...mud,...debug,...replays];
