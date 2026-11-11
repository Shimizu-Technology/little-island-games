import { bankSize, packedBank } from './bankFacts';
import { challengeLimit, dareBits, saveCatalog, type SaveCatalog } from './challenge';
import { arcadeIds } from '../arcade/types';
import { asciiId, exactKeys, hashId, jsonBytes, pack, plain, uint, unpack } from './saveBits';

/** What one owner lost from the active save. The caller preserves the original bytes, which still hold all of it. */
export type SetAside = { owner: string; games: string[]; marks: number };
export type SetAsideResult = { raw: string; setAside: SetAside[] };
type Row = Record<string, unknown>;

/**
 * A save can name puzzle content this build doesn't have: a dev or TestFlight build with other banks,
 * a rolled-back build, or a bank whose size changed. Launch must still reach the app, so before validation
 * the paused rounds and marks rows that point at unresolvable content are taken out of a copy.
 * Only well-formed entries are taken out. A person whose progress is damaged in any other way is left
 * exactly as stored, so validation rejects it and the save goes through preserve-and-recover.
 * Everything else, including every other learner, is untouched. Never call this on bytes you then discard:
 * the original must be preserved, because it is the only remaining copy of what was set aside.
 */
export function setAsideUnresolved(raw: string, catalog: SaveCatalog = saveCatalog): SetAsideResult {
  let v: unknown;
  try { v = JSON.parse(raw); } catch { return { raw, setAside: [] }; }
  if (!plain(v) || v.version !== 3 || !plain(v.profiles) || !plain(v.profiles.people)) return { raw, setAside: [] };
  const setAside: SetAside[] = [];
  const groups: [Row, boolean][] = [[v.profiles.people, false]];
  if (plain(v.cove) && plain(v.cove.people)) groups.push([v.cove.people, true]);
  for (const [people, cove] of groups) for (const [owner, person] of Object.entries(people)) {
    if (!plain(person) || !plain(person.challenge) || !wellFormedProgress(person.challenge, owner, cove)) continue;
    const result = resolveProgress(person.challenge, cove, catalog);
    if (!result) continue;
    people[owner] = { ...person, challenge: result.progress };
    setAside.push({ owner, games: result.games, marks: result.marks });
  }
  return setAside.length ? { raw: JSON.stringify(v), setAside } : { raw, setAside };
}

const realTimeArcade = new Set<string>(arcadeIds.filter(id => id !== 'reef-builder'));
const tuples = (v: unknown, max: number, size: number): v is unknown[][] => Array.isArray(v) && v.length <= max && v.every(row => Array.isArray(row) && row.length === size);
const unique = (rows: readonly unknown[], key: (row: never) => unknown) => new Set(rows.map(row => JSON.stringify(key(row as never)))).size === rows.length;

/** The finished-round shape, apart from anything the bank or dares would decide. */
function wellFormedResult(r: unknown, s: Row): boolean {
  if (r === null) return s.credited === false || s.credited === true;
  return plain(r) && exactKeys(r, ['event', 'awards', 'dares', 'cost', 'solution']) && ['helped', 'together', 'independent'].includes(r.event as string) && uint(r.awards, 3)
    && Array.isArray(r.dares) && unique(r.dares, (d: unknown) => d) && r.dares.every(slot => (s.selectedDares as unknown[]).includes(slot))
    && (r.cost === null || uint(r.cost)) && (r.solution === null || hashId(r.solution)) && (s.partner === null) === (r.event !== 'together');
}

/** Every content-independent rule of a stored paused round (see `checkSession` in challenge.ts). */
function wellFormedSession(s: unknown, owner: string, nextOrdinal: number): s is Row {
  if (!plain(s) || !exactKeys(s, ['version', 'owner', 'game', 'id', 'ordinal', 'revision', 'puzzle', 'codec', 'payload', 'selectedDares', 'partner', 'result', 'credited'])) return false;
  const p = s.puzzle;
  return s.version === 1 && s.owner === owner && asciiId(s.game) && !realTimeArcade.has(s.game) && asciiId(s.id, 100) && uint(s.ordinal, 2147483646) && s.ordinal > 0 && s.ordinal < nextOrdinal
    && uint(s.revision, 2147483647) && asciiId(s.codec) && typeof s.credited === 'boolean' && !(s.credited && s.result === null)
    && plain(p) && exactKeys(p, ['bank', 'puzzle', 'engine', 'rules', 'hash']) && uint(p.bank, 511) && uint(p.puzzle, 1023) && asciiId(p.engine) && p.engine === s.game && uint(p.rules, 65535) && p.rules > 0 && hashId(p.hash)
    && (s.partner === null || asciiId(s.partner, 40) && s.partner !== owner)
    && Array.isArray(s.selectedDares) && s.selectedDares.length <= 3 && unique(s.selectedDares, (d: unknown) => d) && s.selectedDares.every(slot => uint(slot, 4095))
    && jsonBytes(s) <= 4096 && wellFormedResult(s.result, s);
}

