/**
 * Reserved-slot claims (lead contract change, 15 Nov 2026). `root.json`'s `nextSlot` and `nextOrdinal`
 * stay monotonic high-water marks. A bake may also claim explicit slots below them: each one inside the
 * caller's recorded reservation (`slot-ranges.json`, mirroring the lead's SLOTS.md), never a pack of
 * any family (retired ones included), and absent from every published ref's puzzle catalog and save
 * catalog. A claimed pack's ordinals come from its slot's own block (slot × 1024), so they cannot meet
 * another slot's, and the counters only ever move up to cover it.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { BANK_CAPS, type FamilyManifest } from '../../src/puzzles/bank';
import { asciiId, exactKeys, plain, uint } from '../../src/state/saveBits';
import { publishedFile, publishedJson, publishedRefs } from '../published-refs.mjs';
import type { CatalogDirs } from './pipeline';

export type SlotRange = { first: number; last: number };
export type Reservation = SlotRange & { owner: string };
/** A checked claim: the caller's range, the reservation holding it, and every slot it may not take, with why. */
export type SlotClaim = { range: SlotRange; owner: string; used: ReadonlyMap<number, string> };

export const slotRangesFile = (dirs: CatalogDirs) => join(dirs.content, 'slot-ranges.json');
export const saveCatalogPath = 'src/state/save-catalog.json';
/** Registered catalogs require the caller to identify its owner explicitly. A high-water
 * counter is not permission to allocate inside the reservation it currently points at. */
export function assertSequentialSlot(dirs: CatalogDirs, slot: number): void {
  if (!existsSync(slotRangesFile(dirs))) return; // isolated, unregistered proof catalogs
  const held = reservationFor(readReservations(dirs), { first: slot, last: slot });
  throw new Error(`Slot ${slot} is reserved for ${held.owner}; an explicit owner claim is required.`);
}
/** First ordinal of a slot's own block. A pack holds at most one block's worth of entries. */
export const blockStart = (slot: number) => slot * BANK_CAPS.packEntries;
const inside = (outer: SlotRange, inner: SlotRange) => outer.first <= inner.first && inner.last <= outer.last;
const meets = (a: SlotRange, b: SlotRange) => a.first <= b.last && b.first <= a.last;
const show = (r: SlotRange) => (r.first === r.last ? `${r.first}` : `${r.first}–${r.last}`);

/** Each reservation lies inside the bank caps; any two are disjoint or one holds the other (a slice inside its group). */
export function reservationIssues(x: unknown): string[] {
  if (!plain(x) || !exactKeys(x, ['format', 'source', 'banks']) || x.format !== 1 || typeof x.source !== 'string' || !Array.isArray(x.banks)) return ['Slot ranges file is malformed.'];
  const issues: string[] = [], banks = x.banks as unknown[];
  banks.forEach((b, i) => {
    const keys = plain(b) && 'note' in b ? ['owner', 'first', 'last', 'note'] : ['owner', 'first', 'last'];
    if (!plain(b) || !exactKeys(b, keys) || !asciiId(b.owner, 40) || !uint(b.first, BANK_CAPS.slots - 1) || !uint(b.last, BANK_CAPS.slots - 1) || b.first > b.last || ('note' in b && typeof b.note !== 'string')) issues.push(`Reservation ${i} is malformed.`);
  });
  if (issues.length) return issues;
  const list = banks as Reservation[];
  if (new Set(list.map(r => r.owner)).size !== list.length) issues.push('Reservation owners repeat.');
  for (const [i, a] of list.entries()) for (const b of list.slice(i + 1)) {
    if (meets(a, b) && !inside(a, b) && !inside(b, a)) issues.push(`Reservations ${a.owner} (${show(a)}) and ${b.owner} (${show(b)}) overlap without one holding the other.`);
    else if (a.first === b.first && a.last === b.last) issues.push(`Reservations ${a.owner} and ${b.owner} are the same range.`);
  }
  return issues;
}
export function readReservations(dirs: CatalogDirs): Reservation[] {
  const file = slotRangesFile(dirs);
  if (!existsSync(file)) throw new Error(`No slot register at ${file}, so no slot can be claimed.`);
  const x: unknown = JSON.parse(readFileSync(file, 'utf8')), issues = reservationIssues(x);
  if (issues.length) throw new Error(issues.join(' '));
  return (x as { banks: Reservation[] }).banks.map(({ owner, first, last }) => ({ owner, first, last }));
}
/** `260-279` or a single `263`. */
export function parseRange(text: string): SlotRange {
  const m = /^(\d{1,3})(?:-(\d{1,3}))?$/.exec(text.trim());
  const range = m ? { first: Number(m[1]), last: Number(m[2] ?? m[1]) } : null;
  if (!range || range.first > range.last || range.last >= BANK_CAPS.slots) throw new Error(`Slot range ${text} is not first-last inside 0–${BANK_CAPS.slots - 1}.`);
  return range;
}
/**
 * The innermost reservation holding the whole range. A range that crosses into a reservation it is not
 * wholly inside (another slice's, nested in the same group) is refused, as is one outside them all.
 */
