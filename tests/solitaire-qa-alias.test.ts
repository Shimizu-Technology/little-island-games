import {expect,it} from 'vitest';
import {buildMatrix,discoverInventory,readScope,validateMatrix} from '../scripts/qa/matrix';
it('maps the FreeCell packed family and all its published banks to the registered Solitaire game',()=>{
 const scope=readScope(),inventory=discoverInventory(process.cwd(),scope),matrix=buildMatrix(process.cwd(),scope,inventory);
 expect(inventory.games).toContain('solitaire');expect(inventory.games).not.toContain('freecell');
 expect(inventory.banks.filter(b=>b.slot>=100&&b.slot<=109).sort((a,b)=>a.slot-b.slot)).toEqual(Array.from({length:10},(_,i)=>({game:'solitaire',slot:100+i})));
 expect(()=>validateMatrix(matrix,scope,inventory)).not.toThrow();
 for(let slot=106;slot<=109;slot++)expect(matrix.rows.find(r=>r.id===`BP-solitaire-${slot}`)?.games).toEqual(['solitaire']);
});
it('still rejects an unmapped new packed family against the frozen roster',()=>{
 const scope=structuredClone(readScope());delete scope.registrationAliases.freecell;
 const inventory=discoverInventory(process.cwd(),scope),matrix=buildMatrix(process.cwd(),scope,inventory);
 expect(inventory.games).toContain('freecell');expect(()=>validateMatrix(matrix,scope,inventory)).toThrow('missing game/Cove row: freecell');
});
