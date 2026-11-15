import { expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
// The harness grew with the reading-record cases; a slow host gets the same allowance as the rest of the suite.
const limit = process.env.LITTLE_ISLAND_SLOW_HOST === '1' ? 900000 : 120000;
it('passes isolated positive bakes and individual safety-gate regressions', () => {
  const result = spawnSync(process.execPath, ['--test', 'tests/helpers/word-pipeline-regressions.mjs'], {encoding:'utf8',timeout:limit,maxBuffer:8*1024*1024});
  expect(result.stdout + result.stderr).not.toContain('not ok');
  expect(result.status, result.stdout + result.stderr).toBe(0);
}, limit + 10000);
