import { asciiId, exactKeys, hashId, plain, uint } from '../state/saveBits';

export const BANK_CAPS = {
  slots: 512, packEntries: 1024, packBytes: 131_072, rootBytes: 16_384, familyBytes: 16_384,
  catalogBytes: 29_360_128, /* 28 MiB, compatibility banks included */ decodedBytes: 4_194_304, decodedPacks: 2, templateShare: 0.25,
} as const;

/** [slot, first ordinal, entries, bytes, sha256, band index, rules, rng] */
export type PackRow = [number, number, number, number, string, number, number, number];
export type DailyRange = [first: number, count: number];
export type DailyPool = { version: number; bands: [band: string, ranges: DailyRange[]][] };
export type FamilyManifest = { format: 1; family: string; engine: string; bands: string[]; packs: PackRow[]; retired: number[]; daily: DailyPool[]; speech: { count: number; hash: string | null } };
/** [family id, manifest asset, sha256, entries, packs, bytes including manifest] */
export type RootFamily = [string, string, string, number, number, number];
export type RootIndex = { format: 1; revision: number; nextSlot: number; nextOrdinal: number; families: RootFamily[] };
export type PackHeader = { format: 1; family: string; slot: number; first: number; count: number; band: string; rules: number; rng: number };

export const packAsset = (slot: number) => `p${slot}`;
export const manifestAsset = (family: string, sha: string) => `f-${family}-${sha.slice(0, 12)}`;
export const emptyRoot = (): RootIndex => ({ format: 1, revision: 0, nextSlot: 0, nextOrdinal: 0, families: [] });

const positive = (x: unknown, max = 0xffffffff) => uint(x, max) && x > 0;
function validRanges(x: unknown): x is DailyRange[] {
  if (!Array.isArray(x)) return false;
  let end = 0;
  // Sorted and disjoint: the pool's order is part of what Today's hash selects from.
  return x.every(r => Array.isArray(r) && r.length === 2 && uint(r[0]) && positive(r[1], BANK_CAPS.packEntries * BANK_CAPS.slots) && r[0] >= end && ((end = r[0] + r[1]), true));
}
export function validFamily(x: unknown): x is FamilyManifest {
  if (!plain(x) || !exactKeys(x, ['format', 'family', 'engine', 'bands', 'packs', 'retired', 'daily', 'speech']) || x.format !== 1 || !asciiId(x.family) || !asciiId(x.engine)) return false;
  if (!Array.isArray(x.bands) || !x.bands.length || !x.bands.every(b => asciiId(b, 24)) || new Set(x.bands).size !== x.bands.length) return false;
  let slot = -1, ordinal = 0;
  if (!Array.isArray(x.packs) || !x.packs.every(p => {
    if (!Array.isArray(p) || p.length !== 8) return false;
    const [s, first, count, bytes, sha, band, rules, rng] = p;
    const ok = uint(s, BANK_CAPS.slots - 1) && s > slot && uint(first) && first >= ordinal && positive(count, BANK_CAPS.packEntries) && positive(bytes, BANK_CAPS.packBytes)
      && hashId(sha) && uint(band, (x.bands as string[]).length - 1) && positive(rules, 65535) && rng === 1;
    if (ok) { slot = s; ordinal = first + count; }
    return ok;
  })) return false;
  const slots = new Set((x.packs as PackRow[]).map(p => p[0]));
  if (!Array.isArray(x.retired) || !x.retired.every(r => slots.has(r)) || new Set(x.retired).size !== x.retired.length) return false;
  const speech = x.speech;
  if (!plain(speech) || !exactKeys(speech, ['count', 'hash']) || !uint(speech.count) || !(speech.hash === null ? speech.count === 0 : hashId(speech.hash))) return false;
  return Array.isArray(x.daily) && new Set(x.daily.map(d => d?.version)).size === x.daily.length && x.daily.every(d => plain(d) && exactKeys(d, ['version', 'bands']) && positive(d.version, 65535)
    && Array.isArray(d.bands) && d.bands.every(b => Array.isArray(b) && b.length === 2 && (x.bands as string[]).includes(b[0]) && validRanges(b[1])));
}
export function validRoot(x: unknown): x is RootIndex {
  if (!plain(x) || !exactKeys(x, ['format', 'revision', 'nextSlot', 'nextOrdinal', 'families']) || x.format !== 1 || !uint(x.revision) || !uint(x.nextSlot, BANK_CAPS.slots) || !uint(x.nextOrdinal)) return false;
  if (!Array.isArray(x.families) || new Set(x.families.map(f => f?.[0])).size !== x.families.length) return false;
  return x.families.every(f => Array.isArray(f) && f.length === 6 && asciiId(f[0]) && typeof f[1] === 'string' && f[1] === manifestAsset(f[0], String(f[2])) && hashId(f[2]) && uint(f[3]) && uint(f[4], BANK_CAPS.slots) && uint(f[5], BANK_CAPS.catalogBytes));
}

