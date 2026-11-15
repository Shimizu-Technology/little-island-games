import { createRng } from '../../../src/puzzles/rng';
import { type Deal,type Mode } from '../../../src/puzzles/table/solitaire';
/** Four construction recipes vary the foundation dependency order, before independently graded blockers. */
export const recipes=['steady','bursts','pairs','weave'] as const;
export function construct(mode:Mode,seed:number,tier:number):{deal:Deal;template:string}{
 const rng=createRng(seed),style=seed%4,counts=Array<number>(4).fill(0),order:number[]=[];let last=rng.below(4);
 while(order.length<52){
  const available=counts.flatMap((n,i)=>n<13?[i]:[]);let pool=available;
  if(style===0){const low=Math.min(...available.map(i=>counts[i]));pool=available.filter(i=>counts[i]===low);}
  if(style===1&&available.includes(last)&&rng.below(4)!==0)pool=[last];
  if(style===2){const pair=rng.below(2);const p=available.filter(i=>Math.floor(i/2)===pair);if(p.length)pool=p;}
  if(style===3){const p=available.filter(i=>i%2!==last%2);if(p.length)pool=p;}
  last=pool[rng.below(pool.length)];order.push(last*13+counts[last]++);
 }
 const free=mode==='freecell',lengths=free?[7,7,7,7,6,6,6,6]:[1,2,3,4,5,6,7,24],piles=lengths.map(n=>Array<number>(n).fill(-1)),at=lengths.map(()=>0);
 while(order.length){
  const sources=lengths.flatMap((n,i)=>at[i]<n?[i]:[]),source=sources[rng.below(sources.length)],stock=!free&&source===7,batch=stock&&mode==='draw-three'?Math.min(3,lengths[source]-at[source]):1;
  const cards=order.splice(0,batch);
  // A waste fan's last drawn card is played first. Its three cards are constructed in that order.
  for(const c of stock?[...cards].reverse():cards)piles[source][lengths[source]-1-at[source]++]=c;
 }
 const deck:number[]=[];
 if(free){for(let row=0;row<7;row++)for(let col=0;col<8;col++)if(row<lengths[col])deck.push(piles[col][row]);}
 else {for(let row=0;row<7;row++)for(let col=row;col<7;col++)deck.push(piles[col][row]);deck.push(...piles[7].reverse());}
 const swaps=tier===1?0:tier===3?2+rng.below(5):tier===5?8+rng.below(10):18+rng.below(20);
 for(let i=0;i<swaps;i++){const a=rng.below(52),b=rng.below(52);[deck[a],deck[b]]=[deck[b],deck[a]];}
 return {deal:{mode,cards:deck},template:recipes[style]};
}
