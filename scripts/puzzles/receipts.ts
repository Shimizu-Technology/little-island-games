import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import type { CertifiedEntry } from '../../src/puzzles/checks';
import { canonical } from '../../src/puzzles/descriptor';
import type { Provenance } from '../../src/puzzles/types';
import { asciiId, exactKeys, hashId, plain, uint, utf8Bytes } from '../../src/state/saveBits';

const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const histogram = (values: readonly (string | null)[]) => {
  const out: Record<string, number> = {};
  for (const v of values) if (v !== null) out[v] = (out[v] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : 1)));
};
const aggregate = (values: readonly (string | null)[]) => sha(values.filter(v => v !== null).join());

export type BakeFacts = { sourceSha: string; seedBase: number; attempts: number; rejects: Record<string, number>; budget: number; budgetHits: number; timedOut: boolean };
export type ReceiptPack = { family: string; engine: string; slot: number; band: string; first: number; count: number; rules: number; text: string };

/** Everything a receipt says that can be worked out again from the pack and its fresh certification. */
function provenFacts(entries: readonly CertifiedEntry<unknown>[]) {
  const solves = entries.map(e => e.solve);
  return {
    kept: entries.map(e => e.core.seed),
    distinct: { exact: new Set(entries.map(e => e.exactHash)).size, semantic: new Set(entries.map(e => e.semanticHash)).size },
    histograms: { technique: histogram(entries.map(e => e.technique)), template: histogram(entries.map(e => e.core.template)), layout: histogram(entries.map(e => e.core.layout)) },
    bounds: [Math.min(...solves.map(s => s.lower)), Math.max(...solves.map(s => s.upper))],
    exact: solves.filter(s => s.exact).length,
    proofHashes: { witness: aggregate(entries.map(e => e.witnessHash)), trace: aggregate(entries.map(e => e.traceHash)), claims: aggregate(entries.map(e => e.claimsHash)) },
    bots: entries.reduce<Record<string, number>>((all, e) => { for (const b of e.bots) if (b.ran) all[b.id] = (all[b.id] ?? 0) + (b.beat ? 1 : 0); return all; }, {}),
    speech: entries.filter(e => e.core.speech).length,
  };
}
const gzipBytes = (text: string) => gzipSync(text).length;

/** Approval starts open. Review and native QA are added afterward, against this exact pack. */
export function receiptBody(pack: ReceiptPack, entries: readonly CertifiedEntry<unknown>[], meta: { catalogRevision: number; kit: string; family: string; reviewIds: readonly string[]; provenance: Provenance }, facts: BakeFacts): string {
  const proven = provenFacts(entries), bytes = utf8Bytes(pack.text);
  return `${JSON.stringify({
    format: 1, family: pack.family, slot: pack.slot, catalogRevision: meta.catalogRevision, band: pack.band, ordinals: [pack.first, pack.count], sourceSha: facts.sourceSha,
    hashes: { kit: meta.kit, family: meta.family }, rng: 1, rules: pack.rules,
    seeds: { base: facts.seedBase, attempts: facts.attempts, kept: proven.kept }, rejects: facts.rejects,
    distinct: proven.distinct, histograms: proven.histograms,
    solve: { status: 'solved', budget: facts.budget, budgetExhausted: facts.budgetHits, timedOut: facts.timedOut, bounds: proven.bounds, exact: proven.exact },
    proofHashes: proven.proofHashes, bots: proven.bots, provenance: meta.provenance,
    review: { ids: meta.reviewIds, complete: false, subject: null }, speech: proven.speech,
    bytes: { raw: bytes, gzip: gzipBytes(pack.text) }, sha256: sha(pack.text), native: [], machineGates: true, allShippingGates: false,
  }, null, 1)}\n`;
}