/** Header line, then one self-contained JSON tuple per line, so a row decodes only when it is opened. */
export const encodePack = (header: PackHeader, rows: readonly string[]) => [JSON.stringify(header), ...rows].join('\n');
export type ParsedPack = { header: PackHeader; rows: string[] };
export function parsePack(text: string, row: PackRow, manifest: Pick<FamilyManifest, 'family' | 'bands'>): ParsedPack | null {
  const lines = text.split('\n');
  let header: unknown;
  try { header = JSON.parse(lines[0]); } catch { return null; }
  if (!plain(header) || !exactKeys(header, ['format', 'family', 'slot', 'first', 'count', 'band', 'rules', 'rng'])) return null;
  const [slot, first, count, , , band, rules, rng] = row;
  if (header.format !== 1 || header.family !== manifest.family || header.slot !== slot || header.first !== first || header.count !== count
    || header.band !== manifest.bands[band] || header.rules !== rules || header.rng !== rng || lines.length !== count + 1) return null;
  lines.shift();
  return { header: header as PackHeader, rows: lines };
}
export function locate(manifest: Pick<FamilyManifest, 'packs'>, ordinal: number): { row: PackRow; index: number } | null {
  let low = 0, high = manifest.packs.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1, row = manifest.packs[mid];
    if (ordinal < row[1]) high = mid - 1;
    else if (ordinal >= row[1] + row[2]) low = mid + 1;
    else return { row, index: ordinal - row[1] };
  }
  return null;
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
/** Saved refs depend on this: an existing slot never changes, and a daily pool never reshuffles. */
export function assertFamilyAppendOnly(previous: FamilyManifest, next: FamilyManifest): void {
  if (previous.family !== next.family || previous.engine !== next.engine) throw new Error(`Family identity changed: ${previous.family}.`);
  if (!same(next.bands.slice(0, previous.bands.length), previous.bands)) throw new Error(`Bands were reordered in ${previous.family}.`);
  for (const old of previous.packs) if (!same(next.packs.find(p => p[0] === old[0]), old)) throw new Error(`Immutable pack slot ${old[0]} changed.`);
  for (const slot of previous.retired) if (!next.retired.includes(slot)) throw new Error(`Retired slot ${slot} was revived.`);
  for (const pool of previous.daily) if (!same(next.daily.find(d => d.version === pool.version), pool)) throw new Error(`Daily pool ${pool.version} changed in ${previous.family}.`);
}
export function assertRootAppendOnly(previous: RootIndex, next: RootIndex): void {
  if (next.nextSlot < previous.nextSlot || next.nextOrdinal < previous.nextOrdinal || next.revision < previous.revision) throw new Error('Catalog counters moved backward.');
  for (const old of previous.families) {
    const current = next.families.find(f => f[0] === old[0]);
    if (!current || current[3] < old[3] || current[4] < old[4]) throw new Error(`Family ${old[0]} lost published entries.`);
  }
}
