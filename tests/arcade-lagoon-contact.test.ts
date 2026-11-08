import {expect,it} from 'vitest';
import {join} from 'node:path';
import {writeFileSync} from 'node:fs';
import {createRun,runStep,runTransition} from '../src/arcade/games/lagoon-run/engine';
import {fixtureInput} from '../src/arcade/games/lagoon-run/fixtures';
import {runLevels} from '../src/arcade/games/scrolling/content';
import {HAZARDS} from '../src/arcade/games/lagoon-run/course';
it('retains exact legal W1-8 contact witnesses for native matched-tick capture',()=>{
let s=createRun(runLevels[7],771),found:Record<string,unknown>={};
for(let tick=1;tick<10000 && s.status==='playing';tick++) {
 s=runStep(runTransition(s,fixtureInput(s)),{type:'idle'},1/60);
 for(const r of s.rows) {
  const at=Math.abs(r.z-1)<.006;
  if(at){const key=r.kind==='canoe'||r.kind==='moving-canoe'?'canoe':HAZARDS[r.kind]==='duck'?'duck':undefined;if(key&&!found[key])found[key]={tick,z:r.z,kind:r.kind,surface:r.surface,lane:s.lane,poseLane:s.poseLane,runnerHeight:s.elevation,score:s.score};}
  if(r.z>=1 && r.z<1.1&&r.surface==='ramp'&&!found.deck)found.deck={tick,z:r.z,surface:r.surface,lane:s.lane,score:s.score};
  if(Math.abs(r.z-.91)<.006&&r.surface==='ramp'&&!found.ramp)found.ramp={tick,z:r.z,surface:r.surface,lane:s.lane,score:s.score};
  if(Math.abs(r.z+.9)<.006&&(r.kind==='canoe'||r.kind==='moving-canoe')&&!found.farCanoe)found.farCanoe={tick,z:r.z,kind:r.kind,score:s.score};
 }
}
expect(Object.keys(found).sort()).toEqual(['canoe','deck','duck','farCanoe','ramp']);
if(process.env.L1_ARTIFACT_DIR)writeFileSync(join(process.env.L1_ARTIFACT_DIR,'contact-witnesses.json'),JSON.stringify(found,null,2));
});
