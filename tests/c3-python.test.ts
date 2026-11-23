import { readFileSync } from 'node:fs';
import { sha256Hex } from '../src/puzzles/sha256';
import { solves } from '../src/learn/games/code-lab/attempt';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { allPrograms, schoolPrograms, deepPrograms, numberPrograms, IDEAS } from '../src/learn/games/code-lab/content';
import { runPython } from '../src/learn/games/code-lab/python';
import { engine as legacy, taskAt } from '../src/learn/games/code-lab/legacy';
const parity = (sources: readonly (readonly string[])[]) => {
  const script = `import sys,json,io,contextlib\nrows=json.load(sys.stdin)\nresults=[]\nfor lines in rows:\n out=io.StringIO()\n returned=[None]\n def trace(frame,event,arg):\n  if event=='return' and frame.f_code.co_filename=='<lab>' and frame.f_code.co_name!='<module>': returned[0]=arg\n sys.setprofile(trace)\n with contextlib.redirect_stdout(out): exec(compile('\\n'.join(lines),'<lab>','exec'),{})\n sys.setprofile(None)\n results.append({'output':out.getvalue().splitlines(),'returned':returned[0]})\nprint(json.dumps(results))`;
  const python = JSON.parse(execFileSync('python3', ['-I', '-c', script], { input: JSON.stringify(sources), encoding: 'utf8', timeout: 30000, maxBuffer: 5e6 })) as { output: string[]; returned: unknown }[];
  sources.forEach((source, i) => { const ts = runPython(source); expect(ts.error, source.join('\n')).toBeNull(); expect({ output: ts.output, returned: ts.returned }, source.join('\n')).toEqual(python[i]); });
};
describe('C3 interpreter and CPython parity', () => {
  it('executes EVERY shipped School, Deep Water and number template in real Python with exact output and return parity', () => parity(allPrograms.map(p => p.lines)));
  it('keeps multi-line loops, nested else, early return, list aliasing and local function scope faithful to Python', () => parity([
    ['n = 4','def f(n):','    for i in range(n):','        if i > 1:','            return i','        else:','            print(i)','    return 8','print(f(n))','print(n)'],
    ['items = [1, 2]','alias = items','alias.append(3)','print(items)','print(items[-1])'],
    ['print(-7 // 3)','print(-7 % 3)','print(2 + 3 * 4)','print(False and missing)','print(True or missing)'],
    ['n = 40','steps = 0','while n > 1:','    n = n // 2','    steps = steps + 1','print(steps)'],
  ]));
  it('stops runaway loops, recursion, huge values and unsupported input without hanging', () => {
    for (const source of [['while True:','    print(1)'], ['def f(n):','    return f(n)','print(f(1))'], ['print("x" * 1000000)'], ['import os'], ['print([1][2])'], ['print(1 // 0)'], ['if True:','print(2)']]) expect(runPython(source, 100).error).not.toBeNull();
    expect(runPython(['while True:', '    n = 1'], 100).steps).toBeLessThanOrEqual(101);
  });
  it('snapshots list values without later append rewriting earlier frames', () => { const r = runPython(['a = [1]', 'a.append(2)', 'print(a)']); expect(r.trace[0].watch.a).toEqual([1]); expect(r.trace[1].watch.a).toEqual([1, 2]); });
});
it('certifies 440 distinct sources: 80 School, 60 Deep Water, 300 number variants; no family exceeds 25% of a band', () => {
  expect(schoolPrograms.map(p => p.length)).toEqual([16,16,16,16,16]); expect(deepPrograms).toHaveLength(60); expect(numberPrograms).toHaveLength(300);
  expect(new Set(allPrograms.map(p => p.lines.join('\n'))).size).toBe(440);
  expect(new Set(deepPrograms.map(p => p.idea))).toEqual(new Set(IDEAS));
  for (const band of [...schoolPrograms, ...[1,2,3,4,5,6].map(t => deepPrograms.filter(p => p.band === t)), ...[1,2,3,4,5,6].map(t => numberPrograms.filter(p => p.band === t))]) {
    const counts: Record<string,number> = {}; for (const p of band) counts[p.family] = (counts[p.family] ?? 0) + 1;
    expect(Math.max(...Object.values(counts)) / band.length).toBeLessThanOrEqual(.25);
  }
  expect(deepPrograms.slice(-10).filter(p => p.band >= 5).every(p => p.steps > 100)).toBe(true);
  // A dumb reader who assumes the first printed number/zero fails the upper rungs.
  expect(deepPrograms.filter(p => p.band >= 5 && p.output === '0').length).toBeLessThan(deepPrograms.filter(p => p.band >= 5).length / 4);
});
it('keeps the old twenty programs and original save validator on their compatibility path', () => {
  const s = legacy.create({mode:'solo',pace:'easy'}, {rng:()=>0,skills:{},starter:0,today:0});
  expect(legacy.validate(s,{mode:'solo',pace:'easy'})).toBe(true); expect(taskAt(1,0,0).lines).toEqual(['print("Aloha")', 'robot.step()']);
});

it('binds the committed receipt to the current source/semantic proofs and defeats a first-choice bot at the top', () => {
  const receipt = JSON.parse(readFileSync('docs/code-lab-receipt.json','utf8'));
  expect(receipt.count).toBe(440);expect(receipt.parity).toBe(440);expect(receipt.semanticDistinct).toBe(440);
  allPrograms.forEach((d,i)=>{expect(receipt.entries[i].source).toBe(sha256Hex(d.lines.join('\n')));expect(receipt.entries[i].semantic).toBe(sha256Hex(JSON.stringify(runPython(d.lines).trace)));});
  const top = deepPrograms.filter(d=>d.band>=5&&d.mode==='build');expect(top.filter(d=>solves(d,d.slots.map(()=>0))).length).toBeLessThan(top.length/4);
});
