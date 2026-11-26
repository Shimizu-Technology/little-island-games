import {expect,it} from 'vitest';
import {runPython} from '../src/learn/games/code-lab/python';
import {deepPrograms} from '../src/learn/games/code-lab/content';
it('records an implicit function return after an earlier explicit return',()=>{
 const r=runPython(['def f(x):','    if x:','        return 7','print(f(1))','print(f(0))']);
 expect(r.output).toEqual(['7','None']);expect(r.returned).toBeNull();
});
it('charges shared nested values to the same execution budget',()=>{
 const r=runPython(['a = [1]',...Array.from({length:12},()=> 'a = [a, a]'),'print(a)']);
 expect(r.error).toContain('step limit');expect(r.steps).toBeLessThanOrEqual(2049);
});
it('traces every while condition, including the final false check and a zero-iteration loop',()=>{
 const r=runPython(['n = 8','while n > 1:','    n = n // 2','while n > 9:','    n = 0','print(n)']);
 expect(r.trace.filter(f=>f.line===1).map(f=>f.watch.n)).toEqual([8,4,2,1]);expect(r.trace.filter(f=>f.line===3)).toHaveLength(1);
});
it('does not print an implicit None after a function that prints inside its loop',()=>{
 const d=deepPrograms.find(d=>d.id==='deep-0-8')!;expect(d.output).toBe('6\n7\n9');expect(d.lines.at(-1)).toBe('solve()');
});

it('shows the original guide for frozen v1 saves and touch-editor help for modern saves',async()=>{
 const {helpForState,engine}=await import('../src/learn/games/code-lab/engine');const {engine:legacy}=await import('../src/learn/games/code-lab/legacy');
 expect(helpForState({version:1})).toBe(legacy.help);expect(helpForState({version:2})).toBe(engine.help);expect(helpForState(undefined)).toContain('Undo');
});
