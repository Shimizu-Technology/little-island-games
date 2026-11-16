import{expect,it}from'vitest';
import{readCatalog,productionDirs}from'../scripts/puzzles/pipeline';
import{rungs}from'../scripts/puzzles/solitaire/family';
import facts from'../src/puzzles/table/packs.generated.json';
import type{BankFacts}from'../src/puzzles/table/registration';
it('all ten packaged table facts match the immutable manifests and deliver each promised mode floor',()=>{
 const catalog=readCatalog(productionDirs),banks=facts as BankFacts[];expect(banks).toHaveLength(10);
 expect(new Set(banks.map(b=>b.band))).toEqual(new Set(rungs.map(r=>r.id)));
 for(const b of banks){const m=catalog.families.get(b.family)!,pack=m.packs.find(p=>p[0]===b.slot)!;expect(pack).toBeDefined();expect(b.slot).toBeGreaterThanOrEqual(100);expect(b.slot).toBeLessThanOrEqual(109);
  expect([b.first,b.count,b.packHash,b.rules,b.band]).toEqual([pack[1],pack[2],pack[4],pack[6],m.bands[pack[5]]]);expect(m.engine).toBe('solitaire');
  const rung=rungs.find(r=>r.id===b.band)!;expect(b.count).toBeGreaterThanOrEqual(rung.floor);expect(b.tier).toBe(rung.tier);expect(b.title).toBe(rung.title);expect(b.summary.trim()).not.toBe('');
 }
 const count=(prefix:string)=>banks.filter(b=>b.band.startsWith(prefix)).reduce((n,b)=>n+b.count,0);expect(count('o')).toBeGreaterThanOrEqual(128);expect(count('t')).toBeGreaterThanOrEqual(128);expect(count('f')).toBeGreaterThanOrEqual(256);
});
