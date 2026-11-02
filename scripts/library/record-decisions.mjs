import { Buffer } from "node:buffer";
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const args = process.argv.slice(2), option = name => args[args.indexOf(name) + 1];
const path = 'content/library/items.json';
const items = JSON.parse(readFileSync(path, 'utf8'));
const hash = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const contentHash = item => {
  const content = structuredClone(item);
  delete content.review.familyReviewer;
  delete content.review.familyDecision;
  return hash(content);
};
if (args.includes('--template')) {
  writeFileSync(option('--template'), JSON.stringify({ reviewer: '', date: '', decisions: items.map(item => ({ id: item.id, title: item.title, kind: item.type, sensitiveNotes: item.sensitiveNotes, contentSha256: contentHash(item), decision: 'pending', note: '', audioAccepted: false, pronunciationAccepted: false })) }, null, 2) + '\n', { flag: 'wx' });
  console.log('Wrote an unanswered template. No approval was recorded.');
} else {
  if (!args.includes('--file')) throw new Error('Use --template <new-file> or --file <answered-file> [--approve]');
  const input = JSON.parse(readFileSync(option('--file'), 'utf8'));
  if (!input.reviewer?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || new Date(input.date).toISOString().slice(0, 10) !== input.date) throw new Error('A real reviewer and valid review date are required');
  const decisions = new Map(input.decisions.map(d => [d.id, d]));
  if (decisions.size !== input.decisions.length || [...decisions.keys()].some(id => !items.some(i => i.id === id))) throw new Error('Duplicate or unknown decision IDs');
  const approve = args.includes('--approve');
  if (approve && (decisions.size !== items.length || [...decisions.values()].some(d => d.decision !== 'Yes' || d.audioAccepted !== true || d.pronunciationAccepted !== true))) throw new Error('Shipping needs every item/collection Yes plus explicit audio and pronunciation acceptance; Change/pending cannot ship');
  const receipt = approve ? JSON.parse(readFileSync('scripts/library/audio-receipt.json', 'utf8')) : undefined;
  if (approve && (receipt.voice !== 'af_heart' || receipt.engine !== 'Kokoro-82M v1.0' || receipt.networkPlayback !== false)) throw new Error('A local warm Kokoro generation receipt is required');
  const next = structuredClone(items);
  function publishSentences(value, item) {
    if (!value || typeof value !== 'object') return;
    if (value.speechKey && value.text && value.audio) {
      const clip = receipt.clips[value.speechKey];
      if (!clip || clip.path !== `assets/audio/${value.speechKey}.m4a` || clip.transcriptSha256 !== hash(value.text) || clip.sha256 !== hash(readFileSync(clip.path))) throw new Error(`Stale or missing recording: ${value.speechKey}`);
      value.audio = { status: 'ready', path: clip.path, sha256: clip.sha256, transcriptSha256: clip.transcriptSha256, reviewer: input.reviewer, date: input.date,
        rights: { ...item.rights, creator: `${item.rights.creator}; local Kokoro-82M v1.0 / af_heart narration`, changes: `Locally generated narration of credited text; Kokoro Apache-2.0, kokoro-onnx MIT. ${item.rights.changes}` } };
    } else for (const child of Object.values(value)) publishSentences(child, item);
  }
  for (const item of next) {
    const d = decisions.get(item.id);
    if (!d || d.decision === 'pending') continue;
    if (!['Yes', 'Change'].includes(d.decision) || d.contentSha256 !== contentHash(items.find(i => i.id === item.id))) throw new Error(`Invalid or stale decision: ${item.id}`);
    if (d.decision === 'Change' && !d.note?.trim()) throw new Error(`Describe the requested change: ${item.id}`);
    item.review.familyDecision = { decision: d.decision, note: d.note ?? '', reviewer: input.reviewer, date: input.date, contentSha256: d.contentSha256, audioAccepted: d.audioAccepted === true, pronunciationAccepted: d.pronunciationAccepted === true };
    if (d.decision === 'Yes') item.review.familyReviewer = input.reviewer;
    else { delete item.review.familyReviewer; item.review.status = item.type === 'collection' ? 'draft' : 'in-review'; }
    if (approve) {
      if (!item.review.factualReviewer && item.type !== 'collection') throw new Error(`Missing independent factual review: ${item.id}`);
      if (item.type === 'collection') item.review.factualReviewer = input.reviewer; // Explicit collection-membership decision, not a science review.
      publishSentences(item, item);
      item.review.status = 'approved';
      item.review.scope += ` Family, pronunciation and generated narration accepted by ${input.reviewer} on ${input.date}.`;
    }
  }
  const candidate = `${path}.decisions-${process.pid}.tmp`;
  try {
    writeFileSync(candidate, JSON.stringify(next, null, 2) + '\n', { flag: 'wx' });
    execFileSync(process.execPath, ['scripts/library/validate.mjs', '--file', candidate, ...(approve ? ['--shipping'] : [])], { stdio: 'pipe' });
    if (args.includes('--dry-run')) console.log('Validated decisions; dry run left content unchanged.');
    else { renameSync(candidate, path); console.log(approve ? 'Recorded explicit decisions and reviewed audio; shipping validation passed. No build was published.' : 'Recorded supplied family decisions. Shipping remains gated.'); }
  } finally { try { unlinkSync(candidate); } catch { /* Renamed on success. */ } }
}
