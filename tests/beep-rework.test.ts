import { describe, expect, it } from 'vitest';
import { engine, initialProgram, makePuzzle, solves, type Arrow } from '../src/learn/games/beep-bot/engine';
import { optionsAtLevel } from '../src/learn/levelOptions';
describe('Beep rework regressions',()=>{
 it('requires each compass direction at Levels 1 and 2',()=>{for(const level of [1,2]){const used=new Set<Arrow>();for(let seed=0;seed<10000;seed++)makePuzzle(level,seed).answer.forEach(a=>used.add(a));expect([...used].sort()).toEqual(['down','left','right','up']);}});
 it('places the Level 4 bug at every card position',()=>{const positions=new Set<number>();for(let seed=0;seed<10000;seed++){const p=makePuzzle(4,seed),starter=initialProgram(p,4);positions.add(starter.findIndex((c,i)=>c!==p.answer[i]));expect(solves(p,starter)).toBe(false);}expect(positions.has(0)).toBe(true);expect(positions.has(3)).toBe(true);});
 it('has 16 distinct Level 4 maps',()=>{const maps=new Set<string>();for(let seed=0;seed<10000;seed++){const p=makePuzzle(4,seed);maps.add(JSON.stringify([p.start,p.shell,[...p.rocks].sort((a,b)=>a-b)]));}expect(maps.size).toBe(16);});
 it('never repeats a map within a new round',()=>{for(let level=1;level<=5;level++)for(let seed=0;seed<10000;seed++){const s=engine.create(optionsAtLevel({mode:'solo',pace:'easy'},level as 1|2|3|4|5),{skills:{},rng:()=>seed/10000,starter:0,today:1});expect(new Set(s.puzzles.map(p=>JSON.stringify([p.start,p.shell,p.rocks]))).size).toBe(4);}});
});
