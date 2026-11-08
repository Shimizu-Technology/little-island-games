import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { BANK_CAPS, assertFamilyAppendOnly, assertRootAppendOnly, emptyRoot, encodePack, manifestAsset, packAsset, parsePack, validFamily, validRoot, type DailyPool, type FamilyManifest, type PackHeader, type PackRow, type RootFamily, type RootIndex } from '../../src/puzzles/bank';
import { certify, isCertified, type CertifiedEntry, type CertifyContext, type Rejection } from '../../src/puzzles/checks';
import { canonical, decodeRow } from '../../src/puzzles/descriptor';
import { semanticHash } from '../../src/puzzles/semantic';
import type { AnyAdapter, BandQuota, FamilySpec } from '../../src/puzzles/types';
import { utf8Bytes } from '../../src/state/saveBits';
import { verifyByteModel, type FamilyActual } from './byte-model';

export type CatalogDirs = { content: string; receipts: string };
export const productionDirs: CatalogDirs = { content: 'src/content/puzzles', receipts: 'content/puzzles/receipts' };
const sha = (text: string | Uint8Array) => createHash('sha256').update(text).digest('hex');
const assetFile = (dirs: CatalogDirs, asset: string) => join(dirs.content, 'assets', `${asset}.lipuzzle`);
const rootFile = (dirs: CatalogDirs) => join(dirs.content, 'root.json');

export function readCatalog(dirs: CatalogDirs): { root: RootIndex; families: Map<string, FamilyManifest> } {
  const root: unknown = existsSync(rootFile(dirs)) ? JSON.parse(readFileSync(rootFile(dirs), 'utf8')) : emptyRoot();
  if (!validRoot(root)) throw new Error('The committed puzzle root index is invalid.');
  const families = new Map<string, FamilyManifest>();
  for (const [id, asset] of root.families) {
    const manifest: unknown = JSON.parse(readFileSync(assetFile(dirs, asset), 'utf8'));
    if (!validFamily(manifest)) throw new Error(`Manifest for ${id} is invalid.`);
    families.set(id, manifest);
  }
  return { root, families };
}
export const readPackText = (dirs: CatalogDirs, slot: number) => readFileSync(assetFile(dirs, packAsset(slot)), 'utf8');

/** No layout type twice in a row. Picks the most plentiful layout that differs from the last one. */
export function orderLayouts<P>(entries: readonly CertifiedEntry<P>[]): { ordered: CertifiedEntry<P>[]; dropped: CertifiedEntry<P>[] } {
  const queues = new Map<string, CertifiedEntry<P>[]>();
  for (const e of entries) queues.set(e.core.layout, [...(queues.get(e.core.layout) ?? []), e]);
  const ordered: CertifiedEntry<P>[] = [];
  let last = '';
  for (;;) {
    let pick = '', size = 0;
    for (const [layout, queue] of queues) if (layout !== last && queue.length > size) { pick = layout; size = queue.length; }
    if (!size) break;
    ordered.push(queues.get(pick)!.shift()!);
    last = pick;
  }
  return { ordered, dropped: [...queues.values()].flat() };
}
/** Keeps every template family at or under its share of what actually ships in the band. */
export function capTemplates<P>(entries: readonly CertifiedEntry<P>[], share: number = BANK_CAPS.templateShare): { kept: CertifiedEntry<P>[]; dropped: CertifiedEntry<P>[] } {
  let kept = [...entries];
  const dropped: CertifiedEntry<P>[] = [];
  for (;;) {
    const cap = Math.max(1, Math.floor(kept.length * share)), seen = new Map<string, number>(), next: CertifiedEntry<P>[] = [];
    let removed = false;
    for (const e of kept) {
      const count = (seen.get(e.core.template) ?? 0) + 1;
      seen.set(e.core.template, count);
      if (count > cap) { dropped.push(e); removed = true; } else next.push(e);
    }
    kept = next;
    if (!removed || !kept.length) return { kept, dropped };
  }
}
/** Packs are cut by entry count and bytes. Each row keeps its place in the no-repeat sequence. */
export function splitPacks<P>(entries: readonly CertifiedEntry<P>[], headerBytes: number): CertifiedEntry<P>[][] {
  const packs: CertifiedEntry<P>[][] = [];
  let current: CertifiedEntry<P>[] = [], bytes = headerBytes;
  for (const entry of entries) {
    if (!isCertified(entry)) throw new Error('Only certified entries can enter a pack.');
    const rowBytes = utf8Bytes(entry.row) + 1;
    if (headerBytes + rowBytes > BANK_CAPS.packBytes) throw new Error('One puzzle row is larger than a pack.');
    if (current.length >= BANK_CAPS.packEntries || bytes + rowBytes > BANK_CAPS.packBytes) { packs.push(current); current = []; bytes = headerBytes; }
    current.push(entry);
    bytes += rowBytes;
  }
  if (current.length) packs.push(current);
  return packs;
}
const histogram = (values: readonly (string | null)[]) => {
  const out: Record<string, number> = {};
  for (const v of values) if (v !== null) out[v] = (out[v] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : 1)));
};
const aggregate = (values: readonly (string | null)[]) => sha(values.filter(v => v !== null).join());

