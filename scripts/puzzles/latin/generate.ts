import { createRng } from '../../../src/puzzles/rng';
import { cellsOf, digits, sightCells, visible, type LatinKind, type LatinPuzzle, type Cage } from '../../../src/puzzles/latin/core';
import { grade, search, techniques } from '../../../src/puzzles/latin/solver';
import { independentCount } from '../../../src/puzzles/latin/independent';
import type { DescriptorCore, FamilySpec } from '../../../src/puzzles/types';
import { latinAdapter } from '../../../src/puzzles/latin/adapter';
export const bands=['paddling','shallows','lagoon','reef','deep','trench'];
export function blank(kind:LatinKind,size:number):LatinPuzzle{return {kind,size,box:kind==='sudoku'||kind==='killer'?(size===9?3:2):0,givens:Array<number>(size*size).fill(0),cages:[],less:[],sights:[],mask:Array<number>(size*size).fill(0)};}
const count=(p:LatinPuzzle)=>p.kind==='sudoku'?independentCount(p,2,100000):search(p,2,200000);
export function generatePuzzle(kind:LatinKind,seed:number,tier:number):LatinPuzzle|null{
  const rng=createRng(seed),template=seed%4;
  const size=kind==='sudoku'||kind==='killer'?[4,6,9,9,9,9][tier]:kind==='cage-math'?[3,4,5,6,7,9][tier]:kind==='cross-sums'?[4,5,6,7,8,9][tier]:[4,4,5,5,6,7][tier];
  const p=blank(kind,size);
  if(kind==='cross-sums')return crossSums(seed,tier);
  let answer:number[];
  if(p.box){const made=search(p,1,500000,()=>rng.uint32()/0x100000000);if(!made.first)return null;answer=made.first;}
  else{
    // Random isotopes are construction only. Explicit clues and semantic checks determine supply.
    const rows=rng.shuffle(digits(size).map(x=>x-1)),cols=rng.shuffle(digits(size).map(x=>x-1)),symbols=rng.shuffle(digits(size));answer=rows.flatMap(r=>cols.map(c=>symbols[(r+c)%size]));
  }
  if(kind==='sudoku'){
    p.givens=[...answer];
    const order=rng.shuffle(cellsOf(p)).sort((a,b)=>{const weight=(i:number)=>template===0?0:template===1?Math.abs(Math.floor(i/size)-i%size):template===2?Math.min(Math.floor(i/size),i%size,size-1-Math.floor(i/size),size-1-i%size):Math.floor(i/size)%2;return weight(a)-weight(b);});
    const stop=[8,16,32,25,23,22][tier];
    for(const i of order){if(p.givens.filter(Boolean).length<=stop)break;const v=p.givens[i];p.givens[i]=0;const c=count(p);if(c.status!=='counted'||c.count!==1)p.givens[i]=v;}
    const g=grade(p);if(g.status!=='complete')return null;
    const rank=techniques.indexOf(g.ceiling as typeof techniques[number]);
    if(tier===2&&rank>2||tier===3&&(rank<2||rank>7)||tier===4&&(rank<8||rank>10)||tier===5&&rank<11)return null;
  }else if(kind==='greater-than'){
    p.givens=[...answer];const adj=cellsOf(p).flatMap(i=>[i%size<size-1?i+1:-1,i<size*(size-1)?i+size:-1].filter(j=>j>=0).map(j=>answer[i]<answer[j]?[i,j] as [number,number]:[j,i] as [number,number]));
    p.less=rng.shuffle(adj).slice(0,Math.floor(size*size*(tier<2?.55:.4)));
    for(const i of rng.shuffle(cellsOf(p))){const v=p.givens[i];p.givens[i]=0;const c=count(p);if(c.status!=='counted'||c.count!==1||grade(p).status!=='complete')p.givens[i]=v;}
  }else if(kind==='skyline'){
    p.sights=digits(4*size).map(x=>{const id=x-1;return [id,visible(sightCells(p,id).map(i=>answer[i]))] as [number,number];});
    // Begin with all edge clues; add a few internal givens if needed, then remove redundant edge clues.
    p.givens=[...answer];for(const i of rng.shuffle(cellsOf(p))){const v=p.givens[i];p.givens[i]=0;const c=count(p);if(c.status!=='counted'||c.count!==1)p.givens[i]=v;}
    for(const [id] of rng.shuffle(p.sights)){const old=p.sights;p.sights=p.sights.filter(x=>x[0]!==id);const c=count(p);if(c.status!=='counted'||c.count!==1)p.sights=old;}
  }else{
    const available=new Set(cellsOf(p));
    while(available.size){const start=rng.shuffle([...available])[0],cells=[start];available.delete(start);const length=1+rng.below(tier<2?2:3);
      while(cells.length<length){const neighbors=[...available].filter(i=>cells.some(j=>Math.abs(Math.floor(i/size)-Math.floor(j/size))+Math.abs(i%size-j%size)===1)&&(kind!=='killer'||cells.every(j=>answer[j]!==answer[i])));if(!neighbors.length)break;const ordered=rng.shuffle(neighbors).sort((a,b)=>template===0?Math.floor(a/size)-Math.floor(b/size):template===1?a%size-b%size:template===2?Math.abs(a%size-size/2)-Math.abs(b%size-size/2):Math.abs(Math.floor(a/size)-Math.floor(start/size))-Math.abs(Math.floor(b/size)-Math.floor(start/size)));const i=ordered[0];cells.push(i);available.delete(i);}
      let op:Cage['op']=cells.length===1?'=':'+';
      if(kind==='cage-math'&&tier>=1&&cells.length===2&&answer[cells[0]]!==answer[cells[1]]&&rng.below(3)===0)op='-';
      if(kind==='cage-math'&&tier>=2&&cells.length>1&&rng.below(3)===0)op='*';
      if(kind==='cage-math'&&tier>=3&&cells.length===2&&Math.max(...cells.map(i=>answer[i]))%Math.min(...cells.map(i=>answer[i]))===0&&rng.below(2)===0)op='/';
      const vs=cells.map(i=>answer[i]),target=op==='='?vs[0]:op==='+'?vs.reduce((a,b)=>a+b,0):op==='*'?vs.reduce((a,b)=>a*b,1):op==='-'?Math.abs(vs[0]-vs[1]):Math.max(...vs)/Math.min(...vs);
      p.cages.push({cells:cells.sort((a,b)=>a-b),op,target});
    }
    // A generator may not call ambiguity hard. Keep explicit givens only when needed.
    for(const i of rng.shuffle(cellsOf(p))){const c=count(p);if(c.status==='counted'&&c.count===1)break;p.givens[i]=answer[i];}
  }
  return grade(p).status==='complete'?p:null;
}
/** Connected masks with rectangular bays and offsets, not the failed three-digit diagonal weave. */
function crossSums(seed:number,tier:number):LatinPuzzle|null{
  const rng=createRng(seed),n=tier<2?4:5,p=blank('cross-sums',n),template=seed%4;
  p.mask=p.mask.map((_,i)=>{const r=Math.floor(i/n),c=i%n;return Number(r===0||c===0||(template===1&&r===n-1&&c===n-1)||(template===2&&r===1&&c===n-1)||(template===3&&r===n-1&&c===1));});
  const answer=Array<number>(n*n).fill(0),rows=rng.shuffle(digits(n-1)),cols=rng.shuffle(digits(n-1));
  const pool=seed%3===0?[1,2,3,4,5,6,7,8,9]:seed%3===1?[1,2,3,4,5,9,8,7,6]:[9,8,7,6,5,1,2,3,4];
  const offset=rng.below(3);
  for(const i of cellsOf(p))answer[i]=pool[(rows[Math.floor(i/n)-1]+cols[i%n-1]-2+offset)%9];
  for(const axis of [0,1])for(let line=0;line<n;line++){
    let run:number[]=[];const flush=()=>{if(run.length>=2)p.cages.push({cells:run,op:'+',target:run.reduce((a,i)=>a+answer[i],0)});else if(run.length)p.mask[run[0]]=1;run=[];};
    for(let at=0;at<n;at++){const i=axis?at*n+line:line*n+at;if(p.mask[i])flush();else run.push(i);}flush();
  }
  // Clue-driven low/high digit constructions are selected across full 1..9 validation.
  const c=count(p);if(c.status!=='counted'||c.count!==1)return null;
  const g=grade(p);return g.status==='complete'?p:null;
}
export function descriptor(p:LatinPuzzle,seed:number,band:string):DescriptorCore<LatinPuzzle>{
  const gradeResult=grade(p),blanks=cellsOf(p).filter(i=>!p.givens[i]).length;
  const template=['scatter','diagonal','shore','stripes'][seed%4];
  return {format:1,seed,rng:1,band,layout:template,template,payload:p,objectives:[],limits:[],par:{metric:'placements',lower:blanks,upper:blanks,exact:true},teaches:[gradeResult.ceiling],speech:null};
}
export const sources=['src/puzzles/latin/core.ts','src/puzzles/latin/solver.ts','src/puzzles/latin/independent.ts','src/puzzles/latin/adapter.ts','scripts/puzzles/latin/generate.ts'];
export function family(kind:LatinKind):FamilySpec<LatinPuzzle>{
  const targets=kind==='sudoku'?[128,384,1024,1024,1024,512]:kind==='cage-math'?[256,512,512,768,512,512]:kind==='cross-sums'?[128,128,192,192,192,192]:[128,128,192,192,192,192];
  const floors=kind==='sudoku'?[64,128,256,256,192,128]:kind==='cage-math'?[64,128,128,192,128,128]:kind==='cross-sums'?[8,8,8,8,16,16]:kind==='killer'?[24,24,32,32,36,40]:[24,24,32,32,36,38];
  return {id:kind,adapter:latinAdapter(kind),sources,bands:bands.map((id,i)=>({id,target:targets[i],floor:floors[i],advanced:i>=3})),provenance:{source:'original',note:'Seeded independent clue construction; explicit public constraints, no imported puzzles.'},review:{ids:[],complete:false},maxRowBytes:kind==='sudoku'?256:1800,requiresUnique:true,requiresTrace:true,hiddenInformation:false,
    generate:(seed,band)=>{const p=generatePuzzle(kind,seed,bands.indexOf(band.id));return p?descriptor(p,seed,band.id):null;}};
}
