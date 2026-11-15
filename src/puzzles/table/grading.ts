import { advise,publicView } from './publicSolver';
import { apply,legalMoves,opening,positionKey,won,type Deal,type Move,type Position } from './solitaire';
export type PublicGrade={complete:boolean;depth:number;bottleneck:Position|null;steps:number};
const grades=new WeakMap<Deal,PublicGrade>();
/** Difficulty is the deepest shortest public progress plan along a complete, non-cycling hint route. */
export function gradePublic(d:Deal):PublicGrade{
 const cached=grades.get(d);if(cached)return cached;
 let s=opening(d),depth=0,bottleneck:Position|null=null,steps=0;const seen=new Set<string>();
 while(!won(s)&&steps<256){const key=positionKey(s);if(seen.has(key))break;seen.add(key);const h=advise(s,d,10000);if(h.kind!=='move')break;
  if(h.depth>depth){depth=h.depth;bottleneck=s;}for(const a of h.plan)s=apply(s,d.mode,a);steps++;
 }
 const result={complete:won(s),depth,bottleneck,steps};grades.set(d,result);return result;
}
/** Independent depth-limited DFS counterfactual; no call to the hint planner or its search queue. */
export function progressWithin(position:Position,d:Deal,maxDepth:number,budget=40000):{status:'found'|'blocked'|'budget-exhausted';nodes:number}{
 const start=publicView(position,d),base=start.piles.slice(8,12).reduce((n,p)=>n+p.length,0),seen=new Map<string,number>();let nodes=0,cut=false;
 const advances=(s:Position,next:Position,a:Move)=>next.hidden.some((n,i)=>n<s.hidden[i])||next.piles.slice(8,12).reduce((n,p)=>n+p.length,0)>base||a[0]===12&&a[2]===0&&s.piles[12].slice(-(d.mode==='draw-one'?1:3)).includes(-1);
 const visit=(s:Position,left:number):boolean=>{
  if(left<=0)return false;const key=positionKey(s);if((seen.get(key)??0)>=left)return false;
  if(nodes>=budget){cut=true;return false;}seen.set(key,left);nodes++;
  for(const a of legalMoves(s,d.mode)){const next=apply(s,d.mode,a);if(advances(s,next,a)||visit(next,left-1))return true;}
  return false;
 };
 const found=visit(start,maxDepth);return {status:found?'found':cut?'budget-exhausted':'blocked',nodes};
}
