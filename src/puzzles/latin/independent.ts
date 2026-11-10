import { cellsOf, type LatinPuzzle } from './core';
/** Independent count implementation: cell assignments and direct rule tests, no domain/tuple/grader imports. */
export function independentCount(p: LatinPuzzle, cap=2, budget=200000) {
  const n=p.size, max=p.kind==='cross-sums'?9:n, grid=[...p.givens], cells=cellsOf(p);
  const units:number[][]=[];
  if(p.kind==='cross-sums')units.push(...p.cages.map(c=>c.cells));else{
    for(let r=0;r<n;r++){units.push(Array.from({length:n},(_,c)=>r*n+c));units.push(Array.from({length:n},(_,c)=>c*n+r));}
    if(p.box)for(let r=0;r<n;r+=p.box)for(let c=0;c<n;c+=n/p.box){const u:number[]=[];for(let y=r;y<r+p.box;y++)for(let x=c;x<c+n/p.box;x++)u.push(y*n+x);units.push(u);}
    if(p.kind==='killer')units.push(...p.cages.map(c=>c.cells));
  }
  const near=grid.map((_,i)=>new Set(units.filter(u=>u.includes(i)).flat().filter(j=>j!==i)));
  let nodes=0,count=0,exhausted=false;const first:number[][]=[];
  const allowed=(i:number,v:number)=>{
    if([...near[i]].some(j=>grid[j]===v))return false;
    grid[i]=v;let ok=true;
    for(const [a,b] of p.less)if((a===i||b===i)&&grid[a]&&grid[b]&&grid[a]>=grid[b])ok=false;
    for(const c of p.cages.filter(c=>c.cells.includes(i))){const vs=c.cells.map(j=>grid[j]),open=vs.filter(x=>!x).length,sum=vs.reduce((a,b)=>a+b,0),product=vs.reduce((a,b)=>a*(b||1),1);
      if(c.op==='+'&&(sum+open>c.target||sum+open*max<c.target))ok=false;
      if(c.op==='*'&&(product>c.target||c.target%product))ok=false;
      if(!open){if(c.op==='='&&vs[0]!==c.target||c.op==='-'&&Math.abs(vs[0]-vs[1])!==c.target||c.op==='/'&&Math.max(...vs)!==Math.min(...vs)*c.target||c.op==='+'&&sum!==c.target||c.op==='*'&&product!==c.target)ok=false;}
    }
    for(const [id,target] of p.sights){const side=Math.floor(id/n),line=id%n,vs=Array.from({length:n},(_,k)=>grid[side===0?k*n+line:side===1?line*n+n-1-k:side===2?(n-1-k)*n+line:line*n+k]);let seen=0,top=0,unknown=0;for(const x of vs){if(!x)unknown++;else if(x>top){top=x;seen++;}}if(!unknown&&seen!==target)ok=false;}
    grid[i]=0;return ok;
  };
  const walk=()=>{if(count>=cap||exhausted)return;if(++nodes>budget){exhausted=true;return;}let best=-1,options:number[]=[];
    for(const i of cells){if(grid[i])continue;const vs=Array.from({length:max},(_,v)=>v+1).filter(v=>allowed(i,v));if(!vs.length)return;if(best<0||vs.length<options.length){best=i;options=vs;if(vs.length===1)break;}}
    if(best<0){count++;if(!first.length)first.push([...grid]);return;}for(const v of options){grid[best]=v;walk();grid[best]=0;if(count>=cap||exhausted)return;}};
  // Malformed givens must not turn a filled invalid board into a counted solution.
  for(const i of cells)if(grid[i]){const v=grid[i];grid[i]=0;if(!allowed(i,v))return {status:'counted' as const,count:0,first:null,nodes};grid[i]=v;}
  walk();return {status:exhausted?'budget-exhausted' as const:'counted' as const,count,first:first[0]??null,nodes};
}
