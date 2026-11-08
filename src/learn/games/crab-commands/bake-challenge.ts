/** Build-time only. Freeze authored beaches, real-engine witnesses and exact card bounds. */
import { writeFileSync } from 'node:fs';
import { levels, commands, type Command, type Level } from './engine';
import { execute, solution, type Descriptor } from './challenge-engine';
const replayIds=['ea5','eb1','e5','e7','mb1','m2','m4','m7','hb1','h1','h5','h7'];
const descriptor=(level:Level,budget:number|null=null,starter:Command[]=[],lesson='Collect every shell, then reach home.'):Descriptor=>({level:structuredClone(level),budget,starter,lesson});
const replays=replayIds.map(id=>descriptor(levels.find(l=>l.id===id)!));
const debug=['m7','m2','m4','m8'].map((id,i)=>{
 const d=descriptor(levels.find(l=>l.id===id)!,null,[],['A turn points the wrong way. Tap a card, then Replace it.','A card is missing. Tap a card, then Insert before.','One extra card sends the crab away. Tap it, then Remove.','Two neighbouring cards traded places. Replace them, then Go.'][i]);
 const good=solution(d)!;let broken=[...good];
 if(i===0){const at=good.findIndex(c=>c.startsWith('turn'));broken[at]=good[at]==='turn-left'?'turn-right':'turn-left';}
 if(i===1){broken.splice(2,1);}
 if(i===2){broken.splice(1,0,'turn-right');}
 if(i===3){const at=good.findIndex((c,j)=>j<good.length-1&&c!==good[j+1]);[broken[at],broken[at+1]]=[broken[at+1],broken[at]];}
 if(execute(d,broken).won)throw new Error(`Debug mutation still wins: ${id}`);
 return {...d,starter:broken};
});
const mudRows=[
 ['CmH##','#####','#####','#####','#####'],
 ['CmmmH','.....','#####','#####','#####'],
 ['CmmmH','..S..','#####','#####','#####'],
 ['Cmm#H','...m.','.....','#####','#####'],
 ['#..mH','#S...','#mC..','m....','...m.'],
 ['C#m.H','.m#..','.S#..','..m..','.....'],
 ['C.mH#','....#','#####','#####','#####'],
];
const budgets=[3,6,6,8,6,11,5];
const lessons=[
 'Mud costs 2 walking steps. Sand costs 1. Turns cost no steps. Walk across this patch to try it.',
 'The straight path costs 7 steps. You have 6. Can a longer plan walk around the mud?',
 'The shell is near the mud. Plan where to return to the top row.',
 'A sandcastle blocks the straight path. Look for a dry crossing.',
 'Cards and walking steps are different. A short plan can cost more steps.',
 'Collect the shell on the way. Plan your way back around the sandcastles.',
 'One small patch to finish. The budget is roomy: choose your own route.',
];
const mud=mudRows.map((rows,i)=>descriptor({id:`mud-${i+1}`,pace:'medium',skill:'think.sequence',rows,facing:1,tier:Math.min(2,Math.floor(i/2)) as 0|1|2},budgets[i],[],lessons[i]));
const certify=(d:Descriptor)=>{
 const witness=solution(d);if(!witness||!execute(d,witness).won)throw new Error(`No witness for ${d.level.id}`);
 const flat=solution({...d,level:{...d.level,pace:d.level.pace==='hard'?'medium':d.level.pace}})!;
 const steps=execute(d,witness).cost;
 let minimumSteps=steps;
 if(d.budget!==null)for(let n=0;n<steps;n++)if(solution({...d,budget:n})){minimumSteps=n;break;}
 return {descriptor:d,witness,cards:witness.length,steps,minimumSteps,flatCards:flat.length,commands:commands(d.level.pace)};
};
const output={version:1,replays:replays.map(certify),debug:debug.map(certify),mud:mud.map(certify)};
writeFileSync(new URL('./challenge-content.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
console.log(output.mud.map(p=>`${p.descriptor.level.id}: ${p.cards} cards / ${p.steps} steps`).join('\n'));
