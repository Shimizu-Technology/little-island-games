import{expect,it}from'vitest';
import{orderCandidates}from'../scripts/puzzles/solitaire/order';
import{kitOrder,worstBack}from'../scripts/puzzles/order';
import fixture from'./fixtures/solitaire/gentle-order.json';
it('keeps a freshly verified full Trench order instead of shrinking it during a second arrangement',()=>{
 const before=JSON.stringify(fixture),ordered=orderCandidates(fixture,64);
 expect(ordered).toEqual(fixture);expect(ordered).toHaveLength(64);expect(worstBack(ordered.map(c=>c.workload))).toEqual({worst:0,allowed:0.5});expect(JSON.stringify(fixture)).toBe(before);
});
it('only keeps existing orders which meet both the kit and the gentle-order policy',()=>{
 const shuffled=[...fixture].reverse(),out=orderCandidates(shuffled,64),back=worstBack(out.map(c=>c.workload));
 expect(out).not.toEqual(shuffled);expect(back.worst).toBeLessThanOrEqual(back.allowed);expect(kitOrder(out)).toEqual(out);
});
