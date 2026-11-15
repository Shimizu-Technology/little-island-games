import { lockedPolicy, contentPolicy } from './policy.mjs';
import { digest, requireThat, answerAllowed, validateReadingRecord, readingStrings } from './core.mjs';
import { requireShippingReview } from './review.mjs';
import { scanScramble } from './scan.mjs';

/**
 * Lead contract change: W1 reading records.
 *
 * The same detached admission Word Search words use, for Sound Boat's word-parts records: the locked private policy,
 * a prepared blind batch, two imported reviews whose transcript bytes are reread, the lead's reconciliation and the
 * family sample. An inline `status` or `review` field has no effect (the record shape has no such field), and a
 * fixture can never bake. The runtime projection carries only what the board needs: no review state, hash or policy.
 */
export const READING_ASSET_KIND = 'reading-parts';
const PROJECTED = ['id', 'word', 'level', 'kind', 'chunks', 'distractors', 'base', 'affix', 'change', 'gloss', 'family', 'alternates'];

export function bakeReadingBank({ records, evidence = {}, reviewBatches = {}, policy, fixture }) {
  requireThat(fixture === false, 'Test fixtures can never produce a shipping bank');
  const { lock, policy: held } = lockedPolicy(policy);
  const scanListSha256 = lock.scanListSha256;
  requireThat(Array.isArray(records) && records.length > 0 && new Set(records.map(r => r.id)).size === records.length && new Set(records.map(r => r.word)).size === records.length, 'Empty reading bank or duplicate records');
  const batchCache = new Map(), verifiedEvidence = {};
  for (const record of records) {
    validateReadingRecord(record);
    const shown = readingStrings(record).map(t => t.toUpperCase());
    for (const upper of shown) requireThat(answerAllowed({ spelling: upper, lemma: upper, language: 'en', british: [] }, held), 'Exact/lemma-blocked reading text');
    for (const upper of shown) if (upper.length >= 3) requireThat(scanScramble(upper, held.scan).length === 0, 'Reading text hits the private scan list');
    const ref = evidence[record.id], ev = typeof ref === 'string' ? reviewBatches[ref] : ref;
    requireThat(ev?.prepared?.batch?.kind === 'reading', 'Reading records need a reading review batch');
    requireThat(ev.prepared.batch.scanListSha256 === scanListSha256, 'Review scan hash binding mismatch; changed policy needs fresh review');
    verifiedEvidence[record.id] = requireShippingReview(record, ev, batchCache);
  }
  const receipt = { schemaVersion: 1, kind: READING_ASSET_KIND, vocabularySha256: digest(records), scanListSha256, policySha256: digest(contentPolicy(policy)), evidence: verifiedEvidence, reviewIds: [...new Set(records.flatMap(r => verifiedEvidence[r.id].reviewIds))].sort(), counts: { words: records.length } };
  const asset = { schemaVersion: 1, kind: READING_ASSET_KIND, words: records.map(r => Object.fromEntries(PROJECTED.filter(k => r[k] !== undefined).map(k => [k, r[k]]))) };
  return { asset, receipt };
}
