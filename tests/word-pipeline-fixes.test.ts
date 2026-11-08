import { expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
it('passes isolated positive bakes and individual safety-gate regressions', () => {
  const result = spawnSync(process.execPath, ['--test', 'tests/helpers/word-pipeline-regressions.mjs'], {encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
  expect(result.stdout + result.stderr).not.toContain('not ok');
  expect(result.status, result.stdout + result.stderr).toBe(0);
}, 130000);
