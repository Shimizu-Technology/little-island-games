import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { admittedItems } from '../scripts/library/admission.mjs';
const hash = (v: unknown) => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex');
function approved() {
  const item = JSON.parse(readFileSync('content/library/items.json', 'utf8')).find((i: any) => i.type === 'collection');
  item.review = { ...item.review, status: 'approved', factualReviewer: 'Fact reviewer', familyReviewer: 'Family reviewer' };
  item.members = [item.id];
  const receipt = JSON.parse(readFileSync('scripts/library/audio-receipt.json', 'utf8'));
  const clip = receipt.clips[item.label.speechKey];
  item.label.audio = { status: 'ready', ...clip, reviewer: 'Family reviewer', date: '2026-11-03', rights: item.rights };
  const content = structuredClone(item); delete content.review.familyReviewer; delete content.review.familyDecision;
  item.review.familyDecision = { decision: 'Yes', reviewer: 'Family reviewer', date: '2026-11-03', contentSha256: hash(content), audioAccepted: true, pronunciationAccepted: true };
  return item;
}
function shipping(item: unknown) {
  const dir = mkdtempSync(join(tmpdir(), 'fixes5-shipping-'));
  try {
    const file = join(dir, 'items.json'); writeFileSync(file, JSON.stringify([item]));
    try { execFileSync(process.execPath, ['scripts/library/validate.mjs', '--shipping', '--file', file], { stdio: 'pipe' }); return true; }
    catch { return false; }
  } finally { rmSync(dir, { recursive: true }); }
}
describe('F3 shipping and admission share current explicit approval', () => {
  it('accepts a current complete approval', () => { const item = approved(); expect(shipping(item)).toBe(true); expect(admittedItems([item])).toEqual([item]); });
  it.each(['stale content', 'Change', 'audio', 'pronunciation', 'reviewer', 'decision date'])('rejects %s in shipping and default admission', reason => {
    const item = approved();
    if (reason === 'stale content') item.grownUpNote = 'Changed after approval.';
    else if (reason === 'Change') item.review.familyDecision.decision = 'Change';
    else if (reason === 'audio') delete item.review.familyDecision.audioAccepted;
    else if (reason === 'pronunciation') item.review.familyDecision.pronunciationAccepted = false;
    else if (reason === 'reviewer') item.review.familyDecision.reviewer = '';
    else item.review.familyDecision.date = '2026-02-30';
    expect(shipping(item)).toBe(false); expect(admittedItems([item])).toEqual([]);
  });
});
