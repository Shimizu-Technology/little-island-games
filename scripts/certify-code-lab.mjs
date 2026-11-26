// Run with node --import ./scripts/puzzles/register.mjs scripts/certify-code-lab.mjs
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { allPrograms, deepPrograms, numberPrograms, schoolPrograms } from '../src/learn/games/code-lab/content.ts';
import { runPython } from '../src/learn/games/code-lab/python.ts';
const hash = text => createHash('sha256').update(text).digest('hex');
const script = `import sys,json,io,contextlib
results=[]
for lines in json.load(sys.stdin):
 out=io.StringIO()
 returned=[None]
 def trace(frame,event,arg):
  if event=='return' and frame.f_code.co_filename=='<lab>' and frame.f_code.co_name!='<module>': returned[0]=arg
 sys.setprofile(trace)
 with contextlib.redirect_stdout(out): exec(compile('\\n'.join(lines),'<lab>','exec'),{})
 sys.setprofile(None)
 results.append({'output':out.getvalue().splitlines(),'returned':returned[0]})
print(json.dumps(results))`;
const python = JSON.parse(execFileSync('python3',['-I','-c',script],{input:JSON.stringify(allPrograms.map(p=>p.lines)),encoding:'utf8',timeout:30000,maxBuffer:5e6}));
const entries=allPrograms.map((p,i)=>{const r=runPython(p.lines);if(r.error || JSON.stringify({output:r.output,returned:r.returned})!==JSON.stringify(python[i]))throw Error(`Parity failed: ${p.id}`);return {id:p.id,source:hash(p.lines.join('\n')),semantic:hash(JSON.stringify(r.trace)),family:p.family,idea:p.idea,band:p.band,steps:r.steps,python:true};});
const histogram=rows=>Object.fromEntries([...new Set(rows.map(p=>p.idea))].map(idea=>[idea,rows.filter(p=>p.idea===idea).length]));
const bands=[...schoolPrograms.map((rows,i)=>({id:`school-${i+1}`,rows})),...[1,2,3,4,5,6].map(i=>({id:`deep-${i}`,rows:deepPrograms.filter(p=>p.band===i)})),...[1,2,3,4,5,6].map(i=>({id:`number-${i}`,rows:numberPrograms.filter(p=>p.band===i)}))].map(({id,rows})=>{const families=Object.fromEntries([...new Set(rows.map(p=>p.family))].map(f=>[f,rows.filter(p=>p.family===f).length]));const largestShare=Math.max(...Object.values(families))/rows.length;if(largestShare>.25)throw Error(`Family share: ${id}`);return {id,count:rows.length,families,largestShare,techniques:histogram(rows)};});
const receipt={format:1,scope:'SC-04 FND-14 BK-23 CT-05',count:entries.length,sourceDistinct:new Set(entries.map(p=>p.source)).size,semanticDistinct:new Set(entries.map(p=>p.semantic)).size,semanticDefinition:'Exact executed line visits and value/output snapshots; numeric inputs count as semantic variants, variable renaming alone is not used.',python:execFileSync('python3',['--version'],{encoding:'utf8'}).trim(),parity:entries.filter(p=>p.python).length,bands,entries};
if(receipt.count!==440||receipt.semanticDistinct!==440)throw Error('Supply shortfall');
writeFileSync('docs/code-lab-receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log('Certified 440 distinct programs, 440/440 real Python parity; every band family share <=25%.');
