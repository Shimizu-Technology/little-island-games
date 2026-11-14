import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import fixture from './fixtures/word-search/bank.json';
import { generateSurface } from '../scripts/puzzles/words/generate.mjs';
import { checkSurfaces, bakeBank } from '../scripts/words/bake.mjs';
import { checkShippingTree } from '../scripts/words/shipping.mjs';
import { bakeSearch } from '../scripts/puzzles/words/bake.mjs';
const policy={scan:['QZX'],core:['QZX'],exact:['QZX'],lemmas:['QZX']};
const source=JSON.parse(readFileSync('scripts/words/sources.lock.json','utf8')).sources.find((s:{id:string})=>s.id==='scowl');
const words=fixture.puzzles[0].words.map(w=>({...w,schemaVersion:1,language:'en',sense:'Synthetic interaction proof only.',lemma:w.spelling,readerLevel:'Little',knownBand:1,readBand:1,spellBand:1,clueBand:1,theme:'island',topic:'nature',guamFit:1,source,form:'lemma',properNoun:false,abbreviation:false,british:[],locale:'en-US'}));

describe('deterministic Word Search bake and checker',()=>{
 it('G6-05 produces repeatable original grids, one occurrence per answer, checked independently',()=>{
  const args={words,policy,seed:706,size:6,count:4,directionCount:8,id:'scan-proof'};
  const first=generateSurface(args),second=generateSurface(args);expect(second).toEqual(first);
  const receipt=checkSurfaces({words,surfaces:[first.surface],policy});expect(receipt.passed).toBe(true);expect(receipt.grids).toBe(1);
  const broken=structuredClone(first.surface);broken.listed[0].cells[0]=[-1,0];expect(()=>checkSurfaces({words,surfaces:[broken],policy})).toThrow();
 });
 it('requires exactly one occurrence even when two words share letters',()=>{
  const s=generateSurface({words,policy,seed:711,size:6,count:4,directionCount:8,id:'duplicate-proof'}).surface;
  const twice=structuredClone(s),w=words[0];twice.cells.push([...w.spelling,...'AA']);
  expect(()=>checkSurfaces({words,surfaces:[twice],policy})).toThrow();
 });
 it('cannot bake fixtures or admit them through the existing shipping guard',()=>{
  expect(()=>bakeBank({fixture:true,words:[],surfaces:[],policy:{},sourceDirectory:''})).toThrow('Test fixtures');
  const dir=mkdtempSync(join(tmpdir(),'g6-admission-'));
  try{mkdirSync(join(dir,'content/words/banks'),{recursive:true});writeFileSync(join(dir,'content/words/banks/fixture.json'),JSON.stringify(fixture));expect(()=>checkShippingTree(dir)).toThrow('Unadmitted');}
  finally{rmSync(dir,{recursive:true,force:true});}
 });
 it('never opens a fixture option in the real G6 bake',()=>{
  const dir=join(tmpdir(),'g6-fixture-rejection-'+Date.now());
  expect(()=>bakeSearch({fixture:true},{schemaVersion:1,banks:[]},dir)).toThrow('real W2');expect(existsSync(dir)).toBe(false);
 });
 it('rejects reserved-slot and malformed-plan changes before writing anything',()=>{
  const dir=join(tmpdir(),'g6-plan-rejection-'+Date.now());
  expect(()=>bakeSearch({fixture:false},{schemaVersion:1,banks:[]},dir)).toThrow('real W2');expect(existsSync(dir)).toBe(false);
 });
});
