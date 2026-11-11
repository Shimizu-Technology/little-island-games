import {expect,it} from "vitest";
import * as c from '../src/arcade/games/crab-crossing/engine';
import {crabAdvance,crossingPath} from './grid-fixtures';
import {daresFor,dareMet} from '../src/arcade/dares';
const advance=(s:c.CrabState,path:readonly string[])=>{for(const d of path)s=crabAdvance(d==='wait'?s:c.crabTransition(s,{type:'hop',direction:d as any}));return s};
function splash(s:c.CrabState){const before=s.bumps;for(const d of crossingPath(s)){s=advance(s,[d]);if(s.y<=4&&!s.hop)break;}for(let f=0;f<3000&&s.bumps===before;f++)s=crabAdvance(s,1);if(s.bumps!==before+1||s.y!==5)throw new Error('splash failed');return crabAdvance(s,140)}
function home(s:c.CrabState){const q=[{state:s,path:[] as string[],cost:0}],seen=new Set<string>();for(let n=0;q.length&&n<24000;n++){q.sort((a,b)=>a.cost-b.cost);const {state,path}=q.shift()!;for(const d of ['down','left','right','wait','up']as const){const next=advance(state,[d]);if(next.bumps>s.bumps||next.phase!=='play'||next.crossed!==s.crossed||next.hop||next.respawn>0||path.length>=65)continue;if(next.y===10)return {state:next,path:[...path,d]};const key=[Math.round(next.x*12),next.y,Math.round(next.travel*12)].join();if(seen.has(key))continue;seen.add(key);q.push({state:next,path:[...path,d],cost:path.length+1+(10-next.y)*1.5})}}throw new Error('no path home')}
it("counts a full clean crossing after walking back to the starting shore",()=>{
 let s=c.createCrab(c.crabLevel('w2-2'),120,false);
 s=splash(s);s=advance(s,crossingPath(s));s=crabAdvance(s,12);
 expect(s.crossed).toBe(1); expect(s.cleanCrossings).toBe(0);
 s=splash(s);s=home(s).state;
 expect(s.y).toBe(10);const bumps=s.bumps;
 s=advance(s,crossingPath(s));const r=c.crabResult(s)!;
 expect(s.bumps).toBe(bumps);expect(c.validCrab(s)).toBe(true);expect(r.cleared).toBe(true);
 expect(s.cleanCrossings).toBe(1);expect(dareMet(daresFor('crab-crossing','w2-2')[0],r.cleared,r.facts)).toBe(true);
});