export type BakeOptions = {
  dirs: CatalogDirs;
  seedBase?: number;
  maxAttempts?: number;
  deadlineMs?: number;
  budget?: number;
  sourceSha?: string;
  now?: () => number;
  /** Failure injection for tests: throws after staging, before the catalog commits. */
  beforeCommit?: () => void;
};
export type BakeReport = {
  family: string;
  status: 'complete' | 'exhausted';
  published: boolean;
  reason: string | null;
  accepted: Record<string, number>;
  attempts: number;
  rejects: Record<string, number>;
  slots: number[];
};
const rejectKey = (reason: Rejection | 'construction' | 'template-cap' | 'layout-repeat') => reason;

/** One bake. Below any band's floor nothing changes; there is no path that writes an uncertified row. */
export function bakeFamily<P>(spec: FamilySpec<P>, options: BakeOptions): BakeReport {
  const { dirs, seedBase = 1, maxAttempts = 200_000, deadlineMs = 6 * 3600_000, budget = 200_000, sourceSha = 'unknown', now = Date.now } = options;
  const { root, families } = readCatalog(dirs);
  const previous = families.get(spec.id) ?? null;
  const ctx: CertifyContext = { budget, seenExact: new Set(), seenSemantic: new Set() };
  const have: Record<string, number> = Object.fromEntries(spec.bands.map(b => [b.id, 0]));
  for (const row of previous?.packs ?? []) {
    const manifestBand = previous!.bands[row[5]];
    const parsed = parsePack(readPackText(dirs, row[0]), row, previous!);
    if (!parsed) throw new Error(`Existing pack ${row[0]} is malformed.`);
    have[manifestBand] = (have[manifestBand] ?? 0) + parsed.rows.length;
    for (const line of parsed.rows) {
      const core = decodeRow<P>(line, parsed.header.band, spec.adapter);
      if (!core) throw new Error(`Existing row in pack ${row[0]} no longer decodes.`);
      ctx.seenExact.add(sha(`exact|${canonical(core)}`));
      ctx.seenSemantic.add(semanticHash(spec.adapter.semanticKey(core)));
    }
  }
  const started = now(), rejects: Record<string, number> = {}, accepted: Record<string, CertifiedEntry<P>[]> = {};
  const reject = (key: string, n = 1) => { rejects[key] = (rejects[key] ?? 0) + n; };
  let attempts = 0, budgetHits = 0, timedOut = false;
  spec.bands.forEach((band: BandQuota, bandIndex) => {
    const entries: CertifiedEntry<P>[] = [], need = Math.max(0, band.target - have[band.id]);
    const cap = Math.max(1, Math.floor(band.target * BANK_CAPS.templateShare)), perTemplate = new Map<string, number>();
    // The band is full only once the trimmed, ordered result reaches its quota, not when raw accepts do.
    const finish = () => {
      // Lay out first: later varied entries must be able to rescue an early run of one layout.
      const capped = capTemplates(entries), spread = orderLayouts(capped.kept), pool = capTemplates(spread.ordered.slice(0, need));
      return { laid: orderLayouts(pool.kept), templates: capped.dropped.length + pool.dropped.length };
    };
    let done = need === 0 ? { laid: { ordered: [] as CertifiedEntry<P>[], dropped: [] as CertifiedEntry<P>[] }, templates: 0 } : finish();
    for (let i = 0; i < maxAttempts && done.laid.ordered.length < need; i++) {
      if (now() - started > deadlineMs) { timedOut = true; break; }
      attempts++;
      const seed = (seedBase + bandIndex * 0x1000000 + i) % 0x100000000;
      const core = spec.generate(seed, band);
      if (!core) { reject(rejectKey('construction')); continue; }
      if ((perTemplate.get(core.template) ?? 0) >= cap) { reject(rejectKey('template-cap')); continue; }
      const result = certify(spec, band, core, ctx);
      if (!result.ok) { reject(result.reason); if (result.reason === 'solver-budget' || result.reason === 'count-budget') budgetHits++; continue; }
      perTemplate.set(core.template, (perTemplate.get(core.template) ?? 0) + 1);
      entries.push(result.entry);
      if (entries.length >= need) done = finish();
    }
    // An exhausted band still ships whatever it certified, as long as it clears its floor.
    if (need > 0) done = finish();
    reject(rejectKey('template-cap'), done.templates);
    reject(rejectKey('layout-repeat'), done.laid.dropped.length);
    const laid = done.laid;
    accepted[band.id] = laid.ordered;
  });
  const counts = Object.fromEntries(spec.bands.map(b => [b.id, have[b.id] + accepted[b.id].length]));
  const complete = spec.bands.every(b => counts[b.id] >= b.target);
  const short = spec.bands.filter(b => counts[b.id] < b.floor);
  const report = (published: boolean, reason: string | null, slots: number[] = []): BakeReport => ({ family: spec.id, status: complete ? 'complete' : 'exhausted', published, reason, accepted: counts, attempts, rejects, slots });
  const attemptReceipt = { format: 1, family: spec.id, seedBase, attempts, rejects, budget, budgetHits, timedOut, counts, sourceSha, status: complete ? 'complete' : 'exhausted' };
  mkdirSync(join(dirs.receipts, spec.id), { recursive: true });
  writeFileSync(join(dirs.receipts, spec.id, `attempt-${seedBase}-${attempts}.json`), `${JSON.stringify(attemptReceipt, null, 1)}\n`);
  if (short.length) return report(false, `Below floor: ${short.map(b => `${b.id} ${counts[b.id]}/${b.floor}`).join(', ')}.`);
  if (!spec.bands.some(b => accepted[b.id].length)) return report(false, complete ? 'Already at target.' : 'Nothing new was accepted.');
  const slots = publish(spec, dirs, root, previous, accepted, { sourceSha, seedBase, attempts, rejects, budget, budgetHits, timedOut }, options.beforeCommit);
  return report(true, null, slots);
}

