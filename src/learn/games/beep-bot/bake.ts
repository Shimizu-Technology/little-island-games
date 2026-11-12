/** Build-time content only: no device generation or solver on round start. */
import { writeFileSync } from 'node:fs';
import { trace, type Arrow, type Puzzle } from './movement';
import { winners } from './solver';
const turn=(pos:number,n:number)=>{for(let i=0;i<n;i++)pos=pos%5*5+4-Math.floor(pos/5);return pos;};
const rotate=(a:Arrow,n:number):Arrow=>a.startsWith('repeat')?a:['up','right','down','left'][(['up','right','down','left'].indexOf(a)+n)%4] as Arrow;
const bank=[];
for(let level=1;level<=5;level++){
 const rows=[];
 for(let r=0;r<4;r++)for(let v=0;v<(level===1?3:4);v++){
  let answer:Arrow[];let rocks:number[]=[];
  if(level===1)answer=Array(v+1).fill('right');
  else if(level===2)answer=([['right','down'],['right','down','down'],['right','right','down'],['right','down','right','down']] as Arrow[][])[v];
  else if(level===5){const x=v===0?2:3,y=v===1?2:3;rocks=v===3?[1]:[];answer=v===3?['down','repeat3','right','repeat3']:['right',x===2?'repeat2':'repeat3','down',y===2?'repeat2':'repeat3'];}
  else {const x=2+v%2,y=2+Math.floor(v/2);answer=[...Array(y).fill('down'),...Array(x).fill('right')];rocks=[1,6];}
  const base:Puzzle={start:0,shell:0,rocks,answer,seed:rows.length};base.shell=trace(base,answer).at(-1)!;
  const p:Puzzle={start:turn(0,r),shell:turn(base.shell,r),rocks:rocks.map(i=>turn(i,r)).sort((a,b)=>a-b),answer:answer.map(a=>rotate(a,r)),seed:rows.length};
  const plans=winners(p,level),flat=winners(p,4);if(!plans.length)throw new Error('Unsolved');
  rows.push({puzzle:{...p,answer:plans[0]},proof:{minimum:plans[0].length,solutions:plans.length,unique:plans.length===1,flatMinimum:flat[0].length,winners:plans}});
 }
 bank.push(rows);
}
writeFileSync('src/learn/games/beep-bot/content.json',JSON.stringify(bank,null,2)+'\n');
