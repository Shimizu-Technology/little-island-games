import { it, expect } from 'vitest';
import { nextHint, solution, execute, type Descriptor } from '../src/learn/games/crab-commands/challenge-engine';
import { levels, commands, type Command } from '../src/learn/games/crab-commands/engine';

it('reviewer: every full-length School draft has an immediately executable hinted edit', () => {
  const blocked: unknown[] = [];
  for (const level of levels) {
    const d: Descriptor = {level,budget:null,starter:[],lesson:''};
    const good = solution(d)!;
    for (let missing=0;missing<good.length;missing++) for (const fill of commands(level.pace)) {
      const short = good.filter((_,i)=>i!==missing);
      const program: Command[] = [...short,...Array(80-short.length).fill(fill)];
      if (execute(d,program).won) continue;
      const h=nextHint(d,program);
      if(h.edit?.op==='insert') blocked.push({level:level.id,missing,fill,edit:h.edit,good,program});
    }
  }
  console.info('Blocked full-length hints',JSON.stringify(blocked.slice(0,3)),'count',blocked.length);
  expect(blocked.length).toBe(0);
});
