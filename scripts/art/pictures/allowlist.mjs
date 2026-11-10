// Checks every picture word against the W1 word pipeline's private queues and policy.
//   node scripts/art/pictures/allowlist.mjs <W1 queues directory> <new private receipt path>
// The queues directory holds tiers.queue.json, local.queue.json and safety-policy.private.json
// (W1 REPORT: private/queues-authoritative). Nothing private is written into the repository:
// content/pictures/allowlist.json records only each word's queue, record id and reader level.
// The receipt, with queue hashes and counts, goes to the private path given.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { answerAllowed, validateWord } from '../../words/core.mjs';
import { privatePath } from '../../words/paths.mjs';
import { definitions } from './defs/index.mjs';
import { OUT } from './build.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/** Pure: which queue holds each word, and whether W1's own word rules accept it. */
export function checkWords(words, queues, policy) {
  const results = {}, failures = [];
  for (const word of words) {
    const found = Object.entries(queues).map(([queue, list]) => [queue, list.find(r => r.spelling === word)]).find(([, r]) => r);
    if (!found) { failures.push(`${word}: not in any W1 queue`); continue; }
    const [queue, record] = found;
    const problems = [];
    try { validateWord(record); } catch (e) { problems.push(`validateWord: ${e.message}`); }
    if (!answerAllowed(record, policy)) problems.push('answerAllowed: blocked by the exact/lemma policy');
    if (record.form !== 'lemma') problems.push(`form is ${record.form}`);
    if (record.properNoun || record.abbreviation) problems.push('proper noun or abbreviation');
    if (problems.length) failures.push(`${word}: ${problems.join('; ')}`);
    results[word] = { wordId: record.id, queue, readerLevel: record.readerLevel };
  }
  return { results, failures };
}

if (process.argv[1]?.endsWith('allowlist.mjs')) {
  const [dir, receiptPath] = process.argv.slice(2);
  if (!dir || !receiptPath) { console.error('Usage: allowlist.mjs <W1 queues directory> <new private receipt path>'); process.exit(1); }
  if (existsSync(receiptPath)) { console.error('Receipt path already exists; give a new one.'); process.exit(1); }
  privatePath(receiptPath);
  const files = ['tiers.queue.json', 'local.queue.json', 'safety-policy.private.json'];
  const bytes = Object.fromEntries(files.map(f => [f, readFileSync(join(dir, f))]));
  const queues = { tiers: JSON.parse(bytes['tiers.queue.json']).words, local: JSON.parse(bytes['local.queue.json']).words };
  const policy = JSON.parse(bytes['safety-policy.private.json']);
  const words = definitions().map(d => d.word);
  const { results, failures } = checkWords(words, queues, policy);
  const broadHits = words.filter(w => policy.scan.map(s => s.toUpperCase()).includes(w)).length;
  writeFileSync(receiptPath, `${JSON.stringify({ schemaVersion: 1, checkedAt: new Date().toISOString(), queueDirectory: dir, sha256: Object.fromEntries(files.map(f => [f, sha256(bytes[f])])), words: words.length, failures, wordsAlsoOnBroadScanList: broadHits, note: 'Broad-scan membership does not block an answer (answerAllowed uses exact/lemma lists); it matters for the export guard once labels ship in a bundle.' }, null, 2)}\n`);
  if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
  const counts = Object.values(results).reduce((c, r) => ({ ...c, [r.queue]: (c[r.queue] ?? 0) + 1 }), {});
  writeFileSync(join(OUT, 'allowlist.json'), `${JSON.stringify({ schemaVersion: 1, checkedOn: new Date().toISOString().slice(0, 10), source: 'W1 word pipeline queues (private, see the W4 report); checks: present in a queue, validateWord, answerAllowed, lemma, not proper noun or abbreviation', counts, words: results }, null, 2)}\n`);
  console.log(`All ${words.length} words pass: ${JSON.stringify(counts)}. ${broadHits} are also on the broad scan list (receipt only).`);
}
