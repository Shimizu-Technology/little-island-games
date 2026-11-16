import {makeDeal,opening,apply,positionKey,won,type Mode} from '../../../src/puzzles/table/solitaire';
import {solve} from '../../../src/puzzles/table/solver';
import {advise} from '../../../src/puzzles/table/publicSolver';
for(const mode of ['draw-one','draw-three','freecell'] as Mode[]) {
 let solved=0,hinted=0;
 const t=Date.now();
 for(let seed=1;seed<=30;seed++) {const d=makeDeal(mode,seed), r=solve(d,undefined,3000);if(r.status!=='solved')continue;solved++;
 let s=opening(d), steps=0;const seen=new Set<string>();
 while(!won(s)&&steps<256){const key=positionKey(s);if(seen.has(key))break;seen.add(key); const h=advise(s,d,3000);if(h.kind!=='move')break;for(const a of h.plan)s=apply(s,mode,a);steps++;}
 if(won(s)){hinted++;console.log(mode,seed,r.moves.length,r.nodes,r.branches,steps);}
 }
 console.log({mode,solved,hinted,ms:Date.now()-t});
}