type Receipt = {
  family: string; slot: number; catalogRevision: number; band: string; ordinals: number[]; hashes: { kit: string; family: string }; rules: number;
  seeds: { kept: number[] }; distinct: unknown; histograms: unknown; solve: { bounds: number[]; exact: number }; proofHashes: unknown; bots: unknown;
  review: { ids: string[]; complete: boolean; subject: unknown }; speech: number; bytes: { raw: number; gzip: number }; sha256: string; native: unknown[]; machineGates: boolean; allShippingGates: boolean;
};
const counts = (x: unknown) => plain(x) && Object.values(x).every(v => uint(v));
const pair = (x: unknown) => Array.isArray(x) && x.length === 2 && x.every(v => uint(v));
const label = (x: unknown) => typeof x === 'string' && x.length > 0 && x.length <= 64;
const uniqueLabels = (x: unknown): x is string[] => Array.isArray(x) && x.every(label) && new Set(x).size === x.length;
const validProvenance = (x: unknown) => plain(x) && (exactKeys(x, ['source', 'note']) || (exactKeys(x, ['source', 'note', 'vocabulary']) && typeof x.vocabulary === 'string'))
  && (x.source === 'original' || x.source === 'reviewed') && typeof x.note === 'string' && x.note.length > 0;
function validReceipt(x: unknown): x is Receipt {
  if (!plain(x) || !exactKeys(x, ['format', 'family', 'slot', 'catalogRevision', 'band', 'ordinals', 'sourceSha', 'hashes', 'rng', 'rules', 'seeds', 'rejects', 'distinct', 'histograms', 'solve', 'proofHashes', 'bots', 'provenance', 'review', 'speech', 'bytes', 'sha256', 'native', 'machineGates', 'allShippingGates'])) return false;
  const { hashes, seeds, solve, proofHashes, review, bytes, distinct, histograms } = x;
  return x.format === 1 && asciiId(x.family) && uint(x.slot, 511) && uint(x.catalogRevision) && asciiId(x.band, 24) && pair(x.ordinals) && label(x.sourceSha) && x.rng === 1 && uint(x.rules, 65535) && counts(x.rejects) && counts(x.bots) && uint(x.speech) && hashId(x.sha256)
    && validProvenance(x.provenance) && Array.isArray(x.native) && typeof x.machineGates === 'boolean' && typeof x.allShippingGates === 'boolean'
    && plain(hashes) && exactKeys(hashes, ['kit', 'family']) && hashId(hashes.kit) && hashId(hashes.family)
    && plain(seeds) && exactKeys(seeds, ['base', 'attempts', 'kept']) && uint(seeds.base) && uint(seeds.attempts) && Array.isArray(seeds.kept) && seeds.kept.every(v => uint(v))
    && plain(distinct) && exactKeys(distinct, ['exact', 'semantic']) && uint(distinct.exact) && uint(distinct.semantic)
    && plain(histograms) && exactKeys(histograms, ['technique', 'template', 'layout']) && Object.values(histograms).every(counts)
    && plain(solve) && exactKeys(solve, ['status', 'budget', 'budgetExhausted', 'timedOut', 'bounds', 'exact']) && solve.status === 'solved' && uint(solve.budget) && uint(solve.budgetExhausted) && typeof solve.timedOut === 'boolean' && pair(solve.bounds) && uint(solve.exact)
    && plain(proofHashes) && exactKeys(proofHashes, ['witness', 'trace', 'claims']) && Object.values(proofHashes).every(hashId)
    && plain(review) && exactKeys(review, ['ids', 'complete', 'subject']) && uniqueLabels(review.ids) && typeof review.complete === 'boolean' && (review.subject === null || plain(review.subject))
    && plain(bytes) && exactKeys(bytes, ['raw', 'gzip']) && uint(bytes.raw) && uint(bytes.gzip);
}

