import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readEvidenceIndex } from './matrix.ts';
// Optional source audit; ordinary npm test remains portable without private artifacts.
const root = process.argv[2];
if (!root) throw new Error('Supply the external artifacts root as the sole argument.');
let reports = 0, heads = 0;
for (const report of readEvidenceIndex().reports.filter(r => r.testedHeads?.length)) {
  const bytes = readFileSync(resolve(root, report.path));
  if (createHash('sha256').update(bytes).digest('hex') !== report.sha256) throw new Error(`Report snapshot changed: ${report.path}`);
  for (const head of report.testedHeads) {
    if (!bytes.toString('utf8').includes(head.record) || !head.record.includes(head.recordedHead) || !head.sha.startsWith(head.recordedHead)) throw new Error(`Tested-head excerpt differs: ${report.path}`);
    heads++;
  }
  reports++;
}
console.log(`Evidence source audit: ${reports} report hashes and ${heads} tested-head excerpts match.`);