type BakeFacts = { sourceSha: string; seedBase: number; attempts: number; rejects: Record<string, number>; budget: number; budgetHits: number; timedOut: boolean };
const kitSources = ['src/puzzles/checks.ts', 'src/puzzles/descriptor.ts', 'src/puzzles/rng.ts', 'src/puzzles/bank.ts', 'src/puzzles/bots.ts', 'src/puzzles/attempt.ts'];
const hashFiles = (files: readonly string[]) => {
  const h = createHash('sha256');
  for (const file of files) if (existsSync(file)) h.update(file).update(readFileSync(file));
  return h.digest('hex');
};
function publish<P>(spec: FamilySpec<P>, dirs: CatalogDirs, root: RootIndex, previous: FamilyManifest | null, accepted: Record<string, CertifiedEntry<P>[]>, facts: BakeFacts, beforeCommit?: () => void): number[] {
  const staging = join(dirs.content, `.staging-${process.pid}`);
  const bands = previous?.bands ?? spec.bands.map(b => b.id);
  let nextSlot = root.nextSlot, nextOrdinal = root.nextOrdinal;
  const newRows: PackRow[] = [], staged: { asset: string; text: string }[] = [], receipts: { slot: number; body: string }[] = [], newRanges = new Map<string, [number, number][]>();
  const speech = new Set<string>();
  for (const band of spec.bands) {
    const entries = accepted[band.id];
    const headerBytes = utf8Bytes(JSON.stringify({ format: 1, family: spec.id, slot: 511, first: 2147483647, count: 1024, band: band.id, rules: spec.adapter.rules, rng: 1 } satisfies PackHeader));
    for (const group of splitPacks(entries, headerBytes)) {
      const slot = nextSlot++;
      if (slot >= BANK_CAPS.slots) throw new Error('The catalog has no bank slots left.');
      const first = nextOrdinal;
      nextOrdinal += group.length;
      const text = encodePack({ format: 1, family: spec.id, slot, first, count: group.length, band: band.id, rules: spec.adapter.rules, rng: 1 }, group.map(e => e.row));
      const bytes = utf8Bytes(text), hash = sha(text);
      if (bytes > BANK_CAPS.packBytes) throw new Error(`Pack ${slot} is over the byte cap.`);
      staged.push({ asset: packAsset(slot), text });
      newRows.push([slot, first, group.length, bytes, hash, bands.indexOf(band.id), spec.adapter.rules, 1]);
      const ranges = newRanges.get(band.id) ?? [];
      ranges.push([first, group.length]);
      newRanges.set(band.id, ranges);
      group.forEach(e => { if (e.core.speech) speech.add(e.core.speech.template); });
      const solves = group.map(e => e.solve);
      receipts.push({ slot, body: `${JSON.stringify({
        format: 1, family: spec.id, slot, catalogRevision: root.revision + 1, band: band.id, ordinals: [first, group.length], sourceSha: facts.sourceSha,
        hashes: { kit: hashFiles(kitSources), family: hashFiles(spec.sources) }, rng: 1, rules: spec.adapter.rules,
        seeds: { base: facts.seedBase, attempts: facts.attempts, kept: group.map(e => e.core.seed) }, rejects: facts.rejects,
        distinct: { exact: new Set(group.map(e => e.exactHash)).size, semantic: new Set(group.map(e => e.semanticHash)).size },
        histograms: { technique: histogram(group.map(e => e.technique)), template: histogram(group.map(e => e.core.template)), layout: histogram(group.map(e => e.core.layout)) },
        solve: { status: 'solved', budget: facts.budget, budgetExhausted: facts.budgetHits, timedOut: facts.timedOut, bounds: [Math.min(...solves.map(s => s.lower)), Math.max(...solves.map(s => s.upper))], exact: solves.filter(s => s.exact).length },
        proofHashes: { witness: aggregate(group.map(e => e.witnessHash)), trace: aggregate(group.map(e => e.traceHash)), claims: aggregate(group.map(e => e.claimsHash)) },
        bots: group.reduce<Record<string, number>>((all, e) => { for (const b of e.bots) if (b.ran) all[b.id] = (all[b.id] ?? 0) + (b.beat ? 1 : 0); return all; }, {}),
        provenance: spec.provenance, review: spec.review, speech: group.flatMap(e => (e.core.speech ? [e.core.speech.template] : [])).length,
        bytes: { raw: bytes, gzip: gzipSync(text).length }, sha256: hash, native: [], machineGates: true, allShippingGates: false,
      }, null, 1)}\n` });
    }
  }
  const daily: DailyPool[] = previous?.daily.length ? previous.daily : [{ version: 1, bands: spec.bands.map(b => [b.id, newRanges.get(b.id) ?? []] as [string, [number, number][]]).filter(([, r]) => r.length) }];
  const manifest: FamilyManifest = { format: 1, family: spec.id, engine: spec.adapter.engine, bands, packs: [...(previous?.packs ?? []), ...newRows], retired: previous?.retired ?? [], daily,
    speech: { count: speech.size, hash: speech.size ? sha([...speech].sort().join()) : null } };
  const manifestText = JSON.stringify(manifest);
  if (!validFamily(manifest)) throw new Error('The new family manifest is invalid.');
  if (previous) assertFamilyAppendOnly(previous, manifest);
  if (utf8Bytes(manifestText) > BANK_CAPS.familyBytes) throw new Error(`Manifest for ${spec.id} is over ${BANK_CAPS.familyBytes} bytes.`);
  const manifestSha = sha(manifestText), asset = manifestAsset(spec.id, manifestSha);
  staged.push({ asset, text: manifestText });
  const entries = manifest.packs.reduce((n, p) => n + p[2], 0), bytes = manifest.packs.reduce((n, p) => n + p[3], 0) + utf8Bytes(manifestText);
  const row: RootFamily = [spec.id, asset, manifestSha, entries, manifest.packs.length, bytes];
  const nextRoot: RootIndex = { format: 1, revision: root.revision + 1, nextSlot, nextOrdinal, families: [...root.families.filter(f => f[0] !== spec.id), row].sort((a, b) => (a[0] < b[0] ? -1 : 1)) };
  const rootText = `${JSON.stringify(nextRoot)}\n`;
  assertRootAppendOnly(root, nextRoot);
  if (!validRoot(nextRoot)) throw new Error('The new root index is invalid.');
  if (utf8Bytes(rootText) > BANK_CAPS.rootBytes) throw new Error(`Root index is over ${BANK_CAPS.rootBytes} bytes.`);
  if (nextRoot.families.reduce((n, f) => n + f[5], 0) > BANK_CAPS.catalogBytes) throw new Error('The catalog is over its 28 MiB cap.');
  for (const { slot, body } of receipts) {
    const path = join(dirs.receipts, spec.id, `slot-${String(slot).padStart(4, '0')}.json`);
    if (existsSync(path) && readFileSync(path, 'utf8') !== body) throw new Error(`Receipt for slot ${slot} already exists and is immutable.`);
  }
  try {
    mkdirSync(join(staging, 'assets'), { recursive: true });
    mkdirSync(join(dirs.content, 'assets'), { recursive: true });
    for (const { asset: name, text } of staged) writeFileSync(join(staging, 'assets', `${name}.lipuzzle`), text);
    writeFileSync(join(staging, 'assets.generated.ts'), generatedAssets(nextRoot, families(dirs, root, spec.id, manifest)));
    writeFileSync(join(staging, 'root.json'), rootText);
    beforeCommit?.();
    for (const { asset: name } of staged) renameSync(join(staging, 'assets', `${name}.lipuzzle`), assetFile(dirs, name));
    renameSync(join(staging, 'assets.generated.ts'), join(dirs.content, 'assets.generated.ts'));
    // The root index is the single commit point. Before this rename the old catalog is still whole.
    renameSync(join(staging, 'root.json'), rootFile(dirs));
    for (const { slot, body } of receipts) writeFileSync(join(dirs.receipts, spec.id, `slot-${String(slot).padStart(4, '0')}.json`), body);
    sweepOrphans(dirs);
    return newRows.map(p => p[0]);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}
function families(dirs: CatalogDirs, root: RootIndex, id: string, manifest: FamilyManifest) {
  const map = new Map<string, FamilyManifest>();
  for (const [family, asset] of root.families) if (family !== id) map.set(family, JSON.parse(readFileSync(assetFile(dirs, asset), 'utf8')) as FamilyManifest);
  map.set(id, manifest);
  return map;
}
export function generatedAssets(root: RootIndex, manifests: ReadonlyMap<string, FamilyManifest>): string {
  const names = [...root.families.map(f => f[1]), ...[...manifests.values()].flatMap(m => m.packs.map(p => packAsset(p[0])))].sort();
  const lines = names.map(name => `  ${JSON.stringify(name)}: () => require(${JSON.stringify(`./assets/${name}.lipuzzle`)}),`);
  return `// Generated by scripts/puzzles. Do not edit.\n${lines.length ? '/* eslint-disable */\n' : ''}export const puzzleAssets: Record<string, () => number> = {${lines.length ? `\n${lines.join('\n')}\n` : ''}};\n`;
}
/** Removes files a failed earlier run left behind. Anything the root index reaches is never touched. */
export function sweepOrphans(dirs: CatalogDirs): string[] {
  const { root, families: manifests } = readCatalog(dirs), dir = join(dirs.content, 'assets');
  if (!existsSync(dir)) return [];
  const live = new Set([...root.families.map(f => f[1]), ...[...manifests.values()].flatMap(m => m.packs.map(p => packAsset(p[0])))]);
  const orphans = readdirSync(dir).filter(f => f.endsWith('.lipuzzle') && !live.has(f.replace(/\.lipuzzle$/, '')));
  for (const f of orphans) rmSync(join(dir, f));
  return orphans;
}
export type VerifyStats = { families: number; packs: number; entries: number; catalogBytes: number; rootBytes: number; largestFamilyBytes: number; replayed: number; botRuns: number };
export type VerifyResult = { errors: string[]; stats: VerifyStats };
/** Re-proves every shipped row through its real engine. Hashes alone would only prove the file is unchanged. */
export function verifyCatalog(dirs: CatalogDirs, specs: readonly FamilySpec<unknown>[], options: { shipping?: boolean; budget?: number; byteModel?: boolean } = {}): VerifyResult {
  const errors: string[] = [], { root, families: manifests } = readCatalog(dirs);
  const stats: VerifyStats = { families: root.families.length, packs: 0, entries: 0, catalogBytes: 0, rootBytes: utf8Bytes(readFileSync(rootFile(dirs), 'utf8')), largestFamilyBytes: 0, replayed: 0, botRuns: 0 };
  if (stats.rootBytes > BANK_CAPS.rootBytes) errors.push(`Root index is ${stats.rootBytes} bytes.`);
  const slots = new Set<number>();
  for (const [id, asset, hash, entries, packCount, familyBytes] of root.families) {
    const manifest = manifests.get(id)!, text = readFileSync(assetFile(dirs, asset), 'utf8'), spec = specs.find(s => s.id === id);
    if (sha(text) !== hash) errors.push(`${id}: manifest hash mismatch.`);
    stats.largestFamilyBytes = Math.max(stats.largestFamilyBytes, utf8Bytes(text));
    if (utf8Bytes(text) > BANK_CAPS.familyBytes) errors.push(`${id}: manifest over limit.`);
    if (!spec) { errors.push(`${id}: published without a registered family spec.`); continue; }
    if (manifest.engine !== spec.adapter.engine) errors.push(`${id}: engine mismatch.`);
    const ctx: CertifyContext = { budget: options.budget ?? 200_000, seenExact: new Set(), seenSemantic: new Set() };
    let total = 0, bytes = utf8Bytes(text);
    const templates = new Map<string, Map<string, number>>();
    for (const row of manifest.packs) {
      const [slot, , count, packBytes, packHash, bandIndex, rules] = row;
      if (slots.has(slot)) errors.push(`Slot ${slot} is used twice.`);
      slots.add(slot);
      const file = assetFile(dirs, packAsset(slot));
      if (!existsSync(file)) { errors.push(`${id}: pack ${slot} is missing.`); continue; }
      const packText = readFileSync(file, 'utf8');
      if (sha(packText) !== packHash || utf8Bytes(packText) !== packBytes) errors.push(`${id}: pack ${slot} hash or length mismatch.`);
      if (packBytes > BANK_CAPS.packBytes || count > BANK_CAPS.packEntries) errors.push(`${id}: pack ${slot} over caps.`);
      const parsed = parsePack(packText, row, manifest);
      if (!parsed) { errors.push(`${id}: pack ${slot} malformed.`); continue; }
      if (rules !== spec.adapter.rules) errors.push(`${id}: pack ${slot} uses rules ${rules}, not ${spec.adapter.rules}.`);
      const bandId = manifest.bands[bandIndex], band = spec.bands.find(b => b.id === bandId);
      if (!band) { errors.push(`${id}: pack ${slot} is in unknown band ${bandId}.`); continue; }
      let last = '';
      for (const line of parsed.rows) {
        const core = decodeRow<unknown>(line, bandId, spec.adapter);
        if (!core) { errors.push(`${id}: pack ${slot} has an undecodable row.`); continue; }
        if (core.layout === last) errors.push(`${id}: pack ${slot} repeats layout ${last}.`);
        last = core.layout;
        const result = certify(spec, band, core, ctx);
        if (!result.ok) errors.push(`${id}: pack ${slot} seed ${core.seed} failed ${result.reason}.`);
        else {
          stats.replayed++;
          stats.botRuns += result.entry.bots.filter(b => b.ran).length;
          if (result.entry.row !== line) errors.push(`${id}: pack ${slot} row is not canonical.`);
          const perBand = templates.get(bandId) ?? new Map<string, number>();
          perBand.set(core.template, (perBand.get(core.template) ?? 0) + 1);
          templates.set(bandId, perBand);
        }
      }
      total += count;
      bytes += packBytes;
      stats.packs++;
      const receipt = join(dirs.receipts, id, `slot-${String(slot).padStart(4, '0')}.json`);
      if (!existsSync(receipt)) errors.push(`${id}: pack ${slot} has no receipt.`);
      else if (options.shipping) {
        const body = JSON.parse(readFileSync(receipt, 'utf8')) as { review?: { complete?: boolean; ids?: string[] }; native?: unknown[] };
        if (!body.review?.complete || !body.review.ids?.length) errors.push(`${id}: pack ${slot} has no completed human review.`);
        if (!body.native?.length) errors.push(`${id}: pack ${slot} has no native QA link.`);
      }
    }
    for (const [band, counts] of templates) {
      const size = [...counts.values()].reduce((a, b) => a + b, 0), cap = Math.max(1, Math.floor(size * BANK_CAPS.templateShare));
      for (const [template, n] of counts) if (n > cap) errors.push(`${id}: template ${template} is ${n}/${size} of ${band}.`);
    }
    if (total !== entries || manifest.packs.length !== packCount || bytes !== familyBytes) errors.push(`${id}: root totals disagree with its manifest.`);
    if (options.byteModel !== false) errors.push(...verifyByteModel([familyActual(dirs, manifest)]));
    stats.entries += total;
    stats.catalogBytes += bytes;
  }
  if (stats.catalogBytes > BANK_CAPS.catalogBytes) errors.push(`Catalog is ${stats.catalogBytes} bytes.`);
  if (slots.size > BANK_CAPS.slots) errors.push(`${slots.size} slots are in use.`);
  if (existsSync(join(dirs.content, 'assets.generated.ts')) && readFileSync(join(dirs.content, 'assets.generated.ts'), 'utf8') !== generatedAssets(root, manifests)) errors.push('assets.generated.ts is stale.');
  const orphanDir = join(dirs.content, 'assets');
  if (existsSync(orphanDir)) {
    const live = new Set([...root.families.map(f => f[1]), ...[...manifests.values()].flatMap(m => m.packs.map(p => packAsset(p[0])))]);
    for (const f of readdirSync(orphanDir)) if (!live.has(f.replace(/\.lipuzzle$/, ''))) errors.push(`Unreferenced asset ${f}.`);
  }
  return { errors, stats };
}
/** Row bytes only, without pack headers or line breaks, because that is what the model budgets. */
export function familyActual(dirs: CatalogDirs, manifest: FamilyManifest): FamilyActual {
  let entries = 0, rowBytes = 0;
  for (const row of manifest.packs) {
    const parsed = parsePack(readPackText(dirs, row[0]), row, manifest);
    if (!parsed) throw new Error(`Pack ${row[0]} is malformed.`);
    entries += parsed.rows.length;
    rowBytes += parsed.rows.reduce((n, line) => n + utf8Bytes(line), 0);
  }
  return { family: manifest.family, entries, rowBytes };
}
/** F2 consumes this shape for the save catalog. Its size at full scale is reported by the scale harness. */
export function saveCatalogBanks(dirs: CatalogDirs, adapters: ReadonlyMap<string, AnyAdapter>) {
  const { families: manifests } = readCatalog(dirs);
  return [...manifests.values()].flatMap(m => m.packs.map(row => {
    if (!adapters.has(m.family)) throw new Error(`No adapter for ${m.family}.`);
    const parsed = parsePack(readPackText(dirs, row[0]), row, m)!;
    return { slot: row[0], engine: m.engine, rules: row[6], entries: parsed.rows.map((line, i) => ({ ordinal: row[1] + i, hash: sha(line) })) };
  }));
}