export function reservationFor(reservations: readonly Reservation[], range: SlotRange): Reservation {
  const owner = reservations.filter(r => inside(r, range)).sort((a, b) => (a.last - a.first) - (b.last - b.first))[0];
  if (!owner) throw new Error(`Slot range ${show(range)} is outside every recorded reservation.`);
  const other = reservations.find(r => meets(r, range) && !inside(r, range));
  if (other) throw new Error(`Slot range ${show(range)} ${inside(range, other) ? 'holds' : 'crosses'} ${other.owner}'s reservation ${show(other)}.`);
  return owner;
}
/** Every pack slot outside the recorded reservations. Uniqueness across families is `catalogIssues`'s rule. */
export function slotRangeIssues(reservations: readonly Reservation[], slots: Iterable<{ slot: number; what: string }>): string[] {
  return [...slots].filter(s => !reservations.some(r => r.first <= s.slot && s.slot <= r.last)).map(s => `Slot ${s.slot} (${s.what}) is outside every recorded reservation.`);
}

/** Where the used slots are read: the repository, the published refs, and the save catalog's repository path. */
export type ClaimSources = { cwd?: string; refs?: readonly string[]; saveCatalog?: string };
type Manifests = Iterable<Pick<FamilyManifest, 'family' | 'packs' | 'retired'>>;
const packUses = (manifests: Manifests, where: string, into: Map<number, string>) => {
  for (const m of manifests) for (const p of m.packs) if (!into.has(p[0])) into.set(p[0], `${m.retired.includes(p[0]) ? 'a retired' : 'a'} pack of ${m.family}${where}`);
};
const bankUses = (catalog: unknown, where: string, into: Map<number, string>, inlineOnly = false) => {
  if (!plain(catalog) || !Array.isArray(catalog.banks)) throw new Error(`The save catalog${where} has no bank list.`);
  for (const b of catalog.banks as unknown[]) if (plain(b) && Number.isInteger(b.slot) && (!inlineOnly || 'entries' in b) && !into.has(b.slot as number)) into.set(b.slot as number, `${'entries' in (b as object) ? 'an inline' : 'a packed'} save-catalog bank${where}`);
};
/**
 * Every slot no claim may take: packs in the working catalog, inline banks in the working save catalog,
 * and packs and banks at the tip of every published ref (the refs `save:catalog` and `puzzles verify`
 * read). A working packed bank only mirrors a working pack, and may be stale while a branch re-bakes its
 * own unpublished family in place, so the pack decides. A ref that cannot be read throws, because
 * nothing could then be shown to be unpublished.
 */
export function usedSlots(dirs: CatalogDirs, manifests: Manifests, sources: ClaimSources = {}): Map<number, string> {
  const { cwd = process.cwd(), refs = publishedRefs, saveCatalog = saveCatalogPath } = sources, used = new Map<number, string>();
  packUses(manifests, '', used);
  const saveFile = resolve(cwd, saveCatalog);
  if (existsSync(saveFile)) bankUses(JSON.parse(readFileSync(saveFile, 'utf8')), '', used, true);
  const content = relative(cwd, resolve(cwd, dirs.content));
  for (const { ref, commit, value: root } of publishedJson(`${content}/root.json`, cwd, refs)) {
    const where = ` published at ${ref} (${commit.slice(0, 8)})`, families = plain(root) && Array.isArray(root.families) ? root.families as unknown[] : null;
    if (!families) throw new Error(`The puzzle root${where} has no family list.`);
    packUses(families.map(f => {
      const [id, asset] = Array.isArray(f) ? f : [], text = typeof asset === 'string' ? publishedFile(`${content}/assets/${asset}.lipuzzle`, commit, cwd) : null;
      if (text === null) throw new Error(`Family ${String(id)}${where} has no manifest.`);
      return JSON.parse(text) as FamilyManifest;
    }), where, used);
  }
  for (const { ref, commit, value } of publishedJson(saveCatalog, cwd, refs)) bankUses(value, ` published at ${ref} (${commit.slice(0, 8)})`, used);
  return used;
}
/** Checks the range is the caller's own in the register and records what it may not take. Claims nothing yet. */
export function slotClaim(dirs: CatalogDirs, manifests: Manifests, range: SlotRange, owner: string, sources: ClaimSources = {}): SlotClaim {
  const held = reservationFor(readReservations(dirs), range);
  if (held.owner !== owner) throw new Error(`Slot range ${show(range)} is ${held.owner}'s, not ${owner}'s.`);
  return { range, owner, used: usedSlots(dirs, manifests, sources) };
}
/** One explicit slot: inside the claim's range and taken by nothing, published or not. */
export function assertClaimable(claim: SlotClaim, slot: number): void {
  if (slot < claim.range.first || slot > claim.range.last) throw new Error(`Slot ${slot} is outside the claimed range ${show(claim.range)} (${claim.owner}).`);
  const why = claim.used.get(slot);
  if (why) throw new Error(`Slot ${slot} cannot be claimed: it is ${why}.`);
}