const packKeys = ['id', 'build', 'sourceSha', 'scope', 'engine', 'rules', 'family', 'slot', 'sha256'];
const mechanicKeys = ['id', 'build', 'sourceSha', 'scope', 'engine', 'rules', 'maxPackBytes'];
/** Native QA may cover one pack, or a mechanic up to the largest pack it actually ran. Either way it names a build. */
function nativeCovers(x: unknown, pack: ReceiptPack, hash: string, bytes: number): boolean {
  if (!plain(x) || !asciiId(x.id) || !label(x.build) || typeof x.sourceSha !== 'string' || !/^[a-f0-9]{40}$/.test(x.sourceSha) || x.engine !== pack.engine || x.rules !== pack.rules) return false;
  if (x.scope === 'pack') return exactKeys(x, packKeys) && x.family === pack.family && x.slot === pack.slot && x.sha256 === hash;
  return x.scope === 'mechanic' && exactKeys(x, mechanicKeys) && uint(x.maxPackBytes) && bytes <= x.maxPackBytes;
}

/**
 * Compares a receipt with the pack on disk and its fresh certification. A recorded approval is always
 * checked against this exact content. Missing approval is only an error for a shipping build.
 */
export function receiptIssues(raw: string, pack: ReceiptPack, entries: readonly CertifiedEntry<unknown>[] | null, catalogRevision: number, shipping: boolean): string[] {
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return ['receipt is not JSON']; }
  if (!validReceipt(body)) return ['receipt does not match the receipt format'];
  const r = body, hash = sha(pack.text), bytes = utf8Bytes(pack.text), issues: string[] = [];
  const check = (ok: boolean, what: string) => { if (!ok) issues.push(`receipt ${what} does not match the pack`); };
  const same = (a: unknown, b: unknown) => canonical(a) === canonical(b);
  check(r.family === pack.family, 'family');
  check(r.slot === pack.slot, 'slot');
  check(r.band === pack.band, 'band');
  check(same(r.ordinals, [pack.first, pack.count]), 'ordinals');
  check(r.rules === pack.rules, 'rules');
  check(r.sha256 === hash, 'hash');
  check(r.bytes.raw === bytes, 'byte count');
  // The exact gzip length varies with the zlib build, so only a clearly stale figure is an error.
  const gzip = gzipBytes(pack.text);
  check(Math.abs(r.bytes.gzip - gzip) <= Math.max(64, gzip * 0.05), 'gzip size');
  check(r.machineGates, 'machine gate flag');
  check(r.catalogRevision >= 1 && r.catalogRevision <= catalogRevision, 'catalog revision');
  if (entries) {
    const proven = provenFacts(entries);
    check(same(r.seeds.kept, proven.kept), 'seeds');
    check(same(r.distinct, proven.distinct), 'distinct counts');
    check(same(r.histograms, proven.histograms), 'histograms');
    check(same(r.solve.bounds, proven.bounds), 'solve bounds');
    check(r.solve.exact === proven.exact, 'exact count');
    check(same(r.proofHashes, proven.proofHashes), 'proof hashes');
    check(same(r.bots, proven.bots), 'bot results');
    check(r.speech === proven.speech, 'speech count');
  }
  const { ids, complete, subject } = r.review;
  const expected = { family: pack.family, slot: pack.slot, sha256: hash, engine: pack.engine, rules: pack.rules, kit: r.hashes.kit };
  if ((complete || subject !== null) && !same(subject, expected)) issues.push('receipt review is not bound to this pack');
  if (complete && !ids.length) issues.push('receipt review is complete with no reviewer');
  if (r.native.some(n => !nativeCovers(n, pack, hash, bytes))) issues.push('receipt native QA does not cover this pack');
  const reviewed = complete && ids.length > 0;
  if (shipping && !reviewed) issues.push('has no completed human review');
  if (shipping && !r.native.length) issues.push('has no native QA link');
  if (shipping && !r.allShippingGates) issues.push('receipt is not marked as passing all shipping gates');
  if (r.allShippingGates && (!reviewed || !r.native.length)) issues.push('receipt claims all shipping gates without the evidence');
  return issues;
}
