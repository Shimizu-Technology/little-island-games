import { expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
// Busy shared hosts may opt into more wall time; the assertions are unchanged.
const slow = process.env.LITTLE_ISLAND_SLOW_QA === '1' || process.env.LITTLE_ISLAND_SLOW_HOST === '1';
const childLimit = slow ? 900_000 : 120_000;
it('passes isolated positive bakes and individual safety-gate regressions', () => {
  const result = spawnSync(process.execPath, ['--test', 'tests/helpers/word-pipeline-regressions.mjs'], {encoding:'utf8',timeout:childLimit,maxBuffer:8*1024*1024});
  expect(result.stdout + result.stderr).not.toContain('not ok');
  expect(result.status, result.stdout + result.stderr).toBe(0);
}, childLimit + 10_000);
