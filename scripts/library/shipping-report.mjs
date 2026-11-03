import { contentHash } from './approval.mjs';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
/** Read-only readiness report. It never accepts a recording or promotes a record. */
export function shippingReport(items, speech) {
  const receipt = JSON.parse(readFileSync('scripts/library/audio-receipt.json', 'utf8'));
  const missingOrStaleClips = Object.entries(speech).flatMap(([key, text]) => {
    const clip = receipt.clips[key];
    return clip && clip.path === `assets/audio/${key}.m4a` && clip.transcriptSha256 === hash(text) && existsSync(clip.path) && hash(readFileSync(clip.path)) === clip.sha256 ? [] : [key];
  });
  const records = items.map(item => {
    const decision = item.review.familyDecision;
    return {
      id: item.id,
      status: item.review.status,
      factualRecheck: item.type === 'collection' ? 'membership decision' : item.review.factualReviewer ? 'recorded' : 'missing',
      familyDecision: decision?.decision === 'Yes' && decision.contentSha256 === contentHash(item) ? 'current Yes' : decision ? 'stale or unresolved' : 'missing',
      audioAccepted: decision?.audioAccepted === true,
      pronunciationAccepted: decision?.pronunciationAccepted === true,
    };
  });
  return {
    mode: 'read-only shipping readiness; no approval or promotion',
    records: records.length,
    generatedClips: Object.keys(receipt.clips).length,
    missingOrStaleClips,
    missingFactualRecheck: records.filter(r => r.factualRecheck === 'missing').map(r => r.id),
    missingOrStaleFamilyDecision: records.filter(r => r.familyDecision !== 'current Yes').map(r => r.id),
    awaitingLeadAudioAndPronunciation: records.filter(r => !r.audioAccepted || !r.pronunciationAccepted).map(r => r.id),
    unpromotedRecords: records.filter(r => r.status !== 'approved').map(r => r.id),
    detail: records,
  };
}