/**
 * Every content-independent rule of a progress record (see `validChallengeProgress`), checked on the
 * original before anything is taken out: field set, version, byte limit, list bounds, ordering and row shapes.
 */
function wellFormedProgress(v: Row, owner: string, cove: boolean): boolean {
  if (!exactKeys(v, ['version', 'banks', 'dares', 'nextOrdinal', 'paused', 'signals', 'bests', 'recent', 'cursors', 'practice', 'choice', 'solutions']) || v.version !== 1
    || jsonBytes(v) > challengeLimit(cove) || !uint(v.nextOrdinal, 2147483647) || !v.nextOrdinal) return false;
  const next = v.nextOrdinal;
  if (!tuples(v.banks, 512, 3) || !v.banks.every((row, i) => uint(row[0], 511) && (!i || row[0] > (v.banks as number[][])[i - 1][0]) && typeof row[1] === 'string' && typeof row[2] === 'string')) return false;
  if (cove ? v.dares !== '' : !dareBits(v.dares)) return false;
  if (!Array.isArray(v.paused) || v.paused.length > (cove ? 4 : 8) || !v.paused.every(s => wellFormedSession(s, owner, next))) return false;
  const paused = v.paused as Row[];
  if (!unique(paused, (s: Row) => s.game) || !unique(paused, (s: Row) => s.ordinal) || !paused.every((s, i) => !i || (paused[i - 1].game as string) < (s.game as string))) return false;
  const pair = (b: unknown, p: unknown) => uint(b, 511) && uint(p, 1023);
  const context = (c: unknown) => asciiId(c, 16);
  return tuples(v.bests, cove ? 128 : 256, 3) && unique(v.bests, (r: unknown[]) => r.slice(0, 2)) && v.bests.every(([b, p, n]) => pair(b, p) && uint(n))
    && tuples(v.recent, cove ? 32 : 64, 2) && unique(v.recent, (r: unknown[]) => r) && v.recent.every(([b, p]) => pair(b, p))
    && tuples(v.cursors, cove ? 64 : 128, 2) && unique(v.cursors, (r: unknown[]) => r[0]) && v.cursors.every(([b, n]) => uint(b, 511) && uint(n))
    && tuples(v.practice, cove ? 16 : 64, 3) && unique(v.practice, (r: unknown[]) => r[0]) && v.practice.every(([c, helped, clean]) => context(c) && uint(helped) && uint(clean))
    && tuples(v.signals, cove ? 8 : 32, 5) && unique(v.signals, (r: unknown[]) => r[0]) && v.signals.every(([c, recent, failures, rating, dismissed]) => context(c) && typeof recent === 'string' && /^[chf]{0,5}$/.test(recent) && uint(failures, 999) && ['easy', 'right', 'hard', null].includes(rating as null) && typeof dismissed === 'boolean')
    && tuples(v.solutions, cove ? 16 : 32, 3) && unique(v.solutions, (r: unknown[]) => r) && v.solutions.every(([b, p, h]) => pair(b, p) && hashId(h))
    && (v.choice === null || Array.isArray(v.choice) && v.choice.length === 3 && asciiId(v.choice[0]) && ['deep-water', 'endless'].includes(v.choice[1] as string) && uint(v.choice[2], 6) && (v.choice[2] as number) > 0);
}

const byteLength = (text: string) => text.length % 4 ? -1 : text.length / 4 * 3 - (text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0);
/** The puzzle count a marks row was written for, when both of its fields decode cleanly at one size. */
function rowSize(states: string, awards: string): number | null {
  const bytes = byteLength(states);
  if (bytes <= 0) return null;
  for (let n = Math.max(1, Math.floor((bytes - 1) * 8 / 3)); n <= Math.min(1024, Math.ceil(bytes * 8 / 3)); n++) {
    const codes = unpack(states, n, 3), bits = codes && unpack(awards, n, 2);
    if (codes && bits && !codes.includes(7) && bits.every((b, i) => !b || codes[i] >= 2)) return n;
  }
  return null;
}

