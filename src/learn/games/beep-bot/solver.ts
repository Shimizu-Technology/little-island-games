import { dirs, cardEffect, type Arrow, type Puzzle } from './movement';
export const cardsFor=(level:number):Arrow[]=>level===5?[...dirs,'repeat2','repeat3']:[...dirs];
/** Shortest paths in the real interpreter's (position, previous arrow) graph. Shell is terminal. */
export function winners(p:Puzzle,level:number):Arrow[][] {
 const queue:{pos:number;previous:Arrow|null;plan:Arrow[]}[]=[{pos:p.start,previous:null,plan:[]}], seen=new Map<string,number>();
 let minimum=33;const plans:Arrow[][]=[];
 for(let i=0;i<queue.length;i++){
  const n=queue[i];if(n.plan.length>=minimum)continue;
  for(const card of cardsFor(level)){
   const r=cardEffect(p,n.pos,card,n.previous);if(r.bump)continue;
   const plan=[...n.plan,card],previous=card.startsWith('repeat')?n.previous:card;
   if(r.pos===p.shell){minimum=plan.length;plans.push(plan);continue;}
   const key=`${r.pos}/${previous}`,depth=seen.get(key);if(depth!==undefined&&depth<plan.length)continue;
   seen.set(key,plan.length);queue.push({pos:r.pos,previous,plan});
  }
 }
 return plans.filter(p=>p.length===minimum);
}
export type Edit={op:'replace'|'insert'|'remove';at:number;card?:Arrow};
export type Hint={plan:Arrow[];edit:Edit|null;distance:number};
/** Align against every shortest winner, preserving a valid alternate plan or prefix. */
function* hintWork(plans:Arrow[][],program:readonly Arrow[],appendOnly:boolean):Generator<void,Hint> {
 let best:Hint={plan:[],edit:null,distance:Infinity};
 for(const plan of plans){
  const rows=Array.from({length:program.length+1},()=>new Uint8Array(plan.length+1));
  for(let i=program.length;i>=0;i--){
   for(let j=plan.length;j>=0;j--){
    if(i===program.length)rows[i][j]=plan.length-j;
    else if(j===plan.length)rows[i][j]=program.length-i;
    else if(program[i]===plan[j])rows[i][j]=rows[i+1][j+1];
    else rows[i][j]=1+Math.min(rows[i+1][j],...(appendOnly?[]:[rows[i+1][j+1],rows[i][j+1]]));
   }
   yield;
  }
  const distance=rows[0][0];if(distance>=best.distance)continue;
  let i=0,j=0;while(i<program.length&&j<plan.length&&program[i]===plan[j]){i++;j++;}
  const edit:Edit|null=i===program.length&&j===plan.length?null:i===program.length?{op:'insert',at:i,card:plan[j]}:j===plan.length||appendOnly?{op:'remove',at:i}:rows[i][j]===1+rows[i+1][j+1]?{op:'replace',at:i,card:plan[j]}:rows[i][j]===1+rows[i+1][j]?{op:'remove',at:i}:{op:'insert',at:i,card:plan[j]};
  best={plan:[...plan],edit,distance};
 }
 return best;
}
export function nearestHint(plans:Arrow[][],program:readonly Arrow[],appendOnly=false):Hint {const work=hintWork(plans,program,appendOnly);let r=work.next();while(!r.done)r=work.next();return r.value;}
export async function nearestHintSliced(plans:Arrow[][],program:readonly Arrow[],cancel:()=>boolean,appendOnly=false):Promise<Hint|null>{
 const work=hintWork(plans,program,appendOnly);let start=performance.now();
 for(;;){if(cancel())return null;const r=work.next();if(r.done)return cancel()?null:r.value;if(performance.now()-start>=4){await new Promise<void>(resolve=>setTimeout(resolve,0));start=performance.now();}}
}
