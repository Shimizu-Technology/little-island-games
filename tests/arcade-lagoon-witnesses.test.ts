import {expect,it} from 'vitest';
import {runLevels} from '../src/arcade/games/scrolling/content';
import {runFixture} from '../src/arcade/games/lagoon-run/fixtures';
import {validRun} from '../src/arcade/games/lagoon-run/engine';
/** Changed action windows/slowdown must retain legal witnesses beyond one lucky seed. */
it('recertifies every authored level across 32 seeds, Helper off/on, with unmodified legal controls',()=>{
 for(const helper of [false,true])for(const level of runLevels)for(let seed=1;seed<=32;seed++) {
  const f=runFixture(level,seed,helper);
  expect(f.result?.stars,`${level.id} seed=${seed} helper=${helper}; ${f.result?.detail}`).toBe(3);
  expect(validRun(f.state)).toBe(true);
 }
},180000);
