import { readFileSync } from 'node:fs';
import { privatePath } from './paths.mjs';
import { digest, requireThat, nonempty, isDate, validateClue, validateWord, sha256 } from './core.mjs';

export const REVIEW_PROMPT_VERSION = 'family-words-blind-v1';
export const REVIEW_CONTEXT = `Judge for a private offline family app for a seven-year-old on Guam and older family members. All levels are open: Grown-up means harder, never mature. Catholic faith is welcome; mainstream science is welcome. Respect living faiths; no instruction in another religion's practice. Family wording includes two homes without pointing at it. No brands, shaming, reading pressure, graphic violence, colonial framing or jokes about Pacific neighbors. Warm, calm, honest; over-sanitizing is a failure. DRAGON, FAIRY, GIANT and GHOST can appear in all tiers as stories. WITCH, DEVIL and DEMON start at Strong. DEAD, DEATH and GUN start at Growing in calm science/history senses; SWORD in stories. CHamoru terms must be exact source-backed teaching text, limited to word search and matching; do not invent or fix any. God is allowed. Check accuracy, answer specificity, vocabulary/readability for the named tier, cultural/family fit, and originality. Every clue needs an actual decision. Return keep, revise, reject or call and a reason. Give an English replacement for revise. Do not infer another review or any approval. No web or published clue examples. For every British variant give a separate variants entry with spelling, keep/revise/reject/call, relation (spelling-variant only when it means the same thing), and reason. Check the actual variant, lemma, form, proper-noun status and allowed uses. This review does not approve shipping.`;
const visible = c => ({ id: c.id, answer: c.answer, meaning: c.meaning, tier: c.tier, text: c.text });
const visibleWord = c => ({id:c.id,spelling:c.spelling,meaning:c.sense,language:c.language,readerLevel:c.readerLevel,knownBand:c.knownBand,readBand:c.readBand,spellBand:c.spellBand,clueBand:c.clueBand,theme:c.theme,topic:c.topic,guamFit:c.guamFit,british:c.british,lemma:c.lemma,form:c.form,properNoun:c.properNoun,canonicalId:c.canonicalId ?? null,uses:c.uses ?? null,audio:c.audio,wordLengths:c.wordLengths ?? null,abbreviation:c.abbreviation,livingPerson:c.livingPerson ?? false});
function packetFor(batch,slot) {
  const items=batch.records.map(batch.kind === 'clue' ? visible : visibleWord).sort((x,y)=>digest(`${batch.id}:${slot}:${x.id}`).localeCompare(digest(`${batch.id}:${slot}:${y.id}`)));
  return {schemaVersion:1,batchId:batch.id,batchSha256:digest(batch),slot,fixture:batch.fixture,promptVersion:REVIEW_PROMPT_VERSION,context:REVIEW_CONTEXT,items};
}
function uniqueIds(items) {
  requireThat(Array.isArray(items) && items.length > 0 && new Set(items.map(x => x.id)).size === items.length && items.every(x => nonempty(x.id)), 'Empty/duplicate IDs');
}
export function prepareBatch(clues, options) { return prepareRecords(clues, options, 'clue'); }
export function prepareWordBatch(words, options) { return prepareRecords(words, options, 'word'); }
function prepareRecords(clues, { id, fixture, vocabularySha256, scanListSha256, canonicalTerms = [] }, kind) {
  requireThat(typeof fixture === 'boolean' && nonempty(id) && clues.length <= 250 && /^[a-f0-9]{64}$/.test(vocabularySha256) && /^[a-f0-9]{64}$/.test(scanListSha256), 'Invalid batch metadata');
  clues.forEach(c => kind === 'clue' ? validateClue(c) : validateWord(c,canonicalTerms)); uniqueIds(clues);
  const batch = { schemaVersion: 1, id, fixture, kind, records:clues, vocabularySha256, scanListSha256 };
  const batchSha256 = digest(batch);
  // Strict projections contain no lint, other verdicts, provenance or approval state.
  const packets = ['a','b'].map(slot => packetFor(batch,slot));
  const receipt = { schemaVersion: 1, batchId: id, batchSha256, fixture, count: clues.length, vocabularySha256, scanListSha256, clueReviewIds: [], packets: packets.map(p => ({ slot:p.slot, sha256:digest(p) })), state:'awaiting-two-independent-reviews' };
  const sheet = { schemaVersion: 1, batchId:id, batchSha256, fixture, rows:clues.map(c => ({ id:c.id, reviewerA:null, reviewerB:null, proposed:null, leadDecision:null, reason:null })) };
  return { batch, packets, receipt, sheet };
}
export function validateReview(packet, result, transcriptSha256) {
  requireThat(result?.schemaVersion === 1 && result.batchSha256 === packet.batchSha256 && result.packetSha256 === digest(packet) && result.slot === packet.slot && result.fixture === packet.fixture, 'Review is stale, for another packet or wrong fixture mode');
  const r = result.reviewer;
  requireThat(nonempty(r?.id) && ['openai','anthropic','google'].includes(r?.family) && nonempty(r?.model) && nonempty(result.runId), 'Reviewer identity/model family missing');
  requireThat(isDate(result.startedAt) && isDate(result.finishedAt) && Date.parse(result.finishedAt) > Date.parse(result.startedAt), 'Review timing missing/invalid');
  requireThat(/^[a-f0-9]{64}$/.test(transcriptSha256) && result.transcriptSha256 === transcriptSha256, 'Actual review transcript required');
  uniqueIds(result.items);
  requireThat(result.items.length === packet.items.length && result.items.every(x => packet.items.some(c => c.id === x.id)), 'Review must cover every packet item exactly once');
  for (const item of result.items) {
    requireThat(['keep','revise','reject','call'].includes(item.verdict) && nonempty(item.reason), 'Every review verdict needs a reason');
    requireThat(item.verdict !== 'revise' || nonempty(item.replacement), 'Revision needs replacement text');
  }
  return { ...result, id:digest(result), elapsedSeconds:(Date.parse(result.finishedAt)-Date.parse(result.startedAt))/1000 };
}
export function reconcile(prepared, a, b) {
  requireThat(prepared.packets?.length === 2 && ['a','b'].every(slot => digest(prepared.packets.find(p => p.slot === slot)) === digest(packetFor(prepared.batch,slot))), 'Blind packet projection does not match original batch');
  requireThat(a.slot === 'a' && b.slot === 'b' && a.batchSha256 === digest(prepared.batch) && b.batchSha256 === a.batchSha256 && a.fixture === prepared.batch.fixture && b.fixture === a.fixture, 'Wrong review batch');
  for (const r of [a,b]) {
    const packet = prepared.packets.find(p => p.slot === r.slot);
    validateReview(packet, r, r.transcriptSha256);
    const {id,elapsedSeconds,...original} = r;
    requireThat(id === digest(original) && elapsedSeconds > 0, 'Imported review integrity mismatch');
  }
  requireThat(a.reviewer.id !== b.reviewer.id && a.reviewer.family !== b.reviewer.family && a.runId !== b.runId && a.transcriptSha256 !== b.transcriptSha256, 'Two independent model families and runs required');
  const rows = prepared.batch.records.map(c => {
    const left = a.items.find(x => x.id === c.id), right = b.items.find(x => x.id === c.id);
    const same = left.verdict === right.verdict && (left.verdict !== 'revise' || left.replacement === right.replacement);
    return { id:c.id, contentSha256:digest(c), reviewerA:left, reviewerB:right, proposed:same ? left.verdict : 'disagreement', leadDecision:null, reason:null };
  });
  const disagreements = rows.filter(r => r.proposed === 'disagreement').length;
  return { schemaVersion:1, batchId:prepared.batch.id, batchSha256:digest(prepared.batch), fixture:prepared.batch.fixture, reviewIds:[a.id,b.id], clueReviewIds:prepared.batch.kind === 'clue'?[a.id,b.id]:[], vocabularySha256:prepared.batch.vocabularySha256,scanListSha256:prepared.batch.scanListSha256,reviews:[a,b], rows, metrics:{ count:rows.length, disagreements, disagreementRate:disagreements/rows.length, reviewerSeconds:[a.elapsedSeconds,b.elapsedSeconds], leadSeconds:null }, state:'awaiting-lead' };
}
/** Imported, detached evidence; never trusts an inline status/approved flag. */
export function requireShippingReview(record, evidence, cache = new Map()) {
  requireThat(evidence?.prepared?.batch?.fixture === false, 'Missing real review evidence for current content');
  const {prepared, reviews, lead, familySample, transcriptPaths} = evidence;
  requireThat(Array.isArray(reviews) && reviews.length === 2, 'Two imported reviews required');
  requireThat(prepared.batch.records.some(r => r.id === record.id && digest(r) === digest(record)), 'Review does not cover current content');
  let reconciled=cache.get(evidence);
  if (!reconciled) {
  requireThat(Array.isArray(transcriptPaths) && transcriptPaths.length === 2, 'Actual review transcript paths required');
  for (let i=0;i<2;i++) {
    let bytes;
    try { bytes=readFileSync(privatePath(transcriptPaths[i])); } catch { throw new Error('Actual review transcript bytes required'); }
    requireThat(bytes.length > 0 && sha256(bytes) === reviews[i].transcriptSha256, 'Actual review transcript hash mismatch');
  }
  reconciled = reconcile(prepared,reviews[0],reviews[1]);
  requireThat(lead?.schemaVersion === 1 && lead.fixture === false && lead.reconciliationSha256 === digest(reconciled) && nonempty(lead.reviewer) && isDate(lead.startedAt) && isDate(lead.finishedAt) && Date.parse(lead.finishedAt) > Date.parse(lead.startedAt), 'Actual lead reconciliation required');
  uniqueIds(lead.items);
  requireThat(lead.items.length === reconciled.rows.length && lead.items.every(i => reconciled.rows.some(r => r.id === i.id)), 'Lead must reconcile every row');
    cache.set(evidence,reconciled);
  }
  const row = reconciled.rows.find(r => r.id === record.id), decision = lead.items.find(r => r.id === record.id);
  requireThat(row.reviewerA.verdict === 'keep' && row.reviewerB.verdict === 'keep' && decision.decision === 'keep' && nonempty(decision.reason), 'Changed/rejected/called content requires fresh blind review');
  requireThat(familySample?.fixture === false && familySample.batchSha256 === digest(prepared.batch) && familySample.decision === 'keep' && nonempty(familySample.reviewer) && isDate(familySample.date) && nonempty(familySample.evidence), 'Actual family sample required before shipping');
  if (!cache.has(familySample)) {
  let familyBytes;
  try { familyBytes=readFileSync(privatePath(familySample.evidence)); } catch { throw new Error('Actual family evidence bytes required'); }
  requireThat(familyBytes.length > 0 && sha256(familyBytes) === familySample.evidenceSha256, 'Actual family evidence hash mismatch');
    cache.set(familySample,sha256(familyBytes));
  }
  for (const variant of record.british ?? []) for (const r of [row.reviewerA,row.reviewerB]) {
    requireThat(r.variants?.length === record.british.length && new Set(r.variants.map(v=>v.spelling)).size === record.british.length && r.variants.some(v=>v.spelling === variant && v.verdict === 'keep' && v.relation === 'spelling-variant' && nonempty(v.reason)), 'British variant needs explicit spelling-variant review');
  }
  return { reviewIds:reconciled.reviewIds, contentSha256:digest(record), transcriptSha256:reviews.map(r=>r.transcriptSha256), familyEvidenceSha256:cache.get(familySample) };
}
