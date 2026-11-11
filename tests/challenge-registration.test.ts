import { expect, it } from 'vitest';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertReachable, registeredDestinations } from '../src/learn/destinations';
import { shelfGames } from '../src/learn/home';
import { learnIds } from '../src/learn/types';
import { withoutLearner } from '../src/personalization/model';
import { emptySave, parseSave } from '../src/state/validation';
import { migrateProfiles, encodeSave } from '../src/state/profiles';
import { addLearner } from '../src/learn/learners';
it('fails the route gate for missing routes, missing shelves, missing route files or >3 taps',()=>{
  const ids=shelfGames.map(g=>g.id), paths=['/learn','/play','/board','/arcade','/activity'];
  expect(()=>assertReachable(ids,registeredDestinations,shelfGames,paths)).not.toThrow();
  expect(()=>assertReachable(ids,registeredDestinations.slice(1),shelfGames,paths)).toThrow();
  expect(()=>assertReachable(ids,registeredDestinations,shelfGames.slice(1),paths)).toThrow();
  expect(()=>assertReachable(ids,registeredDestinations,shelfGames,paths.slice(1))).toThrow();
  expect(()=>assertReachable(ids,registeredDestinations.map((r,i)=>i? r:{...r,taps:4}),shelfGames,paths)).toThrow();
});
it('allows the six originals only when their complete registrations land, and refuses a removed committed ID',()=>{
  const root=mkdtempSync(join(tmpdir(),'f2-registry-'));
  try {
    for(const dir of ['scripts','src/learn/games','src/learn/generated','src/challenge/registrations','src/state'])mkdirSync(join(root,dir),{recursive:true});
    copyFileSync('scripts/generate-game-registry.mjs',join(root,'scripts/generate-game-registry.mjs'));
    copyFileSync('src/learn/registered-ids.json',join(root,'src/learn/registered-ids.json'));
    writeFileSync(join(root,'src/challenge/registered-ids.json'),'[]');writeFileSync(join(root,'src/state/save-catalog.json'),JSON.stringify({version:1,banks:[],dares:[],contexts:[]}));
    function register(id:string,slot:number,group='levels'){const dir=join(root,'src/learn/games',id);mkdirSync(dir);writeFileSync(join(dir,'registration.json'),JSON.stringify({id,slot,group}));writeFileSync(join(dir,'engine.ts'),'');writeFileSync(join(dir,'view.tsx'),'');}
    learnIds.forEach((id,i)=>register(id,i));execFileSync('git',['init','-q'],{cwd:root});execFileSync('git',['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-qm','Initial'],{cwd:root});
    execFileSync('node',['scripts/generate-game-registry.mjs'],{cwd:root});
    expect(JSON.parse(readFileSync(join(root,'src/learn/registered-ids.json'),'utf8'))).toHaveLength(learnIds.length);
    const originals=['slip-tide','canoe-seats','gate-crab','every-stone','shell-scale','sail-fold'].filter(id=>!learnIds.includes(id as never));originals.forEach((id,i)=>register(id,learnIds.length+i,'originals'));
    execFileSync('node',['scripts/generate-game-registry.mjs'],{cwd:root});
    expect(JSON.parse(readFileSync(join(root,'src/learn/registered-ids.json'),'utf8')).slice(-originals.length)).toEqual(originals);
    execFileSync('git',['add','.'],{cwd:root});execFileSync('git',['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','Fixture registration'],{cwd:root});
    rmSync(join(root,'src/learn/games/slip-tide/registration.json'));
    expect(()=>execFileSync('node',['scripts/generate-game-registry.mjs','--check'],{cwd:root,stdio:'pipe'})).toThrow();
  } finally {rmSync(root,{recursive:true,force:true});}
});
it('learner removal also removes only that learner’s comfort choices and produces a valid backup',()=>{
  const save=migrateProfiles({...emptySave(),learning:addLearner(undefined,'A','a')});save.settings.learningComfort={a:{offers:false,youngChild:true,opening:4},family:{offers:true,youngChild:false,opening:2}};
  const next=withoutLearner(save,'a');expect(next.settings.learningComfort).toEqual({family:save.settings.learningComfort.family});expect(()=>parseSave(encodeSave(next))).not.toThrow();expect(save.settings.learningComfort.a).toBeDefined();
});