function resolveProgress(progress: Row, cove: boolean, catalog: SaveCatalog) {
  const bankFor = (slot: unknown) => { const bank = uint(slot, 511) ? catalog.banks.get(slot) : undefined; return bank && (!cove || bank.cove) ? bank : undefined; };
  const ref = (slot: unknown, puzzle: unknown) => { const bank = bankFor(slot); return !!bank && uint(puzzle, 1023) && puzzle < bankSize(bank); };
  const resolves = (s: Row) => {
    const p = s.puzzle as Row, bank = bankFor(p.bank), codec = catalog.codecs.get(s.codec as string);
    return !!bank && ref(p.bank, p.puzzle) && bank.engine === p.engine && bank.rules === p.rules && (packedBank(bank) || bank.entries[p.puzzle as number]?.hash === p.hash)
      && !!codec && codec.game === s.game && (!cove || codec.cove)
      && (s.selectedDares as number[]).every(slot => { const dare = catalog.dares.get(slot); return !!dare && dare.bank === p.bank && dare.puzzle === p.puzzle; });
  };
  // A row for a bank this build has keeps its facts unless it was written for another size of that bank.
  // A row that doesn't decode at any one size is damage, not other content, so validation decides.
  const rowResolves = ([slot, states, awards]: unknown[]) => {
    const bank = bankFor(slot), size = rowSize(states as string, awards as string);
    if (!bank) return size === null;
    return !!unpack(states, bankSize(bank), 3) || !!unpack(awards, bankSize(bank), 2) || size === null || size === bankSize(bank);
  };
  const games: string[] = []; let marks = 0, changed = false;
  const next: Row = { ...progress };
  const keep = <T,>(field: string, test: (item: T) => boolean, onDrop?: (item: T) => void) => {
    const list = progress[field] as T[];
    const kept = list.filter(item => test(item) || (onDrop?.(item), false));
    if (kept.length !== list.length) { next[field] = kept; changed = true; }
  };
  keep<Row>('paused', resolves, s => { games.push(s.game as string); });
  keep<unknown[]>('banks', rowResolves, () => { marks++; });
  for (const field of ['bests', 'recent', 'solutions']) keep<unknown[]>(field, row => ref(row[0], row[1]));
  keep<unknown[]>('cursors', row => !!bankFor(row[0]));
  for (const field of ['signals', 'practice']) keep<unknown[]>(field, row => catalog.contexts.has(row[0] as string));
  if (Array.isArray(progress.choice) && ![...catalog.banks.values()].some(b => b.engine === (progress.choice as unknown[])[0] && (!cove || b.cove))) { next.choice = null; changed = true; }
  const dares = cove ? null : dareBits(progress.dares);
  if (dares?.some((n, i) => n && !catalog.dares.has(i))) {
    const known = dares.map((n, i) => n && catalog.dares.has(i) ? 1 : 0);
    next.dares = known.some(Boolean) ? pack(known, 1) : ''; marks++; changed = true;
  }
  return changed ? { progress: next, games, marks } : null;
}

/**
 * Set-aside notices are kept on the device until the person they're for has seen them and tapped OK.
 * They live in their own small row, written in the same transaction as the save they describe.
 */
export function encodeNotices(items: readonly SetAside[]): string | null {
  return items.length ? JSON.stringify({ version: 1, items }) : null;
}
/** Valid notices for owners still in the save. Anything malformed is ignored: a notice is never worth a failed launch. */
export function parseNotices(raw: string | null | undefined, owners: readonly string[]): SetAside[] {
  if (!raw) return [];
  let v: unknown;
  try { v = JSON.parse(raw); } catch { return []; }
  if (!plain(v) || !exactKeys(v, ['version', 'items']) || v.version !== 1 || !Array.isArray(v.items) || v.items.length > 64) return [];
  const items = v.items.filter((a): a is SetAside => plain(a) && exactKeys(a, ['owner', 'games', 'marks']) && asciiId(a.owner, 40) && uint(a.marks, 4096)
    && Array.isArray(a.games) && a.games.length <= 16 && a.games.every(g => asciiId(g)) && new Set(a.games).size === a.games.length);
  return items.length === v.items.length && new Set(items.map(a => a.owner)).size === items.length ? items.filter(a => owners.includes(a.owner)) : [];
}
/** One notice per owner: the games named in either, and every marks row set aside by either. */
export function mergeNotices(kept: readonly SetAside[], added: readonly SetAside[]): SetAside[] {
  const out = new Map(kept.map(a => [a.owner, a]));
  for (const a of added) {
    const old = out.get(a.owner);
    out.set(a.owner, old ? { owner: a.owner, games: [...new Set([...old.games, ...a.games])].slice(0, 16), marks: Math.min(4096, old.marks + a.marks) } : a);
  }
  return [...out.values()];
}
