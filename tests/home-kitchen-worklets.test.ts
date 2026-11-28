import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('rejects the exact Build 11 unworkletized trash capability call under the production plugin', () => {
  const script = `const {auditHomeWorklets}=require('./scripts/audit-home-worklet-closures.cjs');
    const fs=require('node:fs');
    const source=fs.readFileSync('src/home/scene/resolve.ts','utf8');
    const broken='import { capabilityOf } from "../world";\\n'+source.replace('!!subject.body?.edible || !!subject.body?.discardable','!!capabilityOf(subject.item.item).edible');
    try { auditHomeWorklets({'src/home/scene/resolve.ts':broken}); process.exitCode=1; }
    catch (error) { if (!error.message.includes('capabilityOf')) throw error; console.log('Caught Build 11 crash'); }`;
  expect(execFileSync(process.execPath, ['-e', script], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'production' } })).toContain('Caught Build 11 crash');
});
it('audits all production Home closures and resolves real Kitchen and lagoon edits', () => {
  const output = execFileSync(process.execPath, ['scripts/check-home-worklets.cjs'], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'production' } });
  expect(output).toContain('Kitchen and both lagoons passed');
});
it('guards missing room-hop destinations and unresolved proposals before publishing a transfer', () => {
  const source = readFileSync('src/home/runtime/useInteraction.ts', 'utf8');
  expect(source).toContain('if (hop && prepared.value.rooms[hop.room])');
  expect(source).toContain('if (proposal) return { ...proposal, kind: "transfer"');
});
it('rejects unsafe auto-worklet hook calls and a component port whose provider loses its worklet tag', () => {
  const script = `const {auditHomeWorklets}=require('./scripts/audit-home-worklet-closures.cjs');
    const fs=require('node:fs');
    const bin=fs.readFileSync('src/home/runtime/KitchenBin.tsx','utf8');
    const unsafe='import { capabilityOf } from "../world";\\n'+bin.replace('restingFlags.value.dragTargets.includes(trashCan.id) ? 1 : 0','capabilityOf("mango").edible ? 1 : 0');
    const interaction=fs.readFileSync('src/home/runtime/useInteraction.ts','utf8');
    const untagged=interaction.replace(/(const externalMove = [\\s\\S]*?\\{)\\s*"worklet";/,'$1');
    for (const source of [{'src/home/runtime/KitchenBin.tsx':unsafe},{'src/home/runtime/useInteraction.ts':untagged}]) {
      let caught=false;
      try { auditHomeWorklets(source); } catch(error) { if (!/capabilityOf|externalMove/.test(error.message)) throw error; caught=true; }
      if (!caught) throw Error('Unsafe hook or component callback escaped the audit');
    }
    console.log('Hook and component provider regressions caught');`;
  expect(execFileSync(process.execPath, ['-e', script], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'production' } })).toContain('regressions caught');
});
