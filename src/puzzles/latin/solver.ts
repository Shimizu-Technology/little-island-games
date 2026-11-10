import { cageOK, cellsOf, digits, groups, sightCells, solved, visible, type LatinPuzzle } from './core';
export const bit = (v: number) => 1 << (v - 1);
export const valuesOf = (mask: number) => digits(9).filter(v => mask & bit(v));
export const singleton = (m: number) => m > 0 && !(m & (m - 1));
export type Step = { technique: string; cells: number[]; remove: [number, number][]; reason: string };
export const techniques = ['peer', 'single', 'hidden-single', 'inequality', 'cage-combination', 'crossing-sums', 'skyline-line', 'locked-candidates', 'naked-pair', 'naked-triple', 'hidden-pair', 'x-wing', 'swordfish', 'xy-wing', 'simple-coloring'] as const;
export class Work {
  left: number;
  constructor(budget: number) { this.left = budget; }
  tick() { if (--this.left < 0) throw new Error('latin-budget'); }
}
export function startDomains(p: LatinPuzzle, grid: readonly number[] = p.givens): number[] { const all = (1 << (p.kind === 'cross-sums' ? 9 : p.size)) - 1; return grid.map((v,i) => p.mask[i] ? 0 : v ? bit(v) : all); }
const trim = (d: readonly number[], cells: readonly number[], allowed: readonly number[], technique: string, reason: string): Step | null => {
  const remove = cells.flatMap((i,j) => { const m = d[i] & ~allowed[j]; return m ? [[i,m] as [number,number]] : []; });
  return remove.length ? { technique, cells: [...cells], remove, reason } : null;
};
export function peers(p: LatinPuzzle): number[][] { const gs = groups(p); return p.givens.map((_,i)=>[...new Set(gs.filter(g=>g.includes(i)).flat())].filter(j=>i!==j)); }
export function applyStep(d: readonly number[], step: Step) { const next = [...d]; step.remove.forEach(([i,m])=>{next[i] &= ~m;}); return next; }
/** Enumerates only a single public clue, never a whole-board assumption. */
function supports(p: LatinPuzzle, cells: number[], d: readonly number[], accept: (v: number[])=>boolean, distinct: boolean, work: Work, sum?: number): number[] {
  const out = cells.map(()=>0), chosen: number[] = [], max = p.kind === 'cross-sums' ? 9 : p.size;
  const walk = (at: number, used: number, total: number) => {
    work.tick();
    if (at === cells.length) { if (accept(chosen)) chosen.forEach((v,j)=>{out[j] |= bit(v);}); return; }
    for (const v of valuesOf(d[cells[at]])) {
      if (distinct && used & bit(v)) continue;
      if (sum !== undefined && (total + v + cells.length - at - 1 > sum || total + v + (cells.length-at-1)*max < sum)) continue;
      chosen[at] = v; walk(at+1, used | bit(v), total+v);
    }
  };
  walk(0,0,0); return out;
}
function combinations<T>(items: readonly T[], k: number): T[][] {
  const out: T[][] = []; const visit=(at:number, a:T[])=>{if(a.length===k){out.push(a);return;}for(let i=at;i<=items.length-k+a.length;i++)visit(i+1,[...a,items[i]]);};visit(0,[]);return out;
}
/** Sound named eliminations. There is no backtracking or failed-assumption step in this grader. */
export function nextDeduction(p: LatinPuzzle, d: readonly number[], work = new Work(200000), ceiling = techniques.length - 1): Step | null {
  const gs = groups(p), n = p.size;
  for (const g of gs) { work.tick(); const placed = g.filter(i=>singleton(d[i])); for (const i of placed) { const other=g.filter(j=>j!==i);const s=trim(d,other,other.map(j=>d[j]&~d[i]),'peer','A number already placed cannot repeat in its row, column or region.');if(s)return s; } }
  if (ceiling < 2) return null;
  if (p.kind !== 'cross-sums') for (const g of gs.filter(g=>g.length===n)) for (const v of digits(n)) { const spots=g.filter(i=>d[i]&bit(v)); if(spots.length===1){const s=trim(d,spots,[bit(v)],'hidden-single',`Only this cell in the group can hold ${v}.`);if(s)return s;} }
  if (ceiling < 3) return null;
  for(const [a,b] of p.less){const av=valuesOf(d[a]),bv=valuesOf(d[b]);const s=trim(d,[a,b],[av.filter(v=>bv.some(w=>v<w)).reduce((m,v)=>m|bit(v),0),bv.filter(v=>av.some(w=>v>w)).reduce((m,v)=>m|bit(v),0)],'inequality','The pointed end is smaller. Remove numbers that cannot fit the marked order.');if(s)return s;}
  if (ceiling < 4) return null;
  for(const c of p.cages){const allowed=supports(p,c.cells,d,v=>cageOK(c,v),p.kind==='killer'||p.kind==='cross-sums',work,c.op==='+'?c.target:undefined);const s=trim(d,c.cells,allowed,p.kind==='cross-sums'?'crossing-sums':'cage-combination',`Keep only combinations making ${c.target}${c.op==='*'?'×':c.op==='/'?'÷':c.op}. ${p.kind==='cross-sums'?'Crossing sums share the same cell.':p.kind==='killer'?'No repeat in a cage.':'Rows and columns still cannot repeat.'}`);if(s)return s;}
  if (ceiling < 6) return null;
  for(const [id,clue] of p.sights){const cells=sightCells(p,id);const s=trim(d,cells,supports(p,cells,d,v=>visible(v)===clue,true,work),'skyline-line',`From this edge, exactly ${clue} rooftops must be visible. Taller roofs hide shorter ones.`);if(s)return s;}
  if (ceiling < 7) return null;
  for(const a of gs.filter(g=>g.length===n))for(const b of gs.filter(g=>g.length===n&&g!==a)){const common=a.filter(i=>b.includes(i));if(common.length<2)continue;for(const v of digits(n)){const spots=a.filter(i=>d[i]&bit(v));if(spots.length>1&&spots.every(i=>common.includes(i))){const rest=b.filter(i=>!common.includes(i));const s=trim(d,rest,rest.map(i=>d[i]&~bit(v)),'locked-candidates',`${v} is confined to the overlap of these two groups.`);if(s)return s;}}}
  if (ceiling < 8) return null;
  for(const k of [2,3]){if(ceiling < (k===2?8:9))continue;for(const g of gs)for(const set of combinations(g.filter(i=>valuesOf(d[i]).length>1&&valuesOf(d[i]).length<=k),k)){work.tick();const union=set.reduce((m,i)=>m|d[i],0);if(valuesOf(union).length!==k)continue;const rest=g.filter(i=>!set.includes(i));const s=trim(d,rest,rest.map(i=>d[i]&~union),k===2?'naked-pair':'naked-triple',`These ${k} cells reserve the same ${k} numbers for themselves.`);if(s)return s;}}
  if(ceiling < 10)return null;
  for(const g of gs.filter(g=>g.length===n))for(const vs of combinations(digits(n),2)){const spots=g.filter(i=>vs.some(v=>d[i]&bit(v)));if(spots.length===2){const mask=vs.reduce((m,v)=>m|bit(v),0);const s=trim(d,spots,spots.map(i=>d[i]&mask),'hidden-pair','These two numbers have only these two places in the group.');if(s)return s;}}
  if(ceiling < 11 || p.kind==='cross-sums')return null;
  for(const k of [2,3]){if(ceiling<(k===2?11:12))continue;for(const axis of [0,1])for(const v of digits(n)){const lines=digits(n).map((_,r)=>digits(n).map((_,c)=>axis?r+c*n:r*n+c));for(const set of combinations(lines.filter(g=>g.filter(i=>d[i]&bit(v)).length>=2&&g.filter(i=>d[i]&bit(v)).length<=k),k)){work.tick();const spots=set.flatMap(g=>g.filter(i=>d[i]&bit(v))),cross=[...new Set(spots.map(i=>axis?Math.floor(i/n):i%n))];if(cross.length!==k)continue;const rest=cellsOf(p).filter(i=>cross.includes(axis?Math.floor(i/n):i%n)&&!set.some(g=>g.includes(i)));const s=trim(d,rest,rest.map(i=>d[i]&~bit(v)),k===2?'x-wing':'swordfish',`The same ${k} lines reserve ${v} in ${k} crossing lines.`);if(s)return s;}}}
  if(ceiling < 13)return null;
  const ps=peers(p), twins=cellsOf(p).filter(i=>valuesOf(d[i]).length===2);
  for(const pivot of twins)for(const [a,b] of combinations(twins.filter(i=>ps[pivot].includes(i)),2)){work.tick();const shared=d[a]&d[b],pa=d[pivot]&d[a],pb=d[pivot]&d[b];if(!singleton(shared)||!singleton(pa)||!singleton(pb)||pa===pb||d[pivot]&shared)continue;const rest=ps[a].filter(i=>ps[b].includes(i)&&i!==pivot&&i!==a&&i!==b);const s=trim(d,rest,rest.map(i=>d[i]&~shared),'xy-wing','Either value of the two-number hinge forces a wing to take the shared number. A cell seeing both wings cannot take it.');if(s)return s;}
  if(ceiling < 14)return null;
  for(const v of digits(n)){
    const links=new Map<number,number[]>();for(const g of gs.filter(g=>g.length===n)){const spots=g.filter(i=>d[i]&bit(v));if(spots.length===2){for(const [a,b] of [[spots[0],spots[1]],[spots[1],spots[0]]])links.set(a,[...(links.get(a)??[]),b]);}}
    const visited=new Set<number>();for(const root of links.keys()){if(visited.has(root))continue;const color=new Map<number,number>([[root,0]]),queue=[root];let inconsistent=false;for(let q=0;q<queue.length;q++){const a=queue[q];visited.add(a);for(const b of links.get(a)??[]){if(color.has(b)){if(color.get(a)===color.get(b))inconsistent=true;}else{color.set(b,1-color.get(a)!);queue.push(b);}}}if(inconsistent)continue;
      for(const c of [0,1]){const same=[...color].filter(([,x])=>x===c).map(([i])=>i);if(same.some(a=>same.some(b=>a!==b&&ps[a].includes(b)))){const s=trim(d,same,same.map(i=>d[i]&~bit(v)),'simple-coloring',`Alternating strong links for ${v} put two same-colored candidates in one group. That color is impossible.`);if(s)return s;}}
      const rest=cellsOf(p).filter(i=>!color.has(i)&&[0,1].every(c=>[...color].some(([j,x])=>x===c&&ps[i].includes(j))));const s=trim(d,rest,rest.map(i=>d[i]&~bit(v)),'simple-coloring',`This cell sees both colors of an alternating strong-link chain for ${v}. One color must be true.`);if(s)return s;
    }
  }
  return null;
}
export function grade(p: LatinPuzzle, budget=200000, grid: readonly number[]=p.givens, ceiling=14) {
  let domains=startDomains(p,grid);const steps:Step[]=[],work=new Work(budget);
  try{for(let i=0;i<2048;i++){if(cellsOf(p).some(c=>!domains[c]))return {status:'contradiction' as const,domains,steps,ceiling:'none'};const next=nextDeduction(p,domains,work,ceiling);if(!next){const answer=domains.map((m,i)=>p.mask[i]?0:singleton(m)?valuesOf(m)[0]:0);return {status:solved(p,answer)?'complete' as const:'stalled' as const,domains,steps,ceiling:steps.reduce((a,s)=>techniques.indexOf(s.technique as typeof techniques[number])>techniques.indexOf(a as typeof techniques[number])?s.technique:a,'single')};}steps.push(next);domains=applyStep(domains,next);}}catch(e){if(!(e instanceof Error)||e.message!=='latin-budget')throw e;}
  return {status:'budget-exhausted' as const,domains,steps,ceiling:'none'};
}
/** MRV search with public domain propagation. Exhaustion is never reported as zero solutions. */
export function search(p: LatinPuzzle, cap=2, budget=200000, random?:()=>number) {
  let count=0, first:number[]|null=null,nodes=0,spent=false;const work=new Work(budget);
  const walk=(d:number[])=>{if(count>=cap)return;work.tick();nodes++;for(;;){if(cellsOf(p).some(i=>!d[i]))return;const s=nextDeduction(p,d,work,6);if(!s)break;d=applyStep(d,s);}
    const open=cellsOf(p).filter(i=>!singleton(d[i])).sort((a,b)=>valuesOf(d[a]).length-valuesOf(d[b]).length);if(!open.length){const v=d.map((m,i)=>p.mask[i]?0:valuesOf(m)[0]);if(solved(p,v)){count++;first??=v;}return;}
    const i=open[0],vs=valuesOf(d[i]);if(random)for(let j=vs.length-1;j>0;j--){const k=Math.floor(random()*(j+1));[vs[j],vs[k]]=[vs[k],vs[j]];}for(const v of vs){const next=[...d];next[i]=bit(v);walk(next);if(count>=cap)return;}};
  try{walk(startDomains(p));}catch(e){if(!(e instanceof Error)||e.message!=='latin-budget')throw e;spent=true;}
  return {status:spent?'budget-exhausted' as const:'counted' as const,count,first,nodes};
}
